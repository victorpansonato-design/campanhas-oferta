import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock3, MessageCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Callout } from "@/components/ui/callout";
import { repository } from "@/services/repositories";
import { useSession, currentPersona } from "@/stores/session.store";
import { cursos, ofertas, gerarEntradas, money, dateLabel } from "@/lib/domain";
import { isRefundTerminal, maskedPayment, refundLabels, refundOrder, validatePayment } from "@/lib/refunds";
import type { DemoData, Formacao, Matricula } from "@/types/domain";
import type { Payment, Refund, RefundState } from "@/types/refunds";

interface Fields {
   recebedor: string;
   metodo: "pix" | "transferencia";
   tipoChave: Extract<Payment, { tipo: "pix" }>["tipoChave"];
   chave: string;
   banco: string;
   agencia: string;
   conta: string;
   tipoConta: "corrente" | "poupanca";
}
const defaults: Fields = {
   recebedor: "",
   metodo: "pix",
   tipoChave: "cpf",
   chave: "",
   banco: "",
   agencia: "",
   conta: "",
   tipoConta: "corrente",
};
export function StudentActions({ student, record, data }: { student: Matricula; record: Formacao; data: DemoData }) {
   const persona = useSession(s => s.personaId),
      client = useQueryClient(),
      proposer = currentPersona(persona).perfil === "proponente";
   const refund = [...data.devolucoes].reverse().find(r => r.matriculaId === student.id);
   const active = refund && !["cancelada", "recusada"].includes(refund.estado);
   const service = [...data.atendimentos].reverse().find(a => a.matriculaId === student.id && a.registroId === record.id);
   const [mode, setMode] = useState<"refund" | "tracking" | "service" | null>(null),
      [busy, setBusy] = useState(false),
      [error, setError] = useState("");
   const [result, setResult] = useState<"contato-realizado" | "aceitou-outro-curso">("contato-realizado"),
      [channel, setChannel] = useState("Telefone"),
      [note, setNote] = useState(""),
      [offerId, setOfferId] = useState(""),
      [entry, setEntry] = useState("");
   const [submitted, setSubmitted] = useState<Refund | undefined>();
   const idempotency = useRef(crypto.randomUUID());
   const trackingId = submitted?.id ?? refund?.id;
   const balance = useQuery({
      queryKey: ["refund-balance", student.id],
      queryFn: () => repository.refundBalance(student.id),
      enabled: mode === "refund",
      staleTime: 0,
      refetchOnWindowFocus: true,
   });
   const tracking = useQuery({
      queryKey: ["refund", trackingId],
      queryFn: () => repository.getRefund(trackingId!),
      enabled: mode === "tracking" && !!trackingId,
      refetchOnWindowFocus: true,
      refetchInterval: q => (q.state.data && isRefundTerminal(q.state.data.estado) ? false : 15000),
      refetchIntervalInBackground: false,
   });
   const form = useForm<Fields>({ defaultValues: defaults }),
      { register, getValues, setValue } = form;
   const [method, type, receiverId] = useWatch({ control: form.control, name: ["metodo", "tipoChave", "recebedor"] });
   const receiver = balance.data?.recebedores.find(r => r.id === receiverId) ?? balance.data?.recebedores[0];
   useEffect(() => {
      if (balance.data && !getValues("recebedor")) setValue("recebedor", balance.data.recebedores[0].id);
   }, [balance.data, getValues, setValue]);
   const current = tracking.data ?? submitted ?? refund;
   const offer = ofertas.find(o => o.id === offerId),
      year = Number(data.contextos.find(c => c.id === record.contextoId)?.entradaCodigo.split("/")[0] ?? 2027);
   const refresh = async () => {
      await Promise.all([
         client.invalidateQueries({ queryKey: ["demo"] }),
         client.invalidateQueries({ queryKey: ["refund"] }),
         client.invalidateQueries({ queryKey: ["refund-balance", student.id] }),
      ]);
   };
   const open = (next: typeof mode) => {
      if (next === "refund" && refund && ["recusada", "cancelada"].includes(refund.estado)) {
         idempotency.current = crypto.randomUUID();
         setSubmitted(undefined);
      }
      setError("");
      setMode(next);
   };
   const send = async () => {
      if (busy || !balance.data || !receiver) return;
      setBusy(true);
      setError("");
      form.clearErrors();
      try {
         const f = getValues();
         const payment: Payment =
            f.metodo === "pix"
               ? { tipo: "pix", tipoChave: f.tipoChave, chave: f.chave }
               : { tipo: "transferencia", banco: f.banco, agencia: f.agencia, conta: f.conta, tipoConta: f.tipoConta };
         try {
            validatePayment(payment, receiver);
         } catch (e) {
            const message = e instanceof Error ? e.message : "Confira os dados de pagamento.";
            form.setError(f.metodo === "pix" ? "chave" : "conta", {
               message: message.startsWith("[") ? "Preencha banco, agência e conta corretamente." : message,
            });
            throw e;
         }
         const r = await repository.requestRefund(
            {
               matriculaId: student.id,
               registroId: record.id,
               recebedorId: receiver.id,
               pagamento: payment,
               valorCentavos: balance.data.valorCentavos,
               saldoVersao: balance.data.versao,
               idempotencyKey: idempotency.current,
            },
            persona,
         );
         setSubmitted(r);
         setMode("tracking");
         form.reset();
         await refresh();
         toast.success("Devolução solicitada");
      } catch (e) {
         setError(e instanceof Error && !e.message.startsWith("[") ? e.message : "Confira os campos de pagamento destacados.");
      } finally {
         setBusy(false);
      }
   };
   const saveService = async () => {
      if (busy) return;
      setBusy(true);
      setError("");
      try {
         await repository.recordService(
            {
               matriculaId: student.id,
               registroId: record.id,
               resultado: result,
               canal: channel,
               observacao: note,
               ofertaId: result === "aceitou-outro-curso" ? offerId : null,
               entradaCodigo: result === "aceitou-outro-curso" ? entry : null,
            },
            persona,
         );
         await refresh();
         setMode(null);
         toast.success("Atendimento registrado");
      } catch (e) {
         setError((e as Error).message);
      } finally {
         setBusy(false);
      }
   };
   const simulate = async (state: RefundState) => {
      if (!current || busy) return;
      setBusy(true);
      setError("");
      try {
         await repository.simulateRefundState(current.id, current.versao, state, persona);
         await refresh();
         await tracking.refetch();
      } catch (e) {
         setError((e as Error).message);
      } finally {
         setBusy(false);
      }
   };
   return (
      <>
         <div className="student-actions">
            <Button
               size="sm"
               variant="ghost"
               disabled={!proposer || record.estado !== "nao-formou"}
               onClick={() => open("service")}
               aria-label={`Registrar atendimento de ${student.nomeCompleto}`}
            >
               <MessageCircle className="size-3.5" aria-hidden />
               Atendimento
            </Button>
            <Button
               size="sm"
               variant="outline"
               disabled={!active && (!proposer || record.estado !== "nao-formou")}
               onClick={() => open(active ? "tracking" : "refund")}
               aria-label={`${active ? "Acompanhar devolução" : "Solicitar devolução"} de ${student.nomeCompleto}`}
            >
               <RotateCcw className="size-3.5" aria-hidden />
               {active ? "Acompanhar" : "Devolução"}
            </Button>
            {(refund || service) && (
               <span className={refund?.estado === "paga" ? "student-outcome returned" : "student-outcome"}>
                  {refund
                     ? refundLabels[refund.estado]
                     : service?.resultado === "aceitou-outro-curso"
                       ? "Aceitou outro curso"
                       : "Contato realizado"}
               </span>
            )}
         </div>
         <Dialog
            open={mode !== null}
            onOpenChange={value => {
               if (!value && !busy) setMode(null);
            }}
         >
            <DialogContent className="student-dialog">
               <DialogHeader>
                  <DialogTitle>
                     {mode === "refund" ? "Solicitar devolução" : mode === "tracking" ? "Acompanhar devolução" : "Registrar atendimento"}
                  </DialogTitle>
                  <DialogDescription>
                     {student.nomeCompleto} · RA {student.ra}
                  </DialogDescription>
               </DialogHeader>
               <div className="student-dialog-body">
                  {error && (
                     <Callout tone="danger" role="alert">
                        {error}
                     </Callout>
                  )}
                  {mode === "refund" && (
                     <form
                        onSubmit={e => {
                           e.preventDefault();
                           void send();
                        }}
                     >
                        {balance.isLoading ? (
                           <p role="status">Consultando saldo…</p>
                        ) : balance.isError ? (
                           <Callout tone="danger">
                              {balance.error.message}
                              <Button type="button" variant="link" onClick={() => void balance.refetch()}>
                                 Atualizar saldo
                              </Button>
                           </Callout>
                        ) : (
                           balance.data && (
                              <>
                                 <div className="refund-balance">
                                    <span>Valor disponível para devolver</span>
                                    <strong>{money(balance.data.valorCentavos)}</strong>
                                    <small>
                                       {balance.data.origem} · consulta em {dateLabel(balance.data.consultadoEm)}
                                    </small>
                                 </div>
                                 <label className="field">
                                    Quem recebe
                                    <select {...register("recebedor")} disabled={balance.data.recebedores.length === 1}>
                                       {balance.data.recebedores.map(r => (
                                          <option key={r.id} value={r.id}>
                                             {r.nome} · {r.vinculo === "aluno" ? "Aluno" : "Responsável financeiro"}
                                          </option>
                                       ))}
                                    </select>
                                    <small className="field-hint">
                                       Titular autorizado pelo financeiro · documento •••{receiver?.documento.slice(-4)}
                                    </small>
                                 </label>
                                 <fieldset className="payment-method">
                                    <legend>Como devolver?</legend>
                                    {(["pix", "transferencia"] as const).map(m => (
                                       <label key={m}>
                                          <input type="radio" {...register("metodo")} value={m} />
                                          {m === "pix" ? "Pix" : "Transferência bancária"}
                                       </label>
                                    ))}
                                 </fieldset>
                                 {method === "pix" ? (
                                    <div className="form-grid">
                                       <label className="field">
                                          Tipo de chave
                                          <select {...register("tipoChave")}>
                                             <option value="cpf">CPF</option>
                                             <option value="email">E-mail</option>
                                             <option value="telefone">Telefone</option>
                                             <option value="aleatoria">Chave aleatória</option>
                                             <option value="cnpj">CNPJ</option>
                                          </select>
                                       </label>
                                       <label className="field">
                                          Chave Pix
                                          <input
                                             {...register("chave")}
                                             autoComplete="off"
                                             aria-invalid={!!form.formState.errors.chave}
                                             aria-describedby={form.formState.errors.chave ? `pix-error-${student.id}` : undefined}
                                          />
                                          {form.formState.errors.chave && (
                                             <span id={`pix-error-${student.id}`} className="field-error">
                                                {form.formState.errors.chave.message}
                                             </span>
                                          )}
                                       </label>
                                       {type === "cpf" && (
                                          <Button
                                             type="button"
                                             variant="link"
                                             className="justify-start"
                                             onClick={() => receiver && setValue("chave", receiver.documento)}
                                          >
                                             Usar CPF do titular
                                          </Button>
                                       )}
                                    </div>
                                 ) : (
                                    <div className="form-grid">
                                       <label className="field">
                                          Banco
                                          <input {...register("banco")} />
                                       </label>
                                       <label className="field">
                                          Agência
                                          <input {...register("agencia")} inputMode="numeric" />
                                       </label>
                                       <label className="field">
                                          Conta com dígito
                                          <input {...register("conta")} aria-invalid={!!form.formState.errors.conta} />
                                          {form.formState.errors.conta && (
                                             <span className="field-error">{form.formState.errors.conta.message}</span>
                                          )}
                                       </label>
                                       <label className="field">
                                          Tipo de conta
                                          <select {...register("tipoConta")}>
                                             <option value="corrente">Corrente</option>
                                             <option value="poupanca">Poupança</option>
                                          </select>
                                       </label>
                                    </div>
                                 )}
                                 <DialogFooter>
                                    <Button type="button" variant="outline" disabled={busy} onClick={() => setMode(null)}>
                                       Voltar
                                    </Button>
                                    <Button type="submit" disabled={busy || !balance.data.valorCentavos}>
                                       {busy ? "Solicitando…" : "Solicitar devolução"}
                                    </Button>
                                 </DialogFooter>
                              </>
                           )
                        )}
                     </form>
                  )}
                  {mode === "tracking" && (
                     <>
                        {tracking.isError && (
                           <Callout tone="warning">
                              Não foi possível atualizar. O último andamento está abaixo.
                              <Button variant="link" onClick={() => void tracking.refetch()}>
                                 Tentar novamente
                              </Button>
                           </Callout>
                        )}
                        {!current ? (
                           <p role="status">Carregando andamento…</p>
                        ) : (
                           <>
                              <div className="refund-facts">
                                 <div>
                                    <span>Valor da devolução</span>
                                    <strong className="refund-value">{money(current.valorCentavos)}</strong>
                                 </div>
                                 <div>
                                    <span>Protocolo</span>
                                    <strong className="font-mono">{current.protocolo}</strong>
                                 </div>
                                 <div>
                                    <span>Recebedor autorizado</span>
                                    <strong>{current.recebedor.nome}</strong>
                                 </div>
                                 <div>
                                    <span>Pagamento</span>
                                    <strong>{maskedPayment(current.pagamento)}</strong>
                                 </div>
                              </div>
                              <div className="tracking-title">
                                 <h3>Andamento</h3>
                                 <span className={current.estado === "paga" ? "student-outcome returned" : "student-outcome"}>
                                    {refundLabels[current.estado]}
                                 </span>
                              </div>
                              <ol className="refund-timeline">
                                 {refundOrder.map((state, i) => {
                                    const ev = [...current.eventos].reverse().find(e => e.estado === state),
                                       index = refundOrder.indexOf(current.estado),
                                       complete = !!ev || (index >= 0 && i < index);
                                    return (
                                       <li key={state} className={complete ? "complete" : index === i ? "current" : "future"}>
                                          <span className="timeline-icon">
                                             {complete ? <Check className="size-4" /> : <Clock3 className="size-4" />}
                                          </span>
                                          <div>
                                             <strong>{state === "paga" ? "Pagamento realizado" : refundLabels[state]}</strong>
                                             <p>
                                                {ev?.descricao ??
                                                   (state === "paga"
                                                      ? "A confirmação aparecerá depois do pagamento."
                                                      : "Aguardando confirmação financeira.")}
                                             </p>
                                             {ev && <time dateTime={ev.em}>{new Date(ev.em).toLocaleString("pt-BR")}</time>}
                                          </div>
                                       </li>
                                    );
                                 })}
                              </ol>
                              {["pendencia", "recusada", "cancelada"].includes(current.estado) && (
                                 <Callout tone="warning">{current.eventos.at(-1)?.descricao}</Callout>
                              )}
                              <small className="text-muted-foreground">
                                 Última atualização: {new Date(current.eventos.at(-1)!.em).toLocaleString("pt-BR")}
                              </small>
                              <Button
                                 className="mt-3"
                                 variant="link"
                                 onClick={() => void tracking.refetch()}
                                 disabled={tracking.isFetching}
                              >
                                 Atualizar andamento
                              </Button>
                              {currentPersona(persona).perfil === "aprovadora" && !isRefundTerminal(current.estado) && (
                                 <details className="demo-simulator">
                                    <summary>Atualizar situação financeira</summary>

                                    <div className="flex flex-wrap gap-2">
                                       {(current.estado === "pendencia"
                                          ? ["verificada"]
                                          : [refundOrder[refundOrder.indexOf(current.estado) + 1], "pendencia", "recusada", "cancelada"]
                                       )
                                          .filter(Boolean)
                                          .map(state => (
                                             <Button
                                                key={state}
                                                variant="outline"
                                                size="sm"
                                                disabled={busy}
                                                onClick={() => void simulate(state as RefundState)}
                                             >
                                                {refundLabels[state as RefundState]}
                                             </Button>
                                          ))}
                                    </div>
                                 </details>
                              )}
                           </>
                        )}
                     </>
                  )}
                  {mode === "service" && (
                     <form
                        onSubmit={e => {
                           e.preventDefault();
                           void saveService();
                        }}
                     >
                        <label className="field">
                           Resultado do atendimento
                           <select value={result} onChange={e => setResult(e.target.value as typeof result)}>
                              <option value="contato-realizado">Contato realizado</option>
                              <option value="aceitou-outro-curso">Aceitou outro curso</option>
                           </select>
                        </label>
                        <label className="field mt-3">
                           Canal
                           <select value={channel} onChange={e => setChannel(e.target.value)}>
                              <option>Telefone</option>
                              <option>WhatsApp</option>
                              <option>E-mail</option>
                              <option>Presencial</option>
                           </select>
                        </label>
                        {result === "aceitou-outro-curso" && (
                           <div className="form-grid mt-3">
                              <label className="field">
                                 Curso oferecido
                                 <select
                                    value={offerId}
                                    onChange={e => {
                                       setOfferId(e.target.value);
                                       setEntry("");
                                    }}
                                    required
                                 >
                                    <option value="">Selecione uma oferta</option>
                                    {ofertas.map(o => (
                                       <option key={o.id} value={o.id}>
                                          {cursos.find(c => c.id === o.cursoId)?.nome} · {o.formato}
                                       </option>
                                    ))}
                                 </select>
                              </label>
                              <label className="field">
                                 Ingresso
                                 <select value={entry} onChange={e => setEntry(e.target.value)} required disabled={!offer}>
                                    <option value="">Selecione a entrada</option>
                                    {offer &&
                                       gerarEntradas(year, offer.modalidade)
                                          .filter(e => {
                                             const targets = data.contextos.filter(
                                                c => c.ofertaId === offer.id && c.entradaCodigo === e.codigo,
                                             );
                                             return (
                                                !targets.length ||
                                                targets.some(
                                                   c => !data.naoFormacao.some(n => n.contextoId === c.id && n.estado === "nao-formou"),
                                                )
                                             );
                                          })
                                          .map(e => (
                                             <option key={e.codigo} value={e.codigo}>
                                                {e.codigo}
                                             </option>
                                          ))}
                                 </select>
                              </label>
                              <p className="field-hint">
                                 Registra o aceite. A transferência da matrícula será confirmada pelo sistema acadêmico.
                              </p>
                           </div>
                        )}
                        <label className="field mt-3">
                           Observação (opcional)
                           <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} />
                        </label>
                        <details className="mt-4">
                           <summary>Histórico de atendimento</summary>
                           {data.atendimentos
                              .filter(a => a.matriculaId === student.id)
                              .map(a => (
                                 <p className="mt-2 text-sm" key={a.id}>
                                    {dateLabel(a.em)} ·{" "}
                                    {a.resultado === "aceitou-outro-curso" ? "Aceitou outro curso" : "Contato realizado"} · {a.canal}
                                    {a.observacao && ` · ${a.observacao}`}
                                 </p>
                              ))}
                           {!service && <p className="text-sm">Nenhum atendimento registrado.</p>}
                        </details>
                        <DialogFooter>
                           <Button type="button" variant="outline" onClick={() => setMode(null)} disabled={busy}>
                              Voltar
                           </Button>
                           <Button type="submit" disabled={busy || (result === "aceitou-outro-curso" && (!offerId || !entry))}>
                              {busy ? "Salvando…" : "Registrar atendimento"}
                           </Button>
                        </DialogFooter>
                     </form>
                  )}
               </div>
            </DialogContent>
         </Dialog>
      </>
   );
}
