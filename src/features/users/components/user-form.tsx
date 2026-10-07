/**
 * FEATURE EXEMPLO (`users`).
 *
 * FORM STATE - React Hook Form + Zod. O MESMO schema (`CreateUserSchema`) é a
 * fonte da validação (`zodResolver`) e do tipo do submit (`z.infer`). Os
 * `defaultValues` derivam do contrato. A chamada de escrita vai para a mutation
 * (`useCreateUser`), nunca para um `fetch` solto no componente.
 */
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useCreateUser } from "@/features/users/api/user.mutations";
import { CreateUserSchema, type CreateUserInput } from "@/features/users/types/user.schema";
import { handleApiError } from "@/services/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface UserFormProps {
   /** Chamado após a criação bem-sucedida (ex.: fechar o modal). */
   onSuccess?: () => void;
}

export function UserForm({ onSuccess }: UserFormProps) {
   const createUser = useCreateUser();

   const form = useForm<CreateUserInput>({
      resolver: zodResolver(CreateUserSchema),
      defaultValues: { nome: "", email: "" },
   });

   function onSubmit(values: CreateUserInput) {
      createUser.mutate(values, {
         onSuccess: () => {
            toast.success("Usuário criado");
            form.reset();
            onSuccess?.();
         },
         onError: error => handleApiError({ error, title: "Erro ao criar usuário" }),
      });
   }

   return (
      <Form {...form}>
         <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
               control={form.control}
               name="nome"
               render={({ field }) => (
                  <FormItem>
                     <FormLabel>Nome</FormLabel>
                     <FormControl>
                        <Input placeholder="Maria Silva" {...field} />
                     </FormControl>
                     <FormMessage />
                  </FormItem>
               )}
            />
            <FormField
               control={form.control}
               name="email"
               render={({ field }) => (
                  <FormItem>
                     <FormLabel>E-mail</FormLabel>
                     <FormControl>
                        <Input type="email" placeholder="maria@anchieta.br" {...field} />
                     </FormControl>
                     <FormMessage />
                  </FormItem>
               )}
            />
            <Button type="submit" disabled={createUser.isPending} className="justify-self-end">
               {createUser.isPending ? "Salvando..." : "Criar usuário"}
            </Button>
         </form>
      </Form>
   );
}
