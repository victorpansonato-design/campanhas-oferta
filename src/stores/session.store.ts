import personaData from "@/data/personas.json";
import { create } from "zustand";
import { persist } from "zustand/middleware";
export const personas = personaData;
export const useSession = create<{ personaId: string; setPersona: (id: string) => void }>()(
   persist(set => ({ personaId: "gestora-1", setPersona: personaId => set({ personaId }) }), { name: "anchieta.session.v1" }),
);
export function currentPersona(id: string) {
   return personas.find(p => p.id === id) ?? personas[0];
}
