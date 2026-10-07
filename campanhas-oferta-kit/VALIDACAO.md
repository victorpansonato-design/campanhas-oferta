# Validação do kit

Verificado em 07/10/2026. Este pacote é o material de execução para o Codex no VS Code; a aplicação frontend será construída nessa próxima etapa.

- Catálogo: 82 ids únicos, 30 selos Novo e 124 combinações de curso/formato no escopo.
- Presencial Integral excluído das ofertas; cursos com outro formato preservados.
- 40 entradas exemplificadas de 2025 a 2028; geração de novos anos prevista.
- 8 campanhas demonstrativas, com revisão pendente, conflito, valores fixos, bolsa percentual, rascunho e histórico.
- 4 registros ativos de não formação, 32 alunos fictícios e um registro revertido; uma matrícula adicional exemplifica oferta vinculada e congelada.
- Referências entre cursos, ofertas, entradas, contextos, bases, matrículas e campanhas verificadas.
- 13 testes de referência passaram, incluindo meses entre anos, valores pt-BR, isenção, percentuais, sobreposição e isolamento da não formação por contexto.

Comando executado: `node --test campanhas-oferta-kit/apoio/domain.test.mjs`.

Não foram executados build, testes visuais ou exportações da aplicação, pois ela não é um entregável implementado neste kit. Esses requisitos estão definidos para execução pelo Codex em `docs/05-criterios-de-aceite.md`. Nenhuma integração real, publicação ou alteração no repositório foi realizada.
