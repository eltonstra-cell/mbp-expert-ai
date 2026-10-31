// Documentos da Central (rodada 3 de POPs): regras puras de Pessoas, Comprovantes, Programas e Manual (sem tela).
import { cnpjValido } from "./regrasDoPacote3.ts";
import { capacitacoesVigentes, situacaoDaValidade, type SituacaoDaValidade } from "./registrosEmpresa.ts";
import type { Capacitacao, ComprovanteTerceiro, StatusProgramaControle } from "../types/index.ts";

export const LIMITE_NOME_DA_PESSOA = 80;
export const LIMITE_CARGO_DA_PESSOA = 60;

const semAcento = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");

/** Nome repetido na mesma empresa (sem acento, sem caixa, espaços juntados). `idAtual` é a pessoa em edição. */
export function nomeRepetidoDePessoa(nome: string, pessoas: { id: string; nome: string }[], idAtual?: string): boolean {
  const alvo = semAcento(nome);
  return Boolean(alvo) && pessoas.some((pessoa) => pessoa.id !== idAtual && semAcento(pessoa.nome) === alvo);
}

export type TreinamentoDaPessoa = { id: "em-dia" | "pendente" | "vencido" | "sem-registro" | "inativa"; texto: string };

/** Estado do treinamento da pessoa a partir das capacitações vigentes dela (as mesmas contas da aba Capacitação). */
export function treinamentoDaPessoa(pessoa: { id: string; ativo: boolean }, capacitacoes: Capacitacao[], hoje: string): TreinamentoDaPessoa {
  if (!pessoa.ativo) return { id: "inativa", texto: "Inativo" };
  const dela = capacitacoesVigentes(capacitacoes.filter((item) => item.colaboradorId === pessoa.id));
  if (dela.length === 0) return { id: "sem-registro", texto: "Treinamento sem registro" };
  const situacoes = dela.map((item) => situacaoDaValidade(item.venceEm, hoje));
  if (situacoes.includes("vencido")) return { id: "vencido", texto: "Treinamento vencido" };
  if (situacoes.includes("vence-em-breve")) return { id: "pendente", texto: "Treinamento pendente" };
  return { id: "em-dia", texto: "Treinamento em dia" };
}

/** "N colaboradores · guardamos só nome, cargo e as datas dos treinamentos". */
export function subtituloDePessoas(ativos: number): string {
  return `${ativos} ${ativos === 1 ? "colaborador" : "colaboradores"} · guardamos só nome, cargo e as datas dos treinamentos`;
}

export const AVISO_DADOS_DE_SAUDE_PESSOA = "Guardamos só nome, cargo e as datas dos treinamentos. Não registre dados de saúde.";

// ---------- Comprovantes ----------

const PESO_DA_ATENCAO: Record<SituacaoDaValidade, number> = { vencido: 0, "vence-em-breve": 1, "em-dia": 2, "sem-validade": 3 };

/** O que precisa de atenção primeiro: vencidos, depois os que vencem logo, depois em dia; dentro de cada grupo, pela validade. */
export function ordenarPorAtencao<T extends Pick<ComprovanteTerceiro, "validade">>(itens: T[], hoje: string): T[] {
  return [...itens].sort((a, b) => PESO_DA_ATENCAO[situacaoDaValidade(a.validade, hoje)] - PESO_DA_ATENCAO[situacaoDaValidade(b.validade, hoje)] || a.validade.localeCompare(b.validade));
}

// ---------- Programas ----------

export type EstadoVisualDoPrograma = { texto: string; tom: "ativo" | "implantacao" | "nao-iniciado" };

/** Implantado aparece como "Ativo" (o valor guardado não muda). */
export function estadoVisualDoPrograma(status: StatusProgramaControle): EstadoVisualDoPrograma {
  if (status === "Implantado") return { texto: "Ativo", tom: "ativo" };
  if (status === "Em implantação") return { texto: "Em implantação", tom: "implantacao" };
  return { texto: status, tom: "nao-iniciado" };
}

/** "1 ativo e 1 em implantação". */
/** "2 ativos · 1 em implantação": as contagens à direita do cabeçalho do capítulo. */
export function contagemDosProgramas(programas: { status: StatusProgramaControle }[]): string {
  const ativos = programas.filter((programa) => programa.status === "Implantado").length;
  const emImplantacao = programas.filter((programa) => programa.status === "Em implantação").length;
  return `${ativos} ${ativos === 1 ? "ativo" : "ativos"} · ${emImplantacao} em implantação`;
}

export function resumoDosProgramas(programas: { status: StatusProgramaControle }[]): string {
  const ativos = programas.filter((programa) => programa.status === "Implantado").length;
  const emImplantacao = programas.filter((programa) => programa.status === "Em implantação").length;
  return `${ativos} ${ativos === 1 ? "ativo" : "ativos"} e ${emImplantacao} em implantação`;
}

// ---------- Manual: máscaras e validação na hora ----------

const soDigitos = (valor: string) => valor.replace(/\D/g, "");

/** CPF (11 dígitos) ou CNPJ (14) com máscara enquanto digita; mais de 14 dígitos são cortados. */
export function mascararCpfCnpj(valor: string): string {
  const d = soDigitos(valor).slice(0, 14);
  if (d.length <= 11) {
    return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4").replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

export function cpfValido(valor: string): boolean {
  const d = soDigitos(valor);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (base: string) => {
    const soma = base.split("").reduce((total, numero, indice) => total + Number(numero) * (base.length + 1 - indice), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(d.slice(0, 9)) === Number(d[9]) && digito(d.slice(0, 10)) === Number(d[10]);
}

const dígitosQueFaltam = (quantos: number) => (quantos === 1 ? "Falta 1 dígito" : `Faltam ${quantos} dígitos`);

/** Vazio = sem erro. */
export function erroDoCpfCnpj(valor: string): string {
  const d = soDigitos(valor);
  if (!d) return "";
  if (d.length < 11) return `${dígitosQueFaltam(11 - d.length)} no CPF ou ${14 - d.length} no CNPJ.`;
  if (d.length === 11) return cpfValido(d) ? "" : "CPF inválido: confira os números.";
  if (d.length < 14) return `${dígitosQueFaltam(14 - d.length)} no CNPJ.`;
  return cnpjValido(d) ? "" : "CNPJ inválido: confira os números.";
}

/** Telefone com máscara enquanto digita: (11) 3818-6800 ou (11) 98765-4321. */
export function mascararTelefone(valor: string): string {
  const d = soDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}${d.length > 6 ? `-${d.slice(6)}` : ""}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function erroDoTelefone(valor: string): string {
  const d = soDigitos(valor);
  if (!d) return "";
  if (d.length < 10) return "Telefone incompleto: use o DDD e o número.";
  return "";
}

/** Limite de caracteres de cada campo de texto da Identificação complementar. */
export const LIMITE_DA_IDENTIFICACAO: Record<string, number> = {
  atividadeDescricao: 200,
  consultorNome: 80,
  consultorCpfCnpj: 18,
  consultorEndereco: 120,
  consultorTelefone: 15,
  consultorRegistro: 80,
  dataElaboracaoManual: 10,
  elaboradoPor: 80,
  revisadoPor: 80,
  aprovadoPor: 80,
};

export const LIMITE_DA_RESPONSABILIDADE = 500;

/** Cor da bolinha do resumo da seção: âmbar enquanto falta, verde quando há o que contar. */
export function tomDoResumo(feitos: number, total: number, modo: "completo" | "algum"): "ok" | "pendente" {
  return modo === "completo" ? (feitos >= total ? "ok" : "pendente") : feitos > 0 ? "ok" : "pendente";
}

/** Limite dos textos livres da aba Registros (descrição, verificação e ação corretiva). */
export const LIMITE_DO_TEXTO_LIVRE = 500;
