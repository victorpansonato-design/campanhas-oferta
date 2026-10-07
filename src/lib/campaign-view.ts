import { approvedRevision, cursos, lastRevision, normalizeSearch, ofertas, searchScore } from "@/lib/domain";
import type { DemoData } from "@/types/domain";

export function campaignView(data: DemoData, params: URLSearchParams) {
   const state = params.get("estado") ?? "aprovada";
   const query = normalizeSearch(params.get("q") ?? "");
   return data.campanhas.flatMap(campaign => {
      const revision = state === "aprovada" ? approvedRevision(campaign) : lastRevision(campaign);
      if (
         !revision ||
         (state !== "todos" && (state === "arquivada" ? !campaign.arquivadaEm : campaign.arquivadaEm || revision.estado !== state))
      )
         return [];
      const contexts = data.contextos.filter(ctx => revision.contextosIds.includes(ctx.id));
      const matches = contexts.some(ctx => {
         const offer = ofertas.find(o => o.id === ctx.ofertaId);
         const course = cursos.find(c => c.id === offer?.cursoId);
         return (
            offer &&
            course &&
            (!params.get("modalidade") || offer.modalidade === params.get("modalidade")) &&
            (!params.get("ano") || ctx.entradaCodigo.startsWith(`${params.get("ano")}/`)) &&
            (!query || searchScore(course, query) >= 0)
         );
      });
      return matches ? [{ campaign, revision }] : [];
   });
}
