import assert from "node:assert/strict";
import test from "node:test";

import { enfileirar, processarFila, resumirFila, semArquivo } from "../lib/filaEvidencias.ts";
import { adotarOrfaos, contarDeOutraConta, estadoVisivelDaEvidencia, reconciliarComEvidencias } from "../lib/filaReconciliacao.ts";

const armazemEmMemoria = () => {
  const dados = new Map();
  return { salvar: async (i) => void dados.set(i.id, i), ler: async (id) => dados.get(id), listar: async () => [...dados.values()], apagar: async (id) => void dados.delete(id) };
};
const base = (id, extra = {}) => ({ id, usuarioId: "ana@x.com", empresaId: "e1", visitaId: "v1", tipo: "Foto", nomeArquivo: "f.jpg", mimeType: "image/jpeg", ambiente: "Cozinha", descricao: "", capturadoEm: "2026-10-23T22:59:00.000Z", ...extra });
const blob = () => new Blob([new Uint8Array(10)], { type: "image/jpeg" });
const contexto = (armazem, extra = {}) => ({ armazem, usuarioId: "ana@x.com", podeAcessarEmpresa: () => true, online: () => true, agora: () => Date.now(), enviar: async (item) => ({ pathname: `p/${item.id}`, url: `u/${item.id}` }), ...extra });

test("foto tirada sem sinal sobe ao voltar o sinal, uma vez só, e o arquivo sai do aparelho só depois", async () => {
  const armazem = armazemEmMemoria();
  await enfileirar(armazem, base("foto-offline-1"), blob());
  let envios = 0;
  const offline = await processarFila(contexto(armazem, { online: () => false }));
  assert.equal(offline.semConexao, true);
  assert.ok((await armazem.ler("foto-offline-1")).arquivo, "sem sinal o arquivo continua guardado");
  const online = contexto(armazem, { enviar: async (item) => { envios += 1; return { pathname: `p/${item.id}`, url: `u/${item.id}` }; } });
  await processarFila(online);
  await processarFila(online);
  assert.equal(envios, 1, "não duplica");
  const item = await armazem.ler("foto-offline-1");
  assert.equal(item.estado, "enviado");
  assert.equal(item.arquivo, undefined);
});

test("selo: foto pendente ou com erro conta como pendência, então nunca diz 'Sincronizado'", async () => {
  const armazem = armazemEmMemoria();
  await enfileirar(armazem, base("foto-pendente-1"), blob());
  assert.equal(resumirFila((await armazem.listar()).map(semArquivo)).pendentes, 1);
  await armazem.salvar({ ...(await armazem.ler("foto-pendente-1")), estado: "falhou", causaDaFalha: "servidor" });
  const r = resumirFila((await armazem.listar()).map(semArquivo));
  assert.deepEqual([r.pendentes, r.falhou], [1, 1]);
});

test("'Enviar agora' (forçar) reenvia o que falhou, uma vez", async () => {
  const armazem = armazemEmMemoria();
  await enfileirar(armazem, base("foto-erro-123"), blob());
  await armazem.salvar({ ...(await armazem.ler("foto-erro-123")), estado: "falhou", causaDaFalha: "servidor", tentativas: 8 });
  let envios = 0;
  const ctx = contexto(armazem, { enviar: async (item) => { envios += 1; return { pathname: `p/${item.id}`, url: `u/${item.id}` }; } });
  await processarFila(ctx);
  assert.equal(envios, 0, "sem forçar, o que falhou de vez espera a pessoa");
  await processarFila(ctx, { forcar: true });
  assert.equal(envios, 1);
  assert.equal((await armazem.ler("foto-erro-123")).estado, "enviado");
});

test("estado que a pessoa vê: Na fila, Enviando, Enviada, Erro com motivo; 'Enviar agora' enquanto não enviada", () => {
  const i = (estado, causa) => ({ ...base("x"), estado, tentativas: 0, bytes: 1, causaDaFalha: causa });
  assert.deepEqual(estadoVisivelDaEvidencia(i("aguardando"), "aguardando", false), { rotulo: "Na fila", podeEnviarAgora: true });
  assert.equal(estadoVisivelDaEvidencia(i("enviando"), "aguardando", false).rotulo, "Enviando");
  assert.deepEqual(estadoVisivelDaEvidencia(i("falhou", "permissao"), "aguardando", false), { rotulo: "Erro", motivo: "Sem permissão ou visita ainda não enviada", podeEnviarAgora: true });
  assert.equal(estadoVisivelDaEvidencia(undefined, "enviada", true).rotulo, "Enviada");
  assert.equal(estadoVisivelDaEvidencia(undefined, undefined, true), null, "foto enviada direto, sem fila, não tem etiqueta");
});

test("reconciliar: foto na fila sem registro é recriada; resultado não aplicado é aplicado; histórico aplicado não volta", () => {
  const item = (id, estado, extra = {}) => ({ ...base(id), estado, tentativas: 0, bytes: 1, ...extra });
  const itens = [
    item("perdida-1", "aguardando"),
    item("enviada-nao-aplicada", "enviado", { resultado: { pathname: "p", url: "u" }, resultadoAplicado: false }),
    item("historico", "enviado", { resultado: { pathname: "p", url: "u" }, resultadoAplicado: true }),
    item("com-registro", "aguardando"),
  ];
  const acoes = reconciliarComEvidencias(itens, [{ id: "com-registro", envio: "aguardando" }, { id: "enviada-nao-aplicada", envio: "aguardando" }]);
  assert.deepEqual(acoes.map((a) => [a.tipo, a.item.id]), [["recriar", "perdida-1"], ["aplicar", "enviada-nao-aplicada"]]);
});

test("itens guardados antes de a conta ser conhecida ('local') passam para a conta que entrou; os de outra conta só são contados", async () => {
  const armazem = armazemEmMemoria();
  await armazem.salvar({ ...base("sem-conta-1", { usuarioId: "local" }), estado: "aguardando", tentativas: 0, bytes: 1 });
  await armazem.salvar({ ...base("de-outro-1", { usuarioId: "bia@x.com" }), estado: "aguardando", tentativas: 0, bytes: 1 });
  assert.equal(await adotarOrfaos(armazem, "ana@x.com"), 1);
  assert.equal((await armazem.ler("sem-conta-1")).usuarioId, "ana@x.com");
  assert.equal(contarDeOutraConta(await armazem.listar(), "ana@x.com"), 1);
});

test("queda de conexão no meio do envio não gasta tentativa; falha só de conexão volta para a fila ao abrir o app", async () => {
  const { reabrirFalhasDeConexao } = await import("../lib/filaEvidencias.ts");
  const armazem = armazemEmMemoria();
  await enfileirar(armazem, base("queda-meio-1"), blob());
  let online = true;
  const { FalhaDeEnvio } = await import("../lib/filaEvidencias.ts");
  const ctx = contexto(armazem, { online: () => online, enviar: async () => { online = false; throw new FalhaDeEnvio("rede"); } });
  await processarFila(ctx);
  const item = await armazem.ler("queda-meio-1");
  assert.equal(item.estado, "aguardando");
  assert.equal(item.tentativas, 0, "sem sinal não conta tentativa");
  assert.ok(item.arquivo);
  await armazem.salvar({ ...item, estado: "falhou", causaDaFalha: "rede", tentativas: 8 });
  await armazem.salvar({ ...base("invalida-12345"), estado: "falhou", causaDaFalha: "invalido", tentativas: 1, bytes: 1 });
  assert.equal(await reabrirFalhasDeConexao(armazem, "ana@x.com"), 1);
  assert.equal((await armazem.ler("queda-meio-1")).estado, "aguardando");
  assert.equal((await armazem.ler("invalida-12345")).estado, "falhou", "erro de arquivo continua precisando da pessoa");
});

test("registro sem arquivo enviado e sem item na fila mostra 'Arquivo não enviado' com 'Anexar de novo', qualquer que seja o campo envio", () => {
  for (const envio of [undefined, "aguardando", "enviada"]) {
    const estado = estadoVisivelDaEvidencia(undefined, envio, false);
    assert.equal(estado.rotulo, "Arquivo não enviado", String(envio));
    assert.equal(estado.podeAnexarDeNovo, true);
    assert.equal(estado.podeEnviarAgora, false);
  }
  // o arquivo existe no registro mas o servidor não o entrega
  const indisponivel = estadoVisivelDaEvidencia(undefined, "enviada", true, true);
  assert.equal(indisponivel.rotulo, "Arquivo não enviado");
  assert.match(indisponivel.motivo, /servidor não encontrou/);
  // com item na fila o estado é o da fila, nunca "Arquivo não enviado"
  const item = { ...base("x"), estado: "aguardando", tentativas: 0, bytes: 1 };
  assert.equal(estadoVisivelDaEvidencia(item, undefined, false).rotulo, "Na fila");
});

test("anexar de novo entra na fila com o MESMO id e a data da captura, e não duplica", async () => {
  const armazem = armazemEmMemoria();
  const registro = { id: "sem-arquivo-2259", empresaId: "e1", visitaId: "v1", criadoEm: "2026-10-23T22:59:00.000Z" };
  const dados = { ...base(registro.id), capturadoEm: registro.criadoEm };
  await enfileirar(armazem, dados, blob());
  await enfileirar(armazem, dados, blob());
  assert.equal((await armazem.listar()).length, 1, "o mesmo id nunca vira dois itens");
  let enviados = [];
  await processarFila(contexto(armazem, { enviar: async (item) => { enviados.push([item.id, item.capturadoEm]); return { pathname: "p", url: "u" }; } }));
  assert.deepEqual(enviados, [["sem-arquivo-2259", "2026-10-23T22:59:00.000Z"]]);
});

test("código: guardar na fila nunca espera o service worker; envio pedido durante outro envio roda depois; Anexar de novo liga ao mesmo registro", async () => {
  const { readFileSync } = await import("node:fs");
  const hook = readFileSync(new URL("../components/useFilaDeEvidencias.ts", import.meta.url), "utf8");
  assert.ok(hook.includes("void (async () => {") && hook.includes("NUNCA espera"), "serviceWorker.ready não trava o fluxo");
  assert.ok(hook.includes("repetirDepois") && hook.includes("rodando.current"));
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.ok(page.includes("async function anexarDeNovo(ev: Evidencia, arquivo: File)") && page.includes("id: ev.id,") && page.includes("capturadoEm: ev.criadoEm"));
  assert.ok(page.includes("falhas: fila.resumo.falhou + semArquivo"), "registro sem arquivo conta no selo como erro");
  const tela = readFileSync(new URL("../components/pc/PcEvidencias.tsx", import.meta.url), "utf8");
  assert.ok(tela.includes("Anexar de novo") && tela.includes("Ver detalhes do registro"));
});
