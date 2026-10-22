// Aba Documento do POP: seções do editor (com marcador de preenchida) e a folha formatada (leitura e pré-visualização).
import type { ConteudoPop, ItemDeModeloPop, ProcedimentoOperacionalPadronizado } from "../types/index.ts";
import { AVISO_VALORES_DO_MODELO, popNaoConferido } from "./popConferencia.ts";
import { SECOES_ANTES_DOS_PASSOS, SECOES_DE_LISTA, itensEscritos, linhasDoItem, tabelaDoItem, textoDoItem } from "./popConteudoModelo.ts";
import { formatarData } from "./dataLocal.ts";
import { nomeECargo, razaoSocialTitulo } from "./nomeCargo.ts";
import { nomeSemNumerosNoInicio } from "./navigation.ts";
import { linhasDoConteudo, type DefinicaoPopDoConjunto } from "./popsNorma.ts";
import { subtitulosEmVigor } from "./popPassos.ts";

export type IdDaSecao = "identificacao" | "objetivo" | "referencias" | "responsavel" | "passos" | "acao" | "extra" | "extra2" | "modelo";

export type SecaoDoEditor = { id: IdDaSecao; titulo: string; preenchida: boolean };

const escrito = (valor: string | undefined | null) => Boolean((valor || "").trim());

/** Seções na ordem do editor. "Preenchida" só olha os campos que a pessoa escreve; Referências vêm da norma. */
export function secoesDoEditor(pop: Pick<ProcedimentoOperacionalPadronizado, "codigo" | "titulo" | "conteudo"> & Partial<Pick<ProcedimentoOperacionalPadronizado, "origemModelo">>, definicao?: Pick<DefinicaoPopDoConjunto, "bloco" | "eReservatorio">): SecaoDoEditor[] {
  const c: ConteudoPop = pop.conteudo || {};
  const secoes: SecaoDoEditor[] = [
    { id: "identificacao", titulo: "Identificação", preenchida: escrito(pop.titulo) },
    { id: "objetivo", titulo: "Objetivo e aplicação", preenchida: escrito(c.objetivo) },
    { id: "referencias", titulo: "Referências", preenchida: true },
    { id: "responsavel", titulo: "Responsável e frequência", preenchida: escrito(c.responsavelExecucao?.nome) && escrito(c.responsavelExecucao?.cargo) && escrito(c.frequencia) },
    { id: "passos", titulo: "Passos", preenchida: (c.passos || []).some((passo) => escrito(passo.texto)) && (c.passos || []).every((passo) => escrito(passo.texto)) },
    { id: "acao", titulo: "Ação corretiva e registro", preenchida: escrito(c.acaoCorretiva) },
  ];
  if (definicao?.bloco === "higienizacao" && c.higienizacao) {
    secoes.push({ id: "extra", titulo: definicao.eReservatorio ? "Higienização do reservatório" : "Higienização das instalações", preenchida: escrito(c.higienizacao.superficie) && escrito(c.higienizacao.metodo) && escrito(c.higienizacao.produto) });
  }
  if (definicao?.bloco === "pragas" && c.pragas) {
    secoes.push({ id: "extra", titulo: "Controle de pragas", preenchida: escrito(c.pragas.preventivas) && escrito(c.pragas.corretivas) });
  }
  if (definicao?.bloco === "manipuladores" && c.manipuladores) {
    secoes.push(
      { id: "extra", titulo: "Higiene e saúde", preenchida: escrito(c.manipuladores.lavagemMaosEtapas) && escrito(c.manipuladores.lavagemMaosFrequencia) && escrito(c.manipuladores.lesoesSintomas) },
      { id: "extra2", titulo: "Exames e capacitação", preenchida: Boolean(c.manipuladores.examesApto) && escrito(c.manipuladores.capacitacaoConteudo) }
    );
  }
  // POP criado de modelo: as listas do modelo (materiais, EPIs, cuidados…) ganham uma seção própria no editor.
  if (pop.origemModelo) secoes.push({ id: "modelo", titulo: "Conteúdo do modelo", preenchida: true });
  return secoes;
}

/** "5 de 7 preenchidas" */
export function textoDasSecoes(secoes: Pick<SecaoDoEditor, "preenchida">[]): string {
  const feitas = secoes.filter((secao) => secao.preenchida).length;
  return `${feitas} de ${secoes.length} ${feitas === 1 ? "preenchida" : "preenchidas"}`;
}

const SEM_RUIDO = /\s*\((?:item\s+)?a\s+conferir\)\s*/gi;

/** Item de norma sem o ruído do catálogo: "Anexo II (item a conferir)" vira "Anexo II". */
export function itemLimpo(item: string): string {
  return item.replace(SEM_RUIDO, " ").replace(/\s+/g, " ").trim();
}

/** Compara itens numerados ("4.11.2" antes de "4.11.10"; "13.2" antes de "13.7 (a–d)") sem depender da ordem em que vieram. */
export function compararItensDeNorma(a: string, b: string): number {
  const pedacos = (texto: string) => texto.match(/\d+|\D+/g) || [];
  const pa = pedacos(a);
  const pb = pedacos(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const x = pa[i];
    const y = pb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const nx = Number(x);
    const ny = Number(y);
    if (!Number.isNaN(nx) && !Number.isNaN(ny)) {
      if (nx !== ny) return nx - ny;
    } else if (x !== y) {
      return x.localeCompare(y, "pt-BR");
    }
  }
  return 0;
}

const ANEXO = /^(Anexo\s+[IVXLC]+)(?:\s*,\s*(.+))?$/i;

function semRepeticao(itens: string[]): string[] {
  return itens.filter((item, indice) => itens.findIndex((outro) => outro.toLocaleLowerCase("pt-BR") === item.toLocaleLowerCase("pt-BR")) === indice);
}

/** Itens de uma norma já limpos: em ordem; os de "Anexo" agrupados por anexo ("Anexo I: 13.2 · Anexo II: 13.2, 13.7 (a–d)"), sem a menção solta do anexo que o detalhado já cobre. */
export function itensDaNormaEmTexto(itens: string[]): string {
  const unicos = semRepeticao(itens);
  const anexos = new Map<string, string[]>();
  const comuns: string[] = [];
  for (const item of unicos) {
    const achou = ANEXO.exec(item);
    if (!achou) {
      comuns.push(item);
      continue;
    }
    const anexo = achou[1].replace(/\s+/g, " ");
    const lista = anexos.get(anexo) || [];
    if (achou[2]) lista.push(achou[2].trim());
    anexos.set(anexo, lista);
  }
  const ordemAnexos = [...anexos.keys()].sort(compararItensDeNorma);
  const dosAnexos = ordemAnexos.map((anexo) => {
    const detalhes = semRepeticao(anexos.get(anexo) || []).sort(compararItensDeNorma);
    return detalhes.length ? `${anexo}: ${detalhes.join(", ")}` : anexo;
  });
  return [comuns.sort(compararItensDeNorma).join("; "), ...dosAnexos].filter(Boolean).join(" · ");
}

/**
 * Referências da folha em poucas linhas: uma por norma, itens em ordem e sem repetição, cada linha terminando em "conferir".
 * Só limpa, ordena e agrupa o que já existe no POP (nenhum item de norma é acrescentado). Passando de duas normas, as demais entram na segunda linha.
 */
export function referenciasCompactas(referencias: { norma: string; item: string }[] | undefined): string[] {
  const porNorma = new Map<string, string[]>();
  for (const ref of referencias || []) {
    const norma = ref.norma.trim();
    if (!norma) continue;
    const itens = porNorma.get(norma) || [];
    const item = itemLimpo(ref.item || "");
    if (item) itens.push(item);
    porNorma.set(norma, itens);
  }
  const partes = [...porNorma.entries()].map(([norma, itens]) => {
    const texto = itensDaNormaEmTexto(itens);
    return texto ? `${norma} (${texto})` : norma;
  });
  if (partes.length === 0) return [];
  const linhas = partes.length <= 2 ? partes : [partes[0], partes.slice(1).join(" · ")];
  return linhas.map((linha) => `${linha} · conferir`);
}

export const TEXTO_SECAO_VAZIA = "Não preenchida";
export const AVISO_SECAO_VAZIA = "Seção vazia";

export type TabelaDaFolha = {
  titulo: string;
  colunas: string[];
  linhas: string[][];
  /** "Valores do modelo, a conferir com a norma aplicada." enquanto o POP não foi conferido. */
  aviso?: string;
};

export type BlocoDaFolha = {
  titulo: string;
  tipo: "texto" | "passos" | "lista";
  linhas: string[];
  /** Tabela impressa logo depois da linha de mesmo índice (a que a cita). */
  tabelas?: (TabelaDaFolha | undefined)[];
  /** Passos: linha de subtítulo (sem número) antes do passo de mesmo índice; a numeração reinicia depois dela. */
  subtitulos?: (string | undefined)[];
  /** Seção sem nada escrito: a folha mostra "Não preenchida". */
  vazia?: boolean;
  /** Aviso amarelo ao lado do título (só Ação corretiva vazia, quando a norma da empresa a exige). */
  aviso?: string;
};

export type FolhaDoPop = {
  esquerda: string;
  direita: string;
  titulo: string;
  /** "Aprovada por Elton, Nutricionista RT, em 21/10/2026" ou "Rascunho · v1.2". */
  situacao: string;
  blocos: BlocoDaFolha[];
  /** Página de capa opcional (código, título, empresa e versão). */
  capa: { codigo: string; titulo: string; empresa: string; versao: string };
};

const CAMPOS_BASE = new Set(["Objetivo", "Campo de aplicação", "Responsável pela execução", "Frequência", "Ação corretiva", "Registro que prova a execução", "Alcance", "Definições", "Responsabilidades", ...SECOES_DE_LISTA.map((secao) => secao.titulo)]);

export type OpcoesDaFolha = {
  /** Passo sem texto aparece como "(em branco)" (pré-visualização). */
  marcarBranco?: boolean;
  /** Responsável do estabelecimento (usuário vinculado): fonte do nome e do cargo de quem aprova e, na falta de um responsável pela execução, de quem executa. */
  responsavel?: { nome: string; cargo: string; usuarioId?: string };
  /** A empresa tem a Portaria SES 799/2023 ativa (Anexo II, 13.2: o POP prevê a ação corretiva). */
  exigeAcaoCorretiva?: boolean;
};

/** A folha do POP como a pessoa vai ler. Toda seção sem texto mostra "Não preenchida". */
export function folhaDoPop(
  pop: Pick<ProcedimentoOperacionalPadronizado, "codigo" | "titulo" | "versao" | "status" | "conteudo" | "aprovacao"> & Partial<Pick<ProcedimentoOperacionalPadronizado, "origemModelo" | "conferencia">>,
  empresa: { nome?: string; cnpj?: string },
  opcoes: OpcoesDaFolha = {}
): FolhaDoPop {
  const c: ConteudoPop = pop.conteudo || {};
  const blocos: BlocoDaFolha[] = [];
  const bloco = (titulo: string, tipo: BlocoDaFolha["tipo"], linhas: string[], extra: Partial<BlocoDaFolha> = {}) =>
    blocos.push(linhas.length ? { titulo, tipo, linhas, ...extra } : { titulo, tipo, linhas: [TEXTO_SECAO_VAZIA], vazia: true, ...extra });

  const aviso = popNaoConferido(pop) ? AVISO_VALORES_DO_MODELO : undefined;
  const tabelaPorId = (id: string | undefined): TabelaDaFolha | undefined => {
    const tabela = id ? (c.tabelas || []).find((item) => item.id === id) : undefined;
    return tabela ? { titulo: tabela.titulo, colunas: tabela.colunas, linhas: tabela.linhas, ...(aviso ? { aviso } : {}) } : undefined;
  };
  // Seção nova de modelo: só entra quando tem algo escrito (nunca "Não preenchida"). A tabela citada por um item vem logo depois dele.
  const blocoDeItens = (titulo: string, itens: ItemDeModeloPop[] | undefined) => {
    const escritos = itensEscritos(itens);
    if (!escritos.length) return;
    const linhas: string[] = [];
    const tabelas: (TabelaDaFolha | undefined)[] = [];
    for (const item of escritos) {
      const dele = linhasDoItem(item);
      dele.forEach((linha, posicao) => {
        linhas.push(linha);
        tabelas.push(posicao === dele.length - 1 ? tabelaPorId(tabelaDoItem(item)) : undefined);
      });
    }
    blocos.push({ titulo, tipo: "lista", linhas, ...(tabelas.some(Boolean) ? { tabelas } : {}) });
  };
  const blocoDeTexto = (titulo: string, linhas: string[], tipo: BlocoDaFolha["tipo"] = "texto") => {
    const escritas = linhas.map((linha) => linha.trim()).filter(Boolean);
    if (escritas.length) blocos.push({ titulo, tipo, linhas: escritas });
  };

  bloco("Objetivo", "texto", [c.objetivo, c.campoAplicacao].filter((texto): texto is string => escrito(texto)).map((texto) => texto.trim()));
  blocoDeTexto("Alcance", [c.alcance || ""]);
  blocoDeTexto("Definições", (c.definicoes || []).filter((item) => escrito(item.termo) && escrito(item.texto)).map((item) => `${item.termo.trim()}: ${item.texto.trim()}`), "lista");
  const referencias = referenciasCompactas(c.referencias);
  if (referencias.length) bloco("Referências", "lista", referencias);
  blocoDeTexto(
    "Responsabilidades",
    (c.responsabilidades || []).flatMap((grupo) => {
      const itens = itensEscritos(grupo.itens);
      if (!itens.length) return [];
      return [...(grupo.titulo ? [grupo.titulo] : []), ...itens.map((item) => (grupo.titulo ? `– ${textoDoItem(item).trim()}` : textoDoItem(item).trim()))];
    }),
    "lista"
  );
  const executor = nomeECargo(c.responsavelExecucao?.nome, c.responsavelExecucao?.cargo) || nomeECargo(opcoes.responsavel?.nome, opcoes.responsavel?.cargo);
  bloco("Responsável e frequência", "texto", [executor, (c.frequencia || "").trim()].filter(Boolean).join(" · ") ? [[executor, (c.frequencia || "").trim()].filter(Boolean).join(" · ")] : []);
  const doModelo = (chave: (typeof SECOES_DE_LISTA)[number]["chave"]) => blocoDeItens(SECOES_DE_LISTA.find((secao) => secao.chave === chave)!.titulo, c[chave]);
  SECOES_ANTES_DOS_PASSOS.forEach(doModelo);
  const subtitulosDosPassos = subtitulosEmVigor(c.passos || []);
  const passosComTabela = (c.passos || [])
    .map((passo, indice) => ({ texto: passo.texto.trim() || (opcoes.marcarBranco ? "(em branco)" : ""), tabela: tabelaPorId(passo.tabela), emVigor: subtitulosDosPassos[indice] }))
    .filter((passo) => opcoes.marcarBranco || passo.texto);
  // O subtítulo só aparece quando muda de um passo (escrito) para o seguinte.
  const subtitulosVisiveis = passosComTabela.map((passo, indice) => (passo.emVigor && passo.emVigor !== (indice === 0 ? "" : passosComTabela[indice - 1].emVigor) ? passo.emVigor : undefined));
  bloco("Passos", "passos", passosComTabela.map((passo) => passo.texto), {
    ...(passosComTabela.some((passo) => passo.tabela) ? { tabelas: passosComTabela.map((passo) => passo.tabela) } : {}),
    ...(subtitulosVisiveis.some(Boolean) ? { subtitulos: subtitulosVisiveis } : {}),
  });
  SECOES_DE_LISTA.filter((secao) => !SECOES_ANTES_DOS_PASSOS.includes(secao.chave)).forEach((secao) => doModelo(secao.chave));
  const acao = escrito(c.acaoCorretiva) ? [(c.acaoCorretiva || "").trim()] : [];
  bloco("Ação corretiva", "texto", acao, opcoes.exigeAcaoCorretiva && acao.length === 0 ? { aviso: AVISO_SECAO_VAZIA } : {});
  if (escrito(c.registroProva)) blocos.push({ titulo: "Registro que prova a execução", tipo: "texto", linhas: [(c.registroProva || "").trim()] });
  const extras = linhasDoConteudo(c)
    .filter((linha) => !CAMPOS_BASE.has(linha.campo) && !/^Passo \d+$/.test(linha.campo) && escrito(linha.valor))
    .map((linha) => `${linha.campo}: ${linha.valor.trim()}`);
  if (extras.length) blocos.push({ titulo: "Detalhes do POP", tipo: "lista", linhas: extras });

  const aprovacao = pop.aprovacao;
  // Quem aprovou aparece com o nome e o cargo do responsável vinculado (uma só fonte); sem vínculo, vale o que foi gravado na aprovação.
  const mesmoUsuario = Boolean(aprovacao?.usuarioId && opcoes.responsavel?.usuarioId && aprovacao.usuarioId === opcoes.responsavel.usuarioId);
  const aprovador = aprovacao ? (mesmoUsuario && opcoes.responsavel ? nomeECargo(opcoes.responsavel.nome, opcoes.responsavel.cargo) : nomeECargo(aprovacao.nome, aprovacao.cargo)) : "";
  // O nome já chega no formato de exibição da empresa (lib/nomeEmpresa.ts); aqui só limpa espaços.
  const nomeDaEmpresa = (empresa.nome || "").replace(/\s+/g, " ").trim();
  return {
    esquerda: [nomeDaEmpresa, empresa.cnpj ? `CNPJ ${empresa.cnpj}` : ""].filter(Boolean).join(" · "),
    direita: `${pop.codigo ? `${pop.codigo} · ` : ""}versão ${pop.versao}`,
    titulo: pop.titulo || "POP",
    capa: { codigo: pop.codigo || "", titulo: pop.titulo || "POP", empresa: nomeDaEmpresa, versao: `versão ${pop.versao}` },
    situacao: pop.status === "Aprovado" && aprovacao ? `Aprovada por ${aprovador}, em ${formatarData(aprovacao.em)}` : `${pop.status} · v${pop.versao}`,
    blocos,
  };
}
