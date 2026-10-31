// Limites de texto e campos permitidos dos textos livres que gravam no estado (rodada 4, D2; estendido na rodada 5, G2 e G3).
// Só confere o que MUDOU em relação ao que o servidor já guarda: dado antigo, fora do limite, não bloqueia gravações sem relação.
// Nunca corta texto: o item inválido é recusado com o nome do campo e o restante é gravado (`separarItensInvalidos`).
import type { AppDB } from "../types/index.ts";
import { erroDoVencimento } from "./registrosEmpresa.ts";
import { LIMITE_CARGO_DA_PESSOA, LIMITE_DA_IDENTIFICACAO, LIMITE_DA_RESPONSABILIDADE, LIMITE_DO_TEXTO_LIVRE, LIMITE_NOME_DA_PESSOA } from "./documentosCentral.ts";

const CAMPOS_DE_COLABORADOR = new Set(["id", "empresaId", "nome", "cargo", "ativo", "criadoEm"]);
const CAMPOS_DE_REGISTRO = new Set(["id", "empresaId", "popId", "popVersao", "dataHora", "responsavel", "responsavelId", "descricao", "ambiente", "corrigeRegistroId", "verificacao", "desvio", "acaoCorretiva", "criadoEm"]);
const CAMPOS_DE_CAPACITACAO = new Set(["id", "empresaId", "colaboradorId", "conteudo", "cargaHoraria", "data", "venceEm", "instrutor", "criadoEm"]);

export const LIMITE_DO_CONTEUDO_DO_TREINAMENTO = 200;
export const LIMITE_DO_INSTRUTOR = 80;
export const LIMITE_DO_EMISSOR = 80;
export const LIMITE_DA_OBSERVACAO_DO_COMPROVANTE = 500;
export const LIMITE_DO_NOME_DO_ARQUIVO = 200;
export const LIMITE_DA_CARGA_HORARIA = 1000;

export type Rejeitado = { colecao: string; item: string; campo: string; mensagem: string };
export type ResultadoDosLimites = { ok: true } | { ok: false; mensagem: string; campo?: string; rejeitados?: Rejeitado[] };

const ordenado = (valor: unknown): unknown =>
  Array.isArray(valor)
    ? valor.map(ordenado)
    : valor && typeof valor === "object"
      ? Object.fromEntries(Object.entries(valor as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([chave, item]) => [chave, ordenado(item)]))
      : valor;
// O jsonb do banco reordena as chaves: a comparação não pode depender da ordem.
const iguais = (a: unknown, b: unknown) => JSON.stringify(ordenado(a)) === JSON.stringify(ordenado(b));

function textoAte(valor: unknown, limite: number): boolean {
  return valor === undefined || (typeof valor === "string" && valor.length <= limite);
}

type Erro = { campo: string; mensagem: string } | null;
const erro = (campo: string, mensagem: string): Erro => ({ campo, mensagem });
const ehData = (valor: unknown) => typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor);

/** Carga horária: número maior que zero (horas). Vazio = erro. */
export function erroDaCargaHoraria(valor: unknown): string {
  if (typeof valor !== "number" || !Number.isFinite(valor)) return "Informe a carga horária em horas";
  if (valor <= 0) return "Precisa ser maior que zero";
  if (valor > LIMITE_DA_CARGA_HORARIA) return `No máximo ${LIMITE_DA_CARGA_HORARIA} horas`;
  return "";
}

function erroDeColaborador(pessoa: Record<string, unknown>): Erro {
  const extra = Object.keys(pessoa).find((chave) => !CAMPOS_DE_COLABORADOR.has(chave));
  if (extra) return erro(extra, `Campo não permitido em pessoa: ${extra}. Guardamos só nome, cargo e as datas dos treinamentos.`);
  if (typeof pessoa.nome !== "string" || !textoAte(pessoa.nome, LIMITE_NOME_DA_PESSOA)) return erro("nome", `O nome da pessoa pode ter no máximo ${LIMITE_NOME_DA_PESSOA} caracteres.`);
  if (!textoAte(pessoa.cargo, LIMITE_CARGO_DA_PESSOA)) return erro("cargo", `O cargo pode ter no máximo ${LIMITE_CARGO_DA_PESSOA} caracteres.`);
  return null;
}

function erroDeRegistro(registro: Record<string, unknown>): Erro {
  const extra = Object.keys(registro).find((chave) => !CAMPOS_DE_REGISTRO.has(chave));
  if (extra) return erro(extra, `Campo não permitido no registro: ${extra}.`);
  const rotulos: Record<string, string> = { descricao: "A descrição", verificacao: "A verificação", acaoCorretiva: "A ação corretiva" };
  for (const campo of ["descricao", "verificacao", "acaoCorretiva"]) {
    if (!textoAte(registro[campo], LIMITE_DO_TEXTO_LIVRE)) return erro(campo, `${rotulos[campo]} do registro pode ter no máximo ${LIMITE_DO_TEXTO_LIVRE} caracteres.`);
  }
  for (const campo of ["responsavel", "ambiente"]) {
    if (!textoAte(registro[campo], LIMITE_NOME_DA_PESSOA)) return erro(campo, `${campo === "responsavel" ? "O responsável" : "O ambiente"} do registro pode ter no máximo ${LIMITE_NOME_DA_PESSOA} caracteres.`);
  }
  return null;
}

function erroDeCapacitacao(item: Record<string, unknown>, gravado?: Record<string, unknown>): Erro {
  const extra = Object.keys(item).find((chave) => !CAMPOS_DE_CAPACITACAO.has(chave));
  if (extra) return erro(extra, `Campo não permitido no treinamento: ${extra}.`);
  if (typeof item.conteudo !== "string" || !item.conteudo.trim()) return erro("conteudo", "Informe o conteúdo do treinamento.");
  if (item.conteudo.length > LIMITE_DO_CONTEUDO_DO_TREINAMENTO) return erro("conteudo", `O conteúdo do treinamento pode ter no máximo ${LIMITE_DO_CONTEUDO_DO_TREINAMENTO} caracteres.`);
  if (!textoAte(item.instrutor, LIMITE_DO_INSTRUTOR)) return erro("instrutor", `O instrutor pode ter no máximo ${LIMITE_DO_INSTRUTOR} caracteres.`);
  const cargaErro = erroDaCargaHoraria(item.cargaHoraria);
  if (cargaErro) return erro("cargaHoraria", `Carga horária: ${cargaErro.toLowerCase()}.`);
  if (!ehData(item.data)) return erro("data", "Feito em: informe uma data válida.");
  if (item.venceEm !== undefined && item.venceEm !== "" && !ehData(item.venceEm)) return erro("venceEm", "Vence em: informe uma data válida.");
  // Registro antigo (venceEm igual a data) não fica preso quando só outro campo muda.
  const vencimentoIntacto = Boolean(gravado) && gravado!.data === item.data && gravado!.venceEm === item.venceEm;
  const vencimento = vencimentoIntacto ? null : erroDoVencimento(item.data as string, item.venceEm as string | undefined);
  if (vencimento) return erro("venceEm", `Vence em: ${vencimento.charAt(0).toLowerCase()}${vencimento.slice(1)}.`);
  return null;
}

function erroDeComprovante(item: Record<string, unknown>): Erro {
  if (!textoAte(item.emissor, LIMITE_DO_EMISSOR)) return erro("emissor", `O emissor pode ter no máximo ${LIMITE_DO_EMISSOR} caracteres.`);
  if (!textoAte(item.observacao, LIMITE_DA_OBSERVACAO_DO_COMPROVANTE)) return erro("observacao", `A observação pode ter no máximo ${LIMITE_DA_OBSERVACAO_DO_COMPROVANTE} caracteres.`);
  if (!textoAte(item.nomeArquivo, LIMITE_DO_NOME_DO_ARQUIVO)) return erro("nomeArquivo", `O nome do arquivo pode ter no máximo ${LIMITE_DO_NOME_DO_ARQUIVO} caracteres.`);
  return null;
}

const ROTULO_DA_COLECAO: Record<string, string> = { colaboradores: "Pessoa", registrosPop: "Registro de POP", capacitacoes: "Treinamento", comprovantes: "Comprovante", pops: "POP", empresas: "Empresa" };

type ColecaoSimples = "colaboradores" | "registrosPop" | "capacitacoes" | "comprovantes";
const REGRAS: Record<ColecaoSimples, (item: Record<string, unknown>, gravado?: Record<string, unknown>) => Erro> = {
  colaboradores: erroDeColaborador,
  registrosPop: erroDeRegistro,
  capacitacoes: erroDeCapacitacao,
  comprovantes: erroDeComprovante,
};

function erroDoPop(pop: { responsavel?: unknown; conteudo?: { responsavelExecucao?: { nome?: unknown; cargo?: unknown } } }): Erro {
  if (!textoAte(pop.responsavel, LIMITE_NOME_DA_PESSOA)) return erro("responsavel", `O nome do responsável pode ter no máximo ${LIMITE_NOME_DA_PESSOA} caracteres.`);
  const executor = pop.conteudo?.responsavelExecucao;
  if (executor) {
    if (!textoAte(executor.nome, LIMITE_NOME_DA_PESSOA)) return erro("responsavelExecucao.nome", `O nome do responsável pode ter no máximo ${LIMITE_NOME_DA_PESSOA} caracteres.`);
    if (!textoAte(executor.cargo, LIMITE_CARGO_DA_PESSOA)) return erro("responsavelExecucao.cargo", `O cargo do responsável pode ter no máximo ${LIMITE_CARGO_DA_PESSOA} caracteres.`);
  }
  return null;
}

function erroDaEmpresa(empresa: Record<string, unknown>): Erro {
  for (const [campo, limite] of Object.entries(LIMITE_DA_IDENTIFICACAO)) {
    if (!textoAte(empresa[campo], limite)) return erro(campo, `O campo ${campo} pode ter no máximo ${limite} caracteres.`);
  }
  const lista = empresa.responsabilidadesManual;
  if (Array.isArray(lista)) {
    for (const item of lista as Record<string, unknown>[]) {
      if (!item || typeof item !== "object") continue;
      if (!textoAte(item.descricao, LIMITE_DA_RESPONSABILIDADE)) return erro("responsabilidadesManual", `O texto da responsabilidade pode ter no máximo ${LIMITE_DA_RESPONSABILIDADE} caracteres.`);
    }
  }
  return null;
}

/**
 * Tira do estado recebido cada item que quebra um limite ou campo permitido, SEM tocar no resto: o item que já existia volta à versão
 * gravada; o novo é descartado. Quem chama devolve a lista ao navegador, com o campo de cada um. Nunca corta texto em silêncio.
 */
export function separarItensInvalidos<T extends Partial<AppDB>>(atual: Partial<AppDB> | null | undefined, recebido: T): { estado: T; rejeitados: Rejeitado[] } {
  const rejeitados: Rejeitado[] = [];
  const estado: Record<string, unknown> = { ...recebido };
  for (const colecao of Object.keys(REGRAS) as ColecaoSimples[]) {
    const lista = (recebido as Record<string, unknown>)[colecao];
    if (!Array.isArray(lista)) continue;
    const gravados = new Map(((atual as Record<string, unknown> | null | undefined)?.[colecao] as { id: string }[] | undefined || []).map((item) => [item.id, item]));
    const resultado: unknown[] = [];
    for (const item of lista as Record<string, unknown>[]) {
      if (!item || typeof item !== "object") { resultado.push(item); continue; }
      const gravado = gravados.get(String(item.id));
      if (iguais(item, gravado)) { resultado.push(item); continue; }
      const problema = REGRAS[colecao](item, gravado as Record<string, unknown> | undefined);
      if (!problema) { resultado.push(item); continue; }
      rejeitados.push({ colecao, item: String(item.id), campo: problema.campo, mensagem: problema.mensagem });
      if (gravado) resultado.push(gravado);
    }
    estado[colecao] = resultado;
  }
  const empresas = recebido.empresas;
  if (empresas && typeof empresas === "object") {
    const novas: Record<string, unknown> = { ...empresas };
    for (const [empresaId, empresa] of Object.entries(empresas)) {
      if (!empresa || typeof empresa !== "object") continue;
      const gravada = (atual?.empresas || {})[empresaId];
      let atualizada: Record<string, unknown> = { ...(empresa as unknown as Record<string, unknown>) };
      // Rodada 6, I4: só o campo que passou do limite é recusado (volta ao gravado); os demais seguem.
      const gravadaEmpresa = gravada as unknown as Record<string, unknown> | undefined;
      for (const [campo, limite] of Object.entries(LIMITE_DA_IDENTIFICACAO)) {
        if (iguais(atualizada[campo], gravadaEmpresa?.[campo]) || textoAte(atualizada[campo], limite)) continue;
        rejeitados.push({ colecao: "empresas", item: empresaId, campo, mensagem: `O campo pode ter no máximo ${limite} caracteres.` });
        atualizada = { ...atualizada, [campo]: gravadaEmpresa?.[campo] };
      }
      if (!iguais(atualizada.responsabilidadesManual, gravadaEmpresa?.responsabilidadesManual)) {
        const problema = erroDaEmpresa({ responsabilidadesManual: atualizada.responsabilidadesManual });
        if (problema) {
          rejeitados.push({ colecao: "empresas", item: empresaId, campo: problema.campo, mensagem: problema.mensagem });
          atualizada = { ...atualizada, responsabilidadesManual: gravadaEmpresa?.responsabilidadesManual };
        }
      }
      const gravados = new Map((gravada?.pops || []).map((pop) => [pop.id, pop]));
      if (Array.isArray(atualizada.pops)) {
        const pops: unknown[] = [];
        for (const pop of atualizada.pops as Array<{ id: string; responsavel?: unknown; conteudo?: { responsavelExecucao?: { nome?: unknown; cargo?: unknown } } }>) {
          if (!pop || typeof pop !== "object") { pops.push(pop); continue; }
          const antes = gravados.get(pop.id);
          const mudou = !iguais({ r: pop.responsavel, e: pop.conteudo?.responsavelExecucao }, { r: antes?.responsavel, e: antes?.conteudo?.responsavelExecucao });
          const problema = mudou ? erroDoPop(pop) : null;
          if (!problema) { pops.push(pop); continue; }
          rejeitados.push({ colecao: "pops", item: pop.id, campo: problema.campo, mensagem: problema.mensagem });
          if (antes) pops.push(antes);
        }
        atualizada.pops = pops;
      }
      novas[empresaId] = atualizada;
    }
    estado.empresas = novas;
  }
  return { estado: estado as T, rejeitados };
}

export function rotuloDaColecao(colecao: string): string {
  return ROTULO_DA_COLECAO[colecao] || colecao;
}

/** Verificação simples: ok quando nada seria recusado; senão a primeira recusa (com o campo). */
export function validarLimitesDeTexto(atual: Partial<AppDB> | null | undefined, recebido: Partial<AppDB>): ResultadoDosLimites {
  const { rejeitados } = separarItensInvalidos(atual, recebido);
  if (!rejeitados.length) return { ok: true };
  return { ok: false, mensagem: rejeitados[0].mensagem, campo: rejeitados[0].campo, rejeitados };
}
