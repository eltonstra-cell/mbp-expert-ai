// Nova empresa: regras puras (sem tela). Endereço em uma linha, CNPJ já cadastrado, e-mail e limites dos campos livres.

/** Limite de caracteres dos campos livres da Nova empresa (o servidor recusa acima disso, sem truncar). */
export const LIMITE_DA_NOVA_EMPRESA = { horarioFuncionamento: 120, email: 120, responsavel: 80 } as const;

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Aviso na hora, abaixo do campo; vazio quando o e-mail está vazio (opcional) ou válido. */
export function erroDoEmail(valor: string | undefined | null): string {
  const texto = (valor || "").trim();
  if (!texto) return "";
  return EMAIL_VALIDO.test(texto) ? "" : "E-mail incompleto: confira o formato (nome@empresa.com).";
}

type PartesDoEndereco = { logradouro?: string; numero?: string; complemento?: string; bairro?: string; cep?: string; municipio?: string; uf?: string };

/** "Rua A, 10, sala 2 · Centro · CEP 90000-000 · Porto Alegre/RS", pulando o que está vazio. */
export function enderecoEmUmaLinha(partes: PartesDoEndereco): string {
  const limpo = (texto?: string) => (texto || "").trim();
  const rua = [limpo(partes.logradouro), limpo(partes.numero), limpo(partes.complemento)].filter(Boolean).join(", ");
  const cidade = [limpo(partes.municipio), limpo(partes.uf)].filter(Boolean).join("/");
  return [rua, limpo(partes.bairro), limpo(partes.cep) ? `CEP ${limpo(partes.cep)}` : "", cidade].filter(Boolean).join(" · ");
}

type EmpresaParaConferir = { id: string; cnpj?: string; nomeFantasia?: string; razaoSocial?: string; arquivada?: boolean };

/** Outra empresa com o mesmo CNPJ (só dígitos). `ignorarId` serve para a empresa que está sendo editada. */
export function empresaComMesmoCnpj<T extends EmpresaParaConferir>(empresas: Record<string, T> | T[], cnpj: string, ignorarId?: string): T | undefined {
  const digitos = (cnpj || "").replace(/\D/g, "");
  if (digitos.length !== 14) return undefined;
  return (Array.isArray(empresas) ? empresas : Object.values(empresas)).find((empresa) => empresa.id !== ignorarId && (empresa.cnpj || "").replace(/\D/g, "") === digitos);
}

export type SituacaoDoCnpj = { tipo: "livre" } | { tipo: "arquivada"; empresa: EmpresaParaConferir } | { tipo: "ativa"; empresa: EmpresaParaConferir };

/**
 * Regra do CNPJ repetido: empresa ATIVA com o mesmo CNPJ bloqueia o cadastro (com "Abrir a existente");
 * se a existente está ARQUIVADA, o cadastro é permitido (nasce uma empresa nova, a arquivada não é tocada).
 */
export function situacaoDoCnpj(empresas: Record<string, EmpresaParaConferir> | EmpresaParaConferir[], cnpj: string): SituacaoDoCnpj {
  const digitos = (cnpj || "").replace(/\D/g, "");
  if (digitos.length !== 14) return { tipo: "livre" };
  const todas = (Array.isArray(empresas) ? empresas : Object.values(empresas)).filter((empresa) => (empresa.cnpj || "").replace(/\D/g, "") === digitos);
  if (todas.length === 0) return { tipo: "livre" };
  const ativa = todas.find((empresa) => !empresa.arquivada);
  return ativa ? { tipo: "ativa", empresa: ativa } : { tipo: "arquivada", empresa: todas[0] };
}
