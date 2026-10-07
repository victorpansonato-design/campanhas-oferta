import { baseForRevision, cronograma, cursos, dateLabel, janela, monthLabel, money, ofertas, standardForRevision } from "@/lib/domain";
import { commercialPrice, standardMonthly } from "@/lib/commercial-pricing";
import type { Campanha, Contexto, DemoData, Formacao, Matricula, Revisao } from "@/types/domain";
import type { Refund, ServiceRecord } from "@/types/refunds";
import { refundLabels } from "@/lib/refunds";
import logo from "@/data/report-logo.json";

export interface ExportContext {
   contexto: Contexto;
   registro: Formacao;
   alunos: Matricula[];
   escopo: string;
   atendimentos?: ServiceRecord[];
   devolucoes?: Refund[];
   geradoPor?: string;
}
function details(input: ExportContext) {
   const offer = ofertas.find(o => o.id === input.contexto.ofertaId)!,
      course = cursos.find(c => c.id === offer.cursoId)!;
   const info = {
      Curso: course.nome,
      Modalidade: offer.modalidade,
      Formato: offer.formato,
      Turno: input.contexto.turno,
      Entrada: input.contexto.entradaCodigo,
   };
   const filename = `nao-formacao_${course.id}_${offer.formato.toLowerCase().replaceAll(" ", "-")}_${input.contexto.turno.split(" ")[0].toLowerCase()}_${input.contexto.entradaCodigo.replace("/", "-")}`;
   const rows = input.alunos.map(student => {
      const service = input.atendimentos?.findLast(a => a.matriculaId === student.id && a.registroId === input.registro.id);
      const refund = input.devolucoes?.findLast(r => r.matriculaId === student.id);
      return [
         student.ra,
         student.nomeCompleto,
         student.telefone ?? "Não cadastrado",
         student.email ?? "Não cadastrado",
         service ? (service.resultado === "aceitou-outro-curso" ? "Aceitou outro curso" : "Contato realizado") : "A contatar",
         refund ? refundLabels[refund.estado] : "—",
         refund?.protocolo ?? "—",
      ];
   });
   const ids = new Set(input.alunos.map(a => a.id));
   const refunds = input.devolucoes?.filter(r => ids.has(r.matriculaId)) ?? [];
   const summary = `${input.alunos.length} alunos · ${rows.filter(r => r[4] !== "A contatar").length} com atendimento · ${refunds.filter(r => r.estado === "paga").length} devolvidos`;
   return { info, filename, rows, summary };
}
const headers = ["RA", "Nome completo", "Telefone", "E-mail", "Atendimento", "Devolução", "Protocolo"];
function download(blob: Blob, filename: string) {
   const url = URL.createObjectURL(blob),
      anchor = document.createElement("a");
   anchor.href = url;
   anchor.download = filename;
   document.body.append(anchor);
   anchor.click();
   anchor.remove();
   setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function buildExcel(input: ExportContext) {
   const { Workbook } = await import("exceljs"),
      workbook = new Workbook(),
      { info, rows, summary } = details(input);
   workbook.creator = input.geradoPor ?? "Grupo Anchieta";
   workbook.created = new Date();
   const image = workbook.addImage({ base64: logo.dataUrl, extension: "png" });
   const setup = (name: string) => {
      const sheet = workbook.addWorksheet(name, {
         views: [{ showGridLines: false, state: "frozen", ySplit: name === "Alunos" ? 11 : 0 }],
         pageSetup: {
            paperSize: 9,
            orientation: "landscape",
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            printTitlesRow: name === "Alunos" ? "1:11" : undefined,
         },
      });
      sheet.columns = [{ width: 3 }, ...[13, 34, 22, 38, 26, 28, 23].map(width => ({ width }))];
      // A two-cell anchor avoids ExcelJS emitting the invalid editAs attribute on oneCellAnchor.
      sheet.addImage(image, "B2:C4");
      const corner = sheet.getImages().at(-1)!.range.br;
      corner.nativeCol = 2;
      corner.nativeColOff = 74 * 9525;
      corner.nativeRow = 3;
      corner.nativeRowOff = 11 * 9525;
      sheet.mergeCells("E2:H2");
      sheet.getCell("E2").value = "Captação · UniAnchieta";
      sheet.getCell("E2").font = { name: "Calibri", size: 12, bold: true, color: { argb: "FF00509D" } };
      sheet.mergeCells("E3:H3");
      sheet.getCell("E3").value = `Gerado em ${dateLabel(new Date().toISOString())}`;
      sheet.mergeCells("B5:H5");
      sheet.getCell("B5").value = "Não formação de turma";
      sheet.getCell("B5").font = { name: "Calibri", size: 20, bold: true, color: { argb: "FF16202B" } };
      sheet.getRow(5).height = 32;
      sheet.mergeCells("B6:H6");
      sheet.getCell("B6").border = { bottom: { style: "medium", color: { argb: "FFFFC400" } } };
      sheet.mergeCells("B7:H7");
      sheet.getCell("B7").value = Object.values(info).join(" · ");
      sheet.mergeCells("B8:H8");
      sheet.getCell("B8").value = summary;
      sheet.mergeCells("B9:H9");
      sheet.getCell("B9").value = `${input.escopo} · ${input.geradoPor ?? "Captação"}`;
      sheet.eachRow(row =>
         row.eachCell(cell => {
            if (!cell.font) cell.font = { name: "Calibri", size: 11 };
            cell.alignment = { vertical: "middle", wrapText: true };
         }),
      );
      sheet.headerFooter.oddFooter = "&LGrupo Anchieta&R Página &P de &N";
      return sheet;
   };
   const summarySheet = setup("Resumo");
   const contextRows = [
      ...Object.entries(info),
      ["Motivo", input.registro.motivo],
      ["Registrado em", dateLabel(input.registro.registradaEm)],
      ["Escopo", input.escopo],
      ["Total de alunos", input.alunos.length],
      [
         "Como ler",
         "A contatar: sem atendimento. Devolvido: pagamento confirmado pelo financeiro. Os dados bancários e as chaves Pix não fazem parte deste relatório.",
      ],
   ];
   contextRows.forEach(([label, value], index) => {
      const n = index + 11;
      summarySheet.mergeCells(`B${n}:C${n}`);
      summarySheet.mergeCells(`D${n}:H${n}`);
      summarySheet.getCell(`B${n}`).value = label;
      summarySheet.getCell(`B${n}`).font = { name: "Calibri", size: 11, bold: true };
      summarySheet.getCell(`D${n}`).value = value;
      summarySheet.getCell(`D${n}`).alignment = { wrapText: true, vertical: "middle" };
      summarySheet.getRow(n).height = index === contextRows.length - 1 ? 40 : 25;
   });
   const sheet = setup("Alunos");
   sheet.getRow(11).values = [undefined, ...headers];
   sheet.getRow(11).height = 28;
   sheet.getRow(11).eachCell(cell => {
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF00509D" } };
   });
   rows.forEach((values, index) => {
      const row = sheet.getRow(index + 12);
      row.values = [undefined, ...values];
      row.height = 32;
      row.eachCell((cell, column) => {
         cell.font = { name: column === 2 ? "Consolas" : "Calibri", size: 11 };
         cell.alignment = { vertical: "middle", wrapText: true };
         cell.border = { bottom: { style: "hair", color: { argb: "FFDCE3EB" } } };
         if (index % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F7FA" } };
      });
      row.getCell(2).numFmt = "@";
   });
   sheet.autoFilter = { from: "B11", to: `H${Math.max(11, input.alunos.length + 11)}` };
   const buffer = await workbook.xlsx.writeBuffer();
   return new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
export async function buildPdf(input: ExportContext) {
   const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
   const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" }),
      { info, rows, summary } = details(input);
   const generated = dateLabel(new Date().toISOString());
   autoTable(doc, {
      startY: 61,
      margin: { top: 61, bottom: 17, left: 14, right: 14 },
      head: [headers],
      body: rows,
      showHead: "everyPage",
      styles: {
         font: "helvetica",
         fontSize: 8,
         cellPadding: 3,
         overflow: "linebreak",
         textColor: [38, 47, 59],
         lineColor: [222, 228, 235],
         lineWidth: { bottom: 0.15 },
      },
      headStyles: { fillColor: [0, 80, 157], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [246, 248, 250] },
      columnStyles: {
         0: { cellWidth: 21, font: "courier" },
         1: { cellWidth: 51 },
         2: { cellWidth: 31 },
         3: { cellWidth: 57 },
         4: { cellWidth: 37 },
         5: { cellWidth: 39 },
         6: { cellWidth: 33 },
      },
      didDrawPage: () => {
         doc.addImage(logo.dataUrl, "PNG", 14, 9, 40, 12);
         doc.setFont("helvetica", "bold");
         doc.setFontSize(10);
         doc.setTextColor(38, 47, 59);
         doc.text("Captação · UniAnchieta", 58, 14);
         doc.setFont("helvetica", "normal");
         doc.setFontSize(8);
         doc.setTextColor(110, 122, 139);
         doc.text(`Relação de alunos · ${generated}`, 283, 14, { align: "right" });
         doc.setFont("helvetica", "bold");
         doc.setFontSize(19);
         doc.setTextColor(22, 32, 43);
         doc.text("Não formação de turma", 14, 32);
         doc.setDrawColor(255, 196, 0);
         doc.setLineWidth(0.8);
         doc.line(14, 36, 29, 36);
         doc.setFont("helvetica", "normal");
         doc.setFontSize(9);
         doc.text(doc.splitTextToSize(Object.values(info).join(" · "), 269), 14, 43);
         doc.setFontSize(8);
         doc.setTextColor(110, 122, 139);
         doc.text(summary, 14, 54);
         doc.text(`${input.escopo}`, 283, 54, { align: "right" });
      },
   });
   const total = doc.getNumberOfPages();
   for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(110, 122, 139);
      doc.text(`GRUPO ANCHIETA · ${input.geradoPor ?? "Captação"}`, 14, 202);
      doc.text(`Página ${i} de ${total}`, 283, 202, { align: "right" });
   }
   return doc.output("blob");
}
export async function exportStudents(input: ExportContext, format: "xlsx" | "pdf") {
   if (!input.alunos.length) throw new Error("Nenhum aluno neste escopo para exportar.");
   const blob = format === "xlsx" ? await buildExcel(input) : await buildPdf(input);
   download(blob, `${details(input).filename}.${format}`);
}

export interface CampaignExportContext {
   campaign: Campanha;
   revision: Revisao;
   data: DemoData;
   geradoPor?: string;
}

export async function buildCampaignPdf({ campaign, revision, data, geradoPor }: CampaignExportContext) {
   if (!campaign.revisoes.some(r => r.numero === revision.numero && JSON.stringify(r) === JSON.stringify(revision)))
      throw new Error("A revisão não pertence à campanha selecionada.");
   const contexts = data.contextos.filter(c => revision.contextosIds.includes(c.id));
   if (!contexts.length) throw new Error("Esta campanha não possui ofertas para exportar.");
   const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
   const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
   const statuses: Record<string, string> = {
      aprovada: "Aprovada",
      "em-aprovacao": "Em aprovação",
      "ajustes-solicitados": "Ajustes solicitados",
   };
   const win = janela(revision);
   const title = campaign.nome;
   doc.setFont("helvetica", "bold");
   doc.setFontSize(18);
   const titleLines = doc.splitTextToSize(title, 269) as string[];
   const headerBottom = 39 + titleLines.length * 7;
   // Keep room for the table even when campaign names are long.
   if (headerBottom > 140) throw new Error("Encurte o nome da campanha para exportar o PDF.");
   const contextRows = contexts.map(c => {
      const offer = ofertas.find(o => o.id === c.ofertaId)!;
      const price = commercialPrice(c, revision);
      return [
         cursos.find(course => course.id === offer.cursoId)!.nome,
         `${offer.formato} · ${c.turno}`,
         c.entradaCodigo,
         money(price?.valorContratoCentavos ?? null),
         price ? `${price.bolsaComercialBps / 100}%` : "Não cadastrada",
         money(price ? standardMonthly(price) : null),
      ];
   });
   const periodRows = contexts.flatMap(c => {
      const offer = ofertas.find(o => o.id === c.ofertaId)!;
      const installments = cronograma(
         revision.horizonteCobranca,
         revision.regras,
         baseForRevision(revision, data, c.id),
         standardForRevision(revision, data, c.id),
      );
      const periods: Array<{ start: string; end: string; value: number | null; state: string; count: number }> = [];
      for (const p of installments) {
         const previous = periods.at(-1);
         if (previous && previous.value === p.valorCentavos && previous.state === p.estado) {
            previous.end = p.competencia;
            previous.count++;
         } else periods.push({ start: p.competencia, end: p.competencia, value: p.valorCentavos, state: p.estado, count: 1 });
      }
      const scope = `${cursos.find(course => course.id === offer.cursoId)!.nome}\n${offer.formato} · ${c.turno} · ${c.entradaCodigo}`;
      return periods.map(p => [
         scope,
         `${monthLabel(p.start)}${p.start !== p.end ? ` a ${monthLabel(p.end)}` : ""}`,
         String(p.count),
         p.state === "isento" ? "Isento" : p.state === "padrao" ? "Bolsa comercial padrão" : "Campanha",
         money(p.value),
         money(p.value === null ? null : p.value * p.count),
      ]);
   });
   const tableOptions = {
      margin: { top: headerBottom + 14, bottom: 17, left: 14, right: 14 },
      styles: {
         font: "helvetica",
         fontSize: 8,
         cellPadding: 3,
         overflow: "linebreak" as const,
         textColor: [38, 47, 59] as [number, number, number],
      },
      headStyles: { fillColor: [0, 80, 157] as [number, number, number], textColor: 255, fontStyle: "bold" as const },
      alternateRowStyles: { fillColor: [246, 248, 250] as [number, number, number] },
   };
   autoTable(doc, {
      ...tableOptions,
      startY: headerBottom + 14,
      head: [["Curso", "Oferta e turno", "Ingresso", "Valor de contrato", "Bolsa comercial", "Mensalidade padrão"]],
      body: contextRows,
   });
   const finalY = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
   autoTable(doc, {
      ...tableOptions,
      startY: finalY + 10,
      head: [["Oferta", "Período", "Meses", "Condição", "Valor por mês", "Total do período"]],
      body: periodRows,
      columnStyles: {
         0: { cellWidth: 78 },
         1: { cellWidth: 65 },
         2: { cellWidth: 17 },
         3: { cellWidth: 40 },
         4: { cellWidth: 34 },
         5: { cellWidth: 35 },
      },
   });
   if (revision.condicoes.trim())
      autoTable(doc, {
         ...tableOptions,
         startY: (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8,
         head: [["Condições de adesão"]],
         body: [[revision.condicoes]],
      });
   const total = doc.getNumberOfPages();
   for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.addImage(logo.dataUrl, "PNG", 14, 9, 40, 12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(38, 47, 59);
      doc.text("Captação · UniAnchieta", 58, 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(110, 122, 139);
      doc.text(`Campanha comercial · ${dateLabel(new Date().toISOString())}`, 283, 14, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(22, 32, 43);
      doc.text(titleLines, 14, 32, { lineHeightFactor: 1.1 });
      doc.setDrawColor(255, 196, 0);
      doc.setLineWidth(0.8);
      doc.line(14, headerBottom - 5, 29, headerBottom - 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(
         `Revisão ${revision.numero} · ${campaign.arquivadaEm ? "Arquivada" : statuses[revision.estado]} · Ingresso ${revision.elegibilidade.entradasCodigos.join(", ")}`,
         14,
         headerBottom,
      );
      doc.setFontSize(8);
      doc.setTextColor(110, 122, 139);
      doc.text(
         `Adesão: ${dateLabel(win.inicio)} a ${dateLabel(win.fim)} · Cobrança: ${monthLabel(revision.horizonteCobranca.inicio)} a ${monthLabel(revision.horizonteCobranca.fim)}`,
         14,
         headerBottom + 6,
      );
      doc.text(`GRUPO ANCHIETA · ${geradoPor ?? "Captação"}`, 14, 202);
      doc.text(`Página ${i} de ${total}`, 283, 202, { align: "right" });
   }
   return doc.output("blob");
}

export async function exportCampaign(input: CampaignExportContext) {
   download(await buildCampaignPdf(input), `campanha_${input.campaign.id.replace(/[^\w-]/g, "_")}_revisao-${input.revision.numero}.pdf`);
}
