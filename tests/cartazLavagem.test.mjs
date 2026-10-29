import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";

import CartazLavagem from "../components/CartazLavagem.ts";
import {
  ARQUIVOS_DAS_ILUSTRACOES,
  EXPLICACAO_POP_EM_RASCUNHO,
  FIGURAS_DO_CARTAZ,
  MENSAGEM_POP_EM_RASCUNHO,
  ESTILOS_DO_CARTAZ,
  ESTILO_PADRAO,
  conferirIlustracoes,
  conteudoDoCartaz,
  eDeLavagemDeMaos,
  podeGerarOCartaz,
  popAprovadoParaOCartaz,
  disposicaoDaGrade,
  disposicaoDaLinhaDoTempo,
  eEstiloDoCartaz,
  estiloDoCartaz,
  rodapeDoCartaz,
  subtituloDoCartaz,
  subtituloEditorial,
} from "../lib/cartazLavagem.ts";
import { CATALOGO_DE_MODELOS, criarPopDeModelo } from "../lib/popModelos.ts";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, "..");
const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");
const sharp = createRequire(import.meta.url)(path.join(raiz, "node_modules", "sharp"));

const modelo = CATALOGO_DE_MODELOS.pops.find((item) => item.id === "comp-01");
let contador = 0;
const popDeLavagem = (extra = {}) => {
  const resultado = criarPopDeModelo({ modelo, pops: [], empresa: "Beyond Nutri", responsavel: { nome: "Elton Volmir Strapazon", cargo: "Nutricionista" }, id: "pop-1", codigo: "POP-05", titulo: modelo.titulo, gerarId: () => `p${(contador += 1)}` });
  assert.ok(resultado.ok);
  return { ...resultado.pop, ...extra };
};
const aprovacao = { nome: "Elton Volmir Strapazon", cargo: "Nutricionista", usuarioId: "u1", em: "2026-10-21T15:00:00.000Z", versao: "1.0" };
const aprovado = () => popDeLavagem({ status: "Aprovado", aprovacao });

test("os 5 estilos, com os nomes pedidos e o Azulejo laranja como padrão", () => {
  assert.deepEqual(ESTILOS_DO_CARTAZ.map((e) => [e.id, e.rotulo]), [
    ["agua", "Água e bolhas"],
    ["azulejo", "Azulejo laranja"],
    ["editorial", "Editorial limpo"],
    ["pastel", "Pastel colorido"],
    ["linha", "Linha do tempo"],
  ]);
  assert.equal(ESTILO_PADRAO, "azulejo");
  assert.equal(estiloDoCartaz(undefined), "azulejo");
  assert.equal(estiloDoCartaz("pastel"), "pastel");
  assert.equal(eEstiloDoCartaz("linha"), true);
});

test("valor antigo guardado (verde, azul, terra, mostarda) ou desconhecido cai no Azulejo laranja, sem erro", () => {
  for (const antigo of ["verde", "azul", "terra", "mostarda", "roxo", "", null, 3]) assert.equal(estiloDoCartaz(antigo), "azulejo", String(antigo));
  const cartoes = ARQUIVOS_DAS_ILUSTRACOES.slice(0, 13).map((arquivo, i) => ({ numero: i + 1, arquivo, rotulo: `Passo ${i + 1}`, passoDoPop: i + 1 }));
  const html = renderToStaticMarkup(CartazLavagem({ dados: { estilo: "verde", conteudo: { cartoes, sempreQue: [] }, rodape: "x" } }));
  assert.ok(html.includes("cz--azulejo"));
});

test("ordem das 14 imagens: 01 a 14, na ordem dos passos pedidos", () => {
  assert.deepEqual(ARQUIVOS_DAS_ILUSTRACOES, Array.from({ length: 14 }, (_, i) => `${String(i + 1).padStart(2, "0")}.jpg`));
  assert.deepEqual(FIGURAS_DO_CARTAZ.map((f) => f.numero), Array.from({ length: 14 }, (_, i) => i + 1));
  assert.deepEqual(FIGURAS_DO_CARTAZ.map((f) => f.arquivo), ARQUIVOS_DAS_ILUSTRACOES);
  const ordem = ["adornos", "antebraços", "sabonete", "Palma com palma", "dorso", "dedos", "Dorso dos dedos", "Polegares", "Polpas", "Punhos", "Enxaguar", "papel toalha", "torneira", "gel"];
  FIGURAS_DO_CARTAZ.forEach((figura, indice) => assert.ok(new RegExp(ordem[indice], "i").test(figura.rotulo + " álcool"), `${figura.numero}: ${figura.rotulo}`));
});

test("as 14 imagens existem com 420 px de lado, a 09 recortada e quadrada, e o conjunto é leve (PDF abaixo de 2 MB)", async () => {
  const pasta = path.join(raiz, "public", "cartaz-lavagem");
  assert.deepEqual(readdirSync(pasta).filter((nome) => nome !== "transparente").sort(), ARQUIVOS_DAS_ILUSTRACOES);
  // versão PNG com o fundo branco transparente (Pastel colorido): cantos com alfa 0 e conjunto leve
  const pastaTransparente = path.join(pasta, "transparente");
  assert.deepEqual(readdirSync(pastaTransparente).sort(), ARQUIVOS_DAS_ILUSTRACOES.map((nome) => nome.replace(".jpg", ".png")));
  let totalTransparente = 0;
  for (const nome of readdirSync(pastaTransparente)) {
    const { data, info } = await sharp(path.join(pastaTransparente, nome)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.deepEqual([info.width, info.height], [420, 420], nome);
    assert.equal(data[3], 0, `${nome}: o canto superior esquerdo deveria ser transparente`);
    totalTransparente += statSync(path.join(pastaTransparente, nome)).size;
  }
  assert.ok(totalTransparente < 1024 * 1024, `PNGs transparentes somam ${totalTransparente} bytes`);
  let total = 0;
  for (const nome of ARQUIVOS_DAS_ILUSTRACOES) {
    const meta = await sharp(path.join(pasta, nome)).metadata();
    assert.deepEqual([meta.width, meta.height], [420, 420], nome);
    total += statSync(path.join(pasta, nome)).size;
  }
  assert.ok(total < 1024 * 1024, `imagens somam ${total} bytes`);
  // a 09 foi recortada: o desenho encosta no alto e no pé da imagem (sem as margens brancas de antes)
  const { data, info } = await sharp(path.join(pasta, "09.jpg")).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const temTinta = (y0, y1) => {
    for (let y = y0; y < y1; y++) for (let x = 0; x < info.width; x++) if (Math.min(data[(y * info.width + x) * 3], data[(y * info.width + x) * 3 + 1], data[(y * info.width + x) * 3 + 2]) < 200) return true;
    return false;
  };
  assert.ok(temTinta(0, 25), "desenho no alto");
  assert.ok(temTinta(info.height - 25, info.height), "desenho no pé");
});

test("pasta de ilustrações ausente ou incompleta falha com mensagem clara", () => {
  assert.match(conferirIlustracoes(null).mensagem, /Pasta de ilustrações não encontrada/);
  const incompleta = conferirIlustracoes(["01.png", "02.png", "04.png"]);
  assert.equal(incompleta.ok, false);
  assert.match(incompleta.mensagem, /faltam 03\.png, 05\.png, 06\.png/);
  assert.equal(conferirIlustracoes(Array.from({ length: 14 }, (_, i) => `${String(i + 1).padStart(2, "0")}.png`)).ok, true);
  assert.equal(conferirIlustracoes(ARQUIVOS_DAS_ILUSTRACOES, "jpg").ok, true);
  // o script de preparo (que lê a pasta da raiz) para com mensagem clara, sem criar nada
  const script = path.join(raiz, "scripts", "gerar-imagens-cartaz.mjs");
  const ausente = spawnSync(process.execPath, [script, path.join(tmpdir(), "nao-existe-cartaz-xyz")], { encoding: "utf8" });
  assert.equal(ausente.status, 1);
  assert.match(ausente.stderr, /Pasta de ilustrações não encontrada/);
  const pastaIncompleta = mkdtempSync(path.join(tmpdir(), "cartaz-"));
  for (const nome of ["01.png", "02.png", "03.png"]) writeFileSync(path.join(pastaIncompleta, nome), "x");
  const faltando = spawnSync(process.execPath, [script, pastaIncompleta], { encoding: "utf8" });
  assert.equal(faltando.status, 1);
  assert.match(faltando.stderr, /Ilustrações incompletas.*faltam 04\.png/);
});

test("conteúdo vem do POP: passos na ordem do POP, o que não tem figura fica de fora e é devolvido", () => {
  const c = conteudoDoCartaz(popDeLavagem());
  assert.deepEqual(c.cartoes.map((x) => [x.numero, x.arquivo, x.passoDoPop]), [
    [1, "01.jpg", 1], [2, "02.jpg", 4], [3, "03.jpg", 5], [4, "04.jpg", 6], [5, "05.jpg", 7], [6, "06.jpg", 8], [7, "07.jpg", 9],
    [8, "08.jpg", 10], [9, "09.jpg", 11], [10, "11.jpg", 12], [11, "12.jpg", 13], [12, "13.jpg", 13], [13, "14.jpg", 15],
  ]);
  assert.deepEqual(c.passosSemFigura.map((p) => p.posicao), [2, 3, 14]);
  assert.deepEqual(c.figurasSemPasso, [10], "o POP não tem o passo dos punhos");
  assert.equal(subtituloDoCartaz(c.cartoes.length), "Siga os 13 passos, na ordem.");
  assert.equal(subtituloDoCartaz(14), "Siga os 14 passos, na ordem.");
  // rótulos com as palavras do POP
  const texto = JSON.stringify(modelo.secoes.passos).toLowerCase();
  for (const palavra of ["adornos", "umedecer", "sabonete", "palmas", "polegar", "polpas digitais", "enxaguar", "papel toalha", "álcool gel"]) assert.ok(texto.includes(palavra), palavra);
  assert.equal(c.cartoes.find((x) => x.arquivo === "02.jpg").rotulo, "Umedecer mãos e antebraços");
  assert.equal(c.cartoes.find((x) => x.arquivo === "14.jpg").rotulo, "Finalizar com álcool gel");
});

test("com o passo dos punhos no POP o cartaz volta a ter 14 passos; sem o de antisséptico ele some, sem inventar", () => {
  const base = popDeLavagem();
  const passos = [...base.conteudo.passos];
  const posicao = passos.findIndex((p) => /polpas digitais/i.test(p.texto)) + 1;
  passos.splice(posicao, 0, { id: "novo", texto: "Friccionar os punhos com movimento circular." });
  const com = conteudoDoCartaz({ conteudo: { ...base.conteudo, passos } });
  assert.equal(com.cartoes.length, 14);
  assert.equal(com.cartoes[9].arquivo, "10.jpg");
  const semGel = conteudoDoCartaz({ conteudo: { ...base.conteudo, passos: passos.filter((p) => !/álcool gel/i.test(p.texto)) } });
  assert.equal(semGel.cartoes.some((c) => c.arquivo === "14.jpg"), false);
  assert.deepEqual(semGel.figurasSemPasso, [14]);
});

test("lista 'Lave as mãos sempre que' vem do POP; o item hospitalar fica de fora e é relatado", () => {
  const c = conteudoDoCartaz(popDeLavagem());
  assert.deepEqual(c.sempreQue, ["Mãos sujas", "Depois de usar luvas", "Início e fim do turno", "Antes de manipular alimentos", "Ao tossir, espirrar ou se coçar", "Depois de manipular o lixo"]);
  assert.equal(c.fora.length, 1);
  assert.match(c.fora[0].texto, /sangue/);
  // sem o item no POP, nada é inventado
  assert.deepEqual(conteudoDoCartaz({ conteudo: { passos: [], cuidadosEspeciais: ["Lavar as mãos a cada troca de tarefa."] } }).sempreQue, []);
  // item novo escrito pelo RT entra como está
  const extra = popDeLavagem();
  const cuidados = extra.conteudo.cuidadosEspeciais.map((item) => (typeof item === "object" && item.subitens ? { ...item, subitens: [...item.subitens, "ao voltar do intervalo;"] } : item));
  assert.ok(conteudoDoCartaz({ conteudo: { ...extra.conteudo, cuidadosEspeciais: cuidados } }).sempreQue.includes("Ao voltar do intervalo"));
});

test("só o POP APROVADO gera o cartaz; rascunho mostra 'POP em rascunho' e bloqueia", () => {
  const rascunho = popDeLavagem();
  const bloqueado = podeGerarOCartaz(rascunho);
  assert.equal(bloqueado.pode, false);
  assert.equal(bloqueado.mensagem, MENSAGEM_POP_EM_RASCUNHO);
  assert.equal(MENSAGEM_POP_EM_RASCUNHO, "POP em rascunho");
  assert.equal(bloqueado.explicacao, EXPLICACAO_POP_EM_RASCUNHO);
  assert.equal(podeGerarOCartaz(null).pode, false);
  assert.equal(podeGerarOCartaz(popDeLavagem({ status: "Aguardando aprovação" })).pode, false);
  assert.equal(podeGerarOCartaz(popDeLavagem({ status: "Aprovado" })).pode, false, "Aprovado sem assinatura de aprovação não vale");
  assert.equal(podeGerarOCartaz(aprovado()).pode, true);
  assert.equal(popAprovadoParaOCartaz(aprovado()).aprovadoEm, aprovacao.em);
  // nova versão em rascunho: vale a última aprovada
  const comNovaVersao = popDeLavagem({ status: "Rascunho", versao: "1.1", versoes: [{ versao: "1.0", status: "Aprovado", criadaEm: "", conteudo: popDeLavagem().conteudo, aprovacao }] });
  assert.equal(podeGerarOCartaz(comNovaVersao).pode, true);
  assert.equal(popAprovadoParaOCartaz(comNovaVersao).pop.versao, "1.0");
  // só o POP do modelo de lavagem de mãos
  assert.equal(eDeLavagemDeMaos(aprovado()), true);
  assert.equal(eDeLavagemDeMaos({ origemModelo: { id: "comp-02", versaoCatalogo: 1 } }), false);
  assert.equal(eDeLavagemDeMaos({}), false);
  const editor = ler("../components/pc/PcPopEditor.tsx");
  assert.ok(editor.includes("{comCartaz && (") && editor.includes("Gerar cartaz") && editor.includes("if (!aprovadoDoCartaz) return;"));
  const dialogo = ler("../components/pc/ConfigCartazLavagem.tsx");
  assert.ok(dialogo.includes("disabled={Boolean(bloqueio)}") && dialogo.includes("bloqueio.mensagem"));
});

test("rodapé: empresa · código · versão · aprovado em", () => {
  assert.equal(rodapeDoCartaz({ empresa: "Beyond Nutri", codigo: "POP-05", versao: "1.0", aprovadoEm: "2026-10-21T15:00:00.000Z" }), "Beyond Nutri · POP-05 · versão 1.0 · aprovado em 21/10/2026");
});

test("disposição da grade: 13 passos têm o quadro ao lado do último; 14 passos o quadro vira faixa e a página fica densa", () => {
  assert.deepEqual(disposicaoDaGrade(13), { quadro: { tipo: "ao-lado", colunas: 2 }, linhasDeCartoes: 5, linhasTotais: 5, denso: false });
  assert.deepEqual(disposicaoDaGrade(14), { quadro: { tipo: "faixa" }, linhasDeCartoes: 5, linhasTotais: 6, denso: true });
  assert.deepEqual(disposicaoDaGrade(12), { quadro: { tipo: "faixa" }, linhasDeCartoes: 4, linhasTotais: 5, denso: false });
  assert.equal(subtituloEditorial(13), "13 passos, na ordem.");
  assert.equal(subtituloEditorial(1), "1 passo, na ordem.");
});

test("linha do tempo: a esquerda leva a metade (arredondada para cima); 13 passos deixam o quadro na coluna da direita, 14 em faixa", () => {
  assert.deepEqual(disposicaoDaLinhaDoTempo(13), { esquerda: 7, direita: 6, quadro: "coluna", denso: false });
  assert.deepEqual(disposicaoDaLinhaDoTempo(14), { esquerda: 7, direita: 7, quadro: "faixa", denso: true });
});

test("geração nos 5 estilos, com e sem logotipo, 13 e 14 passos: desenha sem erro", () => {
  const logo = "data:image/png;base64,iVBORw0KGgo=";
  for (const quantos of [13, 14]) {
    const cartoes = ARQUIVOS_DAS_ILUSTRACOES.filter((nome) => quantos === 14 || nome !== "10.jpg").map((arquivo, i) => ({ numero: i + 1, arquivo, rotulo: `Passo ${i + 1}`, passoDoPop: i + 1 }));
    for (const estilo of ESTILOS_DO_CARTAZ) {
      for (const logotipo of [undefined, logo]) {
        for (const previa of [false, true]) {
          const html = renderToStaticMarkup(CartazLavagem({ dados: { estilo: estilo.id, conteudo: { cartoes, sempreQue: ["Mãos sujas", "Depois de usar luvas"] }, rodape: "Beyond Nutri · POP-05 · versão 1.0 · aprovado em 21/10/2026", logotipo }, previa }));
          assert.ok(html.includes(`cz--${estilo.id}`), estilo.id);
          const passos = (html.match(/class="cz-cartao cz-cartao--c\d"/g) || []).length + (html.match(/class="cz-passo[ "]/g) || []).length;
          assert.equal(passos, quantos, `${estilo.id}: ${quantos} passos`);
          assert.ok(html.includes("LAVE AS MÃOS SEMPRE QUE") && html.includes("aprovado em 21/10/2026"));
          assert.equal(html.includes('class="cz-logo"'), Boolean(logotipo));
          // sem logotipo: nada no PDF final; a caixa tracejada só na pré-visualização
          assert.equal(html.includes("cz-logo--vazio"), !logotipo && previa);
          if (estilo.id === "editorial") {
            assert.ok(html.includes("Como lavar") && html.includes("as mãos") && html.includes(`${quantos} passos, na ordem.`) && html.includes(">01<") && html.includes(">13<"));
          } else {
            assert.ok(html.includes("COMO") && html.includes("MÃOS") && html.includes(`Siga os ${quantos} passos, na ordem.`));
          }
          if (estilo.id === "pastel") assert.ok(html.includes("cartaz-lavagem/transparente/01.png"), "pastel usa as imagens transparentes");
          if (estilo.id !== "pastel") assert.equal(html.includes("transparente/"), false);
          if (estilo.id === "pastel") assert.ok(["cz-p1", "cz-p2", "cz-p3", "cz-p4"].every((c) => html.includes(c)), "título em 4 cores");
          if (estilo.id === "agua") assert.ok(html.includes("cz-bolha"));
          if (estilo.id === "azulejo") assert.ok(html.includes("cz-faixa") && html.includes("cz-listra"));
          if (estilo.id !== "linha") assert.equal(html.includes("span 2"), quantos === 13, "o quadro ocupa duas colunas só com 13 cartões");
          if (estilo.id === "linha") assert.equal(html.includes("cz-quadro-faixa"), quantos === 14);
        }
      }
    }
  }
});

test("sem itens em 'sempre que' o quadro não aparece", () => {
  const cartoes = ARQUIVOS_DAS_ILUSTRACOES.slice(0, 13).map((arquivo, i) => ({ numero: i + 1, arquivo, rotulo: `Passo ${i + 1}`, passoDoPop: i + 1 }));
  for (const estilo of ESTILOS_DO_CARTAZ) assert.equal(renderToStaticMarkup(CartazLavagem({ dados: { estilo: estilo.id, conteudo: { cartoes, sempreQue: [] }, rodape: "x" } })).includes("LAVE AS MÃOS SEMPRE QUE"), false, estilo.id);
});

test("imagens com fundo branco puro: cantos e bordas 255, sem quadrados acinzentados atrás do desenho", async () => {
  const pasta = path.join(raiz, "public", "cartaz-lavagem");
  for (const nome of ARQUIVOS_DAS_ILUSTRACOES) {
    const { data, info } = await sharp(path.join(pasta, nome)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    for (const [x, y] of [[0, 0], [info.width - 1, 0], [0, info.height - 1], [info.width - 1, info.height - 1], [info.width >> 1, 0]]) {
      const i = (y * info.width + x) * 3;
      // o desenho pode encostar no canto; onde há fundo claro ele tem de ser branco puro (JPEG mexe 1 ou 2 níveis)
      const menor = Math.min(data[i], data[i + 1], data[i + 2]);
      if (menor >= 200) assert.ok(menor >= 252, `${nome} canto ${x},${y}: ${data[i]},${data[i + 1]},${data[i + 2]}`);
    }
  }
});

test("layout: medidas do desenho aprovado em cada estilo e fontes do app", () => {
  const css = ler("../app/globals.css");
  const bloco = css.slice(css.indexOf('/* ===== Cartaz "Como lavar as mãos"'), css.indexOf("/* Cartaz de lavagem de mãos: janela de escolhas"));
  assert.match(bloco, /aspect-ratio:794\/1123/);
  assert.match(bloco, /var\(--font-display\)/);
  // Água e bolhas
  assert.match(bloco, /\.cz--agua \.cz-pagina\{background:linear-gradient\(180deg,#E3F3FB,#BFE3F5\)\}/);
  assert.match(bloco, /\.cz--agua \.cz-bolha\{border:calc\(var\(--u\) \* 2\) solid rgba\(255,255,255,\.9\);background:rgba\(255,255,255,\.35\)\}/);
  assert.match(bloco, /\.cz--agua \.cz-cartao\{border-radius:calc\(var\(--u\) \* 22\);box-shadow:0 calc\(var\(--u\) \* 6\) calc\(var\(--u\) \* 16\) rgba\(29,79,122,\.14\)\}/);
  assert.match(bloco, /\.cz--agua \.cz-numero\{background:#2A6FB5\}/);
  assert.match(bloco, /\.cz--agua \.cz-chip\{background:#DDEEF8;color:#1D4F7A\}/);
  // base: título 46, subtítulo 15.5, cartão de 150 e margem de 36
  assert.match(bloco, /\.cz-titulo\{[^}]*font-size:calc\(var\(--u\) \* 46\);font-weight:700/);
  assert.match(bloco, /\.cz-subtitulo\{[^}]*font-size:calc\(var\(--u\) \* 15\.5\)/);
  assert.match(bloco, /--cz-mx:calc\(var\(--u\) \* 36\);--cz-alt:calc\(var\(--u\) \* 150\)/);
  assert.match(bloco, /\.cz-grade\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(bloco, /\.cz-numero\{[^}]*width:calc\(var\(--u\) \* 28\);height:calc\(var\(--u\) \* 28\)/);
  assert.match(bloco, /\.cz-rotulo\{[^}]*font-size:calc\(var\(--u\) \* 13\.5\);font-weight:700/);
  // Azulejo laranja
  assert.match(bloco, /background-color:#FFFDF8;background-image:linear-gradient\(rgba\(42,111,181,\.10\)[^}]*background-size:calc\(var\(--u\) \* 44\) calc\(var\(--u\) \* 44\)/);
  assert.match(bloco, /\.cz--azulejo \.cz-faixa\{[^}]*height:calc\(var\(--u\) \* 172\);background:#E8760A\}/);
  assert.match(bloco, /\.cz--azulejo \.cz-listra\{[^}]*height:calc\(var\(--u\) \* 10\);background:repeating-linear-gradient\(90deg,#E8760A 0,#E8760A calc\(var\(--u\) \* 20\),#F5B66B calc\(var\(--u\) \* 20\),#F5B66B calc\(var\(--u\) \* 40\)\)/);
  assert.match(bloco, /\.cz--azulejo \.cz-titulo\{[^}]*font-size:calc\(var\(--u\) \* 48\)[^}]*color:#fff\}/);
  assert.match(bloco, /\.cz--azulejo \.cz-cartao\{border:calc\(var\(--u\) \* 1\.5\) solid #E9D3B8;border-bottom:calc\(var\(--u\) \* 5\) solid #E8760A;border-radius:calc\(var\(--u\) \* 14\)\}/);
  assert.match(bloco, /\.cz--azulejo \.cz-numero\{[^}]*border-radius:calc\(var\(--u\) \* 8\);background:#E8760A\}/);
  assert.match(bloco, /\.cz--azulejo \.cz-quadro\{background:#FEF6E6;border:calc\(var\(--u\) \* 1\.5\) solid #E8B04B/);
  assert.match(bloco, /\.cz--azulejo \.cz-quadro-titulo\{color:#B45309\}/);
  assert.match(bloco, /\.cz--azulejo \.cz-rodape\{[^}]*background:rgba\(255,253,248,\.85\)/);
  // Editorial limpo
  assert.match(bloco, /\.cz--editorial \.cz-pagina\{--cz-mx:calc\(var\(--u\) \* 44\)/);
  assert.match(bloco, /\.cz--editorial \.cz-titulo\{[^}]*font-size:calc\(var\(--u\) \* 58\);font-weight:500/);
  assert.match(bloco, /\.cz--editorial \.cz-barra\{[^}]*width:calc\(var\(--u\) \* 56\);height:calc\(var\(--u\) \* 5\);background:#E8760A\}/);
  assert.match(bloco, /\.cz--editorial \.cz-cartao\{[^}]*border-top:calc\(var\(--u\) \* 1\.5\) solid #D5DDE5\}/);
  assert.match(bloco, /\.cz--editorial \.cz-numero\{[^}]*font-size:calc\(var\(--u\) \* 40\);font-weight:300;color:#E8760A\}/);
  assert.match(bloco, /\.cz--editorial \.cz-rotulo\{[^}]*font-weight:500/);
  assert.match(bloco, /\.cz--editorial \.cz-item::before\{content:"— "\}/);
  // Pastel colorido
  assert.match(bloco, /\.cz--pastel \.cz-pagina\{background:#FFFBF2\}/);
  for (const cor of ["#B45309", "#1E6B45", "#1D4F7A", "#7A5A00"]) assert.ok(bloco.includes(`--cz-cor:${cor}`), cor);
  for (const fundo of ["#FDE6D8", "#DFF1E4", "#DDEEF8", "#FCEFC7"]) assert.ok(bloco.includes(`background:${fundo};--cz-cor`), fundo);
  assert.match(bloco, /\.cz--pastel \.cz-cartao\{border-radius:calc\(var\(--u\) \* 26\)\}/);
  assert.equal(bloco.includes("mix-blend-mode"), false, "mix-blend-mode rasteriza a página do PDF: o Pastel usa PNG transparente");
  assert.match(bloco, /\.cz--pastel \.cz-quadro\{background:#fff;border:calc\(var\(--u\) \* 2\) dashed #E8B04B/);
  // Linha do tempo
  assert.match(bloco, /\.cz--linha \.cz-pagina\{background:#FBF8F2\}/);
  assert.match(bloco, /\.cz--linha \.cz-titulo\{[^}]*font-size:calc\(var\(--u\) \* 50\)/);
  assert.match(bloco, /\.cz--linha \.cz-ponto\{color:#E8760A\}/);
  assert.match(bloco, /--cz-miniatura:calc\(var\(--u\) \* 96\)/);
  assert.match(bloco, /--cz-bolinha:calc\(var\(--u\) \* 34\)/);
  assert.match(bloco, /\.cz-trilha::before\{[^}]*width:calc\(var\(--u\) \* 3\);background:repeating-linear-gradient\(180deg,#E8760A/);
  assert.match(bloco, /\.cz-miniatura\{[^}]*border:calc\(var\(--u\) \* 1\.5\) solid #E3E8EE;border-radius:calc\(var\(--u\) \* 14\)/);
  assert.match(bloco, /\.cz--linha \.cz-rotulo\{[^}]*font-size:calc\(var\(--u\) \* 15\)/);
  // impressão e regras gerais
  assert.match(css, /@media print\{[^}]*\.cartaz-so-papel\{position:absolute/);
  assert.equal(/#000(?![0-9a-f])/i.test(bloco), false);
  assert.equal(/#[0-9A-F]{6}/i.test(bloco.replace(/#[0-9A-F]{6}/gi, "")), false);
  // 5 linhas de 150 com 14 px de espaço a partir de 226 px terminam antes do rodapé (1123 - 16 - 11 px)
  assert.ok(226 + 5 * 150 + 4 * 14 < 1123 - 16 - 11);
  // 14 passos (modo denso): 5 linhas de 124 com 10 px + faixa do quadro cabem a partir de 226 px
  assert.ok(226 + 5 * 124 + 5 * 10 + 100 < 1123 - 16 - 11);
});

test("janela e editor: Estilo em chips com os 5 nomes, prévia sempre colorida, botões da folha em linha própria", () => {
  const d = ler("../components/pc/ConfigCartazLavagem.tsx");
  assert.ok(d.includes("<legend>Estilo</legend>") && d.includes("ESTILOS_DO_CARTAZ.map") && d.includes("prepararLogotipo") && d.includes("Alterações ainda não salvas") && d.includes("ui-btn ui-btn--save"));
  assert.ok(d.includes("Pré-visualização do cartaz") && d.includes("Gerar cartaz (PDF)") && d.includes("disabled={Boolean(bloqueio)}"));
  assert.equal(d.includes("ccz-apagada"), false, "a prévia mantém a cor mesmo com o POP em rascunho");
  assert.equal(/roxo|lilas|ui-btn--primary/i.test(d), false);
  const css = ler("../app/globals.css");
  assert.equal(css.includes("ccz-apagada"), false);
  assert.match(css, /\.ccp-chip\.is-ativo\{border-color:#21A3A3;background:#FFF6E5\}|\.ccp-estilo\.is-ativo,\.ccp-chip\.is-ativo\{border-color:#21A3A3;background:#FFF6E5\}/);
  assert.match(css, /\.pdoc-previa-acoes\{display:flex;flex-wrap:wrap/);
  const editor = ler("../components/pc/PcPopEditor.tsx");
  const titulo = editor.indexOf('<h2 className="pdoc-lista-titulo">Pré-visualização da folha</h2>');
  const acoes = editor.indexOf('<div className="pdoc-previa-acoes">');
  assert.ok(titulo > 0 && acoes > titulo, "título e botões em linhas separadas");
  const page = ler("../app/page.tsx");
  assert.ok(page.includes("cartazLavagem: anterior.cartazLavagem"), "salvar a empresa não apaga o estilo");
  assert.ok(page.includes("onSalvarCartaz={podeEditarDoc"));
});
