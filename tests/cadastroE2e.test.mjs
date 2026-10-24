// Cadastro de empresa no app de verdade (navegador sem janela, consulta de CNPJ simulada na página): scripts/verificar-cadastro.mjs.
// Só roda com Chrome/Edge e `npm run build` feitos; senão é pulado, com o motivo.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { prerequisitos } from "../scripts/verificar-capa-pdf.mjs";

const falta = prerequisitos();

test("cadastro: CNPJ vira proposta (inclusive MEI sem nome de pessoa), sem sinal o manual segue, pacote por tipo, setor oficial sugerido e equipamentos em chips com cópia e desfazer", { skip: falta ? `pulado: ${falta}` : false, timeout: 600000 }, () => {
  const r = spawnSync(process.execPath, ["--experimental-strip-types", "scripts/verificar-cadastro.mjs"], { encoding: "utf8", timeout: 540000 });
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`.split("\n").filter((l) => /FALHOU|passaram|erro na/.test(l)).join("\n"));
});
