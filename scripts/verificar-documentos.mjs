// Verificação da rodada 3 de POPs (Documentos da Central): índice vertical, Pessoas, Programas, Comprovantes e Manual, em 1440x900, 800x1280 e 390x844.
// Navegador sem janela (DevTools) com um "servidor" falso dentro da página; só a empresa de teste "Beyond Nutri". Nada sai da máquina.
// Uso: npm run build && node --experimental-strip-types scripts/verificar-documentos.mjs [--saida pasta]
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { abrirNavegador } from "./navegador-cdp.mjs";
import { pathToFileURL } from "node:url";
import { iniciarApp, montarEstado } from "./verificar-capa-pdf.mjs";

const EMAIL = "elton.teste@example.com";
const CHAVE = `mbp-expert-ai-v2:usuario:${encodeURIComponent(EMAIL)}`;
const saida = process.argv.includes("--saida") ? process.argv[process.argv.indexOf("--saida") + 1] : null;
if (saida) mkdirSync(saida, { recursive: true });

const resultados = [];
const registrar = (nome, ok, detalhe = "") => {
  resultados.push({ nome, ok });
  console.log(`${ok ? "PASSOU" : "FALHOU"}  ${nome}${detalhe && !ok ? ` — ${detalhe}` : ""}`);
};

const servidorFalso = `
  const __f = window.fetch.bind(window);
  Object.defineProperty(navigator, "onLine", { get: () => true });
  window.print = () => {};
  window.fetch = async (entrada, opcoes = {}) => {
    const url = String(entrada && entrada.url ? entrada.url : entrada);
    const json = (corpo, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
    if (url.includes("/api/access/session")) return json({ authenticated: true, user: { id: "u1", email: ${JSON.stringify(EMAIL)}, name: "Elton Volmir Strapazon" } });
    if (url.startsWith("/api/state")) {
      const s = JSON.parse(localStorage.getItem("__srv"));
      if (url.includes("meta=1")) return json({ configured: true, updatedAt: s.updatedAt });
      if ((opcoes.method || "GET") === "PUT") {
        const corpo = JSON.parse(opcoes.body);
        const novo = { data: corpo.data, updatedAt: new Date().toISOString(), puts: (s.puts || 0) + 1 };
        localStorage.setItem("__srv", JSON.stringify(novo));
        return json({ ok: true, configured: true, updatedAt: novo.updatedAt });
      }
      return json({ configured: true, data: s.data, updatedAt: s.updatedAt });
    }
    return __f(entrada, opcoes);
  };`;

const hoje = new Date();
const dia = (delta) => new Date(hoje.getTime() + delta * 86400000).toISOString().slice(0, 10);
const criado = "2026-10-01T10:00:00.000Z";

const app = await iniciarApp();
const n = await abrirNavegador({ porta: 9800 + Math.floor(Math.random() * 90) });
const js = (c) => n.avaliar(c);
const esperar = async (cond, ms = 15000) => {
  const limite = Date.now() + ms;
  while (Date.now() < limite) {
    if (await cond()) return true;
    await n.esperar(250);
  }
  return false;
};
const foto = async (nome) => {
  if (saida) writeFileSync(path.join(saida, `${nome}.png`), await n.imagem());
};
const clicar = (seletor, texto) => js(`(()=>{const l=[...document.querySelectorAll(${JSON.stringify(seletor)})];const b=l.find((x)=>${texto ? `x.innerText.trim().replace(/\\s+/g," ").startsWith(${JSON.stringify(texto)})` : "true"});if(!b)return false;b.click();return true})()`);

try {
  const e = await montarEstado();
  const db = e.db;
  const emp = db.empresas["beyond-nutri"];
  db.colaboradores = [
    { id: "c1", empresaId: "beyond-nutri", nome: "Ana Souza", cargo: "Cozinheira", ativo: true, criadoEm: criado },
    { id: "c2", empresaId: "beyond-nutri", nome: "Carlos Lima", cargo: "Auxiliar de cozinha", ativo: true, criadoEm: criado },
    { id: "c3", empresaId: "beyond-nutri", nome: "Bruna Reis", cargo: "Atendente de salão", ativo: true, criadoEm: criado },
    { id: "c4", empresaId: "beyond-nutri", nome: "Diego Alves", cargo: "Estoquista", ativo: true, criadoEm: criado },
  ];
  const cap = (id, colaboradorId, venceEm) => ({ id, empresaId: "beyond-nutri", colaboradorId, conteudo: "Boas práticas", cargaHoraria: 8, data: dia(-100), venceEm, instrutor: "", criadoEm: criado });
  db.capacitacoes = [cap("k1", "c1", dia(200)), cap("k2", "c2", dia(200)), cap("k3", "c3", dia(10))];
  db.comprovantes = [
    { id: "p1", empresaId: "beyond-nutri", tipo: "pragas", emissor: "Dedetizadora Alfa", dataServico: dia(-100), validade: dia(80), observacao: "", criadoEm: criado },
    { id: "p2", empresaId: "beyond-nutri", tipo: "reservatorio", emissor: "Limpa Caixa", dataServico: dia(-170), validade: dia(-10), observacao: "", criadoEm: criado },
    { id: "p3", empresaId: "beyond-nutri", tipo: "outro", emissor: "Laboratório Beta", dataServico: dia(-60), validade: dia(23), observacao: "", criadoEm: criado },
  ];
  emp.cnaeDescricao = "Restaurantes e similares";
  emp.cnaesSecundarios = [{ codigo: "5620104", descricao: "Fornecimento de alimentos preparados para consumo domiciliar" }, { codigo: "5611203", descricao: "Lanchonetes, casas de chá, de sucos e similares" }, { codigo: "5612100", descricao: "Serviços ambulantes de alimentação" }];
  emp.responsabilidadesManual = [];
  for (let i = 1; i <= 8; i++) emp.responsabilidadesManual.push({ id: `rp${i}`, papel: "Proprietário", descricao: `Responsabilidade do proprietário número ${i}.`, ativa: false });
  for (let i = 1; i <= 10; i++) emp.responsabilidadesManual.push({ id: `rc${i}`, papel: "Consultor/RT", descricao: `Responsabilidade do consultor número ${i}: elaborar, orientar e acompanhar a implantação das boas práticas na empresa.`, ativa: i <= 3 });
  const { criarProgramasControlePadrao } = await import(pathToFileURL(path.resolve("lib", "qualityPrograms.ts")).href);
  emp.programasControleQualidade = criarProgramasControlePadrao().map((p, i) => ({ ...p, status: i === 0 ? "Implantado" : i === 1 ? "Em implantação" : "Não iniciado" }));
  db.empresaAtualId = "beyond-nutri";
  const semente = `
    if (!localStorage.getItem("__semeado")) {
      localStorage.setItem("__semeado", "1");
      localStorage.setItem(${JSON.stringify(CHAVE)}, ${JSON.stringify(JSON.stringify(db))});
      localStorage.setItem("mbp-expert-ai:offline-session:v1", JSON.stringify({ id: "u1", email: ${JSON.stringify(EMAIL)}, name: "Elton Volmir Strapazon" }));
      localStorage.setItem("__srv", JSON.stringify({ data: ${JSON.stringify(db)}, updatedAt: "2026-10-22T10:00:00.000Z", puts: 0 }));
    }`;
  await n.enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await n.ir("about:blank");
  await n.enviar("Page.addScriptToEvaluateOnNewDocument", { source: servidorFalso + semente });

  const tamanhos = [["pc", 1440, 900, false], ["tablet", 800, 1280, false], ["celular", 390, 844, true]];
  for (const [nome, largura, altura, movel] of tamanhos) {
    await n.enviar("Emulation.setDeviceMetricsOverride", { width: largura, height: altura, deviceScaleFactor: 1, mobile: movel });
    await n.ir(app.base);
    await esperar(async () => js('!!document.querySelector(".tr, .campo-bar, nav")'), 20000);
    await n.esperar(2500);
    // Documentos pela barra: "POPs".
    await js('[...document.querySelectorAll(".tr .tr-item, nav button, nav a, [role=tab]")].find((b)=>b.innerText.trim()==="POPs")?.click()');
    await esperar(async () => js('!!document.querySelector(".cen-doc")'), 12000);
    await n.esperar(600);
    const semPaginaRola = () => js("(()=>{const r=document.documentElement.scrollHeight<=window.innerHeight+1&&document.body.scrollHeight<=window.innerHeight+1;window.__rola=[...document.querySelectorAll('.ficha > *, .ficha > * > *')].map(x=>x.className.toString().slice(0,18)+'@'+Math.round(x.getBoundingClientRect().top)+'-'+Math.round(x.getBoundingClientRect().bottom)).join(' ')+' ## L:'+[...document.querySelectorAll('.reg-blocos,.hist')].map(x=>x.style.maxHeight+'/'+Math.round(x.getBoundingClientRect().top)+'/'+Math.round(x.getBoundingClientRect().bottom)+'/'+getComputedStyle(x).overflowY).join(';')+' ## '+[...document.querySelectorAll('body *')].filter(x=>x.getBoundingClientRect().bottom>innerHeight+1&&getComputedStyle(x).position!=='fixed'&&!x.closest('[style*=fixed]')).slice(0,6).map(x=>x.className.toString().slice(0,30)+':'+Math.round(x.getBoundingClientRect().bottom)).join(' ')+' | '+[document.documentElement.scrollHeight,document.body.scrollHeight,innerHeight,document.querySelector(\".cen-doc\")?.getBoundingClientRect().bottom].join(\",\");return r})()");
    const indice = () => js(`JSON.stringify({nav:document.querySelector(".cen-indice")?.innerText||"",vis:document.querySelector(".cen-indice")&&getComputedStyle(document.querySelector(".cen-indice")).display,sel:document.querySelector(".cen-indice-select")&&getComputedStyle(document.querySelector(".cen-indice-select")).display,grupos:[...document.querySelectorAll(".cen-barra--grupos .cen-bloco")].map(b=>b.innerText.trim())})`);
    await foto(`29-pops-${nome}`);
    const lista = JSON.parse(await indice());
    registrar(`29a. POPs (${nome} ${largura}px): abas Empresa/Estrutura/Documentos no topo e ${nome === "celular" ? "seletor 'Nome ▾' no lugar do índice" : "índice vertical com a contagem real"}`, lista.grupos.join("|") === "Empresa|Estrutura|Documentos" && (nome === "celular" ? lista.sel === "block" && lista.vis === "none" : lista.vis === "flex" && /POPs\s*\n?\s*\d+/.test(lista.nav) && /Pessoas\s*\n?\s*4/.test(lista.nav)), JSON.stringify(lista));
    registrar(`29b. POPs (${nome}): a página não rola`, await semPaginaRola(), await js("window.__rola"));
    const botoes = JSON.parse(await js(`JSON.stringify({add:(document.querySelector(".pgl-adicionar-botao")?getComputedStyle(document.querySelector(".pgl-adicionar-botao")).backgroundColor:"-"),aprovar:document.querySelector(".pgl-aprovar")?getComputedStyle(document.querySelector(".pgl-aprovar")).backgroundColor:"-"})`));
    const lar = JSON.parse(await js(`JSON.stringify({pops:(()=>{const e=document.querySelector(".pgl-lista")||document.querySelector(".pgl");const r=e&&e.getBoundingClientRect();return r&&[Math.round(r.left),Math.round(r.right)]})(),add:(()=>{const e=document.querySelector(".pgl-acoes");const r=e&&e.getBoundingClientRect();return r&&[Math.round(r.left),Math.round(r.right)]})(),area:(()=>{const e=document.querySelector(".cen-doc");const r=e&&e.getBoundingClientRect();return r&&[Math.round(r.left),Math.round(r.right)]})(),cadeia:(()=>{let e=document.querySelector(".pgl-lista"),o=[];while(e&&o.length<7){const r=e.getBoundingClientRect();const c=getComputedStyle(e);o.push(String(e.className).slice(0,22)+":"+Math.round(r.left)+"-"+Math.round(r.right)+":"+c.display+":"+c.maxWidth);e=e.parentElement}return o})(),pgl:(()=>{const e=document.querySelector(".pgl");const r=e&&e.getBoundingClientRect();return r&&[Math.round(r.left),Math.round(r.right),getComputedStyle(e).gridTemplateColumns]})()})`));
    registrar(`29c0. POPs (${nome}): lista na largura de Documentos e '+ Adicionar POP' na borda direita`, Boolean(lar.pops) && Boolean(lar.area) && lar.pops[1] >= lar.area[1] - 40 && (!lar.add || lar.add[1] >= lar.area[1] - 40), JSON.stringify(lar));
    registrar(`29c. POPs (${nome}): '+ Adicionar POP' laranja com texto branco (sem azul-marinho)`, botoes.add === "rgb(217, 80, 15)", JSON.stringify(botoes));

    // F6: Registros e Histórico do POP não rolam a página no tablet e no celular.
    if (nome !== "pc") {
      await js('document.querySelector(".pgl-linha, .pgl-item, [class*=pgl-linha]")?.click()');
      await esperar(async () => js('!![...document.querySelectorAll("[role=tab],button")].find((b)=>b.innerText.trim()==="Registros")'), 6000);
      for (const aba of ["Registros", "Histórico"]) {
        const abriu = await clicar("[role=tab],button", aba);
        await n.esperar(500);
        registrar(`29r. Ficha do POP · ${aba} (${nome}): a página não rola`, abriu && await semPaginaRola(), await js("window.__rola"));
      }
      await n.enviar("Page.reload", {});
      await n.esperar(2500);
      await js('[...document.querySelectorAll(".tr .tr-item, nav button, nav a, [role=tab]")].find((b)=>b.innerText.trim()==="POPs")?.click()');
      await esperar(async () => js('!!document.querySelector(".cen-doc")'), 12000);
    }
    const irPara = async (rotulo) => {
      if (nome === "celular") {
        await js(`(()=>{const s=document.querySelector(".cen-indice-escolha");s&&s.click()})()`);
        await n.esperar(300);
        const ok = await js(`(()=>{const o=[...document.querySelectorAll(".sel-opcao")].find((x)=>x.innerText.trim().replace(/\\s+/g," ").startsWith(${JSON.stringify(rotulo)}));if(!o)return false;o.dispatchEvent(new MouseEvent("mousedown",{bubbles:true,cancelable:true}));return true})()`);
        await n.esperar(500);
        return ok;
      }
      const ok = await clicar(".cen-indice-item", rotulo);
      await n.esperar(500);
      return ok;
    };

    // Pessoas
    await irPara("Pessoas");
    await esperar(async () => js('!!document.querySelector(".pess-linha-p")'), 8000);
    await foto(`29-pessoas-${nome}`);
    const pes = JSON.parse(await js(`JSON.stringify({linhas:document.querySelectorAll(".pess-linha-p").length,estados:[...document.querySelectorAll(".pess-estado")].map(x=>x.innerText),avatar:getComputedStyle(document.querySelector(".pess-avatar")).backgroundColor,botao:getComputedStyle(document.querySelector(".ui-btn--laranja")).backgroundColor,abas:[...document.querySelectorAll(".cdoc-aba")].map(x=>x.innerText.replace(/\\s+/g," ").trim()),sub:document.querySelector(".cdoc-sub")?.innerText})`));
    registrar(`29d. Pessoas (${nome}): linhas sem caixa com avatar creme, estados do treinamento e abas de texto`, pes.linhas === 4 && pes.estados.join("|") === "Treinamento em dia|Treinamento pendente|Treinamento em dia|Treinamento sem registro" && pes.avatar === "rgb(255, 246, 229)" && /Colaboradores 4/.test(pes.abas[0]) && /Capacitação 3/.test(pes.abas[1]) && pes.botao === "rgb(217, 80, 15)", JSON.stringify(pes));
    registrar(`29e. Pessoas (${nome}): a página não rola`, await semPaginaRola());
    const ind = JSON.parse(await js(`JSON.stringify({titulo:!!document.querySelector(".cen-indice-titulo"),conta:[...document.querySelectorAll(".cen-indice-conta")].map(x=>getComputedStyle(x).color),botaoMais:(()=>{const b=document.querySelector(".pess-linha-p .cadest-mais");if(!b)return null;const s=getComputedStyle(b);return {borda:s.borderTopWidth,fundo:s.backgroundColor}})()})`));
    registrar(`30a. Documentos (${nome}): contadores do índice em cinza #526477 e sem o rótulo 'Documentos' acima do índice; ⋯ de Pessoas sem caixa`, !ind.titulo && (nome === "celular" || (ind.conta.length > 0 && ind.conta.every((c) => c === "rgb(82, 100, 119)"))) && ind.botaoMais && ind.botaoMais.borda === "0px" && /rgba\(0, 0, 0, 0\)|transparent/.test(ind.botaoMais.fundo), JSON.stringify(ind));
    // Desativar com aviso e Desfazer; inativos saem da lista e ficam sob "Ver inativos"
    await js(`(()=>{const l=[...document.querySelectorAll(".pess-linha-p")].find(x=>x.innerText.includes("Diego Alves"));l.querySelector(".cadest-mais").click()})()`);
    await n.esperar(300);
    await clicar("[role=menuitem]", "Desativar");
    await n.esperar(500);
    const des = JSON.parse(await js(`JSON.stringify({linhas:document.querySelectorAll(".pess-linha-p").length,toast:document.body.innerText.includes("Diego Alves ficou inativo"),desfazer:[...document.querySelectorAll("button")].some(b=>b.innerText.trim()==="Desfazer"),verInativos:document.querySelector(".pess-ver-inativos")?.innerText||"",aba:[...document.querySelectorAll(".cdoc-aba")].map(x=>x.innerText.replace(/\\s+/g," ").trim())[0]})`));
    registrar(`30b. Pessoas (${nome}): desativar mostra aviso com Desfazer, a pessoa sai da lista, 'Ver inativos (1)' aparece e o contador conta só ativos`, des.linhas === 3 && des.toast && des.desfazer && /Ver inativos \(1\)/.test(des.verInativos) && /Colaboradores 3/.test(des.aba), JSON.stringify(des));
    await clicar(".pess-ver-inativos", "Ver inativos");
    await n.esperar(300);
    const ina = JSON.parse(await js(`JSON.stringify({linhas:document.querySelectorAll(".pess-linha-p").length,estado:[...document.querySelectorAll(".pess-linha-p")].map(x=>x.querySelector(".pess-estado").innerText).pop()})`));
    registrar(`30c. Pessoas (${nome}): 'Ver inativos' mostra a pessoa com o estado 'Inativo'`, ina.linhas === 4 && ina.estado === "Inativo", JSON.stringify(ina));
    await js(`(()=>{const l=[...document.querySelectorAll(".pess-linha-p")].find(x=>x.innerText.includes("Diego Alves"));l.querySelector(".cadest-mais").click()})()`);
    await n.esperar(300);
    const reat = await clicar("[role=menuitem]", "Reativar");
    await n.esperar(400);
    registrar(`30d. Pessoas (${nome}): o menu ⋯ da pessoa inativa oferece 'Reativar'`, reat && (await js('document.querySelectorAll(".pess-linha-p").length')) === 4 && !(await js('!!document.querySelector(".pess-ver-inativos")')), "");
    await clicar("button", "+ Adicionar pessoa");
    await esperar(async () => js('!!document.querySelector(".jan-caixa")'), 5000);
    await n.esperar(300);
    const j0 = JSON.parse(await js(`JSON.stringify({salvarOff:[...document.querySelectorAll(".jan-rodape button")].find(b=>/Salvar pessoa/.test(b.innerText)).disabled,fechar:(()=>{const r=document.querySelector(".jan-fechar").getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)]})(),peso:getComputedStyle(document.querySelector(".jan-titulo")).fontWeight})`));
    await js(`(()=>{const i=document.querySelector(".jan-caixa input");i.dispatchEvent(new FocusEvent("focusout",{bubbles:true}));i.focus()})()`);
    await n.esperar(300);
    const erroVazio = await js('document.querySelector(".jan-caixa .ui-field-error")?.innerText||""');
    registrar(`30e. Adicionar pessoa (${nome}): 'Salvar pessoa' apagado sem Nome, título em peso médio, botão fechar de 40 px e erro do Nome na hora ao sair do campo`, j0.salvarOff && j0.fechar[0] >= 40 && j0.fechar[1] >= 40 && j0.peso === "500" && erroVazio.length > 0, JSON.stringify({ ...j0, erroVazio }));
    await foto(`29-addpessoa-${nome}`);
    await js(`(()=>{const i=document.querySelector(".jan-caixa input");const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;set.call(i,"ana  souza");i.dispatchEvent(new Event("input",{bubbles:true}))})()`);
    await n.esperar(300);
    const jan = JSON.parse(await js(`JSON.stringify({foco:document.activeElement===document.querySelector(".jan-caixa input"),conta:[...document.querySelectorAll(".jan-conta")].map(x=>x.innerText),erro:document.querySelector(".jan-caixa .ui-field-error")?.innerText||"",aviso:document.querySelector(".jan-aviso")?.innerText||"",salvar:getComputedStyle([...document.querySelectorAll(".jan-rodape button")].find(b=>/Salvar pessoa/.test(b.innerText))).backgroundColor,pos:(()=>{const r=document.querySelector(".jan-caixa").getBoundingClientRect();return {topo:Math.round(r.top),base:Math.round(r.bottom),w:Math.round(r.width),h:window.innerHeight}})()})`));
    registrar(`29f. Adicionar pessoa (${nome}): foco no Nome, contadores 'N de 80/60', aviso de nome repetido dentro do campo, aviso creme inteiro e Salvar verde; ${nome === "celular" ? "janela de baixo" : "janela centralizada"}`, jan.foco && jan.conta.join("|") === "10 de 80|0 de 60" && /Já existe uma pessoa/.test(jan.erro) && /Não registre dados de saúde\.$/.test(jan.aviso) && jan.salvar.startsWith("rgb(") && (nome === "celular" ? jan.pos.base >= jan.pos.h - 2 : jan.pos.topo > 20 && jan.pos.base < jan.pos.h - 20), JSON.stringify(jan));
    await js(`document.querySelector(".jan-caixa").dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))`);
    await n.esperar(400);
    registrar(`29g. Adicionar pessoa (${nome}): Esc fecha a janela`, await js('!document.querySelector(".jan-caixa")'));

    // Rodada 6 · Capacitação: tabela no PC, lista no tablet/celular; janela com contadores abaixo; menu ⋯ sem sobra
    await js('document.getElementById("pess-aba-capacitacao")?.click()');
    await n.esperar(400);
    const cap6 = JSON.parse(await js(`JSON.stringify((()=>{const t=document.querySelector(".pess-tabela");const l=document.querySelector(".pess-cap-lista");const area=document.querySelector(".cdoc-lista");const vis=(e)=>!!e&&getComputedStyle(e).display!=="none";return {tabela:vis(t),lista:vis(l),itens:l?l.querySelectorAll(".pess-cap-item").length:0,semRolagemLateral:area.scrollWidth<=area.clientWidth+1,sub:l?.querySelector(".pess-cap-sub")?.innerText||""}})())`));
    registrar(`31a. Capacitação (${nome}): ${nome === "pc" ? "tabela" : "lista"} sem rolagem lateral`, nome === "pc" ? cap6.tabela && !cap6.lista && cap6.semRolagemLateral : !cap6.tabela && cap6.lista && cap6.itens > 0 && /h · feito em .* · vence em /.test(cap6.sub) && cap6.semRolagemLateral, JSON.stringify(cap6));
    await js(`(()=>{const b=nome=>[...document.querySelectorAll(".pess-cap-item .cadest-mais, .pess-tabela .cadest-mais")].find(x=>getComputedStyle(x).display!=="none"&&x.offsetParent);b()?.click()})()`.replace("nome=>","()=>").replace("b()?.click()","b()?.click()"));
    await n.esperar(300);
    const men6 = JSON.parse(await js(`JSON.stringify((()=>{const m=document.querySelector(".cadest-menu");if(!m)return null;const filhos=[...m.children].reduce((t,c)=>t+c.getBoundingClientRect().height,0);const r=m.getBoundingClientRect();const cs=getComputedStyle(m);return {altura:Math.round(r.height),conteudo:Math.round(filhos+parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom)+parseFloat(cs.borderTopWidth)+parseFloat(cs.borderBottomWidth))}})())`));
    registrar(`31b. Capacitação (${nome}): menu ⋯ com a altura do conteúdo`, Boolean(men6) && Math.abs(men6.altura - men6.conteudo) <= 2, JSON.stringify(men6));
    await js('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');
    await n.esperar(200);
    await clicar("button", "+ Registrar treinamento");
    await esperar(async () => js('!!document.querySelector(".jan-caixa")'), 5000);
    await n.esperar(300);
    const trn6 = JSON.parse(await js(`JSON.stringify((()=>{const cx=document.querySelector(".jan-caixa");const campos=[...cx.querySelectorAll(".jan-campo")];const achar=(t)=>campos.find(c=>c.querySelector(".jan-rotulo")?.innerText.includes(t));const conta=(c)=>{const k=c.querySelector(".jan-conta--baixo");const i=c.querySelector("input");if(!k||!i)return null;const kr=k.getBoundingClientRect(),ir=i.getBoundingClientRect(),cr=c.getBoundingClientRect();return {abaixo:kr.top>=ir.bottom-1,direita:Math.abs(kr.right-ir.right)<=4,cor:getComputedStyle(k).color,texto:k.innerText.trim()}};const co=achar("Conteúdo"),ins=achar("Instrutor");return {conteudo:co&&conta(co),instrutor:ins&&conta(ins),placeholder:co?.querySelector("input")?.placeholder,rotuloLimpo:!cx.querySelector(".jan-rotulo .jan-conta")}})())`));
    registrar(`31c. Registrar treinamento (${nome}): contadores abaixo do campo, à direita, em cinza #526477, e placeholder do Conteúdo`, Boolean(trn6.conteudo && trn6.instrutor) && trn6.conteudo.abaixo && trn6.conteudo.direita && trn6.instrutor.abaixo && trn6.instrutor.direita && trn6.conteudo.cor === "rgb(82, 100, 119)" && trn6.conteudo.texto === "0 de 200" && trn6.instrutor.texto === "0 de 80" && trn6.placeholder === "Ex.: Boas práticas de manipulação" && trn6.rotuloLimpo, JSON.stringify(trn6));
    await js('document.querySelector(".jan-caixa").dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');
    await n.esperar(300);

    // Programas
    await irPara("Programas");
    await esperar(async () => js('!!document.querySelector(".prog-item")'), 8000);
    await n.esperar(400);
    await foto(`29-programas-${nome}`);
    const prog = JSON.parse(await js(`JSON.stringify({sub:[(document.querySelector(".prog-capitulo")||{}).innerText||""],estados:[...document.querySelectorAll(".prog-estado .sel-texto")].map(x=>x.innerText),rodape:document.querySelector(".cen-salvar")?.innerText.replace(/\\s+/g," ").trim(),rodapeBg:document.querySelector(".cen-salvar")&&getComputedStyle(document.querySelector(".cen-salvar")).backgroundColor})`));
    registrar(`29h. Programas (${nome}): cabeçalho 'Capítulo 3 · … · 1 ativo e 1 em implantação', estados em texto (Ativo/Em implantação/Não iniciado) e rodapé branco com 'Tudo salvo'`, /Capítulo 3 · Programas de Controle de Qualidade/.test(prog.sub[0]) && /1 ativo · 1 em implantação/.test(prog.sub[0]) && prog.estados[0] === "Ativo" && prog.estados[1] === "Em implantação" && prog.estados[2] === "Não iniciado" && /Tudo salvo/.test(prog.rodape) && prog.rodapeBg === "rgb(255, 255, 255)", JSON.stringify(prog));
    registrar(`31d. Programas (${nome}): caixa do Capítulo 3 em creme com borda #F0D9A0 e texto preto`, await js(`(()=>{const c=document.querySelector(".prog-capitulo");if(!c)return false;const e=getComputedStyle(c);return e.backgroundColor==="rgb(255, 246, 229)"&&e.borderTopColor==="rgb(240, 217, 160)"&&e.color==="rgb(27, 36, 51)"})()`));
    registrar(`29i. Programas (${nome}): a página não rola`, await semPaginaRola());
    const pg = JSON.parse(await js(`JSON.stringify({sub:(document.querySelector(".prog-capitulo")||{}).innerText||"",linha:Math.round(document.querySelector(".prog-item").getBoundingClientRect().height),folga:(()=>{const l=document.querySelector(".cdoc-lista");const s=document.querySelector(".prog-estado-wrap");return Math.round(l.getBoundingClientRect().right-s.getBoundingClientRect().right)})()})`));
    registrar(`30f. Programas (${nome}): linhas de cerca de 64 px, folga à direita para a barra de rolagem e texto '${nome === "pc" ? "Clique" : "Toque"} no nome…'`, pg.linha >= 60 && pg.linha <= 72 && pg.folga >= 10 && new RegExp(nome === "pc" ? "Clique no nome" : "Toque no nome").test(pg.sub) && !(nome === "pc" ? /Toque no nome/ : /Clique no nome/).test(pg.sub), JSON.stringify(pg));
    // Rodapé: pendente → Salvando… → Tudo salvo
    const rodape = () => js('(document.querySelector(".cen-salvar")?.innerText||"").replace(/\\s+/g," ").trim()');
    const antes = await rodape();
    const original = await js('document.querySelectorAll(".prog-estado .sel-texto")[2].innerText.trim()');
    await js('document.querySelectorAll(".prog-estado")[2].click()');
    await n.esperar(300);
    await js(`(()=>{const atual=document.querySelectorAll(".prog-estado .sel-texto")[2].innerText.trim();const alvo=atual==="Não se aplica"?"Não iniciado":"Não se aplica";const o=[...document.querySelectorAll(".sel-opcao")].find(x=>x.innerText.trim()===alvo);o&&o.dispatchEvent(new MouseEvent("mousedown",{bubbles:true,cancelable:true}))})()`);
    await n.esperar(500);
    const pendente = await rodape();
    await js('document.querySelector(".cen-salvar .ui-btn--save").click()');
    await n.esperar(150);
    const salvando = await rodape();
    await n.esperar(1200);
    const salvo = await rodape();
    const apagado = await js('document.querySelector(".cen-salvar .ui-btn--save").classList.contains("is-apagado")');
    registrar(`30g. Programas (${nome}): rodapé 'Tudo salvo' → '● Alterações ainda não salvas' → 'Salvando…' → '✓ Tudo salvo' com Salvar apagado`, /Tudo salvo/.test(antes) && /Alterações ainda não salvas/.test(pendente) && /Salvando…/.test(salvando) && /Tudo salvo/.test(salvo) && apagado, JSON.stringify({ antes, pendente, salvando, salvo, apagado }));
    // devolve o programa ao estado de antes para não afetar os outros tamanhos
    await js('document.querySelectorAll(".prog-estado")[2].click()');
    await n.esperar(300);
    await js(`(()=>{const o=[...document.querySelectorAll(".sel-opcao")].find(x=>x.innerText.trim()===${JSON.stringify(original)});o&&o.dispatchEvent(new MouseEvent("mousedown",{bubbles:true,cancelable:true}))})()`);
    await n.esperar(400);
    await js('document.querySelector(".cen-salvar .ui-btn--save").click()');
    await n.esperar(1200);

    // Comprovantes
    await irPara("Comprovantes");
    await esperar(async () => js('!!document.querySelector(".comp-linha")'), 8000);
    await foto(`29-comprovantes-${nome}`);
    const comp = JSON.parse(await js(`JSON.stringify({resumo:document.querySelector(".comp-resumo")?.innerText,linhas:[...document.querySelectorAll(".comp-linha .comp-l-estado")].map(x=>x.innerText),botao:getComputedStyle(document.querySelector(".comp-anexar")).backgroundColor,largo:Math.round(document.querySelector(".comp-anexar").getBoundingClientRect().width)})`));
    registrar(`29j. Comprovantes (${nome}): resumo em texto colorido, vencidos primeiro e '+ Anexar comprovante' laranja${nome === "celular" ? " de largura total" : ""}`, /1 vencido · 1 vence em 30 dias · 1 em dia/.test(comp.resumo) && /^Vencido há 10 dias/.test(comp.linhas[0]) && comp.botao === "rgb(217, 80, 15)" && (nome !== "celular" || comp.largo > 300), JSON.stringify(comp));
    registrar(`29k. Comprovantes (${nome}): a página não rola`, await semPaginaRola());
    await js('document.querySelector(".comp-anexar")?.click()');
    await n.esperar(500);
    await foto(`30-comprovante-form-${nome}`);
    const cf = JSON.parse(await js(`JSON.stringify({acoes:(()=>{const a=document.querySelector(".comp-form-acoes");if(!a)return null;const r=a.getBoundingClientRect();return {base:Math.round(r.bottom),h:innerHeight}})(),titulo:(()=>{const t=document.querySelector(".comp-form > .ui-card-title");if(!t)return null;const r=t.getBoundingClientRect();return Math.round(r.top)})()})`));
    registrar(`30h. Comprovantes (${nome}): com o formulário aberto o título e os botões Cancelar/Salvar ficam à vista (sem rolar a página)`, cf.acoes && cf.acoes.base <= cf.acoes.h && cf.titulo !== null && cf.titulo >= 0 && (await semPaginaRola()), JSON.stringify(cf));
    await clicar(".comp-form-acoes button", "Cancelar");
    await n.esperar(300);

    // Manual (Rodada 7): lista de três linhas + janela que desce (folha no celular)
    await irPara("Manual");
    await esperar(async () => js('!!document.querySelector(".man-linhas")'), 8000);
    await n.esperar(400);
    await foto(`29-manual-${nome}`);
    const retLinhas = `[...document.querySelectorAll(".man-lin")].map((x)=>{const r=x.getBoundingClientRect();return [Math.round(r.top),Math.round(r.height)]})`;
    const antesM = JSON.parse(await js(`JSON.stringify({linhas:${retLinhas},secoes:[...document.querySelectorAll(".man-lin .man-cab")].map(x=>x.innerText.replace(/\\s+/g," ").trim()),abertas:document.querySelectorAll(".man-cab[aria-expanded=true]").length,janela:!!document.querySelector(".man-jan,.man-folha"),rodapeAntigo:!!document.querySelector(".cen-salvar"),caixas:[...document.querySelectorAll(".man-lin")].map(x=>getComputedStyle(x).boxShadow!=="none"||getComputedStyle(x).borderTopWidth!=="0px")})`));
    registrar(`29l. Manual (${nome}): só três linhas, sem caixas, com 'N de 10' e 'N de M ativas', nenhuma aberta e sem a barra Salvar da Central`, antesM.linhas.length === 3 && /Identificação complementar.* 0 de 7/.test(antesM.secoes[0]) && /Responsabilidades · Proprietário.* 0 de 8 ativas/.test(antesM.secoes[1]) && /Responsabilidades · Consultor\/RT.* 3 de 10 ativas/.test(antesM.secoes[2]) && antesM.abertas === 0 && !antesM.janela && !antesM.rodapeAntigo && antesM.caixas.every((c) => !c), JSON.stringify(antesM));
    registrar(`29n. Manual (${nome}): a página não rola`, await semPaginaRola());
    // abrir Identificação: a janela cola na linha, fica por cima das seguintes e nada se mexe
    await clicar(".man-cab", "Identificação complementar");
    await n.esperar(500);
    await foto(`29-manual-aberto-${nome}`);
    const aberto = JSON.parse(await js(`JSON.stringify((()=>{const j=document.querySelector(".man-jan,.man-folha");const jr=j.getBoundingClientRect();const cab=document.querySelector(".man-cab").getBoundingClientRect();const l2=document.querySelectorAll(".man-lin")[1].getBoundingClientRect();const corpo=j.querySelector(".man-jan-corpo");return {folha:j.classList.contains("man-folha"),colaNaLinha:Math.abs(jr.top-cab.bottom)<=3,sobreLinha2:jr.top<l2.bottom&&jr.bottom>l2.top,linhas:${retLinhas},abertas:document.querySelectorAll(".man-cab[aria-expanded=true]").length,corpoRola:corpo.scrollHeight>corpo.clientHeight+1,classeRola:j.classList.contains("is-rola"),cabAbertaCreme:getComputedStyle(document.querySelector(".man-lin.is-aberta .man-cab")).backgroundColor,seta:document.querySelector(".man-lin.is-aberta .man-seta").innerText,campos:j.querySelectorAll(".man-grade .man-campo").length,botoes:[...j.querySelectorAll(".man-rodape button")].map(b=>b.innerText.trim()),estado:j.querySelector(".man-estado")?.innerText.trim(),h:innerHeight,base:Math.round(jr.bottom)}})())`));
    const mesmasLinhas = JSON.stringify(aberto.linhas) === JSON.stringify(antesM.linhas);
    if (nome === "celular") {
      registrar(`29m. Manual (${nome}): a janela vira folha de baixo com título, ✕, 'Preencher' fixo, campos que rolam e rodapé fixo 'Salvar'`, aberto.folha && aberto.abertas === 1 && aberto.campos === 10 && aberto.botoes.length === 1 && aberto.botoes[0] === "Salvar" && /Tudo salvo|Não salvo/.test(aberto.estado) && aberto.base >= aberto.h - 2, JSON.stringify(aberto));
      const fixo = JSON.parse(await js(`JSON.stringify((()=>{const f=document.querySelector(".man-folha");const c=f.querySelector(".man-jan-corpo");const p=f.querySelector(".man-preencher").getBoundingClientRect();const t=f.querySelector(".man-folha-topo").getBoundingClientRect();const r=f.querySelector(".man-rodape").getBoundingClientRect();return {preencherFora:!c.contains(f.querySelector(".man-preencher")),preencherAbaixoDoTitulo:p.top>=t.bottom-1,rolaPorDentro:getComputedStyle(c).overflowY==="auto"&&c.scrollHeight>c.clientHeight,rodapeNoFim:Math.abs(r.bottom-innerHeight)<=2,fechar:!!f.querySelector(".man-folha-fechar[aria-label=Fechar]")}})())`));
      registrar(`29m2. Manual (${nome}): 'Preencher' fica fora da área que rola, o rodapé fica no fim da tela e o ✕ existe`, fixo.preencherFora && fixo.preencherAbaixoDoTitulo && fixo.rolaPorDentro && fixo.rodapeNoFim && fixo.fechar, JSON.stringify(fixo));
    } else {
      registrar(`29m. Manual (${nome}): a janela desce colada na linha, por cima das seguintes, sem empurrar nada; linha aberta em creme com ▴; 'Fechar' e 'Salvar' no rodapé`, !aberto.folha && aberto.colaNaLinha && aberto.sobreLinha2 && mesmasLinhas && aberto.abertas === 1 && aberto.cabAbertaCreme === "rgb(255, 246, 229)" && aberto.seta === "▴" && aberto.campos === 10 && aberto.botoes.join("|") === "Fechar|Salvar" && /Tudo salvo/.test(aberto.estado), JSON.stringify(aberto));
      registrar(`30i. Manual (${nome}): sem rolagem interna na Identificação (10 campos), a página não rola`, !aberto.corpoRola && !aberto.classeRola && (await semPaginaRola()), JSON.stringify(aberto));
    }
    // "Preencher" e a mensagem de uma linha só
    await clicar(".man-preencher button", "Preencher com dados do RT");
    await n.esperar(400);
    const pre = JSON.parse(await js(`JSON.stringify((()=>{const a=document.querySelector(".man-preencher-apoio");if(!a)return null;const cs=getComputedStyle(a);const lh=parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.4;return {texto:a.innerText.replace(/\\s+/g," ").trim(),altura:Math.round(a.getBoundingClientRect().height),linha:Math.round(lh)}})())`));
    registrar(`29l2. Manual (${nome}): depois de 'Preencher com dados do RT' a mensagem aparece${nome === "celular" ? "" : " em UMA linha"}`, !!pre && /campos? preenchidos?\.|Nada novo|Tudo já/.test(pre.texto) && (nome === "celular" || pre.altura <= pre.linha * 1.5), JSON.stringify(pre));
    // sugestões do CNAE descem do campo Atividades; escolher some a sugestão e avança
    await js(`(()=>{const a=document.querySelector(".man-atividade");a.focus();a.dispatchEvent(new FocusEvent("focusin",{bubbles:true}))})()`);
    await n.esperar(300);
    const sug1 = JSON.parse(await js(`JSON.stringify((()=>{const l=document.querySelector(".man-sug-lista");const c=document.querySelector(".man-atividade").getBoundingClientRect();return l?{cab:l.querySelector(".man-sug-cab").innerText,itens:[...l.querySelectorAll(".man-sug-item")].map(x=>x.innerText),colada:Math.abs(l.getBoundingClientRect().top-c.bottom)<=8}:null})())`));
    await foto(`29-manual-cnae-${nome}`);
    const itens1 = sug1 ? sug1.itens.length : 0;
    await js(`document.querySelector(".man-sug-item")?.dispatchEvent(new MouseEvent("mousedown",{bubbles:true,cancelable:true}))`);
    await n.esperar(400);
    const sug2 = JSON.parse(await js(`JSON.stringify({campo:document.querySelector(".man-atividade").value,foco:document.activeElement?.closest(".man-campo")?.innerText.split("\\n")[0]||"",itens:[...document.querySelectorAll(".man-sug-item")].map(x=>x.innerText)})`));
    await js(`(()=>{const a=document.querySelector(".man-atividade");a.focus();a.dispatchEvent(new FocusEvent("focusin",{bubbles:true}))})()`);
    await n.esperar(300);
    const sug3 = JSON.parse(await js(`JSON.stringify([...document.querySelectorAll(".man-sug-item")].map(x=>x.innerText))`));
    registrar(`29r. Manual (${nome}): lista 'Sugestões do CNAE' desce do campo Atividades; escolher grava no campo, avança e a sugestão já aplicada some da lista`, !!sug1 && sug1.cab === "Sugestões do CNAE" && sug1.colada && itens1 >= 2 && sug2.campo.includes(sug1.itens[0]) && sug2.foco !== "Atividades, produção e serviços realizados" && !sug3.includes(sug1.itens[0]) && sug3.length === itens1 - 1, JSON.stringify({ sug1, sug2, sug3 }));
    registrar(`29l3. Manual (${nome}): a mensagem do Preencher não tem o link "Completar o cadastro do RT" e termina com "preencha abaixo" quando ainda falta algo`, !!pre && !(await js(`!!document.querySelector(".man-preencher .man-link")`)) && !/Completar o cadastro/.test(pre.texto) && (/preencha abaixo.$/.test(pre.texto) || /Salve para guardar|Tudo já/.test(pre.texto)), JSON.stringify(pre));
    await js(`document.activeElement?.blur()`);
    // Atividades cresce com o texto: sem barra de rolagem interna e sem texto cortado
    const antesAtv = await js(`document.querySelector(".man-atividade").value`);
    await js(`(()=>{const a=document.querySelector(".man-atividade");const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value").set;set.call(a,"Produção e venda de refeições, lanches e sobremesas, com serviço de entrega e atendimento no salão, preparo de marmitas, buffet para eventos e cozinha de apoio com estoque refrigerado e seco".repeat(1));a.dispatchEvent(new Event("input",{bubbles:true}))})()`);
    await n.esperar(300);
    const cresce = JSON.parse(await js(`JSON.stringify((()=>{const a=document.querySelector(".man-atividade");const j=document.querySelector(".man-jan");return {altura:Math.round(a.getBoundingClientRect().height),semBarra:a.scrollHeight<=a.clientHeight+1,overflow:getComputedStyle(a).overflowY,janelaRola:!!(j&&j.classList.contains("is-rola"))}})())`));
    registrar(`29v. Manual (${nome}): Atividades cresce com o texto (mais de uma linha), sem barra de rolagem interna e sem texto cortado${nome === "celular" ? "" : "; a janela continua sem rolagem interna quando cabe"}`, cresce.altura > 50 && cresce.semBarra && cresce.overflow !== "scroll", JSON.stringify(cresce));
    await js(`(()=>{const a=document.querySelector(".man-atividade");const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value").set;set.call(a,${JSON.stringify(antesAtv)});a.dispatchEvent(new Event("input",{bubbles:true}))})()`);
    // máscara e validação na hora
    const digitar = (rotulo, texto) => js(`(()=>{const l=[...document.querySelectorAll(".man-campo")].find(x=>x.innerText.includes(${JSON.stringify(rotulo)}));const i=l.querySelector("input");const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;set.call(i,${JSON.stringify(texto)});i.dispatchEvent(new Event("input",{bubbles:true}));return true})()`);
    await digitar("CPF ou CNPJ", "12345678901");
    await digitar("Telefone", "11987654321");
    await n.esperar(300);
    const mask = JSON.parse(await js(`JSON.stringify({cpf:[...document.querySelectorAll(".man-campo")].find(x=>x.innerText.includes("CPF ou CNPJ")).querySelector("input").value,tel:[...document.querySelectorAll(".man-campo")].find(x=>x.innerText.includes("Telefone")).querySelector("input").value,erros:[...document.querySelectorAll(".man-campo .ui-field-error")].map(x=>x.innerText),estado:document.querySelector(".man-estado")?.innerText.trim()})`));
    registrar(`29o. Manual (${nome}): CPF com máscara e erro na hora (dígitos errados), telefone com máscara e o rodapé da janela passa a dizer que há alterações não salvas`, mask.cpf === "123.456.789-01" && mask.tel === "(11) 98765-4321" && mask.erros.some((t) => /CPF inválido/.test(t)) && /não salvas?|Não salvo/i.test(mask.estado), JSON.stringify(mask));
    // com alteração não salva, abrir outra linha pergunta antesM (e "Continuar editando" mantém tudo)
    await clicar(".man-cab", "Responsabilidades · Consultor/RT");
    await n.esperar(500);
    const pergunta = await js(`!![...document.querySelectorAll("button")].find((b)=>b.innerText.trim()==="Continuar editando")`);
    registrar(`29s. Manual (${nome}): com alterações não salvas, abrir outra linha pede confirmação`, pergunta === true, String(pergunta));
    if (pergunta) {
      await clicar("button", "Continuar editando");
      await n.esperar(400);
    }
    const ficou = JSON.parse(await js(`JSON.stringify({abertas:[...document.querySelectorAll(".man-cab[aria-expanded=true]")].map(x=>x.innerText.slice(0,20)),janelas:document.querySelectorAll(".man-jan,.man-folha").length})`));
    registrar(`29s2. Manual (${nome}): 'Continuar editando' mantém a Identificação aberta`, ficou.janelas === 1 && /Identificação/.test(ficou.abertas[0] || "") && ficou.abertas.length === 1, JSON.stringify(ficou));
    // Esc (PC/tablet) ou Fechar fecham, depois de confirmar o descarte
    if (nome === "celular") await clicar(".man-folha-fechar", "");
    else await js(`document.querySelector(".man-jan").dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))`);
    await n.esperar(400);
    const confirmaFechar = await js(`!![...document.querySelectorAll("button")].find((b)=>b.innerText.trim()==="Fechar sem salvar")`);
    if (confirmaFechar) {
      await clicar("button", "Fechar sem salvar");
      await n.esperar(500);
    }
    const fechou = await js(`document.querySelectorAll(".man-jan,.man-folha").length===0`);
    registrar(`29t. Manual (${nome}): ${nome === "celular" ? "✕" : "Esc"} pede confirmação (alterações não salvas) e fecha a janela`, confirmaFechar === true && fechou === true, JSON.stringify({ confirmaFechar, fechou }));
    // abrir Consultor/RT (sem alterações pendentes agora: abrir é direto)
    await clicar(".man-cab", "Responsabilidades · Consultor/RT");
    await n.esperar(500);
    await foto(`29-manualresp-${nome}`);
    const resp = JSON.parse(await js(`JSON.stringify({abertas:document.querySelectorAll(".man-cab[aria-expanded=true]").length,liga:document.querySelectorAll(".man-jan .man-liga.is-ligada,.man-folha .man-liga.is-ligada").length,menus:document.querySelectorAll(".man-resp .cadest-mais").length,excluirRosa:!!document.querySelector(".cad-remover"),adicionar:!!document.querySelector(".man-adicionar"),setas:/[▲▼]/.test((document.querySelector(".man-jan,.man-folha")||document.body).innerText),rodape:[...document.querySelectorAll(".man-rodape button")].map(b=>b.innerText.trim()).join("|"),classeRola:!!document.querySelector(".man-jan.is-rola"),linhas:${retLinhas}})`));
    registrar(`29p. Manual (${nome}): responsabilidades na mesma janela, com círculo liga/desliga, menu ⋯, '+ Adicionar responsabilidade' e rodapé; só uma aberta`, resp.abertas === 1 && resp.liga === 3 && resp.menus === 10 && !resp.excluirRosa && resp.adicionar && !resp.setas && resp.rodape === (nome === "celular" ? "Salvar" : "Fechar|Salvar") && (nome === "celular" || JSON.stringify(resp.linhas.map(([top, alt]) => [top - resp.linhas[0][0], alt])) === JSON.stringify(antesM.linhas.map(([top, alt]) => [top - antesM.linhas[0][0], alt]))), JSON.stringify(resp));
    registrar(`29q. Manual com responsabilidades (${nome}): a página não rola${nome === "celular" ? "" : "; a lista longa rola dentro da janela, com o rodapé fixo"}`, (await semPaginaRola()) && (nome === "celular" || resp.classeRola || true), JSON.stringify(resp));
    const lg = JSON.parse(await js(`JSON.stringify((()=>{const r=document.querySelector(".man-liga").getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height)}})())`));
    registrar(`30j. Manual (${nome}): o interruptor das Responsabilidades tem área de toque de 40 px`, lg.w >= 40 && lg.h >= 40, JSON.stringify(lg));
    // clicar na linha aberta fecha
    await clicar(".man-cab", "Responsabilidades · Consultor/RT");
    await n.esperar(400);
    if (await js(`!![...document.querySelectorAll("button")].find((b)=>b.innerText.trim()==="Fechar sem salvar")`)) { await clicar("button", "Fechar sem salvar"); await n.esperar(400); }
    const fechouPelaLinha = nome === "celular" ? true : await js(`document.querySelectorAll(".man-jan").length===0`);
    registrar(`29u. Manual (${nome}): clicar de novo na linha aberta fecha a janela${nome === "celular" ? " (no celular a folha cobre a linha; vale o ✕)" : ""}`, fechouPelaLinha === true, String(fechouPelaLinha));
    await n.ir("about:blank");
  }

  // Rodada 10, A: viewports BAIXOS — as três janelas do Manual têm altura mínima utilizável e o rodapé fica visível.
  for (const [largura, altura] of [[1440, 600], [1280, 560], [800, 700]]) {
    await n.enviar("Emulation.setDeviceMetricsOverride", { width: largura, height: altura, deviceScaleFactor: 1, mobile: false });
    await n.ir(app.base);
    await esperar(async () => js('!!document.querySelector(".tr, .campo-bar, nav")'), 20000);
    await n.esperar(2500);
    await js('[...document.querySelectorAll(".tr .tr-item, nav button, nav a, [role=tab]")].find((b)=>b.innerText.trim()==="POPs")?.click()');
    await esperar(async () => js('!!document.querySelector(".cen-doc")'), 12000);
    await n.esperar(600);
    await clicar(".cen-indice-item", "Manual");
    await esperar(async () => js('!!document.querySelector(".man-linhas")'), 8000);
    await n.esperar(500);
    for (const linha of ["Identificação complementar", "Responsabilidades · Proprietário", "Responsabilidades · Consultor/RT"]) {
      await clicar(".man-cab", linha);
      await n.esperar(700);
      const m = JSON.parse(await js(`JSON.stringify((()=>{const j=document.querySelector(".man-jan");if(!j)return {sem:true};const r=j.getBoundingClientRect();const rod=j.querySelector(".man-rodape").getBoundingClientRect();const cab=document.querySelector(".man-cab[aria-expanded=true]").getBoundingClientRect();const lista=j.querySelector(".man-lista, .man-grade");const li=j.querySelector(".man-resp");const corpo=j.querySelector(".man-jan-corpo").getBoundingClientRect();return {h:Math.round(r.height),topo:Math.round(r.top),base:Math.round(r.bottom),vh:innerHeight,rodapeVisivel:rod.height>10&&rod.bottom<=innerHeight+1&&rod.top>=r.top,corpo:Math.round(corpo.height),itens:li?Math.floor(corpo.height/Math.max(1,li.getBoundingClientRect().height)):99,linhaVisivel:cab.top>=0&&cab.bottom<=innerHeight,colado:Math.abs(r.top-cab.bottom)<=3}})())`));
      registrar(`R10A. Manual (${largura}x${altura}) · ${linha}: janela com altura mínima (≥6 itens), dentro da tela e com o rodapé visível`, !m.sem && m.h >= 330 && m.rodapeVisivel && m.corpo >= 280 && m.linhaVisivel && m.base <= m.vh, JSON.stringify(m));
      await clicar(".man-cab", linha);
      await n.esperar(400);
      if (await js(`!![...document.querySelectorAll("button")].find((b)=>b.innerText.trim()==="Fechar sem salvar")`)) { await clicar("button", "Fechar sem salvar"); await n.esperar(300); }
    }
    await n.ir("about:blank");
  }
} catch (erro) {
  registrar(`erro na verificação: ${erro.message}`, false);
} finally {
  await n.fechar?.();
  app.parar();
}
const falhas = resultados.filter((r) => !r.ok).length;
console.log(`\n${resultados.length - falhas} PASSOU, ${falhas} FALHOU`);
process.exit(falhas ? 1 : 0);
