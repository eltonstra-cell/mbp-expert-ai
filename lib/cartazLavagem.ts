// Cartaz "Como lavar as mãos": 14 ilustrações, 4 temas e o conteúdo tirado do POP de lavagem de mãos (nada de memória).
// Regras puras, sem tela. Só o POP APROVADO gera o cartaz; os passos e a lista "Lave as mãos sempre que" vêm do texto do POP.
import type { ProcedimentoOperacionalPadronizado } from "../types/index.ts";
import { formatarData } from "./dataLocal.ts";
import { subitensDoItem, textoDoItem } from "./popConteudoModelo.ts";
import { popComoVigente } from "./popsNorma.ts";

export type TemaDoCartaz = "verde" | "azul" | "terra" | "mostarda";

export type CoresDoTema = { id: TemaDoCartaz; rotulo: string; titulo: string; acento: string; forma: string; quadro: string; fundo: string };

export const TEMAS_DO_CARTAZ: CoresDoTema[] = [
  { id: "verde", rotulo: "Verde", titulo: "#1E4D3A", acento: "#2F6B4F", forma: "#8DB07A", quadro: "#E4EDDD", fundo: "#F4F1E8" },
  { id: "azul", rotulo: "Azul-marinho", titulo: "#1D3557", acento: "#2A4D7C", forma: "#1D3557", quadro: "#DCE6F2", fundo: "#F1F3F6" },
  { id: "terra", rotulo: "Terra", titulo: "#7A3B22", acento: "#C0623A", forma: "#E9B79C", quadro: "#F6E3D8", fundo: "#F7F0E8" },
  { id: "mostarda", rotulo: "Mostarda", titulo: "#6B4A12", acento: "#D9A21B", forma: "#E8C45A", quadro: "#F7EACB", fundo: "#F8F3E4" },
];
export const TEMA_PADRAO: TemaDoCartaz = "verde";

export const eTemaDoCartaz = (valor: unknown): valor is TemaDoCartaz => TEMAS_DO_CARTAZ.some((tema) => tema.id === valor);
export const temaDoCartaz = (id: unknown): CoresDoTema => TEMAS_DO_CARTAZ.find((tema) => tema.id === id) || TEMAS_DO_CARTAZ[0];

/** Modelo do catálogo cujo POP gera o cartaz (por enquanto só ele). */
export const MODELO_DO_CARTAZ = "comp-01";

export const eDeLavagemDeMaos = (pop: Pick<ProcedimentoOperacionalPadronizado, "origemModelo"> | undefined | null): boolean => pop?.origemModelo?.id === MODELO_DO_CARTAZ;

export const MENSAGEM_POP_EM_RASCUNHO = "POP em rascunho";
export const EXPLICACAO_POP_EM_RASCUNHO = "O cartaz só é gerado de um POP aprovado. Envie o POP para aprovação e aprove-o antes de gerar.";

// ===== Ilustrações =====

export const TOTAL_DE_ILUSTRACOES = 14;
export const PASTA_DAS_ILUSTRACOES = "/cartaz-lavagem";

/** Nome do arquivo de cada ilustração, em ordem (01.jpg a 14.jpg). */
export const ARQUIVOS_DAS_ILUSTRACOES: string[] = Array.from({ length: TOTAL_DE_ILUSTRACOES }, (_, indice) => `${String(indice + 1).padStart(2, "0")}.jpg`);

/** Confere a lista de arquivos da pasta: 14 imagens (01 a 14, PNG de origem ou JPG pronto). Mensagem clara quando falta. */
export function conferirIlustracoes(nomes: string[] | null | undefined, extensao: "png" | "jpg" = "png"): { ok: true } | { ok: false; mensagem: string } {
  if (!nomes) return { ok: false, mensagem: "Pasta de ilustrações não encontrada. Coloque as 14 imagens (01 a 14) nela e tente de novo." };
  const esperados = Array.from({ length: TOTAL_DE_ILUSTRACOES }, (_, indice) => `${String(indice + 1).padStart(2, "0")}.${extensao}`);
  const faltam = esperados.filter((nome) => !nomes.includes(nome));
  if (faltam.length === 0) return { ok: true };
  return { ok: false, mensagem: `Ilustrações incompletas: faltam ${faltam.join(", ")} (são necessárias ${TOTAL_DE_ILUSTRACOES}, de ${esperados[0]} a ${esperados[esperados.length - 1]}).` };
}

// ===== Conteúdo vindo do POP =====

const semAcento = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR");

type FiguraDoPasso = {
  numero: number;
  arquivo: string;
  /** Rótulo curto, com as palavras do POP (ex.: "Umedecer", "polpas digitais", "álcool gel"). */
  rotulo: string;
  /** Reconhece, no texto do POP, o passo que esta ilustração mostra (sem acento, minúsculas). */
  combina: RegExp;
};

export const FIGURAS_DO_CARTAZ: FiguraDoPasso[] = [
  { numero: 1, arquivo: "01.jpg", rotulo: "Retirar adornos", combina: /adornos/ },
  { numero: 2, arquivo: "02.jpg", rotulo: "Umedecer mãos e antebraços", combina: /(umedecer|molhar).*(maos|antebracos)/ },
  { numero: 3, arquivo: "03.jpg", rotulo: "Aplicar sabonete", combina: /aplicar o sabonete|aplicar sabonete|sabonete liquido/ },
  { numero: 4, arquivo: "04.jpg", rotulo: "Palma com palma", combina: /palmas das maos uma contra a outra|palma com palma/ },
  { numero: 5, arquivo: "05.jpg", rotulo: "Palma sobre o dorso", combina: /palma.*contra o dorso|palma.*sobre o dorso/ },
  { numero: 6, arquivo: "06.jpg", rotulo: "Entre os dedos", combina: /espacos interdigitais|entrelacar os dedos e/ },
  { numero: 7, arquivo: "07.jpg", rotulo: "Dorso dos dedos na palma", combina: /dorso dos dedos/ },
  { numero: 8, arquivo: "08.jpg", rotulo: "Polegares", combina: /polegar/ },
  { numero: 9, arquivo: "09.jpg", rotulo: "Polpas digitais e unhas", combina: /polpas digitais|pontas dos dedos/ },
  { numero: 10, arquivo: "10.jpg", rotulo: "Punhos", combina: /(friccionar|esfregar|lavar)\b.*punho/ },
  { numero: 11, arquivo: "11.jpg", rotulo: "Enxaguar", combina: /enxaguar/ },
  { numero: 12, arquivo: "12.jpg", rotulo: "Secar com papel toalha", combina: /secar as maos|secar com papel|secar/ },
  { numero: 13, arquivo: "13.jpg", rotulo: "Fechar a torneira com o papel", combina: /papel toalha para fechar|fechar a torneira|para fechar/ },
  { numero: 14, arquivo: "14.jpg", rotulo: "Finalizar com álcool gel", combina: /alcool (em )?gel|antisseptic/ },
];

export type CartaoDoCartaz = { numero: number; arquivo: string; rotulo: string; passoDoPop: number };

export type ConteudoDoCartaz = {
  /** Cartões na ordem do POP, numerados 1..N (só os passos do POP que têm ilustração). */
  cartoes: CartaoDoCartaz[];
  /** Passos do POP sem ilustração (não entram no cartaz). */
  passosSemFigura: { posicao: number; texto: string }[];
  /** Ilustrações sem passo correspondente no POP (não entram no cartaz). */
  figurasSemPasso: number[];
  /** Itens da lista "Lave as mãos sempre que", do POP. */
  sempreQue: string[];
  /** Itens do POP deixados de fora da lista do cartaz, com o motivo. */
  fora: { texto: string; motivo: string }[];
};

/**
 * Liga cada ilustração ao passo do POP que ela mostra, em ordem (o passo pode repetir em ilustrações seguidas: o POP junta
 * "secar" e "fechar a torneira com o papel" no mesmo passo). Passo do POP sem ilustração e ilustração sem passo ficam de fora e são devolvidos.
 */
export function passosDoCartaz(passosDoPop: { texto: string }[]): Pick<ConteudoDoCartaz, "cartoes" | "passosSemFigura" | "figurasSemPasso"> {
  const textos = passosDoPop.map((passo) => semAcento(passo.texto || ""));
  const cartoes: CartaoDoCartaz[] = [];
  const figurasSemPasso: number[] = [];
  const usados = new Set<number>();
  let posicaoMinima = 0;
  for (const figura of FIGURAS_DO_CARTAZ) {
    const indice = textos.findIndex((texto, posicao) => posicao >= posicaoMinima && figura.combina.test(texto));
    if (indice < 0) {
      figurasSemPasso.push(figura.numero);
      continue;
    }
    posicaoMinima = indice;
    usados.add(indice);
    cartoes.push({ numero: cartoes.length + 1, arquivo: figura.arquivo, rotulo: figura.rotulo, passoDoPop: indice + 1 });
  }
  const passosSemFigura = passosDoPop.map((passo, indice) => ({ posicao: indice + 1, texto: passo.texto })).filter((passo) => !usados.has(passo.posicao - 1) && passo.texto.trim());
  return { cartoes, passosSemFigura, figurasSemPasso };
}

const CHIPS: { combina: RegExp; rotulo: string }[] = [
  { combina: /visivelmente sujas|maos sujas/, rotulo: "Mãos sujas" },
  { combina: /luvas/, rotulo: "Depois de usar luvas" },
  { combina: /iniciar e terminar o turno|inicio e fim do turno/, rotulo: "Início e fim do turno" },
  { combina: /manipulacao e preparo de alimentos|manipular alimentos/, rotulo: "Antes de manipular alimentos" },
  { combina: /tossir|espirrar|cocar/, rotulo: "Ao tossir, espirrar ou se coçar" },
  { combina: /recipientes de lixo|manipular .*lixo|lixo/, rotulo: "Depois de manipular o lixo" },
];

/** Contexto de saúde (hospitalar) que o próprio modelo marca para adaptar: não vai para o cartaz. */
const FORA_DO_CARTAZ = /sangue|fluidos corporais/;

function rotuloDoItem(texto: string): string {
  const chave = semAcento(texto);
  const achado = CHIPS.find((chip) => chip.combina.test(chave));
  if (achado) return achado.rotulo;
  const limpo = texto.replace(/[;.]+\s*$/, "").trim();
  return limpo.length > 38 ? `${limpo.slice(0, 37).trimEnd()}…` : limpo.charAt(0).toLocaleUpperCase("pt-BR") + limpo.slice(1);
}

/** Itens do "Realizar higienização das mãos sempre que:" do POP (cuidados especiais). Sem o item no POP, a lista fica vazia (nada é inventado). */
export function sempreQueDoPop(cuidados: Parameters<typeof textoDoItem>[0][] | undefined): Pick<ConteudoDoCartaz, "sempreQue" | "fora"> {
  const item = (cuidados || []).find((candidato) => /sempre que/.test(semAcento(textoDoItem(candidato))));
  if (!item) return { sempreQue: [], fora: [] };
  const sempreQue: string[] = [];
  const fora: ConteudoDoCartaz["fora"] = [];
  for (const sub of subitensDoItem(item)) {
    if (!sub.trim()) continue;
    if (FORA_DO_CARTAZ.test(semAcento(sub))) fora.push({ texto: sub.replace(/[;.]+\s*$/, ""), motivo: "contexto hospitalar (o modelo pede para adaptar)" });
    else {
      const rotulo = rotuloDoItem(sub);
      if (!sempreQue.includes(rotulo)) sempreQue.push(rotulo);
    }
  }
  return { sempreQue, fora };
}

export function conteudoDoCartaz(pop: Pick<ProcedimentoOperacionalPadronizado, "conteudo">): ConteudoDoCartaz {
  const passos = (pop.conteudo?.passos || []).filter((passo) => (passo.texto || "").trim());
  return { ...passosDoCartaz(passos), ...sempreQueDoPop(pop.conteudo?.cuidadosEspeciais) };
}

// ===== Aprovação =====

export type POPDoCartaz = { pop: ProcedimentoOperacionalPadronizado; aprovadoEm: string };

/** O POP aprovado que vale (a versão vigente, mesmo com um rascunho de nova versão em andamento); nulo = "POP em rascunho". */
export function popAprovadoParaOCartaz(pop: ProcedimentoOperacionalPadronizado | undefined | null): POPDoCartaz | null {
  if (!pop) return null;
  const vigente = popComoVigente(pop);
  if (!vigente || vigente.status !== "Aprovado" || !vigente.aprovacao) return null;
  return { pop: vigente, aprovadoEm: vigente.aprovacao.em };
}

export function podeGerarOCartaz(pop: ProcedimentoOperacionalPadronizado | undefined | null): { pode: true } | { pode: false; mensagem: string; explicacao: string } {
  return popAprovadoParaOCartaz(pop) ? { pode: true } : { pode: false, mensagem: MENSAGEM_POP_EM_RASCUNHO, explicacao: EXPLICACAO_POP_EM_RASCUNHO };
}

/** "Beyond Nutri · POP-05 · versão 1.0 · aprovado em 21/10/2026". */
export function rodapeDoCartaz(dados: { empresa: string; codigo: string; versao: string; aprovadoEm: string }): string {
  return [dados.empresa, dados.codigo, dados.versao ? `versão ${dados.versao}` : "", dados.aprovadoEm ? `aprovado em ${formatarData(dados.aprovadoEm)}` : ""].filter(Boolean).join(" · ");
}

export type DadosDoCartaz = {
  tema: TemaDoCartaz;
  conteudo: Pick<ConteudoDoCartaz, "cartoes" | "sempreQue">;
  rodape: string;
  /** Logotipo da empresa (data URL); sem ele a posição fica vazia no PDF. */
  logotipo?: string;
};

/** Subtítulo conforme a quantidade de passos do cartaz ("Siga os 14 passos, na ordem."). */
export function subtituloDoCartaz(total: number): string {
  return `Siga ${total === 1 ? "o passo" : `os ${total} passos`}, na ordem.`;
}

/** Quadro "Lave as mãos sempre que": vai na posição seguinte ao último cartão; se sobrar espaço na linha, ocupa as duas colunas finais. */
export function posicaoDoQuadro(totalDeCartoes: number): { indice: number; colunas: 1 | 2 } {
  const resto = (totalDeCartoes + 1) % 3;
  return { indice: totalDeCartoes, colunas: resto === 2 ? 2 : 1 };
}
