// Manual › Identificação complementar e Responsabilidades: regras puras (sem tela).
import type { PapelResponsabilidadeManual, ResponsabilidadeManual } from "../types/index.ts";
import { erroDoCpfCnpj, erroDoTelefone } from "./documentosCentral.ts";

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
export type PerfilDoRt = { nome?: string; cargo?: string; crn?: string; telefone?: string; cpfCnpj?: string; endereco?: string; registroProfissional?: string };

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
  /** Data de hoje (AAAA-MM-DD): entra em "Data de elaboração" só se estiver vazia. */
  hoje?: string;
  /** Há um Consultor/RT vinculado à empresa (ou o próprio RT logado)? Sem ele, o nome vem do mesmo lugar do "aprovado por". */
  semRtVinculado?: boolean;
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
  const doRt: [CampoDaIdentificacao, string][] = [
    ["consultorCpfCnpj", (fontes.rt?.cpfCnpj || "").trim()],
    ["consultorEndereco", (fontes.rt?.endereco || "").trim()],
    // O texto "profissão e registro" guardado no cadastro vale mais que cargo + CRN juntos.
    ["consultorRegistro", (fontes.rt?.registroProfissional || "").trim()],
  ];
  for (const [campo, valor] of doRt) {
    if (escrito(atuais[campo]) || !valor) continue;
    valores[campo] = valor;
    if (!doPerfil.includes(campo)) doPerfil.push(campo);
  }
  // Sem nome no cadastro do RT, vale o mesmo nome que alimenta "Manual aprovado por" (só o nome, sem o cargo).
  const nomeDoAprovador = (fontes.responsavel || "").trim();
  if (!escrito(atuais.consultorNome) && !escrito(valores.consultorNome) && nomeDoAprovador) valores.consultorNome = nomeDoAprovador;
  const depois = { ...atuais, ...valores };
  const candidatos: [CampoDaIdentificacao, string][] = [
    ["atividadeDescricao", (fontes.atividade || "").trim()],
    ["elaboradoPor", (depois.consultorNome || "").trim()],
    ["revisadoPor", (depois.consultorNome || "").trim()],
    ["aprovadoPor", [fontes.responsavel, fontes.cargoResponsavel].map((parte) => (parte || "").trim()).filter(Boolean).join(", ")],
    ["dataElaboracaoManual", (fontes.hoje || "").trim()],
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

/** Frase do botão "Preencher com dados do RT" (uma linha): quantos campos entraram e quantos ainda faltam. */
export function fraseDoPreencher(preenchidos: number, faltam: number): string {
  const entrada = preenchidos === 0 ? "Nada novo para preencher." : preenchidos === 1 ? "1 campo preenchido." : `${preenchidos} campos preenchidos.`;
  return faltam > 0 ? `${entrada} Faltam ${faltam}, preencha abaixo.` : `${entrada}${preenchidos > 0 ? " Salve para guardar." : ""}`;
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

export type DadosDoRtParaGravar = { cpfCnpj?: string; endereco?: string; registroProfissional?: string; telefone?: string };

/**
 * Ao salvar o Manual: o que vai também para o cadastro do Consultor/RT vinculado (campos opcionais novos).
 * Só entra campo preenchido, válido (CPF/CNPJ e telefone sem erro) e DIFERENTE do que o cadastro já tem; nada é apagado.
 * Devolve null quando não há o que gravar. O nome da conta do RT não é trocado.
 */
export function dadosParaOCadastroDoRt(
  manual: Partial<Record<CampoDaIdentificacao, string>>,
  cadastro: { cpfCnpj?: string; endereco?: string; registroProfissional?: string; telefone?: string } | undefined
): DadosDoRtParaGravar | null {
  const novos: DadosDoRtParaGravar = {};
  const cpf = (manual.consultorCpfCnpj || "").trim();
  if (cpf && !erroDoCpfCnpj(cpf) && cpf !== (cadastro?.cpfCnpj || "")) novos.cpfCnpj = cpf;
  const endereco = (manual.consultorEndereco || "").trim();
  if (endereco && endereco !== (cadastro?.endereco || "")) novos.endereco = endereco;
  const registro = (manual.consultorRegistro || "").trim();
  if (registro && registro !== (cadastro?.registroProfissional || "")) novos.registroProfissional = registro;
  const telefone = (manual.consultorTelefone || "").trim();
  if (telefone && !erroDoTelefone(telefone) && telefone !== (cadastro?.telefone || "")) novos.telefone = telefone;
  return Object.keys(novos).length ? novos : null;
}

/**
 * RT que fornece os dados ao Manual: o próprio usuário logado, se for Consultor/RT; senão o primeiro Consultor/RT com a empresa em
 * "Acessos" (Convidado vale: só Suspenso fica de fora). Sem vínculo com a empresa, nenhum RT de outra empresa é usado.
 */
export function rtVinculadoDaEmpresa<T extends { perfil: string; status: string; empresaIds: string[] }>(usuarios: T[], empresaId: string, logado: T | undefined | null): T | undefined {
  if (logado?.perfil === "Consultor/RT") return logado;
  return usuarios.find((pessoa) => pessoa.perfil === "Consultor/RT" && pessoa.status !== "Suspenso" && pessoa.empresaIds.includes(empresaId));
}
