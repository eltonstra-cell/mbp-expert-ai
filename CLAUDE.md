# Ponto Certo (antes MBP Expert AI)

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

## Blindagem de configuração (branch v2.46-dev, etapa de isolamento e validação)
- `lib/neonConnection.ts`: com `VERCEL_ENV` = production/preview e sem nenhuma `NOVO_NEON_*`, lança erro (sem valores) em vez de usar `DATABASE_URL`; só com `ALLOW_LEGACY_DATABASE_URL=true`. Local: comportamento anterior.
- `lib/accessMode.ts`: com `VERCEL_ENV` = production/preview, `ACCESS_CONTROL_MODE` ausente ou desconhecido = `active`; só `off` explícito desliga; `preparation` não aplica. Local sem a variável: não aplica. Usado em `proxy.ts`, `lib/serverAccess.ts`, `lib/auth/server.ts` e `app/api/state/route.ts`.
- Vercel Authentication (Standard Protection) ligada, então Previews exigem login de membro do time (informado pelo usuário).
- Testes: `tests/accessMode.test.mjs` e `tests/neonConnection.test.mjs` (ainda não executados).
- Script `dev` agora fixa a porta 3101.

## Riscos e pendências conhecidas
- Previews de outras branches compartilham banco e Blob de produção; a Vercel Authentication (Standard Protection) os protege com login de membro do time (informado pelo usuário), e o código agora também fecha o acesso por padrão (ver seção acima).
- `tsconfig.tsbuildinfo` e `next-env.d.ts` estão no `.gitignore`, mas **continuam rastreados** no git (não foram removidos do índice). Sem migrations (tabela criada em runtime).
- **Corrigido:** upload de evidências (`visitaId`, tipo/assinatura, 8 MB), `ia.analisar` obrigatório em `texto/melhorar` e `audio/transcrever` com limite de corpo, `/api/state?meta=1` exige sessão (`lib/evidenceUpload.ts`, `lib/requestLimits.ts`).
- **Corrigido (etapa de isolamento e validação):** isolamento entre empresas — `mesclarPorEscopo` (`lib/stateAccess.ts`) ignora registro recebido que reutilize o `id` de registro de outra empresa fora do escopo. Validação do estado de não administradores no PUT `/api/state` (`lib/stateValidation.ts`): 413 acima de 4 MB (`MBP_MAX_STATE_BYTES` configura) e 400 para forma inválida (coleções que não são listas, itens sem `id` texto, JSON malformado); chaves de topo fora de `AppDB` são descartadas sem erro; colisões de id entre empresas geram `console.warn` (coleção, id e empresas). Ditado por voz e "melhorar texto" ficam ocultos para usuário identificado sem `ia.analisar` (Cliente Gestor) via `IaPermitidaContext` (`components/IaPermissionContext.tsx`, `deveExibirRecursosDeIa` em `lib/permissions.ts`); sem usuário identificado os botões aparecem e o servidor decide.
- **Relatórios emitidos (confirmado e documentado):** o PUT `/api/state` sempre recoloca a lista `relatoriosEmitidos` que está no servidor e as fotos citadas nela, DEPOIS do merge por usuário, então nem o Administrador (que recebe o estado inteiro em `mesclarEstadoPorUsuario`) consegue alterar ou apagar um relatório emitido pelo estado. A rota `DELETE /api/evidencias/file` também recusa (409) apagar o arquivo de uma foto citada em relatório emitido (`arquivosEmRelatorioEmitido`). Só `POST /api/relatorios/emitir` cria linhas novas. A assinatura mostra o cargo cadastrado do RT (`UsuarioSistema.cargo`), nunca o perfil de acesso.
- **Risco aceito por decisão do dono:** Cliente Gestor pode editar `acaoCorretiva`, `status`, `resolvidaEm` e `historicoAcompanhamento` das NCs das próprias empresas (`lib/stateAccess.ts`, merge de `ncs`). Não alterar essa lógica.
- **Pendências:** Administrador grava o estado inteiro e pode apagar a auditoria; a auditoria fica dentro do JSON; todo o estado fica em um único documento JSONB; registros de auditoria criados no navegador de não administradores são descartados pelo servidor; estado de administrador não é validado.
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
- Guia rápido: sempre que uma mudança alterar menus, nomes, botões, fluxos ou cores, atualizar `conteudo-privado/guias/fonte/guia-rapido.html` e regenerar o PDF com `node scripts/gerar-guia-rapido.mjs`.

## Central da Empresa, POPs e documentos impressos (v2.46)
- Central em 3 grupos com sub-abas (modelo puro em `lib/centralEmpresa.ts`, UI em `components/pc/CentralEmpresaNav.tsx`): Empresa (Dados, Norma aplicável, Privacidade), Estrutura (Ambientes e equipamentos, Fluxos), Documentos (Manual, POPs, Programas, Comprovantes, Pessoas). "POPs e documentos" do menu abre Documentos › POPs (`abrirDocumentos` em `app/page.tsx`); quem não edita a empresa vê só POPs, Comprovantes e Pessoas conforme a permissão. A última sub-aba por empresa fica em `localStorage` (com try/catch).
- Lista de POPs (`components/pc/PcPopsLista.tsx`) e ficha do POP (`PcFichaPop.tsx`: Resumo, Documento, Registros, Comprovantes, Quem leu, Histórico). Situação e próxima ação são derivadas (`lib/popGestao.ts`, função pura `proximaAcaoDoPop`); "Revisão vencida" só com "revisar até" vencido ou norma alterada. Comprovante pode ter `popId` (validado no servidor).
- "Colocar a empresa em dia" (`lib/implantacao.ts`): só empresa criada depois desta versão tem o campo opcional `implantacao`; ausente = concluída (sem escrita em massa). O responsável do estabelecimento tem fonte única em Dados (`lib/responsavelEstabelecimento.ts`).
- Impressão (relatório emitido, resumo de uma página, dossiê): cabeçalho e "Página X de Y" em todas as páginas pelas caixas de margem do `@page` (`lib/printFooter.ts`, Chrome/Edge 131+; sem suporte o documento traz a identificação só na primeira página). O dossiê calcula o índice por medição (`lib/indicePaginas.ts`, cada parte em página nova). A regra geral de impressão esconde `header` e `nav`; dentro de `.doc-impresso` eles são reexibidos.
- Plural: `lib/plural.ts` (`quantidade`, `palavra`, `vencem`); nada de "(s)" nos textos. Aviso curto "Salvo": `lib/toast.ts` + `components/ToastHost.tsx`.
- Rolagem: o contêiner das telas (`.pc-offset:has(.ui-screen)`) rola em vez de esconder o que passa da altura; listas longas rolam por dentro, com título e botões fixos (sem paginar de 5 em 5).

## Identidade visual "Ponto Certo"
- Nome, subtítulo e cores ficam em `lib/brand.ts` (único ponto; `app/layout.tsx` injeta as variáveis CSS `--brand`, `--ink`, `--ok`, `--nc` etc.). Fontes em `lib/fonts.ts` (Outfit para títulos, Nunito Sans para texto). Logo em `components/BrandLogo.tsx`; ícone em `app/icon.svg` e `public/icons/icon.svg`; manifest em `app/manifest.ts` (substitui o antigo `public/manifest.webmanifest`).
- Padrão de botões: principal `--brand` com texto branco; Salvar `--ok` (um por tela); secundário branco com borda 2px `--brand`; excluir `--nc-bg`; abas selecionadas `--brand-soft` com texto preto. Sem barras ou botões escuros; texto sobre cor soft é preto.
- Chaves de `localStorage` e prefixos CSS `mbp-` foram mantidos de propósito (renomear apagaria dados locais dos usuários).
- Ícone PNG para instalação do PWA ainda não existe (o manifest usa SVG); `sharp` já está no `node_modules` (dependência do Next) e poderia gerar os PNGs, mas não foi usado.
- Em desenvolvimento, a bolinha preta com "N" no canto é o indicador do Next.js (`next dev`); não existe em produção.

## Navegação (menu por tiles)
- Modelo puro em `lib/navigation.ts` (itens, grupos, barra do celular, trilho do tablet, folha "Mais", item ativo); testes em `tests/navigation.test.mjs`. Reaproveita `permitido()` (permissões existentes); itens básicos (Início, Visitas, Empresas, Ajuda) aparecem sempre; Registrar exige `visitas.executar` + `evidencias.adicionar`. A autorização continua no servidor.
- UI em `components/AppNavigation.tsx` (celular <768px: cápsula flutuante; tablet 768–1199px: trilho de 104px; PC ≥1200px: menu lateral com AGORA, cartão "Visita em andamento" com as etapas e contagens — só dentro de uma visita — e GERAL), `components/AppTopbar.tsx` (caminho, chip "Empresa ativa" e avatar; no tablet, link "← Todas as visitas") e `components/NavIcons.tsx`. Tons das etapas: Central azul, Ambientes turquesa, Checklist verde, Evidências céu, Não conformidades vermelho, Plano âmbar, Acompanhamento violeta, Relatório ardósia.
- O painel/overlay antigo "Navegação" e as duas folhas antigas ("Mais opções" e atalhos) foram removidos. "Registrar" abre a câmera (input de arquivo escondido acionado no próprio clique) e entrega a foto ao fluxo existente de Evidências da visita em andamento; se o último item do checklist tocado está Não Conforme, a foto já vem vinculada a ele e à NC. Não cria NC sozinho.
- `app/layout.tsx`: `suppressHydrationWarning` no `<html>` (next-themes altera classe/estilo antes da hidratação) e ícones declarados explicitamente (declarar só `apple` em `metadata.icons` faz o Next omitir o `<link rel="icon">`).
- Não existe ESLint no projeto (sem script `lint`); a verificação é `tsc --noEmit`, `npm test` e `next build`.

## Checklist, caixa inteligente e Registrar (pacote de ajustes)
- Checklist: faixa de ambientes em pílulas com ordem fixa (a da visita) e painel "Ver todos" (`components/ChecklistEnvStrip.tsx`, regras puras em `lib/checklistEnvs.ts`). A coluna lateral de ambientes e o cartão em caixa do ambiente atual foram removidos. UMA fonte para a contagem de ambientes (`resumoAmbientes`): "Programas de Controle" entra como verificação geral e não é contado como ambiente (antes o menu mostrava 19 e a lista 20 por causa dele).
- Caixa inteligente (Ctrl/Cmd+K): `components/CommandPalette.tsx` + busca local em `lib/commandSearch.ts` (sem IA, sem chamada externa; índice só com o que o perfil já pode ver). Ponto de extensão para IA: `Interpretador`/`buscarComInterpretador`, ainda não usado. Microfone: `components/useVoiceCapture.ts` (mesma rota `/api/audio/transcrever`, 10 s, áudio nunca guardado; exige a permissão de IA no servidor, então fica oculto para Cliente Gestor).
- Registrar: o clique abre a câmera (input escondido) e, depois da foto, pergunta "Vincular a: [item]?" (Sim / Escolher outro item / Só salvar como evidência da visita). "Escolher outro item" guarda a foto em memória e mostra "Vincular foto aqui" nos itens do Checklist. Pela caixa inteligente, Registrar só leva à tela de captura.
- `next.config.ts`: `devIndicators: false` (some a bolinha preta "N" do `next dev`; não existe em produção).

## Pacote 2 de ajustes (v2.46-dev): navegação, datas e redesenhos
- Datas: SEMPRE em America/Sao_Paulo pela função única de `lib/dataLocal.ts` (`dataISOLocal`, `hojeLocalISO`, `formatarData`, `formatarHora`, `localParaISO`/`isoParaLocal`). Nunca cortar ISO com `.slice(0, 10)` nem usar `toLocale*` sem fuso (`tests/pacote2A.test.mjs` varre os arquivos). Nome+cargo: `lib/nomeCargo.ts` (limpa vírgula na exibição e na gravação; versão aprovada nunca é reescrita).
- "Vencendo" = 30 dias no painel Hoje, Resumo e Dossiê (`vencemEm30Dias`). Comprovante: o POP vinculado reage ao tipo (`lib/comprovantePop.ts`; pragas e reservatório têm POP, contrato do RT e outros não).
- Menu: "Editar empresa" deixou de existir (agora "Central da Empresa", no cartão e no ⋯). Menu lateral ganhou "Relatórios" (Emitidos, Resumo, Dossiê, Evolução; `components/pc/RelatoriosAbas.tsx`). A ficha do POP esconde grupos e sub-abas e mostra só o caminho (`lib/caminhoDaFicha.ts`).
- Busca inteligente: barra de 760 px na `AppTopbar` (exemplos rotativos, chips de atalhos) e `CommandPalette` com caminho em cada resultado; "Central" abre a última sub-aba usada ou Empresa › Dados.
- Aba Documento do POP: leitura em folha (`PopFolha`, `lib/popDocumento.ts`) e edição em 3 colunas com pré-visualização. Lista de POPs: contadores exclusivos (`contadoresDaLista`, soma = total).
- Visitas: grupos por empresa (só a ativa aberta; `grupoRecolhido` em `lib/visitasLista.ts`), linhas de colunas fixas. O limite "Avisar visita aberta após X dias" fica em Acessos (`ConfiguracaoDeVisitas`; só o Administrador edita).
- Regras globais de UI (final de `app/globals.css`): rótulo pequeno em tinta escura sem maiúsculas; caixa de marcar nativa padronizada (creme + borda #E8B04B); `select` no estilo do app; `.ui-btn--primary` agora é laranja (não existe botão azul grande). Os desenhos aprovados estão em `docs/design/` (fora do índice do git; a pasta ainda não está no .gitignore).

## Rodada pós-reteste do Pacote 2 (v2.46-dev)
- Topo: o nome da página (`pc-crumb-current`) usa Outfit 500 em 22 px (o seletor "Empresa ativa" fica em 18 px); título grande que repete o topo vira `sr-only` e o subtítulo sobe para a linha das abas/ações; títulos e subtítulos não repetem o nome da empresa (só listas com mais de uma empresa e os PDFs).
- Busca inteligente: `components/BuscaNaBarra.tsx` dentro de `AppTopbar` (digita na barra; painel de resultados colado embaixo). `CommandPalette` (modal) fica só para o celular, onde não há barra. Ctrl K foca a barra (`pedidoDeFocoNaBusca`).
- POP: referências da folha por norma, sem repetição e com "conferir" (`referenciasCompactas`); o caminho da ficha tem níveis clicáveis (`niveisDoCaminho`). O catálogo de normas NÃO marca seções obrigatórias: hoje o envio exige só passos, frequência e responsável (`faltasParaEnviar`); pendente decisão do dono para o bloqueio por seção.
- Comprovantes na ficha do POP: Tipo só com os tipos do POP + "Outro documento deste POP" (`tiposDoPop`). Relatórios emitidos: agrupados por visita (`agruparEmitidosPorVisita`, Vigente/Substituída); emitir sem CRN exige a confirmação "Emitir mesmo sem CRN" (`emissaoLiberada`).
- Responsável do estabelecimento e aprovação de POP puxam nome e cargo do usuário vinculado (`responsavelEfetivo(empresa, usuarios)`); `UsuarioSistema.telefone` (opcional, RT/Administrador) entra na assinatura do relatório só quando preenchido. Empresas: "Cadastro completo" só com a preparação em 100% (`pendenciasDaEmpresa`).
- Nome de exibição da empresa: `lib/nomeEmpresa.ts` (`nomeDeExibicaoDaEmpresa`) é a única função, usada no seletor "Empresa ativa" e em todas as listas (Acessos, Empresas autorizadas, folha do POP…); PDFs e relatórios emitidos mantêm a razão social do documento. Cartão de Empresas: razão social só quando difere do nome exibido; pendências em chip âmbar (`PendenciasChip`).
- Comprovantes: "Mover para outro POP" (ficha) e "Alterar POP vinculado" (lista geral) usam `alterarPopVinculado` (histórico em `historicoDePop` + auditoria); tarja amarela quando o tipo pertence a outro POP (`tipoDeOutroPop`); renovar marca o anterior com `substituidoPor` ("Substituído", fora das contagens; antigos sem o campo ficam como estavam). "Preencher CRN" leva o Administrador a Acessos e o próprio RT a Meu perfil (`destinoDoPreencherCrn`).
- Busca: fica na linha do topo, à direita do nome da página (`BuscaNaBarra` dentro de `AppTopbar`); o painel mostra "Atalhos" e "Recentes" (`lib/buscaRecentes.ts`: até 5 destinos de navegação, só rótulo e rota, no localStorage por usuário). Central: grupos e seções do grupo aberto na mesma linha (>=1280 px). Renovação: o botão Renovar grava `renovaDe` no novo e `substituidoPor` no anterior (qualquer POP). Folha do POP impressa: cabeçalho corrido só com empresa, CNPJ e "POP · versão", razão social em título, avisos de tela fora do papel.
- Topo em janela estreita (`lib/topoCompacto.ts`; as mesmas larguras estão no CSS): abaixo de 1400 px a busca vira lupa + "Ctrl K" e o campo vai para o painel; abaixo de 1500 px "Sincronizado" e "Computador · Completo" viram ícone com dica; o nome da página só aceita reticências abaixo de 1100 px; a empresa ativa tem no mínimo 180 px. Prioridade: nome da página, empresa ativa, busca, status.
- Busca por voz: gravação (MediaRecorder) + rota `/api/audio/transcrever` (OpenAI); o áudio nunca é guardado. Fim de fala por silêncio medido no aparelho (`lib/fimDeFala.ts`: 1 s depois de começar a falar, limite de 8 s). Na barra do PC, resultado único e claro de NAVEGAÇÃO abre sozinho depois de 2 s com Cancelar (`destinoParaAbrirSozinho`); ação que grava ou altera dado e o celular (CommandPalette) nunca abrem sozinhos.
- Voz com contexto: a busca por voz envia `contexto=busca` à rota de transcrição, que acrescenta ao "prompt" (modelo padrão `gpt-4o-mini-transcribe`, com `whisper-1` de reserva; ambos aceitam `prompt` e `language`) os termos do app e os NOMES de exibição das empresas que o perfil acessa (no máximo 20, calculados no servidor: `lib/vocabularioDeVoz.ts`). Nomes de empresa vão à OpenAI junto com o áudio; nunca vão pessoa de Acessos, paciente, visita ou dado de saúde. O ditado de correções não recebe esse contexto.
- Interpretação da voz: `lib/vozComando.ts` + `lib/buscaAproximada.ts` (grafia aproximada por palavras). "[destino] em [empresa]": empresa ativa vai direto (navegação clara abre com contagem e Cancelar); outra empresa pede "Trocar para … e abrir …?"; sem visita em andamento diz "Não há visita em andamento em … Abrir Visitas?"; aproximação pergunta "Você quis dizer …?"; sem entendimento mostra "Não entendi. Você disse: …". Etapas da visita (Checklist, Evidências, Relatório, POPs desta visita) só entram no índice com visita em andamento na empresa ativa (`CHAVES_DA_VISITA`; Correções fica sempre). Datas curtas: `formatarDataCurta` mostra o ano quando não é o corrente.
