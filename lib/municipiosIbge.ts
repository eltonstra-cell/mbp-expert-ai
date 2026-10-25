// Nome do município com acento, lido da lista oficial do IBGE (API de localidades). Se a lista não vier ou o nome não casar, nada é inventado:
// o nome fica como a consulta mandou (só com a caixa ajustada).

const semAcento = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");

/** Procura o município da consulta na lista do IBGE da mesma UF; devolve o nome oficial só se houver UM nome que case. */
export function acharMunicipio(nomeDaConsulta: string | undefined | null, nomesOficiais: string[]): string {
  const alvo = semAcento(nomeDaConsulta || "");
  if (!alvo) return "";
  const iguais = nomesOficiais.filter((nome) => semAcento(nome) === alvo);
  return iguais.length === 1 ? iguais[0] : "";
}

const cache = new Map<string, string[]>();

/** Lista de municípios da UF (servidor; guarda em memória). Falha de rede = lista vazia. */
export async function municipiosDaUf(uf: string): Promise<string[]> {
  if (!/^[A-Z]{2}$/.test(uf)) return [];
  const guardado = cache.get(uf);
  if (guardado) return guardado;
  try {
    const resposta = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`, {
      headers: { Accept: "application/json", "User-Agent": "PontoCerto/2.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!resposta.ok) return [];
    const dados = (await resposta.json()) as { nome?: string }[];
    const nomes = (Array.isArray(dados) ? dados : []).map((item) => String(item.nome || "")).filter(Boolean);
    if (nomes.length) cache.set(uf, nomes);
    return nomes;
  } catch {
    return [];
  }
}
