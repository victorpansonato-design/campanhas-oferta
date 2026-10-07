import { Link, useNavigate } from "react-router-dom";
import { Copy, Archive, ArrowUpRight } from "lucide-react";
import { PageHeading, NewCampaign, DataBoundary, SearchField, SelectField, Status } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useDemo, useAction } from "@/hooks/use-demo";
import { useFilters } from "@/hooks/use-filters";
import { useSession, currentPersona } from "@/stores/session.store";
import { repository } from "@/services/repositories";
import { campaignSummary, dateLabel, lastRevision, modalidades } from "@/lib/domain";
import { campaignView } from "@/lib/campaign-view";
import type { DemoData } from "@/types/domain";
import { toast } from "sonner";
export default function Campanhas() {
   const query = useDemo();
   return (
      <>
         <PageHeading title="Campanhas" description="Propostas, condições aprovadas e o histórico de cada oferta.">
            <NewCampaign />
         </PageHeading>
         <DataBoundary query={query}>{data => <CampaignList data={data} />}</DataBoundary>
      </>
   );
}
function CampaignList({ data }: { data: DemoData }) {
   const f = useFilters(),
      action = useAction(),
      personaId = useSession(s => s.personaId),
      persona = currentPersona(personaId),
      navigate = useNavigate();
   const list = campaignView(data, f.params);
   return (
      <>
         <div className="list-filters">
            <SearchField
               label="Pesquisar pelo nome do curso"
               value={f.get("q")}
               onChange={q => f.set({ q })}
               placeholder="Buscar nome do curso…"
            />
            <SelectField
               label="Modalidade"
               value={f.get("modalidade")}
               onChange={modalidade => f.set({ modalidade })}
               options={[{ value: "", label: "Todas as modalidades" }, ...modalidades]}
            />
            <SelectField
               label="Estado"
               value={f.get("estado", "aprovada")}
               onChange={estado => f.set({ estado })}
               options={[
                  { value: "todos", label: "Todos os estados" },
                  { value: "em-aprovacao", label: "Em aprovação" },
                  { value: "aprovada", label: "Aprovada" },
                  { value: "ajustes-solicitados", label: "Ajustes solicitados" },
                  { value: "arquivada", label: "Arquivada" },
               ]}
            />
            <SelectField
               label="Ano de ingresso"
               value={f.get("ano")}
               onChange={ano => f.set({ ano })}
               options={[{ value: "", label: "Todos os anos" }, ...Array.from({ length: 8 }, (_, i) => String(2025 + i))]}
            />
            <Button variant="ghost" onClick={f.clear}>
               Limpar filtros
            </Button>
         </div>
         <p className="result-count">{list.length} campanhas</p>
         {!list.length ? (
            <EmptyState title="Nenhuma campanha encontrada" actions={<Button onClick={f.clear}>Limpar filtros</Button>} />
         ) : (
            <div className="campaign-list">
               {list.map(({ campaign: c, revision: r }) => {
                  const own = c.criadaPor === personaId;
                  return (
                     <article className="campaign-row" key={c.id}>
                        <div className="campaign-row-icon">
                           <span>{r.numero.toString().padStart(2, "0")}</span>
                           <small>REV.</small>
                        </div>
                        <div className="min-w-0 flex-1">
                           <div className="flex flex-wrap items-center gap-3">
                              <h2>
                                 <Link to={`/campanhas/${c.id}?revisao=${r.numero}`}>{c.nome}</Link>
                              </h2>
                              <Status value={c.arquivadaEm ? "Arquivada" : r.estado} />
                           </div>
                           <p className="campaign-summary">{campaignSummary(r)}</p>
                           <p className="campaign-meta">
                              {r.elegibilidade.entradasCodigos.join(", ") || "Entrada não definida"} · {r.contextosIds.length} contextos ·{" "}
                              {data.personas.find(p => p.id === c.criadaPor)?.nome.replace(" Exemplo", "")} · {dateLabel(c.criadaEm)}
                           </p>
                        </div>
                        <div className="row-actions">
                           <Link className="detail-link" to={`/campanhas/${c.id}?revisao=${r.numero}`}>
                              Abrir
                              <ArrowUpRight className="size-4" />
                           </Link>
                           {persona.perfil === "proponente" && (
                              <Button
                                 size="icon"
                                 variant="ghost"
                                 aria-label={`Duplicar ${c.nome}`}
                                 disabled={action.isPending}
                                 onClick={() => navigate(`/campanhas/nova?copiar=${c.id}`)}
                              >
                                 <Copy className="size-4" />
                              </Button>
                           )}
                           {own && !c.arquivadaEm && lastRevision(c).estado !== "em-aprovacao" && (
                              <Button
                                 size="icon"
                                 variant="ghost"
                                 aria-label={`Arquivar ${c.nome}`}
                                 disabled={action.isPending}
                                 onClick={() =>
                                    action.mutate(async () => {
                                       await repository.archive(c.id, personaId);
                                       toast.success("Campanha arquivada; histórico preservado");
                                    })
                                 }
                              >
                                 <Archive className="size-4" />
                              </Button>
                           )}
                        </div>
                     </article>
                  );
               })}
            </div>
         )}
      </>
   );
}
