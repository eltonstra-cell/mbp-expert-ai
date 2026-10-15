# MBP Expert AI

Sistema web (PWA, uso em campo/offline) para consultoria em Segurança dos Alimentos: cadastro de empresas (consulta CNPJ), Manual de Boas Práticas (MBP), POPs, fluxos operacionais, programas de qualidade, visitas técnicas com checklist, não conformidades (NCs), evidências fotográficas com análise por IA (sempre revisada por profissional), relatórios/PDF e controle de acesso por perfil. Versão atual: `2.46.0-dev.1`. Repositório: `eltonstra-cell/mbp-expert-ai` (branch `main`; desenvolvimento em `v2.46-dev`).

Projeto separado do FoodControl. **Atenção:** o projeto Neon "mbp-expert-ai" também hospeda o banco do FoodControl — confirmar com o usuário qual banco/tabelas pertencem a este projeto antes de qualquer operação.

## Stack
- Next.js 16.2.11 (App Router, `proxy.ts` no lugar de middleware), React 19, TypeScript 5.8, Tailwind 4.
- Banco: Neon Postgres via `@neondatabase/serverless`. Auth: Neon Managed Better Auth (`@neondatabase/auth`, beta).
- Arquivos: Vercel Blob (privado). IA: OpenAI (visão/Responses, texto, transcrição de áudio). CNPJ: BrasilAPI e CNPJ.ws.
- PDF no cliente: jspdf + html2canvas-pro. Hospedagem: Vercel (conforme README).

## Comandos
- `npm run dev` — desenvolvimento na **porta 3101** (script `next dev -p 3101`).
- `npm run build` / `npm start` — produção.
- `npm test` — `node --experimental-strip-types --test tests/*.test.mjs` (testes de lógica em `lib/`).

## Variáveis de ambiente (só nomes; ver `.env.example`)
`NOVO_NEON_DATABASE_URL` (prioritária), `DATABASE_URL` (reserva/banco antigo), `OPENAI_API_KEY`, `OPENAI_VISION_MODEL`, `OPENAI_TEXT_MODEL`, `OPENAI_TRANSCRIBE_MODEL`, `NOVO_NEON_NEON_AUTH_BASE_URL` / `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (≥32 caracteres), `ACCESS_CONTROL_MODE` (`preparation` | `active`), `MBP_WORKSPACE_ID` (padrão `principal`). Blob usa o token padrão da integração Vercel (`BLOB_READ_WRITE_TOKEN`, não listado no .env.example).

## Arquitetura
- `app/page.tsx` (~9 mil linhas) concentra praticamente toda a UI; `components/` tem só campos de formulário/painel de acessos.
- `lib/` = regras de negócio puras e testáveis (permissões, sincronização, recuperação, checklist, manual, POPs…). `types/index.ts` = tipos (`AppDB`).
- Persistência: **um único documento JSONB** (`AppDB`) na tabela `mbp_cloud_state` (`workspace_id` PK), criada em runtime por `CREATE TABLE IF NOT EXISTS` em `app/api/state/route.ts`. Cópia local em `localStorage` + service worker (`public/sw.js`). Gravação com controle otimista por `updated_at` (409 em conflito).
- APIs em `app/api/`: `state`, `access/{invite,readiness,session}`, `auth/[...path]`, `evidencias/{upload,file,analisar}`, `audio/transcrever`, `texto/melhorar`, `cnpj/[cnpj]`.
- Acesso: perfis Administrador, Consultor/RT, Cliente Gestor (`lib/permissions.ts`); usuários e empresas autorizadas ficam dentro do próprio `AppDB`. Só é aplicado quando `ACCESS_CONTROL_MODE=active`.
- Não há pasta de migrations nem ORM.

## Banco e ambientes
- Produção usa a integração Neon "neon-claret-bridge" (variáveis `NOVO_NEON_*`): database `neondb`, tabela `mbp_cloud_state`, workspace `principal`, com gravações em 14/10/2026 (informado pelo usuário).
- O projeto Neon "mbp-expert-ai" tem dois databases: `foodcontrol` (FoodControl) e `neondb` (legado do MBP, última gravação 11/08/2026). **O MBP não deve gravar nesse projeto.** A integração antiga alimenta `DATABASE_URL` (informado pelo usuário).
- Vercel: projeto mbp-expert-ai no mesmo time do foodcontrol (Hobby). Preview e Production compartilham o mesmo banco e o mesmo Blob (informado pelo usuário).
- `ACCESS_CONTROL_MODE=active` em Production e no Preview da branch `v2.46-dev`; outras branches de Preview não têm a variável (informado pelo usuário).
- Fluxo: desenvolver em `v2.46-dev`; `main` é produção (informado pelo usuário; confere com `git branch -a`, verificado).
- Antes da blindagem, precedência da conexão (`lib/neonConnection.ts`): `NOVO_NEON_DATABASE_URL` → `NOVO_NEON_POSTGRES_URL` → `NOVO_NEON_URL` → `DATABASE_URL`. Se nenhuma `NOVO_NEON_*` existir, **cai em silêncio em `DATABASE_URL`** (banco legado) sem erro nem log (verificado no código).
- `app/api/state/route.ts` executa `CREATE TABLE IF NOT EXISTS` a cada GET/PUT, então uma conexão errada cria/grava `mbp_cloud_state` no banco que estiver configurado (verificado no código).
- Antes da blindagem, com `ACCESS_CONTROL_MODE` ausente (ou ≠ `active`), em qualquer ambiente: `proxy.ts` deixa todas as rotas passarem sem login, e as rotas de API não aplicam permissão (`obterAcessoServidor` retorna `aplicado:false`); `/api/state` GET/PUT e `/api/evidencias/upload` ficam abertos (verificado no código).

## Blindagem de configuração (branch v2.46-dev, ainda sem commit)
- `lib/neonConnection.ts`: com `VERCEL_ENV` = production/preview e sem nenhuma `NOVO_NEON_*`, lança erro (sem valores) em vez de usar `DATABASE_URL`; só com `ALLOW_LEGACY_DATABASE_URL=true`. Local: comportamento anterior.
- `lib/accessMode.ts`: com `VERCEL_ENV` = production/preview, `ACCESS_CONTROL_MODE` ausente ou desconhecido = `active`; só `off` explícito desliga; `preparation` não aplica. Local sem a variável: não aplica. Usado em `proxy.ts`, `lib/serverAccess.ts`, `lib/auth/server.ts` e `app/api/state/route.ts`.
- Vercel Authentication (Standard Protection) ligada, então Previews exigem login de membro do time (informado pelo usuário).
- Testes: `tests/accessMode.test.mjs` e `tests/neonConnection.test.mjs` (ainda não executados).
- Script `dev` agora fixa a porta 3101.

## Riscos e pendências conhecidas
- Previews de outras branches compartilham banco e Blob de produção; a Vercel Authentication (Standard Protection) os protege com login de membro do time (informado pelo usuário), e o código agora também fecha o acesso por padrão (ver seção acima).
- `tsconfig.tsbuildinfo` e `next-env.d.ts` estão no `.gitignore`, mas **continuam rastreados** no git (não foram removidos do índice). Sem migrations (tabela criada em runtime).
- **Corrigido (ainda sem commit):** upload de evidências valida `visitaId` (letras/números/-/_, máx. 64), tipo por lista (JPEG e áudios mp4/mp3/aac/webm/ogg/wav) conferindo MIME e assinatura dos bytes, limite de 8 MB (`lib/evidenceUpload.ts`); `texto/melhorar` e `audio/transcrever` exigem `ia.analisar` (Administrador e Consultor/RT; Cliente Gestor não tem) e as rotas de IA limitam o tamanho da entrada (`lib/requestLimits.ts`); `/api/state?meta=1` exige sessão quando o controle está ativo.
- **Auditoria de `mesclarEstadoPorUsuario` (lib/stateAccess.ts) e PUT `/api/state`, só leitura:** Cliente Gestor não consegue alterar empresas, visitas, evidências, usuários, configuração de acesso nem registros de auditoria (o servidor usa `...atual` e ignora esses campos do estado recebido, linhas 120-203). Ressalvas abertas: (1) em NCs das próprias empresas, Cliente Gestor pode reescrever sem validação `acaoCorretiva`, `status`, `resolvidaEm` e `historicoAcompanhamento` inteiro, inclusive apagar o histórico (linhas 157-175); (2) `mesclarPorEscopo` (linhas 99-118) faz `mapa.set(item.id, ...)` só pelo `id`: um Consultor/RT pode sobrescrever visita/NC/evidência de outra empresa reutilizando o `id` com `empresaId` próprio; (3) Administrador grava o estado inteiro (`return recebido`, linha 127), inclusive apagando auditoria; (4) o estado recebido de não administradores não é validado em forma nem tamanho; (5) registros de auditoria criados no navegador de não administradores são descartados pelo servidor.
- Fotos e áudios são enviados à OpenAI; base legal/DPA não documentada. Estado completo fica em `localStorage`.
- `app/page.tsx` com ~9 mil linhas; testes cobrem só `lib/`.

## Regras de trabalho
- Responder em português do Brasil.
- Não fazer commit, push nem PR sem o usuário pedir.
- Nunca rodar migration, DELETE ou UPDATE em massa sem confirmação explícita; não escrever em banco sem avisar.
- Nunca imprimir segredos (.env, senhas, connection strings, chaves) — citar só o nome da variável.
- Não instalar dependências nem rodar build sem avisar antes.
- LGPD / dados sensíveis (tratar como dados de saúde, por precaução): o sistema guarda dados de empresas, responsáveis (nome, e-mail, telefone), usuários e fotos de inspeção (podem conter pessoas/documentos). Tratar como dados pessoais; não enviar dados reais a serviços externos nem logar conteúdo.
- Análises por IA são apoio: devem seguir "Aguardando revisão" e nunca criar/resolver NC automaticamente.
- Manter o estilo do código existente (nomes em português, sem comentários desnecessários).
