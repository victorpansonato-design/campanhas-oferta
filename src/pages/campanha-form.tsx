import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Send, Trash2 } from "lucide-react";
import { m as motion, useReducedMotion } from "motion/react";
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
   dateLabel,
   gerarEntradas,
   lastRevision,
   listarMeses,
   modalidades,
   monthLabel,
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
function periodMonths(months: string[], current?: string) {
   return [...new Set([...months, ...(current ? [current] : [])])].sort();
}
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
   const reducedMotion = useReducedMotion();
   const cardTransition = { duration: reducedMotion ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] as const };
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
   const selectedEntries = gerarEntradas(values.ano, values.modalidade).filter(e => values.entradas.includes(e.codigo));
   const defaultAdhesion = selectedEntries.length
      ? `${dateLabel(selectedEntries[0].inicio)} a ${dateLabel(selectedEntries.at(-1)!.fim)}`
      : "Selecione uma entrada para definir o prazo.";
   const billingMonths = useMemo(() => {
      try {
         return listarMeses(values.inicio, values.fim);
      } catch {
         return [];
      }
   }, [values.inicio, values.fim]);
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
                  className="wizard-layout campaign-editor"
               >
                  <div className="wizard-main">
                     <div className="campaign-setup">
                        <section className="panel campaign-scope">
                           <h2>Cursos da campanha</h2>
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
                                    Todos os {new Set(possibleOffers.map(o => o.cursoId)).size} cursos desta modalidade serão considerados.
                                    O escopo será congelado no envio.
                                 </Callout>
                                 <details className="mt-5">
                                    <summary>Exceções por curso (opcional)</summary>
                                    <p className="my-3 text-sm text-muted-foreground">
                                       Selecione os cursos que devem ficar fora da campanha.
                                    </p>
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
                        </section>
                        <section className="panel campaign-timing">
                           <div className="setup-heading">
                              <h2>Ingresso</h2>
                              <label className="field entry-year">
                                 Ano
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
                           </div>
                           <fieldset className="entry-selection">
                              <legend>Selecione as entradas</legend>
                              {gerarEntradas(values.ano, values.modalidade).map(e => (
                                 <label key={e.codigo}>
                                    <input
                                       type="checkbox"
                                       checked={values.entradas.includes(e.codigo)}
                                       onChange={ev => {
                                          setValue(
                                             "entradas",
                                             ev.target.checked
                                                ? [...values.entradas, e.codigo]
                                                : values.entradas.filter(c => c !== e.codigo),
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
                                       </strong>
                                       <small>
                                          {e.inicio.split("-").reverse().slice(0, 2).join("/")} a{" "}
                                          {e.fim.split("-").reverse().slice(0, 2).join("/")}
                                       </small>
                                    </span>
                                 </label>
                              ))}
                           </fieldset>
                           <div className="adhesion-settings">
                              <div className="adhesion-heading">
                                 <h3>Prazo de adesão</h3>
                                 <label className="check-label">
                                    <input type="checkbox" {...register("janela")} aria-controls="adhesion-dates" />
                                    Personalizar
                                 </label>
                              </div>
                              {!values.janela && <p className="timing-help">{defaultAdhesion}</p>}
                              {values.janela && (
                                 <motion.div
                                    id="adhesion-dates"
                                    className="form-grid adhesion-dates"
                                    initial={{ y: reducedMotion ? 0 : -6 }}
                                    animate={{ y: 0 }}
                                    transition={cardTransition}
                                 >
                                    <label className="field">
                                       Matrícula a partir de
                                       <input type="date" {...register("adesaoInicio")} />
                                    </label>
                                    <label className="field">
                                       Matrícula até
                                       <input type="date" {...register("adesaoFim")} />
                                    </label>
                                 </motion.div>
                              )}
                           </div>
                        </section>
                     </div>
                     <section className="panel campaign-payments">
                        <div className="payments-heading">
                           <div>
                              <h2>Quanto o aluno paga em cada mês?</h2>
                              <p className="panel-description">
                                 Defina os meses com benefício. Nos demais, o aluno paga a mensalidade padrão.
                              </p>
                           </div>
                           <div className="form-grid billing-dates">
                              <label className="field">
                                 Cobrança de
                                 <input type="month" {...register("inicio")} />
                              </label>
                              <label className="field">
                                 Cobrança até
                                 <input type="month" {...register("fim")} />
                              </label>
                           </div>
                        </div>
                        <div className="monthly-rules">
                           {fields.map((field, i) => (
                              <motion.fieldset
                                 key={field.id}
                                 className="rule-card"
                                 layout="position"
                                 initial={{ y: reducedMotion ? 0 : 8 }}
                                 animate={{ y: 0 }}
                                 transition={cardTransition}
                              >
                                 <legend>Período {i + 1}</legend>
                                 <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="rule-remove"
                                    aria-label={`Remover condição ${i + 1}`}
                                    onClick={() => remove(i)}
                                 >
                                    <Trash2 aria-hidden />
                                 </Button>
                                 <div className="rule-fields">
                                    <label className="field">
                                       De
                                       <select
                                          {...register(`regras.${i}.inicio`)}
                                          value={values.regras[i]?.inicio ?? ""}
                                          onChange={e => setValue(`regras.${i}.inicio`, e.target.value, { shouldDirty: true })}
                                       >
                                          {periodMonths(billingMonths, values.regras[i]?.inicio).map(month => (
                                             <option key={month} value={month}>
                                                {monthLabel(month).replace(" de ", " ")}
                                             </option>
                                          ))}
                                       </select>
                                    </label>
                                    <label className="field">
                                       Até
                                       <select
                                          {...register(`regras.${i}.fim`)}
                                          value={values.regras[i]?.fim ?? ""}
                                          onChange={e => setValue(`regras.${i}.fim`, e.target.value, { shouldDirty: true })}
                                       >
                                          {periodMonths(billingMonths, values.regras[i]?.fim).map(month => (
                                             <option key={month} value={month}>
                                                {monthLabel(month).replace(" de ", " ")}
                                             </option>
                                          ))}
                                       </select>
                                    </label>
                                    <label className="field rule-condition">
                                       Condição
                                       <select {...register(`regras.${i}.tipo`)}>
                                          <option value="fixo">Valor fixo</option>
                                          <option value="percentual">Bolsa sobre o contrato (%)</option>
                                          <option value="isencao">Isenção</option>
                                          <option value="base">Contrato sem bolsa</option>
                                       </select>
                                    </label>
                                    {["fixo", "percentual"].includes(values.regras[i]?.tipo) && (
                                       <label className="field rule-value">
                                          {values.regras[i]?.tipo === "percentual" ? "Bolsa (%)" : "Valor mensal (R$)"}
                                          <input
                                             inputMode="decimal"
                                             placeholder={values.regras[i]?.tipo === "percentual" ? "Ex.: 30,00" : "Ex.: 599,00"}
                                             {...register(`regras.${i}.valor`)}
                                             aria-invalid={!!financialError}
                                             aria-describedby={financialError ? "payment-error" : undefined}
                                          />
                                       </label>
                                    )}
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
                                    Repetir nos próximos meses
                                 </Button>
                              </motion.fieldset>
                           ))}
                        </div>
                        <Button
                           type="button"
                           variant="default"
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
                           Depois do benefício, a mensalidade padrão retorna automaticamente. A bolsa da campanha é o desconto total sobre o
                           contrato; ela não se soma à bolsa padrão.
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
                           <Callout tone="danger" className="mt-5" id="payment-error" role="alert">
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
