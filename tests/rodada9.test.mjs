import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { empilhar, desempilhar, noTopo, temJanelaPorCima, limparPilha, tamanhoDaPilha } from "../lib/pilhaDeJanelas.ts";
import { preencherIdentificacao, registroDoRt, rtVinculadoDaEmpresa, dadosParaOCadastroDoRt } from "../lib/manualIdentificacao.ts";
import { avisoDoCrn } from "../lib/userManagement.ts";
import { mascararTelefone } from "../lib/documentosCentral.ts";
import { relatoriosSemTelefoneDoRt } from "../lib/dadosPorPerfil.ts";
import { filtrarEstadoPorUsuario } from "../lib/stateAccess.ts";
import { separarItensInvalidos } from "../lib/limitesDoServidor.ts";
import { situacaoDoCnpj, enderecoEmUmaLinha, erroDoEmail } from "../lib/novaEmpresa.ts";
import { ESTADO_INICIAL_DO_PACOTE, alternarItem, estaMarcado, quantosMarcados, marcarTodosOsItens } from "../lib/escolhaDoPacote.ts";

const ler = (caminho) => readFileSync(new URL(`../${caminho}`, import.meta.url), "utf8");
const juntar = registroDoRt;

test("A: pilha única — só a janela do topo é topo; fechar a de cima devolve o topo à de baixo", () => {
  limparPilha();
  empilhar("manual");
  assert.equal(noTopo("manual"), true);
  empilhar("trocar");
  empilhar("pergunta");
  assert.equal(noTopo("pergunta"), true);
  assert.equal(noTopo("trocar"), false);
  assert.equal(temJanelaPorCima("manual"), true);
  desempilhar("pergunta");
  assert.equal(noTopo("trocar"), true, "Cancelar remove a de cima na hora");
  desempilhar("trocar");
  assert.equal(noTopo("manual"), true);
  assert.equal(temJanelaPorCima("manual"), false);
  desempilhar("manual");
  assert.equal(tamanhoDaPilha(), 0);
});

test("A: Esc só age na janela do topo (diálogos, Trocar empresa, escolhas e Manual consultam a pilha) e o Manual fica abaixo dos diálogos", () => {
  for (const arquivo of ["components/DialogHost.tsx", "components/campo/TrocarEmpresaPainel.tsx", "components/EscolhaEmJanela.tsx", "components/PacoteDoTipo.tsx", "components/pc/PcManualDocumento.tsx"]) {
    const fonte = ler(arquivo);
    assert.ok(fonte.includes("usePilhaDeJanelas") && fonte.includes("ehTopo()"), arquivo);
  }
  const css = ler("app/globals.css");
  const manual = Number(/body \.man-jan\{z-index:(\d+)\}/.exec(css.split("RODADA 9 · A")[1])?.[1]);
  const folha = Number(/body \.man-folha-camada\{z-index:(\d+)\}/.exec(css.split("RODADA 9 · A")[1])?.[1]);
  const dialogo = Number(/\.voz-revisao-camada\{position:fixed;inset:0;z-index:(\d+)/.exec(css)?.[1]);
  const trocar = Number(/\.campo-sheet-layer\{position:fixed;inset:0;z-index:(\d+)/.exec(css)?.[1]);
  assert.ok(manual < trocar && folha < trocar && folha < dialogo, `manual ${manual} folha ${folha} trocar ${trocar} dialogo ${dialogo}`);
});

test("A: trocar de empresa com alteração pendente é bloqueado (pergunta na frente), a edição fecha ao trocar e o Descartar restaura o salvo", () => {
  const pagina = ler("app/page.tsx");
  const funcao = pagina.slice(pagina.indexOf("async function liberarEdicaoParaTrocarEmpresa"), pagina.indexOf("async function confirmarSaidaDaEdicao"));
  assert.ok(funcao.includes("empresaTemAlteracoes") && funcao.includes("Continuar editando") && funcao.includes("setShowEmpresaForm(false)") && funcao.includes("setEditingEmpresaId(null)"));
  assert.equal((pagina.match(/await liberarEdicaoParaTrocarEmpresa\(\)/g) || []).length, 2, "Trocar empresa e a busca");
  assert.ok(pagina.includes("onDescartar={() =>") && pagina.includes("editarEmpresa(salva)"));
});

test("A: o Salvar do Manual grava SEMPRE na empresa aberta (id capturado), nunca na ativa", () => {
  const manual = ler("components/pc/PcManualDocumento.tsx");
  assert.ok(manual.includes("empresaAoAbrir") && manual.includes("onSalvar(empresaAoAbrir.current)"));
  const pagina = ler("app/page.tsx");
  assert.ok(pagina.includes("function salvarEmpresa(empresaEsperada?: string)"));
  assert.ok(pagina.includes("empresaEsperada !== editingEmpresaIdRef.current"));
  assert.ok(pagina.includes("salvarEmpresa(empresaDoManual)"));
  // O id gravado é o da empresa em edição (nunca db.empresaAtualId).
  const corpo = pagina.slice(pagina.indexOf("function salvarEmpresa("), pagina.indexOf("async function renomearAmbienteDaEmpresa"));
  assert.ok(corpo.includes("editingEmpresaId ||") && !/const id = [^\n]*empresaAtualId/.test(corpo));
});

test("B: o RT vinculado vale mais que o Administrador logado; o RT logado só entra se não houver vinculado", () => {
  const admin = { id: "a", perfil: "Administrador", status: "Ativo", empresaIds: [], nome: "Admin" };
  const vinculado = { id: "r1", perfil: "Consultor/RT", status: "Convidado", empresaIds: ["e1"], nome: "Rita" };
  const outroRt = { id: "r2", perfil: "Consultor/RT", status: "Ativo", empresaIds: ["e9"], nome: "Outro" };
  assert.equal(rtVinculadoDaEmpresa([admin, outroRt, vinculado], "e1", admin).id, "r1");
  assert.equal(rtVinculadoDaEmpresa([outroRt, vinculado], "e1", outroRt).id, "r1", "o vinculado passa na frente do RT logado");
  assert.equal(rtVinculadoDaEmpresa([outroRt], "e1", outroRt).id, "r2", "sem vinculado, o RT logado");
  assert.equal(rtVinculadoDaEmpresa([admin], "e1", admin), undefined);
});

test("B: campo digitado nunca é sobrescrito; campo que o Preencher colocou e não foi editado é atualizado num novo clique", () => {
  const rt = { nome: "Rita Nova", cargo: "Nutricionista RT", crn: "6599", telefone: "51999990000" };
  const primeira = preencherIdentificacao({}, { rt: { ...rt, nome: "Rita Antiga" }, juntar, hoje: "2026-10-31" });
  assert.equal(primeira.valores.consultorNome, "Rita Antiga");
  const preso = { ...primeira.valores };
  // Sem rastreio de origem, o nome antigo é tratado como digitado e fica.
  assert.equal(preencherIdentificacao(preso, { rt, juntar }).valores.consultorNome, undefined);
  // Com o rastreio (o usuário não editou), o nome é atualizado e elaborado/revisado acompanham.
  const nova = preencherIdentificacao(preso, { rt, juntar, daAutomacao: primeira.doPerfil });
  assert.equal(nova.valores.consultorNome, "Rita Nova");
  assert.equal(nova.valores.elaboradoPor, "Rita Nova");
  assert.equal(nova.valores.revisadoPor, "Rita Nova");
  // O usuário editou o nome: sai da lista de automáticos e nunca mais muda.
  const semNome = primeira.doPerfil.filter((campo) => campo !== "consultorNome");
  assert.equal(preencherIdentificacao({ ...preso, consultorNome: "Digitado" }, { rt, juntar, daAutomacao: semNome }).valores.consultorNome, undefined);
});

test("B: telefone com máscara e 'Profissão e registro' como '<cargo> · CRN <número>'", () => {
  assert.equal(registroDoRt("Nutricionista RT", "6599"), "Nutricionista RT · CRN 6599");
  assert.equal(registroDoRt("Nutricionista RT", "CRN-2 12345"), "Nutricionista RT · CRN-2 12345");
  assert.equal(registroDoRt("", "6599"), "CRN 6599");
  assert.equal(registroDoRt("Nutricionista", ""), "Nutricionista");
  const r = preencherIdentificacao({}, { rt: { nome: "Rita", cargo: "Nutricionista RT", crn: "6599", telefone: "51999990000" }, juntar });
  assert.equal(r.valores.consultorTelefone, "(51) 99999-0000");
  assert.equal(r.valores.consultorRegistro, "Nutricionista RT · CRN 6599");
  assert.equal(mascararTelefone("5133334444"), "(51) 3333-4444");
});

test("C: cargo e CRN do usuário são a fonte; registroProfissional só vale (e só é gravado) quando os dois estão vazios", () => {
  const comCargo = preencherIdentificacao({}, { rt: { nome: "Rita", cargo: "Nutricionista RT", crn: "6599", registroProfissional: "Texto antigo" }, juntar });
  assert.equal(comCargo.valores.consultorRegistro, "Nutricionista RT · CRN 6599");
  const semNada = preencherIdentificacao({}, { rt: { nome: "Rita", registroProfissional: "Texto antigo" }, juntar });
  assert.equal(semNada.valores.consultorRegistro, "Texto antigo");
  assert.equal(dadosParaOCadastroDoRt({ consultorRegistro: "X" }, { cargo: "Nutricionista" }), null);
  assert.deepEqual(dadosParaOCadastroDoRt({ consultorRegistro: "X" }, {}), { registroProfissional: "X" });
});

test("C: CRN aceita 'CRN-2 12345' e número legado; o resto só ganha dica (não bloqueia)", () => {
  for (const ok of ["", "CRN-2 12345", "crn2 12345", "6599", "CRN-6 1234"]) assert.equal(avisoDoCrn(ok), "", ok);
  assert.match(avisoDoCrn("abc"), /Formato esperado/);
});

test("C: Acessos — telefone com máscara na hora e mensagem 'Marque ao menos uma empresa' ao lado da lista", () => {
  const tela = ler("components/pc/PcAcessos.tsx");
  assert.ok(tela.includes("mascararTelefone(evento.target.value)"));
  assert.ok(tela.includes("Marque ao menos uma empresa") && tela.includes("pc-empresas-cab"));
  assert.ok(tela.includes("avisoDoCrn(formulario.crn)"));
});

test("D: o Fiscal recebe o relatório emitido sem o telefone do RT; CPF/CNPJ e endereço nunca entram no instantâneo", () => {
  const relatorio = { id: "r1", empresaId: "e1", assinatura: { nome: "Rita", crn: "6599", telefone: "(51) 99999-0000" }, instantaneo: { empresa: { nome: "Beyond Nutri" }, evidencias: [] } };
  assert.equal(relatoriosSemTelefoneDoRt([relatorio])[0].assinatura.telefone, undefined);
  assert.equal(relatoriosSemTelefoneDoRt([relatorio])[0].assinatura.nome, "Rita");
  const estado = { empresas: { e1: { id: "e1", nome: "Beyond Nutri", pops: [] } }, empresaAtualId: "e1", visitas: [], ncs: [], evidencias: [], usuarios: [], registrosAuditoria: [], colaboradores: [], capacitacoes: [], leiturasPop: [], registrosPop: [], comprovantes: [], relatoriosEmitidos: [relatorio] };
  const fiscal = { id: "f", nome: "F", email: "f@x.com", perfil: "Fiscal", status: "Ativo", empresaIds: ["e1"], criadoEm: "2026-01-01", atualizadoEm: "2026-01-01" };
  assert.equal(JSON.stringify(filtrarEstadoPorUsuario(estado, fiscal)).includes("99999-0000"), false);
  const executor = { ...fiscal, id: "x", perfil: "Executor de campo" };
  assert.deepEqual(filtrarEstadoPorUsuario(estado, executor).relatoriosEmitidos, []);
  const emissao = ler("lib/relatorioEmitido.ts");
  const instantaneo = emissao.slice(emissao.indexOf("export function montarInstantaneo"), emissao.indexOf("export type PedidoDeEmissao"));
  assert.equal(/consultor(Cpf|Endereco|Telefone)/.test(instantaneo), false);
});

test("E: CNPJ já cadastrado — ativa bloqueia, arquivada libera; endereço em uma linha; e-mail validado", () => {
  const empresas = { a: { id: "a", cnpj: "12.345.678/0001-95", nomeFantasia: "Ativa" }, b: { id: "b", cnpj: "11.222.333/0001-81", nomeFantasia: "Velha", arquivada: true } };
  assert.equal(situacaoDoCnpj(empresas, "12345678000195").tipo, "ativa");
  assert.equal(situacaoDoCnpj(empresas, "11.222.333/0001-81").tipo, "arquivada");
  assert.equal(situacaoDoCnpj(empresas, "00.000.000/0001-91").tipo, "livre");
  const duas = { ...empresas, c: { id: "c", cnpj: "11.222.333/0001-81", nomeFantasia: "Nova ativa" } };
  assert.equal(situacaoDoCnpj(duas, "11222333000181").tipo, "ativa", "arquivada + ativa com o mesmo CNPJ continua bloqueando");
  assert.equal(situacaoDoCnpj(empresas, "123").tipo, "livre");
  assert.equal(enderecoEmUmaLinha({ logradouro: "Rua A", numero: "10", bairro: "Centro", cep: "90000-000", municipio: "Porto Alegre", uf: "RS" }), "Rua A, 10 · Centro · CEP 90000-000 · Porto Alegre/RS");
  assert.equal(erroDoEmail(""), "");
  assert.equal(erroDoEmail("a@b.com"), "");
  assert.match(erroDoEmail("a@b"), /incompleto/);
  const pagina = ler("app/page.tsx");
  assert.equal(pagina.includes("Confirmei tudo") || pagina.includes("Confirmar tipo"), false);
  assert.ok(pagina.includes("Escolher ambientes") || ler("components/PacoteDoTipo.tsx").includes("Escolher ambientes"));
  assert.ok(pagina.includes("Salvar e abrir a Central") && pagina.includes("nova-cancelar"));
});

test("E: o servidor recusa horário, e-mail e responsável acima do limite, sem truncar", () => {
  const atual = { empresas: { e1: { id: "e1", nome: "X", pops: [], horarioFuncionamento: "Seg a sex" } } };
  const recebido = { empresas: { e1: { id: "e1", nome: "X", pops: [], horarioFuncionamento: "h".repeat(121), email: "e".repeat(121), responsavelEstabelecimento: { nome: "n".repeat(81), cargo: "" } } } };
  const { estado, rejeitados } = separarItensInvalidos(atual, recebido);
  assert.deepEqual(rejeitados.map((r) => r.campo).sort(), ["email", "horarioFuncionamento", "responsavel"]);
  assert.equal(estado.empresas.e1.horarioFuncionamento, "Seg a sex");
  const dentro = separarItensInvalidos(atual, { empresas: { e1: { id: "e1", nome: "X", pops: [], horarioFuncionamento: "h".repeat(120), email: "e".repeat(120), responsavelEstabelecimento: { nome: "n".repeat(80), cargo: "" } } } });
  assert.equal(dentro.rejeitados.length, 0);
});

test("F: Pacote — tudo vem marcado, o contador acompanha e 'Marcar todos' alterna; a caixa marcada tem ✓ branco em turquesa", () => {
  const chaves = ["a:1", "a:2", "a:3"];
  assert.equal(quantosMarcados(ESTADO_INICIAL_DO_PACOTE, chaves), 3);
  assert.equal(estaMarcado(ESTADO_INICIAL_DO_PACOTE, "a:1"), true);
  const sem1 = alternarItem(ESTADO_INICIAL_DO_PACOTE, "a:1");
  assert.equal(quantosMarcados(sem1, chaves), 2);
  assert.equal(quantosMarcados(marcarTodosOsItens(sem1, chaves, false), chaves), 0);
  assert.equal(quantosMarcados(marcarTodosOsItens(sem1, chaves, true), chaves), 3);
  const css = ler("app/globals.css");
  const bloco = css.split("RODADA 9 · F")[1];
  assert.match(bloco, /\.esc-janela \.esc-caixa:checked\{[^}]*background:#21A3A3/);
  assert.match(bloco, /\.esc-janela \.esc-caixa:checked::after\{content:"✓"[^}]*color:#fff/);
  assert.match(bloco, /\.pacote-janela \.esc-opcao\{background:#fff/);
  const pacote = ler("components/PacoteDoTipo.tsx");
  assert.ok(pacote.includes("ui-btn--save pacote-aplicar") && pacote.includes("+ Adicionar outro ambiente"));
});

test("G: o balão de pendências abre com detecção de colisão e fecha com Esc e clique fora", () => {
  const fonte = ler("components/pc/PendenciasChip.tsx");
  assert.ok(fonte.includes("Escape") && fonte.includes("pointerdown"));
  assert.ok(fonte.includes("window.innerWidth") && fonte.includes("window.innerHeight") && fonte.includes("caixa.right + 8"), "detecção de colisão e abertura ao lado");
  assert.equal(fonte.includes("top: caixa.bottom + 6, left: Math.max(8, Math.min(caixa.left, window.innerWidth - 300))"), false);
});
