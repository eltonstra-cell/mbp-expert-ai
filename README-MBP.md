# MBP Expert AI — v2.42

## Correção principal

A visita selecionada agora permanece identificada após atualizar a página (F5) quando o usuário estiver na tela **Visitas técnicas**.

Na v2.41, a identificação visual funcionava durante a navegação, mas a restauração da navegação limpava `visitaAtualId` ao recarregar a tela de visitas. A v2.42 mantém o ID salvo no armazenamento local quando a visita ainda existe para a empresa ativa.

## Teste recomendado

1. abrir uma visita;
2. voltar para **Visitas técnicas** e confirmar o selo **Selecionada**;
3. pressionar F5;
4. confirmar que a mesma visita continua destacada e com o selo **Selecionada**;
5. abrir outra visita e repetir para confirmar a troca da seleção.
