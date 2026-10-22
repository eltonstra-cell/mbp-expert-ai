// Quadro de equipamentos do Cadastro: regras puras (sem tela).
import type { EquipamentoSetor } from "../types/index.ts";

/** Ambientes para onde o item pode ir: todos menos o atual. */
export function ambientesParaMover(ambientes: string[], atual: string): string[] {
  return ambientes.filter((ambiente) => ambiente !== atual);
}

/** Muda o ambiente de UM equipamento; os outros ficam como estão. Destino igual ao atual ou vazio: devolve o mesmo array. */
export function moverEquipamento(equipamentos: EquipamentoSetor[], id: string, destino: string): EquipamentoSetor[] {
  const item = equipamentos.find((equipamento) => equipamento.id === id);
  if (!item || !destino || item.setor === destino) return equipamentos;
  return equipamentos.map((equipamento) => (equipamento.id === id ? { ...equipamento, setor: destino } : equipamento));
}
