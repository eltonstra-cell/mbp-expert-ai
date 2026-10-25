import type { ChecklistCriticidade } from "../types/index.ts";
import {
  normalizarSetorManual,
  SETORES_OFICIAIS_MANUAL,
} from "./manualBase.ts";

export type ModeloChecklistManual = {
  categoria: string;
  titulo: string;
  criticidade?: ChecklistCriticidade;
  referencia?: string;
  orientacao?: string;
};

// Rastreabilidade das perguntas (conferida contra o Manual de Boas Práticas em 24/10/2026; proposta em conteudo-privado/rastreabilidade-proposta.md).
// Nenhuma pergunta existe literalmente no Manual (ele descreve a estrutura; não pergunta). Por isso a referência diz o grau:
//  - derivada: o Manual descreve o mesmo requisito;  - parcial: o tema está no Manual, mas o texto da pergunta difere;
//  - sem fonte: não há trecho no Manual, e a tela mostra "Fonte não registrada" (nada é inventado).
export const FONTE_NAO_REGISTRADA = "Fonte não registrada";
const derivada = (capitulo: number, item: string) => `Derivada do Manual, cap. ${capitulo}, item ${item}`;
const parcial = (capitulo: number, item: string) => `Parcial: tema do Manual, cap. ${capitulo}, item ${item}; o texto da pergunta difere`;

function item(
  categoria: string,
  titulo: string,
  orientacao = "",
  criticidade: ChecklistCriticidade = "Importante",
  referencia: string = FONTE_NAO_REGISTRADA
): ModeloChecklistManual {
  return { categoria, titulo, orientacao, criticidade, referencia };
}

/** Item do Manual (cap. 1, item 2.N) de cada setor oficial, na ordem de SETORES_OFICIAIS_MANUAL. */
const ITEM_DO_SETOR = ["2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "2.9", "2.10", "2.11", "2.12", "2.13"];
const itemDe = (indice: number) => ITEM_DO_SETOR[indice] ?? "2";

/** Descrição de estrutura física que o Manual repete em cada setor (piso, paredes, janelas, porta, teto, elétrica, iluminação, ventilação). */
function estruturaComum(n: string) {
  const d = derivada(1, n);
  return [
    item("Finalidade", "O setor é utilizado somente para as atividades previstas e está organizado para essa finalidade", "", "Importante", parcial(1, n)),
    item("Piso e ralos", "Piso liso, lavável, impermeável, conservado e com escoamento adequado", "Verifique rachaduras, peças soltas, água acumulada e condições dos ralos.", "Importante", d),
    item("Paredes", "Paredes lisas, laváveis, impermeáveis e sem rachaduras, descascamentos ou infiltrações", "", "Importante", d),
    item("Janelas e telas", "Janelas e telas, quando existentes, estão íntegras, ajustadas e permitem higienização", "Marque Não se aplica quando o setor não possuir janelas.", "Importante", d),
    item("Portas", "Portas estão ajustadas, conservadas e permitem limpeza adequada", "", "Importante", d),
    item("Teto", "Teto está íntegro, lavável e sem goteiras, mofo, descascamentos ou infiltrações", "", "Importante", d),
    item("Instalações elétricas", "Instalações elétricas estão protegidas, conservadas e não dificultam a higienização", "", "Importante", d),
    item("Iluminação", "Iluminação é suficiente e luminárias apresentam proteção quando houver risco de queda ou explosão", "", "Importante", d),
    item("Ventilação", "Ventilação e renovação do ar são adequadas à atividade e não representam fonte de contaminação", "", "Importante", d),
  ];
}

const lavatorioMaos = (n: string) =>
  item(
    "Higienização das mãos",
    "Há lavatório adequado, abastecido com sabonete antisséptico e papel-toalha não reciclado",
    "Verifique conservação, funcionamento, abastecimento e uso exclusivo quando aplicável.",
    "Crítica",
    `${derivada(1, n)}; cap. 3, item 3.4`
  );

const equipamentosEMoveis = (n: string, titulo: string) => item("Equipamentos e móveis", titulo, "", "Importante", derivada(1, n));

const S = SETORES_OFICIAIS_MANUAL;
const aoSetor = (indice: number) => itemDe(indice);

const modelos: Record<string, ModeloChecklistManual[]> = {
  [S[0]]: [
    ...estruturaComum(aoSetor(0)),
    item("Proteção do recebimento", "Área de recebimento é coberta e protege os produtos durante descarga e conferência", "Observe exposição à chuva, poeira, resíduos, pragas e cruzamento com lixo.", "Crítica", derivada(2, "1")),
    lavatorioMaos(aoSetor(0)),
    equipamentosEMoveis(aoSetor(0), "Equipamentos e móveis do setor estão cadastrados, íntegros, limpos e em funcionamento"),
  ],
  [S[1]]: [
    ...estruturaComum(aoSetor(1)),
    item("Armazenamento", "Prateleiras, estrados e demais móveis permitem organização, limpeza e afastamento adequado do piso e paredes", "Registre separadamente desvios de armazenamento e de estrutura.", "Crítica", derivada(2, "2")),
    lavatorioMaos(aoSetor(1)),
    equipamentosEMoveis(aoSetor(1), "Equipamentos e móveis do setor estão cadastrados, íntegros, limpos e em funcionamento"),
  ],
  [S[2]]: [
    ...estruturaComum(aoSetor(2)),
    item("Uso exclusivo", "O DML é separado dos alimentos e destinado aos produtos e utensílios de limpeza", "Observe risco de contaminação química.", "Crítica", `${derivada(1, aoSetor(2))}; cap. 2, item 2.4`),
    item("Tanque", "Tanque destinado à higienização está íntegro, lavável, abastecido e em funcionamento", "", "Importante", parcial(1, aoSetor(2))),
    item("Armazenamento químico", "Produtos químicos estão identificados, fechados e armazenados com segurança", "Não aceite produtos em embalagens de alimentos ou sem rótulo.", "Crítica", derivada(2, "2.4")),
    equipamentosEMoveis(aoSetor(2), "Prateleiras, suportes e utensílios do DML estão cadastrados, conservados e organizados"),
  ],
  [S[3]]: [
    item("Finalidade", "A central é exclusiva para armazenamento dos cilindros de gás", "", "Importante", derivada(1, aoSetor(3))),
    item("Piso", "Piso está firme, nivelado, conservado e sem materiais que dificultem o acesso", "", "Importante", parcial(1, aoSetor(3))),
    item("Paredes e sinalização", "Paredes estão conservadas e a sinalização de segurança está visível", "", "Importante", derivada(1, aoSetor(3))),
    item("Porta", "Porta ou grade está íntegra, ajustada e mantém o acesso controlado", "", "Importante", parcial(1, aoSetor(3))),
    item("Cobertura", "Teto ou cobertura está íntegro e protege os cilindros", "", "Importante", parcial(1, aoSetor(3))),
    item("Ventilação", "Ventilação permanente é adequada e não está obstruída", "A central não deve acumular gás em caso de vazamento.", "Crítica", parcial(1, aoSetor(3))),
    item("Instalações elétricas", "Não há instalação elétrica inadequada nem fonte de ignição no setor", "Marque Não se aplica quando o setor não possuir sistema elétrico.", "Crítica", parcial(1, aoSetor(3))),
    item("Cilindros e acessórios", "Cilindros, válvulas, mangueiras e conexões estão estáveis, protegidos e sem dano ou vazamento aparente", "Não tente confirmar vazamento apenas pela fotografia.", "Crítica"),
    equipamentosEMoveis(aoSetor(3), "Cilindros e acessórios estão cadastrados no quadro do setor"),
  ],
  [S[4]]: [
    ...estruturaComum(aoSetor(4)),
    item("Organização dos subsetores", "Áreas de produção estão organizadas conforme as atividades e reduzem cruzamentos entre alimentos crus e prontos", "Cadastre separadamente os subsetores existentes.", "Crítica", derivada(2, "3")),
    lavatorioMaos(aoSetor(4)),
    item("Pia de utensílios", "Pia destinada à higienização de equipamentos e utensílios está íntegra e em funcionamento", "", "Importante", derivada(1, aoSetor(4))),
    item("Portas internas", "Portas ou barreiras entre subsetores estão conservadas e adequadas ao fluxo", "", "Importante", parcial(1, aoSetor(4))),
    equipamentosEMoveis(aoSetor(4), "Equipamentos, bancadas e móveis estão cadastrados, íntegros, laváveis e em funcionamento"),
  ],
  [S[5]]: [
    ...estruturaComum(aoSetor(5)),
    item("Fluxo sujo e limpo", "O fluxo de higienização evita o cruzamento entre utensílios sujos e higienizados", "Observe entrada, lavagem, enxágue, secagem e guarda.", "Crítica"),
    lavatorioMaos(aoSetor(5)),
    item("Pia de utensílios", "Pia, torneiras, ralos e triturador, quando existente, estão íntegros e em funcionamento", "", "Importante", derivada(1, aoSetor(5))),
    equipamentosEMoveis(aoSetor(5), "Equipamentos, escorredores e móveis estão cadastrados, limpos e conservados"),
  ],
  [S[6]]: [
    ...estruturaComum(aoSetor(6)),
    item("Distribuição", "Estrutura de distribuição protege as refeições contra contato, sujidades e outras fontes de contaminação", "Considere buffet, balcões e serviço em pratos.", "Crítica", parcial(2, "4")),
    lavatorioMaos(aoSetor(6)),
    equipamentosEMoveis(aoSetor(6), "Mesas, cadeiras, balcões e equipamentos de distribuição estão cadastrados e conservados"),
  ],
  [S[7]]: [
    ...estruturaComum(aoSetor(7)),
    item("Portas dos boxes", "Portas dos boxes, quando existentes, estão íntegras, ajustadas e laváveis", "", "Importante", derivada(1, aoSetor(7))),
    lavatorioMaos(aoSetor(7)),
    item("Armários", "Há armários em quantidade suficiente, íntegros e organizados para os pertences pessoais", "Verifique se uniformes e roupas pessoais permanecem separados.", "Importante", parcial(2, "6")),
    equipamentosEMoveis(aoSetor(7), "Armários, bancos e demais móveis estão cadastrados e conservados"),
  ],
  [S[8]]: [
    ...estruturaComum(aoSetor(8)),
    item("Portas dos boxes", "Portas dos boxes estão íntegras, ajustadas e laváveis", "", "Importante", derivada(1, aoSetor(8))),
    lavatorioMaos(aoSetor(8)),
    item("Vasos sanitários", "Vasos sanitários estão íntegros, limpos, funcionando e possuem assentos com tampas", "Verifique descarga, vazamentos e conservação.", "Crítica", derivada(1, aoSetor(8))),
    item("Comunicação com produção", "O banheiro não se comunica diretamente com áreas de preparo ou armazenamento", "Avalie acesso, antecâmara e barreiras existentes.", "Crítica"),
    equipamentosEMoveis(aoSetor(8), "Equipamentos e acessórios sanitários estão cadastrados e conservados"),
  ],
  [S[9]]: [
    ...estruturaComum(aoSetor(9)),
    item("Portas dos boxes", "Portas dos boxes, quando existentes, estão íntegras, ajustadas e laváveis", "", "Importante", derivada(1, aoSetor(9))),
    lavatorioMaos(aoSetor(9)),
    item("Armários", "Há armários em quantidade suficiente, íntegros e organizados para os pertences pessoais", "Verifique se uniformes e roupas pessoais permanecem separados.", "Importante", parcial(2, "6")),
    equipamentosEMoveis(aoSetor(9), "Armários, bancos e demais móveis estão cadastrados e conservados"),
  ],
  [S[10]]: [
    ...estruturaComum(aoSetor(10)),
    item("Portas dos boxes", "Portas dos boxes estão íntegras, ajustadas e laváveis", "", "Importante", derivada(1, aoSetor(10))),
    lavatorioMaos(aoSetor(10)),
    item("Vasos sanitários", "Vasos sanitários estão íntegros, limpos, funcionando e possuem assentos com tampas", "Verifique descarga, vazamentos e conservação.", "Crítica", derivada(1, aoSetor(10))),
    item("Comunicação com produção", "O banheiro não se comunica diretamente com áreas de preparo ou armazenamento", "Avalie acesso, antecâmara e barreiras existentes.", "Crítica"),
    equipamentosEMoveis(aoSetor(10), "Equipamentos e acessórios sanitários estão cadastrados e conservados"),
  ],
  [S[11]]: [
    ...estruturaComum(aoSetor(11)),
    item("Portas dos boxes", "Portas dos boxes estão íntegras, ajustadas e laváveis", "", "Importante", derivada(1, aoSetor(11))),
    lavatorioMaos(aoSetor(11)),
    item("Vasos sanitários", "Vasos sanitários estão íntegros, limpos, funcionando e possuem assentos com tampas", "Verifique descarga, vazamentos e conservação.", "Crítica", derivada(1, aoSetor(11))),
    item("Comunicação com produção", "O banheiro não se comunica diretamente com áreas de preparo ou armazenamento", "Avalie acesso e barreiras existentes.", "Crítica"),
    equipamentosEMoveis(aoSetor(11), "Equipamentos e acessórios sanitários estão cadastrados e conservados"),
  ],
  [S[12]]: [
    ...estruturaComum(aoSetor(12)),
    item("Portas dos boxes", "Portas dos boxes estão íntegras, ajustadas e laváveis", "", "Importante", derivada(1, aoSetor(12))),
    lavatorioMaos(aoSetor(12)),
    item("Vasos sanitários", "Vasos sanitários estão íntegros, limpos, funcionando e possuem assentos com tampas", "Verifique descarga, vazamentos e conservação.", "Crítica", derivada(1, aoSetor(12))),
    item("Comunicação com produção", "O banheiro não se comunica diretamente com áreas de preparo ou armazenamento", "Avalie acesso e barreiras existentes.", "Crítica"),
    equipamentosEMoveis(aoSetor(12), "Equipamentos e acessórios sanitários estão cadastrados e conservados"),
  ],
};

// Modelo básico de ambiente de nome próprio sem vínculo: 3 perguntas (a quarta, "Equipamentos e móveis", sai da visita). Sem trecho do Manual.
export const PERGUNTAS_DO_QUESTIONARIO_BASICO = 3;
const modeloPersonalizado = [
  item("Finalidade", "Finalidade e atividades realizadas no setor foram descritas"),
  item("Estrutura", "Estrutura física foi avaliada conforme os riscos e atividades do setor"),
  item("Higiene", "Condições de higiene e conservação foram avaliadas"),
  item("Equipamentos e móveis", "Equipamentos e móveis foram cadastrados e avaliados"),
];

// Modelos complementares: o que vem da descrição geral de setor (cap. 1, item 2) é derivado; o restante não foi conferido com o Manual.
const MODELO_COMUM_GERAL = "2";
const modelosComplementares: Record<string, ModeloChecklistManual[]> = {
  "Estrutura geral/personalizada": modeloPersonalizado,
  "Sanitários/Vestiários de Funcionários": [
    ...estruturaComum(MODELO_COMUM_GERAL),
    item("Portas dos boxes", "Portas dos boxes estão íntegras, ajustadas e laváveis"),
    lavatorioMaos(MODELO_COMUM_GERAL),
    item("Vasos sanitários", "Vasos sanitários estão íntegros, limpos, funcionando e possuem assentos com tampas", "Verifique descarga, vazamentos e conservação.", "Crítica"),
    item("Armários", "Há armários íntegros e organizados para separar uniformes e pertences pessoais"),
    item("Comunicação com produção", "Sanitários e vestiários não se comunicam diretamente com áreas de preparo ou armazenamento", "Avalie acessos, antecâmaras e barreiras.", "Crítica"),
    item("Equipamentos e móveis", "Armários, bancos e acessórios sanitários estão cadastrados e conservados"),
  ],
  "Sanitários de Clientes": [
    ...estruturaComum(MODELO_COMUM_GERAL),
    item("Portas dos boxes", "Portas dos boxes estão íntegras, ajustadas e laváveis"),
    lavatorioMaos(MODELO_COMUM_GERAL),
    item("Vasos sanitários", "Vasos sanitários estão íntegros, limpos, funcionando e possuem assentos com tampas", "Verifique descarga, vazamentos e conservação.", "Crítica"),
    item("Comunicação com produção", "Sanitários não se comunicam diretamente com áreas de preparo ou armazenamento", "Avalie acessos e barreiras.", "Crítica"),
    item("Equipamentos e móveis", "Equipamentos e acessórios sanitários estão cadastrados e conservados"),
  ],
  "Armazenamento Temporário de Resíduos": [
    item("Finalidade", "A área é destinada ao armazenamento temporário de resíduos e está organizada para essa finalidade"),
    item("Piso e ralos", "Piso e ralos estão íntegros, laváveis e sem acúmulo de líquidos"),
    item("Paredes e teto", "Paredes e teto estão conservados, laváveis e sem infiltrações"),
    item("Proteção", "A área impede o acesso de pragas e evita contaminação de alimentos e áreas limpas", "Observe portas, telas, recipientes e distância das áreas de produção.", "Crítica"),
    item("Recipientes", "Resíduos estão em recipientes íntegros, identificados, laváveis e com fechamento adequado", "Verifique vazamentos, excesso de resíduos e frequência de retirada.", "Crítica"),
    item("Higiene", "O local está limpo, sem odores excessivos e sem resíduos espalhados"),
  ],
  "Área Administrativa": [
    ...estruturaComum(MODELO_COMUM_GERAL),
    item("Separação", "A área administrativa está separada das atividades de manipulação e não oferece risco de contaminação"),
    item("Equipamentos e móveis", "Móveis e equipamentos estão cadastrados, organizados e conservados"),
  ],
};

export function obterModeloChecklistManual(ambiente: string, modeloReferencia?: string) {
  const referencia = modeloReferencia || ambiente;
  return modelosComplementares[referencia] ||
    modelos[normalizarSetorManual(referencia)] ||
    modeloPersonalizado;
}
