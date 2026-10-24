// UF brasileira: só as 27 siglas válidas passam ("EX" de exterior, vazio ou lixo nunca chegam ao formulário).
// Se a UF da consulta vier inválida: UF da outra fonte, depois dedução pelo CEP (faixas gerais dos Correios) ou pelo município (capitais), por último VAZIA.
// A dedução é só sugestão: o campo avisa "UF não veio da consulta, confirme".

export const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"] as const;
export type UF = (typeof UFS)[number];

export function ufValida(valor: string | undefined | null): valor is UF {
  return UFS.includes(String(valor || "").trim().toUpperCase() as UF);
}

export const normalizarUf = (valor: string | undefined | null): UF | "" => (ufValida(valor) ? (String(valor).trim().toUpperCase() as UF) : "");

// Faixas de CEP (5 primeiros dígitos) por UF, as faixas gerais dos Correios.
const FAIXAS_DE_CEP: [number, number, UF][] = [
  [1000, 19999, "SP"], [20000, 28999, "RJ"], [29000, 29999, "ES"], [30000, 39999, "MG"], [40000, 48999, "BA"], [49000, 49999, "SE"],
  [50000, 56999, "PE"], [57000, 57999, "AL"], [58000, 58999, "PB"], [59000, 59999, "RN"], [60000, 63999, "CE"], [64000, 64999, "PI"],
  [65000, 65999, "MA"], [66000, 68899, "PA"], [68900, 68999, "AP"], [69000, 69299, "AM"], [69300, 69399, "RR"], [69400, 69899, "AM"],
  [69900, 69999, "AC"], [70000, 72799, "DF"], [72800, 72999, "GO"], [73000, 73699, "DF"], [73700, 76799, "GO"], [76800, 76999, "RO"],
  [77000, 77999, "TO"], [78000, 78899, "MT"], [78900, 78999, "RO"], [79000, 79999, "MS"], [80000, 87999, "PR"], [88000, 89999, "SC"], [90000, 99999, "RS"],
];

export function ufPorCep(cep: string | undefined | null): UF | "" {
  const digitos = String(cep || "").replace(/\D/g, "");
  if (digitos.length !== 8) return "";
  const prefixo = Number(digitos.slice(0, 5));
  return FAIXAS_DE_CEP.find(([de, ate]) => prefixo >= de && prefixo <= ate)?.[2] || "";
}

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR").trim();
const CAPITAIS: Record<string, UF> = {
  "rio branco": "AC", "maceio": "AL", "macapa": "AP", "manaus": "AM", "salvador": "BA", "fortaleza": "CE", "brasilia": "DF", "vitoria": "ES", "goiania": "GO",
  "sao luis": "MA", "cuiaba": "MT", "campo grande": "MS", "belo horizonte": "MG", "belem": "PA", "joao pessoa": "PB", "curitiba": "PR", "recife": "PE",
  "teresina": "PI", "rio de janeiro": "RJ", "natal": "RN", "porto alegre": "RS", "porto velho": "RO", "boa vista": "RR", "florianopolis": "SC", "sao paulo": "SP",
  "aracaju": "SE", "palmas": "TO",
};
export const ufPorMunicipio = (municipio: string | undefined | null): UF | "" => CAPITAIS[semAcento(municipio || "")] || "";

export type UfResolvida = { uf: UF | ""; origem: "consulta" | "outra-fonte" | "cep" | "municipio" | "vazia"; aviso: string };

/** `outraFonte`: a UF que a outra fonte da consulta trouxe, se trouxe. O aviso só existe quando a UF NÃO veio da consulta. */
export function resolverUf(entrada: { uf?: string | null; outraFonte?: string | null; cep?: string | null; municipio?: string | null }): UfResolvida {
  const daConsulta = normalizarUf(entrada.uf);
  if (daConsulta) return { uf: daConsulta, origem: "consulta", aviso: "" };
  const aviso = "UF não veio da consulta, confirme.";
  const daOutra = normalizarUf(entrada.outraFonte);
  if (daOutra) return { uf: daOutra, origem: "outra-fonte", aviso: "" };
  const doCep = ufPorCep(entrada.cep);
  if (doCep) return { uf: doCep, origem: "cep", aviso: `${aviso} Deduzida pelo CEP.` };
  const doMunicipio = ufPorMunicipio(entrada.municipio);
  if (doMunicipio) return { uf: doMunicipio, origem: "municipio", aviso: `${aviso} Deduzida pelo município.` };
  return { uf: "", origem: "vazia", aviso: `${aviso} Informe a UF.` };
}
