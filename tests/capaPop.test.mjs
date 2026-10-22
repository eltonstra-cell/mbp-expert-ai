import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import CapaDoPop from "../components/CapaDoPop.ts";
import {
  CORES_DE_CAPA,
  ESTILOS_DE_CAPA,
  ICONES_CLAROS_EM_CINZA,
  ICONES_DE_CAPA,
  capaCompleta,
  capaInicialDoDialogo,
  capaMudou,
  capaParaGravarNaAprovacao,
  chaveDoMapaDeIcones,
  comCapaNaVersaoAprovada,
  comIconeDeCapa,
  iconeDoPop,
  modeloDaCapa,
  sugerirTracoEmPretoEBranco,
  urlDoIcone,
} from "../lib/capaPop.ts";
import { bytesDoDataUrl, dimensoesDoLogotipo, tipoDeLogotipoAceito } from "../lib/logotipoCapa.ts";
import { folhaDoPop } from "../lib/popDocumento.ts";
import { CATALOGO_DE_MODELOS } from "../lib/popModelos.ts";
import { CONJUNTO_DA_NORMA } from "../lib/popsNorma.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");
const mapa = JSON.parse(ler("../public/capas/modelos-icones.json"));
const DADOS = { codigo: "POP-05", titulo: "Lavagem e higienização de mãos", versao: "versão 1.0", empresa: "Beyond Nutri", cnpj: "12.345.678/0001-95", iconeId: "maos" };
const LOGO = "data:image/png;base64,iVBORw0KGgo=";

test("ícone por modelo conforme o mapa; norma, POP em branco e fallback 'padrao'", () => {
  const modelos = CATALOGO_DE_MODELOS.pops;
  assert.ok(modelos.length >= 20);
  for (const modelo of modelos) {
    assert.ok(mapa[modelo.id], `${modelo.id} precisa de entrada no mapa`);
    assert.equal(iconeDoPop({ origemModelo: { id: modelo.id, versaoCatalogo: 1 } }), mapa[modelo.id], modelo.id);
  }
  CONJUNTO_DA_NORMA.forEach((definicao, indice) => {
    const chave = `norma:POP-${String(indice + 1).padStart(2, "0")}`;
    assert.equal(chaveDoMapaDeIcones({ catalogoId: definicao.catalogoId }), chave);
    assert.equal(iconeDoPop({ catalogoId: definicao.catalogoId }), mapa[chave]);
  });
  assert.equal(iconeDoPop({}), mapa["em-branco"]);
  assert.equal(chaveDoMapaDeIcones({}), "em-branco");
  // sem entrada no mapa: "padrao"
  assert.equal(iconeDoPop({ origemModelo: { id: "modelo-que-nao-existe", versaoCatalogo: 1 } }), "padrao");
  assert.equal(iconeDoPop({ catalogoId: "catalogo-desconhecido" }), mapa["em-branco"]);
});

test("os 16 ícones existem (PNG e traço) e a escolha por POP só aceita um deles", () => {
  assert.equal(ICONES_DE_CAPA.length, 16);
  for (const icone of ICONES_DE_CAPA) {
    assert.ok(existsSync(new URL(`../public/capas/${icone.png}`, import.meta.url)), icone.png);
    assert.ok(existsSync(new URL(`../public/capas/${icone.traco}`, import.meta.url)), icone.traco);
  }
  for (const valor of Object.values(mapa)) assert.ok(ICONES_DE_CAPA.some((icone) => icone.id === valor), valor);
  assert.equal(iconeDoPop({ iconeCapa: "fogo", origemModelo: { id: "comp-01", versaoCatalogo: 1 } }), "fogo");
  assert.equal(iconeDoPop({ iconeCapa: "inventado", origemModelo: { id: "comp-01", versaoCatalogo: 1 } }), mapa["comp-01"], "escolha inválida volta ao mapa");
  assert.equal(comIconeDeCapa({ id: "x" }, "pisos").iconeCapa, "pisos");
  assert.equal("iconeCapa" in comIconeDeCapa({ id: "x", iconeCapa: "pisos" }, ""), false, "vazio volta ao automático");
  assert.equal(urlDoIcone("maos", "colorido"), "/capas/icones/maos.png");
  assert.equal(urlDoIcone("maos", "traco"), "/capas/icones-traco/maos.svg");
  assert.equal(urlDoIcone("nao-existe", "colorido"), "/capas/icones/padrao.png");
});

test("a capa vem DESLIGADA por padrão: estilo C, laranja, ícone colorido, sem logotipo", () => {
  assert.deepEqual(capaCompleta(undefined), { ativa: false, estilo: "C", cor: "laranja", icone: "colorido" });
  assert.deepEqual(capaCompleta({}), { ativa: false, estilo: "C", cor: "laranja", icone: "colorido" });
  assert.equal(capaCompleta({ estilo: "Z", cor: "roxo", icone: "foto", logotipo: "http://x/y.png", ativa: true }).estilo, "C", "valores inválidos voltam ao padrão");
  assert.equal(capaCompleta({ logotipo: "http://x/y.png" }).logotipo, undefined, "só data URL de PNG ou JPG");
  assert.equal(CORES_DE_CAPA.find((c) => c.id === "laranja").hex, "#E8760A");
  assert.deepEqual(CORES_DE_CAPA.map((c) => c.hex), ["#E8760A", "#1F8A4C", "#B5532A", "#E8B04B", "#3A4750", "#12202B"]);
  assert.deepEqual(ESTILOS_DE_CAPA.map((e) => e.id), ["A", "B", "C", "D", "E", "F"]);
});

test("modelo da capa: o que aparece em cada estilo; logotipo ausente e CNPJ ausente", () => {
  const modelo = (estilo, extra = {}, dados = DADOS, previa = false) => modeloDaCapa({ ...capaCompleta({ ativa: true, estilo }), ...extra }, dados, previa);
  // A: só texto
  assert.equal(modelo("A").icone, null);
  assert.equal(modelo("A").rodape, null);
  assert.equal(modelo("A").empresaNoCorpo, "Beyond Nutri");
  // B: barra no topo e ícone; D, E, F também têm ícone
  for (const e of ["B", "C", "D", "E", "F"]) assert.equal(modelo(e).icone.url, "/capas/icones/maos.png", e);
  // C: ícone, barra curta, rodapé com empresa e CNPJ
  const c = modelo("C");
  assert.equal(c.barraCurta, true);
  assert.deepEqual(c.rodape, { esquerda: "Beyond Nutri", direita: "CNPJ 12.345.678/0001-95" });
  assert.equal(c.empresaNoCorpo, "");
  // logotipo: só no C; sem logotipo a posição fica vazia no PDF (null) e tracejada só na prévia
  assert.equal(c.logotipo, null);
  assert.deepEqual(modelo("C", {}, DADOS, true).logotipo, { presente: false });
  assert.deepEqual(modelo("C", { logotipo: LOGO }).logotipo, { presente: true, src: LOGO });
  for (const e of ["A", "B", "D", "E", "F"]) assert.equal(modelo(e, { logotipo: LOGO }).logotipo, null, `${e} não usa logotipo`);
  // sem CNPJ: o lado direito do rodapé some
  assert.deepEqual(modelo("C", {}, { ...DADOS, cnpj: "" }).rodape, { esquerda: "Beyond Nutri", direita: "" });
  // ícone de traço
  assert.equal(modelo("C", { icone: "traco" }).icone.url, "/capas/icones-traco/maos.svg");
});

test("os 6 estilos × 6 cores × 2 tipos de ícone × com e sem logotipo desenham sem erro", () => {
  let total = 0;
  for (const estilo of ESTILOS_DE_CAPA) {
    for (const cor of CORES_DE_CAPA) {
      for (const icone of ["colorido", "traco"]) {
        for (const logotipo of [undefined, LOGO]) {
          for (const cnpj of ["12.345.678/0001-95", ""]) {
            const modelo = modeloDaCapa(capaCompleta({ ativa: true, estilo: estilo.id, cor: cor.id, icone, logotipo }), { ...DADOS, cnpj });
            const html = renderToStaticMarkup(CapaDoPop({ modelo }));
            assert.ok(html.includes(`capa-pop--${estilo.id}`), estilo.id);
            assert.ok(html.includes(cor.hex), `${estilo.id}/${cor.id}`);
            assert.ok(html.includes("POP-05") && html.includes("versão 1.0") && html.includes("Lavagem e higienização de mãos"));
            if (estilo.id === "C") {
              assert.ok(html.includes("Beyond Nutri"));
              assert.equal(html.includes("CNPJ 12.345.678/0001-95"), Boolean(cnpj));
              assert.equal(html.includes("Logotipo da empresa"), Boolean(logotipo), "logotipo ausente: nada no PDF");
            }
            if (estilo.id !== "A") assert.ok(html.includes(icone === "traco" ? "cp-icone--traco" : "cp-icone--cor"));
            total += 1;
          }
        }
      }
    }
  }
  assert.equal(total, 6 * 6 * 2 * 2 * 2);
  // na prévia, a caixa tracejada do logotipo aparece só sem logotipo
  const previa = renderToStaticMarkup(CapaDoPop({ modelo: modeloDaCapa(capaCompleta({ ativa: true, estilo: "C" }), DADOS, true) }));
  assert.ok(previa.includes("cp-logo--vazio"));
  const final = renderToStaticMarkup(CapaDoPop({ modelo: modeloDaCapa(capaCompleta({ ativa: true, estilo: "C" }), DADOS, false) }));
  assert.equal(final.includes("cp-logo"), false);
});

test("capa desligada não altera o PDF atual; ligada vira a página 1 (A4, sem cabeçalho nem numeração)", () => {
  const pop = { id: "p", codigo: "POP-01", titulo: "Higienização", versao: "1.0", status: "Rascunho", conteudo: { passos: [{ id: "a", texto: "Lavar" }] } };
  const folha = folhaDoPop(pop, { nome: "Beyond Nutri", cnpj: "12345678000195" });
  assert.equal(folha.capa.cnpj, "12.345.678/0001-95");
  assert.equal(folhaDoPop(pop, { nome: "Beyond Nutri" }).capa.cnpj, "", "sem CNPJ cadastrado, nada é mostrado");
  // o corpo da folha não muda com a capa: só a capa é uma seção extra, e só quando existe
  const popFolha = ler("../components/pc/PopFolha.tsx");
  assert.ok(popFolha.includes('{capa && modo === "leitura" && ('), "sem capa, nenhuma página extra");
  assert.ok(popFolha.includes('className="pfolha-capa"'));
  const css = ler("../app/globals.css");
  assert.match(css, /\.pfolha-capa\{display:none\}/, "na tela a capa não aparece (só no papel)");
  assert.match(css, /@media print\{[^}]*\n?\s*\.pfolha-capa\{display:block;width:210mm;height:297mm;[^}]*break-after:page/);
  assert.match(css, /@page capa\{size:A4;margin:0\}/);
  assert.match(css, /@media print\{\.pfolha-capa\{page:capa\}\}/);
  assert.match(css, /\.capa-pop\{[^}]*-webkit-print-color-adjust:exact;print-color-adjust:exact\}/, "as cores da capa saem no papel");
  const rodape = ler("../lib/printFooter.ts");
  assert.ok(rodape.includes("@page capa{@top-left{content:none;border:0}@top-right{content:none;border:0}@bottom-left{content:none}@bottom-right{content:none}}"));
  const editor = ler("../components/pc/PcPopEditor.tsx");
  assert.ok(editor.includes("capa={capaNoPapel}") && editor.includes("setCapaNoPapel(capa?.ativa ?"));
  assert.ok(editor.includes("afterprint"), "a capa some de novo quando a impressão termina");
});

test("a capa vale a partir da próxima emissão: aprovada guarda a sua; aprovada antes fica sem capa", () => {
  const ligada = { ativa: true, estilo: "D", cor: "verde", icone: "traco" };
  assert.deepEqual(capaParaGravarNaAprovacao(ligada), ligada);
  assert.equal(capaParaGravarNaAprovacao({ ...ligada, ativa: false }), undefined);
  assert.equal(capaParaGravarNaAprovacao(undefined), undefined);
  const aprovado = { versao: "1.0", versoes: [{ versao: "1.0" }] };
  assert.deepEqual(comCapaNaVersaoAprovada(aprovado, ligada).versoes[0].capa, ligada);
  assert.equal(comCapaNaVersaoAprovada(aprovado, undefined), aprovado);
  // dialogo: rascunho usa a da empresa; aprovado usa a da versão (que não muda); aprovado antigo sem capa começa desligado
  assert.equal(capaInicialDoDialogo({ status: "Rascunho" }, undefined, ligada).estilo, "D");
  assert.equal(capaInicialDoDialogo({ status: "Aprovado" }, { ativa: true, estilo: "F", cor: "terra" }, ligada).estilo, "F");
  assert.equal(capaInicialDoDialogo({ status: "Aprovado" }, undefined, ligada).ativa, false);
  assert.equal(capaInicialDoDialogo({ status: "Rascunho" }, undefined, undefined).ativa, false);
  assert.equal(capaMudou(ligada, capaCompleta(ligada)), false);
  assert.equal(capaMudou(ligada, { ...capaCompleta(ligada), cor: "pb" }), true);
});

test("logotipo: até 600 px de largura, sem ampliar; só PNG ou JPG", () => {
  assert.deepEqual(dimensoesDoLogotipo(1200, 600), { largura: 600, altura: 300 });
  assert.deepEqual(dimensoesDoLogotipo(300, 100), { largura: 300, altura: 100 });
  assert.deepEqual(dimensoesDoLogotipo(0, 10), { largura: 0, altura: 0 });
  assert.equal(tipoDeLogotipoAceito("image/png"), true);
  assert.equal(tipoDeLogotipoAceito("image/jpeg"), true);
  assert.equal(tipoDeLogotipoAceito("image/gif"), false);
  assert.equal(tipoDeLogotipoAceito("image/svg+xml"), false);
  assert.equal(bytesDoDataUrl("data:image/png;base64,AAAA"), 3);
  assert.equal(bytesDoDataUrl("data:image/png;base64,AA=="), 1);
});

test("preto e branco: o ícone colorido claro demais sugere o de traço", () => {
  assert.ok(ICONES_CLAROS_EM_CINZA.includes("maos"));
  assert.equal(sugerirTracoEmPretoEBranco({ cor: "pb", icone: "colorido" }, "maos"), true);
  assert.equal(sugerirTracoEmPretoEBranco({ cor: "pb", icone: "traco" }, "maos"), false);
  assert.equal(sugerirTracoEmPretoEBranco({ cor: "laranja", icone: "colorido" }, "maos"), false);
  assert.equal(sugerirTracoEmPretoEBranco({ cor: "pb", icone: "colorido" }, "fogo"), false);
});

test("configuração: interruptor desligado, 6 miniaturas, 6 cores, ícone, logotipo, Salvar verde e pré-visualização ao lado", () => {
  const c = ler("../components/pc/ConfigCapaDoPop.tsx");
  assert.ok(c.includes("Incluir capa") && c.includes('role="switch"') && c.includes("ESTILOS_DE_CAPA.map") && c.includes("CORES_DE_CAPA.map"));
  assert.ok(c.includes("Colorido") && c.includes("Traço (uma cor)") && c.includes("Enviar logotipo") && c.includes("Ícone deste POP"));
  assert.ok(c.includes("ui-btn ui-btn--save") && c.includes("Alterações ainda não salvas") && c.includes("Pré-visualização da capa"));
  assert.equal(/ui-btn--primary|roxo|lilas/i.test(c), false);
  const css = ler("../app/globals.css");
  assert.match(css, /\.ccp-corpo\{display:grid;grid-template-columns:minmax\(0,1fr\) 280px/);
  assert.match(css, /\.ccp-estilo\.is-ativo,\.ccp-chip\.is-ativo\{border-color:#E8B04B;background:#FEF6E6\}/);
  assert.match(css, /\.ccp-chip\{[^}]*min-height:34px/);
  const page = ler("../app/page.tsx");
  assert.ok(page.includes("capaDosPops: anterior.capaDosPops"), "salvar a empresa não apaga a capa");
  assert.ok(page.includes("capaDosPops: capa"));
});

test("sem fotos nas capas e licenças mantidas junto dos ícones", () => {
  const lib = ler("../lib/capaPop.ts");
  assert.equal(/foto/i.test(ler("../components/CapaDoPop.ts")), false);
  const licencas = ler("../public/capas/LICENCAS.txt");
  assert.ok(licencas.includes("Apache License, Version 2.0") && licencas.includes("SIL Open Font License"));
});
