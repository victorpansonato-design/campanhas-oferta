import table from "@/data/commercial-pricing.json";
import { precoComercialSchema, type Contexto, type PrecoComercial, type Revisao, type Regra, type Intervalo } from "@/types/domain";

// Local substitute for the annual Lyceum table. Exact offer, shift and intake year are required.
export const commercialPrices = precoComercialSchema.array().parse(table);
export const standardMonthly = (price: PrecoComercial) =>
   Math.round((price.valorContratoCentavos * (10000 - price.bolsaComercialBps)) / 10000);
export function commercialPrice(context: Contexto | undefined, revision?: Revisao) {
   if (!context) return undefined;
   return (
      revision?.precosComerciaisCongelados?.[context.id] ??
      commercialPrices.find(
         p => p.ofertaId === context.ofertaId && p.turno === context.turno && p.ano === Number(context.entradaCodigo.split("/")[0]),
      )
   );
}

export function withStandardTail(horizon: Intervalo, rules: Regra[]): Regra[] {
   if (!rules.length) return rules;
   const end = rules
      .map(r => r.fim)
      .sort()
      .at(-1)!;
   if (!/^\d{4}-\d{2}$/.test(end) || end >= horizon.fim) return rules;
   const [year, month] = end.split("-").map(Number);
   const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
   return [...rules, { inicio: next, fim: horizon.fim, tipo: "padrao" }];
}
