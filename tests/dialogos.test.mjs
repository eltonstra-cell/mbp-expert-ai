import test from "node:test";
import assert from "node:assert/strict";
import { avisar, confirmar, perguntar, dialogoAtual, encerrarDialogoAtual, limparDialogos, assinarDialogos } from "../lib/dialogos.ts";

test("confirmar: resolve com true ou false e mostra uma janela por vez, na ordem", async () => {
  limparDialogos();
  const a = confirmar("Remover?", { titulo: "Remover", confirmarRotulo: "Remover", perigoso: true });
  const b = confirmar("Outra?");
  const primeira = dialogoAtual();
  assert.equal(primeira.tipo, "confirmacao");
  assert.equal(primeira.perigoso, true);
  assert.equal(primeira.confirmarRotulo, "Remover");
  primeira.resolver(true);
  encerrarDialogoAtual();
  assert.equal(await a, true);
  const segunda = dialogoAtual();
  assert.equal(segunda.mensagem, "Outra?");
  assert.equal(segunda.cancelarRotulo, "Cancelar");
  assert.equal(segunda.perigoso, false);
  segunda.resolver(false);
  encerrarDialogoAtual();
  assert.equal(await b, false);
  assert.equal(dialogoAtual(), null);
});

test("avisar e perguntar: aviso resolve ao fechar; pergunta devolve o texto ou null", async () => {
  limparDialogos();
  const aviso = avisar("Sem internet.");
  assert.equal(dialogoAtual().titulo, "Aviso");
  dialogoAtual().resolver();
  encerrarDialogoAtual();
  await aviso;
  const resposta = perguntar("Digite EXCLUIR", { perigoso: true });
  assert.equal(dialogoAtual().tipo, "pergunta");
  dialogoAtual().resolver("EXCLUIR");
  encerrarDialogoAtual();
  assert.equal(await resposta, "EXCLUIR");
  const cancelada = perguntar("Digite");
  dialogoAtual().resolver(null);
  encerrarDialogoAtual();
  assert.equal(await cancelada, null);
});

test("assinarDialogos avisa quando a fila muda e para depois de cancelar a assinatura", () => {
  limparDialogos();
  let chamadas = 0;
  const cancelar = assinarDialogos(() => { chamadas += 1; });
  void avisar("a");
  assert.equal(chamadas, 1);
  cancelar();
  void avisar("b");
  assert.equal(chamadas, 1);
  limparDialogos();
});
