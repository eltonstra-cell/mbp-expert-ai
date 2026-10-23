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
  TEMAS_DO_CARTAZ,
  conferirIlustracoes,
  conteudoDoCartaz,
  eDeLavagemDeMaos,
  podeGerarOCartaz,
  popAprovadoParaOCartaz,
  posicaoDoQuadro,
  rodapeDoCartaz,
  subtituloDoCartaz,
  temaDoCartaz,
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

test("os 4 temas têm as cores pedidas", () => {
  assert.deepEqual(TEMAS_DO_CARTAZ.map((t) => [t.id, t.titulo, t.acento, t.forma, t.quadro, t.fundo]), [
    ["verde", "#1E4D3A", "#2F6B4F", "#8DB07A", "#E4EDDD", "#F4F1E8"],
    ["azul", "#1D3557", "#2A4D7C", "#1D3557", "#DCE6F2", "#F1F3F6"],
    ["terra", "#7A3B22", "#C0623A", "#E9B79C", "#F6E3D8", "#F7F0E8"],
    ["mostarda", "#6B4A12", "#D9A21B", "#E8C45A", "#F7EACB", "#F8F3E4"],
  ]);
  assert.equal(temaDoCartaz(undefined).id, "verde", "o padrão é o verde");
  assert.equal(temaDoCartaz("roxo").id, "verde");
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
  assert.deepEqual(readdirSync(pasta).sort(), ARQUIVOS_DAS_ILUSTRACOES);
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

test("o quadro 'sempre que' ocupa as duas colunas finais quando sobra espaço na linha", () => {
  assert.deepEqual(posicaoDoQuadro(14), { indice: 14, colunas: 1 });
  assert.deepEqual(posicaoDoQuadro(13), { indice: 13, colunas: 2 });
  assert.deepEqual(posicaoDoQuadro(12), { indice: 12, colunas: 1 });
});

test("geração nos 4 temas, com e sem logotipo, 13 e 14 passos: desenha sem erro", () => {
  const logo = "data:image/png;base64,iVBORw0KGgo=";
  for (const quantos of [13, 14]) {
    const cartoes = ARQUIVOS_DAS_ILUSTRACOES.filter((nome) => quantos === 14 || nome !== "10.jpg").map((arquivo, i) => ({ numero: i + 1, arquivo, rotulo: `Passo ${i + 1}`, passoDoPop: i + 1 }));
    for (const tema of TEMAS_DO_CARTAZ) {
      for (const logotipo of [undefined, logo]) {
        for (const previa of [false, true]) {
          const html = renderToStaticMarkup(CartazLavagem({ dados: { tema: tema.id, conteudo: { cartoes, sempreQue: ["Mãos sujas", "Depois de usar luvas"] }, rodape: "Beyond Nutri · POP-05 · versão 1.0 · aprovado em 21/10/2026", logotipo }, previa }));
          assert.ok(html.includes(`cz--${tema.id}`) && html.includes(tema.titulo) && html.includes(tema.fundo));
          assert.ok(html.includes("COMO LAVAR") && html.includes("AS MÃOS") && html.includes(`Siga os ${quantos} passos, na ordem.`));
          assert.equal((html.match(/class="cz-cartao"/g) || []).length, quantos);
          assert.ok(html.includes("LAVE AS MÃOS SEMPRE QUE") && html.includes("aprovado em 21/10/2026"));
          assert.equal(html.includes('class="cz-logo"'), Boolean(logotipo));
          // sem logotipo: nada no PDF final; a caixa tracejada só na pré-visualização
          assert.equal(html.includes("cz-logo--vazio"), !logotipo && previa);
          assert.equal(html.includes("span 2"), quantos === 13, "o quadro ocupa duas colunas só com 13 cartões");
        }
      }
    }
  }
});

test("layout: medidas do desenho aprovado e fontes do app", () => {
  const css = ler("../app/globals.css");
  const bloco = css.slice(css.indexOf('/* ===== Cartaz "Como lavar as mãos"'));
  assert.match(bloco, /aspect-ratio:794\/1123/);
  assert.match(bloco, /\.cz-forma--a\{[^}]*width:calc\(var\(--u\) \* 340\);height:calc\(var\(--u\) \* 260\)/);
  assert.match(bloco, /\.cz-forma--b\{[^}]*width:calc\(var\(--u\) \* 260\);height:calc\(var\(--u\) \* 150\);opacity:\.35/);
  assert.match(bloco, /\.cz-logo\{[^}]*left:calc\(var\(--u\) \* 34\);top:calc\(var\(--u\) \* 34\);width:calc\(var\(--u\) \* 110\);height:calc\(var\(--u\) \* 34\)/);
  assert.match(bloco, /\.cz-titulo\{[^}]*top:calc\(var\(--u\) \* 76\)[^}]*font-size:calc\(var\(--u\) \* 44\);font-weight:800/);
  assert.match(bloco, /\.cz-subtitulo\{[^}]*font-size:calc\(var\(--u\) \* 15\.5\)/);
  assert.match(bloco, /\.cz-grade\{[^}]*left:calc\(var\(--u\) \* 34\);right:calc\(var\(--u\) \* 34\);top:calc\(var\(--u\) \* 210\);display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\);grid-auto-rows:calc\(var\(--u\) \* 156\);column-gap:calc\(var\(--u\) \* 14\);row-gap:calc\(var\(--u\) \* 12\)/);
  assert.match(bloco, /\.cz-cartao\{[^}]*border:calc\(var\(--u\) \* 1\.5\) solid var\(--cz-forma\);border-radius:calc\(var\(--u\) \* 16\);background:#fff/);
  assert.match(bloco, /\.cz-numero\{[^}]*width:calc\(var\(--u\) \* 26\);height:calc\(var\(--u\) \* 26\);border-radius:50%;background:var\(--cz-titulo\);font-size:calc\(var\(--u\) \* 13\);font-weight:400[^}]*color:#fff/);
  assert.match(bloco, /\.cz-imagem\{[^}]*width:calc\(var\(--u\) \* 104\);height:calc\(var\(--u\) \* 104\)/);
  assert.match(bloco, /\.cz-rotulo\{[^}]*font-size:calc\(var\(--u\) \* 13\);font-weight:600/);
  assert.match(bloco, /\.cz-quadro\{[^}]*background:var\(--cz-quadro\)/);
  assert.match(bloco, /\.cz-chip\{[^}]*border-radius:999px;background:#fff;font-size:calc\(var\(--u\) \* 11\)/);
  assert.match(bloco, /\.cz-rodape\{[^}]*bottom:calc\(var\(--u\) \* 16\);font-size:calc\(var\(--u\) \* 11\)/);
  assert.match(bloco, /var\(--font-display\)/);
  assert.match(bloco, /@media print\{[^}]*\.cartaz-so-papel\{position:absolute/);
  // 5 linhas de 156 px com 12 px de espaço a partir de 210 px terminam antes do rodapé (1123 - 16 - 11 px)
  assert.ok(210 + 5 * 156 + 4 * 12 < 1123 - 16 - 11);
  // número branco sem negrito; nada preto pesado
  assert.equal(/#000(?![0-9a-f])/i.test(bloco), false);
});

test("janela: temas em chips baixos com seleção creme, logotipo da capa, não salvo na hora e botão verde", () => {
  const d = ler("../components/pc/ConfigCartazLavagem.tsx");
  assert.ok(d.includes("TEMAS_DO_CARTAZ.map") && d.includes("prepararLogotipo") && d.includes("Alterações ainda não salvas") && d.includes("ui-btn ui-btn--save"));
  assert.ok(d.includes("Pré-visualização do cartaz") && d.includes("Gerar cartaz (PDF)"));
  assert.equal(/roxo|lilas|ui-btn--primary/i.test(d), false);
  const css = ler("../app/globals.css");
  assert.match(css, /\.ccp-chip\.is-ativo\{border-color:#E8B04B;background:#FEF6E6\}|\.ccp-estilo\.is-ativo,\.ccp-chip\.is-ativo\{border-color:#E8B04B;background:#FEF6E6\}/);
  const page = ler("../app/page.tsx");
  assert.ok(page.includes("cartazLavagem: anterior.cartazLavagem"), "salvar a empresa não apaga o tema");
  assert.ok(page.includes("onSalvarCartaz={podeEditarDoc"));
});
