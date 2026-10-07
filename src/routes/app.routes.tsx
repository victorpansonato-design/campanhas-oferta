import { lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { routeLoaders } from "@/routes/loaders";
import MainLayout from "@/layout/main-layout";
import { env } from "@/config/env";
import { EmptyState } from "@/components/ui/empty-state";
const Catalogo = lazy(() => routeLoaders.catalogo());
const Curso = lazy(() => routeLoaders.curso());
const Campanhas = lazy(() => routeLoaders.campanhas());
const Campanha = lazy(() => routeLoaders.campanha());
const Form = lazy(() => routeLoaders.form());
const Aprovacoes = lazy(() => routeLoaders.aprovacoes());
const SemFormacao = lazy(() => routeLoaders.formacao());
const FormationDetail = lazy(() => routeLoaders.formacao().then(m => ({ default: m.FormationDetail })));
export default function AppRoutes() {
   return (
      <BrowserRouter basename={env.baseUrl}>
         <a href="#main" className="skip-link">
            Ir para o conteúdo
         </a>
         <Routes>
            <Route element={<MainLayout />}>
               <Route index element={<Navigate to="/catalogo" replace />} />
               <Route path="catalogo" element={<Catalogo />} />
               <Route path="cursos/:cursoId" element={<Curso />} />
               <Route path="campanhas" element={<Campanhas />} />
               <Route path="campanhas/nova" element={<Form />} />
               <Route path="campanhas/:id/editar" element={<Form />} />
               <Route path="campanhas/:id" element={<Campanha />} />
               <Route path="aprovacoes" element={<Aprovacoes />} />
               <Route path="sem-formacao" element={<SemFormacao />} />
               <Route path="sem-formacao/:registroId" element={<FormationDetail />} />
               <Route
                  path="*"
                  element={<EmptyState title="Página não encontrada" actions={<a href="/catalogo">Voltar ao catálogo</a>} />}
               />
            </Route>
         </Routes>
      </BrowserRouter>
   );
}
