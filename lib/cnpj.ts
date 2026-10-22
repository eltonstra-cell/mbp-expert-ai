// CNPJ só na exibição: 00.000.000/0000-00 quando há 14 dígitos; qualquer outro valor aparece como foi digitado. O valor salvo não muda.
export function formatarCnpj(valor?: string | null): string {
  const texto = (valor || "").trim();
  const digitos = texto.replace(/\D/g, "");
  if (digitos.length !== 14) return texto;
  return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12)}`;
}
