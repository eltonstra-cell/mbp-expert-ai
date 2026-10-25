// Regras puras da janela "Ver e escolher" do pacote do tipo: o que está desmarcado e a cascata ambiente -> equipamentos.
// Desmarcar um ambiente novo desmarca os equipamentos dele que estavam marcados (e lembra quais); marcar de novo devolve só esses.

export type EstadoDoPacote = { desmarcados: string[]; porCascata: Record<string, string[]> };
export const ESTADO_INICIAL_DO_PACOTE: EstadoDoPacote = { desmarcados: [], porCascata: {} };

type ItemDeEquipamento = { ambiente: string; nome: string };

export const chaveDeAmbiente = (ambiente: string) => `a:${ambiente}`;
export const chaveDeEquipamento = (item: ItemDeEquipamento) => `e:${item.ambiente}|${item.nome.toLocaleLowerCase("pt-BR")}`;
export const chaveDeFluxo = (fluxo: string) => `f:${fluxo}`;

export const estaMarcado = (estado: EstadoDoPacote, chave: string) => !estado.desmarcados.includes(chave);
export const quantosMarcados = (estado: EstadoDoPacote, chaves: string[]) => chaves.filter((chave) => estaMarcado(estado, chave)).length;

export function alternarItem(estado: EstadoDoPacote, chave: string): EstadoDoPacote {
  const desmarcados = estado.desmarcados.includes(chave) ? estado.desmarcados.filter((c) => c !== chave) : [...estado.desmarcados, chave];
  return { ...estado, desmarcados };
}

/** Marca ou desmarca um ambiente. `saiuJuntos` = equipamentos que saíram com ele; `voltaramJuntos` = equipamentos que voltaram com ele. */
export function alternarAmbiente(estado: EstadoDoPacote, ambiente: string, equipamentos: ItemDeEquipamento[]): { estado: EstadoDoPacote; saiuJuntos: number; voltaramJuntos: number } {
  const chave = chaveDeAmbiente(ambiente);
  if (estaMarcado(estado, chave)) {
    const saem = equipamentos.filter((item) => item.ambiente === ambiente).map(chaveDeEquipamento).filter((c) => estaMarcado(estado, c));
    return {
      estado: { desmarcados: [...estado.desmarcados, chave, ...saem], porCascata: saem.length ? { ...estado.porCascata, [ambiente]: saem } : estado.porCascata },
      saiuJuntos: saem.length,
      voltaramJuntos: 0,
    };
  }
  const voltam = estado.porCascata[ambiente] || [];
  const { [ambiente]: _, ...resto } = estado.porCascata;
  return {
    estado: { desmarcados: estado.desmarcados.filter((c) => c !== chave && !voltam.includes(c)), porCascata: resto },
    saiuJuntos: 0,
    voltaramJuntos: voltam.length,
  };
}

/** "Marcar todos" / "Desmarcar todos" dos ambientes (com a cascata de cada um). */
export function marcarTodosOsAmbientes(estado: EstadoDoPacote, ambientes: string[], equipamentos: ItemDeEquipamento[], marcar: boolean): { estado: EstadoDoPacote; saiuJuntos: number; voltaramJuntos: number } {
  let atual = estado;
  let saiuJuntos = 0;
  let voltaramJuntos = 0;
  for (const ambiente of ambientes) {
    if (estaMarcado(atual, chaveDeAmbiente(ambiente)) === marcar) continue;
    const r = alternarAmbiente(atual, ambiente, equipamentos);
    atual = r.estado;
    saiuJuntos += r.saiuJuntos;
    voltaramJuntos += r.voltaramJuntos;
  }
  return { estado: atual, saiuJuntos, voltaramJuntos };
}

/** "Marcar todos" / "Desmarcar todos" de equipamentos ou fluxos (itens simples). Equipamento de ambiente desmarcado fica fora de "marcar". */
export function marcarTodosOsItens(estado: EstadoDoPacote, chaves: string[], marcar: boolean, bloqueadas: string[] = []): EstadoDoPacote {
  const alvo = chaves.filter((chave) => !bloqueadas.includes(chave));
  const semAlvo = estado.desmarcados.filter((chave) => !alvo.includes(chave));
  return { ...estado, desmarcados: marcar ? semAlvo : [...semAlvo, ...alvo] };
}

/** Equipamento cujo ambiente é novo no pacote e foi desmarcado: não pode ser marcado sozinho. */
export const equipamentoBloqueado = (estado: EstadoDoPacote, item: ItemDeEquipamento, ambientesNovos: string[]) =>
  ambientesNovos.includes(item.ambiente) && !estaMarcado(estado, chaveDeAmbiente(item.ambiente));

export function avisoDaCascata(saiuJuntos: number, voltaramJuntos: number): string {
  if (saiuJuntos > 0) return `${saiuJuntos} ${saiuJuntos === 1 ? "equipamento também saiu" : "equipamentos também saíram"}.`;
  if (voltaramJuntos > 0) return `${voltaramJuntos} ${voltaramJuntos === 1 ? "equipamento voltou" : "equipamentos voltaram"}.`;
  return "";
}

/** "13 de 13 marcados" / "1 de 1 marcado". */
export function contagemDoGrupo(marcados: number, total: number): string {
  return `${marcados} de ${total} ${total === 1 ? "marcado" : "marcados"}`;
}

/** Equipamentos agrupados pelo ambiente, na ordem em que cada ambiente aparece primeiro. */
export function agruparPorAmbiente<T extends ItemDeEquipamento>(itens: T[]): { ambiente: string; itens: T[] }[] {
  const grupos: { ambiente: string; itens: T[] }[] = [];
  for (const item of itens) {
    const grupo = grupos.find((g) => g.ambiente === item.ambiente);
    if (grupo) grupo.itens.push(item);
    else grupos.push({ ambiente: item.ambiente, itens: [item] });
  }
  return grupos;
}

/** Público de cada setor oficial na janela do pacote (agrupa os ambientes sem nome ambíguo). */
export type GrupoDeAmbiente = "Produção e apoio" | "Colaboradores" | "Clientes";
export function agruparAmbientesPorPublico(ambientes: string[], publicoDe: (ambiente: string) => GrupoDeAmbiente): { grupo: GrupoDeAmbiente; ambientes: string[] }[] {
  const ordem: GrupoDeAmbiente[] = ["Produção e apoio", "Colaboradores", "Clientes"];
  return ordem.map((grupo) => ({ grupo, ambientes: ambientes.filter((ambiente) => publicoDe(ambiente) === grupo) })).filter((item) => item.ambientes.length > 0);
}

/** Perguntas que cada fluxo marcado acrescenta ao setor dele (3 por fluxo); fluxo sem setor não soma. */
export function resumoDeFluxosPorSetor(fluxos: { setor: string }[], perguntasPorFluxo: number): { setor: string; fluxos: number; perguntas: number }[] {
  const mapa = new Map<string, number>();
  for (const fluxo of fluxos) if (fluxo.setor) mapa.set(fluxo.setor, (mapa.get(fluxo.setor) || 0) + 1);
  return [...mapa.entries()].map(([setor, quantidade]) => ({ setor, fluxos: quantidade, perguntas: quantidade * perguntasPorFluxo }));
}

/** "7 fluxos = 21 perguntas na Cozinha / Produção". */
export function linhaDoResumoDeFluxos(item: { setor: string; fluxos: number; perguntas: number }): string {
  return `${item.fluxos} ${item.fluxos === 1 ? "fluxo" : "fluxos"} = ${item.perguntas} perguntas ${item.setor ? `na ${item.setor}` : ""}`.trim();
}
