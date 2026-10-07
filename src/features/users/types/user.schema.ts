/**
 * FEATURE EXEMPLO (`users`) - referência viva da arquitetura.
 *
 * Zod é a FONTE ÚNICA DA VERDADE: defina o schema uma vez e derive tudo
 * (tipos via `z.infer`, validação de formulário via `zodResolver`, validação
 * da resposta da API via `.parse`). Nunca declare `interface User` à mão
 * quando o Zod já cobre o contrato.
 */
import { z } from "zod";

export const UserSchema = z.object({
   id: z.string(),
   nome: z.string().min(1, "Informe o nome"),
   email: z.string().email("E-mail inválido"),
});

export type User = z.infer<typeof UserSchema>;

/** Lista de usuários - usada no `.parse` da query de listagem. */
export const UserListSchema = z.array(UserSchema);

/** Entrada de criação: o `id` é gerado pelo backend, então é omitido. */
export const CreateUserSchema = UserSchema.omit({ id: true });

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

/** Filtros de listagem - vivem na URL (ver `hooks/use-user-filters.ts`). */
export interface UserFilters {
   search: string;
   page: number;
}
