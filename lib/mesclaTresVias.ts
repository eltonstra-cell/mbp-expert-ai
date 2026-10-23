// Mesclagem de 3 vias do estado: BASE (o que o servidor tinha na última sincronização), LOCAL (o que está neste aparelho) e NUVEM (o que o servidor tem agora).
// Regra por campo: só a nuvem mudou -> vale a nuvem; só este aparelho mudou -> vale este aparelho; os dois mudaram para valores diferentes -> CONFLITO.
// No conflito o estado fica com a versão deste aparelho (nada se perde) e as duas versões vão para a lista de conflitos, para o RT escolher.
// Itens do checklist de uma visita são mesclados um a um (por id). Lógica pura, sem navegador.
import type { AppDB } from "../types/index.ts";

type Registro = { id: string } & Record<string, unknown>;

export type ColecaoMesclada = "visitas" | "ncs" | "evidencias" | "registrosPop" | "comprovantes" | "colaboradores" | "capacitacoes" | "leiturasPop" | "empresas";

export type Conflito = {
  /** Chave única do conflito (coleção, registro, item e campo). */
  id: string;
  colecao: ColecaoMesclada;
  registroId: string;
  /** Item do checklist, quando o conflito é de uma resposta. */
  itemId?: string;
  /** Campo em conflito; vazio = o registro inteiro (apagado de um lado e mudado do outro). */
  campo?: string;
  rotulo: string;
  /** Versão deste aparelho (undefined = apagado aqui). */
  meu: unknown;
  /** Versão da nuvem (undefined = apagado na nuvem). */
  nuvem: unknown;
};

const COLECOES_POR_ID = ["visitas", "ncs", "evidencias", "registrosPop", "comprovantes", "colaboradores", "capacitacoes", "leiturasPop"] as const;

function estavel(valor: unknown): string {
  if (valor === undefined) return "undefined";
  if (Array.isArray(valor)) return `[${valor.map(estavel).join(",")}]`;
  if (valor && typeof valor === "object") {
    const objeto = valor as Record<string, unknown>;
    return `{${Object.keys(objeto)
      .filter((chave) => objeto[chave] !== undefined)
      .sort()
      .map((chave) => `${JSON.stringify(chave)}:${estavel(objeto[chave])}`)
      .join(",")}}`;
  }
  return JSON.stringify(valor);
}

export const iguais = (a: unknown, b: unknown) => estavel(a) === estavel(b);

type Resultado<T> = { valor: T; conflito: boolean };

/** 3 vias para um valor inteiro. Conflito: fica o valor local. */
function tresVias<T>(base: T, local: T, nuvem: T): Resultado<T> {
  if (iguais(local, nuvem)) return { valor: local, conflito: false };
  if (iguais(local, base)) return { valor: nuvem, conflito: false };
  if (iguais(nuvem, base)) return { valor: local, conflito: false };
  return { valor: local, conflito: true };
}

function rotuloDoRegistro(colecao: ColecaoMesclada, registro: Record<string, unknown> | undefined, id: string): string {
  const nome = (registro?.titulo || registro?.nomeFantasia || registro?.nome || registro?.data || id) as string;
  const tipo: Record<ColecaoMesclada, string> = { visitas: "Visita", ncs: "Correção", evidencias: "Evidência", registrosPop: "Registro de POP", comprovantes: "Comprovante", colaboradores: "Pessoa", capacitacoes: "Capacitação", leiturasPop: "Leitura de POP", empresas: "Empresa" };
  return `${tipo[colecao]} · ${String(nome)}`;
}

type Contexto = { conflitos: Conflito[] };

/** Mescla os campos de um registro (um a um). Dentro de uma visita, o checklist é mesclado item a item. */
function mesclarCampos(colecao: ColecaoMesclada, base: Registro | undefined, local: Registro, nuvem: Registro, contexto: Contexto): Registro {
  const resultado: Record<string, unknown> = {};
  const chaves = new Set([...Object.keys(local), ...Object.keys(nuvem), ...Object.keys(base || {})]);
  for (const chave of chaves) {
    if (colecao === "visitas" && chave === "checklist" && Array.isArray(local.checklist) && Array.isArray(nuvem.checklist)) {
      resultado.checklist = mesclarChecklist(base, local, nuvem, contexto);
      continue;
    }
    const r = tresVias(base?.[chave], local[chave], nuvem[chave]);
    if (r.conflito) {
      contexto.conflitos.push({
        id: `${colecao}:${local.id}::${chave}`,
        colecao,
        registroId: local.id,
        campo: chave,
        rotulo: `${rotuloDoRegistro(colecao, local, local.id)} · ${chave}`,
        meu: local[chave],
        nuvem: nuvem[chave],
      });
    }
    if (r.valor !== undefined) resultado[chave] = r.valor;
  }
  return resultado as Registro;
}

function mesclarChecklist(baseVisita: Registro | undefined, local: Registro, nuvem: Registro, contexto: Contexto): unknown[] {
  const lista = (v: Registro | undefined) => (Array.isArray(v?.checklist) ? (v!.checklist as Registro[]) : []);
  const porId = (itens: Registro[]) => new Map(itens.map((item) => [item.id, item]));
  const b = porId(lista(baseVisita));
  const l = porId(lista(local));
  const n = porId(lista(nuvem));
  const ordem = [...lista(nuvem).map((item) => item.id), ...lista(local).map((item) => item.id).filter((id) => !n.has(id))];
  const saida: unknown[] = [];
  for (const id of ordem) {
    const r = tresVias<Registro | undefined>(b.get(id), l.get(id), n.get(id));
    if (r.conflito) {
      const meu = l.get(id);
      const deles = n.get(id);
      // Mesma resposta mudada nos dois lados: guarda o item inteiro; a escolha é por item.
      contexto.conflitos.push({
        id: `visitas:${local.id}:${id}`,
        colecao: "visitas",
        registroId: local.id,
        itemId: id,
        rotulo: `Visita · ${String(meu?.ambiente || deles?.ambiente || "")} · ${String(meu?.titulo || deles?.titulo || id)}`,
        meu,
        nuvem: deles,
      });
    }
    if (r.valor !== undefined) saida.push(r.valor);
  }
  return saida;
}

function mesclarLista(colecao: ColecaoMesclada, base: Registro[] | undefined, local: Registro[] | undefined, nuvem: Registro[] | undefined, contexto: Contexto): Registro[] | undefined {
  if (local === undefined && nuvem === undefined) return undefined;
  const porId = (itens: Registro[] | undefined) => new Map((itens || []).map((item) => [item.id, item]));
  const b = porId(base);
  const l = porId(local);
  const n = porId(nuvem);
  const ordem = [...(nuvem || []).map((item) => item.id), ...(local || []).map((item) => item.id).filter((id) => !n.has(id))];
  const saida: Registro[] = [];
  for (const id of ordem) {
    const bi = b.get(id);
    const li = l.get(id);
    const ni = n.get(id);
    if (iguais(li, ni)) {
      if (li) saida.push(li);
      continue;
    }
    if (iguais(li, bi)) {
      if (ni) saida.push(ni);
      continue;
    }
    if (iguais(ni, bi)) {
      if (li) saida.push(li);
      continue;
    }
    // Os dois lados mudaram.
    if (li && ni) {
      saida.push(mesclarCampos(colecao, bi, li, ni, contexto));
    } else {
      // Apagado de um lado e mudado do outro: o registro fica e o conflito é mostrado.
      contexto.conflitos.push({ id: `${colecao}:${id}`, colecao, registroId: id, rotulo: rotuloDoRegistro(colecao, (li || ni) as Registro, id), meu: li, nuvem: ni });
      saida.push((li || ni) as Registro);
    }
  }
  return saida;
}

export type ResultadoDaMesclagem = { estado: AppDB; conflitos: Conflito[] };

/**
 * `base` pode ser ausente (aparelho que nunca guardou uma base): nesse caso o chamador deve usar a recuperação por união.
 * Coleções que só o servidor governa (usuários, configuração de acesso, relatórios emitidos) seguem a nuvem; a auditoria é unida.
 */
export function mesclarTresVias(base: AppDB, local: AppDB, nuvem: AppDB): ResultadoDaMesclagem {
  const contexto: Contexto = { conflitos: [] };
  const estado: Record<string, unknown> = { ...nuvem };

  for (const colecao of COLECOES_POR_ID) {
    const lista = mesclarLista(colecao, base[colecao] as Registro[] | undefined, local[colecao] as Registro[] | undefined, nuvem[colecao] as Registro[] | undefined, contexto);
    if (lista !== undefined) estado[colecao] = lista;
  }

  // Empresas: um mapa por id; cada empresa é mesclada campo a campo.
  const mapaEmpresas: Record<string, unknown> = {};
  const ids = new Set([...Object.keys(nuvem.empresas || {}), ...Object.keys(local.empresas || {})]);
  for (const id of ids) {
    const b = base.empresas?.[id] as unknown as Registro | undefined;
    const l = local.empresas?.[id] as unknown as Registro | undefined;
    const n = nuvem.empresas?.[id] as unknown as Registro | undefined;
    let valor: unknown;
    if (iguais(l, n)) valor = l;
    else if (iguais(l, b)) valor = n;
    else if (iguais(n, b)) valor = l;
    else if (l && n) valor = mesclarCampos("empresas", b, l, n, contexto);
    else {
      contexto.conflitos.push({ id: `empresas:${id}`, colecao: "empresas", registroId: id, rotulo: rotuloDoRegistro("empresas", (l || n) as Registro, id), meu: l, nuvem: n });
      valor = l || n;
    }
    if (valor !== undefined) mapaEmpresas[id] = valor;
  }
  estado.empresas = mapaEmpresas;

  // Auditoria: une (o que só existe aqui entra no fim). Escolha de empresa: a deste aparelho.
  const auditoria = new Map((nuvem.registrosAuditoria || []).map((r) => [r.id, r]));
  for (const r of local.registrosAuditoria || []) if (!auditoria.has(r.id)) auditoria.set(r.id, r);
  estado.registrosAuditoria = [...auditoria.values()];
  estado.empresaAtualId = local.empresaAtualId && mapaEmpresas[local.empresaAtualId] ? local.empresaAtualId : nuvem.empresaAtualId;

  return { estado: estado as unknown as AppDB, conflitos: contexto.conflitos };
}

/** Aplica a escolha "usar a da nuvem" de um conflito sobre o estado atual (a escolha "manter o meu" não muda nada). */
export function usarVersaoDaNuvem(db: AppDB, conflito: Conflito): AppDB {
  const copia = { ...db } as unknown as Record<string, unknown>;
  const { colecao, registroId, itemId, campo } = conflito;
  if (colecao === "empresas") {
    const empresas = { ...db.empresas } as Record<string, unknown>;
    if (campo) empresas[registroId] = { ...(empresas[registroId] as object), [campo]: conflito.nuvem };
    else if (conflito.nuvem === undefined) delete empresas[registroId];
    else empresas[registroId] = conflito.nuvem;
    return { ...db, empresas: empresas as unknown as AppDB["empresas"] };
  }
  const lista = ((db as unknown as Record<string, Registro[] | undefined>)[colecao] || []).slice();
  const indice = lista.findIndex((item) => item.id === registroId);
  if (itemId) {
    if (indice < 0) return db;
    const checklist = ((lista[indice].checklist as Registro[] | undefined) || []).slice();
    const i = checklist.findIndex((item) => item.id === itemId);
    if (conflito.nuvem === undefined) {
      if (i >= 0) checklist.splice(i, 1);
    } else if (i >= 0) checklist[i] = conflito.nuvem as Registro;
    else checklist.push(conflito.nuvem as Registro);
    lista[indice] = { ...lista[indice], checklist };
  } else if (campo) {
    if (indice < 0) return db;
    lista[indice] = { ...lista[indice], [campo]: conflito.nuvem };
  } else if (conflito.nuvem === undefined) {
    if (indice >= 0) lista.splice(indice, 1);
  } else if (indice >= 0) lista[indice] = conflito.nuvem as Registro;
  else lista.push(conflito.nuvem as Registro);
  copia[colecao] = lista;
  return copia as unknown as AppDB;
}

/** Quantos itens deste aparelho ainda não chegaram ao servidor: registros mudados e, nas visitas, respostas mudadas. */
export function contarAlteracoesPendentes(base: AppDB | null | undefined, local: AppDB): number {
  if (!base) return 0;
  let total = 0;
  for (const colecao of COLECOES_POR_ID) {
    const b = new Map(((base[colecao] as Registro[] | undefined) || []).map((r) => [r.id, r]));
    for (const item of ((local[colecao] as Registro[] | undefined) || [])) {
      const antes = b.get(item.id);
      if (iguais(antes, item)) continue;
      if (colecao === "visitas" && antes && Array.isArray(item.checklist)) {
        const bi = new Map(((antes.checklist as Registro[] | undefined) || []).map((r) => [r.id, r]));
        const mudadas = (item.checklist as Registro[]).filter((c) => !iguais(bi.get(c.id), c)).length;
        const { checklist: _c1, ...restoLocal } = item;
        const { checklist: _c2, ...restoBase } = antes;
        total += mudadas + (iguais(restoLocal, restoBase) ? 0 : 1);
      } else {
        total += 1;
      }
    }
  }
  const empresasBase = base.empresas || {};
  for (const [id, empresa] of Object.entries(local.empresas || {})) if (!iguais(empresasBase[id], empresa)) total += 1;
  return total;
}
