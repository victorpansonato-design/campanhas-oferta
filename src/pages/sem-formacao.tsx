import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Copy, Download, RotateCcw } from "lucide-react";
import { DataBoundary, PageHeading, CourseImage, DetailLink, SearchField, SelectField, Status } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Callout } from "@/components/ui/callout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useDemo, useAction } from "@/hooks/use-demo";
import { useFilters } from "@/hooks/use-filters";
import { useSession } from "@/stores/session.store";
import { repository } from "@/services/repositories";
import { contextLabel, cursos, dateLabel, gerarEntradas, modalidades, normalizeSearch, ofertas } from "@/lib/domain";
import { exportStudents } from "@/lib/exports";
import type { DemoData, Formacao } from "@/types/domain";
import { toast } from "sonner";
import { StudentActions } from "@/components/student-actions";
export default function SemFormacao() {
   const f = useFilters(),
      query = useDemo(Number(f.get("ano", "2027")));
   return (
      <>
         <PageHeading title="Não formação de turma" description="Acompanhe cada contexto e os alunos que precisam de atenção." />
         <DataBoundary query={query}>{data => <FormationList data={data} />}</DataBoundary>
      </>
   );
}
function FormationList({ data }: { data: DemoData }) {
   const f = useFilters(),
      ano = f.get("ano", "2027"),
      mode = f.get("modalidade"),
      entries = mode ? gerarEntradas(Number(ano), mode) : modalidades.flatMap(m => gerarEntradas(Number(ano), m));
   const list = data.naoFormacao.filter(n => {
      const ctx = data.contextos.find(c => c.id === n.contextoId)!,
         offer = ofertas.find(o => o.id === ctx.ofertaId)!;
      return (
         ctx.entradaCodigo.startsWith(`${ano}/`) &&
         (!mode || offer.modalidade === mode) &&
         (!f.get("entrada") || ctx.entradaCodigo === f.get("entrada")) &&
         (f.get("revertidos") === "1" || n.estado === "nao-formou") &&
         normalizeSearch(contextLabel(ctx)).includes(normalizeSearch(f.get("q")))
      );
   });
   return (
      <>
         <div className="list-filters">
            <SearchField value={f.get("q")} onChange={q => f.set({ q })} placeholder="Buscar curso ou contexto…" />
            <SelectField
               label="Ano de ingresso"
               value={ano}
               onChange={ano => f.set({ ano, entrada: "" })}
               options={Array.from({ length: 8 }, (_, i) => String(2025 + i))}
            />
            <SelectField
               label="Modalidade"
               value={mode}
               onChange={modalidade => f.set({ modalidade, entrada: "" })}
               options={[{ value: "", label: "Todas" }, ...modalidades]}
            />
            <SelectField
               label="Entrada"
               value={f.get("entrada")}
               onChange={entrada => f.set({ entrada })}
               options={[{ value: "", label: "Todas as entradas" }, ...entries.map(e => ({ value: e.codigo, label: e.codigo }))]}
            />
         </div>
         <div className="result-toolbar">
            <p>
               {list.length} contextos ·{" "}
               <strong>
                  {
                     new Set(list.map(n => ofertas.find(o => o.id === data.contextos.find(c => c.id === n.contextoId)?.ofertaId)?.cursoId))
                        .size
                  }{" "}
                  cursos
               </strong>{" "}
               · {list.reduce((count, n) => count + n.alunosIds.length, 0)} alunos
            </p>
            <label className="check-label">
               <input
                  type="checkbox"
                  checked={f.get("revertidos") === "1"}
                  onChange={e => f.set({ revertidos: e.target.checked ? "1" : "" })}
               />
               Incluir registros revertidos
            </label>
            <Button variant="ghost" size="sm" onClick={f.clear}>
               Limpar filtros
            </Button>
         </div>
         {!list.length ? (
            <EmptyState
               title="Nenhum registro neste recorte"
               hint="Ajuste a entrada ou consulte outro ano."
               actions={<Button onClick={f.clear}>Limpar filtros</Button>}
            />
         ) : (
            <div className="course-grid formation-grid">
               {list.map(n => {
                  const ctx = data.contextos.find(c => c.id === n.contextoId)!,
                     offer = ofertas.find(o => o.id === ctx.ofertaId)!,
                     course = cursos.find(c => c.id === offer.cursoId)!;
                  return (
                     <article key={n.id} className="course-card">
                        <CourseImage id={course.id} gray={n.estado === "nao-formou"} />
                        <div className="course-card-body">
                           <div className="course-eyebrow">
                              {offer.modalidade} · {offer.formato}
                           </div>
                           <h2>
                              <Link to={`/sem-formacao/${n.id}`}>{course.nome}</Link>
                           </h2>
                           <p className="text-sm text-muted-foreground">
                              {ctx.entradaCodigo} · {ctx.turno}
                           </p>
                           <Status value={n.estado} />
                           <p className="mt-3 text-xs text-muted-foreground">
                              {n.motivo} · {dateLabel(n.registradaEm)}
                           </p>
                           <DetailLink to={`/sem-formacao/${n.id}`}>Consultar {n.alunosIds.length} alunos</DetailLink>
                        </div>
                     </article>
                  );
               })}
            </div>
         )}
      </>
   );
}
export function FormationDetail() {
   const { registroId } = useParams(),
      query = useDemo();
   return (
      <DataBoundary query={query}>
         {data => {
            const record = data.naoFormacao.find(n => n.id === registroId);
            return record ? (
               <Students data={data} record={record} />
            ) : (
               <EmptyState title="Registro não encontrado" actions={<Link to="/sem-formacao">Voltar aos registros</Link>} />
            );
         }}
      </DataBoundary>
   );
}
function Students({ data, record }: { data: DemoData; record: Formacao }) {
   const f = useFilters(),
      context = data.contextos.find(c => c.id === record.contextoId)!,
      offer = ofertas.find(o => o.id === context.ofertaId)!,
      course = cursos.find(c => c.id === offer.cursoId)!;
   const [selection, setSelection] = useState<string[]>([]),
      [exportOpen, setExportOpen] = useState(false),
      [scope, setScope] = useState("filtered"),
      [restoreOpen, setRestoreOpen] = useState(false),
      [reason, setReason] = useState(""),
      [exporting, setExporting] = useState(false),
      [feedback, setFeedback] = useState("");
   const action = useAction(),
      persona = useSession(s => s.personaId);
   const all = data.matriculas.filter(m => m.contextoId === context.id && record.alunosIds.includes(m.id));
   const services = new Map(data.atendimentos.filter(a => a.registroId === record.id).map(a => [a.matriculaId, a.resultado]));
   const refunds = new Map(data.devolucoes.map(r => [r.matriculaId, r.estado]));
   const filtered = all.filter(m => {
      const status = f.get("situacao"),
         refund = refunds.get(m.id),
         service = services.get(m.id);
      return (
         normalizeSearch(`${m.nomeCompleto} ${m.ra}`).includes(normalizeSearch(f.get("q"))) &&
         (!f.get("contato") || (f.get("contato") === "com" ? !!m.telefone && !!m.email : !m.telefone || !m.email)) &&
         (!status ||
            (status === "a-contatar"
               ? !service && !refund
               : status === "em-devolucao"
                 ? !!refund && !["paga", "recusada", "cancelada"].includes(refund)
                 : status === "paga"
                   ? refund === "paga"
                   : service === status))
      );
   });
   const selected = filtered.filter(m => selection.includes(m.id)),
      page = Math.min(Math.max(1, Number(f.get("pagina", "1"))), Math.max(1, Math.ceil(filtered.length / 8))),
      rows = filtered.slice((page - 1) * 8, page * 8);
   const toggle = (id: string) => setSelection(old => (old.includes(id) ? old.filter(x => x !== id) : [...old, id]));
   const copy = async (text: string) => {
      try {
         await navigator.clipboard.writeText(text);
         toast.success("Contato copiado");
      } catch {
         toast.error("Não foi possível copiar neste navegador");
      }
   };
   const doExport = async (format: "xlsx" | "pdf") => {
      setExporting(true);
      setFeedback("");
      try {
         await exportStudents(
            {
               contexto: context,
               registro: record,
               alunos: scope === "selected" ? selected : filtered,
               atendimentos: data.atendimentos,
               devolucoes: data.devolucoes,
               geradoPor: data.personas.find(p => p.id === persona)?.nome,
               escopo: scope === "selected" ? "Linhas selecionadas" : "Todos os resultados filtrados",
            },
            format,
         );
         setFeedback(`Arquivo ${format.toUpperCase()} gerado com ${scope === "selected" ? selected.length : filtered.length} alunos.`);
         setExportOpen(false);
         toast.success("Arquivo gerado");
      } catch (err) {
         setFeedback((err as Error).message);
      } finally {
         setExporting(false);
      }
   };
   return (
      <>
         <PageHeading
            title={course.nome}
            back={{ to: "/sem-formacao", label: "Não formação de turma" }}
            description={`${offer.modalidade} · ${offer.formato} · ${context.turno} · Entrada ${context.entradaCodigo}`}
         >
            <Button variant="outline" className="gap-2" disabled={record.estado !== "nao-formou"} onClick={() => setRestoreOpen(true)}>
               <RotateCcw className="size-4" />
               Restaurar formação
            </Button>
            <Button className="gap-2" onClick={() => setExportOpen(true)} disabled={!filtered.length}>
               <Download className="size-4" />
               Exportar
            </Button>
         </PageHeading>
         <div className="formation-context">
            <Status value={record.estado} />
            <span>
               {record.motivo} · {dateLabel(record.registradaEm)} ·{" "}
               {data.personas.find(p => p.id === record.autora)?.nome.replace(" Exemplo", "")}
            </span>
         </div>
         {record.reversao && (
            <Callout className="mb-5" tone="success">
               Formação restaurada em {dateLabel(record.reversao.em)} por {data.personas.find(p => p.id === record.reversao!.por)?.nome}.
               Motivo: {record.reversao.motivo}
            </Callout>
         )}
         <section className="panel students-panel">
            <div className="panel-heading">
               <div>
                  <h2>Alunos deste contexto</h2>
               </div>
               <span className="text-sm">{all.length} alunos</span>
            </div>
            <div className="list-filters">
               <SearchField
                  label="Buscar alunos por nome ou RA"
                  value={f.get("q")}
                  onChange={q => f.set({ q, pagina: "" })}
                  placeholder="Buscar por nome completo ou RA…"
               />
               <SelectField
                  label="Contato cadastrado"
                  value={f.get("contato")}
                  onChange={contato => f.set({ contato, pagina: "" })}
                  options={[
                     { value: "", label: "Todos os alunos" },
                     { value: "com", label: "Telefone e e-mail cadastrados" },
                     { value: "sem", label: "Contato incompleto" },
                  ]}
               />
               <SelectField
                  label="Situação do atendimento"
                  value={f.get("situacao")}
                  onChange={situacao => f.set({ situacao, pagina: "" })}
                  options={[
                     { value: "", label: "Todas as situações" },
                     { value: "a-contatar", label: "A contatar" },
                     { value: "contato-realizado", label: "Contato realizado" },
                     { value: "aceitou-outro-curso", label: "Aceitou outro curso" },
                     { value: "em-devolucao", label: "Devolução em andamento" },
                     { value: "paga", label: "Devolvido" },
                  ]}
               />
               <Button variant="ghost" onClick={f.clear}>
                  Limpar filtros
               </Button>
            </div>
            <div className="selection-bar">
               <span>
                  {filtered.length} resultados · {selected.length} selecionados entre todas as páginas
               </span>
               {selection.length > 0 && (
                  <Button size="sm" variant="link" onClick={() => setSelection([])}>
                     Limpar seleção
                  </Button>
               )}
            </div>
            {!rows.length ? (
               <EmptyState
                  title="Nenhum aluno neste filtro"
                  hint={all.length ? "Experimente outro nome ou RA." : "O registro foi criado sem matrículas neste contexto."}
                  actions={<Button onClick={f.clear}>Limpar filtros</Button>}
               />
            ) : (
               <div className="table-wrap">
                  <table className="students-table">
                     <caption className="sr-only">
                        Alunos de {course.nome}, entrada {context.entradaCodigo}, {context.turno}
                     </caption>
                     <thead>
                        <tr>
                           <th>
                              <input
                                 type="checkbox"
                                 aria-label="Selecionar todos os resultados filtrados"
                                 checked={!!filtered.length && selected.length === filtered.length}
                                 onChange={e =>
                                    setSelection(
                                       e.target.checked
                                          ? [...new Set([...selection, ...filtered.map(m => m.id)])]
                                          : selection.filter(id => !filtered.some(m => m.id === id)),
                                    )
                                 }
                              />
                           </th>
                           <th scope="col">RA</th>
                           <th scope="col">Nome completo</th>
                           <th scope="col">Telefone</th>
                           <th scope="col">E-mail</th>
                           <th scope="col">Atendimento e devolução</th>
                        </tr>
                     </thead>
                     <tbody>
                        {rows.map(m => (
                           <tr key={m.id}>
                              <td>
                                 <input
                                    type="checkbox"
                                    aria-label={`Selecionar ${m.nomeCompleto}`}
                                    checked={selection.includes(m.id)}
                                    onChange={() => toggle(m.id)}
                                 />
                              </td>
                              <td className="font-mono">{m.ra}</td>
                              <td>{m.nomeCompleto}</td>
                              <td>
                                 {m.telefone ? (
                                    <span className="contact-cell">
                                       {m.telefone}
                                       <Button
                                          size="icon"
                                          variant="ghost"
                                          aria-label={`Copiar telefone de ${m.nomeCompleto}`}
                                          onClick={() => void copy(m.telefone!)}
                                       >
                                          <Copy className="size-3" />
                                       </Button>
                                    </span>
                                 ) : (
                                    <span className="text-muted-foreground">Não cadastrado</span>
                                 )}
                              </td>
                              <td>
                                 {m.email ? (
                                    <span className="contact-cell">
                                       {m.email}
                                       <Button
                                          size="icon"
                                          variant="ghost"
                                          aria-label={`Copiar e-mail de ${m.nomeCompleto}`}
                                          onClick={() => void copy(m.email!)}
                                       >
                                          <Copy className="size-3" />
                                       </Button>
                                    </span>
                                 ) : (
                                    <span className="text-muted-foreground">Não cadastrado</span>
                                 )}
                              </td>
                              <td>
                                 <StudentActions student={m} record={record} data={data} />
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}
            <div className="pagination">
               <span>
                  {filtered.length ? `${(page - 1) * 8 + 1}–${Math.min(page * 8, filtered.length)} de ${filtered.length}` : "0 alunos"}
               </span>
               <Button size="sm" variant="outline" disabled={page === 1} onClick={() => f.set({ pagina: String(page - 1) })}>
                  Anterior
               </Button>
               <span>Página {page}</span>
               <Button
                  size="sm"
                  variant="outline"
                  disabled={page * 8 >= filtered.length}
                  onClick={() => f.set({ pagina: String(page + 1) })}
               >
                  Próxima
               </Button>
            </div>
         </section>
         {feedback && <Callout className="mt-4">{feedback}</Callout>}
         <details className="panel mt-5">
            <summary>Histórico do registro</summary>
            <p className="mt-4 text-sm">{record.observacao || "Sem observação."}</p>
            <ol className="history-list">
               <li>
                  <strong>Não formação registrada</strong>
                  <span>
                     {dateLabel(record.registradaEm)} · {data.personas.find(p => p.id === record.autora)?.nome}
                  </span>
               </li>
               {record.reversao && (
                  <li>
                     <strong>Registro revertido</strong>
                     <span>
                        {dateLabel(record.reversao.em)} · {record.reversao.motivo}
                     </span>
                  </li>
               )}
            </ol>
            <Link className="detail-link" to={`/cursos/${course.id}`}>
               Abrir ficha do curso
            </Link>
         </details>
         <Dialog open={exportOpen} onOpenChange={setExportOpen}>
            <DialogContent>
               <DialogHeader>
                  <DialogTitle>Exportar alunos</DialogTitle>
                  <DialogDescription>{contextLabel(context)}. Selecione os dados que deseja exportar.</DialogDescription>
               </DialogHeader>
               <fieldset className="export-scope">
                  <legend>Quais linhas incluir?</legend>
                  <label>
                     <input type="radio" name="export-scope" checked={scope === "filtered"} onChange={() => setScope("filtered")} />
                     Todos os resultados filtrados ({filtered.length}) · todas as páginas
                  </label>
                  <label>
                     <input
                        type="radio"
                        name="export-scope"
                        disabled={!selected.length}
                        checked={scope === "selected"}
                        onChange={() => setScope("selected")}
                     />
                     Somente linhas selecionadas ({selected.length})
                  </label>
               </fieldset>
               <DialogFooter>
                  <Button
                     variant="outline"
                     disabled={exporting || (scope === "selected" && !selected.length)}
                     onClick={() => void doExport("xlsx")}
                  >
                     Excel (.xlsx)
                  </Button>
                  <Button disabled={exporting || (scope === "selected" && !selected.length)} onClick={() => void doExport("pdf")}>
                     PDF (.pdf)
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
         <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
            <DialogContent>
               <DialogHeader>
                  <DialogTitle>Restaurar formação deste contexto?</DialogTitle>
                  <DialogDescription>{contextLabel(context)}. O histórico e as matrículas serão preservados.</DialogDescription>
               </DialogHeader>
               <label className="field">
                  Motivo (obrigatório)
                  <textarea value={reason} onChange={e => setReason(e.target.value)} />
               </label>
               <DialogFooter>
                  <Button variant="outline" onClick={() => setRestoreOpen(false)}>
                     Cancelar
                  </Button>
                  <Button
                     disabled={!reason.trim() || action.isPending}
                     onClick={() =>
                        action.mutate(async () => {
                           await repository.restore(record.id, reason, persona);
                           setRestoreOpen(false);
                           toast.success("Formação restaurada neste contexto");
                        })
                     }
                  >
                     Confirmar restauração
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </>
   );
}
