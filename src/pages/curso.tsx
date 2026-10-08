import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { NewCampaign, DataBoundary, CourseImage, SelectField, Status, DetailLink } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { CampaignOffer } from "@/components/campaign-offer";
import { EmptyState } from "@/components/ui/empty-state";
import { FormationDialog } from "@/components/formation-dialog";
import { useDemo } from "@/hooks/use-demo";
import { useFilters } from "@/hooks/use-filters";
import { approvedRevision, contextLabel, cursos, dateLabel, gerarEntradas, lastRevision, money, ofertas } from "@/lib/domain";
import type { DemoData } from "@/types/domain";
import { commercialPrice, standardMonthly } from "@/lib/commercial-pricing";

export default function Curso() {
   const { cursoId } = useParams(),
      curso = cursos.find(c => c.id === cursoId),
      f = useFilters(),
      query = useDemo(Number(f.get("ano", "2027")));
   if (!curso) return <EmptyState title="Curso não encontrado" actions={<Link to="/catalogo">Voltar ao catálogo</Link>} />;
   return <DataBoundary query={query}>{data => <CourseContent course={curso} data={data} />}</DataBoundary>;
}
function CourseContent({ course, data }: { course: (typeof cursos)[number]; data: DemoData }) {
   const f = useFilters(),
      ano = Number(f.get("ano", "2027")),
      entry = f.get("entrada"),
      offerId = f.get("oferta"),
      turno = f.get("turno"),
      tab = f.get("aba", "campanhas");
   const courseOffers = ofertas.filter(o => o.cursoId === course.id),
      entries = [...new Map(courseOffers.flatMap(o => gerarEntradas(ano, o.modalidade)).map(e => [e.codigo, e])).values()];
   const courseContexts = data.contextos.filter(c => courseOffers.some(o => o.id === c.ofertaId) && c.entradaCodigo.startsWith(`${ano}/`));
   const [priceSelection, setPriceSelection] = useState("");
   const priceContexts = [
      ...new Map(
         courseContexts
            .filter(c => (!offerId || c.ofertaId === offerId) && (!turno || c.turno === turno))
            .map(c => [`${c.ofertaId}:${c.turno}`, c]),
      ).values(),
   ];
   const priceContext = priceContexts.find(c => c.id === priceSelection) ?? priceContexts[0];
   const price = commercialPrice(priceContext);
   const contexts = data.contextos.filter(
      c =>
         courseOffers.some(o => o.id === c.ofertaId) &&
         c.entradaCodigo.startsWith(`${ano}/`) &&
         (!entry || c.entradaCodigo === entry) &&
         (!offerId || c.ofertaId === offerId) &&
         (!turno || c.turno === turno),
   );
   const ids = contexts.map(c => c.id),
      campaigns = data.campanhas.filter(c => c.revisoes.some(r => r.contextosIds.some(id => ids.includes(id)))),
      formations = data.naoFormacao.filter(n => ids.includes(n.contextoId));
   const offerCards = campaigns.flatMap(c => {
      const approved = approvedRevision(c);
      const revision = approved?.contextosIds.some(id => ids.includes(id)) ? approved : lastRevision(c);
      return revision.contextosIds.some(id => ids.includes(id)) ? [{ campaign: c, revision }] : [];
   });
   const linked = data.matriculas.filter(m => ids.includes(m.contextoId) && m.campanhaVinculada);
   const events = data.historico.filter(h => campaigns.some(c => c.id === h.entidadeId) || formations.some(n => n.id === h.entidadeId));
   return (
      <div className="focused-page course-page">
         <div className="course-topbar">
            <Link className="back-link" to="/catalogo">
               <ArrowLeft className="size-3.5" aria-hidden />
               Catálogo de cursos
            </Link>
            <NewCampaign
               courseId={course.id}
               search={`&ano=${ano}${priceContext ? `&oferta=${priceContext.ofertaId}` : ""}${entry ? `&entrada=${encodeURIComponent(entry)}` : ""}${priceContext ? `&turno=${encodeURIComponent(priceContext.turno)}` : ""}`}
            />
         </div>
         <section className="course-commercial-card">
            <header className="course-banner">
               <CourseImage id={course.id} className="course-banner-image hero" priority />
               <div className="course-banner-title">
                  <h1>{course.nome}</h1>
                  <p>
                     {course.diploma} · {course.formatosPermitidos.join(" · ")}
                  </p>
               </div>
            </header>
            <div className="course-pricing">
               <div className="commercial-context">
                  <SelectField
                     label={`Condição comercial · Ingressantes de ${ano}`}
                     value={priceContext?.id ?? ""}
                     onChange={setPriceSelection}
                     options={
                        priceContexts.length
                           ? priceContexts.map(c => ({
                                value: c.id,
                                label: `${ofertas.find(o => o.id === c.ofertaId)?.formato} · ${c.turno}`,
                             }))
                           : [{ value: "", label: "Sem oferta neste recorte" }]
                     }
                  />
               </div>
               <dl className="commercial-values">
                  <div>
                     <dt>Valor de contrato</dt>
                     <dd>{price ? money(price.valorContratoCentavos) : "Não cadastrado"}</dd>
                  </div>
                  <div>
                     <dt>Bolsa comercial</dt>
                     <dd>
                        {price ? `${price.bolsaComercialBps / 100}%` : "Não cadastrada"}
                        <small>Padrão do ano</small>
                     </dd>
                  </div>
                  <div className="standard-monthly">
                     <dt>Mensalidade</dt>
                     <dd>
                        {price ? money(standardMonthly(price)) : "Não cadastrada"}
                        <small>Com a bolsa comercial</small>
                     </dd>
                  </div>
               </dl>
            </div>
         </section>
         <section className="context-controls" aria-label="Contexto do curso">
            <SelectField
               label="Ano de ingresso"
               value={String(ano)}
               onChange={ano => f.set({ ano, entrada: "" })}
               options={Array.from({ length: 8 }, (_, i) => String(2025 + i))}
            />
            <details className="course-filters" open={!!(offerId || entry || turno)}>
               <summary>Filtrar por modalidade, entrada ou turno{(offerId || entry || turno) && " · Filtros ativos"}</summary>
               <div className="course-filter-fields">
                  <SelectField
                     label="Modalidade e formato"
                     value={offerId}
                     onChange={oferta => f.set({ oferta, entrada: "" })}
                     options={[
                        { value: "", label: "Todas as ofertas" },
                        ...courseOffers.map(o => ({ value: o.id, label: `${o.modalidade} · ${o.formato}` })),
                     ]}
                  />
                  <SelectField
                     label="Entrada"
                     value={entry}
                     onChange={entrada => f.set({ entrada })}
                     options={[
                        { value: "", label: "Todas as entradas" },
                        ...entries
                           .filter(e => !offerId || e.modalidade === courseOffers.find(o => o.id === offerId)?.modalidade)
                           .map(e => ({ value: e.codigo, label: e.codigo })),
                     ]}
                  />
                  <SelectField
                     label="Turno"
                     value={turno}
                     onChange={turno => f.set({ turno })}
                     options={[{ value: "", label: "Todos os turnos" }, ...new Set(courseContexts.map(c => c.turno))]}
                  />
                  <Button variant="ghost" onClick={() => f.set({ oferta: "", entrada: "", turno: "" })}>
                     Limpar filtros
                  </Button>
               </div>
            </details>
         </section>
         <div className="page-tabs" role="group" aria-label="Seções da ficha">
            {[
               { value: "campanhas", label: "Campanhas" },
               { value: "formacao", label: "Formação de turma" },
               { value: "historico", label: "Histórico" },
            ].map(t => (
               <button key={t.value} aria-pressed={tab === t.value} onClick={() => f.set({ aba: t.value })}>
                  {t.label}
                  {t.value === "campanhas" && <span>{offerCards.length}</span>}
               </button>
            ))}
         </div>
         {tab === "campanhas" && (
            <div className="flex flex-col gap-5">
               {!offerCards.length && (
                  <EmptyState title="Nenhuma campanha para esta seleção" hint="Use Nova campanha para definir as condições de ingresso." />
               )}{" "}
               {offerCards.map(({ campaign, revision }) => (
                  <CampaignOffer key={campaign.id} campaign={campaign} revision={revision} data={data} visibleContextIds={ids} />
               ))}
               <details className="course-about">
                  <summary>Sobre o curso e modalidades disponíveis</summary>
                  <div className="course-about-content">
                     <CourseImage id={course.id} className="course-thumbnail" />
                     <div>
                        <p>
                           {course.diploma}
                           {course.novo ? " · Curso novo" : ""}
                        </p>
                        <p>{courseOffers.map(o => o.formato).join(" · ")}</p>
                        <a href={course.fonteUrl} target="_blank" rel="noreferrer">
                           Consultar página oficial
                        </a>
                     </div>
                  </div>
               </details>
               {linked.map(m => (
                  <details key={m.id} className="panel">
                     <summary>Oferta registrada na matrícula · versão preservada</summary>
                     <p className="mt-4 text-sm">
                        {m.nomeCompleto} · RA {m.ra}
                     </p>
                     <p className="mt-2 text-sm">
                        Revisão {m.campanhaVinculada!.revisaoNumero} · registrada em {dateLabel(m.campanhaVinculada!.registradaEm)}
                     </p>
                     <p className="mt-2">{m.campanhaVinculada!.resumo}</p>
                     <div className="table-wrap">
                        <table>
                           <thead>
                              <tr>
                                 <th>Competência</th>
                                 <th>Valor prometido</th>
                              </tr>
                           </thead>
                           <tbody>
                              {m.campanhaVinculada!.parcelas.map(p => (
                                 <tr key={p.competencia}>
                                    <td>{p.competencia}</td>
                                    <td>
                                       {money(p.valorCentavos)}
                                       {p.valorCentavos === 0 ? " · Isento" : ""}
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </details>
               ))}
            </div>
         )}
         {tab === "formacao" && (
            <div className="flex flex-col gap-4">
               <FormationDialog contexts={contexts} data={data} year={ano} courseName={course.nome}>
                  <Button variant="outline" className="gap-2">
                     <ClipboardList data-icon="inline-start" aria-hidden />
                     Registrar não formação
                  </Button>
               </FormationDialog>
               {!formations.length && (
                  <EmptyState title="Sem registro de não formação" hint="A ausência de registro não confirma que a turma foi formada." />
               )}
               {formations.map(n => (
                  <section className="panel" key={n.id}>
                     <div className="panel-heading">
                        <div>
                           <h2>{contextLabel(data.contextos.find(c => c.id === n.contextoId)!)}</h2>
                           <p>
                              {n.motivo} · {dateLabel(n.registradaEm)}
                           </p>
                        </div>
                        <Status value={n.estado} />
                     </div>
                     <p className="text-sm text-muted-foreground">{n.observacao}</p>
                     <DetailLink to={`/sem-formacao/${n.id}`}>{n.alunosIds.length} alunos · abrir registro</DetailLink>
                  </section>
               ))}
            </div>
         )}
         {tab === "historico" && (
            <section className="panel">
               <h2>Histórico deste recorte</h2>
               {!events.length ? (
                  <p className="mt-4 text-sm text-muted-foreground">Nenhuma ação registrada.</p>
               ) : (
                  <ol className="history-list">
                     {[...events].reverse().map(e => (
                        <li key={e.id}>
                           <strong>{e.acao.replaceAll("-", " ")}</strong>
                           <span>
                              {dateLabel(e.timestamp)} · {data.personas.find(p => p.id === e.personaId)?.nome}
                              {e.revisao ? ` · revisão ${e.revisao}` : ""}
                           </span>
                           {e.comentario && <p>{e.comentario}</p>}
                        </li>
                     ))}
                  </ol>
               )}
            </section>
         )}
      </div>
   );
}
