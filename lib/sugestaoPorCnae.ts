// Sugestão de ambientes (e de equipamentos por setor) a partir do CNAE que JÁ está no cadastro da empresa. Reaproveita a tabela e os
// pacotes de lib/tiposDeEstabelecimento.ts (nenhum segundo mecanismo). É sugestão genérica: o RT confirma; nada aqui afirma norma.
import { SETORES_OFICIAIS_MANUAL } from "./manualBase.ts";
import { chaveDeEquipamento } from "./sinonimosEquipamentos.ts";
import { descricaoDoCnaeDaTabela, nomeCurtoDoSetor, normalizarCnae, pacoteDoTipo, tipoEfetivoDaEmpresa, type EquipamentoSugerido } from "./tiposDeEstabelecimento.ts";

/** "5611201" -> "5611-2/01". Texto que não tem 7 dígitos volta como veio (sem inventar formato). */
export function formatarCnae(codigo: string | undefined): string {
  const digitos = normalizarCnae(codigo);
  return digitos.length === 7 ? `${digitos.slice(0, 4)}-${digitos[4]}/${digitos.slice(5)}` : String(codigo ?? "").trim();
}

type EmpresaComCnae = { cnae?: string; cnaeDescricao?: string; tipo?: string; cnaesSecundarios?: { codigo: string; descricao?: string }[] };

export type SugestaoPorCnae =
  | { situacao: "sem-cnae" }
  /** CNAE preenchido, mas fora da tabela do app (ou com formato inválido): nenhuma sugestão. */
  | { situacao: "sem-sugestao"; codigo: string; descricao: string }
  | {
      situacao: "ok";
      /** Código formatado do CNAE que originou a sugestão (o principal ou, na falta de correspondência, um secundário); vazio quando só o tipo ajustado vale. */
      codigo: string;
      /** Descrição da CNAE do IBGE para o código da tabela do app (nunca a descrição digitada no cadastro). */
      descricao: string;
      /** Nome do tipo que aparece no título: o do tipo ajustado pelo usuário ou, sem ajuste, a descrição do CNAE na tabela. */
      nomeDoTipo: string;
      origem: "principal" | "secundario";
      tipoRotulo: string;
      ambientes: string[];
      equipamentos: EquipamentoSugerido[];
    };

const soDigitos = normalizarCnae;

/** Sempre recalculada a partir do cadastro de AGORA: nada é guardado do resultado anterior. */
export function sugestaoPorCnae(empresa: EmpresaComCnae): SugestaoPorCnae {
  const secundarios = empresa.cnaesSecundarios || [];
  if (!soDigitos(empresa.cnae) && secundarios.every((item) => !soDigitos(item.codigo))) return { situacao: "sem-cnae" };
  const tipo = tipoEfetivoDaEmpresa({ cnae: empresa.cnae, cnaesSecundarios: secundarios, tipo: empresa.tipo });
  // Tipo ajustado pelo usuário vale sozinho, mesmo com CNAE fora da tabela (sem código CNAE no título nesse caso).
  if (!tipo.doCnae.correspondencia && !tipo.ajustado) return { situacao: "sem-sugestao", codigo: formatarCnae(empresa.cnae), descricao: "" };
  const codigo = tipo.doCnae.correspondencia ? tipo.doCnae.codigo : "";
  const doPrincipal = !codigo || soDigitos(empresa.cnae) === codigo;
  const descricao = codigo ? descricaoDoCnaeDaTabela(codigo) : "";
  const pacote = pacoteDoTipo(tipo.id);
  return {
    situacao: "ok",
    codigo: codigo ? formatarCnae(codigo) : "",
    descricao,
    nomeDoTipo: tipo.ajustado ? tipo.rotulo : descricao || tipo.rotulo,
    origem: doPrincipal ? "principal" : "secundario",
    tipoRotulo: tipo.rotulo,
    ambientes: pacote.ambientes,
    equipamentos: pacote.equipamentos,
  };
}

/** Linha de cima da faixa: "Sugestões para Restaurantes e similares · CNAE 5611-2/01" (secundário avisa na própria linha). Usa o nome do tipo, nunca a descrição digitada. */
export function tituloDaSugestao(sugestao: Extract<SugestaoPorCnae, { situacao: "ok" }>): string {
  return `Sugestões para ${sugestao.nomeDoTipo}${sugestao.codigo ? ` · CNAE ${sugestao.codigo}` : ""}${sugestao.origem === "secundario" ? " (CNAE secundário)" : ""}`;
}

/** "Recebimento, Estoque, Banheiro clientes masc." — o ponto final da frase só entra se a última palavra ainda não terminar em ponto ("masc." não vira "masc.."). */
export function listaComPontoFinal(itens: string[]): string {
  const texto = itens.join(", ");
  return texto.endsWith(".") ? texto : `${texto}.`;
}

// Nomes que SÃO o mesmo setor oficial (além do nome oficial e do nome curto): renomeações do próprio catálogo. Cópia fiel da lista de migração do Manual,
// só dos casos em que o significado é o mesmo; apelidos que juntam coisas diferentes (Copa, Churrasqueira, Câmara fria, Depósito de embalagens, Salão de atendimento…) NÃO entram.
// A ordem de SETORES_OFICIAIS_MANUAL é a base desta lista (travada em tests/rodada8A.test.mjs).
const [RECEBIMENTO, ESTOQUE, DML, , COZINHA, HIGIENIZACAO] = SETORES_OFICIAIS_MANUAL;
const MESMO_SETOR: Record<string, string[]> = {
  [RECEBIMENTO]: ["Recebimento", "Recebimento de Mercadorias"],
  [ESTOQUE]: ["Estoque", "Estoque Seco", "Armazenamento seco/estoque"],
  [DML]: ["DML", "Depósito de Material de Limpeza (DML)", "Depósito de Materiais de Limpeza (DML)", "DML/Material de limpeza"],
  [COZINHA]: ["Cozinha"],
  [HIGIENIZACAO]: ["Higienização", "Higienização de Utensílios e Equipamentos", "Higienização de Equipamentos", "Higienização de Utensílios"],
};

/**
 * Setor oficial com o qual o ambiente casa EXATAMENTE: vínculo explícito do ambiente próprio, nome oficial, nome curto ou renomeação equivalente do catálogo
 * (comparados sem acento, caixa e pontuação). Nome apenas parecido, prefixo ou similaridade NÃO casa: sem casamento exato, devolve null.
 */
export function oficialExatoDoSetor(setorDaEmpresa: string, vinculos?: Record<string, string>): string | null {
  if (!setorDaEmpresa) return null;
  const vinculado = vinculos?.[setorDaEmpresa];
  if (vinculado && (SETORES_OFICIAIS_MANUAL as readonly string[]).includes(vinculado)) return vinculado;
  const chave = chaveDeEquipamento(setorDaEmpresa);
  if (!chave) return null;
  return SETORES_OFICIAIS_MANUAL.find((oficial) => [oficial, nomeCurtoDoSetor(oficial), ...(MESMO_SETOR[oficial] || [])].some((nome) => chaveDeEquipamento(nome) === chave)) ?? null;
}

/** O setor da empresa casa EXATAMENTE com este setor oficial? (ver `oficialExatoDoSetor`). */
export function setorCasaComOficial(setorDaEmpresa: string, oficial: string, vinculos?: Record<string, string>): boolean {
  if (!oficial) return false;
  return oficialExatoDoSetor(setorDaEmpresa, vinculos) === oficial;
}

/** Sugestões de equipamento para UM setor (do pacote do tipo), sem as que o setor já tem (por nome e sinônimo). Só com casamento exato do setor. */
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

/** A faixa de sugestão de ambientes pelo CNAE só aparece quando a empresa não tem NENHUM ambiente (oficial ou próprio): senão "Aceitar" duplicaria tudo. */
export const faixaDeAmbientesVisivel = (podeEditar: boolean, setores: string[]): boolean => podeEditar && setores.length === 0;
