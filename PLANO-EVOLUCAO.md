# Plano de evolução: velocidade, simplicidade e atendimento

Planejamento de 07/10/2026, baseado em inspeção do código, execução do Lighthouse no build de produção, consulta às páginas oficiais e exame das referências anexadas. Esta rodada não altera telas, campanhas salvas ou imagens ativas da aplicação. O script de auditoria grava somente evidências locais.

## 1. Diagnóstico e resultado desejado

82 cursos não justificam a lentidão atual. O custo vem principalmente de repetir consultas e cálculos durante a renderização e bloquear a interface com trabalho síncrono.

| Medida               | Build atual, Lighthouse móvel              | Meta para a próxima implementação                                         |
| -------------------- | ------------------------------------------ | ------------------------------------------------------------------------- |
| Performance          | 38/100                                     | ≥ 90 na mediana de três execuções comparáveis                             |
| LCP                  | 4,91 s                                     | ≤ 2,5 s                                                                   |
| TBT                  | 9.805,5 ms                                 | ≤ 200 ms                                                                  |
| CLS                  | 0                                          | Manter ≤ 0,1                                                              |
| Speed Index          | 9,75 s                                     | ≤ 3,4 s                                                                   |
| JavaScript carregado | 1,08 MB descomprimido; 249 KB transferidos | Reduzir o caminho inicial e não carregar editores/exportadores sem uso    |
| Imagens carregadas   | 506 KB de conteúdo, oito recursos          | Variantes adequadas à viewport e prioridade somente para conteúdo inicial |

Essas são metas de aceite, não resultados já obtidos. A medição atual usou Lighthouse 13.5.0, preview em `127.0.0.1:4173`, viewport 412 × 823, CPU simulada 4× e rede móvel simulada. É uma execução diagnóstica; não constitui uma mediana. O teste do usuário em dev marcou 25 e inclui alertas sobre extensões; a comparação antes/depois será feita no mesmo build de produção e navegador limpo.

Também medir resposta da busca, filtros, navegação e editor: feedback visual em até 100 ms; busca/filtro com p95 ≤ 100 ms no navegador de teste; navegação entre telas já carregadas com p95 ≤ 150 ms para mostrar conteúdo. INP será verificado em interações e não inferido a partir de TBT. Transições devem poder ser interrompidas, sem fila de animações ou flashes do menu.

### Causas observadas

- `CatalogContent` chama `offerMatches` dentro da varredura de todos os contextos. Contagem de campanhas, indisponibilidade e cartões recalculam esse mesmo recorte várias vezes. A página já mostra apenas 12 cartões; virtualizar 82 itens não resolve essa causa.
- `repository.read` relê/valida/clona todo o seed, com 861 contextos, 861 bases e 33 matrículas. `extendYear` executa buscas repetidas. O adaptador ainda impõe 160 ms de atraso artificial em toda leitura/mutação.
- `useDemo` tem `staleTime: 0`; telas que voltam a montar consultam novamente um conjunto que poderia permanecer válido até uma alteração.
- `Suspense` envolve toda a árvore de rotas. Um chunk novo pode substituir a moldura inteira por Carregando. A transição da página começa antes de o dado estar pronto.
- O editor observa o formulário completo, recalcula conflitos/validação/cronograma e serializa em `localStorage` a cada alteração.
- O catálogo recebe o chunk de formulário mesmo sem abrir o editor. O agrupamento manual coloca Zod e React Hook Form juntos. O entry também carrega o seed e dependências de telas secundárias por imports compartilhados.
- Todas as imagens usam `loading="lazy"`, inclusive a imagem que pode ser LCP; não têm `srcset`, `sizes`, dimensões ou decodificação assíncrona explícitos.
- A sidebar efetivamente usada é `AppSidebar`; o componente animado `SidebarNavigationItem` herdado não está integrado à navegação atual. Alterar somente esse componente não produziria a fluidez solicitada.

## 2. Performance: fazer primeiro

### Dados e renderização

1. Construir índices derivados de cada versão do dataset: curso por id, ofertas por curso, contextos por oferta/ano/entrada/turno, bases por contexto, não formação por contexto e campanhas aprovadas por contexto. Usar `Map`/`Set`, calcular cada recorte uma vez e compartilhar o resultado entre filtros, contadores e cartões.
2. Memoizar os resultados pelos dados e filtros efetivos. Pré-normalizar o índice de busca; reutilizar os formatadores monetários e de datas. A digitação permanece imediata; atualização mais cara usa transição/deferred value apenas onde a medição justificar.
3. Validar o armazenamento no carregamento e nas mutações; manter snapshot em memória. Persistir de forma consistente e invalidar por versão. O evento `storage` sincroniza outras abas. Manter transações serializadas, revisão esperada e proteção contra dupla decisão.
4. Separar consultas por finalidade e usar cache persistente na sessão. Invalidações de mutação atualizam somente os dados dependentes. Remover atraso artificial do uso normal; deixar latência/falha simulada nas preferências de demonstração.
5. Gerar contextos de outro ano uma vez por ano/versão, sem buscas quadráticas e sem inventar bases financeiras.
6. No editor, observar campos por seção, memoizar escopo e regras financeiras, separar resumo e conflitos. Autosave com debounce de aproximadamente 500 ms e flush explícito ao sair, ao salvar e em `pagehide`; mostrar Salvando/Salvo quando necessário e preservar o buffer em falhas. O formulário deve continuar rápido enquanto digita valor ou nome.

### Carregamento inicial

7. Separar o catálogo factual pequeno dos dados operacionais e das matrículas. Mover seed volumoso para carregamento assíncrono local somente quando necessário; leitura de asset local não é integração externa. Projetar as consultas para o catálogo não depender da lista completa de alunos.
8. Revisar as fronteiras de chunks com análise de imports. React Hook Form, diálogos financeiros e exportadores não devem entrar no caminho inicial por associação de vendor ou imports compartilhados. ExcelJS/jsPDF já são dinâmicos e continuarão assim.
9. Fontes latinas locais, com pesos efetivamente usados e `font-display: swap`. Otimizar logo raster quando aplicável. Evitar preloads sem consumidor imediato.
10.   Manter paginação no catálogo; para uma futura base grande de alunos, medir paginação ou virtualização acessível conforme volume real. Worker fica reservado a cálculo/exportação que ainda gere tarefas longas depois das correções; não introduzir complexidade sem evidência.

**Prova:** medir o mesmo cenário antes/depois, registrar bytes, tarefas longas e timings; testar equivalência dos filtros/contadores com a lógica atual. Otimização não pode ampliar uma campanha ou esconder oferta disponível.

## 3. Imagens: mapa específico dos 82 cursos

A auditoria completa está em [AUDITORIA-IMAGENS.md](AUDITORIA-IMAGENS.md).

- 31 imagens atuais coincidem com o banner ativo.
- 6 são outros banners publicados na mesma página do curso.
- 34 são fotografias genéricas de galerias institucionais.
- 11 usam Administração como fallback.
- Foram encontrados, baixados e inspecionados visualmente os 82 banners ativos das páginas individuais oficiais. Agrocomputação usa o campo com drone, tablet e tecnologia agrícola.

O coletor será substituído por uma extração associada à página e à regra CSS do banner. O manifesto guardará página, URL original, hash, dimensões e derivados locais. UUID no nome não invalida a imagem; encontrar a imagem em alguma galeria não a torna imagem daquele curso.

Gerar variantes WebP/AVIF quando o ganho justificar, aproximadamente 320/640/960 px, mantendo resolução maior para a ficha. Configurar `srcset`, `sizes`, dimensões, recorte conferido e `decoding="async"`. Prioridade alta somente para a imagem inicial efetivamente candidata a LCP; demais lazy. O fallback será neutro, sem a foto de Administração. Fotos continuam cinza nos contextos sem formação.

**Prova:** 82/82 entradas no manifesto, associação por curso sem heurística de tema, amostra visual de cada banner e comparação do site com a aplicação. Repetições existentes no próprio site ficam documentadas. Nenhum asset remoto durante o uso do app.

## 4. Fluidez: preservar o espaço de trabalho

Referências examinadas: vídeo `ref_fluidez.mp4` de 18,52 s e navegação do [Sucesso ao Aluno](https://sucesso-ao-aluno.vercel.app/#/cockpit). A direção é continuidade do menu, feedback imediato e movimentos breves. Não copiar os dashboards ou módulos daquele produto.

- Sidebar e header permanecem montados; o boundary de carregamento fica no conteúdo da rota.
- Pré-carregar chunk e consulta ao focar/hover de links relevantes, respeitando economia de dados. Não baixar todas as telas antecipadamente.
- Menu recolhido mantém coluna e posição previsíveis dos ícones, rótulos com saída breve e expansão interrompível. Corrigir a sidebar usada de fato.
- Tabs têm indicador que se desloca e conteúdo com troca curta; não animar altura de grandes superfícies. Não esperar uma animação de saída terminar para aceitar o próximo clique.
- Navegação com conteúdo pronto: transição discreta de opacidade/posição, aproximadamente 120–180 ms. Dialog e sheet: entrada/saída aproximadamente 140–220 ms. Usar a biblioteca atual e priorizar `transform`/`opacity`.
- Manter conteúdo anterior durante refetch; skeleton reservado a primeira carga e com geometria próxima da tela final. Sem spinner de página inteira em filtros.
- Foco acompanha o novo título na navegação; histórico volta ao recorte e posição anteriores. `prefers-reduced-motion` remove deslocamentos e preserva feedback.

**Prova:** percorrer rapidamente menu, abas, voltar/avançar e filtros com CPU reduzida, conferir ausência de saltos/filas/flashes e capturar trace. Fluidez não será avaliada somente por screenshots.

## 5. Campanha: a gestora só informa a condição comercial

Direção recomendada, ainda sujeita à escolha do primeiro quiz: uma tela curta com três blocos e opções avançadas recolhidas. Caso a preferência seja manter etapas, aplicar o mesmo vocabulário e preenchimento guiado às quatro etapas existentes.

### Exemplo de tarefa

> Arquitetura → Presencial → ingresso no 1º semestre de 2027 → adesão de 1 a 31 de janeiro → janeiro isento → fevereiro a junho R$ 599 → Enviar para aprovação.

1. **Para quem:** curso já selecionado quando veio da ficha, seleção rápida de vários cursos, modalidade e entrada em linguagem humana. Código completo aparece como informação auxiliar: “1º semestre de 2027 · 2027/1”. Todos os cursos/turnos é uma escolha explícita com quantidade real afetada.
2. **Qual condição:** pequenas linhas de período, condição e valor. Botões claros: Adicionar período, Isentar mês. Tipos avançados como bolsa percentual ficam disponíveis sem dominar o caso comum. Matrícula aparece separada das mensalidades.
3. **Até quando aceitar:** prazo comercial explícito. O sistema mantém ingresso, adesão e cobrança independentes, sugere datas a partir do recorte e exige confirmação quando uma sugestão for usada.

Ao lado, resumo em português: “Janeiro isento. Fevereiro a junho: R$ 599/mês. Total no período: R$ 2.995. Após junho, esta campanha não define valores.” Em mobile, o resumo segue disponível abaixo e pode ser aberto pelo botão Ver resumo.

Nome pode ser sugerido a partir de curso/período e editado. Não obrigar a gestora a nomear uma campanha técnica antes de cadastrar a condição. Botão principal **Enviar para aprovação**; secundário **Salvar rascunho**. Troca de campos mantém edição e mostra somente pendências relevantes ao próximo passo.

**Automático:** mapear ofertas/contextos, verificar compatibilidade, detectar meses sem valor, isenção e sobreposição, calcular centavos, comparar conflitos, congelar escopo/base/revisão e guardar cronograma vinculado. Exceções, detalhes por turma e histórico aparecem sob demanda.

**Não automatizar sem decisão:** escolher prioridade entre campanhas conflitantes, inventar base, estender benefícios ao curso inteiro ou aplicar cobrança retroativa. Um conflito oferece uma correção concreta (“Retirar estas turmas” ou “Ajustar período”) e mantém o rascunho.

A aprovadora vê condição anterior/proposta, diferenças e pendências, com **Aprovar** ou **Devolver para ajuste**. Comentário continua obrigatório na devolução. A revisão anterior preserva a promessa das matrículas.

## 6. Não formação: atendimento e devolução na linha do aluno

### Relação de alunos e RA

RA como string com `/^\d{7}$/`, incluindo zeros à esquerda. Os 33 exemplos atuais têm nove dígitos: serão remapeados determinística e exclusivamente como dados demo, mantendo ids e vínculos. Migrar a versão local sem apagar campanhas/decisões. Dados reais inválidos serão sinalizados; nunca cortar dígitos de um RA real.

Manter RA, nome e contato; acrescentar **Atendimento** e **Devolução**. Na mesma linha, ação de atendimento com três resultados confirmados pelo usuário: Contato realizado, Aceitou outro curso, Solicitar devolução. A ação **Devolução** permanece acessível diretamente, sem obrigar a abrir ficha do aluno.

- Contato realizado registra canal/data e observação opcional.
- Aceitou outro curso registra oferta/entrada escolhida e mantém histórico do contexto original. Sem integração de matrícula, isso registra o aceite; não afirma que houve transferência acadêmica. A seleção oferece somente recortes disponíveis.
- Solicitar devolução abre o dialog financeiro. Depois a linha mostra **Acompanhar**, e depois do pagamento confirmado, **Devolvido**.

### Dialog de devolução

Título **Solicitar devolução**. RA, nome e curso já preenchidos. Valor disponível em destaque verde, com identificação da fonte e data da consulta. Saldo indisponível/zero ou desatualizado impede solicitar e oferece Atualizar saldo.

Titular permitido vem do sistema financeiro: aluno ou responsável financeiro. Mostrar o nome autorizado e o vínculo; a gestora não precisa adivinhar. Somente mostrar escolha de titular se houver mais de um recebedor permitido.

**Pix** selecionado inicialmente: tipo de chave e chave. **Transferência bancária** expande banco, agência, conta, tipo de conta e titular confirmado. Erros junto ao campo, informação preservada ao alternar, botão **Solicitar devolução** com feedback e proteção contra envio duplicado. Voltar/Fechar não apaga a edição do dialog sem necessidade.

O valor é confirmado pelo sistema responsável e guardado em centavos com o pedido. A opção de edição manual de valor ainda depende do primeiro quiz; a recomendação é saldo confirmado, sem edição livre.

### Acompanhamento

```mermaid
flowchart LR
  A[Solicitação recebida] --> B[Verificações concluídas]
  B --> C[Aguardando pagamento]
  C --> D[Pagamento realizado]
  D --> E[Devolvido na linha do aluno]
```

Drawer ou dialog de acompanhamento com aluno, recebedor, valor, Pix/transferência, protocolo, estado atual, eventos com datas e última atualização, seguindo a referência anexada. Chave/conta mascarada no resumo. Manter também estados de Pendência de dados, Recusada, Cancelada, Erro de envio e Sincronização indisponível; eles não viram pagamento concluído.

**Contrato de integração:** obter saldo/recebedores permitidos, criar solicitação com chave de idempotência, consultar protocolo/versão e histórico. Fonte externa controla aprovação financeira e pagamento; o frontend não fabrica Devolvido por passagem de tempo. Atualizar enquanto acompanhamento estiver aberto, interromper polling em aba oculta e pedidos terminais, retomar no foco e permitir atualizar manualmente. Webhook pode ser usado pelo backend responsável no futuro.

O adaptador demonstrativo terá os mesmos estados e permitirá simulação explícita nas preferências. Não afirmar envio ao sistema real até existir endpoint autorizado e resposta confirmada. Duplo clique, retry e reabertura encontram o mesmo pedido ativo. Id de matrícula/contexto é a correlação estável; RA não é a única identidade.

Restaurar a formação da turma não apaga ou cancela devolução financeira já registrada. Registrar autoria, histórico e snapshot do destino da solicitação. Explicar na linha a diferença entre erro de sincronização e recusa financeira.

## 7. Exportações com a identidade dos anexos

Usar os anexos como linguagem visual, preservando o conteúdo do contexto atual. Não copiar dados de monitoramento ou do processo CX-029.

- **PDF:** logo Anchieta, Captação/UniAnchieta, identificação de Não formação de turma, curso/formato/turno/entrada, gerado em/por, escopo e quantidade. Filete amarelo discreto, metadados cinza, seção de situação dos atendimentos e tabela arejada. Tabela em A4 paisagem quando necessária; cabeçalho e títulos repetidos, contatos completos com quebra correta, rodapé Página X de Y. Exportação real baixável; sem cabeçalho/URL do navegador e sem timeline com rolagem cortada como no PDF de referência.
- **Excel:** aba Resumo contextual e aba Alunos. Logo real, margem interna, título e texto explicativo, informações de geração, cabeçalho azul, gridlines ocultas, largura/altura calculada, linhas discretas, autofiltro e linhas de identificação/cabeçalho congeladas. Configuração A4, fitToWidth, títulos repetidos. Datas/valores com tipos próprios; RA, telefone e chaves como texto. Modelo visual derivado dos estilos reais do arquivo anexado, incluindo cabeçalho `FF00509D`, sem alterar tokens da aplicação.
- Incluir atendimento, estado da devolução e protocolo quando existirem. Não incluir chave Pix/conta bancária em uma exportação geral de contatos.
- Manter escopo explícito: todos os resultados filtrados de todas as páginas ou somente selecionados. Resumo da exportação usa esse mesmo universo, sem misturar alunos fora do filtro.
- Carregar bibliotecas apenas ao exportar; UI mostra Preparando arquivo e permanece responsiva. Se volume medido justificar, geração em worker.

**Prova:** abrir XLSX real e conferir estilos, RA com sete dígitos, filtros e seleção; renderizar PDF de lista curta e multipágina, inspecionando logo, cortes, acentos e rodapé. Vazio não exporta.

## 8. Ordem de execução e critérios de saída

| Entrega                   | Trabalho                                                   | Verificação para avançar                                                                   |
| ------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1. Base rápida            | Índices, cache, repository, leitura inicial e editor       | Equivalência dos filtros e regras; medição mostra queda das tarefas longas                 |
| 2. Fotografias corretas   | Manifesto dos 82 banners e variantes                       | 82/82 conferidos, sem fallback de outro curso; LCP e payload menores                       |
| 3. Navegação fluida       | Shell permanente, prefetch, sidebar, tabs e feedback       | Menu/telas não piscam, cliques rápidos interrompem transições, reduced motion funciona     |
| 4. Cadastro simples       | Escolha do quiz, campos comerciais e resumo                | Cadastrar o exemplo janeiro isento/599 sem vocabulário técnico e sem perda de validação    |
| 5. Atendimento financeiro | RA/migração, contato, aceite, solicitação e acompanhamento | Titular/saldo corretos, idempotência, estados de erro e Devolvido somente após confirmação |
| 6. Relatórios             | Estilo dos anexos e novos campos                           | XLSX/PDF reais, belos, legíveis, multipágina e com recorte correto                         |
| 7. Aceite final           | Testes e navegação com CPU/rede comparáveis                | Metas medidas, quatro larguras, teclado/axe, fluxos e downloads sem regressões             |

Executar testes de domínio/persistência existentes, acrescentando índices equivalentes, migração de RA, saldo/titularidade, envio duplicado, falha/retry e atualizações fora de ordem. Rodar lint, format, TypeScript app/node e build. Registrar antes/depois e limitações; não declarar 90+ ou integração real sem comprovação. Manter dados originais do kit intactos.

## 9. Decisões do quiz

Confirmadas: três resultados de atendimento; responsável financeiro pode receber e o sistema informa a titularidade permitida.

Premissas adotadas após autorização para executar:

1. Demonstrativo com contrato de integração. A conexão real precisa da URL e documentação do sistema responsável.
2. Saldo confirmado pelo adaptador financeiro e demonstração explicitamente fictícia.
3. Uma página com opções adicionais recolhidas e resumo mensal.

Essas premissas foram comunicadas durante a execução. Solicitações e pagamentos permanecem locais; não há envio ao sistema financeiro real.
