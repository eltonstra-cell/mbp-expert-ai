// Confere o cartaz "Como lavar as mãos" no PDF de verdade: sobe o app (build de produção, sem banco e sem dados reais), abre o POP pelo mesmo
// caminho do usuário, escolhe o estilo na janela "Gerar cartaz", clica em "Gerar cartaz (PDF)" e gera o PDF com a impressão do Chrome/Edge.
// Uso: node --experimental-strip-types scripts/verificar-cartaz-pdf.mjs [--saida pasta]   (precisa de `npm run build` feito antes)
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inflateSync } from "node:zlib";
import { abrirNavegador } from "./navegador-cdp.mjs";
import { paginasDoPdf, tituloDoPdf } from "./pdf-texto.mjs";
import { iniciarApp, montarEstado, prerequisitos } from "./verificar-capa-pdf.mjs";

export { prerequisitos };

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const ESTILOS = [["agua", "Água e bolhas"], ["azulejo", "Azulejo laranja"], ["editorial", "Editorial limpo"], ["pastel", "Pastel colorido"], ["linha", "Linha do tempo"]];
const EMAIL = "elton.teste@example.com";
const CHAVE_DO_ESTADO = `mbp-expert-ai-v2:usuario:${encodeURIComponent(EMAIL)}`;

/** POP-05 aprovado com 13 passos, POP-06 aprovado com o passo dos punhos (14) e POP-07 em rascunho. Só a Beyond Nutri e o Elton Volmir Strapazon. */
async function estadoDoCartaz({ estiloGuardado, logotipo = true } = {}) {
  const base = await montarEstado();
  const { CATALOGO_DE_MODELOS, criarPopDeModelo } = await import(pathToFileURL(path.join(raiz, "lib", "popModelos.ts")).href);
  const modelo = CATALOGO_DE_MODELOS.pops.find((item) => item.id === "comp-01");
  let n = 100;
  const criar = (codigo, id) => {
    const r = criarPopDeModelo({ modelo, pops: [], empresa: "Beyond Nutri", responsavel: { nome: "Elton Volmir Strapazon", cargo: "Nutricionista" }, id, codigo, titulo: modelo.titulo, gerarId: () => `c${(n += 1)}` });
    if (!r.ok) throw new Error("modelo comp-01");
    return r.pop;
  };
  const aprovacao = { nome: "Elton Volmir Strapazon", cargo: "Nutricionista", usuarioId: "u1", em: "2026-10-23T15:00:00.000Z", versao: "1.0" };
  const aprovado = (pop) => ({ ...pop, status: "Aprovado", aprovacao, conferencia: { conferido: true }, itensAConferir: [] });
  const pop05 = aprovado(criar("POP-05", "pop-05"));
  const pop06 = aprovado(criar("POP-06", "pop-06"));
  const passos = [...pop06.conteudo.passos];
  const posicao = passos.findIndex((p) => /polpas digitais/i.test(p.texto)) + 1;
  passos.splice(posicao, 0, { id: "punhos", texto: "Friccionar os punhos com movimento circular." });
  pop06.conteudo = { ...pop06.conteudo, passos };
  const pop07 = criar("POP-07", "pop-07");
  const empresa = base.db.empresas["beyond-nutri"];
  const { logotipo: logo } = empresa.capaDosPops;
  base.db.empresas["beyond-nutri"] = { ...empresa, capaDosPops: logotipo ? { logotipo: logo } : undefined, cartazLavagem: estiloGuardado === undefined ? undefined : { tema: estiloGuardado }, pops: [pop05, pop06, pop07] };
  return base.db;
}

const clicar = (seletor, texto) =>
  `(()=>{const el=[...document.querySelectorAll(${JSON.stringify(seletor)})].find(b=>b.innerText.trim()===${JSON.stringify(texto)});if(!el)return false;el.click();return true})()`;

async function abrirCartaz(n, base, db, codigo) {
  await n.ir("about:blank");
  const marca = String(Date.now() + Math.random());
  const fonte = `
    const __f = window.fetch.bind(window);
    window.fetch = (u, o) => String(u).includes("/api/access/session") ? Promise.reject(new Error("offline")) : __f(u, o);
    window.__impressoes = 0;
    window.print = () => { window.__impressoes += 1; };
    if (sessionStorage.getItem("__estado") !== ${JSON.stringify(marca)}) {
      localStorage.setItem(${JSON.stringify(CHAVE_DO_ESTADO)}, ${JSON.stringify(JSON.stringify(db))});
      localStorage.setItem("mbp-expert-ai:offline-session:v1", JSON.stringify({ id: "u1", email: ${JSON.stringify(EMAIL)}, name: "Elton Volmir Strapazon" }));
      sessionStorage.setItem("__estado", ${JSON.stringify(marca)});
    }`;
  const { identifier } = await n.enviar("Page.addScriptToEvaluateOnNewDocument", { source: fonte });
  await n.ir(base);
  await n.esperarCondicao(`document.body.innerText.includes("Início")`, { descricao: "app carregado" });
  await n.esperar(1200);
  await n.enviar("Page.removeScriptToEvaluateOnNewDocument", { identifier });
  // "Cadastros" e "POPs e documentos" ficam dentro de "Mais" no menu lateral
  await n.avaliar(`(()=>{const el=[...document.querySelectorAll(".pc-side .pc-link")].find(b=>b.innerText.trim().startsWith("Mais"));if(!el)return false;el.click();return true})()`);
  await n.avaliar(clicar("button,a", "POPs e documentos"));
  await n.esperarCondicao(`document.querySelector(".pgl-linha")`, { descricao: "lista de POPs" });
  await n.avaliar(`(()=>{const linha=[...document.querySelectorAll(".pgl-linha")].find(l=>l.innerText.includes(${JSON.stringify(codigo)}));linha.click();return true})()`);
  await n.esperarCondicao(`document.querySelector(".ficha")`, { descricao: "ficha do POP" });
  await n.avaliar(clicar(".ficha-aba", "Documento"));
  await n.esperar(700);
  await n.avaliar(clicar("button", "Gerar cartaz"));
  await n.esperarCondicao(`document.querySelector(".ccz")`, { descricao: "janela do cartaz" });
}

/** Há blend "Multiply" nos objetos do PDF (comprime os fluxos e procura nos dois lugares). */
export function temMultiplicarNoPdf(pdf) {
  const bruto = pdf.toString("latin1");
  if (/\/BM\s*\/Multiply/.test(bruto)) return true;
  for (const achado of bruto.matchAll(/stream\r?\n/g)) {
    const inicio = achado.index + achado[0].length;
    const fim = bruto.indexOf("endstream", inicio);
    if (fim < 0) continue;
    try {
      if (/\/BM\s*\/Multiply/.test(inflateSync(pdf.subarray(inicio, fim)).toString("latin1"))) return true;
    } catch {
      /* fluxo que não é zlib (imagem JPEG) */
    }
  }
  return false;
}

/**
 * Um caso: { pop: "POP-05" | "POP-06" | "POP-07", estilo: [id, rótulo] | null (o guardado), logotipo, guardado }.
 * Devolve { pdf, paginas, bloqueado } (POP em rascunho: não gera, só mede a janela).
 */
export async function gerarPdfDoCartaz(n, base, caso) {
  const db = await estadoDoCartaz({ estiloGuardado: caso.guardado, logotipo: caso.logotipo !== false });
  await abrirCartaz(n, base, db, caso.pop);
  const janela = await n.avaliar(`(()=>{const d=document.querySelector(".ccz");const gerar=[...d.querySelectorAll("button")].find(b=>b.innerText.trim()==="Gerar cartaz (PDF)");const prev=d.querySelector(".ccp-folha .cz");return {gerarDesabilitado:gerar.disabled,aviso:d.querySelector(".ccz-bloqueio")?.innerText||"",opacidade:getComputedStyle(d.querySelector(".ccp-folha")).opacity,classe:prev.className,ativo:[...d.querySelectorAll(".ccp-chip.is-ativo")].map(c=>c.innerText.trim()),chips:[...d.querySelectorAll(".ccp-chip")].map(c=>c.innerText.trim())}})()`);
  if (janela.gerarDesabilitado) return { janela, paginas: [], pdf: null };
  if (caso.estilo) {
    await n.avaliar(clicar(".ccz .ccp-chip", caso.estilo[1]));
    await n.esperar(300);
  }
  const estilo = await n.avaliar(`document.querySelector(".ccz .ccp-folha .cz").className`);
  await n.avaliar(clicar(".ccz button", "Gerar cartaz (PDF)"));
  await n.esperarCondicao(`window.__impressoes === 1`, { descricao: "chamada de impressão", tempo: 15000 });
  await n.esperar(800);
  await n.enviar("Emulation.setEmulatedMedia", { media: "print" });
  const pdf = await n.pdf();
  await n.enviar("Emulation.setEmulatedMedia", { media: "" });
  return { janela, estilo, paginas: paginasDoPdf(pdf), pdf };
}

/** Casos: 5 estilos com 13 passos (com logotipo) e com 14; sem logotipo; estilo antigo guardado; rascunho. */
export function casosDoCartaz() {
  const casos = [];
  for (const estilo of ESTILOS) casos.push({ nome: `13-${estilo[0]}`, pop: "POP-05", estilo, passos: 13 });
  for (const estilo of ESTILOS) casos.push({ nome: `14-${estilo[0]}`, pop: "POP-06", estilo, passos: 14 });
  casos.push({ nome: "13-azulejo-sem-logotipo", pop: "POP-05", estilo: ESTILOS[1], passos: 13, logotipo: false });
  casos.push({ nome: "13-linha-sem-logotipo", pop: "POP-05", estilo: ESTILOS[4], passos: 13, logotipo: false });
  casos.push({ nome: "estilo-antigo-verde", pop: "POP-05", estilo: null, guardado: "verde", passos: 13, esperaClasse: "cz--azulejo" });
  casos.push({ nome: "estilo-guardado-pastel", pop: "POP-05", estilo: null, guardado: "pastel", passos: 13, esperaClasse: "cz--pastel" });
  casos.push({ nome: "rascunho", pop: "POP-07", estilo: null, passos: 0, rascunho: true });
  return casos;
}

export function problemasDoCartaz(r) {
  const problemas = [];
  const { caso, janela, paginas, pdf } = r;
  const falha = (texto) => problemas.push(`${caso.nome}: ${texto}`);
  if (JSON.stringify(janela.chips) !== JSON.stringify(ESTILOS.map((e) => e[1]))) falha(`chips de estilo: ${janela.chips.join(", ")}`);
  if (caso.rascunho) {
    if (!janela.gerarDesabilitado) falha("POP em rascunho deveria bloquear o botão");
    if (!/POP em rascunho/.test(janela.aviso)) falha("falta o aviso 'POP em rascunho'");
    if (janela.opacidade !== "1") falha(`a prévia do rascunho não deveria ficar apagada (opacidade ${janela.opacidade})`);
    return problemas;
  }
  if (janela.gerarDesabilitado) falha("botão Gerar cartaz (PDF) desabilitado num POP aprovado");
  if (caso.esperaClasse && !r.estilo.includes(caso.esperaClasse)) falha(`esperava ${caso.esperaClasse}, veio ${r.estilo}`);
  if (paginas.length !== 1) falha(`o cartaz deveria ter 1 página (tem ${paginas.length})`);
  const texto = paginas[0]?.texto.replace(/\s+/g, " ") || "";
  const editorial = caso.estilo?.[0] === "editorial";
  if (!(editorial ? /Como lavar as mãos/i.test(texto) : /COMO/.test(texto) && /MÃOS/.test(texto))) falha("falta o título");
  if (!/POP-0\d · versão 1\.0 · aprovado em 23\/10\/2026/.test(texto)) falha("falta o rodapé");
  if (!/LAVE AS MÃOS SEMPRE QUE/.test(texto)) falha("falta o quadro 'sempre que'");
  const esperadas = caso.passos + (caso.logotipo === false ? 0 : 1);
  if (paginas[0] && paginas[0].imagens < caso.passos) falha(`imagens na página: ${paginas[0].imagens} (esperadas pelo menos ${caso.passos})`);
  void esperadas;
  if (pdf && tituloDoPdf(pdf) !== `Cartaz – Como lavar as mãos – ${caso.pop}`) falha(`título do PDF: “${tituloDoPdf(pdf)}”`);
  if (pdf && pdf.length > 2 * 1024 * 1024) falha(`PDF com ${(pdf.length / 1048576).toFixed(2)} MB (limite 2 MB)`);
  if (caso.estilo?.[0] === "pastel" && temMultiplicarNoPdf(pdf)) falha("mix-blend-mode multiply chegou ao PDF (a página vira imagem): use o PNG transparente");
  return problemas;
}

export async function verificar(casos, { saida } = {}) {
  const app = await iniciarApp();
  const porta = 9400 + Math.floor(Math.random() * 400);
  const n = await abrirNavegador({ porta });
  const resultados = [];
  try {
    for (const caso of casos) {
      const r = await gerarPdfDoCartaz(n, app.base, caso);
      if (saida && r.pdf) {
        mkdirSync(saida, { recursive: true });
        writeFileSync(path.join(saida, `cartaz-${caso.nome}.pdf`), r.pdf);
      }
      resultados.push({ caso, ...r });
    }
  } finally {
    await n.fechar();
    app.parar();
  }
  return resultados;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const falta = prerequisitos();
  if (falta) {
    console.error(`Não dá para verificar: ${falta}.`);
    process.exit(1);
  }
  const idx = process.argv.indexOf("--saida");
  const saida = idx > 0 ? path.resolve(process.argv[idx + 1]) : undefined;
  const resultados = await verificar(casosDoCartaz(), { saida });
  const problemas = resultados.flatMap((r) => problemasDoCartaz(r));
  for (const r of resultados) console.log(`${r.caso.nome}: ${r.pdf ? `${r.paginas.length} pág, ${(r.pdf.length / 1024).toFixed(0)} KB, ${r.paginas[0]?.imagens} imagens` : "bloqueado"}`);
  console.log(problemas.length ? `\nPROBLEMAS (${problemas.length}):\n${problemas.join("\n")}` : `\nOK: ${resultados.length} casos conferidos, nenhum problema.`);
  process.exit(problemas.length ? 1 : 0);
}
