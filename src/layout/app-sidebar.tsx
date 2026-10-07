import { BookOpen, Megaphone, ListChecks, GraduationCap, Settings2, RotateCcw } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarNavigationItem } from "@/layout/sidebar/sidebar-navigation-item";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, useSidebar } from "@/components/ui/sidebar";
import { SystemLogo } from "@/layout/system-logo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { currentPersona, personas, useSession } from "@/stores/session.store";
import { repository } from "@/services/repositories";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useThemeStore } from "@/stores/theme.store";
const items = [
   { to: "/catalogo", label: "Catálogo", icon: BookOpen },
   { to: "/campanhas", label: "Campanhas", icon: Megaphone },
   { to: "/aprovacoes", label: "Aprovações", icon: ListChecks },
   { to: "/sem-formacao", label: "Não formação de turma", icon: GraduationCap },
];
export function AppSidebar() {
   const theme = useThemeStore(s => s.theme),
      setTheme = useThemeStore(s => s.setTheme),
      navigate = useNavigate();
   const { setOpenMobile, state, isMobile } = useSidebar();
   const { pathname } = useLocation();
   const id = useSession(s => s.personaId),
      setPersona = useSession(s => s.setPersona),
      persona = currentPersona(id);
   const [preferences, setPreferences] = useState(false),
      [confirm, setConfirm] = useState(false),
      [busy, setBusy] = useState(false);
   const client = useQueryClient();
   return (
      <>
         <Sidebar variant="inset" collapsible="icon" role="complementary" aria-label="Espaço de trabalho">
            <SidebarHeader>
               <SystemLogo />
            </SidebarHeader>
            <SidebarContent>
               <div className="sidebar-section group-data-[collapsible=icon]:hidden">ESPAÇO DE TRABALHO</div>
               <nav aria-label="Principal">
                  <SidebarMenu className="px-2">
                     {items.map(item => (
                        <SidebarNavigationItem
                           key={item.to}
                           path={item.to}
                           label={item.label}
                           icon={item.icon}
                           active={pathname.startsWith(item.to)}
                           collapsed={state === "collapsed" && !isMobile}
                           isMobile={isMobile}
                           onNavigate={() => setOpenMobile(false)}
                        />
                     ))}
                  </SidebarMenu>
               </nav>
               <div className="sidebar-note group-data-[collapsible=icon]:hidden">
                  <span className="yellow-rule" />
                  <p>
                     Uma condição clara.
                     <br />
                     Uma oferta preservada.
                  </p>
                  <small>Planejamento de ingresso · 2027</small>
               </div>
            </SidebarContent>
            <SidebarFooter className="border-t border-sidebar-border p-3">
               <div className="flex items-center gap-2">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                     {persona.nome
                        .split(" ")
                        .filter(n => n !== "Exemplo")
                        .map(n => n[0])
                        .slice(0, 2)
                        .join("")}
                  </span>
                  {state !== "collapsed" && (
                     <label className="min-w-0 flex-1">
                        <span className="sr-only">Perfil de acesso</span>
                        <select
                           aria-label="Perfil de acesso"
                           value={id}
                           onChange={e => setPersona(e.target.value)}
                           className="persona-select"
                        >
                           {personas.map(p => (
                              <option key={p.id} value={p.id}>
                                 {p.nome.replace(" Exemplo", "")}
                              </option>
                           ))}
                        </select>
                        <span className="text-[11px] text-muted-foreground">
                           {persona.perfil === "aprovadora" ? "Gestora responsável" : "Gestora proponente"}
                        </span>
                     </label>
                  )}
               </div>
               <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreferences(true)}
                  aria-label="Preferências"
                  className="justify-start gap-2"
               >
                  <Settings2 aria-hidden className="size-4" />
                  {state !== "collapsed" && "Preferências"}
               </Button>
            </SidebarFooter>
         </Sidebar>
         <Dialog
            open={preferences}
            onOpenChange={v => {
               setPreferences(v);
               setConfirm(false);
            }}
         >
            <DialogContent>
               <DialogHeader>
                  <DialogTitle>Preferências</DialogTitle>
                  <DialogDescription>Ajuste a aparência e gerencie os dados do sistema.</DialogDescription>
               </DialogHeader>
               {confirm ? (
                  <>
                     <p>
                        Restaurar campanhas, decisões e registros aos valores iniciais? As alterações feitas neste navegador serão
                        removidas.
                     </p>
                     <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirm(false)}>
                           Cancelar
                        </Button>
                        <Button
                           disabled={busy}
                           onClick={async () => {
                              setBusy(true);
                              await repository.reset();
                              navigate("/catalogo");
                              await client.invalidateQueries({ queryKey: ["demo"] });
                              setBusy(false);
                              setPreferences(false);
                              setConfirm(false);
                              toast.success("Dados restaurados");
                           }}
                        >
                           Confirmar restauração
                        </Button>
                     </DialogFooter>
                  </>
               ) : (
                  <>
                     <fieldset className="flex flex-wrap gap-4">
                        <legend className="mb-3 text-sm">Aparência</legend>
                        {(["light", "dark", "system"] as const).map(t => (
                           <label className="check-label" key={t}>
                              <input type="radio" name="appearance" checked={theme === t} onChange={() => setTheme(t)} />
                              {t === "light" ? "Clara" : t === "dark" ? "Escura" : "Sistema"}
                           </label>
                        ))}
                     </fieldset>
                     <Button variant="outline" className="gap-2" onClick={() => setConfirm(true)}>
                        <RotateCcw className="size-4" />
                        Restaurar dados
                     </Button>
                  </>
               )}
            </DialogContent>
         </Dialog>
      </>
   );
}
