# Campanhas e Ofertas — kit de implementação

Este pacote prepara o frontend para execução pelo Codex no VS Code. Não é a aplicação pronta. Foi adaptado ao template fornecido e ao repositório `victorpansonato-design/campanhas-oferta`, que estava vazio na consulta de 07/10/2026.

## Como usar

1. Abra/clone seu repositório `campanhas-oferta` no VS Code.
2. Extraia esta pasta na raiz, mantendo `campanhas-oferta-kit/`.
3. Disponibilize o template original ao Codex, preferencialmente na pasta `referencias-template/` ou como ZIP anexado.
4. Envie o comando abaixo à extensão Codex.

```text
Leia campanhas-oferta-kit/Comando.md e os arquivos referenciados. O template anexado é a base visual e de componentes. Implemente agora o frontend completo neste repositório, com dados mockados e sem backend, concluindo navegação, campanhas, aprovação simulada, não formação de turma e exportações. Preserve a identidade do template e valide os critérios de aceite. Pode fazer as alterações locais necessárias até terminar.
```

## O que há aqui

| Pasta/arquivo | Uso |
|---|---|
| `Comando.md` | Instrução executável para o Codex |
| `docs/` | Jornadas, regras, decisões visuais, contratos e critérios de aceite |
| `dados/catalogo-cursos.json` | Cursos reais, nomes, diplomas, formatos e selo Novo |
| `dados/ofertas-catalogo.json` | Combinações curso × formato permitidas, sem Presencial Integral |
| `dados/entradas.json` | Entradas demonstrativas de 2025 a 2028, com códigos e datas |
| `dados/demo.json` | Campanhas, personas, matrículas e não formação fictícias |
| `dados/catalogo-observado.tsv` | Registro compacto da extração do site oficial |
| `referencias/` | Design system do template e configuração segura de demonstração |
| `apoio/domain.mjs` | Funções de referência para entradas, BRL, meses e conflitos |
| `apoio/domain.test.mjs` | Verificações das funções e dos dados de demonstração |

Para conferir os dados do pacote: `node --test campanhas-oferta-kit/apoio/domain.test.mjs`. Esses testes validam o kit; não substituem os testes da aplicação que o Codex irá implementar.

Os nomes e formatos do catálogo vieram de https://anchieta.br/graduacao/. Os turnos, valores, pessoas, RA e estados de formação são fictícios. Fotografias não estão incluídas. Integrações e aplicação de benefícios no Lyceum ficam para o TI.
