# MBP Expert AI — v2.44

## Ajuste desta versão
- Cada encerramento e reabertura acrescenta um evento permanente ao histórico da visita.
- O histórico registra data, horário, mudança de status, motivo, responsável e origem da ação.
- O relatório exibe a sequência completa sem substituir eventos anteriores.
- Os botões da lista de visitas e os controles do relatório usam a mesma regra de auditoria e salvamento imediato na nuvem.
- A normalização preserva também a identificação profissional e a conclusão técnica do relatório.

## Teste recomendado
1. concluir uma visita;
2. abrir o relatório e conferir o primeiro evento de encerramento;
3. reabrir a visita;
4. conferir o evento de reabertura;
5. concluir novamente;
6. confirmar que os três eventos permanecem na ordem cronológica.

## Histórico da versão anterior

## Ajuste desta versão
- Ao concluir uma visita, a seleção ativa é limpa automaticamente.
- Nenhuma outra visita é selecionada por conta própria.
- A visita concluída mantém todos os dados, relatório, não conformidades e histórico.
- A regra vale tanto para o encerramento pelo relatório quanto pelo botão **Concluir** na lista de visitas.


## Correção principal

A visita selecionada agora permanece identificada após atualizar a página (F5) quando o usuário estiver na tela **Visitas técnicas**.

Na v2.41, a identificação visual funcionava durante a navegação, mas a restauração da navegação limpava `visitaAtualId` ao recarregar a tela de visitas. A v2.42 mantém o ID salvo no armazenamento local quando a visita ainda existe para a empresa ativa.

## Teste recomendado

1. abrir uma visita;
2. voltar para **Visitas técnicas** e confirmar o selo **Selecionada**;
3. pressionar F5;
4. confirmar que a mesma visita continua destacada e com o selo **Selecionada**;
5. abrir outra visita e repetir para confirmar a troca da seleção.
