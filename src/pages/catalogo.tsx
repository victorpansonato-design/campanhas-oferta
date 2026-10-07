import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LayoutGrid, List, SlidersHorizontal, X } from "lucide-react";
import { PageHeading, NewCampaign, DataBoundary, SelectField, SearchField, CourseImage, Status } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useDemo } from "@/hooks/use-demo";
import { useFilters } from "@/hooks/use-filters";
import { cursos, gerarEntradas, modalidades } from "@/lib/domain";
import { catalogView } from "@/lib/catalog-view";
import { preloadRoute } from "@/routes/loaders";
import { m as motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { DemoData } from "@/types/domain";

export default function Catalogo() {
   const filters = useFilters(),
      ano = Number(filters.get("ano", "2027")),
      query = useDemo(ano);
   return (
      <>
         <PageHeading title="Catálogo de cursos" description="Consulte ofertas e organize as próximas entradas.">
            <NewCampaign />
         </PageHeading>
         <DataBoundary query={query}>{data => <CatalogContent data={data} />}</DataBoundary>
      </>
   );
}
function CatalogContent({ data }: { data: DemoData }) {
   const f = useFilters(),
      ano = Number(f.get("ano", "2027")),
      mode = f.get("modalidade"),
      search = f.get("q"),
      entry = f.get("entrada");
   const [extra, setExtra] = useState(false);
   const filterKey = f.params.toString();
   const { rows: courseRows, results } = useMemo(() => catalogView(data, new URLSearchParams(filterKey)), [data, filterKey]);
   const offerMatches = (id: string) => courseRows.get(id)!.offers;
   const scopedContexts = (id: string) => courseRows.get(id)!.contexts;
   const campaignCount = (id: string) => courseRows.get(id)!.campaigns;
   const unavailable = (id: string) => courseRows.get(id)!.unavailable;
   const page = Math.min(Number(f.get("pagina", "1")) || 1, Math.max(1, Math.ceil(results.length / 12))),
      view = f.get("visualizacao", "grade");
   const change = (changes: Record<string, string>) => f.set({ ...changes, pagina: "" });
   const entries = mode ? gerarEntradas(ano, mode) : modalidades.flatMap(m => gerarEntradas(ano, m));
   const active = [...f.params.entries()].filter(([k]) => !["ano", "pagina", "visualizacao"].includes(k));
   return (
      <>
         <section className="catalog-controls" aria-label="Filtros do catálogo">
            <div className="search-row">
               <SearchField
                  label="Buscar cursos"
                  value={search}
                  onChange={q => change({ q })}
                  placeholder="Busque um curso, modalidade ou área de interesse…"
               />
               <SelectField
                  label="Ano de ingresso"
                  value={String(ano)}
                  onChange={ano => change({ ano, entrada: "" })}
                  options={Array.from({ length: 8 }, (_, i) => String(2025 + i))}
               />
               <SelectField
                  label="Entrada"
                  value={entry}
                  onChange={entrada => change({ entrada })}
                  options={[
                     { value: "", label: "Todas as entradas" },
                     ...entries.map(e => ({ value: e.codigo, label: `${e.codigo} · ${e.modalidade}` })),
                  ]}
               />
            </div>
            <div className="filter-bottom">
               <div className="modality-tabs" aria-label="Modalidade">
                  {["", ...modalidades].map(m => (
                     <button key={m} aria-pressed={mode === m} onClick={() => change({ modalidade: m, entrada: "", formato: "" })}>
                        {mode === m && (
                           <motion.span className="tab-indicator" layoutId="catalog-modality" transition={{ duration: 0.16 }} aria-hidden />
                        )}
                        <strong>{m || "Todos"}</strong>
                        <span>{cursos.filter(c => !m || c.modalidades.includes(m)).length}</span>
                     </button>
                  ))}
               </div>
               <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  aria-expanded={extra}
                  aria-controls="advanced-filters"
                  onClick={() => setExtra(!extra)}
               >
                  <SlidersHorizontal className="size-3.5" />
                  Filtros{active.length > 1 && <span>({active.length})</span>}
               </Button>
            </div>
            {extra && (
               <div id="advanced-filters" className="advanced-filters">
                  <SelectField
                     label="Formato"
                     value={f.get("formato")}
                     onChange={formato => change({ formato })}
                     options={[
                        { value: "", label: "Todos os formatos" },
                        ...(mode === "Híbrido"
                           ? ["Semipresencial", "Presencial Intensivo"]
                           : mode
                             ? [mode]
                             : ["Presencial", "Semipresencial", "Presencial Intensivo", "EAD"]),
                     ]}
                  />
                  <SelectField
                     label="Diploma"
                     value={f.get("diploma")}
                     onChange={diploma => change({ diploma })}
                     options={[{ value: "", label: "Todos os diplomas" }, ...new Set(cursos.map(c => c.diploma))]}
                  />
                  <SelectField
                     label="Turno"
                     value={f.get("turno")}
                     onChange={turno => change({ turno })}
                     options={[
                        { value: "", label: "Todos os turnos" },
                        ...new Set(data.contextos.map(c => c.turno)),
                        { value: "desconhecido", label: "Turno não cadastrado" },
                     ]}
                  />
                  <SelectField
                     label="Campanha"
                     value={f.get("campanha")}
                     onChange={campanha => change({ campanha })}
                     options={[
                        { value: "", label: "Todas as ofertas" },
                        { value: "com", label: "Com campanha aprovada" },
                        { value: "sem", label: "Sem campanha aprovada" },
                     ]}
                  />
                  <label className="check-label">
                     <input type="checkbox" checked={!!f.get("novo")} onChange={e => change({ novo: e.target.checked ? "1" : "" })} />
                     Somente cursos novos
                  </label>
                  <label className="check-label">
                     <input
                        type="checkbox"
                        checked={f.get("formacao") === "incluir"}
                        onChange={e => change({ formacao: e.target.checked ? "incluir" : "" })}
                     />
                     Incluir sem formação
                  </label>
               </div>
            )}
         </section>
         {active.length > 0 && (
            <div className="filter-chips">
               {active.map(([k, v]) => (
                  <button key={k} onClick={() => change({ [k]: "", ...(k === "modalidade" ? { entrada: "", formato: "" } : {}) })}>
                     {k === "novo" ? "Cursos novos" : k === "formacao" ? "Incluindo sem formação" : v}
                     <X className="size-3" aria-hidden />
                     <span className="sr-only">Remover filtro</span>
                  </button>
               ))}
               <Button variant="link" size="sm" onClick={f.clear}>
                  Limpar filtros
               </Button>
            </div>
         )}
         <div className="result-toolbar">
            <p>
               <strong>{results.length}</strong> cursos{" "}
               <span>
                  · {results.reduce((n, c) => n + offerMatches(c.id).length, 0)} ofertas · ingresso {ano}
               </span>
            </p>
            <div className="view-picker">
               <Button
                  size="icon"
                  variant={view === "grade" ? "secondary" : "ghost"}
                  aria-label="Visualizar em grade"
                  aria-pressed={view === "grade"}
                  onClick={() => f.set({ visualizacao: "grade" })}
               >
                  <LayoutGrid className="size-4" />
               </Button>
               <Button
                  size="icon"
                  variant={view === "lista" ? "secondary" : "ghost"}
                  aria-label="Visualizar em lista"
                  aria-pressed={view === "lista"}
                  onClick={() => f.set({ visualizacao: "lista" })}
               >
                  <List className="size-4" />
               </Button>
            </div>
         </div>
         {!results.length ? (
            <EmptyState
               title="Nenhum curso encontrado"
               hint="Experimente outro nome ou ajuste os filtros."
               actions={<Button onClick={f.clear}>Limpar filtros</Button>}
            />
         ) : (
            <div className={cn("course-grid", view === "lista" && "list-view")}>
               {results.slice((page - 1) * 12, page * 12).map((c, index) => {
                  const count = campaignCount(c.id),
                     gray = unavailable(c.id).length > 0 && unavailable(c.id).length === scopedContexts(c.id).length;
                  return (
                     <article className="course-card" key={c.id}>
                        <Link
                           onPointerEnter={() => preloadRoute(`/cursos/${c.id}`)}
                           to={`/cursos/${c.id}?ano=${ano}${entry ? `&entrada=${encodeURIComponent(entry)}` : ""}`}
                           tabIndex={-1}
                           aria-hidden
                        >
                           <CourseImage id={c.id} gray={gray} priority={index === 0} />
                        </Link>
                        <div className="course-card-body">
                           <div className="course-eyebrow">
                              <span>{c.diploma}</span>
                              {c.novo && (
                                 <Badge className="new-badge" variant="outline">
                                    Novo
                                 </Badge>
                              )}
                           </div>
                           <h2>
                              <Link to={`/cursos/${c.id}?ano=${ano}`}>{c.nome}</Link>
                           </h2>
                           <div className="course-formats">
                              {offerMatches(c.id).map(o => (
                                 <span key={o.id} title={o.formato}>
                                    {o.formato}
                                 </span>
                              ))}
                           </div>
                           <div className="course-commercial">
                              {gray ? (
                                 <Status value="nao-formou" />
                              ) : count ? (
                                 <>
                                    <span className="status-dot" />
                                    <span>
                                       {count} {count === 1 ? "campanha aprovada" : "campanhas aprovadas"}
                                    </span>
                                 </>
                              ) : (
                                 <>
                                    <span className="status-dot neutral" />
                                    <span>Sem campanha aprovada</span>
                                 </>
                              )}
                           </div>
                           <div className="course-card-footer">
                              <Link to={`/cursos/${c.id}?ano=${ano}${entry ? `&entrada=${encodeURIComponent(entry)}` : ""}`}>
                                 Consultar ofertas
                                 <ArrowRight className="size-4" aria-hidden />
                              </Link>
                              <Link to={`/campanhas/nova?curso=${c.id}&ano=${ano}`} aria-label={`Criar campanha para ${c.nome}`}>
                                 <span className="sr-only">Criar campanha</span>
                                 <span aria-hidden>+</span>
                              </Link>
                           </div>
                        </div>
                     </article>
                  );
               })}
            </div>
         )}
         {results.length > 12 && (
            <div className="pagination">
               <span>
                  {(page - 1) * 12 + 1}–{Math.min(page * 12, results.length)} de {results.length} cursos
               </span>
               <Button variant="outline" size="sm" disabled={page === 1} onClick={() => f.set({ pagina: String(page - 1) })}>
                  Anterior
               </Button>
               <span>
                  Página {page} de {Math.ceil(results.length / 12)}
               </span>
               <Button
                  variant="outline"
                  size="sm"
                  disabled={page * 12 >= results.length}
                  onClick={() => f.set({ pagina: String(page + 1) })}
               >
                  Próxima
               </Button>
            </div>
         )}
         <p className="data-footnote">Catálogo de cursos do Grupo Anchieta.</p>
      </>
   );
}
