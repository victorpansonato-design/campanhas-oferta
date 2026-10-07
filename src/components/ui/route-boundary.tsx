import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export class RouteBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
   state = { failed: false };
   static getDerivedStateFromError() { return { failed: true }; }
   render() {
      return this.state.failed ? <EmptyState tone="error" title="Não foi possível abrir esta tela" hint="Atualize a página para tentar novamente." actions={<Button onClick={() => window.location.reload()}>Atualizar página</Button>} /> : this.props.children;
   }
}
