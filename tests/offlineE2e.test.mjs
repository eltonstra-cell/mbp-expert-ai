// Trabalho sem sinal no app de verdade (navegador sem janela + servidor falso na página): ver scripts/verificar-offline.mjs.
// Só roda com Chrome/Edge e `npm run build` feitos; senão é pulado, com o motivo.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { prerequisitos } from "../scripts/verificar-capa-pdf.mjs";

const falta = prerequisitos();

test("offline: respostas guardadas, sincronização sem duplicar, conflito mostrado e sessão expirada sem perder nada", { skip: falta ? `pulado: ${falta}` : false, timeout: 600000 }, () => {
  const r = spawnSync(process.execPath, ["--experimental-strip-types", "scripts/verificar-offline.mjs"], { encoding: "utf8", timeout: 540000 });
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`.split("\n").filter((l) => /FALHOU|passaram/.test(l)).join("\n"));
});
