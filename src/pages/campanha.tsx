import { useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Copy, Archive, Pencil } from "lucide-react";
import { PageHeading, DataBoundary, Status, MonthlySchedule, OfferText, SelectField } from "@/components/shared";
import { Button, buttonVariants } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useDemo, useAction } from "@/hooks/use-demo";
import { useSession, currentPersona } from "@/stores/session.store";
import { repository } from "@/services/repositories";
import { approvedRevision, baseForRevision, conflitos, contextLabel, dateLabel, lastRevision, janela } from "@/lib/domain";
import { env } from "@/config/env";
import type { Campanha, DemoData } from "@/types/domain";
import { toast } from "sonner";
import { CampaignPdfButton } from "@/components/campaign-pdf-button";
import { CampaignLogo } from "@/components/campaign-logo";
import { standardForRevision } from "@/lib/domain";
export default function CampanhaPage() {
   const location = useLocation();
   const { id } = useParams(),
      query = useDemo();
   return (
      <DataBoundary query={query}>
         {data => {
            const c = data.campanhas.find(c => c.id === id);
            return c ? (
               <CampaignDetail key={c.id} campaign={c} data={data} approval={location.state?.from === "/aprovacoes"} />
            ) : (
               <EmptyState title="Campanha não encontrada" actions={<Link to="/campanhas">Voltar às campanhas</Link>} />
            );
         }}
      </DataBoundary>
   );
}
export function CampaignDetail({ campaign: c, data, approval = false }: { campaign: Campanha; data: DemoData; approval?: boolean }) {
   const [params] = useSearchParams();
   const r = lastRevision(c),
      [version, setVersion] = useState(() => Number(params.get("revisao")) || r.numero),
      rev = c.revisoes.find(r => r.numero === version) ?? r;
   const [context, setContext] = useState(rev.contextosIds[0] ?? ""),
      [returnOpen, setReturnOpen] = useState(false),
      [comment, setComment] = useState(""),
      [feedback, setFeedback] = useState("");
   const personaId = useSession(s => s.personaId),
      persona = currentPersona(personaId),
      action = useAction(),
      navigate = useNavigate(),
      own = c.criadaPor === personaId;
   const base = baseForRevision(rev, data, rev.contextosIds.includes(context) ? context : rev.contextosIds[0]);
   const standard = standardForRevision(rev, data, rev.contextosIds.includes(context) ? context : rev.contextosIds[0]);
   const conflicts = conflitos(rev, data, c.id),
      released = approvedRevision(c),
      win = janela(rev),
      vigency = env.referenceDate < win.inicio ? "Agendada" : env.referenceDate > win.fim ? "Adesão encerrada" : "Em adesão";
   const run = (fn: () => Promise<unknown>, success: string) =>
      action.mutate(async () => {
         setFeedback("");
         try {
            await fn();
            setFeedback(success);
            toast.success(success);
         } catch (err) {
            setFeedback((err as Error).message);
            throw err;
         }
      });
   const mayDecide = persona.perfil === "aprovadora" && r.estado === "em-aprovacao" && rev.numero === r.numero && !c.arquivadaEm;
   return (
      <div className="focused-page campaign-detail">
         <PageHeading
            title={c.nome}
            back={{ to: approval ? "/aprovacoes" : "/campanhas", label: approval ? "Fila de aprovação" : "Campanhas" }}
            description={`Proposta de ${data.personas.find(p => p.id === c.criadaPor)?.nome.replace(" Exemplo", "")} · ${dateLabel(c.criadaEm)}`}
         >
            <CampaignPdfButton campaign={c} revision={rev} data={data} />
            {persona.perfil === "proponente" && (
               <Button
                  variant="outline"
                  className="gap-2"
                  disabled={action.isPending}
                  onClick={() => navigate(`/campanhas/nova?copiar=${c.id}`)}
               >
                  <Copy className="size-4" />
                  Duplicar
               </Button>
            )}
            {own && !c.arquivadaEm && r.estado !== "em-aprovacao" && (
               <>
                  <Button
                     variant="outline"
                     className="gap-2"
                     disabled={action.isPending}
                     onClick={() => run(() => repository.archive(c.id, personaId), "Campanha arquivada; histórico preservado")}
                  >
                     <Archive className="size-4" />
                     Arquivar
                  </Button>
                  <Link className={buttonVariants()} to={`/campanhas/${c.id}/editar`}>
                     <Pencil className="mr-2 size-4" />
                     {r.estado === "aprovada" ? "Criar revisão" : "Ajustar campanha"}
                  </Link>
               </>
            )}
         </PageHeading>
         <div className="flex flex-wrap items-center gap-3 pb-5">
            <Status value={c.arquivadaEm ? "Arquivada" : rev.estado} />
            <span className="text-xs text-muted-foreground">
               Revisão {rev.numero} · {vigency}
            </span>
         </div>
         {feedback && (
            <Callout className="mb-5" tone={action.isError ? "danger" : "success"}>
               {feedback}
            </Callout>
         )}
         {released && released.numero !== r.numero && (
            <Callout className="mb-5">
               A revisão {released.numero} aprovada continua preservada enquanto a revisão {r.numero} aguarda decisão.
            </Callout>
         )}
         <div className="campaign-detail-sections">
            <section className="campaign-offer">
               <div className="panel-heading">
                  <h2>Mensalidades da campanha</h2>
                  {rev.estado === "aprovada" && <CampaignLogo />}
               </div>
               {rev.contextosIds.length > 1 &&
                  rev.regras.some(rule => rule.tipo === "percentual" || rule.tipo === "base" || rule.tipo === "padrao") && (
                     <SelectField
                        label="Valores para a oferta"
                        value={rev.contextosIds.includes(context) ? context : rev.contextosIds[0]}
                        onChange={setContext}
                        options={rev.contextosIds.map(id => ({ value: id, label: contextLabel(data.contextos.find(c => c.id === id)!) }))}
                     />
                  )}
               <MonthlySchedule revision={rev} base={base} standard={standard} />
            </section>
            <div className="flex min-w-0 flex-col gap-5">
               <section className="panel">
                  <h2>Quem pode aderir e até quando</h2>
                  <div className="fact-grid">
                     <div>
                        <span>Ingresso</span>
                        <strong>{rev.elegibilidade.entradasCodigos.join(", ") || "Não definido"}</strong>
                     </div>
                     <div>
                        <span>Prazo de adesão</span>
                        <strong>{win.inicio ? `${dateLabel(win.inicio)} a ${dateLabel(win.fim)}` : "Não definido"}</strong>
                     </div>
                  </div>
                  {rev.condicoes && <p className="mt-5 text-sm text-muted-foreground">{rev.condicoes}</p>}
               </section>
               <details className="panel">
                  <summary>Ver as {rev.contextosIds.length} turmas contempladas</summary>
                  <ul className="context-list">
                     {rev.contextosIds.map(id => {
                        const ctx = data.contextos.find(c => c.id === id);
                        return (
                           <li key={id}>
                              {ctx ? contextLabel(ctx) : id}
                              {data.naoFormacao.some(n => n.contextoId === id && n.estado === "nao-formou") && (
                                 <Status value="nao-formou" />
                              )}
                           </li>
                        );
                     })}
                  </ul>
               </details>
               {conflicts.length > 0 && (
                  <section className="panel">
                     <h2>Condições que precisam de atenção</h2>
                     {conflicts.map(({ campanha, revisao, contextosIds }) => (
                        <Callout key={`${campanha.id}-${revisao.numero}`} tone="warning" className="mt-3">
                           <Link to={`/campanhas/${campanha.id}`}>
                              {campanha.nome} · <Status value={revisao.estado} />
                           </Link>
                           <p className="mt-2">
                              {contextosIds.length} contextos em comum · prazo {dateLabel(janela(revisao).inicio)} a{" "}
                              {dateLabel(janela(revisao).fim)} · cobrança {revisao.horizonteCobranca.inicio} a{" "}
                              {revisao.horizonteCobranca.fim}. Ajuste contexto, prazo ou meses.
                           </p>
                        </Callout>
                     ))}
                  </section>
               )}
               <details className="panel" open={approval && c.revisoes.length > 1}>
                  <summary>Revisões e histórico de decisões</summary>
                  <SelectField
                     label="Consultar revisão"
                     value={String(rev.numero)}
                     onChange={v => {
                        setVersion(Number(v));
                        setContext(c.revisoes.find(r => r.numero === Number(v))?.contextosIds[0] ?? "");
                     }}
                     options={c.revisoes.map(r => ({
                        value: String(r.numero),
                        label: `Revisão ${r.numero} · ${r.estado.replaceAll("-", " ")}`,
                     }))}
                  />
                  {c.revisoes.length > 1 && (
                     <div className="revision-comparison">
                        <div>
                           <span>Revisão anterior · {c.revisoes.at(-2)!.numero}</span>
                           <OfferText revision={c.revisoes.at(-2)!} />
                           <small>
                              {c.revisoes.at(-2)!.contextosIds.length} contextos ·{" "}
                              {c.revisoes.at(-2)!.elegibilidade.entradasCodigos.join(", ")}
                           </small>
                        </div>
                        <div>
                           <span>Revisão proposta · {r.numero}</span>
                           <OfferText revision={r} />
                           <small>
                              {r.contextosIds.length} contextos · {r.elegibilidade.entradasCodigos.join(", ")}
                           </small>
                        </div>
                     </div>
                  )}
                  {rev.decisao && (
                     <p className="mt-4 text-sm">
                        {rev.estado === "aprovada" ? "Aprovada" : "Devolvida"} por{" "}
                        {data.personas.find(p => p.id === rev.decisao!.por)?.nome} em {dateLabel(rev.decisao.em)}
                        {rev.decisao.comentario && ` · ${rev.decisao.comentario}`}
                     </p>
                  )}
                  <ol className="history-list">
                     {data.historico
                        .filter(h => h.entidadeId === c.id)
                        .slice()
                        .reverse()
                        .map(h => (
                           <li key={h.id}>
                              <strong>
                                 {h.acao.replaceAll("-", " ")}
                                 {h.revisao ? ` · revisão ${h.revisao}` : ""}
                              </strong>
                              <span>
                                 {dateLabel(h.timestamp)} · {data.personas.find(p => p.id === h.personaId)?.nome.replace(" Exemplo", "")}
                              </span>
                              {h.comentario && <p>{h.comentario}</p>}
                           </li>
                        ))}
                  </ol>
               </details>
            </div>
         </div>
         {mayDecide && (
            <div className="action-bar">
               <p>Confira as mensalidades antes de decidir.</p>
               <Button variant="outline" disabled={action.isPending} onClick={() => setReturnOpen(true)}>
                  Devolver para ajuste
               </Button>
               <Button
                  disabled={action.isPending}
                  onClick={() => run(() => repository.decide(c.id, r.numero, personaId, true, ""), "Revisão aprovada; oferta preservada")}
               >
                  Aprovar campanha
               </Button>
            </div>
         )}
         <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
            <DialogContent>
               <DialogHeader>
                  <DialogTitle>Devolver para ajuste</DialogTitle>
                  <DialogDescription>A autora receberá seu comentário no histórico da campanha.</DialogDescription>
               </DialogHeader>
               <label className="field">
                  Motivo do ajuste (obrigatório)
                  <textarea required value={comment} onChange={e => setComment(e.target.value)} />
               </label>
               <DialogFooter>
                  <Button variant="outline" onClick={() => setReturnOpen(false)}>
                     Cancelar
                  </Button>
                  <Button
                     disabled={!comment.trim() || action.isPending}
                     onClick={() =>
                        run(async () => {
                           await repository.decide(c.id, r.numero, personaId, false, comment);
                           setReturnOpen(false);
                        }, "Proposta devolvida para ajuste")
                     }
                  >
                     Confirmar devolução
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>
   );
}
