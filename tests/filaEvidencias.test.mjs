import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  FalhaDeEnvio,
  LIMITE_AVISO_FILA_BYTES,
  MAX_TENTATIVAS_AUTOMATICAS,
  causaDaResposta,
  descartarItem,
  enfileirar,
  esperaDaTentativa,
  processarFila,
  recuperarInterrompidos,
  resumirFila,
  tentarDeNovo,
} from "../lib/filaEvidencias.ts";

function armazemEmMemoria() {
  const mapa = new Map();
  return {
    mapa,
    salvar: async (item) => void mapa.set(item.id, { ...item }),
    ler: async (id) => (mapa.has(id) ? { ...mapa.get(id) } : undefined),
    listar: async () => [...mapa.values()].map((item) => ({ ...item })),
    apagar: async (id) => void mapa.delete(id),
  };
}

// Servidor de mentira: guarda um arquivo por chave, como a rota de upload faz.
function servidorDeMentira() {
  const arquivos = new Map();
  const servidor = {
    arquivos,
    chamadas: 0,
    falhas: [],
    enviar: async (item, arquivo, aoProgresso) => {
      servidor.chamadas += 1;
      const falha = servidor.falhas.shift();
      if (falha) throw new FalhaDeEnvio(falha);
      aoProgresso(50);
      if (!arquivos.has(item.id)) arquivos.set(item.id, { pathname: `evidencias/${item.visitaId}/${item.id}-${item.nomeArquivo}`, url: "" });
      return arquivos.get(item.id);
    },
  };
  return servidor;
}

const dados = (id, extra = {}) => ({
  id,
  usuarioId: "ana@x.com",
  empresaId: "e1",
  visitaId: "v1",
  tipo: "Foto",
  nomeArquivo: "foto.jpg",
  mimeType: "image/jpeg",
  ambiente: "Cozinha",
  checklistItemId: "i1",
  descricao: "",
  capturadoEm: "2026-10-20T10:15:00.000Z",
  ...extra,
});
const arquivo = (n = 1000) => new Blob([new Uint8Array(n)], { type: "image/jpeg" });

function contexto(armazem, servidor, extra = {}) {
  let agora = 1_000_000;
  const ctx = {
    armazem,
    usuarioId: "ana@x.com",
    podeAcessarEmpresa: () => true,
    online: () => true,
    agora: () => agora,
    enviar: servidor.enviar,
    aplicados: [],
    aplicarResultado: (item, resultado) => (ctx.aplicados.push({ id: item.id, resultado }), true),
    avancar: (ms) => (agora += ms),
    ...extra,
  };
  return ctx;
}

test("Gravar: guarda arquivo e metadados no aparelho, com a hora da captura, e a mesma chave não vira dois itens", async () => {
  const armazem = armazemEmMemoria();
  const item = await enfileirar(armazem, dados("evid-0001"), arquivo(2048));
  assert.equal(item.estado, "aguardando");
  assert.equal(item.bytes, 2048);
  assert.equal(item.capturadoEm, "2026-10-20T10:15:00.000Z");
  const guardado = await armazem.ler("evid-0001");
  assert.ok(guardado.arquivo);
  assert.equal(guardado.empresaId, "e1");
  assert.equal(guardado.checklistItemId, "i1");
  await enfileirar(armazem, dados("evid-0001", { descricao: "outra" }), arquivo(10));
  assert.equal((await armazem.listar()).length, 1);
  await assert.rejects(() => enfileirar(armazem, dados("../ruim"), arquivo()), /Chave/);
});

test("Enviar: sobe o arquivo, apaga do aparelho, guarda só o registro leve e repetir não duplica", async () => {
  const armazem = armazemEmMemoria();
  const servidor = servidorDeMentira();
  await enfileirar(armazem, dados("evid-0001"), arquivo());
  const ctx = contexto(armazem, servidor);
  const r1 = await processarFila(ctx);
  assert.equal(r1.enviados, 1);
  const registro = await armazem.ler("evid-0001");
  assert.equal(registro.estado, "enviado");
  assert.equal(registro.arquivo, undefined);
  assert.ok(registro.resultado.pathname.includes("evid-0001"));
  assert.equal(registro.capturadoEm, "2026-10-20T10:15:00.000Z");
  assert.equal(ctx.aplicados.length, 1);
  assert.equal(registro.resultadoAplicado, true);
  // Rodar de novo (ou reabrir o app) não envia nem aplica outra vez.
  const r2 = await processarFila(ctx);
  assert.equal(r2.enviados, 0);
  assert.equal(servidor.chamadas, 1);
  assert.equal(servidor.arquivos.size, 1);
  assert.equal(ctx.aplicados.length, 1);
});

test("Falha de rede no meio do envio: o item fica, espera cada vez mais e a repetição não cria evidência duplicada", async () => {
  const armazem = armazemEmMemoria();
  const servidor = servidorDeMentira();
  servidor.falhas.push("rede", "servidor");
  await enfileirar(armazem, dados("evid-0001"), arquivo());
  const ctx = contexto(armazem, servidor);

  const r1 = await processarFila(ctx);
  assert.equal(r1.falhas, 1);
  let item = await armazem.ler("evid-0001");
  assert.equal(item.estado, "aguardando");
  assert.equal(item.tentativas, 1);
  assert.ok(item.arquivo, "o arquivo continua no aparelho");
  assert.equal(item.proximaTentativaEm, 1_000_000 + 5_000);

  // Antes da espera acabar, nada é enviado.
  const cedo = await processarFila(ctx);
  assert.equal(servidor.chamadas, 1);
  assert.equal(cedo.proximaEm, 1_005_000);

  ctx.avancar(5_001);
  await processarFila(ctx);
  item = await armazem.ler("evid-0001");
  assert.equal(item.tentativas, 2);
  assert.equal(item.proximaTentativaEm, ctx.agora() + 10_000);

  ctx.avancar(10_001);
  const r3 = await processarFila(ctx);
  assert.equal(r3.enviados, 1);
  assert.equal(servidor.arquivos.size, 1);
  assert.equal((await armazem.ler("evid-0001")).estado, "enviado");
});

test("Espera crescente e fim das tentativas automáticas", async () => {
  assert.deepEqual([1, 2, 3, 4].map(esperaDaTentativa), [5_000, 10_000, 20_000, 40_000]);
  assert.equal(esperaDaTentativa(30), 300_000);
  const armazem = armazemEmMemoria();
  const servidor = servidorDeMentira();
  servidor.falhas.push(...Array(MAX_TENTATIVAS_AUTOMATICAS).fill("servidor"));
  await enfileirar(armazem, dados("evid-0001"), arquivo());
  const ctx = contexto(armazem, servidor);
  for (let i = 0; i < MAX_TENTATIVAS_AUTOMATICAS; i += 1) {
    await processarFila(ctx);
    ctx.avancar(600_000);
  }
  const item = await armazem.ler("evid-0001");
  assert.equal(item.estado, "falhou");
  assert.ok(item.arquivo);
  // "Tentar de novo" recoloca na fila e envia.
  assert.equal(await tentarDeNovo(armazem, "ana@x.com", "evid-0001"), true);
  const r = await processarFila(ctx);
  assert.equal(r.enviados, 1);
});

test("Conexão cai no meio: para de insistir e o resto da fila espera", async () => {
  const armazem = armazemEmMemoria();
  const servidor = servidorDeMentira();
  await enfileirar(armazem, dados("evid-0001", { capturadoEm: "2026-10-20T10:00:00.000Z" }), arquivo());
  await enfileirar(armazem, dados("evid-0002", { capturadoEm: "2026-10-20T10:01:00.000Z" }), arquivo());
  let online = true;
  const ctx = contexto(armazem, servidor, {
    online: () => online,
    enviar: async (item, arq, progresso) => {
      online = false;
      throw new FalhaDeEnvio("rede");
    },
  });
  const r = await processarFila(ctx);
  assert.equal(r.semConexao, true);
  assert.equal((await armazem.ler("evid-0001")).estado, "aguardando");
  assert.equal((await armazem.ler("evid-0002")).tentativas, 0, "o segundo nem foi tentado");
  const semSinal = await processarFila(ctx);
  assert.equal(semSinal.semConexao, true);
});

test("Troca de usuário: outro usuário no mesmo aparelho não vê, não envia nem descarta itens alheios", async () => {
  const armazem = armazemEmMemoria();
  const servidor = servidorDeMentira();
  await enfileirar(armazem, dados("evid-0001"), arquivo());
  const bia = contexto(armazem, servidor, { usuarioId: "bia@x.com" });
  const r = await processarFila(bia);
  assert.equal(r.enviados, 0);
  assert.equal(servidor.chamadas, 0);
  assert.equal(await descartarItem(armazem, "bia@x.com", "evid-0001"), false);
  assert.equal(await tentarDeNovo(armazem, "bia@x.com", "evid-0001"), false);
  assert.equal(resumirFila((await armazem.listar()).filter((i) => i.usuarioId === "bia@x.com")).pendentes, 0);
  // O dono continua com o item e o envia ao voltar.
  const ana = contexto(armazem, servidor);
  assert.equal((await processarFila(ana)).enviados, 1);
});

test("Sessão expirada: o item continua na fila, sem gastar tentativa, e a fila para até novo login", async () => {
  const armazem = armazemEmMemoria();
  const servidor = servidorDeMentira();
  servidor.falhas.push("sessao");
  await enfileirar(armazem, dados("evid-0001", { capturadoEm: "2026-10-20T10:00:00.000Z" }), arquivo());
  await enfileirar(armazem, dados("evid-0002", { capturadoEm: "2026-10-20T10:01:00.000Z" }), arquivo());
  const ctx = contexto(armazem, servidor);
  const r = await processarFila(ctx);
  assert.equal(r.sessaoExpirada, true);
  const primeiro = await armazem.ler("evid-0001");
  assert.equal(primeiro.estado, "aguardando");
  assert.equal(primeiro.tentativas, 0);
  assert.equal(primeiro.causaDaFalha, "sessao");
  assert.ok(primeiro.arquivo);
  assert.equal(servidor.chamadas, 1, "não tentou o segundo");
  // Depois do novo login, envia os dois.
  const depois = await processarFila(ctx);
  assert.equal(depois.enviados, 2);
  assert.equal(depois.sessaoExpirada, false);
});

test("Perfil sem acesso à empresa: o item fica guardado e não é enviado", async () => {
  const armazem = armazemEmMemoria();
  const servidor = servidorDeMentira();
  await enfileirar(armazem, dados("evid-0001"), arquivo());
  const ctx = contexto(armazem, servidor, { podeAcessarEmpresa: () => false });
  await processarFila(ctx);
  assert.equal(servidor.chamadas, 0);
  const item = await armazem.ler("evid-0001");
  assert.equal(item.estado, "falhou");
  assert.equal(item.causaDaFalha, "permissao");
  assert.ok(item.arquivo);
});

test("Arquivo recusado pelo servidor vai direto para Falhou, sem insistir", async () => {
  const armazem = armazemEmMemoria();
  const servidor = servidorDeMentira();
  servidor.falhas.push("invalido");
  await enfileirar(armazem, dados("evid-0001"), arquivo());
  await processarFila(contexto(armazem, servidor));
  assert.equal((await armazem.ler("evid-0001")).estado, "falhou");
});

test("App fechado no meio do envio: o item que ficou Enviando volta a Aguardando", async () => {
  const armazem = armazemEmMemoria();
  await enfileirar(armazem, dados("evid-0001"), arquivo());
  const item = await armazem.ler("evid-0001");
  await armazem.salvar({ ...item, estado: "enviando", progresso: 40 });
  assert.equal(await recuperarInterrompidos(armazem, "ana@x.com"), 1);
  assert.equal((await armazem.ler("evid-0001")).estado, "aguardando");
});

test("Descartar apaga o arquivo do aparelho; resultado da Service Worker é aplicado na próxima abertura", async () => {
  const armazem = armazemEmMemoria();
  await enfileirar(armazem, dados("evid-0001"), arquivo());
  assert.equal(await descartarItem(armazem, "ana@x.com", "evid-0001"), true);
  assert.equal((await armazem.listar()).length, 0);

  // Registro deixado pela Service Worker (enviado, ainda não aplicado na tela).
  await armazem.salvar({ ...dados("evid-0002"), bytes: 10, estado: "enviado", tentativas: 0, resultado: { pathname: "evidencias/v1/evid-0002-foto.jpg", url: "" } });
  const ctx = contexto(armazem, servidorDeMentira());
  await processarFila(ctx);
  assert.deepEqual(ctx.aplicados.map((a) => a.id), ["evid-0002"]);
  assert.equal((await armazem.ler("evid-0002")).resultadoAplicado, true);
});

test("Resposta do servidor: sessão, permissão, arquivo inválido e queda", () => {
  assert.equal(causaDaResposta(200, true), null);
  assert.equal(causaDaResposta(401, true), "sessao");
  assert.equal(causaDaResposta(200, false, true), "sessao", "login no lugar da API");
  assert.equal(causaDaResposta(200, false), "sessao");
  assert.equal(causaDaResposta(403, true), "permissao");
  assert.equal(causaDaResposta(415, true), "invalido");
  assert.equal(causaDaResposta(413, true), "invalido");
  assert.equal(causaDaResposta(500, true), "servidor");
  assert.equal(causaDaResposta(0, false), "rede");
});

test("Resumo da fila: pendentes, falhas e aviso de espaço (limite de 100 MB)", () => {
  assert.equal(LIMITE_AVISO_FILA_BYTES, 100 * 1024 * 1024);
  const itens = [
    { estado: "aguardando", bytes: 60 * 1024 * 1024 },
    { estado: "falhou", bytes: 50 * 1024 * 1024 },
    { estado: "enviado", bytes: 5 },
  ];
  const resumo = resumirFila(itens);
  assert.equal(resumo.pendentes, 2);
  assert.equal(resumo.falhou, 1);
  assert.equal(resumo.acimaDoLimite, true);
  assert.equal(resumirFila([{ estado: "aguardando", bytes: 1000 }]).acimaDoLimite, false);
});

test("Servidor e telas: chave de envio idempotente, sem log de conteúdo e textos da fila", () => {
  const rota = readFileSync(new URL("../app/api/evidencias/upload/route.ts", import.meta.url), "utf8");
  assert.ok(rota.includes("chaveEnvio"));
  assert.ok(rota.includes("head(pathname)"));
  assert.ok(rota.includes("addRandomSuffix: !comChave"));
  const fila = readFileSync(new URL("../lib/filaEvidencias.ts", import.meta.url), "utf8");
  assert.ok(!/console\.(log|error|warn)/.test(fila));
  const tela = readFileSync(new URL("../components/pc/PcFilaDeEnvio.tsx", import.meta.url), "utf8");
  for (const texto of ["Fila de envio", "Enviar agora", "Tentar de novo", "Descartar", "Não limpe os dados do navegador", "não é criptografado"]) assert.ok(tela.includes(texto), texto);
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.ok(page.includes("Aguardando envio") || page.includes("Salva no aparelho. Aguardando envio."));
  assert.ok(page.includes("Foto salva"));
  assert.ok(page.includes("confirmarComFila(\"sair\")"));
  assert.ok(page.includes("confirmarComFila(\"trocar\")"));
  const ajuda = readFileSync(new URL("../components/pc/PcAjuda.tsx", import.meta.url), "utf8");
  assert.ok(ajuda.includes("Aguardando envio"));
  assert.ok(!ajuda.includes("a evidência não é salva"));
  const evid = readFileSync(new URL("../components/pc/PcEvidencias.tsx", import.meta.url), "utf8");
  // O estado de cada foto/áudio vem da fila (Na fila, Enviando, Enviada, Erro); sem sinal o botão de IA fica esmaecido com cadeado, sem texto longo.
  const reconc = readFileSync(new URL("../lib/filaReconciliacao.ts", import.meta.url), "utf8");
  assert.ok(evid.includes("estadoEnvio") && evid.includes("Enviar agora") && evid.includes("🔒 Analisar com IA"));
  assert.ok(reconc.includes('"Na fila"') && reconc.includes('"Enviada"') && reconc.includes('"Erro"') && reconc.includes('"Enviando"'));
  const voz = readFileSync(new URL("../components/FieldVoiceTools.tsx", import.meta.url), "utf8");
  assert.ok(voz.includes("Precisa de internet"));
});
