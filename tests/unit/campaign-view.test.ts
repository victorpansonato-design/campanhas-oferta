import { expect, it } from "vitest";
import { campaignView } from "@/lib/campaign-view";
import { initialData } from "@/services/repositories";
import { cursos, ofertas } from "@/lib/domain";

const data = await initialData();
it("abre somente aprovadas e preserva a revisão liberada quando há proposta pendente", () => {
   const list = campaignView(data, new URLSearchParams());
   expect(list.length).toBeGreaterThan(0);
   expect(list.every(c => c.revision.estado === "aprovada" && !c.campaign.arquivadaEm)).toBe(true);
   expect(list.find(c => c.campaign.id === "camp-001")?.revision.numero).toBe(1);
   expect(campaignView(data, new URLSearchParams("estado=em-aprovacao")).find(c => c.campaign.id === "camp-001")?.revision.numero).toBe(2);
   expect(campaignView(data, new URLSearchParams("estado=todos"))).toHaveLength(data.campanhas.length);
});
it("pesquisa o curso com acento ou alias, sem usar o nome da campanha", () => {
   const copy = structuredClone(data);
   copy.campanhas.forEach(c => {
      c.nome = "Nome exclusivo da oferta";
   });
   expect(campaignView(copy, new URLSearchParams("q=administracao")).length).toBeGreaterThan(0);
   expect(campaignView(copy, new URLSearchParams("q=Nome exclusivo da oferta&estado=todos"))).toEqual([]);
   const course = cursos.find(c => c.id === "administracao")!;
   if (course.aliases.length) expect(campaignView(copy, new URLSearchParams({ q: course.aliases[0] })).length).toBeGreaterThan(0);
});
it("combina curso, ano e modalidade no mesmo contexto", () => {
   const result = campaignView(data, new URLSearchParams("q=administracao&modalidade=Presencial&ano=2027&estado=todos"));
   expect(result.length).toBeGreaterThan(0);
   expect(
      result.every(({ revision }) =>
         revision.contextosIds.some(id => {
            const ctx = data.contextos.find(c => c.id === id)!;
            const offer = ofertas.find(o => o.id === ctx.ofertaId)!;
            return offer.cursoId === "administracao" && offer.modalidade === "Presencial" && ctx.entradaCodigo.startsWith("2027/");
         }),
      ),
   ).toBe(true);
   expect(campaignView(data, new URLSearchParams("q=administracao&modalidade=Presencial&ano=2032"))).toEqual([]);
});
