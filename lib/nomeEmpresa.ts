// Nome de exibição da empresa: UMA função só, usada pelo seletor "Empresa ativa" e por todas as listas e telas.
// Não altera o dado salvo nem o CNPJ. PDFs e relatórios emitidos mantêm a razão social do documento.
import { nomeSemNumerosNoInicio } from "./navigation.ts";

const CONECTORES = new Set(["da", "das", "de", "do", "dos", "e"]);

/** Tira o número do começo ("44.150.273 ELTON") e, se o nome veio todo em maiúsculas, põe em formato de nome próprio. */
export function nomeEmFormatoNatural(nome?: string): string | undefined {
  if (nome) nome = nomeSemNumerosNoInicio(nome);
  if (!nome || nome !== nome.toUpperCase()) return nome;
  return nome
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((palavra, indice) => (indice > 0 && CONECTORES.has(palavra) ? palavra : palavra.charAt(0).toLocaleUpperCase("pt-BR") + palavra.slice(1)))
    .join(" ");
}

type EmpresaComNome = { nomeFantasia?: string; razaoSocial?: string };

/** O nome da empresa na tela: o fantasia (ou a razão social, se o fantasia vier vazio ou for só CNPJ), em formato natural. */
export function nomeDeExibicaoDaEmpresa(empresa?: EmpresaComNome | null): string {
  if (!empresa) return "Empresa";
  const fantasia = (empresa.nomeFantasia || "").trim();
  const pareceCnpj = /^[\d.\/\-\s]+$/.test(fantasia);
  return nomeEmFormatoNatural(pareceCnpj || !fantasia ? empresa.razaoSocial || fantasia : fantasia) || "Empresa";
}
