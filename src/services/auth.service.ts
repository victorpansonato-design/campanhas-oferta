import { currentPersona, useSession } from "@/stores/session.store";
import type { AuthUser } from "@/types/auth.types";
export const authService = {
   async me(): Promise<AuthUser> {
      const p = currentPersona(useSession.getState().personaId);
      return { usuario: p.id, nome: p.nome, email: p.email, setor: p.setor };
   },
   async logout(): Promise<void> {
      useSession.getState().setPersona("gestora-1");
   },
};
