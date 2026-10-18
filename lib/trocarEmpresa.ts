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
