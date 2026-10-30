// Limites de texto e campos permitidos de Pessoas, Registros de POP e "Outra pessoa…" (rodada 4, D2).
// Só confere o que MUDOU em relação ao que o servidor já guarda: dado antigo, fora do limite, não bloqueia gravações sem relação.
import type { AppDB } from "../types/index.ts";
import { LIMITE_CARGO_DA_PESSOA, LIMITE_DO_TEXTO_LIVRE, LIMITE_NOME_DA_PESSOA } from "./documentosCentral.ts";

const CAMPOS_DE_COLABORADOR = new Set(["id", "empresaId", "nome", "cargo", "ativo", "criadoEm"]);
const CAMPOS_DE_REGISTRO = new Set(["id", "empresaId", "popId", "popVersao", "dataHora", "responsavel", "responsavelId", "descricao", "ambiente", "corrigeRegistroId", "verificacao", "desvio", "acaoCorretiva", "criadoEm"]);

export type ResultadoDosLimites = { ok: true } | { ok: false; mensagem: string };

const ordenado = (valor: unknown): unknown =>
  Array.isArray(valor)
    ? valor.map(ordenado)
    : valor && typeof valor === "object"
      ? Object.fromEntries(Object.entries(valor as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([chave, item]) => [chave, ordenado(item)]))
      : valor;
// O jsonb do banco reordena as chaves: a comparação não pode depender da ordem.
const iguais = (a: unknown, b: unknown) => JSON.stringify(ordenado(a)) === JSON.stringify(ordenado(b));
const falha = (mensagem: string): ResultadoDosLimites => ({ ok: false, mensagem });

function textoAte(valor: unknown, limite: number): boolean {
  return valor === undefined || (typeof valor === "string" && valor.length <= limite);
}

export function validarLimitesDeTexto(atual: Partial<AppDB> | null | undefined, recebido: Partial<AppDB>): ResultadoDosLimites {
  const antes = new Map((atual?.colaboradores || []).map((item) => [item.id, item]));
  for (const pessoa of (Array.isArray(recebido.colaboradores) ? recebido.colaboradores : []) as unknown as Record<string, unknown>[]) {
    if (!pessoa || typeof pessoa !== "object") continue;
    if (iguais(pessoa, antes.get(String(pessoa.id)))) continue;
    const extra = Object.keys(pessoa).find((chave) => !CAMPOS_DE_COLABORADOR.has(chave));
    if (extra) return falha(`Campo não permitido em pessoa: ${extra}. Guardamos só nome, cargo e as datas dos treinamentos.`);
    if (typeof pessoa.nome !== "string" || !textoAte(pessoa.nome, LIMITE_NOME_DA_PESSOA)) return falha(`O nome da pessoa pode ter no máximo ${LIMITE_NOME_DA_PESSOA} caracteres.`);
    if (!textoAte(pessoa.cargo, LIMITE_CARGO_DA_PESSOA)) return falha(`O cargo pode ter no máximo ${LIMITE_CARGO_DA_PESSOA} caracteres.`);
  }
  const registros = new Map((atual?.registrosPop || []).map((item) => [item.id, item]));
  for (const registro of (Array.isArray(recebido.registrosPop) ? recebido.registrosPop : []) as unknown as Record<string, unknown>[]) {
    if (!registro || typeof registro !== "object") continue;
    if (iguais(registro, registros.get(String(registro.id)))) continue;
    const extra = Object.keys(registro).find((chave) => !CAMPOS_DE_REGISTRO.has(chave));
    if (extra) return falha(`Campo não permitido no registro: ${extra}.`);
    for (const campo of ["descricao", "verificacao", "acaoCorretiva"]) {
      if (!textoAte(registro[campo], LIMITE_DO_TEXTO_LIVRE)) return falha(`O texto do registro pode ter no máximo ${LIMITE_DO_TEXTO_LIVRE} caracteres.`);
    }
  }
  for (const [empresaId, empresa] of Object.entries(recebido.empresas || {})) {
    const gravadas = new Map(((atual?.empresas || {})[empresaId]?.pops || []).map((pop) => [pop.id, pop]));
    for (const pop of empresa.pops || []) {
      const executor = pop.conteudo?.responsavelExecucao;
      if (!executor || iguais(executor, gravadas.get(pop.id)?.conteudo?.responsavelExecucao)) continue;
      if (!textoAte(executor.nome, LIMITE_NOME_DA_PESSOA)) return falha(`O nome do responsável pode ter no máximo ${LIMITE_NOME_DA_PESSOA} caracteres.`);
      if (!textoAte(executor.cargo, LIMITE_CARGO_DA_PESSOA)) return falha(`O cargo do responsável pode ter no máximo ${LIMITE_CARGO_DA_PESSOA} caracteres.`);
    }
  }
  return { ok: true };
}
