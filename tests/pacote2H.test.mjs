import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { pendenciasDaEmpresa, textoDaPendencia, preparacaoDaEmpresa } from "../lib/companyReadiness.ts";
import { razaoSocialTitulo } from "../lib/nomeCargo.ts";
import { subtituloDaEmpresa, textoDaPreparacao } from "../lib/listaDeEmpresas.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

const empresaBase = (extra = {}) => ({
  id: "e1",
  nomeFantasia: "Mello",
  razaoSocial: "MELLO SERVICOS ALIMENTICIOS LTDA",
  cnpj: "11222333000181",
  responsavel: "Ana",
  horarioFuncionamento: "Seg a sex, 8h às 18h",
  setoresManual: ["Cozinha"],
  pops: [{ id: "p", codigo: "POP-01", titulo: "x" }],
  ...extra,
});

test("empresa: 'Cadastro completo' só com a preparação em 100%; antes disso, a pendência principal", () => {
  const incompleta = empresaBase();
  assert.ok(preparacaoDaEmpresa(incompleta).percentual < 100);
  assert.deepEqual(pendenciasDaEmpresa(incompleta), ["equipamentos", "programas"]);
  assert.equal(textoDaPendencia(pendenciasDaEmpresa(incompleta)), "Falta: equipamentos e programas");
  const completa = empresaBase({ equipamentosSetores: [{ id: "x" }], programasControleQualidade: [{ status: "Em andamento" }] });
  assert.equal(preparacaoDaEmpresa(completa).percentual, 100);
  assert.deepEqual(pendenciasDaEmpresa(completa), []);
  assert.equal(textoDaPendencia([]), "");
  assert.equal(textoDaPendencia(["a", "b", "c"]), "Falta: a, b e c");
  assert.ok(pendenciasDaEmpresa(empresaBase({ cnpj: "" })).includes("CNPJ"), "sem CNPJ não é completa mesmo com a barra cheia");
  const tela = ler("../components/pc/PcEmpresas.tsx");
  assert.ok(tela.includes('"Cadastro completo"') && !tela.includes("Cadastro incompleto") && !tela.includes('<Pill tom="ok">Cadastro completo'), "texto simples, sem pílula");
  assert.equal(textoDaPreparacao([]), "Cadastro completo");
  assert.equal(textoDaPreparacao(["horário de funcionamento"]), "Falta horário de funcionamento");
  assert.equal(textoDaPreparacao(["a", "b", "c"]), "3 pendências");
});

test("razão social em formato de título só na exibição", () => {
  const salva = "MELLO SERVICOS ALIMENTICIOS LTDA";
  assert.equal(razaoSocialTitulo(salva), "Mello Servicos Alimenticios Ltda");
  assert.equal(salva, "MELLO SERVICOS ALIMENTICIOS LTDA");
  assert.equal(razaoSocialTitulo("PADARIA DO JOSE ME"), "Padaria do Jose ME");
  assert.equal(razaoSocialTitulo("Mello Serviços Alimentícios Ltda"), "Mello Serviços Alimentícios Ltda");
  assert.equal(razaoSocialTitulo(""), "");
  assert.ok(!ler("../components/pc/PcEmpresas.tsx").includes("razaoSocialDiferente("), "a lista de Empresas não mostra a razão social");
});

test("visitas: placeholder da busca cabe sem corte; Início: Hoje com 'Ver todos (N)' e lista que rola por dentro", () => {
  assert.ok(ler("../components/pc/PcVisitas.tsx").includes('placeholder="Buscar empresa ou responsável"'));
  assert.match(ler("../app/globals.css"), /\.vis-toolbar-fim \.pc-search\{width:300px/);
  const painel = ler("../components/PainelHoje.tsx");
  assert.ok(painel.includes("Ver todos (") && painel.includes("ITENS_INICIAIS"));
  assert.match(ler("../app/globals.css"), /\.hoje-lista\{max-height:min\(38vh,300px\)\}/);
});

test("nome da página no topo: mesma fonte do seletor Empresa ativa; título sem nome da empresa", () => {
  const css = ler("../app/globals.css");
  assert.ok(css.includes(".pc-crumb-current,.pc-crumb,.pc-crumb-link{font-family:var(--font-display),\"Outfit\",sans-serif;font-size:18px;font-weight:500") && css.includes(".pc-crumb-current,.pc-crumb,.pc-crumb-link,.pc-crumb-sep{font-size:22px}"), "nome da página em 22 px, seletor Empresa ativa segue em 18 px");
  assert.ok(css.includes(".emp-ativa-nome{min-width:0;flex:1;overflow:hidden;font-family:var(--font-display),\"Outfit\",sans-serif;font-size:18px;font-weight:500"));
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("ROTULO_DA_SUBABA[subabaDosDocumentos]") && !pagina.includes('<div className="ui-eyebrow">Documentos</div>'));
  assert.ok(!ler("../components/pc/PcVisitas.tsx").includes("Por empresa · ativa:"));
  assert.ok(!ler("../components/pc/PcRelatoriosEmitidos.tsx").includes("{empresa} · cada versão"));
});

test("busca na própria barra: Ctrl K só foca, Esc devolve o foco, clique fora fecha, sem fundo escurecido", () => {
  const busca = ler("../components/BuscaNaBarra.tsx");
  assert.ok(busca.includes('evento.key === "Escape"') && busca.includes("campoRef.current?.focus()") && busca.includes('addEventListener("mousedown"'));
  assert.ok(busca.includes("pc-busca-painel") && !busca.includes("pc-cmd-backdrop"));
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes('document.querySelector<HTMLElement>(".pc-busca")') && pagina.includes("setPedidoDeFocoNaBusca"));
  const css = ler("../app/globals.css");
  assert.ok(css.includes(".pc-busca-painel{position:absolute;top:100%;left:0;right:0"));
});

test("lista de Empresas: subtítulo sem zeros, com singular/plural, e sem a razão social", () => {
  assert.equal(subtituloDaEmpresa({ setores: 10, equipamentos: 1, programas: 0, pops: 2 }), "10 setores · 1 equipamento · 2 POPs");
  assert.equal(subtituloDaEmpresa({ setores: 1, equipamentos: 0, programas: 1, pops: 1 }), "1 setor · 1 programa · 1 POP");
  assert.equal(subtituloDaEmpresa({ setores: 0, equipamentos: 0, programas: 0, pops: 0 }), "sem equipamentos, programas e POPs");
});
