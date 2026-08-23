# MBP Expert AI v2.45

Análise assistida de evidências fotográficas por IA, sempre sujeita à revisão profissional.

## Configuração no Vercel

Cadastre a variável de ambiente `OPENAI_API_KEY` no projeto. Opcionalmente,
use `OPENAI_VISION_MODEL` para trocar o modelo; o padrão desta versão é
`gpt-5.6-terra`.

A chave é lida exclusivamente pela rota do servidor e não deve ser adicionada
ao código-fonte nem enviada ao navegador.
