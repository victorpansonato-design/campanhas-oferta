import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { MonthlySchedule, Status } from "@/components/shared";
import { buttonVariants } from "@/components/ui/button";
import { baseForRevision, standardForRevision, contextLabel, dateLabel, lastRevision, ofertas, cursos, janela } from "@/lib/domain";
import { CampaignPdfButton } from "@/components/campaign-pdf-button";
import type { Campanha, DemoData, Revisao } from "@/types/domain";

export function CampaignOffer({
   campaign,
   revision,
   data,
   approval = false,
   visibleContextIds,
}: {
   campaign: Campanha;
   revision: Revisao;
   data: DemoData;
   approval?: boolean;
   visibleContextIds?: string[];
}) {
   const contexts = data.contextos.filter(
      c => revision.contextosIds.includes(c.id) && (!visibleContextIds || visibleContextIds.includes(c.id)),
   );
   const courseNames = [
      ...new Set(
         contexts.map(c => cursos.find(course => course.id === ofertas.find(o => o.id === c.ofertaId)?.cursoId)?.nome).filter(Boolean),
      ),
   ];
   const formats = [...new Set(contexts.map(c => ofertas.find(o => o.id === c.ofertaId)?.formato).filter(Boolean))];
   const turns = [...new Set(contexts.map(c => c.turno))];
   const win = janela(revision);
   const latest = lastRevision(campaign);
   const base = baseForRevision(revision, data, contexts[0]?.id ?? revision.contextosIds[0]);
   const standard = standardForRevision(revision, data, contexts[0]?.id ?? revision.contextosIds[0]);
   const basesVary =
      (revision.regras.some(r => r.tipo === "percentual" || r.tipo === "base") &&
         contexts.some(c => baseForRevision(revision, data, c.id) !== base)) ||
      (revision.regras.some(r => r.tipo === "padrao") && contexts.some(c => standardForRevision(revision, data, c.id) !== standard));
   return (
      <article className="campaign-offer">
         <div className="panel-heading">
            <div>
               <h2>
                  <Link state={approval ? { from: "/aprovacoes" } : undefined} to={`/campanhas/${campaign.id}?revisao=${revision.numero}`}>
                     {campaign.nome}
                  </Link>
               </h2>
               <p>
                  {formats.join(" · ")}
                  {turns.length > 0 && ` · ${turns.join(" / ")}`}
               </p>
            </div>
            <Status value={campaign.arquivadaEm ? "Arquivada" : revision.estado} />
         </div>
         {approval && (
            <p className="offer-courses">
               {courseNames.length <= 3
                  ? courseNames.join(" · ")
                  : `${courseNames.slice(0, 2).join(" · ")} e mais ${courseNames.length - 2} cursos`}
            </p>
         )}
         <dl className="offer-scope">
            <div>
               <dt>Ingresso</dt>
               <dd>{revision.elegibilidade.entradasCodigos.join(", ")}</dd>
            </div>
            <div>
               <dt>Adesão até</dt>
               <dd>{dateLabel(win.fim)}</dd>
            </div>
         </dl>
         <MonthlySchedule revision={revision} base={base} standard={standard} compact />
         {basesVary && <p className="offer-note">Valores para {contextLabel(contexts[0])}. Consulte as demais ofertas na campanha.</p>}
         {latest.numero !== revision.numero && (
            <p className="offer-note">
               A revisão {latest.numero} está {latest.estado === "em-aprovacao" ? "em aprovação" : "aguardando ajustes"}. Estas condições
               continuam aprovadas.
            </p>
         )}
         <footer className="offer-footer">
            <p>
               {approval
                  ? `${data.personas.find(p => p.id === campaign.criadaPor)?.nome} · enviada em ${dateLabel(revision.enviadaEm ?? campaign.criadaEm)}`
                  : `Revisão ${revision.numero}`}
            </p>
            <div className="offer-actions">
               <CampaignPdfButton campaign={campaign} revision={revision} data={data} />
               <Link
                  className={buttonVariants({ variant: "outline" })}
                  state={approval ? { from: "/aprovacoes" } : undefined}
                  to={`/campanhas/${campaign.id}?revisao=${revision.numero}`}
               >
                  {approval ? "Revisar campanha" : "Ver campanha"}
                  <ArrowRight data-icon="inline-end" aria-hidden />
               </Link>
            </div>
         </footer>
      </article>
   );
}
