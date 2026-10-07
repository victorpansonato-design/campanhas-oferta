/** Configuration shared by the demo. Institutional integrations remain disabled. */
export const env = {
   dataMode: "mock",
   baseUrl: import.meta.env.VITE_BASE_URL || "/",
   apiUrl: "",
   loginUrl: "",
   referenceDate: "2026-10-07",
   storageKey: "anchieta.campanhas.v1",
   isDev: import.meta.env.DEV,
} as const;
