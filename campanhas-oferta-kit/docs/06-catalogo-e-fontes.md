# Catálogo e fontes

**Data da verificação:** 07/10/2026. **Fonte:** https://anchieta.br/graduacao/.

A página usa carregamento progressivo. A consulta percorreu os cartões de Administração a Terapia Ocupacional e identificou **82 cursos únicos, 30 com selo NOVO**. O número promocional “+64” do cabeçalho não foi usado como contagem do catálogo. As URLs de detalhe, diplomas, etiquetas de formato e selo foram registrados conforme os cartões.

O site chama as categorias de **Formatos**. O sistema agrupa “Presencial Intensivo” e “Semipresencial” em Híbrido conforme instrução do usuário, preservando o formato original. “Presencial Integral” consta no registro de origem, mas está excluído das ofertas operacionais.

Não houve consulta ao Lyceum. A publicação no site não comprova turno, preço, turma formada ou alunos matriculados. A ausência de selo NOVO significa somente que o selo não foi observado no cartão; não comprova uma turma já em andamento. Na interface, distinguir “Curso novo” de “Formação de turma” e de “Campanha em adesão”.

As fotografias não foram extraídas: os cartões consultados não expuseram imagem de curso no DOM. `imagem: null` é intencional; Codex deverá buscar imagens públicas adequadas nas páginas oficiais de detalhe ou adotar fallback/ilustração com procedência. Não inventar URLs ou alegar que imagens foram conferidas.

## Arquivos de evidência

- `dados/catalogo-observado.tsv`: transcrição dos campos factuais de cada cartão (sem descrições de marketing).
- `dados/catalogo-cursos.json`: registro estruturado com fonte, verificação e aliases locais.
- `dados/ofertas-catalogo.json`: normalização para o escopo do sistema.
- `docs/catalogo-conferido.md`: relação dos cursos e formatos permitidos para consulta humana.

## Template e repositório

O arquivo de referência analisado foi `template(1).zip`, fornecido pelo usuário. Sua stack, tokens, componentes e autenticação foram examinados. Apenas o design system foi copiado para este kit; o template original deve ser anexado para a implementação.

Repositório consultado pelo plugin GitHub: https://github.com/victorpansonato-design/campanhas-oferta. Estava vazio (branch padrão main; consulta ao conteúdo informou “This repository is empty”). Nenhuma alteração, commit, push, issue ou PR foi feita nesta etapa.

## Atualização posterior

Este catálogo é um retrato datado, não scraping em tempo real dentro do app. Ao atualizar, comparar inclusões, remoções, formatos e selo por curso; preservar ids e histórico. Uma remoção do site não apaga a promessa de campanha anterior nem alunos/registro de formação. Validar os turnos e o mapeamento Lyceum com TI/Captação antes da integração.
