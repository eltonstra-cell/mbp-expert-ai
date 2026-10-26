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
    const m = JSON.parse(await js(`JSON.stringify((()=>{const r=(q)=>{const e=document.querySelector(q);return e?e.getBoundingClientRect():null};const f=r(".chk-foco-rodape"),b=r(".campo-bar"),o=r(".campo-register-orb"),c=document.querySelector(".chk-foco-corpo"),topo=r(".chk-foco-topo");return {f:f&&{t:f.top,b:f.bottom},bar:b&&b.top,orb:o&&o.top,rolaPorDentro:c?getComputedStyle(c).overflowY:"",docRola:document.documentElement.scrollHeight>innerHeight+2,topoB:topo&&topo.bottom,vh:innerHeight}})())`));
    const ok = m.f && m.f.t > 0 && m.f.b <= m.bar + 0.5 && m.f.b <= m.orb + 0.5 && m.f.t > m.topoB && /auto|scroll/.test(m.rolaPorDentro);
    registrar(`8. celular ${w}x${h}: rodapé fixo à vista acima da barra e do botão Registrar, conteúdo rola por dentro`, Boolean(ok), JSON.stringify(m));
    await foto(`8-celular-${w}`);
    registrar(`8b. celular ${w}x${h}: faixa da visita (abas que rolam) e 'Finalizar visita' sempre à vista com 44 px; barra de baixo com os destinos do trilho, rótulo de 12 px e alvos de 44 px; sem rolagem horizontal`, await js(`(()=>{const fin=document.querySelector(".fv .fv-finalizar");const seg=document.querySelector(".fv-seg");const abas=[...document.querySelectorAll(".campo-bar .campo-tab, .campo-bar .campo-register")];const rot=[...document.querySelectorAll(".campo-bar .campo-tab-label")].map((x)=>x.textContent.trim());if(!fin||!seg)return false;const fr=fin.getBoundingClientRect();return fr.right<=innerWidth&&fr.left>=0&&fr.width>=44&&fr.height>=44&&getComputedStyle(seg).overflowX==="auto"&&abas.every((b)=>b.getBoundingClientRect().height>=44)&&["Início","Visitas","Correções","POPs","Relatórios","Mais"].every((x)=>rot.includes(x))&&getComputedStyle(document.querySelector(".campo-bar .campo-tab-label")).fontSize==="12px"&&document.documentElement.scrollWidth<=innerWidth+1})()`));
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
  registrar("11a. caminho 'Arquivo' com sinal: o arquivo sobe uma vez e o registro guarda o arquivo enviado", subiuArquivo && Boolean(idArquivo) && (await js(`(JSON.parse(localStorage.getItem(${JSON.stringify(CHAVE)})).evidencias||[]).some(e=>e.id===${JSON.stringify(idArquivo)}&&!!e.blobPathname)`)), idArquivo.slice(0, 8));
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

  // 13. Avanço automático: Conforme grava e abre o próximo item (aviso com Desfazer); Não conforme e observação já digitada NÃO avançam.
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
  await esperar(async () => js('!!document.querySelector(".fv")'), 15000);
  await js('document.querySelector(\'.fv .fv-item[data-chave="relatorio"]\')?.click()');
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
  registrar("16a. Trilho azul de 104 px, página atual em âmbar", await js(`(()=>{const m=document.querySelector(".tr");const a=document.querySelector(".tr .tr-ladrilho.is-ativo");if(!m||!a)return false;return Math.round(m.getBoundingClientRect().width)===104&&getComputedStyle(m).backgroundColor==="rgb(46, 91, 214)"&&getComputedStyle(a).backgroundColor==="rgb(175, 100, 10)"})()`));
  registrar("16b. Menu: 'Mais' guarda Empresas, Cadastros, Ajuda e guias e Administração", await js(`(()=>{const b=[...document.querySelectorAll(".tr .tr-item")].find((x)=>x.innerText.trim().endsWith("Mais"));if(!b)return false;b.click();return true})()`) && await js(`(()=>{const t=document.querySelector(".tr-quadro")?.innerText||"";return ["Empresas","Cadastros","Ajuda e guias","Administração"].every((x)=>t.includes(x))})()`));
  await js('window.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape"}))');
  registrar("16c. Início: 'Olá', cartões do 'Continuar de onde parei' com anel de progresso e 'Continuar →' azul, correções com faixa e etiqueta", await js(`(()=>{const t=document.querySelector(".ini3").innerText;const c=document.querySelector(".ini3-cartao");const botao=c&&c.querySelector(".ini3-botao");const anel=c&&c.querySelector(".ini3-anel circle:nth-child(2)");return t.includes("Olá,")&&t.includes("CONTINUAR DE ONDE PARAREI")&&!!c&&!!anel&&getComputedStyle(botao).backgroundColor==="rgb(43, 84, 207)"&&getComputedStyle(anel).stroke==="rgb(175, 100, 10)"&&getComputedStyle(c).backgroundColor==="rgb(255, 248, 234)"&&document.querySelectorAll(".ini3-linha").length>=1&&!!document.querySelector(".ini3-tag")})()`));
  registrar("16d. Início sem rolagem de página (a lista rola por dentro)", await js('document.scrollingElement.scrollHeight<=innerHeight+2&&document.querySelector(".pc-offset").scrollHeight<=innerHeight+2'));
  await js('[...document.querySelectorAll(".tr .tr-item")].find((b) => b.innerText.trim().endsWith("Visitas"))?.click()');
  await esperar(async () => js('!!document.querySelector(".vis-linha")'), 15000);
  await n.esperar(500);
  await foto("16-visitas");
  registrar("16e. Visitas: nenhuma caixa laranja de ação; ações em azul #2B54CF com texto branco", await js(`(()=>{const laranja=${ehLaranja};const botoes=[...document.querySelectorAll('.ui-screen[aria-label="Visitas técnicas"] button')];const bg=botoes.map((b)=>getComputedStyle(b).backgroundColor);const nenhumaLaranja=bg.every((c)=>!laranja(c));const continuar=[...botoes].find((b)=>b.innerText.includes("Continuar"));const nova=[...botoes].find((b)=>b.innerText.includes("Nova visita"));return nenhumaLaranja&&!!continuar&&getComputedStyle(continuar).backgroundColor==="rgb(43, 84, 207)"&&getComputedStyle(nova).backgroundColor==="rgb(43, 84, 207)"&&getComputedStyle(nova).color==="rgb(255, 255, 255)"&&getComputedStyle(nova).height==="40px"})()`));
  registrar("16f. Visitas: chip 'Aberta há N dias' azul claro com texto preto; NC em vermelho; barra azul", await js(`(()=>{const chip=document.querySelector(".vis-aviso-terra");const nc=document.querySelector(".vis-conta--nc");const fill=document.querySelector(".ui-progress-fill");if(!chip||!nc||!fill)return false;return getComputedStyle(chip).backgroundColor==="rgb(220, 235, 251)"&&getComputedStyle(chip).color==="rgb(27, 36, 51)"&&getComputedStyle(chip).fontWeight==="400"&&getComputedStyle(fill).backgroundColor==="rgb(43, 84, 207)"&&(nc.classList.contains("is-zero")||getComputedStyle(nc).color==="rgb(201, 71, 63)")})()`));
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
  await esperar(async () => js('!!document.querySelector(".fv")'), 15000);
  await n.esperar(500);
  await foto("17-faixa-da-visita");
  registrar("17c. Dentro da visita o trilho é o mesmo (sem cartão 'Visita atual', sem Finalizar/Sair) e 'Visitas' fica como página atual", await js(`(()=>{const t=document.querySelector(".tr");const rot=${rotulosDoTrilho};const atual=t.querySelector(".tr-item.is-atual .tr-rotulo")?.textContent.trim();return ["Registrar","Início","Visitas","Correções","POPs","Relatórios","Mais"].every((x)=>rot.includes(x))&&!rot.includes("Finalizar")&&!rot.includes("Sair")&&!t.querySelector(".tr-visita")&&atual==="Visitas"&&getComputedStyle(t.querySelector(".tr-ladrilho.is-ativo")).backgroundColor==="rgb(175, 100, 10)"&&t.scrollHeight<=t.clientHeight+1})()`));
  registrar("17d. Faixa da visita: Checklist, Evidências, Correções (número), POPs, Relatório e 'Finalizar visita' verde de 40 px; 44 px de altura, 16 px abaixo do topo", await js(`(()=>{const f=document.querySelector(".fv");if(!f)return false;const rot=[...f.querySelectorAll(".fv-item")].map((x)=>x.childNodes[0].textContent.trim());const fin=f.querySelector(".fv-finalizar");const seg=f.querySelector(".fv-seg");return ["Checklist","Evidências","Correções","POPs","Relatório"].every((x)=>rot.includes(x))&&!!f.querySelector('.fv-item[data-chave="correcoes"] .fv-badge')&&!!fin&&getComputedStyle(fin).backgroundColor==="rgb(46, 139, 87)"&&Math.round(fin.getBoundingClientRect().height)===40&&getComputedStyle(seg).backgroundColor==="rgb(238, 241, 247)"&&Math.round(f.getBoundingClientRect().height)>=44})()`));
  await noFaixa("correcoes");
  await esperar(async () => js('!!document.querySelector(".pc-cor .pc-detail--corr")'), 15000);
  await n.esperar(500);
  await foto("17-correcoes");
  registrar("17e. Troca de assunto pela faixa: Correções da visita abre, a faixa continua e o segmento atual fica branco", await js(`(()=>{const at=document.querySelector(".fv .fv-item.is-atual");return !!at&&at.getAttribute("data-chave")==="correcoes"&&getComputedStyle(at).backgroundColor==="rgb(255, 255, 255)"&&document.querySelector(".tr-item.is-atual .tr-rotulo")?.textContent.trim()==="Visitas"})()`));
  registrar("17f. Correções: etapas em texto com contagem, sem título repetido, lista de cartões com rodapé fixo e página sem rolagem", await js(`(()=>{const e=[...document.querySelectorAll(".pc-cor .pc-etapa")].map((x)=>x.innerText.replace(/\\s+/g," ").trim());const visivel=[...document.querySelectorAll(".pc-cor h1")].every((h)=>getComputedStyle(h).position==="absolute");return e.length===4&&/^Identificadas \\d+$/.test(e[0])&&visivel&&!!document.querySelector(".pc-cor .pc-cor-card")&&!!document.querySelector(".pc-cor .pc-cor-rodape")&&document.scrollingElement.scrollHeight<=innerHeight+2})()`));
  registrar("17g0. Correções: ao abrir, o campo do responsável já mostra o erro 'Escolha o responsável' (região aria-live com 20 px reservados), o rodapé diz 'Falta: …' e não há erro de prazo", await js(`(()=>{const erro=document.querySelector(".pc-cor .pc-resp-erro");const foot=document.querySelector(".pc-cor .pc-detail-foot");return !!erro&&erro.getAttribute("aria-live")==="polite"&&erro.textContent.trim()==="Escolha o responsável"&&Math.round(erro.getBoundingClientRect().height)>=20&&/^Falta: /.test(foot.innerText.trim())&&!document.querySelector(".pc-cor .pc-prazo-erro")&&!document.querySelector(".pc-cor .pc-prazo-aviso")})()`));
  // resultadoDosChecks é declarado mais abaixo (const): aqui a lista de medidas é avaliada na hora e cada uma tem nome.
  {
    const m17g = JSON.parse(await js(`(()=>{const campo=document.querySelector(".pc-cor .pc-resp-seletor");const erro=document.querySelector(".pc-cor .pc-resp-erro");const salvar=[...document.querySelectorAll(".pc-cor .pc-detail-foot button")].find((b)=>b.innerText.includes("Salvar plano"));const lum=(c)=>{const v=c.match(/[0-9.]+/g).slice(0,3).map(Number).map((x)=>{x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4)});return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2]};const a=lum(getComputedStyle(erro).color),b=lum(getComputedStyle(erro.closest(".pc-detail-lateral")).backgroundColor);return JSON.stringify({campo:!!campo,erroTexto:erro.textContent.trim()==="Escolha o responsável",contraste:(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)>=4.5,aria:erro.getAttribute("aria-live")==="polite",abaixo:erro.getBoundingClientRect().top>=campo.getBoundingClientRect().bottom-1,borda:getComputedStyle(campo).borderTopColor,texto:campo.innerText.replace(/\\s+/g," ").trim(),describedby:campo.getAttribute("aria-describedby")===erro.id,desabilitado:!!salvar&&salvar.disabled})})()`));
    registrar("17g. Correções: responsável vazio (depois do primeiro toque) com o erro 'Escolha o responsável' em vermelho (contraste >= 4,5:1 sobre #F4F6FA, aria-live) logo abaixo do campo único, borda vermelha #B83A33 e nenhuma pessoa escolhida; 'Salvar plano' desabilitado", m17g.campo && m17g.erroTexto && m17g.contraste && m17g.aria && m17g.abaixo && m17g.borda === "rgb(184, 58, 51)" && m17g.texto === "Escolha uma pessoa ▾" && m17g.describedby && m17g.desabilitado, JSON.stringify(m17g));
  }
  const medirSobreposicao = `(()=>{try{const raiz=document.querySelector(".pc-detail--corr");const corpo=raiz.querySelector(".pc-detail-corpo");const lateral=raiz.querySelector(".pc-detail-lateral");const cl=(e)=>lateral.contains(e)?lateral:corpo.contains(e)?corpo:null;const blocos=[...raiz.querySelectorAll(".pc-detail-head, .pc-detail-corpo > *, .pc-detail-lateral > *, .pc-detail-foot, .pc-plan-stack > *, .pc-provas > *, .pc-plan-resp > *")];const recorta=(b)=>{const r=b.getBoundingClientRect();const c=cl(b);if(!c||b===c)return r;const x=c.getBoundingClientRect();return {left:Math.max(r.left,x.left),right:Math.min(r.right,x.right),top:Math.max(r.top,x.top),bottom:Math.min(r.bottom,x.bottom)}};const rs=blocos.map((b)=>({b,r:recorta(b)})).filter(({r})=>r.right-r.left>0&&r.bottom-r.top>0);let pares=0;const nomes=[];for(let i=0;i<rs.length;i++)for(let j=i+1;j<rs.length;j++){const a=rs[i],c=rs[j];if(a.b.contains(c.b)||c.b.contains(a.b))continue;const x=Math.min(a.r.right,c.r.right)-Math.max(a.r.left,c.r.left);const y=Math.min(a.r.bottom,c.r.bottom)-Math.max(a.r.top,c.r.top);if(x>1&&y>1){pares++;nomes.push(a.b.className+" x "+c.b.className)}}const ar=document.querySelector(".tr-avatar").getBoundingClientRect();const pb=raiz.querySelector(".pc-provas-botoes");const foot=raiz.querySelector(".pc-detail-foot").getBoundingClientRect();const salvar=[...raiz.querySelectorAll(".pc-detail-foot button")].find((b)=>b.innerText.includes("Salvar plano"));return JSON.stringify({pares,nomes,provasBotoes:!!pb&&/\\+ Foto/.test(pb.innerText)&&/Registrar atualização/.test(pb.innerText)&&[...pb.querySelectorAll("button")].every((b)=>b.getBoundingClientRect().height>=40),corpoRola:corpo.scrollHeight>corpo.clientHeight+1,lateralRola:lateral.scrollHeight>lateral.clientHeight+1,rodapeVisivel:foot.bottom<=innerHeight+0.5&&salvar.getBoundingClientRect().bottom<=innerHeight+0.5,avatarDentro:ar.bottom<=innerHeight&&ar.top>=0,trRola:document.querySelector(".tr-lista").scrollHeight>document.querySelector(".tr-lista").clientHeight+1})}catch(e){return JSON.stringify({erro:String(e.stack).slice(0,300)})}})()`;
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
  registrar("17q. Correções: respiro de 32 px à direita em 'Finalizar visita' e 'Salvar plano'; o link 'Ver no checklist ›' (quando existe) fica na linha de metadados, dentro do cabeçalho", await js(`(()=>{const fin=document.querySelector(".fv-finalizar");const salvar=[...document.querySelectorAll(".pc-cor .pc-detail-foot button")].find((b)=>b.innerText.includes("Salvar plano"));const ver=document.querySelector(".pc-cor .pc-detail-ver");const head=document.querySelector(".pc-cor .pc-detail-head").getBoundingClientRect();const direita=[fin,salvar].every((e)=>!!e&&innerWidth-e.getBoundingClientRect().right>=31.5);const verOk=!ver||(!!ver.closest(".pc-detail-contexto")&&ver.getBoundingClientRect().right<=head.right+0.5&&ver.getBoundingClientRect().bottom<=head.bottom+0.5&&/Ver no checklist/.test(ver.textContent));return direita&&verOk})()`));
  // Cada medida vira um item com nome: a falha mostra QUAL medida quebrou, não só "falso".
  const resultadoDosChecks = (json) => { const r = JSON.parse(json); const falhas = Object.entries(r).filter(([, v]) => v === false).map(([k]) => k); return [r.existe !== false && falhas.length === 0, falhas.length ? `falhou: ${falhas.join(", ")} | ${json}` : ""]; };
  registrar("17o. Correções a 1440 px: o Responsável é UM campo seletor de 42 px (combobox), sem pessoas empilhadas nem 'Outra pessoa' tracejado, com 'Escolha uma pessoa ▾' e o rótulo 'Responsável' ligado ao campo", ...resultadoDosChecks(await js(`(()=>{const q=document.querySelector(".pc-cor .pc-plan-resp");const c=q?.querySelector(".pc-resp-seletor");const rot=q?.querySelector(".pc-plan-rotulo");return JSON.stringify({existe:!!c,umSoCampo:q.querySelectorAll('.pc-resp-seletor, .pc-resp-digitar').length===1,altura42:!!c&&Math.round(c.getBoundingClientRect().height)===42,combobox:!!c&&c.getAttribute("role")==="combobox"&&c.getAttribute("aria-haspopup")==="listbox",rotuloLigado:!!c&&!!rot&&(c.getAttribute("aria-labelledby")||"").split(" ").includes(rot.id)&&rot.textContent.trim()==="Responsável",semBotoesDePessoa:!q.querySelector("[role=radio], .pc-pessoa, .pc-pessoas, datalist"),semCorte:!!c&&c.scrollWidth<=c.clientWidth+1})})()`)));
  const medirCampoDaAcao = `(()=>{const conj=document.querySelector(".pc-cor .pc-acao-conjunto");const area=document.querySelector(".pc-cor .pc-acao-area");const linha=document.querySelector(".pc-cor .pc-acao-linha");if(!conj||!area||!linha)return JSON.stringify({existe:false,conj:!!conj,area:!!area,linha:!!linha});const c=conj.getBoundingClientRect(),a=area.getBoundingClientRect(),l=linha.getBoundingClientRect();const bordas=[conj,area].filter((e)=>parseFloat(getComputedStyle(e).borderTopWidth)>0).length;const botoes=[...linha.querySelectorAll(".ui-field-tools button")];return JSON.stringify({conjuntoMin150:Math.round(c.height)>=150&&Math.round(c.height)<=156,alturaDaCaixa:Math.round(a.height),alturaDoConjunto:Math.round(c.height),borda2px:getComputedStyle(conj).borderTopWidth==="2px",corDaBorda:getComputedStyle(conj).borderTopColor==="rgb(169, 179, 201)",caixaSemBorda:getComputedStyle(area).borderTopWidth==="0px",umaBordaSo:bordas===1,barraDentro:l.top>=a.bottom-1&&l.top>=c.top&&l.bottom<=c.bottom+0.5&&l.left>=c.left&&l.right<=c.right+0.5,textosDaBarra:/Sugerir com IA/.test(linha.innerText)&&(innerWidth<1200?(()=>{const fb=linha.querySelector(".field-assist-voice");return !!fb&&fb.innerText.trim()===""&&/Falar/.test(fb.getAttribute("aria-label")||"")&&/Falar/.test(fb.title)&&fb.getBoundingClientRect().width<=44})():/Falar/.test(linha.innerText)),botoes40:botoes.length>=2&&botoes.every((b)=>Math.round(b.getBoundingClientRect().height)>=40),barraSemEstouro:linha.scrollWidth<=linha.clientWidth+1})})()`;
  registrar("17r. Correções a 1440 px: 'O que será feito' é um conjunto de UMA borda de 2 px (#A9B3C9) com no mínimo 150 px de altura (caixa vazia de 98 px) sem borda própria e a barra 'Sugerir com IA' e 'Falar' (com texto, 40 px) DENTRO da borda", ...resultadoDosChecks(await js(medirCampoDaAcao)));
  registrar("17s. Correções: bloco '3 Provas · opcional' com o número 3 só contornado (círculo de 28 px, sem fundo), botões baixos '+ Foto' e '+ Registrar atualização' de borda fraca (40 px) e SEM a antiga linha 'Acrescentar:'", ...resultadoDosChecks(await js(`(()=>{const bloco=document.querySelector(".pc-cor .pc-provas");const t=bloco?.querySelector(".pc-bloco-titulo");const n=t?.querySelector(".pc-bloco-num");const botoes=bloco?[...bloco.querySelectorAll(".pc-provas-botoes .pc-prova-botao")]:[];const raio=n?getComputedStyle(n).borderTopLeftRadius:"";return JSON.stringify({existe:!!bloco,titulo:!!t&&/^3\\s*Provas\\s*· opcional$/.test(t.innerText.replace(/\\s+/g," ").trim()),numero28:!!n&&Math.round(n.getBoundingClientRect().width)===28&&Math.round(n.getBoundingClientRect().height)===28&&(raio==="50%"||parseFloat(raio)>=14),numeroSoContorno:!!n&&getComputedStyle(n).backgroundColor==="rgba(0, 0, 0, 0)"&&parseFloat(getComputedStyle(n).borderTopWidth)>0,botoes:botoes.length===2&&/^[+] Foto$/.test(botoes[0].innerText.trim())&&/^[+] Registrar atualização$/.test(botoes[1].innerText.trim()),alvos40:botoes.length>0&&botoes.every((b)=>Math.round(b.getBoundingClientRect().height)===40),bordaFraca:botoes.every((b)=>getComputedStyle(b).borderTopWidth==="1px"&&getComputedStyle(b).borderTopColor==="rgb(201, 208, 222)"),semAcrescentar:!/Acrescentar:/.test(document.querySelector(".pc-cor .pc-detail--corr").innerText)&&!document.querySelector(".pc-cor .pc-acrescimos")})})()`)));
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1152, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
  await n.esperar(400);
  const lateral1152 = await js('Math.round(document.querySelector(".pc-cor .pc-detail-lateral").getBoundingClientRect().width)');
  registrar("17r2. Correções a 1152 px de largura: o conjunto de uma borda, de no mínimo 150 px, e a barra dentro dele continuam valendo ('Falar' vira só o ícone, com aria-label e title) e a coluna lateral tem 260 px", ...resultadoDosChecks(JSON.stringify({ ...JSON.parse(await js(medirCampoDaAcao)), lateralDe260: lateral1152 === 260 })));
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
  await n.esperar(400);
  registrar("17s2. Correções: cartão sem pino, 'item N' e seta, título em até 2 linhas, sem sobreposição; detalhe com o código NC e a Fonte na mesma linha de metadados (NC antes da Fonte)", await js(`(()=>{const cards=[...document.querySelectorAll(".pc-cor .pc-cor-card")];if(cards.length===0)return false;const t=document.querySelector(".pc-cor .pc-detail-contexto");const linhasDoTitulo=cards.every((c)=>{const ti=c.querySelector(".pc-cor-titulo");if(getComputedStyle(ti).whiteSpace==="nowrap")return false;const lh=parseFloat(getComputedStyle(ti).lineHeight)||parseFloat(getComputedStyle(ti).fontSize)*1.4;return ti.getBoundingClientRect().height<=lh*2+1});const sem=cards.every((c)=>!c.querySelector("svg")&&!c.querySelector(".pc-cor-seta, .pc-cor-pino, .pc-cor-item")&&!/item [0-9]/.test(c.innerText)&&!c.innerText.includes("›"));const semSobrepor=cards.every((c)=>{const f=[...c.children].map((e)=>e.getBoundingClientRect());return f.every((r,k)=>k===0||r.top>=f[k-1].bottom-1)&&f.every((r)=>r.bottom<=c.getBoundingClientRect().bottom+0.5)});const fonteEl=document.querySelector(".pc-cor .pc-detail-fonte");const ctx=t&&t.querySelector(".pc-detail-codigo")&&/^NC[0-9]+$/.test(t.querySelector(".pc-detail-codigo").innerText.trim())&&!!fonteEl&&t.contains(fonteEl)&&(t.querySelector(".pc-detail-codigo").compareDocumentPosition(fonteEl)&Node.DOCUMENT_POSITION_FOLLOWING)>0;const fonte=document.querySelector(".pc-cor .pc-detail-fonte");return linhasDoTitulo&&sem&&semSobrepor&&!!ctx&&!!fonte&&/Fonte/.test(fonte.innerText)})()`));
  registrar("17s3. Correções: cartões da lista em creme #FFF6E5 (sem azul-lilás) e o selecionado em terracota #AF640A com texto branco", await js(`(()=>{const cards=[...document.querySelectorAll(".pc-cor .pc-cor-card")];const sel=cards.filter((c)=>c.classList.contains("is-selected"));const outros=cards.filter((c)=>!c.classList.contains("is-selected"));return cards.length>0&&sel.length===1&&getComputedStyle(sel[0]).backgroundColor==="rgb(175, 100, 10)"&&getComputedStyle(sel[0]).color==="rgb(255, 255, 255)"&&outros.every((c)=>getComputedStyle(c).backgroundColor==="rgb(255, 246, 229)")})()`));
  registrar("17t. Topo: 'Modo de tela' só com o ícone (36 px), busca com um contorno só e foco sem segundo anel", await js(`(()=>{const chip=document.querySelector(".pc-topbar .pc-mode-chip");const barra=document.querySelector(".pc-topbar .pc-smartbar");const campo=document.querySelector(".pc-topbar .pc-busca-input");if(!chip||!barra||!campo)return false;campo.focus();const ok=Math.round(chip.getBoundingClientRect().width)===36&&chip.innerText.trim()===""&&getComputedStyle(barra).borderTopWidth==="1px"&&getComputedStyle(campo).borderTopWidth==="0px"&&getComputedStyle(campo).outlineStyle==="none"&&getComputedStyle(campo).boxShadow==="none";campo.blur();return ok})()`));
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
    const medir17z = `(()=>{try{const raiz=document.querySelector(".pc-detail--corr");const corpo=raiz.querySelector(".pc-detail-corpo");const lateral=raiz.querySelector(".pc-detail-lateral");const foot=raiz.querySelector(".pc-detail-foot");const titulo=raiz.querySelector(".pc-detail-title");const ev=corpo.querySelector('.pc-detail-secao[aria-label="Evidências"]');const conj=corpo.querySelector(".pc-acao-conjunto");const area=corpo.querySelector(".pc-acao-area");const salvar=[...foot.querySelectorAll("button")].find((b)=>b.innerText.includes("Salvar plano"));const fr=foot.getBoundingClientRect();const cr=corpo.getBoundingClientRect();const lr=lateral.getBoundingClientRect();const ue=corpo.querySelector(".pc-provas")||corpo.querySelector(".pc-detail-scroll");const ultimoEsq=ue.getBoundingClientRect();const ultimoLat=lateral.lastElementChild.getBoundingClientRect();const folga=Math.round(cr.bottom-ultimoEsq.bottom+parseFloat(getComputedStyle(ue).paddingBottom));const folgaLat=Math.round(lr.bottom-parseFloat(getComputedStyle(lateral).paddingBottom)-ultimoLat.bottom);const lh=parseFloat(getComputedStyle(titulo).lineHeight);const mini=[...ev.querySelectorAll(".ad-foto--mini")];const legenda=mini[0]?.querySelector(".ad-legenda");const botoes=[...corpo.querySelectorAll(".pc-provas-botoes .pc-prova-botao")];const txtEv=ev.innerText;return JSON.stringify({existe:!!ev,umaFoto:ev.querySelectorAll("img").length===1,legendaAntes:!!legenda&&legenda.textContent.trim()==="Antes"&&parseFloat(getComputedStyle(legenda).fontSize)>=12&&getComputedStyle(legenda).backgroundColor==="rgb(255, 255, 255)"&&getComputedStyle(legenda).color==="rgb(27, 36, 51)",semRotulosNemQuadroVazio:!/Antes · |Depois · |Sem foto/.test(txtEv)&&!ev.querySelector(".ad-vazio, .ad-coluna"),evidenciasEmUmaLinha:Math.round(ev.querySelector(".ad--pc").getBoundingClientRect().height)<=72,botoesNoBlocoDeProvas:botoes.length===2&&botoes.every((b)=>b.getBoundingClientRect().height>=40)&&!ev.querySelector(".ad-foto-mais")&&ev.closest(".pc-provas")===corpo.querySelector(".pc-provas"),tituloCompleto:titulo.getAttribute("title")===titulo.textContent&&getComputedStyle(titulo).webkitLineClamp==="2"&&parseFloat(getComputedStyle(titulo).fontSize)===23&&getComputedStyle(titulo).fontWeight==="500",titulo2Linhas:Math.round(titulo.getBoundingClientRect().height/lh)===2,semRolagemInterna:corpo.scrollHeight<=corpo.clientHeight,lateralSemRolagem:lateral.scrollHeight<=lateral.clientHeight,folgaDaLateralDe8:folgaLat>=8,rodapeVisivel:!!salvar&&fr.bottom<=innerHeight&&fr.top>=0&&salvar.getBoundingClientRect().bottom<=innerHeight,rodapeFixo:foot.parentElement===raiz&&!corpo.contains(foot)&&fr.top>=cr.bottom-1&&fr.top>=lr.bottom-1,medidas:{caixa:Math.round(area.getBoundingClientRect().height),conjunto:Math.round(conj.getBoundingClientRect().height),evidencias:Math.round(ev.getBoundingClientRect().height),titulo:Math.round(titulo.getBoundingClientRect().height),corpoScroll:corpo.scrollHeight,corpoClient:corpo.clientHeight,lateralScroll:lateral.scrollHeight,lateralClient:lateral.clientHeight,folga,folgaLat,rodapeBottom:Math.round(fr.bottom),janela:innerHeight}})}catch(e){return JSON.stringify({existe:false,erro:String(e.stack).slice(0,300)})}})()`;
    const r17z = JSON.parse(await js(medir17z));
    const sobreposicao17z = JSON.parse(await js(medirSobreposicao));
    const [ok17z, falha17z] = resultadoDosChecks(JSON.stringify({ ...r17z, semSobreposicao: sobreposicao17z.pares === 0 }));
    registrar("17z. 1440x800, correção com 1 foto e título de 2 linhas: NENHUMA das duas colunas tem rolagem interna (scrollHeight <= clientHeight), a evidência fica no bloco 3 Provas com os botões, o rodapé com 'Salvar plano' está dentro da janela e fixo, e nenhum bloco se sobrepõe", ok17z, falha17z || JSON.stringify(r17z.medidas));
    // Muitas fotos (miniaturas copiadas só na tela): a fileira rola na horizontal e nada estoura o corpo do detalhe.
    const muitas = JSON.parse(await js(`(()=>{const linha=document.querySelector(".pc-cor .ad-linha");const base=linha.querySelector(".ad-foto--mini");const corpo=document.querySelector(".pc-cor .pc-detail-corpo");const copias=Array.from({length:14},()=>base.cloneNode(true));copias.forEach((c)=>linha.insertBefore(c,base));const botao=document.querySelector(".pc-cor .pc-provas-botoes .pc-prova-botao");const fileira=document.querySelector(".pc-cor .ad--pc");const rol=fileira.querySelector(".ad-rolagem");botao.scrollIntoView({block:"nearest"});const m=botao.getBoundingClientRect();const cb=corpo.getBoundingClientRect();const rodape=document.querySelector(".pc-detail--corr .pc-detail-foot").getBoundingClientRect();const r=JSON.stringify({existe:true,medidas:{botao:[Math.round(m.left),Math.round(m.top),Math.round(m.right),Math.round(m.bottom)],corpo:[Math.round(cb.left),Math.round(cb.top),Math.round(cb.right),Math.round(cb.bottom)],scroll:corpo.scrollHeight,client:corpo.clientHeight},botaoAcimaDoRodape:m.bottom<=rodape.top+0.5&&cb.bottom<=rodape.top+1,botaoVisivel:m.width>0&&m.left>=cb.left-1&&m.right<=cb.right+1&&m.top>=cb.top-1&&m.bottom<=cb.bottom+1,botoesForaDaFileira:!fileira.querySelector(".pc-prova-botao")&&!rol.querySelector("button"),fileiraRola:rol.scrollWidth>rol.clientWidth+1,fileiraDentro:fileira.getBoundingClientRect().right<=cb.right+1,corpoSemRolagemHorizontal:corpo.scrollWidth<=corpo.clientWidth+1});copias.forEach((c)=>c.remove());corpo.scrollTop=0;return r})()`));
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
    registrar("17r3. 'O que será feito' vazio tem no mínimo 150 px (conjunto) e cresce ao digitar sem barra de rolagem interna até o limite; depois do limite rola por dentro e a barra continua dentro da borda; apagado, volta à altura mínima", vazia.conjunto >= 150 && vazia.conjunto <= 156 && cheia.caixa > vazia.caixa && !cheia.rolaPorDentro && cheia.barraDentro && limite.caixa <= 160 && limite.rolaPorDentro && limite.barraDentro && vazia.caixa === 98 && devolta.caixa === 98, JSON.stringify({ vazia, cheia, limite, devolta }));
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
const falar=linha.querySelector(".field-assist-voice");const chip=linha.querySelector(".pc-chip-funcionou");const mais=linha.querySelector(".pc-acao-mais");const chipVisivel=!!chip&&getComputedStyle(chip).visibility!=="hidden";
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
listaLargura:innerWidth<=1000||Math.abs(r(lista).width-(innerWidth>=1200?340:280))<=2,
falarConforme:!!falar&&falar.title===falar.getAttribute("aria-label")&&(innerWidth<1200?(falar.innerText.trim()===""&&/Falar/.test(falar.title)):/Falar/.test(falar.innerText)),
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
      registrar(`17aa. ${largura} px: campo único do Responsável sem corte, 'Enviar lembrete' azul de 16 px na linha do rótulo, nada sobreposto entre as duas colunas, lateral de ${largura < 1300 ? "260" : "300"} px, lista de ${largura < 1200 ? "280" : "340"} px, 'Falar' ${largura < 1200 ? "só o ícone" : "com texto"}, chip 'Ação que funcionou antes' inteiro ou em '+N sugestões'`, okN, falhaN || JSON.stringify(normal.detalhes));
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
      const l = JSON.parse(await js(`(()=>{const lat=document.querySelector(".pc-cor .pc-detail-lateral");const corpo=document.querySelector(".pc-cor .pc-detail-corpo");const foot=document.querySelector(".pc-cor .pc-detail-foot").getBoundingClientRect();const prazo=lat.querySelector(".pc-plan-prazo input").getBoundingClientRect();const cb=corpo.getBoundingClientRect();const nums=[...document.querySelectorAll(".pc-cor .pc-detail--corr .pc-bloco-num")];const azul=(e)=>getComputedStyle(e).backgroundColor==="rgb(43, 84, 207)"&&getComputedStyle(e).color==="rgb(255, 255, 255)"&&getComputedStyle(e).fontWeight==="400";const fundo=getComputedStyle(lat).backgroundColor;return JSON.stringify({existe:nums.length>=3,prazoVisivel:prazo.top>=cb.top-0.5&&prazo.bottom<=Math.min(cb.bottom,foot.top)+0.5&&prazo.left>=0&&prazo.right<=innerWidth,numeros28:nums.every((e)=>Math.round(e.getBoundingClientRect().width)===28&&Math.round(e.getBoundingClientRect().height)===28),umEDoisAzuis:nums.filter((e)=>/^[12]$/.test(e.textContent.trim())).length===2&&nums.filter((e)=>/^[12]$/.test(e.textContent.trim())).every(azul),tresSoContorno:nums.filter((e)=>e.textContent.trim()==="3").every((e)=>getComputedStyle(e).backgroundColor==="rgba(0, 0, 0, 0)"),fundoCinzaClaro:fundo==="rgb(244, 246, 250)",bordaAEsquerda:innerWidth<=1149||getComputedStyle(lat).borderLeftWidth==="1px",ordemNoEstreito:innerWidth>=1150||(()=>{const q=document.querySelector(".pc-cor .pc-detail--corr");const o=(e)=>q.querySelector(e).getBoundingClientRect().top;return o(".pc-plan-acao")<o(".pc-detail-lateral")&&o(".pc-detail-lateral")<o(".pc-provas")})(),metadadosUmaLinha:(()=>{const c=document.querySelector(".pc-cor .pc-detail-contexto");return c.getBoundingClientRect().height<=30&&c.scrollWidth<=c.clientWidth+1})(),alvos40:[...document.querySelectorAll(".pc-cor .pc-detail-ver, .pc-cor .pc-detail-pop, .pc-cor .pc-prazo-sugerido")].every((e)=>Math.round(e.getBoundingClientRect().height)>=40),barraDaAcaoUmaLinha:(()=>{const b=document.querySelector(".pc-cor .pc-acao-linha");const bs=[...b.querySelectorAll(".ui-field-tools button, .pc-acao-mais")].filter((e)=>getComputedStyle(e).visibility!=="hidden");return bs.every((e)=>Math.abs(e.getBoundingClientRect().top-bs[0].getBoundingClientRect().top)<=2)})(),provasSemQuebra:[...document.querySelectorAll(".pc-cor .pc-provas-botoes .pc-prova-botao")].every((e)=>Math.round(e.getBoundingClientRect().height)===40)})})()`));
      const [okL, falhaL] = resultadoDosChecks(JSON.stringify({ existe: m.existe && l.existe, semSobreposicao: m.semSobreposicao, larguraDaLateral: m.larguraDaLateral, dentroDaLateral: m.dentroDaLateral, prazoInteiro: m.prazoInteiro, prazoSemSobrepor: m.prazoSemSobrepor, campoSemCorte: m.pessoasSemCorte, lembreteNaLinhaDoRotulo: m.lembreteNaLinhaDoRotulo, corpoSemRolagemHorizontal: m.corpoSemRolagemHorizontal, prazoVisivel: l.prazoVisivel, ordemNoEstreito: l.ordemNoEstreito, metadadosUmaLinha: l.metadadosUmaLinha, alvos40: l.alvos40, barraDaAcaoUmaLinha: l.barraDaAcaoUmaLinha, provasSemQuebra: l.provasSemQuebra, numeros28: l.numeros28, umEDoisAzuis: l.umEDoisAzuis, tresSoContorno: l.tresSoContorno, fundoCinzaClaro: l.fundoCinzaClaro, bordaAEsquerda: l.bordaAEsquerda }));
      if (largura <= 1000) {
        const lista = JSON.parse(await js(`(()=>{const rol=document.querySelector(".pc-cor .pc-master-list > .ui-scroll")||document.querySelector(".pc-cor .pc-master-list");const rr=rol.getBoundingClientRect();const cartoes=[...document.querySelectorAll(".pc-cor .pc-cor-card")];const det=document.querySelector(".pc-cor .pc-detail--corr").getBoundingClientRect();return JSON.stringify({cartoes:cartoes.length,visiveis:cartoes.filter((c)=>c.getBoundingClientRect().top>=rr.top-1&&c.getBoundingClientRect().bottom<=rr.bottom+1).length,detalheNaJanela:det.top<innerHeight-200&&det.bottom<=innerHeight+1})})()`));
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
      const VERMELHO = "rgb(184, 58, 51)";
      const CINZA = "rgb(169, 179, 201)";
      const AZUL = "rgb(43, 84, 207)";

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
      registrar("17ac1. Fechado e sem escolha, DESDE O INÍCIO: 'Escolha uma pessoa ▾' com borda vermelha (#B83A33), erro 'Escolha o responsável' na região aria-live ligado ao campo por aria-describedby; combobox com aria-haspopup=listbox, aria-expanded=false e SEM aria-controls enquanto fechado", inicial.texto === "Escolha uma pessoa ▾" && inicial.borda === VERMELHO && inicial.erroTexto === "Escolha o responsável" && inicial.describedby === inicial.erroId && inicial.expanded === "false" && (await js('(()=>{const s=document.querySelector(".pc-cor .pc-resp-seletor");const q=document.querySelector(".pc-cor .pc-resp-erro");return s.getAttribute("role")==="combobox"&&s.getAttribute("aria-haspopup")==="listbox"&&!s.hasAttribute("aria-controls")&&q.getAttribute("aria-live")==="polite"})()')), JSON.stringify(inicial));
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
      registrar("17ag1. Aberto por clique: a lista cola no campo (mesma largura, 2 px), borda azul #2B54CF, opções de 44 px, dentro da janela, nenhuma opção coberta ou cortada (elementFromPoint) e a lateral/corpo NÃO ganham rolagem", aberto.aberto && aberto.expanded === "true" && okGeo, falhaGeo || JSON.stringify(geo.medidas));
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
        const g = JSON.parse(await js(`(()=>{const s=document.querySelector(".pc-cor .pc-resp-seletor");const l=document.querySelector(".pc-resp-lista");if(!l)return JSON.stringify({existe:false});const sr=s.getBoundingClientRect(),lr=l.getBoundingClientRect();const ops=[...l.querySelectorAll('[role="option"]')];const outraTop=l.querySelector(".pc-resp-opcao--outra").getBoundingClientRect().top;const noTopo=(e)=>{const r=e.getBoundingClientRect();const ehOutra=e.classList.contains("pc-resp-opcao--outra");const topo=Math.max(r.top,lr.top),base=Math.min(r.bottom,ehOutra?lr.bottom:outraTop,lr.bottom);if(base-topo<=2)return true;const t=document.elementFromPoint(r.left+r.width/2,(topo+base)/2);return !!t&&(t===e||e.contains(t))};const lat=document.querySelector(".pc-cor .pc-detail-lateral");const c=document.querySelector(".pc-cor .pc-detail-corpo");const foot=document.querySelector(".pc-cor .pc-detail-foot").getBoundingClientRect();const colada=Math.abs(lr.top-sr.bottom)<=2||Math.abs(lr.bottom-sr.top)<=2;return JSON.stringify({existe:true,coladaNoCampo:colada&&Math.abs(lr.left-sr.left)<=1&&Math.abs(lr.width-sr.width)<=1,dentroDaJanela:lr.left>=0&&lr.right<=innerWidth&&lr.top>=0&&lr.bottom<=innerHeight,semCobertura:ops.every(noTopo),latSemMudar:lat.scrollHeight===${rolagens.l}&&c.scrollHeight===${rolagens.c},listaCabeNaJanela:lr.height<=innerHeight-16+0.5,abaixoOuSemEspaco:(lr.top>=sr.bottom-2&&lr.bottom<=foot.top+0.5)||(lr.bottom<=sr.top+2&&(foot.top-8-sr.bottom)<Math.min(ops.length,7)*44+2),lateralDe100cqh:innerWidth<1150||(Math.abs(lat.clientHeight-c.clientHeight)<=1&&lat.getBoundingClientRect().bottom<=foot.top+1),campoNaJanela:sr.top>=0&&sr.bottom<=innerHeight,medidas:{lista:[Math.round(lr.left),Math.round(lr.top),Math.round(lr.right),Math.round(lr.bottom)],campo:[Math.round(sr.top),Math.round(sr.bottom)],rodapeTop:Math.round(foot.top),maxima:Math.round(lr.height)}})})()`));
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
      registrar(`17aa5. ${largura} px: lateral de ${largura < 1300 ? "260" : "300"} px, lista de ${largura < 1200 ? "280" : "340"} px, 'Falar' ${largura < 1200 ? "só o ícone" : "com texto"} e nada sobreposto`, m.existe !== false && m.listaLargura && m.larguraDaLateral && m.falarConforme && m.semSobreposicao && m.chipFuncionou, JSON.stringify(m.detalhes));
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
  registrar("17j. Correções: 'Salvar plano' habilita com ação e responsável", await js(`(()=>{const salvar=[...document.querySelectorAll(".pc-cor .pc-detail-foot button")].find((b)=>b.innerText.includes("Salvar plano"));return !!salvar&&!salvar.disabled&&getComputedStyle(salvar).backgroundColor==="rgb(46, 139, 87)"})()`));
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
  registrar("17k. Tocar num item do trilho sai da visita: a faixa some e a visita continua em andamento (cartão no Início)", await js('!document.querySelector(".fv")&&!!document.querySelector(".ini3-cartao")'));
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
  registrar("17w. Início: anel de progresso em âmbar (#AF640A) e a mesma busca das outras telas (lupa/raio, Ctrl K, microfone e 'Ir →')", await js(`(()=>{const c=document.querySelector(".ini3-anel circle:nth-child(2)");const busca=document.querySelector(".pc-topbar .pc-busca");return !!c&&getComputedStyle(c).stroke==="rgb(175, 100, 10)"&&!!busca&&/Ctrl/.test(busca.innerText)&&/Ir/.test(busca.innerText)&&!document.querySelector(".pc-topbar--inicio")})()`));
  await js('[...document.querySelectorAll(".ini3-cartao button")].find((b)=>b.innerText.includes("Continuar"))?.click()');
  await esperar(async () => js('!!document.querySelector(".fv")'), 15000);
  await js('document.querySelector(".fv-finalizar")?.click()');
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
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await js('[...document.querySelectorAll(".tr .tr-item")].find((b) => b.innerText.trim().endsWith("Início"))?.click()');
  await esperar(async () => js('!!document.querySelector(".ini3")'), 15000);
  await n.esperar(800);
  await foto("18-elton-inicio");
  registrar("18a. Elton Volmir Strapazon: Início com 'Olá', cartão de visita com anel e 'Continuar →' azul", await js(`(()=>{const sel=document.querySelector(".emp-ativa-nome")?.textContent||"";const c=document.querySelector(".ini3-cartao");return /Elton Volmir/.test(sel)&&!!c&&getComputedStyle(c.querySelector(".ini3-botao")).backgroundColor==="rgb(43, 84, 207)"&&!!c.querySelector(".ini3-anel")})()`));
  await js('[...document.querySelectorAll(".tr .tr-item")].find((b) => b.innerText.trim().endsWith("Visitas"))?.click()');
  await esperar(async () => js('!!document.querySelector(".vis-linha")'), 15000);
  await n.esperar(500);
  await foto("18-elton-visitas");
  registrar("18b. Elton Volmir Strapazon: Visitas com chip 'Aberta há N dias' azul claro e texto preto, 'Continuar →' e '+ Nova visita' azuis", await js(`(()=>{const chip=document.querySelector(".vis-aviso-terra");const cont=[...document.querySelectorAll(".vis-linha button")].find((b)=>b.innerText.includes("Continuar"));const nova=[...document.querySelectorAll("button")].find((b)=>b.innerText.includes("Nova visita"));return !!chip&&getComputedStyle(chip).backgroundColor==="rgb(220, 235, 251)"&&getComputedStyle(chip).color==="rgb(27, 36, 51)"&&!!cont&&getComputedStyle(cont).backgroundColor==="rgb(43, 84, 207)"&&!!nova&&getComputedStyle(nova).backgroundColor==="rgb(43, 84, 207)"})()`));
  for (const larg of [1100, 1280, 1440]) {
    await n.enviar("Emulation.setDeviceMetricsOverride", { width: larg, height: 900, screenWidth: larg, screenHeight: 900, deviceScaleFactor: 1, mobile: false });
    await n.esperar(500);
    registrar(`18c. Visitas em ${larg} px: '+ Nova visita' inteiro com 32 px de respiro à direita; a linha de filtros encolhe a busca (uma linha só, sem estourar)`, await js(`(()=>{const b=[...document.querySelectorAll("button")].find((x)=>x.innerText.includes("Nova visita"));const barra=document.querySelector(".vis-toolbar");const r=b.getBoundingClientRect();return innerWidth-r.right>=31.5&&b.scrollWidth<=b.clientWidth+1&&barra.getBoundingClientRect().height<70&&document.documentElement.scrollWidth<=innerWidth+1})()`));
  }
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, screenWidth: 1440, screenHeight: 900, deviceScaleFactor: 1, mobile: false });

  // 19. Tablet (mesmo trilho, 104 px) e Correções em 1280 x 940.
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 820, height: 1100, deviceScaleFactor: 1, mobile: false });
  await n.ir(app.base);
  await esperar(async () => js('!!document.querySelector(".tr")'), 20000);
  await n.esperar(1200);
  await foto("19-tablet");
  registrar("19a. Tablet: o mesmo trilho de 104 px, sem rolagem horizontal", await js(`(()=>{const t=document.querySelector(".tr");return !!t&&Math.round(t.getBoundingClientRect().width)===104&&getComputedStyle(t).backgroundColor==="rgb(46, 91, 214)"&&document.documentElement.scrollWidth<=innerWidth+1})()`));
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
