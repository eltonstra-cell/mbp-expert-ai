import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ambientesParaVisita, limparVinculos, nomeJaExistente } from "../lib/ambientesVisita.ts";
import { ambientesParaMover, moverEquipamento } from "../lib/equipamentosCadastro.ts";
import { LINHAS_MAXIMAS_DE_CHIPS, quantosChipsCabem } from "../lib/escolhaEmJanela.ts";
import { SETORES_OFICIAIS_MANUAL, criarModelosQuestionarioAmbientes } from "../lib/manualBase.ts";
import { assinaturaEdicaoEmpresa } from "../lib/estadoNaoSalvo.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");
const RECEBIMENTO = SETORES_OFICIAIS_MANUAL[0];
const COZINHA = SETORES_OFICIAIS_MANUAL[4];

test("2.1 equipamento: mover para outro ambiente muda só o item escolhido", () => {
  const itens = [
    { id: "a", setor: "Cozinha", nome: "Geladeira", quantidade: 1, estado: "Não avaliado", observacao: "" },
    { id: "b", setor: "Cozinha", nome: "Fogão", quantidade: 1, estado: "Não avaliado", observacao: "" },
  ];
  const depois = moverEquipamento(itens, "a", "Estoque");
  assert.equal(depois.find((i) => i.id === "a").setor, "Estoque");
  assert.equal(depois.find((i) => i.id === "b").setor, "Cozinha");
  assert.equal(moverEquipamento(itens, "a", "Cozinha"), itens, "mesmo ambiente: nada muda");
  assert.equal(moverEquipamento(itens, "a", ""), itens);
  assert.equal(moverEquipamento(itens, "zzz", "Estoque"), itens);
  assert.deepEqual(ambientesParaMover(["Cozinha", "Estoque", "Salão"], "Estoque"), ["Cozinha", "Salão"]);
});

test("2.1 linha de equipamento recolhida por padrão, sem o campo Ambiente repetido; título do grupo com selo", () => {
  const c = ler("../components/ManualBaseFields.tsx");
  // Pacote 1: o equipamento virou chip dentro do ambiente; os detalhes abrem só ao tocar no chip (recolhidos por padrão).
  assert.ok(c.includes('className="cad-chip-nome"') && c.includes("detalhesAbertos") && c.includes("useState<string[]>([])"));
  assert.ok(c.includes("Mover para outro ambiente") && c.includes("moverEquipamento"));
  assert.equal(c.includes("Observação e ambiente"), false);
  assert.ok(c.includes('className="cad-conta"'));
  const css = ler("../app/globals.css");
  assert.match(css, /\.cad-grupo-titulo\{[^}]*font-size:16px;font-weight:500;color:#12202B\}/);
  assert.match(css, /\.cad-linha select\.cad-input,select\.cad-input\{background-color:#fff;padding-right:32px\}/);
  assert.equal(/\.cad-input,\.cad-linha select\.cad-input\{[^}]*background:#fff/.test(css), false, "o fundo não apaga a seta ▾");
});

test("2.2 chips recolhíveis: quantos cabem na linha e o chip +N", () => {
  assert.equal(LINHAS_MAXIMAS_DE_CHIPS, 4);
  assert.equal(quantosChipsCabem([100, 100, 100], 400, 8, 60), 3, "todos cabem: sem +N");
  assert.equal(quantosChipsCabem([100, 100, 100, 100], 400, 8, 60), 3, "não cabem: sobra espaço para o +N");
  assert.equal(quantosChipsCabem([100, 100, 100, 100, 100], 400, 8, 60), 3);
  assert.equal(quantosChipsCabem([300, 300], 400, 8, 60), 1);
  assert.equal(quantosChipsCabem([390, 300], 400, 8, 60), 0, "nem um chip mais o +N cabem");
  assert.equal(quantosChipsCabem([], 400, 8, 60), 0);
  const j = ler("../components/EscolhaEmJanela.tsx");
  assert.ok(j.includes("Recolher ▴") && j.includes("+{escondidos} ▾") && j.includes('aria-expanded="false"'));
  const css = ler("../app/globals.css");
  assert.match(css, /\.esc-chips--aberto\{max-height:168px;overflow-y:auto/);
  assert.match(css, /\.esc-chips--fechado\{flex-wrap:nowrap;overflow:hidden\}/);
});

test("2.3 setor oficial vinculado: a visita mostra UM item (nome próprio) e o questionário já vem preenchido", () => {
  const setores = [RECEBIMENTO, COZINHA, "Recebimento"];
  assert.deepEqual(ambientesParaVisita(setores), setores, "sem vínculo: como sempre");
  assert.deepEqual(ambientesParaVisita(setores, {}), setores);
  const vinculos = { Recebimento: RECEBIMENTO };
  assert.deepEqual(ambientesParaVisita(setores, vinculos), [COZINHA, "Recebimento"]);
  assert.deepEqual(ambientesParaVisita(["Recebimento", COZINHA], vinculos), ["Recebimento", COZINHA], "setor oficial não marcado: nada some");
  assert.deepEqual(limparVinculos({ Recebimento: "Qualquer coisa", Fantasma: RECEBIMENTO, [COZINHA]: RECEBIMENTO }, setores), {});
  const modelos = criarModelosQuestionarioAmbientes(["Balcão de entrega"], undefined, { "Balcão de entrega": COZINHA });
  assert.equal(modelos["Balcão de entrega"], COZINHA);
  assert.equal(criarModelosQuestionarioAmbientes(["Balcão"], { Balcão: "Estrutura geral/personalizada" }, { Balcão: COZINHA }).Balcão, COZINHA);
  assert.equal(criarModelosQuestionarioAmbientes(["Balcão"], { Balcão: "Área Administrativa" }, { Balcão: COZINHA }).Balcão, "Área Administrativa", "escolha diferente do padrão continua valendo");
  assert.equal(criarModelosQuestionarioAmbientes(["Balcão"]).Balcão, "Estrutura geral/personalizada", "ambiente antigo, sem vínculo: igual a antes");
  const base = { form: {}, responsabilidades: [], setores: [], equipamentos: [], fluxos: [], programas: [] };
  assert.equal(assinaturaEdicaoEmpresa(base), assinaturaEdicaoEmpresa({ ...base, vinculos: {} }), "sem vínculo a assinatura não muda");
  assert.notEqual(assinaturaEdicaoEmpresa(base), assinaturaEdicaoEmpresa({ ...base, vinculos }));
  const campos = ler("../components/ManualBaseFields.tsx");
  assert.ok(campos.includes("Setor oficial") && campos.includes("Nenhum (opcional)"));
  assert.ok(ler("../types/index.ts").includes("setorOficialDoAmbiente?: Record<string, string>"));
});

test("2.5 Outro ambiente: nome repetido avisa na hora (sem acento e sem diferença de maiúsculas)", () => {
  const cadastro = ["Padaria", "Açougue"];
  assert.equal(nomeJaExistente("padaria", cadastro), "Padaria");
  assert.equal(nomeJaExistente("ACOUGUE", cadastro), "Açougue");
  assert.equal(nomeJaExistente("  Açougue  ", cadastro), "Açougue");
  assert.equal(nomeJaExistente("Sushi bar", cadastro), undefined);
  assert.equal(nomeJaExistente("", cadastro), undefined);
  assert.equal(nomeJaExistente("central de gas", []), "Central de gás");
  assert.equal(nomeJaExistente("Recebimento", []), RECEBIMENTO);
  const t = ler("../components/pc/PcAmbientes.tsx");
  assert.ok(t.includes("Já existe: {jaExiste}") && t.includes("+ Outro ambiente") && t.includes("Salvar também no cadastro da empresa"));
  assert.ok(t.includes("useState(true)"), "a caixa vem marcada por padrão");
  assert.ok(t.includes('title="Remover ambiente"') && t.includes("aria-label={`Remover ambiente ${nome}`}"));
  const page = ler("../app/page.tsx");
  assert.ok(page.includes("function adicionarPersonalizado(salvarNoCadastro = false)") && page.includes("nomeJaExistente(nome,"));
  assert.match(ler("../app/globals.css"), /\.pc-route-remove\{width:32px;height:32px\}/);
});

test("2.4 Nova visita: uma linha com Data, Responsável e Identificação; campos de 40 px; Criar visita à direita", () => {
  const page = ler("../app/page.tsx");
  assert.ok(page.includes('className="nv-linha"') && page.includes("rows={3}") && page.includes('className="ui-btn ui-btn--criar nv-criar"'));
  const css = ler("../app/globals.css");
  assert.match(css, /\.nv-input\{[^}]*height:40px/);
  assert.match(css, /\.nv-criar\{height:40px;min-height:40px/);
  assert.match(css, /\.nv-rodape\{display:flex;justify-content:flex-end\}/);
});
