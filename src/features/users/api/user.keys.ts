/**
 * FEATURE EXEMPLO (`users`).
 *
 * Query key factory: centraliza as chaves do React Query para esta entidade.
 * Use sempre estas funções (nunca arrays soltos espalhados nos hooks) - assim
 * a invalidação fica consistente: `invalidateQueries({ queryKey: userKeys.lists() })`
 * invalida todas as listagens de uma vez.
 */
import type { UserFilters } from "@/features/users/types/user.schema";

export const userKeys = {
   all: ["users"] as const,
   lists: () => [...userKeys.all, "list"] as const,
   list: (filters: UserFilters) => [...userKeys.lists(), filters] as const,
   details: () => [...userKeys.all, "detail"] as const,
   detail: (id: string) => [...userKeys.details(), id] as const,
};
