/**
 * API PÚBLICA do slice `users`.
 *
 * Outras camadas (páginas, outras features) DEVEM importar apenas daqui -
 * nunca do interior do slice (`features/users/api/...`). O ESLint
 * (`boundaries/entry-point`) força essa regra. Exponha só o necessário.
 */
export { UserForm } from "@/features/users/components/user-form";
export { UserList } from "@/features/users/components/user-list";
export { useUserFilters } from "@/features/users/hooks/use-user-filters";
export { useUsersUiStore } from "@/features/users/stores/users-ui.store";
export type { CreateUserInput, User, UserFilters } from "@/features/users/types/user.schema";
