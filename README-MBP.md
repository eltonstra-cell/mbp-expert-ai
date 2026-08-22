# MBP Expert AI — v2.43

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