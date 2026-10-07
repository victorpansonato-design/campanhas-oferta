# Catálogo, campanhas e condição comercial — 07/10/2026

## Entrega

- Campanhas abre somente com aprovadas e permite trocar manualmente o estado; busca pelo curso, filtro de modalidade e ano combinados no mesmo contexto.
- Campanha com nova revisão pendente mantém a revisão aprovada na listagem. Ao abrir a campanha, a revisão exibida no card continua selecionada.
- Fotos do catálogo com recorte horizontal compacto; ficha do curso com faixa fotográfica, nome sobre a imagem e valores abaixo, sem substituir a base do template.
- Contrato, bolsa e mensalidade identificados por oferta, turno e ano. Tabela local provisória de 2027 em `src/data/commercial-pricing.json`, cobrindo as 124 ofertas. Administração presencial noturno: 199605 centavos, 5500 pontos-base, mensalidade arredondada de 89822 centavos.
- Nova campanha começa com um mês de benefício, respeitando o mês de ingresso e cobrança até dezembro. O restante usa a condição comercial padrão automaticamente, identificada na prévia. Lacunas internas, sobreposições e preços ausentes continuam inválidos.
- Bolsa percentual da campanha significa a bolsa total sobre o contrato. Não é somada ao percentual padrão.
- Novos envios congelam contrato e bolsa anual por contexto. Condições legadas aprovadas e valores prometidos nas matrículas continuam preservados.
- Benefício presencial acima de dois meses exibe aviso. O bloqueio não foi adotado sem confirmação da regra.
- PDF individual no card e no detalhe, com a revisão selecionada, identidade institucional, contrato, bolsa, períodos e condições. Paginação testada para campanha extensa; nenhum aluno ou outra campanha entra no relatório.

## Verificação

- `npm test`: 53 testes aprovados em 10 arquivos, incluindo busca por curso, filtros, revisão aprovada com pendência, arredondamento, retorno automático à bolsa padrão, congelamento dos preços, PDF individual e paginação.
- `npm run typecheck`: aprovado.
- `npm run lint`: sem erros; seis avisos preexistentes de Fast Refresh nos componentes do template.
- `npm run build`: aprovado; aviso preexistente de tamanho do pacote de exportação Excel e aviso de tempo de minificação.
- Navegador: 1440 × 1000 e 390 × 844, temas claro e escuro. No celular, largura do documento igual à viewport e nenhuma imagem quebrada.
- Cadastro real no navegador: Administração 2027/2, julho isento, agosto a dezembro R$ 898,22; total R$ 4.491,10. Envio cria diretamente uma campanha em aprovação e conserva o cronograma ao recarregar.
- Filtros combinados no navegador: Administração + Presencial, alternando aprovada, em aprovação e todos. Contagens incluem o registro criado durante o teste, isolado na sessão automatizada.
- Axe: zero violações nas telas de curso, campanhas e detalhe. No tema claro, os textos sobre a fotografia precisam de avaliação visual porque o Axe não resolve o fundo com pseudo-elemento; a faixa escura mantém a legibilidade. No tema escuro, zero verificações incompletas na ficha do curso.
- Download pelo botão confirmado no histórico do Chrome. O comando auxiliar de download da automação apresentou falha de caminho no Windows; o arquivo baixado pelo clique normal foi copiado para os artefatos e renderizado para conferência visual.

## Evidências

- `artifacts/evolucao-curso-desktop-final.png`
- `artifacts/evolucao-curso-mobile-final.png`
- `artifacts/evolucao-campanhas-desktop.png`
- `artifacts/evolucao-campanhas-mobile.png`
- `artifacts/campanha-individual.pdf`
- `artifacts/campanha-individual-pdf.png`

## Integração

A tabela anual é um substituto local autorizado enquanto a tabela real não estiver disponível. Não há conexão ativa com Lyceum. Preços de outro ano ou de turno não cadastrado não são inferidos da tabela de 2027. Na integração, manter os campos `ano`, `ofertaId`, `turno`, `valorContratoCentavos` e `bolsaComercialBps`, e preservar os snapshots das revisões já enviadas.
