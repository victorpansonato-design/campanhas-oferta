import { registerRoutePrefetch } from "@/lib/route-prefetch";
export const routeLoaders = {
   catalogo: () => import("@/pages/catalogo"),
   curso: () => import("@/pages/curso"),
   campanhas: () => import("@/pages/campanhas"),
   campanha: () => import("@/pages/campanha"),
   form: () => import("@/pages/campanha-form"),
   aprovacoes: () => import("@/pages/aprovacoes"),
   formacao: () => import("@/pages/sem-formacao"),
};
const loaded = new Set<string>();
function prefetch(path: string) {
   const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
   if (connection?.saveData || connection?.effectiveType === "2g") return;
   const key = path.startsWith("/catalogo")
      ? "catalogo"
      : path.startsWith("/cursos/")
        ? "curso"
        : path.includes("/nova") || path.endsWith("/editar")
          ? "form"
          : path === "/campanhas"
            ? "campanhas"
            : path.startsWith("/campanhas/")
              ? "campanha"
              : path.startsWith("/aprovacoes")
                ? "aprovacoes"
                : path.startsWith("/sem-formacao")
                  ? "formacao"
                  : null;
   if (key && !loaded.has(key)) {
      loaded.add(key);
      void routeLoaders[key]().catch(() => loaded.delete(key));
   }
}
registerRoutePrefetch(prefetch);
export { preloadRoute } from "@/lib/route-prefetch";
