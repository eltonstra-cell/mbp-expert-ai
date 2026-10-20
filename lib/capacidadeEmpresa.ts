// Capacidade e turnos da empresa. Usados para dimensionar o plano e sugerir a frequência das visitas.
// Não são critério de norma e não geram nenhuma regra automática.
import type { CapacidadeDaEmpresa } from "../types/index.ts";

export const TEXTO_DA_CAPACIDADE = "Usado para dimensionar o plano e sugerir a frequência das visitas. Não é critério de norma.";

export type CapacidadeEmTexto = {
  refeicoesPorDia: string;
  funcionarios: string;
  turnos: string;
  tipoDeServico: string;
  vigilanciaDeReferencia: string;
};

export const CAPACIDADE_VAZIA: CapacidadeEmTexto = { refeicoesPorDia: "", funcionarios: "", turnos: "", tipoDeServico: "", vigilanciaDeReferencia: "" };

export function capacidadeParaFormulario(capacidade: CapacidadeDaEmpresa | undefined): CapacidadeEmTexto {
  return {
    refeicoesPorDia: capacidade?.refeicoesPorDia?.toString() ?? "",
    funcionarios: capacidade?.funcionarios?.toString() ?? "",
    turnos: capacidade?.turnos?.toString() ?? "",
    tipoDeServico: capacidade?.tipoDeServico ?? "",
    vigilanciaDeReferencia: capacidade?.vigilanciaDeReferencia ?? "",
  };
}

type Erros = Partial<Record<"refeicoesPorDia" | "funcionarios" | "turnos", string>>;

const LIMITES = { refeicoesPorDia: 1_000_000, funcionarios: 100_000, turnos: 6 } as const;

/** Valida na hora, campo a campo: número inteiro positivo dentro de um limite razoável. */
export function validarCapacidade(texto: CapacidadeEmTexto): Erros {
  const erros: Erros = {};
  for (const campo of ["refeicoesPorDia", "funcionarios", "turnos"] as const) {
    const bruto = texto[campo].trim();
    if (!bruto) continue;
    const numero = Number(bruto);
    if (!Number.isInteger(numero) || numero < 1) erros[campo] = "Informe um número inteiro maior que zero.";
    else if (numero > LIMITES[campo]) erros[campo] = `O máximo aceito é ${LIMITES[campo].toLocaleString("pt-BR")}.`;
  }
  return erros;
}

/** Texto do formulário para o dado guardado; sem nenhum campo preenchido, não guarda nada. */
export function capacidadeDoFormulario(texto: CapacidadeEmTexto): CapacidadeDaEmpresa | undefined {
  if (Object.keys(validarCapacidade(texto)).length) return undefined;
  const numero = (valor: string) => (valor.trim() ? Number(valor) : undefined);
  const capacidade: CapacidadeDaEmpresa = {
    ...(numero(texto.refeicoesPorDia) !== undefined ? { refeicoesPorDia: numero(texto.refeicoesPorDia) } : {}),
    ...(numero(texto.funcionarios) !== undefined ? { funcionarios: numero(texto.funcionarios) } : {}),
    ...(numero(texto.turnos) !== undefined ? { turnos: numero(texto.turnos) } : {}),
    ...(texto.tipoDeServico.trim() ? { tipoDeServico: texto.tipoDeServico.trim() } : {}),
    ...(texto.vigilanciaDeReferencia.trim() ? { vigilanciaDeReferencia: texto.vigilanciaDeReferencia.trim() } : {}),
  };
  return Object.keys(capacidade).length ? capacidade : undefined;
}
