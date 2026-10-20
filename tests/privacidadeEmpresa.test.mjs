import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  decidirIaEmFoto,
  desligarIa,
  erroDaGuarda,
  guardaDaEmpresa,
  iaJaFoiLiberada,
  iaLiberada,
  liberarIa,
  MENSAGEM_IA_DESLIGADA,
  textoDaFaixaDeGuarda,
  textoDeLiberacao,
  visitasComGuardaVencendo,
} from "../lib/privacidadeEmpresa.ts";
import { mesclarEstadoPorUsuario } from "../lib/stateAccess.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");
const ana = { id: "u1", nome: "Ana Souza" };

test("IA nas fotos nasce desligada; a primeira liberação exige aceite e guarda quem e quando", () => {
  assert.equal(iaLiberada({}), false);
  assert.equal(iaLiberada(undefined), false);
  assert.equal(iaJaFoiLiberada({}), false);
  assert.throws(() => liberarIa(undefined, ana, false, "2026-10-20T12:00:00.000Z"), /aceite/);
  const p = liberarIa(undefined, ana, true, "2026-10-20T12:00:00.000Z");
  assert.equal(p.iaFotos.liberada, true);
  assert.deepEqual([p.iaFotos.liberadaPorId, p.iaFotos.liberadaPorNome, p.iaFotos.aceite], ["u1", "Ana Souza", true]);
  assert.match(textoDeLiberacao({ privacidade: p }), /^Liberado por Ana Souza em \d{2}\/\d{2}\/2026$/);
  const desligada = desligarIa(p);
  assert.equal(iaLiberada({ privacidade: desligada }), false);
  assert.equal(iaJaFoiLiberada({ privacidade: desligada }), true);
  // religar depois não pede novo aceite
  assert.equal(liberarIa(desligada, ana, false, "2026-11-01T10:00:00.000Z").iaFotos.liberada, true);
  assert.equal(textoDeLiberacao({ privacidade: desligada }), "");
});

test("Guarda: padrão de 180 dias, prazos válidos e erro no campo", () => {
  assert.equal(guardaDaEmpresa({}), 180);
  assert.equal(guardaDaEmpresa({ privacidade: { guardaDias: 90 } }), 90);
  assert.equal(guardaDaEmpresa({ privacidade: { guardaDias: 45 } }), 45);
  assert.equal(guardaDaEmpresa({ privacidade: { guardaDias: 5 } }), 180);
  assert.equal(guardaDaEmpresa({ privacidade: { guardaDias: 9999 } }), 180);
  assert.equal(erroDaGuarda(null), "Informe o número de dias.");
  assert.equal(erroDaGuarda(10), "Informe de 30 a 730 dias.");
  assert.equal(erroDaGuarda(120), "");
});

const DIA = 24 * 60 * 60 * 1000;
const agora = new Date("2026-10-20T12:00:00.000Z");
const atras = (dias) => new Date(agora.getTime() - dias * DIA).toISOString();

test("Guarda: lista só leitura das visitas com fotos que vencem em 30 dias, sem mexer em nada", () => {
  const visitas = [
    { id: "perto", empresaId: "e1", status: "Concluída", encerradaEm: atras(160) },
    { id: "longe", empresaId: "e1", status: "Concluída", encerradaEm: atras(10) },
    { id: "vencida", empresaId: "e1", status: "Concluída", encerradaEm: atras(200) },
    { id: "semfoto", empresaId: "e1", status: "Concluída", encerradaEm: atras(170) },
    { id: "aberta", empresaId: "e1", status: "Em andamento", encerradaEm: atras(170) },
    { id: "porhistorico", empresaId: "e1", status: "Concluída", historicoStatus: [{ para: "Concluída", criadoEm: atras(175) }] },
  ];
  const evidencias = [
    { visitaId: "perto", tipo: "Foto" },
    { visitaId: "perto", tipo: "Áudio" },
    { visitaId: "longe", tipo: "Foto" },
    { visitaId: "vencida", tipo: "Foto" },
    { visitaId: "aberta", tipo: "Foto" },
    { visitaId: "porhistorico", tipo: "Foto" },
  ];
  const copiaV = JSON.stringify(visitas);
  const copiaE = JSON.stringify(evidencias);
  const lista = visitasComGuardaVencendo(visitas, evidencias, 180, agora);
  assert.deepEqual(lista.map((linha) => linha.visitaId), ["vencida", "porhistorico", "perto"]);
  assert.equal(lista[0].vencida, true);
  assert.equal(lista[2].vencida, false);
  assert.deepEqual([lista[2].fotos, lista[2].audios], [1, 1]);
  assert.equal(JSON.stringify(visitas), copiaV);
  assert.equal(JSON.stringify(evidencias), copiaE);
  // com 90 dias a visita "longe" (10 dias) segue fora e "perto" já venceu
  assert.equal(visitasComGuardaVencendo(visitas, evidencias, 90, agora).find((linha) => linha.visitaId === "perto").vencida, true);
  assert.equal(textoDaFaixaDeGuarda(3), "3 visitas com fotos vencem nos próximos 30 dias");
  assert.equal(textoDaFaixaDeGuarda(1), "1 visita com fotos vence nos próximos 30 dias");
});

test("Servidor: a IA em foto é recusada com empresa desligada e aceita com liberada", () => {
  const dados = {
    empresas: {
      desligada: { privacidade: undefined },
      liberada: { privacidade: liberarIa(undefined, ana, true, agora.toISOString()) },
      religada: { privacidade: desligarIa(liberarIa(undefined, ana, true, agora.toISOString())) },
    },
  };
  assert.deepEqual(decidirIaEmFoto(dados, "desligada"), { ok: false, motivo: MENSAGEM_IA_DESLIGADA });
  assert.deepEqual(decidirIaEmFoto(dados, "religada"), { ok: false, motivo: MENSAGEM_IA_DESLIGADA });
  assert.deepEqual(decidirIaEmFoto(dados, "liberada"), { ok: true });
  assert.equal(decidirIaEmFoto(dados, "inexistente").ok, false);
  assert.equal(decidirIaEmFoto(dados, undefined).ok, false);
  assert.equal(decidirIaEmFoto(null, "liberada").ok, false);
  const rota = ler("../app/api/evidencias/analisar/route.ts");
  assert.ok(rota.includes("decidirIaEmFoto(acesso.data, empresaId)") && rota.includes("ia-desligada-na-empresa") && rota.includes("status: 403"));
  assert.ok(rota.indexOf("decidirIaEmFoto") < rota.indexOf("carregarImagem(pathname)"));
});

test("Só quem usa a IA liga ou desliga a IA da empresa (o servidor mantém o valor de antes)", () => {
  const liberada = liberarIa(undefined, ana, true, agora.toISOString());
  const atual = { empresas: { e1: { id: "e1", privacidade: { iaFotos: undefined } } }, visitas: [], ncs: [], evidencias: [], usuarios: [], registrosAuditoria: [] };
  const recebido = { ...atual, empresas: { e1: { id: "e1", privacidade: liberada } } };
  const gestorComEdicao = { id: "g", perfil: "Cliente Gestor", status: "Ativo", empresaIds: ["e1"], nome: "G", email: "g@x.com", telas: { empresas: "editar" } };
  const barrado = mesclarEstadoPorUsuario(atual, recebido, gestorComEdicao, "auth-g");
  assert.equal(barrado.empresas.e1.privacidade.iaFotos, undefined);
  const consultor = { id: "c", perfil: "Consultor/RT", status: "Ativo", empresaIds: ["e1"], nome: "C", email: "c@x.com" };
  const aceito = mesclarEstadoPorUsuario(atual, recebido, consultor, "auth-c");
  assert.equal(aceito.empresas.e1.privacidade.iaFotos.liberada, true);
});

test("Telas: Privacidade e guarda no cadastro, botão cinza com aviso e a IA só sugere", () => {
  const painel = ler("../components/pc/PcPrivacidadeEmpresa.tsx");
  assert.ok(painel.includes("Liberar a IA, primeira vez nesta empresa") && painel.includes("Li e concordo, em nome da empresa"));
  assert.ok(painel.includes("A foto sai do aparelho e vai para um provedor externo de IA, que devolve uma sugestão de texto. Evite rostos, crachás e documentos. Você pode desligar quando quiser."));
  assert.ok(painel.includes("O áudio do Falar não é guardado, só o texto. A transcrição passa por um provedor externo."));
  assert.ok(painel.includes("Prazos de guarda citados nas normas pesquisadas: 30, 90 e 180 dias para registros."));
  assert.ok(painel.includes("Alterar no computador") && painel.includes("Sempre ligada"));
  assert.ok(painel.includes("O app não apaga nada nesta etapa"));
  assert.ok(!/onApagar|excluir|delete/i.test(painel));
  const evid = ler("../components/pc/PcEvidencias.tsx");
  assert.ok(evid.includes("is-desligada") && evid.includes("MENSAGEM_IA_DESLIGADA"));
  assert.equal(MENSAGEM_IA_DESLIGADA, "IA desligada nesta empresa. Peça ao Consultor/RT para liberar em Empresas › Privacidade.");
  assert.ok(ler("../app/page.tsx").includes("iaDesligada: !iaLiberada(db.empresas[ev.empresaId])"));
});
