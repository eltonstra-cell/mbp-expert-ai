// Consulta de CNPJ que vira PROPOSTA de cadastro. Lógica pura (sem rede, sem tela): a rota /api/cnpj e o formulário usam as mesmas regras.
// LGPD: empresário individual / MEI tem o NOME DO TITULAR (e o CPF) na razão social. Esses dados NÃO são propostos, guardados nem exibidos:
// a proposta traz só o nome fantasia (se houver) e o endereço do estabelecimento, e o campo avisa.

import { resolverUf, type UfResolvida } from "./ufBrasil.ts";
import { textoDeEndereco } from "./textoDeEndereco.ts";

export type CnaeDaConsulta = { codigo: string; descricao: string };

/** "1138186800" -> "(11) 3818-6800"; "11987654321" -> "(11) 98765-4321". Outro formato aparece como veio. */
export function formatarTelefone(valor: string | undefined | null): string {
  const texto = (valor || "").trim();
  const d = texto.replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return texto;
}

/** Subclasse CNAE de 7 dígitos como se escreve: "5611203" -> "5611-2/03". */
export function formatarCnae(codigo: string | undefined | null): string {
  const d = String(codigo || "").replace(/\D/g, "");
  return d.length === 7 ? `${d.slice(0, 4)}-${d.slice(4, 5)}/${d.slice(5)}` : d;
}

export type PropostaDeCnpj = {
  fonte: string;
  cnpj: string;
  /** Vazia para MEI/empresário individual (a razão social é o nome da pessoa). */
  razaoSocial: string;
  nomeFantasia: string;
  situacao: string;
  /** Situação cadastral diferente de "ativa": o campo avisa, sem bloquear. */
  situacaoAtiva: boolean;
  cnaePrincipal: CnaeDaConsulta;
  cnaesSecundarios: CnaeDaConsulta[];
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  municipio: string;
  uf: string;
  /** De onde veio a UF e o aviso para o campo (vazio quando veio da consulta). */
  ufOrigem: UfResolvida["origem"];
  ufAviso: string;
  telefone: string;
  email: string;
  /** O titular é pessoa física: nome e CPF foram descartados. */
  titularPessoaFisica: boolean;
  avisos: string[];
  /** Quais fontes foram tentadas e por que alguma falhou (para o painel mostrar a fonte realmente usada). */
  tentativas: { fonte: string; ok: boolean; motivo?: string }[];
};

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR");

/** Natureza jurídica de empresário individual (código 213-5) ou opção pelo MEI. */
export function titularEPessoaFisica(entrada: { naturezaJuridica?: string; codigoNaturezaJuridica?: string | number; opcaoPeloMei?: boolean }): boolean {
  if (entrada.opcaoPeloMei) return true;
  const codigo = String(entrada.codigoNaturezaJuridica ?? "").replace(/\D/g, "");
  if (codigo === "2135") return true;
  const natureza = semAcento(entrada.naturezaJuridica || "");
  return natureza.includes("empresario (individual)") || natureza.includes("empresario individual");
}

/** Tira sequências de 11 dígitos (CPF) coladas ao nome, que o cadastro de MEI costuma ter ("NOME 12345678900"). */
export function semCpf(texto: string): string {
  return texto.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "").replace(/\s{2,}/g, " ").trim();
}

export function situacaoEstaAtiva(situacao: string): boolean {
  const s = semAcento(situacao).trim();
  return !s || s === "ativa" || s === "02" || s === "2";
}

export type ConsultaBruta = {
  source?: string;
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  descricao_situacao_cadastral?: string;
  cnae_fiscal?: string | number;
  cnae_fiscal_descricao?: string;
  cnaes_secundarios?: { codigo?: string | number; descricao?: string }[];
  natureza_juridica?: string;
  codigo_natureza_juridica?: string | number;
  opcao_pelo_mei?: boolean;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
  municipio?: string;
  uf?: string;
  ddd_telefone_1?: string;
  email?: string;
  /** UF que a outra fonte trouxe, quando a da fonte usada veio inválida. */
  uf_da_outra_fonte?: string;
  tentativas?: { fonte: string; ok: boolean; motivo?: string }[];
};

export function propostaDaConsulta(bruta: ConsultaBruta): PropostaDeCnpj {
  const pessoaFisica = titularEPessoaFisica({ naturezaJuridica: bruta.natureza_juridica, codigoNaturezaJuridica: bruta.codigo_natureza_juridica, opcaoPeloMei: bruta.opcao_pelo_mei });
  const situacao = (bruta.descricao_situacao_cadastral || "").trim();
  const avisos: string[] = [];
  if (pessoaFisica) avisos.push("Empresário individual ou MEI: o nome do titular e o CPF não são guardados nem exibidos. Informe o nome do estabelecimento.");
  if (!situacaoEstaAtiva(situacao)) avisos.push(`Situação cadastral: ${situacao}. Confira com o cliente; o cadastro segue normal.`);
  const fantasia = semCpf(bruta.nome_fantasia || "");
  const uf = resolverUf({ uf: bruta.uf, outraFonte: bruta.uf_da_outra_fonte, cep: bruta.cep, municipio: bruta.municipio });
  if (uf.aviso) avisos.push(uf.aviso);
  return {
    fonte: bruta.source || "Consulta pública de CNPJ",
    cnpj: (bruta.cnpj || "").replace(/\D/g, ""),
    razaoSocial: pessoaFisica ? "" : semCpf(bruta.razao_social || ""),
    nomeFantasia: fantasia,
    situacao,
    situacaoAtiva: situacaoEstaAtiva(situacao),
    cnaePrincipal: { codigo: String(bruta.cnae_fiscal ?? "").replace(/\D/g, ""), descricao: (bruta.cnae_fiscal_descricao || "").trim() },
    cnaesSecundarios: (bruta.cnaes_secundarios || [])
      .map((c) => ({ codigo: String(c.codigo ?? "").replace(/\D/g, ""), descricao: (c.descricao || "").trim() }))
      .filter((c) => c.codigo && c.codigo !== "0"),
    logradouro: textoDeEndereco(bruta.logradouro),
    numero: bruta.numero || "",
    complemento: textoDeEndereco(bruta.complemento),
    bairro: textoDeEndereco(bruta.bairro),
    cep: bruta.cep || "",
    municipio: textoDeEndereco(bruta.municipio),
    uf: uf.uf,
    ufOrigem: uf.origem,
    ufAviso: uf.aviso,
    telefone: formatarTelefone(bruta.ddd_telefone_1),
    email: bruta.email || "",
    titularPessoaFisica: pessoaFisica,
    avisos,
    tentativas: bruta.tentativas || [],
  };
}

/** Campos do formulário de empresa preenchidos pela proposta (só os que a consulta trouxe) e a lista deles, para a marca "da consulta". */
export function camposDaProposta(proposta: PropostaDeCnpj): { valores: Record<string, string>; campos: string[] } {
  const valores: Record<string, string> = {};
  const poe = (campo: string, valor: string) => {
    if ((valor || "").trim()) valores[campo] = valor;
  };
  poe("razaoSocial", proposta.razaoSocial);
  poe("nomeFantasia", proposta.nomeFantasia);
  poe("situacao", proposta.situacao);
  poe("cnae", proposta.cnaePrincipal.codigo);
  poe("cnaeDescricao", proposta.cnaePrincipal.descricao);
  poe("logradouro", proposta.logradouro);
  poe("numero", proposta.numero);
  poe("complemento", proposta.complemento);
  poe("bairro", proposta.bairro);
  poe("cep", proposta.cep);
  poe("municipio", proposta.municipio);
  poe("uf", proposta.uf);
  poe("telefone", proposta.telefone);
  poe("email", proposta.email);
  return { valores, campos: Object.keys(valores) };
}

/** Mensagem curta para a falha da consulta: o cadastro manual segue normal e a consulta pode ser refeita depois. */
export function mensagemDeFalhaDaConsulta(online: boolean): string {
  return online
    ? "Não consegui consultar o CNPJ agora. Preencha à mão; você pode consultar de novo depois."
    : "Sem sinal: preencha à mão. Quando o sinal voltar, consulte o CNPJ de novo; os dados chegam como proposta para você aceitar ou ignorar.";
}

export const MENSAGEM_CONSULTA_IGNORADA = "Consulta ignorada. Preencha à mão ou consulte de novo.";
export const MENSAGEM_CONSULTA_APLICADA = "Dados aplicados. Confira e edite o que precisar.";

/**
 * Uma só mensagem sobre a consulta, a que corresponde ao estado real (nunca duas que se contradizem):
 * - "Consultando…", "Encontrei dados…" (proposta à espera) e falhas descrevem a última ação e aparecem sozinhas; com proposta pendente, consultando ou falha, o aviso "Preenchido pela consulta" não aparece.
 * - Enquanto há campos preenchidos pela consulta ainda sem confirmar, o aviso "Preenchido pela consulta" é a verdade sobre os campos: as mensagens "Dados aplicados" e "Consulta ignorada" (que só repetem ou contradizem esse estado) saem.
 * - Sem campos pendentes, "Dados aplicados" e "Consulta ignorada" valem como estavam.
 */
export function mensagensDaConsulta(entrada: { mensagem: string; propostaPendente: boolean; camposPendentes: boolean }): { mensagem: string; avisoPreenchido: boolean } {
  const { mensagem, propostaPendente, camposPendentes } = entrada;
  const consultando = mensagem.startsWith("Consultando");
  // Falha (ou erro de CNPJ) é o resultado da última ação: aparece sozinha, sem o aviso "Preenchido pela consulta" ao lado.
  const falha = Boolean(mensagem) && !consultando && !mensagem.startsWith("Encontrei") && !mensagem.startsWith("Dados aplicados") && mensagem !== MENSAGEM_CONSULTA_IGNORADA;
  const avisoPreenchido = camposPendentes && !propostaPendente && !consultando && !falha;
  const soRepete = mensagem === MENSAGEM_CONSULTA_IGNORADA || mensagem === MENSAGEM_CONSULTA_APLICADA;
  return { mensagem: soRepete && camposPendentes ? "" : mensagem, avisoPreenchido };
}

/**
 * "Confirmei tudo" fica visível sempre que há campos preenchidos pela consulta ainda sem confirmar, mesmo quando a consulta falhou
 * (a pessoa pode ter preenchido à mão). Só some enquanto há proposta à espera, que tem os próprios botões. Não depende de a mensagem ser de falha.
 */
export function botaoConfirmeiTudoVisivel(entrada: { camposPendentes: boolean; propostaPendente: boolean }): boolean {
  return entrada.camposPendentes && !entrada.propostaPendente;
}
