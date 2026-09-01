# MBP Expert AI — v2.45.2

## Recuperação segura de dados locais

- Respostas de erro do Neon não podem mais aparecer como **Nuvem sincronizada**.
- Se um computador possuir registros ausentes na nuvem, nenhum dos lados é sobrescrito automaticamente.
- O sistema mostra a quantidade de empresas, visitas, NCs e evidências locais adicionais.
- A ação de recuperação faz uma união por identificador e preserva registros dos dois lados.
- Conflitos de versão mantêm a recuperação bloqueada e não apagam a cópia local.

## Correção do consumo do Neon

- A consulta periódica a cada 5 segundos foi removida.
- O sistema continua sincronizando ao abrir, ao salvar alterações e ao retornar para a aba.
- Eventos de foco e visibilidade disparados juntos são deduplicados.
- O indicador de nuvem pode ser clicado para solicitar uma atualização manual.
- O banco pode voltar ao estado ocioso quando o sistema não está sendo usado.

## Teste recomendado da v2.45.1

1. abrir o sistema e confirmar **Nuvem sincronizada**;
2. clicar no indicador de nuvem e conferir a atualização manual;
3. alterar uma informação não crítica e confirmar a sincronização;
4. deixar a aba aberta por mais de cinco minutos sem interação;
5. conferir no Neon se a computação volta a ficar ociosa.

## Análise assistida de evidências fotográficas por IA

- Fotos podem ser vinculadas a um ambiente, item do checklist e não conformidade já existente.
- A análise usa somente a imagem armazenada no Blob privado e o contexto técnico vinculado.
- A IA devolve classificação da foto, resumo, até cinco possíveis achados, nível de confiança, alertas de privacidade e limitações.
- Toda resposta nasce com o status **Aguardando revisão**.
- O profissional pode editar e confirmar o texto ou descartar a sugestão.
- A IA não altera o checklist e não cria nem resolve não conformidades automaticamente.
- Análises confirmadas aparecem no relatório; sugestões pendentes e descartadas não entram como conclusão técnica.
- Novas análises não apagam as anteriores: o histórico permanece associado à foto.

## Configuração obrigatória

No Vercel, abra **Settings → Environment Variables** e cadastre:

- `OPENAI_API_KEY`: chave secreta da API da OpenAI;
- `OPENAI_VISION_MODEL` (opcional): padrão `gpt-5.6-terra`.

Depois de salvar a variável, faça um novo deploy. Nunca coloque a chave em
arquivos enviados ao GitHub e nunca use um nome iniciado por `NEXT_PUBLIC_`.

## Teste recomendado da v2.45

1. abrir uma visita em andamento e entrar em **Evidências**;
2. selecionar ambiente e, se aplicável, um item do checklist;
3. tirar uma foto sem rostos, crachás ou documentos pessoais;
4. clicar em **Analisar foto com IA** e confirmar a revisão de privacidade;
5. conferir resumo, achados, confiança e limitações;
6. editar o texto e clicar em **Confirmar análise revisada**;
7. abrir o relatório e confirmar que somente o texto revisado aparece;
8. analisar outra foto e descartar a sugestão, conferindo que ela não aparece como conclusão no relatório.

## Histórico da versão anterior

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
