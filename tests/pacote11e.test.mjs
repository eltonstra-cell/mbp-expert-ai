import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8");
const css = ler("../app/globals.css");

test("E: Mais mostra Empresas com etiqueta novo e a tela do celular tem busca, + Nova e cartões", () => {
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes('rotulo: "Empresas"') && pagina.includes('detalhe: "Cadastro, cor e seleção"') && pagina.includes('etiqueta: "novo"'));
  assert.ok(pagina.includes("ehPC ? PcEmpresas : CampoEmpresas"));
  const tela = ler("../components/campo/CampoEmpresas.tsx");
  assert.ok(tela.includes("Buscar por nome, CNPJ ou município") && tela.includes("+ Nova"));
  assert.ok(tela.includes("Selecionar") && tela.includes("Ativa ✓") && tela.includes("menuDaEmpresa"));
  assert.ok(css.includes(".cemp-avatar-btn{width:44px;height:44px}"));
});

test("E: o avatar abre a folha de cor no celular e o painel de troca mostra avatar redondo", () => {
  const tela = ler("../components/campo/CampoEmpresas.tsx");
  assert.ok(tela.includes("CorDaEmpresaJanela") && tela.includes("emp-lapis") && tela.includes("setCorAberta(empresa.id)"));
  const janela = ler("../components/CorDaEmpresa.tsx");
  assert.ok(janela.includes("(max-width: 767px)") && janela.includes("cor-folha"));
  const painel = ler("../components/campo/TrocarEmpresaPainel.tsx");
  assert.ok(painel.includes("emp-avatar-mini") && painel.includes("iniciaisDaEmpresa(opcao.nome)"));
  assert.ok(css.includes(".emp-avatar-mini{display:grid;flex:none;place-items:center;width:32px;height:32px;border-radius:50%"));
});

