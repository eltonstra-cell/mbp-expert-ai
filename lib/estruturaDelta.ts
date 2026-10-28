// Ambientes e Equipamentos gravam na hora. Duas regras puras evitam perder trabalho:
// (1) o "Desfazer" é um DELTA aplicado ao estado de agora (nunca um retrato completo de quando o aviso apareceu);
// (2) o que a gravação muda é aplicado POR CIMA do formulário aberto (que pode ter alterações não salvas, por exemplo o pacote do tipo).
import type { EquipamentoSetor, FluxoOperacional } from "../types/index.ts";
import { bloqueioDeExcluirAmbiente } from "./regrasDoPacote3.ts";

/** Aplica ao `atual` o que mudou de `antes` para `depois`: sai o que saiu, entra (sem repetir) o que entrou; o resto do `atual` fica. */
export function aplicarDeltaDeLista(atual: string[], antes: string[], depois: string[]): string[] {
  const saiu = antes.filter((item) => !depois.includes(item));
  const entrou = depois.filter((item) => !antes.includes(item));
  const semOsQueSairam = atual.filter((item) => !saiu.includes(item));
  const novos = entrou.filter((item) => !semOsQueSairam.includes(item));
  return novos.length === 0 && semOsQueSairam.length === atual.length ? atual : [...semOsQueSairam, ...novos];
}

export function aplicarDeltaDeEquipamentos(atual: EquipamentoSetor[], antes: EquipamentoSetor[], depois: EquipamentoSetor[]): EquipamentoSetor[] {
  const idsAntes = new Map(antes.map((item) => [item.id, item]));
  const idsDepois = new Map(depois.map((item) => [item.id, item]));
  const saiu = new Set([...idsAntes.keys()].filter((id) => !idsDepois.has(id)));
  const mudou = new Map([...idsDepois].filter(([id, item]) => idsAntes.has(id) && JSON.stringify(idsAntes.get(id)) !== JSON.stringify(item)));
  const entrou = depois.filter((item) => !idsAntes.has(item.id));
  const base = atual.filter((item) => !saiu.has(item.id)).map((item) => mudou.get(item.id) ?? item);
  const novos = entrou.filter((item) => !base.some((outro) => outro.id === item.id));
  return saiu.size === 0 && mudou.size === 0 && novos.length === 0 ? atual : [...base, ...novos];
}

export function aplicarDeltaDeMapa<T>(atual: Record<string, T>, antes: Record<string, T> | undefined, depois: Record<string, T> | undefined): Record<string, T> {
  const de = antes || {};
  const para = depois || {};
  const resultado: Record<string, T> = { ...atual };
  let mudou = false;
  for (const chave of Object.keys(de)) {
    if (!(chave in para) && chave in resultado) {
      delete resultado[chave];
      mudou = true;
    }
  }
  for (const [chave, valor] of Object.entries(para)) {
    if (JSON.stringify(de[chave]) !== JSON.stringify(valor) && JSON.stringify(resultado[chave]) !== JSON.stringify(valor)) {
      resultado[chave] = valor;
      mudou = true;
    }
  }
  return mudou ? resultado : atual;
}

/** Só o setor vinculado de cada fluxo muda por causa de Ambientes; o resto do fluxo (editado no formulário) fica. */
export function aplicarDeltaDeFluxos(atual: FluxoOperacional[], antes: FluxoOperacional[] | undefined, depois: FluxoOperacional[] | undefined): FluxoOperacional[] {
  const antigos = new Map((antes || []).map((fluxo) => [fluxo.id, fluxo.setorVinculado || ""]));
  const novos = new Map((depois || []).map((fluxo) => [fluxo.id, fluxo.setorVinculado || ""]));
  let mudou = false;
  const resultado = atual.map((fluxo) => {
    if (!antigos.has(fluxo.id) || !novos.has(fluxo.id) || antigos.get(fluxo.id) === novos.get(fluxo.id)) return fluxo;
    mudou = true;
    return { ...fluxo, setorVinculado: novos.get(fluxo.id) as string };
  });
  return mudou ? resultado : atual;
}

/** Devolve um ambiente ao lugar em que estava (ou ao fim, se a lista encolheu); não repete. */
export function reinserirSetor(atuais: string[], setor: string, posicao: number): string[] {
  if (atuais.includes(setor)) return atuais;
  const copia = [...atuais];
  copia.splice(Math.min(Math.max(posicao, 0), copia.length), 0, setor);
  return copia;
}

/** Devolve um equipamento removido na posição de antes, sem repetir o mesmo id. Se o setor dele já não está marcado, não devolve (devolve null). */
export function reinserirEquipamentoNaPosicao(atuais: EquipamentoSetor[], item: EquipamentoSetor, posicao: number, setoresMarcados: string[]): EquipamentoSetor[] | null {
  if (atuais.some((outro) => outro.id === item.id)) return atuais;
  if (!setoresMarcados.includes(item.setor)) return null;
  const copia = [...atuais];
  copia.splice(Math.min(Math.max(posicao, 0), copia.length), 0, item);
  return copia;
}

/** Desfaz um "somar": tira só o que foi somado do item (se ele ainda existe); o resto da quantidade, mexida depois, fica. */
export function desfazerSoma(atuais: EquipamentoSetor[], id: string, somado: number): EquipamentoSetor[] {
  if (!atuais.some((item) => item.id === id)) return atuais;
  return atuais.map((item) => (item.id === id ? { ...item, quantidade: Math.max(1, Math.floor(Number(item.quantidade) || 1) - Math.max(0, Math.floor(somado) || 0)) } : item));
}

/** "Escolher setores": TODO setor retirado que ainda tem equipamento fica protegido, cada um com o seu bloqueio. */
export function bloqueiosDaRetirada(retirados: string[], equipamentos: EquipamentoSetor[]): { ambiente: string; mensagem: string }[] {
  const saida: { ambiente: string; mensagem: string }[] = [];
  for (const ambiente of retirados) {
    const resultado = bloqueioDeExcluirAmbiente(ambiente, equipamentos);
    if (resultado.bloqueado) saida.push({ ambiente, mensagem: resultado.mensagem });
  }
  return saida;
}

/** Fluxos ligados ao setor que sai: guardados para o Desfazer devolver o vínculo. */
export function fluxosLigadosAoSetor(fluxos: FluxoOperacional[] | undefined, setor: string): { id: string; setorVinculado: string }[] {
  return (fluxos || []).filter((fluxo) => fluxo.setorVinculado === setor).map((fluxo) => ({ id: fluxo.id, setorVinculado: setor }));
}

export function restaurarFluxos(fluxos: FluxoOperacional[], restaurar: { id: string; setorVinculado: string }[] | undefined): FluxoOperacional[] {
  if (!restaurar?.length) return fluxos;
  const porId = new Map(restaurar.map((item) => [item.id, item.setorVinculado]));
  return fluxos.map((fluxo) => (porId.has(fluxo.id) ? { ...fluxo, setorVinculado: porId.get(fluxo.id) as string } : fluxo));
}
