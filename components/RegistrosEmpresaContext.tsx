"use client";

import { createContext, useContext } from "react";
import type { ResultadoDoRegistro, DadosDoRegistro } from "@/lib/registrosEmpresa";
import type { Colaborador, ComprovanteTerceiro, Empresa, LeituraPop, NaoConformidade, RegistroPop, UsuarioSistema } from "@/types";
import type { DadosDoFormulario } from "@/components/pc/PcComprovantes";

export type NovoRegistroDados = Pick<DadosDoRegistro, "popId" | "popVersao" | "dataHora" | "descricao" | "ambiente" | "corrigeRegistroId">;

// Dados da empresa que a lista de POPs e a ficha do POP (Registros, Comprovantes, Quem leu) usam, sem passar prop por todos os níveis.
export type RegistrosEmpresaValor = {
  empresaId: string;
  empresa?: Empresa;
  usuario: UsuarioSistema | null;
  registros: RegistroPop[];
  comprovantes: ComprovanteTerceiro[];
  podeCriarRegistro: boolean;
  /** Pode definir a guarda e escolher o registro que prova a execução (quem edita a empresa). */
  podeEditarEmpresa: boolean;
  /** Pessoas e leituras de POP: só quem gerencia pessoas (Administrador, RT, Gestor, Gerente). */
  podeGerenciarPessoas: boolean;
  colaboradores: Colaborador[];
  leituras: LeituraPop[];
  registrarLeitura: (popId: string, popVersao: string, colaboradorId: string, data: string) => void;
  novoRegistro: (dados: NovoRegistroDados) => ResultadoDoRegistro;
  definirGuarda: (dias: number) => void;
  definirProva: (popId: string, registroId: string) => void;
  /** Correções da empresa (só para quem acompanha correções): a lista de POPs usa para "correção atrasada". */
  ncs: NaoConformidade[];
  /** Ambientes cadastrados na empresa (o registro escolhe de uma lista, não digita). */
  ambientes: string[];
  /** Comprovantes: Administrador, RT, Gestor e Gerente gerenciam; o Fiscal lê; o Executor não vê. */
  podeGerenciarComprovantes: boolean;
  podeVerComprovantes: boolean;
  online: boolean;
  salvarComprovante: (dados: DadosDoFormulario, arquivo: File | null) => Promise<string>;
  removerComprovante: (comprovante: ComprovanteTerceiro) => void;
  urlDoComprovante: (comprovante: ComprovanteTerceiro) => string;
};

export const RegistrosEmpresaContext = createContext<RegistrosEmpresaValor | null>(null);

export function useRegistrosDaEmpresa(): RegistrosEmpresaValor | null {
  return useContext(RegistrosEmpresaContext);
}
