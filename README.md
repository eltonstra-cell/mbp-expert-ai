# MBP Expert AI v2.45.3

## Backup local de emergência

- Uma falha inicial da nuvem ativa proteção local e interrompe qualquer gravação automática.
- O sistema informa corretamente que a sincronização falhou.
- Um botão permite baixar imediatamente os dados locais em JSON.

## Recuperação segura entre dispositivos

- Leituras com erro não são mais exibidas como sincronizadas.
- Registros existentes somente no navegador são detectados antes de aplicar a nuvem.
- A sincronização é bloqueada quando houver risco de perda.
- A recuperação mescla empresas, visitas, NCs e evidências sem excluir registros da nuvem.

## Sincronização econômica

- Remove a consulta automática ao Neon a cada 5 segundos.
- Sincroniza ao abrir o sistema, depois de alterações e ao retornar à aba.
- Evita chamadas duplicadas de foco e visibilidade em sequência.
- O indicador de nuvem no cabeçalho também funciona como atualização manual.

Análise assistida de evidências fotográficas por IA, sempre sujeita à revisão profissional.

## Configuração no Vercel

Cadastre a variável de ambiente `OPENAI_API_KEY` no projeto. Opcionalmente,
use `OPENAI_VISION_MODEL` para trocar o modelo; o padrão desta versão é
`gpt-5.6-terra`.

A chave é lida exclusivamente pela rota do servidor e não deve ser adicionada
ao código-fonte nem enviada ao navegador.
