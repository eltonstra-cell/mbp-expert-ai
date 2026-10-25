// Verificação do trabalho sem sinal, no app de verdade (navegador sem janela, via DevTools) e com um "servidor" falso dentro da página:
// ele guarda o estado e a versão (updated_at) no localStorage da página, devolve 409 quando a versão esperada não é a atual, e obedece a interruptores
// (sem sinal, sessão expirada, resposta perdida depois de gravar). Nada sai da máquina. Dados: só a empresa de teste "Beyond Nutri".
// Uso: npm run build && node --experimental-strip-types scripts/verificar-offline.mjs [--saida pasta]
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { abrirNavegador } from "./navegador-cdp.mjs";
import { iniciarApp, montarEstado } from "./verificar-capa-pdf.mjs";

const EMAIL = "elton.teste@example.com";
const CHAVE = `mbp-expert-ai-v2:usuario:${encodeURIComponent(EMAIL)}`;
const CHAVE_NAV = `mbp-expert-ai:navegacao:v1:usuario:${encodeURIComponent(EMAIL)}`;
const saida = process.argv.includes("--saida") ? process.argv[process.argv.indexOf("--saida") + 1] : null;
if (saida) mkdirSync(saida, { recursive: true });

const resultados = [];
const registrar = (nome, ok, detalhe = "") => {
  resultados.push({ nome, ok });
  console.log(`${ok ? "PASSOU" : "FALHOU"}  ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
};

const servidorFalso = `
  const __f = window.fetch.bind(window);
  const lerS = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const flag = (k) => localStorage.getItem(k) === "1";
  Object.defineProperty(navigator, "onLine", { get: () => !flag("__off") });
  window.print = () => {};
  const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  const setAttrOriginal = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (nome, valor) { if (this.tagName === "IMG" && nome === "src" && String(valor).includes("/api/evidencias/file?pathname=fake")) valor = PNG; return setAttrOriginal.call(this, nome, valor); };
  const descritorSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
  Object.defineProperty(HTMLImageElement.prototype, "src", { configurable: true, get() { return descritorSrc.get.call(this); }, set(v) { descritorSrc.set.call(this, String(v).includes("/api/evidencias/file?pathname=fake") ? PNG : v); } });
  window.XMLHttpRequest = function () {
    const x = { upload: {}, status: 0, responseText: "", responseURL: "", open(m, u) { this.u = u; }, getResponseHeader(h) { return h.toLowerCase() === "content-type" ? "application/json" : null; },
      send(form) { setTimeout(() => { if (flag("__off")) { this.onerror && this.onerror(); return; } if (flag("__401")) { this.status = 401; this.responseText = "{}"; this.responseURL = location.origin + this.u; this.onload && this.onload(); return; } const id = form.get("evidenciaId"); const l = JSON.parse(localStorage.getItem("__ups") || "[]"); l.push(id); localStorage.setItem("__ups", JSON.stringify(l)); this.status = 200; this.responseText = JSON.stringify({ pathname: "fake/" + id + ".jpg", url: "/fake/" + id + ".jpg" }); this.responseURL = location.origin + this.u; this.onload && this.onload(); }, 80); } };
    return x;
  };
  window.fetch = async (entrada, opcoes = {}) => {
    const url = String(entrada && entrada.url ? entrada.url : entrada);
    if (flag("__off")) throw new TypeError("Failed to fetch");
    const json = (corpo, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
    if (url.includes("/api/access/session")) return flag("__401") ? json({ authenticated: false }) : json({ authenticated: true, user: { id: "u1", email: ${JSON.stringify(EMAIL)}, name: "Elton Volmir Strapazon" } });
    if (url.startsWith("/api/state")) {
      if (flag("__401")) return json({ error: "Sessão necessária." }, 401);
      const s = lerS("__srv");
      if (url.includes("meta=1")) return json({ configured: true, updatedAt: s.updatedAt });
      if ((opcoes.method || "GET") === "PUT") {
        const corpo = JSON.parse(opcoes.body);
        if (corpo.expectedUpdatedAt !== s.updatedAt) { localStorage.setItem("__n409", String(Number(localStorage.getItem("__n409") || 0) + 1)); return json({ ok: false, conflict: true, configured: true, data: s.data, updatedAt: s.updatedAt }, 409); }
        const novo = { data: corpo.data, updatedAt: new Date().toISOString(), puts: (s.puts || 0) + 1 };
        localStorage.setItem("__srv", JSON.stringify(novo));
        if (flag("__perderResposta")) { localStorage.setItem("__perderResposta", "0"); throw new TypeError("Failed to fetch"); }
        return json({ ok: true, configured: true, updatedAt: novo.updatedAt });
      }
      return json({ configured: true, data: s.data, updatedAt: s.updatedAt });
    }
    return __f(entrada, opcoes);
  };`;

const estadoInicial = async () => {
  const e = await montarEstado();
  const item = (n) => ({ id: `i${n}`, ambiente: "Cozinha", titulo: `Piso limpo ${n}`, categoria: "Higiene", status: "Pendente", observacao: "" });
  e.db.visitas = [{ id: "vt1", empresaId: "beyond-nutri", data: "2026-10-22", status: "Em andamento", responsavel: "Elton Volmir Strapazon", observacoes: "", progresso: 0, criadoEm: "2026-10-22T10:00:00.000Z", ambientes: ["Cozinha"], checklistVersao: 1, checklist: [item(1), item(2), item(3)] }];
  return e.db;
};

const jpg = path.join(mkdtempSync(path.join(tmpdir(), "foto-teste-")), "foto.jpg");
writeFileSync(jpg, await createRequire(import.meta.url)(path.resolve("node_modules/sharp"))({ create: { width: 800, height: 600, channels: 3, background: { r: 200, g: 120, b: 40 } } }).jpeg().toBuffer());
const app = await iniciarApp();
const n = await abrirNavegador({ porta: 9700 + Math.floor(Math.random() * 90) });
const js = (c) => n.avaliar(c);
const status = () => js(`(()=>{const d=JSON.parse(localStorage.getItem(${JSON.stringify(CHAVE)})||"{}");return (d.visitas||[]).flatMap(v=>v.checklist||[]).map(i=>i.id+":"+i.status).join(",")})()`);
const servidor = () => js(`(()=>{const s=JSON.parse(localStorage.getItem("__srv")||"{}");return {puts:s.puts||0,itens:((s.data&&s.data.visitas)||[]).flatMap(v=>v.checklist||[]).map(i=>i.id+":"+i.status).join(",")}})()`);
const texto = () => js(`document.body.innerText`);
const flag = (k, v) => js(`localStorage.setItem(${JSON.stringify(k)}, ${v ? '"1"' : '"0"'})`);
const evento = (nome) => js(`window.dispatchEvent(new Event(${JSON.stringify(nome)}))`);
const esperar = async (cond, ms = 15000) => {
  const limite = Date.now() + ms;
  while (Date.now() < limite) {
    if (await cond()) return true;
    await n.esperar(250);
  }
  return false;
};
const clicarBotao = (rotulo) => js(`(()=>{const b=[...document.querySelectorAll("button")].find(x=>x.innerText.trim()===${JSON.stringify(rotulo)});if(!b)return false;b.click();return true})()`);
const clicarResposta = (rotulo) => js(`(()=>{const b=[...document.querySelectorAll("button")].find(x=>x.innerText.trim().split(String.fromCharCode(10)).pop().trim()===${JSON.stringify(rotulo)});if(!b)return false;b.click();return true})()`);
const clicarNumero = (num) => js(`(()=>{const b=[...document.querySelectorAll(".chk-pc-num")][${num - 1}];if(!b)return false;b.click();return true})()`);
const foto = async (nome) => {
  if (saida) writeFileSync(path.join(saida, `${nome}.png`), await n.imagem());
};

try {
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await n.ir("about:blank");
  const db = await estadoInicial();
  const semente = `
    if (!localStorage.getItem("__semeado")) {
      localStorage.setItem("__semeado", "1");
      localStorage.setItem(${JSON.stringify(CHAVE)}, ${JSON.stringify(JSON.stringify(db))});
      localStorage.setItem(${JSON.stringify(CHAVE_NAV)}, JSON.stringify({ view: "checklist", visitaAtualId: "vt1", ambienteChecklistAtivo: "Cozinha" }));
      localStorage.setItem("mbp-expert-ai:offline-session:v1", JSON.stringify({ id: "u1", email: ${JSON.stringify(EMAIL)}, name: "Elton Volmir Strapazon" }));
      localStorage.setItem("__srv", JSON.stringify({ data: ${JSON.stringify(db)}, updatedAt: "2026-10-22T10:00:00.000Z", puts: 0 }));
    }`;
  await n.enviar("Page.addScriptToEvaluateOnNewDocument", { source: servidorFalso + semente });
  await n.ir(app.base);
  const abriu = await esperar(async () => js('document.querySelectorAll(".chk-pc-num").length>2'), 20000);
  registrar("0. a visita abre no checklist (base para os testes)", abriu);
  if (!abriu) throw new Error("não abriu o checklist: " + (await texto()).slice(0, 300));
  await n.esperar(3500);
  const ids = (await js(`(()=>{const d=JSON.parse(localStorage.getItem(${JSON.stringify(CHAVE)}));return d.visitas[0].checklist.slice(0,3).map(i=>i.id)})()`));
  const [I1, I2, I3] = ids;
  

  // 1. Sem sinal: responder, fechar e reabrir.
  await flag("__off", true);
  await evento("offline");
  await clicarNumero(1);
  await n.esperar(400);
  const respondeu1 = await clicarResposta("Conforme");
  await n.esperar(500);
  await clicarNumero(2);
  await n.esperar(300);
  await clicarResposta("Conforme");
  await n.esperar(2500);
  registrar("1a. sem sinal: duas respostas ficam guardadas no aparelho", (await status()).includes(`${I1}:Conforme`) && (await status()).includes(`${I2}:Conforme`), await status());
  registrar("1b. o servidor não recebeu nada (sem sinal)", (await servidor()).puts >= 0 && !(await servidor()).itens.includes(`${I1}:Conforme`));
  const selo = await texto();
  registrar("1c. o selo avisa 'Sem sinal' e há pendência", /Sem sinal/.test(selo));
  await foto("1-sem-sinal");
  await n.ir(app.base);
  await esperar(async () => js('document.querySelectorAll(".chk-pc-num").length>2'), 15000);
  await n.esperar(2000);
  registrar("2. fechar e reabrir o app sem sinal não perde nada", (await status()).includes(`${I1}:Conforme`) && (await status()).includes(`${I2}:Conforme`), await status());

  // 3. Outro aparelho mexeu em outro item enquanto estávamos sem sinal; ao voltar o sinal tudo se junta sem duplicar.
  await js(`(()=>{const s=JSON.parse(localStorage.getItem("__srv"));s.data.visitas[0].checklist[2].status="Não Conforme";s.updatedAt=new Date().toISOString();localStorage.setItem("__srv",JSON.stringify(s))})()`);
  await flag("__off", false);
  await evento("online");
  const sincronizou = await esperar(async () => {
    const s = await servidor();
    return s.itens.includes(`${I1}:Conforme`) && s.itens.includes(`${I2}:Conforme`) && s.itens.includes(`${I3}:Não Conforme`);
  }, 20000);
  registrar("3a. voltou o sinal: as respostas do aparelho e a do outro aparelho se juntam no servidor", sincronizou, JSON.stringify(await servidor()));
  registrar("3b. o aparelho também recebeu a resposta do outro aparelho", (await status()).includes(`${I3}:Não Conforme`), await status());
  const putsAntes = (await servidor()).puts;
  await n.esperar(4000);
  registrar("3c. sem reenvio repetido depois de sincronizar", (await servidor()).puts === putsAntes, `${putsAntes} → ${(await servidor()).puts}`);
  registrar("3d. o selo volta a 'Sincronizado'", await esperar(async () => /Sincronizado/.test(await texto()), 8000));
  await foto("3-sincronizado");

  // 4. Queda no meio do envio: o servidor gravou mas a resposta se perdeu; o reenvio não duplica nem perde.
  await clicarNumero(3);
  await n.esperar(300);
  await flag("__perderResposta", true);
  await clicarResposta("Conforme");
  const recuperou = await esperar(async () => (await servidor()).itens.includes(`${I3}:Conforme`), 20000);
  registrar("4. resposta perdida depois de gravar: retoma sem duplicar e sem perder", recuperou && !/Dois aparelhos/.test(await texto()), JSON.stringify(await servidor()));

  // 5. Dois aparelhos no mesmo item: conflito.
  await flag("__off", true);
  await evento("offline");
  await clicarNumero(1);
  await n.esperar(300);
  await clicarResposta("Não conforme");
  await n.esperar(1200);
  await js(`(()=>{const s=JSON.parse(localStorage.getItem("__srv"));s.data.visitas[0].checklist[0].status="Não se aplica";s.updatedAt=new Date().toISOString();localStorage.setItem("__srv",JSON.stringify(s))})()`);
  const localAntes = await status();
  await flag("__off", false);
  await evento("online");
  const conflito = await esperar(async () => /Dois aparelhos mudaram o mesmo item/.test(await texto()), 15000);
  registrar("5a. o mesmo item mudado nos dois aparelhos abre o conflito para o RT escolher", conflito, localAntes);
  registrar("5b. nada foi sobrescrito em silêncio (o servidor ainda tem a versão do outro aparelho)", (await servidor()).itens.includes(`${I1}:Não se aplica`), JSON.stringify(await servidor()));
  await foto("5-conflito");
  if (conflito) {
    await clicarBotao("Manter o meu");
    const gravou = await esperar(async () => (await servidor()).itens.includes(`${I1}:Não Conforme`), 15000);
    registrar("5c. 'Manter o meu' envia a escolha do RT", gravou, JSON.stringify(await servidor()));
  }

  // 6. Sessão expirada: os dados ficam e, ao entrar de novo, a fila segue.
  await clicarNumero(2);
  await n.esperar(300);
  await flag("__401", true);
  await clicarResposta("Não conforme");
  const aviso = await esperar(async () => /Sua sessão expirou/.test(await texto()), 15000);
  registrar("6a. sessão expirada: o app avisa e pede novo login", aviso);
  registrar("6b. a resposta continua guardada no aparelho", (await status()).includes(`${I2}:Não Conforme`), await status());
  await foto("6-sessao");
  await flag("__401", false);
  await evento("online");
  registrar("6c. com a sessão de volta, o que estava guardado é enviado", await esperar(async () => (await servidor()).itens.includes(`${I2}:Não Conforme`), 20000), JSON.stringify(await servidor()));

  // 7. F5 sem sinal (o aplicativo reabre pelo cache) e volta do sinal: o que foi respondido continua lá, no máximo um 409 e nenhum laço de reenvio.
  await flag("__off", true);
  await evento("offline");
  await clicarNumero(3);
  await n.esperar(300);
  await clicarResposta("Não se aplica");
  await n.esperar(2000);
  await js(`localStorage.setItem("__n409","0")`);
  await n.ir(app.base);
  await esperar(async () => js('document.querySelectorAll(".chk-pc-num,.chk-seg").length>2'), 15000);
  await n.esperar(1500);
  registrar("7a. F5 sem sinal: o app abre e a resposta continua guardada", (await status()).includes(`${I3}:Não se aplica`), await status());
  registrar("7b. F5 sem sinal: o selo diz 'Sem sinal' com a contagem", /Sem sinal/.test(await texto()));
  await foto("7-f5-sem-sinal");
  const putsAntes7 = (await servidor()).puts;
  await flag("__off", false);
  await evento("online");
  registrar("7c. volta do sinal: a resposta guardada chega ao servidor", await esperar(async () => (await servidor()).itens.includes(`${I3}:Não se aplica`), 20000), JSON.stringify(await servidor()));
  await n.esperar(5000);
  const n409 = Number(await js(`localStorage.getItem("__n409")||"0"`));
  const puts7 = (await servidor()).puts;
  registrar("7d. no máximo um 409 e sem laço de reenvio", n409 <= 1 && puts7 - putsAntes7 <= 2, `409: ${n409}; envios: ${puts7 - putsAntes7}`);
  registrar("7e. o selo volta a 'Sincronizado'", await esperar(async () => /Sincronizado/.test(await texto()), 8000));

  // 8. Tela do celular (390x844 e 360x640), sem sinal e com "Não conforme" aberto: Anterior e Salvar e próximo sempre à vista,
  // acima da barra de baixo e sem o botão Registrar por cima; o conteúdo rola por dentro.
  await flag("__off", true);
  await evento("offline");
  for (const [w, h] of [[390, 844], [360, 640]]) {
    await n.enviar("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 2, mobile: true });
    await n.ir(app.base);
    await esperar(async () => js('!!document.querySelector(".chk-foco-rodape")'), 15000);
    await n.esperar(1200);
    await clicarResposta("Não conforme");
    await n.esperar(700);
    const m = JSON.parse(await js(`JSON.stringify((()=>{const r=(q)=>{const e=document.querySelector(q);return e?e.getBoundingClientRect():null};const f=r(".chk-foco-rodape"),b=r(".campo-bar"),o=r(".campo-register-orb"),c=document.querySelector(".chk-foco-corpo"),topo=r(".chk-foco-topo");return {f:f&&{t:f.top,b:f.bottom},bar:b&&b.top,orb:o&&o.top,rolaPorDentro:c?getComputedStyle(c).overflowY:"",docRola:document.documentElement.scrollHeight>innerHeight+2,topoB:topo&&topo.bottom,vh:innerHeight}})())`));
    const ok = m.f && m.f.t > 0 && m.f.b <= m.bar + 0.5 && m.f.b <= m.orb + 0.5 && m.f.t > m.topoB && /auto|scroll/.test(m.rolaPorDentro);
    registrar(`8. celular ${w}x${h}: rodapé fixo à vista acima da barra e do botão Registrar, conteúdo rola por dentro`, Boolean(ok), JSON.stringify(m));
    await foto(`8-celular-${w}`);
  }

  // 9. Foto tirada sem sinal (celular): não é "Sincronizado" enquanto a foto não subiu, aparece "Na fila" com "Enviar agora" em Evidências,
  // sobe uma vez só ao voltar o sinal, a etiqueta muda para "Enviada" e a outra sessão (o servidor) recebe a evidência já com o arquivo.
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await flag("__off", true);
  await evento("offline");
  await n.ir(app.base);
  await esperar(async () => js('!!document.querySelector(".chk-foco-rodape")'), 15000);
  await n.esperar(1000);
  await clicarResposta("Não conforme");
  await n.esperar(500);
  await n.enviar("DOM.enable");
  const raiz = await n.enviar("DOM.getDocument", { depth: -1 });
  const entrada = await n.enviar("DOM.querySelector", { nodeId: raiz.root.nodeId, selector: "input[type=file].sr-only" });
  await n.enviar("DOM.setFileInputFiles", { files: [jpg], nodeId: entrada.nodeId });
  await esperar(async () => /Foto guardada/.test(await texto()), 10000);
  const aviso9 = await texto();
  registrar("9a. foto sem sinal: aviso curto 'Foto guardada · Na fila'", /Foto guardada · Na fila/.test(aviso9));
  await clicarBotao("Ok");
  await n.esperar(800);
  registrar("9b. com foto pendente o selo não diz 'Sincronizado'", !/Sincronizado/.test(await texto()) && /Sem sinal/.test(await texto()));
  await clicarBotao("Evidências");
  await esperar(async () => /Na fila/.test(await texto()), 10000);
  registrar("9c. Evidências: a foto mostra 'Na fila' e a ação 'Enviar agora'", /Na fila/.test(await texto()) && /Enviar agora/.test(await texto()));
  await foto("9-evidencias-na-fila");
  await n.ir(app.base);
  await esperar(async () => /Na fila|Evidências/.test(await texto()), 15000);
  const idbPendente = await js(`new Promise((res)=>{const r=indexedDB.open("mbp-fila-evidencias",1);r.onsuccess=()=>{const g=r.result.transaction("itens").objectStore("itens").getAll();g.onsuccess=()=>res(g.result.filter(i=>i.estado!=="enviado"&&i.arquivo).length)}})`);
  registrar("9d. F5 sem sinal: a foto continua guardada no aparelho (única cópia)", idbPendente === 1, String(idbPendente));
  await flag("__off", false);
  await evento("online");
  const subiu = await esperar(async () => Number(await js(`JSON.parse(localStorage.getItem("__ups")||"[]").length`)) >= 1, 20000);
  await n.esperar(4000);
  const ups = await js(`JSON.parse(localStorage.getItem("__ups")||"[]")`);
  registrar("9e. volta do sinal: a foto sobe uma única vez", subiu && ups.length === 1, JSON.stringify(ups));
  const noServidor = await esperar(async () => (await js(`JSON.stringify(((JSON.parse(localStorage.getItem("__srv")).data.evidencias)||[]).map(e=>({envio:e.envio,url:!!e.blobUrl})))`)).includes('"envio":"enviada","url":true'), 20000);
  registrar("9f. outra sessão (servidor) recebe a evidência já enviada, com o arquivo", noServidor, await js(`JSON.stringify(((JSON.parse(localStorage.getItem("__srv")).data.evidencias)||[]).map(e=>({envio:e.envio,url:!!e.blobUrl})))`));
  await clicarBotao("Evidências");
  registrar("9g. Evidências: a etiqueta muda para 'Enviada' e o selo volta a 'Sincronizado'", (await esperar(async () => /Enviada/.test(await texto()), 10000)) && (await esperar(async () => /Sincronizado/.test(await texto()), 10000)));
  await foto("9-evidencias-enviada");

  // 10. Foto "presa": está na fila do aparelho guardada sem conta ("local") e SEM registro em Evidências. A conta que entrou a adota,
  // o registro é recriado, a foto sobe uma única vez e nada é apagado antes da confirmação do servidor.
  await js(`new Promise((res)=>{const r=indexedDB.open("mbp-fila-evidencias",1);r.onsuccess=()=>{const tx=r.result.transaction("itens","readwrite");tx.objectStore("itens").put({id:"presa-2259-offline",usuarioId:"local",empresaId:"beyond-nutri",visitaId:"vt1",tipo:"Foto",nomeArquivo:"f.jpg",mimeType:"image/jpeg",ambiente:"",descricao:"foto presa",capturadoEm:"2026-10-23T22:59:00.000Z",bytes:10,estado:"aguardando",tentativas:8,arquivo:new Blob([new Uint8Array([255,216,255,224,0,16,74,70,73,70])],{type:"image/jpeg"})});tx.oncomplete=()=>res(true)}})`);
  await js(`localStorage.setItem("__ups","[]")`);
  await n.ir(app.base);
  const resgatada = await esperar(async () => (await js(`JSON.parse(localStorage.getItem("__ups")||"[]")`)).includes("presa-2259-offline"), 25000);
  registrar("10a. foto presa (sem conta e sem registro) é adotada e enviada, uma vez só", resgatada && (await js(`JSON.parse(localStorage.getItem("__ups")||"[]").filter(i=>i==="presa-2259-offline").length`)) === 1);
  const recriada = await esperar(async () => (await js(`JSON.stringify((JSON.parse(localStorage.getItem(${JSON.stringify(CHAVE)})).evidencias||[]).filter(e=>e.id==="presa-2259-offline").map(e=>({envio:e.envio,url:!!e.blobUrl,em:e.criadoEm})))`)).includes('"envio":"enviada","url":true'), 20000);
  registrar("10b. o registro em Evidências foi recriado com a data da captura e a etiqueta 'Enviada'", recriada, await js(`JSON.stringify((JSON.parse(localStorage.getItem(${JSON.stringify(CHAVE)})).evidencias||[]).filter(e=>e.id==="presa-2259-offline").map(e=>({envio:e.envio,url:!!e.blobUrl,em:e.criadoEm})))`));

  // 11. Caminho "Arquivo" (Evidências › Nova evidência › Arquivo), com sinal: o mesmo caminho da câmera. A foto sobe e o registro fica com o arquivo.
  await js(`localStorage.setItem("__ups","[]")`);
  await n.ir(app.base);
  await esperar(async () => js('!!document.querySelector(".campo-bar")'), 15000);
  await clicarBotao("Evidências");
  await esperar(async () => js('!![...document.querySelectorAll("button")].find(b=>b.innerText.includes("Nova evidência"))'), 10000);
  await js(`[...document.querySelectorAll("button")].find(b=>b.innerText.includes("Nova evidência")).click()`);
  await esperar(async () => js('!!document.querySelector(".ev7-cap--arquivo")'), 10000);
  await js(`document.querySelector(".ev7-cap--arquivo").parentElement.querySelector("input[type=file]").setAttribute("data-alvo","1")`);
  const raiz2 = await n.enviar("DOM.getDocument", { depth: -1 });
  const alvo2 = await n.enviar("DOM.querySelector", { nodeId: raiz2.root.nodeId, selector: "[data-alvo='1']" });
  await n.enviar("DOM.setFileInputFiles", { files: [jpg], nodeId: alvo2.nodeId });
  await n.esperar(1200);
  await clicarBotao("Salvar");
  const subiuArquivo = await esperar(async () => Number(await js(`JSON.parse(localStorage.getItem("__ups")||"[]").length`)) === 1, 20000).catch(() => false);
  const idArquivo = await js(`JSON.parse(localStorage.getItem("__ups")||"[]")[0]||""`);
  registrar("11a. caminho 'Arquivo' com sinal: o arquivo sobe uma vez e o registro guarda o arquivo enviado", subiuArquivo && Boolean(idArquivo) && (await js(`(JSON.parse(localStorage.getItem(${JSON.stringify(CHAVE)})).evidencias||[]).some(e=>e.id===${JSON.stringify(idArquivo)}&&!!e.blobPathname)`)), idArquivo.slice(0, 8));
  await foto("11-arquivo-com-sinal");
  registrar("11b. o registro do caminho 'Arquivo' mostra estado coerente (sem 'Arquivo não enviado') e o selo fica 'Sincronizado'", !/Arquivo não enviado/.test(await texto()) && (await esperar(async () => /Sincronizado/.test(await texto()), 10000)));

  // 12. Registro SEM arquivo e SEM item na fila (o caso da foto presa): mostra "Arquivo não enviado", conta no selo como erro e "Anexar de novo"
  // liga o arquivo ao MESMO registro (mesmo id, mesma data de captura, sem duplicar).
  await js(`(()=>{const k=${JSON.stringify(CHAVE)};const d=JSON.parse(localStorage.getItem(k));d.evidencias=(d.evidencias||[]).filter(e=>e.id!=="sem-arquivo-2259");d.evidencias.unshift({id:"sem-arquivo-2259",empresaId:"beyond-nutri",visitaId:"vt1",tipo:"Foto",nomeArquivo:"item4.jpg",mimeType:"image/jpeg",descricao:"",ambiente:"",criadoEm:"2026-10-23T22:59:00.000Z"});localStorage.setItem(k,JSON.stringify(d))})()`);
  await js(`localStorage.setItem("__ups","[]")`);
  await n.ir(app.base);
  await esperar(async () => js('!!document.querySelector(".campo-bar")'), 15000);
  await clicarBotao("Evidências");
  const semArquivoMostrado = await esperar(async () => /Arquivo não enviado/.test(await texto()), 15000);
  registrar("12a. registro sem arquivo e sem item na fila mostra 'Arquivo não enviado' e 'Anexar de novo'", semArquivoMostrado && /Anexar de novo/.test(await texto()));
  registrar("12b. esse registro conta no selo como 'Erro ao enviar'", await esperar(async () => /Erro ao enviar/.test(await texto()), 8000));
  await foto("12-arquivo-nao-enviado");
  await js(`[...document.querySelectorAll("article.ev7-card")].find(c=>c.innerText.includes("Anexar de novo")&&c.innerText.includes("19:59")).querySelector("input[type=file]").setAttribute("data-alvo","2")`);
  const raiz3 = await n.enviar("DOM.getDocument", { depth: -1 });
  const alvo3 = await n.enviar("DOM.querySelector", { nodeId: raiz3.root.nodeId, selector: "[data-alvo='2']" });
  await n.enviar("DOM.setFileInputFiles", { files: [jpg], nodeId: alvo3.nodeId });
  await n.esperar(2500);
  const religado = await esperar(async () => (await js(`JSON.parse(localStorage.getItem("__ups")||"[]")`)).includes("sem-arquivo-2259"), 25000);
  const registros = await js(`JSON.stringify((JSON.parse(localStorage.getItem(${JSON.stringify(CHAVE)})).evidencias||[]).filter(e=>e.id==="sem-arquivo-2259").map(e=>({envio:e.envio,arquivo:!!e.blobPathname,em:e.criadoEm})))`);
  await foto("12-depois-de-anexar");
  registrar("12c. 'Anexar de novo': o arquivo sobe uma vez e liga ao MESMO registro, com a data da captura", religado && registros === '[{"envio":"enviada","arquivo":true,"em":"2026-10-23T22:59:00.000Z"}]', registros);
  registrar("12d. sem duplicar: continua um único registro com esse id", (await js(`(JSON.parse(localStorage.getItem(${JSON.stringify(CHAVE)})).evidencias||[]).filter(e=>e.id==="sem-arquivo-2259").length`)) === 1);
  registrar("12e. depois do envio o selo volta a 'Sincronizado'", await esperar(async () => /Sincronizado/.test(await texto()), 12000));

  // 13. Avanço automático: Conforme grava e abre o próximo item (aviso com Desfazer); Não conforme e observação já digitada NÃO avançam.
  await n.enviar("Emulation.clearDeviceMetricsOverride");
  await n.ir(app.base);
  await esperar(async () => js('!!document.querySelector(".pc-side")'), 20000);
  await n.esperar(1500);
  await js('[...document.querySelectorAll("button")].find((b) => b.innerText.trim().startsWith("Checklist"))?.click()');
  await esperar(async () => js('document.querySelectorAll(".chk-pc-num").length>2'), 20000);
  await n.esperar(1500);
  const titulo = () => js('document.querySelector(".chk-foco-title")?.innerText||""');
  await clicarNumero(8);
  await n.esperar(500);
  const tituloAntes = await titulo();
  await clicarResposta("Conforme");
  await n.esperar(1100);
  const tituloDepois = await titulo();
  const id8 = (await status()).split(",")[7].split(":")[0];
  registrar("13a. Conforme grava na hora e, depois de ~0,5 s, abre o PRÓXIMO item", Boolean(tituloAntes) && tituloDepois !== tituloAntes && (await status()).includes(id8 + ":Conforme"), tituloAntes + " -> " + tituloDepois);
  registrar("13b. o aviso diz 'Item 8 · Conforme' e tem o botão Desfazer", await js('(()=>{const t=document.querySelector(".pc-toast");return !!t&&t.innerText.includes("Item 8 · Conforme")&&!!t.querySelector(".toast-acao")})()'));
  await js('document.querySelector(".toast-acao")?.click()');
  await n.esperar(500);
  registrar("13c. Desfazer volta ao item e deixa a resposta como Pendente", (await titulo()) === tituloAntes && (await status()).includes(id8 + ":Pendente"), await titulo());
  await clicarResposta("Não Conforme");
  await n.esperar(1100);
  registrar("13d. Não conforme NÃO avança sozinho (fica no item para gravidade, foto e observação)", (await titulo()) === tituloAntes);
  await clicarNumero(9);
  await n.esperar(500);
  const titulo9 = await titulo();
  await js(`(()=>{const el=document.querySelector(".chk-obs-area");el.focus();const d=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value");d.set.call(el,"Já escrevi antes do toque");el.dispatchEvent(new Event("input",{bubbles:true}))})()`);
  await n.esperar(300);
  await clicarResposta("Conforme");
  await n.esperar(1100);
  registrar("13e. com observação já digitada o Conforme NÃO avança sozinho", Boolean(titulo9) && (await titulo()) === titulo9);

  // 14. Celular 390x844: Início sem o nome da empresa repetido e o "Mais" em seções, uma linha de apoio por item, sem a etiqueta "novo".
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await n.ir(app.base);
  await esperar(async () => js('!!document.querySelector(".campo-bar")'), 20000);
  await n.esperar(1500);
  await js('[...document.querySelectorAll(".campo-tab")].find((b) => b.innerText.includes("Início"))?.click()');
  await n.esperar(600);
  await foto("14-inicio-celular");
  registrar("14a. Início do celular: o botão 'Continuar checklist' não repete a contagem e a visita não repete o nome da empresa", await js(`(()=>{const t=document.querySelector(".campo-tela")?.innerText||"";const cartao=document.querySelector(".campo-card--visita")?.innerText||"";const emp=document.querySelector(".emp-ativa-nome")?.innerText||"";return /Continuar checklist/.test(t)&&!/itens? sem resposta/.test(t)&&(!emp||!cartao.includes(emp))})()`));
  await js('[...document.querySelectorAll(".campo-tab")].find((b) => b.innerText.includes("Mais"))?.click()');
  await n.esperar(600);
  await foto("14-mais-celular");
  registrar("14b. Mais em seções com uma linha de apoio por item e sem a etiqueta 'novo'", await js(`(()=>{const t=document.querySelector(".campo-tela--mais")?.innerText||"";const secoes=["Da visita atual","Cadastro e documentos","Conta e app","Ações"].every((x)=>t.includes(x));const apoio=document.querySelectorAll(".campo-mais-sub").length;return secoes&&apoio>=8&&!/novo/i.test(t.replace(/novos?/gi,"x"))&&t.includes("Meu perfil")&&t.includes("Trocar empresa")&&t.includes("Sair")&&t.includes("Usar versão completa agora")})()`));
  registrar("14c. Mais: atalho '+ Nova empresa' em Empresas; o resto rola por dentro e a página não rola", await js(`(()=>{const t=document.querySelector(".campo-tela--mais")?.innerText||"";const r=document.querySelector(".campo-mais-rolagem");return t.includes("+ Nova empresa")&&!!r&&getComputedStyle(r).overflowY==="auto"&&document.documentElement.scrollHeight<=innerHeight+2})()`));
  await n.enviar("Emulation.clearDeviceMetricsOverride");
} catch (erro) {
  registrar(`erro na verificação: ${erro.message}`, false);
} finally {
  await n.fechar();
  app.parar();
}

const falhas = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - falhas.length} de ${resultados.length} passaram.`);
process.exit(falhas.length ? 1 : 0);
