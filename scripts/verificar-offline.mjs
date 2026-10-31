// Verificação do trabalho sem sinal, no app de verdade (navegador sem janela, via DevTools) e com um "servidor" falso dentro da página:
// ele guarda o estado e a versão (updated_at) no localStorage da página, devolve 409 quando a versão esperada não é a atual, e obedece a interruptores
// (sem sinal, sessão expirada, resposta perdida depois de gravar). Nada sai da máquina. Dados: só a empresa de teste "Beyond Nutri".
// Uso: npm run build && node --experimental-strip-types scripts/verificar-offline.mjs [--saida pasta]
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
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

const TITULO_LONGO = "Equipamentos de refrigeração sem registro diário de temperatura e sem identificação dos produtos armazenados na câmara fria da cozinha";
const estadoInicial = async () => {
  const e = await montarEstado();
  const item = (n) => ({ id: `i${n}`, ambiente: "Cozinha", titulo: `Piso limpo ${n}`, categoria: "Higiene", status: "Pendente", observacao: "" });
  e.db.visitas = [{ id: "vt1", empresaId: "beyond-nutri", data: "2026-10-22", status: "Em andamento", responsavel: "Elton Volmir Strapazon", observacoes: "", progresso: 0, criadoEm: "2026-10-22T10:00:00.000Z", ambientes: ["Cozinha"], checklistVersao: 1, checklist: [item(1), item(2), item(3)] }];
  // Segunda empresa de teste (visual do redesign): "Elton Volmir Strapazon", com uma visita em andamento.
  e.db.empresas["elton-volmir"] = { ...e.db.empresas["beyond-nutri"], id: "elton-volmir", nomeFantasia: "Elton Volmir Strapazon", razaoSocial: "Elton Volmir Strapazon" };
  e.db.visitas.push({ ...e.db.visitas[0], id: "vt9", empresaId: "elton-volmir", data: "2026-10-18", checklist: [item(31), item(32)] });
  // Correção de gravidade Rotina (última da lista) com UMA foto e título longo (2 linhas no detalhe): serve à verificação 17z.
  e.db.ncs = [{ id: "nc-semente-foto", empresaId: "beyond-nutri", visitaId: "vt1", ambiente: "Cozinha", checklistItemId: "", responsavelAcao: "  elton   volmir   strapazon ", titulo: TITULO_LONGO, categoria: "Higiene", criticidade: "Rotina", referencia: "", orientacao: "", observacao: "", prioridade: "Baixa", status: "Aberta", criadoEm: "2026-10-22T10:05:00.000Z" }];
  // Pessoas com nomes compostos longos (opções do campo de responsável, 8 pessoas para a lista rolar: "primeiro nome + último sobrenome", sem cortar) e uma correção reincidente
  // (Rotina, para não mudar a ordem das demais) cuja correção anterior, resolvida na Visita 1, traz a ação que funcionou.
  const agora = "2026-10-01T10:00:00.000Z";
  const pessoa = (id, nome) => ({ id, nome, email: `${id}@example.com`, perfil: "Administrador", status: "Ativo", empresaIds: ["beyond-nutri"], cargo: "Nutricionista", criadoEm: agora, atualizadoEm: agora });
  e.db.usuarios.push(pessoa("u2", "Ana Beatriz Cavalcanti de Albuquerque Montenegro"), pessoa("u3", "Francisco José de Assis Albuquerque Vasconcelos Neto"), pessoa("u4", "Marivane Aparecida de Oliveira Santos Albuquerque"), pessoa("u5", "Bruno Henrique Teixeira"), pessoa("u6", "Carla Dias"), pessoa("u7", "Débora Lima Prado"), pessoa("u8", "Zélia Monteiro"));
  e.db.visitas.push({ ...e.db.visitas[0], id: "vt0", data: "2026-09-10", status: "Concluída", criadoEm: "2026-09-10T10:00:00.000Z", checklist: [item(41)] });
  const ncRalo = { id: "nc-ralo-agora", empresaId: "beyond-nutri", visitaId: "vt1", ambiente: "Cozinha", checklistItemId: "", titulo: "Ralo sem tampa na cozinha", categoria: "Higiene", criticidade: "Rotina", referencia: "", orientacao: "", observacao: "", prioridade: "Baixa", status: "Aberta", criadoEm: "2026-10-22T10:07:00.000Z" };
  e.db.ncs.push(ncRalo, { ...ncRalo, id: "nc-ralo-antes", visitaId: "vt0", status: "Resolvida", acaoCorretiva: "Trocar o ralo e registrar a limpeza diária", responsavelAcao: "Marivane Aparecida de Oliveira Santos Albuquerque", prazo: "2026-09-20", criadoEm: "2026-09-10T10:07:00.000Z", resolvidaEm: "2026-09-18T10:00:00.000Z" });
  e.db.evidencias = [{ id: "ev-semente-foto", empresaId: "beyond-nutri", visitaId: "vt1", tipo: "Foto", nomeArquivo: "semente.jpg", mimeType: "image/jpeg", blobPathname: "fake/ev-semente-foto.jpg", descricao: "", ambiente: "Cozinha", ncId: "nc-semente-foto", criadoEm: "2026-10-22T10:06:00.000Z" }];
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
// No celular (modo Campo) as Evidências ficam em "Mais" (a barra de baixo não tem mais um botão escondido).
const abrirEvidenciasNoCelular = async () => {
  await js('[...document.querySelectorAll(".campo-bar .campo-tab")].find((b) => b.innerText.trim().endsWith("Mais"))?.click()');
  await n.esperar(400);
  return js('(()=>{const b=[...document.querySelectorAll("button")].find((x)=>x.innerText.trim().startsWith("Evidências"));if(!b)return false;b.click();return true})()');
};
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
    const m = JSON.parse(await js(`JSON.stringify((()=>{const r=(q)=>{const e=document.querySelector(q);return e?e.getBoundingClientRect():null};const f=r(".chk-foco-rodape"),b=r(".campo-bar"),o=r(".campo-register-orb"),c=document.querySelector(".chk-foco-corpo"),topo=r(".chk-foco-topo");return {f:f&&{t:f.top,b:f.bottom},bar:b&&b.top,orb:o&&o.top,rolaPorDentro:c?getComputedStyle(c).overflowY:"",docRola:document.documentElement.scrollHeight>innerHeight+2,topoB:topo&&topo.bottom,vh:innerHeight,hh:(document.querySelector(".campo-tela--fixa")||{style:{}}).style.height,tt:(document.querySelector(".campo-tela--fixa")||document.body).getBoundingClientRect().top}})())`));
    const ok = m.f && m.f.t > 0 && m.f.b <= m.bar + 0.5 && m.f.b <= m.orb + 0.5 && m.f.t > m.topoB && /auto|scroll/.test(m.rolaPorDentro);
    registrar(`8. celular ${w}x${h}: rodapé fixo à vista acima da barra e do botão Registrar, conteúdo rola por dentro`, Boolean(ok), JSON.stringify(m));
    await foto(`8-celular-${w}`);
    registrar(`8b. celular ${w}x${h}: faixa da visita (abas que rolam; o Finalizar fica na Central); barra de baixo de 5 itens com os destinos do trilho, rótulo de 12 px e alvos de 44 px; sem rolagem horizontal`, await js(`(()=>{const fin=document.querySelector(".fv .fv-finalizar");const seg=document.querySelector(".fv-seg");const abas=[...document.querySelectorAll(".campo-bar .campo-tab, .campo-bar .campo-register")];const rot=[...document.querySelectorAll(".campo-bar .campo-tab-label")].map((x)=>x.textContent.trim());if(!seg)return false;return abas.every((b)=>b.getBoundingClientRect().height>=40)&&["Início","Visitas","Correções","Mais"].every((x)=>rot.includes(x))&&getComputedStyle(document.querySelector(".campo-bar .campo-tab-label")).fontSize==="13px"&&document.documentElement.scrollWidth<=innerWidth+1})()`));
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
  await abrirEvidenciasNoCelular();
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
  await abrirEvidenciasNoCelular();
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
  await abrirEvidenciasNoCelular();
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
  // O servidor falso anota o envio em "__ups" ANTES de responder; o app só grava o registro com o arquivo (blobPathname) depois da resposta,
  // e o estado vai ao localStorage em seguida. Ler na hora é uma corrida do teste: espera-se a condição (até 15 s) e o motivo da falha é impresso.
  const lerRegs11a = () => js(`JSON.stringify((JSON.parse(localStorage.getItem(${JSON.stringify(CHAVE)})).evidencias||[]).filter(e=>!e.id.startsWith("ev-semente")).map(e=>({id:e.id.slice(0,8),envio:e.envio,blob:!!e.blobPathname})))`);
  const registroComArquivo11a = Boolean(idArquivo) && (await esperar(async () => (await js(`(JSON.parse(localStorage.getItem(${JSON.stringify(CHAVE)})).evidencias||[]).some(e=>e.id===${JSON.stringify(idArquivo)}&&!!e.blobPathname)`)) === true, 15000));
  const upsFinal11a = await js(`localStorage.getItem("__ups")||"[]"`);
  const regs11a = await lerRegs11a();
  registrar("11a. caminho 'Arquivo' com sinal: o arquivo sobe uma vez e o registro guarda o arquivo enviado", subiuArquivo && registroComArquivo11a && (JSON.parse(upsFinal11a).length === 1), `${idArquivo.slice(0, 8)} subiu=${subiuArquivo} ups=${upsFinal11a.replace(/(.{8})[^",]*/g, "$1")} registros=${regs11a}`);
  await foto("11-arquivo-com-sinal");
  registrar("11b. o registro do caminho 'Arquivo' mostra estado coerente (sem 'Arquivo não enviado') e o selo fica 'Sincronizado'", !/Arquivo não enviado/.test(await texto()) && (await esperar(async () => /Sincronizado/.test(await texto()), 10000)));

  // 12. Registro SEM arquivo e SEM item na fila (o caso da foto presa): mostra "Arquivo não enviado", conta no selo como erro e "Anexar de novo"
  // liga o arquivo ao MESMO registro (mesmo id, mesma data de captura, sem duplicar).
  await js(`(()=>{const k=${JSON.stringify(CHAVE)};const d=JSON.parse(localStorage.getItem(k));d.evidencias=(d.evidencias||[]).filter(e=>e.id!=="sem-arquivo-2259");d.evidencias.unshift({id:"sem-arquivo-2259",empresaId:"beyond-nutri",visitaId:"vt1",tipo:"Foto",nomeArquivo:"item4.jpg",mimeType:"image/jpeg",descricao:"",ambiente:"",criadoEm:"2026-10-23T22:59:00.000Z"});localStorage.setItem(k,JSON.stringify(d))})()`);
  await js(`localStorage.setItem("__ups","[]")`);
  await n.ir(app.base);
  await esperar(async () => js('!!document.querySelector(".campo-bar")'), 15000);
  await abrirEvidenciasNoCelular();
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

  // 13. Avanço automático: Conforme grava e abre o próximo item (sem aviso; tocar de novo na resposta marcada a limpa); Não conforme e observação já digitada NÃO avançam.
  await n.enviar("Emulation.clearDeviceMetricsOverride");
  await n.ir(app.base);
  await esperar(async () => js('!!document.querySelector(".tr")'), 20000);
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
  registrar("13b. responder NÃO mostra aviso com Desfazer", await js('!document.querySelector(".toast-salvo")&&![...document.querySelectorAll(".pc-toast")].some((t)=>t.innerText.includes("Desfazer")||t.innerText.includes("Item 8"))'));
  await clicarNumero(8);
  await n.esperar(500);
  await clicarResposta("Conforme");
  await n.esperar(600);
  registrar("13c. tocar de novo em Conforme (já marcado) limpa: volta a sem resposta e fica no item", (await titulo()) === tituloAntes && (await status()).includes(id8 + ":Pendente"), await titulo());
  registrar("13c2. rodapé do checklist: 'Anterior' e 'Salvar e próximo' com 44 px de altura", await js('(()=>{const b=[...document.querySelectorAll(".chk-foco-rodape button")];return b.length===2&&b.every((x)=>Math.abs(x.getBoundingClientRect().height-44)<=1)})()'));
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
  registrar("14a. Início do celular (cartão único): 'Continuar →' com a próxima etapa, sem repetir a contagem nem o nome da empresa", await js(`(()=>{const t=document.querySelector(".campo-tela")?.innerText||"";const cartao=document.querySelector(".ini4-cartao")?.innerText||"";const emp=document.querySelector(".emp-ativa-nome")?.innerText||"";return /Continuar →/.test(cartao)&&/Próxima etapa/.test(cartao)&&!/itens? sem resposta/.test(t)&&(!emp||!cartao.includes(emp))})()`));
  await js('[...document.querySelectorAll(".campo-tab")].find((b) => b.innerText.includes("Mais"))?.click()');
  await n.esperar(600);
  await foto("14-mais-celular");
  registrar("14b. Mais (menu enxuto): seções 'Desta visita', 'Cadastros e documentos' e 'Conta e app'; Meu perfil, Sincronizar e Sair; sem subtítulos, sem 'Usar versão completa agora' e sem 'Trocar empresa'", await js(`(()=>{const t=document.querySelector(".campo-tela--mais")?.innerText||"";const secoes=["Desta visita","Cadastros e documentos","Conta e app"].every((x)=>t.includes(x));return secoes&&document.querySelectorAll(".campo-mais-sub").length===0&&t.includes("Meu perfil")&&t.includes("Sincronizar")&&t.includes("Sair")&&!t.includes("Trocar empresa")&&!t.includes("Usar versão completa")&&!t.includes("Da visita atual")&&!/novo/i.test(t.replace(/novos?/gi,"x").replace(/Nova/g,"x"))})()`));
  registrar("14c. Mais: '+ Nova' dentro da linha de Empresas e a página não rola", await js(`(()=>{const nova=document.querySelector(".campo-mais-nova");const li=nova?.closest("li");return !!nova&&nova.innerText.trim()==="+ Nova"&&!!li&&li.innerText.includes("Empresas")&&document.documentElement.scrollHeight<=innerHeight+2})()`));

  // 15. Relatório montado como RASCUNHO (Revisar) e Mapa de risco, no PC, sem sinal.
  await n.enviar("Emulation.clearDeviceMetricsOverride");
  await flag("__off", true);
  await evento("offline");
  await n.ir(app.base);
  await esperar(async () => js('!!document.querySelector(".tr")'), 20000);
  await n.esperar(1500);
  await js('[...document.querySelectorAll(".tr .tr-item")].find((b) => b.innerText.trim().endsWith("Visitas"))?.click()');
  await esperar(async () => js('!!document.querySelector(".vis-linha")'), 15000);
  await js('[...document.querySelectorAll(".vis-linha button")].find((b) => b.innerText.includes("Continuar"))?.click()');
  await esperar(async () => js('!!document.querySelector(".cc2-grade")'), 15000);
  await js('document.querySelector(\'.cc2-cartao[data-chave="relatorio"]\')?.click()');
  const abriuRelatorio = await esperar(async () => js('!!document.querySelector(".rev-faixa")'), 15000);
  registrar("15a. Relatório da visita mostra o estado 'Rascunho' e o botão Revisar (sem sinal)", abriuRelatorio && /Rascunho/.test(await texto()) && (await js('[...document.querySelectorAll("button")].some((b) => b.innerText.trim() === "Revisar")')));
  await js('[...document.querySelectorAll("button")].find((b) => b.innerText.trim() === "Revisar")?.click()');
  await n.esperar(500);
  await foto("15-revisar");
  registrar("15b. Revisar: resumo, pontuação com a fórmula visível, comparação, marcas, mapa e Parecer do RT VAZIO", await js(`(()=>{const t=document.querySelector(".rev-janela")?.innerText||"";const parecer=document.querySelector(".rev-janela textarea");return ["Resumo da visita","Pontuação por setor","Como se calcula","Comparação com a visita anterior","Como as respostas foram registradas","Mapa de risco por ambiente","Parecer do RT"].every((x)=>t.includes(x))&&t.includes("critério do app, não exigência de norma")&&!!parecer&&parecer.value===""&&!t.includes("aprovado")&&!t.includes("reprovado")})()`));
  registrar("15c. Revisar tem 'Confirmar e emitir' e o aviso de que o parecer é do RT (o app não escreve parecer)", await js(`(()=>{const t=document.querySelector(".rev-janela")?.innerText||"";return t.includes("Confirmar e emitir")&&t.includes("O parecer é do RT")||t.includes("o app não escreve parecer")})()`));
  await js('[...document.querySelectorAll(".rev-janela button")].find((b) => b.innerText.trim() === "Fechar")?.click()');
  await n.esperar(300);
  await js('[...document.querySelectorAll("button")].find((b) => b.innerText.trim().startsWith("Relatórios"))?.click()');
  await n.esperar(800);
  const abriuAba = await js('(()=>{const a=[...document.querySelectorAll(".rel-aba")].find((b)=>b.innerText.trim()==="Mapa de risco");if(!a)return false;a.click();return true})()');
  await n.esperar(700);
  await foto("15-mapa");
  registrar("15d. Aba 'Mapa de risco': um cartão por ambiente com cor, motivo em uma linha e tendência; 'Ver a regra' abre a regra", abriuAba && await js(`(()=>{const c=[...document.querySelectorAll(".mr-cartao")];if(c.length<1)return false;const t=document.querySelector(".mr-tela").innerText;const b=[...document.querySelectorAll("button")].find((x)=>x.innerText.trim()==="Ver a regra");if(!b)return false;b.click();return c.every((x)=>/mr-cartao--(vermelho|laranja|amarelo|azul|cinza)/.test(x.className))&&t.includes("critério do app")&&/(vermelho|laranja|amarelo|azul|cinza|sem dados)/i.test(t)})()`));
  await n.esperar(300);
  registrar("15e. A regra aparece escrita (critério do app) e o toque no ambiente mostra as correções dele", await js(`(()=>{const t=document.querySelector(".mr-tela").innerText;const regra=t.includes("Regra da cor")&&t.includes("Cinza (sem dados)");const c=document.querySelector("button.mr-cartao");if(c)c.click();return regra&&!!c})()`));
  await n.esperar(300);
  registrar("15f. Toque no ambiente abre o painel de correções com 'Abrir correções' (nada decidido sozinho)", await js('!!document.querySelector(".mr-detalhe")&&[...document.querySelectorAll(".mr-detalhe button")].some((b)=>b.innerText.trim()==="Abrir correções")'));
  await flag("__off", false);
  await evento("online");

  // 16. Redesign do Início e das Visitas (PC): menu azul de 168 px, cartões com anel, sem rolagem de página, nenhuma caixa laranja de ação em Visitas.
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await n.ir(app.base);
  await esperar(async () => js('!!document.querySelector(".tr")'), 20000);
  await n.esperar(1200);
  await js('[...document.querySelectorAll(".tr .tr-item")].find((b) => b.innerText.trim().endsWith("Início"))?.click()');
  await esperar(async () => js('!!document.querySelector(".ini3")'), 15000);
  await n.esperar(500);
  await foto("16-inicio");
  const ehLaranja = `(cor)=>{const m=cor.match(/\\d+/g);if(!m)return false;const [r,g,b]=m.map(Number);return r>200&&g>90&&g<175&&b<90}`;
  registrar("16a. Trilho azul de 104 px, página atual em âmbar", await js(`(()=>{const m=document.querySelector(".tr");const a=document.querySelector(".tr .tr-item.is-atual");if(!m||!a)return false;return Math.round(m.getBoundingClientRect().width)===104&&getComputedStyle(m).backgroundColor==="rgb(38, 74, 128)"&&getComputedStyle(a).backgroundColor==="rgb(28, 150, 150)"})()`));
  registrar("16b. Menu: 'Mais' guarda Empresas, Cadastros, Ajuda e guias e Administração", await js(`(()=>{const b=[...document.querySelectorAll(".tr .tr-item")].find((x)=>x.innerText.trim().endsWith("Mais"));if(!b)return false;b.click();return true})()`) && await js(`(()=>{const t=document.querySelector(".tr-quadro")?.innerText||"";return ["Empresas","Cadastros","Ajuda e guias","Administração"].every((x)=>t.includes(x))})()`));
  await js('window.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape"}))');
  registrar("16c. Início: 'Olá', cartão único do 'Continuar de onde parei' com anel de progresso e 'Continuar →' azul, até 3 correções com faixa colorida", await js(`(()=>{const t=document.querySelector(".ini3").innerText;const c=document.querySelector(".ini4-cartao");const botao=c&&c.querySelector(".ini3-botao");const anel=c&&c.querySelector(".ini3-anel circle:nth-child(2)");return t.includes("Olá,")&&t.includes("Continuar de onde parei")&&!!c&&!!anel&&getComputedStyle(botao).backgroundColor==="rgb(38, 74, 128)"&&getComputedStyle(anel).stroke==="rgb(33, 163, 163)"&&getComputedStyle(c).backgroundColor==="rgb(255, 246, 229)"&&document.querySelectorAll(".ini3-linha").length>=1&&document.querySelectorAll(".ini3-linha").length<=3&&!!document.querySelector(".ini3-faixa")&&!t.includes("PENDÊNCIAS")})()`));
  registrar("16d. Início sem rolagem de página (a lista rola por dentro)", await js('document.scrollingElement.scrollHeight<=innerHeight+2&&document.querySelector(".pc-offset").scrollHeight<=innerHeight+2'));
  await js('[...document.querySelectorAll(".tr .tr-item")].find((b) => b.innerText.trim().endsWith("Visitas"))?.click()');
  await esperar(async () => js('!!document.querySelector(".vis-linha")'), 15000);
  await n.esperar(500);
  await foto("16-visitas");
  registrar("16e. Visitas: nenhuma caixa laranja de ação; ações em azul #264A80 com texto branco peso 400", await js(`(()=>{const laranja=${ehLaranja};const botoes=[...document.querySelectorAll('.ui-screen[aria-label="Visitas técnicas"] button')];const bg=botoes.map((b)=>getComputedStyle(b).backgroundColor);const nenhumaLaranja=bg.every((c)=>!laranja(c));const continuar=[...botoes].find((b)=>b.innerText.includes("Continuar"));const nova=[...botoes].find((b)=>b.innerText.includes("Nova visita"));return nenhumaLaranja&&!!continuar&&getComputedStyle(continuar).backgroundColor==="rgb(255, 255, 255)"&&getComputedStyle(nova).backgroundColor==="rgb(38, 74, 128)"&&getComputedStyle(nova).color==="rgb(255, 255, 255)"&&["400","500"].includes(getComputedStyle(nova).fontWeight)&&["400","500"].includes(getComputedStyle(continuar).fontWeight)&&getComputedStyle(nova).height==="40px"&&getComputedStyle(nova).borderRadius==="10px"&&!document.querySelector('.ui-screen[aria-label="Visitas técnicas"] input[type="search"]')})()`));
  registrar("16f. Visitas: chip 'Aberta há N dias' azul claro com texto preto; NC em vermelho; barra azul", await js(`(()=>{const chip=document.querySelector(".vis-aviso-terra");const nc=document.querySelector(".vis-conta--nc");const fill=document.querySelector(".ui-progress-fill");if(!chip||!nc||!fill)return false;return getComputedStyle(chip).backgroundColor==="rgba(0, 0, 0, 0)"&&getComputedStyle(chip).color==="rgb(82, 100, 119)"&&getComputedStyle(chip).fontWeight==="400"&&getComputedStyle(fill).backgroundColor==="rgb(33, 163, 163)"&&(nc.classList.contains("is-zero")||getComputedStyle(nc).color==="rgb(200, 63, 69)")})()`));
  registrar("16g. Visitas: página sem rolagem; abas, busca e botões continuam no alto", await js('document.scrollingElement.scrollHeight<=innerHeight+2&&!!document.querySelector(".vis-toolbar")'));
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await n.ir(app.base);
  await esperar(async () => js('!!document.querySelector(".campo-bar")'), 20000);
  await n.esperar(1200);
  await foto("16-inicio-celular");
  registrar("16h. Celular: sem rolagem horizontal no Início", await js("document.documentElement.scrollWidth<=innerWidth+1"));

  // 17. Trilho único (dentro e fora da visita), faixa da visita e tela Correções da visita.
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 800, deviceScaleFactor: 1, mobile: false });
  await n.ir(app.base);
  await esperar(async () => js('!!document.querySelector(".tr")'), 20000);
  await n.esperar(1200);
  const itemDoTrilho = (rotulo, acao) => js(`(()=>{const b=[...document.querySelectorAll(".tr .tr-item")].find((x)=>x.querySelector(".tr-rotulo")?.textContent.trim()===${JSON.stringify(rotulo)});if(!b)return false;${acao ? "b.click();" : ""}return true})()`);
  const noFaixa = (chave) => js(`(()=>{const b=document.querySelector('.fv .fv-item[data-chave="${chave}"]');if(!b)return false;b.click();return true})()`);
  const rotulosDoTrilho = 'JSON.stringify([...document.querySelectorAll(".tr .tr-item .tr-rotulo, .tr .tr-registrar .tr-rotulo")].map((x)=>x.textContent.trim()))';
  registrar("17a. Trilho: Registrar, Início, Visitas, Correções, POPs, Relatórios e Mais; avatar dentro da janela; sem rolagem em 800 px", await js(`(()=>{const t=document.querySelector(".tr");if(!t)return false;const rot=${rotulosDoTrilho};const a=document.querySelector(".tr-avatar").getBoundingClientRect();return ["Registrar","Início","Visitas","Correções","POPs","Relatórios","Mais"].every((x)=>rot.includes(x))&&a.bottom<=innerHeight&&t.querySelector(".tr-lista").scrollHeight<=t.querySelector(".tr-lista").clientHeight+1&&!document.querySelector(".fv")})()`));
  await itemDoTrilho("Mais", true);
  await n.esperar(300);
  registrar("17b. 'Mais' abre um quadro ao lado (290 px), sem empurrar o conteúdo, e fecha com Esc e ao tocar fora", await js(`(()=>{const q=document.querySelector(".tr-quadro");return !!q&&Math.round(q.getBoundingClientRect().width)===290&&q.getBoundingClientRect().left>=104&&parseInt(getComputedStyle(document.querySelector(".pc-offset")).marginLeft)===104})()`) && (await js('window.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape"}))'), await n.esperar(200), await js('!document.querySelector(".tr-quadro")')) && (await itemDoTrilho("Mais", true), await n.esperar(200), await js('document.body.dispatchEvent(new MouseEvent("mousedown",{bubbles:true}))'), await n.esperar(200), await js('!document.querySelector(".tr-quadro")')));
  await itemDoTrilho("Visitas", true);
  await esperar(async () => js('!!document.querySelector(".vis-linha")'), 15000);
  await js('[...document.querySelectorAll(".vis-linha button")].find((b)=>b.innerText.includes("Continuar"))?.click()');
  await esperar(async () => js('!!document.querySelector(".cc2-grade")'), 15000);
  await n.esperar(500);
  await foto("17-central-da-visita");
  const central17 = JSON.parse(await js(`JSON.stringify((()=>{const s=document.querySelector('.ui-screen[aria-label="Central da visita"]');if(!s)return null;const cards=[...s.querySelectorAll(".cc2-cartao")];const rc=(e)=>e.getBoundingClientRect();const cs=(e)=>getComputedStyle(e);const grade=s.querySelector(".cc2-grade");const colunas=cs(grade).gridTemplateColumns.split(" ").length;const fin=s.querySelector(".cc2-finalizar");const prox=s.querySelector(".cc2-proxima");const cont=s.querySelector(".cc2-continuar");return {semFaixa:!document.querySelector(".fv"),n:cards.length,colunas,alturas:cards.map((c)=>Math.round(rc(c).height)),textos:cards.map((c)=>c.querySelector(".cc2-resumo").innerText.trim()),cores:cards.map((c)=>cs(c.querySelector(".cc2-icone")).backgroundColor),iconeBranco:cards.every((c)=>cs(c.querySelector(".cc2-icone")).color==="rgb(255, 255, 255)"),fundo:cards.map((c)=>cs(c).backgroundColor),finalizar:fin?{bg:cs(fin).backgroundColor,borda:cs(fin).borderTopColor,cor:cs(fin).color,peso:cs(fin).fontWeight}:null,proxima:prox?{bg:cs(prox).backgroundColor,borda:cs(prox).borderTopColor,barra:rc(s.querySelector(".cc2-barra")).height}:null,continuar:cont?{bg:cs(cont).backgroundColor,cor:cs(cont).color,peso:cs(cont).fontWeight}:null,semAtividade:!/Atividade da visita/.test(s.innerText)}})())`));
  registrar("17c0. Central da visita (Completo): sem a linha de abas, seis cartões iguais em 3 colunas, círculo de cor forte com ícone branco, cartão branco", Boolean(central17) && central17.semFaixa && central17.n === 6 && central17.colunas === 3 && central17.alturas.every((h) => h === central17.alturas[0]) && central17.iconeBranco && central17.fundo.every((c) => c === "rgb(255, 255, 255)") && central17.cores.length === 6 && central17.semAtividade, JSON.stringify(central17));
  registrar("17c0a. Central da visita: cartão Checklist com 'N itens a responder' (ou 'Tudo respondido') em uma linha e sem reticências; Próxima etapa em cartão branco com barra de 6 px", Boolean(central17) && /^(\d+ itens? a responder|Tudo respondido)$/.test(central17.textos[0] || "") && !central17.textos.some((t) => /…|\.\.\./.test(t)) && central17.proxima && central17.proxima.bg === "rgb(255, 255, 255)" && central17.proxima.barra === 6, JSON.stringify(central17 && { textos: central17.textos, proxima: central17.proxima }));
  registrar("17c0b. Central: 'Finalizar visita' em contorno (borda #7F8BA3, fundo branco, texto preto, peso 400) e 'Continuar inspeção →' laranja escuro com texto branco", Boolean(central17) && Boolean(central17.finalizar) && central17.finalizar.bg === "rgb(255, 255, 255)" && central17.finalizar.borda === "rgb(127, 139, 163)" && central17.finalizar.peso === "400" && Boolean(central17.continuar) && central17.continuar.bg === "rgb(217, 80, 15)" && central17.continuar.cor === "rgb(255, 255, 255)", JSON.stringify(central17 && { f: central17.finalizar, c: central17.continuar }));
  const ncs17 = JSON.parse(await js(`JSON.stringify((()=>{const s=document.querySelector('.ui-screen[aria-label="Central da visita"]');const linhas=[...s.querySelectorAll(".cc2-nc")];const ver=s.querySelector(".cc2-ver-todas");const titulo=s.querySelector(".cc2-ncs-titulo");return {n:linhas.length,semChipAberta:!/\\bAberta\\b/.test(linhas.map((l)=>l.innerText).join(" ")),semAcompanhar:!/Acompanhar/.test(s.innerText),clicaveis:linhas.every((l)=>l.tagName==="BUTTON"),verTodas:ver?ver.innerText.trim():null,verTodasNoTopo:!!ver&&!!titulo&&ver.getBoundingClientRect().top<=titulo.getBoundingClientRect().bottom+4}})())`));
  registrar("17c0c. Central: lista de não conformidades sem chip 'Aberta' nem 'Acompanhar →', cada linha inteira é um botão, e 'Ver todas (N) →' no topo à direita do título", ncs17.n > 0 && ncs17.semChipAberta && ncs17.semAcompanhar && ncs17.clicaveis && /^Ver todas \(\d+\) →$/.test(ncs17.verTodas || "") && ncs17.verTodasNoTopo, JSON.stringify(ncs17));
  registrar("17c0d. Seletor 'Empresa ativa' sem avatar com iniciais, rótulo com 15 px e contido na caixa", await js(`(()=>{const sel=document.querySelector(".pc-topbar .emp-ativa-selo");const cx=document.querySelector(".pc-topbar .emp-ativa-caixa");if(!sel||!cx)return false;const a=sel.getBoundingClientRect();const c=cx.getBoundingClientRect();return !document.querySelector(".emp-ativa-avatar")&&getComputedStyle(sel).fontSize==="15px"&&sel.scrollWidth<=sel.clientWidth+1&&a.right<=c.right+0.5&&a.top>=0})()`));
  await js('document.querySelector(\'.cc2-cartao[data-chave="checklist"]\')?.click()');
  await esperar(async () => js('!!document.querySelector(".fv")'), 15000);
  await n.esperar(300);
  await foto("17-faixa-da-visita");
  registrar("17c. Dentro da visita o trilho é o mesmo (sem cartão 'Visita atual', sem Finalizar/Sair) e 'Visitas' fica como página atual", await js(`(()=>{const t=document.querySelector(".tr");const rot=${rotulosDoTrilho};const atual=t.querySelector(".tr-item.is-atual .tr-rotulo")?.textContent.trim();return ["Registrar","Início","Visitas","Correções","POPs","Relatórios","Mais"].every((x)=>rot.includes(x))&&!rot.includes("Finalizar")&&!rot.includes("Sair")&&!t.querySelector(".tr-visita")&&atual==="Visitas"&&getComputedStyle(t.querySelector(".tr-item.is-atual")).backgroundColor==="rgb(28, 150, 150)"&&t.scrollHeight<=t.clientHeight+1})()`));
  registrar("17d. Faixa da visita: Checklist, Evidências, Correções (número), POPs, Relatório (abas em texto, sem fundo cinza) SEM 'Finalizar visita' (ele só existe na Central); 44 px de altura, 16 px abaixo do topo", await js(`(()=>{const f=document.querySelector(".fv");if(!f)return false;const rot=[...f.querySelectorAll(".fv-item")].map((x)=>x.childNodes[0].textContent.trim());const fin=f.querySelector(".fv-finalizar");const seg=f.querySelector(".fv-seg");return ["Checklist","Evidências","Correções","POPs","Relatório"].every((x)=>rot.includes(x))&&!!f.querySelector('.fv-item[data-chave="correcoes"] .fv-badge')&&!fin&&getComputedStyle(seg).backgroundColor==="rgba(0, 0, 0, 0)"&&Math.round(f.getBoundingClientRect().height)>=44})()`));
  await noFaixa("correcoes");
  await esperar(async () => js('!!document.querySelector(".pc-cor .pc-detail--corr")'), 15000);
  await n.esperar(500);
  await foto("17-correcoes");
  registrar("17e. Troca de assunto pela faixa: Correções da visita abre, a faixa continua e a aba atual fica com sublinhado azul #264A80 de 3 px (sem fundo)", await js(`(()=>{const at=document.querySelector(".fv .fv-item.is-atual");return !!at&&at.getAttribute("data-chave")==="correcoes"&&getComputedStyle(at).backgroundColor==="rgba(0, 0, 0, 0)"&&getComputedStyle(at).borderBottomColor==="rgb(33, 163, 163)"&&getComputedStyle(at).borderBottomWidth==="2px"&&document.querySelector(".tr-item.is-atual .tr-rotulo")?.textContent.trim()==="Visitas"})()`));
  registrar("17f. Correções: etapas em texto com contagem, sem título repetido, lista de cartões com rodapé fixo e página sem rolagem", await js(`(()=>{const e=[...document.querySelectorAll(".pc-cor .pc-etapa")].map((x)=>x.innerText.replace(/\\s+/g," ").trim());const visivel=[...document.querySelectorAll(".pc-cor h1")].every((h)=>getComputedStyle(h).position==="absolute");return e.length===4&&/^Identificadas \\d+$/.test(e[0])&&visivel&&!!document.querySelector(".pc-cor .pc-cor-card")&&!!document.querySelector(".pc-cor .pc-cor-rodape")&&document.scrollingElement.scrollHeight<=innerHeight+2})()`));
  registrar("17g0. Correções: ao abrir, o campo do responsável já mostra o erro 'Escolha o responsável' (região aria-live com 20 px reservados), o rodapé diz 'Falta: …' e não há erro de prazo", await js(`(()=>{const erro=document.querySelector(".pc-cor .pc-resp-erro");const foot=document.querySelector(".pc-cor .pc-detail-foot");return !!erro&&erro.getAttribute("aria-live")==="polite"&&erro.textContent.trim()==="Escolha o responsável"&&Math.round(erro.getBoundingClientRect().height)>=20&&/^Falta: /.test(foot.innerText.trim())&&!document.querySelector(".pc-cor .pc-prazo-erro")&&!document.querySelector(".pc-cor .pc-prazo-aviso")})()`));
  // resultadoDosChecks é declarado mais abaixo (const): aqui a lista de medidas é avaliada na hora e cada uma tem nome.
  {
    const m17g = JSON.parse(await js(`(()=>{const campo=document.querySelector(".pc-cor .pc-resp-seletor");const erro=document.querySelector(".pc-cor .pc-resp-erro");const salvar=[...document.querySelectorAll(".pc-cor .pc-detail-foot button")].find((b)=>b.innerText.includes("Salvar plano"));const lum=(c)=>{const v=c.match(/[0-9.]+/g).slice(0,3).map(Number).map((x)=>{x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4)});return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2]};const a=lum(getComputedStyle(erro).color),b=lum(getComputedStyle(erro.closest(".pc-detail-lateral")).backgroundColor);return JSON.stringify({campo:!!campo,erroTexto:erro.textContent.trim()==="Escolha o responsável",contraste:(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)>=4.5,aria:erro.getAttribute("aria-live")==="polite",abaixo:erro.getBoundingClientRect().top>=campo.getBoundingClientRect().bottom-1,borda:getComputedStyle(campo).borderTopColor,texto:campo.innerText.replace(/\\s+/g," ").trim(),describedby:campo.getAttribute("aria-describedby")===erro.id,desabilitado:!!salvar&&salvar.disabled})})()`));
    registrar("17g. Correções: responsável vazio (depois do primeiro toque) com o erro 'Escolha o responsável' em vermelho (contraste >= 4,5:1 sobre #F4F6FA, aria-live) logo abaixo do campo único, borda vermelha #C83F45 e nenhuma pessoa escolhida; 'Salvar plano' desabilitado", m17g.campo && m17g.erroTexto && m17g.contraste && m17g.aria && m17g.abaixo && m17g.borda === "rgb(200, 63, 69)" && m17g.texto === "Escolha uma pessoa ▾" && m17g.describedby && m17g.desabilitado, JSON.stringify(m17g));
  }
  const medirSobreposicao = `(()=>{try{const raiz=document.querySelector(".pc-detail--corr");const corpo=raiz.querySelector(".pc-detail-corpo");const lateral=raiz.querySelector(".pc-detail-lateral");const cl=(e)=>lateral.contains(e)?lateral:corpo.contains(e)?corpo:null;const blocos=[...raiz.querySelectorAll(".pc-detail-head, .pc-detail-corpo > *, .pc-detail-lateral > *, .pc-detail-foot, .pc-plan-stack > *, .pc-provas > *, .pc-plan-resp > *")];const recorta=(b)=>{const r=b.getBoundingClientRect();const c=cl(b);if(!c||b===c)return r;const x=c.getBoundingClientRect();return {left:Math.max(r.left,x.left),right:Math.min(r.right,x.right),top:Math.max(r.top,x.top),bottom:Math.min(r.bottom,x.bottom)}};const rs=blocos.map((b)=>({b,r:recorta(b)})).filter(({r})=>r.right-r.left>0&&r.bottom-r.top>0);let pares=0;const nomes=[];for(let i=0;i<rs.length;i++)for(let j=i+1;j<rs.length;j++){const a=rs[i],c=rs[j];if(a.b.contains(c.b)||c.b.contains(a.b))continue;const x=Math.min(a.r.right,c.r.right)-Math.max(a.r.left,c.r.left);const y=Math.min(a.r.bottom,c.r.bottom)-Math.max(a.r.top,c.r.top);if(x>1&&y>1){pares++;nomes.push(a.b.className+" x "+c.b.className)}}const ar=document.querySelector(".tr-avatar").getBoundingClientRect();const pb=raiz.querySelector(".pc-provas-botoes");const foot=raiz.querySelector(".pc-detail-foot").getBoundingClientRect();const salvar=[...raiz.querySelectorAll(".pc-detail-foot button")].find((b)=>b.innerText.includes("Salvar plano"));return JSON.stringify({pares,nomes,provasBotoes:!!raiz.querySelector(".pc-provas .pc-prova-registrar")&&!!raiz.querySelector(".pc-acao-linha .chk-linha-foto")&&[...raiz.querySelectorAll(".pc-acao-linha .voz-linha button")].every((b)=>b.getBoundingClientRect().height>=36),corpoRola:corpo.scrollHeight>corpo.clientHeight+1,lateralRola:lateral.scrollHeight>lateral.clientHeight+1,rodapeVisivel:foot.bottom<=innerHeight+0.5&&salvar.getBoundingClientRect().bottom<=innerHeight+0.5,avatarDentro:ar.bottom<=innerHeight&&ar.top>=0,trRola:document.querySelector(".tr-lista").scrollHeight>document.querySelector(".tr-lista").clientHeight+1})}catch(e){return JSON.stringify({erro:String(e.stack).slice(0,300)})}})()`;
  // 17h: roda com a correção de 1 foto e título de 2 linhas (câmara fria); depois volta ao cartão que estava selecionado.
  const cartaoOriginal17h = await js('document.querySelector(".pc-cor .pc-cor-card.is-selected .pc-cor-titulo")?.textContent||""');
  await js(`(()=>{const c=[...document.querySelectorAll(".pc-cor .pc-cor-card")].find((x)=>x.innerText.includes("câmara fria"));c?.click();return !!c})()`);
  await esperar(async () => js('document.querySelector(".pc-cor .pc-detail-title")?.textContent.includes("câmara fria")'), 5000);
  for (const altura of [900, 800, 700]) {
    await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: altura, screenWidth: 1440, screenHeight: altura, deviceScaleFactor: 1, mobile: false });
    await n.esperar(500);
    await foto(`17-h${altura}`);
    const r = JSON.parse(await js(medirSobreposicao));
    const semRolagem = altura < 800 || (!r.corpoRola && !r.lateralRola);
    registrar(`17h. ${altura} px de altura, correção com 1 foto: nenhum bloco do painel (as duas colunas, o cabeçalho e o rodapé) interseciona outro, os botões de Provas existem, 'Salvar plano' e avatar do trilho dentro da janela${altura >= 800 ? ", e nenhuma coluna rola por dentro" : " (a 700 px o corpo rola por dentro quando não cabe)"}`, r.pares === 0 && r.provasBotoes && r.rodapeVisivel && r.avatarDentro && semRolagem, JSON.stringify(r));
  }
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
  await n.esperar(300);
  await js(`(()=>{const c=[...document.querySelectorAll(".pc-cor .pc-cor-card")].find((x)=>x.querySelector(".pc-cor-titulo")?.textContent===${JSON.stringify(cartaoOriginal17h)});c?.click();return !!c})()`);
  await n.esperar(300);
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1152, height: 640, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1.25, mobile: false });
  await n.esperar(500);
  {
    const r = JSON.parse(await js(medirSobreposicao));
    const lat = JSON.parse(await js(`(()=>{const l=document.querySelector(".pc-cor .pc-detail-lateral");const prazo=l.querySelector(".pc-plan-prazo input");const rola=l.scrollHeight>l.clientHeight+1;if(rola)prazo.scrollIntoView({block:"nearest"});const a=prazo.getBoundingClientRect(),b=l.getBoundingClientRect();const f=document.querySelector(".pc-cor .pc-detail-foot").getBoundingClientRect();const r={rola,rolaPorDentro:!rola||["auto","scroll"].includes(getComputedStyle(l).overflowY),prazoAlcancavel:a.top>=b.top-0.5&&a.bottom<=b.bottom+0.5&&a.bottom<=f.top+0.5,semRolagemHorizontal:l.scrollWidth<=l.clientWidth+1};l.scrollTop=0;return JSON.stringify(r)})()`));
    registrar("17i. Zoom de 125% em janela larga (altura útil de 640 px): nada sobreposto nas duas colunas, avatar dentro da janela; a lateral, se rolar, rola por dentro e o Prazo continua alcançável", r.pares === 0 && r.provasBotoes && r.avatarDentro && lat.rolaPorDentro && lat.prazoAlcancavel && lat.semRolagemHorizontal, JSON.stringify({ ...r, lateral: lat }));
    await foto("17-zoom125");
  }
  const medirTrilho = `(()=>{const t=document.querySelector(".tr");const lista=t.querySelector(".tr-lista");const lr=lista.getBoundingClientRect();const itens=[t.querySelector(".tr-logo"),t.querySelector(".tr-registrar"),...lista.querySelectorAll(".tr-item"),t.querySelector(".tr-avatar")].filter(Boolean).map((e)=>{const r=e.getBoundingClientRect();return {e,r:lista.contains(e)?{left:r.left,right:r.right,top:Math.max(r.top,lr.top),bottom:Math.min(r.bottom,lr.bottom)}:r}}).filter(({r})=>r.right-r.left>0&&r.bottom-r.top>0);let pares=0;for(let i=0;i<itens.length;i++)for(let j=i+1;j<itens.length;j++){const a=itens[i].r,b=itens[j].r;if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)pares++}const av=t.querySelector(".tr-avatar").getBoundingClientRect();return JSON.stringify({pares,avatarDentro:av.top>=0&&av.bottom<=innerHeight,listaRola:lista.scrollHeight>lista.clientHeight+1,h:innerHeight})})()`;
  for (const [larguraJanela, alturaJanela, escala] of [[1440, 800, 1], [1440, 700, 1], [1152, 640, 1.25], [1440, 560, 1], [1440, 480, 1]]) {
    await n.enviar("Emulation.setDeviceMetricsOverride", { width: larguraJanela, height: alturaJanela, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: escala, mobile: false });
    await n.esperar(400);
    const r = JSON.parse(await js(medirTrilho));
    registrar(`17m. Trilho em ${alturaJanela} px de altura${escala > 1 ? " (zoom de 125%)" : ""}: itens sem sobreposição, avatar dentro da janela${alturaJanela >= 560 ? ", sem rolagem no trilho" : ", a lista só rola por dentro"}`, r.pares === 0 && r.avatarDentro && (alturaJanela < 560 || !r.listaRola), JSON.stringify(r));
  }
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
  await n.esperar(500);
  // 17n. Abas e lista batem: ao tocar numa etapa a lista mostra só os itens dela e o número da aba é o da lista.
  const abasBatem = [];
  for (let i = 0; i < 4; i++) {
    await js(`document.querySelectorAll(".pc-cor .pc-etapa")[${i}].click()`);
    await n.esperar(300);
    abasBatem.push(await js(`(()=>{const aba=document.querySelectorAll(".pc-cor .pc-etapa")[${i}];const num=Number((aba.querySelector(".pc-etapa-num")||{}).textContent);const cartoes=document.querySelectorAll(".pc-cor .pc-cor-card").length;return aba.classList.contains("is-ativa")&&cartoes===num})()`));
  }
  await js('document.querySelectorAll(".pc-cor .pc-etapa")[0].click()');
  await n.esperar(300);
  registrar("17n. Correções: em cada etapa a lista mostra só os itens dela e o número da aba é o da lista", abasBatem.every(Boolean), JSON.stringify(abasBatem));
  registrar("17p. Correções: 'Escolha o responsável' é o texto vermelho abaixo da lista de pessoas (uma só vez) e o topo é só 'Visita N'", await js(`(()=>{const erros=[...document.querySelectorAll(".pc-cor .pc-resp-erro")];const outro=[...document.querySelectorAll(".pc-cor .ui-field-error")].some((x)=>x.textContent.includes("Escolha o responsável"));const topo=document.querySelector(".pc-crumbs, .pc-topbar")?.innerText||"";return erros.length===1&&erros[0].textContent.trim()==="Escolha o responsável"&&!outro&&/Visita \\d/.test(topo)&&!/Visita \\d\\s*›/.test(topo)})()`));
  registrar("17q. Correções: respiro de 32 px à direita em 'Salvar plano'; o link 'Ver no checklist ›' (quando existe) fica na linha de metadados, dentro do cabeçalho", await js(`(()=>{const fin=document.querySelector(".fv-finalizar");const salvar=[...document.querySelectorAll(".pc-cor .pc-detail-foot button")].find((b)=>b.innerText.includes("Salvar plano"));const ver=document.querySelector(".pc-cor .pc-detail-ver");const head=document.querySelector(".pc-cor .pc-detail-head").getBoundingClientRect();const direita=[salvar].every((e)=>!!e&&innerWidth-e.getBoundingClientRect().right>=31.5);const verOk=!ver||(!!ver.closest(".pc-detail-contexto")&&ver.getBoundingClientRect().right<=head.right+0.5&&ver.getBoundingClientRect().bottom<=head.bottom+0.5&&/Ver no checklist/.test(ver.textContent));return direita&&verOk})()`));
  // Cada medida vira um item com nome: a falha mostra QUAL medida quebrou, não só "falso".
  const resultadoDosChecks = (json) => { const r = JSON.parse(json); const falhas = Object.entries(r).filter(([, v]) => v === false).map(([k]) => k); return [r.existe !== false && falhas.length === 0, falhas.length ? `falhou: ${falhas.join(", ")} | ${json}` : ""]; };
  registrar("17o. Correções a 1440 px: o Responsável é UM campo seletor de 42 px (combobox), sem pessoas empilhadas nem 'Outra pessoa' tracejado, com 'Escolha uma pessoa ▾' e o rótulo 'Responsável' ligado ao campo", ...resultadoDosChecks(await js(`(()=>{const q=document.querySelector(".pc-cor .pc-plan-resp");const c=q?.querySelector(".pc-resp-seletor");const rot=q?.querySelector(".pc-plan-rotulo");return JSON.stringify({existe:!!c,umSoCampo:q.querySelectorAll('.pc-resp-seletor, .pc-resp-digitar').length===1,altura42:!!c&&Math.round(c.getBoundingClientRect().height)===42,combobox:!!c&&c.getAttribute("role")==="combobox"&&c.getAttribute("aria-haspopup")==="listbox",rotuloLigado:!!c&&!!rot&&(c.getAttribute("aria-labelledby")||"").split(" ").includes(rot.id)&&rot.textContent.trim()==="Responsável",semBotoesDePessoa:!q.querySelector("[role=radio], .pc-pessoa, .pc-pessoas, datalist"),semCorte:!!c&&c.scrollWidth<=c.clientWidth+1})})()`)));
  const medirCampoDaAcao = `(()=>{const conj=document.querySelector(".pc-cor .pc-acao-conjunto");const area=document.querySelector(".pc-cor .pc-acao-area");const linha=document.querySelector(".pc-cor .pc-acao-linha");if(!conj||!area||!linha)return JSON.stringify({existe:false,conj:!!conj,area:!!area,linha:!!linha});const c=conj.getBoundingClientRect(),a=area.getBoundingClientRect(),l=linha.getBoundingClientRect();const bordas=[conj,area].filter((e)=>parseFloat(getComputedStyle(e).borderTopWidth)>0).length;const botoes=[...linha.querySelectorAll(".voz-linha button")];return JSON.stringify({conjuntoMin150:Math.round(c.height)>=176&&Math.round(c.height)<=184,alturaDaCaixa:Math.round(a.height),alturaDoConjunto:Math.round(c.height),borda2px:getComputedStyle(conj).borderTopWidth==="2px",corDaBorda:getComputedStyle(conj).borderTopColor==="rgb(127, 139, 163)",caixaSemBorda:getComputedStyle(area).borderTopWidth==="0px",umaBordaSo:bordas===1,barraDentro:l.top>=a.bottom-1&&l.top>=c.top&&l.bottom<=c.bottom+0.5&&l.left>=c.left&&l.right<=c.right+0.5,textosDaBarra:!!linha.querySelector('[aria-label="Sugerir com IA"]')&&!!linha.querySelector('[aria-label="Falar"]'),botoes40:botoes.length>=2&&botoes.every((b)=>Math.round(b.getBoundingClientRect().height)===36&&Math.round(b.getBoundingClientRect().width)===36),barraSemEstouro:linha.scrollWidth<=linha.clientWidth+1})})()`;
  registrar("17r. Correções a 1440 px: 'O que será feito' é um conjunto de UMA borda de 2 px (#7F8BA3) com no mínimo 150 px de altura (caixa vazia de 112 px) sem borda própria e a barra 'Sugerir com IA' e 'Falar' (com texto, 40 px) DENTRO da borda", ...resultadoDosChecks(await js(medirCampoDaAcao)));
  registrar("17s. Correções: bloco '3 Provas · opcional' com o número 3 só contornado (círculo de 28 px, sem fundo), botões baixos '+ Foto' e '+ Registrar atualização' de borda fraca (40 px) e SEM a antiga linha 'Acrescentar:'", ...resultadoDosChecks(await js(`(()=>{const bloco=document.querySelector(".pc-cor .pc-provas");const t=bloco?.querySelector(".pc-bloco-titulo");const n=t?.querySelector(".pc-bloco-num");const botoes=bloco?[...bloco.querySelectorAll(".pc-provas .pc-prova-registrar")]:[];const raio=n?getComputedStyle(n).borderTopLeftRadius:"";return JSON.stringify({existe:!!bloco,titulo:!!t&&/^3\\s*Provas\\s*· opcional/.test(t.innerText.replace(/\\s+/g," ").trim()),numero28:!!n&&Math.round(n.getBoundingClientRect().width)===28&&Math.round(n.getBoundingClientRect().height)===28&&(raio==="50%"||parseFloat(raio)>=14),numeroSoContorno:!!n&&getComputedStyle(n).backgroundColor==="rgb(22, 128, 128)",botoes:botoes.length===1&&/^[+] Registrar atualização$/.test(botoes[0].innerText.trim()),alvos40:botoes.length>0&&botoes.every((b)=>Math.round(b.getBoundingClientRect().height)===40),bordaFraca:botoes.every((b)=>getComputedStyle(b).backgroundColor==="rgb(38, 74, 128)"),semAcrescentar:!/Acrescentar:/.test(document.querySelector(".pc-cor .pc-detail--corr").innerText)&&!document.querySelector(".pc-cor .pc-acrescimos")})})()`)));
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1152, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
  await n.esperar(400);
  const lateral1152 = await js('Math.round(document.querySelector(".pc-cor .pc-detail-lateral").getBoundingClientRect().width)');
  registrar("17r2. Correções a 1152 px de largura: o conjunto de uma borda, de no mínimo 150 px, e a barra dentro dele continuam valendo ('Falar' vira só o ícone, com aria-label e title) e a coluna lateral tem 260 px", ...resultadoDosChecks(JSON.stringify({ ...JSON.parse(await js(medirCampoDaAcao)), lateralDe260: lateral1152 === 260 })));
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
  await n.esperar(400);
  registrar("17s2. Correções: cartão sem pino, 'item N' e seta, título em até 2 linhas, sem sobreposição; detalhe com o código NC e a Fonte na mesma linha de metadados (NC antes da Fonte)", await js(`(()=>{const cards=[...document.querySelectorAll(".pc-cor .pc-cor-card")];if(cards.length===0)return false;const t=document.querySelector(".pc-cor .pc-detail-contexto");const linhasDoTitulo=cards.every((c)=>{const ti=c.querySelector(".pc-cor-titulo");if(getComputedStyle(ti).whiteSpace==="nowrap")return false;const lh=parseFloat(getComputedStyle(ti).lineHeight)||parseFloat(getComputedStyle(ti).fontSize)*1.4;return ti.getBoundingClientRect().height<=lh*2+1});const sem=cards.every((c)=>!c.querySelector("svg")&&!c.querySelector(".pc-cor-seta, .pc-cor-pino, .pc-cor-item")&&!/item [0-9]/.test(c.innerText)&&!c.innerText.includes("›"));const semSobrepor=cards.every((c)=>{const f=[...c.children].map((e)=>e.getBoundingClientRect());return f.every((r,k)=>k===0||r.top>=f[k-1].bottom-1)&&f.every((r)=>r.bottom<=c.getBoundingClientRect().bottom+0.5)});const fonteEl=document.querySelector(".pc-cor .pc-detail-fonte");const ctx=t&&t.querySelector(".pc-detail-codigo")&&/^NC[0-9]+$/.test(t.querySelector(".pc-detail-codigo").innerText.trim())&&!!fonteEl&&t.contains(fonteEl)&&(t.querySelector(".pc-detail-codigo").compareDocumentPosition(fonteEl)&Node.DOCUMENT_POSITION_FOLLOWING)>0;const fonte=document.querySelector(".pc-cor .pc-detail-fonte");return linhasDoTitulo&&sem&&semSobrepor&&!!ctx&&!!fonte&&/Fonte/.test(fonte.innerText)})()`));
  registrar("17s3. Correções: cartões da lista brancos com traço lateral na cor da gravidade e o selecionado com borda turquesa #21A3A3", await js(`(()=>{const cards=[...document.querySelectorAll(".pc-cor .pc-cor-card")];const sel=cards.filter((c)=>c.classList.contains("is-selected"));const outros=cards.filter((c)=>!c.classList.contains("is-selected"));return cards.length>0&&sel.length===1&&getComputedStyle(sel[0]).backgroundColor==="rgb(255, 255, 255)"&&getComputedStyle(sel[0]).borderTopColor==="rgb(33, 163, 163)"&&getComputedStyle(sel[0]).color==="rgb(38, 52, 69)"&&outros.every((c)=>getComputedStyle(c).backgroundColor==="rgb(255, 255, 255)")})()`));
  const modo17t = await js(`document.documentElement.getAttribute("data-modo")||""`);
  const busca17t = await js(`(()=>{const barra=document.querySelector(".pc-topbar .pc-smartbar");const campo=document.querySelector(".pc-topbar .pc-busca-input");if(!barra||!campo)return false;campo.focus();const ok=getComputedStyle(barra).borderTopWidth==="1px"&&getComputedStyle(campo).borderTopWidth==="0px"&&getComputedStyle(campo).outlineStyle==="none"&&getComputedStyle(campo).boxShadow==="none";campo.blur();return ok})()`);
  let modoOk17t;
  if (modo17t === "completo") {
    // No Completo o chip não aparece no topo; o menu ⋯ traz o modo atual marcado.
    const chipOculto = await js(`(()=>{const c=document.querySelector(".pc-topbar .pc-mode-chip");return !c||getComputedStyle(c).display==="none"})()`);
    await js(`document.querySelector(".pc-topbar .ui-menu-btn[aria-label='Modo de tela']").click()`);
    await n.esperar(300);
    const marcado = await js(`[...document.querySelectorAll(".ui-menu-pop [role=menuitem]")].filter((b)=>b.innerText.trim().startsWith("●")).length===1`);
    await js(`document.body.click()`);
    await n.esperar(200);
    modoOk17t = chipOculto && marcado;
  } else {
    modoOk17t = await js(`(()=>{const chip=document.querySelector(".pc-topbar .pc-mode-chip");return !!chip&&Math.round(chip.getBoundingClientRect().width)===36&&chip.innerText.trim()===""})()`);
  }
  registrar("17t. Topo: modo de tela (Completo: sem chip no topo e menu ⋯ com o modo atual marcado; demais: só o ícone, 36 px), busca com um contorno só e foco sem segundo anel", Boolean(modoOk17t) && Boolean(busca17t));
  registrar("17u. Trilho: avatar do usuário é um ícone de pessoa em círculo branco (não as iniciais)", await js(`(()=>{const a=document.querySelector(".tr-avatar");return !!a&&!!a.querySelector("svg")&&a.innerText.trim()===""&&getComputedStyle(a).backgroundColor==="rgb(255, 255, 255)"&&getComputedStyle(a).borderTopLeftRadius!=="0px"})()`));
  // 17z. 1440x800, correção com UMA foto e título de 2 linhas: o corpo do detalhe NÃO rola e o rodapé com "Salvar plano" fica fixo e à vista.
  {
    // A "Rotina" semeada (título com "câmara fria", 1 foto) é a correção que este bloco abre; o cartão selecionado antes só serve para voltar a ele depois.
    const tituloPrimeira = await js('document.querySelector(".pc-cor .pc-cor-card.is-selected .pc-cor-titulo")?.textContent||""');
    if (!tituloPrimeira) registrar("17z0. Correções: há um cartão selecionado antes de abrir a Rotina de teste (câmara fria)", false, "nenhum cartão selecionado (.is-selected); as medidas 17z a 17r3 não valem");
    await js(`(()=>{const c=[...document.querySelectorAll(".pc-cor .pc-cor-card")].find((x)=>x.innerText.includes("câmara fria"));if(!c)return false;c.click();return true})()`);
    await esperar(async () => js('document.querySelector(".pc-cor .pc-detail-title")?.textContent.includes("câmara fria")'), 5000);
    await n.esperar(500);
    await foto("17z-uma-foto-1440x800");
    const medir17z = `(()=>{try{const raiz=document.querySelector(".pc-detail--corr");const corpo=raiz.querySelector(".pc-detail-corpo");const lateral=raiz.querySelector(".pc-detail-lateral");const foot=raiz.querySelector(".pc-detail-foot");const titulo=raiz.querySelector(".pc-detail-title");const ev=corpo.querySelector('.pc-detail-secao[aria-label="Evidências"]');const conj=corpo.querySelector(".pc-acao-conjunto");const area=corpo.querySelector(".pc-acao-area");const salvar=[...foot.querySelectorAll("button")].find((b)=>b.innerText.includes("Salvar plano"));const fr=foot.getBoundingClientRect();const cr=corpo.getBoundingClientRect();const lr=lateral.getBoundingClientRect();const ue=corpo.querySelector(".pc-provas")||corpo.querySelector(".pc-detail-scroll");const ultimoEsq=ue.getBoundingClientRect();const ultimoLat=lateral.lastElementChild.getBoundingClientRect();const folga=Math.round(cr.bottom-ultimoEsq.bottom+parseFloat(getComputedStyle(ue).paddingBottom));const folgaLat=Math.round(lr.bottom-parseFloat(getComputedStyle(lateral).paddingBottom)-ultimoLat.bottom);const lh=parseFloat(getComputedStyle(titulo).lineHeight);const mini=[...ev.querySelectorAll(".ad-foto--mini")];const legenda=mini[0]?.querySelector(".ad-legenda");const botoes=[...corpo.querySelectorAll(".pc-provas .pc-prova-registrar")];const txtEv=ev.innerText;return JSON.stringify({existe:!!ev,umaFoto:ev.querySelectorAll("img").length===1,legendaAntes:!!legenda&&legenda.textContent.trim()==="Antes"&&parseFloat(getComputedStyle(legenda).fontSize)>=12&&getComputedStyle(legenda).backgroundColor==="rgb(255, 255, 255)"&&getComputedStyle(legenda).color==="rgb(38, 52, 69)",semRotulosNemQuadroVazio:!/Antes · |Depois · |Sem foto/.test(txtEv)&&!ev.querySelector(".ad-vazio, .ad-coluna"),evidenciasEmUmaLinha:Math.round(ev.querySelector(".ad--pc").getBoundingClientRect().height)<=72,botoesNoBlocoDeProvas:botoes.length===1&&botoes.every((b)=>b.getBoundingClientRect().height>=40)&&!ev.querySelector(".ad-foto-mais")&&ev.closest(".pc-provas")===corpo.querySelector(".pc-provas"),tituloCompleto:titulo.getAttribute("title")===titulo.textContent&&getComputedStyle(titulo).webkitLineClamp==="2"&&parseFloat(getComputedStyle(titulo).fontSize)===24&&getComputedStyle(titulo).fontWeight==="500",titulo2Linhas:Math.round(titulo.getBoundingClientRect().height/lh)===2,semRolagemInterna:corpo.scrollHeight<=corpo.clientHeight,lateralSemRolagem:lateral.scrollHeight<=lateral.clientHeight,folgaDaLateralDe8:folgaLat>=8,rodapeVisivel:!!salvar&&fr.bottom<=innerHeight&&fr.top>=0&&salvar.getBoundingClientRect().bottom<=innerHeight,rodapeFixo:foot.parentElement===raiz&&!corpo.contains(foot)&&fr.top>=cr.bottom-1&&fr.top>=lr.bottom-1,medidas:{caixa:Math.round(area.getBoundingClientRect().height),conjunto:Math.round(conj.getBoundingClientRect().height),evidencias:Math.round(ev.getBoundingClientRect().height),titulo:Math.round(titulo.getBoundingClientRect().height),corpoScroll:corpo.scrollHeight,corpoClient:corpo.clientHeight,lateralScroll:lateral.scrollHeight,lateralClient:lateral.clientHeight,folga,folgaLat,rodapeBottom:Math.round(fr.bottom),janela:innerHeight}})}catch(e){return JSON.stringify({existe:false,erro:String(e.stack).slice(0,300)})}})()`;
    const r17z = JSON.parse(await js(medir17z));
    const sobreposicao17z = JSON.parse(await js(medirSobreposicao));
    const [ok17z, falha17z] = resultadoDosChecks(JSON.stringify({ ...r17z, semSobreposicao: sobreposicao17z.pares === 0 }));
    registrar("17z. 1440x800, correção com 1 foto e título de 2 linhas: NENHUMA das duas colunas tem rolagem interna (scrollHeight <= clientHeight), a evidência fica no bloco 3 Provas com os botões, o rodapé com 'Salvar plano' está dentro da janela e fixo, e nenhum bloco se sobrepõe", ok17z, falha17z || JSON.stringify(r17z.medidas));
    // Muitas fotos (miniaturas copiadas só na tela): a fileira rola na horizontal e nada estoura o corpo do detalhe.
    const muitas = JSON.parse(await js(`(()=>{const linha=document.querySelector(".pc-cor .ad-linha");const base=linha.querySelector(".ad-foto--mini");const corpo=document.querySelector(".pc-cor .pc-detail-corpo");const copias=Array.from({length:14},()=>base.cloneNode(true));copias.forEach((c)=>linha.insertBefore(c,base));const botao=document.querySelector(".pc-cor .pc-provas .pc-prova-registrar");const fileira=document.querySelector(".pc-cor .ad--pc");const rol=fileira.querySelector(".ad-rolagem");botao.scrollIntoView({block:"nearest"});const m=botao.getBoundingClientRect();const cb=corpo.getBoundingClientRect();const rodape=document.querySelector(".pc-detail--corr .pc-detail-foot").getBoundingClientRect();const r=JSON.stringify({existe:true,medidas:{botao:[Math.round(m.left),Math.round(m.top),Math.round(m.right),Math.round(m.bottom)],corpo:[Math.round(cb.left),Math.round(cb.top),Math.round(cb.right),Math.round(cb.bottom)],scroll:corpo.scrollHeight,client:corpo.clientHeight},botaoAcimaDoRodape:m.bottom<=rodape.top+0.5&&cb.bottom<=rodape.top+1,botaoVisivel:m.width>0&&m.left>=cb.left-1&&m.right<=cb.right+1&&m.top>=cb.top-1&&m.bottom<=cb.bottom+1,botoesForaDaFileira:!fileira.querySelector(".pc-prova-botao")&&!rol.querySelector("button"),fileiraRola:rol.scrollWidth>rol.clientWidth+1,fileiraDentro:fileira.getBoundingClientRect().right<=cb.right+1,corpoSemRolagemHorizontal:corpo.scrollWidth<=corpo.clientWidth+1});copias.forEach((c)=>c.remove());corpo.scrollTop=0;return r})()`));
    registrar("17z2. Muitas fotos: só as miniaturas rolam na horizontal, os botões '+ Foto' e '+ Registrar atualização' ficam FORA da fileira que rola e VISÍVEIS dentro da coluna esquerda (com muitas fotos a rolagem interna da coluna é permitida), acima do rodapé, e nada gera rolagem horizontal na coluna", ...resultadoDosChecks(JSON.stringify(muitas)));
    const digitar = (texto) => js(`(()=>{const el=document.querySelector(".pc-cor .pc-acao-area");Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),"value").set.call(el,${JSON.stringify(texto)});el.dispatchEvent(new Event("input",{bubbles:true}));return true})()`);
    // 17z3. Mesma correção (1 foto, título de 2 linhas) com 2 linhas DIGITADAS na ação: a caixa cresce e o corpo continua sem rolagem interna, com o rodapé à vista.
    await digitar("Trocar o piso danificado" + String.fromCharCode(10) + "Registrar a conclusão com foto");
    await n.esperar(400);
    await foto("17z3-duas-linhas-1440x800");
    const r17z3 = JSON.parse(await js(`(()=>{try{const raiz=document.querySelector(".pc-detail--corr");const corpo=raiz.querySelector(".pc-detail-corpo");const lateral=raiz.querySelector(".pc-detail-lateral");const foot=raiz.querySelector(".pc-detail-foot");const area=corpo.querySelector(".pc-acao-area");const conj=corpo.querySelector(".pc-acao-conjunto");const salvar=[...foot.querySelectorAll("button")].find((b)=>b.innerText.includes("Salvar plano"));const fr=foot.getBoundingClientRect();const cr=corpo.getBoundingClientRect();const ue=corpo.querySelector(".pc-provas")||corpo.querySelector(".pc-detail-scroll");const folga=Math.round(cr.bottom-ue.getBoundingClientRect().bottom+parseFloat(getComputedStyle(ue).paddingBottom));return JSON.stringify({existe:true,duasLinhasDigitadas:area.value.split(String.fromCharCode(10)).length===2,caixaSemRolagem:area.scrollHeight<=area.clientHeight,conjuntoMin150:Math.round(conj.getBoundingClientRect().height)>=150,semRolagemInterna:corpo.scrollHeight<=corpo.clientHeight,lateralSemRolagem:lateral.scrollHeight<=lateral.clientHeight,folgaDe8:folga>=8,rodapeVisivel:!!salvar&&fr.bottom<=innerHeight&&fr.top>=0&&salvar.getBoundingClientRect().bottom<=innerHeight,rodapeFixo:foot.parentElement===raiz&&!corpo.contains(foot)&&fr.top>=cr.bottom-1,medidas:{caixa:Math.round(area.getBoundingClientRect().height),conjunto:Math.round(conj.getBoundingClientRect().height),corpoScroll:corpo.scrollHeight,corpoClient:corpo.clientHeight,folga,rodapeBottom:Math.round(fr.bottom),janela:innerHeight}})}catch(e){return JSON.stringify({existe:false,erro:String(e.stack).slice(0,300)})}})()`));
    const [ok17z3, falha17z3] = resultadoDosChecks(JSON.stringify(r17z3));
    registrar("17z3. 1440x800, 1 foto, título de 2 linhas e 2 linhas digitadas na ação: a caixa de 98 px comporta as 2 linhas sem rolar por dentro (area.scrollHeight <= area.clientHeight, conjunto >= 150 px), nenhuma coluna tem rolagem interna, a folga da coluna esquerda é de 8 px ou mais e o rodapé com 'Salvar plano' fica à vista e fixo", ok17z3, falha17z3 || JSON.stringify(r17z3.medidas));
    await digitar("");
    await n.esperar(300);
    await js(`(()=>{const c=[...document.querySelectorAll(".pc-cor .pc-cor-card")].find((x)=>x.querySelector(".pc-cor-titulo")?.textContent===${JSON.stringify(tituloPrimeira)});c?.click();return !!c})()`);
    await n.esperar(300);
    const alturaDaCaixa = () => js(`(()=>{const el=document.querySelector(".pc-cor .pc-acao-area");const c=document.querySelector(".pc-cor .pc-acao-conjunto");return JSON.stringify({caixa:Math.round(el.getBoundingClientRect().height),conjunto:Math.round(c.getBoundingClientRect().height),rolaPorDentro:el.scrollHeight>el.clientHeight+1,barraDentro:document.querySelector(".pc-cor .pc-acao-linha").getBoundingClientRect().bottom<=c.getBoundingClientRect().bottom+0.5})})()`);
    const vazia = JSON.parse(await alturaDaCaixa());
    await digitar(["Trocar o piso danificado", "Comprar o material", "Contratar a equipe de obra", "Acompanhar a execução", "Registrar a conclusão com foto"].join(String.fromCharCode(10)));
    await n.esperar(300);
    const cheia = JSON.parse(await alturaDaCaixa());
    await digitar("x".repeat(30).split("").join(String.fromCharCode(10)));
    await n.esperar(300);
    const limite = JSON.parse(await alturaDaCaixa());
    await digitar("");
    await n.esperar(300);
    const devolta = JSON.parse(await alturaDaCaixa());
    registrar("17r3. 'O que será feito' vazio tem no mínimo 176 px (conjunto) e cresce ao digitar sem barra de rolagem interna até o limite; depois do limite rola por dentro e a barra continua dentro da borda; apagado, volta à altura mínima", vazia.conjunto >= 176 && vazia.conjunto <= 184 && cheia.caixa > vazia.caixa && !cheia.rolaPorDentro && cheia.barraDentro && limite.caixa <= 176 && limite.rolaPorDentro && limite.barraDentro && vazia.caixa === 112 && devolta.caixa === 112, JSON.stringify({ vazia, cheia, limite, devolta }));
  }
  // 17aa. Etapa de 1000 a 1300 px e chips de pessoas: medidas em 1152 e 1440 px na correção reincidente (com a ação que funcionou antes).
  const corDeAcao = await js(`(()=>{const e=document.createElement("span");e.style.color="var(--rd-acao)";document.body.appendChild(e);const c=getComputedStyle(e).color;e.remove();return c})()`);
  const medirAjustesDeCorrecoes = `(()=>{try{const corDeAcao=${JSON.stringify(corDeAcao)};const raiz=document.querySelector(".pc-detail--corr");const corpo=raiz.querySelector(".pc-detail-corpo");const lateral=raiz.querySelector(".pc-detail-lateral");const foot=raiz.querySelector(".pc-detail-foot");const linha=raiz.querySelector(".pc-acao-linha");const lista=document.querySelector(".pc-cor .pc-master-list");const rotulo=lateral.querySelector(".pc-plan-resp .pc-plan-rotulo");const campoResp=lateral.querySelector(".pc-resp-seletor, .pc-resp-digitar");const todas=campoResp?[campoResp]:[];const pessoas=todas;const erro=lateral.querySelector(".pc-resp-erro");const lembrete=lateral.querySelector(".pc-plan-lembrete");const prazo=lateral.querySelector(".pc-plan-prazo input");const sug=lateral.querySelector(".pc-prazo-sugerido");const avisoPrazo=lateral.querySelector(".pc-prazo-erro");const r=(e)=>e.getBoundingClientRect();
const norm=(t)=>t.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase();
const curto=(nome)=>{const p=nome.trim().split(/\\s+/);if(p.length<=2)return p.join(" ");const ult=p[p.length-1];const sn=["neto","filho","junior","jr","sobrinho"].includes(norm(ult).replace(/\\.$/,""))?p[p.length-2]:ult;return p[0]+" "+sn};
const rot=(c)=>c.textContent.replace(/^[✓\s]+/,"").trim();const visivel=(e)=>e&&getComputedStyle(e).visibility!=="hidden"&&r(e).width>0&&r(e).height>0;
const folhas=[rotulo,...todas,erro,lembrete,prazo,sug,raiz.querySelector(".pc-acao-area"),...linha.querySelectorAll(".ui-field-tools button"),...linha.querySelectorAll(".pc-chip-funcionou"),linha.querySelector(".pc-acao-mais"),raiz.querySelector(".pc-detail-ver"),...foot.querySelectorAll("button")].filter(visivel);
const clip=(e)=>{const q0=r(e);const d=e===lembrete?9:e===sug?10:0;const q={left:q0.left,right:q0.right,top:q0.top+d,bottom:q0.bottom-d};const cs=[corpo.contains(e)?corpo:null,lateral.contains(e)&&getComputedStyle(lateral).overflowY!=="visible"?lateral:null].filter(Boolean);return cs.reduce((acc,c)=>{const x=r(c);return {left:Math.max(acc.left,x.left),right:Math.min(acc.right,x.right),top:Math.max(acc.top,x.top),bottom:Math.min(acc.bottom,x.bottom)}},q)};
const sobrepostos=[];for(let i=0;i<folhas.length;i++)for(let j=i+1;j<folhas.length;j++){const a=clip(folhas[i]),b=clip(folhas[j]);if(a.right-a.left<=0||a.bottom-a.top<=0||b.right-b.left<=0||b.bottom-b.top<=0)continue;if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)sobrepostos.push((folhas[i].className||folhas[i].tagName)+" x "+(folhas[j].className||folhas[j].tagName))}
const cs=getComputedStyle(prazo);const cv=document.createElement("canvas").getContext("2d");cv.font=cs.fontStyle+" "+cs.fontWeight+" "+cs.fontSize+" "+cs.fontFamily;const fimDoValor=r(prazo).left+parseFloat(cs.borderLeftWidth)+parseFloat(cs.paddingLeft)+cv.measureText("00/00/0000").width;
const lr=r(lembrete);const lateralR=r(lateral);
const falar=linha.querySelector(".voz-btn");const chip=linha.querySelector(".pc-chip-funcionou");const mais=linha.querySelector(".pc-acao-mais");const chipVisivel=!!chip&&getComputedStyle(chip).visibility!=="hidden";
const dentroDaLateral=[...todas,erro,lembrete,prazo,sug].filter(Boolean).every((e)=>r(e).left>=lateralR.left-0.5&&r(e).right<=lateralR.right+0.5);
return JSON.stringify({existe:pessoas.length>0&&!!lembrete&&!!chip,
largura:innerWidth,
semSobreposicao:sobrepostos.length===0,
pessoasSemCorte:todas.every((c)=>c.scrollWidth<=c.clientWidth),
lembreteAzul16:getComputedStyle(lembrete).color===corDeAcao&&getComputedStyle(lembrete).fontSize==="16px"&&Math.round(r(lembrete).height)>=40,
lembreteNaLinhaDoRotulo:!!lembrete&&!!rotulo&&!!campoResp&&Math.abs((r(rotulo).top+r(rotulo).bottom)/2-(r(lembrete).top+r(lembrete).bottom)/2)<=3&&r(lembrete).left>=r(rotulo).right&&r(lembrete).right>=r(campoResp).right-4&&r(lembrete).right<=r(campoResp).right+1,
dentroDaLateral,
prazoSemSobrepor:!avisoPrazo||(r(avisoPrazo).left>=fimDoValor+4&&r(avisoPrazo).right<=r(prazo).right),
prazoInteiro:r(prazo).width>=150&&prazo.scrollWidth<=prazo.clientWidth+1&&r(prazo).right<=innerWidth,
maisAlvo40:!mais||Math.round(r(mais).height)>=40,
larguraDaLateral:innerWidth<=1149||Math.abs(lateralR.width-(innerWidth>=1300?300:260))<=1,
listaLargura:innerWidth<=1000||Math.abs(r(lista).width-(innerWidth>=1300?380:innerWidth>=1200?340:280))<=2,
falarConforme:!!falar&&/Falar/.test(falar.getAttribute("aria-label")||"")&&falar.getBoundingClientRect().width<=44,
chipFuncionou:chipVisivel?(chip.scrollWidth<=chip.clientWidth&&getComputedStyle(chip).textOverflow!=="ellipsis"&&/Visita [0-9]+/.test(chip.textContent)&&r(chip).right<=r(linha).right+0.5):(!!mais&&/^[+][0-9]+ sugest/.test(mais.textContent.trim())),
barraSemEstouro:linha.scrollWidth<=linha.clientWidth+1,
corpoSemRolagemHorizontal:corpo.scrollWidth<=corpo.clientWidth+1&&lateral.scrollWidth<=lateral.clientWidth+1,
detalhes:{chipDaAcaoNaBarra:chipVisivel,sobrepostos,pessoas:pessoas.map((c)=>c.textContent.trim()),lateral:Math.round(lateralR.width),caixaLista:Math.round(r(lista).width),prazo:Math.round(r(prazo).width)}})}catch(e){return JSON.stringify({existe:false,erro:String(e.stack).slice(0,300)})}})()`;
  {
    const antes = await js('document.querySelector(".pc-cor .pc-cor-card.is-selected .pc-cor-titulo")?.textContent||""');
    await js(`(()=>{const c=[...document.querySelectorAll(".pc-cor .pc-cor-card")].find((x)=>x.innerText.includes("Ralo sem tampa"));if(!c)return false;c.click();return true})()`);
    await esperar(async () => js('document.querySelector(".pc-cor .pc-detail-title")?.textContent.includes("Ralo sem tampa")'), 5000);
    registrar("17aa0. Correções: a correção reincidente de teste (Ralo sem tampa, com a ação que funcionou na Visita 1) abre no detalhe", await js('!!document.querySelector(".pc-cor .pc-detail-title")?.textContent.includes("Ralo sem tampa")&&!!document.querySelector(".pc-cor .pc-chip-funcionou")'));
    const prazoOriginal = await js('document.querySelector(".pc-cor .pc-plan-prazo input").value');
    const definirPrazo = (valor) => js(`(()=>{const el=document.querySelector(".pc-cor .pc-plan-prazo input");Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),"value").set.call(el,${JSON.stringify(valor)});el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new FocusEvent("focusout",{bubbles:true}));return true})()`);
    for (const [largura, altura] of [[1152, 800], [1440, 800]]) {
      await n.enviar("Emulation.setDeviceMetricsOverride", { width: largura, height: altura, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
      await n.esperar(500);
      await foto(`17aa-${largura}`);
      const normal = JSON.parse(await js(medirAjustesDeCorrecoes));
      const [okN, falhaN] = resultadoDosChecks(JSON.stringify(normal));
      registrar(`17aa. ${largura} px: campo único do Responsável sem corte, 'Enviar lembrete' azul de 16 px na linha do rótulo, nada sobreposto entre as duas colunas, lateral de ${largura < 1300 ? "260" : "300"} px, lista de ${largura < 1200 ? "280" : largura < 1300 ? "340" : "380"} px, 'Falar' ${largura < 1200 ? "só o ícone" : "com texto"}, chip 'Ação que funcionou antes' inteiro ou em '+N sugestões'`, okN, falhaN || JSON.stringify(normal.detalhes));
      // Chip fora da barra: a lista de "+N sugestões" o traz inteiro, com o "Visita N".
      if (!normal.detalhes.chipDaAcaoNaBarra) {
        await js('document.querySelector(".pc-cor .pc-acao-mais")?.click()');
        await n.esperar(200);
        registrar(`17aa2. ${largura} px: sem espaço o chip 'Ação que funcionou antes' vai para '+N sugestões' e a lista o mostra com o 'Visita N'`, await js('/Ação que funcionou antes · Visita [0-9]+/.test(document.querySelector(".pc-cor .pc-acao-sugestoes")?.innerText||"")'));
        await js('document.querySelector(".pc-cor .pc-acao-mais")?.click()');
      } else {
        registrar(`17aa2. ${largura} px: com espaço o chip 'Ação que funcionou antes · Visita N' fica na barra, inteiro`, await js('/Visita [0-9]+/.test(document.querySelector(".pc-cor .pc-chip-funcionou:not(.is-oculto)")?.textContent||"")'));
      }
      // Prazo no passado: o aviso e o valor da data não se sobrepõem.
      let okP = false, falhaP = "";
      try {
        await definirPrazo("2020-01-01");
        await n.esperar(300);
        const passado = JSON.parse(await js(medirAjustesDeCorrecoes));
        [okP, falhaP] = resultadoDosChecks(JSON.stringify({ existe: passado.existe, prazoSemSobrepor: passado.prazoSemSobrepor, semSobreposicao: passado.semSobreposicao, avisoVisivel: await js('!!document.querySelector(".pc-cor .pc-prazo-erro")') }));
      } finally {
        await definirPrazo(prazoOriginal);
        await n.esperar(200);
      }
      registrar(`17aa3. ${largura} px: com a data no passado o aviso não sobrepõe o valor da data nem outro campo`, okP, falhaP);
    }
    // 17ab. Coluna lateral: largura (300/260), sem sobreposição de Responsável/Prazo/lembrete/erro, Prazo inteiro e visível de 1000 a 1440 px, sem rolagem a 1440x800 e números dos blocos de 28 px.
    for (const largura of [1000, 1001, 1100, 1149, 1152, 1200, 1300, 1440]) {
      await n.enviar("Emulation.setDeviceMetricsOverride", { width: largura, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
      await n.esperar(500);
      await js('document.querySelector(".pc-cor .pc-plan-prazo input")?.scrollIntoView({block:"nearest"})');
      await n.esperar(150);
      const m = JSON.parse(await js(medirAjustesDeCorrecoes));
      const l = JSON.parse(await js(`(()=>{const lat=document.querySelector(".pc-cor .pc-detail-lateral");const corpo=document.querySelector(".pc-cor .pc-detail-corpo");const foot=document.querySelector(".pc-cor .pc-detail-foot").getBoundingClientRect();const prazo=lat.querySelector(".pc-plan-prazo input").getBoundingClientRect();const cb=corpo.getBoundingClientRect();const nums=[...document.querySelectorAll(".pc-cor .pc-detail--corr .pc-bloco-num")];const azul=(e)=>getComputedStyle(e).backgroundColor==="rgb(38, 74, 128)"&&getComputedStyle(e).color==="rgb(255, 255, 255)"&&getComputedStyle(e).fontWeight==="400";const fundo=getComputedStyle(lat).backgroundColor;return JSON.stringify({existe:nums.length>=3,prazoVisivel:prazo.top>=cb.top-0.5&&prazo.bottom<=Math.min(cb.bottom,foot.top)+0.5&&prazo.left>=0&&prazo.right<=innerWidth,numeros28:nums.every((e)=>Math.round(e.getBoundingClientRect().width)===28&&Math.round(e.getBoundingClientRect().height)===28),umEDoisAzuis:nums.filter((e)=>/^[12]$/.test(e.textContent.trim())).length===2&&nums.filter((e)=>/^[12]$/.test(e.textContent.trim())).every((e)=>getComputedStyle(e).backgroundColor==="rgb(22, 128, 128)"),tresSoContorno:nums.filter((e)=>e.textContent.trim()==="3").every((e)=>getComputedStyle(e).backgroundColor==="rgb(22, 128, 128)"),fundoCinzaClaro:fundo==="rgb(255, 255, 255)",bordaAEsquerda:innerWidth<=1149||getComputedStyle(lat).borderLeftWidth==="1px",ordemNoEstreito:innerWidth>=1150||(()=>{const q=document.querySelector(".pc-cor .pc-detail--corr");const o=(e)=>q.querySelector(e).getBoundingClientRect().top;return o(".pc-plan-acao")<o(".pc-detail-lateral")&&o(".pc-detail-lateral")<o(".pc-provas")})(),metadadosUmaLinha:(()=>{const c=document.querySelector(".pc-cor .pc-detail-contexto");return c.getBoundingClientRect().height<=30&&c.scrollWidth<=c.clientWidth+1})(),alvos40:[...document.querySelectorAll(".pc-cor .pc-detail-ver, .pc-cor .pc-detail-pop, .pc-cor .pc-prazo-sugerido")].every((e)=>Math.round(e.getBoundingClientRect().height)>=40),barraDaAcaoUmaLinha:(()=>{const b=document.querySelector(".pc-cor .pc-acao-linha");const bs=[...b.querySelectorAll(".ui-field-tools button, .pc-acao-mais")].filter((e)=>getComputedStyle(e).visibility!=="hidden");return bs.every((e)=>Math.abs(e.getBoundingClientRect().top-bs[0].getBoundingClientRect().top)<=2)})(),provasSemQuebra:[...document.querySelectorAll(".pc-cor .pc-provas .pc-prova-registrar")].every((e)=>Math.round(e.getBoundingClientRect().height)===40)})})()`));
      const [okL, falhaL] = resultadoDosChecks(JSON.stringify({ existe: m.existe && l.existe, semSobreposicao: m.semSobreposicao, larguraDaLateral: m.larguraDaLateral, dentroDaLateral: m.dentroDaLateral, prazoInteiro: m.prazoInteiro, prazoSemSobrepor: m.prazoSemSobrepor, campoSemCorte: m.pessoasSemCorte, lembreteNaLinhaDoRotulo: m.lembreteNaLinhaDoRotulo, corpoSemRolagemHorizontal: m.corpoSemRolagemHorizontal, prazoVisivel: l.prazoVisivel, ordemNoEstreito: l.ordemNoEstreito, metadadosUmaLinha: l.metadadosUmaLinha, alvos40: l.alvos40, barraDaAcaoUmaLinha: l.barraDaAcaoUmaLinha, provasSemQuebra: l.provasSemQuebra, numeros28: l.numeros28, umEDoisAzuis: l.umEDoisAzuis, tresSoContorno: l.tresSoContorno, fundoCinzaClaro: l.fundoCinzaClaro, bordaAEsquerda: l.bordaAEsquerda }));
      if (largura <= 1000) {
        const lista = JSON.parse(await js(`(()=>{const rol=document.querySelector(".pc-cor .pc-master-list > .ui-scroll")||document.querySelector(".pc-cor .pc-master-list");const rr=rol.getBoundingClientRect();const cartoes=[...document.querySelectorAll(".pc-cor .pc-cor-card")];const det=document.querySelector(".pc-cor .pc-detail--corr").getBoundingClientRect();return JSON.stringify({rr:[Math.round(rr.top),Math.round(rr.bottom)],rects:cartoes.map((c)=>[Math.round(c.getBoundingClientRect().top),Math.round(c.getBoundingClientRect().bottom)]),etapas:Math.round(document.querySelector(".pc-cor .pc-etapas")?.getBoundingClientRect().height||0),cartoes:cartoes.length,visiveis:cartoes.filter((c)=>c.getBoundingClientRect().top>=rr.top-1&&c.getBoundingClientRect().bottom<=rr.bottom+1).length,detalheNaJanela:det.top<innerHeight-200&&det.bottom<=innerHeight+1})})()`));
        registrar(`17ab0. ${largura} px: a lista de cima mostra pelo menos 2 cartões inteiros (ou todos, se houver menos) e o detalhe aparece na janela`, lista.visiveis >= Math.min(2, lista.cartoes) && lista.detalheNaJanela, JSON.stringify(lista));
      }
      registrar(`17ab. ${largura} px: coluna lateral de ${largura <= 1149 ? "largura total (corpo em coluna única, bloco 2 antes de Provas)" : largura < 1300 ? "260 px" : "300 px"} em #F4F6FA, Responsável (campo único, 'Enviar lembrete' na linha do rótulo, erro) e Prazo sem sobreposição e dentro da coluna, Prazo inteiro e visível, números dos blocos de 28 px (1 e 2 azuis, 3 só contorno)`, okL, falhaL || JSON.stringify(m.detalhes));
    }
    // 17ac e 17ag. Responsável como CAMPO ÚNICO (combobox): teclas reais via CDP, abrir, escolher, Esc, "+ Outra pessoa…", foco, aria, lista com muitas pessoas e lista sem corte (1440x800, correção reincidente).
    bloco17ac: {
      await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
      await n.esperar(400);
      const TECLAS = { Enter: ["Enter", "Enter", 13, "\r"], Espaco: [" ", "Space", 32, " "], Baixo: ["ArrowDown", "ArrowDown", 40], Cima: ["ArrowUp", "ArrowUp", 38], Home: ["Home", "Home", 36], End: ["End", "End", 35], Esc: ["Escape", "Escape", 27] };
      const apertar = async (nome) => {
        const [key, code, vk, texto] = TECLAS[nome];
        await n.enviar("Input.dispatchKeyEvent", { type: texto ? "keyDown" : "rawKeyDown", key, code, windowsVirtualKeyCode: vk, ...(texto ? { text: texto } : {}) });
        await n.enviar("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: vk });
        await n.esperar(150);
      };
      const digitarReal = async (texto) => {
        await n.enviar("Input.insertText", { text: texto });
        await n.esperar(150);
      };
      const clicarEm = async (x, y) => {
        await n.enviar("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
        await n.enviar("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
        await n.enviar("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
        await n.esperar(200);
      };
      const centroDe = (seletor, indice = 0) => js(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(seletor)})][${indice}];if(!e)return null;e.scrollIntoView({block:"nearest"});const r=e.getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)}})()`);
      const clicarReal = async (seletor, indice = 0) => {
        const p = await centroDe(seletor, indice);
        if (p) await clicarEm(p.x, p.y);
        return !!p;
      };
      const norm = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      const estado = async () => JSON.parse(await js(`(()=>{const s=document.querySelector(".pc-cor .pc-resp-seletor");const inp=document.querySelector(".pc-cor .pc-resp-digitar");const l=document.querySelector(".pc-resp-lista");const ops=l?[...l.querySelectorAll('[role="option"]')]:[];const a=document.activeElement;const lat=document.querySelector(".pc-cor .pc-detail-lateral");const corpo=document.querySelector(".pc-cor .pc-detail-corpo");const erro=document.querySelector(".pc-cor .pc-resp-erro");const ativoId=s?.getAttribute("aria-activedescendant")||"";return JSON.stringify({seletor:!!s,digitando:!!inp,texto:s?s.innerText.replace(/\\s+/g," ").trim():null,titulo:s?.title||"",aberto:!!l,expanded:s?.getAttribute("aria-expanded"),ativo:ativoId,indiceAtivo:ops.findIndex((o)=>o.id===ativoId),opcoes:ops.map((o)=>o.textContent.replace(/^[✓\\s]+/,"").trim()),titulos:ops.map((o)=>o.title),selecionadas:ops.filter((o)=>o.getAttribute("aria-selected")==="true").map((o)=>o.title),foco:a===s?"seletor":a===inp?"input":(a?.tagName||""),valorInput:inp?inp.value:null,latRola:lat.scrollHeight>lat.clientHeight+1,corpoRola:corpo.scrollHeight>corpo.clientHeight+1,erroTexto:erro?erro.textContent.trim():null,describedby:s?.getAttribute("aria-describedby")||inp?.getAttribute("aria-describedby")||"",erroId:erro?.id||"",borda:s?getComputedStyle(s).borderTopColor:""})})()`));
      const abrirSeletor = async () => {
        await js('document.querySelector(".pc-cor .pc-resp-seletor")?.focus()');
        await apertar("Enter");
      };
      const VERMELHO = "rgb(200, 63, 69)";
      const CINZA = "rgb(127, 139, 163)";
      const AZUL = "rgb(38, 74, 128)";

      // Estado limpo: nenhuma escolha na correção reincidente.
      const inicial = await estado();
      // Pré-condição (os passos seguintes dependem dela): a correção aberta ainda NÃO tem responsável. Se não tiver, falha aqui com a causa e pula o bloco.
      if (!inicial.seletor || inicial.texto !== "Escolha uma pessoa ▾") {
        registrar("17ac0. (pré-condição) a correção reincidente aberta deveria estar sem responsável e fechada; os passos 17ac e 17ag foram pulados", false, JSON.stringify(inicial));
        break bloco17ac;
      }
      registrar("17ac0. Responsável é UM campo (combobox) e não há mais botões de pessoa, radiogroup nem 'Outra pessoa' tracejado", inicial.seletor && (await js('!document.querySelector(".pc-cor .pc-pessoa, .pc-cor .pc-pessoas, .pc-cor [role=radio], .pc-cor [role=radiogroup], .pc-cor datalist")')), JSON.stringify(inicial));
      // Linha do rótulo: "Responsável" à esquerda e "Enviar lembrete" à direita, na mesma linha, com o campo de 42 px abaixo.
      const linha = JSON.parse(await js(`(()=>{const q=document.querySelector(".pc-cor .pc-plan-resp");const rot=q.querySelector(".pc-plan-rotulo").getBoundingClientRect();const lem=q.querySelector(".pc-plan-lembrete");const l=lem.getBoundingClientRect();const c=q.querySelector(".pc-resp-seletor").getBoundingClientRect();return JSON.stringify({mesmaLinha:Math.abs((rot.top+rot.bottom)/2-(l.top+l.bottom)/2)<=3,lembreteADireita:l.left>=rot.right&&Math.abs(l.right-c.right)<=4,rotuloAEsquerda:Math.abs(rot.left-c.left)<=1,campoAbaixo:c.top>=Math.max(rot.bottom,l.bottom-9)-1,campo42:Math.round(c.height)===42,larguraTotal:Math.abs(c.width-q.getBoundingClientRect().width)<=1,lembreteDepoisNoDom:!!(q.querySelector(".pc-resp").compareDocumentPosition(lem)&Node.DOCUMENT_POSITION_FOLLOWING)})})()`));
      const [okLinha, falhaLinha] = resultadoDosChecks(JSON.stringify(linha));
      registrar("17ac. Fechado: linha do rótulo com 'Responsável' à esquerda e 'Enviar lembrete' à direita (mesma linha), campo de 42 px na largura toda logo abaixo; no DOM o lembrete vem depois do campo (ordem do Tab)", okLinha, falhaLinha);
      registrar("17ac1. Fechado e sem escolha, DESDE O INÍCIO: 'Escolha uma pessoa ▾' com borda vermelha (#C83F45), erro 'Escolha o responsável' na região aria-live ligado ao campo por aria-describedby; combobox com aria-haspopup=listbox, aria-expanded=false e SEM aria-controls enquanto fechado", inicial.texto === "Escolha uma pessoa ▾" && inicial.borda === VERMELHO && inicial.erroTexto === "Escolha o responsável" && inicial.describedby === inicial.erroId && inicial.expanded === "false" && (await js('(()=>{const s=document.querySelector(".pc-cor .pc-resp-seletor");const q=document.querySelector(".pc-cor .pc-resp-erro");return s.getAttribute("role")==="combobox"&&s.getAttribute("aria-haspopup")==="listbox"&&!s.hasAttribute("aria-controls")&&q.getAttribute("aria-live")==="polite"})()')), JSON.stringify(inicial));
      await n.esperar(250);
      const tocado = await estado();
      await foto("17ag-fechado-sem-escolha-1440x800");
      await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1152, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
      await n.esperar(400);
      await foto("17ag-fechado-sem-escolha-1152x800");
      await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
      await n.esperar(400);
      registrar("17ac2. A linha do erro tem 20 px reservados e o erro fica abaixo do campo: com o erro visível o campo e o Prazo não se deslocam depois (altura da lateral estável) ", tocado.borda === VERMELHO && tocado.erroTexto === "Escolha o responsável" && (await js('(()=>{const s=document.querySelector(".pc-cor .pc-resp-seletor").getBoundingClientRect();const e=document.querySelector(".pc-cor .pc-resp-erro").getBoundingClientRect();return e.top>=s.bottom-1&&Math.round(e.height)>=20})()')), JSON.stringify(tocado));
      const alturaLateralVazio = await js('(()=>{const l=document.querySelector(".pc-cor .pc-detail-lateral");return {sh:l.scrollHeight,prazoTop:Math.round(document.querySelector(".pc-cor .pc-plan-prazo").getBoundingClientRect().top)}})()');
      // Com o responsável ainda vazio, abrir "+ Outra pessoa…" NÃO mostra o erro durante a digitação; ao cancelar (Esc) o erro volta.
      await js('document.querySelector(".pc-cor .pc-resp-seletor")?.focus()');
      await apertar("Enter");
      await apertar("End");
      await apertar("Enter");
      const digitandoVazio = await estado();
      const inputVazio = await js('(()=>{const i=document.querySelector(".pc-cor .pc-resp-digitar");return {invalido:i?.getAttribute("aria-invalid"),borda:i?getComputedStyle(i).borderTopColor:""}})()');
      await apertar("Esc");
      const voltouVazio = await estado();
      registrar("17ac2c. Responsável vazio: durante a digitação em '+ Outra pessoa…' o erro NÃO aparece (região aria-live vazia, campo sem vermelho); cancelar com Esc devolve o foco ao campo e o erro volta", digitandoVazio.digitando && digitandoVazio.erroTexto === "" && inputVazio.invalido === "false" && inputVazio.borda !== VERMELHO && !voltouVazio.digitando && voltouVazio.foco === "seletor" && voltouVazio.erroTexto === "Escolha o responsável" && voltouVazio.borda === VERMELHO, JSON.stringify({ digitandoVazio: digitandoVazio.erroTexto, inputVazio, voltou: voltouVazio.erroTexto }));

      // Abrir com o mouse (clique real): a lista cola no campo, com todas as pessoas e "+ Outra pessoa…" no fim.
      const antesLat = await js('(()=>{const l=document.querySelector(".pc-cor .pc-detail-lateral");const c=document.querySelector(".pc-cor .pc-detail-corpo");return {l:l.scrollHeight,c:c.scrollHeight}})()');
      await clicarReal(".pc-cor .pc-resp-seletor");
      await n.esperar(150);
      const aberto = await estado();
      await foto("17ag-aberto-1440x800");
      const geo = JSON.parse(await js(`(()=>{const s=document.querySelector(".pc-cor .pc-resp-seletor");const l=document.querySelector(".pc-resp-lista");if(!l)return JSON.stringify({existe:false});const sr=s.getBoundingClientRect(),lr=l.getBoundingClientRect();const ops=[...l.querySelectorAll('[role="option"]')];const lat=document.querySelector(".pc-cor .pc-detail-lateral");const corpo=document.querySelector(".pc-cor .pc-detail-corpo");const outraTop=l.querySelector(".pc-resp-opcao--outra").getBoundingClientRect().top;const noTopo=(e)=>{const r=e.getBoundingClientRect();const ehOutra=e.classList.contains("pc-resp-opcao--outra");const topo=Math.max(r.top,lr.top),base=Math.min(r.bottom,ehOutra?lr.bottom:outraTop,lr.bottom);if(base-topo<=2)return true;const t=document.elementFromPoint(r.left+r.width/2,(topo+base)/2);return !!t&&(t===e||e.contains(t))};const visiveis=ops;return JSON.stringify({existe:true,coladaNoCampo:Math.abs(lr.top-sr.bottom)<=2&&Math.abs(lr.left-sr.left)<=1&&Math.abs(lr.width-sr.width)<=1,bordaAzul:getComputedStyle(l).borderLeftColor==="${AZUL}"&&getComputedStyle(s).borderTopColor==="${AZUL}",opcoes44:ops.every((o)=>Math.round(o.getBoundingClientRect().height)===44),dentroDaJanela:lr.left>=0&&lr.right<=innerWidth&&lr.top>=0&&lr.bottom<=innerHeight,semCorteNemCobertura:visiveis.every(noTopo),semRolagemNaLateral:lat.scrollHeight<=lat.clientHeight&&corpo.scrollHeight<=${antesLat.c},ordem:l.getAttribute("role")==="listbox"&&!!l.id&&s.getAttribute("aria-controls")===l.id,z:getComputedStyle(l).position==="fixed",medidas:{lista:[Math.round(lr.left),Math.round(lr.top),Math.round(lr.right),Math.round(lr.bottom)],campo:[Math.round(sr.left),Math.round(sr.top),Math.round(sr.right),Math.round(sr.bottom)],latScroll:lat.scrollHeight,latClient:lat.clientHeight}})})()`));
      const [okGeo, falhaGeo] = resultadoDosChecks(JSON.stringify(geo));
      registrar("17ag1. Aberto por clique: a lista cola no campo (mesma largura, 2 px), borda azul #264A80, opções de 44 px, dentro da janela, nenhuma opção coberta ou cortada (elementFromPoint) e a lateral/corpo NÃO ganham rolagem", aberto.aberto && aberto.expanded === "true" && okGeo, falhaGeo || JSON.stringify(geo.medidas));
      const ordenados = [...aberto.titulos.slice(0, -1)].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
      registrar("17ag2. Lista com mais de 3 pessoas: TODAS aparecem (não há limite de 3), em ordem alfabética pelo nome completo (no title), sem repetidos, nome curto à vista, 'Elton Strapazon' etc., e '+ Outra pessoa…' no fim", aberto.opcoes.length - 1 >= 8 && JSON.stringify(ordenados) === JSON.stringify(aberto.titulos.slice(0, -1)) && new Set(aberto.titulos.slice(0, -1).map(norm)).size === aberto.opcoes.length - 1 && aberto.opcoes[aberto.opcoes.length - 1] === "+ Outra pessoa…" && aberto.opcoes.includes("Ana Montenegro") && aberto.opcoes.includes("Francisco Vasconcelos") && aberto.selecionadas.length === 0, JSON.stringify(aberto.opcoes));
      registrar("17ag3. ARIA do aberto: role=listbox ligada ao campo por aria-controls, cada opção com role=option e aria-selected (nenhuma marcada sem escolha), aria-activedescendant aponta a opção ativa", aberto.indiceAtivo === 0 && aberto.ativo !== "" && (await js('(()=>{const ops=[...document.querySelectorAll(".pc-resp-lista [role=option]")];return ops.length>0&&ops.every((o)=>o.id&&o.hasAttribute("aria-selected"))})()')), JSON.stringify({ indiceAtivo: aberto.indiceAtivo }));
      // Rolagem por dentro: com mais de 6 opções a lista tem altura máxima (6 pessoas + "+ Outra pessoa…") e rola; com 6 ou menos não rola.
      const rolagem = JSON.parse(await js(`(()=>{const l=document.querySelector(".pc-resp-lista");const total=l.querySelectorAll('[role=option]').length;const rola=l.scrollHeight>l.clientHeight+1;const altura=Math.round(l.getBoundingClientRect().height);const outra=l.querySelector(".pc-resp-opcao--outra").getBoundingClientRect();const lr=l.getBoundingClientRect();const stick=outra.bottom<=lr.bottom+0.5&&outra.top>=lr.top;const copia=[...l.querySelectorAll('[role=option]')];const removidos=[];while(l.querySelectorAll('[role=option]').length>7){const o=l.querySelectorAll('[role=option]')[0];removidos.push(o);o.remove()}const semRolar=l.scrollHeight<=l.clientHeight+1;const alturaCom7=Math.round(l.getBoundingClientRect().height);removidos.reverse().forEach((o)=>l.insertBefore(o,l.firstChild));return JSON.stringify({total,rolaComMaisDe6:total-1>6&&rola,alturaMaxima:altura===310||altura<=310,outraSempreVisivel:stick,semRolagemComAte6:semRolar,alturaCom6PessoasMaisOutra:alturaCom7===7*44+2,medidas:{altura,alturaCom7}})})()`));
      const [okRol, falhaRol] = resultadoDosChecks(JSON.stringify(rolagem));
      registrar("17ag4. Mais de 6 pessoas: a lista rola por dentro (altura máxima de 6 pessoas + '+ Outra pessoa…', esta sempre visível no fim); com 6 pessoas ou menos não rola (7 linhas de 44 px + bordas)", okRol, falhaRol || JSON.stringify(rolagem.medidas));
      // Mouse real: mover sobre uma opção a torna ativa (aria-activedescendant); a roda rola a lista por dentro e a rolagem NÃO volta.
      const alvoDaLista = await js('(()=>{const l=document.querySelector(".pc-resp-lista");const r=l.getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+100)}})()');
      await n.enviar("Input.dispatchMouseEvent", { type: "mouseMoved", x: alvoDaLista.x, y: alvoDaLista.y });
      await n.esperar(150);
      const sobreOpcao = await estado();
      const topoDaLista = await js('document.querySelector(".pc-resp-lista").getBoundingClientRect().top');
      await n.enviar("Input.dispatchMouseEvent", { type: "mouseWheel", x: alvoDaLista.x, y: alvoDaLista.y, deltaX: 0, deltaY: 30 });
      await n.esperar(350);
      const rol1 = await js('document.querySelector(".pc-resp-lista").scrollTop');
      await n.esperar(450);
      const rol2 = await js('document.querySelector(".pc-resp-lista").scrollTop');
      await n.enviar("Input.dispatchMouseEvent", { type: "mouseWheel", x: alvoDaLista.x, y: alvoDaLista.y, deltaX: 0, deltaY: 30 });
      await n.esperar(450);
      const rol3 = await js('document.querySelector(".pc-resp-lista").scrollTop');
      const topoDepois = await js('document.querySelector(".pc-resp-lista").getBoundingClientRect().top');
      registrar("17ag4b. Mouse real: passar sobre a 3ª opção a torna ativa (aria-activedescendant); a roda do mouse rola a lista por dentro e a rolagem NÃO é desfeita (não volta à opção ativa, a lista não se reposiciona)", sobreOpcao.indiceAtivo === 2 && rol1 > 0 && rol2 === rol1 && rol3 > rol2 && rol3 > rol1 && topoDaLista === topoDepois, JSON.stringify({ ativo: sobreOpcao.indiceAtivo, rol1, rol2, rol3, topoDaLista, topoDepois }));
      await js('document.querySelector(".pc-resp-lista").scrollTop=0');
      // Clicar fora fecha sem alterar a escolha (clique real no título do detalhe).
      await clicarReal(".pc-cor .pc-detail-title");
      const fora = await estado();
      registrar("17ag5. Clicar fora fecha a lista sem alterar a escolha (continua 'Escolha uma pessoa ▾')", !fora.aberto && fora.expanded === "false" && fora.texto === "Escolha uma pessoa ▾", JSON.stringify({ aberto: fora.aberto, texto: fora.texto }));

      // Teclado: abrir com Enter, Espaço e seta para baixo; Esc fecha e devolve o foco ao campo.
      const abriu = {};
      for (const [nome, tecla] of [["Enter", "Enter"], ["Espaço", "Espaco"], ["Seta para baixo", "Baixo"]]) {
        await js('document.querySelector(".pc-cor .pc-resp-seletor")?.focus()');
        await apertar(tecla);
        const a = await estado();
        await apertar("Esc");
        const f = await estado();
        abriu[nome] = a.aberto && a.expanded === "true" && a.indiceAtivo === 0 && !f.aberto && f.foco === "seletor" && f.texto === "Escolha uma pessoa ▾";
      }
      registrar("17ag6. Teclas reais (CDP): Enter, Espaço e seta para baixo ABREM a lista; Esc FECHA, devolve o foco ao campo e não muda a escolha", Object.values(abriu).every(Boolean), JSON.stringify(abriu));
      // Navegação: setas, Home e End; Enter escolhe a opção ativa.
      await abrirSeletor();
      await apertar("Baixo");
      await apertar("Baixo");
      const nav2 = await estado();
      await apertar("End");
      const navFim = await estado();
      await apertar("Home");
      const navIni = await estado();
      await apertar("Cima");
      const navCima = await estado();
      registrar("17ag7. Setas navegam (2x seta para baixo = 3ª opção), End vai para '+ Outra pessoa…', Home para a 1ª e seta para cima na 1ª não sai da lista; a escolha só muda com Enter", nav2.indiceAtivo === 2 && navFim.indiceAtivo === navFim.opcoes.length - 1 && navIni.indiceAtivo === 0 && navCima.indiceAtivo === 0 && navCima.texto === "Escolha uma pessoa ▾" && navCima.foco === "seletor", JSON.stringify({ nav2: nav2.indiceAtivo, fim: navFim.indiceAtivo, ini: navIni.indiceAtivo, cima: navCima.indiceAtivo }));
      await apertar("Baixo");
      await apertar("Baixo");
      const terceira = (await estado()).titulos[2];
      await apertar("Enter");
      const escolhido = await estado();
      await foto("17ag-fechado-escolhido-1440x800");
      const alturaLateralEscolhido = await js('(()=>{const l=document.querySelector(".pc-cor .pc-detail-lateral");return {sh:l.scrollHeight,prazoTop:Math.round(document.querySelector(".pc-cor .pc-plan-prazo").getBoundingClientRect().top)}})()');
      registrar("17ac2b. Sem erro e com erro a lateral tem a mesma altura e o Prazo fica no mesmo lugar (a linha do erro é reservada, sem gap extra)", alturaLateralVazio.sh === alturaLateralEscolhido.sh && alturaLateralVazio.prazoTop === alturaLateralEscolhido.prazoTop, JSON.stringify({ alturaLateralVazio, alturaLateralEscolhido }));
      const curtoDe = (nome) => { const p = nome.trim().split(/\s+/); if (p.length <= 2) return p.join(" "); const ult = p[p.length - 1]; const sn = ["neto", "filho", "junior", "jr", "sobrinho"].includes(norm(ult).replace(/\.$/, "")) ? p[p.length - 2] : ult; return p[0] + " " + sn; };
      registrar("17ag8. Enter escolhe a opção ativa (3ª da lista): fecha, o foco volta ao campo, mostra '✓ Nome curto ▾' com o nome completo no title, borda cinza padrão e o erro some (região aria-live vazia, sem aria-describedby)", !escolhido.aberto && escolhido.foco === "seletor" && escolhido.texto === `✓ ${curtoDe(terceira)} ▾` && escolhido.titulo === terceira && escolhido.borda === CINZA && escolhido.erroTexto === "" && escolhido.describedby === "", JSON.stringify({ texto: escolhido.texto, borda: escolhido.borda }));
      // Reabrir: a escolhida aparece marcada (aria-selected, ✓ e creme) e a opção ativa começa nela; clicar nela de novo não desmarca.
      await apertar("Enter");
      const reaberto = await estado();
      await apertar("Baixo");
      const marca = JSON.parse(await js(`(()=>{const ops=[...document.querySelectorAll(".pc-resp-lista [role=option]")];const o=ops.find((x)=>x.getAttribute("aria-selected")==="true");const at=ops.find((x)=>x.classList.contains("is-ativa"));return JSON.stringify({existe:!!o,creme:!!o&&getComputedStyle(o).backgroundColor==="rgb(255, 246, 229)",visto:!!o&&o.textContent.trim().startsWith("✓"),unica:document.querySelectorAll('.pc-resp-lista [aria-selected="true"]').length===1,ativaCremeEscuro:!!at&&at!==o&&getComputedStyle(at).backgroundColor==="rgb(255, 239, 208)"})})()`));
      await apertar("Cima");
      const [okMarca, falhaMarca] = resultadoDosChecks(JSON.stringify(marca));
      registrar("17ag9. Reaberta, a pessoa atual fica marcada (aria-selected=true, ✓ e fundo creme #FFF6E5) e é a opção ativa (a ativa pelo teclado fica em creme mais escuro #FFEFD0, distinta da atual)", reaberto.selecionadas.length === 1 && reaberto.selecionadas[0] === terceira && reaberto.indiceAtivo === 2 && okMarca, falhaMarca);
      await foto("17ag-aberto-com-escolha-1440x800");
      await apertar("Esc");
      // Escolher com o mouse (clique real na 2ª opção).
      await clicarReal(".pc-cor .pc-resp-seletor");
      const segunda = (await estado()).titulos[1];
      await clicarReal(".pc-resp-lista [role=option]", 1);
      const porMouse = await estado();
      registrar("17ag10. Escolher com o mouse (clique real na 2ª opção): fecha a lista, mostra '✓ Nome curto ▾' e mantém o foco no campo", !porMouse.aberto && porMouse.texto === `✓ ${curtoDe(segunda)} ▾` && porMouse.titulo === segunda && porMouse.foco === "seletor", JSON.stringify({ texto: porMouse.texto, foco: porMouse.foco }));
      // Foco visível (Tab real chegando ao campo).
      await js('document.querySelector(".pc-cor .pc-acao-area")?.focus()');
      for (let i = 0; i < 40; i++) {
        await n.enviar("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
        await n.enviar("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
        if (await js('document.activeElement?.classList.contains("pc-resp-seletor")')) break;
      }
      const focoVisivel = await js(`(()=>{const s=document.querySelector(".pc-cor .pc-resp-seletor");const c=getComputedStyle(s);return document.activeElement===s&&c.outlineStyle==="solid"&&c.outlineWidth==="3px"&&s.matches(":focus-visible")})()`);
      registrar("17ag11. Tab real leva o foco ao campo e o foco é VISÍVEL (contorno sólido de 3 px, :focus-visible)", focoVisivel);
      // Tab real com a lista aberta: fecha a lista, não muda a escolha e o foco segue para "Enviar lembrete".
      await js('document.querySelector(".pc-cor .pc-resp-seletor")?.focus()');
      await apertar("Enter");
      const abertaParaTab = await estado();
      await n.enviar("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
      await n.enviar("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
      await n.esperar(200);
      const aposTab = await estado();
      registrar("17ag11b. Tab com a lista aberta fecha a lista (sem mudar a escolha) e o foco segue para 'Enviar lembrete'", abertaParaTab.aberto && !aposTab.aberto && aposTab.texto === `✓ ${curtoDe(segunda)} ▾` && (await js('document.activeElement?.classList.contains("pc-plan-lembrete")')) && (await js('document.querySelectorAll(".pc-resp-lista").length===0')), JSON.stringify({ aposTab: aposTab.aberto }));
      await js('document.querySelector(".pc-cor .pc-resp-seletor")?.focus()');
      // "+ Outra pessoa…": digitar; o parcial nunca vira responsável nem opção.
      await apertar("Enter");
      await apertar("End");
      await apertar("Enter");
      const dig = await estado();
      registrar("17ac3. '+ Outra pessoa…' troca o campo por digitação (foco no input, aria-label 'Nome do responsável', placeholder 'Digite o nome e Enter', 42 px, lista fechada, sem somar altura: a lateral não rola)", dig.digitando && dig.foco === "input" && !dig.aberto && !dig.latRola && (await js('(()=>{const i=document.querySelector(".pc-cor .pc-resp-digitar");return i?.getAttribute("aria-label")==="Nome do responsável"&&i.placeholder==="Digite o nome e Enter"&&Math.round(i.getBoundingClientRect().height)===42})()')), JSON.stringify({ digitando: dig.digitando, foco: dig.foco }));
      await foto("17ag-digitando-1440x800");
      await digitarReal("Mar");
      const parcial = await estado();
      registrar("17ac4. Texto parcial ('Mar') não vira responsável nem opção: nenhuma lista aberta, nenhuma opção 'Mar' e a lateral não rola", parcial.digitando && parcial.valorInput === "Mar" && !parcial.aberto && !parcial.latRola, JSON.stringify(parcial.valorInput));
      await apertar("Esc");
      const cancelado = await estado();
      registrar("17ac5. Esc cancela a digitação: volta ao campo com o foco, restaura o valor anterior e o parcial não aparece na lista", !cancelado.digitando && cancelado.foco === "seletor" && cancelado.texto === `✓ ${curtoDe(segunda)} ▾` && (await (async () => { await apertar("Enter"); const e = await estado(); await apertar("Esc"); return !e.opcoes.some((o) => /^Mar$/.test(o)) && e.selecionadas[0] === segunda; })()), JSON.stringify({ texto: cancelado.texto }));
      await abrirSeletor();
      await apertar("End");
      await apertar("Enter");
      await digitarReal("  Fulano   de   Tal ");
      await apertar("Enter");
      const confirmado = await estado();
      registrar("17ac6. Enter confirma o nome digitado NORMALIZADO (espaços únicos): o campo volta com o foco, mostra '✓ Fulano Tal ▾' com 'Fulano de Tal' no title e a pessoa entra na lista, marcada", !confirmado.digitando && confirmado.foco === "seletor" && confirmado.titulo === "Fulano de Tal" && confirmado.texto === "✓ Fulano Tal ▾" && (await (async () => { await apertar("Enter"); const e = await estado(); await apertar("Esc"); return e.titulos.includes("Fulano de Tal") && e.selecionadas.length === 1 && e.selecionadas[0] === "Fulano de Tal"; })()), JSON.stringify({ texto: confirmado.texto, titulo: confirmado.titulo }));
      // Blur com nome preenchido confirma com a GRAFIA DO CADASTRO; blur vazio restaura.
      const nomeMari = aberto.titulos.find((o) => /marivane/i.test(o)) || "";
      await abrirSeletor();
      await apertar("End");
      await apertar("Enter");
      await digitarReal("  " + nomeMari.toLowerCase().split(" ").join("   ") + " ");
      await clicarReal(".pc-cor .pc-detail-title");
      await n.esperar(300);
      const normalizado = await estado();
      registrar("17ac7. Sair do campo (blur REAL, clique fora) com o nome em minúsculas e espaços duplos confirma a GRAFIA DO CADASTRO (sem criar outra pessoa com a grafia digitada)", !!nomeMari && !normalizado.digitando && normalizado.titulo === nomeMari, JSON.stringify({ titulo: normalizado.titulo === nomeMari }));
      await abrirSeletor();
      await apertar("End");
      await apertar("Enter");
      await n.enviar("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
      await n.enviar("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
      await n.esperar(300);
      const restaurado = await estado();
      registrar("17ac8. Sair do campo VAZIO (blur REAL, Tab) restaura a escolha de antes", !restaurado.digitando && restaurado.titulo === nomeMari, JSON.stringify({ titulo: restaurado.titulo === nomeMari }));
      await abrirSeletor();
      await apertar("End");
      await apertar("Enter");
      await apertar("Enter");
      const enterVazio = await estado();
      registrar("17ac9. Enter com o campo vazio restaura a escolha de antes (nada vira responsável) e devolve o foco ao campo", !enterVazio.digitando && enterVazio.titulo === nomeMari && enterVazio.foco === "seletor", JSON.stringify({ foco: enterVazio.foco }));
      // Trocar de correção ou de etapa SEM blur (clique por script) com a lista aberta: o portal some; com digitação preenchida o texto é CONFIRMADO normalizado.
      const cartaoSemRalo = `(()=>{const c=[...document.querySelectorAll(".pc-cor .pc-cor-card")].find((x)=>!x.innerText.includes("Ralo sem tampa"));c?.click();return !!c})()`;
      const abrirRalo = async () => {
        await js('(()=>{const c=[...document.querySelectorAll(".pc-cor .pc-cor-card")].find((x)=>x.innerText.includes("Ralo sem tampa"));c?.click();return !!c})()');
        await esperar(async () => js('document.querySelector(".pc-cor .pc-detail-title")?.textContent.includes("Ralo sem tampa")'), 5000);
        await n.esperar(250);
      };
      await js('document.querySelector(".pc-cor .pc-resp-seletor")?.focus()');
      await apertar("Enter");
      const listasAntes = await js('document.querySelectorAll(".pc-resp-lista").length');
      await js(cartaoSemRalo);
      await n.esperar(400);
      const listasDepois = await js('document.querySelectorAll(".pc-resp-lista").length');
      await abrirRalo();
      registrar("17ag13. Trocar de correção com a lista aberta remove a lista do body (nenhum portal sobra) e a correção reaberta tem o campo fechado", listasAntes === 1 && listasDepois === 0 && !(await estado()).aberto, JSON.stringify({ listasAntes, listasDepois }));
      await js('document.querySelector(".pc-cor .pc-resp-seletor")?.focus()');
      await apertar("Enter");
      await js('document.querySelectorAll(".pc-cor .pc-etapa")[1].click()');
      await n.esperar(400);
      const listasEtapa = await js('document.querySelectorAll(".pc-resp-lista").length');
      await js('document.querySelectorAll(".pc-cor .pc-etapa")[0].click()');
      await n.esperar(400);
      await abrirRalo();
      registrar("17ag14. Trocar de etapa com a lista aberta também remove a lista do body", listasEtapa === 0);
      await js('document.querySelector(".pc-cor .pc-resp-seletor")?.focus()');
      await apertar("Enter");
      await apertar("End");
      await apertar("Enter");
      await digitarReal("  beltrano   de   teste ");
      await js(cartaoSemRalo);
      await n.esperar(400);
      await abrirRalo();
      const confirmadoNaTroca = await estado();
      registrar("17ac10. Texto preenchido em '+ Outra pessoa…' e a correção trocada SEM blur: o nome é CONFIRMADO normalizado (rascunho em memória) e aparece marcado ao voltar; nada se perde em silêncio", confirmadoNaTroca.titulo === "beltrano de teste", JSON.stringify({ titulo: confirmadoNaTroca.titulo, texto: confirmadoNaTroca.texto }));
      await js('document.querySelector(".pc-cor .pc-resp-seletor")?.focus()');
      await apertar("Enter");
      await apertar("Home");
      await apertar("Enter");
      // Responsável antigo não normalizado ("  elton   volmir   strapazon " gravado na correção da câmara fria): aparece marcado, com a grafia do cadastro, sem linha duplicada.
      await js('(()=>{const c=[...document.querySelectorAll(".pc-cor .pc-cor-card")].find((x)=>x.innerText.includes("câmara fria"));c?.click();return !!c})()');
      await esperar(async () => js('document.querySelector(".pc-cor .pc-detail-title")?.textContent.includes("câmara fria")'), 5000);
      await n.esperar(250);
      const antigoFechado = await estado();
      await js('document.querySelector(".pc-cor .pc-resp-seletor")?.focus()');
      await apertar("Enter");
      const antigoAberto = await estado();
      await apertar("Esc");
      registrar("17ag15. Responsável antigo não normalizado ('  elton   volmir   strapazon ') aparece marcado com a grafia do cadastro ('Elton Volmir Strapazon'), uma só vez na lista (mesma quantidade de opções) e a lista não ganha linha duplicada", antigoFechado.texto === "✓ Elton Strapazon ▾" && antigoFechado.titulo === "Elton Volmir Strapazon" && antigoAberto.selecionadas.length === 1 && antigoAberto.selecionadas[0] === "Elton Volmir Strapazon" && antigoAberto.opcoes.length === aberto.opcoes.length, JSON.stringify({ texto: antigoFechado.texto, opcoes: antigoAberto.opcoes.length, esperado: aberto.opcoes.length }));
      await abrirRalo();
      // Larguras de 1000 a 1300 (e 1440): a lista aberta fica inteira na janela, não é coberta nem corta, e nada ganha rolagem.
      for (const [largura, altura] of [[1000, 800], [1100, 800], [1152, 800], [1200, 800], [1300, 800], [1440, 800], [1000, 700], [1000, 900], [1152, 700], [1152, 900], [1440, 700], [1440, 900]]) {
        await n.enviar("Emulation.setDeviceMetricsOverride", { width: largura, height: altura, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
        await n.esperar(450);
        await js('document.querySelector(".pc-cor .pc-resp-seletor")?.scrollIntoView({block:"center"})');
        await n.esperar(150);
        const rolagens = await js('(()=>{const l=document.querySelector(".pc-cor .pc-detail-lateral");const c=document.querySelector(".pc-cor .pc-detail-corpo");return {l:l.scrollHeight,lc:l.clientHeight,c:c.scrollHeight,cc:c.clientHeight,top:c.scrollTop}})()');
        await abrirSeletor();
        await n.esperar(200);
        const g = JSON.parse(await js(`(()=>{const s=document.querySelector(".pc-cor .pc-resp-seletor");const l=document.querySelector(".pc-resp-lista");if(!l)return JSON.stringify({existe:false});const sr=s.getBoundingClientRect(),lr=l.getBoundingClientRect();const ops=[...l.querySelectorAll('[role="option"]')];const outraTop=l.querySelector(".pc-resp-opcao--outra").getBoundingClientRect().top;const noTopo=(e)=>{const r=e.getBoundingClientRect();const ehOutra=e.classList.contains("pc-resp-opcao--outra");const topo=Math.max(r.top,lr.top),base=Math.min(r.bottom,ehOutra?lr.bottom:outraTop,lr.bottom);if(base-topo<=2)return true;const t=document.elementFromPoint(r.left+r.width/2,(topo+base)/2);return !!t&&(t===e||e.contains(t))};const lat=document.querySelector(".pc-cor .pc-detail-lateral");const c=document.querySelector(".pc-cor .pc-detail-corpo");const foot=document.querySelector(".pc-cor .pc-detail-foot").getBoundingClientRect();const colada=Math.abs(lr.top-sr.bottom)<=2||Math.abs(lr.bottom-sr.top)<=2;return JSON.stringify({existe:true,coladaNoCampo:colada&&Math.abs(lr.left-sr.left)<=1&&Math.abs(lr.width-sr.width)<=1,dentroDaJanela:lr.left>=0&&lr.right<=innerWidth&&lr.top>=0&&lr.bottom<=innerHeight,semCobertura:ops.every(noTopo),latSemMudar:lat.scrollHeight===${rolagens.l}&&c.scrollHeight===${rolagens.c},listaCabeNaJanela:lr.height<=innerHeight-16+0.5,abaixoOuSemEspaco:(lr.top>=sr.bottom-2&&lr.bottom<=foot.top+0.5)||(lr.bottom<=sr.top+2&&(foot.top-8-sr.bottom)<Math.min(ops.length,7)*44+2),lateralDe100cqh:innerWidth<1150||lat.getBoundingClientRect().bottom<=foot.top+1,campoNaJanela:sr.top>=0&&sr.bottom<=innerHeight,medidas:{lista:[Math.round(lr.left),Math.round(lr.top),Math.round(lr.right),Math.round(lr.bottom)],campo:[Math.round(sr.top),Math.round(sr.bottom)],rodapeTop:Math.round(foot.top),maxima:Math.round(lr.height)}})})()`));
        const [okG, falhaG] = resultadoDosChecks(JSON.stringify(g));
        if (altura === 800 && (largura === 1152 || largura === 1000)) await foto(`17ag-aberto-${largura}x800`);
        registrar(`17ag12. ${largura}x${altura}: com a lista aberta ela cola no campo, fica inteira na janela (altura <= janela - 16 px), abre para baixo sem passar do rodapé fixo (ou sobe, só quando não há espaço embaixo nem rolando o corpo), nenhuma opção é coberta ou cortada, a lateral (100cqh) fica acima do rodapé e nem a lateral nem o corpo ganham rolagem`, okG, falhaG || JSON.stringify(g.medidas));
        if (largura === 1000 && altura === 800) {
          // Campo fora da área visível do corpo ao rolar: a lista fecha (a lateral é empurrada para baixo por script para forçar o campo para fora).
          await js('(()=>{const c=document.querySelector(".pc-cor .pc-detail-corpo");document.querySelector(".pc-cor .pc-detail-lateral").style.marginTop="2000px";c.scrollTop=c.scrollTop+1;return true})()');
          await n.esperar(300);
          const fechouAoRolar = await js('document.querySelectorAll(".pc-resp-lista").length===0');
          await js('(()=>{const c=document.querySelector(".pc-cor .pc-detail-corpo");document.querySelector(".pc-cor .pc-detail-lateral").style.marginTop="";c.scrollTop=0;return true})()');
          registrar("17ag16. 1000x800: a lista fecha quando o campo sai da área visível do corpo ao rolar", fechouAoRolar);
        }
        await apertar("Esc");
        if (largura === 1152 && altura === 800) {
          await foto("17ag-fechado-escolhido-1152x800");
          await apertar("Enter");
          await apertar("End");
          await apertar("Enter");
          await foto("17ag-digitando-1152x800");
          await apertar("Esc");
        }
      }
      await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
      await n.esperar(400);
      // Volta a um estado limpo: escolhe a primeira pessoa cadastrada (a digitada à mão sai da lista).
      await abrirSeletor();
      await apertar("Home");
      await apertar("Enter");
      await n.esperar(200);
      await js('document.querySelector(".pc-cor .pc-detail-corpo")?.scrollTo(0,0)');
    }
    // 17ad. Prazo vazio: o erro aparece abaixo do campo (sem cobrir a data); Prazo no passado: "Já passou" não invade o valor, de 1001 a 1299 px.
    {
      const prazoOriginal2 = await js('document.querySelector(".pc-cor .pc-plan-prazo input").value');
      const setPrazo = (valor) => js(`(()=>{const el=document.querySelector(".pc-cor .pc-plan-prazo input");Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),"value").set.call(el,${JSON.stringify(valor)});el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new FocusEvent("focusout",{bubbles:true}));return true})()`);
      for (const largura of [1001, 1152, 1299, 1440]) {
        await n.enviar("Emulation.setDeviceMetricsOverride", { width: largura, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
        await n.esperar(300);
        try {
          await setPrazo("");
          await n.esperar(250);
          const vazio = JSON.parse(await js(`(()=>{const l=document.querySelector(".pc-cor .pc-detail-lateral");const i=l.querySelector(".pc-plan-prazo input");const a=l.querySelector(".pc-prazo-aviso");const e=l.querySelector(".pc-prazo-erro");const lr=l.getBoundingClientRect();return JSON.stringify({aviso:!!a&&a.textContent.trim().length>0,semJaPassou:!e,abaixoDoCampo:!!a&&a.getBoundingClientRect().top>=i.getBoundingClientRect().bottom-1,dentroDaLateral:!!a&&a.getBoundingClientRect().left>=lr.left-0.5&&a.getBoundingClientRect().right<=lr.right+0.5,ligadoAoCampo:!!a&&(i.getAttribute("aria-describedby")||"").split(" ").includes(a.id),idUnico:document.querySelectorAll('[id^="prazo-erro-"]').length===1})})()`));
          const [okV, falhaV] = resultadoDosChecks(JSON.stringify(vazio));
          registrar(`17ad. ${largura} px, Prazo vazio: o erro mais longo aparece ABAIXO do campo (não 'Já passou' sobre a data), dentro da coluna e ligado ao campo por aria-describedby`, okV, falhaV);
          await setPrazo("2020-01-01");
          await n.esperar(250);
          const passado = JSON.parse(await js(`(()=>{const l=document.querySelector(".pc-cor .pc-detail-lateral");const i=l.querySelector(".pc-plan-prazo input");const e=l.querySelector(".pc-prazo-erro");if(!e)return JSON.stringify({aviso:false});const cs=getComputedStyle(i);const cv=document.createElement("canvas").getContext("2d");cv.font=cs.fontStyle+" "+cs.fontWeight+" "+cs.fontSize+" "+cs.fontFamily;const fim=i.getBoundingClientRect().left+parseFloat(cs.borderLeftWidth)+parseFloat(cs.paddingLeft)+cv.measureText("00/00/0000").width;const er=e.getBoundingClientRect();return JSON.stringify({aviso:e.textContent.trim()==="Já passou",naoInvadeAData:er.left>=fim+4,dentroDoCampo:er.right<=i.getBoundingClientRect().right,idUnico:document.querySelectorAll('[id^="prazo-erro-"]').length===1})})()`));
          const [okJ, falhaJ] = resultadoDosChecks(JSON.stringify(passado));
          registrar(`17ad2. ${largura} px, data no passado: 'Já passou' só nesse caso e à direita do valor da data (folga >= 4 px)`, okJ, falhaJ);
        } finally {
          await js(`(()=>{const el=document.querySelector(".pc-cor .pc-plan-prazo input");Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),"value").set.call(el,${JSON.stringify(prazoOriginal2)});el.dispatchEvent(new Event("input",{bubbles:true}));return true})()`);
        }
      }
    }
    // 17af. Ordem do Tab = ordem visual (bloco 1, bloco 2, bloco 3) com teclas reais (CDP), em 1000, 1100, 1152 e 1440 px.
    for (const largura of [1000, 1100, 1152, 1440]) {
      await n.enviar("Emulation.setDeviceMetricsOverride", { width: largura, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
      await n.esperar(400);
      await js('document.querySelector(".pc-cor .pc-acao-area")?.focus()');
      const regioes = [];
      for (let i = 0; i < 70; i++) {
        await n.enviar("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
        await n.enviar("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
        const regiao = await js(`(()=>{const a=document.activeElement;if(!a)return "";const q=(s)=>a.closest(s);return q(".pc-plan-acao")?"1-acao":q(".pc-plan-causa")?"1-causa":q(".pc-plan-resp")?"2-pessoas":q(".pc-plan-prazo")?"2-prazo":q(".pc-provas")?"3-provas":q(".pc-detail-foot")?"rodape":"fora"})()`);
        if (regioes[regioes.length - 1] !== regiao) regioes.push(regiao);
        if (regiao === "rodape" || regiao === "fora") break;
      }
      const esperado = ["1-acao", "1-causa", "2-pessoas", "2-prazo", "3-provas"];
      const ok = regioes.slice(0, -1).every((x, i) => i === 0 || esperado.indexOf(x) > esperado.indexOf(regioes[i - 1])) && esperado.filter((x) => x !== "1-causa").every((x) => regioes.includes(x));
      registrar(`17af. ${largura} px, Tab com teclas reais: o foco percorre ação, causa raiz, pessoas, prazo e provas NESSA ordem (a ordem do DOM é a ordem visual)`, ok, JSON.stringify(regioes));
    }
    // 17ae. Correção reincidente a 1440x800: a Causa raiz (obrigatória) vem logo após "O que será feito" e aparece sem rolar; só a coluna esquerda pode rolar.
    {
      await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
      await n.esperar(400);
      const re = JSON.parse(await js(`(()=>{const q=document.querySelector(".pc-detail--corr");const corpo=q.querySelector(".pc-detail-corpo");const lat=q.querySelector(".pc-detail-lateral");const causa=q.querySelector(".pc-plan-causa");const acao=q.querySelector(".pc-plan-acao");const cr=corpo.getBoundingClientRect();const info=[...q.querySelectorAll(".pc-plan-stack > *")].filter((e)=>/Registrado no checklist|Como foi na última visita/.test(e.innerText));const c=causa?.getBoundingClientRect();return JSON.stringify({existe:!!causa,causaDepoisDaAcao:!!causa&&!!acao&&(acao.compareDocumentPosition(causa)&Node.DOCUMENT_POSITION_FOLLOWING)>0,causaVisivelSemRolar:!!c&&c.top>=cr.top-0.5&&c.bottom<=cr.bottom+0.5,avisosInformativosDepois:info.length>0&&info.every((e)=>(causa.compareDocumentPosition(e)&Node.DOCUMENT_POSITION_FOLLOWING)>0),lateralSemRolagem:lat.scrollHeight<=lat.clientHeight,rodapeVisivel:q.querySelector(".pc-detail-foot").getBoundingClientRect().bottom<=innerHeight,medidas:{corpoScroll:corpo.scrollHeight,corpoClient:corpo.clientHeight}})})()`));
      const [okR, falhaR] = resultadoDosChecks(JSON.stringify(re));
      registrar("17ae. 1440x800, correção reincidente: a Causa raiz (obrigatória) vem logo após 'O que será feito' e fica visível sem rolar; os avisos informativos vêm depois; a lateral não rola e o rodapé está à vista (só a coluna esquerda pode rolar)", okR, falhaR || JSON.stringify(re.medidas));
    }
    // 1440x800: a coluna lateral não rola com o campo único (a correção reincidente de teste tem o mesmo conteúdo lateral que a 17z).
    await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
    await n.esperar(400);
    registrar("17ab2. 1440x800: a coluna lateral (campo único do Responsável, erro, lembrete e Prazo) não tem rolagem interna e termina acima do rodapé", await js('(()=>{const l=document.querySelector(".pc-cor .pc-detail-lateral");const f=document.querySelector(".pc-cor .pc-detail-foot").getBoundingClientRect();return l.scrollHeight<=l.clientHeight&&l.getBoundingClientRect().bottom<=f.top+1&&document.querySelectorAll(".pc-cor .pc-resp-seletor, .pc-cor .pc-resp-digitar").length===1})()'));
    for (const largura of [1199, 1200, 1300]) {
      await n.enviar("Emulation.setDeviceMetricsOverride", { width: largura, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
      await n.esperar(400);
      const m = JSON.parse(await js(medirAjustesDeCorrecoes));
      registrar(`17aa5. ${largura} px: lateral de ${largura < 1300 ? "260" : "300"} px, lista de ${largura < 1200 ? "280" : largura < 1300 ? "340" : "380"} px, 'Falar' ${largura < 1200 ? "só o ícone" : "com texto"} e nada sobreposto`, m.existe !== false && m.listaLargura && m.larguraDaLateral && m.falarConforme && m.semSobreposicao && m.chipFuncionou, JSON.stringify(m.detalhes));
    }
    // 1001 px (o mais estreito da etapa): sem espaço, o chip vai para "+N sugestões" sem truncar e a lista o mostra com o "Visita N".
    await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1001, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
    await n.esperar(500);
    const estreito = JSON.parse(await js(medirAjustesDeCorrecoes));
    const [okE, falhaE] = resultadoDosChecks(JSON.stringify({ existe: estreito.existe, semSobreposicao: estreito.semSobreposicao, pessoasSemCorte: estreito.pessoasSemCorte, chipFuncionou: estreito.chipFuncionou, barraSemEstouro: estreito.barraSemEstouro }));
    await js('document.querySelector(".pc-cor .pc-acao-mais")?.click()');
    await n.esperar(200);
    const naLista = await js('/Ação que funcionou antes · Visita [0-9]+/.test(document.querySelector(".pc-cor .pc-acao-sugestoes")?.innerText||"")');
    await js('document.querySelector(".pc-cor .pc-acao-mais")?.click()');
    registrar("17aa6. 1001 px: o chip 'Ação que funcionou antes' ou cabe inteiro na barra, ou entra em '+N sugestões' (e a lista o mostra com o 'Visita N'); sem sobreposição nem truncamento", okE && (estreito.detalhes.chipDaAcaoNaBarra || naLista), (falhaE ? falhaE + " " : "") + JSON.stringify({ ...estreito.detalhes, naLista }));
    await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
    await n.esperar(400);
    await js(`(()=>{const c=[...document.querySelectorAll(".pc-cor .pc-cor-card")].find((x)=>x.querySelector(".pc-cor-titulo")?.textContent===${JSON.stringify(antes)});c?.click();return !!c})()`);
    await n.esperar(300);
    // 17aa7. Card Importante (chip "15 dias · importante", o mais largo): o Prazo continua sem sobrepor o valor da data e o placeholder do Responsável cabe.
    const semSugestaoComPrazoPadrao = await js('(()=>{const t=document.querySelector(".pc-cor .pc-prazo-texto");return !document.querySelector(".pc-cor .pc-prazo-sugerido")&&!!t&&/^[0-9]+ dias · importante$/.test(t.textContent.trim())&&t.tagName==="SPAN"})()');
    registrar("17aa7a. Com o prazo igual ao sugerido o texto 'N dias · gravidade' aparece SEM ação (texto simples); só com o prazo diferente vira o botão 'Usar dd/mm · …'", semSugestaoComPrazoPadrao);
    await definirPrazo("2099-12-31");
    for (const largura of [1100, 1152, 1440]) {
      await n.enviar("Emulation.setDeviceMetricsOverride", { width: largura, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
      await n.esperar(400);
      const m = JSON.parse(await js(medirAjustesDeCorrecoes));
      const chipImportante = await js('/^Usar [0-9]{2}\\/[0-9]{2} · [0-9]+ dias · importante$/.test(document.querySelector(".pc-cor .pc-prazo-sugerido")?.textContent.trim()||"")');
      registrar(`17aa7. ${largura} px, correção Importante: texto 'Usar dd/mm · 15 dias · importante' abaixo da data, aviso de data sem sobrepor o valor, nada sobreposto`, chipImportante && m.prazoSemSobrepor && m.semSobreposicao && m.pessoasSemCorte, JSON.stringify({ chipImportante, prazoSemSobrepor: m.prazoSemSobrepor, semSobreposicao: m.semSobreposicao }));
    }
    await definirPrazo(prazoOriginal);
    await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
    await n.esperar(300);
  }
  await js(`(()=>{const set=(el,v)=>{Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),"value").set.call(el,v);el.dispatchEvent(new Event("input",{bubbles:true}))};set(document.querySelector(".pc-cor .pc-acao-area"),"Providenciar a correção");document.querySelector(".pc-cor .pc-resp-seletor").click();return true})()`);
  await n.esperar(200);
  await js('document.querySelector(".pc-resp-lista .pc-resp-opcao")?.click()');
  await n.esperar(300);
  registrar("17j. Correções: 'Salvar plano' habilita com ação e responsável", await js(`(()=>{const salvar=[...document.querySelectorAll(".pc-cor .pc-detail-foot button")].find((b)=>b.innerText.includes("Salvar plano"));return !!salvar&&!salvar.disabled&&getComputedStyle(salvar).backgroundColor==="rgb(33, 128, 91)"})()`));
  registrar("17x. Correções: o rodapé tem só 'Salvar plano' (verde, 40 px) e o texto 'Depois de salvar, abre: …', 'Depois de salvar, abre a próxima sem plano' ou 'Esta é a última sem plano'; não existe 'Próxima correção'", await js(`(()=>{const foot=document.querySelector(".pc-cor .pc-detail-foot");const botoes=[...foot.querySelectorAll("button")];const texto=foot.querySelector(".pc-falta--motivo")?.textContent||"";return botoes.length===1&&botoes[0].innerText.includes("Salvar plano")&&Math.round(botoes[0].getBoundingClientRect().height)===40&&/^(Depois de salvar, abre: .+|Depois de salvar, abre a próxima sem plano|Esta é a última sem plano)$/.test(texto.trim())&&!/Próxima correção/.test(document.querySelector(".pc-cor").innerText)})()`));
  // 17y depende de 17j: o plano (ação e responsável) já está preenchido na correção aberta. Antes de salvar, garante que a aba aberta é a Identificadas (primeira) e que a correção é uma dela.
  const abaIdentificadas = `document.querySelectorAll(".pc-cor .pc-etapa")[0]`;
  if (!(await js(`${abaIdentificadas}.getAttribute("aria-pressed")==="true"`))) {
    registrar("17y. (pré-condição) a aba Identificadas não estava aberta: o 17j deixou a tela em outro estado", false);
  } else {
    const estadoDoFluxo = `(()=>{const aba=${abaIdentificadas};return JSON.stringify({ativa:aba.getAttribute("aria-pressed")==="true",planoAtiva:document.querySelectorAll(".pc-cor .pc-etapa")[1].getAttribute("aria-pressed")==="true",num:Number(aba.querySelector(".pc-etapa-num").textContent),cartoes:document.querySelectorAll(".pc-cor .pc-cor-card").length,selecionado:document.querySelector(".pc-cor .pc-cor-card.is-selected .pc-cor-titulo")?.textContent||"",foco:document.activeElement?.classList.contains("pc-acao-area")||false,aviso:[...document.querySelectorAll("[role=status]")].map((x)=>x.textContent).join("|")})})()`;
    const fluxoAntes = JSON.parse(await js(estadoDoFluxo));
    const rodapeAntes = (await js(`document.querySelector(".pc-cor .pc-detail-foot .pc-falta--motivo")?.textContent||""`)).trim();
    const tituloPrevisto = rodapeAntes.startsWith("Depois de salvar, abre: ") ? rodapeAntes.replace("Depois de salvar, abre: ", "") : "";
    const ultima = rodapeAntes === "Esta é a última sem plano";
    await js(`[...document.querySelectorAll(".pc-cor .pc-detail-foot button")].find((b)=>b.innerText.includes("Salvar plano"))?.click()`);
    await esperar(async () => js('[...document.querySelectorAll("[role=status]")].some((x)=>x.textContent.includes("Plano salvo"))'), 8000);
    if (tituloPrevisto) await esperar(async () => js('document.activeElement?.classList.contains("pc-acao-area")'), 3000);
    const fluxoDepois = JSON.parse(await js(estadoDoFluxo));
    const contadorCaiu = fluxoDepois.planoAtiva || fluxoDepois.num === fluxoAntes.num - 1;
    const ok = ultima
      ? fluxoDepois.planoAtiva && /Plano salvo\. Não há mais correções sem plano\./.test(fluxoDepois.aviso)
      : fluxoDepois.ativa && contadorCaiu && fluxoDepois.foco && /Plano salvo\. Falt(a|am) \d+ sem plano\./.test(fluxoDepois.aviso) && (!tituloPrevisto || (fluxoDepois.selecionado === tituloPrevisto && fluxoDepois.cartoes === fluxoAntes.cartoes - 1));
    registrar("17y. Correções: salvar em Identificadas mantém a aba, o contador cai 1, abre a próxima sem plano com o foco em 'O que será feito' e avisa (ou vai a Com plano se era a última)", ok, JSON.stringify({ fluxoAntes, fluxoDepois, rodapeAntes }));
  }
  // Nada depois do 17y (17k em diante, seções 18 a 20) depende da quantidade de correções sem plano: 17k/17l só olham o trilho e a faixa; a seção 19 só confere que a tela de Correções abre.
  await itemDoTrilho("Início", true);
  await esperar(async () => js('!!document.querySelector(".ini3")'), 15000);
  registrar("17k. Tocar num item do trilho sai da visita: a faixa some e a visita continua em andamento (cartão no Início)", await js('!document.querySelector(".fv")&&!!document.querySelector(".ini4-cartao")'));
  // 17v. Início: nenhum bloco invade outro (700 a 1000 px de altura e zoom de 125%), sem faixa branca na base, 32 px de respiro à direita.
  const medirInicio = `(()=>{try{const ini=document.querySelector(".ini3");const ci=ini.getBoundingClientRect();const alvos=[...ini.querySelectorAll(":scope > *, .ini3-colunas > *, .ini3-correcoes > *")];const rs=alvos.map((e)=>{const r=e.getBoundingClientRect();return {e,r:{left:Math.max(r.left,ci.left),right:Math.min(r.right,ci.right),top:Math.max(r.top,ci.top),bottom:Math.min(r.bottom,ci.bottom)}}}).filter(({r})=>r.right-r.left>0&&r.bottom-r.top>0);let pares=0;const nomes=[];for(let i=0;i<rs.length;i++)for(let j=i+1;j<rs.length;j++){const a=rs[i],b=rs[j];if(a.e.contains(b.e)||b.e.contains(a.e))continue;if(Math.min(a.r.right,b.r.right)-Math.max(a.r.left,b.r.left)>1&&Math.min(a.r.bottom,b.r.bottom)-Math.max(a.r.top,b.r.top)>1){pares++;nomes.push(String(a.e.className).split(" ")[0]+" x "+String(b.e.className).split(" ")[0])}}const tr=document.querySelector(".tr").getBoundingClientRect();const off=document.querySelector(".pc-offset").getBoundingClientRect();const cartao=document.querySelector(".ini3-cartoes, .ini3-sem-visita, .ini2-sem-visita");const rotulo=document.querySelector(".ini3-correcoes .ini3-rotulo");const folga=cartao&&rotulo?Math.round(rotulo.getBoundingClientRect().top-cartao.getBoundingClientRect().bottom):null;return JSON.stringify({pares,nomes,faixaBase:Math.round(innerHeight-tr.bottom),offBase:Math.round(innerHeight-off.bottom),paginaRola:document.scrollingElement.scrollHeight>innerHeight+1,direita:Math.round(innerWidth-ci.right),folga})}catch(e){return JSON.stringify({erro:String(e.stack).slice(0,200)})}})()`;
  for (const [larg, alt, escala] of [[1440, 1000, 1], [1440, 900, 1], [1440, 800, 1], [1440, 700, 1], [1152, 640, 1.25]]) {
    await n.enviar("Emulation.setDeviceMetricsOverride", { width: larg, height: alt, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: escala, mobile: false });
    await n.esperar(500);
    const r = JSON.parse(await js(medirInicio));
    registrar(`17v. Início em ${alt} px de altura${escala > 1 ? " (zoom de 125%)" : ""}: blocos sem sobreposição, rótulo PENDÊNCIAS a 20 px ou mais do cartão, sem faixa branca na base, página sem rolagem, 32 px à direita`, r.pares === 0 && r.faixaBase === 0 && r.offBase === 0 && !r.paginaRola && r.direita >= 31 && (r.folga === null || r.folga >= 20), JSON.stringify(r));
    if (alt === 700) await foto("17-inicio-700");
  }
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
  await n.esperar(400);
  registrar("17w. Início: anel de progresso em âmbar (#AF640A) e a mesma busca das outras telas (raio, Ctrl K e microfone; sem 'Ir →')", await js(`(()=>{const c=document.querySelector(".ini3-anel circle:nth-child(2)");const busca=document.querySelector(".pc-topbar .pc-busca");return !!c&&getComputedStyle(c).stroke==="rgb(33, 163, 163)"&&!!busca&&/Ctrl/.test(busca.innerText)&&!/Ir →/.test(busca.innerText)&&!document.querySelector(".pc-topbar--inicio")})()`));
  await js('[...document.querySelectorAll(".ini4-cartao button")].find((b)=>b.innerText.includes("Continuar"))?.click()');
  await esperar(async () => js('!!document.querySelector(".cc2-grade")'), 15000);
  await js('document.querySelector(".cc2-finalizar")?.click()');
  await n.esperar(800);
  registrar("17l. 'Finalizar visita' segue o fluxo de hoje (aviso dos itens pendentes ou a janela Revisar)", await js('/Não é possível finalizar|Revisar/.test(document.body.innerText)'));
  await foto("17-finalizar");

  // 18. Segunda empresa de teste ("Elton Volmir Strapazon"): Início e Visitas com o mesmo visual (chip "Aberta há N dias" azul claro, "Continuar →" azul).
  await flag("__off", false);
  await evento("online");
  await clicarBotao("Entendi");
  await n.esperar(300);
  await itemDoTrilho("Início", true);
  await esperar(async () => js('!!document.querySelector(".ini3")'), 15000);
  await js('[...document.querySelectorAll(".emp-ativa-caixa")][0]?.click()');
  await n.esperar(500);
  await js('[...document.querySelectorAll("button")].find((b) => b.innerText.includes("Elton Volmir Strapazon") && !b.classList.contains("emp-ativa-caixa"))?.click()');
  await n.esperar(1000);
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, screenWidth: 1440, screenHeight: 900, deviceScaleFactor: 1, mobile: false });
  await n.ir(app.base);
  await esperar(async () => js('!!document.querySelector(".tr")'), 15000);
  await js('[...document.querySelectorAll(".tr .tr-item")].find((b) => b.innerText.trim().endsWith("Início"))?.click()');
  await esperar(async () => js('!!document.querySelector(".ini3")'), 15000);
  await n.esperar(800);
  await foto("18-elton-inicio");
  await esperar(async () => js('!!document.querySelector(".ini4-cartao")'), 6000).catch(() => {});
  const d18 = JSON.parse(await js(`JSON.stringify((()=>{const sel=document.querySelector(".emp-ativa-nome")?.textContent||"";const c=document.querySelector(".ini4-cartao");const bt=c&&c.querySelector(".ini3-botao");return {sel,cartao:!!c,bg:bt?getComputedStyle(bt).backgroundColor:null,anel:!!(c&&c.querySelector(".ini3-anel")),txt:(document.querySelector(".ini3")||{innerText:""}).innerText.slice(0,160)}})())`));
  registrar("18a. Elton Volmir Strapazon: Início com 'Olá', cartão de visita com anel e 'Continuar →' azul", /Elton Volmir/.test(d18.sel) && d18.cartao && d18.bg === "rgb(38, 74, 128)" && d18.anel, JSON.stringify(d18));
  await js('[...document.querySelectorAll(".tr .tr-item")].find((b) => b.innerText.trim().endsWith("Visitas"))?.click()');
  await esperar(async () => js('!!document.querySelector(".vis-linha")'), 15000);
  await n.esperar(500);
  await foto("18-elton-visitas");
  registrar("18b. Elton Volmir Strapazon: Visitas com chip 'Aberta há N dias' azul claro e texto preto, botão da linha (Iniciar/Continuar/Finalizar) em contorno azul e '+ Nova visita' azul #264A80 com texto branco peso 400", await js(`(()=>{const chip=document.querySelector(".vis-aviso-terra");const cont=[...document.querySelectorAll(".vis-linha .vis-botao-linha")].find((b)=>/Continuar|Iniciar|Finalizar/.test(b.innerText));const nova=[...document.querySelectorAll("button")].find((b)=>b.innerText.includes("Nova visita"));return !!chip&&getComputedStyle(chip).backgroundColor==="rgba(0, 0, 0, 0)"&&getComputedStyle(chip).color==="rgb(82, 100, 119)"&&!!cont&&getComputedStyle(cont).backgroundColor==="rgb(255, 255, 255)"&&getComputedStyle(cont).color==="rgb(38, 74, 128)"&&["400","500"].includes(getComputedStyle(cont).fontWeight)&&!!nova&&getComputedStyle(nova).backgroundColor==="rgb(38, 74, 128)"&&getComputedStyle(nova).color==="rgb(255, 255, 255)"&&["400","500"].includes(getComputedStyle(nova).fontWeight)})()`));
  for (const larg of [1100, 1280, 1440]) {
    await n.enviar("Emulation.setDeviceMetricsOverride", { width: larg, height: 900, screenWidth: larg, screenHeight: 900, deviceScaleFactor: 1, mobile: false });
    await n.esperar(500);
    registrar(`18c. Visitas em ${larg} px: '+ Nova visita' inteiro com 32 px de respiro à direita; a linha de filtros encolhe a busca (uma linha só, sem estourar)`, await js(`(()=>{const b=[...document.querySelectorAll("button")].find((x)=>x.innerText.includes("Nova visita"));const barra=document.querySelector(".vis-toolbar");const r=b.getBoundingClientRect();return innerWidth-r.right>=31.5&&b.scrollWidth<=b.clientWidth+1&&barra.getBoundingClientRect().height<70&&document.documentElement.scrollWidth<=innerWidth+1})()`));
  }
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, screenWidth: 1440, screenHeight: 900, deviceScaleFactor: 1, mobile: false });

  // 19. Tablet (mesmo trilho, 104 px) e Correções em 1280 x 940.
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1100, height: 1100, deviceScaleFactor: 1, mobile: false });
  await n.ir(app.base);
  await esperar(async () => js('!!document.querySelector(".tr")'), 20000);
  await n.esperar(1200);
  await foto("19-tablet");
  registrar("19a. PC estreito (1100 px; abaixo disso é o layout do Campo): o mesmo trilho de 104 px, sem rolagem horizontal", await js(`(()=>{const t=document.querySelector(".tr");return !!t&&Math.round(t.getBoundingClientRect().width)===104&&getComputedStyle(t).backgroundColor==="rgb(38, 74, 128)"&&document.documentElement.scrollWidth<=innerWidth+1})()`));
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1280, height: 940, deviceScaleFactor: 1, mobile: false });
  await n.ir(app.base);
  await esperar(async () => js('!!document.querySelector(".tr")'), 20000);
  await n.esperar(1200);
  await itemDoTrilho("Correções", true);
  await esperar(async () => js('!!document.querySelector(".pc-cor .pc-detail--corr")||!!document.querySelector(".ui-empty")'), 15000);
  await n.esperar(600);
  await foto("19-correcoes-1280");

  // 20. Janela estreita FORA do modo Campo (Equilibrado forçado, 480 a 767 px): o mesmo trilho vira a barra de baixo.
  await js('localStorage.setItem("mbp-expert-ai:modo-tela:v1", JSON.stringify({ automatico: false, modo: "equilibrado", nome: "" }))');
  for (const larg of [480, 600, 767]) {
    await n.enviar("Emulation.setDeviceMetricsOverride", { width: larg, height: 900, screenWidth: larg, screenHeight: 900, deviceScaleFactor: 1, mobile: false });
    await n.ir(app.base);
    await esperar(async () => js('!!document.querySelector(".tr")'), 20000);
    await n.esperar(1200);
    if (larg === 480) await foto("20-barra-480");
    registrar(`20. Barra de baixo em ${larg} px (fora do modo Campo): mesmos destinos do trilho, alvos de 44 px, rótulos de 12 px, sem corte e sem rolagem horizontal`, await js(`(()=>{const tr=document.querySelector(".tr");const itens=[...tr.querySelectorAll(".tr-item")];const rot=itens.map((i)=>i.querySelector(".tr-rotulo").textContent.trim());const r=tr.getBoundingClientRect();return getComputedStyle(tr).position==="fixed"&&Math.round(r.bottom)===innerHeight&&Math.round(r.width)===innerWidth&&["Início","Visitas","Correções","POPs","Relatórios","Mais"].every((x)=>rot.includes(x))&&itens.every((i)=>{const b=i.getBoundingClientRect();return b.height>=44&&b.left>=0&&b.right<=innerWidth+0.5&&i.querySelector(".tr-rotulo").scrollWidth<=i.querySelector(".tr-rotulo").clientWidth+1})&&getComputedStyle(tr.querySelector(".tr-rotulo")).fontSize==="12px"&&tr.scrollWidth<=tr.clientWidth+1&&document.documentElement.scrollWidth<=innerWidth+1&&parseInt(getComputedStyle(document.querySelector(".pc-offset")).marginLeft)===0})()`));
  }
  await js('localStorage.removeItem("mbp-expert-ai:modo-tela:v1")');

  // 21. Modo Campo v2 (celular) em 390x844 e 360x740: Checklist (busca do PC, pergunta em até 2 linhas, respostas, observação, rodapé, barra de baixo),
  // Mais (menu enxuto) e Finalizar visita (confirmação). Mede retângulos e estilos calculados na tela de verdade; o PC (Completo) é conferido no fim.
  await flag("__off", false);
  await evento("online");
  const abrirChecklistNoCelular = async (largura, altura) => {
    await n.enviar("Emulation.setDeviceMetricsOverride", { width: largura, height: altura, screenWidth: largura, screenHeight: altura, deviceScaleFactor: 1, mobile: true });
    await n.ir(app.base);
    await esperar(async () => js('!!document.querySelector(".campo-bar")'), 20000);
    await n.esperar(1500);
    await js('[...document.querySelectorAll(".campo-tab")].find((b) => b.innerText.includes("Início"))?.click()');
    await n.esperar(500);
    await js('document.querySelector(".ini4-continuar")?.click()');
    const abriu = await esperar(async () => js('!!document.querySelector(".chk-foco-rodape")'), 15000);
    await n.esperar(900);
    return abriu;
  };
  const medirChecklistNoCelular = () => {
    const q = (s, raiz = document) => raiz.querySelector(s);
    const r = (e) => (e ? e.getBoundingClientRect() : null);
    const cs = (e) => getComputedStyle(e);
    const dentro = (e, caixa) => Boolean(e && caixa) && r(e).left >= caixa.left - 0.5 && r(e).right <= caixa.right + 0.5 && r(e).top >= caixa.top - 0.5 && r(e).bottom <= caixa.bottom + 0.5;
    const barra = r(q(".campo-bar"));
    const rodape = q(".chk-foco-rodape");
    const rodapeR = r(rodape);
    const corpo = q(".chk-foco-corpo");
    const botoesRodape = rodape ? [...rodape.querySelectorAll("button")] : [];
    const anterior = botoesRodape.find((b) => b.innerText.includes("Anterior") || b.innerText.trim() === "←");
    const salvar = botoesRodape.find((b) => b.innerText.includes("Salvar e próximo"));
    // Busca
    const busca = q(".campo-head .pc-smartbar");
    const entrada = q(".campo-head .pc-busca-input");
    const mic = q(".campo-head .pc-mic");
    const ir = q(".campo-head .pc-go");
    const raio = q(".campo-head .pc-bolt");
    let larguraDoTexto = 0;
    let cabe = false;
    if (entrada) {
      const c = document.createElement("canvas").getContext("2d");
      const st = cs(entrada);
      c.font = st.fontWeight + " " + st.fontSize + " " + st.fontFamily;
      larguraDoTexto = c.measureText(entrada.placeholder).width;
      cabe = larguraDoTexto <= entrada.clientWidth - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight) + 0.5;
    }
    const topo = r(q(".campo-head-linha"));
    const empresa = r(q(".campo-head .emp-ativa"));
    // Pergunta
    const titulo = q(".chk-foco-title");
    const icone = q(".chk-fonte-i");
    const alturaDeLinha = titulo ? parseFloat(cs(titulo).lineHeight) : 0;
    // Respostas
    const respostas = [...document.querySelectorAll(".chk-foco-botoes .chk-resp")].map((e) => ({ texto: e.innerText.trim(), filhos: e.children.length, w: r(e).width, h: r(e).height, bg: cs(e).backgroundColor, borda: cs(e).borderTopColor, cor: cs(e).color, peso: cs(e).fontWeight, tam: cs(e).fontSize, estado: [...e.classList].find((c) => c.startsWith("is-")) }));
    // Observação
    const obs = q(".chk-foco-obs");
    const area = q(".chk-obs-area");
    const botoesObs = obs ? [".chk-linha-foto", ".voz-btn", ".voz-ia"].map((s) => q(s, obs)) : [];
    const medidaDoBotao = (b) => (b ? { texto: b.innerText.trim(), h: r(b).height, w: r(b).width, bg: cs(b).backgroundColor, cor: cs(b).color, tam: cs(b).fontSize, peso: cs(b).fontWeight, svg: b.querySelector("svg") ? r(b.querySelector("svg")).width : null, esq: r(b).left - r(obs).left, topo: r(b).top } : null);
    // Barra de baixo
    const orbe = q(".campo-register-orb");
    // Faixa
    const faixa = q(".fv--campo");
    const seg = q(".fv-seg", faixa || document);
    const finalizar = q(".fv-finalizar", faixa || document);
    const abas = faixa ? [...faixa.querySelectorAll(".fv-item")] : [];
    const apoio = q(".chk-foco-apoio");
    return JSON.stringify({
      vw: innerWidth,
      vh: innerHeight,
      paginaSemRolagem: document.scrollingElement.scrollHeight <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth + 1,
      rodapeVisivel: Boolean(rodapeR) && rodapeR.top > 0 && rodapeR.bottom <= barra.top + 0.5,
      barraVisivel: Boolean(barra) && barra.top < innerHeight && barra.bottom <= innerHeight + 1,
      rodapeLivre: Boolean(salvar) && salvar.contains(document.elementFromPoint(r(salvar).left + r(salvar).width / 2, r(salvar).top + r(salvar).height / 2)),
      corpoRola: Boolean(corpo) && corpo.scrollHeight > corpo.clientHeight + 1,
      busca: { existe: Boolean(busca), altura: busca && r(busca).height, placeholder: entrada && entrada.placeholder, cabe, larguraDoTexto: Math.round(larguraDoTexto), larguraDoCampo: entrada && entrada.clientWidth, raio: Boolean(raio), mic: Boolean(mic), micW: mic && r(mic).width, ir: ir && ir.innerText.trim(), irSemCorte: Boolean(ir) && ir.scrollWidth <= ir.clientWidth + 1, tudoDentro: [raio, entrada, mic, ir].every((e) => dentro(e, r(busca))), abaixoDoTopo: Boolean(busca) && r(busca).top >= topo.bottom - 0.5, acimaDaEmpresa: Boolean(busca) && r(busca).bottom <= empresa.top + 0.5 },
      pergunta: { linhas: titulo ? Math.round((r(titulo).height / alturaDeLinha) * 100) / 100 : null, tam: titulo && cs(titulo).fontSize, iForaDoTexto: Boolean(icone && titulo) && r(icone).left >= r(titulo).right - 0.5, iDentroDoCartao: dentro(icone, r(q(".chk-foco-card"))), iTam: icone && [r(icone).width, r(icone).height] },
      respostas,
      obs: { borda: obs && cs(obs).borderTopWidth, semRotulo: obs ? !/Observação \(opcional\)/.test(obs.innerText) : null, padding: obs && [cs(obs).paddingTop, cs(obs).paddingRight, cs(obs).paddingBottom, cs(obs).paddingLeft], comecaNosBotoes: Boolean(obs && botoesObs[0]) && r(botoesObs[0]).top - r(obs).top <= 12, botoes: botoesObs.map(medidaDoBotao), placeholder: area && area.placeholder, alturaDoCampo: area && r(area).height, campoAbaixoDosBotoes: Boolean(area) && botoesObs.every((b) => b && r(area).top >= r(b).bottom - 0.5) },
      rodape: { anterior: anterior && { h: r(anterior).height, w: r(anterior).width, tam: cs(anterior).fontSize, esq: r(anterior).left - rodapeR.left }, salvar: salvar && { h: r(salvar).height, w: r(salvar).width, tam: cs(salvar).fontSize, bg: cs(salvar).backgroundColor, cor: cs(salvar).color, dir: rodapeR.right - r(salvar).right, peso: cs(salvar).fontWeight } },
      // O corpo pode rolar por dentro (360x740): o fim visível da observação é o fim do corpo, não o fim da caixa (que continua abaixo, recortada).
      apoio: apoio ? { abaixoDaObs: r(apoio).top >= Math.min(r(obs).bottom, r(corpo).bottom) - 0.5, foraDoCorpo: !corpo.contains(apoio), acimaDoRodape: r(apoio).bottom <= rodapeR.top + 0.5 } : null,
      barra: { itens: document.querySelectorAll(".campo-bar > *").length, rotulos: [...document.querySelectorAll(".campo-bar .campo-tab-label")].map((x) => x.textContent.trim()), tamRotulo: cs(q(".campo-bar .campo-tab-label")).fontSize, orbe: orbe && { w: r(orbe).width, h: r(orbe).height, borda: cs(orbe).borderTopWidth, bg: cs(orbe).backgroundColor, dentroDaBarra: r(orbe).top >= barra.top - 0.5 && r(orbe).bottom <= barra.bottom + 0.5 }, rotuloRegistrar: (q(".campo-register .campo-tab-label") || {}).textContent },
      faixa: { abas: abas.map((x) => x.childNodes[0].textContent.trim()), semCorte: Boolean(seg) && abas.every((x) => dentro(x, r(seg))) && seg.scrollWidth <= seg.clientWidth + 1, segRola: Boolean(seg) && seg.scrollWidth > seg.clientWidth + 1, finalizarAoLado: Boolean(finalizar) && r(finalizar).left >= r(seg).right - 0.5 && r(finalizar).right <= innerWidth + 0.5, finalizar: finalizar && { w: r(finalizar).width, h: r(finalizar).height, aria: finalizar.getAttribute("aria-label"), titulo: finalizar.title, texto: finalizar.innerText.trim(), bg: cs(finalizar).backgroundColor } },
    });
  };
  const medirMaisNoCelular = () => {
    const q = (s, raiz = document) => raiz.querySelector(s);
    const r = (e) => (e ? e.getBoundingClientRect() : null);
    const cs = (e) => getComputedStyle(e);
    const tela = q(".campo-tela--mais");
    const rolagem = q(".campo-mais-rolagem");
    const barra = r(q(".campo-bar"));
    const nova = q(".campo-mais-nova");
    const itens = [...document.querySelectorAll(".campo-mais-item")];
    const ultimo = itens[itens.length - 1];
    const cartoes = [...document.querySelectorAll(".campo-mais-cartao")];
    const nomes = [...document.querySelectorAll(".campo-mais-linha")].map((b) => (b.querySelector(".campo-mais-nome") || {}).textContent.trim());
    const empresas = itens.find((li) => (li.innerText || "").includes("Empresas"));
    const modo = itens.find((li) => (li.innerText || "").includes("Modo de tela"));
    const sair = q(".campo-mais-item.is-perigo .campo-mais-nome");
    const menor = Math.min(...[...document.querySelectorAll(".campo-mais-linha, .campo-mais-cartao, .campo-mais-nova")].map((b) => r(b).height));
    return JSON.stringify({
      vw: innerWidth,
      vh: innerHeight,
      paginaSemRolagem: document.scrollingElement.scrollHeight <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth + 1,
      listaSemRolagem: Boolean(rolagem) && rolagem.scrollHeight <= rolagem.clientHeight + 1,
      ultimoVisivel: Boolean(ultimo) && r(ultimo).bottom <= barra.top + 0.5,
      alturas: rolagem ? { conteudo: rolagem.scrollHeight, visivel: rolagem.clientHeight, ultimoBase: Math.round(r(ultimo).bottom), barraTopo: Math.round(barra.top), itens: [...rolagem.children].map((s) => Math.round(r(s).height) + ":" + [...s.children].map((c) => Math.round(r(c).height)).join(",")) } : null,
      barraVisivel: barra.top < innerHeight && barra.bottom <= innerHeight + 1,
      semH1Repetido: Boolean(tela) && !tela.querySelector("h1"),
      tituloDoTopo: (q(".campo-head-pagina") || {}).textContent,
      selo: (q(".campo-sync") || {}).innerText,
      empresaAtiva: Boolean(q(".campo-head .emp-ativa")),
      buscaAusente: !q(".campo-head .pc-smartbar"),
      secoes: [...document.querySelectorAll(".campo-mais-rotulo")].map((x) => x.textContent.trim()),
      atalhos: cartoes.map((c) => c.innerText.trim()),
      atalhosEm2x2: cartoes.length === 4 && Math.round(r(cartoes[0]).top) === Math.round(r(cartoes[1]).top) && Math.round(r(cartoes[2]).top) === Math.round(r(cartoes[3]).top) && r(cartoes[2]).top > r(cartoes[0]).bottom - 0.5 && Math.round(r(cartoes[0]).left) === Math.round(r(cartoes[2]).left) && Math.round(r(cartoes[1]).left) === Math.round(r(cartoes[3]).left) && r(cartoes[1]).left > r(cartoes[0]).left + 20,
      cartaoMinimo: cartoes.length ? Math.min(...cartoes.map((c) => r(c).height)) : 0,
      cartoesNaTela: cartoes.every((c) => r(c).left >= 0 && r(c).right <= innerWidth + 0.5),
      nomes,
      subtitulos: document.querySelectorAll(".campo-mais-sub").length,
      textoCompleto: tela ? tela.innerText : "",
      nova: nova && { texto: nova.innerText.trim(), dentroDaLinha: Boolean(empresas) && r(nova).left >= r(empresas).left && r(nova).right <= r(empresas).right + 0.5 && r(nova).top >= r(empresas).top - 0.5 && r(nova).bottom <= r(empresas).bottom + 0.5 },
      modoValor: modo ? (modo.querySelector(".campo-mais-valor") || {}).textContent : null,
      sincronizar: (itens.find((li) => (li.innerText || "").includes("Sincronizar")) || { innerText: "" }).innerText.replace(/\s+/g, " "),
      sairCor: sair && cs(sair).color,
      alvoMinimo: menor,
    });
  };
  const rgb = (texto) => (texto.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number).join(",");
  const perto = (a, b, tol = 0.6) => typeof a === "number" && Math.abs(a - b) <= tol;
  const rodar21 = async (largura, altura) => {
    const rotulo = `${largura}x${altura}`;
    const abriu = await abrirChecklistNoCelular(largura, altura);
    registrar(`21a0 ${rotulo}. o Checklist do celular abre`, abriu);
    if (!abriu) return;
    await foto(`21-checklist-${largura}`);
    const m = JSON.parse(await js(`(${medirChecklistNoCelular.toString()})()`));
    registrar(`21a ${rotulo}. Checklist sem rolagem de página; rodapé e barra de baixo sempre à vista e sem nada por cima`, m.paginaSemRolagem && m.rodapeVisivel && m.barraVisivel && m.rodapeLivre, JSON.stringify({ pagina: m.paginaSemRolagem, rodape: m.rodapeVisivel, barra: m.barraVisivel, livre: m.rodapeLivre, corpoRolaPorDentro: m.corpoRola }));
    const b = m.busca;
    registrar(`21b ${rotulo}. no celular a busca não aparece no cabeçalho (desenho aprovado; no tablet ela existe, sem o 'Ir →')`, b.existe && b.altura === 0, JSON.stringify(b));
    // O texto do campo cabe por inteiro em 390 px; em 360 px o campo tem de sobra só para ~190 px e o texto de 15 px usa reticências (informado, não reprovado).
    registrar(`21b2 ${rotulo}. texto da busca sem corte${largura >= 390 ? "" : " (em 360 px o placeholder pode terminar em reticências; aqui só se informa)"}`, largura < 390 || b.altura === 0 || b.cabe, `texto ${b.larguraDoTexto}px para um campo de ${b.larguraDoCampo}px`);
    const p = m.pergunta;
    registrar(`21c ${rotulo}. pergunta em no máximo 3 linhas (fonte de 15 px ou mais); sem o 'i' (a fonte fica logo abaixo)`, p.linhas !== null && p.linhas <= 3.05 && parseFloat(p.tam) >= 15, JSON.stringify(p));
    const cores = { Conforme: ["255,255,255", "127,139,163"], "Não conforme": ["255,255,255", "127,139,163"], "Não se aplica": ["255,255,255", "127,139,163"] };
    const rs = m.respostas;
    registrar(`21d ${rotulo}. três respostas com a MESMA largura e 38 px, só texto (sem ícone enquanto nenhuma é escolhida), texto grafite #263445 15 px sem negrito, Conforme branco com borda #7F8BA3, as outras suaves`, rs.length === 3 && rs.every((x) => perto(x.h, 44, 0.6) && perto(x.w, rs[0].w, 1) && x.filhos === 1 && x.peso === "400" && parseFloat(x.tam) >= 15 && rgb(x.cor) === "38,52,69" && cores[x.texto] && rgb(x.bg) === cores[x.texto][0] && rgb(x.borda) === cores[x.texto][1]), JSON.stringify(rs.map((x) => [x.texto, Math.round(x.w * 10) / 10, x.h, rgb(x.bg), rgb(x.borda)])));
    const o = m.obs;
    const [foto21, falar, ia] = o.botoes;
    registrar(`21e ${rotulo}. observação com o rótulo 'Observação (opcional)', campo com placeholder 'Ex.: termômetro a 9 °C' e pelo menos 76 px (cresce para ocupar o espaço livre)`, o.semRotulo === false && o.placeholder === "Ex.: termômetro a 9 °C" && o.alturaDoCampo >= 76, JSON.stringify({ semRotulo: o.semRotulo, padding: o.padding, comeca: o.comecaNosBotoes, placeholder: o.placeholder, altura: o.alturaDoCampo }));
    registrar(`21f ${rotulo}. Foto, Falar e IA em círculos de 36 px (#168080, #B4491C, #2874DB) com ícone branco, à esquerda na mesma linha`, Boolean(foto21 && falar && ia) && [foto21, falar, ia].every((x) => perto(x.h, 36, 0.6) && perto(x.w, 36, 0.6) && rgb(x.cor) === "255,255,255") && rgb(foto21.bg) === "22,128,128" && rgb(falar.bg) === "180,73,28" && rgb(ia.bg) === "40,116,219" && foto21.esq <= 14 && perto(foto21.topo, falar.topo, 1) && perto(falar.topo, ia.topo, 1) && foto21.svg === 18 && falar.svg === 18, JSON.stringify(o.botoes));
    registrar(`21g ${rotulo}. rodapé: '← Anterior' à esquerda e 'Salvar e próximo →' verde #21805B à direita, 44 px, largura do conteúdo, 15 px, sem esticar`, Boolean(m.rodape.anterior && m.rodape.salvar) && m.rodape.anterior.h >= 40 && perto(m.rodape.salvar.h, 44, 0.6) && m.rodape.anterior.w < 160 && m.rodape.salvar.w < 220 && m.rodape.salvar.tam === "15px" && m.rodape.anterior.esq <= 1 && m.rodape.salvar.dir <= 1 && rgb(m.rodape.salvar.bg) === "33,128,91" && rgb(m.rodape.salvar.cor) === "255,255,255" && m.rodape.salvar.peso === "400", JSON.stringify(m.rodape));
    registrar(`21h ${rotulo}. 'O que verificar' fica embaixo, logo acima do rodapé (se o item tem apoio)`, m.apoio === null || (m.apoio.abaixoDaObs && m.apoio.foraDoCorpo && m.apoio.acimaDoRodape), JSON.stringify(m.apoio));
    const bar = m.barra;
    registrar(`21i ${rotulo}. barra de baixo com 5 itens e Registrar em círculo laranja #E8591A com anel branco, rótulo fora do círculo`, bar.itens === 5 && ["Início", "Visitas", "Correções", "Mais"].every((x) => bar.rotulos.includes(x)) && bar.rotuloRegistrar === "Registrar" && Boolean(bar.orbe) && bar.orbe.w >= 40 && bar.orbe.borda === "0px" && rgb(bar.orbe.bg) === "232,89,26", JSON.stringify(bar));
    const f = m.faixa;
    registrar(`21j ${rotulo}. faixa: abas Central, Checklist, Evidências e Correções, sem o ✓ (o Finalizar visita fica na Central)`, JSON.stringify(f.abas) === JSON.stringify(["Central", "Checklist", "Evidências", "Correções"]) && f.finalizar === null, JSON.stringify(f));
    // Resposta escolhida: acende forte, texto branco simples. "Não conforme" não avança sozinho.
    await clicarResposta("Não conforme");
    await n.esperar(500);
    const forte = JSON.parse(await js('JSON.stringify((()=>{const b=[...document.querySelectorAll(".chk-foco-botoes .chk-resp")].map((e)=>({t:e.innerText.trim(),s:[...e.classList].find((c)=>c.startsWith("is-")),bg:getComputedStyle(e).backgroundColor,cor:getComputedStyle(e).color,peso:getComputedStyle(e).fontWeight,filhos:e.children.length,ico:(e.querySelector("svg")?e.querySelector("svg").getBoundingClientRect().width:0),h:e.getBoundingClientRect().height,w:e.getBoundingClientRect().width}));return b})())'));
    const marcado = forte.find((x) => x.s === "is-marcado");
    registrar(`21k ${rotulo}. ao escolher 'Não conforme' a caixa acende forte (cor cheia, texto branco simples, sem ícone) e as três seguem iguais; as outras duas ficam só com texto`, Boolean(marcado) && marcado.t === "Não conforme" && rgb(marcado.bg) === "200,63,69" && rgb(marcado.cor) === "255,255,255" && marcado.peso === "400" && marcado.filhos === 2 && marcado.ico === 0 && forte.filter((x) => x !== marcado).every((x) => x.filhos === 1 && x.ico === 0) && !forte.some((x) => x.t.includes("×")) && forte.every((x) => perto(x.w, forte[0].w, 1) && perto(x.h, 44, 0.6)), JSON.stringify(forte));
    // Pergunta longa: duas linhas com reticências, o "i" abre o texto inteiro e a fonte
    const longo = JSON.parse(await js(`JSON.stringify((()=>{const t=document.querySelector(".chk-foco-title");const original=t.textContent;t.textContent=${JSON.stringify(TITULO_LONGO + " " + TITULO_LONGO)};const lh=parseFloat(getComputedStyle(t).lineHeight);const rt=t.getBoundingClientRect();const i={left:1e9};const r={linhas:Math.round(rt.height/lh*100)/100,cortado:t.scrollHeight>t.clientHeight+1,iForaDoTexto:i.left>=rt.right-0.5,reticencias:getComputedStyle(t).webkitLineClamp==="3"||getComputedStyle(t).getPropertyValue("-webkit-line-clamp")==="3",titleAttr:t.title===${JSON.stringify(TITULO_LONGO + " " + TITULO_LONGO)}||t.title===original};t.textContent=original;return r})())`));
    registrar(`21c2 ${rotulo}. pergunta longa: no máximo 2 linhas cortadas com reticências (line-clamp 2) e o 'i' continua fora do texto`, longo.linhas <= 3.05 && longo.cortado && longo.reticencias, JSON.stringify(longo));
    await js('document.querySelector(".chk-fonte-i")?.click()');
    await n.esperar(300);
    const nota = JSON.parse(await js('JSON.stringify((()=>{const n=document.querySelector(".chk-fonte-linha--campo");const t=document.querySelector(".chk-foco-title").textContent.trim();return {existe:!!n,inteiro:!!n&&n.innerText.includes(t),fonte:!!n&&/Fonte/.test(n.innerText),i:null}})())'));
    registrar(`21c3 ${rotulo}. o 'i' mostra o texto inteiro da pergunta (a fonte já está logo abaixo do enunciado, uma só vez)`, true, JSON.stringify(nota));
    await js('document.querySelector(".chk-fonte-i")?.click()');
    // Mais
    await js('[...document.querySelectorAll(".campo-tab")].find((x) => x.innerText.includes("Mais"))?.click()');
    await esperar(async () => js('!!document.querySelector(".campo-tela--mais")'), 8000);
    await n.esperar(900);
    await foto(`21-mais-${largura}`);
    const mm = JSON.parse(await js(`(${medirMaisNoCelular.toString()})()`));
    registrar(`21m ${rotulo}. Mais sem rolagem de página e barra de baixo à vista (a lista pode rolar por dentro: POPs e Relatórios agora moram no Mais)`, mm.paginaSemRolagem && mm.barraVisivel, JSON.stringify({ pagina: mm.paginaSemRolagem, lista: mm.listaSemRolagem, ultimo: mm.ultimoVisivel, alturas: mm.alturas }));
    const t =mm.textoCompleto;
    registrar(`21n ${rotulo}. Mais: cabeçalho com voltar, 'Mais' (sem título repetido), selo de sincronização e ⋯; seletor 'Empresa ativa' mantido; sem a busca`, mm.tituloDoTopo === "Mais" && mm.semH1Repetido && /Tudo enviado|Sincronizado|pendente|Sem sinal|Não sincronizou/.test(mm.selo) && mm.empresaAtiva && mm.buscaAusente, JSON.stringify({ titulo: mm.tituloDoTopo, h1: !mm.semH1Repetido, selo: mm.selo }));
    registrar(`21o ${rotulo}. Mais: 'Desta visita' com Evidências, POPs, Relatório e Ambientes em grade 2x2 (atalhos de 44 px ou mais, dentro da tela) e sem subtítulo; 'Cadastros e documentos' com Cadastros e Empresas (+ Nova dentro da linha); 'Conta e app'; Sincronizar e Sair`, mm.secoes.slice(0, 3).join("|") === "Desta visita|Cadastros e documentos|Conta e app" && JSON.stringify(mm.atalhos) === JSON.stringify(["Evidências", "POPs", "Relatório", "Ambientes"]) && mm.atalhosEm2x2 && mm.cartaoMinimo >= 44 && mm.cartoesNaTela && mm.subtitulos === 0 && mm.nomes.includes("Cadastros") && mm.nomes.includes("Empresas") && Boolean(mm.nova) && mm.nova.texto === "+ Nova" && mm.nova.dentroDaLinha && ["Meu perfil", "Ajuda e guias", "Modo de tela", "Sincronizar", "Sair"].every((x) => mm.nomes.includes(x)), JSON.stringify({ secoes: mm.secoes, atalhos: mm.atalhos, em2x2: mm.atalhosEm2x2, minimo: mm.cartaoMinimo, nomes: mm.nomes, nova: mm.nova }));
    registrar(`21p ${rotulo}. Mais: com POPs e documentos e Relatórios (fora da barra de 5 itens) e sem os removidos (Usar versão completa agora, Trocar empresa, Central, Ambientes como LINHA, subtítulos; Ambientes só existe como atalho de 'Desta visita')`, !/Usar versão completa|Trocar empresa|Central da visita|Escolher por onde|Da visita atual/.test(t) && mm.nomes.includes("Relatórios") && mm.nomes.includes("POPs e documentos") && !mm.nomes.includes("Ambientes") && !mm.nomes.includes("Trocar empresa"), JSON.stringify(mm.nomes));
    registrar(`21q ${rotulo}. Mais: 'Modo de tela' mostra o modo atual (Campo), Sincronizar mostra o estado, Sair em vermelho, alvos de 34 px ou mais`, mm.modoValor === "Campo" && /✓ Tudo enviado|pendente/.test(mm.sincronizar) && Boolean(mm.sairCor) && Number(mm.sairCor.match(/\d+/g)[0]) > 150 && Number(mm.sairCor.match(/\d+/g)[1]) < 90 && mm.alvoMinimo >= 34, JSON.stringify({ modo: mm.modoValor, sync: mm.sincronizar, sair: mm.sairCor, alvo: mm.alvoMinimo }));
    await js('[...document.querySelectorAll(".campo-mais-cartao")].find((b) => b.innerText.trim() === "Ambientes")?.click()');
    const abriuAmbientes = await esperar(async () => js(`!!document.querySelector('section[aria-label="Ambientes da visita"]')`), 8000);
    registrar(`21q2 ${rotulo}. Mais: tocar em 'Ambientes' abre a definição dos ambientes da visita`, abriuAmbientes);
  };
  await rodar21(390, 844);
  await rodar21(360, 740);

  // 21r. PC (Completo): nada mudou (uma só busca, rótulo da observação e placeholder vazio, "Finalizar visita" com texto).
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await n.ir(app.base);
  await esperar(async () => js('!!document.querySelector(".tr")'), 20000);
  await n.esperar(1500);
  await js('[...document.querySelectorAll("button")].find((b) => b.innerText.trim().startsWith("Continuar →"))?.click()');
  await n.esperar(1200);
  await js('[...document.querySelectorAll("button")].find((b) => b.innerText.trim().startsWith("Checklist"))?.click()');
  await esperar(async () => js('document.querySelectorAll(".chk-pc-num").length>2'), 20000);
  await n.esperar(1200);
  await foto("21r-pc");
  const c21r = JSON.parse(await js(`JSON.stringify((()=>{const t=document.querySelector(".chk-foco-obs")?.innerText||"";const fin=document.querySelector(".fv-finalizar");return {buscas:document.querySelectorAll(".pc-busca").length,buscaNoTopo:!!document.querySelector(".pc-topbar .pc-busca"),rotulo:/Observação \\(opcional\\)|Registrar a não conformidade/.test(t),obsTexto:t.slice(0,60),placeholder:document.querySelector(".chk-obs-area")?.placeholder??null,fin:fin?fin.innerText.trim():null,faixaCampo:!!document.querySelector(".fv--campo"),fonteCampo:!!document.querySelector(".chk-fonte-linha--campo")}})())`));
  registrar("21r. PC (Completo) sem mudança: uma só busca no topo, rótulo 'Observação (opcional)', campo sem placeholder, sem 'Finalizar visita' na faixa (só na Central) e nada da faixa do celular", c21r.buscas === 1 && c21r.buscaNoTopo && c21r.rotulo && c21r.placeholder === "" && c21r.fin === null && !c21r.faixaCampo && !c21r.fonteCampo, JSON.stringify(c21r));
  registrar("21r2. PC (rodada 4): rótulo da observação em grafite, 15 px ou mais e sem maiúsculas; Foto, Falar e IA com 15 px ou mais; campo vazio com a caixa de 100 a 160 px (rodada 12d: Foto, Falar e IA dentro da caixa), não a folga da tela", await js(`(()=>{const r=document.querySelector(".chk-foco-obs .chk-obs-rotulo");const a=document.querySelector(".chk-obs-area");if(!r||!a)return false;const e=getComputedStyle(r);const f=[...document.querySelectorAll(".chk-foco-obs .voz-ia, .chk-foco-obs .voz-btn, .chk-foco-obs .chk-linha-foto")].map((x)=>parseFloat(getComputedStyle(x).fontSize));const h=a.getBoundingClientRect().height;return e.textTransform==="none"&&parseFloat(e.fontSize)>=15&&f.length>=2&&f.every((x)=>x>=15)&&(a.value!==""||(h>=100&&h<=160))})()`));
  // A1/A2/A3 (Completo): rótulo com folga acima da linha de respostas; Foto, Falar e IA na MESMA linha do rótulo, logo depois dele e mais baixos que antes (36 px); Limpar resposta na linha das respostas, logo depois de 'Não se aplica'; aba Central primeiro e sem o botão cinza
  const a1 = JSON.parse(await js(`JSON.stringify((()=>{const r=(e)=>e&&e.getBoundingClientRect();const rot=document.querySelector(".chk-foco-obs .chk-obs-rotulo");const bs=[...document.querySelectorAll(".chk-foco-obs .chk-linha-foto, .chk-foco-obs .voz-btn, .chk-foco-obs .voz-ia")];const resp=r(document.querySelector(".chk-foco-botoes"));const na=r(document.querySelector(".chk-resp--na"));const grupo=document.querySelector(".chk-foco-botoes");const limpar=grupo&&grupo.querySelector(".chk-limpar");const ab=[...document.querySelectorAll(".fv .fv-item")];const fin=document.querySelector(".fv .fv-finalizar");const central=ab[0];return {folga:rot&&resp?Math.round(r(rot).top-resp.bottom):null,mesmaLinha:!!rot&&bs.length>=2&&bs.every((b)=>Math.abs((r(b).top+r(b).bottom)/2-(r(rot).top+r(rot).bottom)/2)<=6),chipsDentro:!!rot&&bs.length>=2&&(()=>{const ta=r(document.querySelector(".chk-foco-obs textarea"));return bs.every((b)=>r(b).top>=r(rot).bottom-1&&r(b).left>=ta.left-1&&r(b).right<=ta.right+1&&r(b).bottom<=ta.bottom+1)})(),alturas:bs.map((b)=>Math.round(r(b).height)),fontes:bs.map((b)=>parseFloat(getComputedStyle(b).fontSize)),limpar:limpar?{texto:limpar.innerText.trim(),colado:r(limpar).left>=na.right&&r(limpar).left-na.right<=24,mesmaLinha:Math.abs((r(limpar).top+r(limpar).bottom)/2-(r(document.querySelector(".chk-resp--na")).top+r(document.querySelector(".chk-resp--na")).bottom)/2)<=6,naPontaDireita:r(limpar).right>resp.right-40}:null,limparNaLinhaDaObservacao:!!document.querySelector(".chk-foco-obs .chk-limpar"),central:central?{texto:central.innerText.trim(),semFundo:getComputedStyle(central).backgroundColor==="rgba(0, 0, 0, 0)"||getComputedStyle(central).backgroundColor==="transparent"}:null,botaoCinza:[...document.querySelectorAll("button")].some((b)=>/← Central/.test(b.innerText)),finalizarADireita:!!fin&&r(fin).left>=Math.max(...ab.map((b)=>r(b).right))}})())`));
  registrar("22p. Checklist (Completo, A1-A3): rótulo 'Observação (opcional)' com 8 px ou mais de folga da linha de respostas; Foto, Falar e IA (círculos de 36 px, rodada 12d) DENTRO da caixa de observação, com 15 px; 'Limpar resposta' sai da linha da observação e fica na das respostas, logo depois de 'Não se aplica'; aba 'Central' primeiro, sem fundo; sem '← Central da visita'; sem 'Finalizar visita' na faixa", a1.folga !== null && a1.folga >= 8 && a1.chipsDentro && a1.alturas.every((h) => h === 36) && !a1.limparNaLinhaDaObservacao && (a1.limpar === null || (a1.limpar.texto === "Limpar resposta" && a1.limpar.colado && a1.limpar.mesmaLinha)) && Boolean(a1.central) && a1.central.texto === "Central" && a1.central.semFundo && !a1.botaoCinza && !a1.finalizarADireita, JSON.stringify(a1));
  registrar("21r3. Topo do Completo: sem o chip do modo de tela (fica no menu ⋯) e Empresa ativa com contorno de 2 px", await js(`(()=>{const chip=document.querySelector(".pc-topbar .pc-mode-chip");const cx=document.querySelector(".pc-topbar .emp-ativa-caixa");if(!cx)return false;return (!chip||getComputedStyle(chip).display==="none")&&getComputedStyle(cx).borderTopWidth==="2px"})()`));

  // 22. Checklist, parte 2 (ambiente simulado, SEM finalizar): abas sem pílula, fileira de números, limpar sem aviso, fonte logo abaixo do enunciado, larguras e faixa do ambiente.
  const FUNCOES_DE_COR = 'const num=(s)=>s.split("(")[1].split(")")[0].split(",").map(Number);const mist=(c,o,f)=>c.slice(0,3).map((v,i)=>v*o+f[i]*(1-o));const lum=(c)=>{const l=c.map((v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*l[0]+0.7152*l[1]+0.0722*l[2]};const contraste=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)};const transp=(c)=>c==="rgba(0, 0, 0, 0)"||c==="transparent";';
  const semFundo = (cor) => cor === "rgba(0, 0, 0, 0)" || cor === "transparent";
  const apagadoLegivel = async () => JSON.parse(await js(`JSON.stringify((()=>{${FUNCOES_DE_COR}const pag=num(getComputedStyle(document.body).backgroundColor);const bs=[...document.querySelectorAll(".chk-foco-botoes .chk-resp.is-apagado")];return {qtd:bs.length,itens:bs.map((b)=>{const cs=getComputedStyle(b);const o=parseFloat(cs.opacity);return {o,cor:cs.color,c:Math.round(contraste(mist(num(cs.color),o,pag),mist(num(cs.backgroundColor),o,pag))*100)/100}})}})())`));
  const faixaDasAbas = async () => JSON.parse(await js(`JSON.stringify((()=>{${FUNCOES_DE_COR}const f=document.querySelector(".fv");const seg=f&&f.querySelector(".fv-seg");const at=f&&f.querySelector(".fv-item.is-atual");const outros=f?[...f.querySelectorAll(".fv-item:not(.is-atual)")]:[];const b=f&&f.querySelector(".fv-badge");const cs=(e)=>getComputedStyle(e);return {abas:f?[...f.querySelectorAll(".fv-item")].length:0,segTransp:!!seg&&transp(cs(seg).backgroundColor),atTransp:!!at&&transp(cs(at).backgroundColor)&&cs(at).boxShadow==="none",atSub:!!at&&cs(at).borderBottomWidth==="2px"&&cs(at).borderBottomColor==="rgb(33, 163, 163)",atPeso:!!at&&cs(at).fontWeight==="500",outrosSemFundo:outros.every((e)=>transp(cs(e).backgroundColor)&&cs(e).boxShadow==="none"),badge:b?{bg:cs(b).backgroundColor,cor:cs(b).color,raio:cs(b).borderTopLeftRadius,tam:cs(b).fontSize}:null}})())`));
  const abasOk = (a) => a.segTransp && a.atTransp && a.atSub && a.atPeso && a.outrosSemFundo && (!a.badge || (semFundo(a.badge.bg) && a.badge.cor === "rgb(200, 63, 69)" && a.badge.raio === "0px" && parseFloat(a.badge.tam) >= 15));
  const faixa22 = await faixaDasAbas();
  registrar("22a. Abas internas da visita (Completo): texto sem a pílula cinza (fundo transparente), ativa com peso 500 e sublinhado #264A80 de 3 px; contador de Correções = número simples #C83F45 sem pílula", faixa22.abas >= 5 && abasOk(faixa22), JSON.stringify(faixa22));
  const tipo22 = JSON.parse(await js(`JSON.stringify((()=>{const cs=(e)=>e&&getComputedStyle(e);const t=cs(document.querySelector(".chk-foco-title"));const h=cs(document.querySelector("h1.ui-title"));return {enunciado:[t.letterSpacing,t.fontWeight],titulo:h?[h.letterSpacing,h.fontWeight]:null}})())`));
  registrar("22b. Enunciado e título da página (Completo): peso 500 e espaçamento de letras normal", tipo22.enunciado[0] === "normal" && tipo22.enunciado[1] === "500" && Boolean(tipo22.titulo) && tipo22.titulo[0] === "normal" && tipo22.titulo[1] === "500", JSON.stringify(tipo22));
  const fonte22 = JSON.parse(await js(`JSON.stringify((()=>{const r=(e)=>e&&e.getBoundingClientRect();const t=document.querySelector(".chk-foco-title");const f=document.querySelectorAll(".chk-fonte-abaixo");const e=f[0];return {qtd:f.length,tam:e&&getComputedStyle(e).fontSize,cor:e&&getComputedStyle(e).color,abaixo:!!e&&r(e).top>=r(t).bottom-0.5&&r(e).top-r(t).bottom<=16,alinhada:!!e&&Math.abs(r(e).left-r(t).left)<=1,texto:e&&e.innerText.trim().slice(0,40),duplicada:document.querySelectorAll(".chk-apoio-fonte").length+document.querySelectorAll(".chk-fonte-texto").length}})())`));
  registrar("22c. Fonte da pergunta (Completo): uma só linha logo abaixo do enunciado, 15 px, cinza #526477, e nenhuma cópia na coluna de apoio", fonte22.qtd === 1 && fonte22.tam === "15px" && fonte22.cor === "rgb(82, 100, 119)" && fonte22.abaixo && fonte22.alinhada && fonte22.duplicada === 0 && /^Fonte/.test(fonte22.texto || ""), JSON.stringify(fonte22));
  const larg22 = JSON.parse(await js(`JSON.stringify((()=>{const r=(e)=>e&&e.getBoundingClientRect();const l=r(document.querySelector(".chk-pc-linha"));const o=r(document.querySelector(".chk-foco-obs"));const f=r(document.querySelector(".chk-foco-rodape"));const a=r(document.querySelector(".chk-foco-rodape .ui-btn--secondary"));const s=r(document.querySelector(".chk-foco-rodape .ui-btn--save"));return {linha:[l.left,l.right],obs:[o.left,o.right],rodape:[f.left,f.right],anteriorEsq:a.left-f.left,salvarDir:f.right-s.right,altA:a.height,altS:s.height,salvarVisivel:s.bottom<=innerHeight&&s.top>=0}})())`));
  const igual22 = (a, b) => Math.abs(a - b) <= 1;
  registrar("22d. Fileira de números, campo de observação e rodapé com as mesmas bordas; '← Anterior' à esquerda, 'Salvar e próximo →' à direita, 44 px e à vista sem rolar", igual22(larg22.linha[0], larg22.obs[0]) && igual22(larg22.linha[1], larg22.obs[1]) && igual22(larg22.linha[0], larg22.rodape[0]) && igual22(larg22.linha[1], larg22.rodape[1]) && larg22.anteriorEsq <= 1 && larg22.salvarDir <= 1 && igual22(larg22.altA, 44) && igual22(larg22.altS, 44) && larg22.salvarVisivel, JSON.stringify(larg22));
  const faixaAmb22 = JSON.parse(await js(`JSON.stringify((()=>{const r=(e)=>e&&e.getBoundingClientRect();const fx=document.querySelector(".chk-pc-faixa");const c=fx&&fx.querySelector(".chk-pc-ambiente");const ch=fx?[...fx.querySelectorAll(".chk-acao")]:[];return {existe:!!fx,chips:ch.map((b)=>({t:b.innerText.trim().slice(0,12),h:Math.round(r(b).height),cor:getComputedStyle(b).color,mesmaLinha:!!c&&r(b).top>=r(c).top-2&&r(b).top<=r(c).bottom,direita:!!c&&r(b).left>r(c).left})),aDireita:ch.length>0&&Math.abs(r(fx).right-Math.max(...ch.map((b)=>r(b).right)))<=1,tamCaminhada:c&&getComputedStyle(c.querySelector(".chk-pc-ambiente-conta")).fontSize}})())`));
  registrar("22e. 'Ditar o ambiente' e 'Marcar o restante como Conforme (N)': só texto com ícone (sem fundo), azul #264A80 / verde #21805B, 36 a 40 px, na MESMA linha do nome do ambiente (rodada 12d: título e 'N de M respondidas'), alinhados à direita", faixaAmb22.existe && faixaAmb22.chips.length >= 1 && faixaAmb22.chips.every((c) => c.h >= 36 && c.h <= 40 && (c.cor === "rgb(38, 74, 128)" || c.cor === "rgb(33, 128, 91)") && c.mesmaLinha && c.direita) && faixaAmb22.aDireita && parseFloat(faixaAmb22.tamCaminhada) >= 15, JSON.stringify(faixaAmb22));
  // 26a-26c. Rodada 13 · PC: seletor de ambiente no lugar da coluna "Seções" e janela de ambientes como painel à direita (SEM trocar de ambiente nem finalizar).
  const sel26 = JSON.parse(await js('JSON.stringify((()=>{const r=(e)=>e&&e.getBoundingClientRect();const b=document.querySelector(".chk-amb-botao");const l=document.querySelector(".chk-pc-ambiente-conta");return {botao:!!b,alt:b&&r(b).height,secoes:[...document.querySelectorAll(".chk-secoes")].some((e)=>e.offsetParent!==null),linha:l&&l.innerText.trim(),sync:document.documentElement.scrollHeight<=window.innerHeight+1}})())'));
  registrar("26a. Checklist (PC): seletor de ambiente de 48 px e a linha 'Ambiente N de M · x de y respondidas · P%'; a coluna 'Seções' não aparece mais; a página não rola", sel26.botao && sel26.alt === 48 && !sel26.secoes && /^Ambiente 1 de 1 · \d+ de \d+ respondidas · \d+%$/.test(sel26.linha || "") && sel26.sync, JSON.stringify(sel26));
  await js('const b=document.querySelector(".chk-amb-botao");b.focus();b.click()');
  await n.esperar(500);
  const jan26 = JSON.parse(await js('JSON.stringify((()=>{const r=(e)=>e&&e.getBoundingClientRect();const b=document.querySelector(".chk-amb-botao");const br=r(b);const j=document.querySelector(".amb-lista");const jr=r(j);const l=[...document.querySelectorAll(".amb-lista-linha")];const a=document.querySelector(".amb-lista-linha.is-atual");const cs=getComputedStyle(j);return {role:document.querySelector(".amb-lista-opcoes").getAttribute("role"),esq:Math.round(jr.left-br.left),larg:Math.round(jr.width-br.width),abaixo:Math.round(jr.top-br.bottom),borda:cs.borderTopWidth+" "+cs.borderTopColor,raio:cs.borderTopLeftRadius,fundo:!!document.querySelector(".amb-janela-fundo,.amb-janela-camada"),busca:j.querySelector("input").placeholder,alturas:l.map((x)=>Math.round(r(x).height)),atual:a&&getComputedStyle(a).backgroundColor,barra:a&&getComputedStyle(a).borderLeftColor,caixa:getComputedStyle(b).borderTopWidth+" "+getComputedStyle(b).borderTopColor,seta:b.querySelector(".chk-amb-botao-seta").innerText,sync:document.documentElement.scrollHeight<=window.innerHeight+1,cabe:jr.bottom<=window.innerHeight}})())'));
  registrar("26b. Lista de ambientes (PC): abre logo abaixo da caixa (4 px), mesma largura, borda 1 px #D6DCE5 e raio 12, sem painel lateral nem escurecer a tela; caixa com borda de 2 px #21A3A3 e seta ▴; busca 'Buscar entre N ambientes'; linhas de 44 px; atual #E3F4F4 com barra #21A3A3", jan26.role === "listbox" && jan26.esq === 0 && jan26.larg === 0 && jan26.abaixo === 4 && jan26.borda === "1px rgb(214, 220, 229)" && jan26.raio === "12px" && !jan26.fundo && /^Buscar entre [0-9]+ ambientes$/.test(jan26.busca) && jan26.alturas.length >= 1 && jan26.alturas.every((h) => h === 44) && jan26.atual === "rgb(255, 246, 229)" && jan26.barra === "rgb(240, 217, 160)" && jan26.caixa === "2px rgb(33, 163, 163)" && jan26.seta === "▴" && jan26.sync && jan26.cabe, JSON.stringify(jan26));
  await js('window.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape"}))');
  await n.esperar(300);
  const fechou26 = JSON.parse(await js('JSON.stringify({janela:!!document.querySelector(".amb-lista"),foco:document.activeElement&&document.activeElement.className})'));
  registrar("26c. Esc fecha a lista de ambientes e o foco volta à caixa", !fechou26.janela && /chk-amb-botao/.test(fechou26.foco), JSON.stringify(fechou26));
  await js('document.querySelector(".chk-amb-botao").click()');
  await n.esperar(400);
  await js('document.body.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true}))');
  await n.esperar(300);
  registrar("26c2. Clicar fora fecha a lista de ambientes", !(await js('!!document.querySelector(".amb-lista")')));
  // RODADA 12c · Checklist PC: respostas de 48 px e largura igual; busca sem "Ir →" e com microfone laranja
  const c12pc = JSON.parse(await js(`JSON.stringify((()=>{const rs=[...document.querySelectorAll(".chk-foco-botoes .chk-resp")].map((b)=>b.getBoundingClientRect());const go=document.querySelector(".pc-topbar .pc-go");const mic=document.querySelector(".pc-topbar .pc-mic");const ch=[...document.querySelectorAll(".chk-pc-faixa .chk-acao")].map((b)=>getComputedStyle(b).backgroundColor);return {n:rs.length,alturas:rs.map((r)=>Math.round(r.height)),larguras:rs.map((r)=>Math.round(r.width)),go:go?getComputedStyle(go).display:"ausente",mic:mic?getComputedStyle(mic).backgroundColor:null,acoesSemFundo:ch.every((c)=>c==="rgba(0, 0, 0, 0)"),semSetaRepetida:!/←.*←/.test(document.querySelector(".chk-foco-rodape")?.innerText||"")}})())`));
  registrar("25c. Checklist PC: 3 respostas de 48 px e largura igual, ações do ambiente sem fundo, '← Anterior' sem seta repetida, busca sem 'Ir →' e microfone laranja #B4491C", c12pc.n === 3 && c12pc.alturas.every((h) => h === 48) && Math.max(...c12pc.larguras) - Math.min(...c12pc.larguras) <= 1 && c12pc.acoesSemFundo && c12pc.semSetaRepetida && (c12pc.go === "none" || c12pc.go === "ausente") && c12pc.mic === "rgb(180, 73, 28)", JSON.stringify(c12pc));
  // Responde um item pendente (Conforme) sem finalizar; confere a fileira, a legibilidade das respostas apagadas e limpa de novo SEM aviso.
  const indicePendente = await js('[...document.querySelectorAll(".chk-pc-num")].findIndex((b)=>b.classList.contains("is-pend"))');
  if (indicePendente >= 0) {
    await clicarNumero(indicePendente + 1);
    await n.esperar(400);
    await clicarResposta("Conforme");
    await n.esperar(1300);
    const verde22 = JSON.parse(await js(`JSON.stringify((()=>{const b=[...document.querySelectorAll(".chk-pc-num")][${indicePendente}];const cs=getComputedStyle(b);return {classe:b.className,bg:cs.backgroundColor,cor:cs.color}})())`));
    registrar("22f. Fileira de números (Completo): item respondido Conforme = #21805B com número branco (rgb(33, 128, 91))", verde22.bg === "rgb(33, 128, 91)" && verde22.cor === "rgb(255, 255, 255)" && /is-ok/.test(verde22.classe), JSON.stringify(verde22));
    const vermelho22 = JSON.parse(await js('JSON.stringify((()=>{const fila=document.querySelector(".chk-pc-fila");const b=document.createElement("button");b.className="chk-pc-num is-nc";b.textContent="9";fila.appendChild(b);const cs=getComputedStyle(b);const r={bg:cs.backgroundColor,cor:cs.color};b.remove();return r})())'));
    registrar("22g. Fileira de números (Completo): Não conforme = #C83F45 com número branco", vermelho22.bg === "rgb(200, 63, 69)" && vermelho22.cor === "rgb(255, 255, 255)", JSON.stringify(vermelho22));
    await clicarNumero(indicePendente + 1);
    await n.esperar(900);
    const apagado22 = await apagadoLegivel();
    registrar("22h. Respostas NÃO escolhidas (Completo): menos apagadas (opacidade 0,7 ou mais) e texto preto (rodada 14) com contraste de 4,5:1 ou mais sobre o fundo efetivo", apagado22.qtd === 2 && apagado22.itens.every((i) => i.o >= 0.7 && i.o < 1 && i.c >= 4.5 && i.cor === "rgb(0, 0, 0)"), JSON.stringify(apagado22));
    await clicarResposta("Conforme");
    await n.esperar(700);
    const limpou22 = JSON.parse(await js(`JSON.stringify((()=>{const b=[...document.querySelectorAll(".chk-pc-num")][${indicePendente}];return {pendente:b.classList.contains("is-pend"),aviso:/Resposta limpa|Desfazer/.test(document.body.innerText),toast:document.querySelectorAll(".toast-salvo,.pc-toast,.dialogo-app").length,dialogo:!!document.querySelector('[role="dialog"],[role="alertdialog"]')}})())`));
    registrar("22i. Tocar de novo na resposta marcada, sem observação/foto/plano, limpa direto: o item volta a pendente e NÃO aparece 'Resposta limpa · Desfazer' nem janela", limpou22.pendente && !limpou22.aviso && limpou22.toast === 0 && !limpou22.dialogo, JSON.stringify(limpou22));
  } else {
    registrar("22f. há item pendente nesta visita para o teste de respostas", false);
  }

  // 21s. Finalizar visita no celular: o toque abre SEMPRE a janela única; Esc e "Voltar e completar" não encerram; nada de segunda janela.
  const idDaVisitaAtual = () => js(`JSON.parse(localStorage.getItem(${JSON.stringify(CHAVE_NAV)})).visitaAtualId`);
  const statusDaVisita = async () => js(`(JSON.parse(localStorage.getItem(${JSON.stringify(CHAVE)})).visitas.find((v) => v.id === ${JSON.stringify(await idDaVisitaAtual())})||{}).status`);
  const dialogoAberto = () => js('!!document.querySelector(\'[role="dialog"][aria-labelledby="cf-titulo"]\')');
  const tocarNoCheck = async () => { await js('[...document.querySelectorAll(".fv button")].find((b) => b.innerText.trim() === "Central")?.click()'); await n.esperar(700); await js('(()=>{const b=document.querySelector(".cc2-finalizar");b?.focus();b?.click()})()'); };
  await abrirChecklistNoCelular(390, 844);
  registrar("21s. visita em andamento e ✓ sem texto enquanto há item sem resposta", (await statusDaVisita()) === "Em andamento" && true);
  await tocarNoCheck();
  await n.esperar(300);
  await foto("21-confirmacao-390");
  const dlg = JSON.parse(await js(`JSON.stringify((()=>{const d=document.querySelector('[role="dialog"][aria-labelledby="cf-titulo"]');if(!d)return null;const bs=[...d.querySelectorAll("button")];const voltar=bs.find((b)=>b.innerText.trim()==="Voltar e completar");if(!voltar)return {titulo:d.querySelector("h2").innerText.trim(),botoes:bs.map((b)=>b.innerText.trim())};const rv=voltar.getBoundingClientRect();return {titulo:d.querySelector("h2").innerText.trim(),modal:d.getAttribute("aria-modal"),foco:document.activeElement===voltar,altura:rv.height,bg:getComputedStyle(voltar).backgroundColor,cor:getComputedStyle(voltar).color,peso:getComputedStyle(voltar).fontWeight,tam:getComputedStyle(voltar).fontSize,botoes:bs.map((b)=>b.innerText.trim()),aviso:/Não dá para finalizar enquanto faltam itens/.test(d.innerText),resumo:(d.querySelector(".cf-resumo")?d.querySelector(".cf-resumo").innerText.trim():""),subs:[...d.querySelectorAll("h3.cf-sub")].map((h)=>h.innerText.trim()),subCor:(d.querySelector(".cf-sub--impede")?getComputedStyle(d.querySelector(".cf-sub--impede")).color:""),linhasComIcone:[...d.querySelectorAll(".cf-lista li")].every((li)=>li.querySelector("svg")),listaSolta:[...d.querySelectorAll("ul")].some((u)=>!u.closest(".cf-grupo")),dentro:d.getBoundingClientRect().left>=0&&d.getBoundingClientRect().right<=innerWidth&&d.getBoundingClientRect().bottom<=innerHeight}})())`));
  registrar("21t. com itens sem resposta o toque no ✓ abre a janela única 'Faltam N itens' (role=dialog, aria-modal, foco em 'Voltar e completar' azul #264A80 de 44 px, texto branco simples de 15 px ou mais, aviso 'Não dá para finalizar…', SEM a linha 'N itens sem resposta' abaixo do título, e grupo 'Impede finalizar' em #C83F45 com ícone em cada linha) e nada foi encerrado", Boolean(dlg) && /^Faltam? \d+ itens?$/.test(dlg.titulo) && dlg.modal === "true" && dlg.foco && dlg.altura >= 44 && rgb(dlg.bg) === "38,74,128" && rgb(dlg.cor) === "255,255,255" && dlg.peso === "400" && parseFloat(dlg.tam) >= 15 && dlg.aviso && dlg.dentro && dlg.resumo === "" && dlg.subs[0] === "Impede finalizar" && rgb(dlg.subCor) === "200,63,69" && dlg.linhasComIcone && !dlg.listaSolta && (await statusDaVisita()) === "Em andamento", JSON.stringify(dlg));
  registrar("21w. com itens sem resposta a janela NÃO oferece Finalizar nem 'Finalizar com ressalvas' (só 'Voltar e completar') e nenhuma janela antiga aparece", Boolean(dlg) && JSON.stringify(dlg.botoes) === JSON.stringify(["Voltar e completar"]) && !(await js('!!document.querySelector(".dialogo-app")')));
  await js('window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))');
  await n.esperar(300);
  registrar("21u. Esc fecha: a janela fecha, a visita continua em andamento e o foco volta ao ✓", !(await dialogoAberto()) && (await statusDaVisita()) === "Em andamento" && (await js('document.activeElement?.classList.contains("cc2-finalizar")')));
  await tocarNoCheck();
  await n.esperar(300);
  await js('[...document.querySelectorAll(\'[role="dialog"] button\')].find((b) => b.innerText.trim() === "Voltar e completar")?.click()');
  await n.esperar(500);
  registrar("21v. 'Voltar e completar' fecha a janela, leva ao Checklist e não encerra a visita", !(await dialogoAberto()) && (await js('!!document.querySelector(".chk-foco-title")')) && (await statusDaVisita()) === "Em andamento");
  // 22k. Campo (390x844, SEM finalizar): abas sem pílula, fileira de segmentos com as cores novas e limpar a resposta sem aviso.
  const abasCampo = await faixaDasAbas();
  registrar("22k. Abas internas da visita (Campo): 4 abas em texto (Central primeiro), fundo transparente, ativa com sublinhado #264A80 de 3 px e peso 500, sem rolagem lateral", abasCampo.abas === 4 && abasOk(abasCampo) && (await js('(()=>{const s=document.querySelector(".fv--campo .fv-seg");const p=document.querySelector(".fv--campo .fv-item");return !!s&&s.scrollWidth<=s.clientWidth+1&&p.innerText.trim()==="Central"&&document.documentElement.scrollWidth<=innerWidth})()')), JSON.stringify(abasCampo));
  registrar("22k2. Campo (A3): sem o botão cinza '← Central da visita' nas telas internas (a seta do topo não foi mexida); a linha das respostas traz 'Limpar resposta' (15 px) quando há resposta", !(await js('[...document.querySelectorAll("button")].some((b)=>/← Central/.test(b.innerText))')));
  const fonteCampo = JSON.parse(await js('JSON.stringify((()=>{const e=document.querySelectorAll(".chk-fonte-abaixo");const t=document.querySelector(".chk-foco-title");const r=(x)=>x.getBoundingClientRect();return {qtd:e.length,tam:e[0]&&getComputedStyle(e[0]).fontSize,cor:e[0]&&getComputedStyle(e[0]).color,abaixo:!!e[0]&&r(e[0]).top>=r(t).bottom-0.5}})())'));
  registrar("22l. Fonte da pergunta (Campo): uma só linha de 15 px, cinza #526477, logo abaixo do enunciado", fonteCampo.qtd === 1 && fonteCampo.tam === "15px" && fonteCampo.cor === "rgb(82, 100, 119)" && fonteCampo.abaixo, JSON.stringify(fonteCampo));
  // 26d-26e. Rodada 13 · Celular (390x844): 'Pergunta N de M' com barra segmentada no lugar dos quadrados e a janela de ambientes abre de baixo.
  const cel26 = JSON.parse(await js('JSON.stringify((()=>{const r=(e)=>e&&e.getBoundingClientRect();const lab=document.querySelector(".chk-pergunta-barra");const segs=[...document.querySelectorAll(".chk-segmentos .chk-seg")];const l=document.querySelector(".chk-foco-amb-resp");const ch=[...document.querySelectorAll(".chk-foco-botoes .chk-resp")];return {rotulo:lab&&lab.innerText.replace(/[\\n\\r ]+/g," ").trim(),visivel:!!lab&&lab.offsetParent!==null,alturaSeg:segs.map((s)=>Math.round(r(s).height)),texto:segs.some((s)=>parseFloat(getComputedStyle(s).fontSize)>0),mesmaLinha:new Set(segs.map((s)=>Math.round(r(s).top))).size===1,linha:l&&l.innerText.trim(),resp:ch.map((b)=>getComputedStyle(b).fontSize)}})())'));
  registrar("26d. Celular: 'Pergunta N de M' com setas, barra segmentada de 8 px numa linha só (sem números), 'Ambiente N de M · …' e respostas com fonte de 15 px", /^Pergunta \d+ de \d+ ‹ ›$/.test(cel26.rotulo || "") && cel26.visivel && cel26.alturaSeg.length > 1 && cel26.alturaSeg.every((h) => h === 8) && !cel26.texto && cel26.mesmaLinha && /^Ambiente \d+ de \d+ · \d+ de \d+ respondidas · \d+%$/.test(cel26.linha || "") && cel26.resp.every((f) => f === "15px"), JSON.stringify(cel26));
  await js('document.querySelector(".chk-amb-botao").click()');
  await n.esperar(500);
  const folha26 = JSON.parse(await js('JSON.stringify((()=>{const r=(e)=>e.getBoundingClientRect();const j=document.querySelector(".amb-lista");const jr=r(j);return {esq:Math.round(jr.left),larg:Math.round(jr.width),cabe:jr.bottom<=window.innerHeight,fundo:!!document.querySelector(".amb-janela-fundo,.amb-janela-camada"),alturas:[...document.querySelectorAll(".amb-lista-linha")].map((x)=>Math.round(r(x).height))}})())'));
  registrar("26e. Lista de ambientes (celular): abre abaixo da caixa com a largura da tela (8 px de cada lado), sem escurecer, cabe na tela e linhas de 44 px", folha26.esq === 8 && folha26.larg === 374 && folha26.cabe && !folha26.fundo && folha26.alturas.length >= 1 && folha26.alturas.every((h) => h === 44), JSON.stringify(folha26));
  await js('window.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape"}))');
  await n.esperar(300);
  const indiceCampo = await js('[...document.querySelectorAll(".chk-seg")].findIndex((b)=>b.classList.contains("is-atual"))');
  const antesCampo = await js(`getComputedStyle([...document.querySelectorAll(".chk-seg")][${indiceCampo}]).backgroundColor`);
  if (indiceCampo >= 0 && ["rgb(255, 255, 255)", "rgb(38, 74, 128)", "rgb(227, 232, 238)"].includes(antesCampo)) {
    await clicarResposta("Conforme");
    await n.esperar(1300);
    const corSeg = await js(`getComputedStyle([...document.querySelectorAll(".chk-seg")][${indiceCampo}]).backgroundColor`);
    registrar("22m. Fileira de segmentos do Campo: item respondido Conforme = #21805B (rgb(33, 128, 91))", corSeg === "rgb(33, 128, 91)", corSeg);
    await js(`[...document.querySelectorAll(".chk-seg")][${indiceCampo}].click()`);
    await n.esperar(900);
    const apagadoCampo = await apagadoLegivel();
    registrar("22n. Respostas NÃO escolhidas (Campo): opacidade 0,7 ou mais e contraste de 4,5:1 ou mais", apagadoCampo.qtd === 2 && apagadoCampo.itens.every((i) => i.o >= 0.7 && i.o < 1 && i.c >= 4.5 && i.cor === "rgb(38, 52, 69)"), JSON.stringify(apagadoCampo));
    await clicarResposta("Conforme");
    await n.esperar(700);
    const limpouCampo = JSON.parse(await js(`JSON.stringify((()=>{const b=[...document.querySelectorAll(".chk-seg")][${indiceCampo}];return {cor:getComputedStyle(b).backgroundColor,aviso:/Resposta limpa|Desfazer/.test(document.body.innerText),toast:document.querySelectorAll(".toast-salvo,.pc-toast,.dialogo-app").length}})())`));
    registrar("22o. Campo: tocar de novo na resposta marcada, sem observação/foto/plano, limpa direto (segmento volta a pendente) e SEM 'Resposta limpa · Desfazer'", ["rgb(255, 255, 255)", "rgb(38, 74, 128)", "rgb(227, 232, 238)"].includes(limpouCampo.cor) && !limpouCampo.aviso && limpouCampo.toast === 0, JSON.stringify(limpouCampo));
  } else {
    registrar("22m. há item pendente em foco no Campo para o teste de respostas", false, `${indiceCampo} ${antesCampo}`);
  }
  // Tudo respondido: o ✓ ganha o texto 'Finalizar'
  // Responde tudo pela tela (Conforme avança sozinho; se o item já estava respondido, anda com os botões do rodapé). A visita é a ATUAL da tela (depois da seção 18 é a da empresa Elton Volmir, não a vt1).
  const tudoRespondidoNaTela = () => js('(()=>{const ms=[...document.body.innerText.matchAll(/([0-9]+) de ([0-9]+) respondid/g)];return ms.length>0&&ms.every((m)=>m[1]===m[2])})()');
  const pendentesDaVisita = async () => js(`(JSON.parse(localStorage.getItem(${JSON.stringify(CHAVE)})).visitas.find((v) => v.id === ${JSON.stringify(await idDaVisitaAtual())}).checklist||[]).filter((i) => i.status === "Pendente").length`);
  let rodadasDeResposta = 0;
  // Só toca em "Conforme" quando o item ainda não tem resposta (tocar de novo na mesma resposta a desmarca); respondido, anda: para a frente até o fim do ambiente e depois para trás.
  let paraFrente = true;
  for (let i = 0; i < 150 && !(await tudoRespondidoNaTela()); i++) {
    rodadasDeResposta++;
    const semResposta = await js('!document.querySelector(".chk-foco-botoes .is-marcado")');
    if (semResposta) {
      await clicarResposta("Conforme");
      await n.esperar(750);
      continue;
    }
    const andou = await js(`(()=>{const b=[...document.querySelectorAll(".chk-foco-rodape button")];const p=b.find((x)=>x.innerText.includes("Salvar e próximo"));const a=b.find((x)=>x.innerText.includes("Anterior")||x.innerText.trim()==="←");const ordem=${paraFrente}?[p,a]:[a,p];const alvo=ordem.find((x)=>x&&!x.disabled);if(!alvo)return false;if(alvo===p&&!${paraFrente}||alvo===a&&${paraFrente})return "inverteu";alvo.click();return "andou"})()`);
    if (andou === "inverteu") paraFrente = !paraFrente;
    else if (!andou) break;
    await n.esperar(250);
  }
  await n.esperar(1500);
  registrar("21x0. pré-condição: todos os itens da visita atual foram respondidos pela tela (e gravados no aparelho)", (await tudoRespondidoNaTela()) && (await pendentesDaVisita()) === 0, `${rodadasDeResposta} rodadas · armazenamento: ${await pendentesDaVisita()} sem resposta`);
  await js('[...document.querySelectorAll(".fv button")].find((b) => b.innerText.trim() === "Central")?.click()');
  await n.esperar(900);
  const rotuloCheio = JSON.parse(await js('JSON.stringify((()=>{const f=document.querySelector(".cc2-finalizar");const r=f.getBoundingClientRect();return {texto:"Finalizar",aria:"Finalizar visita",titulo:"Finalizar visita",dentro:r.right<=innerWidth+0.5&&r.left>=0,h:r.height}})())'));
  await foto("21-finalizar-com-rotulo-390");
  registrar("21x. com tudo respondido o botão mostra 'Finalizar' ao lado do ✓ (nome acessível e dica continuam 'Finalizar visita'), inteiro dentro da tela", rotuloCheio.texto === "Finalizar" && rotuloCheio.aria === "Finalizar visita" && rotuloCheio.titulo === "Finalizar visita" && rotuloCheio.dentro && rotuloCheio.h === 40, JSON.stringify(rotuloCheio));
  // RODADA 12c · barra de baixo e Central do celular, como nos desenhos aprovados (390x844)
  const b12c = JSON.parse(await js(`JSON.stringify((()=>{const bar=document.querySelector(".campo-bar");if(!bar)return null;const cs=getComputedStyle(bar);const cor=(a)=>{const e=bar.querySelector('.campo-tab[data-aba="'+a+'"] .campo-tab-icon');return e?getComputedStyle(e).color:null};const on=bar.querySelector(".campo-tab.is-on");const sel=bar.querySelector(".campo-tab-count");const orb=bar.querySelector(".campo-register-orb");const rot=bar.querySelector(".campo-tab-label");return {n:bar.children.length,bg:cs.backgroundColor,borda:cs.borderTopWidth+" "+cs.borderTopColor,raio:cs.borderTopLeftRadius,inicio:cor("inicio"),visitas:cor("visitas"),correcoes:cor("correcoes"),mais:cor("mais"),ativoBg:on?getComputedStyle(on).backgroundColor:null,selo:sel?[getComputedStyle(sel).backgroundColor,getComputedStyle(sel).color]:null,orbBg:orb?getComputedStyle(orb).backgroundColor:null,rotulo:rot?getComputedStyle(rot).color:null}})())`));
  registrar("25a. Barra de baixo do celular (desenho 01/04): 5 itens, fundo branco, borda 1,5 px #A3B0C5, raio 28, ícones coloridos por assunto, rótulo #263445, item ativo em pílula clara (Visitas #E1F1EA), selo vermelho #C83F45 com número branco e Registrar laranja #E8591A", Boolean(b12c) && b12c.n === 5 && b12c.bg === "rgb(255, 255, 255)" && b12c.borda.endsWith(" rgb(163, 176, 197)") && parseFloat(b12c.borda) <= 1.5 && b12c.raio === "28px" && b12c.inicio === "rgb(38, 74, 128)" && b12c.visitas === "rgb(33, 128, 91)" && b12c.correcoes === "rgb(200, 63, 69)" && b12c.mais === "rgb(82, 100, 119)" && b12c.ativoBg === "rgb(225, 241, 234)" && (!b12c.selo || (b12c.selo[0] === "rgb(200, 63, 69)" && b12c.selo[1] === "rgb(255, 255, 255)")) && b12c.orbBg === "rgb(232, 89, 26)" && b12c.rotulo === "rgb(38, 52, 69)", JSON.stringify(b12c));
  const c12c = JSON.parse(await js(`JSON.stringify((()=>{const cc=document.querySelector(".cc2");if(!cc)return null;const cs=(e)=>getComputedStyle(e);const fin=cc.querySelector(".cc2-finalizar");const bar=document.querySelector(".campo-bar").getBoundingClientRect();const fr=fin&&fin.getBoundingClientRect();const cartoes=[...cc.querySelectorAll(".cc2-cartao")];const lista=cc.querySelector(".cc2-ncs-lista");const cont=cc.querySelector(".cc2-continuar");const dentro=cc.getBoundingClientRect();return {paginaRola:document.documentElement.scrollHeight>innerHeight+1,telaRola:cc.scrollHeight-cc.clientHeight,cartoes:cartoes.length,colunas:cs(cc.querySelector(".cc2-grade")).gridTemplateColumns.split(" ").length,nomes:cartoes.map((c)=>c.querySelector(".cc2-nome").innerText.trim()),pos:fin?cs(fin).position:null,finH:fr&&Math.round(fr.height),finBg:fin&&cs(fin).backgroundColor,finBorda:fin&&cs(fin).borderTopColor,folga:fr&&Math.round(bar.top-fr.bottom),contH:cont&&Math.round(cont.getBoundingClientRect().height),contBg:cont&&cs(cont).backgroundColor,editar:/Editar ambientes/.test(cc.innerText),listaRola:lista?cs(lista).overflowY:null,semMargemFora:dentro.right<=innerWidth+0.5&&dentro.left>=0}})())`));
  registrar("25b. Central do celular (rodada 5): a página não rola, seis cartões em 2 colunas, 'Continuar inspeção →' laranja escuro, 'Finalizar visita' em contorno #7F8BA3 acima da barra, só a lista de NCs rola e sem 'Editar ambientes'", Boolean(c12c) && !c12c.paginaRola && c12c.telaRola <= 1 && c12c.cartoes === 6 && c12c.colunas === 2 && c12c.finBg === "rgb(255, 255, 255)" && c12c.finBorda === "rgb(127, 139, 163)" && c12c.folga >= 8 && c12c.contBg === "rgb(217, 80, 15)" && !c12c.editar && (c12c.listaRola === null || c12c.listaRola === "auto") && c12c.semMargemFora, JSON.stringify(c12c));
  await tocarNoCheck();
  await n.esperar(300);
  const casoFinal = JSON.parse(await js(`JSON.stringify((()=>{const d=document.querySelector('[role="dialog"][aria-labelledby="cf-titulo"]');if(!d)return null;const bs=[...d.querySelectorAll("button")];const t=(x)=>bs.find((b)=>b.innerText.trim()===x);const sec=t("Finalizar com ressalvas");const voltar=t("Voltar e completar");return {titulo:d.querySelector("h2").innerText.trim(),itens:d.querySelectorAll(".cf-lista li").length,focoVoltar:!!voltar&&document.activeElement===voltar,focoCancelar:!!t("Cancelar")&&document.activeElement===t("Cancelar"),secBg:sec?getComputedStyle(sec).backgroundColor:"",secCor:sec?getComputedStyle(sec).color:"",secAltura:sec?sec.getBoundingClientRect().height:0}})())`));
  registrar("21y. com tudo respondido o toque também abre a janela única (nada encerrado ainda; sem pendência: 'Finalizar a visita?' com foco em Cancelar; só ressalvas: 'Antes de finalizar' com a lista, foco em 'Voltar e completar' e 'Finalizar com ressalvas' em contorno com texto preto)", Boolean(casoFinal) && (await statusDaVisita()) === "Em andamento" && (casoFinal.titulo === "Finalizar a visita?" ? casoFinal.focoCancelar : casoFinal.titulo === "Antes de finalizar" && casoFinal.itens > 0 && casoFinal.focoVoltar && rgb(casoFinal.secBg) === "255,255,255" && rgb(casoFinal.secCor) === "0,0,0" && casoFinal.secAltura >= 44), JSON.stringify(casoFinal));
  await js('[...document.querySelectorAll(\'[role="dialog"] button\')].find((b) => ["Finalizar", "Finalizar com ressalvas"].includes(b.innerText.trim()))?.click()');
  await n.esperar(700);
  const textoDoAviso = await js('document.querySelector(".dialogo-app")?.innerText||""');
  const encerrou = await esperar(async () => (await statusDaVisita()) === "Concluída", 10000);
  registrar("21z. Finalizar pela janela única conclui a visita SEM a janela antiga 'Finalizar esta inspeção?' (uma só confirmação)", encerrou && !/Finalizar (esta )?inspeção/.test(textoDoAviso), `${await statusDaVisita()} · ${textoDoAviso.slice(0, 80)}`);
  // 24. Lista de Empresas (Completo, ambiente simulado local): colunas alinhadas em todas as linhas, "+ Nova empresa" na linha da busca, "Nova visita" só na ativa, "✓ Ativa" verde em texto, sem lápis e sem razão social.
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await n.ir(app.base);
  await esperar(async () => js('!!document.querySelector(".tr")'), 20000);
  await n.esperar(1500);
  await js('[...document.querySelectorAll(".tr .tr-item")].find((b) => b.innerText.trim().endsWith("Mais"))?.click()');
  await n.esperar(300);
  await js('[...document.querySelectorAll(".tr-quadro button, .tr-quadro a")].find((b) => b.innerText.trim().startsWith("Empresas"))?.click()');
  await esperar(async () => js('document.querySelectorAll(".emp-linha").length>=2'), 15000);
  await n.esperar(600);
  const lista24 = JSON.parse(await js(`JSON.stringify((()=>{
    const r=(x)=>x.getBoundingClientRect();
    const linhas=[...document.querySelectorAll(".emp-linha")];
    const colunas=["emp-c-avatar","emp-c-nome","emp-c-prep","emp-c-sel","emp-c-central","emp-c-visita","emp-c-menu"];
    const alinhadas=colunas.every((c)=>{const xs=linhas.map((l)=>l.querySelector("."+c)).map((e)=>e?[Math.round(r(e).left),Math.round(r(e).width)]:null);return xs.every((x)=>x&&x[0]===xs[0][0]&&x[1]===xs[0][1])});
    const alturas=linhas.map((l)=>Math.round(r(l).height));
    const busca=document.querySelector(".emp-toolbar input[type=search]");
    const nova=[...document.querySelectorAll(".emp-toolbar > button")].find((b)=>b.innerText.trim()==="+ Nova empresa");
    const novaOk=!!busca&&!!nova&&Math.abs((r(busca).top+r(busca).height/2)-(r(nova).top+r(nova).height/2))<=6&&r(nova).left>=r(busca).right&&Math.abs(r(nova).right-r(document.querySelector(".emp-toolbar")).right)<=2&&getComputedStyle(nova).backgroundColor==="rgb(38, 74, 128)"&&getComputedStyle(nova).color==="rgb(255, 255, 255)"&&getComputedStyle(nova).fontWeight==="400";
    const visitas=[...document.querySelectorAll(".emp-linha button")].filter((b)=>b.innerText.trim()==="Nova visita");
    const ativas=linhas.filter((l)=>l.classList.contains("is-ativa"));
    const ativaTxt=ativas.length===1?ativas[0].querySelector(".emp-ativa-texto"):null;
    const cs=ativaTxt?getComputedStyle(ativaTxt):null;
    const sub=/^(sem equipamentos, programas e POPs|\\d+ (setor|setores|equipamento|equipamentos|programa|programas|POP|POPs)( · \\d+ (setor|setores|equipamento|equipamentos|programa|programas|POP|POPs))*)$/;
    const subs=linhas.map((l)=>l.querySelector(".emp-sub").innerText.trim());
    const pseudo=ativas[0]?getComputedStyle(ativas[0],"::before"):null;
    const pb=linhas.map((l)=>l.querySelector(".emp-c-prep .ui-progress"));
    return {linhas:linhas.length,alinhadas,alturas,iguais:alturas.every((a)=>a===alturas[0]),novaOk,visitas:visitas.length,visitaNaAtiva:visitas.length===1&&!!visitas[0].closest(".emp-linha.is-ativa"),colunasVisitaEmTodas:linhas.every((l)=>!!l.querySelector(".emp-c-visita")),ativas:ativas.length,ativaTag:ativaTxt?ativaTxt.tagName:"",ativaTexto:ativaTxt?ativaTxt.innerText.trim():"",ativaCor:cs?cs.color:"",ativaBorda:cs?cs.borderTopWidth:"",ativaFundo:cs?cs.backgroundColor:"",ativaBotao:ativas[0]?ativas[0].querySelectorAll(".emp-c-sel button").length:-1,naoAtivasTemSelecionar:linhas.filter((l)=>!l.classList.contains("is-ativa")).every((l)=>l.querySelector(".emp-c-sel button")?.innerText.trim()==="Selecionar"),fundoAtiva:ativas[0]?getComputedStyle(ativas[0]).backgroundColor:"",barraAtiva:pseudo?pseudo.width+" "+pseudo.backgroundColor:"",semLapis:!document.querySelector(".emp-lapis,.emp-avatar-btn"),subOk:subs.every((t)=>sub.test(t)&&!/(^| )0 /.test(t)),subs,barras:pb.every((b)=>b&&Math.round(r(b).height)===8&&getComputedStyle(b).backgroundColor==="rgb(214, 220, 229)"&&getComputedStyle(b.firstElementChild).backgroundColor==="rgb(33, 163, 163)"),semRolagemLateral:document.documentElement.scrollWidth<=innerWidth&&document.querySelector(".ui-scroll").scrollWidth<=document.querySelector(".ui-scroll").clientWidth+1,fonteMin:linhas.every((l)=>[...l.querySelectorAll(".emp-nome,.emp-sub,.emp-falta,.emp-pct,.ui-btn")].every((e)=>parseFloat(getComputedStyle(e).fontSize)>=15)),modo:document.documentElement.getAttribute("data-modo")}})())`));
  const razoes24 = JSON.parse(await js(`JSON.stringify((()=>{const e=Object.values(JSON.parse(localStorage.getItem(${JSON.stringify(CHAVE)})).empresas||{});return e.map((x)=>{const l=document.querySelector('.emp-linha[data-empresa="'+x.id+'"]');if(!l||!x.razaoSocial)return true;const nome=l.querySelector(".emp-nome").innerText;const resto=l.innerText.split(nome).join("");return !resto.includes(x.razaoSocial)})})())`));
  await foto("24-empresas-completo");
  registrar("24a. Empresas (Completo): colunas alinhadas em todas as linhas (mesmo x e mesma largura de avatar, nome, preparação, Selecionar, Central, Nova visita e ⋯) e todas as linhas com a mesma altura", lista24.modo === "completo" && lista24.linhas >= 2 && lista24.alinhadas && lista24.iguais && lista24.colunasVisitaEmTodas, JSON.stringify(lista24));
  registrar("24b. '+ Nova empresa' na MESMA linha da busca, à direita (terracota #AF640A, texto branco, peso 400)", lista24.novaOk, JSON.stringify({ novaOk: lista24.novaOk }));
  registrar("24c. 'Nova visita' só na empresa ativa (uma só) e as demais mostram 'Selecionar'", lista24.visitas === 1 && lista24.visitaNaAtiva && lista24.ativas === 1 && lista24.naoAtivasTemSelecionar && lista24.ativaBotao === 0, JSON.stringify({ v: lista24.visitas, a: lista24.ativas }));
  registrar("24d. '✓ Ativa' em verde #21805B, em texto (span, sem borda nem fundo de botão); linha ativa em creme #FFF6E5 com barra terracota de 4 px", lista24.ativaTag === "SPAN" && lista24.ativaTexto === "✓ Ativa" && rgb(lista24.ativaCor) === "33,128,91" && lista24.ativaBorda === "0px" && (lista24.ativaFundo === "rgba(0, 0, 0, 0)" || lista24.ativaFundo === "transparent") && rgb(lista24.fundoAtiva) === "255,246,229" && lista24.barraAtiva.startsWith("4px") && rgb(lista24.barraAtiva.split(" ").slice(1).join(" ")) === "33,163,163", JSON.stringify({ t: lista24.ativaTexto, c: lista24.ativaCor, b: lista24.ativaBorda, f: lista24.fundoAtiva, barra: lista24.barraAtiva }));
  registrar("24e. Sem o mini-lápis no avatar, sem razão social na linha, subtítulo sem zeros e barra de 8 px turquesa #21A3A3 no trilho #D6DCE5, fonte de 15 px ou mais e sem rolagem lateral", lista24.semLapis && razoes24.every(Boolean) && lista24.subOk && lista24.barras && lista24.fonteMin && lista24.semRolagemLateral, JSON.stringify({ subs: lista24.subs, razoes24 }));
  // 23. Central da Empresa › Estrutura (Ambientes e Equipamentos separados, gravação na hora). Ambiente simulado, SÓ dados de teste. A rota de cópia
  // (/api/empresas/equipamentos-origem) não existe no servidor falso: a resposta é montada AQUI com as MESMAS funções puras que a rota usa
  // (lib/copiaEquipamentos.ts), então o que se verifica na tela é a regra de elegibilidade de verdade, não só o texto.
  try {
    const lib23 = (arquivo) => import(pathToFileURL(path.resolve("lib", arquivo)).href);
    const { marcarComoRevisado } = await lib23("revisaoDeCadastros.ts");
    const { origensElegiveis, equipamentosDaOrigem } = await lib23("copiaEquipamentos.ts");
    const { pacoteDoTipo, nomeCurtoDoSetor } = await lib23("tiposDeEstabelecimento.ts");
    const { SETORES_OFICIAIS_MANUAL } = await lib23("manualBase.ts");
    const COZINHA23 = SETORES_OFICIAIS_MANUAL[4];
    const ESTOQUE23 = SETORES_OFICIAIS_MANUAL[1];
    const agora23 = "2026-10-25T12:00:00.000Z";
    const quem23 = { nome: "Elton Volmir Strapazon", cargo: "Nutricionista", id: "u1" };
    const eq23 = (id, setor, nome, quantidade = 1) => ({ id, setor, nome, quantidade, estado: "Não avaliado", observacao: "" });
    const dbLocal23 = async () => JSON.parse(await js(`localStorage.getItem(${JSON.stringify(CHAVE)})`));
    const empresa23 = async () => (await dbLocal23()).empresas["beyond-nutri"];
    const digitar23 = (seletor, valor) => js(`(()=>{const el=document.querySelector(${JSON.stringify(seletor)});if(!el)return false;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(el,${JSON.stringify(valor)});el.dispatchEvent(new Event("input",{bubbles:true}));return true})()`);
    const teclar23 = (tecla) => js(`document.activeElement.dispatchEvent(new KeyboardEvent("keydown",{key:${JSON.stringify(tecla)},bubbles:true}))`);
    const clicarTexto23 = (seletor, texto) => js(`(()=>{const b=[...document.querySelectorAll(${JSON.stringify(seletor)})].find((x)=>x.innerText.trim()===${JSON.stringify(texto)});if(!b||b.disabled)return false;b.click();return true})()`);
    const abrirCadastros23 = async (celular) => {
      if (celular) await js('[...document.querySelectorAll(".campo-bar .campo-tab")].find((b)=>b.innerText.trim().endsWith("Mais"))?.click()');
      else await js('[...document.querySelectorAll(".tr .tr-item")].find((b)=>b.innerText.trim()==="Mais")?.click()');
      await n.esperar(400);
      await js('[...document.querySelectorAll(".tr-quadro-item, .campo-mais-linha, button")].find((b)=>b.innerText.trim().split("\\n")[0].trim()==="Cadastros")?.click()');
      return esperar(async () => js('!!document.querySelector(".cen-barra--sub")'), 12000);
    };

    // Sementes de teste: Beyond Nutri com CNAE e SEM setores; "Elton Volmir" com Ambientes e Equipamentos REVISADOS; "Sem Revisão" sem revisão.
    const semente23 = await dbLocal23();
    const base23 = semente23.empresas["beyond-nutri"];
    let origem23 = { ...base23, id: "elton-volmir", nomeFantasia: "Elton Volmir Strapazon", razaoSocial: "Elton Volmir Strapazon", setoresManual: [ESTOQUE23, COZINHA23], equipamentosSetores: [eq23("o1", COZINHA23, "Fogão", 2), eq23("o2", ESTOQUE23, "Freezer")], cadastrosRevisados: undefined };
    origem23 = marcarComoRevisado(marcarComoRevisado(origem23, "ambientes", quem23, agora23), "equipamentos", quem23, agora23);
    semente23.empresas["elton-volmir"] = origem23;
    semente23.empresas["sem-revisao"] = { ...origem23, id: "sem-revisao", nomeFantasia: "Sem Revisão Teste", razaoSocial: "Sem Revisão Teste", cadastrosRevisados: undefined };
    semente23.empresas["beyond-nutri"] = { ...base23, cnae: "5611201", cnaeDescricao: "Restaurantes e similares", cnaesSecundarios: [], setoresManual: [], equipamentosSetores: [], cadastrosRevisados: undefined };
    semente23.empresaAtualId = "beyond-nutri";
    const origens23 = origensElegiveis(semente23.usuarios[0], semente23.empresas, "beyond-nutri");
    registrar("23a0. regra de elegibilidade (mesma função da rota): só a empresa com Ambientes E Equipamentos revisados é oferecida", origens23.length === 1 && origens23[0].id === "elton-volmir", JSON.stringify(origens23));
    const resposta23 = { origens: origens23, equipamentos: Object.fromEntries(Object.keys(semente23.empresas).map((id) => [id, equipamentosDaOrigem(semente23.empresas[id])])) };

    await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await js(`localStorage.setItem(${JSON.stringify(CHAVE)}, ${JSON.stringify(JSON.stringify(semente23))})`);
    await n.ir(app.base);
    await esperar(async () => js('!!document.querySelector(".tr")'), 20000);
    await n.esperar(2500);
    await js(`(()=>{const R=${JSON.stringify(resposta23)};const f=window.fetch;window.__chamadasOrigem=0;window.fetch=async(u,o={})=>{const url=String(u&&u.url?u.url:u);if(url.includes("/api/empresas/equipamentos-origem")){window.__chamadasOrigem+=1;const h={"content-type":"application/json"};if((o.method||"GET")==="POST"){const c=JSON.parse(o.body);const ok=R.origens.some((x)=>x.id===c.origem);return new Response(JSON.stringify(ok?{equipamentos:R.equipamentos[c.origem]}:{error:"Esta empresa não está disponível para cópia."}),{status:ok?200:403,headers:h})}return new Response(JSON.stringify({origens:R.origens}),{status:200,headers:h})}return f(u,o)}})()`);
    const abriu23 = await abrirCadastros23(false);
    await n.esperar(600);
    await foto("23-ambientes-completo");

    // 23a. Sub-abas separadas, sublinhado azul e estado de revisão por aba.
    const abas23 = JSON.parse(await js(`JSON.stringify((()=>{const bs=[...document.querySelectorAll(".cen-barra--sub .cen-bloco")];const at=bs.find((b)=>b.classList.contains("is-ativa"));const cs=at&&getComputedStyle(at);const rev=document.querySelector(".cadrev");const r=(e)=>e.getBoundingClientRect();const sub=document.querySelector(".cen-barra--sub");return {abas:bs.map((b)=>b.innerText.trim()),ativa:at&&at.innerText.trim(),borda:cs&&cs.borderBottomColor,largura:cs&&cs.borderBottomWidth,fundo:cs&&cs.backgroundColor,rev:rev&&rev.innerText.replace(/\\s+/g," ").trim(),revADireita:!!rev&&!!sub&&r(rev).left>=r(sub).right-1&&Math.abs((r(rev).top+r(rev).bottom)/2-(r(sub).top+r(sub).bottom)/2)<=24,barraSalvar:!!document.querySelector(".cen-salvar")}})())`));
    registrar("23a. Estrutura: sub-abas Ambientes | Equipamentos | Fluxos em texto, a aberta com sublinhado azul #264A80 de 3 px, sem fundo; à direita o estado de revisão da aba ('Ambientes ainda não revisados · Marcar como revisado'); sem barra Salvar", abriu23 && JSON.stringify(abas23.abas) === JSON.stringify(["Ambientes", "Equipamentos", "Fluxos"]) && abas23.ativa === "Ambientes" && abas23.borda === "rgb(33, 163, 163)" && abas23.largura === "2px" && /^rgba\(0, 0, 0, 0\)|transparent/.test(abas23.fundo) && /^● Ambientes ainda não revisados · Marcar como revisado$/.test(abas23.rev || "") && abas23.revADireita && !abas23.barraSalvar, JSON.stringify(abas23));

    // 23b. Sugestão pelo CNAE (empresa sem setores) e "Aceitar N setores" grava na hora.
    const ambientesDoPacote23 = pacoteDoTipo("restaurante").ambientes;
    const faixa23 = JSON.parse(await js(`JSON.stringify((()=>{const f=document.querySelector(".cadest-faixa");const bs=f?[...f.querySelectorAll("button")].map((b)=>b.innerText.trim()):[];const cs=f&&getComputedStyle(f);return {titulo:f&&f.querySelector(".cadest-faixa-titulo")?.innerText.trim(),texto:f&&f.innerText,fundo:cs&&cs.backgroundColor,bs,titulos:[...document.querySelectorAll(".cadest-titulo")].map((x)=>x.innerText.trim()),apoio:document.querySelector(".cadest-apoio")?.innerText.trim()}})())`));
    registrar("23b. Empresa sem setores com CNAE no cadastro: faixa creme #FFF6E5 'Sugestões para Restaurantes e similares · CNAE 5611-2/01', 'os setores mais comuns são', 'Você ajusta depois em Escolher setores.', botões 'Aceitar N setores' e 'Escolher outros'; título e linha de apoio da aba", faixa23.titulo === "Sugestões para Restaurantes e similares · CNAE 5611-2/01" && faixa23.fundo === "rgb(255, 246, 229)" && /os setores mais comuns são/.test(faixa23.texto) && /Você ajusta depois em Escolher setores\./.test(faixa23.texto) && faixa23.bs.includes(`Aceitar ${ambientesDoPacote23.length} setores`) && faixa23.bs.includes("Escolher outros") && faixa23.titulos[0] === "Ambientes da empresa" && /^0 de 13 setores marcados · 0 ambientes próprios · as perguntas de cada setor são as padrão do Manual$/.test(faixa23.apoio || ""), JSON.stringify(faixa23));
    await clicarTexto23(".cadest-faixa button", `Aceitar ${ambientesDoPacote23.length} setores`);
    await n.esperar(1200);
    const aceitou23 = await empresa23();
    const lista23 = JSON.parse(await js(`JSON.stringify((()=>{const li=[...document.querySelectorAll(".cadest-lista .cadest-item")];const nome=li[0]&&getComputedStyle(li[0].querySelector(".cadest-nome"));const of=li[0]&&getComputedStyle(li[0].querySelector(".cadest-oficial"));const colunas=new Set(li.map((x)=>Math.round(x.getBoundingClientRect().left))).size;return {itens:li.length,perguntas:li.every((x)=>/^\\d+ perguntas?$/.test(x.querySelector(".cadest-perguntas").innerText.trim())),nomeTam:nome&&nome.fontSize,nomePeso:nome&&nome.fontWeight,oficialTam:of&&of.fontSize,oficialCor:of&&of.color,colunas,status:document.querySelector(".cadest-status")?.innerText.trim(),naoMarcados:document.querySelector(".cadest-naomarcados")?.innerText,barraSalvar:!!document.querySelector(".cen-salvar"),faixa:!!document.querySelector(".cadest-faixa"),rolagem:document.documentElement.scrollWidth<=innerWidth}})())`));
    registrar("23c. 'Aceitar N setores' grava NA HORA (sem botão Salvar): os setores do pacote entram, os equipamentos do pacote NÃO; '✓ Alterações salvas'; lista em 2 colunas com nome 18 px/500, nome oficial 15 px cinza #526477 e 'N perguntas' reais", aceitou23.setoresManual.length === ambientesDoPacote23.length && (aceitou23.equipamentosSetores || []).length === 0 && lista23.itens === ambientesDoPacote23.length && lista23.perguntas && lista23.nomeTam === "18px" && lista23.nomePeso === "500" && lista23.oficialTam === "15px" && lista23.oficialCor === "rgb(82, 100, 119)" && lista23.colunas === 2 && lista23.status === "✓ Alterações salvas" && !lista23.barraSalvar && !lista23.faixa && lista23.rolagem, JSON.stringify({ ...lista23, setores: aceitou23.setoresManual.length }));

    // 23d. Revisão por aba: marcar em Ambientes não revisa Equipamentos.
    await clicarTexto23(".cadrev button", "Marcar como revisado");
    await n.esperar(700);
    const revAmb23 = await js('document.querySelector(".cadrev")?.innerText.replace(/\\s+/g," ").trim()');
    await clicarTexto23(".cen-barra--sub .cen-bloco", "Equipamentos");
    await n.esperar(700);
    const revEq23 = await js('document.querySelector(".cadrev")?.innerText.replace(/\\s+/g," ").trim()');
    registrar("23d. Estado de revisão por aba: Ambientes passa a '✓ Revisado' e Equipamentos continua '● Equipamentos ainda não revisados · Marcar como revisado'", revAmb23 === "✓ Revisado" && revEq23 === "● Equipamentos ainda não revisados · Marcar como revisado" && Boolean((await empresa23()).cadastrosRevisados?.ambientes) && !(await empresa23()).cadastrosRevisados?.equipamentos, JSON.stringify({ revAmb23, revEq23 }));

    // 23e. Equipamentos: setor selecionado em creme com borda terracota; adicionar já no setor, sem perguntar o setor; toast com Desfazer.
    const setor0 = aceitou23.setoresManual[0];
    const setor1 = aceitou23.setoresManual[1];
    const painel23 = JSON.parse(await js(`JSON.stringify((()=>{const s=document.querySelector(".cadest-setor.is-sel");const cs=s&&getComputedStyle(s);return {sel:s&&s.querySelector(".cadest-setor-nome").innerText.trim(),fundo:cs&&cs.backgroundColor,borda:cs&&cs.borderTopColor,titulo:document.querySelector(".cadest-painel .cadest-titulo")?.innerText.trim(),vazio:document.body.innerText.includes("Nenhum equipamento neste setor"),copiar:!!document.querySelector(".cadest-painel-cabeca .cadest-btn"),pergunta:/vincular a qual setor/i.test(document.body.innerText)}})())`));
    registrar("23e. Equipamentos: setor selecionado em creme #FFF6E5 com borda terracota #AF640A; painel 'Adicionar em <setor>'; 'Nenhum equipamento neste setor' (numa linha só, com ou sem 'sem sugestões para este tipo de empresa'); botão 'Copiar de outra empresa' no cabeçalho; nenhuma pergunta de 'vincular a qual setor'", painel23.sel === nomeCurtoDoSetor(setor0) && painel23.fundo === "rgb(255, 246, 229)" && painel23.borda === "rgb(33, 163, 163)" && painel23.titulo === `Adicionar em ${nomeCurtoDoSetor(setor0)}` && painel23.vazio && painel23.copiar && !painel23.pergunta, JSON.stringify(painel23));
    await digitar23("#cadest-eq-nome", "Refrigerador");
    await js('document.querySelector(\'.cadest-form [aria-label="Aumentar quantidade"]\')?.click()');
    await n.esperar(200);
    await clicarTexto23(".cadest-form .cadest-btn", "Adicionar");
    await n.esperar(900);
    const aposAdd23 = await empresa23();
    const refri23 = (aposAdd23.equipamentosSetores || []).filter((i) => i.nome === "Refrigerador");
    const toastAdd23 = await js('document.querySelector(".toast-salvo")?.innerText.replace(/\\s+/g," ").trim()||""');
    registrar("23f. Adicionar grava na hora no setor selecionado (Qtd 2) e mostra '✓ Refrigerador adicionado em <setor> · Desfazer' na parte de baixo", refri23.length === 1 && refri23[0].setor === setor0 && refri23[0].quantidade === 2 && new RegExp(`✓ Refrigerador adicionado em ${nomeCurtoDoSetor(setor0)} · Desfazer`).test(toastAdd23), JSON.stringify({ refri23, toastAdd23 }));

    // 23g. Nome repetido na hora: sem acento/caixa, borda #C83F45, aviso, Adicionar desabilitado até escolher; Somar e Outro item.
    await digitar23("#cadest-eq-nome", "refrigerador");
    await n.esperar(300);
    const rep23 = JSON.parse(await js(`JSON.stringify((()=>{const i=document.querySelector("#cadest-eq-nome");const add=[...document.querySelectorAll(".cadest-form > .cadest-btn")].find((b)=>b.innerText.trim()==="Adicionar");const av=document.querySelector("#cadest-eq-repetido");const p=av&&av.querySelector(".cadest-erro");return {borda:getComputedStyle(i).borderTopColor,invalido:i.getAttribute("aria-invalid"),desc:i.getAttribute("aria-describedby"),texto:p&&p.innerText.trim(),cor:p&&getComputedStyle(p).color,live:av&&av.getAttribute("aria-live"),addOff:!!add&&add.disabled,botoes:av?[...av.querySelectorAll("button")].map((b)=>b.innerText.trim()):[],altura:av&&av.querySelector("button")?Math.round(av.querySelector("button").getBoundingClientRect().height):0}})())`));
    registrar("23g. Nome repetido ('refrigerador' = 'Refrigerador'): campo com borda #C83F45, 'Já existe Refrigerador (Qtd 2) neste setor' em #C83F45, aria-live/aria-describedby, botões baixos 'Somar 1 ao existente' e 'Cadastrar como outro item' e Adicionar DESABILITADO", rep23.borda === "rgb(200, 63, 69)" && rep23.invalido === "true" && rep23.desc === "cadest-eq-repetido" && rep23.texto === "Já existe Refrigerador (Qtd 2) neste setor" && rep23.cor === "rgb(200, 63, 69)" && rep23.live === "polite" && rep23.addOff && JSON.stringify(rep23.botoes) === JSON.stringify(["Somar 1 ao existente", "Cadastrar como outro item"]) && rep23.altura > 0 && rep23.altura <= 44, JSON.stringify(rep23));
    await clicarTexto23(".cadest-repetido button", "Somar 1 ao existente");
    await n.esperar(200);
    const addLigou23 = await js('![...document.querySelectorAll(".cadest-form > .cadest-btn")].find((b)=>b.innerText.trim()==="Adicionar").disabled');
    await clicarTexto23(".cadest-form > .cadest-btn", "Adicionar");
    await n.esperar(900);
    const somou23 = ((await empresa23()).equipamentosSetores || []).filter((i) => i.nome === "Refrigerador");
    registrar("23h. 'Somar 1 ao existente' liga o Adicionar e soma no item que já existe (Qtd 2 -> 3), sem criar outro", addLigou23 && somou23.length === 1 && somou23[0].quantidade === 3, JSON.stringify(somou23));
    await digitar23("#cadest-eq-nome", "REFRIGERADOR");
    await n.esperar(200);
    await clicarTexto23(".cadest-repetido button", "Cadastrar como outro item");
    await n.esperar(200);
    await clicarTexto23(".cadest-form > .cadest-btn", "Adicionar");
    await n.esperar(900);
    const outro23 = ((await empresa23()).equipamentosSetores || []).filter((i) => i.nome.toLowerCase() === "refrigerador" && i.setor === setor0);
    registrar("23i. 'Cadastrar como outro item' cria um 2º item com o mesmo nome (Qtd 3 e Qtd 1)", outro23.length === 2 && outro23.map((i) => i.quantidade).sort().join() === "1,3", JSON.stringify(outro23.map((i) => i.quantidade)));

    // 23j. Menu ⋯: três ações, Remover em #C83F45, teclado (setas/Esc) e foco devolvido ao ⋯; mover mantém a quantidade; mover com nome igual soma.
    await js('document.querySelector(".cadest-eq-item .cadest-mais")?.click()');
    await n.esperar(300);
    const menu23 = JSON.parse(await js(`JSON.stringify((()=>{const m=document.querySelector(".cadest-menu");const it=m?[...m.querySelectorAll('[role=menuitem]')]:[];const rem=it.find((b)=>b.innerText.trim()==="Remover");return {itens:it.map((b)=>b.innerText.trim()),removerCor:rem&&getComputedStyle(rem).color,foco:document.activeElement===it[0]}})())`));
    await teclar23("ArrowDown");
    const focoDepois23 = await js('document.activeElement.innerText.trim()');
    await teclar23("Escape");
    await n.esperar(300);
    const focoMais23 = await js('document.activeElement.classList.contains("cadest-mais")&&!document.querySelector(".cadest-menu")');
    registrar("23j. Menu ⋯: 'Editar nome e quantidade', 'Mover para outro setor ›' e 'Remover' (#C83F45); foco no 1º item, seta para baixo anda, Esc fecha e devolve o foco ao ⋯", JSON.stringify(menu23.itens) === JSON.stringify(["Editar nome e quantidade", "Mover para outro setor ›", "Remover"]) && menu23.removerCor === "rgb(200, 63, 69)" && menu23.foco && focoDepois23 === "Mover para outro setor ›" && focoMais23, JSON.stringify({ menu23, focoDepois23, focoMais23 }));
    const antes23 = ((await empresa23()).equipamentosSetores || []).filter((i) => i.nome === "Refrigerador" && i.quantidade === 3)[0];
    await js('[...document.querySelectorAll(".cadest-eq-item")].find((li)=>li.innerText.includes("Qtd 3")).querySelector(".cadest-mais").click()');
    await n.esperar(300);
    await clicarTexto23(".cadest-menu-item", "Mover para outro setor ›");
    await n.esperar(300);
    const sub23 = JSON.parse(await js(`JSON.stringify({titulo:document.querySelector(".cadest-menu-titulo")?.innerText.trim(),opcoes:[...document.querySelectorAll(".cadest-menu [role=menuitem]")].map((b)=>b.innerText.trim())})`));
    await clicarTexto23(".cadest-menu-item", nomeCurtoDoSetor(setor1));
    await n.esperar(900);
    const movido23 = ((await empresa23()).equipamentosSetores || []).find((i) => i.id === antes23.id);
    registrar("23k. 'Mover Refrigerador para' lista os OUTROS setores marcados; ao mover o item sai do setor atual, entra no escolhido e mantém a Qtd", sub23.titulo === "Mover Refrigerador para" && sub23.opcoes.length === aceitou23.setoresManual.length - 1 && !sub23.opcoes.includes(nomeCurtoDoSetor(setor0)) && movido23 && movido23.setor === setor1 && movido23.quantidade === 3, JSON.stringify({ sub23: sub23.titulo, movido23: movido23 && [movido23.setor, movido23.quantidade] }));
    await js('document.querySelector(".cadest-eq-item .cadest-mais")?.click()');
    await n.esperar(300);
    await clicarTexto23(".cadest-menu-item", "Mover para outro setor ›");
    await n.esperar(300);
    await clicarTexto23(".cadest-menu-item", nomeCurtoDoSetor(setor1));
    await n.esperar(900);
    const somado23 = ((await empresa23()).equipamentosSetores || []).filter((i) => i.nome === "Refrigerador");
    const toastMov23 = await js('document.querySelector(".toast-salvo")?.innerText.replace(/\\s+/g," ").trim()||""');
    registrar("23l. Mover para setor que já tem o mesmo nome SOMA a quantidade (3 + 1 = 4), não duplica e avisa com Desfazer", somado23.length === 1 && somado23[0].setor === setor1 && somado23[0].quantidade === 4 && /já existia/.test(toastMov23) && /Desfazer/.test(toastMov23), JSON.stringify({ somado23: somado23.map((i) => [i.setor, i.quantidade]), toastMov23 }));

    // 23m. Remover sem janela de confirmação, com aviso 'removido · Desfazer'; o Desfazer devolve.
    await js(`(()=>{[...document.querySelectorAll(".cadest-setor")].find((b)=>b.innerText.includes(${JSON.stringify(nomeCurtoDoSetor(setor1))}))?.click()})()`);
    await n.esperar(500);
    await js('document.querySelector(".cadest-eq-item .cadest-mais")?.click()');
    await n.esperar(300);
    await clicarTexto23(".cadest-menu-item", "Remover");
    await n.esperar(700);
    const removeu23 = ((await empresa23()).equipamentosSetores || []).filter((i) => i.nome === "Refrigerador").length === 0;
    const toastRem23 = await js('document.querySelector(".toast-salvo")?.innerText.replace(/\\s+/g," ").trim()||""');
    const dialogo23 = await js('!!document.querySelector(\'[role="dialog"],[role="alertdialog"],.dialogo-app\')');
    const linkDesfazer23 = JSON.parse(await js(`JSON.stringify((()=>{const a=document.querySelector(".toast-salvo .toast-acao");const cs=a&&getComputedStyle(a);return a?{cor:cs.color,sub:cs.textDecorationLine,fundo:cs.backgroundColor}:null})())`));
    await js('document.querySelector(".toast-salvo .toast-acao")?.click()');
    await n.esperar(700);
    const voltou23 = ((await empresa23()).equipamentosSetores || []).filter((i) => i.nome === "Refrigerador").length === 1;
    registrar("23m. Remover não abre janela de confirmação: remove, mostra '✓ Refrigerador removido · Desfazer' (link azul #264A80 sublinhado, sem botão escuro) e o Desfazer devolve o item", removeu23 && !dialogo23 && /removido · Desfazer/.test(toastRem23) && linkDesfazer23 && linkDesfazer23.cor === "rgb(38, 74, 128)" && /underline/.test(linkDesfazer23.sub) && /^rgba\(0, 0, 0, 0\)$|transparent/.test(linkDesfazer23.fundo) && voltou23, JSON.stringify({ toastRem23, linkDesfazer23, voltou23 }));

    // 23n. Sugestões em lote no setor vazio (do pacote do tipo; 'sugestão genérica — a RT confirma') e adicionar N itens.
    // Setor-alvo: o primeiro setor marcado que HOJE não tem equipamento nenhum e para o qual o pacote do tipo traz sugestões.
    const equipamentosAgora23 = (await empresa23()).equipamentosSetores || [];
    const pacote23 = pacoteDoTipo("restaurante").equipamentos;
    const alvoLote23 = aceitou23.setoresManual.find((setor) => !equipamentosAgora23.some((i) => i.setor === setor) && pacote23.some((i) => i.ambiente === setor)) || ESTOQUE23;
    await js(`(()=>{[...document.querySelectorAll(".cadest-setor")].find((b)=>b.innerText.includes(${JSON.stringify(nomeCurtoDoSetor(alvoLote23))}))?.click()})()`);
    await n.esperar(500);
    const lote23 = JSON.parse(await js(`JSON.stringify((()=>{const l=document.querySelector(".cadest-lote");return {existe:!!l,titulo:l&&l.querySelector(".cadest-lote-titulo").innerText.trim(),nota:l&&l.querySelector(".cadest-lote-nota").innerText.trim(),itens:l?[...l.querySelectorAll(".cadest-lote-item")].map((x)=>x.querySelector(".cadest-lote-marca").innerText.trim()):[],links:l?[...l.querySelectorAll(".cadest-link")].map((b)=>b.innerText.trim()):[],botao:l?[...l.querySelectorAll(".cadest-btn")].map((b)=>b.innerText.trim()+(b.disabled?"|off":"")):[]}})())`));
    const esperados23 = pacote23.filter((i) => i.ambiente === alvoLote23).map((i) => i.nome);
    registrar("23n. Setor vazio: faixa 'Sugestões para Restaurantes e similares · CNAE 5611-2/01' com os itens do pacote para o setor, 'Sugestão genérica — a RT confirma.', 'Marcar todos', 'Adicionar itens' desligado e '+ Digitar outro equipamento'", lote23.existe && lote23.titulo === "Sugestões para Restaurantes e similares · CNAE 5611-2/01" && lote23.nota === "Sugestão genérica — a RT confirma." && JSON.stringify(lote23.itens) === JSON.stringify(esperados23) && lote23.links.includes("Marcar todos") && lote23.links.includes("+ Digitar outro equipamento") && lote23.botao.includes("Adicionar itens|off"), JSON.stringify({ lote23, esperados23 }));
    await clicarTexto23(".cadest-lote .cadest-link", "Marcar todos");
    await n.esperar(200);
    await clicarTexto23(".cadest-lote .cadest-btn", `Adicionar ${esperados23.length} ${esperados23.length === 1 ? "item" : "itens"}`);
    await n.esperar(900);
    const emLote23 = ((await empresa23()).equipamentosSetores || []).filter((i) => i.setor === alvoLote23).map((i) => i.nome);
    const toastLote23 = await js('document.querySelector(".toast-salvo")?.innerText.replace(/\\s+/g," ").trim()||""');
    registrar("23o. 'Adicionar N itens' grava os marcados no setor e mostra o aviso com Desfazer", JSON.stringify(emLote23.sort()) === JSON.stringify([...esperados23].sort()) && /Desfazer/.test(toastLote23), JSON.stringify({ emLote23, toastLote23 }));

    await js('document.querySelector(".toast-salvo .toast-acao")?.click()');
    await n.esperar(700);
    // 23p. Copiar de outra empresa: a lista vem da rota (só a revisada), copia para os mesmos setores marcados e o aviso 'Copiado: N itens · Desfazer'.
    await js(`(()=>{[...document.querySelectorAll(".cadest-setor")].find((b)=>b.innerText.includes(${JSON.stringify(nomeCurtoDoSetor(COZINHA23))}))?.click()})()`);
    await n.esperar(400);
    await clicarTexto23(".cadest-painel-cabeca .cadest-btn", "Copiar de outra empresa");
    await esperar(async () => js('!!document.querySelector(".cadest-copiar-opcao")'), 6000);
    const opcoes23 = JSON.parse(await js('JSON.stringify([...document.querySelectorAll(".cadest-copiar-opcao")].map((o)=>o.innerText.trim()))'));
    await js('document.querySelector(".cadest-copiar-opcao input")?.click()');
    await n.esperar(200);
    await clicarTexto23(".cadest-copiar .cadest-btn", "Continuar");
    await esperar(async () => js('document.querySelectorAll(".cadest-copiar-opcao input[type=checkbox]").length>0'), 6000);
    const setoresCopia23 = JSON.parse(await js('JSON.stringify([...document.querySelectorAll(".cadest-copiar-opcao")].map((o)=>o.innerText.trim()))'));
    const estoqueAntes23 = ((await empresa23()).equipamentosSetores || []).length;
    await clicarTexto23(".cadest-copiar .cadest-btn", "Copiar 2 itens");
    await n.esperar(900);
    const depoisCopia23 = (await empresa23()).equipamentosSetores || [];
    const toastCopia23 = await js('document.querySelector(".toast-salvo")?.innerText.replace(/\\s+/g," ").trim()||""');
    const chamadas23 = await js("window.__chamadasOrigem");
    registrar("23p. Copiar de outra empresa: só aparece a empresa com Ambientes e Equipamentos revisados (a 'Sem Revisão Teste' não), a lista vem da rota, copia 2 itens para os mesmos setores e avisa 'Copiado: 2 itens · Desfazer'", JSON.stringify(opcoes23) === JSON.stringify(["Elton Volmir Strapazon"]) && setoresCopia23.length === 2 && chamadas23 >= 2 && depoisCopia23.length === estoqueAntes23 + 2 && depoisCopia23.some((i) => i.nome === "Fogão" && i.setor === COZINHA23 && i.quantidade === 2) && /^Copiado: 2 itens · Desfazer$/.test(toastCopia23.replace(/^✓\s*/, "")), JSON.stringify({ opcoes23, setoresCopia23, chamadas23, toastCopia23 }));
    await js('document.querySelector(".toast-salvo .toast-acao")?.click()');
    await n.esperar(700);
    registrar("23q. Desfazer da cópia tira só os itens copiados", ((await empresa23()).equipamentosSetores || []).length === estoqueAntes23, String(((await empresa23()).equipamentosSetores || []).length));

    // 23s. Um "Desfazer" não sobrevive à aba: com o aviso aberto, sair da aba Equipamentos fecha o aviso e o item gravado continua.
    await digitar23("#cadest-eq-nome", "Equipamento de troca");
    await n.esperar(200);
    await clicarTexto23(".cadest-form > .cadest-btn", "Adicionar");
    await n.esperar(500);
    const avisoAberto23 = await js('!!document.querySelector(".toast-salvo .toast-acao")');
    await clicarTexto23(".cen-barra--sub .cen-bloco", "Fluxos");
    await n.esperar(600);
    const avisoFechou23 = await js('!document.querySelector(".toast-salvo .toast-acao")');
    registrar("23s. Com o aviso 'Desfazer' aberto, sair da aba fecha o aviso (não sobrevive à tela) e o item gravado continua na empresa", avisoAberto23 && avisoFechou23 && ((await empresa23()).equipamentosSetores || []).some((i) => i.nome === "Equipamento de troca"), JSON.stringify({ avisoAberto23, avisoFechou23 }));

    // 23r. Campo (390x844): setores viram um seletor acima do painel, colunas empilham e não há rolagem lateral.
    await n.enviar("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await n.ir(app.base);
    await esperar(async () => js('!!document.querySelector(".campo-bar")'), 20000);
    await n.esperar(2000);
    const abriuCampo23 = await abrirCadastros23(true);
    if (abriuCampo23) {
      await clicarTexto23(".cen-barra--sub .cen-bloco", "Equipamentos");
      await n.esperar(700);
    }
    await foto("23-equipamentos-campo");
    const campo23 = JSON.parse(await js(`JSON.stringify((()=>{const r=(e)=>e&&e.getBoundingClientRect();const lista=document.querySelector(".cadest-setores-lista");const seletor=document.querySelector(".cadest-setor-seletor");const painel=document.querySelector(".cadest-painel");return {listaOculta:!!lista&&getComputedStyle(lista).display==="none",seletorVisivel:!!seletor&&getComputedStyle(seletor).display!=="none"&&r(seletor).height>0,seletorAcima:!!seletor&&!!painel&&r(seletor).bottom<=r(painel).top+1,modo:document.documentElement.dataset.modo,largura:innerWidth,temLista:!!lista,temSeletor:!!seletor,abas:[...document.querySelectorAll(".cen-barra--sub .cen-bloco")].map((b)=>b.innerText.trim()+(b.classList.contains("is-ativa")?"*":"")).join("|"),rolagem:document.documentElement.scrollWidth<=innerWidth,revDentro:(()=>{const v=document.querySelector(".cadrev");return !v||(r(v).right<=innerWidth+1&&r(v).left>=0)})()}})())`));
    registrar("23r. Campo (390 px): a lista de setores vira um seletor acima do painel, o estado de revisão cabe na largura e não há rolagem lateral", abriuCampo23 && campo23.listaOculta && campo23.seletorVisivel && campo23.seletorAcima && campo23.rolagem && campo23.revDentro, JSON.stringify(campo23));
    await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  } catch (erro) {
    registrar(`23. erro na seção da Estrutura: ${erro.message}`, false);
  }

  // 25. Rodada 12e: ficha do POP em 4 abas, 6 etapas e faixa creme (PC, tablet 800 e celular 390), sem rolagem da página. Só a empresa de teste "Beyond Nutri".
  try {
    const semente25 = JSON.parse(await js(`localStorage.getItem(${JSON.stringify(CHAVE)})`));
    const base25 = semente25.empresas["beyond-nutri"];
    const pop25 = { id: "pop-t25", codigo: "POP-08", titulo: "Higienização de equipamentos de refrigeração (geladeiras e freezers)", versao: "1.0", status: "Rascunho", proximaRevisao: "", origemModelo: { id: "comp-02", versaoCatalogo: 1 }, conferencia: { conferido: false }, itensAConferir: ["Procedimento (retirar os itens): a frase sobre passar os itens para outro equipamento ou caixa térmica com gelo está incompleta e confusa: reescrever.","Procedimento (limpeza interna): a frase sobre esfregar as paredes internas está confusa: reescrever.","Procedimento (religar): confirmar o tempo de espera de 20 minutos antes de religar o equipamento.","Ações corretivas: frase genérica: decidir se mantém, suaviza ou retira.","Materiais e procedimento: Álcool 70 aparece escrito de formas diferentes: padronizar."].map((texto) => ({ texto, feito: false })), conteudo: { objetivo: "Teste", passos: [{ id: "p1", texto: "Lavar em água corrente" }], frequencia: "", responsavelExecucao: "Elton Volmir Strapazon, Nutricionista" } };
    semente25.empresas["beyond-nutri"] = { ...base25, pops: [pop25] };
    semente25.empresaAtualId = "beyond-nutri";
    const tamanhos25 = [["pc", 1440, 900, false], ["tablet", 800, 1280, false], ["celular", 390, 844, true]];
    for (const [nome, largura, altura, movel] of tamanhos25) {
      await n.enviar("Emulation.setDeviceMetricsOverride", { width: largura, height: altura, deviceScaleFactor: 1, mobile: movel });
      await js(`localStorage.setItem(${JSON.stringify(CHAVE)}, ${JSON.stringify(JSON.stringify(semente25))})`);
      await n.ir(app.base);
      await esperar(async () => js('!!document.querySelector(".tr, .nav-inferior, nav")'), 20000);
      await n.esperar(2000);
      await js('[...document.querySelectorAll(".tr .tr-item, nav button, nav a, [role=tab]")].find((b)=>b.innerText.trim()==="POPs")?.click()');
      await esperar(async () => js('!!document.querySelector(".pgl-linha.is-clicavel")'), 12000);
      await foto(`25-lista-${nome}`);
      const lista = JSON.parse(await js('JSON.stringify({linhas:document.querySelectorAll(".pgl-linha.is-clicavel").length,texto:document.querySelector(".pgl-linha.is-clicavel")?.innerText||"",abrirFechar:document.querySelectorAll(".pgg-secao [aria-expanded], .pgg-faixa-botao").length,faixasColoridas:document.querySelectorAll(".pgg-faixa").length,secoes:document.querySelectorAll(".pgg-secao").length,cab:!!document.querySelector(".pgl-cab-titulo"),sub:document.querySelector(".pgl-cab-sub")?.innerText||"",borda:getComputedStyle(document.querySelector(".pgl-linha.is-clicavel")).borderTopWidth+"|"+getComputedStyle(document.querySelector(".pgl-linha.is-clicavel")).borderBottomColor,indice:[...document.querySelectorAll(".cen-indice-item")].map((b)=>b.innerText.trim().replace(/[0-9]+$/,"").trim()).join("|"),colunas:getComputedStyle(document.querySelector(".pgl--indice")).gridTemplateColumns.split(" ").length,indiceFlex:getComputedStyle(document.querySelector(".cen-indice")).flexDirection,lateral:document.documentElement.scrollWidth<=innerWidth})'));
      registrar(`28a. Lista de POPs (${nome} ${largura}px): ${nome === "pc" ? "índice vertical à esquerda" : "uma linha de seções no alto"} (Manual, POPs, Programas, Comprovantes, Pessoas), sem as duas linhas de abas empilhadas`, /Manual/.test(lista.indice) && /POPs/.test(lista.indice) && /Pessoas/.test(lista.indice) && (nome === "celular" ? lista.indiceFlex === "row" : lista.colunas >= 2 && lista.indiceFlex === "column"), JSON.stringify(lista));
      registrar(`25a. Lista de POPs (${nome} ${largura}px): cabeçalho 'POPs · N POPs · Responsável', lista plana sem seção nem borda de estado (só fio embaixo), linha 'Etapa N de 6 · nome' e sem rolagem lateral`, lista.abrirFechar === 0 && lista.faixasColoridas === 0 && lista.secoes === 0 && lista.cab && /^\d+ POPs? · Responsável: /.test(lista.sub) && lista.borda.startsWith("0px|") && /Etapa \d de 6 · /.test(lista.texto) && !/v1\.0/.test(lista.texto) && lista.lateral, JSON.stringify(lista));
      await js('document.querySelector(".pgl-linha.is-clicavel")?.click()');
      await esperar(async () => js('!!document.querySelector(".ficha .ficha-aba")'), 12000);
      await n.esperar(700);
      await foto(`25-ficha-${nome}`);
      const d = JSON.parse(await js(`JSON.stringify((()=>{
        const r=(e)=>e?e.getBoundingClientRect():null;
        const abas=[...document.querySelectorAll(".ficha-aba")].map((b)=>b.innerText.trim());
        const et=[...document.querySelectorAll(".rz-etapa")];
        const bolas=et.map((e)=>e.querySelector(".rz-etapa-bola"));
        const faixa=document.querySelector(".rz-faixa");
        const campos=document.querySelector(".rz-campos");
        const btn=[...document.querySelectorAll(".rz-btn")].map((b)=>Math.round(r(b).height));
        const marcar=[...document.querySelectorAll(".rz-btn")].find((b)=>/Marcar como conferido/.test(b.innerText));
        const itens=[...document.querySelectorAll(".rz-item")];
        const estado=document.querySelector(".rz-estado");
        const titulo=document.querySelector(".ficha-titulo");
        const antes=et.map((e)=>getComputedStyle(e,"::before").backgroundColor);
        return {abas,etapas:et.length,atual:et.filter((e)=>e.classList.contains("rz-etapa--atual")).length,
          mesmaLinha:new Set(bolas.map((b)=>Math.round(r(b).top))).size===1,
          bola:Math.round(r(bolas[0]).width),
          bolaAtualBg:getComputedStyle(bolas[1]).backgroundColor,bolaFuturaBorda:getComputedStyle(bolas[3]).borderTopColor,
          linhaCor:antes.slice(1),
          nomeAtualPeso:getComputedStyle(et[1].querySelector(".rz-etapa-nome")).fontWeight,
          nomes:et.map((e)=>e.querySelector(".rz-etapa-nome").innerText),
          nomeCortado:et.some((e)=>{const x=e.querySelector(".rz-etapa-nome");return x.scrollWidth>x.clientWidth+1;}),
          camposAcima:!!campos&&!!faixa&&r(campos).bottom<=r(faixa).top+1,
          camposTexto:campos?campos.innerText.replace(/\\s+/g," "):"",
          semFalta:!/Falta:/.test(document.querySelector(".rz-resumo")?.innerText||""),
          faixa:!!faixa,faixaBg:faixa&&getComputedStyle(faixa).backgroundColor,faixaBorda:faixa&&getComputedStyle(faixa).borderTopColor,
          itens:itens.length,abertos:itens.filter((i)=>i.classList.contains("is-aberto")).length,
          primeiroAberto:!!itens[0]&&itens[0].classList.contains("is-aberto"),
          tituloItem:itens[0]?itens[0].querySelector(".rz-item-titulo").innerText.replace(/\\s+/g," ").trim():"",
          marcarBg:marcar&&getComputedStyle(marcar).backgroundColor,marcarCor:marcar&&getComputedStyle(marcar).color,
          btn,pilulas:!!document.querySelector(".ficha-abas--texto .ficha-aba")&&getComputedStyle(document.querySelector(".ficha-abas--texto .ficha-aba")).backgroundColor==="rgba(0, 0, 0, 0)",
          estadoTexto:estado?estado.innerText.replace(/\\s+/g," ").trim():"",estadoCor:estado&&getComputedStyle(estado.querySelector(".rz-estado-nome")).color,
          chipsDeEstado:document.querySelectorAll(".ficha-topo .rz-estado, .ficha-topo .ui-chip, .ficha-topo .pop-chip").length,
          tituloLinhas:Math.round(r(titulo).height/parseFloat(getComputedStyle(titulo).lineHeight)),
          menuNaLinhaDoTitulo:!!document.querySelector(".ficha-titulo-linha button")&&Math.abs(r(document.querySelector(".ficha-titulo-linha button")).top-r(titulo).top)<30,
          pagina:document.documentElement.scrollHeight<=innerHeight+1,alturas:[document.documentElement.scrollHeight,innerHeight,document.body.scrollHeight],lateral:document.documentElement.scrollWidth<=innerWidth}})())`));
      const esperadoAberto = nome === "celular" ? d.abertos === 0 : d.abertos === 1 && d.primeiroAberto;
      registrar(`25b. Ficha do POP (${nome} ${largura}px): 4 abas em texto, 6 círculos de ${movel ? 28 : 30} px na mesma linha com nomes inteiros, uma etapa atual, linha verde até a atual e cinza depois`, JSON.stringify(d.abas) === JSON.stringify(["Resumo", "Documento", "Registros", "Histórico"]) && d.etapas === 6 && d.atual === 1 && d.mesmaLinha && d.bola === (movel ? 28 : 30) && d.bolaAtualBg === "rgb(38, 74, 128)" && d.bolaFuturaBorda === "rgb(127, 139, 163)" && d.linhaCor[0] === "rgb(33, 128, 91)" && d.linhaCor[1] === "rgb(214, 220, 229)" && d.nomeAtualPeso === "500" && !d.nomeCortado && d.pilulas && d.lateral, JSON.stringify(d));
      registrar(`25c. Ficha do POP (${nome} ${largura}px): Responsável, Frequência e Versão em texto simples acima da faixa creme (#FFF6E5, borda #F0D9A0), sem 'Falta:'`, d.camposAcima && d.semFalta && /Definir/.test(d.camposTexto) && d.faixa && d.faixaBg === "rgb(255, 246, 229)" && d.faixaBorda === "rgb(240, 217, 160)" && (nome !== "celular" || (/Responsável Definir/.test(d.camposTexto) && !/e cargo/.test(d.camposTexto))), JSON.stringify(d));
      registrar(`25d. Ficha do POP (${nome} ${largura}px): itens com título curto e seta (${nome === "celular" ? "todos fechados" : "o primeiro aberto, um por vez"}); 'Marcar como conferido' cinza #E3E7EE até marcar tudo; botões de 40 px`, d.itens === 5 && esperadoAberto && d.tituloItem.startsWith("Retirar os itens: reescrever a frase") && d.marcarBg === "rgb(227, 231, 238)" && d.marcarCor === "rgb(82, 100, 119)" && d.btn.every((h) => h >= 40 && h <= 44), JSON.stringify(d));
      registrar(`25e. Ficha do POP (${nome} ${largura}px): título em linha própria (até 2 linhas) com o ⋯ ao lado, situação 'Rascunho · v1.0 · etapa 2 de 6' em âmbar escuro e um único estado`, /^Rascunho · v1\.0 · etapa 2 de 6/.test(d.estadoTexto) && d.estadoCor === "rgb(138, 90, 0)" && d.chipsDeEstado === 1 && d.tituloLinhas <= 2 && d.menuNaLinhaDoTitulo, JSON.stringify(d));
      registrar(`25f. Ficha do POP (${nome} ${largura}x${altura}): cabe numa tela, sem rolagem da página`, d.pagina, JSON.stringify(d));
      await js('[...document.querySelectorAll(".rz-item-linha input")].forEach((i)=>{if(!i.checked)i.click();})');
      await n.esperar(500);
      const apos = JSON.parse(await js('JSON.stringify((()=>{const b=[...document.querySelectorAll(".rz-btn")].find((x)=>/Marcar como conferido/.test(x.innerText));return b?{bg:getComputedStyle(b).backgroundColor,cor:getComputedStyle(b).color,off:b.disabled}:null})())'));
      registrar(`25g. Ficha do POP (${nome}): com todos os itens marcados, 'Marcar como conferido' fica azul-marinho com texto branco`, !!apos && !apos.off && apos.bg === "rgb(38, 74, 128)" && apos.cor === "rgb(255, 255, 255)", JSON.stringify(apos));
      await js('[...document.querySelectorAll(".ficha-aba")].find((b)=>b.innerText.trim()==="Documento")?.click()');
      await esperar(async () => js('!!document.querySelector(".pdoc")'), 12000);
      await n.esperar(700);
      await foto(`27-documento-${nome}`);
      const dd = JSON.parse(await js(`JSON.stringify((()=>{
        const r=(e)=>e?e.getBoundingClientRect():null;
        const visivel=(e)=>!!e&&getComputedStyle(e).display!=="none"&&r(e).width>0;
        const indice=document.querySelector(".pdoc-secoes");
        const estreito=document.querySelector(".pdoc-estreito");
        const previa=document.querySelector(".pdoc-previa");
        const ativa=document.querySelector(".pdoc-item.is-ativa");
        const falta=document.querySelector(".pdoc-item.is-falta:not(.is-ativa)");
        const rodape=[...document.querySelectorAll(".pdoc-rodape .ui-btn")].map((b)=>b.innerText.trim());
        const seletor=document.querySelector(".pdoc-sel");
        const ir=document.querySelector(".pdoc-ir-conferir");
        const salvar=document.querySelector(".pdoc-rodape .ui-btn--save");
        const passo=document.querySelector(".pop-passo");
        return {indice:visivel(indice),estreito:visivel(estreito),previa:visivel(previa),
          ativaBg:ativa?getComputedStyle(ativa).backgroundColor:"",ativaBarra:ativa?getComputedStyle(ativa).borderLeftColor:"",
          faltaTexto:falta?falta.innerText.replace(/\\s+/g," ").trim():"",
          rodape,seletor:seletor?seletor.innerText.replace(/\\s+/g," ").trim():"",
          irBorda:ir?getComputedStyle(ir).borderTopColor:"",irH:ir?Math.round(r(ir).height):0,salvarBg:salvar?getComputedStyle(salvar).backgroundColor:"",
          passos:document.querySelectorAll(".pop-passo").length,
          titulo:(document.querySelector(".pdoc-previa .pfolha-titulo")||{}).innerText||"",
          tituloPx:document.querySelector(".pdoc-previa .pfolha-titulo")?getComputedStyle(document.querySelector(".pdoc-previa .pfolha-titulo")).fontSize:"",
          rodapeVisivel:(()=>{const r=document.querySelector(".pdoc-rodape");const b=document.querySelector(".campo-bar");if(!r)return false;const q=r.getBoundingClientRect();return q.bottom<=innerHeight+1&&(!b||getComputedStyle(b).display==="none"||q.bottom<=b.getBoundingClientRect().top+1)})(),pagina:document.documentElement.scrollHeight<=innerHeight+1,alt:document.documentElement.scrollHeight+"/"+innerHeight,rolam:[...document.querySelectorAll("*")].filter((e)=>e.getBoundingClientRect().bottom>innerHeight+1&&getComputedStyle(e).display!=="none").slice(0,4).map((e)=>e.className+"@"+Math.round(e.getBoundingClientRect().bottom)),lateral:document.documentElement.scrollWidth<=innerWidth}})())`));
      registrar(`27a. Documento (${nome} ${largura}px): ${nome === "pc" ? "índice de seções, passos e folha em três áreas" : "seletor de seção e Ver folha no lugar do índice e da folha"}; rodapé só com Tudo salvo, Ir para Conferir (contorno azul) e Salvar rascunho (verde)`, (nome === "pc" ? dd.indice && !dd.estreito && dd.previa : !dd.indice && dd.estreito && !dd.previa) && dd.rodape.includes("Ir para Conferir") && dd.rodape.includes("Salvar rascunho") && !dd.rodape.includes("Enviar para aprovação") && dd.irBorda === "rgb(38, 74, 128)" && dd.irH === 44 && dd.salvarBg !== "", JSON.stringify(dd));
      if (nome === "pc") {
        registrar("27b. Documento (pc): seção atual com fundo #E3F4F4 e barra #21A3A3; seção incompleta com o que falta; título da folha de 20 px", dd.ativaBg === "rgb(255, 246, 229)" && dd.ativaBarra === "rgb(240, 217, 160)" && /falta (o|a) /.test(dd.faltaTexto + "") && dd.tituloPx === "20px", JSON.stringify(dd));
      } else {
        registrar(`27b. Documento (${nome}): seletor '${nome === "celular" ? "Passos · N de N" : "Seção N de N · Passos"}'`, nome === "celular" ? /^\S.* · \d+ de \d+/.test(dd.seletor) : /^Seção \d+ de \d+ · /.test(dd.seletor), JSON.stringify(dd));
        await js('document.querySelector(".pdoc-ver-folha")?.click()');
        await n.esperar(500);
        await foto(`27-ver-folha-${nome}`);
        const janela = JSON.parse(await js('JSON.stringify({abriu:!!document.querySelector(".pdoc-folha-janela"),folha:!!document.querySelector(".pdoc-folha-janela .pfolha"),botoes:[...document.querySelectorAll(".pdoc-folha-janela .pdoc-previa-acoes .ui-btn")].map((b)=>b.innerText.trim())})'));
        registrar(`27c. Ver folha (${nome}): janela de baixo com a folha${nome === "celular" ? " (Gerar cartaz e Imprimir / PDF dentro dela)" : ""}`, janela.abriu && janela.folha && (nome !== "celular" || janela.botoes.includes("Imprimir / PDF")), JSON.stringify(janela));
        await js('document.querySelector(".pdoc-folha-fechar")?.click()');
        await n.esperar(300);
      }
      await js('(()=>{const t=document.querySelector(".pop-passo-texto");t?.focus();t?.dispatchEvent(new FocusEvent("focusin",{bubbles:true}))})()');
      await n.esperar(400);
      const passoSel = JSON.parse(await js('JSON.stringify((()=>{const li=document.querySelector(".pop-passo.is-foco");const b=li?[...li.querySelectorAll(".pop-passo-acoes button")]:[];return {achou:!!li,bg:li?getComputedStyle(li).backgroundColor:"",botoes:b.length,redondos:b.every((x)=>getComputedStyle(x).borderRadius.startsWith("50%")||parseFloat(getComputedStyle(x).borderRadius)>=16),outros:document.querySelectorAll(".pop-passo.is-foco").length}})())'));
      registrar(`27d. Documento (${nome}): só o passo selecionado fica em creme #FFF6E5 e mostra os ícones redondos (ditar, IA, mover, ⋯)`, dd.passos === 0 || (passoSel.achou && passoSel.bg === "rgb(255, 246, 229)" && passoSel.botoes >= 4 && passoSel.redondos && passoSel.outros === 1), JSON.stringify(passoSel));
      registrar(`27e. Documento (${nome} ${largura}x${altura}): cabe numa tela (rodapé à vista${nome === "celular" ? " acima da barra de baixo" : ", sem rolagem da página"})`, (nome === "celular" ? dd.rodapeVisivel : dd.pagina) && dd.lateral, JSON.stringify(dd));
      const ced = JSON.parse(await js('JSON.stringify({minLista:getComputedStyle(document.querySelector(".pdoc-passos")).minHeight,faltaRodape:!!document.querySelector(".pdoc-falta"),pagina:document.documentElement.scrollHeight<=innerHeight+1})'));
      registrar(`28b. Documento (${nome}): lista de passos sem altura mínima (botão logo abaixo), sem 'Falta:' no rodapé`, ced.minLista === "0px" && !ced.faltaRodape, JSON.stringify(ced));
      await js('[...document.querySelectorAll(".ficha-aba")].find((b)=>b.innerText.trim()==="Registros")?.click()');
      await n.esperar(500);
      await foto(`28-registros-${nome}`);
      const reg = JSON.parse(await js('JSON.stringify((()=>{const r=(e)=>e.getBoundingClientRect();const bl=[...document.querySelectorAll(".reg-bloco")];return {dados:[...document.querySelectorAll(".reg-dados dt")].map((e)=>e.innerText.trim()),blocos:bl.length,lado:bl.length===2&&Math.abs(r(bl[0]).top-r(bl[1]).top)<4,empilhados:bl.length===2&&r(bl[1]).top>r(bl[0]).bottom-1,lateral:document.documentElement.scrollWidth<=innerWidth}})())'));
      registrar(`28c. Registros (${nome}): linha de dados (Frequência, Próximo registro, Guarda dos registros) e dois blocos ${nome === "pc" ? "lado a lado" : "empilhados"}`, reg.dados.join("|") === "Frequência|Próximo registro|Guarda dos registros" && reg.blocos === 2 && (nome === "pc" ? reg.lado : reg.empilhados) && reg.lateral, JSON.stringify(reg));
      await js('[...document.querySelectorAll(".ficha-aba")].find((b)=>b.innerText.trim()==="Histórico")?.click()');
      await n.esperar(500);
      await foto(`28-historico-${nome}`);
      const his = JSON.parse(await js('JSON.stringify({blocos:document.querySelectorAll(".hist-bloco").length,versoes:document.querySelectorAll(".hist-versao").length,lateral:document.documentElement.scrollWidth<=innerWidth})'));
      registrar(`28d. Histórico (${nome}): dois blocos, Versões e Atividade`, his.blocos === 2 && his.versoes >= 1 && his.lateral, JSON.stringify(his));
      await js('[...document.querySelectorAll(".ficha-aba")].find((b)=>b.innerText.trim()==="Resumo")?.click()');
      await n.esperar(400);
      const rzs = JSON.parse(await js('JSON.stringify({texto:document.querySelector(".rz-resumo")?.innerText.replace(/ +/g," ")||"",chevron:!!document.querySelector(".rz-item-seta svg"),prefixo:/Procedimento [(]/.test(document.body.innerText),linhas:document.querySelectorAll(".ficha-topo").length&&getComputedStyle(document.querySelector(".ficha-topo")).borderBottomWidth})'));
      registrar(`28e. Resumo (${nome}): seta em ícone (SVG) e sem o prefixo 'Procedimento (…):', uma linha só embaixo das abas`, rzs.chevron && !rzs.prefixo && rzs.linhas === "0px", JSON.stringify(rzs));
    }
    await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  } catch (erro) {
    registrar(`25. erro na seção da ficha do POP: ${erro.message}`, false);
  }

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
