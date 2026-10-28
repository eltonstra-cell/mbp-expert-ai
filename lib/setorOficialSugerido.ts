// Nome próprio de ambiente ("Salão", "Cozinha da frente") → setor oficial SUGERIDO. O RT confirma com um toque; o nome próprio continua sendo o exibido
// e o setor oficial vira só o vínculo técnico. Os nomes oficiais são os da lista do Manual (SETORES_OFICIAIS_MANUAL); a FONTE de cada um é o TEXTO da
// Portaria SES/RS nº 799/2023 (PDF oficial do estado, lido em 2026-10-23). Setor sem trecho encontrado na norma fica com fonte VAZIA: o app não inventa.
import { SETORES_OFICIAIS_MANUAL } from "./manualBase.ts";

export type FonteDoSetor = { norma: string; item: string; trecho: string; link: string; conferidoEm: string };

const LINK = "https://estado.rs.gov.br/upload/arquivos/portaria-ses-799-2023.pdf";
const NORMA = "Portaria SES/RS nº 799/2023";
const CONFERIDO_EM = "2026-10-23";
const fonte = (item: string, trecho: string): FonteDoSetor => ({ norma: NORMA, item, trecho, link: LINK, conferidoEm: CONFERIDO_EM });

const [RECEBIMENTO, ESTOQUE, DML, GAS, COZINHA, HIGIENIZACAO, SALAO, VEST_F, BAN_F, VEST_M, BAN_M, CLI_F, CLI_M] = SETORES_OFICIAIS_MANUAL;

/** Fonte de cada setor oficial; null = o texto da norma lido não traz esse setor (fica vazio para o RT conferir). */
export const FONTE_DOS_SETORES: Record<string, FonteDoSetor | null> = {
  [RECEBIMENTO]: fonte("9.1", "O recebimento de matérias-primas, ingredientes e embalagens deve ser realizado em áreas cobertas e limpas"),
  [ESTOQUE]: fonte("3.1", "etapas de preparação de alimentos (recebimento, armazenamento, pré-preparo, preparo e distribuição ou consumação)"),
  [DML]: null,
  [GAS]: null,
  [COZINHA]: fonte("3.1", "etapas de preparação de alimentos (recebimento, armazenamento, pré-preparo, preparo e distribuição ou consumação)"),
  [HIGIENIZACAO]: fonte("4.3", "A higienização deve ser em local próprio, em recipientes exclusivos para essa atividade"),
  [SALAO]: fonte("3.21", "área interna exclusiva para consumação de alimentos"),
  [VEST_F]: fonte("3.11", "As instalações sanitárias e vestiários não devem ter comunicação direta com as áreas de preparação"),
  [BAN_F]: fonte("3.11", "As instalações sanitárias e vestiários não devem ter comunicação direta com as áreas de preparação"),
  [VEST_M]: fonte("3.11", "As instalações sanitárias e vestiários não devem ter comunicação direta com as áreas de preparação"),
  [BAN_M]: fonte("3.11", "As instalações sanitárias e vestiários não devem ter comunicação direta com as áreas de preparação"),
  [CLI_F]: fonte("3.11", "As instalações sanitárias e vestiários não devem ter comunicação direta com as áreas de preparação"),
  [CLI_M]: fonte("3.11", "As instalações sanitárias e vestiários não devem ter comunicação direta com as áreas de preparação"),
};

export type SetorSugerido = { oficial: string; fonte: FonteDoSetor | null };

/** "Base: Portaria SES/RS nº 799/2023, item 3.1 · conferido em 23/10/2026"; setor sem trecho na norma lida: o texto que o app já usava. */
export function baseDoSetorOficial(oficial: string): string {
  const fonteDoSetor = FONTE_DOS_SETORES[oficial];
  return fonteDoSetor
    ? `Base: ${fonteDoSetor.norma}, item ${fonteDoSetor.item} · conferido em ${fonteDoSetor.conferidoEm.split("-").reverse().join("/")}`
    : "Base: sem texto da norma encontrado para este setor";
}

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim();
const tem = (texto: string, ...palavras: string[]) => palavras.some((p) => new RegExp(`(^| )${p}`).test(texto));

/**
 * Setor oficial sugerido para um nome próprio, ou null quando não há palavra reconhecida (ou a sugestão seria ambígua, como "banheiro" sem dizer
 * para quem). Nome que já é setor oficial não recebe sugestão.
 */
export function sugerirSetorOficial(nome: string): SetorSugerido | null {
  if ((SETORES_OFICIAIS_MANUAL as readonly string[]).includes(nome.trim())) return null;
  const t = semAcento(nome);
  if (!t) return null;
  const cliente = tem(t, "cliente", "clientes", "publico", "visitante");
  const feminino = tem(t, "feminino", "feminina", "mulher", "mulheres", "damas");
  const masculino = tem(t, "masculino", "masculina", "homem", "homens", "cavalheiros");
  const comEscolha = (oficial: string): SetorSugerido => ({ oficial, fonte: FONTE_DOS_SETORES[oficial] ?? null });
  if (tem(t, "vestiario")) return feminino ? comEscolha(VEST_F) : masculino ? comEscolha(VEST_M) : null;
  if (tem(t, "banheiro", "sanitario", "wc", "lavabo", "toalete")) {
    if (cliente) return feminino ? comEscolha(CLI_F) : masculino ? comEscolha(CLI_M) : null;
    return feminino ? comEscolha(BAN_F) : masculino ? comEscolha(BAN_M) : null;
  }
  if (tem(t, "dml", "material de limpeza", "materiais de limpeza", "deposito de limpeza", "produtos de limpeza")) return comEscolha(DML);
  if (tem(t, "gas", "botijao", "botijoes")) return comEscolha(GAS);
  if (tem(t, "higienizacao", "lavagem", "lavacao", "lava loucas", "lava louca")) return comEscolha(HIGIENIZACAO);
  if (tem(t, "recebimento", "doca", "descarga", "entrada de mercadoria")) return comEscolha(RECEBIMENTO);
  if (tem(t, "estoque", "despensa", "almoxarifado", "camara fria", "camara", "freezer", "armazenamento", "deposito")) return comEscolha(ESTOQUE);
  if (tem(t, "salao", "refeitorio", "consumacao", "mesas", "varanda", "deck", "area de clientes", "atendimento")) return comEscolha(SALAO);
  if (tem(t, "cozinha", "producao", "preparo", "pre preparo", "copa", "churrasqueira", "confeitaria", "padaria", "acougue", "grill", "chapa", "massas")) return comEscolha(COZINHA);
  return null;
}
