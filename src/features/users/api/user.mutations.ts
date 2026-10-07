/**
 * FEATURE EXEMPLO (`users`).
 *
 * Camada de escrita (React Query). Após a mutation, invalide as queries
 * afetadas via a factory de chaves - assim a UI revalida sozinha sem
 * espelhar dados de servidor em estado client (anti-padrão).
 *
 * ⚠️ Endpoint `/users` é PLACEHOLDER (ver `user.queries.ts`).
 */
import { userKeys } from "@/features/users/api/user.keys";
import { UserSchema, type CreateUserInput } from "@/features/users/types/user.schema";
import api from "@/services/api";
import type { ApiResponse } from "@/services/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateUser() {
   const queryClient = useQueryClient();

   return useMutation({
      mutationFn: async (input: CreateUserInput) => {
         const { data } = await api.post<ApiResponse<unknown>>("/users", input);
         return UserSchema.parse(data.data);
      },
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      },
   });
}
