import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Send, Trash2 } from "lucide-react";
import { PageHeading, DataBoundary, SearchField, MonthlySchedule, Status } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { useDemo } from "@/hooks/use-demo";
import { useSession, currentPersona } from "@/stores/session.store";
import { repository } from "@/services/repositories";
import {
   campaignSummary,
   baseForRevision,
   standardForRevision,
   conflitos,
   contextLabel,
   cursos,
   gerarEntradas,
   lastRevision,
   modalidades,
   money,
   normalizeSearch,
   ofertas,
   parseBRL,
   validateRevision,
} from "@/lib/domain";
import { commercialPrice, standardMonthly, withStandardTail } from "@/lib/commercial-pricing";
import type { Campanha, DemoData, Revisao } from "@/types/domain";
import { toast } from "sonner";

const formSchema = z.object({
   nome: z.string(),
   modalidade: z.string(),
   ano: z.number().int().min(2000).max(9999),
   modo: z.string(),
   cursoIds: z.array(z.string()),
   formato: z.string(),
   turno: z.string(),
   entradas: z.array(z.string()),
   janela: z.boolean(),
   adesaoInicio: z.string(),
   adesaoFim: z.string(),
   inicio: z.string(),
   fim: z.string(),
   condicoes: z.string(),
   regras: z.array(
      z.object({
         inicio: z.string(),
         fim: z.string(),
         tipo: z.enum(["fixo", "percentual", "isencao", "base", "padrao"]),
         valor: z.string(),
      }),
   ),
});
type Values = z.infer<typeof formSchema>;
function toRevision(v: Values, personaId: string, contexts: string[], existingFee?: Revisao["taxaMatricula"]): Revisao {
   return {
      numero: 1,
      estado: "em-aprovacao",
      contextosIds: contexts,
      modoSelecao: v.modo,
      elegibilidade: {
         entradasCodigos: v.entradas,
         modo: v.janela ? "entrada-com-janela" : "entrada",
         janelaMatricula: v.janela ? { inicio: v.adesaoInicio, fim: v.adesaoFim } : null,
      },
      horizonteCobranca: { inicio: v.inicio, fim: v.fim },
      regras: withStandardTail(
         { inicio: v.inicio, fim: v.fim },
         v.regras.map(r => ({
            inicio: r.inicio,
            fim: r.fim,
            tipo: r.tipo,
            ...(r.tipo === "fixo" && r.valor.trim()
               ? { valorCentavos: parseBRL(r.valor) }
               : r.tipo === "percentual" && r.valor.trim()
                 ? { percentualBps: parseBRL(r.valor) }
                 : {}),
         })),
      ),
      taxaMatricula: existingFee ?? { tipo: "nao-definida" },
      condicoes: v.condicoes,
      autora: personaId,
      criadaEm: new Date().toISOString(),
      decisao: null,
      configuracao: { modalidade: v.modalidade, cursoIds: v.cursoIds, formato: v.formato, turno: v.turno, ano: v.ano },
   };
}
function defaults(data: DemoData, params: URLSearchParams, campaign?: Campanha): Values {
   const r = campaign ? lastRevision(campaign) : undefined,
      ctx = r ? data.contextos.find(c => c.id === r.contextosIds[0]) : undefined,
      offer = ofertas.find(o => o.id === (ctx?.ofertaId ?? params.get("oferta"))),
      courseId = params.get("curso");
   const modalidade =
         r?.configuracao?.modalidade ??
         offer?.modalidade ??
         (courseId ? cursos.find(c => c.id === courseId)?.modalidades[0] : undefined) ??
         "Presencial",
      ano = r?.configuracao?.ano ?? Number(r?.elegibilidade.entradasCodigos[0]?.split("/")[0] ?? params.get("ano") ?? 2027);
   const entryCode = params.get("entrada") ?? gerarEntradas(ano, modalidade)[0].codigo;
   const start =
      gerarEntradas(ano, modalidade)
         .find(e => e.codigo === entryCode)
         ?.inicio.slice(0, 7) ?? `${ano}-01`;
   return {
      nome: campaign?.nome ?? "",
      modalidade,
      ano,
      modo: r?.modoSelecao ?? "cursos",
      cursoIds:
         r?.configuracao?.cursoIds ??
         (r
            ? ([
                 ...new Set(
                    r.contextosIds
                       .map(id => ofertas.find(o => o.id === data.contextos.find(c => c.id === id)?.ofertaId)?.cursoId)
                       .filter(Boolean),
                 ),
              ] as string[])
            : courseId
              ? [courseId]
              : []),
      formato: r?.configuracao?.formato ?? offer?.formato ?? "",
      turno: r?.configuracao?.turno ?? ctx?.turno ?? params.get("turno") ?? "",
      entradas:
         r?.elegibilidade.entradasCodigos ??
         (params.get("entrada") ? [params.get("entrada")!] : [gerarEntradas(ano, modalidade)[0].codigo]),
      janela: !!r?.elegibilidade.janelaMatricula,
      adesaoInicio: r?.elegibilidade.janelaMatricula?.inicio ?? `${ano}-01-01`,
      adesaoFim: r?.elegibilidade.janelaMatricula?.fim ?? `${ano}-01-31`,
      inicio: r?.horizonteCobranca.inicio ?? start,
      fim: r?.horizonteCobranca.fim ?? `${ano}-12`,
      condicoes: r?.condicoes ?? "",
      regras: r?.regras
         .filter(rule => rule.tipo !== "padrao")
         .map(rule => ({
            inicio: rule.inicio,
            fim: rule.fim,
            tipo: rule.tipo,
            valor:
               rule.tipo === "fixo"
                  ? rule.valorCentavos === undefined
                     ? ""
                     : (rule.valorCentavos / 100).toFixed(2).replace(".", ",")
                  : rule.tipo === "percentual"
                    ? (rule.percentualBps! / 100).toFixed(2).replace(".", ",")
                    : "",
         })) ?? [{ inicio: start, fim: start, tipo: "fixo", valor: "" }],
   };
}
export default function CampanhaForm() {
   const { id } = useParams(),
      [params] = useSearchParams(),
      query = useDemo(Number(params.get("ano") ?? 2027));
   return (
      <DataBoundary query={query}>
         {data => {
            const c = data.campanhas.find(c => c.id === id);
            const source = data.campanhas.find(c => c.id === params.get("copiar"));
            return id && !c ? (
               <EmptyState title="Campanha não encontrada" />
            ) : (
               <Editor
                  key={id ?? `nova-${params.get("copiar") ?? params.get("curso") ?? "global"}`}
                  initial={data}
                  campaign={c}
                  source={source}
                  params={params}
               />
            );
         }}
      </DataBoundary>
   );
}
function Editor({
   initial,
   campaign,
   source,
   params,
}: {
   initial: DemoData;
   campaign?: Campanha;
   source?: Campanha;
   params: URLSearchParams;
}) {
   const client = useQueryClient();
   const personaId = useSession(s => s.personaId),
      persona = currentPersona(personaId),
      navigate = useNavigate();
   const [initialValues] = useState(() => {
      const values = defaults(initial, params, campaign ?? source);
      if (source && !campaign) values.nome = `${source.nome} — cópia`;
      return values;
   });
   const form = useForm<Values>({ defaultValues: initialValues, resolver: zodResolver(formSchema) }),
      { register, control, setValue, getValues } = form;
   const values = useWatch({ control }) as Values,
      yearQuery = useDemo(values.ano),
      data = yearQuery.data ?? initial;
   const { fields, append, remove } = useFieldArray({ control, name: "regras" });
   const [search, setSearch] = useState(""),
      [error, setError] = useState(""),
      [notice, setNotice] = useState(""),
      [saving, setSaving] = useState(false),
      [preview, setPreview] = useState(""),
      [showContexts, setShowContexts] = useState(false);
   const [turnName, setTurnName] = useState("");
   const [chooseCourse, setChooseCourse] = useState(!initialValues.cursoIds.length);
   const lock = useRef(false);
   const possibleOffers = useMemo(
      () => ofertas.filter(o => o.modalidade === values.modalidade && (!values.formato || o.formato === values.formato)),
      [values.modalidade, values.formato],
   );
   const selectedOffers = useMemo(
      () =>
         possibleOffers.filter(o =>
            values.modo === "modalidade" ? !values.cursoIds.includes(o.cursoId) : values.cursoIds.includes(o.cursoId),
         ),
      [possibleOffers, values.modo, values.cursoIds],
   );
   const contexts = useMemo(() => {
      const ids = new Set(selectedOffers.map(o => o.id));
      const entries = new Set(values.entradas);
      return data.contextos.filter(c => ids.has(c.ofertaId) && entries.has(c.entradaCodigo) && (!values.turno || c.turno === values.turno));
   }, [selectedOffers, data, values.entradas, values.turno]);
   const contextIds = useMemo(() => contexts.map(c => c.id), [contexts]);
   const unavailable = useMemo(() => {
      const ids = new Set(data.naoFormacao.filter(n => n.estado === "nao-formou").map(n => n.contextoId));
      return contexts.filter(c => ids.has(c.id));
   }, [contexts, data]);
   const { revision, financialError } = useMemo(() => {
      try {
         return {
            revision: toRevision(values, personaId, contextIds, campaign ? lastRevision(campaign).taxaMatricula : undefined),
            financialError: "",
         };
      } catch (err) {
         return { revision: undefined, financialError: (err as Error).message };
      }
   }, [values, personaId, contextIds, campaign]);
   const conflicts = useMemo(() => (revision ? conflitos(revision, data, campaign?.id) : []), [revision, data, campaign?.id]);
   const validations = useMemo(() => (revision ? validateRevision(revision, data) : [financialError]), [revision, data, financialError]);
   const baseContext = contexts.find(c => c.id === preview) ?? contexts[0],
      base = revision && baseContext ? baseForRevision(revision, data, baseContext.id) : undefined,
      standard = revision && baseContext ? standardForRevision(revision, data, baseContext.id) : undefined;
   const canEdit =
      persona.perfil === "proponente" &&
      (!campaign || campaign.criadaPor === personaId) &&
      !campaign?.arquivadaEm &&
      (!campaign || lastRevision(campaign).estado !== "em-aprovacao");
   const save = async () => {
      if (lock.current) return;
      lock.current = true;
      setSaving(true);
      setError("");
      try {
         const parsed = formSchema.parse(getValues()),
            rev = toRevision(parsed, personaId, contextIds, campaign ? lastRevision(campaign).taxaMatricula : undefined);
         const errors = validateRevision(rev, data);
         if (errors.length) throw new Error(errors.join(" "));
         const result = await repository.saveAndSubmit(
            {
               id: campaign?.id,
               expectedRevision: campaign ? lastRevision(campaign).numero : undefined,
               nome:
                  parsed.nome.trim() ||
                  `${
                     parsed.modo === "modalidade"
                        ? parsed.modalidade
                        : parsed.cursoIds
                             .map(id => cursos.find(c => c.id === id)?.nome)
                             .filter(Boolean)
                             .join(", ")
                  } — Ingresso ${parsed.ano}`,
               revisao: rev,
            },
            personaId,
         );
         await client.invalidateQueries({ queryKey: ["demo"] });
         toast.success("Campanha criada e enviada para aprovação");
         navigate(`/campanhas/${result.id}`);
      } catch (err) {
         setError((err as Error).message);
         requestAnimationFrame(() => {
            const alert = document.getElementById("form-error");
            alert?.focus();
            alert?.scrollIntoView({ block: "center", behavior: "instant" });
         });
      } finally {
         setSaving(false);
         lock.current = false;
      }
   };
   const changeModality = (mode: string) => {
      setValue("modalidade", mode);
      setValue("entradas", []);
      setValue("formato", "");
      setValue("turno", "");
      setValue("cursoIds", []);
      setChooseCourse(true);
      setNotice("Modalidade alterada. Selecione novamente os cursos e as entradas compatíveis. Os valores mensais foram preservados.");
   };
   const courseChoices = cursos.filter(
      c =>
         possibleOffers.some(o => o.cursoId === c.id) &&
         normalizeSearch([c.nome, ...c.aliases].join(" ")).includes(normalizeSearch(search)),
   );
   return (
      <>
         <PageHeading
            title={campaign ? (lastRevision(campaign).estado === "aprovada" ? "Criar revisão" : "Editar campanha") : "Nova campanha"}
            description="Defina uma oferta clara, do ingresso aos valores de cada mês."
            back={{ to: "/campanhas", label: "Campanhas" }}
         />
         {!canEdit ? (
            <EmptyState
               title="Este perfil não pode editar a campanha"
               hint="Selecione a gestora autora no perfil. Propostas em aprovação aguardam a decisão."
               actions={<Link to={campaign ? `/campanhas/${campaign.id}` : "/campanhas"}>Voltar às campanhas</Link>}
            />
         ) : (
            <>
               {notice && <Callout className="mb-5">{notice}</Callout>}
               {(error || financialError) && (
                  <Callout tone="danger" className="mb-5" id="form-error" tabIndex={-1}>
                     {error || financialError}
                  </Callout>
               )}
               <a href="#financial-summary" className="mobile-summary-link">
                  Ver resumo mensal
               </a>
               <form
                  onSubmit={e => {
                     e.preventDefault();
                     void save();
                  }}
                  aria-describedby={error ? "form-error" : undefined}
                  className="wizard-layout"
               >
                  <div className="wizard-main">
                     <section className="panel">
                        <h2>Quais cursos recebem a campanha?</h2>
                        <p className="panel-description">Escolha a modalidade e refine as ofertas que serão contempladas.</p>
                        <div className="form-grid">
                           <label className="field">
                              Modalidade
                              <select {...register("modalidade")} onChange={e => changeModality(e.target.value)}>
                                 {modalidades.map(m => (
                                    <option key={m}>{m}</option>
                                 ))}
                              </select>
                           </label>
                           <label className="field">
                              Abrangência
                              <select
                                 {...register("modo")}
                                 onChange={e => {
                                    const mode = e.target.value;
                                    setChooseCourse(true);
                                    if (mode === "modalidade" || values.modo === "modalidade") setValue("cursoIds", []);
                                    else if (mode === "cursos") setValue("cursoIds", values.cursoIds.slice(0, 1));
                                    setValue("modo", mode);
                                 }}
                              >
                                 <option value="cursos">Um curso</option>
                                 <option value="varios-cursos">Vários cursos</option>
                                 <option value="modalidade">Modalidade inteira · Todos</option>
                              </select>
                           </label>
                           <details className="scope-options">
                              <summary>Formato e turno</summary>
                              <div className="form-grid mt-3">
                                 <label className="field">
                                    Formato
                                    <select {...register("formato")}>
                                       <option value="">Todos os formatos</option>
                                       {[...new Set(ofertas.filter(o => o.modalidade === values.modalidade).map(o => o.formato))].map(
                                          format => (
                                             <option key={format}>{format}</option>
                                          ),
                                       )}
                                    </select>
                                 </label>
                                 <label className="field">
                                    Turno
                                    <select {...register("turno")}>
                                       <option value="">Todos os turnos cadastrados</option>
                                       {[
                                          ...new Set(
                                             data.contextos.filter(c => possibleOffers.some(o => o.id === c.ofertaId)).map(c => c.turno),
                                          ),
                                       ].map(turno => (
                                          <option key={turno}>{turno}</option>
                                       ))}
                                       <option value="desconhecido">Turno não cadastrado (requer cadastro)</option>
                                    </select>
                                 </label>
                              </div>
                           </details>
                        </div>
                        {values.turno === "desconhecido" && (
                           <section className="panel mb-5">
                              <h3>Cadastrar turno</h3>
                              <p className="panel-description">O turno será criado apenas para as ofertas e entradas selecionadas.</p>
                              <label className="field">
                                 Nome do turno
                                 <input value={turnName} onChange={e => setTurnName(e.target.value)} placeholder="Ex.: Vespertino" />
                              </label>
                              <Button
                                 type="button"
                                 variant="outline"
                                 className="mt-3"
                                 disabled={saving || !turnName.trim() || !selectedOffers.length || !values.entradas.length}
                                 onClick={async () => {
                                    setSaving(true);
                                    try {
                                       await repository.registerTurn(
                                          selectedOffers.map(o => o.id),
                                          values.entradas,
                                          turnName,
                                          personaId,
                                       );
                                       await yearQuery.refetch();
                                       setValue("turno", turnName.trim());
                                       setNotice("Turno cadastrado para as ofertas selecionadas.");
                                    } catch (err) {
                                       setError((err as Error).message);
                                    } finally {
                                       setSaving(false);
                                    }
                                 }}
                              >
                                 Cadastrar turno nas ofertas selecionadas
                              </Button>
                           </section>
                        )}
                        {values.modo !== "modalidade" ? (
                           <>
                              {values.modo === "cursos" && !chooseCourse && values.cursoIds.length === 1 ? (
                                 <div className="selected-course">
                                    <strong>{cursos.find(c => c.id === values.cursoIds[0])?.nome}</strong>
                                    <Button type="button" variant="link" onClick={() => setChooseCourse(true)}>
                                       Trocar curso
                                    </Button>
                                 </div>
                              ) : (
                                 <>
                                    <SearchField
                                       label="Filtrar cursos para seleção"
                                       value={search}
                                       onChange={setSearch}
                                       placeholder="Pesquisar cursos para a campanha…"
                                    />
                                    <fieldset className="course-selection">
                                       <legend className="sr-only">Cursos elegíveis</legend>
                                       {courseChoices.map(c => (
                                          <label key={c.id}>
                                             <input
                                                type={values.modo === "cursos" ? "radio" : "checkbox"}
                                                name="selected-courses"
                                                checked={values.cursoIds.includes(c.id)}
                                                onChange={e => {
                                                   setChooseCourse(values.modo !== "cursos");
                                                   setValue(
                                                      "cursoIds",
                                                      values.modo === "cursos"
                                                         ? [c.id]
                                                         : e.target.checked
                                                           ? [...values.cursoIds, c.id]
                                                           : values.cursoIds.filter(id => id !== c.id),
                                                   );
                                                }}
                                             />
                                             <span>
                                                <strong>{c.nome}</strong>
                                                <small>
                                                   {c.diploma} ·{" "}
                                                   {possibleOffers
                                                      .filter(o => o.cursoId === c.id)
                                                      .map(o => o.formato)
                                                      .join(" · ")}
                                                </small>
                                             </span>
                                             {c.novo && <Status value="Novo" />}
                                          </label>
                                       ))}
                                    </fieldset>
                                 </>
                              )}
                           </>
                        ) : (
                           <>
                              <Callout className="mt-5">
                                 Todos os {new Set(possibleOffers.map(o => o.cursoId)).size} cursos desta modalidade serão considerados. O
                                 escopo será congelado no envio.
                              </Callout>
                              <details className="mt-5">
                                 <summary>Exceções por curso (opcional)</summary>
                                 <p className="my-3 text-sm text-muted-foreground">Selecione os cursos que devem ficar fora da campanha.</p>
                                 {cursos
                                    .filter(c => possibleOffers.some(o => o.cursoId === c.id))
                                    .map(c => (
                                       <label className="check-label" key={c.id}>
                                          <input
                                             type="checkbox"
                                             checked={values.cursoIds.includes(c.id)}
                                             onChange={e =>
                                                setValue(
                                                   "cursoIds",
                                                   e.target.checked
                                                      ? [...values.cursoIds, c.id]
                                                      : values.cursoIds.filter(id => id !== c.id),
                                                )
                                             }
                                          />
                                          {c.nome}
                                       </label>
                                    ))}
                              </details>
                           </>
                        )}
                        <p className="mt-4 text-xs text-muted-foreground">Presencial Integral não faz parte das ofertas elegíveis.</p>
                     </section>
                     <section className="panel">
                        <h2>Ingresso e prazo de adesão</h2>
                        <p className="panel-description">Entrada identifica a turma; o prazo define quando a matrícula pode aderir.</p>
                        <label className="field max-w-52">
                           Ano de ingresso
                           <input
                              type="number"
                              min="2000"
                              max="9999"
                              {...register("ano", { valueAsNumber: true })}
                              onChange={e => {
                                 const y = Number(e.target.value);
                                 if (y >= 2000 && y <= 9999) {
                                    setValue("ano", y);
                                    setValue("entradas", []);
                                    setNotice("Ano alterado. Selecione as entradas do novo ano; revise os meses da cobrança.");
                                 }
                              }}
                           />
                        </label>
                        <fieldset className="entry-selection">
                           <legend>
                              Entradas de {values.modalidade} · {values.ano}
                           </legend>
                           {gerarEntradas(values.ano, values.modalidade).map(e => (
                              <label key={e.codigo}>
                                 <input
                                    type="checkbox"
                                    checked={values.entradas.includes(e.codigo)}
                                    onChange={ev => {
                                       setValue(
                                          "entradas",
                                          ev.target.checked ? [...values.entradas, e.codigo] : values.entradas.filter(c => c !== e.codigo),
                                       );
                                       if (
                                          ev.target.checked &&
                                          !values.entradas.length &&
                                          !campaign &&
                                          !source &&
                                          !form.formState.dirtyFields.regras
                                       ) {
                                          const start = e.inicio.slice(0, 7);
                                          setValue("inicio", start);
                                          setValue("fim", `${values.ano}-12`);
                                          setValue("regras", [{ inicio: start, fim: start, tipo: "fixo", valor: "" }]);
                                       }
                                    }}
                                 />
                                 <span>
                                    <strong>
                                       {values.modalidade === "Presencial"
                                          ? e.codigo.endsWith("/1")
                                             ? "1º semestre"
                                             : "2º semestre"
                                          : `${gerarEntradas(values.ano, values.modalidade).findIndex(x => x.codigo === e.codigo) + 1}º trimestre`}{" "}
                                       de {values.ano}
                                    </strong>
                                    <small>
                                       {e.codigo} · {e.inicio.split("-").reverse().join("/")} a {e.fim.split("-").reverse().join("/")}
                                    </small>
                                 </span>
                              </label>
                           ))}
                        </fieldset>
                        <label className="check-label my-5">
                           <input type="checkbox" {...register("janela")} />
                           Definir um prazo específico de adesão
                        </label>
                        {values.janela && (
                           <div className="form-grid">
                              <label className="field">
                                 Matrícula a partir de
                                 <input type="date" {...register("adesaoInicio")} />
                              </label>
                              <label className="field">
                                 Matrícula até
                                 <input type="date" {...register("adesaoFim")} />
                              </label>
                           </div>
                        )}
                        <Callout className="mt-5">
                           Os meses de benefício podem ir além do semestre ou trimestre de ingresso. Defina o período de cobrança abaixo.
                        </Callout>
                     </section>
                     <section className="panel">
                        <h2>Quanto o aluno paga em cada mês?</h2>
                        <p className="panel-description">
                           Defina o benefício dos primeiros meses. Depois, a bolsa comercial padrão será aplicada automaticamente até o fim
                           da cobrança.
                        </p>
                        <div className="form-grid">
                           <label className="field">
                              Cobrança de
                              <input type="month" {...register("inicio")} />
                           </label>
                           <label className="field">
                              Cobrança até
                              <input type="month" {...register("fim")} />
                           </label>
                        </div>
                        <div className="monthly-rules">
                           {fields.map((field, i) => (
                              <fieldset key={field.id} className="rule-card">
                                 <legend>Período {i + 1}</legend>
                                 <div className="rule-fields">
                                    <label className="field">
                                       De
                                       <input type="month" {...register(`regras.${i}.inicio`)} />
                                    </label>
                                    <label className="field">
                                       Até
                                       <input type="month" {...register(`regras.${i}.fim`)} />
                                    </label>
                                    <label className="field">
                                       Condição
                                       <select {...register(`regras.${i}.tipo`)}>
                                          <option value="fixo">Valor fixo</option>
                                          <option value="percentual">Bolsa total sobre o contrato</option>
                                          <option value="isencao">Isenção</option>
                                          <option value="base">Valor de contrato sem bolsa</option>
                                       </select>
                                    </label>
                                    {["fixo", "percentual"].includes(values.regras[i]?.tipo) && (
                                       <label className="field">
                                          {values.regras[i]?.tipo === "percentual" ? "Bolsa (%)" : "Valor mensal (R$)"}
                                          <input
                                             inputMode="decimal"
                                             placeholder={values.regras[i]?.tipo === "percentual" ? "30,00" : "599,00"}
                                             {...register(`regras.${i}.valor`)}
                                             aria-invalid={!!financialError}
                                          />
                                       </label>
                                    )}
                                    <Button
                                       type="button"
                                       size="icon"
                                       variant="ghost"
                                       aria-label={`Remover condição ${i + 1}`}
                                       onClick={() => remove(i)}
                                    >
                                       <Trash2 className="size-4" />
                                    </Button>
                                 </div>
                                 <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    onClick={() => {
                                       const r = values.regras[i];
                                       const [y, m] = r.fim.split("-").map(Number),
                                          next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
                                       if (next <= values.fim) append({ ...r, inicio: next, fim: values.fim });
                                       else setNotice("Não há meses seguintes no horizonte. Ajuste o término da cobrança.");
                                    }}
                                 >
                                    Copiar para meses seguintes
                                 </Button>
                              </fieldset>
                           ))}
                        </div>
                        <Button
                           type="button"
                           variant="outline"
                           className="gap-2"
                           onClick={() => {
                              const end = values.regras
                                 .map(r => r.fim)
                                 .sort()
                                 .at(-1);
                              const [year, month] = (end ?? values.inicio).split("-").map(Number);
                              const next = !end
                                 ? values.inicio
                                 : month === 12
                                   ? `${year + 1}-01`
                                   : `${year}-${String(month + 1).padStart(2, "0")}`;
                              if (next <= values.fim) append({ inicio: next, fim: next, tipo: "fixo", valor: "" });
                              else setNotice("Todos os meses já têm uma condição. Ajuste o período existente.");
                           }}
                        >
                           <Plus className="size-4" />
                           Adicionar período
                        </Button>
                        {fields.length === 1 && values.regras[0]?.tipo === "fixo" && (
                           <Button
                              type="button"
                              variant="link"
                              onClick={() => {
                                 const rule = getValues("regras.0"),
                                    [year, month] = rule.inicio.split("-").map(Number);
                                 const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
                                 setValue("regras", [
                                    { inicio: rule.inicio, fim: rule.inicio, tipo: "isencao", valor: "" },
                                    ...(next <= rule.fim ? [{ ...rule, inicio: next }] : []),
                                 ]);
                              }}
                           >
                              Isentar primeiro mês
                           </Button>
                        )}
                        <p className="standard-return-note">
                           Após o último mês de benefício, o aluno volta à mensalidade com a bolsa comercial padrão. O percentual da
                           campanha é a bolsa total sobre o contrato, sem somar à bolsa padrão.
                        </p>
                        {values.modalidade === "Presencial" &&
                           values.regras.some(r => {
                              const [sy, sm] = values.inicio.split("-").map(Number);
                              const [ey, em] = r.fim.split("-").map(Number);
                              return (ey - sy) * 12 + em - sm >= 2;
                           }) && (
                              <Callout tone="warning" className="mt-4">
                                 No presencial, o benefício costuma durar até 2 meses. Confira o prazo antes de enviar.
                              </Callout>
                           )}
                        <details className="base-section">
                           <summary>Consultar contrato e bolsa comercial padrão</summary>
                           <div className="table-wrap">
                              <table>
                                 <thead>
                                    <tr>
                                       <th>Oferta, turno e entrada</th>
                                       <th>Contrato</th>
                                       <th>Bolsa comercial</th>
                                       <th>Mensalidade padrão</th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {contexts.map(c => {
                                       const price = commercialPrice(c);
                                       return (
                                          <tr key={c.id}>
                                             <td>{contextLabel(c)}</td>
                                             <td>{money(price?.valorContratoCentavos ?? null)}</td>
                                             <td>{price ? `${price.bolsaComercialBps / 100}%` : "Não cadastrada"}</td>
                                             <td>{money(price ? standardMonthly(price) : null)}</td>
                                          </tr>
                                       );
                                    })}
                                 </tbody>
                              </table>
                           </div>
                        </details>
                        {financialError && (
                           <Callout tone="danger" className="mt-5">
                              {financialError}
                           </Callout>
                        )}
                     </section>
                     <section className="panel">
                        <h2>Revise antes de enviar</h2>
                        <p className="panel-description">A condição só será liberada depois da aprovação da gestora responsável.</p>
                        <details>
                           <summary>Nome e observações (opcional)</summary>
                           <label className="field">
                              Nome da campanha (opcional)
                              <input {...register("nome")} placeholder={`Ingresso ${values.ano} — ${values.modalidade}`} />
                           </label>
                           <label className="field mt-5">
                              Observação ou condições comerciais (opcional)
                              <textarea {...register("condicoes")} rows={3} />
                           </label>
                        </details>
                        {revision && <p className="offer-text">{campaignSummary(revision)}.</p>}
                        <dl className="review-facts">
                           <div>
                              <dt>Abrangência</dt>
                              <dd>
                                 {selectedOffers.length} ofertas · {contexts.length} contextos de turma
                              </dd>
                           </div>
                           <div>
                              <dt>Entradas</dt>
                              <dd>{values.entradas.join(", ") || "Não definidas"}</dd>
                           </div>
                           <div>
                              <dt>Adesão</dt>
                              <dd>
                                 {values.janela ? `${values.adesaoInicio} a ${values.adesaoFim}` : "Período das entradas selecionadas"}
                              </dd>
                           </div>
                        </dl>
                        {validations.length > 0 && (
                           <Callout tone="warning" className="mt-5" title="Antes de enviar">
                              <ul className="list-disc pl-4">
                                 {validations.map(e => (
                                    <li key={e}>{e}</li>
                                 ))}
                              </ul>
                           </Callout>
                        )}
                        {conflicts.length > 0 && (
                           <Callout tone="warning" className="mt-5" title="Há condições no mesmo recorte">
                              {conflicts.map(c => (
                                 <p key={`${c.campanha.id}-${c.revisao.numero}`}>
                                    {c.campanha.nome} · {c.revisao.estado.replaceAll("-", " ")} · {c.contextosIds.length} contextos em
                                    comum. A aprovação verificará os conflitos.
                                 </p>
                              ))}
                           </Callout>
                        )}
                     </section>
                     <div className="wizard-footer simple-footer">
                        <span>A condição será liberada após a aprovação.</span>
                        <Button type="submit" className="gap-2" disabled={saving || yearQuery.isLoading}>
                           <Send className="size-4" />
                           {saving ? "Enviando…" : campaign ? "Enviar revisão para aprovação" : "Criar e enviar para aprovação"}
                        </Button>
                     </div>
                  </div>
                  <aside id="financial-summary" tabIndex={-1} className="panel financial-summary">
                     <h2>Resumo mensal</h2>
                     <p className="summary-context">
                        {new Set(selectedOffers.map(o => o.cursoId)).size} cursos · {selectedOffers.length} ofertas
                        <br />
                        {contexts.length} contextos · {values.modalidade}
                     </p>
                     {contexts.length > 1 && (
                        <label className="field">
                           Contexto da prévia
                           <select value={baseContext?.id ?? ""} onChange={e => setPreview(e.target.value)}>
                              {contexts.map(c => (
                                 <option value={c.id} key={c.id}>
                                    {contextLabel(c)}
                                 </option>
                              ))}
                           </select>
                        </label>
                     )}
                     {revision ? (
                        <MonthlySchedule revision={revision} base={base} standard={standard} compact />
                     ) : (
                        <Callout tone="warning">{financialError || "Adicione condições para visualizar os valores."}</Callout>
                     )}
                     {!values.regras.length && (
                        <p className="mt-3 text-sm text-muted-foreground">Defina os valores para enviar a campanha.</p>
                     )}
                     {unavailable.length > 0 && (
                        <Callout tone="warning" className="mt-4">
                           {unavailable.length} contextos sem formação. Remova-os do escopo ou restaure a formação antes de enviar.
                        </Callout>
                     )}
                     <Button
                        type="button"
                        variant="link"
                        className="mt-4"
                        aria-expanded={showContexts}
                        onClick={() => setShowContexts(!showContexts)}
                     >
                        Ver ofertas afetadas
                     </Button>
                     {showContexts && (
                        <ul className="context-list text-xs">
                           {contexts.map(c => (
                              <li key={c.id}>{contextLabel(c)}</li>
                           ))}
                        </ul>
                     )}
                  </aside>
               </form>
            </>
         )}
      </>
   );
}
