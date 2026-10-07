import { PageHeader } from "@/components/ui/page-header";
import { UserList } from "@/features/users";

/**
 * Página da feature de exemplo `users`. A página apenas COMPÕE a feature pela
 * sua API pública (`@/features/users`) - toda a lógica (queries, form, store,
 * filtros) vive dentro do slice. Use esta tela como molde ao criar features reais.
 */
export default function UsersPage() {
   return (
      <div className="space-y-8">
         <PageHeader
            eyebrow="Cadastros"
            title="Usuários"
            description="Feature de exemplo demonstrando server state (React Query), form (RHF + Zod), URL state e Zustand."
         />
         <UserList />
      </div>
   );
}
