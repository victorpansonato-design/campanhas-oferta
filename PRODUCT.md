# Campanhas e Ofertas · UniAnchieta

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Duas gestoras de Captação propõem campanhas e uma gestora responsável aprova. As proponentes precisam vender e cadastrar condições rapidamente, sem aprender códigos financeiros ou configurar motores de regras.

## Product Purpose

Consultar cursos e ofertas, propor campanhas mensais, aprovar condições preservando a promessa vinculada à matrícula e tratar alunos de turmas que não se formaram.

## Operating Context

Catálogo institucional fornecido: 82 cursos, 124 ofertas operacionais, 30 selos Novo. Presencial Integral fica fora das ações. Curso, oferta, entrada e contexto de turma têm identidades distintas. A interface traduz as decisões comerciais em regras verificadas automaticamente.

Na não formação, a equipe recebe a relação de alunos e oferece outro curso ou encaminha devolução. O usuário confirmou três ações: contato realizado, aceitou outro curso e solicitar devolução. O recebedor pode ser o aluno ou um responsável financeiro; o sistema financeiro informa quem é o titular permitido.

## Capabilities and Constraints

- RAs têm exatamente sete dígitos e permanecem texto, inclusive nas exportações.
- Pix aparece como primeira opção; transferência bancária é a alternativa.
- O saldo disponível para devolução deve aparecer com clareza, em verde. Solicitação e andamento ficam vinculados à linha do aluno; pagamento confirmado termina como Devolvido.
- Elegibilidade, prazo de adesão e mensalidades são separados. Sem conflito ou preenchimento implícito de valores não definidos.
- Aprovação e revisões existentes permanecem necessárias; simplificar a interface não significa dispensar essas verificações.
- A entrega é frontend com dados fictícios e persistência local, contrato de integração financeira e saldo confirmado pelo adaptador demonstrativo. A conexão real depende do serviço financeiro institucional.
- O cadastro reúne os campos em uma página, com opções adicionais recolhidas e resumo mensal permanente.
- Não há rascunhos nem salvamento intermediário. Criar a campanha e enviar para aprovação é uma única operação; preenchimentos inválidos não criam registros. Duplicação apenas preenche um novo formulário.
- Curso, campanha e aprovações priorizam condições e valores em leitura vertical; mensalidades iguais são agrupadas por período, com detalhamento mensal disponível.
- Os registros de exemplo permanecem, sem avisos de demonstração na interface e nas exportações.
- Campanhas abre nas condições aprovadas. Busca por curso (incluindo aliases), modalidade, estado e ano devem combinar no mesmo contexto. Uma revisão pendente não retira a condição já aprovada da lista.
- Cada oferta, turno e ano tem contrato e bolsa comercial anual. Para ingressantes de 2027, Administração presencial noturno usa contrato de R$ 1.996,05, bolsa de 55% e mensalidade de R$ 898,22; os demais preços são provisórios até a tabela institucional.
- A campanha define os primeiros meses. O cadastro preenche explicitamente o período restante com a bolsa comercial padrão até o fim da cobrança; lacunas e sobreposições continuam inválidas. No presencial, benefício acima de dois meses gera aviso, sem bloqueio enquanto a regra não for confirmada.
- Cada campanha exporta somente sua revisão selecionada, com contrato, bolsa, mensalidades e condições, no padrão institucional de PDF. Os preços usados em novos envios ficam congelados na revisão.

## Brand Commitments

Preservar identidade e componentes do template Anchieta. Fotografias devem corresponder às páginas oficiais dos cursos. A fluidez do sistema de Sucesso ao Aluno é referência de comportamento. PDF e Excel anexados são referências visuais de exportação, sem reaproveitar seus alunos ou fatos operacionais.

## Evidence on Hand

- Kit original em `campanhas-oferta-kit/`.
- `AUDITORIA-IMAGENS.md`: conferência de 82 páginas e banners oficiais aplicados, com manifesto e variantes responsivas.
- `artifacts/lighthouse-antes.json`: diagnóstico do build atual, Lighthouse móvel 13.5.0.
- Vídeo `C:/Users/victor.pansonato/Downloads/campanhas-oferta-kit/ref_fluidez.mp4`, 18,52 segundos; quadros extraídos em `artifacts/`.
- PDF `C:/Users/victor.pansonato/Downloads/aaaaaaa.pdf` e Excel `C:/Users/victor.pansonato/Downloads/monitoramento-2026-10-04-20261007-1243.xlsx`.
- Referência de navegação: https://sucesso-ao-aluno.vercel.app/#/cockpit.

## Product Principles

- A gestora informa decisões comerciais; o sistema calcula, valida e organiza os detalhes.
- Um próximo passo claro por tarefa, com aprofundamento disponível quando necessário.
- Mostrar resultado e pendências em linguagem operacional.
- Preservar dados ao navegar e evitar trabalho repetido.
- Confirmar saldo, titularidade e pagamento a partir do sistema responsável.

## Accessibility & Inclusion

Teclado, foco visível, rótulos, contraste, informação além da cor e redução de movimento. Layouts em 1440, 1280, 768 e 390 px, com rolagem horizontal somente dentro de tabelas.
