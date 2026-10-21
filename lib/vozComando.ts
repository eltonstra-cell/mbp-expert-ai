// O que fazer com o texto que a busca por voz transcreveu. Função pura: recebe o texto e o que a pessoa pode acessar e devolve uma decisão;
// a tela só executa. Regras de segurança desta decisão:
//  - só destino de NAVEGAÇÃO com resultado único e claro abre sozinho (com contagem e Cancelar);
//  - correspondência aproximada nunca abre sozinha ("Você quis dizer…?" pede um clique);
//  - trocar de empresa nunca é automático (muda o contexto e a fila offline): sempre "Trocar para … e abrir …?" com botão;
//  - só empresas e destinos que o perfil já pode acessar entram (a lista vem filtrada por permissão);
//  - ação que grava ou altera dado nunca abre sozinha.
import { buscar, destinoParaAbrirSozinho, ehDestinoDeNavegacao, normalizar, type Destino } from "./commandSearch.ts";
import { melhorCandidato, palavrasDe } from "./buscaAproximada.ts";

export type EmpresaDaVoz = { id: string; nome: string };

export type EntradaDaVoz = {
  /** Índice atual da busca (sem os destinos da visita quando não há visita em andamento na empresa ativa). */
  destinos: Destino[];
  /** Todos os destinos de etapa da visita que o perfil pode abrir (haja visita ou não). */
  destinosDaVisita: Destino[];
  /** Só as empresas que a pessoa acessa. */
  empresas: EmpresaDaVoz[];
  empresaAtivaId: string | null;
  /** Há visita em andamento nesta empresa? */
  temVisitaNaEmpresa: (empresaId: string) => boolean;
};

export type InterpretacaoDaVoz =
  /** Resultado único e claro de navegação: abre sozinho depois de 2 s, com Cancelar. */
  | { tipo: "abrir"; destino: Destino }
  /** Já confirmado por clique (ex.: "Você quis dizer"): abre agora. */
  | { tipo: "abrir-agora"; destino: Destino }
  /** Mais de um resultado parecido: a pessoa escolhe na lista. */
  | { tipo: "escolher" }
  /** Correspondência aproximada: "Você quis dizer: [rótulo]?"; ao confirmar, executa `depois`. */
  | { tipo: "quis-dizer"; rotulo: string; depois: InterpretacaoDaVoz }
  | { tipo: "trocar-e-abrir"; empresa: EmpresaDaVoz; destino: Destino }
  | { tipo: "sem-visita"; empresa: EmpresaDaVoz }
  | { tipo: "nao-entendi"; texto: string };

/** "[destino] em [empresa]": divide na última palavra "em" que tenha texto dos dois lados. */
export function dividirComandoComposto(texto: string): { destino: string; empresa: string } | null {
  const palavras = palavrasDe(texto);
  for (let i = palavras.length - 2; i >= 1; i -= 1) {
    if (palavras[i] === "em") return { destino: palavras.slice(0, i).join(" "), empresa: palavras.slice(i + 1).join(" ") };
  }
  return null;
}

function resolverDestino(texto: string, entrada: EntradaDaVoz): { destino: Destino; exato: boolean } | null {
  const todos = [...entrada.destinos, ...entrada.destinosDaVisita.filter((daVisita) => !entrada.destinos.some((destino) => destino.id === daVisita.id))];
  const navegaveis = todos.filter(ehDestinoDeNavegacao);
  const resultados = buscar(texto, navegaveis, { limite: 20 });
  const claro = destinoParaAbrirSozinho(resultados, texto);
  if (claro) return { destino: claro, exato: true };
  const aproximado = melhorCandidato(texto, navegaveis.map((destino) => ({ item: destino, rotulo: destino.titulo })));
  return aproximado ? { destino: aproximado.item, exato: false } : null;
}

function planoDoDestino(destino: Destino, empresa: EmpresaDaVoz, entrada: EntradaDaVoz): InterpretacaoDaVoz {
  if (destino.daVisita && !entrada.temVisitaNaEmpresa(empresa.id)) return { tipo: "sem-visita", empresa };
  if (empresa.id === entrada.empresaAtivaId) return { tipo: "abrir", destino };
  return { tipo: "trocar-e-abrir", empresa, destino };
}

/** Decide o que fazer com o que a pessoa falou. Nunca devolve silêncio: sem entendimento, "nao-entendi" com o texto. */
export function interpretarVoz(texto: string, entrada: EntradaDaVoz): InterpretacaoDaVoz {
  const dito = texto.trim();
  if (!normalizar(dito)) return { tipo: "nao-entendi", texto: dito };
  const empresaAtiva = entrada.empresas.find((empresa) => empresa.id === entrada.empresaAtivaId);

  // Comando composto: "evidências em Elton Volmir Strapazon".
  const composto = dividirComandoComposto(dito);
  if (composto) {
    const empresa = melhorCandidato(composto.empresa, entrada.empresas.map((item) => ({ item, rotulo: item.nome })));
    if (empresa) {
      const alvo = resolverDestino(composto.destino, entrada);
      if (!alvo) return { tipo: "nao-entendi", texto: dito };
      const plano = planoDoDestino(alvo.destino, empresa.item, entrada);
      // Sem visita não há o que confirmar: a mensagem já diz o que fazer.
      if (plano.tipo === "sem-visita") return plano;
      // Nome da empresa ou do destino que não bateu exatamente: pergunta antes, e o que vem depois nunca abre sozinho.
      if (!empresa.exata || !alvo.exato) {
        return { tipo: "quis-dizer", rotulo: `${alvo.destino.titulo} em ${empresa.item.nome}`, depois: plano.tipo === "abrir" ? { tipo: "abrir-agora", destino: alvo.destino } : plano };
      }
      return plano;
    }
  }

  // Comando simples: resultados normais da busca.
  const resultados = buscar(dito, entrada.destinos, { limite: 60 });
  const claro = destinoParaAbrirSozinho(resultados, dito);
  if (claro) return { tipo: "abrir", destino: claro };
  if (resultados.length > 0) return { tipo: "escolher" };

  // Etapa da visita pedida sem visita em andamento na empresa ativa.
  const daVisita = buscar(dito, entrada.destinosDaVisita, { limite: 5 });
  if (daVisita.length > 0 && empresaAtiva && !entrada.temVisitaNaEmpresa(empresaAtiva.id)) return { tipo: "sem-visita", empresa: empresaAtiva };

  // Nada bateu: tenta pela grafia aproximada (destinos e empresas) e pergunta antes de abrir.
  const universo = [...entrada.destinos, ...entrada.destinosDaVisita];
  const aproximado = melhorCandidato(dito, universo.map((destino) => ({ item: destino, rotulo: destino.titulo })));
  if (aproximado) {
    const destino = aproximado.item;
    if (destino.daVisita && empresaAtiva && !entrada.temVisitaNaEmpresa(empresaAtiva.id)) return { tipo: "quis-dizer", rotulo: destino.titulo, depois: { tipo: "sem-visita", empresa: empresaAtiva } };
    return { tipo: "quis-dizer", rotulo: destino.titulo, depois: { tipo: "abrir-agora", destino } };
  }
  return { tipo: "nao-entendi", texto: dito };
}
