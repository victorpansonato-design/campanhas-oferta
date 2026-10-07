# Direção visual e uso do template

## Fonte de verdade

O ZIP `template(1).zip` foi analisado. Reutilizar tokens e componentes; `referencias/DESIGN-SYSTEM-template.md` é cópia do documento do template. No projeto, CSS e componentes locais são a referência final. Não reinterpretar a marca com uma paleta nova.

| Elemento | Decisão |
|---|---|
| Shell | Sidebar inset com marca, canvas branco elevado e header enxuto do template |
| Cor de ação | `--primary = --brand-blue = oklch(39.341% 0.16812 263.91)` |
| Marca | Logotipo/assets originais do template; filete amarelo existente |
| Tipografia | Inter no corpo; JetBrains Mono nos títulos/identificadores conforme template |
| Ritmo | Espaçamento em múltiplos de 4; margens desktop ~32; gaps de grupos 24–32 |
| Controles | Botão/input 40 px; foco visível; labels do template; erros junto ao campo |
| Cartões | Raio 12 px, bordas sutis, sombra contida; fotografia com enquadramento consistente |
| Badges | Novo, aprovação e formação em texto + cor; sem arco-íris por modalidade |
| Movimento | Motion curto e discreto, respeitando reduced motion; sem animação contínua |

## Composição do Catálogo

Área útil ampla. Uma linha de título e ação. Uma linha de busca/filtros. Abas de modalidade. Grade com 3 colunas onde cartões permanecem confortáveis (1440 px), 2 em largura intermediária e 1 no celular. Prefira 3 cartões bons a 5 comprimidos. Foto horizontal (aprox. 16:9), nome legível em até 2 linhas, texto secundário curto, resumo da condição e rodapé com ação. Os cartões não são anúncios; evitar descrever o curso inteiro.

Quando não formou turma, aplicar grayscale na fotografia e selo “Não formou turma · 2027/1”; texto e controles mantêm contraste. Não reduzir a opacidade do cartão inteiro ou tornar informações ilegíveis. No catálogo Todos, um contexto sem formação não desabilita o curso inteiro. Na aba específica, aplicar o comportamento daquele recorte.

## Formulário

Página larga em duas colunas: editor ~2/3, resumo ~1/3. Stepper horizontal de quatro passos com rótulos claros. Dentro de cada passo, 1 ou 2 grupos essenciais, ajuda contextual de uma linha e opções avançadas recolhidas. Resumo sticky dentro do scroll do canvas, sem encobrir conteúdo; seletor do contexto de preço quando houver múltiplos. Rodapé do formulário: “Salvar rascunho”, “Voltar”, “Continuar/Enviar para aprovação”.

Visão mensal com valores tabulares, isenção explícita, meses não definidos e totais somente do horizonte informado. No resumo final: “Para matrículas de 01/01/2027 a 31/01/2027, ingresso 2027/1. Janeiro isento. Fevereiro a junho: R$ 599,00/mês.” Texto curto, sem combinar janela e benefício em uma mesma data ambígua.

## Aproveitar componentes existentes

`PageHeader`, `SectionHeading`, `SearchInput`, `ComboBox`, `Command`, `Badge`, `Card`, `Table`, `Select`, `DatePicker`, `Calendar`, `Callout`, `EmptyState`, `AsyncState`, `Dialog`, `Sheet`, `Tooltip`, `Form` e `Toaster` já existem. Use modal para confirmação curta e sheet para prévia, não para todo o wizard. Não pressupor APIs do shadcn upstream: inspecionar assinaturas locais.

O `SearchInput` do template tem largura limitada a 384 px; no Catálogo, adaptar/compor para busca ampla sem alterar globalmente a aparência de todas as telas. O `Sheet` padrão também é estreito; prévia financeira maior pode precisar largura apropriada. O CSS define regras globais de pointer-events para overlays; verificar isolamento de foco e impedir interação com a página de fundo em dialogs.

## Pontos técnicos encontrados

- `src/main.tsx` envolve o app em `AuthProvider` real; não basta esconder a tela de login.
- `src/routes/app.routes.tsx` usa `BrowserRouter` com base configurável e `PrivateRoute`; adaptar ao mock.
- Vite e `src/config/env.ts` usam `/template/` como fallback. Alinhar base `/` no demo para evitar página em branco.
- `MainLayout` usa `h-svh` e scroll interno: ajustar navegação, sticky e overlays nesse scroll.
- `npm run typecheck` está definido como `tsc --noEmit`, com tsconfig raiz referenciando projetos. Acrescentar execução sobre o projeto app, se necessário.
- Os arquivos `.env` reais do ZIP não foram usados e não fazem parte deste kit.

## Acessibilidade e refinamento

Leitura por teclado: filtros, combobox com multisseleção, stepper, regras mensais, ações e tabela. Escape fecha overlay, foco retorna à origem, erros são anunciados e resumo tem título. Não depender apenas de tooltip para informação obrigatória. Botões icon-only têm aria-label; imagem tem texto alternativo pertinente ou alt vazio quando decorativa. Preferir descrição “Fisioterapia — Semipresencial” a um slogan.

Em 390 px, manter ações acessíveis e header enxuto; sidebar em drawer. Fontes de leitura 14 px ou mais; metadados discretos não carregam informação essencial. Capturar e revisar Catálogo, etapa Valores por mês, Aprovação e Alunos sem formação em desktop e mobile antes de concluir.
