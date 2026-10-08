import { useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { SelectField } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAction } from "@/hooks/use-demo";
import { contextLabel } from "@/lib/domain";
import { repository } from "@/services/repositories";
import { useSession } from "@/stores/session.store";
import type { Contexto, DemoData } from "@/types/domain";
import { toast } from "sonner";

export function FormationDialog({
   contexts,
   data,
   year,
   courseName,
   children,
}: {
   contexts: Contexto[];
   data: DemoData;
   year: number;
   courseName: string;
   children: ReactElement;
}) {
   const [open, setOpen] = useState(false);
   const [selected, setSelected] = useState("");
   const [note, setNote] = useState("");
   const action = useAction();
   const persona = useSession(s => s.personaId);
   const navigate = useNavigate();
   const eligible = contexts.filter(c => !data.naoFormacao.some(n => n.contextoId === c.id && n.estado === "nao-formou"));
   const validSelection = eligible.some(c => c.id === selected);
   const enrolled = data.matriculas.filter(m => m.contextoId === selected);

   return (
      <Dialog
         open={open}
         onOpenChange={next => {
            if (action.isPending) return;
            if (next) {
               setSelected(eligible.length === 1 ? eligible[0].id : "");
               setNote("");
               action.reset();
            }
            setOpen(next);
         }}
      >
         <DialogTrigger asChild>{children}</DialogTrigger>
         <DialogContent>
            <DialogHeader>
               <DialogTitle>Registrar não formação de turma</DialogTitle>
               <DialogDescription>
                  {courseName} · ingresso {year}. Escolha a oferta, o turno e a entrada. O registro vale somente para essa turma.
               </DialogDescription>
            </DialogHeader>
            {eligible.length ? (
               <>
                  <SelectField
                     label="Oferta, turno e entrada"
                     value={selected}
                     onChange={setSelected}
                     disabled={action.isPending}
                     options={[{ value: "", label: "Selecione a turma" }, ...eligible.map(c => ({ value: c.id, label: contextLabel(c) }))]}
                  />
                  <p className="text-sm" aria-live="polite">
                     {validSelection ? (
                        <>
                           <strong>{enrolled.length} matrículas</strong> nesta turma. Matrículas e campanhas anteriores serão preservadas.
                        </>
                     ) : (
                        "Selecione a turma para consultar as matrículas."
                     )}
                  </p>
                  <label className="field">
                     Observação (opcional)
                     <textarea value={note} onChange={e => setNote(e.target.value)} disabled={action.isPending} />
                  </label>
                  <p className="text-sm text-muted-foreground">Motivo: Número insuficiente de alunos</p>
               </>
            ) : (
               <p className="text-sm">Todas as turmas deste recorte já possuem registro de não formação.</p>
            )}
            {action.isError && (
               <Callout tone="danger" role="alert">
                  {action.error.message}
               </Callout>
            )}
            <DialogFooter>
               <Button variant="outline" disabled={action.isPending} onClick={() => setOpen(false)}>
                  Cancelar
               </Button>
               <Button
                  disabled={!validSelection || action.isPending}
                  onClick={() =>
                     action.mutate(async () => {
                        const id = await repository.register(selected, note, persona, year);
                        setOpen(false);
                        toast.success("Não formação registrada");
                        navigate(`/sem-formacao/${id}`);
                     })
                  }
               >
                  {action.isPending && <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden />}
                  {action.isPending ? "Registrando…" : "Confirmar registro"}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}
