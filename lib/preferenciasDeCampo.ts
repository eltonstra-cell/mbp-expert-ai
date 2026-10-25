// Preferências deste aparelho para o trabalho em campo (localStorage, sempre com try/catch). Nada vai para a nuvem.
const CHAVE_CAMERA_AUTOMATICA = "mbp-expert-ai:camera-automatica:v1";

const CHAVE_AVANCAR_AO_RESPONDER = "mbp-expert-ai:avancar-ao-responder:v1";

type Armazem = Pick<Storage, "getItem" | "setItem">;

const doNavegador = (): Armazem | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};

/** "Abrir a câmera automaticamente ao marcar Não conforme": DESLIGADA por padrão. */
export function cameraAutomaticaLigada(armazem: Armazem | null = doNavegador()): boolean {
  try {
    return armazem?.getItem(CHAVE_CAMERA_AUTOMATICA) === "1";
  } catch {
    return false;
  }
}

/** "Avançar ao responder Conforme": LIGADA por padrão (só "0" desliga). */
export function avancarAoResponderLigado(armazem: Armazem | null = doNavegador()): boolean {
  try {
    return armazem?.getItem(CHAVE_AVANCAR_AO_RESPONDER) !== "0";
  } catch {
    return true;
  }
}

export function definirAvancarAoResponder(ligado: boolean, armazem: Armazem | null = doNavegador()): void {
  try {
    armazem?.setItem(CHAVE_AVANCAR_AO_RESPONDER, ligado ? "1" : "0");
  } catch {
    // Sem armazenamento: a preferência vale só até recarregar.
  }
}

export function definirCameraAutomatica(ligada: boolean, armazem: Armazem | null = doNavegador()): void {
  try {
    armazem?.setItem(CHAVE_CAMERA_AUTOMATICA, ligada ? "1" : "0");
  } catch {
    // Sem armazenamento: a preferência vale só até recarregar.
  }
}
