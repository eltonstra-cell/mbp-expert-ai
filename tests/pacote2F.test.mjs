import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ETIQUETA_SUBSTITUIDA, ETIQUETA_VIGENTE, agruparEmitidosPorVisita, emissaoLiberada } from "../lib/relatorioEmitido.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");
const rel = (id, visitaId, versao, emitidoEm) => ({ id, visitaId, versao, emitidoEm, numero: `PC-2026-000${visitaId.length}`, empresaId: "e1" });

test("relatórios emitidos: uma linha por visita, versão mais alta vigente e as outras substituídas, sem alterar nada", () => {
  const entrada = [rel("a1", "v1", 1, "2026-10-01T10:00:00Z"), rel("a2", "v1", 2, "2026-10-05T10:00:00Z"), rel("b1", "v2", 1, "2026-10-10T10:00:00Z"), rel("a3", "v1", 3, "2026-10-06T10:00:00Z")];
  const copia = JSON.stringify(entrada);
  const grupos = agruparEmitidosPorVisita(entrada);
  assert.equal(grupos.length, 2);
  assert.equal(grupos[0].visitaId, "v2", "visita com emissão mais recente primeiro");
  const v1 = grupos.find((grupo) => grupo.visitaId === "v1");
  assert.equal(v1.atual.id, "a3");
  assert.deepEqual(v1.anteriores.map((item) => item.id), ["a2", "a1"]);
  assert.equal(ETIQUETA_VIGENTE, "Vigente");
  assert.equal(ETIQUETA_SUBSTITUIDA, "Substituída");
  assert.equal(JSON.stringify(entrada), copia, "relatório emitido segue imutável");
  assert.deepEqual(agruparEmitidosPorVisita([]), []);
});

test("emitir sem CRN: só com a confirmação explícita; com CRN segue direto", () => {
  assert.equal(emissaoLiberada("", false), false);
  assert.equal(emissaoLiberada("   ", false), false);
  assert.equal(emissaoLiberada(undefined, false), false);
  assert.equal(emissaoLiberada("", true), true);
  assert.equal(emissaoLiberada("CRN-2 12345", false), true);
  const modal = ler("../components/pc/PcEmitirRelatorio.tsx");
  assert.ok(modal.includes("Preencher agora") && modal.includes("ROTULO_EMITIR_SEM_CRN") && modal.includes("!emissaoLiberada(crn, semCrn)"));
  const lista = ler("../components/pc/PcRelatoriosEmitidos.tsx");
  assert.ok(lista.includes("<h1 className=\"sr-only\">Emitidos</h1>") && !lista.includes("← Voltar\n        </button>\n      </div>\n      {ordenados.length === 0"));
  assert.ok(lista.includes("versões anteriores") && lista.includes("ETIQUETA_VIGENTE"));
});
