import { useSearchParams } from "react-router-dom";
export function useFilters() {
   const [params, setParams] = useSearchParams();
   const get = (key: string, fallback = "") => params.get(key) ?? fallback;
   const set = (changes: Record<string, string>) =>
      setParams(
         old => {
            const next = new URLSearchParams(old);
            for (const [key, value] of Object.entries(changes)) {
               if (value) next.set(key, value);
               else next.delete(key);
            }
            return next;
         },
         { replace: true },
      );
   return { params, get, set, clear: () => setParams({}, { replace: true }) };
}
