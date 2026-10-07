import { describe, expect, it } from "vitest";
import { commercialPrice, commercialPrices, standardMonthly, withStandardTail } from "@/lib/commercial-pricing";
import { cronograma, ofertas, standardForRevision, validateRevision } from "@/lib/domain";
import { initialData } from "@/services/repositories";

const data = await initialData();
const ctx = data.contextos.find(c => c.ofertaId === "administracao__presencial" && c.turno === "Noturno" && c.entradaCodigo === "2027/1")!;
describe("condição comercial anual", () => {
   it("cobre todas as ofertas e calcula Administração noturno com arredondamento em centavos", () => {
      expect(ofertas.every(o => commercialPrices.some(p => p.ofertaId === o.id && p.ano === 2027))).toBe(true);
      const price = commercialPrice(ctx)!;
      expect(price.valorContratoCentavos).toBe(199605);
      expect(price.bolsaComercialBps).toBe(5500);
      expect(standardMonthly(price)).toBe(89822);
      expect(commercialPrice({ ...ctx, entradaCodigo: "2028/1" })).toBeUndefined();
      expect(commercialPrice({ ...ctx, turno: "Turno novo" })).toBeUndefined();
   });
   it("aplica a campanha primeiro e retorna à bolsa padrão até dezembro", () => {
      const horizon = { inicio: "2027-01", fim: "2027-12" };
      const rules = withStandardTail(horizon, [{ inicio: "2027-01", fim: "2027-02", tipo: "isencao" }]);
      const installments = cronograma(horizon, rules, 199605, 89822);
      expect(installments.slice(0, 2).map(p => p.valorCentavos)).toEqual([0, 0]);
      expect(installments.slice(2).every(p => p.valorCentavos === 89822 && p.estado === "padrao")).toBe(true);
      expect(installments.reduce((sum, p) => sum + p.valorCentavos!, 0)).toBe(898220);
      expect(withStandardTail(horizon, rules)).toEqual(rules);
   });
   it("não oculta lacunas nos benefícios nem usa a tabela de outro ano", () => {
      const revision = structuredClone(data.campanhas[0].revisoes[0]);
      revision.horizonteCobranca = { inicio: "2027-01", fim: "2027-12" };
      revision.regras = withStandardTail(revision.horizonteCobranca, [{ inicio: "2027-02", fim: "2027-02", tipo: "isencao" }]);
      expect(validateRevision(revision, data).some(e => e.includes("Defina todos os meses"))).toBe(true);
      expect(() => cronograma({ inicio: "2028-01", fim: "2028-12" }, [{ inicio: "2028-01", fim: "2028-12", tipo: "padrao" }])).toThrow(
         "não cadastrada",
      );
   });
   it("a condição congelada prevalece sobre a tabela anual", () => {
      const revision = structuredClone(data.campanhas[0].revisoes[0]);
      revision.precosComerciaisCongelados = {
         [ctx.id]: { ...commercialPrice(ctx)!, valorContratoCentavos: 200000, bolsaComercialBps: 5000 },
      };
      expect(standardForRevision(revision, data, ctx.id)).toBe(100000);
      expect(standardMonthly(commercialPrice(ctx)!)).toBe(89822);
   });
});
