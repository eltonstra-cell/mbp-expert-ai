// Sugestão de ambientes (e de equipamentos por setor) a partir do CNAE que JÁ está no cadastro da empresa. Reaproveita a tabela e os
// pacotes de lib/tiposDeEstabelecimento.ts (nenhum segundo mecanismo). É sugestão genérica: o RT confirma; nada aqui afirma norma.
import { normalizarSetorManual } from "./manualBase.ts";
import { descricaoDoCnaeDaTabela, normalizarCnae, pacoteDoTipo, tipoSugeridoPorCnae, type EquipamentoSugerido } from "./tiposDeEstabelecimento.ts";

/** "5611201" -> "5611-2/01". Texto que não tem 7 dígitos volta como veio (sem inventar formato). */
export function formatarCnae(codigo: string | undefined): string {
  const digitos = normalizarCnae(codigo);
  return digitos.length === 7 ? `${digitos.slice(0, 4)}-${digitos[4]}/${digitos.slice(5)}` : String(codigo ?? "").trim();
}

type EmpresaComCnae = { cnae?: string; cnaeDescricao?: string; cnaesSecundarios?: { codigo: string; descricao?: string }[] };

export type SugestaoPorCnae =
  | { situacao: "sem-cnae" }
  | { situacao: "sem-sugestao"; codigo: string; descricao: string }
  | {
      situacao: "ok";
      /** Código formatado do CNAE que originou a sugestão (o principal ou, na falta de correspondência, um secundário). */
      codigo: string;
      descricao: string;
      origem: "principal" | "secundario";
      tipoRotulo: string;
      ambientes: string[];
      equipamentos: EquipamentoSugerido[];
    };

const soDigitos = normalizarCnae;

export function sugestaoPorCnae(empresa: EmpresaComCnae): SugestaoPorCnae {
  const secundarios = empresa.cnaesSecundarios || [];
  if (!soDigitos(empresa.cnae) && secundarios.every((item) => !soDigitos(item.codigo))) return { situacao: "sem-cnae" };
  const tipo = tipoSugeridoPorCnae(empresa.cnae, secundarios);
  if (!tipo.correspondencia) return { situacao: "sem-sugestao", codigo: formatarCnae(empresa.cnae), descricao: (empresa.cnaeDescricao || "").trim() };
  const doPrincipal = soDigitos(empresa.cnae) === tipo.codigo;
  const secundario = secundarios.find((item) => soDigitos(item.codigo) === tipo.codigo);
  const descricaoCadastrada = (doPrincipal ? empresa.cnaeDescricao : secundario?.descricao) || "";
  const pacote = pacoteDoTipo(tipo.tipo);
  return {
    situacao: "ok",
    codigo: formatarCnae(tipo.codigo),
    descricao: descricaoCadastrada.trim() || descricaoDoCnaeDaTabela(tipo.codigo),
    origem: doPrincipal ? "principal" : "secundario",
    tipoRotulo: tipo.rotulo,
    ambientes: pacote.ambientes,
    equipamentos: pacote.equipamentos,
  };
}

/** Linha de cima da faixa: "Sugestão pelo CNAE 5611-2/01 · Restaurantes e similares" (secundário avisa na própria linha). */
export function tituloDaSugestao(sugestao: Extract<SugestaoPorCnae, { situacao: "ok" }>): string {
  return `Sugestão pelo CNAE ${sugestao.codigo}${sugestao.descricao ? ` · ${sugestao.descricao}` : ""}${sugestao.origem === "secundario" ? " (CNAE secundário)" : ""}`;
}

/**
 * O setor da empresa corresponde ao setor oficial do pacote? Pelo identificador do catálogo (SETORES_OFICIAIS_MANUAL): o nome oficial, o valor legado/apelido
 * que `normalizarSetorManual` migra para ele ("Cozinha", "Copa"... viram o oficial ao recarregar) ou o vínculo explícito de um ambiente próprio.
 * Nome parecido sem estar no catálogo não casa.
 */
export function setorCasaComOficial(setorDaEmpresa: string, oficial: string, vinculos?: Record<string, string>): boolean {
  if (!setorDaEmpresa || !oficial) return false;
  if (setorDaEmpresa === oficial) return true;
  if (vinculos?.[setorDaEmpresa] === oficial) return true;
  return normalizarSetorManual(setorDaEmpresa) === oficial;
}

/** Sugestões de equipamento para UM setor (do pacote do tipo), sem as que o setor já tem. O setor casa com o do pacote pelo nome oficial ou, no ambiente próprio, pelo vínculo. */
export function equipamentosSugeridosParaSetor(sugestao: SugestaoPorCnae, setor: string, jaNoSetor: string[], mesmoNome: (a: string, b: string) => boolean, vinculos?: Record<string, string>): EquipamentoSugerido[] {
  if (sugestao.situacao !== "ok") return [];
  return sugestao.equipamentos.filter((item) => setorCasaComOficial(setor, item.ambiente, vinculos) && !jaNoSetor.some((nome) => mesmoNome(nome, item.nome)));
}

/** O que dizer no setor vazio quando não há sugestão para mostrar: nunca em silêncio. */
export type AvisoSemSugestao = "sem-cnae" | "sem-sugestao-do-setor";
export function avisoQuandoNaoHaSugestao(sugestao: SugestaoPorCnae, sugeridosDoSetor: unknown[]): AvisoSemSugestao | null {
  if (sugestao.situacao === "sem-cnae") return "sem-cnae";
  if (sugestao.situacao === "sem-sugestao" || sugeridosDoSetor.length === 0) return "sem-sugestao-do-setor";
  return null;
}
