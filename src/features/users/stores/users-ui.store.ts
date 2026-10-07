/**
 * FEATURE EXEMPLO (`users`).
 *
 * Zustand para ESTADO DE UI transversal da feature - aqui, se o modal de
 * criação está aberto. Regra de ouro: NUNCA guarde dados de servidor aqui
 * (isso é trabalho do React Query). Prefira stores pequenas por domínio e
 * consuma sempre com seletores para evitar re-renders desnecessários.
 */
import { create } from "zustand";

type UsersUiState = {
   isCreateOpen: boolean;
   openCreate: () => void;
   closeCreate: () => void;
   setCreateOpen: (open: boolean) => void;
};

export const useUsersUiStore = create<UsersUiState>()(set => ({
   isCreateOpen: false,
   openCreate: () => set({ isCreateOpen: true }),
   closeCreate: () => set({ isCreateOpen: false }),
   setCreateOpen: open => set({ isCreateOpen: open }),
}));
