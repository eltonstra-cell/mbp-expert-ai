import type { ChecklistCriticidade } from "@/types";
import {
  normalizarSetorManual,
  SETORES_OFICIAIS_MANUAL,
} from "@/lib/manualBase";

export type ModeloChecklistManual = {
  categoria: string;
  titulo: string;
  criticidade?: ChecklistCriticidade;
  referencia?: string;
  orientacao?: string;
};

const referenciaEstrutura = "Manual de Boas Práticas — Capítulo 1";

function item(
  categoria: string,
  titulo: string,
  orientacao = "",
  criticidade: ChecklistCriticidade = "Importante"
): ModeloChecklistManual {
  return { categoria, titulo, orientacao, criticidade, referencia: referenciaEstrutura };
}

const estruturaComum = [
  item("Finalidade", "O setor é utilizado somente para as atividades previstas e está organizado para essa finalidade"),
  item("Piso e ralos", "Piso liso, lavável, impermeável, conservado e com escoamento adequado", "Verifique rachaduras, peças soltas, água acumulada e condições dos ralos."),
  item("Paredes", "Paredes lisas, laváveis, impermeáveis e sem rachaduras, descascamentos ou infiltrações"),
  item("Janelas e telas", "Janelas e telas, quando existentes, estão íntegras, ajustadas e permitem higienização", "Marque Não se aplica quando o setor não possuir janelas."),
  item("Portas", "Portas estão ajustadas, conservadas e permitem limpeza adequada"),
  item("Teto", "Teto está íntegro, lavável e sem goteiras, mofo, descascamentos ou infiltrações"),
  item("Instalações elétricas", "Instalações elétricas estão protegidas, conservadas e não dificultam a higienização"),
  item("Iluminação", "Iluminação é suficiente e luminárias apresentam proteção quando houver risco de queda ou explosão"),
  item("Ventilação", "Ventilação e renovação do ar são adequadas à atividade e não representam fonte de contaminação"),
];

const lavatorioMaos = item(
  "Higienização das mãos",
  "Há lavatório adequado, abastecido com sabonete antisséptico e papel-toalha não reciclado",
  "Verifique conservação, funcionamento, abastecimento e uso exclusivo quando aplicável.",
  "Crítica"
);

const modelos: Record<string, ModeloChecklistManual[]> = {
  [SETORES_OFICIAIS_MANUAL[0]]: [
    ...estruturaComum,
    item("Proteção do recebimento", "Área de recebimento é coberta e protege os produtos durante descarga e conferência", "Observe exposição à chuva, poeira, resíduos, pragas e cruzamento com lixo.", "Crítica"),
    lavatorioMaos,
    item("Equipamentos e móveis", "Equipamentos e móveis do setor estão cadastrados, íntegros, limpos e em funcionamento"),
  ],
  [SETORES_OFICIAIS_MANUAL[1]]: [
    ...estruturaComum,
    item("Armazenamento", "Prateleiras, estrados e demais móveis permitem organização, limpeza e afastamento adequado do piso e paredes", "Registre separadamente desvios de armazenamento e de estrutura.", "Crítica"),
    lavatorioMaos,
    item("Equipamentos e móveis", "Equipamentos e móveis do setor estão cadastrados, íntegros, limpos e em funcionamento"),
  ],
  [SETORES_OFICIAIS_MANUAL[2]]: [
    ...estruturaComum,
    item("Uso exclusivo", "O DML é separado dos alimentos e destinado aos produtos e utensílios de limpeza", "Observe risco de contaminação química.", "Crítica"),
    item("Tanque", "Tanque destinado à higienização está íntegro, lavável, abastecido e em funcionamento"),
    item("Armazenamento químico", "Produtos químicos estão identificados, fechados e armazenados com segurança", "Não aceite produtos em embalagens de alimentos ou sem rótulo.", "Crítica"),
    item("Equipamentos e móveis", "Prateleiras, suportes e utensílios do DML estão cadastrados, conservados e organizados"),
  ],
  [SETORES_OFICIAIS_MANUAL[3]]: [
    item("Finalidade", "A central é exclusiva para armazenamento dos cilindros de gás"),
    item("Piso", "Piso está firme, nivelado, conservado e sem materiais que dificultem o acesso"),
    item("Paredes e sinalização", "Paredes estão conservadas e a sinalização de segurança está visível"),
    item("Porta", "Porta ou grade está íntegra, ajustada e mantém o acesso controlado"),
    item("Cobertura", "Teto ou cobertura está íntegro e protege os cilindros"),
    item("Ventilação", "Ventilação permanente é adequada e não está obstruída", "A central não deve acumular gás em caso de vazamento.", "Crítica"),
    item("Instalações elétricas", "Não há instalação elétrica inadequada nem fonte de ignição no setor", "Marque Não se aplica quando o setor não possuir sistema elétrico.", "Crítica"),
    item("Cilindros e acessórios", "Cilindros, válvulas, mangueiras e conexões estão estáveis, protegidos e sem dano ou vazamento aparente", "Não tente confirmar vazamento apenas pela fotografia.", "Crítica"),
    item("Equipamentos e móveis", "Cilindros e acessórios estão cadastrados no quadro do setor"),
  ],
  [SETORES_OFICIAIS_MANUAL[4]]: [
    ...estruturaComum,
    item("Organização dos subsetores", "Áreas de produção estão organizadas conforme as atividades e reduzem cruzamentos entre alimentos crus e prontos", "Cadastre separadamente os subsetores existentes.", "Crítica"),
    lavatorioMaos,
    item("Pia de utensílios", "Pia destinada à higienização de equipamentos e utensílios está íntegra e em funcionamento"),
    item("Portas internas", "Portas ou barreiras entre subsetores estão conservadas e adequadas ao fluxo"),
    item("Equipamentos e móveis", "Equipamentos, bancadas e móveis estão cadastrados, íntegros, laváveis e em funcionamento"),
  ],
  [SETORES_OFICIAIS_MANUAL[5]]: [
    ...estruturaComum,
    item("Fluxo sujo e limpo", "O fluxo de higienização evita o cruzamento entre utensílios sujos e higienizados", "Observe entrada, lavagem, enxágue, secagem e guarda.", "Crítica"),
    lavatorioMaos,
    item("Pia de utensílios", "Pia, torneiras, ralos e triturador, quando existente, estão íntegros e em funcionamento"),
    item("Equipamentos e móveis", "Equipamentos, escorredores e móveis estão cadastrados, limpos e conservados"),
  ],
  [SETORES_OFICIAIS_MANUAL[6]]: [
    ...estruturaComum,
    item("Distribuição", "Estrutura de distribuição protege as refeições contra contato, sujidades e outras fontes de contaminação", "Considere buffet, balcões e serviço em pratos.", "Crítica"),
    lavatorioMaos,
    item("Equipamentos e móveis", "Mesas, cadeiras, balcões e equipamentos de distribuição estão cadastrados e conservados"),
  ],
  [SETORES_OFICIAIS_MANUAL[7]]: [
    ...estruturaComum,
    item("Portas dos boxes", "Portas dos boxes, quando existentes, estão íntegras, ajustadas e laváveis"),
    lavatorioMaos,
    item("Armários", "Há armários em quantidade suficiente, íntegros e organizados para os pertences pessoais", "Verifique se uniformes e roupas pessoais permanecem separados."),
    item("Equipamentos e móveis", "Armários, bancos e demais móveis estão cadastrados e conservados"),
  ],
  [SETORES_OFICIAIS_MANUAL[8]]: [
    ...estruturaComum,
    item("Portas dos boxes", "Portas dos boxes estão íntegras, ajustadas e laváveis"),
    lavatorioMaos,
    item("Vasos sanitários", "Vasos sanitários estão íntegros, limpos, funcionando e possuem assentos com tampas", "Verifique descarga, vazamentos e conservação.", "Crítica"),
    item("Comunicação com produção", "O banheiro não se comunica diretamente com áreas de preparo ou armazenamento", "Avalie acesso, antecâmara e barreiras existentes.", "Crítica"),
    item("Equipamentos e móveis", "Equipamentos e acessórios sanitários estão cadastrados e conservados"),
  ],
  [SETORES_OFICIAIS_MANUAL[9]]: [
    ...estruturaComum,
    item("Portas dos boxes", "Portas dos boxes, quando existentes, estão íntegras, ajustadas e laváveis"),
    lavatorioMaos,
    item("Armários", "Há armários em quantidade suficiente, íntegros e organizados para os pertences pessoais", "Verifique se uniformes e roupas pessoais permanecem separados."),
    item("Equipamentos e móveis", "Armários, bancos e demais móveis estão cadastrados e conservados"),
  ],
  [SETORES_OFICIAIS_MANUAL[10]]: [
    ...estruturaComum,
    item("Portas dos boxes", "Portas dos boxes estão íntegras, ajustadas e laváveis"),
    lavatorioMaos,
    item("Vasos sanitários", "Vasos sanitários estão íntegros, limpos, funcionando e possuem assentos com tampas", "Verifique descarga, vazamentos e conservação.", "Crítica"),
    item("Comunicação com produção", "O banheiro não se comunica diretamente com áreas de preparo ou armazenamento", "Avalie acesso, antecâmara e barreiras existentes.", "Crítica"),
    item("Equipamentos e móveis", "Equipamentos e acessórios sanitários estão cadastrados e conservados"),
  ],
  [SETORES_OFICIAIS_MANUAL[11]]: [
    ...estruturaComum,
    item("Portas dos boxes", "Portas dos boxes estão íntegras, ajustadas e laváveis"),
    lavatorioMaos,
    item("Vasos sanitários", "Vasos sanitários estão íntegros, limpos, funcionando e possuem assentos com tampas", "Verifique descarga, vazamentos e conservação.", "Crítica"),
    item("Comunicação com produção", "O banheiro não se comunica diretamente com áreas de preparo ou armazenamento", "Avalie acesso e barreiras existentes.", "Crítica"),
    item("Equipamentos e móveis", "Equipamentos e acessórios sanitários estão cadastrados e conservados"),
  ],
  [SETORES_OFICIAIS_MANUAL[12]]: [
    ...estruturaComum,
    item("Portas dos boxes", "Portas dos boxes estão íntegras, ajustadas e laváveis"),
    lavatorioMaos,
    item("Vasos sanitários", "Vasos sanitários estão íntegros, limpos, funcionando e possuem assentos com tampas", "Verifique descarga, vazamentos e conservação.", "Crítica"),
    item("Comunicação com produção", "O banheiro não se comunica diretamente com áreas de preparo ou armazenamento", "Avalie acesso e barreiras existentes.", "Crítica"),
    item("Equipamentos e móveis", "Equipamentos e acessórios sanitários estão cadastrados e conservados"),
  ],
};

const modeloPersonalizado = [
  item("Finalidade", "Finalidade e atividades realizadas no setor foram descritas"),
  item("Estrutura", "Estrutura física foi avaliada conforme os riscos e atividades do setor"),
  item("Higiene", "Condições de higiene e conservação foram avaliadas"),
  item("Equipamentos e móveis", "Equipamentos e móveis foram cadastrados e avaliados"),
];

const modelosComplementares: Record<string, ModeloChecklistManual[]> = {
  "Estrutura geral/personalizada": modeloPersonalizado,
  "Sanitários/Vestiários de Funcionários": [
    ...estruturaComum,
    item("Portas dos boxes", "Portas dos boxes estão íntegras, ajustadas e laváveis"),
    lavatorioMaos,
    item("Vasos sanitários", "Vasos sanitários estão íntegros, limpos, funcionando e possuem assentos com tampas", "Verifique descarga, vazamentos e conservação.", "Crítica"),
    item("Armários", "Há armários íntegros e organizados para separar uniformes e pertences pessoais"),
    item("Comunicação com produção", "Sanitários e vestiários não se comunicam diretamente com áreas de preparo ou armazenamento", "Avalie acessos, antecâmaras e barreiras.", "Crítica"),
    item("Equipamentos e móveis", "Armários, bancos e acessórios sanitários estão cadastrados e conservados"),
  ],
  "Sanitários de Clientes": [
    ...estruturaComum,
    item("Portas dos boxes", "Portas dos boxes estão íntegras, ajustadas e laváveis"),
    lavatorioMaos,
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
    ...estruturaComum,
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
