# MBP Expert AI — v2.41

## Correção principal

A sincronização usava `updated_at` como controle de versão. O PostgreSQL/Neon armazena timestamps com precisão de microssegundos, enquanto o valor retornado ao navegador por JSON é serializado com precisão de milissegundos. Na gravação seguinte, a comparação exata podia falhar mesmo sem alteração por outro dispositivo.

Nesta versão, o endpoint de estado:

- grava `updated_at` normalizado para milissegundos;
- compara a versão recebida também em precisão de milissegundos;
- mantém o controle otimista de concorrência entre dispositivos;
- evita falsos conflitos/falhas ao finalizar ou reabrir inspeções.

## Teste recomendado

1. aguardar “Nuvem sincronizada”;
2. reabrir uma inspeção concluída;
3. aguardar “Nuvem sincronizada”;
4. finalizar novamente;
5. confirmar que não aparece o alerta de gravação pendente;
6. atualizar a página e verificar que o status persistiu.
