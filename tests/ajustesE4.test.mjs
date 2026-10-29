import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { interpretarEquipamentos, linhaDeConferencia, podeConfirmar, resolverAmbiente, semAcento, singularizar } from "../lib/vozEquipamentos.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

const AMBIENTES = [
  "Cozinha / Produção",
  "Câmara Fria",
  "Recebimento de matérias-primas, ingredientes, embalagens e materiais de limpeza",
  "Estoque de matérias-primas, ingredientes e embalagens",
  "Salão",
];
const resumo = (frase) => interpretarEquipamentos(frase, AMBIENTES).itens.map((item) => [item.nome, item.quantidade, item.ambiente, item.situacao]);

test("4.1 'geladeira na cozinha' e 'geladeira cozinha' preenchem equipamento, quantidade e ambiente", () => {
  assert.deepEqual(resumo("geladeira na cozinha"), [["Geladeira", 1, "Cozinha / Produção", "ok"]]);
  assert.deepEqual(resumo("geladeira cozinha"), [["Geladeira", 1, "Cozinha / Produção", "ok"]]);
  assert.deepEqual(resumo("Geladeira na Cozinha."), [["Geladeira", 1, "Cozinha / Produção", "ok"]]);
});

test("4.1 'duas geladeiras e um freezer na câmara fria' dá dois itens no mesmo ambiente", () => {
  assert.deepEqual(resumo("duas geladeiras e um freezer na câmara fria"), [
    ["Geladeira", 2, "Câmara Fria", "ok"],
    ["Freezer", 1, "Câmara Fria", "ok"],
  ]);
  // sem acento e com vírgula
  assert.deepEqual(resumo("duas geladeiras, um freezer na camara fria"), [
    ["Geladeira", 2, "Câmara Fria", "ok"],
    ["Freezer", 1, "Câmara Fria", "ok"],
  ]);
});

test("4.1 '3 balanças no recebimento': algarismo, plural simples e ambiente por começo do nome", () => {
  assert.deepEqual(resumo("3 balanças no recebimento"), [["Balança", 3, AMBIENTES[2], "ok"]]);
  assert.deepEqual(resumo("três balanças no recebimento"), [["Balança", 3, AMBIENTES[2], "ok"]]);
});

test("4.1 números por extenso (um/uma até dez), preposições da/do/de/em e ambientes por item", () => {
  assert.deepEqual(resumo("dez prateleiras na cozinha").map((i) => i[1]), [10]);
  assert.deepEqual(resumo("sete mesas em salão").map((i) => [i[0], i[1], i[2]]), [["Mesa", 7, "Salão"]]);
  assert.deepEqual(resumo("forno da cozinha"), [["Forno", 1, "Cozinha / Produção", "ok"]]);
  assert.deepEqual(resumo("dois fornos de convecção no salão"), [["Forno de convecção", 2, "Salão", "ok"]]);
  assert.deepEqual(resumo("geladeira na cozinha e freezer na camara fria"), [
    ["Geladeira", 1, "Cozinha / Produção", "ok"],
    ["Freezer", 1, "Câmara Fria", "ok"],
  ]);
  assert.deepEqual(resumo("adicionar liquidificadores na cozinha"), [["Liquidificador", 1, "Cozinha / Produção", "ok"]]);
});

test("4.2 ambiente falado que não existe: não é criado em silêncio e o item não pode ser confirmado", () => {
  const itens = interpretarEquipamentos("uma geladeira no churrasqueira", AMBIENTES).itens;
  assert.equal(itens.length, 1);
  assert.equal(itens[0].situacao, "inexistente");
  assert.equal(itens[0].falado, "churrasqueira");
  assert.equal(itens[0].ambiente, "");
  assert.equal(podeConfirmar(itens[0]), false);
  assert.equal(linhaDeConferencia(itens[0]), "Geladeira · churrasqueira (não existe) · 1");
  // sem ambiente nenhum: pede para escolher
  const sem = interpretarEquipamentos("geladeira", AMBIENTES).itens[0];
  assert.equal(sem.situacao, "faltando");
  assert.equal(podeConfirmar(sem), false);
  assert.equal(podeConfirmar({ nome: "Geladeira", quantidade: 1, ambiente: "Cozinha / Produção" }), true);
});

test("4.2 não entendeu: nenhum item e o texto fica no campo", () => {
  assert.deepEqual(interpretarEquipamentos("", AMBIENTES), { entendeu: false, itens: [] });
  assert.equal(interpretarEquipamentos("dois", AMBIENTES).entendeu, false);
  assert.equal(interpretarEquipamentos("na cozinha", AMBIENTES).entendeu, false);
  const c = ler("../components/ManualBaseFields.tsx");
  assert.ok(c.includes("Não entendeu: o texto fica no campo e o resto não é preenchido."));
  assert.ok(c.includes("setNomeEquipamento((atual) => [atual.trim(), texto.trim()]"));
});

test("4.1 ambiente: sem acento, sem diferença de maiúsculas, nome inteiro ou começo do nome; ambíguo pede escolha", () => {
  assert.deepEqual(resolverAmbiente("CAMARA FRIA", AMBIENTES), { tipo: "ok", ambiente: "Câmara Fria" });
  assert.deepEqual(resolverAmbiente("salao", AMBIENTES), { tipo: "ok", ambiente: "Salão" });
  assert.equal(resolverAmbiente("de", AMBIENTES), null, "palavra de ligação não é ambiente");
  assert.equal(resolverAmbiente("material", AMBIENTES), null, "palavra solta no meio do nome não vale");
  const ambiguo = resolverAmbiente("estoque", ["Estoque seco", "Estoque frio"]);
  assert.equal(ambiguo.tipo, "escolher");
  assert.deepEqual(ambiguo.candidatos, ["Estoque seco", "Estoque frio"]);
  assert.equal(semAcento("  Câmara   Fria "), "camara fria");
});

test("4.1 plural simples", () => {
  assert.equal(singularizar("geladeiras"), "geladeira");
  assert.equal(singularizar("fogões"), "fogão");
  assert.equal(singularizar("freezers"), "freezer");
  assert.equal(singularizar("liquidificadores"), "liquidificador");
  assert.equal(singularizar("verticais"), "vertical");
  assert.equal(singularizar("gás"), "gás");
});

test("4.2 tela: linha de conferência com ✓ confirmar e ✕ corrigir; nada é gravado sem confirmar; sem IA externa", () => {
  const c = ler("../components/VozEquipamentosConferencia.tsx");
  assert.ok(c.includes("✓") && c.includes("✕") && c.includes("Confirmar") && c.includes("Corrigir") && c.includes("não existe no cadastro"));
  assert.ok(c.includes("Criar “{item.falado}”"), "criar só quando a pessoa pede");
  const campos = ler("../components/ManualBaseFields.tsx");
  assert.ok(campos.includes("function confirmarFalados") && campos.includes("onTextoDitado={tratarFalaDeEquipamento}"));
  // o item só entra em `equipamentos` dentro de confirmarFalados
  const trecho = campos.slice(campos.indexOf("function tratarFalaDeEquipamento"), campos.indexOf("function confirmarFalados"));
  assert.equal(trecho.includes("onEquipamentosChange"), false, "interpretar não grava");
  const voz = ler("../components/FieldVoiceTools.tsx");
  assert.ok(voz.includes("onTextoDitado"));
  const lib = ler("../lib/vozEquipamentos.ts");
  assert.equal(/fetch\(|openai|\/api\//i.test(lib), false, "interpretador local: sem chamada externa");
  assert.match(ler("../app/globals.css"), /\.vz-ok\{border:0;background:#21805B;color:#fff\}/);
});
