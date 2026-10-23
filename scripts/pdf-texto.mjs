// Leitor mínimo de PDF gerado pelo Chrome/Edge (Skia): devolve, por página, o texto e quantas imagens ela desenha.
// Só para conferir a impressão do app nos testes (sem dependências novas). Não serve para PDFs quaisquer.
import { inflateSync } from "node:zlib";

const LATIN1 = "latin1";

function objetos(buffer) {
  const texto = buffer.toString(LATIN1);
  const mapa = new Map();
  const re = /(\d+) 0 obj\s*([\s\S]*?)endobj/g;
  let m;
  while ((m = re.exec(texto))) mapa.set(Number(m[1]), { bruto: m[2], inicio: m.index + m[0].indexOf(m[2]) });
  return { texto, mapa };
}

function fluxo(buffer, texto, obj) {
  const i = obj.bruto.indexOf("stream");
  if (i < 0) return null;
  const dict = obj.bruto.slice(0, i);
  let ini = obj.inicio + i + "stream".length;
  if (texto[ini] === "\r") ini += 1;
  if (texto[ini] === "\n") ini += 1;
  const fim = texto.indexOf("endstream", ini);
  const dados = buffer.subarray(ini, fim);
  if (/\/FlateDecode/.test(dict)) {
    try {
      return inflateSync(dados);
    } catch {
      return null;
    }
  }
  return dados;
}

const ref = (texto, chave) => {
  const m = new RegExp(`/${chave}\\s+(\\d+) 0 R`).exec(texto);
  return m ? Number(m[1]) : null;
};

function mapaUnicode(buffer, texto, mapa, fonteNum) {
  const fonte = mapa.get(fonteNum);
  if (!fonte) return new Map();
  const bytes = fonte.bruto.includes("/Subtype /Type3") ? 1 : 2;
  const tu = ref(fonte.bruto, "ToUnicode");
  if (!tu) return new Map();
  const dados = fluxo(buffer, texto, mapa.get(tu));
  const cmap = dados ? dados.toString(LATIN1) : "";
  const resultado = new Map();
  const hexParaTexto = (hex) => {
    let s = "";
    for (let i = 0; i < hex.length; i += 4) s += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
    return s;
  };
  for (const bloco of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const par of bloco[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) resultado.set(parseInt(par[1], 16), hexParaTexto(par[2]));
  }
  for (const bloco of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const faixa of bloco[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      const a = parseInt(faixa[1], 16);
      const b = parseInt(faixa[2], 16);
      const base = hexParaTexto(faixa[3]);
      for (let c = a; c <= b; c++) resultado.set(c, base.slice(0, -1) + String.fromCharCode(base.charCodeAt(base.length - 1) + (c - a)));
    }
  }
  resultado.bytes = bytes;
  return resultado;
}

/** [{ texto, imagens }] na ordem das páginas. */
export function paginasDoPdf(buffer) {
  const { texto, mapa } = objetos(buffer);
  const paginas = [];
  const ordem = [...mapa.entries()].filter(([, o]) => /\/Type\s*\/Page(?!s)/.test(o.bruto)).map(([n]) => n);
  // a ordem dos objetos nem sempre é a das páginas: usa a lista /Kids da árvore
  const arvore = [...mapa.values()].find((o) => /\/Type\s*\/Pages/.test(o.bruto) && /\/Kids/.test(o.bruto));
  const kids = arvore ? [...(/\/Kids\s*\[([^\]]*)\]/.exec(arvore.bruto)?.[1] || "").matchAll(/(\d+) 0 R/g)].map((m) => Number(m[1])) : ordem;
  for (const numero of kids.length ? kids : ordem) {
    const pagina = mapa.get(numero);
    if (!pagina) continue;
    const recursosNum = ref(pagina.bruto, "Resources");
    const recursos = recursosNum ? mapa.get(recursosNum).bruto : pagina.bruto;
    const fontes = new Map();
    const blocoFontes = /\/Font\s*<<([\s\S]*?)>>/.exec(recursos)?.[1] || "";
    for (const f of blocoFontes.matchAll(/\/(\w+)\s+(\d+) 0 R/g)) fontes.set(f[1], Number(f[2]));
    const blocoX = /\/XObject\s*<<([\s\S]*?)>>/.exec(recursos)?.[1] || "";
    const xobjetos = new Map();
    for (const x of blocoX.matchAll(/\/(\w+)\s+(\d+) 0 R/g)) xobjetos.set(x[1], Number(x[2]));
    const conteudos = [];
    const c = /\/Contents\s*(\[[^\]]*\]|\d+ 0 R)/.exec(pagina.bruto)?.[1] || "";
    for (const m of c.matchAll(/(\d+) 0 R/g)) conteudos.push(Number(m[1]));
    let fluxoTotal = "";
    for (const n of conteudos) {
      const dados = fluxo(buffer, texto, mapa.get(n));
      if (dados) fluxoTotal += dados.toString(LATIN1) + "\n";
    }
    const unicode = new Map();
    for (const [nome, num] of fontes) unicode.set(nome, mapaUnicode(buffer, texto, mapa, num));
    let atual = null;
    let saida = "";
    for (const op of fluxoTotal.matchAll(/\/(\w+)\s+[\d.]+\s+Tf|\[((?:<[0-9A-Fa-f]*>|[^\]<])*)\]\s*TJ|<([0-9A-Fa-f]*)>\s*Tj|(T\*|ET)/g)) {
      if (op[1]) atual = unicode.get(op[1]) || null;
      else if (op[4]) saida += op[4] === "ET" ? "\n" : "";
      else {
        const hexes = [...(op[2] || op[3] || "").matchAll(/<([0-9A-Fa-f]*)>/g)].map((h) => h[1]);
        const lista = op[3] !== undefined && op[2] === undefined ? [op[3]] : hexes;
        for (const hex of lista) {
          const largura = (atual && atual.bytes === 1) ? 2 : 4;
          for (let i = 0; i + largura <= hex.length; i += largura) {
            const cod = parseInt(hex.slice(i, i + largura), 16);
            saida += (atual && atual.get(cod)) || "";
          }
        }
      }
    }
    // imagens desenhadas: operador Do cujo objeto é /Subtype /Image
    let imagens = 0;
    for (const d of fluxoTotal.matchAll(/\/(\w+)\s+Do/g)) {
      const num = xobjetos.get(d[1]);
      if (num && /\/Subtype\s*\/Image/.test(mapa.get(num)?.bruto || "")) imagens += 1;
    }
    paginas.push({ texto: saida.split(/\s+/).filter(Boolean).join(" "), imagens });
  }
  return paginas;
}
