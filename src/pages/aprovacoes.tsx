import { Link } from "react-router-dom";
import { PageHeading, DataBoundary } from "@/components/shared";
import { CampaignOffer } from "@/components/campaign-offer";
import { EmptyState } from "@/components/ui/empty-state";
import { Callout } from "@/components/ui/callout";
import { useDemo } from "@/hooks/use-demo";
import { useSession, currentPersona } from "@/stores/session.store";
import { lastRevision } from "@/lib/domain";
export default function Aprovacoes() {
   const query = useDemo(),
      persona = currentPersona(useSession(s => s.personaId));
   return (
      <div className="focused-page approvals-page">
         <PageHeading title="Aprovações" description="Revise as condições de cada campanha para aprovar ou pedir ajustes." />
         {persona.perfil !== "aprovadora" && (
            <Callout className="mb-6">Você pode consultar as propostas. Para decidir, selecione Carolina Costa na área do perfil.</Callout>
         )}
         <DataBoundary query={query}>
            {data => {
               const pending = data.campanhas.filter(c => !c.arquivadaEm && lastRevision(c).estado === "em-aprovacao");
               return (
                  <>
                     <p className="result-count">
                        {pending.length} {pending.length === 1 ? "campanha aguardando aprovação" : "campanhas aguardando aprovação"}
                     </p>
                     {!pending.length ? (
                        <EmptyState
                           title="Nenhuma proposta pendente"
                           hint="As novas propostas aparecerão aqui após o envio."
                           actions={<Link to="/campanhas">Consultar campanhas</Link>}
                        />
                     ) : (
                        <div className="approval-list">
                           {pending.map(c => (
                              <CampaignOffer key={c.id} campaign={c} revision={lastRevision(c)} data={data} approval />
                           ))}
                        </div>
                     )}
                  </>
               );
            }}
         </DataBoundary>
      </div>
   );
}
