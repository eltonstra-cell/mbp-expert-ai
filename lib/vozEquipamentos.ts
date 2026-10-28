// Voz com interpretação em Equipamentos: transforma a frase falada em itens (equipamento, quantidade e ambiente).
// Interpretador LOCAL: nenhuma IA externa interpreta a frase (a transcrição em texto continua como já funciona; o áudio nunca é guardado).
// Nada daqui grava: o resultado vai para uma linha de conferência e só vira equipamento depois que a pessoa confirma.

export type SituacaoDoAmbiente = "ok" | "inexistente" | "escolher" | "faltando";

export type ItemInterpretado = {
  nome: string;
  quantidade: number;
  /** Ambiente cadastrado (nome exato do cadastro); vazio quando não foi possível resolver. */
  ambiente: string;
  /** O que foi dito, quando o ambiente não existe no cadastro. */
  falado?: string;
  /** Ambientes possíveis quando o que foi dito serve para mais de um. */
  candidatos?: string[];
  situacao: SituacaoDoAmbiente;
};

export type ResultadoDaVoz = { entendeu: boolean; itens: ItemInterpretado[] };

const NUMEROS: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10 };
const LOCATIVAS = new Set(["na", "no", "nas", "nos", "em"]);
const GENERICAS = new Set(["de", "da", "do", "das", "dos"]);
const ARTIGOS = new Set(["o", "a", "os", "as"]);
const VERBOS = new Set(["adicionar", "adicione", "cadastrar", "cadastre", "incluir", "inclua", "colocar", "coloque", "registrar", "registre", "tem", "temos", "ha", "existe", "existem"]);
const PALAVRAS_FRACAS = new Set(["de", "da", "do", "das", "dos", "na", "no", "nas", "nos", "em", "e", "o", "a", "os", "as", "um", "uma", "ao", "aos"]);
const NAO_SINGULARIZAR = new Set(["gas", "pires", "lapis", "onibus", "cais", "inox", "mais", "tres"]);

/** Sem acento, minúsculas e sem espaços repetidos. */
export function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
}

/**
 * Ambiente cadastrado que corresponde ao que foi dito (sem acento nem diferença de maiúsculas): nome igual ou começo do nome
 * em palavra inteira ("recebimento" serve para "Recebimento de matérias-primas…"). Mais de um possível: "escolher".
 */
export function resolverAmbiente(falado: string, ambientes: string[]): { tipo: "ok"; ambiente: string } | { tipo: "escolher"; candidatos: string[] } | null {
  const chave = semAcento(falado);
  if (chave.length < 3) return null;
  const palavras = chave.split(" ");
  if (palavras.every((palavra) => PALAVRAS_FRACAS.has(palavra))) return null;
  const iguais = ambientes.filter((ambiente) => semAcento(ambiente) === chave);
  if (iguais.length === 1) return { tipo: "ok", ambiente: iguais[0] };
  if (iguais.length > 1) return { tipo: "escolher", candidatos: iguais };
  const comecam = ambientes.filter((ambiente) => {
    const nome = semAcento(ambiente);
    return nome.startsWith(`${chave} `) || nome.startsWith(`${chave}/`) || nome.startsWith(`${chave}(`);
  });
  if (comecam.length === 1) return { tipo: "ok", ambiente: comecam[0] };
  if (comecam.length > 1) return { tipo: "escolher", candidatos: comecam };
  return null;
}

type Palavra = { texto: string; chave: string };
type Segmento = { palavras: Palavra[]; ambiente?: ItemAmbiente };
type ItemAmbiente = { situacao: SituacaoDoAmbiente; ambiente: string; falado?: string; candidatos?: string[] };

function palavrasDa(frase: string): Palavra[] {
  return frase
    .replace(/[.;!?]+/g, " ")
    .replace(/,/g, " , ")
    .split(/\s+/)
    .filter(Boolean)
    .map((texto) => ({ texto, chave: semAcento(texto) }));
}

const ehSeparador = (palavra: Palavra) => palavra.chave === "," || palavra.chave === "e";

/** Tenta um ambiente cadastrado começando em `inicio` (o mais longo primeiro). Devolve quantas palavras ocupa. */
function ambienteEm(palavras: Palavra[], inicio: number, ambientes: string[]): { tamanho: number; achado: NonNullable<ReturnType<typeof resolverAmbiente>> } | null {
  for (let tamanho = Math.min(6, palavras.length - inicio); tamanho >= 1; tamanho--) {
    const trecho = palavras.slice(inicio, inicio + tamanho);
    if (trecho.some((palavra) => palavra.chave === ",")) continue;
    const achado = resolverAmbiente(trecho.map((palavra) => palavra.texto).join(" "), ambientes);
    if (achado) return { tamanho, achado };
  }
  return null;
}

function separarEmSegmentos(palavras: Palavra[], ambientes: string[]): Segmento[] {
  const segmentos: Segmento[] = [];
  let atual: Segmento = { palavras: [] };
  const fechar = () => {
    if (atual.palavras.length > 0) segmentos.push(atual);
    atual = { palavras: [] };
  };
  let i = 0;
  while (i < palavras.length) {
    const palavra = palavras[i];
    if (ehSeparador(palavra)) {
      fechar();
      i += 1;
      continue;
    }
    const ehLocativa = LOCATIVAS.has(palavra.chave);
    const ehGenerica = GENERICAS.has(palavra.chave);
    // Preposição + ambiente cadastrado (na/no/em sempre; de/da/do só quando o que vem depois é um ambiente do cadastro).
    if ((ehLocativa || ehGenerica) && atual.palavras.length > 0 && i + 1 < palavras.length) {
      const depois = ambienteEm(palavras, i + 1, ambientes);
      if (depois) {
        atual.ambiente = depois.achado.tipo === "ok" ? { situacao: "ok", ambiente: depois.achado.ambiente } : { situacao: "escolher", ambiente: "", candidatos: depois.achado.candidatos };
        i += 1 + depois.tamanho;
        continue;
      }
      if (ehLocativa) {
        // Lugar que não está no cadastro: vai até o próximo separador.
        let fim = i + 1;
        while (fim < palavras.length && !ehSeparador(palavras[fim])) fim += 1;
        const falado = palavras.slice(i + 1, fim).map((item) => item.texto).join(" ");
        if (falado) atual.ambiente = { situacao: "inexistente", ambiente: "", falado };
        i = fim;
        continue;
      }
    }
    // Ambiente cadastrado dito sem preposição, no fim do segmento ("geladeira cozinha").
    if (atual.palavras.length > 0 && !atual.ambiente) {
      const solto = ambienteEm(palavras, i, ambientes);
      const fimDoTrecho = solto ? i + solto.tamanho : -1;
      if (solto && (fimDoTrecho >= palavras.length || ehSeparador(palavras[fimDoTrecho]))) {
        atual.ambiente = solto.achado.tipo === "ok" ? { situacao: "ok", ambiente: solto.achado.ambiente } : { situacao: "escolher", ambiente: "", candidatos: solto.achado.candidatos };
        i = fimDoTrecho;
        continue;
      }
    }
    atual.palavras.push(palavra);
    i += 1;
  }
  fechar();
  return segmentos;
}

/** Plural simples: geladeiras → geladeira, fogões → fogão, freezers → freezer, liquidificadores → liquidificador. */
export function singularizar(palavra: string): string {
  const chave = semAcento(palavra);
  if (chave.length <= 3 || !chave.endsWith("s") || NAO_SINGULARIZAR.has(chave) || PALAVRAS_FRACAS.has(chave)) return palavra;
  const minuscula = palavra.toLocaleLowerCase("pt-BR");
  if (/(õe|ãe)s$/.test(minuscula)) return minuscula.replace(/(õe|ãe)s$/, "ão");
  if (/ãos$/.test(minuscula)) return minuscula.slice(0, -1);
  if (/ais$/.test(minuscula)) return `${minuscula.slice(0, -3)}al`;
  if (/eis$/.test(minuscula)) return `${minuscula.slice(0, -3)}el`;
  if (/ores$/.test(minuscula) || /zes$/.test(minuscula)) return minuscula.slice(0, -2);
  if (/ss$/.test(minuscula) || /is$/.test(minuscula) || /us$/.test(minuscula)) return palavra;
  return minuscula.slice(0, -1);
}

function maiuscula(texto: string): string {
  return texto ? texto.charAt(0).toLocaleUpperCase("pt-BR") + texto.slice(1) : texto;
}

function lerQuantidade(palavras: Palavra[]): { quantidade: number; resto: Palavra[]; plural: boolean } {
  const [primeira, ...resto] = palavras;
  if (!primeira) return { quantidade: 1, resto: [], plural: false };
  const digitos = /^(\d{1,3})x?$/.exec(primeira.chave);
  if (digitos) return { quantidade: Math.max(1, Number(digitos[1])), resto, plural: Number(digitos[1]) > 1 };
  if (primeira.chave in NUMEROS) return { quantidade: NUMEROS[primeira.chave], resto, plural: NUMEROS[primeira.chave] > 1 };
  return { quantidade: 1, resto: palavras, plural: false };
}

function nomeDoSegmento(palavras: Palavra[]): { nome: string; quantidade: number } | null {
  let corpo = palavras;
  while (corpo.length > 0 && (VERBOS.has(corpo[0].chave) || ARTIGOS.has(corpo[0].chave))) corpo = corpo.slice(1);
  const { quantidade, resto } = lerQuantidade(corpo);
  let nomePalavras = resto;
  while (nomePalavras.length > 0 && ARTIGOS.has(nomePalavras[0].chave)) nomePalavras = nomePalavras.slice(1);
  if (nomePalavras.length === 0 || nomePalavras.every((palavra) => PALAVRAS_FRACAS.has(palavra.chave) || /^\d+$/.test(palavra.chave))) return null;
  const emMinuscula = nomePalavras.map((palavra) => palavra.texto.toLocaleLowerCase("pt-BR"));
  // O nome vai ao singular quando há mais de um, ou quando a primeira palavra já está no plural.
  const primeiraNoPlural = /s$/.test(semAcento(emMinuscula[0])) && singularizar(emMinuscula[0]) !== emMinuscula[0];
  const singular = quantidade > 1 || primeiraNoPlural ? emMinuscula.map((palavra, indice) => (indice === 0 || /s$/.test(semAcento(palavra)) ? singularizar(palavra) : palavra)) : emMinuscula;
  return { nome: maiuscula(singular.join(" ")), quantidade };
}

/**
 * Interpreta a frase falada. Exemplos: "geladeira na cozinha", "geladeira cozinha", "duas geladeiras e um freezer na câmara fria",
 * "3 balanças no recebimento". Itens sem ambiente próprio usam o do item seguinte (ou, no fim da frase, o do anterior).
 * Não entendeu nada (sem nome de equipamento): `entendeu` falso e nenhum item.
 */
export function interpretarEquipamentos(frase: string, ambientes: string[]): ResultadoDaVoz {
  const palavras = palavrasDa(frase || "");
  if (palavras.length === 0) return { entendeu: false, itens: [] };
  const segmentos = separarEmSegmentos(palavras, ambientes);
  const lidos = segmentos
    .map((segmento) => ({ lido: nomeDoSegmento(segmento.palavras), ambiente: segmento.ambiente }))
    .filter((item): item is { lido: { nome: string; quantidade: number }; ambiente: ItemAmbiente | undefined } => item.lido !== null);
  if (lidos.length === 0) return { entendeu: false, itens: [] };
  const itens = lidos.map((item, indice): ItemInterpretado => {
    let ambiente = item.ambiente;
    for (let j = indice + 1; !ambiente && j < lidos.length; j++) ambiente = lidos[j].ambiente;
    for (let j = indice - 1; !ambiente && j >= 0; j--) ambiente = lidos[j].ambiente;
    if (!ambiente) return { ...item.lido, ambiente: "", situacao: "faltando" };
    return { ...item.lido, ambiente: ambiente.ambiente, situacao: ambiente.situacao, ...(ambiente.falado ? { falado: ambiente.falado } : {}), ...(ambiente.candidatos ? { candidatos: ambiente.candidatos } : {}) };
  });
  return { entendeu: true, itens };
}

/** "Geladeira · Cozinha · 1" (ambiente que falta ou não existe aparece como pergunta). */
export function linhaDeConferencia(item: Pick<ItemInterpretado, "nome" | "quantidade" | "ambiente" | "situacao" | "falado">): string {
  const lugar = item.situacao === "ok" ? item.ambiente : item.situacao === "inexistente" ? `${item.falado} (não existe)` : "ambiente?";
  return `${item.nome} · ${lugar} · ${item.quantidade}`;
}

/** O item só pode ser confirmado com um ambiente do cadastro escolhido ou criado de propósito. */
export function podeConfirmar(item: Pick<ItemInterpretado, "ambiente" | "nome" | "quantidade">): boolean {
  return Boolean(item.ambiente.trim()) && (item.nome.match(/\p{L}/gu) || []).length >= 3 && item.quantidade >= 1;
}
