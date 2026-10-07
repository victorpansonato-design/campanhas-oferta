# Validação do frontend

Este documento registra a entrega inicial. A rodada de performance, imagens, cadastro e devoluções está documentada em [VALIDACAO-EVOLUCAO.md](VALIDACAO-EVOLUCAO.md).

Executada em 07/10/2026. O documento original de aceite permanece intacto em `campanhas-oferta-kit/docs/05-criterios-de-aceite.md`.

- `npm test`: **28 testes aprovados**, em 5 arquivos. Cobrem os 82 cursos/30 selos/124 ofertas, aliases, códigos de entrada, meses entre anos, dinheiro em centavos, zero, percentuais, lacunas, sobreposição, rascunho incompleto, envio/decisão/concorrência, conflitos, bases congeladas, matrícula vinculada, arquivamento, turnos explicitamente cadastrados, formação contextual e restauração.
- `npm run lint`: passou, sem erros; seis avisos herdados de Fast Refresh em componentes compartilhados.
- `npm run format`: passou.
- `npm run typecheck`: passou nos projetos app e node.
- `npm run build`: passou. Avisos sobre chunks grandes do dataset e do ExcelJS, carregado sob demanda.
- Dev e preview abriram diretamente no catálogo. A rota `/cursos/administracao` foi recarregada no preview e manteve a ficha, sem login ou recursos externos.
- Catálogo, valores, detalhe de aprovação e alunos foram inspecionados nas larguras **1440, 1280, 768 e 390 px**. As 16 medições tiveram largura do documento igual à viewport, sem imagens quebradas e sem recursos externos. Tabelas têm rolagem interna. Capturas e medições locais em `artifacts/`.
- Auditorias axe das quatro telas sem violações detectadas após correções de tema, contraste e regiões semânticas. Isso complementa a inspeção; não constitui certificação completa de WCAG.
- Fluxo no navegador: Arquitetura, ingresso 2027/1; janeiro isento + fevereiro–junho R$ 599; total R$ 2.995; envio; troca para Carolina; aprovação. Estado e objeto de notificação simulada confirmados no armazenamento local.
- Busca ADS retornou Análise e Desenvolvimento de Sistemas; o recorte Biotecnologia Híbrido/2027/21 foi ocultado do catálogo disponível e reapareceu cinza ao incluir sem formação.
- Registro de não formação em Biotecnologia/2027/22 abriu imediatamente sua lista contextual vazia; restauração exigiu motivo e preservou registro/histórico. O recorte /21 permaneceu independente.
- Downloads no navegador para Biotecnologia Semipresencial/Noturno/2027/21: Excel aberto por ExcelJS, com 8 alunos + cabeçalho e aba Contexto; PDF válido com 8 alunos e identificação completa. Arquivos em `artifacts/downloads/`.
- Testes de exportação: seleção de 3 linhas gera somente essas linhas no XLSX, RA textual, primeira linha congelada e aba Contexto; PDF de 85 linhas gera várias páginas, com contatos, cabeçalho e numeração. Vazio bloqueia exportação na interface.

O capturador de downloads do CLI no Windows inicialmente cancelou a gravação. A configuração de download do próprio navegador via CDP permitiu capturar e abrir os arquivos; nenhuma mudança na lógica do produto foi necessária. `scripts/verify-downloads.mjs` é somente um auxiliar local de verificação.

Os dados institucionais de catálogo seguem o retrato fornecido; o restante é demonstração. Não há aplicação de cobrança, autenticação institucional ou envio real de notificações. Não houve deploy ou push.
