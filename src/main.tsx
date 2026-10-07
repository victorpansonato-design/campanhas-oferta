import { AuthProvider } from "@/contexts/auth/auth-context";
import { QueryProvider } from "@/providers/query-provider";
import AppRoute from "@/routes/app.routes";
import "@/stores/theme.store";
import { LazyMotion, MotionConfig } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./app.css";
import { Toaster } from "sonner";

const loadMotion = () => import("@/lib/motion-features").then(m => m.default);
createRoot(document.getElementById("root")!).render(
   <StrictMode>
      <MotionConfig reducedMotion="user">
         <LazyMotion features={loadMotion} strict>
            <QueryProvider>
               <AuthProvider>
                  <AppRoute />
                  <Toaster richColors position="bottom-right" />
               </AuthProvider>
            </QueryProvider>
         </LazyMotion>
      </MotionConfig>
   </StrictMode>,
);
