# Dados, exportações e fronteiras de integração

## Arquivos iniciais

`catalogo-cursos.json` contém cursos únicos e formatos oficiais observados. `ofertas-catalogo.json` contém combinações permitidas. Oferta é uma combinação permanente de curso e formato, sem supor turno, campus, preço ou entrada. `demo.json` acrescenta a matriz **fictícia** de turnos, contextos, bases, campanhas e alunos. `entradas.json` é gerado segundo os períodos informados pelo usuário, para 2025–2028; a UI deve poder gerar outros anos.

Campos do catálogo: `id`/slug, `nome`, `diploma`, `novo`, `formatosOriginais`, `formatosPermitidos`, `modalidades`, `fonteUrl`, `verificadoEm`, `imagem` (null até obter asset), `aliases`. Não inferir área, duração, preço, turno ou disponibilidade de turma a partir do título. Agrupamentos por área de conhecimento podem vir depois; nesta versão macro = modalidade, micro = curso/forma/entrada/turno.

O código do curso não é seu id Lyceum. Reservar `lyceumCursoId: null` para mapeamento futuro. Não inventar ids de integração. Alguns slugs diferem do título (`gestao-de-qualidade`, `pedagogia-licenciatura`); importar os URLs fornecidos, sem recriar por slugificação de nome.

## Contratos propostos

| Entidade | Campos essenciais |
|---|---|
| Contexto | id, ofertaId, turno, entradaCodigo, campusId/poloId opcionais, ficticio |
| Base de referência | contextoId, valorCentavos, rotuloDemonstracao |
| Campanha | id, nome, criadaPor, criadaEm, revisoes, arquivadaEm |
| Revisão | numero, estado, contextosIds congelados, modoSelecao, elegibilidade, horizonteCobranca, regras, taxaMatricula, condicoes, comentarioDecisao, autora, timestamps |
| Regra mensal | inicio/fim `YYYY-MM`, tipo `fixo/percentual/isencao/base`, valorCentavos ou percentualBps |
| Não formação | id, contextoId, estado, motivo, observacao, autora, registradaEm, reversao, alunosIds |
| Matrícula demo | id, contextoId, RA como string, nomeCompleto, telefone nullable, email nullable, matriculadaEm, campanhaVinculada nullable |
| Oferta na matrícula | campanhaId, revisaoNumero, registradaEm, parcelas congeladas, resumo, ficticio |
| Histórico | entidade/id, ação, persona, timestamp, revisão e comentário |
| Notificação simulada | id, revisão, destinatária fictícia, assunto, corpo, estado `simulada`, link interno |

Representar os schemas com Zod e derivar os tipos. Manter centavos em inteiros e RA como string (preserva zeros à esquerda). Datas civis sem UTC e eventos com timestamp ISO. `localStorage` com versão de schema e leitura validada; dado inválido informa erro e oferece restauração, sem travar a tela nem apagar tudo silenciosamente.

## Adaptadores

Criar interfaces internas como `CatalogRepository`, `CampaignRepository`, `FormationRepository` e `EnrollmentRepository`. Implementação atual lê JSON e `localStorage` e retorna Promises. As telas não conhecem Lyceum ou Graph; trocá-los por implementações do TI não muda os componentes.

As assinaturas podem seguir: listar cursos/ofertas; buscar campanha; salvar rascunho; enviar revisão; aprovar revisão esperada; devolver; arquivar; registrar/reverter não formação; listar matrículas por contexto. É contrato frontend, não design de endpoint backend obrigatório. Não criar servidor fake que precise iniciar processo adicional.

Revisão esperada permite simular concorrência: aprovação com `expectedRevision` desatualizada falha com feedback. Notificação Outlook é um objeto de preview local; jamais abrir composer ou enviar por integração na demonstração. Preferir emails em `example.invalid` para pessoas fictícias.

Para o TI posteriormente: mapear curso/formato/turno/entrada ao Lyceum; resolver fonte dos preços-base; vincular versão de oferta na matrícula; consultar status da aplicação da condição e comparar promessa/cobrança; adicionar autorização real; notificar pelo Outlook; consultar alunos e proteger exportações por permissão. Essas tarefas são de integração futura e não entram na execução do frontend.

## Exportação

Menu “Exportar” → Excel (.xlsx) / PDF (.pdf). Escopo explícito: “Todos os resultados filtrados (N)” ou “Selecionados (N)”; mudar paginação não perde seleção. Se nenhum selecionado, opção correspondente desabilitada. Nunca exportar silenciosamente todos os alunos da faculdade ou somente a página visível.

Excel com planilha `Alunos` e colunas RA, Nome completo, Telefone, E-mail, Curso, Modalidade, Formato, Turno, Entrada. Cabeçalho, autofiltro, primeira linha congelada, larguras legíveis e RA/telefone como texto. Uma planilha `Contexto` registra curso, recorte, motivo, data e escopo de exportação, com identificação “Dados fictícios — demonstração”. Células de nomes/contatos são texto, não fórmulas. Arquivo deve abrir corretamente; não usar `.xls` com HTML ou CSV disfarçado.

PDF A4 paisagem para caber contatos; cabeçalho institucional + título “Alunos — não formação de turma”; curso/formato/turno/entrada; data de geração; indicação discreta de dados fictícios. Tabela com cabeçalho repetido, nomes/e-mails quebrando linhas, numeração de páginas e conteúdo completo. Testar várias páginas. Um arquivo consolidado de múltiplos registros, se oferecido, agrupa por contexto e preserva a identificação em cada grupo; esta opção é secundária, não condição para a primeira entrega.

Nomes de download descritivos: `nao-formacao_biotecnologia_2027-21.xlsx` e `.pdf`; se turno/formato distinguem arquivos, incluí-los. Não colocar nome de aluno no nome do arquivo. Exports são locais no navegador.

## Casos de demonstração preparados

- Valor fixo + mês isento em Administração Presencial.
- Revisão de campanha aprovada aguardando nova aprovação; vínculo antigo preservado.
- Bolsa percentual por contexto EAD com bases demonstrativas.
- Direito em Presencial Intensivo tratado como Híbrido.
- Rascunho incompleto e proposta conflitante com Administração.
- Ajustes solicitados com comentário.
- Campanha histórica arquivada e promessa preservada em matrícula.
- Não formação em formatos novos, com 32 alunos fictícios e contatos ausentes.
- Datas de 2026 e 2027 e uma turma revertida em entrada anterior.

O relógio inicial de demonstração usa `2026-10-07` e o recorte inicial sugerido é 2027, para mostrar o planejamento do próximo ingresso. Exibir o ano escolhido claramente. Não confundir o relógio fixo do mock com a data real do computador; se optar por relógio real, derivar estados novamente e registrar a mudança no README.
