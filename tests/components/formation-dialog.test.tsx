import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { FormationDialog } from "@/components/formation-dialog";
import { Button } from "@/components/ui/button";
import { initialData, repository } from "@/services/repositories";
import type { Contexto, DemoData } from "@/types/domain";

const data = await initialData();
const available = data.contextos.filter(c => !data.naoFormacao.some(n => n.contextoId === c.id && n.estado === "nao-formou"));

afterEach(() => vi.restoreAllMocks());

function openDialog(contexts: Contexto[], input: DemoData = data) {
   render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
         <MemoryRouter>
            <FormationDialog contexts={contexts} data={input} year={2027} courseName="Curso selecionado">
               <Button>Não formação</Button>
            </FormationDialog>
         </MemoryRouter>
      </QueryClientProvider>,
   );
   fireEvent.click(screen.getByRole("button", { name: "Não formação" }));
}

it("exige escolher a turma e registra somente o contexto selecionado com a observação", async () => {
   const register = vi.spyOn(repository, "register").mockResolvedValue("registro-teste");
   openDialog(available.slice(0, 2));
   expect(screen.getByRole("button", { name: "Confirmar registro" })).toBeDisabled();
   fireEvent.change(screen.getByRole("combobox", { name: "Oferta, turno e entrada" }), { target: { value: available[1].id } });
   fireEvent.change(screen.getByLabelText("Observação (opcional)"), { target: { value: "Contato com a coordenação" } });
   fireEvent.click(screen.getByRole("button", { name: "Confirmar registro" }));
   await waitFor(() => expect(register).toHaveBeenCalledExactlyOnceWith(available[1].id, "Contato com a coordenação", "gestora-1", 2027));
});

it("exclui turmas já registradas e seleciona automaticamente quando resta uma única turma", () => {
   const registered = data.contextos.find(c => c.id === data.naoFormacao.find(n => n.estado === "nao-formou")!.contextoId)!;
   openDialog([registered, available[0]]);
   expect(screen.getByRole("combobox", { name: "Oferta, turno e entrada" })).toHaveValue(available[0].id);
   expect(screen.getAllByRole("option")).toHaveLength(2);
   expect(screen.getByRole("button", { name: "Confirmar registro" })).toBeEnabled();
});
