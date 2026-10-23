// Dados de teste do Início, só na empresa "Beyond Nutri" (nunca a Churrascaria do Chico). Dois jeitos:
//   1) Arquivo:   node --experimental-strip-types scripts/dados-de-teste-inicio.mjs adicionar|remover entrada.json saida.json
//                 (entrada = o estado guardado, por exemplo copiado do localStorage; a saída é o estado novo. Nada é enviado a lugar nenhum.)
//   2) Navegador: node --experimental-strip-types scripts/dados-de-teste-inicio.mjs navegador adicionar|remover
//                 imprime um trecho para colar no Console do navegador, no app aberto na empresa "Beyond Nutri"; depois, recarregue a página.
// Tudo que entra leva o id "teste-inicio-…"; "remover" tira só isso. Sem a empresa "Beyond Nutri" no estado, nada é alterado.
import { readFileSync, writeFileSync } from "node:fs";
import { adicionarDadosDeTeste, contarDadosDeTeste, itensDeTeste, PREFIXO_DE_TESTE, removerDadosDeTeste } from "../lib/dadosDeTesteInicio.ts";

const hojeISO = () => new Date().toISOString().slice(0, 10);
const [modo, a, b] = process.argv.slice(2);

if (modo === "adicionar" || modo === "remover") {
  if (!a || !b) {
    console.error("Uso: ... adicionar|remover entrada.json saida.json");
    process.exit(1);
  }
  const db = JSON.parse(readFileSync(a, "utf8"));
  const novo = modo === "adicionar" ? adicionarDadosDeTeste(db, hojeISO()) : removerDadosDeTeste(db);
  writeFileSync(b, JSON.stringify(novo));
  console.log(`${modo === "adicionar" ? "Adicionados" : "Removidos"}: registros de teste agora = ${contarDadosDeTeste(novo)}`);
} else if (modo === "navegador" && (a === "adicionar" || a === "remover")) {
  const modelo = itensDeTeste("__EMPRESA__", hojeISO());
  const dados = JSON.stringify(modelo);
  const trecho = `(() => {
  const chave = Object.keys(localStorage).find((k) => k.startsWith("mbp-expert-ai-v2:usuario:"));
  if (!chave) return alert("Estado do app não encontrado neste navegador.");
  const db = JSON.parse(localStorage.getItem(chave));
  const P = ${JSON.stringify(PREFIXO_DE_TESTE)};
  const teste = (id) => String(id || "").startsWith(P);
  db.visitas = db.visitas.filter((v) => !teste(v.id)); db.ncs = db.ncs.filter((n) => !teste(n.id));
  db.colaboradores = (db.colaboradores || []).filter((p) => !teste(p.id)); db.capacitacoes = (db.capacitacoes || []).filter((c) => !teste(c.id));
  for (const e of Object.values(db.empresas)) e.pops = (e.pops || []).filter((p) => !teste(p.id));
  if (${JSON.stringify(a)} === "adicionar") {
    const alvo = Object.values(db.empresas).find((e) => (e.nomeFantasia || "").trim().toLowerCase() === "beyond nutri");
    if (!alvo) return alert("Empresa Beyond Nutri não encontrada: nada foi alterado.");
    const d = JSON.parse(${JSON.stringify(dados)}.split("__EMPRESA__").join(alvo.id));
    db.visitas.push(d.visita); db.ncs.push(d.nc); (db.colaboradores ||= []).push(d.colaborador); (db.capacitacoes ||= []).push(d.capacitacao);
    alvo.pops = [...(alvo.pops || []), d.popAguardando, d.popComRevisao];
  }
  localStorage.setItem(chave, JSON.stringify(db));
  alert("Pronto. Recarregue a página (F5).");
})();`;
  console.log(trecho);
} else {
  console.error("Uso: adicionar|remover entrada.json saida.json  |  navegador adicionar|remover");
  process.exit(1);
}
