import { z } from "zod";
import { refundSchema, serviceSchema } from "@/types/refunds";

export const intervaloSchema = z.object({ inicio: z.string(), fim: z.string() });
export const precoComercialSchema = z.object({
   ano: z.number().int(),
   ofertaId: z.string(),
   turno: z.string(),
   valorContratoCentavos: z.number().int().nonnegative(),
   bolsaComercialBps: z.number().int().min(0).max(10000),
});
export type PrecoComercial = z.infer<typeof precoComercialSchema>;
export const regraSchema = intervaloSchema.extend({
   tipo: z.enum(["fixo", "percentual", "isencao", "base", "padrao"]),
   valorCentavos: z.number().int().nonnegative().optional(),
   percentualBps: z.number().int().min(0).max(10000).optional(),
});
export const revisaoSchema = z.object({
   numero: z.number().int(),
   estado: z.enum(["em-aprovacao", "ajustes-solicitados", "aprovada"]),
   contextosIds: z.array(z.string()),
   modoSelecao: z.string(),
   elegibilidade: z.object({ entradasCodigos: z.array(z.string()), modo: z.string(), janelaMatricula: intervaloSchema.nullable() }),
   horizonteCobranca: intervaloSchema,
   regras: z.array(regraSchema),
   basesCongeladas: z.record(z.string(), z.number().int().nonnegative()).optional(),
   precosComerciaisCongelados: z.record(z.string(), precoComercialSchema).optional(),
   taxaMatricula: z.object({ tipo: z.string() }),
   condicoes: z.string(),
   autora: z.string(),
   criadaEm: z.string(),
   enviadaEm: z.string().nullable().optional(),
   decisao: z.object({ por: z.string(), em: z.string(), comentario: z.string().nullable() }).nullable(),
   configuracao: z
      .object({ modalidade: z.string(), cursoIds: z.array(z.string()), formato: z.string(), turno: z.string(), ano: z.number() })
      .optional(),
});
export const campanhaSchema = z.object({
   id: z.string(),
   nome: z.string(),
   criadaPor: z.string(),
   criadaEm: z.string(),
   revisoes: z.array(revisaoSchema).min(1),
   arquivadaEm: z.string().nullable(),
   ficticio: z.boolean(),
});
export const contextoSchema = z.object({
   id: z.string(),
   ofertaId: z.string(),
   turno: z.string(),
   entradaCodigo: z.string(),
   campusId: z.string().nullable(),
   poloId: z.string().nullable(),
   ficticio: z.boolean(),
});
export const formacaoSchema = z.object({
   id: z.string(),
   contextoId: z.string(),
   estado: z.enum(["nao-formou", "revertido"]),
   motivo: z.string(),
   observacao: z.string(),
   autora: z.string(),
   registradaEm: z.string(),
   reversao: z.object({ por: z.string(), em: z.string(), motivo: z.string() }).nullable(),
   alunosIds: z.array(z.string()),
   ficticio: z.boolean(),
});
export const matriculaSchema = z.object({
   id: z.string(),
   contextoId: z.string(),
   ra: z.string().regex(/^\d{7}$/, "RA deve ter exatamente 7 dígitos"),
   nomeCompleto: z.string(),
   telefone: z.string().nullable(),
   email: z.string().nullable(),
   matriculadaEm: z.string(),
   ficticio: z.boolean(),
   campanhaVinculada: z
      .object({
         campanhaId: z.string(),
         revisaoNumero: z.number(),
         registradaEm: z.string(),
         parcelas: z.array(z.object({ competencia: z.string(), valorCentavos: z.number().int() })),
         resumo: z.string(),
         ficticio: z.boolean(),
      })
      .nullable(),
});
export const dataSchema = z.object({
   schemaVersion: z.literal(2),
   ficticio: z.boolean(),
   dataReferencia: z.string(),
   personas: z.array(
      z.object({ id: z.string(), nome: z.string(), perfil: z.enum(["proponente", "aprovadora"]), setor: z.string(), email: z.string() }),
   ),
   contextos: z.array(contextoSchema),
   basesDemonstrativas: z.array(
      z.object({ contextoId: z.string(), valorCentavos: z.number().int().nonnegative(), rotuloDemonstracao: z.string() }),
   ),
   campanhas: z.array(campanhaSchema),
   naoFormacao: z.array(formacaoSchema),
   matriculas: z.array(matriculaSchema),
   atendimentos: z.array(serviceSchema).default([]),
   devolucoes: z.array(refundSchema).default([]),
   historico: z.array(
      z.object({
         id: z.string(),
         entidade: z.string(),
         entidadeId: z.string(),
         acao: z.string(),
         personaId: z.string(),
         timestamp: z.string(),
         revisao: z.number().nullable().optional(),
         comentario: z.string().nullable(),
      }),
   ),
   notificacoes: z.array(
      z.object({
         id: z.string(),
         campanhaId: z.string(),
         revisao: z.number(),
         destinataria: z.string(),
         assunto: z.string(),
         corpo: z.string(),
         estado: z.literal("simulada"),
         linkInterno: z.string(),
      }),
   ),
});
export type Regra = z.infer<typeof regraSchema>;
export type Revisao = z.infer<typeof revisaoSchema>;
export type Campanha = z.infer<typeof campanhaSchema>;
export type Contexto = z.infer<typeof contextoSchema>;
export type Formacao = z.infer<typeof formacaoSchema>;
export type Matricula = z.infer<typeof matriculaSchema>;
export type DemoData = z.infer<typeof dataSchema>;
export type Intervalo = z.infer<typeof intervaloSchema>;
