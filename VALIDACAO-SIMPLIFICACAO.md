# Simplificação de curso e aprovações

## Comportamento

- Curso, campanha e fila de aprovação usam leitura vertical, com valores maiores e detalhes secundários recolhidos.
- Mensalidades consecutivas com a mesma condição e valor aparecem por período. O detalhamento mês a mês continua disponível, inclusive para valores ainda não definidos.
- Criar e enviar para aprovação é uma única operação. Uma campanha inválida não gera registro, evento ou notificação.
- Duplicar abre um formulário preenchido; cancelar não cria uma campanha.
- Rascunhos antigos e seus buffers de edição são removidos. Revisões aprovadas, decisões e ofertas registradas em matrículas permanecem preservadas.
- O controle de isenção da taxa de matrícula foi removido. Revisar uma campanha preserva a condição de taxa já registrada.
- Textos de demonstração foram retirados da interface e das exportações. Os registros de exemplo continuam disponíveis.
- Cores, fontes, navegação e componentes do template foram mantidos. A referência externa orientou hierarquia, contraste e redução de molduras.

## Verificação

- TypeScript e formatação dos arquivos alterados: sem erros.
- 42 testes passaram, incluindo envio atômico, concorrência, migração, revisões, matrículas e exportações.
- Build de produção concluído. Permanecem os avisos de tamanho dos bundles de exportação.
- ESLint sem erros; seis avisos existentes de Fast Refresh nas primitivas do template.
- No navegador: criar → devolver para ajuste → reenviar → aprovar, troca de perfil e expansão do detalhamento mensal.
- Inspeção visual em 1440 × 1000 e 390 × 844; curso também conferido no tema escuro. Sem rolagem horizontal na página em 390 px.
- Axe WCAG 2 A/AA: nenhuma violação nas telas verificadas de curso, aprovações e campanha; curso conferido nos dois temas.
- Detector mecânico de interface: nenhuma ocorrência.

Capturas disponíveis em `artifacts/curso-desktop.png`, `artifacts/curso-mobile.png`, `artifacts/curso-escuro.png`, `artifacts/aprovacoes-desktop.png`, `artifacts/aprovacoes-mobile.png` e `artifacts/formulario-desktop.png`.
