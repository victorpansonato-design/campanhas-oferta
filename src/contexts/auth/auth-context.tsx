import { createContext, type ReactNode } from "react";
import { currentPersona, useSession } from "@/stores/session.store";
import type { AuthContextData } from "@/types/auth.types";
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextData | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
   const p = currentPersona(useSession(s => s.personaId));
   return (
      <AuthContext.Provider
         value={{
            user: { usuario: p.id, nome: p.nome, email: p.email, setor: p.setor },
            isLoading: false,
            isAuthenticated: true,
            logout: async () => {
               useSession.getState().setPersona("gestora-1");
            },
         }}
      >
         {children}
      </AuthContext.Provider>
   );
}
