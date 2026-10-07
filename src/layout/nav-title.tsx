import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
export function NavTitle() {
   const path = useLocation().pathname;
   const name =
      path.startsWith("/cursos") || path.startsWith("/catalogo")
         ? "Catálogo"
         : path.startsWith("/campanhas")
           ? "Campanhas"
           : path.startsWith("/aprovacoes")
             ? "Aprovações"
             : path.startsWith("/sem-formacao")
               ? "Não formação de turma"
               : "Página";
   return (
      <nav aria-label="Localização" className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
         <Link to="/catalogo" className="hidden sm:block">
            Captação
         </Link>
         <ChevronRight className="hidden size-3 sm:block" aria-hidden />
         <span className="truncate">{name}</span>
      </nav>
   );
}
