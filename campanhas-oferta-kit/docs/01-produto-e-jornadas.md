# Produto e jornadas

## Problema que orienta a interface

O aluno recebe uma condição na matrícula e depois vê outra mensalidade. O frontend deve dar à Captação uma fonte clara de consulta e um registro legível da oferta aprovada. Centralizar campanhas ajuda a consistência da comunicação; corrigir cobranças automaticamente dependerá das integrações posteriores. Não prometer que o protótipo detecta ou corrige diferenças reais.

## Página inicial: Catálogo

A primeira tela é o trabalho cotidiano, não um painel de indicadores. Cabeçalho “Catálogo de cursos” + descrição curta “Consulte ofertas e organize as próximas entradas” + botão “Nova campanha”. Abaixo: busca ampla, ano e contexto de ingresso. Abas macro “Todos, Presencial, Híbrido, EAD”; quando houver modalidade específica, ofereça somente entradas compatíveis. Em Todos, “Todas as entradas” ou filtro agrupado por modalidade; nunca reutilize 2026/1 para Híbrido ou EAD.

Filtros adicionais discretos: formato do Híbrido, curso novo, diploma, turno, com campanha, sem campanha e formação. Chips removíveis mostram os filtros ativos. Para turno, “Todos os turnos” é distinto de “Turno não cadastrado”. Contagem de cursos únicos e de ofertas quando pertinente; não inflar cursos repetindo cada modalidade.

Um cartão por curso com foto, nome, diploma, selo Novo, modalidades permitidas e resumo comercial do recorte. Ex.: “2 campanhas aprovadas” ou “Sem campanha aprovada”. Se o contexto tem um valor inequívoco, “Fev–jun/2026 · R$ 599/mês”; se varia entre formatos/turnos, “Condições por oferta” + abrir detalhe. Grade padrão, alternância para lista de maior densidade. Abrir cartão leva à ficha; ação “Criar campanha” chega ao wizard com o curso selecionado.

## Ficha do curso

Foto e nome, selo Novo, modalidade e formato, seletor de entrada e turno. Abas locais **Campanhas**, **Formação de turma** e **Histórico**. A página tem uma ação principal “Nova campanha” e ação secundária “Registrar não formação”.

Campanhas mostra cada condição e seus meses, autoria, aprovação e revisão. Estados rascunho/em aprovação não são condições liberadas para divulgação. Um exemplo de matrícula vinculada aparece em seção recolhível “Oferta registrada na matrícula”, com versão preservada e dados fictícios, para mostrar ao TI a necessidade de rastreabilidade.

Não formação nunca é global para o curso: exibir o recorte completo. Histórico permite consultar entradas anteriores sem remover o curso do catálogo atual.

## Criar campanha — quatro passos

| Etapa | O que a gestora faz | Ajuda da interface |
|---|---|---|
| Cursos | Escolhe modalidade, um/vários cursos ou toda a modalidade; refina formato e turno | Busca com seleção múltipla, lista final de ofertas afetadas, quantidade clara |
| Quem pode aderir | Escolhe entrada(s) e, se necessário, data de matrícula de/até | Entradas compatíveis com ano, datas automáticas editáveis, explicação curta |
| Valores por mês | Adiciona “Valor fixo”, “Bolsa percentual” ou “Isenção”, seleciona de/até e valor | Blocos simples, copiar para meses seguintes, resumo imediato |
| Revisar | Confere cursos, elegibilidade e cronograma, acrescenta nome/observação e envia | Texto automático da oferta, alertas precisos, rascunho ou enviar para aprovação |

“Data específica” é prazo de matrícula/adesão, não data de competência. Entrada continua identificando a turma: pode selecionar uma ou mais entradas compatíveis que se sobreponham à janela, sem deduzir a entrada apenas pela data. Janeiro–junho = período do ingresso presencial, não obrigatoriedade de restringir o benefício a esses meses.

Na etapa 3, preferir cartões de regras: “Jan/2027 → Isento”; “Fev/2027 a Jun/2027 → R$ 599,00”. Seletores de mês/ano, e não calendário diário para valores mensais. A visão mensal é gerada; a usuária não digita a mesma regra seis vezes.

Ao aplicar modalidade inteira, permita exceções por curso em uma seção opcional. Se os preços forem iguais, basta valor fixo para todos. Se forem descontos em bases diferentes, a prévia mostra preços por oferta e exige base de referência demonstrativa. Não exigir preencher todas as bases na criação de uma campanha de valor fixo.

Nome pode ser sugerido (“Ingresso 2027/1 — Fevereiro a junho”) e editado. Observação é opcional e não substitui dados estruturados. Condições adicionais comerciais podem ter campo de texto simples, sem editor de regras sistêmicas.

## Aprovação

As duas gestoras podem criar, duplicar e editar seus rascunhos. A aprovadora vê pendências, abre o resumo, consulta o que mudou e aprova ou devolve com comentário. Perfil proponente não aprova a própria proposta. Trocar persona é somente uma facilidade da demonstração, não um mecanismo de autorização real.

Após enviar: “Campanha enviada para aprovação” + “Notificação Outlook simulada”. Em um painel recolhível, mostrar assunto, destinatária fictícia, resumo e link interno. Não escrever “E-mail enviado” nem “Oferta aplicada no Lyceum”. Mudanças posteriores em condição aprovada geram revisão pendente; a condição anterior continua preservada conforme sua vigência.

## Não formação de turma

Na ficha, registrar curso/oferta, modalidade/formato, turno e entrada; motivo predefinido “Número insuficiente de alunos” com observação opcional; data e autora automáticas. Antes de confirmar, mostrar a quantidade de matrículas no recorte. Confirmado: criar registro, atualizar cartão daquele contexto para cinza e abrir a lista de alunos imediatamente. Não exigir aprovação de campanha para essa ação; ela é um fluxo separado.

Na sidebar, **Não formação de turma** mostra registros por ano/entrada/modalidade, total de cursos e alunos, e busca. Curso com duas ofertas sem formação deve ter contextos identificáveis, nunca uma lista misturada. Na entrada afetada, sai da grade padrão de ofertas disponíveis e aparece nesta seção; o catálogo completo pode revelá-lo com “Incluir sem formação” e a ficha permanece acessível. Em nova entrada, volta ao catálogo ativo por padrão, sem apagar o histórico anterior.

Detalhe: identificação completa no topo; tabela com seleção de linhas, RA, nome completo, telefone e e-mail; busca por nome/RA; copiar contato; filtros de turma/turno quando houver. Ausências de contato aparecem como “Não cadastrado”. Telefone e e-mail fictícios não devem iniciar mensagens reais. Menu “Exportar” agrupa Excel e PDF e explicita escopo. Rodapé com quantidade e paginação.

Restaurar formação exige confirmação contextual, registra autora/data e motivo e devolve a oferta ao catálogo no recorte; a trilha anterior permanece. Não apagar matrículas, cancelar contratos, devolver valores ou mandar mensagens como efeito dessa ação visual.
