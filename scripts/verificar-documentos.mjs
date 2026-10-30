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
    registrar(`29c. POPs (${nome}): '+ Adicionar POP' laranja com texto branco (sem azul-marinho)`, botoes.add === "rgb(232, 89, 26)", JSON.stringify(botoes));

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
    registrar(`29d. Pessoas (${nome}): linhas sem caixa com avatar creme, estados do treinamento e abas de texto`, pes.linhas === 4 && pes.estados.join("|") === "Treinamento em dia|Treinamento pendente|Treinamento em dia|Treinamento sem registro" && pes.avatar === "rgb(255, 246, 229)" && /Colaboradores 4/.test(pes.abas[0]) && /Capacitação 3/.test(pes.abas[1]) && pes.botao === "rgb(232, 89, 26)", JSON.stringify(pes));
    registrar(`29e. Pessoas (${nome}): a página não rola`, await semPaginaRola());
    await clicar("button", "+ Adicionar pessoa");
    await esperar(async () => js('!!document.querySelector(".jan-caixa")'), 5000);
    await n.esperar(300);
    await foto(`29-addpessoa-${nome}`);
    await js(`(()=>{const i=document.querySelector(".jan-caixa input");const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;set.call(i,"ana  souza");i.dispatchEvent(new Event("input",{bubbles:true}))})()`);
    await n.esperar(300);
    const jan = JSON.parse(await js(`JSON.stringify({foco:document.activeElement===document.querySelector(".jan-caixa input"),conta:[...document.querySelectorAll(".jan-conta")].map(x=>x.innerText),erro:document.querySelector(".jan-caixa .ui-field-error")?.innerText||"",aviso:document.querySelector(".jan-aviso")?.innerText||"",salvar:getComputedStyle([...document.querySelectorAll(".jan-rodape button")].find(b=>/Salvar pessoa/.test(b.innerText))).backgroundColor,pos:(()=>{const r=document.querySelector(".jan-caixa").getBoundingClientRect();return {topo:Math.round(r.top),base:Math.round(r.bottom),w:Math.round(r.width),h:window.innerHeight}})()})`));
    registrar(`29f. Adicionar pessoa (${nome}): foco no Nome, contadores 'N de 80/60', aviso de nome repetido dentro do campo, aviso creme inteiro e Salvar verde; ${nome === "celular" ? "janela de baixo" : "janela centralizada"}`, jan.foco && jan.conta.join("|") === "10 de 80|0 de 60" && /Já existe uma pessoa/.test(jan.erro) && /Não registre dados de saúde\.$/.test(jan.aviso) && jan.salvar.startsWith("rgb(") && (nome === "celular" ? jan.pos.base >= jan.pos.h - 2 : jan.pos.topo > 20 && jan.pos.base < jan.pos.h - 20), JSON.stringify(jan));
    await js(`document.querySelector(".jan-caixa").dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))`);
    await n.esperar(400);
    registrar(`29g. Adicionar pessoa (${nome}): Esc fecha a janela`, await js('!document.querySelector(".jan-caixa")'));

    // Programas
    await irPara("Programas");
    await esperar(async () => js('!!document.querySelector(".prog-item")'), 8000);
    await n.esperar(400);
    await foto(`29-programas-${nome}`);
    const prog = JSON.parse(await js(`JSON.stringify({sub:[...document.querySelectorAll(".cdoc-sub")].map(x=>x.innerText),estados:[...document.querySelectorAll(".prog-estado .sel-texto")].map(x=>x.innerText),rodape:document.querySelector(".cen-salvar")?.innerText.replace(/\\s+/g," ").trim(),rodapeBg:document.querySelector(".cen-salvar")&&getComputedStyle(document.querySelector(".cen-salvar")).backgroundColor})`));
    registrar(`29h. Programas (${nome}): cabeçalho 'Capítulo 3 · … · 1 ativo e 1 em implantação', estados em texto (Ativo/Em implantação/Não iniciado) e rodapé branco com 'Tudo salvo'`, /Capítulo 3 · Programas de Controle de Qualidade · 1 ativo e 1 em implantação/.test(prog.sub[0]) && prog.estados[0] === "Ativo" && prog.estados[1] === "Em implantação" && prog.estados[2] === "Não iniciado" && /Tudo salvo/.test(prog.rodape) && prog.rodapeBg === "rgb(255, 255, 255)", JSON.stringify(prog));
    registrar(`29i. Programas (${nome}): a página não rola`, await semPaginaRola());

    // Comprovantes
    await irPara("Comprovantes");
    await esperar(async () => js('!!document.querySelector(".comp-linha")'), 8000);
    await foto(`29-comprovantes-${nome}`);
    const comp = JSON.parse(await js(`JSON.stringify({resumo:document.querySelector(".comp-resumo")?.innerText,linhas:[...document.querySelectorAll(".comp-linha .comp-l-estado")].map(x=>x.innerText),botao:getComputedStyle(document.querySelector(".comp-anexar")).backgroundColor,largo:Math.round(document.querySelector(".comp-anexar").getBoundingClientRect().width)})`));
    registrar(`29j. Comprovantes (${nome}): resumo em texto colorido, vencidos primeiro e '+ Anexar comprovante' laranja${nome === "celular" ? " de largura total" : ""}`, /1 vencido · 1 vence em 30 dias · 1 em dia/.test(comp.resumo) && /^Vencido há 10 dias/.test(comp.linhas[0]) && comp.botao === "rgb(232, 89, 26)" && (nome !== "celular" || comp.largo > 300), JSON.stringify(comp));
    registrar(`29k. Comprovantes (${nome}): a página não rola`, await semPaginaRola());

    // Manual
    await irPara("Manual");
    await esperar(async () => js('!!document.querySelector(".man-sec")'), 8000);
    await n.esperar(400);
    await foto(`29-manual-${nome}`);
    const man = JSON.parse(await js(`JSON.stringify({secoes:[...document.querySelectorAll(".man-sec .man-cab")].map(x=>x.innerText.replace(/\\s+/g," ").trim()),abertas:document.querySelectorAll(".man-cab[aria-expanded=true]").length,duplo:document.querySelector(".man-campo--duplo")&&Math.round(document.querySelector(".man-campo--duplo").getBoundingClientRect().width),simples:document.querySelectorAll(".man-campo:not(.man-campo--duplo)")[1]&&Math.round(document.querySelectorAll(".man-campo:not(.man-campo--duplo)")[1].getBoundingClientRect().width),rodape:document.querySelector(".cen-salvar")?.innerText.replace(/\\s+/g," ").trim(),preencher:document.querySelector(".man-preencher")?.innerText.replace(/\\s+/g," ").trim()})`));
    registrar(`29l. Manual (${nome}): três linhas recolhíveis, uma aberta, 'N de 10' e 'N de M ativas', botão 'Preencher com dados do RT' com a explicação curta`, man.secoes.length === 3 && man.abertas === 1 && /Identificação complementar.* 0 de 10/.test(man.secoes[0]) && /Responsabilidades · Proprietário.* 0 de 8 ativas/.test(man.secoes[1]) && /Responsabilidades · Consultor\/RT.* 3 de 10 ativas/.test(man.secoes[2]) && /Preencher com dados do RT Completa só os campos vazios\. O que você digitou não muda\./.test(man.preencher) && /Tudo salvo/.test(man.rodape), JSON.stringify(man));
    registrar(`29m. Manual (${nome}): o primeiro campo ocupa duas colunas${nome === "celular" ? " (no celular, uma)" : ""}`, nome === "celular" ? true : man.duplo > man.simples * 1.8, JSON.stringify(man));
    registrar(`29n. Manual (${nome}): a página não rola`, await semPaginaRola());
    // máscara e validação na hora
    const digitar = (rotulo, texto) => js(`(()=>{const l=[...document.querySelectorAll(".man-campo")].find(x=>x.innerText.includes(${JSON.stringify(rotulo)}));const i=l.querySelector("input");const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;set.call(i,${JSON.stringify(texto)});i.dispatchEvent(new Event("input",{bubbles:true}));return true})()`);
    await digitar("CPF ou CNPJ", "12345678901");
    await digitar("Telefone", "11987654321");
    await n.esperar(300);
    const mask = JSON.parse(await js(`JSON.stringify({cpf:[...document.querySelectorAll(".man-campo")].find(x=>x.innerText.includes("CPF ou CNPJ")).querySelector("input").value,tel:[...document.querySelectorAll(".man-campo")].find(x=>x.innerText.includes("Telefone")).querySelector("input").value,erros:[...document.querySelectorAll(".man-campo .ui-field-error")].map(x=>x.innerText)})`));
    registrar(`29o. Manual (${nome}): CPF com máscara e erro na hora (dígitos errados), telefone com máscara`, mask.cpf === "123.456.789-01" && mask.tel === "(11) 98765-4321" && mask.erros.some((t) => /CPF inválido/.test(t)), JSON.stringify(mask));
    // abrir Consultor/RT
    await clicar(".man-cab", "Responsabilidades · Consultor/RT");
    await n.esperar(500);
    await foto(`29-manualresp-${nome}`);
    const resp = JSON.parse(await js(`JSON.stringify({abertas:document.querySelectorAll(".man-cab[aria-expanded=true]").length,liga:document.querySelectorAll(".man-liga.is-ligada").length,menus:document.querySelectorAll(".man-resp .cadest-mais").length,excluirRosa:!!document.querySelector(".cad-remover"),adicionar:!!document.querySelector(".man-adicionar"),rolagemInterna:(()=>{const l=document.querySelector(".man-lista");return !!l&&getComputedStyle(l).overflowY==="auto"})(),setas:/[▲▼]/.test(document.querySelector(".man")?.innerText||"")})`));
    registrar(`29p. Manual (${nome}): responsabilidades com círculo liga/desliga, menu ⋯ (sem 'Excluir' rosa), '+ Adicionar' fixo e lista rolando por dentro sem setas`, resp.abertas === 1 && resp.liga === 3 && resp.menus === 10 && !resp.excluirRosa && resp.adicionar && resp.rolagemInterna && !resp.setas, JSON.stringify(resp));
    registrar(`29q. Manual com responsabilidades (${nome}): a página não rola`, await semPaginaRola());
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
