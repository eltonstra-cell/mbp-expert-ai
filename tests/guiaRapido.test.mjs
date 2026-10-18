import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { GUIAS } from "../lib/guias.ts";
import { BRAND } from "../lib/brand.ts";

const html = fs.readFileSync(new URL("../conteudo-privado/guias/fonte/guia-rapido.html", import.meta.url), "utf8");
const texto = html.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");

test("Guia rápido: o arquivo da lista existe e foi gerado depois do nome novo", () => {
  const caminho = new URL(`../conteudo-privado/guias/${GUIAS["guia-rapido"].arquivo}`, import.meta.url);
  assert.ok(fs.existsSync(caminho), "PDF do Guia rápido não encontrado");
  assert.ok(fs.statSync(caminho).size > 20000);
  assert.ok(!/mbp/i.test(GUIAS["guia-rapido"].arquivo));
});

test("Guia rápido: nome e subtítulo da marca atual, sem o nome antigo", () => {
  assert.ok(texto.includes("Ponto") && texto.includes("Certo"));
  assert.ok(texto.includes(BRAND.subtitle));
  assert.ok(!/MBP Expert AI/i.test(texto));
});

test("Guia rápido: rótulos do celular conferem com o app e sem termos antigos", () => {
  for (const rotulo of ["Início", "Checklist", "Registrar", "Correções", "Mais", "Central da visita", "Ambientes", "Evidências", "POPs da visita", "Relatório", "Visitas", "Trocar empresa", "Ajuda", "Modo de tela", "Sincronizar", "Sair"]) {
    assert.ok(texto.includes(rotulo), `faltou o rótulo ${rotulo}`);
  }
  for (const antigo of ["Plano de ação", "Não conformidades:"]) assert.ok(!texto.includes(antigo), `termo antigo: ${antigo}`);
  for (const etapa of ["Identificada", "Com plano", "Em acompanhamento", "Resolvida"]) assert.ok(texto.includes(etapa));
});

test("Guia rápido: cabeçalho claro (sem tarja escura) e sem conteúdo regulatório", () => {
  assert.ok(!/#0b2d72|#061b4f|#0f172a|navy|marinho/i.test(html));
  assert.ok(!/ANVISA|RDC|\bIN\s?\d|Resolução/i.test(texto));
});
