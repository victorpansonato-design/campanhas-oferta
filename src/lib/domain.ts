import catalogo from "../../campanhas-oferta-kit/dados/catalogo-cursos.json";
import ofertasData from "../../campanhas-oferta-kit/dados/ofertas-catalogo.json";
import entradasData from "../../campanhas-oferta-kit/dados/entradas.json";
import type { Campanha, Contexto, DemoData, Intervalo, Regra, Revisao } from "@/types/domain";
import { commercialPrice, standardMonthly } from "@/lib/commercial-pricing";

export const cursos = catalogo.cursos;
export const ofertas = ofertasData.ofertas;
export const entradasIniciais = entradasData.entradas;
export const modalidades = ["Presencial", "Híbrido", "EAD"];
export const normalizeSearch = (text: string) =>
   text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" });
const dayFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" });
export const money = (centavos: number | null) => (centavos === null ? "Não definido" : currencyFormatter.format(centavos / 100));
export const monthLabel = (month: string) =>
   /^\d{4}-\d{2}$/.test(month) ? monthFormatter.format(new Date(`${month}-15T12:00:00Z`)) : "Não definido";
export const dateLabel = (date: string) =>
   date ? dayFormatter.format(new Date(date.length === 10 ? `${date}T12:00:00-03:00` : date)) : "—";
export function gerarEntradas(ano: number, modalidade: string) {
   if (!Number.isInteger(ano) || ano < 2000 || ano > 9999) throw new Error("Ano inválido");
   const suffixes =
      modalidade === "Presencial" ? [1, 2] : modalidade === "Híbrido" ? [21, 22, 23, 24] : modalidade === "EAD" ? [71, 72, 73, 74] : [];
   const span = modalidade === "Presencial" ? 6 : 3;
   return suffixes.map((suffix, index) => {
      const start = index * span + 1,
         end = start + span - 1;
      return {
         codigo: `${ano}/${suffix}`,
         ano,
         modalidade,
         inicio: `${ano}-${String(start).padStart(2, "0")}-01`,
         fim: `${ano}-${String(end).padStart(2, "0")}-${new Date(Date.UTC(ano, end, 0)).getUTCDate()}`,
      };
   });
}
export function listarMeses(inicio: string, fim: string) {
   const index = (m: string) => {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) throw new Error("Competência inválida");
      const [y, n] = m.split("-").map(Number);
      return y * 12 + n - 1;
   };
   const a = index(inicio),
      b = index(fim);
   if (b < a) throw new Error("Intervalo invertido");
   if (b - a > 120) throw new Error("O horizonte deve ter até 121 meses");
   return Array.from({ length: b - a + 1 }, (_, i) => `${Math.floor((a + i) / 12)}-${String(((a + i) % 12) + 1).padStart(2, "0")}`);
}
export function parseBRL(value: string) {
   const raw = value.trim().replace(/^R\$\s*/, "");
   if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(raw)) throw new Error("Informe um valor válido, como 599,00");
   const [whole, decimals = ""] = raw.replace(/\./g, "").split(",");
   const result = Number(whole) * 100 + Number(decimals.padEnd(2, "0"));
   if (!Number.isSafeInteger(result)) throw new Error("Valor fora do limite");
   return result;
}
export function valorDaRegra(rule: Regra, base?: number, standard?: number) {
   if (rule.tipo === "padrao") {
      if (!Number.isSafeInteger(standard) || standard! < 0)
         throw new Error("Mensalidade padrão não cadastrada para esta oferta, turno e ano.");
      return standard!;
   }
   if (rule.tipo === "isencao") return 0;
   if (rule.tipo === "fixo") {
      if (!Number.isSafeInteger(rule.valorCentavos) || rule.valorCentavos! < 0) throw new Error("Valor fixo inválido");
      return rule.valorCentavos!;
   }
   if (!Number.isSafeInteger(base) || base! < 0) throw new Error("Confirme o valor-base de referência para esta oferta");
   if (rule.tipo === "base") return base!;
   if (!Number.isInteger(rule.percentualBps) || rule.percentualBps! < 0 || rule.percentualBps! > 10000)
      throw new Error("Bolsa deve estar entre 0% e 100%");
   return Math.round((base! * (10000 - rule.percentualBps!)) / 10000);
}
export function cronograma(horizonte: Intervalo, regras: Regra[], base?: number, standard?: number) {
   for (const r of regras) {
      listarMeses(r.inicio, r.fim);
      if (r.inicio < horizonte.inicio || r.fim > horizonte.fim) throw new Error("Regra fora do horizonte de cobrança");
   }
   return listarMeses(horizonte.inicio, horizonte.fim).map(competencia => {
      const hits = regras.filter(r => r.inicio <= competencia && r.fim >= competencia);
      if (hits.length > 1) throw new Error(`Regras sobrepostas em ${monthLabel(competencia)}`);
      const incomplete =
         (hits[0]?.tipo === "fixo" && hits[0].valorCentavos === undefined) ||
         (hits[0]?.tipo === "percentual" && hits[0].percentualBps === undefined);
      return {
         competencia,
         valorCentavos: hits.length && !incomplete ? valorDaRegra(hits[0], base, standard) : null,
         estado:
            hits[0]?.tipo === "isencao"
               ? "isento"
               : hits[0]?.tipo === "padrao"
                 ? "padrao"
                 : hits.length && !incomplete
                   ? "definido"
                   : "nao-definido",
      };
   });
}
export const lastRevision = (camp: Campanha) => camp.revisoes[camp.revisoes.length - 1];
export const approvedRevision = (camp: Campanha) => camp.revisoes.filter(r => r.estado === "aprovada").at(-1);
export const baseForRevision = (revision: Revisao, data: DemoData, contextoId: string) =>
   revision.basesCongeladas?.[contextoId] ??
   commercialPrice(
      data.contextos.find(c => c.id === contextoId),
      revision,
   )?.valorContratoCentavos ??
   data.basesDemonstrativas.find(b => b.contextoId === contextoId)?.valorCentavos;
export function standardForRevision(revision: Revisao, data: DemoData, contextoId: string) {
   const price = commercialPrice(
      data.contextos.find(c => c.id === contextoId),
      revision,
   );
   return price ? standardMonthly(price) : undefined;
}
export const intervalosCruzam = (a: Intervalo, b: Intervalo) => a.inicio <= b.fim && b.inicio <= a.fim;
export function janela(rev: Revisao): Intervalo {
   if (rev.elegibilidade.janelaMatricula) return rev.elegibilidade.janelaMatricula;
   const entries = rev.elegibilidade.entradasCodigos.flatMap(code =>
      modalidades.flatMap(m => gerarEntradas(Number(code.split("/")[0]), m)).filter(e => e.codigo === code),
   );
   return {
      inicio: entries.map(e => e.inicio).sort()[0] ?? "",
      fim:
         entries
            .map(e => e.fim)
            .sort()
            .at(-1) ?? "",
   };
}
export function conflitos(rev: Revisao, data: DemoData, ownId?: string) {
   return data.campanhas
      .filter(c => c.id !== ownId && !c.arquivadaEm)
      .flatMap(c =>
         c.revisoes
            .filter(r => r === lastRevision(c) || r === approvedRevision(c))
            .filter(
               r =>
                  rev.contextosIds.some(id => r.contextosIds.includes(id)) &&
                  intervalosCruzam(janela(rev), janela(r)) &&
                  rev.regras.some(a => r.regras.some(b => intervalosCruzam(a, b))),
            )
            .map(r => ({ campanha: c, revisao: r, contextosIds: rev.contextosIds.filter(id => r.contextosIds.includes(id)) })),
      );
}
export function validateRevision(rev: Revisao, data: DemoData) {
   const errors: string[] = [];
   if (!rev.contextosIds.length) errors.push("Selecione pelo menos uma oferta disponível, com entrada e turno cadastrados.");
   if (!rev.elegibilidade.entradasCodigos.length) errors.push("Selecione uma entrada.");
   const entries = rev.contextosIds.map(id => data.contextos.find(c => c.id === id)).filter(Boolean) as Contexto[];
   for (const ctx of entries) {
      const offer = ofertas.find(o => o.id === ctx.ofertaId);
      if (
         !offer ||
         !gerarEntradas(Number(ctx.entradaCodigo.split("/")[0]), offer.modalidade).some(e => e.codigo === ctx.entradaCodigo) ||
         !rev.elegibilidade.entradasCodigos.includes(ctx.entradaCodigo)
      )
         errors.push("Entrada incompatível com a modalidade.");
      if (data.naoFormacao.some(n => n.contextoId === ctx.id && n.estado === "nao-formou"))
         errors.push(`Contexto indisponível: ${contextLabel(ctx)}. Restaure a formação ou remova esta oferta.`);
      try {
         if (
            cronograma(rev.horizonteCobranca, rev.regras, baseForRevision(rev, data, ctx.id), standardForRevision(rev, data, ctx.id)).some(
               p => p.valorCentavos === null,
            )
         )
            errors.push("Defina todos os meses do horizonte de cobrança.");
      } catch (err) {
         errors.push(`${contextLabel(ctx)}: ${(err as Error).message}`);
      }
   }
   if (rev.elegibilidade.janelaMatricula) {
      const win = rev.elegibilidade.janelaMatricula;
      if (!win.inicio || !win.fim || win.inicio > win.fim) errors.push("O prazo de adesão precisa de datas válidas em ordem.");
      const compatible = rev.elegibilidade.entradasCodigos.some(code =>
         modalidades.flatMap(m => gerarEntradas(Number(code.split("/")[0]), m)).some(e => e.codigo === code && intervalosCruzam(e, win)),
      );
      if (!compatible) errors.push("O prazo de adesão deve cruzar uma das entradas escolhidas.");
   }
   return [...new Set(errors)];
}
export function contextLabel(ctx: Contexto) {
   const offer = ofertas.find(o => o.id === ctx.ofertaId);
   return `${cursos.find(c => c.id === offer?.cursoId)?.nome ?? "Curso"} · ${offer?.formato ?? ""} · ${ctx.turno} · ${ctx.entradaCodigo}`;
}
export function campaignSummary(rev: Revisao) {
   return (
      rev.regras
         .map(
            r =>
               `${monthLabel(r.inicio)}${r.fim !== r.inicio ? ` a ${monthLabel(r.fim)}` : ""}: ${r.tipo === "isencao" ? "R$ 0,00 · Isento" : r.tipo === "fixo" ? `${money(r.valorCentavos ?? null)}/mês` : r.tipo === "percentual" ? `bolsa de ${(r.percentualBps ?? 0) / 100}% sobre o contrato` : r.tipo === "padrao" ? "mensalidade padrão com bolsa comercial" : "valor-base confirmado"}`,
         )
         .join("; ") || "Valores ainda não definidos"
   );
}
export function searchScore(course: (typeof cursos)[number], query: string) {
   const aliases: Record<string, string> = {
      ads: "analise e desenvolvimento de sistemas",
      rh: "recursos humanos",
      hibrido: "hibrido",
      novo: "novo",
   };
   const text = normalizeSearch(
      [course.nome, course.diploma, ...course.modalidades, ...course.formatosPermitidos, ...course.aliases, course.novo ? "novo" : ""].join(
         " ",
      ),
   );
   const tokens = normalizeSearch(query)
      .split(/\s+/)
      .filter(Boolean)
      .map(t => aliases[t] ?? t);
   if (!tokens.every(t => text.includes(t))) return -1;
   return normalizeSearch(course.nome) === normalizeSearch(query)
      ? 100
      : tokens.reduce((score, t) => score + (normalizeSearch(course.nome).includes(t) ? 10 : 1), 0);
}
