import { z } from "zod";
export const refundStates = ["recebida", "verificada", "aguardando-pagamento", "paga", "pendencia", "recusada", "cancelada"] as const;
export const receiverSchema = z.object({
   id: z.string(),
   nome: z.string(),
   documento: z.string(),
   vinculo: z.enum(["aluno", "responsavel"]),
});
export const paymentSchema = z.discriminatedUnion("tipo", [
   z.object({
      tipo: z.literal("pix"),
      tipoChave: z.enum(["cpf", "cnpj", "email", "telefone", "aleatoria"]),
      chave: z.string().trim().min(1, "Informe a chave Pix").max(254),
   }),
   z.object({
      tipo: z.literal("transferencia"),
      banco: z.string().trim().min(2, "Informe o banco").max(80),
      agencia: z
         .string()
         .trim()
         .regex(/^\d{1,6}(?:-[\dXx])?$/, "Informe uma agência válida"),
      conta: z
         .string()
         .trim()
         .regex(/^\d{1,20}(?:-[\dXx])?$/, "Informe uma conta válida"),
      tipoConta: z.enum(["corrente", "poupanca"]),
   }),
]);
export const refundSchema = z.object({
   id: z.string(),
   protocolo: z.string(),
   matriculaId: z.string(),
   registroId: z.string(),
   contextoId: z.string(),
   recebedor: receiverSchema,
   valorCentavos: z.number().int().positive(),
   pagamento: paymentSchema,
   estado: z.enum(refundStates),
   versao: z.number().int(),
   idempotencyKey: z.string(),
   criadaPor: z.string(),
   criadaEm: z.string(),
   eventos: z.array(z.object({ estado: z.enum(refundStates), em: z.string(), descricao: z.string(), por: z.string() })).min(1),
   ficticio: z.literal(true),
});
export const serviceSchema = z.object({
   id: z.string(),
   matriculaId: z.string(),
   registroId: z.string(),
   resultado: z.enum(["contato-realizado", "aceitou-outro-curso"]),
   canal: z.string(),
   observacao: z.string(),
   ofertaId: z.string().nullable(),
   entradaCodigo: z.string().nullable(),
   por: z.string(),
   em: z.string(),
});
export type Refund = z.infer<typeof refundSchema>;
export type Receiver = z.infer<typeof receiverSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type ServiceRecord = z.infer<typeof serviceSchema>;
export type RefundState = Refund["estado"];
export interface RefundBalance {
   matriculaId: string;
   valorCentavos: number;
   recebedores: Receiver[];
   consultadoEm: string;
   versao: number;
   origem: "Financeiro · Demonstração";
}
