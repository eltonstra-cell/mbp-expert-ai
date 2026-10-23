// Capa opcional do POP: estilos, cores, ícones e o "modelo de exibição" da capa (o que aparece em cada estilo).
// Regras puras, sem tela. A capa vem DESLIGADA por padrão e nunca usa fotos. Os ícones são os de public/capas/.
import mapaDeIcones from "../public/capas/modelos-icones.json" with { type: "json" };
import listaDeIcones from "../public/capas/icones.json" with { type: "json" };
import type { CapaDosPops, ProcedimentoOperacionalPadronizado } from "../types/index.ts";
import { CONJUNTO_DA_NORMA } from "./popsNorma.ts";

export type EstiloDeCapa = "A" | "B" | "C" | "D" | "E" | "F";
export type CorDeCapa = "laranja" | "verde" | "terra" | "ambar" | "grafite" | "pb";
export type TipoDeIcone = "colorido" | "traco";

export type { CapaDosPops };

export type CapaCompleta = {
  ativa: boolean;
  estilo: EstiloDeCapa;
  cor: CorDeCapa;
  icone: TipoDeIcone;
  logotipo?: string;
};

export const ESTILOS_DE_CAPA: { id: EstiloDeCapa; rotulo: string; descricao: string }[] = [
  { id: "A", rotulo: "Simples", descricao: "Só texto." },
  { id: "B", rotulo: "Com ícone", descricao: "Barra colorida no topo, ícone e texto centralizados." },
  { id: "C", rotulo: "Com ícone e logotipo", descricao: "Logotipo no canto; empresa e CNPJ no rodapé." },
  { id: "D", rotulo: "Faixa lateral", descricao: "Faixa colorida à esquerda e texto à esquerda." },
  { id: "E", rotulo: "Moldura", descricao: "Moldura fina e ícone dentro de um círculo." },
  { id: "F", rotulo: "Bloco claro no topo", descricao: "Ícone grande sobre bloco na cor clara, título embaixo." },
];

export const CORES_DE_CAPA: { id: CorDeCapa; rotulo: string; hex: string; clara: string; doIcone: string }[] = [
  { id: "laranja", rotulo: "Laranja", hex: "#E8760A", clara: "#FCEBD7", doIcone: "#12202B" },
  { id: "verde", rotulo: "Verde", hex: "#1F8A4C", clara: "#DDF1E5", doIcone: "#1F8A4C" },
  { id: "terra", rotulo: "Terra", hex: "#B5532A", clara: "#F3E1D8", doIcone: "#B5532A" },
  { id: "ambar", rotulo: "Âmbar", hex: "#E8B04B", clara: "#FBF0D5", doIcone: "#12202B" },
  { id: "grafite", rotulo: "Grafite", hex: "#3A4750", clara: "#E4E8EB", doIcone: "#3A4750" },
  { id: "pb", rotulo: "Preto e branco", hex: "#12202B", clara: "#E9ECEF", doIcone: "#12202B" },
];

export const ESTILO_PADRAO: EstiloDeCapa = "C";
export const COR_PADRAO: CorDeCapa = "laranja";
export const ICONE_PADRAO: TipoDeIcone = "colorido";
export const LOGOTIPO_MAX_LARGURA = 600;
export const LOGOTIPO_ALVO_BYTES = 200 * 1024;

export type IconeDeCapa = { id: string; rotulo: string; svg: string; traco: string };
export const ICONES_DE_CAPA: IconeDeCapa[] = listaDeIcones as IconeDeCapa[];
const IDS_DOS_ICONES = new Set(ICONES_DE_CAPA.map((icone) => icone.id));
export const ICONE_SEM_ENTRADA = "padrao";

const MAPA = mapaDeIcones as Record<string, string>;

export const eEstilo = (valor: unknown): valor is EstiloDeCapa => ESTILOS_DE_CAPA.some((estilo) => estilo.id === valor);
export const eCor = (valor: unknown): valor is CorDeCapa => CORES_DE_CAPA.some((cor) => cor.id === valor);
export const eIconeConhecido = (valor: unknown): valor is string => typeof valor === "string" && IDS_DOS_ICONES.has(valor);

/** Config completa com os padrões: desligada, estilo C, laranja, ícone colorido, sem logotipo. Valor inválido volta ao padrão. */
export function capaCompleta(capa: CapaDosPops | undefined | null): CapaCompleta {
  const logotipo = typeof capa?.logotipo === "string" && /^data:image\/(png|jpeg);base64,/.test(capa.logotipo) ? capa.logotipo : undefined;
  return {
    ativa: capa?.ativa === true,
    estilo: eEstilo(capa?.estilo) ? capa!.estilo! : ESTILO_PADRAO,
    cor: eCor(capa?.cor) ? capa!.cor! : COR_PADRAO,
    icone: capa?.icone === "traco" ? "traco" : ICONE_PADRAO,
    ...(logotipo ? { logotipo } : {}),
  };
}

export function corDaCapa(cor: CorDeCapa) {
  return CORES_DE_CAPA.find((item) => item.id === cor) || CORES_DE_CAPA[0];
}

type PopParaIcone = Pick<ProcedimentoOperacionalPadronizado, "origemModelo" | "catalogoId"> & { iconeCapa?: string };

/** Chave do mapa de ícones: modelo do catálogo, POP do conjunto da norma ("norma:POP-01"…) ou POP em branco. */
export function chaveDoMapaDeIcones(pop: PopParaIcone): string {
  if (pop.origemModelo?.id) return pop.origemModelo.id;
  if (pop.catalogoId) {
    const posicao = CONJUNTO_DA_NORMA.findIndex((definicao) => definicao.catalogoId === pop.catalogoId);
    if (posicao >= 0) return `norma:POP-${String(posicao + 1).padStart(2, "0")}`;
  }
  return "em-branco";
}

/** Ícone do POP: a escolha feita para este POP (se for um dos 16); senão o do mapa; sem entrada, "padrao". */
export function iconeDoPop(pop: PopParaIcone): string {
  if (eIconeConhecido(pop.iconeCapa)) return pop.iconeCapa;
  const doMapa = MAPA[chaveDoMapaDeIcones(pop)];
  return eIconeConhecido(doMapa) ? doMapa : ICONE_SEM_ENTRADA;
}

export function urlDoIcone(id: string, tipo: TipoDeIcone): string {
  const seguro = eIconeConhecido(id) ? id : ICONE_SEM_ENTRADA;
  return tipo === "traco" ? `/capas/icones-traco/${seguro}.svg` : `/capas/icones-svg/${seguro}.svg`;
}

export type DadosDaCapa = {
  codigo: string;
  titulo: string;
  /** Ex.: "versão 1.0". */
  versao: string;
  empresa: string;
  /** CNPJ já formatado; vazio oculta o lado direito do rodapé. */
  cnpj: string;
  iconeId: string;
};

export type ModeloDaCapa = {
  estilo: EstiloDeCapa;
  cor: CorDeCapa;
  hex: string;
  clara: string;
  corDoIcone: string;
  /** Só os estilos com ícone. */
  icone: { url: string; tipo: TipoDeIcone } | null;
  /** Faixa/barra colorida de cada estilo. */
  barraCurta: boolean;
  logotipo: { presente: boolean; src?: string } | null;
  codigo: string;
  titulo: string;
  versao: string;
  /** Só o estilo C leva empresa/CNPJ no rodapé; os demais mostram a empresa junto do título. */
  rodape: { esquerda: string; direita: string } | null;
  empresaNoCorpo: string;
};

const ESTILOS_COM_ICONE: EstiloDeCapa[] = ["B", "C", "D", "E", "F"];

/**
 * O que aparece na capa em cada estilo. `previa` liga a caixa tracejada do logotipo quando não há logotipo
 * (só na pré-visualização da configuração: no PDF final a posição fica vazia).
 */
export function modeloDaCapa(config: CapaCompleta, dados: DadosDaCapa, previa = false): ModeloDaCapa {
  const cor = corDaCapa(config.cor);
  const comIcone = ESTILOS_COM_ICONE.includes(config.estilo);
  const comLogotipo = config.estilo === "C";
  return {
    estilo: config.estilo,
    cor: config.cor,
    hex: cor.hex,
    clara: cor.clara,
    corDoIcone: cor.doIcone,
    icone: comIcone ? { url: urlDoIcone(dados.iconeId, config.icone), tipo: config.icone } : null,
    barraCurta: config.estilo === "C",
    logotipo: comLogotipo ? (config.logotipo ? { presente: true, src: config.logotipo } : previa ? { presente: false } : null) : null,
    codigo: dados.codigo,
    titulo: dados.titulo || "POP",
    versao: dados.versao,
    rodape: comLogotipo ? { esquerda: dados.empresa, direita: dados.cnpj ? `CNPJ ${dados.cnpj}` : "" } : null,
    empresaNoCorpo: comLogotipo ? "" : dados.empresa,
  };
}

/** Escolha de ícone por POP guardada no próprio POP (opcional): só aceita um dos 16; vazio volta ao automático. */
export function comIconeDeCapa<T extends { iconeCapa?: string }>(pop: T, icone: string | undefined): T {
  const { iconeCapa: _antigo, ...resto } = pop;
  void _antigo;
  return eIconeConhecido(icone) ? ({ ...resto, iconeCapa: icone } as T) : (resto as T);
}

/** Configuração para o dialog de impressão: a da versão aprovada (não muda depois), senão a da empresa. */
export function capaInicialDoDialogo(
  pop: { status?: string },
  doAprovado: CapaDosPops | undefined,
  daEmpresa: CapaDosPops | undefined
): CapaCompleta {
  if (pop.status === "Aprovado") {
    // Versão aprovada: vale a capa de quando foi aprovada; aprovada antes deste recurso fica sem capa até a pessoa ligar de propósito.
    return capaCompleta(doAprovado ? { ...doAprovado } : { ...(daEmpresa || {}), ativa: false });
  }
  return capaCompleta(daEmpresa);
}

/** O que gravar na versão ao aprovar: só se a empresa deixou a capa ligada. */
export function capaParaGravarNaAprovacao(daEmpresa: CapaDosPops | undefined): CapaDosPops | undefined {
  const completa = capaCompleta(daEmpresa);
  return completa.ativa ? { ativa: true, estilo: completa.estilo, cor: completa.cor, icone: completa.icone, ...(completa.logotipo ? { logotipo: completa.logotipo } : {}) } : undefined;
}

/** A configuração mudou em relação à guardada? (para o "não salvo" na hora) */
export function capaMudou(guardada: CapaDosPops | undefined, atual: CapaCompleta): boolean {
  return JSON.stringify(capaCompleta(guardada)) !== JSON.stringify(atual);
}

/** Grava na versão aprovada a capa que vale agora (só se a empresa deixou ligada). Quem chama passa o POP já aprovado. */
export function comCapaNaVersaoAprovada<T extends { versao: string; versoes?: { versao: string; capa?: CapaDosPops }[] }>(pop: T, daEmpresa: CapaDosPops | undefined): T {
  const capa = capaParaGravarNaAprovacao(daEmpresa);
  if (!capa || !pop.versoes) return pop;
  return { ...pop, versoes: pop.versoes.map((versao) => (versao.versao === pop.versao ? { ...versao, capa } : versao)) };
}

/**
 * Ícones coloridos que ficam claros demais em impressão em escala de cinza (medidos: luminância média ≥ 195 e desvio ≤ 24 depois de
 * converter para cinza). Nesses casos, em "Preto e branco" a janela sugere o ícone de traço.
 */
export const ICONES_CLAROS_EM_CINZA: readonly string[] = ["coifas", "descongelamento", "maos", "refrigeracao", "superficies"];

export function sugerirTracoEmPretoEBranco(config: Pick<CapaCompleta, "cor" | "icone">, iconeId: string): boolean {
  return config.cor === "pb" && config.icone === "colorido" && ICONES_CLAROS_EM_CINZA.includes(iconeId);
}
