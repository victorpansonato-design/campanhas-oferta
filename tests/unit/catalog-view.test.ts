import { expect, it } from "vitest";
import { catalogView } from "@/lib/catalog-view";
import { cursos, ofertas } from "@/lib/domain";
import { initialData, repository } from "@/services/repositories";

it("mantém as 82 ofertas de cursos e pesquisa por aliases sem acentos", async () => {
   const data = await initialData();
   expect(catalogView(data, new URLSearchParams()).results).toHaveLength(82);
   const result = catalogView(data, new URLSearchParams({ q: "agrocomputacao" })).results;
   expect(result.map(c => c.id)).toEqual(["agrocomputacao"]);
   for (const modality of ["Presencial", "Híbrido", "EAD"]) {
      const expected = cursos.filter(c => ofertas.some(o => o.cursoId === c.id && o.modalidade === modality));
      expect(
         catalogView(data, new URLSearchParams({ modalidade: modality, formacao: "incluir" }))
            .results.map(c => c.id)
            .sort(),
      ).toEqual(expected.map(c => c.id).sort());
   }
});
it("omite somente o contexto sem formação e permite consultar a imagem cinza", async () => {
   const data = await initialData(),
      record = data.naoFormacao.find(n => n.estado === "nao-formou")!;
   const context = data.contextos.find(c => c.id === record.contextoId)!,
      offer = ofertas.find(o => o.id === context.ofertaId)!;
   const params = new URLSearchParams({
      modalidade: offer.modalidade,
      formato: offer.formato,
      turno: context.turno,
      entrada: context.entradaCodigo,
   });
   expect(
      catalogView(data, params)
         .rows.get(offer.cursoId)!
         .offers.some(o => o.id === offer.id),
   ).toBe(false);
   params.set("formacao", "incluir");
   expect(
      catalogView(data, params)
         .rows.get(offer.cursoId)!
         .unavailable.some(c => c.id === context.id),
   ).toBe(true);
});
it("separa turnos desconhecidos dos cadastrados e usa snapshots estáveis por ano", async () => {
   localStorage.clear();
   const first = await repository.read(2027);
   expect(await repository.read(2027)).toBe(first);
   const sample = structuredClone(first);
   sample.contextos = sample.contextos.filter(c => c.ofertaId !== ofertas[0].id);
   const params = new URLSearchParams({ turno: "desconhecido" });
   const view = catalogView(sample, params),
      known = new Set(sample.contextos.map(c => c.ofertaId));
   expect(view.results.length).toBeGreaterThan(0);
   expect([...view.rows.values()].flatMap(r => r.offers).every(o => !known.has(o.id))).toBe(true);
   const future = await repository.read(2032);
   expect(future.contextos.some(c => c.entradaCodigo.startsWith("2032/"))).toBe(true);
   expect(await repository.read(2032)).toBe(future);
});
