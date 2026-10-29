import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  AVISO_ANTES_DE_TRANSCREVER,
  TEXTO_CONSENTIMENTO_AUDIO,
  consentimentoDeAudio,
  consentirAudio,
  decidirTranscricaoDeAudio,
  liberarIa,
  retirarConsentimentoDeAudio,
  textoDeConsentimentoDeAudio,
  transcricaoDeAudioLiberada,
} from "../lib/privacidadeEmpresa.ts";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const quem = { id: "u1", nome: "Ana" };
const agora = "2026-10-29T12:00:00.000Z";

test("áudio: nasce desligado; precisa da IA liberada E do consentimento de áudio", () => {
  const semNada = { privacidade: undefined };
  assert.equal(consentimentoDeAudio(semNada), false);
  assert.equal(transcricaoDeAudioLiberada(semNada), false);

  const soConsentimento = { privacidade: consentirAudio(undefined, quem, agora) };
  assert.equal(consentimentoDeAudio(soConsentimento), true);
  assert.equal(transcricaoDeAudioLiberada(soConsentimento), false, "sem a IA liberada não transcreve");

  const soIa = { privacidade: liberarIa(undefined, quem, true, agora) };
  assert.equal(transcricaoDeAudioLiberada(soIa), false, "só a IA liberada não basta");

  const ambos = { privacidade: consentirAudio(liberarIa(undefined, quem, true, agora), quem, agora) };
  assert.equal(transcricaoDeAudioLiberada(ambos), true);
  assert.equal(textoDeConsentimentoDeAudio(ambos).startsWith("Consentido por Ana em "), true);
});

test("áudio: retirar o consentimento desliga e a IA das fotos continua como estava", () => {
  const privacidade = consentirAudio(liberarIa(undefined, quem, true, agora), quem, agora);
  const retirada = retirarConsentimentoDeAudio(privacidade);
  assert.equal(consentimentoDeAudio({ privacidade: retirada }), false);
  assert.equal(retirada.iaFotos.liberada, true);
  assert.equal(textoDeConsentimentoDeAudio({ privacidade: retirada }), "");
});

test("áudio: decisão do servidor nega sem empresa, sem IA e sem consentimento", () => {
  const dados = (privacidade) => ({ empresas: { e1: { privacidade } } });
  assert.equal(decidirTranscricaoDeAudio(dados(undefined), "").ok, false);
  assert.equal(decidirTranscricaoDeAudio(dados(undefined), "outra").ok, false);
  assert.equal(decidirTranscricaoDeAudio(null, "e1").ok, false);
  const semIa = decidirTranscricaoDeAudio(dados(consentirAudio(undefined, quem, agora)), "e1");
  assert.equal(semIa.ok, false);
  assert.equal(semIa.codigo, "ia-desligada-na-empresa");
  const semConsentimento = decidirTranscricaoDeAudio(dados(liberarIa(undefined, quem, true, agora)), "e1");
  assert.equal(semConsentimento.ok, false);
  assert.equal(semConsentimento.codigo, "audio-sem-consentimento");
  assert.equal(decidirTranscricaoDeAudio(dados(consentirAudio(liberarIa(undefined, quem, true, agora), quem, agora)), "e1").ok, true);
});

test("áudio: textos pedidos pelo dono", () => {
  assert.equal(TEXTO_CONSENTIMENTO_AUDIO, "Permito enviar o áudio das evidências para transcrição por serviço de IA no exterior (OpenAI)");
  assert.ok(AVISO_ANTES_DE_TRANSCREVER.includes("Evite enquadrar rostos, crachás e documentos pessoais"));
});

test("áudio: a rota confere IA e consentimento no servidor e quem não mexe na IA não altera o consentimento", () => {
  const rota = ler("../app/api/audio/transcrever/route.ts");
  assert.ok(rota.includes('form.get("contexto") === "evidencia"') && rota.includes("decidirTranscricaoDeAudio(acesso.data, empresaId)"));
  assert.ok(rota.includes("!acesso.data"), "sem o estado para conferir, nega");
  assert.ok(!rota.includes("blobPathname") && !rota.includes("put("), "a rota não guarda o áudio");
  const estado = ler("../lib/stateAccess.ts");
  assert.ok(estado.includes("audioIa: gravada?.privacidade?.audioIa"));
});

test("áudio: o botão Transcrever só age no toque (nunca automático) e escreve na Descrição", () => {
  const tela = ler("../components/pc/PcEvidencias.tsx");
  assert.equal((tela.match(/transcrever\(\)/g) || []).length, 2, "uma definição e uma chamada");
  assert.ok(tela.includes("onClick={() => void transcrever()}"));
  assert.ok(tela.includes("transcricao?.disponivel"));
  assert.ok(tela.includes("onDescricao(descricao.trim()"));
  assert.ok(!/useEffect\([^)]*transcrever/.test(tela));
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("transcricaoDeAudioLiberada(empresaVisita) && permitido(\"ia.analisar\", visitaAtual.empresaId)"));
});

test("áudio: Privacidade tem o consentimento e o histórico de auditoria", () => {
  const priv = ler("../components/pc/PcPrivacidadeEmpresa.tsx");
  assert.ok(priv.includes("{TEXTO_CONSENTIMENTO_AUDIO}") && priv.includes("Registrar o consentimento") && priv.includes("Retirar o consentimento"));
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("empresa.audio_ia_consentido") && pagina.includes("empresa.audio_ia_retirado"));
});
