import { env } from "@/config/env";
import {
   approvedRevision,
   baseForRevision,
   campaignSummary,
   conflitos,
   contextLabel,
   gerarEntradas,
   lastRevision,
   ofertas,
   validateRevision,
} from "@/lib/domain";
import { dataSchema, revisaoSchema, type Campanha, type DemoData, type Revisao } from "@/types/domain";
import { commercialPrice } from "@/lib/commercial-pricing";
import { isRefundTerminal, refundLabels, refundOrder, validatePayment } from "@/lib/refunds";
import type { RefundRepository } from "@/services/refund-contract";
import type { RefundBalance } from "@/types/refunds";

function freezeLegacyBases(data: DemoData) {
   for (const c of data.campanhas)
      for (const r of c.revisoes)
         if (!r.basesCongeladas && (r.estado === "aprovada" || r.estado === "em-aprovacao")) {
            r.basesCongeladas = Object.fromEntries(
               data.basesDemonstrativas.filter(b => r.contextosIds.includes(b.contextoId)).map(b => [b.contextoId, b.valorCentavos]),
            );
         }
   return data;
}
function migrate(input: unknown): DemoData {
   // Old, unsubmitted revisions are removed; approved revisions and enrollment snapshots stay intact.
   const raw = structuredClone(input) as Record<string, unknown>;
   const campaigns = raw.campanhas as Array<{ id: string; revisoes: Array<{ estado: string }> }>;
   raw.campanhas = campaigns.map(c => ({ ...c, revisoes: c.revisoes.filter(r => r.estado !== "rascunho") })).filter(c => c.revisoes.length);
   const ids = new Set((raw.campanhas as typeof campaigns).map(c => c.id));
   raw.historico = (raw.historico as Array<{ entidade: string; entidadeId: string; acao: string }>).filter(
      h => h.acao !== "rascunho-salvo" && (h.entidade !== "campanha" || ids.has(h.entidadeId)),
   );
   raw.notificacoes = (raw.notificacoes as Array<{ campanhaId: string }>).filter(n => ids.has(n.campanhaId));
   // Keep the sample records, while removing presentation annotations from their visible text.
   for (const c of raw.campanhas as Array<{ nome: string; revisoes: Array<{ condicoes: string; configuracao?: { turno: string } }> }>) {
      c.nome = c.nome.replace(/\s*\(demo\)/gi, "");
      for (const r of c.revisoes) {
         if (r.configuracao) r.configuracao.turno = r.configuracao.turno.replace(/\s*\(demo\)/gi, "");
         r.condicoes = r.condicoes.replace("Valores e condições fictícios para demonstração. ", "");
      }
   }
   for (const ctx of raw.contextos as Array<{ turno: string }>) ctx.turno = ctx.turno.replace(/\s*\(demo\)/gi, "");
   for (const p of raw.personas as Array<{ nome: string }>) p.nome = p.nome.replace(/\bExemplo\s*/g, "").trim();
   for (const f of raw.naoFormacao as Array<{ observacao: string; reversao: { motivo: string } | null }>) {
      f.observacao = f.observacao.replace("Histórico demonstrativo", "Histórico de formação");
      if (f.reversao) f.reversao.motivo = f.reversao.motivo.replace(" no cenário de demonstração", "");
   }
   if (raw.schemaVersion === 1) {
      const old = structuredClone(raw) as { schemaVersion: number; matriculas: Array<{ id: string; ra: string; ficticio: boolean }> };
      const seedIds = old.matriculas
         .filter(m => m.ficticio)
         .map(m => m.id)
         .sort();
      for (const student of old.matriculas)
         if (student.ficticio && !/^\d{7}$/.test(student.ra)) student.ra = String(1000001 + seedIds.indexOf(student.id));
      old.schemaVersion = 2;
      return freezeLegacyBases(dataSchema.parse(old));
   }
   return freezeLegacyBases(dataSchema.parse(raw));
}
export const initialData = async () => migrate(structuredClone((await import("../../campanhas-oferta-kit/dados/demo.json")).default));
let cached: { raw: string | null; data: DemoData } | undefined;
const years = new WeakMap<DemoData, Map<number, DemoData>>();
function persist(data: DemoData) {
   const validated = dataSchema.parse(data),
      raw = JSON.stringify(validated);
   localStorage.setItem(env.storageKey, raw);
   cached = { raw, data: validated };
}
export function subscribeRepository(listener: () => void) {
   const handler = (event: StorageEvent) => {
      if (event.key === env.storageKey || event.key === null) {
         cached = undefined;
         listener();
      }
   };
   window.addEventListener("storage", handler);
   return () => window.removeEventListener("storage", handler);
}
export interface CatalogRepository {
   read(ano?: number): Promise<DemoData>;
}
export interface CampaignRepository {
   saveAndSubmit(input: { id?: string; expectedRevision?: number; nome: string; revisao: Revisao }, personaId: string): Promise<Campanha>;
   decide(id: string, expectedRevision: number, personaId: string, approve: boolean, comment: string): Promise<void>;
   archive(id: string, personaId: string): Promise<void>;
}
export interface FormationRepository {
   register(contextoId: string, observacao: string, personaId: string, ano: number): Promise<string>;
   restore(id: string, motivo: string, personaId: string): Promise<void>;
}
export interface EnrollmentRepository {
   list(contextoId: string): Promise<DemoData["matriculas"]>;
}
const delay = () => Promise.resolve();
const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const now = () => new Date().toISOString();
let failNextRead = false;
export function simulateReadError() {
   failNextRead = true;
}
async function load(): Promise<DemoData> {
   const raw = localStorage.getItem(env.storageKey);
   if (cached && cached.raw === raw) return cached.data;
   try {
      const data = raw ? migrate(JSON.parse(raw)) : await initialData();
      cached = { raw, data };
      if (raw && raw !== JSON.stringify(data)) persist(data);
      Object.keys(localStorage)
         .filter(key => key.startsWith("anchieta.editor.v1."))
         .forEach(key => localStorage.removeItem(key));
      return data;
   } catch {
      throw new Error("Os dados salvos estão incompatíveis ou danificados. Restaure os dados nas preferências.");
   }
}
function extendYear(data: DemoData, ano: number) {
   if (ano < 2000 || ano > 9999) return;
   const ids = new Set(data.contextos.map(c => c.id)),
      existing = new Set(data.contextos.map(c => `${c.ofertaId}|${c.turno}|${c.entradaCodigo}`));
   const turnsByOffer = new Map<string, Set<string>>();
   for (const c of data.contextos) {
      const turns = turnsByOffer.get(c.ofertaId) ?? new Set<string>();
      turns.add(c.turno);
      turnsByOffer.set(c.ofertaId, turns);
   }
   for (const offer of ofertas)
      for (const turno of turnsByOffer.get(offer.id) ?? [])
         for (const entry of gerarEntradas(ano, offer.modalidade)) {
            const key = `${offer.id}|${turno}|${entry.codigo}`;
            if (existing.has(key)) continue;
            const id = `${offer.id}__${entry.codigo.replace("/", "-")}__${turno.toLowerCase().split(" ")[0]}`;
            if (!ids.has(id)) {
               data.contextos.push({
                  id,
                  ofertaId: offer.id,
                  turno,
                  entradaCodigo: entry.codigo,
                  campusId: null,
                  poloId: null,
                  ficticio: true,
               });
               ids.add(id);
               existing.add(key);
            }
         }
}
function event(
   data: DemoData,
   entity: string,
   id: string,
   action: string,
   personaId: string,
   revision?: number,
   comment: string | null = null,
) {
   data.historico.push({
      id: uid("evento"),
      entidade: entity,
      entidadeId: id,
      acao: action,
      personaId,
      timestamp: now(),
      revisao: revision ?? null,
      comentario: comment,
   });
}
function proposer(data: DemoData, personaId: string, campaign?: Campanha) {
   if (data.personas.find(p => p.id === personaId)?.perfil !== "proponente")
      throw new Error("Use um perfil proponente para criar ou editar campanhas.");
   if (campaign && campaign.criadaPor !== personaId) throw new Error("Somente a autora pode editar esta campanha. Você pode duplicá-la.");
}
let queue: Promise<unknown> = Promise.resolve();
function transaction<T>(work: (data: DemoData) => T | Promise<T>): Promise<T> {
   const result = queue.then(async () => {
      await delay();
      const data = structuredClone(await load());
      const value = await work(data);
      persist(data);
      return value;
   });
   queue = result.catch(() => undefined);
   return result;
}
function find(data: DemoData, id: string) {
   const c = data.campanhas.find(c => c.id === id);
   if (!c) throw new Error("Campanha não encontrada");
   return c;
}
export const repository: CatalogRepository &
   CampaignRepository &
   FormationRepository &
   EnrollmentRepository & {
      reset(): Promise<void>;
      setBase(contextoId: string, valorCentavos: number, ano: number): Promise<void>;
      registerTurn(ofertaIds: string[], entradas: string[], turno: string, personaId: string): Promise<void>;
   } & RefundRepository = {
   async read(ano = 2027) {
      await delay();
      if (failNextRead) {
         failNextRead = false;
         throw new Error("Não foi possível carregar os dados. Tente novamente.");
      }
      const source = await load(),
         perYear = years.get(source) ?? new Map<number, DemoData>();
      if (!perYear.has(ano)) {
         const data = structuredClone(source);
         extendYear(data, ano);
         perYear.set(ano, data);
         years.set(source, perYear);
      }
      return perYear.get(ano)!;
   },
   async reset() {
      await queue;
      persist(await initialData());
      Object.keys(localStorage)
         .filter(key => key.startsWith("anchieta.editor.v1."))
         .forEach(key => localStorage.removeItem(key));
   },
   saveAndSubmit(input, personaId) {
      return transaction(data => {
         const existing = input.id ? find(data, input.id) : undefined;
         proposer(data, personaId, existing);
         if (existing?.arquivadaEm) throw new Error("Duplique a campanha arquivada para criar uma nova proposta.");
         if (existing && lastRevision(existing).estado === "em-aprovacao")
            throw new Error("Aguarde a decisão antes de editar esta revisão.");
         if (existing && input.expectedRevision !== lastRevision(existing).numero)
            throw new Error("A revisão mudou. Recarregue antes de enviar.");
         extendYear(data, input.revisao.configuracao?.ano ?? 2027);
         const rev = revisaoSchema.parse(structuredClone(input.revisao));
         rev.estado = "em-aprovacao";
         delete rev.basesCongeladas;
         delete rev.precosComerciaisCongelados;
         rev.autora = personaId;
         rev.decisao = null;
         const errors = validateRevision(rev, data);
         if (errors.length) throw new Error(errors.join(" "));
         rev.basesCongeladas = Object.fromEntries(
            rev.contextosIds.flatMap(id => {
               const value = baseForRevision(rev, data, id);
               return value === undefined ? [] : [[id, value]];
            }),
         );
         rev.precosComerciaisCongelados = Object.fromEntries(
            data.contextos
               .filter(c => rev.contextosIds.includes(c.id))
               .flatMap(c => {
                  const price = commercialPrice(c);
                  return price ? [[c.id, structuredClone(price)]] : [];
               }),
         );
         rev.enviadaEm = now();
         const c = existing ?? {
            id: uid("camp"),
            nome: input.nome,
            criadaPor: personaId,
            criadaEm: now(),
            revisoes: [],
            arquivadaEm: null,
            ficticio: true,
         };
         c.nome = input.nome || "Campanha sem título";
         const latest = existing ? lastRevision(existing) : undefined;
         if (latest?.estado === "aprovada" || latest?.estado === "ajustes-solicitados") {
            rev.numero = latest.numero + 1;
            rev.criadaEm = now();
            c.revisoes.push(rev);
         } else if (latest) {
            rev.numero = latest.numero;
            c.revisoes[c.revisoes.length - 1] = rev;
         } else {
            rev.numero = 1;
            c.revisoes.push(rev);
            data.campanhas.push(c);
         }
         event(data, "campanha", c.id, "em-aprovacao", personaId, rev.numero);
         data.notificacoes.push({
            id: uid("notificacao"),
            campanhaId: c.id,
            revisao: rev.numero,
            destinataria: data.personas.find(p => p.perfil === "aprovadora")!.email,
            assunto: `Aprovação de campanha: ${c.nome}`,
            corpo: `${campaignSummary(rev)}. ${rev.contextosIds.length} turmas.`,
            estado: "simulada",
            linkInterno: `/campanhas/${c.id}`,
         });
         return structuredClone(c);
      });
   },
   decide(id, expectedRevision, personaId, approve, comment) {
      return transaction(data => {
         const c = find(data, id),
            r = lastRevision(c);
         if (data.personas.find(p => p.id === personaId)?.perfil !== "aprovadora" || personaId === c.criadaPor)
            throw new Error("A decisão exige o perfil da gestora responsável.");
         if (r.numero !== expectedRevision || r.estado !== "em-aprovacao" || c.arquivadaEm)
            throw new Error("A revisão mudou ou já recebeu uma decisão. Recarregue a página.");
         if (!approve && !comment.trim()) throw new Error("Escreva o motivo para devolver a proposta.");
         if (approve) {
            const errors = validateRevision(r, data);
            if (errors.length) throw new Error(errors.join(" "));
            const blocked = conflitos(r, data, id).filter(x => ["aprovada", "em-aprovacao"].includes(x.revisao.estado));
            if (blocked.length)
               throw new Error(
                  `Conflito com ${blocked.map(x => x.campanha.nome).join(", ")}. Ajuste o contexto, o prazo ou os meses antes de aprovar.`,
               );
         }
         r.estado = approve ? "aprovada" : "ajustes-solicitados";
         r.decisao = { por: personaId, em: now(), comentario: comment.trim() || null };
         event(data, "campanha", id, r.estado, personaId, r.numero, comment || null);
      });
   },
   archive(id, personaId) {
      return transaction(data => {
         const c = find(data, id);
         proposer(data, personaId, c);
         if (lastRevision(c).estado === "em-aprovacao") throw new Error("Aguarde a decisão antes de arquivar.");
         c.arquivadaEm = now();
         event(data, "campanha", id, "arquivada", personaId);
      });
   },
   register(contextoId, observacao, personaId, ano) {
      return transaction(data => {
         extendYear(data, ano);
         if (!data.contextos.some(c => c.id === contextoId)) throw new Error("Selecione um contexto cadastrado.");
         if (data.naoFormacao.some(n => n.contextoId === contextoId && n.estado === "nao-formou"))
            throw new Error("Este contexto já possui registro de não formação.");
         const id = uid("formacao");
         data.naoFormacao.push({
            id,
            contextoId,
            estado: "nao-formou",
            motivo: "Número insuficiente de alunos",
            observacao,
            autora: personaId,
            registradaEm: now(),
            reversao: null,
            alunosIds: data.matriculas.filter(m => m.contextoId === contextoId).map(m => m.id),
            ficticio: true,
         });
         event(data, "formacao", id, "nao-formou", personaId);
         return id;
      });
   },
   restore(id, motivo, personaId) {
      return transaction(data => {
         const f = data.naoFormacao.find(n => n.id === id);
         if (!f || f.estado !== "nao-formou") throw new Error("Registro já restaurado ou indisponível.");
         if (!motivo.trim()) throw new Error("Informe o motivo da restauração.");
         f.estado = "revertido";
         f.reversao = { por: personaId, em: now(), motivo };
         event(data, "formacao", id, "revertido", personaId, undefined, motivo);
      });
   },
   async list(contextoId) {
      return (await repository.read()).matriculas.filter(m => m.contextoId === contextoId);
   },
   registerTurn(ofertaIds, entradas, turno, personaId) {
      return transaction(data => {
         proposer(data, personaId);
         const label = turno.trim();
         if (!turno.trim() || !ofertaIds.length || !entradas.length) throw new Error("Escolha ofertas e entradas e informe o turno.");
         for (const id of ofertaIds) {
            const offer = ofertas.find(o => o.id === id);
            if (!offer) throw new Error("Oferta inválida");
            for (const entrada of entradas) {
               if (!gerarEntradas(Number(entrada.split("/")[0]), offer.modalidade).some(e => e.codigo === entrada))
                  throw new Error("Entrada incompatível com o formato.");
               if (data.contextos.some(c => c.ofertaId === id && c.turno === label && c.entradaCodigo === entrada)) continue;
               const ctxId = uid("contexto");
               data.contextos.push({
                  id: ctxId,
                  ofertaId: id,
                  turno: label,
                  entradaCodigo: entrada,
                  campusId: null,
                  poloId: null,
                  ficticio: true,
               });
               event(data, "contexto", ctxId, "turno-cadastrado", personaId);
            }
         }
      });
   },
   setBase(contextoId, valorCentavos, ano) {
      return transaction(data => {
         extendYear(data, ano);
         if (!Number.isSafeInteger(valorCentavos) || valorCentavos < 0) throw new Error("Base inválida");
         const old = data.basesDemonstrativas.find(b => b.contextoId === contextoId);
         if (old) old.valorCentavos = valorCentavos;
         else
            data.basesDemonstrativas.push({
               contextoId,
               valorCentavos,
               rotuloDemonstracao: "Valor de referência confirmado",
            });
      });
   },
   async refundBalance(matriculaId) {
      const data = await load(),
         student = data.matriculas.find(m => m.id === matriculaId);
      if (!student || !student.ficticio) throw new Error("O saldo financeiro deste aluno não está disponível.");
      const index = data.matriculas.findIndex(m => m.id === matriculaId);
      const paid = data.devolucoes.some(r => r.matriculaId === matriculaId && r.estado === "paga");
      const recebedores: RefundBalance["recebedores"] = [
         { id: `${matriculaId}-aluno`, nome: student.nomeCompleto, documento: "52998224725", vinculo: "aluno" },
      ];
      if (index % 2 === 0)
         recebedores.push({
            id: `${matriculaId}-responsavel`,
            nome: "Mariana Costa · Responsável",
            documento: "11144477735",
            vinculo: "responsavel",
         });
      return {
         matriculaId,
         valorCentavos: paid ? 0 : 48600 + index * 700,
         recebedores,
         consultadoEm: now(),
         versao: data.devolucoes.filter(r => r.matriculaId === matriculaId).reduce((sum, r) => sum + r.versao, 1),
         origem: "Financeiro · Demonstração",
      };
   },
   requestRefund(input, personaId) {
      return transaction(async data => {
         proposer(data, personaId);
         const previous = data.devolucoes.find(r => r.idempotencyKey === input.idempotencyKey);
         if (previous) {
            if (previous.matriculaId !== input.matriculaId || previous.registroId !== input.registroId)
               throw new Error("Solicitação não corresponde ao aluno.");
            if (
               previous.recebedor.id !== input.recebedorId ||
               previous.valorCentavos !== input.valorCentavos ||
               JSON.stringify(previous.pagamento) !== JSON.stringify(validatePayment(input.pagamento, previous.recebedor))
            )
               throw new Error("Os dados desta solicitação mudaram. Atualize o acompanhamento.");
            return structuredClone(previous);
         }
         const record = data.naoFormacao.find(n => n.id === input.registroId);
         const student = data.matriculas.find(m => m.id === input.matriculaId);
         if (
            !record ||
            record.estado !== "nao-formou" ||
            !student ||
            student.contextoId !== record.contextoId ||
            !record.alunosIds.includes(student.id)
         )
            throw new Error("Aluno ou registro indisponível para devolução.");
         const active = data.devolucoes.find(r => r.matriculaId === input.matriculaId && !["recusada", "cancelada"].includes(r.estado));
         if (active) throw new Error("Este aluno já tem uma solicitação. Abra o acompanhamento.");
         const balance = await repository.refundBalance(student.id);
         if (!balance.valorCentavos || balance.versao !== input.saldoVersao || balance.valorCentavos !== input.valorCentavos)
            throw new Error("O saldo mudou. Atualize antes de solicitar.");
         const receiver = balance.recebedores.find(r => r.id === input.recebedorId);
         if (!receiver) throw new Error("Selecione um titular autorizado pelo financeiro.");
         const pagamento = validatePayment(input.pagamento, receiver),
            created = now();
         const refund = {
            id: uid("devolucao"),
            protocolo: `DEV-${new Date().getFullYear()}-${String(data.devolucoes.length + 1).padStart(4, "0")}`,
            matriculaId: student.id,
            registroId: record.id,
            contextoId: record.contextoId,
            recebedor: receiver,
            valorCentavos: balance.valorCentavos,
            pagamento,
            estado: "recebida" as const,
            versao: 1,
            idempotencyKey: input.idempotencyKey,
            criadaPor: personaId,
            criadaEm: created,
            eventos: [
               {
                  estado: "recebida" as const,
                  em: created,
                  descricao: "Pedido registrado. Aguardando verificação financeira.",
                  por: personaId,
               },
            ],
            ficticio: true as const,
         };
         data.devolucoes.push(refund);
         event(data, "devolucao", refund.id, "recebida", personaId);
         return structuredClone(refund);
      });
   },
   async getRefund(id) {
      const refund = (await load()).devolucoes.find(r => r.id === id);
      if (!refund) throw new Error("Solicitação não encontrada. Atualize a lista de alunos.");
      return structuredClone(refund);
   },
   recordService(input, personaId) {
      return transaction(data => {
         proposer(data, personaId);
         const record = data.naoFormacao.find(n => n.id === input.registroId);
         const student = data.matriculas.find(m => m.id === input.matriculaId);
         if (!record || !student || !record.alunosIds.includes(student.id) || record.estado !== "nao-formou")
            throw new Error("Aluno ou contexto indisponível.");
         if (
            data.devolucoes.some(r => r.matriculaId === student.id && !["cancelada", "recusada"].includes(r.estado)) &&
            input.resultado === "aceitou-outro-curso"
         )
            throw new Error("Resolva a devolução antes de registrar outro curso.");
         if (input.resultado === "aceitou-outro-curso") {
            const offer = ofertas.find(o => o.id === input.ofertaId);
            if (
               !offer ||
               !input.entradaCodigo ||
               !gerarEntradas(Number(input.entradaCodigo.split("/")[0]), offer.modalidade).some(e => e.codigo === input.entradaCodigo)
            )
               throw new Error("Selecione uma oferta e entrada compatíveis.");
            const targets = data.contextos.filter(c => c.ofertaId === offer.id && c.entradaCodigo === input.entradaCodigo);
            if (targets.length && targets.every(c => data.naoFormacao.some(n => n.contextoId === c.id && n.estado === "nao-formou")))
               throw new Error("Esta oferta não formou turma nessa entrada. Escolha outra opção.");
         }
         data.atendimentos.push({ ...input, id: uid("atendimento"), por: personaId, em: now() });
         event(data, "matricula", student.id, input.resultado, personaId, undefined, input.observacao || null);
      });
   },
   simulateRefundState(id, expectedVersion, estado, personaId) {
      return transaction(data => {
         if (data.personas.find(p => p.id === personaId)?.perfil !== "aprovadora")
            throw new Error("A simulação financeira exige o perfil da gestora responsável.");
         const refund = data.devolucoes.find(r => r.id === id);
         if (!refund || refund.versao !== expectedVersion) throw new Error("O andamento mudou. Atualize antes de simular.");
         if (isRefundTerminal(refund.estado)) throw new Error("Esta solicitação já foi encerrada.");
         const index = refundOrder.indexOf(refund.estado),
            next = index < 0 ? "verificada" : refundOrder[index + 1];
         if (!(
            estado === next ||
            ["pendencia", "recusada", "cancelada"].includes(estado) ||
            (refund.estado === "pendencia" && estado === "verificada")
         ))
            throw new Error("Etapa inválida. Siga as verificações antes do pagamento.");
         refund.estado = estado;
         refund.versao++;
         refund.eventos.push({
            estado,
            em: now(),
            descricao: `${refundLabels[estado]}.`,
            por: personaId,
         });
         event(data, "devolucao", id, estado, personaId);
      });
   },
};
export function campaignState(c: Campanha) {
   return c.arquivadaEm ? "Arquivada" : lastRevision(c).estado;
}
export function commercialRevision(c: Campanha) {
   return c.arquivadaEm ? undefined : approvedRevision(c);
}
export function formationLabel(data: DemoData, id: string) {
   const ctx = data.contextos.find(c => c.id === id);
   return ctx ? contextLabel(ctx) : id;
}
