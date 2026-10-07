# Validação da evolução

Rodada de 07/10/2026, executada sobre o frontend autorizado. Os arquivos originais do kit foram preservados.

## Resultado funcional

- 82/82 banners correspondem às páginas oficiais capturadas em 07/10. O manifesto registra página e origem, e a procedência inclui hash e dimensões. Todas as 82 imagens carregaram no navegador sem erro. Há 246 variantes; o celular usa no máximo 640 px. Foram removidas 71 imagens geradas pelo coletor antigo.
- Cadastro em uma página, opções adicionais recolhidas, nome automático e atalho para isentar o primeiro mês. No navegador, AI Creative Design foi enviado sem nome manual, com janeiro isento e fevereiro–junho a R$ 599. Agrocomputação sem formação foi corretamente bloqueado.
- Atendimento registrado na linha. Pix foi solicitado para aluno e responsável financeiro autorizado; outra solicitação usou transferência bancária. O perfil financeiro demonstrativo avançou um protocolo pelas verificações até Devolvido. Os estados e pagamentos foram conferidos na persistência local.
- RAs fictícios antigos foram migrados para sete dígitos; os válidos, inclusive com zero inicial, permanecem texto. Campanhas e matrículas vinculadas foram preservadas.
- PDF e XLSX foram baixados e abertos. Relatórios contêm atendimento, devolução e protocolo, respeitam o escopo e omitem chave Pix e conta. PDF foi renderizado e inspecionado; o teste de 85 alunos verifica múltiplas páginas. XLSX foi lido por ExcelJS e openpyxl: abas Resumo/Alunos, logo em ambas, cabeçalho azul, RA textual, filtros e congelamento na linha 11. Foi corrigido o atributo inválido de âncora de imagem que alguns leitores descartavam.

## Verificação técnica

38 testes aprovados em sete arquivos. Cobrem catálogo indexado, busca, filtros, anos, campanhas e decisões, RA, saldo/titular, chave Pix, dados bancários, idempotência, concorrência, etapas financeiras, atendimento e exportações reais. TypeScript app/node e build aprovados. Lint sem erros, com seis avisos de Fast Refresh herdados. Formatação verificada. O detector de interface não encontrou os padrões mecânicos que verifica.

Catálogo, cadastro, aprovação e alunos foram medidos em 1440, 1280, 768 e 390 px: 16/16 sem overflow global, imagens quebradas ou recursos externos. As tabelas rolam dentro do próprio contêiner. Axe não encontrou violações nas quatro páginas. O contraste de Devolvido foi corrigido; a nova auditoria de modal também teve zero violações. Axe deixou verificações de elementos ocultos/obstruídos para revisão manual; o foco permanece no diálogo, o fechamento retorna à tela e a largura mobile é 390/390. Isso não constitui certificação completa de acessibilidade.

## Performance medida

Lighthouse 13.5.0 sobre `/catalogo` no preview de produção, Chrome do agent-browser, perfil mobile 412 × 823, CPU 4× e rede simulada. Baseline: uma execução diagnóstica; resultado final: mediana de três execuções consecutivas, sem testes/build concorrentes.

| Medida      |      Antes |                     Depois |
| ----------- | ---------: | -------------------------: |
| Nota mobile |         38 | 72 (execuções: 75, 70, 72) |
| FCP         |     2,88 s |                     2,57 s |
| LCP         |     4,91 s |                     4,74 s |
| TBT         | 9.805,5 ms |                   327,5 ms |
| Speed Index |     9,75 s |                     2,80 s |
| CLS         |          0 |                          0 |

O bloqueio caiu aproximadamente 96,7%. Os cálculos repetidos do catálogo foram substituídos por índices, as consultas mantêm snapshots estáveis e a navegação preserva a moldura. Fontes variáveis locais substituem sete arquivos de pesos. Editor, recursos completos de animação e bibliotecas de exportação são separados em chunks; fotos possuem prioridade, dimensões e variantes adequadas. Os dados iniciais e o catálogo são pré-carregados.

Uma execução com o preset desktop marcou **99**, com FCP de 0,66 s, LCP de 0,95 s, TBT de 11 ms e CLS zero. Evidência em `artifacts/lighthouse-desktop.json`; não é uma mediana desktop.

Em três trocas entre páginas já carregadas, a atualização de título seguida por dois frames levou 32,6, 51,1 e 39,4 ms. A mesma referência DOM da moldura permaneceu nas três rotas. Primeiras trocas com chunks ainda frios levaram cerca de 345–354 ms; a moldura permaneceu disponível. Essa amostra não substitui INP de uso real. Falhas ao carregar uma rota agora mostram uma ação de atualização dentro da moldura.

A recuperação foi verificada com um chunk de aprovação temporariamente indisponível no build: a ação Atualizar página ficou disponível e, após restaurar o arquivo, abriu normalmente Aprovações. O arquivo foi restaurado e nenhum artefato temporário permaneceu.

A meta de 90 mobile e LCP de 2,5 s do plano não foi atingida nesta máquina. O carregamento frio ainda paga o custo de inicializar a aplicação e os dados demonstrativos. A nota 25 da captura do usuário foi feita em desenvolvimento e continha alertas de extensões; não foi usada como baseline comparável. TBT não é uma medição de INP.

Evidências locais em `artifacts/lighthouse-antes.json`, `lighthouse-final-{1,2,3}.json`, capturas/medições responsivas, auditoria de imagens e arquivos de `artifacts/downloads/`. Essa pasta é ignorada pelo Git.

## Fronteira institucional

O sistema financeiro continua demonstrativo. O contrato em `src/services/refund-contract.ts` define saldo, titulares autorizados, solicitação e acompanhamento. A integração real exige o serviço institucional e autorização no backend. O aceite de outro curso registra o atendimento; não executa transferência acadêmica. Não houve pagamento, mensagem, deploy ou push reais.
