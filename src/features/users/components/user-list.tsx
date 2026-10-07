/**
 * FEATURE EXEMPLO (`users`).
 *
 * SERVER STATE consumido via hook (`useUsers`), com filtro/paginação vindos da
 * URL (`useUserFilters`) e o modal de criação controlado por Zustand
 * (`useUsersUiStore`). Demonstra os quatro tipos de estado convivendo sem se
 * misturarem. A UI compõe primitivos do design system (`components/ui`).
 */
import { AsyncState } from "@/components/ui/async-state";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUsers } from "@/features/users/api/user.queries";
import { UserForm } from "@/features/users/components/user-form";
import { useUserFilters } from "@/features/users/hooks/use-user-filters";
import { useUsersUiStore } from "@/features/users/stores/users-ui.store";
import { Plus, Users } from "lucide-react";

export function UserList() {
   const { filters, setSearch } = useUserFilters();
   const { data: users, isLoading, isError } = useUsers(filters);

   const isCreateOpen = useUsersUiStore(s => s.isCreateOpen);
   const setCreateOpen = useUsersUiStore(s => s.setCreateOpen);
   const openCreate = useUsersUiStore(s => s.openCreate);

   return (
      <div className="space-y-4">
         <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
               <SearchInput placeholder="Buscar usuários..." defaultValue={filters.search} onChange={e => setSearch(e.target.value)} />
               <SearchInput placeholder="Buscar usuários..." defaultValue={filters.search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button onClick={openCreate} className="w-full md:w-auto">
               <Plus className="h-4 w-4" />
               Novo usuário
            </Button>
         </div>

         <AsyncState
            isLoading={isLoading}
            isError={isError}
            isEmpty={!users || users.length === 0}
            loading={
               <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                     <Skeleton key={i} className="h-11 w-full" />
                  ))}
               </div>
            }
            error={
               <EmptyState
                  tone="error"
                  icon={Users}
                  title="Não foi possível carregar os usuários"
                  hint="O endpoint /users é um placeholder desta feature de exemplo."
               />
            }
            empty={
               <EmptyState
                  icon={Users}
                  title="Nenhum usuário encontrado"
                  hint="Crie o primeiro usuário ou ajuste a busca."
                  actions={
                     <Button variant="outline" onClick={openCreate}>
                        <Plus className="h-4 w-4" />
                        Novo usuário
                     </Button>
                  }
               />
            }
         >
            <Table>
               <TableHeader>
                  <TableRow>
                     <TableHead>Nome</TableHead>
                     <TableHead>E-mail</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {users?.map(user => (
                     <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.nome}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                     </TableRow>
                  ))}
               </TableBody>
            </Table>
         </AsyncState>

         <Modal open={isCreateOpen} onOpenChange={setCreateOpen} title="Novo usuário" description="Cadastre um novo usuário.">
            <UserForm onSuccess={() => setCreateOpen(false)} />
         </Modal>
      </div>
   );
}
