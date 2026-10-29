// Endereço e município da consulta de CNPJ vêm em CAIXA ALTA e, às vezes, sem acento ("SAO PAULO", "BRIG FARIA LIMA").
// Aqui só se muda a caixa e se escreve por extenso o que é abreviatura de logradouro; acento só volta pela lista oficial de municípios do IBGE
// (lib/municipiosIbge.ts). Texto que já tem letra minúscula é do RT ou já está bem escrito: não é mexido. Razão social não passa por aqui.

const LIGACAO = new Set(["de", "da", "do", "das", "dos", "e", "em", "no", "na", "nos", "nas"]);

// Abreviaturas usuais de endereço; só viram "Abrev." quando o texto vem como palavra solta (sem ponto).
const ABREVIATURA: Record<string, string> = {
  av: "Av.", r: "R.", pc: "Pç.", al: "Al.", tv: "Tv.", rod: "Rod.", est: "Est.", brig: "Brig.", dr: "Dr.", dra: "Dra.",
  prof: "Prof.", profa: "Profa.", cel: "Cel.", gen: "Gen.", mal: "Mal.", eng: "Eng.", alm: "Alm.", cap: "Cap.", ten: "Ten.",
  sgt: "Sgt.", pres: "Pres.", dep: "Dep.", sen: "Sen.", sta: "Sta.", sto: "Sto.",
};

const ALGARISMO_ROMANO = /^(?:i{1,3}|iv|v|vi{1,3}|ix|x{1,3}|xi{1,3}|xiv|xv|xvi{1,3}|xix|xx)$/;

const maiuscula = (palavra: string) => palavra.charAt(0).toLocaleUpperCase("pt-BR") + palavra.slice(1);

function palavraDeEndereco(bruta: string, primeira: boolean): string {
  const palavra = bruta.toLocaleLowerCase("pt-BR");
  if (/^\d/.test(palavra) || palavra.includes("/")) return bruta;
  if (ABREVIATURA[palavra]) return ABREVIATURA[palavra];
  if (!primeira && LIGACAO.has(palavra)) return palavra;
  if (ALGARISMO_ROMANO.test(palavra) && palavra.length > 1) return palavra.toLocaleUpperCase("pt-BR");
  return palavra.split("-").map(maiuscula).join("-");
}

/** "BRIG FARIA LIMA" -> "Brig. Faria Lima"; "SAO PAULO" -> "Sao Paulo". Texto com minúscula fica como está. */
export function textoDeEndereco(valor: string | undefined | null): string {
  const texto = (valor || "").replace(/\s+/g, " ").trim();
  if (!texto) return "";
  if (/[a-zà-ÿ]/.test(texto)) return texto;
  return texto.split(" ").map((palavra, indice) => palavraDeEndereco(palavra, indice === 0)).join(" ");
}

/** Campos de texto livre do cadastro da empresa que são aparados ao salvar (nunca CNPJ, e-mail, telefone, CNAE nem CEP). */
export const CAMPOS_DE_TEXTO_DA_EMPRESA = ["nomeFantasia", "razaoSocial", "logradouro", "numero", "complemento", "bairro", "municipio", "cargoResponsavel"] as const;

/** Apara as pontas e junta espaços repetidos ("SALA  23C" vira "SALA 23C"). Não muda maiúsculas nem acentos. */
export const compactarEspacos = (texto: string): string => texto.replace(/\s+/g, " ").trim();

/**
 * Ao salvar: só os campos EDITADOS nesta sessão (valor diferente do salvo; empresa nova = todos) são aparados e compactados.
 * Devolve só o que mudou; campo igual ao salvo nunca é tocado (dados existentes não são alterados em lote).
 */
export function camposAparadosAoSalvar(form: Record<string, unknown>, salvo: Record<string, unknown> | undefined, campos: readonly string[] = CAMPOS_DE_TEXTO_DA_EMPRESA): Record<string, string> {
  const mudou: Record<string, string> = {};
  for (const campo of campos) {
    const atual = form[campo];
    if (typeof atual !== "string") continue;
    if (salvo && atual === salvo[campo]) continue;
    const limpo = compactarEspacos(atual);
    if (limpo !== atual) mudou[campo] = limpo;
  }
  return mudou;
}
