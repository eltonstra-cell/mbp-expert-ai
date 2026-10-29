// Nomes dos 13 setores oficiais do Manual para mostrar nas telas. Só apresentação: o nome oficial completo (em setoresManual) é o identificador e nunca muda.
import { SETORES_OFICIAIS_MANUAL } from "./manualBase.ts";

const [RECEBIMENTO, ESTOQUE, DML, GAS, COZINHA, HIGIENIZACAO, SALAO, VEST_F, BAN_F, VEST_M, BAN_M, CLI_F, CLI_M] = SETORES_OFICIAIS_MANUAL;

/** Nome curto do setor oficial para chips e listas apertadas; o nome oficial completo vai no title. */
const NOME_CURTO_DO_SETOR: Record<string, string> = {
  [RECEBIMENTO]: "Recebimento",
  [ESTOQUE]: "Estoque",
  [DML]: "DML",
  [GAS]: "Central de gás",
  [COZINHA]: "Cozinha",
  [HIGIENIZACAO]: "Higienização",
  [SALAO]: "Refeitório",
  [VEST_F]: "Vestiário fem.",
  [BAN_F]: "Banheiro colab. fem.",
  [VEST_M]: "Vestiário masc.",
  [BAN_M]: "Banheiro colab. masc.",
  [CLI_F]: "Banheiro clientes fem.",
  [CLI_M]: "Banheiro clientes masc.",
};
export const nomeCurtoDoSetor = (nome: string): string => NOME_CURTO_DO_SETOR[nome] || nome;

/**
 * Nome EXIBIDO nas telas de cadastro: por extenso curto, sem "fem.", "masc." nem "colab.". É só apresentação: o identificador gravado
 * (nome oficial completo em setoresManual) nunca muda, e os equipamentos continuam ligados a ele. `nomeCurtoDoSetor` segue existindo para comparar nomes.
 */
const NOME_EXIBIDO_DO_SETOR: Record<string, string> = {
  [VEST_F]: "Vestiário feminino",
  [BAN_F]: "Banheiro feminino · colaboradores",
  [VEST_M]: "Vestiário masculino",
  [BAN_M]: "Banheiro masculino · colaboradores",
  [CLI_F]: "Banheiro feminino · clientes",
  [CLI_M]: "Banheiro masculino · clientes",
};
export const nomeExibidoDoSetor = (nome: string): string => NOME_EXIBIDO_DO_SETOR[nome] || nomeCurtoDoSetor(nome);

const palavrasDoNome = (texto: string): string[] =>
  texto.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR").split(/[^a-z0-9]+/).filter(Boolean);

/**
 * Segunda linha do setor oficial (o nome oficial completo) SÓ quando acrescenta algo: se repete o nome exibido (mesmas palavras, com até 2 a mais,
 * como "de"), fica vazia. Setor sem nome oficial diferente (ex.: Central de gás) também fica sem segunda linha: o catálogo (manualBase) não traz descrição.
 */
export function descricaoDoSetor(nome: string): string {
  const exibido = nomeExibidoDoSetor(nome);
  if (exibido === nome) return "";
  const dele = palavrasDoNome(exibido);
  const dela = palavrasDoNome(nome);
  const radical = (palavra: string) => palavra.slice(0, 6);
  const contidas = dele.every((palavra) => dela.some((outra) => radical(outra) === radical(palavra)));
  return contidas && dela.length - dele.length <= 2 ? "" : nome;
}
