import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { chaveDoAvisoDeFoto, TEXTOS_DO_AVISO_DE_FOTO } from "../lib/avisoDeFoto.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

test("O aviso antes de fotografar tem os textos do desenho e vale por visita", () => {
  assert.deepEqual(TEXTOS_DO_AVISO_DE_FOTO, {
    titulo: "Antes de fotografar",
    sim: "Mostre o ambiente, o equipamento ou o produto.",
    nao: "Evite rostos, crachás e documentos pessoais.",
    naoMostrar: "Não mostrar de novo nesta visita",
    botao: "Entendi, abrir câmera",
  });
  assert.notEqual(chaveDoAvisoDeFoto("v1"), chaveDoAvisoDeFoto("v2"));
  const comp = ler("../components/AvisoAntesDeFotografar.tsx");
  for (const texto of Object.values(TEXTOS_DO_AVISO_DE_FOTO)) assert.ok(comp.includes(texto), texto);
  assert.ok(comp.includes("chaveDoAvisoDeFoto(visitaId)"));
});

test("Todos os pontos de foto passam pelo aviso antes de abrir a câmera", () => {
  assert.ok(ler("../components/ChecklistFocoItem.tsx").includes("pedirAvisoDeFoto(() => void camera.abrir())"));
  assert.ok(ler("../components/pc/PcEvidencias.tsx").includes("pedirAvisoDeFoto(() => void camera.abrir())"));
  assert.ok(ler("../components/pc/RegistrarAgoraModal.tsx").includes("pedirAvisoDeFoto(async () =>"));
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("pedirAvisoDeFotoRef.current(() => registrarInputRef.current?.click())"));
  assert.ok(pagina.includes("<AvisoFotoProvider visitaId="));
});
