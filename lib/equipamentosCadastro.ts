// Quadro de equipamentos do Cadastro: regras puras (sem tela).
import type { EquipamentoSetor } from "../types/index.ts";
import { mesmoEquipamentoOuSinonimo } from "./sinonimosEquipamentos.ts";

/** Ambientes para onde o item pode ir: todos menos o atual. */
export function ambientesParaMover(ambientes: string[], atual: string): string[] {
  return ambientes.filter((ambiente) => ambiente !== atual);
}

/** Muda o ambiente de UM equipamento; os outros ficam como estão. Destino igual ao atual ou vazio: devolve o mesmo array. */
export function moverEquipamento(equipamentos: EquipamentoSetor[], id: string, destino: string): EquipamentoSetor[] {
  const item = equipamentos.find((equipamento) => equipamento.id === id);
  if (!item || !destino || item.setor === destino) return equipamentos;
  return equipamentos.map((equipamento) => (equipamento.id === id ? { ...equipamento, setor: destino } : equipamento));
}

const chaveDoNome = (nome: string) => nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();

/** Dois nomes são o mesmo equipamento quando só diferem em acento, caixa ou espaços repetidos. */
export const mesmoNomeDeEquipamento = (a: string, b: string): boolean => {
  const chave = chaveDoNome(a);
  return chave !== "" && chave === chaveDoNome(b);
};

/** O item do setor que já tem este nome (sem acento e sem diferença de maiúscula/minúscula), se houver. Vale na hora de digitar. */
export function equipamentoRepetidoNoSetor(equipamentos: EquipamentoSetor[], setor: string, nome: string, ignorarId?: string): EquipamentoSetor | undefined {
  if (!chaveDoNome(nome)) return undefined;
  return equipamentos.find((item) => item.setor === setor && item.id !== ignorarId && mesmoNomeDeEquipamento(item.nome, nome));
}

export const quantidadeValida = (valor: unknown): number => Math.max(1, Math.floor(Number(valor)) || 1);

/**
 * Item do setor que é o mesmo equipamento do nome digitado: primeiro o nome igual (sem acento e sem caixa); se não houver, um sinônimo
 * ("Geladeira" = "Refrigerador", lista em lib/sinonimosEquipamentos.ts). Só vale na hora de ADICIONAR (a edição de nome continua pelo nome igual).
 */
export function equipamentoParecidoNoSetor(equipamentos: EquipamentoSetor[], setor: string, nome: string, ignorarId?: string): EquipamentoSetor | undefined {
  const igual = equipamentoRepetidoNoSetor(equipamentos, setor, nome, ignorarId);
  if (igual || !chaveDoNome(nome)) return igual;
  return equipamentos.find((item) => item.setor === setor && item.id !== ignorarId && mesmoEquipamentoOuSinonimo(item.nome, nome));
}

/** Nome igual, ou sinônimo (usado para não sugerir de novo o que o setor já tem). */
export const mesmoNomeOuSinonimo = (a: string, b: string): boolean => mesmoNomeDeEquipamento(a, b) || mesmoEquipamentoOuSinonimo(a, b);

/**
 * Aviso na hora, abaixo do campo: "Já existe Refrigerador (Qtd 2) neste setor"; com sinônimo, "Parece Geladeira (Qtd 1) neste setor"
 * (passe o nome digitado). Vazio quando o nome não repete.
 */
export function avisoDeNomeRepetido(repetido: EquipamentoSetor | undefined, nomeDigitado?: string): string {
  if (!repetido) return "";
  const soParece = nomeDigitado !== undefined && !mesmoNomeDeEquipamento(repetido.nome, nomeDigitado);
  return `${soParece ? "Parece" : "Já existe"} ${repetido.nome} (Qtd ${repetido.quantidade}) neste setor`;
}

export const MINIMO_DE_LETRAS_DO_NOME = 3;
export const MENSAGEM_DE_NOME_CURTO = `Digite o nome do equipamento (mínimo ${MINIMO_DE_LETRAS_DO_NOME} letras)`;

/** Letras do nome (sem contar espaços, números nem pontuação). */
export const letrasDoNome = (nome: string): number => (String(nome ?? "").match(/\p{L}/gu) || []).length;

export const nomeDeEquipamentoValido = (nome: string): boolean => letrasDoNome(nome) >= MINIMO_DE_LETRAS_DO_NOME;

/**
 * Mensagem na hora, abaixo do campo: aparece enquanto há texto com menos de 3 letras, ou depois de tentar adicionar (Enter ou botão) com o campo vazio.
 * Campo vazio e sem tentativa: sem mensagem (a tela não grita ao abrir).
 */
export function avisoDeNomeCurto(nome: string, tentouAdicionar: boolean): string {
  if (nomeDeEquipamentoValido(nome)) return "";
  return nome.trim() !== "" || tentouAdicionar ? MENSAGEM_DE_NOME_CURTO : "";
}

/** O botão Adicionar só liga com nome de ao menos 3 letras e, se o nome repete, depois de a pessoa escolher "Somar" ou "Cadastrar como outro item". */
export function podeAdicionarEquipamento(nome: string, repetido: EquipamentoSetor | undefined, escolha: "somar" | "outro" | null): boolean {
  if (!nomeDeEquipamentoValido(nome)) return false;
  return !repetido || escolha === "somar" || escolha === "outro";
}

/** Cadastra UM equipamento já vinculado ao setor (sem perguntar o setor). Nome repetido só entra se a pessoa escolheu "outro item" (quem chama decide). */
export function adicionarEquipamentoNoSetor(
  equipamentos: EquipamentoSetor[],
  novo: { id: string; setor: string; nome: string; quantidade: number; limiteTemperaturaId?: string }
): { equipamentos: EquipamentoSetor[]; criado: EquipamentoSetor } {
  const criado: EquipamentoSetor = {
    id: novo.id,
    setor: novo.setor,
    nome: novo.nome.trim().replace(/\s+/g, " "),
    quantidade: quantidadeValida(novo.quantidade),
    estado: "Não avaliado",
    observacao: "",
    ...(novo.limiteTemperaturaId ? { limiteTemperaturaId: novo.limiteTemperaturaId } : {}),
  };
  return { equipamentos: [...equipamentos, criado], criado };
}

/** "Somar ao existente": a quantidade digitada vai para o item que já existe; nenhum item novo nasce. */
export function somarAoExistente(equipamentos: EquipamentoSetor[], idExistente: string, quantidade: number): EquipamentoSetor[] {
  if (!equipamentos.some((item) => item.id === idExistente)) return equipamentos;
  return equipamentos.map((item) => (item.id === idExistente ? { ...item, quantidade: quantidadeValida(item.quantidade) + quantidadeValida(quantidade) } : item));
}

export function removerEquipamento(equipamentos: EquipamentoSetor[], id: string): EquipamentoSetor[] {
  return equipamentos.some((item) => item.id === id) ? equipamentos.filter((item) => item.id !== id) : equipamentos;
}

export function mudarNomeEQuantidade(equipamentos: EquipamentoSetor[], id: string, nome: string, quantidade: number): EquipamentoSetor[] {
  const limpo = nome.trim().replace(/\s+/g, " ");
  if (!limpo || !nomeDeEquipamentoValido(limpo)) return equipamentos;
  return equipamentos.map((item) => (item.id === id ? { ...item, nome: limpo, quantidade: quantidadeValida(quantidade) } : item));
}

export type ResultadoDoMover = {
  equipamentos: EquipamentoSetor[];
  /** Saiu do setor atual e entrou no destino. */
  movido: boolean;
  /** O destino já tinha o mesmo nome: a quantidade foi somada ao item de lá (sem duplicar). */
  somouEm?: EquipamentoSetor;
};

/** Mover para outro setor mantendo a quantidade; se o destino já tem o mesmo nome, soma a quantidade nele e o item sai (sem duplicar). */
export function moverSomandoSeRepetir(equipamentos: EquipamentoSetor[], id: string, destino: string): ResultadoDoMover {
  const item = equipamentos.find((equipamento) => equipamento.id === id);
  if (!item || !destino || item.setor === destino) return { equipamentos, movido: false };
  const igual = equipamentoRepetidoNoSetor(equipamentos, destino, item.nome, id);
  if (!igual) return { equipamentos: moverEquipamento(equipamentos, id, destino), movido: true };
  const somado = { ...igual, quantidade: quantidadeValida(igual.quantidade) + quantidadeValida(item.quantidade) };
  return { equipamentos: equipamentos.filter((equipamento) => equipamento.id !== id).map((equipamento) => (equipamento.id === igual.id ? somado : equipamento)), movido: true, somouEm: somado };
}

/** Desfaz um "mover": o item volta ao setor de antes; se tinha somado num item do destino, tira a quantidade de lá e devolve o item. */
export function desfazerMover(atuais: EquipamentoSetor[], original: EquipamentoSetor, somouEmId?: string): EquipamentoSetor[] {
  if (somouEmId) {
    const semItem = atuais.filter((item) => item.id !== original.id);
    const reduzido = semItem.map((item) => (item.id === somouEmId ? { ...item, quantidade: Math.max(1, quantidadeValida(item.quantidade) - quantidadeValida(original.quantidade)) } : item));
    return [...reduzido, original];
  }
  return atuais.map((item) => (item.id === original.id ? { ...item, setor: original.setor } : item));
}

const MASCULINAS_EM_A = ["sistema", "programa", "mapa", "dia", "sofa", "sofá"];

/** Particípio concordando com o nome do item: concordar("Coifa", "adicionad") → "adicionada"; concordar("Refrigerador", "adicionad") → "adicionado". Regra simples pela 1ª palavra. */
export function concordar(nome: string, radical: string): string {
  const primeira = chaveDoNome(nome).split(" ")[0] || "";
  const feminino = primeira.endsWith("a") && !MASCULINAS_EM_A.includes(primeira);
  return `${radical}${feminino ? "a" : "o"}`;
}

/** Devolve um item removido (desfazer), sem repetir o mesmo id. */
export function reinserirEquipamento(atuais: EquipamentoSetor[], item: EquipamentoSetor): EquipamentoSetor[] {
  return atuais.some((outro) => outro.id === item.id) ? atuais : [...atuais, item];
}

/** Itens (não unidades) de cada setor, para a lista da esquerda. */
export function contagemPorSetor(equipamentos: EquipamentoSetor[], setores: string[]): Record<string, number> {
  return Object.fromEntries(setores.map((setor) => [setor, equipamentos.filter((item) => item.setor === setor).length]));
}

/** Várias sugestões de uma vez (as marcadas), cada uma com sua quantidade; as que o setor já tem não entram. */
export function adicionarSugestoesEmLote(
  equipamentos: EquipamentoSetor[],
  setor: string,
  itens: { nome: string; quantidade: number; limiteTemperaturaId?: string }[],
  novoId: () => string
): { equipamentos: EquipamentoSetor[]; criados: string[] } {
  let atual = equipamentos;
  const criados: string[] = [];
  for (const item of itens) {
    if (equipamentoRepetidoNoSetor(atual, setor, item.nome)) continue;
    const id = novoId();
    atual = adicionarEquipamentoNoSetor(atual, { id, setor, nome: item.nome, quantidade: item.quantidade, limiteTemperaturaId: item.limiteTemperaturaId }).equipamentos;
    criados.push(id);
  }
  return { equipamentos: atual, criados };
}

export type ResultadoDaCopia = { equipamentos: EquipamentoSetor[]; criados: string[]; ignorados: number };

/**
 * "Copiar para outros ambientes": cada equipamento escolhido vai para cada ambiente de destino. Quem já tem um equipamento com o mesmo nome
 * no destino não recebe repetido (conta em `ignorados`). A cópia leva nome, quantidade e limite de temperatura; não leva a observação.
 */
export function copiarEquipamentos(equipamentos: EquipamentoSetor[], ids: string[], destinos: string[], novoId: () => string): ResultadoDaCopia {
  const origem = equipamentos.filter((item) => ids.includes(item.id));
  const criados: string[] = [];
  const novos: EquipamentoSetor[] = [];
  let ignorados = 0;
  for (const item of origem) {
    for (const destino of destinos) {
      if (!destino || destino === item.setor) continue;
      const jaTem = [...equipamentos, ...novos].some((outro) => outro.setor === destino && chaveDoNome(outro.nome) === chaveDoNome(item.nome));
      if (jaTem) {
        ignorados += 1;
        continue;
      }
      const id = novoId();
      criados.push(id);
      novos.push({ ...item, id, setor: destino, observacao: "", estado: "Não avaliado" });
    }
  }
  return { equipamentos: novos.length ? [...equipamentos, ...novos] : equipamentos, criados, ignorados };
}

/** Desfaz uma cópia: tira só o que ela criou (pelos ids), sem mexer em mais nada. */
export function desfazerCopia(equipamentos: EquipamentoSetor[], criados: string[]): EquipamentoSetor[] {
  return equipamentos.filter((item) => !criados.includes(item.id));
}

/** Equipamentos do pacote do tipo, só nos ambientes que estão marcados e que ainda não têm um com o mesmo nome. Vêm marcados como "sugeridos". */
export function equipamentosDoPacote(
  sugeridos: { nome: string; ambiente: string; quantidade: number }[],
  ambientesMarcados: string[],
  existentes: EquipamentoSetor[],
  novoId: () => string,
  limiteDoNome: (nome: string) => string | undefined
): EquipamentoSetor[] {
  const saida: EquipamentoSetor[] = [];
  for (const item of sugeridos) {
    if (!ambientesMarcados.includes(item.ambiente)) continue;
    if ([...existentes, ...saida].some((outro) => outro.setor === item.ambiente && chaveDoNome(outro.nome) === chaveDoNome(item.nome))) continue;
    const limite = limiteDoNome(item.nome);
    saida.push({ id: novoId(), setor: item.ambiente, nome: item.nome, quantidade: item.quantidade, estado: "Não avaliado", observacao: "", sugerido: true, ...(limite ? { limiteTemperaturaId: limite } : {}) });
  }
  return saida;
}

/** O RT confirma o que veio de sugestão (o equipamento e o limite proposto). */
export function confirmarSugestao(equipamentos: EquipamentoSetor[], id: string): EquipamentoSetor[] {
  return equipamentos.map((item) => {
    if (item.id !== id) return item;
    const { sugerido: _sugerido, ...resto } = item;
    return item.limiteTemperaturaId ? { ...resto, limiteConfirmado: true } : resto;
  });
}

/** Troca (ou tira, com vazio) o limite de temperatura de um equipamento; quando o RT escolhe, já fica confirmado. */
export function definirLimite(equipamentos: EquipamentoSetor[], id: string, limiteId: string): EquipamentoSetor[] {
  return equipamentos.map((item) => {
    if (item.id !== id) return item;
    const { limiteTemperaturaId: _limite, limiteConfirmado: _confirmado, ...resto } = item;
    return limiteId ? { ...resto, limiteTemperaturaId: limiteId, limiteConfirmado: true } : resto;
  });
}

/** Limite de temperatura que vale para o equipamento: o confirmado pelo RT; sem confirmação, só o proposto; sem nenhum, nada é classificado. */
export function limiteDoEquipamento(item: Pick<EquipamentoSetor, "limiteTemperaturaId" | "limiteConfirmado">): { id: string; confirmado: boolean } | null {
  return item.limiteTemperaturaId ? { id: item.limiteTemperaturaId, confirmado: Boolean(item.limiteConfirmado) } : null;
}

/**
 * Itens confirmados por voz entram pelas mesmas regras da digitação: nome repetido no setor soma no item que já existe (nenhum duplicado),
 * o limite sugerido entra como proposta (o RT confirma depois). `criados` e `somados` servem ao "Desfazer" em delta.
 */
export function confirmarItensFalados(
  equipamentos: EquipamentoSetor[],
  itens: { id: string; setor: string; nome: string; quantidade: number; limiteTemperaturaId?: string }[]
): { equipamentos: EquipamentoSetor[]; criados: string[]; somados: { id: string; quantidade: number }[] } {
  let atual = equipamentos;
  const criados: string[] = [];
  const somados: { id: string; quantidade: number }[] = [];
  for (const item of itens) {
    if (!nomeDeEquipamentoValido(item.nome)) continue;
    const existente = equipamentoRepetidoNoSetor(atual, item.setor, item.nome);
    if (existente) {
      atual = somarAoExistente(atual, existente.id, item.quantidade);
      somados.push({ id: existente.id, quantidade: quantidadeValida(item.quantidade) });
    } else {
      atual = adicionarEquipamentoNoSetor(atual, { id: item.id, setor: item.setor, nome: item.nome, quantidade: item.quantidade, limiteTemperaturaId: item.limiteTemperaturaId }).equipamentos;
      criados.push(item.id);
    }
  }
  return { equipamentos: atual, criados, somados };
}
