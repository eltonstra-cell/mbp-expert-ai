// Confere a capa do POP no PDF de verdade: sobe o app (build de produção, sem banco e sem dados reais), abre o POP pelo mesmo caminho do usuário,
// configura a janela "Capa e impressão", clica em "Imprimir ou salvar PDF" e gera o PDF com a impressão do Chrome/Edge.
// Uso: node --experimental-strip-types scripts/verificar-capa-pdf.mjs [--completa] [--saida pasta]   (precisa de `npm run build` feito antes)
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { abrirNavegador, acharNavegador } from "./navegador-cdp.mjs";
import { paginasDoPdf, tituloDoPdf } from "./pdf-texto.mjs";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EMAIL = "elton.teste@example.com";
const CHAVE_DO_ESTADO = `mbp-expert-ai-v2:usuario:${encodeURIComponent(EMAIL)}`;

export const ESTILOS = ["A", "B", "C", "D", "E", "F"];
export const CORES = [["laranja", "Laranja"], ["verde", "Verde"], ["terra", "Terra"], ["ambar", "Âmbar"], ["grafite", "Grafite"], ["pb", "Preto e branco"]];

export function prerequisitos() {
  if (!acharNavegador()) return "nenhum Chrome ou Edge encontrado";
  if (!existsSync(path.join(raiz, ".next", "BUILD_ID"))) return "falta `npm run build` (não há .next/BUILD_ID)";
  return null;
}

function portaLivre() {
  return new Promise((resolve, reject) => {
    const servidor = net.createServer();
    servidor.listen(0, "127.0.0.1", () => {
      const { port } = servidor.address();
      servidor.close(() => resolve(port));
    });
    servidor.on("error", reject);
  });
}

/** `next start` sem nenhuma variável de banco, de acesso ou de IA: o app roda só com o estado local do teste. */
export async function iniciarApp() {
  const porta = await portaLivre();
  const env = { ...process.env, NOVO_NEON_DATABASE_URL: "", NOVO_NEON_POSTGRES_URL: "", NOVO_NEON_URL: "", DATABASE_URL: "", OPENAI_API_KEY: "", ACCESS_CONTROL_MODE: "off", VERCEL_ENV: "", NODE_ENV: "production" };
  const processo = spawn(process.execPath, [path.join(raiz, "node_modules", "next", "dist", "bin", "next"), "start", "-p", String(porta)], { cwd: raiz, env, stdio: "ignore" });
  const base = `http://127.0.0.1:${porta}/`;
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(base)).ok) return { base, parar: () => processo.kill() };
    } catch {
      /* ainda subindo */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  processo.kill();
  throw new Error("O app não subiu a tempo.");
}

/** Estado de teste: só a empresa Beyond Nutri e a pessoa Elton Volmir Strapazon. POP-01 aprovado (vigente) e POP-05 em rascunho. */
export async function montarEstado() {
  const sharp = createRequire(import.meta.url)(path.join(raiz, "node_modules", "sharp"));
  const logo = await sharp({ create: { width: 220, height: 68, channels: 4, background: { r: 31, g: 138, b: 76, alpha: 1 } } }).png().toBuffer();
  const { CATALOGO_DE_MODELOS, criarPopDeModelo } = await import(pathToFileURL(path.join(raiz, "lib", "popModelos.ts")).href);
  let n = 0;
  const gerarId = () => `t${(n += 1)}`;
  const criar = (modeloId, codigo, id) => {
    const modelo = CATALOGO_DE_MODELOS.pops.find((item) => item.id === modeloId);
    const r = criarPopDeModelo({ modelo, pops: [], empresa: "Beyond Nutri", responsavel: { nome: "Elton Volmir Strapazon", cargo: "Nutricionista" }, id, codigo, titulo: modelo.titulo, gerarId });
    if (!r.ok) throw new Error(`modelo ${modeloId}`);
    return r.pop;
  };
  const aprovacao = { nome: "Elton Volmir Strapazon", cargo: "Nutricionista", usuarioId: "u1", em: "2026-10-21T15:00:00.000Z", versao: "1.0" };
  const pop01 = { ...criar("comp-02", "POP-01", "pop-01"), status: "Aprovado", aprovacao, conferencia: { conferido: true }, itensAConferir: [] };
  const pop05 = criar("comp-01", "POP-05", "pop-05");
  const agora = "2026-01-01T00:00:00.000Z";
  return {
    titulos: { "POP-01": pop01.titulo, "POP-05": pop05.titulo },
    db: {
      empresas: {
        "beyond-nutri": {
          id: "beyond-nutri",
          cnpj: "12345678000195",
          nomeFantasia: "Beyond Nutri",
          razaoSocial: "Beyond Nutri Ltda",
          municipio: "Porto Alegre",
          uf: "RS",
          criadoEm: agora,
          responsavelEstabelecimento: { nome: "Elton Volmir Strapazon", cargo: "Nutricionista", usuarioId: "u1" },
          capaDosPops: { logotipo: `data:image/png;base64,${logo.toString("base64")}` },
          pops: [pop01, pop05],
        },
      },
      empresaAtualId: "beyond-nutri",
      visitas: [], ncs: [], evidencias: [],
      usuarios: [{ id: "u1", nome: "Elton Volmir Strapazon", email: EMAIL, perfil: "Administrador", status: "Ativo", empresaIds: ["beyond-nutri"], cargo: "Nutricionista", criadoEm: agora, atualizadoEm: agora }],
      registrosAuditoria: [],
      configuracaoAcesso: { versao: 1, modo: "Preparação", autenticacao: "Não configurada", atualizadoEm: "" },
    },
  };
}

const clicar = (seletor, texto) =>
  `(()=>{const el=[...document.querySelectorAll(${JSON.stringify(seletor)})].find(b=>b.innerText.trim()===${JSON.stringify(texto)}||b.innerText.trim().startsWith(${JSON.stringify(texto)}));if(!el)return false;el.click();return true})()`;

async function abrirPagina(n, base, estado) {
  await n.ir("about:blank");
  const fonte = `
    const __f = window.fetch.bind(window);
    window.fetch = (u, o) => String(u).includes("/api/access/session") ? Promise.reject(new Error("offline")) : __f(u, o);
    window.__impressoes = 0;
    window.print = () => { window.__impressoes += 1; };
    if (!sessionStorage.getItem("__estado")) {
      localStorage.setItem(${JSON.stringify(CHAVE_DO_ESTADO)}, ${JSON.stringify(JSON.stringify(estado.db))});
      localStorage.setItem("mbp-expert-ai:offline-session:v1", JSON.stringify({ id: "u1", email: ${JSON.stringify(EMAIL)}, name: "Elton Volmir Strapazon" }));
      sessionStorage.setItem("__estado", "1");
    }`;
  const { identifier } = await n.enviar("Page.addScriptToEvaluateOnNewDocument", { source: fonte });
  await n.ir(base);
  await n.esperarCondicao(`document.body.innerText.includes("Início")`, { descricao: "app carregado" });
  await n.esperar(1200);
  await n.enviar("Page.removeScriptToEvaluateOnNewDocument", { identifier });
}

async function abrirJanelaDaCapa(n, codigo) {
  // "POPs" é um item do trilho de navegação (abre Documentos › POPs)
  await n.avaliar(`(()=>{const el=[...document.querySelectorAll(".tr .tr-item")].find(b=>b.querySelector(".tr-rotulo")?.textContent.trim()==="POPs");if(!el)return false;el.click();return true})()`);
  await n.esperarCondicao(`document.querySelector(".pgl-linha")`, { descricao: "lista de POPs" });
  await n.avaliar(`(()=>{const linha=[...document.querySelectorAll(".pgl-linha")].find(l=>l.innerText.includes(${JSON.stringify(codigo)}));linha.click();return true})()`);
  await n.esperarCondicao(`document.querySelector(".ficha")`, { descricao: "ficha do POP" });
  await n.avaliar(clicar(".ficha-aba", "Documento"));
  await n.esperar(700);
  await n.avaliar(clicar("button", "Imprimir / PDF"));
  await n.esperarCondicao(`document.querySelector(".ccp")`, { descricao: "janela Capa e impressão" });
}

/**
 * Um caso: { pop: "POP-01" | "POP-05", capa: boolean, estilo, cor: [id, rotulo], icone: "colorido" | "traco", logotipo: boolean }.
 * Devolve { pdf, paginas: [{texto, imagens}], rodape: medidas do rodapé do estilo C na impressão }.
 */
export async function gerarPdfDoCaso(n, base, estado, caso) {
  await abrirPagina(n, base, estado);
  await abrirJanelaDaCapa(n, caso.pop);
  const ligado = await n.avaliar(`document.querySelector(".ccp input[role=switch]").checked`);
  if (ligado !== caso.capa) await n.avaliar(`document.querySelector(".ccp input[role=switch]").click()`);
  if (caso.capa) {
    await n.esperarCondicao(`document.querySelector(".ccp-estilos")`, { descricao: "opções da capa" });
    await n.avaliar(`document.querySelectorAll(".ccp-estilo")[${ESTILOS.indexOf(caso.estilo)}].click()`);
    await n.avaliar(clicar(".ccp-chip", caso.cor[1]));
    await n.avaliar(clicar(".ccp-chip", caso.icone === "traco" ? "Traço" : "Colorido"));
    const temLogo = await n.avaliar(`[...document.querySelectorAll(".ccp button")].some(b=>b.innerText.trim()==="Remover")`);
    if (temLogo && !caso.logotipo) await n.avaliar(clicar(".ccp button", "Remover"));
    await n.esperar(300);
  }
  await n.avaliar(clicar(".ccp button", "Imprimir ou salvar PDF"));
  await n.esperarCondicao(`window.__impressoes === 1`, { descricao: "chamada de impressão", tempo: 15000 });
  await n.esperar(500);
  if (caso.cssExtra) await n.avaliar(`(()=>{const e=document.createElement("style");e.textContent=${JSON.stringify(caso.cssExtra)};document.head.appendChild(e);return true})()`);
  // medidas do rodapé da capa com a mídia de impressão (largura do papel)
  await n.enviar("Emulation.setEmulatedMedia", { media: "print" });
  const rodape = await n.avaliar(`(()=>{const capa=document.querySelector(".pfolha-capa .capa-pop");const r=capa?.querySelector(".cp-rodape");if(!capa||!r||r.children.length===0)return null;const c=capa.getBoundingClientRect();const a=r.children[0].getBoundingClientRect();const b=r.children[r.children.length-1].getBoundingClientRect();return {largura:c.width,direitaDoCnpj:c.right-b.right,lacuna:r.children.length>1?b.left-a.right:null,temCnpj:r.children.length>1}})()`);
  const sonda = caso.sondar ? await n.avaliar(caso.sondar) : undefined;
  const pdf = await n.pdf();
  await n.enviar("Emulation.setEmulatedMedia", { media: "" });
  return { pdf, paginas: paginasDoPdf(pdf), rodape, sonda };
}

/** Casos: capa desligada (referência) e ligada nos dois POPs. */
export function casosDaVerificacao({ completa = false } = {}) {
  const casos = [];
  for (const pop of ["POP-01", "POP-05"]) {
    casos.push({ pop, capa: false });
    if (!completa) {
      // roteiro curto (roda no npm test): os 6 estilos, com e sem logotipo no C, e o ícone de traço em preto e branco
      for (const estilo of ESTILOS) casos.push({ pop, capa: true, estilo, cor: CORES[0], icone: "colorido", logotipo: estilo === "C" });
      casos.push({ pop, capa: true, estilo: "C", cor: CORES[0], icone: "colorido", logotipo: false });
      casos.push({ pop, capa: true, estilo: "D", cor: CORES[5], icone: "traco", logotipo: false });
      continue;
    }
    // roteiro completo: todos os estilos em todas as cores, nos dois tipos de ícone, com e sem logotipo
    for (const estilo of ESTILOS) for (const cor of CORES) for (const icone of ["colorido", "traco"]) for (const logotipo of estilo === "C" ? [true, false] : [false]) casos.push({ pop, capa: true, estilo, cor, icone, logotipo });
  }
  return casos;
}

/** O que está errado num resultado (lista vazia = tudo certo). `paginasSemCapa`: páginas do PDF do mesmo POP sem capa; `titulos`: título de cada POP. */
export function problemasDoResultado(r, paginasSemCapa, titulos) {
  const problemas = [];
  const { caso, paginas, nome } = r;
  const referencia = paginasSemCapa.get(caso.pop);
  const falha = (texto) => problemas.push(`${nome}: ${texto}`);
  if (!tituloDoPdf(r.pdf).startsWith(`${caso.pop} – `)) falha(`título do PDF: “${tituloDoPdf(r.pdf)}”`);
  if (!paginas.every((p) => p.texto.replace(/\s/g, "").length > 20)) falha("há página em branco");
  const primeira = paginas[0]?.texto || "";
  if (!caso.capa) {
    if (!(/Objetivo/.test(primeira) && /Página 1 de/.test(primeira))) falha("sem capa, a página 1 deveria ser o conteúdo");
    if (paginas.length !== referencia) falha("capa desligada mudou o número de páginas");
    if (paginas[0].imagens !== 0) falha("capa desligada com imagem na página 1");
    return problemas;
  }
  if (paginas.length !== referencia + 1) falha(`a capa deveria ligar uma página extra (${paginas.length} páginas, sem capa ${referencia})`);
  if (!primeira.includes(caso.pop)) falha("falta o código na capa");
  if (!primeira.includes(titulos[caso.pop].slice(0, 22))) falha("falta o título na capa");
  if (!/versão 1\.0/.test(primeira)) falha("falta a versão na capa");
  if (/Página \d+ de/.test(primeira)) falha("a capa tem numeração");
  if (/Objetivo|Passos/.test(primeira)) falha("o texto do POP entrou na capa");
  if (!(paginas[1] && /Objetivo/.test(paginas[1].texto) && /Página 2 de/.test(paginas[1].texto))) falha("o conteúdo deveria começar na página 2, com cabeçalho e numeração");
  // O ícone colorido agora é vetorial (SVG): não conta como imagem no PDF. Só o logotipo (PNG) conta.
  if (caso.estilo === "C") {
    if (!(/Beyond Nutri/.test(primeira) && /CNPJ 12\.345\.678\/0001-95/.test(primeira))) falha("rodapé sem empresa e CNPJ");
    if (caso.logotipo ? paginas[0].imagens < 1 : paginas[0].imagens > 0) falha(`logotipo ${caso.logotipo ? "ausente" : "inesperado"}`);
    if (!r.rodape || !r.rodape.temCnpj) falha("rodapé não medido");
    else {
      if (!(r.rodape.lacuna > r.rodape.largura * 0.05)) falha(`CNPJ colado ao nome (${Math.round(r.rodape.lacuna)} px)`);
      if (!(Math.abs(r.rodape.direitaDoCnpj - r.rodape.largura * 0.064) < 6)) falha(`CNPJ fora da borda direita (${Math.round(r.rodape.direitaDoCnpj)} px da borda)`);
    }
  }
  return problemas;
}

export async function verificar(casos, { saida } = {}) {
  const app = await iniciarApp();
  const n = await abrirNavegador({ porta: await portaLivre() });
  const estado = await montarEstado();
  const resultados = [];
  try {
    const referencia = new Map();
    for (const caso of casos) {
      const r = await gerarPdfDoCaso(n, app.base, estado, caso);
      const nome = `${caso.pop}-${caso.capa ? `${caso.estilo}-${caso.cor[0]}-${caso.icone}-${caso.logotipo ? "logo" : "semlogo"}` : "sem-capa"}`;
      if (saida) {
        mkdirSync(saida, { recursive: true });
        writeFileSync(path.join(saida, `${nome}.pdf`), r.pdf);
      }
      resultados.push({ caso, nome, ...r });
      if (!caso.capa) referencia.set(caso.pop, r.paginas.length);
    }
    return { resultados, paginasSemCapa: referencia, titulos: estado.titulos };
  } finally {
    await n.fechar();
    app.parar();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const falta = prerequisitos();
  if (falta) {
    console.error(`Não dá para verificar: ${falta}.`);
    process.exit(1);
  }
  const completa = process.argv.includes("--completa");
  const idx = process.argv.indexOf("--saida");
  const saida = idx > 0 ? path.resolve(process.argv[idx + 1]) : undefined;
  const { resultados, paginasSemCapa, titulos } = await verificar(casosDaVerificacao({ completa }), { saida });
  const problemas = resultados.flatMap((r) => problemasDoResultado(r, paginasSemCapa, titulos));
  for (const r of resultados) {
    const p1 = r.paginas[0]?.texto.replace(/\s+/g, " ").slice(0, 90);
    console.log(`${r.nome}: ${r.paginas.length} págs (sem capa: ${paginasSemCapa.get(r.caso.pop)}) | pág 1 imagens=${r.paginas[0]?.imagens} | ${p1}`);
  }
  console.log(problemas.length ? `\nPROBLEMAS (${problemas.length}):\n${problemas.join("\n")}` : `\nOK: ${resultados.length} PDFs conferidos, nenhum problema.`);
  process.exit(problemas.length ? 1 : 0);
}
