import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { repository } from "@/services/repositories";
import { toast } from "sonner";
export function useDemo(ano = 2027) {
   return useQuery({ queryKey: ["demo", ano], queryFn: () => repository.read(ano), retry: false, staleTime: Infinity });
}
export function useAction() {
   const client = useQueryClient();
   return useMutation({
      mutationFn: (action: () => Promise<unknown>) => action(),
      onSuccess: () => client.invalidateQueries({ queryKey: ["demo"] }),
      onError: error => toast.error(error.message),
   });
}
