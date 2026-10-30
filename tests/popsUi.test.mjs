import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

test("Norma aplicável: textos, avisos do RS e confirmação do RT", () => {
  const painel = ler("../components/pc/PcNormaAplicavel.tsx");
  assert.ok(painel.includes("Vigência da Portaria SES 799/2023: confirmar no diário oficial."));
  assert.ok(painel.includes("Exigência municipal: confirmar com a Vigilância Sanitária."));
  assert.ok(painel.includes("O RT confirmou estas normas"));
  assert.ok(!painel.includes("Conferir no texto oficial da ANVISA antes de usar com clientes."), "nota de desenvolvedor não vai para a tela");
  assert.ok(painel.includes("AVISO_SEM_NORMA_ESTADUAL"));
  // o responsável do estabelecimento tem fonte única, em Dados: a norma só mostra o nome e leva para lá
  assert.ok(painel.includes("Alterar em Dados") && !painel.includes("Pessoa em Acessos"));
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("salvarNormaDaEmpresa") && pagina.includes("<PcNormaAplicavel"));
  // o cadastro salvo não perde a norma; o responsável sai de Dados e só o Administrador escolhe o acesso vinculado
  assert.ok(pagina.includes("normasAplicadas: anterior.normasAplicadas") && pagina.includes("vinculoResponsavel"));
});

test("Conjunto da norma em POPs e documentos: criar do modelo em laranja e Outros POPs mantido", () => {
  const tela = ler("../components/pc/PcPopsLista.tsx");
  assert.ok(tela.includes("Conjunto da norma") && tela.includes("Criar do modelo") && tela.includes("Outros POPs e documentos da empresa"));
  assert.ok(tela.includes("vigentes") && tela.includes("falta criar") && tela.includes("aguardando aprovação") && tela.includes("com pendência"));
  assert.ok(tela.includes("pgl-adicionar-botao") && tela.includes("ui-btn ui-btn--secondary"));
  assert.ok(!tela.includes("Sugeridos pelo Manual de Boas Práticas"));
  assert.ok(!tela.includes('STATUS: StatusPOP[] = ["Rascunho", "Em revisão", "Aprovado"'));
  assert.ok(ler("../app/globals.css").includes(".ui-btn--criar{background:#264A80;color:#fff;font-weight:400}"));
});

test("POP em campos: documento e histórico, blocos extras, faixa do texto-base e rodapé com Salvar rascunho", () => {
  const editor = ler("../components/pc/PcPopEditor.tsx");
  for (const texto of ["Histórico do POP", "Documento do POP", "Motivo", "Salvar rascunho", "Enviar para aprovação", "Aprovar e assinar", "Editar (cria nova versão)", "Comparação de versões"]) {
    assert.ok(editor.includes(texto), texto);
  }
  for (const texto of ["Objetivo", "Campo de aplicação", "Responsável pela execução", "Ação corretiva", "Registro que prova a execução", "Exigido na SES 799/2023, Anexo II, 13.2.", "vem da norma", "Comprovante da empresa especializada", "Princípio ativo", "Tempo de contato", "Nunca o laudo"]) {
    assert.ok(editor.includes(texto), texto);
  }
  assert.ok(editor.includes("textoDaFaixaDoTextoBase(rascunho)"));
  assert.ok(editor.includes("FieldVoiceTools"));
  assert.ok(editor.includes("↑ Subir") && editor.includes("↓ Descer") && editor.includes("Remover o passo") && editor.includes("Reordenar o passo") && editor.includes("Mais ações do passo"));
  // exames: só apto e validade
  assert.ok(editor.includes("examesApto") && editor.includes("examesValidade"));
  assert.ok(!/laudo[A-Za-z]*:/i.test(editor.replace(/Nunca o laudo/g, "")));
});

test("Aprovação e LGPD: o servidor confere quem aprova e registra no histórico", () => {
  const rota = ler("../app/api/state/route.ts");
  assert.ok(rota.includes("validarAprovacoesDePop(") && rota.includes("aprovacoes.registros"));
  const acesso = ler("../lib/stateAccess.ts");
  assert.ok(acesso.includes("aplicarSomenteAprovacoes") && acesso.includes('perfil === "Fiscal"') && acesso.includes('"Executor de campo"'));
  assert.ok(ler("../components/FiscalInicio.tsx").includes("POPs aprovados"));
});

test("Aviso de norma alterada aparece no Início para quem edita", () => {
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("avisoDePopsComNormaAlterada(atual.pops || [])"));
  assert.ok(ler("../components/pc/PcInicio.tsx").includes("avisoPops") && ler("../components/campo/CampoTelas.tsx").includes("avisoPops"));
  assert.ok(ler("../lib/popsNorma.ts").includes("Norma citada neste POP foi alterada. Confira o texto e aprove de novo."));
});

test("Pacote 15: Ver POP no checklist, ação corretiva do POP na Correção, trocar vínculo e correções da empresa", async () => {
  const { readFileSync } = await import("node:fs");
  const ler = (caminho) => readFileSync(new URL(`../${caminho}`, import.meta.url), "utf8");
  const foco = ler("components/ChecklistFocoItem.tsx");
  assert.ok(foco.includes("Ver POP"));
  const page = ler("app/page.tsx");
  assert.ok(page.includes("verPop={verPopDoItem(foco)}"));
  assert.equal((page.match(/verPop=\{verPopDoItem\(foco\)\}/g) || []).length, 3);
  assert.ok(page.includes("abrirCorrecoesDaEmpresa"));
  // Campo: bloco "Ação corretiva do POP" com "Usar este texto"; PC: a ação do POP entra no "+N sugestões" (rótulo "Ação do POP COD")
  const campo = ler("components/campo/CampoTelas.tsx");
  assert.ok(campo.includes("Ação corretiva do POP") && campo.includes("Usar este texto"));
  const pcCorrecoes = ler("components/pc/PcCorrecoes.tsx");
  assert.ok(pcCorrecoes.includes("Ação do POP") && pcCorrecoes.includes("nc.acaoDoPop"));
  assert.ok(ler("components/pc/PcPopsVisita.tsx").includes("Trocar vínculo"));
  assert.ok(page.includes("Peça ao responsável para definir os ambientes."));
});
