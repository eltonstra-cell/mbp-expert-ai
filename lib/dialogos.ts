// Janelas do app no lugar de alert/confirm/prompt do navegador.
// Funciona fora do React: quem chama recebe uma Promise; o <DialogHost /> mostra uma janela por vez.

export type DialogoAviso = { tipo: "aviso"; mensagem: string; titulo: string; resolver: () => void };
export type DialogoConfirmacao = {
  tipo: "confirmacao";
  mensagem: string;
  titulo: string;
  confirmarRotulo: string;
  cancelarRotulo: string;
  perigoso: boolean;
  resolver: (confirmado: boolean) => void;
};
export type DialogoPergunta = {
  tipo: "pergunta";
  mensagem: string;
  titulo: string;
  confirmarRotulo: string;
  cancelarRotulo: string;
  valorInicial: string;
  perigoso: boolean;
  resolver: (texto: string | null) => void;
};
export type Dialogo = DialogoAviso | DialogoConfirmacao | DialogoPergunta;

let fila: Dialogo[] = [];
const ouvintes = new Set<() => void>();

function avisarOuvintes() {
  ouvintes.forEach((ouvinte) => ouvinte());
}

function enfileirar(dialogo: Dialogo) {
  fila = [...fila, dialogo];
  avisarOuvintes();
}

/** Remove o dialogo da frente da fila (chamado pelo host depois de resolver). */
export function encerrarDialogoAtual() {
  fila = fila.slice(1);
  avisarOuvintes();
}

export function dialogoAtual(): Dialogo | null {
  return fila[0] ?? null;
}

export function assinarDialogos(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

/** Só para testes. */
export function limparDialogos() {
  fila = [];
  avisarOuvintes();
}

export function avisar(mensagem: string, opcoes: { titulo?: string } = {}): Promise<void> {
  return new Promise((resolver) => {
    enfileirar({ tipo: "aviso", mensagem, titulo: opcoes.titulo ?? "Aviso", resolver: () => resolver() });
  });
}

export function confirmar(
  mensagem: string,
  opcoes: { titulo?: string; confirmarRotulo?: string; cancelarRotulo?: string; perigoso?: boolean } = {}
): Promise<boolean> {
  return new Promise((resolver) => {
    enfileirar({
      tipo: "confirmacao",
      mensagem,
      titulo: opcoes.titulo ?? "Confirmar",
      confirmarRotulo: opcoes.confirmarRotulo ?? "Confirmar",
      cancelarRotulo: opcoes.cancelarRotulo ?? "Cancelar",
      perigoso: opcoes.perigoso ?? false,
      resolver,
    });
  });
}

export function perguntar(
  mensagem: string,
  opcoes: { titulo?: string; confirmarRotulo?: string; cancelarRotulo?: string; valorInicial?: string; perigoso?: boolean } = {}
): Promise<string | null> {
  return new Promise((resolver) => {
    enfileirar({
      tipo: "pergunta",
      mensagem,
      titulo: opcoes.titulo ?? "Informe",
      confirmarRotulo: opcoes.confirmarRotulo ?? "Confirmar",
      cancelarRotulo: opcoes.cancelarRotulo ?? "Cancelar",
      valorInicial: opcoes.valorInicial ?? "",
      perigoso: opcoes.perigoso ?? false,
      resolver,
    });
  });
}
