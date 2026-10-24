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

const chaveDoNome = (nome: string) => nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();

export type ResultadoDaCopia = { equipamentos: EquipamentoSetor[]; criados: string[]; ignorados: number };

/**
 * "Copiar para outros ambientes": cada equipamento escolhido vai para cada ambiente de destino. Quem já tem um equipamento com o mesmo nome
 * no destino não recebe repetido (conta em `ignorados`). A cópia leva nome, quantidade e limite de temperatura; não leva a observação.
 */
export function copiarEquipamentos(equipamentos: EquipamentoSetor[], ids: string[], destinos: string[], novoId: () => string): ResultadoDaCopia {
  const origem = equipamentos.filter((item) => ids.includes(item.id));
  const criados: string[] = [];
  const novos: EquipamentoSetor[] = [];
  let ignorados = 0;
  for (const item of origem) {
    for (const destino of destinos) {
      if (!destino || destino === item.setor) continue;
      const jaTem = [...equipamentos, ...novos].some((outro) => outro.setor === destino && chaveDoNome(outro.nome) === chaveDoNome(item.nome));
      if (jaTem) {
        ignorados += 1;
        continue;
      }
      const id = novoId();
      criados.push(id);
      novos.push({ ...item, id, setor: destino, observacao: "", estado: "Não avaliado" });
    }
  }
  return { equipamentos: novos.length ? [...equipamentos, ...novos] : equipamentos, criados, ignorados };
}

/** Desfaz uma cópia: tira só o que ela criou (pelos ids), sem mexer em mais nada. */
export function desfazerCopia(equipamentos: EquipamentoSetor[], criados: string[]): EquipamentoSetor[] {
  return equipamentos.filter((item) => !criados.includes(item.id));
}

/** Equipamentos do pacote do tipo, só nos ambientes que estão marcados e que ainda não têm um com o mesmo nome. Vêm marcados como "sugeridos". */
export function equipamentosDoPacote(
  sugeridos: { nome: string; ambiente: string; quantidade: number }[],
  ambientesMarcados: string[],
  existentes: EquipamentoSetor[],
  novoId: () => string,
  limiteDoNome: (nome: string) => string | undefined
): EquipamentoSetor[] {
  const saida: EquipamentoSetor[] = [];
  for (const item of sugeridos) {
    if (!ambientesMarcados.includes(item.ambiente)) continue;
    if ([...existentes, ...saida].some((outro) => outro.setor === item.ambiente && chaveDoNome(outro.nome) === chaveDoNome(item.nome))) continue;
    const limite = limiteDoNome(item.nome);
    saida.push({ id: novoId(), setor: item.ambiente, nome: item.nome, quantidade: item.quantidade, estado: "Não avaliado", observacao: "", sugerido: true, ...(limite ? { limiteTemperaturaId: limite } : {}) });
  }
  return saida;
}

/** O RT confirma o que veio de sugestão (o equipamento e o limite proposto). */
export function confirmarSugestao(equipamentos: EquipamentoSetor[], id: string): EquipamentoSetor[] {
  return equipamentos.map((item) => {
    if (item.id !== id) return item;
    const { sugerido: _sugerido, ...resto } = item;
    return item.limiteTemperaturaId ? { ...resto, limiteConfirmado: true } : resto;
  });
}

/** Troca (ou tira, com vazio) o limite de temperatura de um equipamento; quando o RT escolhe, já fica confirmado. */
export function definirLimite(equipamentos: EquipamentoSetor[], id: string, limiteId: string): EquipamentoSetor[] {
  return equipamentos.map((item) => {
    if (item.id !== id) return item;
    const { limiteTemperaturaId: _limite, limiteConfirmado: _confirmado, ...resto } = item;
    return limiteId ? { ...resto, limiteTemperaturaId: limiteId, limiteConfirmado: true } : resto;
  });
}

/** Limite de temperatura que vale para o equipamento: o confirmado pelo RT; sem confirmação, só o proposto; sem nenhum, nada é classificado. */
export function limiteDoEquipamento(item: Pick<EquipamentoSetor, "limiteTemperaturaId" | "limiteConfirmado">): { id: string; confirmado: boolean } | null {
  return item.limiteTemperaturaId ? { id: item.limiteTemperaturaId, confirmado: Boolean(item.limiteConfirmado) } : null;
}
