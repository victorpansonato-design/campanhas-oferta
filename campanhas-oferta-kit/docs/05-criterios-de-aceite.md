# Critérios de aceite da aplicação

Marque cada item após verificar; este arquivo começa como plano, não prova de testes executados. O kit foi validado separadamente pelas funções e testes em `apoio/`.

## Fluxos indispensáveis

1. Abrir dev e build/preview diretamente no Catálogo, sem backend/login/SSO. Recarregar rota interna funciona com a estratégia de roteamento/development escolhida.
2. Mostrar todos os 82 cursos do catálogo, 30 com selo Novo, sem criar ofertas Presencial Integral. Contagens de cursos e ofertas têm conceitos separados. Enfermagem permanece pelo formato Intensivo.
3. Buscar “ADS”, “rh”, “hibrido”, nome sem acento e “novo ead” com resultados coerentes; limpar filtros funciona. RA busca apenas alunos no contexto.
4. Criar campanha por um curso, vários cursos e modalidade. Pré-seleção da ficha funciona; escopo mostra formatos e turnos. Trocar modalidade invalida códigos de entrada incompatíveis.
5. Presencial só oferece /1 e /2; Híbrido /21–24; EAD /71–74. Alterar ano gera novos códigos. Fevereiro de ano bissexto e dezembro–janeiro funcionam.
6. Digitar janeiro isento e fevereiro–junho R$ 599 gera seis parcelas e total R$ 2.995,00. R$ 0,00 não vira campo vazio. Tipo percentual exige base e calcula valor final correto; falta de base bloqueia envio e explica contexto afetado.
7. Salvar rascunho incompleto; sair, recarregar e voltar sem perda. Mudanças nos meses aparecem imediatamente no resumo, sem valores antigos após mudar regra.
8. Regras sobrepostas na mesma competência dão erro junto da regra. Meses sem condição ficam explícitos. Valor negativo, percentual acima de 100%, intervalo invertido e entrada incompatível são rejeitados. Uma entrada trimestral aceita benefício até dezembro.
9. Enviar proposta muda para Em aprovação. A fila da persona aprovadora recebe; proponente não aprova própria condição. Outlook mostra **simulação**, sem envio real.
10. Devolver exige comentário e torna proposta editável. Aprovar preserva número/autora/data. Duplo clique não duplica decisão; revisão desatualizada não aprova silenciosamente.
11. Editar condição aprovada cria outra revisão; enquanto pendente, condição anterior continua visível. Matrícula fictícia vinculada à versão anterior mantém seu valor, mesmo após aprovar revisão nova/arquivar campanha.
12. Proposta conflitante identifica contexto, janela e meses. Não acumula bolsa nem escolhe preço automaticamente. Resolver o conflito libera envio/aprovação conforme estado.
13. Registrar não formação em Biotecnologia Híbrido/21: foto cinza naquele recorte, registro na seção lateral e lista de alunos abre imediatamente. Outra entrada/turno/modalidade do mesmo curso não é afetada. Curso Novo não vira automaticamente sem formação.
14. Lista mostra RA, nome completo, telefone e e-mail; contatos ausentes estão legíveis; busca, seleção e paginação funcionam. Reverter registro restaura o recorte e mantém histórico, sem excluir aluno ou campanha.
15. Excel e PDF baixam arquivos válidos; RA e telefone permanecem texto; export filtrado/selecionado contém quantidade correta, mesmo em múltiplas páginas. PDF preserva curso/modalidade/formato/turno/entrada e contatos completos. Testar vazio e mais de uma página.

## Qualidade visual e operacional

- Catálogo, valores, aprovação e alunos revisados em 1440/1280/768/390 px. Nenhuma página tem scroll horizontal global; tabelas podem rolar localmente.
- Identidade do template preservada (fontes, tokens, shell, logo, foco, botões e semântica de cor).
- Sem fotos quebradas; assets locais e fallback correto; imagens sem formação cinza e texto com contraste.
- Combobox, passos e dialogs operam por teclado; foco visível/retornado; confirmação modal não deixa clicar no fundo.
- Todos os estados carregamento/vazio/erro têm feedback e ação de recuperação; nenhum botão principal decorativo.
- Discreta marca de demonstração; sem debug UI ou vocabulário de backend no fluxo da gestora.
- Dados de demonstração persistem; reset explícito restaura somente dados do sistema, não todo localStorage do navegador.
- Sem requisições reais para SSO/Lyceum/Outlook; nenhum `.env` real/credencial do template copiado.
- README da aplicação atualizado; teste, lint, format, TypeScript app e build executados. Erros pré-existentes identificados e corrigidos quando impedirem a entrega.

## Testes com valor

Priorizar regras financeiras, intervalos/contextos, preservação de revisão, matrícula vinculada, lista contextual e escopo de exportação. Verificar um fluxo completo criar→enviar→aprovar e não formação→filtrar→exportar. Evitar dezenas de testes triviais de classes/ícones. As funções de referência têm testes independentes; a aplicação precisa validar sua própria implementação e seus downloads.
