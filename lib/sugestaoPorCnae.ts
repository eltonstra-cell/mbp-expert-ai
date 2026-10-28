// Sugestão de ambientes (e de equipamentos por setor) a partir do CNAE que JÁ está no cadastro da empresa. Reaproveita a tabela e os
// pacotes de lib/tiposDeEstabelecimento.ts (nenhum segundo mecanismo). É sugestão genérica: o RT confirma; nada aqui afirma norma.
import { descricaoDoCnaeDaTabela, pacoteDoTipo, tipoSugeridoPorCnae, type EquipamentoSugerido } from "./tiposDeEstabelecimento.ts";

/** "5611201" -> "5611-2/01". Texto que não tem 7 dígitos volta como veio (sem inventar formato). */
export function formatarCnae(codigo: string | undefined): string {
  const digitos = (codigo || "").replace(/\D/g, "");
  return digitos.length === 7 ? `${digitos.slice(0, 4)}-${digitos[4]}/${digitos.slice(5)}` : (codigo || "").trim();
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

const soDigitos = (valor: string | undefined) => (valor || "").replace(/\D/g, "");

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

/** Sugestões de equipamento para UM setor (do pacote do tipo), sem as que o setor já tem. */
export function equipamentosSugeridosParaSetor(sugestao: SugestaoPorCnae, setor: string, jaNoSetor: string[], mesmoNome: (a: string, b: string) => boolean): EquipamentoSugerido[] {
  if (sugestao.situacao !== "ok") return [];
  return sugestao.equipamentos.filter((item) => item.ambiente === setor && !jaNoSetor.some((nome) => mesmoNome(nome, item.nome)));
}
