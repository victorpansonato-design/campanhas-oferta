# Comando para o Codex — Campanhas e Ofertas | Grupo Anchieta

Implemente neste repositório o **frontend completo e navegável** do sistema interno de Campanhas e Ofertas do UniAnchieta. A equipe de Captação usará o catálogo para consultar ofertas, propor campanhas, aprovar condições e acompanhar cursos que não formaram turma. O usuário já autorizou a implementação. Trabalhe até concluir; não pare em planejamento, telas isoladas ou botões decorativos. Este arquivo é o comando de execução; os documentos e dados deste kit detalham seu contrato.

## Leia antes de implementar

Os caminhos abaixo são relativos à pasta deste kit, `campanhas-oferta-kit/`, e não necessariamente à raiz do repositório. Não mova `dados/` ou `docs/` para `src/` sem adaptar imports e preservar suas referências.

1. `docs/01-produto-e-jornadas.md`.
2. `docs/02-regras-e-estados.md`.
3. `docs/03-direcao-visual-e-template.md`.
4. `docs/04-dados-e-fronteiras.md`.
5. `docs/05-criterios-de-aceite.md`.
6. `docs/06-catalogo-e-fontes.md`.
7. `dados/catalogo-cursos.json`, `dados/ofertas-catalogo.json`, `dados/entradas.json`, `dados/demo.json` e `referencias/DESIGN-SYSTEM-template.md`.

## Comece pelo template anexado

Localize o template na pasta do projeto ou no ZIP anexado. Se estiver compactado, extraia em uma pasta temporária e examine-o como código de referência. Preserve o `.git` do repositório campanhas-oferta; copie somente código, configuração não secreta e assets necessários. Não copie `.git`, `.env.local`, `.env.production`, builds, caches nem credenciais do template. Não execute scripts de deploy. Analise `scripts/setup.mjs` antes de decidir se convém usar seu modo de configuração; ajustar nome e base path manualmente também é aceitável e evita preparar APIs reais fora do escopo.

O template analisado usa React 19, TypeScript, Vite, Tailwind 4, React Router, Radix/shadcn, Lucide, Motion, React Hook Form + Zod, TanStack Query e Zustand. Reutilize essa stack, `src/index.css`, `src/components/ui`, shell, sidebar, logotipo, padrões de foco e espaçamento. Os títulos usam JetBrains Mono e o corpo Inter. Os tokens OKLCH do template prevalecem sobre aproximações de azul em HEX. Não substitua sua identidade por outro dashboard.

O template tem autenticação real: `AuthProvider` chama `authService.me()` e o Axios redireciona ao SSO. **Adapte explicitamente para sessão mock**, inclusive build/preview. A aplicação deve abrir diretamente no Catálogo sem login, sem chamadas a backend, sem redirect ao SSO e sem depender de variáveis reais. Preserve interfaces para substituição futura pelo TI. Centralize `VITE_DATA_MODE=mock`, base `/` e configurações em `src/config/env.ts`; use `referencias/.env.demo.example` como orientação. O rótulo discreto “Demonstração” deve identificar o modo.

## Resultado obrigatório

Crie estas rotas e integre a navegação real:

- `/catalogo`: página inicial, busca e filtros, grade/lista de cursos e suas ofertas.
- `/cursos/:cursoId`: ficha do curso, ofertas por modalidade/formato, campanhas, entradas e histórico de formação.
- `/campanhas`: lista com filtros de estado e período, histórico e ações de duplicar/arquivar.
- `/campanhas/nova` e `/campanhas/:id/editar`: formulário em quatro etapas, com rascunho e resumo mensal ao lado.
- `/campanhas/:id`: oferta em linguagem simples, valores mensais e histórico versionado.
- `/aprovacoes`: fila da gestora responsável, comparação da revisão, aprovar e devolver para ajuste.
- `/sem-formacao`: cursos/ofertas que não formaram turma no recorte selecionado, com fotos em escala de cinza.
- `/sem-formacao/:registroId`: lista dos alunos daquele contexto, RA, nome completo, telefone, e-mail, filtros e downloads de Excel e PDF.

Menus laterais: **Catálogo, Campanhas, Aprovações, Não formação de turma**. Sem dashboard genérico como primeira tela. A ficha e o formulário podem compartilhar componentes; não invente páginas secundárias desnecessárias.

## Produto e simplicidade

Pense em duas gestoras proponentes e uma gestora aprovadora. Um seletor pequeno de perfil na área do usuário alterna as três personas fictícias, sem autenticação. A gestora deve cadastrar “janeiro isento; fevereiro a junho R$ 599” sem configurar fórmulas, códigos de bolsas, prioridade técnica ou motores de regras.

Os quatro passos são **Cursos → Quem pode aderir → Valores por mês → Revisar**. A criação global e a criação dentro do curso usam o mesmo formulário; dentro do curso, pré-selecione o contexto. Permita campanha de curso único, vários cursos ou modalidade inteira, com filtros de formato e turno. “Todos” é uma seleção explícita e o resumo mostra exatamente quantas ofertas serão afetadas.

**Entrada, prazo de adesão e meses de cobrança são coisas diferentes.** Use códigos completos com ano, somente os compatíveis com a modalidade. Híbrido agrega **Presencial Intensivo + Semipresencial**, preservando os dois formatos para filtros e regras; não inclua Presencial Integral em campanhas, contadores ou não formação. Uma entrada trimestral pode ter benefício até dezembro; não limite a cobrança ao trimestre de ingresso.

A matrícula prometida não deve desaparecer quando a campanha expirar ou for revisada. Modele revisões imutáveis e uma demonstração da oferta vinculada a uma matrícula, com versão e cronograma preservados. Aprovação no mock não significa mensalidade aplicada no Lyceum. O Outlook terá apenas uma prévia e registro de notificação simulada, sem envio de e-mails.

## Dados e comportamentos reais no frontend

Importe o catálogo completo do kit, sem trocar por uma dúzia de cursos inventados. Os **nomes, diplomas, formatos e selos NOVO são observações do site oficial em 07/10/2026**. Campanhas, valores, turnos, matrículas, personas e registros de não formação são fictícios. Valores-base demonstrativos não são preços do Anchieta.

Use um repositório mock local assíncrono, com JSON inicial e persistência versionada em `localStorage`. TanStack Query consulta esse adaptador; React Hook Form cuida do formulário; filtros ficam na URL; Zustand guarda apenas UI/sessão. Nunca faça fetch real de Lyceum, Outlook ou SSO. Recarregar preserva rascunhos, campanhas, decisões e registros. Um botão discreto nas preferências restaura a demonstração com confirmação dentro do app.

Todos os botões implementam ações: criar, voltar sem perder dados, editar rascunho, duplicar, enviar, aprovar, devolver, revisar, arquivar, marcar/restaurar não formação, pesquisar, limpar filtros e exportar. Simule estados de carregamento/erro/vazio com o `AsyncState` existente. Não use alert() como interface.

A busca “inteligente” é local: ignora acentos, reconhece aliases como ADS, RH, EAD, híbrido e “novo”, combina tokens, usa filtros e apresenta agrupamentos claros; sem IA, embeddings ou chamadas externas. Resultados mais próximos primeiro. RA funciona na tela de alunos, e não vira busca de dados pessoais no catálogo.

## Direção visual

Faça um produto institucional refinado: sidebar do template, canvas branco, hierarquia tipográfica consistente, azul nas ações, filete amarelo discreto, espaços generosos e densidade útil. A página inicial deve ser um catálogo bonito com fotografias de cursos e estado comercial legível. Não use hero de marketing, glassmorphism, gradientes decorativos, cards de KPI gigantes, emojis, gráficos sem necessidade ou layout cheio de explicações técnicas.

Fotos não vieram no kit porque os cartões públicos consultados não expuseram imagens. Tente obter imagens adequadas nas páginas oficiais de cada curso, usando somente conteúdo público e salvando os assets localmente com procedência. Se não for possível, use fotografias de área de estudo devidamente identificadas como ilustrativas; um fallback neutro deve preservar o tamanho e a identidade sem quebrar o layout. Não trate URLs de páginas de curso como URLs de imagens. Nunca invente links de fotos. Priorize enquadramento e legibilidade sobre excesso de imagens. Não deixe placeholders no resultado quando houver imagens acessíveis.

Formulário amplo com resumo lateral, não um modal estreito abarrotado. A visualização mensal usa pequenos blocos e tabela acessível, com isenção como **R$ 0,00 · Isento** e valores não definidos como **Não definido**. A grade de cursos mostra modalidade/formato, selo Novo quando houver, campanha aplicável e ação clara; não exponha um único “preço do curso” se contextos têm ofertas diferentes.

Garanta teclado, foco visível, labels, contraste, estados além da cor, filtros legíveis e menu responsivo. Teste 1440 px, 1280 px, 768 px e 390 px. No mobile, formulário em coluna única; o resumo financeiro continua disponível; somente tabelas podem ter scroll horizontal.

## Ordem de implementação e validação

1. Prepare o template com sessão mock e shell navegável.
2. Importe catálogo e construa Catálogo + Ficha do curso.
3. Implemente formulário, cronograma financeiro, validações e rascunhos.
4. Implemente lista, revisões, aprovação e prévia Outlook simulada.
5. Implemente não formação contextual, alunos e exportações.
6. Ajuste acessibilidade, imagens, responsividade e estados.
7. Execute os critérios de `docs/05-criterios-de-aceite.md`. Use `apoio/domain.mjs` como referência testada para entradas, meses e valores; pode portá-lo ao padrão TypeScript/Zod do template.

Excel precisa ser `.xlsx` válido, não CSV renomeado. PDF precisa baixar um `.pdf` válido, legível e multipágina; não entregue apenas print() ou botão sem função. Escolha bibliotecas de navegador mantidas e compatíveis, registre versões e consulte documentação oficial quando necessário. Ambos exportam somente alunos do contexto/filtro selecionado, com opção explícita de todas as páginas ou linhas selecionadas.

Rode `npm test`, `npm run lint`, `npm run format`, `npm run build` e a checagem TypeScript que efetivamente percorre `tsconfig.app.json` (o template usa referências; `tsc --noEmit` sozinho pode não validar tudo). Corrija os problemas sem desabilitar regras amplamente. Verifique interface no navegador, fluxo completo e downloads. Não afirme que testes ou inspeção passaram sem executar.

Entregue README atualizado com como instalar/rodar, o que é mock, como restaurar os dados e onde TI troca os adaptadores. Informe o que foi concluído, verificações realizadas e bloqueios concretos. **Não implemente backend, envio real de mensagens, banco, cobrança, integrações ou deploy. Não faça push/publicação sem instrução adicional do usuário.**
