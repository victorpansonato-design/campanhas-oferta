import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonthlySchedule } from "@/components/shared";
import { initialData } from "@/services/repositories";

const data = await initialData();
const revision = structuredClone(data.campanhas[0].revisoes[0]);

describe("leitura das mensalidades", () => {
   it("identifica o retorno à bolsa padrão mesmo quando o valor coincide com a campanha", () => {
      render(
         <MonthlySchedule
            revision={{
               ...revision,
               regras: [
                  { inicio: "2027-01", fim: "2027-01", tipo: "fixo", valorCentavos: 89822 },
                  { inicio: "2027-02", fim: "2027-06", tipo: "padrao" },
               ],
            }}
            standard={89822}
         />,
      );
      expect(document.querySelector(".payment-periods")!.children).toHaveLength(2);
      expect(screen.getByText("5 mensalidades · Bolsa comercial padrão")).toBeInTheDocument();
   });
   it("separa o mês isento dos meses pagos, informa o total e conserva o detalhamento mensal", () => {
      render(<MonthlySchedule revision={revision} />);
      const periods = document.querySelector(".payment-periods")!;
      expect(periods.children).toHaveLength(2);
      expect(within(periods as HTMLElement).getByText("1 mensalidade · Isento")).toBeInTheDocument();
      expect(within(periods as HTMLElement).getByText("5 mensalidades")).toBeInTheDocument();
      expect(screen.getByText("R$ 2.995,00")).toBeInTheDocument();
      expect(screen.getByText("Ver mês a mês")).toBeInTheDocument();
      expect(document.querySelector(".payment-months")!.children).toHaveLength(6);
   });
   it("não junta períodos separados com o mesmo preço e não trata valor ausente como isenção", () => {
      const modified = {
         ...revision,
         regras: [
            { inicio: "2027-01", fim: "2027-02", tipo: "fixo" as const, valorCentavos: 59900 },
            { inicio: "2027-04", fim: "2027-06", tipo: "fixo" as const, valorCentavos: 59900 },
         ],
      };
      render(<MonthlySchedule revision={modified} />);
      const periods = document.querySelector(".payment-periods")!;
      expect(periods.children).toHaveLength(3);
      expect(within(periods as HTMLElement).getByText("Não definido")).toBeInTheDocument();
      expect(within(periods as HTMLElement).queryByText("Sem cobrança")).not.toBeInTheDocument();
      expect(screen.getByText("Total parcial definido")).toBeInTheDocument();
   });
});
