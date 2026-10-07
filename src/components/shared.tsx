import { useId, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, LoaderCircle, Plus, Search } from "lucide-react";
import { useDemo } from "@/hooks/use-demo";
import { AsyncState } from "@/components/ui/async-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Callout } from "@/components/ui/callout";
import { preloadRoute } from "@/lib/route-prefetch";
import { cn } from "@/lib/utils";
import sources from "@/lib/image-sources.json";
import { campaignSummary, cronograma, cursos, monthLabel, money } from "@/lib/domain";
import type { DemoData, Revisao } from "@/types/domain";

export function PageHeading({
   title,
   description,
   children,
   back,
}: {
   title: string;
   description?: string;
   children?: ReactNode;
   back?: { to: string; label: string };
}) {
   return (
      <div className="page-heading">
         {back && (
            <Link className="back-link" to={back.to}>
               <ArrowLeft className="size-3.5" aria-hidden />
               {back.label}
            </Link>
         )}
         <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
               <h1>{title}</h1>
               {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
            </div>
            <div className="flex flex-wrap gap-2">{children}</div>
         </div>
      </div>
   );
}
export function NewCampaign({ courseId, search = "" }: { courseId?: string; search?: string }) {
   return (
      <Link
         onPointerEnter={() => preloadRoute("/campanhas/nova")}
         onFocus={() => preloadRoute("/campanhas/nova")}
         className={cn(buttonVariants(), "gap-2")}
         to={`/campanhas/nova${courseId ? `?curso=${courseId}${search}` : ""}`}
      >
         <Plus className="size-4" aria-hidden />
         Nova campanha
      </Link>
   );
}
export function DataBoundary({ query, children }: { query: ReturnType<typeof useDemo>; children: (data: DemoData) => ReactNode }) {
   return (
      <AsyncState
         isLoading={query.isLoading}
         isError={query.isError && !query.data}
         loading={
            <div role="status" className="flex flex-col gap-4">
               <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" />
                  Carregando…
               </p>
               <Skeleton className="h-24 w-full" />
               <Skeleton className="h-64 w-full" />
            </div>
         }
         error={
            <EmptyState
               tone="error"
               title="Não foi possível carregar"
               hint={query.error?.message}
               actions={<Button onClick={() => void query.refetch()}>Tentar novamente</Button>}
            />
         }
      >
         {query.data && query.isError && (
            <Callout tone="warning" role="alert">
               Não foi possível atualizar os dados. A última versão permanece disponível.
               <Button variant="link" onClick={() => void query.refetch()}>
                  Tentar novamente
               </Button>
            </Callout>
         )}
         {query.data ? children(query.data) : null}
      </AsyncState>
   );
}
export function SelectField({
   label,
   value,
   onChange,
   options,
   className,
   disabled,
}: {
   label: string;
   value: string;
   onChange: (value: string) => void;
   options: (string | { value: string; label: string })[];
   className?: string;
   disabled?: boolean;
}) {
   const id = useId();
   return (
      <div className={cn("field", className)}>
         <label htmlFor={id}>{label}</label>
         <select id={id} value={value} onChange={e => onChange(e.target.value)} disabled={disabled}>
            {options.map(o => {
               const option = typeof o === "string" ? { label: o, value: o } : o;
               return (
                  <option value={option.value} key={option.value}>
                     {option.label}
                  </option>
               );
            })}
         </select>
      </div>
   );
}
export function SearchField({
   label = "Pesquisar",
   value,
   onChange,
   placeholder,
}: {
   label?: string;
   value: string;
   onChange: (value: string) => void;
   placeholder?: string;
}) {
   const id = useId();
   return (
      <div className="search-field">
         <Search className="size-4" aria-hidden />
         <label htmlFor={id} className="sr-only">
            {label}
         </label>
         <input id={id} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
         {value && (
            <button type="button" aria-label="Limpar pesquisa" onClick={() => onChange("")}>
               ×
            </button>
         )}
      </div>
   );
}
const statuses: Record<string, string> = {
   "em-aprovacao": "Em aprovação",
   "ajustes-solicitados": "Ajustes solicitados",
   aprovada: "Aprovada",
   "nao-formou": "Não formou turma",
   revertido: "Registro revertido",
};
export function Status({ value }: { value: string }) {
   return (
      <Badge
         variant="outline"
         className={cn(
            "status-badge",
            value === "aprovada" && "approved",
            value === "em-aprovacao" && "pending",
            value === "nao-formou" && "unavailable",
         )}
      >
         {statuses[value] ?? value}
      </Badge>
   );
}
export function CourseImage({
   id,
   gray = false,
   className,
   priority = false,
}: {
   id: string;
   gray?: boolean;
   className?: string;
   priority?: boolean;
}) {
   const [failed, setFailed] = useState(false);
   const source = (sources as Record<string, { imagem: string; srcSet: string; largura: number; altura: number }>)[id];
   return (
      <div className={cn("course-image", gray && "is-gray", className)}>
         {failed || !source ? (
            <div className="image-fallback">
               <BookOpen aria-hidden />
               <span>Grupo Anchieta</span>
            </div>
         ) : (
            <picture>
               <source
                  media="(max-width: 640px)"
                  srcSet={source.srcSet
                     .split(", ")
                     .filter(candidate => Number.parseInt(candidate.split(" ").at(-1)!, 10) <= 640)
                     .join(", ")}
                  sizes="calc(100vw - 32px)"
               />
               <img
                  src={source.imagem}
                  srcSet={source.srcSet}
                  sizes={
                     className?.includes("hero")
                        ? "(max-width: 768px) 100vw, 65vw"
                        : "(max-width: 640px) calc(100vw - 32px), (max-width: 1024px) 45vw, 30vw"
                  }
                  width={source.largura}
                  height={source.altura}
                  decoding="async"
                  fetchPriority={priority ? "high" : "auto"}
                  alt={`Imagem oficial de ${cursos.find(c => c.id === id)?.nome}`}
                  onError={() => setFailed(true)}
                  loading={priority ? "eager" : "lazy"}
               />
            </picture>
         )}
      </div>
   );
}
export function MonthlySchedule({
   revision,
   base,
   standard,
   compact = false,
}: {
   revision: Revisao;
   base?: number;
   standard?: number;
   compact?: boolean;
}) {
   let installments: ReturnType<typeof cronograma> = [];
   let error = "";
   try {
      installments = cronograma(revision.horizonteCobranca, revision.regras, base, standard);
   } catch (err) {
      error = (err as Error).message;
   }
   if (error) return <Callout tone="danger">{error}</Callout>;
   const total = installments.reduce((sum, p) => sum + (p.valorCentavos ?? 0), 0);
   const periods: Array<{ start: string; end: string; value: number | null; state: string; count: number }> = [];
   for (const p of installments) {
      const previous = periods.at(-1);
      if (previous && previous.value === p.valorCentavos && previous.state === p.estado) {
         previous.end = p.competencia;
         previous.count += 1;
      } else periods.push({ start: p.competencia, end: p.competencia, value: p.valorCentavos, state: p.estado, count: 1 });
   }
   return (
      <div className={cn("payment-schedule", compact && "compact")}>
         <dl className="payment-periods">
            {periods.map(p => (
               <div key={p.start} className={cn("payment-period", p.state === "isento" && "exempt")}>
                  <dt>
                     <ArrowRight className="payment-arrow" aria-hidden />
                     <span>
                        {monthLabel(p.start)}
                        {p.start !== p.end && ` a ${monthLabel(p.end)}`}
                     </span>
                     <small>
                        {p.count} {p.count === 1 ? "mensalidade" : "mensalidades"}
                        {p.state === "isento" ? " · Isento" : ""}
                        {p.state === "padrao" ? " · Bolsa comercial padrão" : ""}
                     </small>
                  </dt>
                  <dd>
                     <strong>{money(p.value)}</strong>
                     {p.value !== null && <span>{p.state === "isento" ? "Sem cobrança" : "por mês"}</span>}
                  </dd>
               </div>
            ))}
         </dl>
         <div className="payment-total">
            <span>Total {installments.some(p => p.valorCentavos === null) ? "parcial definido" : "do período"}</span>
            <strong>{money(installments.some(p => p.valorCentavos !== null) ? total : null)}</strong>
         </div>
         <details className="payment-details">
            <summary>Ver mês a mês</summary>
            <dl className="payment-months">
               {installments.map(p => (
                  <div key={p.competencia}>
                     <dt>
                        {monthLabel(p.competencia)}
                        {p.estado === "isento" && <span> · Isento</span>}
                        {p.estado === "padrao" && <span> · Bolsa comercial padrão</span>}
                     </dt>
                     <dd>{money(p.valorCentavos)}</dd>
                  </div>
               ))}
            </dl>
            <p className="text-xs leading-relaxed text-muted-foreground">
               Após {monthLabel(revision.horizonteCobranca.fim)}: condições não definidas nesta campanha.
            </p>
         </details>
      </div>
   );
}
export function OfferText({ revision }: { revision: Revisao }) {
   return <p className="offer-text">{campaignSummary(revision)}.</p>;
}
export function DetailLink({ to, children }: { to: string; children: ReactNode }) {
   return (
      <Link to={to} className="detail-link">
         {children}
         <ArrowUpRight className="size-4" aria-hidden />
      </Link>
   );
}
