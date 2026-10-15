import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_EVIDENCE_BYTES,
  detectarTipoPorAssinatura,
  sanitizarVisitaId,
  validarArquivoEvidencia,
} from "../lib/evidenceUpload.ts";
import { corpoExcedeLimite } from "../lib/requestLimits.ts";
import { PERMISSIONS_BY_PROFILE, podeExecutar } from "../lib/permissions.ts";

const bytes = (...valores) => new Uint8Array(valores);
const texto = (s) => [...s].map((c) => c.charCodeAt(0));
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10);
const MP4 = bytes(0, 0, 0, 0x20, ...texto("ftypM4A "));
const WEBM = bytes(0x1a, 0x45, 0xdf, 0xa3, 0, 0);
const OGG = bytes(...texto("OggS"), 0, 2);
const WAV = bytes(...texto("RIFF"), 1, 2, 3, 4, ...texto("WAVE"));
const MP3_ID3 = bytes(...texto("ID3"), 4, 0);
const MP3_FRAME = bytes(0xff, 0xfb, 0x90, 0x00);
const AAC = bytes(0xff, 0xf1, 0x50, 0x80);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a);
const EXE = bytes(0x4d, 0x5a, 0x90, 0x00);

test("visitaId aceita UUID e rejeita caracteres de caminho", () => {
  const uuid = "3f2b8c1e-9d4a-4c7e-8a55-1b2c3d4e5f60";
  assert.equal(sanitizarVisitaId(uuid), uuid);
  assert.equal(sanitizarVisitaId("sem-visita"), "sem-visita");
  assert.equal(sanitizarVisitaId("visita_1"), "visita_1");
  for (const ruim of ["../x", "a/b", "a b", "a.b", "", "  ", "a\\b", "á", "x%2f", null, 12, undefined]) {
    assert.equal(sanitizarVisitaId(ruim), null, String(ruim));
  }
  assert.equal(sanitizarVisitaId("a".repeat(65)), null);
  assert.equal(sanitizarVisitaId("a".repeat(64)), "a".repeat(64));
});

test("detecta assinaturas dos formatos permitidos", () => {
  assert.equal(detectarTipoPorAssinatura(JPEG), "jpeg");
  assert.equal(detectarTipoPorAssinatura(MP4), "mp4");
  assert.equal(detectarTipoPorAssinatura(WEBM), "webm");
  assert.equal(detectarTipoPorAssinatura(OGG), "ogg");
  assert.equal(detectarTipoPorAssinatura(WAV), "wav");
  assert.equal(detectarTipoPorAssinatura(MP3_ID3), "mp3");
  assert.equal(detectarTipoPorAssinatura(MP3_FRAME), "mp3");
  assert.equal(detectarTipoPorAssinatura(AAC), "aac");
  assert.equal(detectarTipoPorAssinatura(PNG), null);
  assert.equal(detectarTipoPorAssinatura(EXE), null);
  assert.equal(detectarTipoPorAssinatura(bytes()), null);
});

test("aceita foto JPEG e áudios com MIME coerente", () => {
  assert.deepEqual(validarArquivoEvidencia("image/jpeg", JPEG, 1000), { ok: true, contentType: "image/jpeg" });
  assert.deepEqual(validarArquivoEvidencia("audio/webm;codecs=opus", WEBM, 1000), { ok: true, contentType: "audio/webm" });
  assert.deepEqual(validarArquivoEvidencia("audio/mp4", MP4, 1000), { ok: true, contentType: "audio/mp4" });
  assert.deepEqual(validarArquivoEvidencia("AUDIO/X-WAV", WAV, 1000), { ok: true, contentType: "audio/x-wav" });
  assert.deepEqual(validarArquivoEvidencia("audio/mpeg", MP3_FRAME, 1000), { ok: true, contentType: "audio/mpeg" });
});

test("MIME vazio é aceito e substituído pelo tipo detectado", () => {
  assert.deepEqual(validarArquivoEvidencia("", MP4, 1000), { ok: true, contentType: "audio/mp4" });
  assert.deepEqual(validarArquivoEvidencia(undefined, JPEG, 1000), { ok: true, contentType: "image/jpeg" });
});

test("rejeita MIME que não bate com a assinatura", () => {
  assert.deepEqual(validarArquivoEvidencia("image/jpeg", MP4, 1000), { ok: false, motivo: "MIME" });
  assert.deepEqual(validarArquivoEvidencia("audio/mp4", JPEG, 1000), { ok: false, motivo: "MIME" });
  assert.deepEqual(validarArquivoEvidencia("text/html", JPEG, 1000), { ok: false, motivo: "MIME" });
});

test("rejeita tipos fora da lista mesmo com MIME permitido", () => {
  assert.deepEqual(validarArquivoEvidencia("image/jpeg", EXE, 1000), { ok: false, motivo: "ASSINATURA" });
  assert.deepEqual(validarArquivoEvidencia("image/png", PNG, 1000), { ok: false, motivo: "ASSINATURA" });
  assert.deepEqual(validarArquivoEvidencia("image/jpeg", bytes(...texto("<html>")), 1000), { ok: false, motivo: "ASSINATURA" });
});

test("aplica o limite de 8 MB e rejeita arquivo vazio", () => {
  assert.equal(MAX_EVIDENCE_BYTES, 8 * 1024 * 1024);
  assert.equal(validarArquivoEvidencia("image/jpeg", JPEG, MAX_EVIDENCE_BYTES).ok, true);
  assert.deepEqual(validarArquivoEvidencia("image/jpeg", JPEG, MAX_EVIDENCE_BYTES + 1), { ok: false, motivo: "GRANDE" });
  assert.deepEqual(validarArquivoEvidencia("image/jpeg", JPEG, 0), { ok: false, motivo: "VAZIO" });
});

test("limite de corpo pelo Content-Length", () => {
  assert.equal(corpoExcedeLimite("100", 1000), false);
  assert.equal(corpoExcedeLimite("1000", 1000), false);
  assert.equal(corpoExcedeLimite("1001", 1000), true);
  assert.equal(corpoExcedeLimite(null, 1000), false);
  assert.equal(corpoExcedeLimite("abc", 1000), false);
});

test("ia.analisar: só Administrador e Consultor/RT ativos", () => {
  const usuario = (perfil, status = "Ativo") => ({ perfil, status, empresaIds: ["e1"] });
  assert.equal(podeExecutar(usuario("Administrador"), "ia.analisar"), true);
  assert.equal(podeExecutar(usuario("Consultor/RT"), "ia.analisar"), true);
  assert.equal(podeExecutar(usuario("Cliente Gestor"), "ia.analisar"), false);
  assert.equal(podeExecutar(usuario("Consultor/RT", "Suspenso"), "ia.analisar"), false);
  assert.equal(podeExecutar(usuario("Consultor/RT"), "ia.analisar", "e2"), false);
  assert.equal(podeExecutar(null, "ia.analisar"), false);
  assert.ok(!PERMISSIONS_BY_PROFILE["Cliente Gestor"].includes("ia.analisar"));
});
