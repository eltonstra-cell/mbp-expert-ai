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
