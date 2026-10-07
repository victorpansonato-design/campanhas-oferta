import { approvedRevision, cursos, gerarEntradas, ofertas, searchScore } from "@/lib/domain";
import type { Contexto, DemoData } from "@/types/domain";

export function catalogView(data: DemoData, params: URLSearchParams) {
   const ano = Number(params.get("ano") ?? 2027),
      mode = params.get("modalidade"),
      entry = params.get("entrada"),
      turn = params.get("turno"),
      format = params.get("formato"),
      include = params.get("formacao") === "incluir";
   const contextsByOffer = new Map<string, Contexto[]>(),
      knownOffers = new Set<string>();
   const unavailableIds = new Set(data.naoFormacao.filter(n => n.estado === "nao-formou").map(n => n.contextoId));
   for (const c of data.contextos) {
      knownOffers.add(c.ofertaId);
      if (!c.entradaCodigo.startsWith(`${ano}/`) || (entry && c.entradaCodigo !== entry) || (turn && c.turno !== turn)) continue;
      const list = contextsByOffer.get(c.ofertaId) ?? [];
      list.push(c);
      contextsByOffer.set(c.ofertaId, list);
   }
   const campaignsByContext = new Map<string, Set<string>>();
   for (const campaign of data.campanhas) {
      if (campaign.arquivadaEm) continue;
      for (const id of approvedRevision(campaign)?.contextosIds ?? []) {
         const ids = campaignsByContext.get(id) ?? new Set<string>();
         ids.add(campaign.id);
         campaignsByContext.set(id, ids);
      }
   }
   const compatible = new Map(["Presencial", "Híbrido", "EAD"].map(m => [m, new Set(gerarEntradas(ano, m).map(e => e.codigo))]));
   const rows = new Map(
      cursos.map(c => [c.id, { offers: [] as typeof ofertas, contexts: [] as Contexto[], campaigns: 0, unavailable: [] as Contexto[] }]),
   );
   for (const offer of ofertas) {
      if (
         (mode && offer.modalidade !== mode) ||
         (format && offer.formato !== format) ||
         (entry && !compatible.get(offer.modalidade)?.has(entry))
      )
         continue;
      const contexts = contextsByOffer.get(offer.id) ?? [];
      if (turn === "desconhecido" ? knownOffers.has(offer.id) : turn && !contexts.length) continue;
      if (!include && contexts.length && contexts.every(c => unavailableIds.has(c.id))) continue;
      const row = rows.get(offer.cursoId)!;
      row.offers.push(offer);
      row.contexts.push(...contexts);
   }
   for (const row of rows.values()) {
      const campaigns = new Set<string>();
      for (const c of row.contexts) {
         if (unavailableIds.has(c.id)) row.unavailable.push(c);
         for (const id of campaignsByContext.get(c.id) ?? []) campaigns.add(id);
      }
      row.campaigns = campaigns.size;
   }
   const query = params.get("q") ?? "";
   const scores = new Map(cursos.map(c => [c.id, searchScore(c, query)]));
   const results = cursos
      .filter(c => {
         const row = rows.get(c.id)!;
         return (
            row.offers.length &&
            scores.get(c.id)! >= 0 &&
            (!params.get("novo") || c.novo) &&
            (!params.get("diploma") || c.diploma === params.get("diploma")) &&
            (!params.get("campanha") || (params.get("campanha") === "com" ? row.campaigns > 0 : row.campaigns === 0)) &&
            (!turn || turn === "desconhecido" || row.contexts.length) &&
            (include || !row.contexts.length || row.unavailable.length < row.contexts.length)
         );
      })
      .sort((a, b) => scores.get(b.id)! - scores.get(a.id)! || a.nome.localeCompare(b.nome, "pt-BR"));
   return { rows, results };
}
