// Validade do acesso por pessoa (Fiscal). Fica dentro do próprio usuário no JSON do estado: sem tabela nova.

export const PRAZOS_DE_VALIDADE = [3, 7, 15, 30] as const;
export type PrazoDeValidade = (typeof PRAZOS_DE_VALIDADE)[number];

type ComValidade = { validoAte?: string; acessoEncerradoEm?: string };

const DIA_MS = 24 * 60 * 60 * 1000;
// Horário de Brasília (sem horário de verão desde 2019).
const FUSO = "-03:00";

function dataNoFuso(data: Date): string {
  return new Date(data.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Último instante (23:59:59) do dia que fica `dias` dias depois de `agora`. */
export function calcularValidade(dias: number, agora: Date = new Date()): string {
  const alvo = new Date(agora.getTime() + dias * DIA_MS);
  return `${dataNoFuso(alvo)}T23:59:59${FUSO}`;
}

export function prazoPermitido(dias: number): dias is PrazoDeValidade {
  return (PRAZOS_DE_VALIDADE as readonly number[]).includes(dias);
}

/** Acesso vigente: não encerrado e, se há validade, ainda dentro dela. Quem não tem validade (perfis comuns) segue vigente. */
export function acessoVigente(usuario: ComValidade, agora: Date = new Date()): boolean {
  if (usuario.acessoEncerradoEm) return false;
  if (!usuario.validoAte) return true;
  const fim = new Date(usuario.validoAte).getTime();
  return Number.isFinite(fim) && agora.getTime() <= fim;
}

/** Dias que restam (conta o dia de hoje e o último dia): 0 quando já passou. */
export function diasRestantes(validoAte: string | undefined, agora: Date = new Date()): number {
  if (!validoAte) return 0;
  const fim = new Date(validoAte).getTime();
  if (!Number.isFinite(fim) || agora.getTime() > fim) return 0;
  return Math.max(1, Math.ceil((fim - agora.getTime()) / DIA_MS));
}

/** "20/11/2026" (data da validade no fuso de Brasília). */
export function dataDaValidade(validoAte: string): string {
  const [ano, mes, dia] = dataNoFuso(new Date(validoAte)).split("-");
  return `${dia}/${mes}/${ano}`;
}

/** "20/11". */
export function diaMesDaValidade(validoAte: string): string {
  return dataDaValidade(validoAte).slice(0, 5);
}

export function textoDoConvite(validoAte: string): string {
  return `Expira em ${dataDaValidade(validoAte)} às 23:59. Depois disso a pessoa não entra mais; você pode renovar.`;
}

export function faixaDeLeitura(validoAte: string, agora: Date = new Date()): string {
  const n = diasRestantes(validoAte, agora);
  return `Acesso de leitura até ${diaMesDaValidade(validoAte)}. ${n === 1 ? "Resta 1 dia." : `Restam ${n} dias.`}`;
}

type PessoaComRegistro = ComValidade & { id: string; nome: string; perfil: string };
type RegistroSimples = { acao: string; entidadeId?: string };

/** Fiscais cujo prazo passou e que ainda não têm "Acesso expirou" no histórico (só lê; quem grava é o Administrador). */
export function expiracoesSemRegistro<P extends PessoaComRegistro>(pessoas: P[], registros: RegistroSimples[], agora: Date = new Date()): P[] {
  return pessoas.filter(
    (pessoa) =>
      !!pessoa.validoAte &&
      !pessoa.acessoEncerradoEm &&
      !acessoVigente(pessoa, agora) &&
      !registros.some((registro) => registro.entidadeId === pessoa.id && registro.acao === `Acesso expirou em ${dataDaValidade(pessoa.validoAte!)}`)
  );
}
