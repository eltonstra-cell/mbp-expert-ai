import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { conflitoDoPreencher, fraseDoPreencher, preencherIdentificacao, registroDoRt } from "../lib/manualIdentificacao.ts";

const ler = (caminho) => readFileSync(new URL(`../${caminho}`, import.meta.url), "utf8");
const juntar = registroDoRt;
const rt = { nome: "Ana Souza", cargo: "Nutricionista RT", crn: "6599", telefone: "51999990000" };

test("B: nome salvo diferente do RT pergunta 'Substituir?' com os dois nomes", () => {
  const c = conflitoDoPreencher({ consultorNome: "Élton Teste Consultor", elaboradoPor: "Élton Teste Consultor" }, { rt, juntar });
  assert.equal(c.texto, "O Manual já tem Élton Teste Consultor. O RT da empresa é Ana Souza. Substituir?");
  assert.deepEqual(c.campos, ["consultorNome"]);
});

test("B: sem conflito quando é a mesma pessoa, quando o valor é do Preencher ou sem RT vinculado", () => {
  assert.equal(conflitoDoPreencher({ consultorNome: "ana souza" }, { rt, juntar }), null);
  assert.equal(conflitoDoPreencher({ consultorNome: "Marivane" }, { rt, juntar, daAutomacao: ["consultorNome"] }), null);
  assert.equal(conflitoDoPreencher({ consultorNome: "Marivane" }, { juntar }), null);
  assert.equal(conflitoDoPreencher({}, { rt, juntar }), null);
});

test("B: telefone ou registro salvos diferentes também perguntam, citando o campo", () => {
  const c = conflitoDoPreencher({ consultorNome: "Ana Souza", consultorTelefone: "(11) 3333-4444" }, { rt, juntar });
  assert.match(c.texto, /O Manual já tem \(11\) 3333-4444 em telefone\. O RT da empresa \(Ana Souza\) tem \(51\) 99999-0000\. Substituir\?/);
});

test("B: Substituir aplica o conjunto coerente da MESMA pessoa; sem 'forçar', o digitado é mantido", () => {
  const atuais = { consultorNome: "Marivane", consultorTelefone: "(51) 98888-0000", consultorRegistro: "Nutricionista · CRN 1", elaboradoPor: "Marivane", revisadoPor: "Marivane" };
  const mantido = preencherIdentificacao(atuais, { rt, juntar });
  assert.equal(mantido.valores.consultorNome, undefined);
  assert.equal(mantido.valores.consultorTelefone, undefined);
  const troca = preencherIdentificacao(atuais, { rt, juntar, forcarPessoa: true });
  assert.equal(troca.valores.consultorNome, "Ana Souza");
  assert.equal(troca.valores.consultorTelefone, "(51) 99999-0000");
  assert.equal(troca.valores.consultorRegistro, "Nutricionista RT · CRN 6599");
  assert.equal(troca.valores.elaboradoPor, "Ana Souza");
  assert.equal(troca.valores.revisadoPor, "Ana Souza");
  // O que o Preencher não pôs (CPF digitado e RT sem CPF) continua como está e não vira "automático".
  const comCpf = preencherIdentificacao({ ...atuais, consultorCpfCnpj: "123.456.789-09" }, { rt, juntar, forcarPessoa: true });
  assert.equal(comCpf.valores.consultorCpfCnpj, undefined);
  assert.equal(comCpf.doPerfil.includes("consultorCpfCnpj"), false);
});

test("B: a tela do Manual tem 'Substituir' e 'Manter'; 'Manter' não chama nada que altere o formulário", () => {
  const tela = ler("components/pc/PcManualDocumento.tsx");
  assert.ok(tela.includes("Substituir") && tela.includes("Manter") && tela.includes("conflito.substituir()"));
  const pagina = ler("app/page.tsx");
  assert.ok(pagina.includes("conflitoDoPreencher(atuaisDoForm, fontes)") && pagina.includes("forcarPessoa: true"));
});

test("C: 'Faltam N' é recalculado a cada alteração (some quando o Manual fica completo)", () => {
  const tela = ler("components/pc/PcManualDocumento.tsx");
  assert.ok(tela.includes("fraseDoPreencher(resultado.colocados, total - preenchidos)"));
  assert.equal(tela.includes("setResultado(feito.texto)"), false);
  assert.match(fraseDoPreencher(0, 1), /Faltam 1/);
  assert.equal(/Faltam/.test(fraseDoPreencher(0, 0)), false);
  assert.equal(/Faltam/.test(fraseDoPreencher(2, 0)), false);
});

test("D: Acessos — a nota do CRN não estica Telefone e Cargo (align-items:start na grade)", () => {
  const css = ler("app/globals.css");
  assert.ok(css.includes("html:root:root body .acc-grade{align-items:start}"));
});

test("A: Nova empresa — um cartão, busca aplica direto, sem passos extras, Responsável em um campo", () => {
  const pagina = ler("app/page.tsx");
  const i = pagina.indexOf("function telaNovaEmpresa()");
  const tela = pagina.slice(i, pagina.indexOf("// Um campo do cadastro da empresa", i));
  assert.ok(i > 0);
  assert.equal(/Usar estes dados|Confirmei tudo|Confirmar tipo/.test(tela), false);
  assert.ok(tela.includes("Digite o CNPJ e toque em Buscar") && tela.includes("Abrir a existente") && tela.includes("Preencher à mão") && tela.includes("Corrigir dados"));
  assert.ok(tela.includes("Responsável pelo estabelecimento (opcional)") && !/Cargo/.test(tela));
  assert.equal((tela.match(/className="nova-receita"/g) || []).length, 1);
  assert.ok(tela.includes("Mais opções") && tela.includes("Ambientes e equipamentos") || ler("components/PacoteDoTipo.tsx").includes("Ambientes e equipamentos"));
  assert.ok(pagina.includes("usarPropostaDoCnpj(proposta)"), "a busca aplica os dados direto na Nova empresa");
  assert.ok(pagina.includes('situacaoDoCnpj(db.empresas, form.cnpj).tipo === "ativa"'), "empresa ativa bloqueia a busca");
});

test("A9: Pacote — ✕, links 'Desmarcar todos' e '+ Adicionar outro ambiente (ex.: …)', rodapé 'Vai entrar:' com o número em negrito", () => {
  const pacote = ler("components/PacoteDoTipo.tsx");
  assert.ok(pacote.includes('aria-label="Fechar"') && pacote.includes("(ex.: Salão, Câmara fria)"));
  assert.ok(pacote.includes("Vai entrar: ") && pacote.includes("Entram: ") && pacote.includes("<strong>{contar(marcadosAmbientes"));
  assert.ok(pacote.includes('className="man-link pacote-marcar-todos"'));
});
