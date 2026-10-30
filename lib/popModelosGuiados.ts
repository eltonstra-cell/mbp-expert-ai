// Campos guiados dos POPs de pragas, reservatório e higiene dos manipuladores (rodada 13).
// Cada campo traz só a PERGUNTA, tirada do que a norma pede, e a indicação de preencher conforme a norma vigente: nenhum passo,
// concentração, tempo de contato ou temperatura pronto. A fonte (norma e item) vem do texto dos PDFs em docs/normas, conferido em 2026-10-30
// (RDC 216/2004, itens 4.11.5 a 4.11.8, p. 8; Portaria SES 799/2023, Anexo II, itens 13.8 a 13.11, p. 22 e 23). Todo campo fica marcado "conferir".

export const INDICACAO_DA_NORMA = "Preencher conforme a norma vigente.";

export type CampoGuiado = { pergunta: string; fonte: string; conferir: true };

const PRAGAS = "RDC 216/2004, 4.11.6 · Portaria SES 799/2023, Anexo II, 13.9";
const HIGIENIZACAO = "RDC 216/2004, 4.11.5 · Portaria SES 799/2023, Anexo II, 13.8";
const RESERVATORIO = "RDC 216/2004, 4.11.7 (com as informações do 4.11.5) · Portaria SES 799/2023, Anexo II, 13.10 (com as do 13.8)";
const MANIPULADORES = "RDC 216/2004, 4.11.8 · Portaria SES 799/2023, Anexo II, 13.11";

const campo = (pergunta: string, fonte: string): CampoGuiado => ({ pergunta, fonte, conferir: true });

const DA_HIGIENIZACAO: Record<string, string> = {
  superficie: "Qual é a natureza da superfície a ser higienizada?",
  metodo: "Qual é o método de higienização?",
  produto: "Qual produto é usado?",
  principioAtivo: "Qual é o princípio ativo selecionado?",
  concentracao: "Qual é a concentração do princípio ativo?",
  tempoContato: "Qual é o tempo de contato dos agentes químicos e ou físicos?",
  temperatura: "Qual é a temperatura, se a norma pede?",
};

/** Campo da higienização (instalações ou reservatório): a pergunta é a mesma; a fonte muda no reservatório. */
export function campoGuiadoDaHigienizacao(chave: string, reservatorio: boolean): CampoGuiado | null {
  const pergunta = DA_HIGIENIZACAO[chave];
  return pergunta ? campo(pergunta, reservatorio ? RESERVATORIO : HIGIENIZACAO) : null;
}

export const CAMPOS_GUIADOS: Record<string, CampoGuiado> = {
  "pragas.preventivas": campo("Quais medidas preventivas impedem a atração, o abrigo, o acesso e a proliferação de vetores e pragas urbanas?", PRAGAS),
  "pragas.corretivas": campo("Quais medidas corretivas são adotadas quando há vetores ou pragas urbanas?", PRAGAS),
  "pragas.comprovanteEmpresa": campo("Com controle químico: qual empresa especializada executa o serviço e onde fica o comprovante de execução?", PRAGAS),
  "manipuladores.lavagemMaosEtapas": campo("Quais são as etapas da lavagem e da antissepsia das mãos dos manipuladores?", MANIPULADORES),
  "manipuladores.lavagemMaosFrequencia": campo("Com que frequência as mãos são lavadas e antissepsiadas, e quais princípios ativos são usados?", MANIPULADORES),
  "manipuladores.lesoesSintomas": campo("Que medidas são adotadas quando o manipulador tem lesão nas mãos, sintomas de enfermidade ou suspeita de problema de saúde?", MANIPULADORES),
  "manipuladores.examesPeriodicidade": campo("A quais exames os manipuladores são submetidos e com que periodicidade?", MANIPULADORES),
  "manipuladores.capacitacaoCargaHoraria": campo("Qual é a carga horária do programa de capacitação dos manipuladores em higiene?", MANIPULADORES),
  "manipuladores.capacitacaoConteudo": campo("Qual é o conteúdo programático da capacitação?", MANIPULADORES),
  "manipuladores.capacitacaoFrequencia": campo("Com que frequência a capacitação é realizada?", MANIPULADORES),
};

/** Texto que acompanha o campo: a pergunta, a indicação e a fonte (o "conferir" é desenhado pelo editor). */
export function textoDoCampoGuiado(guia: CampoGuiado): string {
  return `${guia.pergunta} ${INDICACAO_DA_NORMA} (${guia.fonte})`;
}
