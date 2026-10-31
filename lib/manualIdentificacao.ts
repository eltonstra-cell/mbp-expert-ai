// Manual › Identificação complementar e Responsabilidades: regras puras (sem tela).
import type { PapelResponsabilidadeManual, ResponsabilidadeManual } from "../types/index.ts";

/** Campos do cartão "Identificação complementar", na ordem da tela. */
export const CAMPOS_DA_IDENTIFICACAO = [
  "atividadeDescricao",
  "consultorNome",
  "consultorCpfCnpj",
  "consultorEndereco",
  "consultorTelefone",
  "consultorRegistro",
  "dataElaboracaoManual",
  "elaboradoPor",
  "revisadoPor",
  "aprovadoPor",
] as const;

export type CampoDaIdentificacao = (typeof CAMPOS_DA_IDENTIFICACAO)[number];

const escrito = (valor: string | undefined) => Boolean((valor || "").trim());

export function contarPreenchidos(valores: Partial<Record<CampoDaIdentificacao, string>>): { preenchidos: number; total: number } {
  return { preenchidos: CAMPOS_DA_IDENTIFICACAO.filter((campo) => escrito(valores[campo])).length, total: CAMPOS_DA_IDENTIFICACAO.length };
}

/** "3 de 10 preenchidos". */
export function resumoDaIdentificacao(valores: Partial<Record<CampoDaIdentificacao, string>>): string {
  const { preenchidos, total } = contarPreenchidos(valores);
  return `${preenchidos} de ${total} preenchidos`;
}

/** Recolhido por padrão só quando está completo. */
export function identificacaoCompleta(valores: Partial<Record<CampoDaIdentificacao, string>>): boolean {
  const { preenchidos, total } = contarPreenchidos(valores);
  return preenchidos === total;
}

/** Perfil do RT (Acessos / Meu perfil): só estes dados existem hoje; não há CPF, CNPJ nem endereço no perfil. */
export type PerfilDoRt = { nome?: string; cargo?: string; crn?: string; telefone?: string };

export type PrefillDoPerfil = {
  valores: Partial<Record<CampoDaIdentificacao, string>>;
  /** Campos que vieram do perfil (para o selo "do perfil do RT"). */
  doPerfil: CampoDaIdentificacao[];
};

/**
 * Preenche com o perfil do RT SÓ o que estiver vazio no Manual; o que já foi digitado nunca é sobrescrito.
 * Nome, telefone e profissão/registro vêm do perfil; CPF/CNPJ e endereço do RT não existem no perfil e ficam como estão.
 */
export function prefillDoPerfilDoRt(salvos: Partial<Record<CampoDaIdentificacao, string>>, rt: PerfilDoRt | undefined, juntar: (cargo?: string, crn?: string) => string): PrefillDoPerfil {
  const valores: Partial<Record<CampoDaIdentificacao, string>> = {};
  const doPerfil: CampoDaIdentificacao[] = [];
  const candidatos: [CampoDaIdentificacao, string][] = [
    ["consultorNome", (rt?.nome || "").trim()],
    ["consultorTelefone", (rt?.telefone || "").trim()],
    ["consultorRegistro", juntar(rt?.cargo, rt?.crn).trim()],
  ];
  for (const [campo, doRt] of candidatos) {
    if (escrito(salvos[campo]) || !doRt) continue;
    valores[campo] = doRt;
    doPerfil.push(campo);
  }
  return { valores, doPerfil };
}

/** Ao editar um campo, ele deixa de ser "do perfil do RT". */
export function semOCampo(doPerfil: CampoDaIdentificacao[], campo: string): CampoDaIdentificacao[] {
  return doPerfil.filter((item) => item !== campo);
}

/** "2 de 5 ativos" de um papel. */
export function ativosDoPapel(responsabilidades: ResponsabilidadeManual[], papel: PapelResponsabilidadeManual): { ativos: number; total: number } {
  const doPapel = responsabilidades.filter((item) => item.papel === papel);
  return { ativos: doPapel.filter((item) => item.ativa).length, total: doPapel.length };
}

export function textoDosAtivos(responsabilidades: ResponsabilidadeManual[], papel: PapelResponsabilidadeManual): string {
  const { ativos, total } = ativosDoPapel(responsabilidades, papel);
  return `${ativos} de ${total} ativos`;
}

/** O texto da linha em 1–2 linhas: sem quebras e cortado com reticências (o texto inteiro fica ao abrir a edição). */
export function textoCurtoDaResponsabilidade(descricao: string, limite = 220): string {
  const limpo = (descricao || "").replace(/\s+/g, " ").trim();
  if (!limpo) return "Sem texto: toque para escrever";
  return limpo.length > limite ? `${limpo.slice(0, limite - 1).trimEnd()}…` : limpo;
}

export type FontesParaPreencher = {
  rt?: PerfilDoRt;
  juntar: (cargo?: string, crn?: string) => string;
  /** CNAE (descrição) da empresa: serve de ponto de partida para a descrição da atividade. */
  atividade?: string;
  responsavel?: string;
  cargoResponsavel?: string;
  /** Nome de quem está logado, SÓ quando o perfil dele é Consultor/RT: sugestão para o nome quando o cadastro do RT não tem nome. */
  nomeDoUsuarioRt?: string;
};

export type ResultadoDoPreencher = {
  valores: Partial<Record<CampoDaIdentificacao, string>>;
  /** Campos que vieram do perfil do RT (selo "do perfil do RT"). */
  doPerfil: CampoDaIdentificacao[];
  preenchidos: CampoDaIdentificacao[];
  /** Campos vazios que não têm de onde vir hoje (CPF/CNPJ e endereço do RT, data). */
  semFonte: CampoDaIdentificacao[];
};

/**
 * Botão "Preencher": completa SÓ os campos vazios, com dados que já existem (perfil do RT, responsável do estabelecimento e CNAE da empresa).
 * O que já foi digitado nunca é trocado.
 */
export function preencherIdentificacao(atuais: Partial<Record<CampoDaIdentificacao, string>>, fontes: FontesParaPreencher): ResultadoDoPreencher {
  const nomeDoRt = (fontes.rt?.nome || "").trim() || (fontes.nomeDoUsuarioRt || "").trim();
  const { valores, doPerfil } = prefillDoPerfilDoRt(atuais, nomeDoRt ? { ...fontes.rt, nome: nomeDoRt } : fontes.rt, fontes.juntar);
  const depois = { ...atuais, ...valores };
  const candidatos: [CampoDaIdentificacao, string][] = [
    ["atividadeDescricao", (fontes.atividade || "").trim()],
    ["elaboradoPor", (depois.consultorNome || "").trim()],
    ["revisadoPor", (depois.consultorNome || "").trim()],
    ["aprovadoPor", [fontes.responsavel, fontes.cargoResponsavel].map((parte) => (parte || "").trim()).filter(Boolean).join(", ")],
  ];
  for (const [campo, valor] of candidatos) {
    if (escrito(atuais[campo]) || escrito(valores[campo]) || !valor) continue;
    valores[campo] = valor;
  }
  const finais = { ...atuais, ...valores };
  return {
    valores,
    doPerfil,
    preenchidos: CAMPOS_DA_IDENTIFICACAO.filter((campo) => escrito(valores[campo])),
    semFonte: CAMPOS_DA_IDENTIFICACAO.filter((campo) => !escrito(finais[campo])),
  };
}

/** Campos do consultor/RT que o cadastro do RT pode (ou deveria) fornecer: se faltam, o link leva a completar o cadastro. */
const CAMPOS_DO_RT: CampoDaIdentificacao[] = ["consultorNome", "consultorCpfCnpj", "consultorEndereco", "consultorTelefone", "consultorRegistro"];

export function faltamNoCadastroDoRt(semFonte: CampoDaIdentificacao[]): CampoDaIdentificacao[] {
  return semFonte.filter((campo) => CAMPOS_DO_RT.includes(campo));
}

/** Frase do botão "Preencher com dados do RT": quantos campos entraram e o que falta no cadastro do RT. */
export function fraseDoPreencher(preenchidos: number, faltamNoRt: string[]): string {
  const entrada = preenchidos === 0 ? "Nada novo para preencher." : preenchidos === 1 ? "1 campo preenchido." : `${preenchidos} campos preenchidos.`;
  return faltamNoRt.length ? `${entrada} Faltam ${faltamNoRt.length} no cadastro do RT.` : `${entrada}${preenchidos > 0 ? " Salve para guardar." : ""}`;
}

/** Próximo campo depois de `campo` na ordem da tela (nulo no último). */
export function proximoCampoDaIdentificacao(campo: CampoDaIdentificacao): CampoDaIdentificacao | null {
  const posicao = CAMPOS_DA_IDENTIFICACAO.indexOf(campo);
  return posicao >= 0 && posicao < CAMPOS_DA_IDENTIFICACAO.length - 1 ? CAMPOS_DA_IDENTIFICACAO[posicao + 1] : null;
}

/** Máscara completa para o avanço automático: CNPJ (14) e celular (11) avançam na hora; CPF de 11 dígitos, telefone fixo e data esperam um instante. */
export function mascaraCompletaParaAvancar(campo: CampoDaIdentificacao, valor: string): "agora" | "depois" | "nao" {
  const digitos = valor.replace(/\D/g, "").length;
  if (campo === "consultorCpfCnpj") return digitos === 14 ? "agora" : digitos === 11 ? "depois" : "nao";
  if (campo === "consultorTelefone") return digitos === 11 ? "agora" : digitos === 10 ? "depois" : "nao";
  if (campo === "dataElaboracaoManual") return /^\d{4}-\d{2}-\d{2}$/.test(valor) && Number(valor.slice(0, 4)) >= 1900 ? "depois" : "nao";
  return "nao";
}

/** Tira das sugestões as que o campo Atividades já traz (sem diferença de caixa, acento ou espaços). */
export function sugestoesQueFaltam(sugestoes: string[], atual: string): string[] {
  const limpo = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const campo = limpo(atual);
  return sugestoes.filter((texto) => !campo.includes(limpo(texto)));
}

/** Sugestões de "atividade de produção": a descrição do CNAE principal e as dos secundários (sem repetir; só as que cabem no limite do campo). */
export function sugestoesDeAtividade(principal: string | undefined, secundarios: { descricao: string }[] | undefined, limite: number): string[] {
  const vistos = new Set<string>();
  const lista: string[] = [];
  for (const texto of [principal || "", ...(secundarios || []).map((item) => item.descricao || "")]) {
    const limpo = texto.trim();
    const chave = limpo.toLocaleLowerCase("pt-BR");
    if (!limpo || limpo.length > limite || vistos.has(chave)) continue;
    vistos.add(chave);
    lista.push(limpo);
  }
  return lista;
}
