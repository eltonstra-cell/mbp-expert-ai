"use client";

import { createContext, useContext } from "react";
import type { ResultadoDoRegistro, DadosDoRegistro } from "@/lib/registrosEmpresa";
import type { ComprovanteTerceiro, Empresa, RegistroPop, UsuarioSistema } from "@/types";

export type NovoRegistroDados = Pick<DadosDoRegistro, "popId" | "popVersao" | "dataHora" | "descricao" | "ambiente" | "corrigeRegistroId">;

// Dados da empresa que as abas Registros e Treinamento do POP usam, sem passar prop por todos os níveis.
export type RegistrosEmpresaValor = {
  empresaId: string;
  empresa?: Empresa;
  usuario: UsuarioSistema | null;
  registros: RegistroPop[];
  comprovantes: ComprovanteTerceiro[];
  podeCriarRegistro: boolean;
  /** Pode definir a guarda e escolher o registro que prova a execução (quem edita a empresa). */
  podeEditarEmpresa: boolean;
  novoRegistro: (dados: NovoRegistroDados) => ResultadoDoRegistro;
  definirGuarda: (dias: number) => void;
  definirProva: (popId: string, registroId: string) => void;
};

export const RegistrosEmpresaContext = createContext<RegistrosEmpresaValor | null>(null);

export function useRegistrosDaEmpresa(): RegistrosEmpresaValor | null {
  return useContext(RegistrosEmpresaContext);
}
