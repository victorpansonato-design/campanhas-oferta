import { paymentSchema, type Payment, type Receiver, type RefundState } from "@/types/refunds";
export const refundLabels: Record<RefundState, string> = {
   recebida: "Solicitação recebida",
   verificada: "Verificações concluídas",
   "aguardando-pagamento": "Aguardando pagamento",
   paga: "Devolvido",
   pendencia: "Pendência de dados",
   recusada: "Recusada",
   cancelada: "Cancelada",
};
export const refundOrder: RefundState[] = ["recebida", "verificada", "aguardando-pagamento", "paga"];
export const isRefundTerminal = (state: RefundState) => ["paga", "recusada", "cancelada"].includes(state);
function checkDocument(value: string, size: number) {
   const d = value.replace(/\D/g, "");
   if (d.length !== size || /^(\d)\1+$/.test(d)) return false;
   const weights =
      size === 11
         ? [
              [10, 9, 8, 7, 6, 5, 4, 3, 2],
              [11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
           ]
         : [
              [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
              [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
           ];
   return weights.every((w, index) => {
      const sum = w.reduce((total, n, i) => total + Number(d[i]) * n, 0);
      const remainder = sum % 11;
      return Number(d[size - 2 + index]) === (remainder < 2 ? 0 : 11 - remainder);
   });
}
export function validatePayment(input: Payment, receiver: Receiver): Payment {
   const payment = paymentSchema.parse(input);
   if (payment.tipo === "transferencia") return payment;
   const key = payment.chave.trim();
   if (payment.tipoChave === "cpf") {
      if (!checkDocument(key, 11)) throw new Error("Informe um CPF válido como chave Pix.");
      if (key.replace(/\D/g, "") !== receiver.documento) throw new Error("A chave CPF deve pertencer ao titular selecionado.");
   }
   if (payment.tipoChave === "cnpj" && !checkDocument(key, 14)) throw new Error("Informe um CNPJ válido como chave Pix.");
   if (payment.tipoChave === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key))
      throw new Error("Informe um e-mail válido como chave Pix.");
   if (payment.tipoChave === "telefone" && !/^(?:\+?55)?\d{10,11}$/.test(key.replace(/[\s()-]/g, "")))
      throw new Error("Informe um telefone com DDD como chave Pix.");
   if (payment.tipoChave === "aleatoria" && !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(key))
      throw new Error("Informe a chave aleatória completa.");
   return { ...payment, chave: key };
}
export function maskedPayment(payment: Payment) {
   return payment.tipo === "pix"
      ? `Pix · ${payment.tipoChave} · ••••${payment.chave.slice(-4)}`
      : `${payment.banco} · conta ••••${payment.conta.slice(-4)}`;
}
