import { beforeEach, expect, it } from "vitest";
import { initialData, repository } from "@/services/repositories";
import { env } from "@/config/env";
import { validatePayment } from "@/lib/refunds";

beforeEach(() => localStorage.clear());
async function request(key = crypto.randomUUID()) {
   const data = await repository.read(),
      record = data.naoFormacao.find(r => r.estado === "nao-formou")!;
   const student = data.matriculas.find(m => record.alunosIds.includes(m.id))!;
   const balance = await repository.refundBalance(student.id),
      receiver = balance.recebedores.at(-1)!;
   return {
      matriculaId: student.id,
      registroId: record.id,
      recebedorId: receiver.id,
      pagamento: { tipo: "pix" as const, tipoChave: "cpf" as const, chave: receiver.documento },
      valorCentavos: balance.valorCentavos,
      saldoVersao: balance.versao,
      idempotencyKey: key,
   };
}
it("serializa cliques simultâneos e mantém uma única devolução persistida", async () => {
   const input = await request();
   const results = await Promise.all([repository.requestRefund(input, "gestora-1"), repository.requestRefund(input, "gestora-1")]);
   expect(results[0].id).toBe(results[1].id);
   expect(
      (await repository.requestRefund({ ...input, pagamento: { ...input.pagamento, chave: ` ${input.pagamento.chave} ` } }, "gestora-1"))
         .id,
   ).toBe(results[0].id);
   expect((await repository.read()).devolucoes).toHaveLength(1);
   expect(JSON.parse(localStorage.getItem(env.storageKey)!).devolucoes).toHaveLength(1);
   await expect(repository.requestRefund({ ...input, idempotencyKey: crypto.randomUUID() }, "gestora-1")).rejects.toThrow("já tem");
   await expect(repository.requestRefund({ ...input, valorCentavos: input.valorCentavos + 1 }, "gestora-1")).rejects.toThrow(
      "dados desta solicitação mudaram",
   );
});
it("bloqueia valor, titular, chave CPF ou perfil incompatíveis", async () => {
   const input = await request();
   await expect(repository.requestRefund({ ...input, valorCentavos: 1 }, "gestora-1")).rejects.toThrow("saldo mudou");
   await expect(repository.requestRefund({ ...input, recebedorId: "intruso" }, "gestora-1")).rejects.toThrow("titular autorizado");
   await expect(
      repository.requestRefund({ ...input, pagamento: { ...input.pagamento, chave: "12345678900" } }, "gestora-1"),
   ).rejects.toThrow();
   await expect(repository.requestRefund(input, "gestora-responsavel")).rejects.toThrow("proponente");
});
it("confirma pagamento apenas após as verificações, preservando o histórico na restauração", async () => {
   const input = await request(),
      refund = await repository.requestRefund(input, "gestora-1");
   await expect(repository.simulateRefundState(refund.id, 1, "paga", "gestora-responsavel")).rejects.toThrow("Etapa inválida");
   await expect(repository.simulateRefundState(refund.id, 1, "verificada", "gestora-1")).rejects.toThrow("perfil");
   await repository.simulateRefundState(refund.id, 1, "verificada", "gestora-responsavel");
   await expect(repository.simulateRefundState(refund.id, 1, "aguardando-pagamento", "gestora-responsavel")).rejects.toThrow(
      "andamento mudou",
   );
   await repository.simulateRefundState(refund.id, 2, "aguardando-pagamento", "gestora-responsavel");
   await repository.simulateRefundState(refund.id, 3, "paga", "gestora-responsavel");
   expect((await repository.getRefund(refund.id)).eventos).toHaveLength(4);
   expect((await repository.refundBalance(input.matriculaId)).valorCentavos).toBe(0);
   await repository.restore(input.registroId, "Turma reaberta", "gestora-1");
   expect((await repository.getRefund(refund.id)).estado).toBe("paga");
   await expect(repository.simulateRefundState(refund.id, 4, "cancelada", "gestora-responsavel")).rejects.toThrow("encerrada");
});
it("permite nova solicitação depois de cancelamento e bloqueia aceite durante devolução", async () => {
   const input = await request(),
      refund = await repository.requestRefund(input, "gestora-1");
   await expect(
      repository.recordService(
         {
            matriculaId: input.matriculaId,
            registroId: input.registroId,
            resultado: "aceitou-outro-curso",
            canal: "Telefone",
            observacao: "",
            ofertaId: "direito__presencial",
            entradaCodigo: "2027/1",
         },
         "gestora-1",
      ),
   ).rejects.toThrow("Resolva a devolução");
   await repository.simulateRefundState(refund.id, 1, "pendencia", "gestora-responsavel");
   await expect(repository.simulateRefundState(refund.id, 2, "recebida", "gestora-responsavel")).rejects.toThrow("Etapa inválida");
   await repository.simulateRefundState(refund.id, 2, "cancelada", "gestora-responsavel");
   const second = await repository.requestRefund(await request(), "gestora-1");
   expect(second.id).not.toBe(refund.id);
});
it("valida dados bancários e não aceita CPF de outro titular", () => {
   const receiver = { id: "r", nome: "Responsável", documento: "11144477735", vinculo: "responsavel" as const };
   expect(() => validatePayment({ tipo: "pix", tipoChave: "cpf", chave: "52998224725" }, receiver)).toThrow();
   expect(() => validatePayment({ tipo: "transferencia", banco: "", agencia: "1", conta: "2", tipoConta: "corrente" }, receiver)).toThrow();
   expect(
      validatePayment({ tipo: "transferencia", banco: "001", agencia: "1234", conta: "5678-9", tipoConta: "corrente" }, receiver).tipo,
   ).toBe("transferencia");
});
it("registra contato e aceite de outra oferta sem alterar a matrícula acadêmica", async () => {
   const input = await request(),
      before = await repository.read();
   const context = before.contextos.find(
      c =>
         c.id !== before.matriculas.find(m => m.id === input.matriculaId)!.contextoId &&
         !before.naoFormacao.some(n => n.contextoId === c.id && n.estado === "nao-formou"),
   )!;
   const service = {
      matriculaId: input.matriculaId,
      registroId: input.registroId,
      canal: "Telefone",
      observacao: "Contato confirmado",
      ofertaId: null,
      entradaCodigo: null,
   };
   await repository.recordService({ ...service, resultado: "contato-realizado" }, "gestora-1");
   await repository.recordService(
      { ...service, resultado: "aceitou-outro-curso", ofertaId: context.ofertaId, entradaCodigo: context.entradaCodigo },
      "gestora-1",
   );
   const after = await repository.read();
   expect(after.atendimentos.map(a => a.resultado)).toEqual(["contato-realizado", "aceitou-outro-curso"]);
   expect(after.matriculas).toEqual(before.matriculas);
});
it("migra RAs fictícios antigos sem perder campanhas e preserva sete dígitos, incluindo zero inicial", async () => {
   const seed = await initialData();
   const legacy = {
      ...seed,
      schemaVersion: 1,
      matriculas: seed.matriculas.map((m, i) => ({ ...m, ra: i === 0 ? "0123456" : `202700${String(i).padStart(3, "0")}` })),
   };
   localStorage.setItem(env.storageKey, JSON.stringify(legacy));
   const migrated = await repository.read();
   expect(migrated.schemaVersion).toBe(2);
   expect(migrated.matriculas[0].ra).toBe("0123456");
   expect(migrated.matriculas.every(m => /^\d{7}$/.test(m.ra))).toBe(true);
   expect(migrated.campanhas).toEqual(seed.campanhas);
});
