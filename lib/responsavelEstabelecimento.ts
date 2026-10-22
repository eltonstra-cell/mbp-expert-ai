// Um só responsável do estabelecimento: a fonte é Empresa › Dados (nome, cargo e usuário de Acessos vinculado).
// Quem só tem o campo antigo de POPs continua aparecendo (fallback de leitura) e divergências viram aviso ao RT.
import type { Empresa, ProcedimentoOperacionalPadronizado, UsuarioSistema } from "../types/index.ts";
import { limparTextoDePessoa } from "./nomeCargo.ts";

export type ResponsavelEfetivo = {
  nome: string;
  cargo: string;
  usuarioId?: string;
  /** De onde veio o que a tela mostra. */
  origem: "dados" | "pops" | "nenhum";
  /** O responsável tem pessoa vinculada em Acessos (condição para aprovar POPs). */
  vinculado: boolean;
};

const limpo = (texto?: string) => limparTextoDePessoa(texto);
/** Compara nomes sem acento, sem diferença de maiúsculas e com espaços normalizados ("Élton  Strapazon" = "elton strapazon"). */
const comparavel = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
export const mesmoNome = (a: string, b: string) => comparavel(a) === comparavel(b);
const mesmo = mesmoNome;

/** Nomes que o campo antigo "Responsável" dos POPs guarda e que diferem do de Dados. */
export function nomesAntigosDosPops(pops: ProcedimentoOperacionalPadronizado[] | undefined): string[] {
  const nomes: string[] = [];
  for (const pop of pops || []) {
    if (pop.arquivado) continue;
    const nome = limpo(pop.responsavel);
    if (nome && !nomes.some((existente) => mesmo(existente, nome))) nomes.push(nome);
  }
  return nomes;
}

export function responsavelEfetivo(
  empresa: Pick<Empresa, "responsavelEstabelecimento" | "responsavel" | "cargoResponsavel" | "pops"> | undefined,
  usuarios?: Pick<UsuarioSistema, "id" | "nome" | "cargo">[]
): ResponsavelEfetivo {
  const guardado = empresa?.responsavelEstabelecimento;
  const nomeGuardado = limpo(guardado?.nome);
  if (nomeGuardado || limpo(guardado?.cargo) || guardado?.usuarioId) {
    // Com usuário vinculado, nome e cargo vêm do cadastro dele (uma só fonte); sem ele (ou sem cargo lá), vale o que Dados guarda.
    const vinculado = guardado?.usuarioId ? (usuarios || []).find((pessoa) => pessoa.id === guardado.usuarioId) : undefined;
    return {
      nome: limpo(vinculado?.nome) || nomeGuardado || limpo(empresa?.responsavel),
      cargo: limpo(vinculado?.cargo) || limpo(guardado?.cargo) || limpo(empresa?.cargoResponsavel),
      usuarioId: guardado?.usuarioId,
      origem: "dados",
      vinculado: Boolean(guardado?.usuarioId),
    };
  }
  const dados = limpo(empresa?.responsavel);
  if (dados) return { nome: dados, cargo: limpo(empresa?.cargoResponsavel), origem: "dados", vinculado: false };
  const antigo = nomesAntigosDosPops(empresa?.pops)[0];
  if (antigo) return { nome: antigo, cargo: "", origem: "pops", vinculado: false };
  return { nome: "", cargo: "", origem: "nenhum", vinculado: false };
}

/** Divergência entre Dados e o campo antigo de POPs: o RT escolhe; ninguém decide sozinho. */
export function divergenciaDeResponsavel(empresa: Pick<Empresa, "responsavelEstabelecimento" | "responsavel" | "cargoResponsavel" | "pops"> | undefined): { dados: string; pops: string[] } | null {
  const efetivo = responsavelEfetivo(empresa);
  if (efetivo.origem !== "dados" || !efetivo.nome) return null;
  const diferentes = nomesAntigosDosPops(empresa?.pops).filter((nome) => !mesmo(nome, efetivo.nome));
  return diferentes.length ? { dados: efetivo.nome, pops: diferentes } : null;
}

/** "Maria · Nutricionista" para mostrar nos POPs. */
export function textoDoResponsavel(responsavel: ResponsavelEfetivo): string {
  if (!responsavel.nome) return "";
  return responsavel.cargo ? `${responsavel.nome} · ${responsavel.cargo}` : responsavel.nome;
}
