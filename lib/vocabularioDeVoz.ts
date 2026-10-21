// Contexto que acompanha o áudio da BUSCA por voz (parâmetro "prompt" da transcrição): os termos do app e os nomes de exibição das
// empresas que a pessoa acessa (no máximo 20, só o nome). Isto vai à OpenAI junto com o áudio.
// NUNCA entra aqui: nome de paciente, de pessoa de Acessos, dado de visita, de saúde, CNPJ, e-mail ou qualquer outro texto do estado.
import { nomeDeExibicaoDaEmpresa } from "./nomeEmpresa.ts";

export const LIMITE_DE_EMPRESAS_NO_VOCABULARIO = 20;

/** Termos fixos do app (nomes de telas e comandos); nenhum dado do cliente. */
export const TERMOS_DO_APP = [
  "Central da Empresa",
  "POPs",
  "Comprovantes",
  "Evidências",
  "Correções",
  "Checklist",
  "Relatórios",
  "Visitas",
  "Empresas",
  "Registrar",
  "Nova visita",
];

const INSTRUCAO_DA_BUSCA = "Comando curto em português do Brasil para um aplicativo de segurança dos alimentos.";

/** Só letras, números, espaço e pontuação de nome de empresa; sem quebras de linha nem texto longo. */
export function nomeSeguroParaVocabulario(nome: string | undefined | null): string {
  return (nome || "")
    .replace(/[^\p{L}\p{N} .&'’-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

type EmpresaParaVocabulario = { nomeFantasia?: string; razaoSocial?: string; arquivada?: boolean };

/** Nomes de exibição (únicos, em ordem, no máximo 20) das empresas não arquivadas. Quem decide quais empresas entram é o servidor, pelo perfil. */
export function nomesParaVocabulario(empresas: EmpresaParaVocabulario[]): string[] {
  const vistos = new Set<string>();
  const nomes: string[] = [];
  for (const empresa of empresas) {
    if (empresa.arquivada) continue;
    const nome = nomeSeguroParaVocabulario(nomeDeExibicaoDaEmpresa(empresa));
    const chave = nome.toLocaleLowerCase("pt-BR");
    if (!nome || vistos.has(chave)) continue;
    vistos.add(chave);
    nomes.push(nome);
  }
  return nomes.sort((a, b) => a.localeCompare(b, "pt-BR")).slice(0, LIMITE_DE_EMPRESAS_NO_VOCABULARIO);
}

/** O "prompt" da transcrição da busca: instrução curta, termos do app e nomes das empresas. */
export function montarPromptDaBusca(empresas: EmpresaParaVocabulario[]): string {
  const nomes = nomesParaVocabulario(empresas);
  return [INSTRUCAO_DA_BUSCA, `Termos do aplicativo: ${TERMOS_DO_APP.join(", ")}.`, nomes.length ? `Empresas: ${nomes.join(", ")}.` : ""].filter(Boolean).join(" ");
}

/** Empresas que a pessoa acessa (para o vocabulário): o Administrador vê todas; os demais, só as do próprio cadastro. */
export function empresasDoUsuarioParaVocabulario(
  empresas: Record<string, EmpresaParaVocabulario & { id: string }>,
  usuario: { perfil: string; empresaIds: string[] }
): EmpresaParaVocabulario[] {
  const todas = Object.values(empresas || {});
  return usuario.perfil === "Administrador" ? todas : todas.filter((empresa) => usuario.empresaIds.includes(empresa.id));
}

/** A busca falou só o que estava no prompt? Sequência longa de palavras em comum com ele indica que o serviço devolveu o próprio contexto (áudio sem fala). */
export function ehEcoDoPromptDaBusca(texto: string, prompt: string): boolean {
  const palavras = (valor: string) =>
    valor
      .toLocaleLowerCase("pt-BR")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  const a = palavras(texto);
  const b = palavras(prompt);
  let melhor = 0;
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      let k = 0;
      while (i + k < a.length && j + k < b.length && a[i + k] === b[j + k]) k += 1;
      if (k > melhor) melhor = k;
    }
  }
  // Um comando de verdade ("evidências em elton volmir strapazon") repete poucas palavras seguidas; devolver o contexto repete muitas.
  return melhor >= 8;
}
