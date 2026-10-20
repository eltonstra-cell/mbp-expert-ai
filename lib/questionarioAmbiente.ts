// Questionário por ambiente editável pelo RT: parte do modelo que já existe no app, mais perguntas da empresa.
// O app não inventa critério: o modelo vem de lib/manualChecklist.ts e cada pergunta mostra a fonte que já tem
// (hoje o Manual de Boas Práticas), sempre marcada "conferir". Nada é apagado de verdade quando já foi usado em visita.
import type { ConfigQuestionario, PerguntaDoQuestionario, PerfilUsuario, UsuarioSistema, Visita } from "../types/index.ts";
import { acessoVigente } from "./validadeDeAcesso.ts";

type ItemDoModelo = { categoria: string; titulo: string; criticidade?: PerguntaDoQuestionario["criticidade"]; referencia?: string; orientacao?: string };

const EDITORES: PerfilUsuario[] = ["Administrador", "Consultor/RT"];

/** Só Administrador e RT editam o questionário (e só no PC). Fiscal, Executor, Gestor e Gerente apenas usam o vigente. */
export function podeEditarQuestionario(usuario: Pick<UsuarioSistema, "perfil" | "status" | "validoAte" | "acessoEncerradoEm"> | null | undefined): boolean {
  return Boolean(usuario) && usuario!.status !== "Suspenso" && acessoVigente(usuario!) && EDITORES.includes(usuario!.perfil);
}

export const ORIGEM_DA_PERGUNTA = { modelo: "Modelo da norma", empresa: "Pergunta da empresa" } as const;
export const MENSAGEM_JUSTIFICATIVA = "Explique por que desligar esta pergunta do modelo (mínimo de 5 letras).";

export function chaveDaPergunta(item: { categoria: string; titulo: string }): string {
  return `${item.categoria}|${item.titulo}`;
}

/** Copia o modelo do ambiente para o questionário da empresa, uma vez, quando o RT começa a editar. */
export function materializarModelo(itens: ItemDoModelo[], ambiente: string, agora: string): ConfigQuestionario {
  return {
    perguntas: itens.map((item, indice) => ({
      id: `modelo:${indice}:${chaveDaPergunta(item)}`,
      origem: "modelo" as const,
      titulo: item.titulo,
      categoria: item.categoria,
      criticidade: item.criticidade,
      referencia: item.referencia,
      orientacao: item.orientacao,
      ativa: true,
      ordem: indice,
      criadoEm: agora,
    })),
    atualizadoEm: agora,
    ambiente,
  };
}

const ordenadas = (perguntas: PerguntaDoQuestionario[]) => [...perguntas].sort((a, b) => a.ordem - b.ordem);

/** Perguntas que entram no checklist: as ativas, na ordem escolhida. */
export function perguntasVigentes(config: ConfigQuestionario | undefined): PerguntaDoQuestionario[] {
  return ordenadas(config?.perguntas || []).filter((pergunta) => pergunta.ativa);
}

/** Pergunta usada em alguma visita da empresa: fica no histórico, nunca é apagada. */
export function perguntaFoiUsada(pergunta: Pick<PerguntaDoQuestionario, "categoria" | "titulo">, ambiente: string, visitas: Pick<Visita, "checklist">[]): boolean {
  return visitas.some((visita) => (visita.checklist || []).some((item) => item.ambiente === ambiente && item.categoria === pergunta.categoria && item.titulo === pergunta.titulo));
}

export type ResultadoDaEdicao = { ok: true; config: ConfigQuestionario } | { ok: false; erro: string };

function reordenar(perguntas: PerguntaDoQuestionario[]): PerguntaDoQuestionario[] {
  return ordenadas(perguntas).map((pergunta, indice) => ({ ...pergunta, ordem: indice }));
}

export function adicionarPergunta(config: ConfigQuestionario, dados: { id: string; titulo: string; categoria?: string; criticidade?: PerguntaDoQuestionario["criticidade"]; orientacao?: string }, agora: string): ResultadoDaEdicao {
  const titulo = dados.titulo.trim();
  if (titulo.length < 5) return { ok: false, erro: "Escreva a pergunta (mínimo de 5 letras)." };
  if (config.perguntas.some((pergunta) => pergunta.titulo.trim().toLocaleLowerCase("pt-BR") === titulo.toLocaleLowerCase("pt-BR"))) {
    return { ok: false, erro: "Já existe uma pergunta igual neste ambiente." };
  }
  const nova: PerguntaDoQuestionario = {
    id: dados.id,
    origem: "empresa",
    titulo,
    categoria: dados.categoria?.trim() || "Pergunta da empresa",
    criticidade: dados.criticidade || "Rotina",
    orientacao: dados.orientacao?.trim() || undefined,
    ativa: true,
    ordem: config.perguntas.length,
    criadoEm: agora,
  };
  return { ok: true, config: { ...config, perguntas: reordenar([...config.perguntas, nova]), atualizadoEm: agora } };
}

export function moverPergunta(config: ConfigQuestionario, id: string, delta: -1 | 1, agora: string): ConfigQuestionario {
  const lista = ordenadas(config.perguntas);
  const indice = lista.findIndex((pergunta) => pergunta.id === id);
  const alvo = indice + delta;
  if (indice < 0 || alvo < 0 || alvo >= lista.length) return config;
  [lista[indice], lista[alvo]] = [lista[alvo], lista[indice]];
  return { ...config, perguntas: lista.map((pergunta, posicao) => ({ ...pergunta, ordem: posicao })), atualizadoEm: agora };
}

/** Desligar pergunta do modelo exige justificativa registrada; a da empresa pode ser desligada sem justificativa. */
export function desligarPergunta(config: ConfigQuestionario, id: string, quem: { id?: string; nome?: string }, agora: string, justificativa = ""): ResultadoDaEdicao {
  const pergunta = config.perguntas.find((item) => item.id === id);
  if (!pergunta) return { ok: false, erro: "Pergunta não encontrada." };
  if (pergunta.origem === "modelo" && justificativa.trim().length < 5) return { ok: false, erro: MENSAGEM_JUSTIFICATIVA };
  return {
    ok: true,
    config: {
      ...config,
      perguntas: config.perguntas.map((item) =>
        item.id === id
          ? {
              ...item,
              ativa: false,
              ...(item.origem === "modelo" ? { justificativaDeDesligar: justificativa.trim() } : {}),
              desligadaPorId: quem.id,
              desligadaPorNome: quem.nome,
              desligadaEm: agora,
            }
          : item
      ),
      atualizadoEm: agora,
    },
  };
}

export function religarPergunta(config: ConfigQuestionario, id: string, agora: string): ConfigQuestionario {
  return { ...config, perguntas: config.perguntas.map((item) => (item.id === id ? { ...item, ativa: true } : item)), atualizadoEm: agora };
}

/**
 * Tirar uma pergunta da lista: a que já foi usada em visita (ou é do modelo) só é desativada e continua guardada;
 * só a pergunta da empresa que nunca foi usada pode sair de vez.
 */
export function removerOuDesativarPergunta(config: ConfigQuestionario, id: string, usada: boolean, quem: { id?: string; nome?: string }, agora: string, justificativa = ""): ResultadoDaEdicao & { removida?: boolean } {
  const pergunta = config.perguntas.find((item) => item.id === id);
  if (!pergunta) return { ok: false, erro: "Pergunta não encontrada." };
  if (pergunta.origem === "empresa" && !usada) {
    return { ok: true, removida: true, config: { ...config, perguntas: reordenar(config.perguntas.filter((item) => item.id !== id)), atualizadoEm: agora } };
  }
  const resultado = desligarPergunta(config, id, quem, agora, justificativa);
  return resultado.ok ? { ...resultado, removida: false } : resultado;
}

/** Itens no formato que o montador do checklist já usa. */
export function itensDoQuestionario(config: ConfigQuestionario | undefined): ItemDoModelo[] | null {
  if (!config) return null;
  return perguntasVigentes(config).map((pergunta) => ({
    categoria: pergunta.categoria,
    titulo: pergunta.titulo,
    criticidade: pergunta.criticidade,
    referencia: pergunta.referencia || (pergunta.origem === "empresa" ? "Pergunta da empresa" : undefined),
    orientacao: pergunta.orientacao,
  }));
}
