// "Copiar de outra empresa" (Equipamentos): quem pode ser origem e como a cópia entra na empresa de destino.
// A regra de elegibilidade é PURA e é a mesma que a rota do servidor (app/api/empresas/equipamentos-origem) usa; a tela só mostra o que a rota devolve.
import { podeAcessarEmpresa, podeExecutar } from "./permissions.ts";
import { assinaturaDaPagina, situacaoDaRevisao } from "./revisaoDeCadastros.ts";
import { adicionarEquipamentoNoSetor, equipamentoRepetidoNoSetor, quantidadeValida } from "./equipamentosCadastro.ts";
import type { Empresa, EquipamentoSetor, UsuarioSistema } from "../types/index.ts";

/** Só estes três campos de cada equipamento saem da origem (nenhum dado além deles). */
export type EquipamentoDeOrigem = { setor: string; nome: string; quantidade: number };

export type MotivoDaRecusa = "destino-inexistente" | "origem-inexistente" | "mesma-empresa" | "sem-permissao-no-destino" | "sem-acesso-a-origem" | "origem-sem-revisao" | "origem-arquivada";

export const MENSAGEM_DA_RECUSA: Record<MotivoDaRecusa, string> = {
  "destino-inexistente": "Empresa de destino não encontrada.",
  "origem-inexistente": "Empresa de origem não encontrada.",
  "mesma-empresa": "A origem precisa ser outra empresa.",
  "sem-permissao-no-destino": "Seu perfil não permite editar a empresa de destino.",
  "sem-acesso-a-origem": "Você não tem acesso à empresa de origem.",
  "origem-sem-revisao": "A empresa de origem precisa ter Ambientes e Equipamentos revisados.",
  "origem-arquivada": "A empresa de origem está arquivada.",
};

type EmpresasPorId = Record<string, Pick<Empresa, "id" | "nomeFantasia" | "razaoSocial" | "arquivada" | "setoresManual" | "setorOficialDoAmbiente" | "modelosQuestionarioAmbientes" | "equipamentosSetores" | "fluxosOperacionais" | "cadastrosRevisados">>;

/** Ambientes E Equipamentos com revisão ativa e válida: marcada e a assinatura ainda bate com o que está salvo (nada mudou depois). */
export function origemTemRevisaoEmDia(empresa: Pick<Empresa, "setoresManual" | "setorOficialDoAmbiente" | "modelosQuestionarioAmbientes" | "equipamentosSetores" | "fluxosOperacionais" | "cadastrosRevisados">): boolean {
  return (["ambientes", "equipamentos"] as const).every((pagina) => situacaoDaRevisao(empresa.cadastrosRevisados?.[pagina], assinaturaDaPagina(empresa, pagina)) === "em-dia");
}

/**
 * `usuario` nulo = controle de acesso não aplicado (ambiente local): as checagens de pessoa ficam de fora, as da empresa continuam.
 * Os dois ids precisam existir no MESMO estado (mesma organização/workspace).
 */
export function destinoEditavel(usuario: UsuarioSistema | null, empresas: EmpresasPorId, destinoId: string): { ok: true } | { ok: false; motivo: MotivoDaRecusa } {
  if (!Object.hasOwn(empresas, destinoId) || !empresas[destinoId]) return { ok: false, motivo: "destino-inexistente" };
  if (usuario && !podeExecutar(usuario, "empresas.editar", destinoId)) return { ok: false, motivo: "sem-permissao-no-destino" };
  return { ok: true };
}

export function origemElegivel(usuario: UsuarioSistema | null, empresas: EmpresasPorId, destinoId: string, origemId: string): { ok: true } | { ok: false; motivo: MotivoDaRecusa } {
  // Ordem: primeiro tudo o que diz respeito a QUEM PODE (destino editável, origem existente e acessível); só depois "mesma empresa", arquivada e revisão.
  // Assim a resposta de quem não pode nunca revela se a empresa existe nem em que estado ela está.
  const destino = destinoEditavel(usuario, empresas, destinoId);
  if (!destino.ok) return destino;
  const origem = Object.hasOwn(empresas, origemId) ? empresas[origemId] : undefined;
  if (!origem) return { ok: false, motivo: "origem-inexistente" };
  if (usuario && !podeAcessarEmpresa(usuario, origemId)) return { ok: false, motivo: "sem-acesso-a-origem" };
  if (destinoId === origemId) return { ok: false, motivo: "mesma-empresa" };
  if (origem.arquivada) return { ok: false, motivo: "origem-arquivada" };
  if (!origemTemRevisaoEmDia(origem)) return { ok: false, motivo: "origem-sem-revisao" };
  return { ok: true };
}

/** Empresas que podem ser origem para o destino (id e nome apenas). */
export function origensElegiveis(usuario: UsuarioSistema | null, empresas: EmpresasPorId, destinoId: string): { id: string; nome: string }[] {
  return Object.keys(empresas)
    .filter((id) => origemElegivel(usuario, empresas, destinoId, id).ok)
    .map((id) => ({ id, nome: empresas[id].nomeFantasia || empresas[id].razaoSocial || "Sem nome" }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Os equipamentos da origem, só com setor, nome e quantidade. */
export function equipamentosDaOrigem(origem: Pick<Empresa, "equipamentosSetores">): EquipamentoDeOrigem[] {
  return (origem.equipamentosSetores || []).filter((item) => item && item.nome && item.setor).map((item) => ({ setor: String(item.setor), nome: String(item.nome), quantidade: quantidadeValida(item.quantidade) }));
}

export type ResultadoDaCopiaDeOutraEmpresa = { equipamentos: EquipamentoSetor[]; criados: string[]; jaExistiam: number; setoresIgnorados: string[] };

/**
 * Copia para os MESMOS setores da empresa de destino: só entram setores escolhidos que estão marcados no destino. Item de mesmo nome no setor
 * (sem acento e sem diferença de caixa) não duplica: o que o destino já tinha fica como está e o item é contado em `jaExistiam`.
 */
export function copiarDeOutraEmpresa(
  equipamentosDoDestino: EquipamentoSetor[],
  itens: EquipamentoDeOrigem[],
  setoresEscolhidos: string[],
  setoresDoDestino: string[],
  novoId: () => string
): ResultadoDaCopiaDeOutraEmpresa {
  let atual = equipamentosDoDestino;
  const criados: string[] = [];
  let jaExistiam = 0;
  const setoresIgnorados = setoresEscolhidos.filter((setor) => !setoresDoDestino.includes(setor));
  for (const item of itens) {
    if (!setoresEscolhidos.includes(item.setor) || !setoresDoDestino.includes(item.setor)) continue;
    if (equipamentoRepetidoNoSetor(atual, item.setor, item.nome)) {
      jaExistiam += 1;
      continue;
    }
    const id = novoId();
    atual = adicionarEquipamentoNoSetor(atual, { id, setor: item.setor, nome: item.nome, quantidade: item.quantidade }).equipamentos;
    criados.push(id);
  }
  return { equipamentos: atual, criados, jaExistiam, setoresIgnorados };
}
