import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const fonte = fs.readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
const padrao = fonte.match(/matcher:\s*\["([^"]+)"\]/)?.[1];
const protegida = (caminho) => new RegExp(`^${padrao}$`).test(caminho);

test("proxy: a otimização de imagem do Next não fica mais fora do login", () => {
  assert.ok(padrao, "matcher não encontrado em proxy.ts");
  assert.equal(protegida("/_next/image"), true);
});

test("proxy: rotas públicas continuam abertas e o resto exige login", () => {
  for (const aberta of ["/auth/sign-in", "/api/auth/get-session", "/api/access/readiness", "/_next/static/chunks/a.js", "/favicon.ico", "/sw.js", "/manifest.webmanifest", "/icon.svg", "/icons/icon-192.png"]) {
    assert.equal(protegida(aberta), false, aberta);
  }
  for (const fechada of ["/", "/api/state", "/api/evidencias/upload", "/api/guias/guia-rapido"]) {
    assert.equal(protegida(fechada), true, fechada);
  }
});
