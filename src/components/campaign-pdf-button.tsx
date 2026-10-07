import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { currentPersona, useSession } from "@/stores/session.store";
import type { Campanha, DemoData, Revisao } from "@/types/domain";

export function CampaignPdfButton({ campaign, revision, data }: { campaign: Campanha; revision: Revisao; data: DemoData }) {
   const [busy, setBusy] = useState(false);
   const personaId = useSession(s => s.personaId);
   return (
      <Button
         variant="outline"
         disabled={busy}
         aria-label={`Exportar PDF: ${campaign.nome}, revisão ${revision.numero}`}
         onClick={async () => {
            setBusy(true);
            try {
               const { exportCampaign } = await import("@/lib/exports");
               await exportCampaign({ campaign, revision, data, geradoPor: currentPersona(personaId).nome });
               toast.success("PDF da campanha exportado");
            } catch (error) {
               toast.error((error as Error).message);
            } finally {
               setBusy(false);
            }
         }}
      >
         {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
         {busy ? "Exportando…" : "Exportar PDF"}
      </Button>
   );
}
