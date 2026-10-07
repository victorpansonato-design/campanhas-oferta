import type { Payment, Refund, RefundBalance, RefundState, ServiceRecord } from "@/types/refunds";
export interface RefundRequest {
   matriculaId: string;
   registroId: string;
   recebedorId: string;
   pagamento: Payment;
   saldoVersao: number;
   valorCentavos: number;
   idempotencyKey: string;
}
/** Replace the local implementation with the financial system's authenticated adapter. */
export interface RefundRepository {
   refundBalance(matriculaId: string): Promise<RefundBalance>;
   requestRefund(input: RefundRequest, personaId: string): Promise<Refund>;
   getRefund(id: string): Promise<Refund>;
   recordService(input: Omit<ServiceRecord, "id" | "por" | "em">, personaId: string): Promise<void>;
   simulateRefundState(id: string, expectedVersion: number, estado: RefundState, personaId: string): Promise<void>;
}
