/**
 * FEATURE EXEMPLO (`users`).
 *
 * URL STATE - filtro e paginação moram na rota (search params), NÃO no Zustand.
 * Estado que faz sentido ser compartilhável/bookmarkável e sobreviver a um
 * refresh pertence à URL. Aqui usamos `useSearchParams` do React Router.
 */
import type { UserFilters } from "@/features/users/types/user.schema";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

const SEARCH_DEBOUNCE_MS = 300;

export function useUserFilters() {
   const [searchParams, setSearchParams] = useSearchParams();

   const filters = useMemo<UserFilters>(
      () => ({
         search: searchParams.get("search") ?? "",
         page: Number(searchParams.get("page") ?? "1") || 1,
      }),
      [searchParams],
   );

   const setSearch = useDebouncedCallback((search: string) => {
      setSearchParams(prev => {
         const next = new URLSearchParams(prev);
         if (search) next.set("search", search);
         else next.delete("search");
         next.delete("page"); // nova busca volta para a primeira página
         return next;
      });
   }, SEARCH_DEBOUNCE_MS);

   const setPage = useCallback(
      (page: number) => {
         setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (page > 1) next.set("page", String(page));
            else next.delete("page");
            return next;
         });
      },
      [setSearchParams],
   );

   return { filters, setSearch, setPage };
}
