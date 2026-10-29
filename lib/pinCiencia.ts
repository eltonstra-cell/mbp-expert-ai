// Ciência do POP por PIN (rodada 12e, Parte D). SÓ roda no servidor (usa node:crypto).
//
// FINALIDADE E BASE LEGAL (LGPD): registrar que a pessoa da equipe tomou ciência da versão vigente de um POP, para o empregador
// comprovar que o procedimento foi comunicado. A base legal é o cumprimento de obrigação legal/regulatória do empregador e o exercício
// regular de direitos (LGPD, art. 7º, II e VI), NÃO o consentimento. Dados gravados: pessoa, versão do POP, data e hora. Nada de IP,
// localização, dispositivo nem dado de saúde. O PIN só existe como hash forte (scrypt com sal próprio) e nunca volta ao navegador.
//
// NÃO É EXIGÊNCIA DA NORMA: a RDC 216/2004 e a Portaria SES/RS 799/2023 pedem POP ACESSÍVEL aos funcionários e o REGISTRO NOMINAL da
// capacitação dos manipuladores. A ciência por leitura/PIN é boa prática do app; não a apresente como obrigação legal. Esta decisão
// pode precisar de revisão jurídica (ver relatório da rodada).
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const MAX_TENTATIVAS_DE_PIN = 5;
export const BLOQUEIO_DO_PIN_MINUTOS = 15;
const CUSTO_SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export const pinValido = (pin: unknown): pin is string => typeof pin === "string" && /^\d{4,6}$/.test(pin);

export function gerarSal(): string {
  return randomBytes(16).toString("hex");
}

export function hashDoPin(pin: string, salHex: string): string {
  return scryptSync(pin, Buffer.from(salHex, "hex"), 32, CUSTO_SCRYPT).toString("hex");
}

export function pinConfere(pin: string, salHex: string, hashEsperado: string): boolean {
  const calculado = Buffer.from(hashDoPin(pin, salHex), "hex");
  const esperado = Buffer.from(hashEsperado, "hex");
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
}

export type EstadoDeTentativas = { tentativas: number; bloqueadoAte: string | null };

/** Bloqueado agora? (depois do prazo o contador recomeça). */
export function pinBloqueado(estado: EstadoDeTentativas, agora: Date): boolean {
  return Boolean(estado.bloqueadoAte) && new Date(estado.bloqueadoAte!).getTime() > agora.getTime();
}

/** Próximo estado depois de uma tentativa: acerto zera; erro conta e, na 5ª seguida, bloqueia por 15 minutos. */
export function estadoAposTentativa(estado: EstadoDeTentativas, acertou: boolean, agora: Date): EstadoDeTentativas {
  if (acertou) return { tentativas: 0, bloqueadoAte: null };
  const expirado = estado.bloqueadoAte && new Date(estado.bloqueadoAte).getTime() <= agora.getTime();
  const tentativas = (expirado ? 0 : estado.tentativas) + 1;
  return tentativas >= MAX_TENTATIVAS_DE_PIN
    ? { tentativas: 0, bloqueadoAte: new Date(agora.getTime() + BLOQUEIO_DO_PIN_MINUTOS * 60000).toISOString() }
    : { tentativas, bloqueadoAte: null };
}
