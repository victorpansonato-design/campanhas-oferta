# Regras e estados visuais

As regras a seguir são propostas para o protótipo, não políticas comerciais confirmadas da instituição. Onde houver decisão operacional futura, conservar o comportamento conservador descrito e documentar para o TI.

## Identidades distintas

| Conceito | Identidade/atributos | Não confundir com |
|---|---|---|
| Curso | slug estável, nome, diploma, Novo | Oferta de uma modalidade |
| Oferta | curso + modalidade + formato do site | Entrada ou preço único do curso |
| Contexto de turma | oferta + turno + entrada (+ polo/campus quando fornecido) | Estado global do curso |
| Campanha | id + nome + revisões + autoria | Benefício aplicado no Lyceum |
| Revisão | escopo congelado + elegibilidade + regras mensais | Edição silenciosa da promessa anterior |
| Registro na matrícula | matrícula + campanha/revisão + cronograma congelado | Campanha corrente calculada hoje |

Presencial Integral está fora de todas as ações. Sua presença em `formatosOriginais` só documenta o site; as ofertas importadas o excluem. Não excluir Biomedicina/Fisioterapia/Medicina Veterinária/Psicologia inteiros, pois também têm formatos permitidos. Enfermagem entra somente pelo Presencial Intensivo.

## Entradas e calendário

| Modalidade interna | Formatos do site | Sufixos | Períodos |
|---|---|---|---|
| Presencial | Presencial | /1, /2 | jan–jun; jul–dez |
| Híbrido | Semipresencial; Presencial Intensivo | /21, /22, /23, /24 | jan–mar; abr–jun; jul–set; out–dez |
| EAD | EAD | /71, /72, /73, /74 | jan–mar; abr–jun; jul–set; out–dez |

Sempre armazenar ano e código completo, ex. `2027/21`. Gerar novos anos, não hardcodar 2026. Datas são civis ISO sem horário e competências `YYYY-MM`; formato pt-BR na UI. Intervalos inclusivos; último dia de fevereiro correto. Use America/Sao_Paulo para comparar “hoje”, sem deslocar datas civis por UTC.

Elegibilidade combina entradas selecionadas **e**, quando ativa, janela de matrícula/adesão. Janela específica deve cruzar ao menos uma entrada escolhida; se for comercialmente desejável matrícula anterior ao trimestre, permitir exceção explícita com explicação, não alterar código de entrada automaticamente. No mock, o padrão bloqueia a inconsistência e sugere ajustar a janela/entrada.

## Meses e valores

- Competência inicial e final da cobrança são explícitas e podem cruzar anos ou ultrapassar a entrada.
- Uma regra contém de/até + tipo + valor ou percentual. Tipos: valor fixo, bolsa percentual sobre base e isenção. Dinheiro em centavos inteiros; zero é valor, não ausência. Percentual inteiro em basis points (1% = 100 bps), entre 0 e 10.000; arredondar cada parcela final para centavo.
- Isenção = R$ 0,00. “Matrícula isenta” é um benefício separado e opcional; não isenta automaticamente janeiro ou primeira mensalidade. Seleção “isenção da mensalidade” sempre identifica a competência.
- Valor final = valor fixo OU base × (1 – percentual) OU zero. Não acumular bolsa + valor fixo + isenção no mesmo mês/contexto por acidente. Dentro de uma revisão, regras não podem se sobrepor.
- Base só é obrigatória para percentual. Se variar, exigir base por oferta/turno e mostrar valor por contexto. As bases do kit são demonstrativas; não exibir como tabela oficial.
- Escolher horizonte da cobrança. Meses sem regra têm estado explícito **Não definido** ou **Valor-base confirmado** mediante escolha/base. Não preencher silenciosamente. Para enviar à aprovação, todo mês do horizonte tem resultado ou referência-base explícita; criar rascunho incompleto é permitido.
- Não sugerir que a oferta vale até o fim do curso sem término especificado. Não simular reajuste anual ou renovação de bolsa sem informação. Ao terminar o benefício: “Após jun/2027: condições não definidas nesta campanha”.
- Para aderente tardio, as competências são absolutas. Não substituir fevereiro por “primeiro mês” e cobrar retroativamente sem decisão comercial. Exemplo: matrícula em março pode não ser elegível à janela de fevereiro, mesmo que pertença à entrada 2027/1.

## Campanha de vários cursos

No envio, congele a lista de ofertas elegíveis. Cursos cadastrados depois não entram automaticamente em campanha de modalidade inteira já aprovada. Antes de enviar, um resumo mostra inclusões, exceções e turnos. Editar o escopo limpa entradas incompatíveis com aviso e preserva as regras de cobrança até revisar, sem esconder alteração.

Campanhas para formatos do Híbrido preservam os subtipos: Semipresencial não alcança Direito Intensivo só porque ambos são Híbrido. Turno “Todos” cobre turnos válidos do mock naquele contexto; turno desconhecido pede cadastro mock explícito. O site não forneceu uma matriz confiável de turnos; não apresentar os turnos do kit como oficiais.

## Conflitos

Alertar quando duas condições disputam o mesmo contexto (oferta/turno/entrada), as janelas de adesão se cruzam e ao menos uma competência de cobrança se cruza. Uma janela ausente usa os limites das entradas para comparação no mock. Verificar aprovadas, em aprovação e demais rascunhos de forma legível; rascunho próprio em edição não conflita consigo.

Não adivinhar prioridade nem somar bolsas. Permitir salvar rascunho com alertas; bloquear aprovação de duas condições incompatíveis no mesmo contexto. Caminho simples de resolução: remover contexto da proposta ou ajustar janela/competências, então reenviar. Uma revisão do mesmo id pode substituir prospectivamente a anterior após aprovação; ambas as versões permanecem no histórico e matrículas antigas mantêm sua oferta congelada.

## Estados

| Dimensão | Valores | Comportamento |
|---|---|---|
| Aprovação da revisão | Rascunho, Em aprovação, Ajustes solicitados, Aprovada | Aprovada é única condição liberada |
| Vigência derivada | Agendada, Em adesão, Adesão encerrada | Depende da janela/data; não apaga benefícios já vinculados |
| Arquivamento | Ativa no catálogo, Arquivada | Arquivar preserva revisões e matrículas |
| Formação por contexto | Sem registro, Não formou turma, Registro revertido | Sem registro não garante turma formada |
| Integração | Não integrada (mock) | Não representa sincronização real |

Rascunho → Em aprovação → Aprovada; Em aprovação → Ajustes solicitados → nova edição → Em aprovação. Aprovada → criar revisão → Em aprovação. Não sobrescrever revisão aprovada. Prevenir duplo clique; se a revisão mudou enquanto era revisada, avisar e exigir recarregar antes de aprovar. Comentário obrigatório ao devolver. Autora/data/revisão e ações registradas em histórico.

Não formação impede criar/liberar novas condições para o contexto afetado, mas não apaga promessas antigas nem ofertas de outras entradas. Campanha com múltiplos contextos continua consultável nos demais; a lista identifica os contextos indisponíveis. Restaurar formação não aprova campanhas pendentes automaticamente.
