// Catálogo de normas: cada norma é um arquivo versionado em lib/normas/, com "fonte" e "conferidoEm".
// Nada aqui é texto de norma copiado: são as exigências resumidas, cada uma com a citação do item.

export type ItemDeNorma = {
  /** Item como citado na norma, ex.: "4.11.2" ou "Anexo II, 13.7 (a–d)". */
  rotulo: string;
  /** O que a norma pede neste item (resumo para orientar o preenchimento). */
  orientacao: string;
  /** Citação ainda não conferida no texto oficial: o app mostra "conferir". */
  conferir?: boolean;
  /** Prazo em dias citado no item (ex.: guarda dos registros). Vale o que o item diz; o app só o exibe. */
  prazoDias?: number;
  /** Prazo em meses citado no item (ex.: intervalo da limpeza do reservatório). */
  prazoMeses?: number;
};

export type Norma = {
  id: string;
  nome: string;
  esfera: "federal" | "estadual";
  /** Sigla do estado, quando a norma é estadual. */
  uf?: string;
  /** De onde vieram as citações. */
  fonte: string;
  /** Data (AAAA-MM-DD) em que alguém conferiu as citações no texto oficial; vazio = ainda não conferido. */
  conferidoEm: string | null;
  /** Avisos que acompanham a norma (ex.: "conferir no texto oficial antes de usar com clientes"). */
  avisos: string[];
  /** Muda quando o conteúdo da norma no catálogo muda; POPs aprovados guardam a versão usada. */
  versaoCatalogo: string;
  dataVersao: string;
  /** Itens por identificador interno (compartilhado entre as normas do catálogo). */
  itens: Record<string, ItemDeNorma>;
};
