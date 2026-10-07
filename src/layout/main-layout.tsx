import { Suspense, useEffect, useRef } from "react";

import { Building2, SunMoon, User } from "lucide-react";
import { m as motion } from "motion/react";
import { Outlet, useLocation } from "react-router-dom";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { RouteBoundary } from "@/components/ui/route-boundary";
import { useAuth } from "@/hooks/use-auth";
import { AppSidebar } from "@/layout/app-sidebar";
import { NavTitle } from "@/layout/nav-title";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/stores/theme.store";

export default function MainLayout() {
   const { user } = useAuth();
   const toggleTheme = useThemeStore(s => s.toggleTheme);
   const { pathname } = useLocation();
   const canvasRef = useRef<HTMLDivElement>(null);

   // Reposionar o scroll após a mudança de rota.
   useEffect(() => {
      canvasRef.current?.scrollTo({ top: 0 });
   }, [pathname]);

   return (
      <SidebarProvider className="h-svh overflow-hidden">
         <AppSidebar />

         <SidebarInset className="overflow-hidden bg-canvas text-canvas-foreground md:border md:border-border md:peer-data-[variant=inset]:shadow-elevated">
            <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-5">
               <SidebarTrigger
                  aria-label="Abrir ou recolher menu"
                  className="-ml-1 cursor-pointer text-muted-foreground hover:text-foreground"
               />
               <div className="h-5 w-px bg-border" aria-hidden />
               <NavTitle />
               <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  aria-label="Alternar tema claro e escuro"
                  title="Alternar tema claro e escuro"
                  className="ml-auto size-8 shrink-0 text-primary"
               >
                  <SunMoon className="size-4" aria-hidden />
               </Button>
               <div className="hidden flex-col items-end text-muted-foreground sm:flex">
                  <div className="flex items-center gap-1 text-xs">
                     <User className="h-3 w-3" />
                     <span>{user?.nome}</span>
                  </div>
                  {user?.setor ? (
                     <div className="flex items-center gap-1 text-[0.65rem] leading-tight">
                        <Building2 className="h-2.5 w-2.5" />
                        <span>{user.setor}</span>
                     </div>
                  ) : null}
               </div>
            </header>

            <div ref={canvasRef} className="flex-1 overflow-y-auto overscroll-contain">
               <div id="main" tabIndex={-1} className="px-4 pb-12 pt-8 sm:px-7 lg:px-9">
                  <motion.div
                     key={pathname}
                     initial={{ opacity: 0.95, y: 4 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ duration: 0.14, ease: "easeOut" }}
                     className="mx-auto"
                  >
                     <RouteBoundary>
                        <Suspense
                           fallback={
                              <div role="status" className="route-skeleton">
                                 <span className="sr-only">Carregando página</span>
                                 <div />
                                 <div />
                                 <div />
                              </div>
                           }
                        >
                           <Outlet />
                        </Suspense>
                     </RouteBoundary>
                  </motion.div>
               </div>
            </div>
         </SidebarInset>
      </SidebarProvider>
   );
}
