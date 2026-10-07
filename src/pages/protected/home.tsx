import { BarChart3, FileText, Plus, Settings, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/hooks/use-auth";

const placeholderCards = [
   { title: "Usuários", value: "-", icon: Users, description: "Total de usuários", tone: "primary" as const, status: "Ativo" },
   {
      title: "Documentos",
      value: "-",
      icon: FileText,
      description: "Total de documentos",
      tone: "success" as const,
      status: "Sincronizado",
   },
   { title: "Relatórios", value: "-", icon: BarChart3, description: "Relatórios gerados", tone: "warning" as const, status: "Pendente" },
   { title: "Configurações", value: "-", icon: Settings, description: "Itens configuráveis", tone: "neutral" as const, status: "Em breve" },
];

export default function ProtectedHome() {
   const { user } = useAuth();

   return (
      <div className="space-y-8">
         <PageHeader
            eyebrow="Painel"
            title={`Bem-vindo, ${user?.nome ?? "usuário"}`}
            description="Base do design system Anchieta - use estes componentes como ponto de partida para o novo sistema."
            actions={
               <Button>
                  <Plus className="h-4 w-4" />
                  Nova ação
               </Button>
            }
         />

         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {placeholderCards.map(card => (
               <Card key={card.title}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                     <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                     <card.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                     <div className="font-display text-2xl">{card.value}</div>
                     <CardDescription>{card.description}</CardDescription>
                     <Badge tone={card.tone} size="sm" dot>
                        {card.status}
                     </Badge>
                  </CardContent>
               </Card>
            ))}
         </div>
      </div>
   );
}
