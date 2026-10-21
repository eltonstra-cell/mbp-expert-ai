import type { NavItem, NavKey } from "@/lib/navigation";
import { GRUPOS_DA_CENTRAL, ROTULO_DA_SUBABA, grupoDaSubaba, type SubAbaCentral } from "./centralEmpresa.ts";

// Busca LOCAL da caixa inteligente (Ctrl K): sem IA e sem chamada externa.
// O índice é montado só com o que o perfil já pode ver (itens do menu filtrados por
// permissão, empresas/visitas/ambientes/itens que a tela já carregou). Nada é registrado em log.

export type AbaDeRelatorios = "emitidos" | "resumo" | "dossie" | "evolucao";

export type GrupoBusca = "ir" | "agir" | "itens" | "empresas";

export type AcaoDestino =
  | { tipo: "nav"; key: NavKey }
  | { tipo: "empresa"; id: string }
  | { tipo: "visita"; id: string }
  | { tipo: "ambiente"; nome: string }
  | { tipo: "item"; id: string; ambiente: string }
  | { tipo: "continuar" }
  | { tipo: "central"; subaba: SubAbaCentral }
  | { tipo: "relatorios"; aba: AbaDeRelatorios }
  | { tipo: "popsvisita" }
  | { tipo: "registrar" };

export type Destino = {
  id: string;
  grupo: GrupoBusca;
  titulo: string;
  detalhe?: string;
  /** Palavras alternativas que também encontram o destino (ex.: "nc" para Não conformidades). */
  sinonimos?: string[];
  acao: AcaoDestino;
  /** Pertence ao contexto atual (ex.: etapas da visita em andamento): ganha prioridade. */
  contexto?: boolean;
  /** Destino de uma etapa da visita em andamento (Checklist, Evidências, Relatório, POPs da visita): só entra no índice quando há visita em andamento na empresa ativa. */
  daVisita?: boolean;
};

/** Itens do menu que são etapas da visita em andamento. (Correções funciona também sem visita, pela empresa toda, e fica sempre no índice.) */
export const CHAVES_DA_VISITA: NavKey[] = ["checklist", "evidencias", "relatorio"];

export type Resultado = { destino: Destino; pontos: number };

export const ROTULOS_GRUPO_BUSCA: Record<GrupoBusca, string> = {
  ir: "Ir para",
  agir: "Agir agora",
  itens: "Itens do checklist",
  empresas: "Empresas e visitas",
};

export const ORDEM_GRUPOS_BUSCA: GrupoBusca[] = ["ir", "agir", "itens", "empresas"];

export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Distância de edição com transposição (Damerau/OSA): "chekclist" -> "checklist" = 1.
export function distanciaEdicao(a: string, b: string): number {
  if (a === b) return 0;
  const linhas = a.length + 1;
  const colunas = b.length + 1;
  const d: number[][] = Array.from({ length: linhas }, () => new Array(colunas).fill(0));
  for (let i = 0; i < linhas; i += 1) d[i][0] = i;
  for (let j = 0; j < colunas; j += 1) d[0][j] = j;
  for (let i = 1; i < linhas; i += 1) {
    for (let j = 1; j < colunas; j += 1) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + custo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

// Pontos de um termo contra as palavras de um texto (0 = não encontrou).
function pontosDoTermo(termo: string, palavras: string[]): number {
  let melhor = 0;
  for (const palavra of palavras) {
    let pontos = 0;
    if (palavra === termo) pontos = 10;
    else if (palavra.startsWith(termo)) pontos = 8;
    else if (termo.length >= 3 && palavra.includes(termo)) pontos = 4;
    else if (termo.length >= 4) {
      // tolera 1 erro de digitação, no começo da palavra ou na palavra inteira
      if (distanciaEdicao(termo, palavra) <= 1) pontos = 5;
      else if (palavra.length >= termo.length && distanciaEdicao(termo, palavra.slice(0, termo.length)) <= 1) pontos = 5;
    }
    if (pontos > melhor) melhor = pontos;
  }
  return melhor;
}

export function pontuar(consulta: string, destino: Destino): number {
  const termos = normalizar(consulta).split(" ").filter(Boolean);
  if (termos.length === 0) return 0;
  const palavrasTitulo = normalizar(destino.titulo).split(" ").filter(Boolean);
  const palavrasExtra = normalizar([destino.detalhe ?? "", ...(destino.sinonimos ?? [])].join(" "))
    .split(" ")
    .filter(Boolean);

  let total = 0;
  for (const termo of termos) {
    const noTitulo = pontosDoTermo(termo, palavrasTitulo);
    const noExtra = pontosDoTermo(termo, palavrasExtra);
    const pontos = Math.max(noTitulo * 1.5, noExtra);
    if (pontos === 0) return 0; // todos os termos precisam casar (em qualquer ordem)
    total += pontos;
  }
  if (normalizar(destino.titulo).startsWith(normalizar(consulta))) total += 6;
  return total;
}

export type OpcoesBusca = { limite?: number };

const PESO_GRUPO: Record<GrupoBusca, number> = { ir: 3, agir: 4, itens: 0, empresas: 1 };

export function buscar(consulta: string, destinos: Destino[], opcoes: OpcoesBusca = {}): Resultado[] {
  const encontrados: Resultado[] = [];
  for (const destino of destinos) {
    const base = pontuar(consulta, destino);
    if (base <= 0) continue;
    encontrados.push({
      destino,
      pontos: base + PESO_GRUPO[destino.grupo] + (destino.contexto ? 4 : 0),
    });
  }
  encontrados.sort(
    (a, b) => b.pontos - a.pontos || a.destino.titulo.localeCompare(b.destino.titulo, "pt-BR")
  );
  return encontrados.slice(0, opcoes.limite ?? 30);
}

/** Sugestões quando o campo está vazio: contexto atual primeiro, sem itens do checklist. */
export function sugestoes(destinos: Destino[], limite = 8): Resultado[] {
  return destinos
    .filter((destino) => destino.grupo === "ir" || destino.grupo === "agir")
    .map((destino) => ({ destino, pontos: PESO_GRUPO[destino.grupo] + (destino.contexto ? 4 : 0) }))
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, limite);
}

/**
 * PONTO DE EXTENSÃO PARA IA (não implementado neste pacote): um interpretador recebe a frase
 * e os destinos permitidos e devolve resultados já ordenados, ou null para cair na busca normal.
 * Deve sempre receber apenas `destinos` já filtrados por permissão.
 */
export type Interpretador = (consulta: string, destinos: Destino[]) => Promise<Resultado[] | null>;

export async function buscarComInterpretador(
  consulta: string,
  destinos: Destino[],
  interpretador?: Interpretador
): Promise<Resultado[]> {
  if (interpretador) {
    try {
      const resultado = await interpretador(consulta, destinos);
      if (resultado && resultado.length > 0) return resultado;
    } catch {
      // Falha do interpretador nunca bloqueia a busca normal.
    }
  }
  return buscar(consulta, destinos);
}

// ---- Índice de destinos -----------------------------------------------------------------

const SINONIMOS_NAV: Partial<Record<NavKey, string[]>> = {
  inicio: ["home", "painel", "visao geral"],
  visitas: ["inspecoes", "lista de visitas"],
  empresas: ["clientes", "estabelecimentos"],
  central: ["resumo da visita"],
  ambientes: ["setores", "locais"],
  checklist: ["avaliacao", "perguntas", "itens"],
  evidencias: ["fotos", "audios", "anexos"],
  ncs: ["nc", "nao conformidade", "nao conformidades", "conformidades", "achados", "problemas"],
  plano: ["acoes", "acao corretiva", "prazos"],
  acompanhamento: ["acompanhar", "correcao"],
  relatorio: ["pdf", "imprimir", "exportar"],
  pops: ["procedimentos", "documentos"],
  relatorios: ["relatorios emitidos", "dossie", "resumo", "evolucao"],
  acessos: ["usuarios", "permissoes", "pessoas"],
  ajuda: ["guias", "duvidas", "manual"],
};

export type EntradaDeDestinos = {
  /** Itens do menu que o perfil pode ver (já filtrados por permissão). */
  itensMenu: NavItem[];
  /** Empresas que o perfil pode ver. */
  empresas: { id: string; nome: string }[];
  empresaAtivaId: string | null;
  /** Visitas já filtradas por permissão; só as da empresa ativa entram no índice. */
  visitas: { id: string; empresaId: string; rotulo: string; status: string }[];
  dentroDeVisita: boolean;
  /** Ambientes e itens da visita atual (listas vazias quando o perfil não usa o checklist). */
  ambientes: string[];
  itensChecklist: { id: string; ambiente: string; titulo: string; status: string }[];
  visitaEmAndamentoId: string | null;
  podeChecklist: boolean;
  /** Sub-abas da Central da Empresa que o perfil enxerga (vazio: sem empresa ativa ou sem acesso). */
  subabasCentral?: SubAbaCentral[];
  /** Existe visita em andamento na empresa ativa? Sem ela, os destinos da visita ficam fora do índice. */
  temVisitaEmAndamento?: boolean;
  /** O perfil vê "POPs da visita"? */
  podePopsDaVisita?: boolean;
  /** Sub-aba que "Central" abre: a última usada na empresa ou Empresa › Dados. */
  subabaCentralInicial?: SubAbaCentral;
  /** Nome da empresa ativa, para o título "Central da Empresa · Nome". */
  nomeEmpresaAtiva?: string;
  /** Abas de Relatórios que o perfil enxerga (vazio: sem acesso ou sem empresa ativa). */
  abasRelatorios?: AbaDeRelatorios[];
};

const TITULO_DA_SUBABA: Partial<Record<SubAbaCentral, string>> = { dados: "Dados da empresa", pops: "POPs da empresa" };

const ROTULO_DA_ABA_DE_RELATORIOS: Record<AbaDeRelatorios, { titulo: string; rotulo: string; sinonimos: string[] }> = {
  emitidos: { titulo: "Relatórios emitidos", rotulo: "Emitidos", sinonimos: ["assinados", "numero do relatorio", "pdf"] },
  resumo: { titulo: "Resumo de uma página", rotulo: "Resumo", sinonimos: ["resumo", "uma pagina", "enviar resumo"] },
  dossie: { titulo: "Dossiê da empresa", rotulo: "Dossiê", sinonimos: ["dossie", "fiscalizacao", "documentos reunidos"] },
  evolucao: { titulo: "Evolução da empresa", rotulo: "Evolução", sinonimos: ["evolucao", "historico de notas", "melhora"] },
};

const SINONIMOS_SUBABA: Record<SubAbaCentral, string[]> = {
  dados: ["dados da empresa", "cadastro da empresa", "endereco", "responsavel do estabelecimento"],
  norma: ["norma", "normas", "rdc 216", "legislacao", "confirmar norma"],
  privacidade: ["lgpd", "guarda", "ia nas fotos"],
  ambientes: ["setores", "equipamentos", "locais"],
  fluxos: ["fluxos operacionais", "processos"],
  manual: ["manual de boas praticas", "mbp"],
  pops: ["pop", "pops", "procedimentos", "documentos", "procedimento operacional"],
  programas: ["programas de controle", "qualidade"],
  comprovantes: ["certificados", "validade", "pragas", "reservatorio"],
  pessoas: ["equipe", "colaboradores", "treinamento", "capacitacao"],
};

/** Índice da busca: tudo o que o perfil pode abrir; os destinos da visita só entram com visita em andamento na empresa ativa. */
export function construirDestinos(entrada: EntradaDeDestinos): Destino[] {
  return montarDestinos(entrada).filter((destino) => !destino.daVisita || Boolean(entrada.temVisitaEmAndamento));
}

/** Todos os destinos de etapa da visita que o perfil pode abrir, haja ou não visita em andamento (para a voz explicar "não há visita em andamento"). */
export function construirDestinosDaVisita(entrada: EntradaDeDestinos): Destino[] {
  return montarDestinos(entrada).filter((destino) => destino.daVisita);
}

function montarDestinos(entrada: EntradaDeDestinos): Destino[] {
  const destinos: Destino[] = [];
  const etapas: NavKey[] = [
    "central",
    "ambientes",
    "checklist",
    "evidencias",
    "ncs",
    "plano",
    "acompanhamento",
    "relatorio",
  ];

  for (const item of entrada.itensMenu) {
    if (item.key === "registrar") {
      destinos.push({
        id: "agir:registrar",
        grupo: "agir",
        titulo: "Registrar",
        detalhe: "Abrir a tela de captura de foto",
        sinonimos: ["foto", "fotografar", "camera", "capturar"],
        acao: { tipo: "registrar" },
        contexto: entrada.dentroDeVisita,
      });
      continue;
    }
    destinos.push({
      id: `ir:${item.key}`,
      grupo: "ir",
      titulo: item.rotulo,
      ...(CHAVES_DA_VISITA.includes(item.key) ? { daVisita: true } : {}),
      sinonimos: SINONIMOS_NAV[item.key],
      acao: { tipo: "nav", key: item.key },
      contexto: entrada.dentroDeVisita && etapas.includes(item.key),
    });
  }

  const subabas = entrada.subabasCentral || [];
  if (entrada.empresaAtivaId && subabas.length > 0) {
    destinos.push({
      id: "ir:central-empresa",
      grupo: "ir",
      titulo: "Central da Empresa",
      detalhe: "Empresas › Central da Empresa",
      sinonimos: ["central", "empresa", "dados da empresa", "cadastro", "documentos", "norma", "pops"],
      acao: { tipo: "central", subaba: entrada.subabaCentralInicial && subabas.includes(entrada.subabaCentralInicial) ? entrada.subabaCentralInicial : subabas.includes("dados") ? "dados" : subabas[0] },
    });
    for (const subaba of subabas) {
      const grupo = GRUPOS_DA_CENTRAL.find((item) => item.id === grupoDaSubaba(subaba));
      destinos.push({
        id: `ir:central:${subaba}`,
        grupo: "ir",
        titulo: TITULO_DA_SUBABA[subaba] || ROTULO_DA_SUBABA[subaba],
        detalhe: `Central › ${grupo?.rotulo ?? ""} › ${ROTULO_DA_SUBABA[subaba]}`,
        sinonimos: ["central", "central da empresa", "empresa", ...SINONIMOS_SUBABA[subaba]],
        acao: { tipo: "central", subaba },
      });
    }
  }

  for (const aba of entrada.abasRelatorios || []) {
    const dados = ROTULO_DA_ABA_DE_RELATORIOS[aba];
    destinos.push({
      id: `ir:relatorios:${aba}`,
      grupo: "ir",
      titulo: dados.titulo,
      detalhe: `Relatórios › ${dados.rotulo}`,
      sinonimos: ["relatorio", "relatorios", ...dados.sinonimos],
      acao: { tipo: "relatorios", aba },
    });
  }

  if (entrada.visitaEmAndamentoId && entrada.podeChecklist) {
    destinos.push({
      id: "agir:continuar",
      grupo: "agir",
      titulo: "Continuar inspeção",
      detalhe: "Voltar à visita em andamento",
      sinonimos: ["retomar", "continuar visita", "seguir"],
      acao: { tipo: "continuar" },
      contexto: true,
    });
  }

  if (entrada.podeChecklist) {
    for (const nome of entrada.ambientes) {
      destinos.push({
        id: `amb:${nome}`,
        grupo: "itens",
        titulo: nome,
        detalhe: "Ambiente do checklist",
        acao: { tipo: "ambiente", nome },
        contexto: true,
      });
    }
    for (const item of entrada.itensChecklist) {
      destinos.push({
        id: `item:${item.id}`,
        grupo: "itens",
        titulo: item.titulo,
        detalhe: `${item.ambiente} · ${item.status}`,
        acao: { tipo: "item", id: item.id, ambiente: item.ambiente },
        contexto: true,
      });
    }
  }

  for (const empresa of entrada.empresas) {
    destinos.push({
      id: `emp:${empresa.id}`,
      grupo: "empresas",
      titulo: empresa.nome,
      detalhe: "Empresa",
      acao: { tipo: "empresa", id: empresa.id },
      contexto: empresa.id === entrada.empresaAtivaId,
    });
  }
  for (const visita of entrada.visitas) {
    if (visita.empresaId !== entrada.empresaAtivaId) continue;
    destinos.push({
      id: `vis:${visita.id}`,
      grupo: "empresas",
      titulo: `Visita ${visita.rotulo}`,
      detalhe: visita.status,
      sinonimos: ["inspecao"],
      acao: { tipo: "visita", id: visita.id },
      contexto: visita.id === entrada.visitaEmAndamentoId,
    });
  }
  if (entrada.podePopsDaVisita) {
    destinos.push({
      id: "ir:popsvisita",
      grupo: "ir",
      titulo: "POPs desta visita",
      detalhe: "Visita em andamento › POPs da visita",
      sinonimos: ["pops da visita", "procedimentos da visita"],
      acao: { tipo: "popsvisita" },
      contexto: entrada.dentroDeVisita,
      daVisita: true,
    });
  }
  return destinos;
}

// ---- Abertura automática depois da busca por voz --------------------------------------------

/** Destinos que SÓ levam a uma tela (menu, Central e suas sub-abas, Relatórios, POPs da visita). Registrar, continuar inspeção, escolher empresa, visita e itens do checklist nunca abrem sozinhos. */
export function ehDestinoDeNavegacao(destino: Pick<Destino, "acao">): boolean {
  return destino.acao.tipo === "nav" || destino.acao.tipo === "central" || destino.acao.tipo === "relatorios" || destino.acao.tipo === "popsvisita";
}

/**
 * Resultado da voz que pode abrir sozinho (com contagem e botão Cancelar): um único resultado, ou um único cujo título é exatamente o que foi dito,
 * e só se for destino de navegação. Mais de um parecido: o usuário escolhe. Ação que grava ou altera dado: sempre por clique.
 */
export function destinoParaAbrirSozinho(resultados: Resultado[], consulta: string): Destino | null {
  if (resultados.length === 0) return null;
  const dito = normalizar(consulta);
  const exatos = resultados.filter((resultado) => normalizar(resultado.destino.titulo) === dito);
  const unico = resultados.length === 1 ? resultados[0] : exatos.length === 1 ? exatos[0] : null;
  return unico && ehDestinoDeNavegacao(unico.destino) ? unico.destino : null;
}
