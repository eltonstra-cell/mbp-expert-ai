// Manual › Identificação complementar e Responsabilidades: regras puras (sem tela).
import type { PapelResponsabilidadeManual, ResponsabilidadeManual } from "../types/index.ts";
import { erroDoCpfCnpj, erroDoTelefone, mascararTelefone } from "./documentosCentral.ts";

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

/** CPF/CNPJ, endereço e telefone do Consultor/RT são opcionais (a Portaria SES 799/2023 não os exige): não entram na contagem nem em "Faltam". */
export const CAMPOS_OPCIONAIS_DO_RT: readonly CampoDaIdentificacao[] = ["consultorCpfCnpj", "consultorEndereco", "consultorTelefone"];

/** Os 7 campos que contam: atividades, nome do RT, profissão e registro, data de elaboração, elaborado, revisado e aprovado por. */
export const CAMPOS_QUE_CONTAM: readonly CampoDaIdentificacao[] = CAMPOS_DA_IDENTIFICACAO.filter((campo) => !CAMPOS_OPCIONAIS_DO_RT.includes(campo));

const escrito = (valor: string | undefined) => Boolean((valor || "").trim());

export function contarPreenchidos(valores: Partial<Record<CampoDaIdentificacao, string>>): { preenchidos: number; total: number } {
  return { preenchidos: CAMPOS_QUE_CONTAM.filter((campo) => escrito(valores[campo])).length, total: CAMPOS_QUE_CONTAM.length };
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
    ["consultorTelefone", mascararTelefone(rt?.telefone || "")],
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
  /** Campos que o próprio Preencher colocou antes e o usuário ainda não editou: podem ser atualizados num novo clique. */
  daAutomacao?: CampoDaIdentificacao[];
};

const semAcento = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export type ResultadoDoPreencher = {
  valores: Partial<Record<CampoDaIdentificacao, string>>;
  /** Campos que vieram do perfil do RT (selo "do perfil do RT"). */
  doPerfil: CampoDaIdentificacao[];
  preenchidos: CampoDaIdentificacao[];
  /** Campos vazios que não têm de onde vir hoje (CPF/CNPJ e endereço do RT, data). */
  semFonte: CampoDaIdentificacao[];
};

/** "Profissão e registro": "<cargo> · CRN <número>" (ex.: "Nutricionista RT · CRN 6599"); o CRN que já começa com "CRN" não repete a sigla. */
export function registroDoRt(cargo?: string, crn?: string): string {
  const c = (cargo || "").trim();
  const n = (crn || "").trim();
  const registro = n ? (/^crn/i.test(n) ? n : `CRN ${n}`) : "";
  return [c, registro].filter(Boolean).join(" · ");
}

/**
 * Botão "Preencher": completa os campos vazios, e também os que o próprio Preencher colocou antes e o usuário não editou
 * (`daAutomacao`: assim um nome antigo não fica preso). O que o usuário digitou nunca é trocado.
 * Fonte do RT: o Consultor/RT vinculado (`rt`); sem ele, o usuário logado se for Consultor/RT; sem os dois, o nome do "aprovado por".
 */
export function preencherIdentificacao(atuais: Partial<Record<CampoDaIdentificacao, string>>, fontes: FontesParaPreencher): ResultadoDoPreencher {
  const automaticos = new Set(fontes.daAutomacao || []);
  const livre = (campo: CampoDaIdentificacao) => !escrito(atuais[campo]) || automaticos.has(campo);
  const valores: Partial<Record<CampoDaIdentificacao, string>> = {};
  const quer = (campo: CampoDaIdentificacao, valor: string) => {
    const novo = valor.trim();
    if (!novo || !livre(campo) || novo === (atuais[campo] || "")) return;
    valores[campo] = novo;
  };
  // Nome, telefone e profissão/registro vêm da MESMA pessoa. Se o nome foi digitado e não é o do RT, esses campos pessoais não são
  // completados com os dados do RT (seriam de outra pessoa); o digitado fica como está.
  const nomeDigitado = !livre("consultorNome") ? (atuais.consultorNome || "").trim() : "";
  const nomeDoRt = (fontes.rt?.nome || "").trim();
  const outraPessoa = Boolean(fontes.rt) && Boolean(nomeDigitado) && semAcento(nomeDigitado) !== semAcento(nomeDoRt);
  quer("consultorNome", nomeDoRt || (fontes.rt ? "" : (fontes.nomeDoUsuarioRt || "").trim() || (fontes.responsavel || "").trim()));
  if (!outraPessoa) {
    quer("consultorTelefone", mascararTelefone(fontes.rt?.telefone || ""));
    // O cadastro do usuário (cargo e CRN) é a fonte; o texto "registroProfissional" só vale quando os dois estão vazios.
    quer("consultorRegistro", fontes.juntar(fontes.rt?.cargo, fontes.rt?.crn).trim() || (fontes.rt?.registroProfissional || "").trim());
    // Opcionais: o Preencher os completa quando o RT os tem, mas eles não contam em "Faltam".
    quer("consultorCpfCnpj", fontes.rt?.cpfCnpj || "");
    quer("consultorEndereco", fontes.rt?.endereco || "");
  }
  const nomeFinal = (valores.consultorNome ?? atuais.consultorNome ?? "").trim();
  quer("atividadeDescricao", fontes.atividade || "");
  quer("elaboradoPor", nomeFinal);
  quer("revisadoPor", nomeFinal);
  quer("aprovadoPor", [fontes.responsavel, fontes.cargoResponsavel].map((parte) => (parte || "").trim()).filter(Boolean).join(", "));
  quer("dataElaboracaoManual", fontes.hoje || "");
  const finais = { ...atuais, ...valores };
  const colocados = CAMPOS_DA_IDENTIFICACAO.filter((campo) => escrito(valores[campo]));
  return {
    valores,
    // Campos que vieram do Preencher e continuam sem edição do usuário (os de antes que não mudaram e os de agora).
    doPerfil: CAMPOS_DA_IDENTIFICACAO.filter((campo) => colocados.includes(campo) || (automaticos.has(campo) && escrito(atuais[campo]))),
    preenchidos: colocados,
    semFonte: CAMPOS_QUE_CONTAM.filter((campo) => !escrito(finais[campo])),
  };
}

/** Origem de um campo colocado pelo Preencher: qual RT (id do usuário) e o valor que ele pôs. Guardada no Manual da empresa. */
export type OrigemDoCampo = { usuarioId: string; valor: string };
export type OrigemDosCampos = Partial<Record<CampoDaIdentificacao, OrigemDoCampo>>;

/** Campos ainda "do Preencher": têm origem e o valor atual é o mesmo que o Preencher pôs (editado pelo usuário = deixa de valer). */
export function camposAindaDoPreencher(origem: OrigemDosCampos | undefined, valores: Partial<Record<CampoDaIdentificacao, string>>): CampoDaIdentificacao[] {
  return CAMPOS_DA_IDENTIFICACAO.filter((campo) => origem?.[campo] && escrito(valores[campo]) && (valores[campo] || "").trim() === origem[campo]!.valor.trim());
}

/** Origem a gravar: só dos campos que continuam sem edição, todos com o RT que forneceu os dados. */
export function origemParaGravar(campos: CampoDaIdentificacao[], valores: Partial<Record<CampoDaIdentificacao, string>>, antes: OrigemDosCampos | undefined, usuarioIdDoRt: string | undefined): OrigemDosCampos {
  const origem: OrigemDosCampos = {};
  for (const campo of campos) {
    const valor = (valores[campo] || "").trim();
    if (!valor) continue;
    const anterior = antes?.[campo];
    if (anterior && anterior.valor.trim() === valor) origem[campo] = anterior;
    else if (usuarioIdDoRt) origem[campo] = { usuarioId: usuarioIdDoRt, valor };
  }
  return origem;
}

type EmpresaComManual = { id: string; nomeFantasia?: string; razaoSocial?: string; consultorCpfCnpj?: string; consultorEndereco?: string; origemDoPreencher?: Record<string, { usuarioId: string; valor: string }> };
export type OfertaDeOutroManual = { empresaId: string; empresaNome: string; cpfCnpj?: string; endereco?: string; cpfFinal?: string };

/** CPF/CNPJ ou endereço do MESMO RT (casado pelo id do usuário, nunca pelo nome) em outro Manual, quando falta no atual. */
export function ofertaDeOutroManual(empresas: EmpresaComManual[], usuarioIdDoRt: string | undefined, empresaAtualId: string, atuais: Partial<Record<CampoDaIdentificacao, string>>): OfertaDeOutroManual | null {
  if (!usuarioIdDoRt) return null;
  const querCpf = !escrito(atuais.consultorCpfCnpj);
  const querEndereco = !escrito(atuais.consultorEndereco);
  if (!querCpf && !querEndereco) return null;
  for (const outra of empresas) {
    if (outra.id === empresaAtualId || outra.origemDoPreencher?.consultorNome?.usuarioId !== usuarioIdDoRt) continue;
    const cpfCnpj = querCpf ? (outra.consultorCpfCnpj || "").trim() : "";
    const endereco = querEndereco ? (outra.consultorEndereco || "").trim() : "";
    if (!cpfCnpj && !endereco) continue;
    return { empresaId: outra.id, empresaNome: outra.nomeFantasia || outra.razaoSocial || "outra empresa", ...(cpfCnpj ? { cpfCnpj, cpfFinal: cpfCnpj.replace(/\D/g, "").slice(-2) } : {}), ...(endereco ? { endereco } : {}) };
  }
  return null;
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
  cadastro: { cpfCnpj?: string; endereco?: string; registroProfissional?: string; telefone?: string; cargo?: string; crn?: string } | undefined
): DadosDoRtParaGravar | null {
  const novos: DadosDoRtParaGravar = {};
  const cpf = (manual.consultorCpfCnpj || "").trim();
  if (cpf && !erroDoCpfCnpj(cpf) && cpf !== (cadastro?.cpfCnpj || "")) novos.cpfCnpj = cpf;
  const endereco = (manual.consultorEndereco || "").trim();
  if (endereco && endereco !== (cadastro?.endereco || "")) novos.endereco = endereco;
  const registro = (manual.consultorRegistro || "").trim();
  // Cargo e CRN do cadastro são a fonte do "Profissão e registro"; o texto só é guardado quando o RT não tem nenhum dos dois.
  const temCargoOuCrn = Boolean((cadastro?.cargo || "").trim() || (cadastro?.crn || "").trim());
  if (registro && !temCargoOuCrn && registro !== (cadastro?.registroProfissional || "")) novos.registroProfissional = registro;
  const telefone = (manual.consultorTelefone || "").trim();
  if (telefone && !erroDoTelefone(telefone) && telefone !== (cadastro?.telefone || "")) novos.telefone = telefone;
  return Object.keys(novos).length ? novos : null;
}

/**
 * RT que fornece os dados ao Manual: o Consultor/RT vinculado à empresa (primeiro com a empresa em "Acessos"; Convidado vale); só se não houver, o usuário logado se for Consultor/RT. O Administrador logado nunca passa na frente de um RT vinculado (Convidado vale: só Suspenso fica de fora). Sem vínculo com a empresa, nenhum RT de outra empresa é usado.
 */
export function rtVinculadoDaEmpresa<T extends { perfil: string; status: string; empresaIds: string[] }>(usuarios: T[], empresaId: string, logado: T | undefined | null): T | undefined {
  const vinculado = usuarios.find((pessoa) => pessoa.perfil === "Consultor/RT" && pessoa.status !== "Suspenso" && pessoa.empresaIds.includes(empresaId));
  if (vinculado) return vinculado;
  return logado?.perfil === "Consultor/RT" ? logado : undefined;
}
