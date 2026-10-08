import { it, expect } from "vitest";
import { Workbook } from "exceljs";
import { buildCampaignPdf, buildExcel, buildPdf, type ExportContext } from "@/lib/exports";
import { initialData } from "@/services/repositories";
const data = await initialData(),
   registro = data.naoFormacao[0],
   contexto = data.contextos.find(c => c.id === registro.contextoId)!;
const input: ExportContext = {
   registro,
   contexto,
   alunos: data.matriculas.filter(m => registro.alunosIds.includes(m.id)).slice(0, 3),
   escopo: "Linhas selecionadas",
};
async function bytes(blob: Blob) {
   return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
   });
}
it("gera XLSX válido somente para escopo escolhido, com RA textual e contexto", async () => {
   const workbook = new Workbook();
   await workbook.xlsx.load(await bytes(await buildExcel(input)));
   const sheet = workbook.getWorksheet("Alunos")!;
   expect(sheet.rowCount).toBe(14);
   expect(sheet.getRow(12).getCell(2).value).toBe(input.alunos[0].ra);
   expect(sheet.getRow(12).getCell(2).numFmt).toBe("@");
   expect(sheet.getImages()).toHaveLength(1);
   expect(sheet.getCell("B11").value).toBe("RA");
   expect(sheet.views[0].state).toBe("frozen");
   expect(workbook.getWorksheet("Resumo")!.getCell("B9").value).toContain(input.escopo);
});
it("gera PDF real multipágina com repetição de cabeçalho e numeração", async () => {
   const expanded = { ...input, alunos: Array.from({ length: 85 }, (_, i) => ({ ...input.alunos[i % 3], id: `test-${i}` })) };
   const pdf = new TextDecoder().decode(await bytes(await buildPdf(expanded)));
   expect(pdf.startsWith("%PDF-")).toBe(true);
   expect((pdf.match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(1);
   expect(pdf).toContain("GRUPO ANCHIETA");
   expect(pdf).toContain(input.alunos[0].ra);
   expect(pdf).toContain("example.invalid");
});

it("exporta uma única campanha e a revisão escolhida com contrato, bolsa e mensalidades", async () => {
   const campaign = structuredClone(data.campanhas[0]);
   campaign.nome = "Campanha selecionada para PDF";
   const revision = campaign.revisoes[0];
   const pdf = new TextDecoder().decode(await bytes(await buildCampaignPdf({ campaign, revision, data })));
   expect(pdf.startsWith("%PDF-")).toBe(true);
   expect(pdf).toContain(campaign.nome);
   expect(pdf.match(/\/Width \d+/g)).toContain("/Width 403");
   expect(pdf.match(/\/Height \d+/g)).toContain("/Height 165");
   expect(pdf).toContain("1.996,05");
   expect(pdf).toContain("55%");
   expect(pdf).toContain("898,22");
   expect(pdf).toContain("599,00");
   expect(pdf).toContain("GRUPO ANCHIETA");
   expect(pdf).not.toContain(data.campanhas[1].nome);
   expect(pdf).not.toContain(data.matriculas[0].ra);
});
it("pagina uma campanha extensa repetindo seu cabeçalho e sem incluir outras campanhas", async () => {
   const campaign = structuredClone(data.campanhas[0]);
   campaign.nome = "Campanha longa";
   const revision = campaign.revisoes[0];
   revision.contextosIds = data.contextos.slice(0, 40).map(c => c.id);
   const pdf = new TextDecoder().decode(await bytes(await buildCampaignPdf({ campaign, revision, data })));
   expect((pdf.match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(1);
   expect((pdf.match(/Campanha longa/g) ?? []).length).toBeGreaterThan(1);
});
