/**
 * FEATURE EXEMPLO (`users`).
 *
 * Camada de leitura (React Query). Pontos do padrão:
 * - Encapsule cada recurso em um hook (`useUsers`, `useUser`); nunca chame
 *   `useQuery` cru espalhado nos componentes.
 * - Faça o `.parse` do Zod DENTRO da `queryFn` - o tipo que entra na aplicação
 *   é validado em runtime. Se o backend quebrar o contrato, o erro estoura aqui
 *   (no boundary), não três telas depois com `undefined`.
 * - As chaves vêm da factory (`userKeys`), nunca de arrays soltos.
 *
 * ⚠️ O endpoint `/users` é um PLACEHOLDER. A API real pode não tê-lo: estes
 * arquivos são um molde para copiar ao criar uma feature de verdade.
 */
import { userKeys } from "@/features/users/api/user.keys";
import { UserListSchema, UserSchema, type UserFilters } from "@/features/users/types/user.schema";
import api from "@/services/api";
import type { ApiResponse } from "@/services/types";
import { useQuery } from "@tanstack/react-query";

export function useUsers(filters: UserFilters) {
   return useQuery({
      queryKey: userKeys.list(filters),
      queryFn: async () => {
         const { data } = await api.get<ApiResponse<unknown>>("/users", {
            params: { search: filters.search, page: filters.page },
         });
         // Respostas Anchieta vêm no envelope ApiResponse<T> → validar `data.data`.
         return UserListSchema.parse(data.data);
      },
   });
}

export function useUser(id: string) {
   return useQuery({
      queryKey: userKeys.detail(id),
      queryFn: async () => {
         const { data } = await api.get<ApiResponse<unknown>>(`/users/${id}`);
         return UserSchema.parse(data.data);
      },
      enabled: id.length > 0,
   });
}
