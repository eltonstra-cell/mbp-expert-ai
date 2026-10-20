import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

test("G: notas sobre o áudio no Registrar agora e na revisão do Falar", () => {
  assert.ok(ler("../components/pc/RegistrarAgoraModal.tsx").includes("O áudio fica guardado na visita."));
  assert.ok(ler("../components/RevisaoTranscricao.tsx").includes("Só o texto é usado. O áudio não é guardado."));
});

test("G: Ajuda responde sobre trabalhar sem internet com o que o app faz de fato", () => {
  const ajuda = ler("../components/pc/PcAjuda.tsx");
  assert.ok(ajuda.includes("Posso trabalhar sem internet?"));
  const resposta = ajuda.slice(ajuda.indexOf("Posso trabalhar sem internet?"), ajuda.indexOf("Posso emitir o relatório"));
  assert.ok(resposta.includes("Precisam de internet") && resposta.includes("Fila de envio") && resposta.includes("Aguardando envio") && resposta.includes("IA"));
  assert.ok(!/funciona (totalmente|100%) offline|sem limites/i.test(resposta));
  // o comportamento descrito existe: com sinal, a evidência só é registrada depois do envio; sem sinal, o arquivo vai para a fila do aparelho
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.indexOf("await enviarArquivoParaBlob(") < pagina.indexOf("evidencias: [ev, ...(o.evidencias || [])]"));
});
