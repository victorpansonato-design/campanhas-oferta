# Campanhas e Ofertas · Grupo Anchieta

Frontend interno completo e navegável, construído a partir do template anexado. React 19, TypeScript, Vite 8, Tailwind 4, Radix/shadcn, Lucide, Motion, React Hook Form/Zod, TanStack Query e Zustand.

## Executar

Use Node 22.12+ (validado com Node 24) e npm.

```sh
npm ci
npm run dev
```

Abra a URL exibida pelo Vite. A raiz redireciona para `/catalogo`, sem login. Para conferir a versão compilada:

```sh
npm run build
npm run preview
```

Não é necessário criar um `.env`. `src/config/env.ts` concentra modo mock, base `/`, relógio comercial `2026-10-07` e chave de persistência. `.env.example` documenta `VITE_DATA_MODE=mock` e `VITE_BASE_URL=/`. O projeto entregue é deliberadamente mock; mudar uma variável não ativa integrações reais. Vite dev/preview suportam recarga das rotas internas; `public/.htaccess` fornece o fallback para um eventual servidor Apache. Outros servidores estáticos precisam encaminhar rotas da SPA para `index.html`.

## Fluxos disponíveis

- Catálogo completo: 82 cursos únicos, 124 ofertas permitidas e 30 selos Novo. Busca local sem acentos, aliases ADS/RH/EAD/Híbrido/Novo, filtros na URL, grade/lista e paginação.
- Ficha do curso: modalidade, formato, entrada e turno; campanhas e cronograma; formação e histórico; matrícula demonstrativa com revisão e parcelas congeladas.
- Campanhas: filtros, consulta de revisões, duplicação, edição de rascunho, arquivamento e histórico.
- Cadastro em uma página: um curso, vários cursos ou modalidade inteira; opções adicionais recolhidas; entradas compatíveis e novos anos; adesão separada da cobrança; valor fixo, percentual, isenção e base confirmada; atalho para isentar o primeiro mês; taxa de matrícula separada; resumo mensal por oferta.
- Aprovação: envio, comparação de versões, aprovação/devolução com comentário, verificação de conflitos e revisão esperada. Troque entre Ana Martins e Beatriz Souza (proponentes) e Carolina Costa (aprovadora) no rodapé do menu.
- Não formação: registro/reversão por oferta, turno e entrada; fotografias cinza; lista contextual com RA, nome, telefone e e-mail; pesquisa e contatos ausentes; copiar contato, seleção e paginação.
- Exportações locais: Excel `.xlsx` e PDF A4 paisagem com cabeçalho repetido e numeração de páginas. Escopo explícito entre todos os resultados filtrados e linhas selecionadas, inclusive de outras páginas.

## Dados e restauração

`campanhas-oferta-kit/` preserva os documentos e JSON recebidos, fora de `src`. Nomes, diplomas, formatos e selos vêm do retrato fornecido do site oficial em 07/10/2026. Turnos, bases, campanhas, alunos, personas e formação são fictícios. Presencial Integral é excluído das ofertas operacionais; Presencial Intensivo e Semipresencial pertencem a Híbrido e continuam distinguíveis.

O repositório assíncrono usa `anchieta.campanhas.v1`, validado por Zod, em `localStorage`. A edição em andamento também é preservada em `anchieta.editor.v1.*`, incluindo ao sair pela navegação. Para uma campanha aparecer na lista como rascunho, use **Salvar rascunho**. A sessão e a aparência têm chaves separadas e Zustand armazena somente essas preferências. Dados incompatíveis mostram erro recuperável, sem apagar tudo silenciosamente.

**Preferências → Restaurar demonstração → Confirmar restauração** restaura campanhas, decisões, registros e buffers de edição; outras aplicações no navegador permanecem intactas. Nas preferências há aparência clara/escura/sistema e uma simulação de falha de consulta para verificar o `AsyncState` e a recuperação.

O relógio comercial fixo deriva os estados Agendada/Em adesão/Adesão encerrada. Eventos de novas ações usam o instante real; datas civis não são deslocadas por UTC. O horizonte financeiro pode passar da entrada ou cruzar anos. Meses sem condição permanecem **Não definido**, zero é **R$ 0,00 · Isento**, e cada contexto precisa de base demonstrativa quando usa percentual. Aprovar não aplica uma mensalidade no Lyceum. As notificações Outlook são apenas objetos locais de prévia, sem envio.

## Imagens e tipografia

71 fotografias públicas foram obtidas das páginas oficiais e salvas em `public/images/cursos/`. `procedencia.json` e `src/lib/image-sources.json` registram página, URL efetiva do asset, data e uso ilustrativo. Fotografias genéricas do acervo e a reutilização do banner de Administração aparecem identificadas como **Fotografia ilustrativa**. Falhas de carregamento têm fallback neutro. `scripts/collect-images.py` reproduz a coleta (Python + Pillow), sem modificar o catálogo factual; imagens já estão incluídas e não é necessário rodar o script.

Inter e JetBrains Mono são servidas localmente por `@fontsource`; não há dependência de Google Fonts durante o uso. Tokens OKLCH, logo, sidebar, foco e componentes do template foram preservados.

## Fronteira para o TI

`src/services/repositories.ts` define os contratos `CatalogRepository`, `CampaignRepository`, `FormationRepository` e `EnrollmentRepository` e seu adaptador local. TanStack Query acessa esse adaptador em `src/hooks/use-demo.ts`; as páginas não dependem de Lyceum ou Microsoft Graph. Os schemas e tipos estão em `src/types/domain.ts`; calendário, finanças, elegibilidade e conflitos estão em `src/lib/domain.ts`.

Para a integração futura, substitua o adaptador e a sessão mock em `src/contexts/auth/auth-context.tsx` / `src/services/auth.service.ts`. O Axios herdado está protegido contra requisições no modo mock. Mapear ids institucionais, obter preços oficiais, autorização real, vincular promessa à matrícula, aplicar cobrança e enviar notificações continuam sendo responsabilidades futuras do TI. Os exemplos mantêm `lyceumCursoId`/`lyceumOfertaId` nulos.

As revisões aprovadas e devolvidas não são editadas silenciosamente: uma edição cria outra revisão. A revisão aprovada anterior permanece consultável enquanto a seguinte aguarda decisão. Bases para bolsas são congeladas no envio, de modo que uma atualização da referência não recalcula uma condição anterior. Matrículas conservam suas parcelas independentemente de nova aprovação ou arquivamento. O repositório serializa mutações, verifica o estado e o número esperado e impede decisões duplicadas. Conflitos entre propostas/aprovadas bloqueiam aprovação; rascunhos são avisos e não recebem prioridade automática.

Exportações em `src/lib/exports.ts`: ExcelJS **4.4.0**, jsPDF **4.2.1** e jsPDF-AutoTable **5.0.8**, carregados sob demanda. O modelo reaproveita o logo e a identidade dos anexos. XLSX possui abas Resumo e Alunos, RA de sete dígitos como texto, autofiltro e cabeçalho congelado na linha 11. PDF possui cabeçalhos repetidos e paginação. Ambos incluem atendimento, andamento financeiro e protocolo, respeitando o recorte selecionado.

`src/services/refund-contract.ts` define a fronteira com o sistema de devoluções. Na demonstração, o adaptador consulta saldo e titulares permitidos, valida Pix/transferência, impede pedidos duplicados e acompanha o protocolo. Para testar a conclusão, abra Acompanhar no perfil Carolina Costa e expanda Simular confirmação do financeiro. O estado Devolvido exige todas as etapas anteriores. Essa simulação não executa pagamento real. Atendimento e aceite de outro curso são registrados na linha do aluno; a transferência acadêmica continua dependendo do sistema institucional.

As 82 fotografias correspondem aos banners ativos das páginas oficiais em 07/10/2026. `src/data/verified-course-images.json` registra as origens; `scripts/build-verified-images.py` gera 320/640/1280 px e a procedência. `collect-images.py` agora usa esse manifesto, sem escolher fotos genéricas.

## Verificação

```sh
npm test
npm run lint
npm run format
npm run typecheck
npm run build
```

`typecheck` percorre `tsconfig.app.json` e `tsconfig.node.json`. Os testes verificam cálculos, calendário, escopo, conflitos, persistência, versões/matrícula, formação e arquivos reais. Lint conserva as regras do template e pode mostrar seis avisos preexistentes de Fast Refresh nos componentes compartilhados; não há desabilitação ampla de regras. Build pode avisar sobre os chunks grandes do dataset demonstrativo e do ExcelJS, que tem importação sob demanda.

Inspeção de navegador com agent-browser: catálogo, valores, aprovação e alunos nas larguras 1440, 1280, 768 e 390; sem scroll horizontal global, imagens quebradas ou recursos externos nesses recortes. As tabelas rolam localmente. Auditoria axe das quatro telas sem violações detectadas após ajustes. Fluxo criar → enviar → aprovar executado e arquivos Excel/PDF baixados e conferidos. `scripts/browser-validation.ps1 -Origin <URL>` reproduz a inspeção responsiva e salva evidências em `artifacts/` (ignorado no Git).

Não foi implementado backend, banco, cobrança, SSO, envio de mensagem ou deploy. Nenhum push ou publicação foi realizado.
