import { describe, it, expect } from "vitest";
import { cronograma, cursos, gerarEntradas, listarMeses, ofertas, parseBRL, searchScore, valorDaRegra } from "@/lib/domain";
describe("catálogo e calendário operacional", () => {
   it("preserva os 82 cursos, 30 novos e exclui apenas o formato Integral", () => {
      expect(cursos).toHaveLength(82);
      expect(cursos.filter(c => c.novo)).toHaveLength(30);
      expect(ofertas).toHaveLength(124);
      expect(ofertas.some(o => o.formato === "Presencial Integral")).toBe(false);
      expect(ofertas.filter(o => o.cursoId === "enfermagem").map(o => o.formato)).toEqual(["Presencial Intensivo"]);
   });
   it("gera entradas compatíveis e datas civis inclusive em anos novos", () => {
      expect(gerarEntradas(2032, "Presencial").map(e => e.codigo)).toEqual(["2032/1", "2032/2"]);
      expect(gerarEntradas(2032, "Híbrido").map(e => e.codigo)).toEqual(["2032/21", "2032/22", "2032/23", "2032/24"]);
      expect(gerarEntradas(2032, "EAD")[3].fim).toBe("2032-12-31");
      expect(gerarEntradas(2032, "EAD")[0].fim).toBe("2032-03-31");
      expect(listarMeses("2027-12", "2028-02")).toEqual(["2027-12", "2028-01", "2028-02"]);
   });
   it.each(["ADS", "rh", "hibrido", "novo ead", "Administracao"])("busca local reconhece %s", q => {
      expect(cursos.filter(c => searchScore(c, q) >= 0).length).toBeGreaterThan(0);
   });
   it("não transforma RA em busca de dados pessoais no catálogo", () =>
      expect(cursos.filter(c => searchScore(c, "270000001") >= 0)).toHaveLength(0));
});
describe("financeiro em centavos", () => {
   it("janeiro isento + fevereiro a junho 599 resulta em 2995 e preserva zero", () => {
      const p = cronograma({ inicio: "2027-01", fim: "2027-06" }, [
         { inicio: "2027-01", fim: "2027-01", tipo: "isencao" },
         { inicio: "2027-02", fim: "2027-06", tipo: "fixo", valorCentavos: parseBRL("599,00") },
      ]);
      expect(p).toHaveLength(6);
      expect(p[0].valorCentavos).toBe(0);
      expect(p.reduce((n, m) => n + (m.valorCentavos ?? 0), 0)).toBe(299500);
      expect(parseBRL("0,00")).toBe(0);
   });
   it("bolsa exige base, limita percentual e arredonda a parcela", () => {
      expect(valorDaRegra({ tipo: "percentual", inicio: "2027-01", fim: "2027-12", percentualBps: 3000 }, 39999)).toBe(27999);
      expect(() => valorDaRegra({ tipo: "percentual", inicio: "2027-01", fim: "2027-12", percentualBps: 3000 })).toThrow("base");
      expect(() => valorDaRegra({ tipo: "percentual", inicio: "2027-01", fim: "2027-12", percentualBps: 10001 }, 100000)).toThrow();
   });
   it("não preenche lacunas e rejeita sobreposição, valor negativo e intervalo invertido", () => {
      const horizon = { inicio: "2027-01", fim: "2027-02" };
      expect(cronograma(horizon, [])[0].valorCentavos).toBeNull();
      expect(() =>
         cronograma(horizon, [
            { ...horizon, tipo: "isencao" },
            { ...horizon, tipo: "fixo", valorCentavos: 500 },
         ]),
      ).toThrow("sobrepostas");
      expect(() => parseBRL("-599")).toThrow();
      expect(() => listarMeses("2027-06", "2027-01")).toThrow();
   });
});
