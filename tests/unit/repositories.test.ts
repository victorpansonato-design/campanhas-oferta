import { beforeEach, describe, expect, it } from "vitest";
import { env } from "@/config/env";
import { initialData, repository } from "@/services/repositories";
import { baseForRevision, cronograma, lastRevision, standardForRevision, validateRevision } from "@/lib/domain";
import type { Revisao } from "@/types/domain";
const originalSeed = await initialData();
const freshData = () => structuredClone(originalSeed);
beforeEach(() => localStorage.clear());
const revision = (): Revisao => ({
   ...structuredClone(freshData().campanhas[0].revisoes[0]),
   numero: 1,
   estado: "em-aprovacao",
   contextosIds: ["arquitetura-e-urbanismo__presencial__2027-1__noturno"],
   configuracao: {
      ano: 2027,
      modalidade: "Presencial",
      cursoIds: ["arquitetura-e-urbanismo"],
      formato: "Presencial",
      turno: "Noturno",
   },
});
describe("repositório mock persistente", () => {
   it("congela contrato e bolsa comercial ao enviar campanha com retorno à condição padrão", async () => {
      const r = revision();
      r.horizonteCobranca = { inicio: "2027-01", fim: "2027-12" };
      r.regras = [
         { inicio: "2027-01", fim: "2027-01", tipo: "isencao" },
         { inicio: "2027-02", fim: "2027-12", tipo: "padrao" },
      ];
      const saved = await repository.saveAndSubmit({ nome: "Janeiro isento", revisao: r }, "gestora-1");
      const submitted = lastRevision(saved);
      const price = submitted.precosComerciaisCongelados![r.contextosIds[0]];
      expect(price.ano).toBe(2027);
      expect(submitted.basesCongeladas![r.contextosIds[0]]).toBe(price.valorContratoCentavos);
      const reloaded = await repository.read();
      expect(standardForRevision(lastRevision(reloaded.campanhas.find(c => c.id === saved.id)!), reloaded, r.contextosIds[0])).toBe(
         Math.round((price.valorContratoCentavos * (10000 - price.bolsaComercialBps)) / 10000),
      );
   });
   it("cadastra explicitamente turno mock sem inventar uma base financeira", async () => {
      await repository.registerTurn(["direito__intensivo"], ["2032/21"], "Vespertino", "gestora-1");
      const data = await repository.read(2032),
         ctx = data.contextos.find(c => c.ofertaId === "direito__intensivo" && c.turno === "Vespertino" && c.entradaCodigo === "2032/21")!;
      expect(ctx).toBeDefined();
      expect(data.basesDemonstrativas.some(b => b.contextoId === ctx.id)).toBe(false);
      await expect(repository.registerTurn(["direito__intensivo"], ["2032/1"], "Vespertino", "gestora-1")).rejects.toThrow(
         "Entrada incompatível",
      );
   });
   it("não cria campanha, histórico ou notificação quando os valores estão incompletos", async () => {
      const before = await repository.read();
      const r = revision();
      r.regras = [{ inicio: r.horizonteCobranca.inicio, fim: r.horizonteCobranca.fim, tipo: "fixo" }];
      await expect(repository.saveAndSubmit({ nome: "Incompleta", revisao: r }, "gestora-1")).rejects.toThrow("Defina todos os meses");
      expect(await repository.read()).toEqual(before);
      expect(localStorage.getItem(env.storageKey)).toBeNull();
   });
   it("preserva a base congelada de bolsa aprovada após atualizar a referência", async () => {
      const before = await repository.read(),
         rev = before.campanhas[2].revisoes[0],
         ctx = rev.contextosIds[0],
         oldBase = baseForRevision(rev, before, ctx);
      await repository.setBase(ctx, 999000, 2027);
      const after = await repository.read();
      expect(baseForRevision(after.campanhas[2].revisoes[0], after, ctx)).toBe(oldBase);
      expect(after.basesDemonstrativas.find(b => b.contextoId === ctx)?.valorCentavos).toBe(999000);
   });
   it("cria diretamente em aprovação e bloqueia decisões duplicadas", async () => {
      const r = revision();
      const seed = freshData();
      r.contextosIds = [seed.contextos.find(c => c.ofertaId === "arquitetura-e-urbanismo__presencial" && c.entradaCodigo === "2027/1")!.id];
      const c = await repository.saveAndSubmit({ nome: "Condição teste", revisao: r }, "gestora-1");
      expect(lastRevision(c).estado).toBe("em-aprovacao");
      expect(c.revisoes[0].enviadaEm).toBeTruthy();
      await expect(repository.decide(c.id, 1, "gestora-1", true, "")).rejects.toThrow("gestora responsável");
      await repository.decide(c.id, 1, "gestora-responsavel", true, "");
      const data = await repository.read();
      expect(lastRevision(data.campanhas.find(x => x.id === c.id)!).estado).toBe("aprovada");
      expect(data.notificacoes.find(n => n.campanhaId === c.id)?.estado).toBe("simulada");
      await expect(repository.decide(c.id, 1, "gestora-responsavel", true, "")).rejects.toThrow("já recebeu");
      expect(JSON.parse(localStorage.getItem(env.storageKey)!).campanhas.some((x: { id: string }) => x.id === c.id)).toBe(true);
   });
   it("cria revisão sem alterar a aprovada ou a matrícula vinculada; arquivar preserva ambas", async () => {
      const original = freshData(),
         bound = structuredClone(original.matriculas.find(m => m.campanhaVinculada)!.campanhaVinculada);
      await repository.decide("camp-001", 2, "gestora-responsavel", true, "");
      const changed = structuredClone(lastRevision((await repository.read()).campanhas[0]));
      changed.regras[1].valorCentavos = 49900;
      const result = await repository.saveAndSubmit(
         { id: "camp-001", expectedRevision: 2, nome: "Administração revisada", revisao: changed },
         "gestora-1",
      );
      expect(result.revisoes).toHaveLength(3);
      expect(result.revisoes[0].regras[1].valorCentavos).toBe(59900);
      expect(result.revisoes[1].regras[1].valorCentavos).toBe(54900);
      await repository.decide("camp-001", 3, "gestora-responsavel", false, "Ajustar o prazo");
      await repository.archive("camp-001", "gestora-1");
      expect((await repository.read()).matriculas.find(m => m.campanhaVinculada)!.campanhaVinculada).toEqual(bound);
   });
   it("devolver requer comentário e mantém a decisão ao criar nova revisão", async () => {
      await expect(repository.decide("camp-002", 1, "gestora-responsavel", false, "")).rejects.toThrow("motivo");
      await repository.decide("camp-002", 1, "gestora-responsavel", false, "Rever o prazo");
      const old = (await repository.read()).campanhas[1];
      const next = await repository.saveAndSubmit(
         { id: old.id, expectedRevision: 1, nome: old.nome, revisao: lastRevision(old) },
         "gestora-2",
      );
      expect(next.revisoes[0].decisao?.comentario).toBe("Rever o prazo");
      expect(lastRevision(next).numero).toBe(2);
   });
   it("bloqueia proposta incompatível e revisão esperada desatualizada", async () => {
      const data = await repository.read(),
         c = await repository.saveAndSubmit({ nome: "Conflito", revisao: structuredClone(data.campanhas[0].revisoes[0]) }, "gestora-2");
      await expect(repository.decide(c.id, 1, "gestora-responsavel", true, "")).rejects.toThrow("Conflito");
      await expect(repository.decide("camp-002", 9, "gestora-responsavel", true, "")).rejects.toThrow("revisão mudou");
   });
   it("envios simultâneos de uma revisão criam só uma nova versão e uma notificação", async () => {
      await repository.decide("camp-002", 1, "gestora-responsavel", false, "Revisar");
      const c = (await repository.read()).campanhas.find(c => c.id === "camp-002")!;
      const input = { id: c.id, expectedRevision: 1, nome: c.nome, revisao: lastRevision(c) };
      const results = await Promise.allSettled([
         repository.saveAndSubmit(input, "gestora-2"),
         repository.saveAndSubmit(input, "gestora-2"),
      ]);
      expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
      const data = await repository.read();
      expect(data.campanhas.find(c => c.id === input.id)!.revisoes).toHaveLength(2);
      expect(data.notificacoes.filter(n => n.campanhaId === input.id && n.revisao === 2)).toHaveLength(1);
   });
   it("remove rascunhos legados preservando versões aprovadas e matrículas", async () => {
      const data = freshData();
      const snapshot = structuredClone(data.matriculas);
      const legacy = {
         ...data,
         campanhas: [
            ...data.campanhas.map((c, i) =>
               i === 0 ? { ...c, revisoes: [...c.revisoes, { ...lastRevision(c), numero: 3, estado: "rascunho" }] } : c,
            ),
            { ...data.campanhas[0], id: "draft-only", revisoes: [{ ...revision(), estado: "rascunho" }] },
         ],
      };
      localStorage.setItem(env.storageKey, JSON.stringify(legacy));
      localStorage.setItem("anchieta.editor.v1.nova-global", "old editor buffer");
      localStorage.setItem("outro-app", "preservar");
      const migrated = await repository.read();
      expect(migrated.campanhas).toHaveLength(data.campanhas.length);
      expect(migrated.campanhas[0].revisoes).toEqual(data.campanhas[0].revisoes);
      expect(migrated.matriculas).toEqual(snapshot);
      expect(localStorage.getItem(env.storageKey)).not.toContain("rascunho");
      expect(localStorage.getItem("anchieta.editor.v1.nova-global")).toBeNull();
      expect(localStorage.getItem("outro-app")).toBe("preservar");
   });
   it("não formação vale só para contexto, restauração preserva histórico e alunos", async () => {
      const before = await repository.read(),
         ctx = before.contextos.find(c => c.ofertaId === "biotecnologia__semipresencial" && c.entradaCodigo === "2027/22")!;
      const id = await repository.register(ctx.id, "Teste contextual", "gestora-1", 2027);
      const data = await repository.read();
      const r = revision();
      r.contextosIds = [ctx.id];
      r.elegibilidade.entradasCodigos = [ctx.entradaCodigo];
      expect(validateRevision(r, data).some(e => e.includes("indisponível"))).toBe(true);
      expect(data.naoFormacao.some(n => n.contextoId === ctx.id && n.estado === "nao-formou")).toBe(true);
      await repository.restore(id, "Turma confirmada na demonstração", "gestora-1");
      const restored = await repository.read();
      expect(restored.matriculas).toEqual(before.matriculas);
      expect(restored.naoFormacao.find(n => n.id === id)?.estado).toBe("revertido");
      expect(restored.historico.some(h => h.entidadeId === id && h.acao === "revertido")).toBe(true);
   });
   it("dados corrompidos exibem erro e reset limita-se à chave da aplicação", async () => {
      localStorage.setItem("outro-app", "preservar");
      localStorage.setItem(env.storageKey, "{corrompido");
      await expect(repository.read()).rejects.toThrow("danificados");
      await repository.reset();
      expect((await repository.read()).campanhas).toHaveLength(originalSeed.campanhas.length);
      expect(localStorage.getItem("outro-app")).toBe("preservar");
   });
   it("uma entrada trimestral admite cobrança até dezembro", () => {
      const data = freshData(),
         r = structuredClone(data.campanhas[1].revisoes[0]);
      r.horizonteCobranca.fim = "2027-12";
      r.regras[0].fim = "2027-12";
      expect(validateRevision(r, data)).toEqual([]);
      expect(cronograma(r.horizonteCobranca, r.regras)).toHaveLength(12);
   });
});
