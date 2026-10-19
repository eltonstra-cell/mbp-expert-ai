// Lista do painel "Trocar empresa" do Campo: só as empresas que a pessoa pode acessar, sem arquivadas.
import { podeAcessarEmpresa } from "./permissions.ts";
import { nomeSemNumerosNoInicio } from "./navigation.ts";
import type { UsuarioSistema } from "../types/index.ts";

type EmpresaBase = { id: string; nomeFantasia?: string; razaoSocial?: string; arquivada?: boolean };

export type OpcaoDeEmpresa = { id: string; nome: string; ativa: boolean };

export function opcoesDeEmpresa(
  empresas: EmpresaBase[],
  usuario: UsuarioSistema | null | undefined,
  empresaAtivaId: string | null | undefined
): OpcaoDeEmpresa[] {
  return empresas
    .filter((empresa) => podeAcessarEmpresa(usuario, empresa.id))
    .filter((empresa) => !empresa.arquivada || empresa.id === empresaAtivaId)
    .map((empresa) => ({
      id: empresa.id,
      nome: nomeSemNumerosNoInicio((empresa.nomeFantasia || "").trim()) || nomeSemNumerosNoInicio((empresa.razaoSocial || "").trim()) || "Empresa",
      ativa: empresa.id === empresaAtivaId,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

type VisitaBase = { id: string; empresaId: string; status: string; criadoEm?: string; data?: string };

/**
 * Visita em andamento que o Início e os atalhos usam: a que está aberta, se for da empresa ativa;
 * senão a mais recente da empresa ativa. Nunca uma visita de outra empresa. Sem empresa ativa, a mais recente de todas.
 */
export function visitaDaEmpresaAtiva<T extends VisitaBase>(visitas: T[], empresaAtivaId: string | null | undefined, visitaAbertaId?: string | null): T | undefined {
  const abertas = visitas.filter((visita) => visita.status === "Em andamento" && (!empresaAtivaId || visita.empresaId === empresaAtivaId));
  const aberta = visitaAbertaId ? abertas.find((visita) => visita.id === visitaAbertaId) : undefined;
  if (aberta) return aberta;
  return [...abertas].sort((a, b) => (b.criadoEm || b.data || "").localeCompare(a.criadoEm || a.data || ""))[0];
}
