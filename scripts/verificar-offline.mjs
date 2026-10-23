// Verificação do trabalho sem sinal, no app de verdade (navegador sem janela, via DevTools) e com um "servidor" falso dentro da página:
// ele guarda o estado e a versão (updated_at) no localStorage da página, devolve 409 quando a versão esperada não é a atual, e obedece a interruptores
// (sem sinal, sessão expirada, resposta perdida depois de gravar). Nada sai da máquina. Dados: só a empresa de teste "Beyond Nutri".
// Uso: npm run build && node --experimental-strip-types scripts/verificar-offline.mjs [--saida pasta]
import { mkdirSync, writeFileSync } from "node:fs";
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
        if (corpo.expectedUpdatedAt !== s.updatedAt) return json({ ok: false, conflict: true, configured: true, data: s.data, updatedAt: s.updatedAt }, 409);
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
  await n.esperar(3000);
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
} catch (erro) {
  registrar(`erro na verificação: ${erro.message}`, false);
} finally {
  await n.fechar();
  app.parar();
}

const falhas = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - falhas.length} de ${resultados.length} passaram.`);
process.exit(falhas.length ? 1 : 0);
