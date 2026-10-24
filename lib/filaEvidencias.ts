// Fila de envio de evidências (foto, áudio, arquivo) feita sem sinal. O arquivo e os metadados ficam no aparelho
// (IndexedDB) até o envio dar certo; depois o arquivo é apagado e só um registro leve permanece.
// Tudo aqui é lógica pura: o armazenamento, o envio, o relógio e a sessão entram por parâmetro, para testar fora do navegador.
// Nada é registrado em log além de contagens e tipos de erro: nunca nome de arquivo, URL, texto de observação ou conteúdo.

export const LIMITE_AVISO_FILA_BYTES = 100 * 1024 * 1024;
export const MAX_TENTATIVAS_AUTOMATICAS = 8;
const ESPERA_BASE_MS = 5_000;
const ESPERA_MAXIMA_MS = 5 * 60_000;
const MAX_REGISTROS_ENVIADOS = 20;

export type EstadoDoItem = "aguardando" | "enviando" | "falhou" | "enviado";

export type CausaDaFalha = "rede" | "servidor" | "sessao" | "permissao" | "invalido";

export type ItemDaFila = {
  /** Chave única do item = id da evidência: o servidor a usa para nunca criar duas vezes. */
  id: string;
  usuarioId: string;
  empresaId: string;
  visitaId: string;
  tipo: "Foto" | "Áudio";
  nomeArquivo: string;
  mimeType: string;
  ambiente: string;
  checklistItemId?: string;
  ncId?: string;
  descricao: string;
  /** Data e hora da captura (ISO): é a que a evidência guarda, não a do envio. */
  capturadoEm: string;
  bytes: number;
  estado: EstadoDoItem;
  tentativas: number;
  proximaTentativaEm?: number;
  causaDaFalha?: CausaDaFalha;
  progresso?: number;
  /** Só existe até o envio dar certo. */
  arquivo?: Blob;
  /** Resultado do envio, guardado até a evidência ser atualizada na tela. */
  resultado?: { pathname: string; url: string };
  resultadoAplicado?: boolean;
  enviadoEm?: string;
};

export type ItemSemArquivo = Omit<ItemDaFila, "arquivo">;

export type ArmazemDaFila = {
  salvar: (item: ItemDaFila) => Promise<void>;
  ler: (id: string) => Promise<ItemDaFila | undefined>;
  listar: () => Promise<ItemDaFila[]>;
  apagar: (id: string) => Promise<void>;
};

export class FalhaDeEnvio extends Error {
  causa: CausaDaFalha;
  constructor(causa: CausaDaFalha, mensagem?: string) {
    super(mensagem || causa);
    this.name = "FalhaDeEnvio";
    this.causa = causa;
  }
}

/** Traduz o resultado HTTP do envio. Resposta que não é JSON (login no lugar da API) conta como sessão expirada. */
export function causaDaResposta(status: number, ehJson: boolean, redirecionou = false): CausaDaFalha | null {
  if (status === 401) return "sessao";
  if (redirecionou && !ehJson) return "sessao";
  if (status >= 200 && status < 300) return ehJson ? null : "sessao";
  if (status === 403) return "permissao";
  if (status === 400 || status === 413 || status === 415) return "invalido";
  return status >= 500 ? "servidor" : "rede";
}

/** Espera crescente entre tentativas: 5 s, 10 s, 20 s... até 5 min. */
export function esperaDaTentativa(tentativas: number): number {
  return Math.min(ESPERA_MAXIMA_MS, ESPERA_BASE_MS * 2 ** Math.max(0, tentativas - 1));
}

export function semArquivo(item: ItemDaFila): ItemSemArquivo {
  const { arquivo: _arquivo, ...resto } = item;
  return resto;
}

export function chaveValida(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(id);
}

export type DadosParaEnfileirar = Omit<ItemDaFila, "estado" | "tentativas" | "bytes" | "arquivo">;

/** Grava o arquivo e os metadados no aparelho. Gravar de novo a mesma chave não cria um segundo item. */
export async function enfileirar(armazem: ArmazemDaFila, dados: DadosParaEnfileirar, arquivo: Blob): Promise<ItemDaFila> {
  if (!chaveValida(dados.id)) throw new Error("Chave inválida.");
  const existente = await armazem.ler(dados.id);
  if (existente && existente.estado !== "enviado") return existente;
  const item: ItemDaFila = { ...dados, bytes: arquivo.size, estado: "aguardando", tentativas: 0, arquivo };
  await armazem.salvar(item);
  return item;
}

export function itensDoUsuario<T extends { usuarioId: string }>(itens: T[], usuarioId: string): T[] {
  return itens.filter((item) => item.usuarioId === usuarioId);
}

export type ResumoDaFila = {
  pendentes: number;
  aguardando: number;
  enviando: number;
  falhou: number;
  bytes: number;
  acimaDoLimite: boolean;
};

export function resumirFila(itens: ItemSemArquivo[], limite = LIMITE_AVISO_FILA_BYTES): ResumoDaFila {
  const pendentes = itens.filter((item) => item.estado !== "enviado");
  const bytes = pendentes.reduce((soma, item) => soma + item.bytes, 0);
  return {
    pendentes: pendentes.length,
    aguardando: pendentes.filter((item) => item.estado === "aguardando").length,
    enviando: pendentes.filter((item) => item.estado === "enviando").length,
    falhou: pendentes.filter((item) => item.estado === "falhou").length,
    bytes,
    acimaDoLimite: bytes > limite,
  };
}

export function textoDeEspaco(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export type ContextoDoEnvio = {
  armazem: ArmazemDaFila;
  /** Quem está logado agora. Só os itens desse usuário são vistos e enviados. */
  usuarioId: string;
  /** O usuário ainda tem acesso à empresa do item? */
  podeAcessarEmpresa: (empresaId: string) => boolean;
  online: () => boolean;
  agora: () => number;
  /** Envia um item. Lança FalhaDeEnvio quando não deu certo. */
  enviar: (item: ItemDaFila, arquivo: Blob, aoProgresso: (percentual: number) => void) => Promise<{ pathname: string; url: string }>;
  /** Chamado a cada mudança, para a tela atualizar. */
  aoMudar?: () => void;
  /** Passa o resultado para a evidência na tela. Devolve true se aplicou. */
  aplicarResultado?: (item: ItemSemArquivo, resultado: { pathname: string; url: string }) => boolean;
};

export type ResultadoDoProcessamento = {
  enviados: number;
  falhas: number;
  sessaoExpirada: boolean;
  semConexao: boolean;
  /** Quando tentar de novo (ms), se houver item esperando. */
  proximaEm?: number;
};

const emAndamento = new WeakSet<ArmazemDaFila>();

/**
 * Envia, em ordem de captura, os itens do usuário atual que estão vencidos.
 * `forcar` ignora a espera (botões "Enviar agora" e "Tentar de novo") e também retoma itens que falharam.
 */
export async function processarFila(contexto: ContextoDoEnvio, opcoes: { forcar?: boolean } = {}): Promise<ResultadoDoProcessamento> {
  const resultado: ResultadoDoProcessamento = { enviados: 0, falhas: 0, sessaoExpirada: false, semConexao: false };
  const { armazem } = contexto;
  if (emAndamento.has(armazem)) return resultado;
  emAndamento.add(armazem);
  try {
    if (!contexto.online()) {
      resultado.semConexao = true;
      return resultado;
    }
    const todos = itensDoUsuario(await armazem.listar(), contexto.usuarioId).sort((a, b) => a.capturadoEm.localeCompare(b.capturadoEm));
    await aplicarPendentes(contexto, todos);
    const candidatos = todos.filter((item) => item.arquivo && (item.estado === "aguardando" || item.estado === "enviando" || (opcoes.forcar && item.estado === "falhou")));
    for (const base of candidatos) {
      if (!opcoes.forcar && base.estado === "aguardando" && (base.proximaTentativaEm || 0) > contexto.agora()) {
        resultado.proximaEm = Math.min(resultado.proximaEm ?? Infinity, base.proximaTentativaEm!);
        continue;
      }
      // Sem acesso à empresa (perfil mudou): o item fica guardado, sem tentar.
      if (!contexto.podeAcessarEmpresa(base.empresaId)) {
        await armazem.salvar({ ...base, estado: "falhou", causaDaFalha: "permissao" });
        contexto.aoMudar?.();
        resultado.falhas += 1;
        continue;
      }
      const item: ItemDaFila = { ...base, estado: "enviando", progresso: 0, causaDaFalha: undefined };
      await armazem.salvar(item);
      contexto.aoMudar?.();
      try {
        const enviado = await contexto.enviar(item, item.arquivo as Blob, (percentual) => {
          item.progresso = percentual;
          contexto.aoMudar?.();
        });
        const concluido: ItemDaFila = { ...item, estado: "enviado", progresso: 100, arquivo: undefined, resultado: enviado, enviadoEm: new Date(contexto.agora()).toISOString(), proximaTentativaEm: undefined };
        // O arquivo sai do aparelho aqui: o registro leve fica só para mostrar "Enviada".
        await armazem.salvar(concluido);
        resultado.enviados += 1;
        if (contexto.aplicarResultado?.(semArquivo(concluido), enviado)) await armazem.salvar({ ...concluido, resultadoAplicado: true });
        contexto.aoMudar?.();
      } catch (erro) {
        const causa: CausaDaFalha = erro instanceof FalhaDeEnvio ? erro.causa : "rede";
        resultado.falhas += 1;
        if (causa === "sessao") {
          // Sessão expirada: continua na fila, sem gastar tentativa, e para tudo até novo login.
          await armazem.salvar({ ...base, estado: "aguardando", causaDaFalha: "sessao", progresso: undefined });
          resultado.sessaoExpirada = true;
          contexto.aoMudar?.();
          break;
        }
        // Falha por falta de conexão (a conexão caiu no meio do envio) não gasta tentativa: o item continua na fila e recomeça quando o sinal voltar.
        if (causa === "rede" && !contexto.online()) {
          await armazem.salvar({ ...base, estado: "aguardando", causaDaFalha: "rede", progresso: undefined });
          contexto.aoMudar?.();
          resultado.semConexao = true;
          break;
        }
        const tentativas = base.tentativas + 1;
        const desistiu = causa === "invalido" || tentativas >= MAX_TENTATIVAS_AUTOMATICAS;
        const proxima = contexto.agora() + esperaDaTentativa(tentativas);
        await armazem.salvar({
          ...base,
          estado: desistiu ? "falhou" : "aguardando",
          tentativas,
          causaDaFalha: causa,
          progresso: undefined,
          proximaTentativaEm: desistiu ? undefined : proxima,
        });
        if (!desistiu) resultado.proximaEm = Math.min(resultado.proximaEm ?? Infinity, proxima);
        contexto.aoMudar?.();
        // Conexão caiu no meio: não adianta insistir nos outros agora.
        if (causa === "rede" && !contexto.online()) {
          resultado.semConexao = true;
          break;
        }
      }
    }
    await podarEnviados(armazem, contexto.usuarioId);
    return resultado;
  } finally {
    emAndamento.delete(armazem);
  }
}

async function aplicarPendentes(contexto: ContextoDoEnvio, itens: ItemDaFila[]) {
  for (const item of itens) {
    if (item.estado === "enviado" && item.resultado && !item.resultadoAplicado && contexto.aplicarResultado) {
      if (contexto.aplicarResultado(semArquivo(item), item.resultado)) await contexto.armazem.salvar({ ...item, resultadoAplicado: true });
    }
  }
}

async function podarEnviados(armazem: ArmazemDaFila, usuarioId: string) {
  const enviados = itensDoUsuario(await armazem.listar(), usuarioId)
    .filter((item) => item.estado === "enviado" && item.resultadoAplicado)
    .sort((a, b) => (b.enviadoEm || "").localeCompare(a.enviadoEm || ""));
  for (const velho of enviados.slice(MAX_REGISTROS_ENVIADOS)) await armazem.apagar(velho.id);
}

/** Item que ficou "enviando" porque o app fechou no meio volta a aguardar. */
export async function recuperarInterrompidos(armazem: ArmazemDaFila, usuarioId: string): Promise<number> {
  let n = 0;
  for (const item of itensDoUsuario(await armazem.listar(), usuarioId)) {
    if (item.estado === "enviando") {
      await armazem.salvar({ ...item, estado: "aguardando", progresso: undefined });
      n += 1;
    }
  }
  return n;
}

/**
 * Item que "falhou" só por conexão ou servidor (nunca por arquivo inválido, permissão ou sessão) volta para a fila ao abrir o app:
 * quem ficou muito tempo sem sinal não precisa saber que existe um botão para tentar de novo. Não apaga nada.
 */
export async function reabrirFalhasDeConexao(armazem: ArmazemDaFila, usuarioId: string): Promise<number> {
  let n = 0;
  for (const item of itensDoUsuario(await armazem.listar(), usuarioId)) {
    if (item.estado === "falhou" && (item.causaDaFalha === "rede" || item.causaDaFalha === "servidor")) {
      await armazem.salvar({ ...item, estado: "aguardando", tentativas: 0, proximaTentativaEm: undefined });
      n += 1;
    }
  }
  return n;
}

/** Descarta UM item (com confirmação na tela): apaga o arquivo do aparelho. Só do usuário atual. */
export async function descartarItem(armazem: ArmazemDaFila, usuarioId: string, id: string): Promise<boolean> {
  const item = await armazem.ler(id);
  if (!item || item.usuarioId !== usuarioId) return false;
  await armazem.apagar(id);
  return true;
}

/** Recoloca um item que falhou na fila, com as tentativas zeradas. */
export async function tentarDeNovo(armazem: ArmazemDaFila, usuarioId: string, id: string): Promise<boolean> {
  const item = await armazem.ler(id);
  if (!item || item.usuarioId !== usuarioId || item.estado !== "falhou") return false;
  await armazem.salvar({ ...item, estado: "aguardando", tentativas: 0, causaDaFalha: undefined, proximaTentativaEm: undefined });
  return true;
}

/** Motivo curto para o cartão da foto ("Erro: …"). */
export const MOTIVO_CURTO_DA_CAUSA: Record<CausaDaFalha, string> = {
  rede: "Sem conexão estável",
  servidor: "Servidor não respondeu",
  sessao: "Sessão expirada",
  permissao: "Sem permissão ou visita ainda não enviada",
  invalido: "Arquivo não aceito",
};

export const TEXTO_DA_CAUSA: Record<CausaDaFalha, string> = {
  rede: "Sem conexão estável. Vai tentar de novo.",
  servidor: "O servidor não respondeu. Vai tentar de novo.",
  sessao: "Sessão expirada. Entre de novo para enviar.",
  permissao: "Sem permissão ou visita ainda não sincronizada.",
  invalido: "Arquivo não aceito pelo servidor.",
};
