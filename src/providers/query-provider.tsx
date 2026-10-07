import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { subscribeRepository } from "@/services/repositories";
export function QueryProvider({ children }: { children: ReactNode }) {
   const [client] = useState(
      () => new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false }, mutations: { retry: false } } }),
   );
   useEffect(
      () =>
         subscribeRepository(() => {
            void client.invalidateQueries({ queryKey: ["demo"] });
         }),
      [client],
   );
   return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
