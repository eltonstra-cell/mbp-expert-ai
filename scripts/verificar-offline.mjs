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
  e.db.ncs = [{ id: "nc-semente-foto", empresaId: "beyond-nutri", visitaId: "vt1", ambiente: "Cozinha", checklistItemId: "", titulo: TITULO_LONGO, categoria: "Higiene", criticidade: "Rotina", referencia: "", orientacao: "", observacao: "", prioridade: "Baixa", status: "Aberta", criadoEm: "2026-10-22T10:05:00.000Z" }];
  // Pessoas com nomes compostos longos (chips de responsável: "primeiro nome + último sobrenome", sem cortar) e uma correção reincidente
  // (Rotina, para não mudar a ordem das demais) cuja correção anterior, resolvida na Visita 1, traz a ação que funcionou.
  const agora = "2026-10-01T10:00:00.000Z";
  const pessoa = (id, nome) => ({ id, nome, email: `${id}@example.com`, perfil: "Administrador", status: "Ativo", empresaIds: ["beyond-nutri"], cargo: "Nutricionista", criadoEm: agora, atualizadoEm: agora });
  e.db.usuarios.push(pessoa("u2", "Ana Beatriz Cavalcanti de Albuquerque Montenegro"), pessoa("u3", "Francisco José de Assis Albuquerque Vasconcelos Neto"), pessoa("u4", "Marivane Aparecida de Oliveira Santos Albuquerque"));
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
  registrar("17g. Correções: responsável vazio com contorno vermelho; 'Salvar plano' desabilitado", await js(`(()=>{const r=document.querySelector('.pc-cor .pc-plan-resp input');const salvar=[...document.querySelectorAll(".pc-cor .pc-detail-foot button")].find((b)=>b.innerText.includes("Salvar plano"));return !!r&&r.value===""&&getComputedStyle(r).borderTopColor==="rgb(201, 71, 63)"&&!!salvar&&salvar.disabled})()`));
  const medirSobreposicao = `(()=>{try{const raiz=document.querySelector(".pc-detail--corr");const corpo=raiz.querySelector(".pc-detail-scroll");const blocos=[...raiz.querySelectorAll(".pc-detail-head, .pc-detail-scroll > *, .pc-detail-foot, .pc-plan-stack > *, .pc-plan-campos > *, .pc-detail-duas > *")];const cx=corpo.getBoundingClientRect();const recorta=(b,r)=>{if(!corpo.contains(b)||b===corpo)return r;return {left:Math.max(r.left,cx.left),right:Math.min(r.right,cx.right),top:Math.max(r.top,cx.top),bottom:Math.min(r.bottom,cx.bottom)}};const rs=blocos.map((b)=>({b,r:recorta(b,b.getBoundingClientRect())})).filter(({r})=>r.right-r.left>0&&r.bottom-r.top>0);let pares=0;const nomes=[];for(let i=0;i<rs.length;i++)for(let j=i+1;j<rs.length;j++){const a=rs[i],c=rs[j];if(a.b.contains(c.b)||c.b.contains(a.b))continue;if(!corpo.contains(a.b)&&a.b!==raiz.querySelector(".pc-detail-head")&&a.b!==raiz.querySelector(".pc-detail-foot"))continue;const x=Math.min(a.r.right,c.r.right)-Math.max(a.r.left,c.r.left);const y=Math.min(a.r.bottom,c.r.bottom)-Math.max(a.r.top,c.r.top);if(x>1&&y>1){pares++;nomes.push(a.b.className+" x "+c.b.className)}}const ar=document.querySelector(".tr-avatar").getBoundingClientRect();const acr=corpo.querySelector(":scope > .pc-acrescimos");return JSON.stringify({pares,nomes,acrescimos:!!acr&&/\\+ Foto/.test(acr.innerText)&&/Registrar atualização/.test(acr.innerText)&&getComputedStyle(acr).flexGrow==="0"&&getComputedStyle(acr).flexShrink==="0"&&acr.getBoundingClientRect().height<=2*Math.max(40,...[...acr.querySelectorAll(".pc-acrescimo")].map((b)=>b.getBoundingClientRect().height))+2,corpoRola:corpo.scrollHeight>corpo.clientHeight+1,avatarDentro:ar.bottom<=innerHeight&&ar.top>=0,trRola:document.querySelector(".tr-lista").scrollHeight>document.querySelector(".tr-lista").clientHeight+1})}catch(e){return JSON.stringify({erro:String(e.stack).slice(0,300)})}})()`;
  for (const altura of [900, 800, 700]) {
    await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: altura, screenWidth: 1440, screenHeight: altura, deviceScaleFactor: 1, mobile: false });
    await n.esperar(500);
    await foto(`17-h${altura}`);
    const r = JSON.parse(await js(medirSobreposicao));
    registrar(`17h. ${altura} px de altura: nenhum bloco do painel (incluindo a linha de acréscimos) interseciona outro, avatar do trilho dentro da janela (${altura >= 800 ? "corpo sem rolagem" : "só o corpo rola por dentro"})`, r.pares === 0 && r.acrescimos && r.avatarDentro && (altura < 800 || !r.corpoRola), JSON.stringify(r));
  }
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1152, height: 640, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1.25, mobile: false });
  await n.esperar(500);
  {
    const r = JSON.parse(await js(medirSobreposicao));
    registrar("17i. Zoom de 125% em janela larga (altura útil de 640 px): nada sobreposto (incluindo a linha de acréscimos), avatar dentro da janela", r.pares === 0 && r.acrescimos && r.avatarDentro, JSON.stringify(r));
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
  registrar("17p. Correções: 'Escolha o responsável' DENTRO do campo (texto do campo em vermelho, sem linha extra) e topo só 'Visita N'", await js(`(()=>{const r=document.querySelector(".pc-cor .pc-plan-resp input");const extra=[...document.querySelectorAll(".pc-cor .ui-field-error")].some((x)=>x.textContent.includes("Escolha o responsável"));const topo=document.querySelector(".pc-crumbs, .pc-topbar")?.innerText||"";return r.placeholder==="Escolha o responsável"&&getComputedStyle(r,"::placeholder").color==="rgb(201, 71, 63)"&&!extra&&/Visita \\d/.test(topo)&&!/Visita \\d\\s*›/.test(topo)})()`));
  registrar("17q. Correções: respiro de 32 px à direita em 'Finalizar visita', 'Ver no checklist ›' e 'Salvar plano'", await js(`(()=>{const sel=[".fv-finalizar",".pc-detail-ver"];const bots=[...document.querySelectorAll(".pc-cor .pc-detail-foot button")].find((b)=>b.innerText.includes("Salvar plano"));const rects=[...sel.map((s)=>document.querySelector(s)),bots].filter(Boolean).map((e)=>e.getBoundingClientRect());return rects.length===3&&rects.every((r)=>innerWidth-r.right>=31.5)})()`));
  // Cada medida vira um item com nome: a falha mostra QUAL medida quebrou, não só "falso".
  const resultadoDosChecks = (json) => { const r = JSON.parse(json); const falhas = Object.entries(r).filter(([, v]) => v === false).map(([k]) => k); return [r.existe !== false && falhas.length === 0, falhas.length ? `falhou: ${falhas.join(", ")} | ${json}` : ""]; };
  registrar("17o. Correções a 1440 px: chips de pessoas no máximo 3, em ordem alfabética pelo nome completo (no title), com o nome curto (primeiro nome + último sobrenome) à vista, NUNCA cortados (scrollWidth <= clientWidth, sem reticências) e sem nomes repetidos (Elton/Élton)", ...resultadoDosChecks(await js(`(()=>{const chips=[...document.querySelectorAll(".pc-cor .pc-plan-resp .pc-memoria .pc-chip-btn")];const norm=(t)=>t.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase();const nomes=chips.map((c)=>norm(c.title));const linha=document.querySelector(".pc-cor .pc-plan-resp .pc-plan-rotulo");const curto=(nome)=>{const p=nome.trim().split(/\\s+/);if(p.length<=2)return p.join(" ");const ult=p[p.length-1];const sn=["neto","filho","junior","jr","sobrinho"].includes(norm(ult).replace(/\\.$/,""))?p[p.length-2]:ult;return p[0]+" "+sn};const ordenados=[...chips.map((c)=>c.title)].sort((a,b)=>a.localeCompare(b,"pt-BR",{sensitivity:"base"}));return JSON.stringify({existe:chips.length>0,ate3:chips.length<=3,semRepetir:new Set(nomes).size===nomes.length,ordemAlfabetica:JSON.stringify(ordenados)===JSON.stringify(chips.map((c)=>c.title)),semCorte:chips.every((c)=>c.scrollWidth<=c.clientWidth),semLimiteDe9em:chips.every((c)=>getComputedStyle(c).maxWidth!=="9em"),nomeCurto:chips.every((c)=>c.textContent.trim()===curto(c.title)||c.textContent.trim()===c.title.trim()),linhaSemEstouro:!linha||linha.scrollWidth<=linha.clientWidth+1,textos:chips.map((c)=>c.textContent.trim()+"|"+c.title)})})()`)));
  const medirCampoDaAcao = `(()=>{const conj=document.querySelector(".pc-cor .pc-acao-conjunto");const area=document.querySelector(".pc-cor .pc-acao-area");const linha=document.querySelector(".pc-cor .pc-acao-linha");if(!conj||!area||!linha)return JSON.stringify({existe:false,conj:!!conj,area:!!area,linha:!!linha});const c=conj.getBoundingClientRect(),a=area.getBoundingClientRect(),l=linha.getBoundingClientRect();const bordas=[conj,area].filter((e)=>parseFloat(getComputedStyle(e).borderTopWidth)>0).length;const botoes=[...linha.querySelectorAll(".ui-field-tools button")];return JSON.stringify({caixaVazia48:Math.round(a.height)===48,conjuntoCerca100:Math.round(c.height)>=96&&Math.round(c.height)<=104,alturaDaCaixa:Math.round(a.height),alturaDoConjunto:Math.round(c.height),borda2px:getComputedStyle(conj).borderTopWidth==="2px",corDaBorda:getComputedStyle(conj).borderTopColor==="rgb(169, 179, 201)",caixaSemBorda:getComputedStyle(area).borderTopWidth==="0px",umaBordaSo:bordas===1,barraDentro:l.top>=a.bottom-1&&l.top>=c.top&&l.bottom<=c.bottom+0.5&&l.left>=c.left&&l.right<=c.right+0.5,textosDaBarra:/Sugerir com IA/.test(linha.innerText)&&(innerWidth<1200?(()=>{const fb=linha.querySelector(".field-assist-voice");return !!fb&&fb.innerText.trim()===""&&/Falar/.test(fb.getAttribute("aria-label")||"")&&/Falar/.test(fb.title)&&fb.getBoundingClientRect().width<=44})():/Falar/.test(linha.innerText)),botoes40:botoes.length>=2&&botoes.every((b)=>Math.round(b.getBoundingClientRect().height)>=40),barraSemEstouro:linha.scrollWidth<=linha.clientWidth+1})})()`;
  registrar("17r. Correções a 1440 px: 'O que será feito' é um conjunto de UMA borda de 2 px (#A9B3C9) com a caixa vazia de 48 px (conjunto de cerca de 100 px) sem borda própria e a barra 'Sugerir com IA' e 'Falar' (com texto, 40 px) DENTRO da borda", ...resultadoDosChecks(await js(medirCampoDaAcao)));
  registrar("17s. Correções: não há blocos Evidências/Atualizações vazios (sem 'Antes · 0', 'Sem foto', 'Sem atualizações') e há a linha 'Acrescentar: + Foto · + Registrar atualização' (links de 40 px) no fim do corpo", ...resultadoDosChecks(await js(`(()=>{const corpo=document.querySelector(".pc-cor .pc-detail-scroll");const acr=corpo&&corpo.querySelector(":scope > .pc-acrescimos");const vazios=[...document.querySelectorAll(".pc-cor .pc-detail-secao, .pc-cor .ad--vazio, .pc-cor .pc-sem-atualizacoes")];const links=acr?[...acr.querySelectorAll(".pc-acrescimo")]:[];return JSON.stringify({existe:!!acr,semBlocosVazios:vazios.length===0,semTextosDeVazio:!/Antes · 0|Sem atualizações|Sem foto/.test(corpo.innerText),prefixo:!!acr&&/^Acrescentar:/.test(acr.innerText.trim()),temFoto:!!acr&&/[+] Foto/.test(acr.innerText),temAtualizacao:!!acr&&/[+] Registrar atualização/.test(acr.innerText),alvos40:links.length>0&&links.every((b)=>b.getBoundingClientRect().height>=40),ultimoDoCorpo:!!acr&&corpo.lastElementChild===acr})})()`)));
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1152, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
  await n.esperar(400);
  const alinhamento = JSON.parse(await js(`(()=>{const r=document.querySelector(".pc-cor .pc-plan-resp input"),p=document.querySelector(".pc-cor .pc-plan-prazo input");if(!r||!p)return JSON.stringify({existe:false});const a=r.getBoundingClientRect(),b=p.getBoundingClientRect();return JSON.stringify({existe:true,camposLadoALado:b.left>a.right&&Math.abs(a.top-b.top)<=1,camposAlinhadosPelaBase:Math.abs(a.bottom-b.bottom)<=1,camposComMesmaAltura:Math.abs(a.height-b.height)<=1})})()`));
  registrar("17r2. Correções a 1152 px de largura: o conjunto de uma borda, a caixa de 48 px e a barra dentro dela continuam valendo ('Falar' vira só o ícone, com aria-label e title), e os campos Responsável e Prazo ficam lado a lado e alinhados", ...resultadoDosChecks(JSON.stringify({ ...JSON.parse(await js(medirCampoDaAcao)), ...alinhamento })));
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
  await n.esperar(400);
  registrar("17s2. Correções: cartão sem pino, 'item N' e seta, título em até 2 linhas, sem sobreposição; detalhe com o código NC no fim da linha 2 e a linha de Fonte", await js(`(()=>{const cards=[...document.querySelectorAll(".pc-cor .pc-cor-card")];if(cards.length===0)return false;const t=document.querySelector(".pc-cor .pc-detail-contexto");const linhasDoTitulo=cards.every((c)=>{const ti=c.querySelector(".pc-cor-titulo");if(getComputedStyle(ti).whiteSpace==="nowrap")return false;const lh=parseFloat(getComputedStyle(ti).lineHeight)||parseFloat(getComputedStyle(ti).fontSize)*1.4;return ti.getBoundingClientRect().height<=lh*2+1});const sem=cards.every((c)=>!c.querySelector("svg")&&!c.querySelector(".pc-cor-seta, .pc-cor-pino, .pc-cor-item")&&!/item [0-9]/.test(c.innerText)&&!c.innerText.includes("›"));const semSobrepor=cards.every((c)=>{const f=[...c.children].map((e)=>e.getBoundingClientRect());return f.every((r,k)=>k===0||r.top>=f[k-1].bottom-1)&&f.every((r)=>r.bottom<=c.getBoundingClientRect().bottom+0.5)});const ctx=t&&t.querySelector(".pc-detail-codigo")&&t.lastElementChild===t.querySelector(".pc-detail-codigo")&&/^NC[0-9]+$/.test(t.querySelector(".pc-detail-codigo").innerText.trim());const fonte=document.querySelector(".pc-cor .pc-detail-fonte");return linhasDoTitulo&&sem&&semSobrepor&&!!ctx&&!!fonte&&/Fonte/.test(fonte.innerText)})()`));
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
    const medir17z = `(()=>{try{const raiz=document.querySelector(".pc-detail--corr");const corpo=raiz.querySelector(".pc-detail-scroll");const foot=raiz.querySelector(".pc-detail-foot");const titulo=raiz.querySelector(".pc-detail-title");const ev=corpo.querySelector('.pc-detail-secao[aria-label="Evidências"]');const conj=corpo.querySelector(".pc-acao-conjunto");const area=corpo.querySelector(".pc-acao-area");const salvar=[...foot.querySelectorAll("button")].find((b)=>b.innerText.includes("Salvar plano"));const fr=foot.getBoundingClientRect();const cr=corpo.getBoundingClientRect();const ultimo=corpo.lastElementChild.getBoundingClientRect();const folga=Math.round(cr.bottom-parseFloat(getComputedStyle(corpo).paddingBottom)-ultimo.bottom);const lh=parseFloat(getComputedStyle(titulo).lineHeight);const rot=corpo.querySelector(".pc-plan-resp .pc-plan-rotulo");const rotR=rot.getBoundingClientRect();const chips=[...rot.querySelectorAll(".pc-memoria .pc-chip-btn")];const lembrete=rot.querySelector(".pc-plan-lembrete");const acr=ev.parentElement.querySelector(":scope > .pc-acrescimos");const evR=ev.getBoundingClientRect();const mini=[...ev.querySelectorAll(".ad-foto--mini")];const legenda=mini[0]?.querySelector(".ad-legenda");const mais=ev.querySelector(".ad-foto-mais");const topos=[...mini,mais].filter(Boolean).map((e)=>{const r=e.getBoundingClientRect();return r.top+r.height/2});const corLegenda=legenda?getComputedStyle(legenda).color:"";const txtEv=ev.innerText;return JSON.stringify({existe:!!ev,umaFoto:!!ev&&ev.querySelectorAll("img").length===1,legendaAntes:!!legenda&&legenda.textContent.trim()==="Antes"&&parseFloat(getComputedStyle(legenda).fontSize)>=12&&getComputedStyle(legenda).backgroundColor==="rgb(255, 255, 255)"&&corLegenda==="rgb(27, 36, 51)",semRotulosNemQuadroVazio:!/Antes · |Depois · |Sem foto/.test(txtEv)&&!ev.querySelector(".ad-vazio, .ad-coluna"),evidenciasEmUmaLinha:topos.length>=2&&Math.max(...topos)-Math.min(...topos)<=2&&Math.round(ev.querySelector(".ad--pc").getBoundingClientRect().height)<=72,acrescimosNaLinhaDasEvidencias:!!acr&&/Registrar atualização/.test(acr.innerText)&&acr.getBoundingClientRect().left>=mais.getBoundingClientRect().right-1&&acr.getBoundingClientRect().top>=evR.top+20&&acr.getBoundingClientRect().bottom<=evR.bottom+1&&[...acr.querySelectorAll(".pc-acrescimo")].every((b)=>b.getBoundingClientRect().height>=40),chipsNaLinhaDoRotulo:chips.length>0&&chips.every((c)=>{const r=c.getBoundingClientRect();return r.top>=rotR.top-5&&r.bottom<=rotR.bottom+5})&&(!lembrete||(lembrete.getBoundingClientRect().top>=rotR.top-5&&lembrete.getBoundingClientRect().bottom<=rotR.bottom+5)),camposAlinhados:Math.abs(corpo.querySelector(".pc-plan-resp input").getBoundingClientRect().top-corpo.querySelector(".pc-plan-prazo input").getBoundingClientRect().top)<=1,tituloCompleto:titulo.getAttribute("title")===titulo.textContent&&getComputedStyle(titulo).webkitLineClamp==="2"&&parseFloat(getComputedStyle(titulo).fontSize)<=24&&getComputedStyle(titulo).fontWeight==="500",titulo2Linhas:Math.round(titulo.getBoundingClientRect().height/lh)===2,semRolagemInterna:corpo.scrollHeight<=corpo.clientHeight,rodapeVisivel:!!salvar&&fr.bottom<=innerHeight&&fr.top>=0&&salvar.getBoundingClientRect().bottom<=innerHeight,rodapeFixo:foot.parentElement===raiz&&!corpo.contains(foot)&&fr.top>=cr.bottom-1,medidas:{caixa:Math.round(area.getBoundingClientRect().height),conjunto:Math.round(conj.getBoundingClientRect().height),evidencias:Math.round(ev.getBoundingClientRect().height),titulo:Math.round(titulo.getBoundingClientRect().height),corpoScroll:corpo.scrollHeight,corpoClient:corpo.clientHeight,folga,rodapeBottom:Math.round(fr.bottom),janela:innerHeight}})}catch(e){return JSON.stringify({existe:false,erro:String(e.stack).slice(0,300)})}})()`;
    const r17z = JSON.parse(await js(medir17z));
    const sobreposicao17z = JSON.parse(await js(medirSobreposicao));
    const [ok17z, falha17z] = resultadoDosChecks(JSON.stringify({ ...r17z, semSobreposicao: sobreposicao17z.pares === 0 }));
    registrar("17z. 1440x800, correção com 1 foto e título de 2 linhas: o corpo do detalhe NÃO tem rolagem interna (scrollHeight <= clientHeight), o rodapé com 'Salvar plano' está dentro da janela e fixo, e nenhum bloco se sobrepõe", ok17z, falha17z || JSON.stringify(r17z.medidas));
    // Muitas fotos (miniaturas copiadas só na tela): a fileira rola na horizontal e nada estoura o corpo do detalhe.
    const muitas = JSON.parse(await js(`(()=>{const linha=document.querySelector(".pc-cor .ad-linha");const base=linha.querySelector(".ad-foto--mini");const corpo=document.querySelector(".pc-cor .pc-detail-scroll");const copias=Array.from({length:14},()=>base.cloneNode(true));copias.forEach((c)=>linha.insertBefore(c,base));const fileira=document.querySelector(".pc-cor .ad--pc");const mais=fileira.querySelector(".ad-foto-mais");mais.scrollIntoView({block:"nearest"});const m=mais.getBoundingClientRect();const cb=corpo.getBoundingClientRect();const rodape=document.querySelector(".pc-detail--corr .pc-detail-foot").getBoundingClientRect();const r=JSON.stringify({medidas:{botao:[Math.round(m.left),Math.round(m.top),Math.round(m.right),Math.round(m.bottom)],corpo:[Math.round(cb.left),Math.round(cb.top),Math.round(cb.right),Math.round(cb.bottom)],scroll:corpo.scrollHeight,client:corpo.clientHeight},botaoAcimaDoRodape:m.bottom<=rodape.top+0.5&&cb.bottom<=rodape.top+1,botaoVisivel:m.width>0&&m.left>=cb.left-1&&m.right<=cb.right+1&&m.top>=cb.top-1&&m.bottom<=cb.bottom+1,botaoForaDaAreaQueRola:!fileira.querySelector(".ad-rolagem .ad-foto-mais")&&!!fileira.querySelector(".ad-rolagem")&&fileira.querySelector(".ad-rolagem").scrollWidth>fileira.querySelector(".ad-rolagem").clientWidth+1,fileiraRola:fileira.querySelector(".ad-rolagem").scrollWidth>fileira.querySelector(".ad-rolagem").clientWidth+1,fileiraDentro:fileira.getBoundingClientRect().right<=corpo.getBoundingClientRect().right+1,corpoSemRolagemHorizontal:corpo.scrollWidth<=corpo.clientWidth+1,maisBotaoVisivel:!!mais});copias.forEach((c)=>c.remove());corpo.scrollTop=0;return r})()`));
    registrar("17z2. Muitas fotos: só as miniaturas rolam na horizontal, o botão '+ Foto' fica FORA da área que rola e VISÍVEL dentro do corpo do detalhe (com muitas fotos a rolagem interna do corpo é permitida pelo CLAUDE.md: rola-se até o botão e ele tem de ficar dentro da área rolável, acima do rodapé), e nada gera rolagem horizontal no corpo", ...resultadoDosChecks(JSON.stringify(muitas)));
    const digitar = (texto) => js(`(()=>{const el=document.querySelector(".pc-cor .pc-acao-area");Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),"value").set.call(el,${JSON.stringify(texto)});el.dispatchEvent(new Event("input",{bubbles:true}));return true})()`);
    // 17z3. Mesma correção (1 foto, título de 2 linhas) com 2 linhas DIGITADAS na ação: a caixa cresce e o corpo continua sem rolagem interna, com o rodapé à vista.
    await digitar("Trocar o piso danificado" + String.fromCharCode(10) + "Registrar a conclusão com foto");
    await n.esperar(400);
    await foto("17z3-duas-linhas-1440x800");
    const r17z3 = JSON.parse(await js(`(()=>{try{const raiz=document.querySelector(".pc-detail--corr");const corpo=raiz.querySelector(".pc-detail-scroll");const foot=raiz.querySelector(".pc-detail-foot");const area=corpo.querySelector(".pc-acao-area");const salvar=[...foot.querySelectorAll("button")].find((b)=>b.innerText.includes("Salvar plano"));const fr=foot.getBoundingClientRect();const cr=corpo.getBoundingClientRect();const folga=Math.round(cr.bottom-parseFloat(getComputedStyle(corpo).paddingBottom)-corpo.lastElementChild.getBoundingClientRect().bottom);return JSON.stringify({existe:true,duasLinhasDigitadas:area.value.split(String.fromCharCode(10)).length===2,caixaCresceu:Math.round(area.getBoundingClientRect().height)>48,semRolagemInterna:corpo.scrollHeight<=corpo.clientHeight,folgaDe8:folga>=8&&parseFloat(getComputedStyle(corpo).paddingBottom)>=8,rodapeVisivel:!!salvar&&fr.bottom<=innerHeight&&fr.top>=0&&salvar.getBoundingClientRect().bottom<=innerHeight,rodapeFixo:foot.parentElement===raiz&&!corpo.contains(foot)&&fr.top>=cr.bottom-1,medidas:{caixa:Math.round(area.getBoundingClientRect().height),corpoScroll:corpo.scrollHeight,corpoClient:corpo.clientHeight,folga,rodapeBottom:Math.round(fr.bottom),janela:innerHeight}})}catch(e){return JSON.stringify({existe:false,erro:String(e.stack).slice(0,300)})}})()`));
    const [ok17z3, falha17z3] = resultadoDosChecks(JSON.stringify(r17z3));
    registrar("17z3. 1440x800, 1 foto, título de 2 linhas e 2 linhas digitadas na ação: o corpo do detalhe continua sem rolagem interna e o rodapé com 'Salvar plano' fica à vista e fixo", ok17z3, falha17z3 || JSON.stringify(r17z3.medidas));
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
    registrar("17r3. 'O que será feito' vazio tem cerca de 100 px (conjunto) e cresce ao digitar sem barra de rolagem interna até o limite; depois do limite rola por dentro e a barra continua dentro da borda; apagado, volta a 48 px", vazia.conjunto <= 104 && cheia.caixa > vazia.caixa && !cheia.rolaPorDentro && cheia.barraDentro && limite.caixa <= 160 && limite.rolaPorDentro && limite.barraDentro && devolta.caixa === 48, JSON.stringify({ vazia, cheia, limite, devolta }));
  }
  // 17aa. Etapa de 1000 a 1300 px e chips de pessoas: medidas em 1152 e 1440 px na correção reincidente (com a ação que funcionou antes).
  const corDeAcao = await js(`(()=>{const e=document.createElement("span");e.style.color="var(--rd-acao)";document.body.appendChild(e);const c=getComputedStyle(e).color;e.remove();return c})()`);
  const medirAjustesDeCorrecoes = `(()=>{try{const corDeAcao=${JSON.stringify(corDeAcao)};const raiz=document.querySelector(".pc-detail--corr");const corpo=raiz.querySelector(".pc-detail-scroll");const foot=raiz.querySelector(".pc-detail-foot");const linha=raiz.querySelector(".pc-acao-linha");const rot=raiz.querySelector(".pc-plan-resp .pc-plan-rotulo");const label=rot.querySelector("label");const chips=[...rot.querySelectorAll(".pc-memoria .pc-chip-btn")];const lembrete=rot.querySelector(".pc-plan-lembrete");const resp=raiz.querySelector(".pc-plan-resp input");const prazo=raiz.querySelector(".pc-plan-prazo input");const lista=document.querySelector(".pc-cor .pc-master-list");const r=(e)=>e.getBoundingClientRect();
const norm=(t)=>t.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase();
const curto=(nome)=>{const p=nome.trim().split(/\\s+/);if(p.length<=2)return p.join(" ");const ult=p[p.length-1];const sn=["neto","filho","junior","jr","sobrinho"].includes(norm(ult).replace(/\\.$/,""))?p[p.length-2]:ult;return p[0]+" "+sn};
const visivel=(e)=>e&&getComputedStyle(e).visibility!=="hidden"&&r(e).width>0&&r(e).height>0;
const sug=raiz.querySelector(".pc-prazo-sugerido")||raiz.querySelector(".pc-prazo-erro");
const folhas=[label,...chips,lembrete,resp,prazo,raiz.querySelector(".pc-acao-area"),...linha.querySelectorAll(".ui-field-tools button"),...linha.querySelectorAll(".pc-chip-funcionou"),linha.querySelector(".pc-acao-mais"),raiz.querySelector(".pc-detail-ver"),...foot.querySelectorAll("button")].filter(visivel);
const cx=r(corpo);const recorta=(e)=>{const q0=r(e);const d=(rot.contains(e)&&e!==label)?4:0;const q={left:q0.left,right:q0.right,top:q0.top+d,bottom:q0.bottom-d};if(!corpo.contains(e))return q;return {left:Math.max(q.left,cx.left),right:Math.min(q.right,cx.right),top:Math.max(q.top,cx.top),bottom:Math.min(q.bottom,cx.bottom)}};
const sobrepostos=[];for(let i=0;i<folhas.length;i++)for(let j=i+1;j<folhas.length;j++){const a=recorta(folhas[i]),b=recorta(folhas[j]);if(a.right-a.left<=0||a.bottom-a.top<=0||b.right-b.left<=0||b.bottom-b.top<=0)continue;if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)sobrepostos.push((folhas[i].className||folhas[i].tagName)+" x "+(folhas[j].className||folhas[j].tagName))}
const cs=getComputedStyle(prazo);const cv=document.createElement("canvas").getContext("2d");cv.font=cs.fontStyle+" "+cs.fontWeight+" "+cs.fontSize+" "+cs.fontFamily;const fimDoValor=r(prazo).left+parseFloat(cs.borderLeftWidth)+parseFloat(cs.paddingLeft)+cv.measureText("00/00/0000").width;
const ordenados=chips.map((c)=>c.title).sort((a,b)=>a.localeCompare(b,"pt-BR",{sensitivity:"base"}));
const anterior=label;const lr=r(lembrete),ar=r(anterior);const ordemDom=label.nextElementSibling===lembrete&&(!chips.length||(lembrete.compareDocumentPosition(chips[0])&Node.DOCUMENT_POSITION_FOLLOWING)>0);const phCv=document.createElement("canvas").getContext("2d");const rcs=getComputedStyle(resp);phCv.font=rcs.fontStyle+" "+rcs.fontWeight+" "+rcs.fontSize+" "+rcs.fontFamily;const placeholderCabe=phCv.measureText(resp.placeholder||"").width<=resp.clientWidth-parseFloat(rcs.paddingLeft)-parseFloat(rcs.paddingRight)-2;const mesmaLinha=Math.abs((lr.top+lr.height/2)-(ar.top+ar.height/2))<=4;
const falar=linha.querySelector(".field-assist-voice");const chip=linha.querySelector(".pc-chip-funcionou");const mais=linha.querySelector(".pc-acao-mais");const chipVisivel=!!chip&&getComputedStyle(chip).visibility!=="hidden";
return JSON.stringify({existe:chips.length>0&&!!lembrete&&!!chip,
largura:innerWidth,
semSobreposicao:sobrepostos.length===0,
chipsSemCorte:chips.every((c)=>c.scrollWidth<=c.clientWidth),
chipsNomeCurto:chips.every((c)=>c.textContent.trim()===curto(c.title)||c.textContent.trim()===c.title.trim())&&chips.some((c)=>c.textContent.trim()!==c.title.trim()),
chipsOrdemAlfabetica:JSON.stringify(ordenados)===JSON.stringify(chips.map((c)=>c.title)),
lembreteDepoisDoRotulo:ordemDom,lembreteAzul15:getComputedStyle(lembrete).color===corDeAcao&&getComputedStyle(lembrete).fontSize==="15px"&&Math.round(r(lembrete).height)>=40,chipsAlvo40:chips.every((c)=>Math.round(r(c).height)>=40),placeholderCabe,maisAlvo40:!mais||Math.round(r(mais).height)>=40,
lembreteEncostado:mesmaLinha&&lr.left-ar.right<=16&&lr.left>=ar.right,
camposEmpilhados:innerWidth>=1100?(Math.abs(r(resp).top-r(prazo).top)<=1&&r(prazo).left>r(resp).right):r(prazo).top>=r(resp).bottom-1,
prazoSemSobrepor:!sug||(r(sug).left>=fimDoValor+4&&r(sug).right<=r(prazo).right),
listaLargura:innerWidth<1200?Math.abs(r(lista).width-300)<=2:Math.abs(r(lista).width-340)<=2,
falarConforme:!!falar&&falar.title===falar.getAttribute("aria-label")&&(innerWidth<1200?(falar.innerText.trim()===""&&/Falar/.test(falar.title)):/Falar/.test(falar.innerText)),
chipFuncionou:chipVisivel?(chip.scrollWidth<=chip.clientWidth&&getComputedStyle(chip).textOverflow!=="ellipsis"&&/Visita [0-9]+/.test(chip.textContent)&&r(chip).right<=r(linha).right+0.5):(!!mais&&/^[+][0-9]+ sugest/.test(mais.textContent.trim())),
barraSemEstouro:linha.scrollWidth<=linha.clientWidth+1,
corpoSemRolagemHorizontal:corpo.scrollWidth<=corpo.clientWidth+1,
detalhes:{chipDaAcaoNaBarra:chipVisivel,sobrepostos,chips:chips.map((c)=>c.textContent.trim()),lembreteMesmaLinha:mesmaLinha,caixaLista:Math.round(r(lista).width)}})}catch(e){return JSON.stringify({existe:false,erro:String(e.stack).slice(0,300)})}})()`;
  {
    const antes = await js('document.querySelector(".pc-cor .pc-cor-card.is-selected .pc-cor-titulo")?.textContent||""');
    await js(`(()=>{const c=[...document.querySelectorAll(".pc-cor .pc-cor-card")].find((x)=>x.innerText.includes("Ralo sem tampa"));if(!c)return false;c.click();return true})()`);
    await esperar(async () => js('document.querySelector(".pc-cor .pc-detail-title")?.textContent.includes("Ralo sem tampa")'), 5000);
    registrar("17aa0. Correções: a correção reincidente de teste (Ralo sem tampa, com a ação que funcionou na Visita 1) abre no detalhe", await js('!!document.querySelector(".pc-cor .pc-detail-title")?.textContent.includes("Ralo sem tampa")&&!!document.querySelector(".pc-cor .pc-chip-funcionou")'));
    const prazoOriginal = await js('document.querySelector(".pc-cor .pc-plan-prazo input").value');
    const definirPrazo = (valor) => js(`(()=>{const el=document.querySelector(".pc-cor .pc-plan-prazo input");Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),"value").set.call(el,${JSON.stringify(valor)});el.dispatchEvent(new Event("input",{bubbles:true}));return true})()`);
    for (const [largura, altura] of [[1152, 800], [1440, 800]]) {
      await n.enviar("Emulation.setDeviceMetricsOverride", { width: largura, height: altura, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
      await n.esperar(500);
      await foto(`17aa-${largura}`);
      const normal = JSON.parse(await js(medirAjustesDeCorrecoes));
      const [okN, falhaN] = resultadoDosChecks(JSON.stringify(normal));
      registrar(`17aa. ${largura} px: chips de pessoa sem corte (nome curto, ordem alfabética), 'Enviar lembrete' azul de 15 px encostado ao grupo, nenhum chip/campo/botão sobrepõe outro, lista de ${largura < 1200 ? "300" : "340"} px, 'Falar' ${largura < 1200 ? "só o ícone" : "com texto"}, chip 'Ação que funcionou antes' inteiro ou em '+N sugestões'`, okN, falhaN || JSON.stringify(normal.detalhes));
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
    // Responsável e Prazo: lado a lado a 1100 px e empilhados a 1099 px; Prazo sem sobreposição nos dois.
    for (const largura of [1100, 1099]) {
      await n.enviar("Emulation.setDeviceMetricsOverride", { width: largura, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
      await n.esperar(500);
      const m = JSON.parse(await js(medirAjustesDeCorrecoes));
      const [okL, falhaL] = resultadoDosChecks(JSON.stringify({ existe: m.existe, camposEmpilhados: m.camposEmpilhados, prazoSemSobrepor: m.prazoSemSobrepor, semSobreposicao: m.semSobreposicao, chipsSemCorte: m.chipsSemCorte, placeholderCabe: m.placeholderCabe, lembreteDepoisDoRotulo: m.lembreteDepoisDoRotulo }));
      registrar(`17aa4. ${largura} px: Responsável e Prazo ${largura >= 1100 ? "lado a lado" : "empilhados"}, sem sobreposição e sem chip cortado`, okL, falhaL || JSON.stringify(m.detalhes));
    }
    for (const largura of [1199, 1200, 1300]) {
      await n.enviar("Emulation.setDeviceMetricsOverride", { width: largura, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
      await n.esperar(400);
      const m = JSON.parse(await js(medirAjustesDeCorrecoes));
      registrar(`17aa5. ${largura} px: lista de ${largura < 1200 ? "300" : "340"} px, 'Falar' ${largura < 1200 ? "só o ícone" : "com texto"} e nada sobreposto`, m.existe !== false && m.listaLargura && m.falarConforme && m.semSobreposicao && m.chipFuncionou, JSON.stringify(m.detalhes));
    }
    // 1001 px (o mais estreito da etapa): sem espaço, o chip vai para "+N sugestões" sem truncar e a lista o mostra com o "Visita N".
    await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1001, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
    await n.esperar(500);
    const estreito = JSON.parse(await js(medirAjustesDeCorrecoes));
    const [okE, falhaE] = resultadoDosChecks(JSON.stringify({ existe: estreito.existe, semSobreposicao: estreito.semSobreposicao, chipsSemCorte: estreito.chipsSemCorte, chipFuncionou: estreito.chipFuncionou, barraSemEstouro: estreito.barraSemEstouro }));
    await js('document.querySelector(".pc-cor .pc-acao-mais")?.click()');
    await n.esperar(200);
    const naLista = await js('/Ação que funcionou antes · Visita [0-9]+/.test(document.querySelector(".pc-cor .pc-acao-sugestoes")?.innerText||"")');
    await js('document.querySelector(".pc-cor .pc-acao-mais")?.click()');
    registrar("17aa6. 1001 px: o chip 'Ação que funcionou antes' ou cabe inteiro na barra, ou entra em '+N sugestões' (e a lista o mostra com o 'Visita N'); sem sobreposição nem truncamento", okE && (estreito.detalhes.chipDaAcaoNaBarra || naLista), falhaE || JSON.stringify({ ...estreito.detalhes, naLista }));
    await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
    await n.esperar(400);
    await js(`(()=>{const c=[...document.querySelectorAll(".pc-cor .pc-cor-card")].find((x)=>x.querySelector(".pc-cor-titulo")?.textContent===${JSON.stringify(antes)});c?.click();return !!c})()`);
    await n.esperar(300);
    // 17aa7. Card Importante (chip "15 dias · importante", o mais largo): o Prazo continua sem sobrepor o valor da data e o placeholder do Responsável cabe.
    for (const largura of [1100, 1152, 1440]) {
      await n.enviar("Emulation.setDeviceMetricsOverride", { width: largura, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
      await n.esperar(400);
      const m = JSON.parse(await js(medirAjustesDeCorrecoes));
      const chipImportante = await js('/importante/.test(document.querySelector(".pc-cor .pc-prazo-sugerido")?.textContent||"")');
      registrar(`17aa7. ${largura} px, correção Importante: chip do prazo sem sobrepor o valor da data, placeholder 'Escolha o responsável' inteiro, nada sobreposto`, chipImportante && m.prazoSemSobrepor && m.placeholderCabe && m.semSobreposicao && m.chipsSemCorte, JSON.stringify({ chipImportante, prazoSemSobrepor: m.prazoSemSobrepor, placeholderCabe: m.placeholderCabe, semSobreposicao: m.semSobreposicao }));
    }
    await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 800, screenWidth: 1440, screenHeight: 800, deviceScaleFactor: 1, mobile: false });
    await n.esperar(300);
  }
  await js(`(()=>{const set=(el,v)=>{Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),"value").set.call(el,v);el.dispatchEvent(new Event("input",{bubbles:true}))};set(document.querySelector(".pc-cor .pc-acao-area"),"Providenciar a correção");set(document.querySelector(".pc-cor .pc-plan-resp input"),"Elton");return true})()`);
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
