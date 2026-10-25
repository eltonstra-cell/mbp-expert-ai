import type { ChecklistCriticidade } from "../types/index.ts";

// Mapa antigo de perguntas por ambiente (nomes exatos). Só vale para ambiente de nome próprio SEM vínculo cujo nome é uma destas chaves;
// as chaves que viram setor oficial pelo apelido (ex.: "Recebimento", "DML / Material de limpeza") usam a lista de manualChecklist.ts.
// Cada pergunta traz `referencia` (derivada, parcial ou "Fonte não registrada"); o bloco antigo "Recebimento" cita a RDC 216/2004 sem conferência.
export const modelosChecklist: Record<
  string,
  {
    categoria: string;
    titulo: string;
    criticidade?: ChecklistCriticidade;
    referencia?: string;
    orientacao?: string;
  }[]
> = {
  Recebimento: [
    {
      categoria: "Área de recepção",
      titulo: "Recebimento realizado em área protegida, limpa e organizada",
      criticidade: "Importante",
      referencia: "RDC 216/2004 — item 4.7.2",
      orientacao: "Verifique proteção contra poeira, chuva, sujidades e risco de contaminação durante a descarga.",
    },
    {
      categoria: "Fornecedor",
      titulo: "Matérias-primas, ingredientes e embalagens são inspecionados e aprovados no recebimento",
      criticidade: "Crítica",
      referencia: "RDC 216/2004 — item 4.7.3",
      orientacao: "A aprovação deve considerar condições do produto, embalagem, conservação e critérios definidos pelo serviço.",
    },
    {
      categoria: "Integridade",
      titulo: "Embalagens primárias estão íntegras, sem violação, vazamento, estufamento ou dano relevante",
      criticidade: "Crítica",
      referencia: "RDC 216/2004 — item 4.7.3",
      orientacao: "Produtos com embalagem comprometida não devem ser aceitos quando houver risco à segurança ou integridade.",
    },
    {
      categoria: "Temperatura",
      titulo: "Temperatura dos produtos que exigem conservação especial é verificada no recebimento",
      criticidade: "Crítica",
      referencia: "RDC 216/2004 — item 4.7.3",
      orientacao: "Compare com a condição de conservação indicada para o produto e com os critérios internos/legislação específica aplicável.",
    },
    {
      categoria: "Validade",
      titulo: "Prazo de validade é conferido antes da aceitação dos produtos",
      criticidade: "Crítica",
      referencia: "RDC 216/2004 — item 4.7.4",
      orientacao: "Produtos vencidos devem ser rejeitados e devolvidos ou segregados até sua destinação adequada.",
    },
    {
      categoria: "Reprovação",
      titulo: "Produtos ou lotes reprovados são devolvidos ou segregados e identificados até destinação final",
      criticidade: "Crítica",
      referencia: "RDC 216/2004 — item 4.7.4",
      orientacao: "Evite que produtos reprovados permaneçam misturados aos produtos liberados para uso.",
    },
    {
      categoria: "Identificação",
      titulo: "Produto recebido possui identificação e informações suficientes para controle e rastreabilidade",
      criticidade: "Importante",
      referencia: "Boas Práticas — controle de recebimento e rastreabilidade",
      orientacao: "Observe identificação do produto, fabricante/fornecedor, lote quando aplicável e demais informações necessárias ao controle interno.",
    },
    {
      categoria: "Condições do transporte",
      titulo: "Veículo e condições de transporte não apresentam riscos evidentes de contaminação ao alimento",
      criticidade: "Crítica",
      referencia: "RDC 216/2004 — princípios de prevenção da contaminação no recebimento",
      orientacao: "Observe limpeza, organização, proteção da carga, odores, pragas, cargas incompatíveis e condição geral.",
    },
    {
      categoria: "Características do produto",
      titulo: "Produtos não apresentam alterações sensoriais ou sinais visíveis incompatíveis com sua condição normal",
      criticidade: "Importante",
      referencia: "Boas Práticas — inspeção e aprovação no recebimento",
      orientacao: "Quando aplicável, observe cor, odor, textura, presença de líquido anormal, descongelamento ou deterioração.",
    },
    {
      categoria: "Registro",
      titulo: "O estabelecimento mantém controle do recebimento compatível com os riscos e procedimentos adotados",
      criticidade: "Importante",
      referencia: "RDC 216/2004 — controle operacional de Boas Práticas",
      orientacao: "O registro pode incluir data, fornecedor, produto, temperatura quando aplicável, condição e decisão de aceitar ou rejeitar.",
    },
    {
      categoria: "Fluxo",
      titulo: "Produtos aprovados são encaminhados ao armazenamento sem permanência desnecessária em temperatura ambiente",
      criticidade: "Crítica",
      referencia: "RDC 216/2004 — itens 4.7.5 e 4.8.5",
      orientacao: "Priorize perecíveis e reduza o tempo fora das condições adequadas de conservação.",
    },
    {
      categoria: "Armazenamento imediato",
      titulo: "Produtos recebidos são armazenados em local limpo, organizado e protegido contra contaminantes",
      criticidade: "Importante",
      referencia: "RDC 216/2004 — item 4.7.5",
      orientacao: "Após a aprovação, o produto deve seguir para armazenamento adequado sem contato com fontes de contaminação.",
    },
  ],
  "Armazenamento seco / Estoque": [
    { categoria: "Organização", titulo: "Produtos organizados por categoria e afastados do piso" },
    { categoria: "Validade", titulo: "Controle PEPS/PVPS aplicado" },
    { categoria: "Identificação", titulo: "Produtos abertos identificados e datados" },
    { categoria: "Integridade", titulo: "Sem presença de embalagens danificadas ou infestação" },
    { categoria: "Higiene", titulo: "Prateleiras e ambiente em boas condições de limpeza" },
  ],
  "Câmara refrigerada": [
    { categoria: "Temperatura", titulo: "Temperatura da câmara dentro do padrão definido", referencia: "Parcial: tema do Manual, cap. 3, item 10.1; o texto da pergunta difere" },
    { categoria: "Organização", titulo: "Alimentos organizados evitando contaminação cruzada", referencia: "Derivada do Manual, cap. 2, item 2.1" },
    { categoria: "Identificação", titulo: "Preparações e produtos identificados e datados", referencia: "Parcial: tema do Manual, cap. 2, item 2.1; o texto da pergunta difere" },
    { categoria: "Integridade", titulo: "Equipamento em bom estado e sem excesso de gelo", referencia: "Fonte não registrada" },
    { categoria: "Higiene", titulo: "Câmara limpa e sem acúmulo de resíduos", referencia: "Parcial: tema do Manual, cap. 3, item 9.1; o texto da pergunta difere" },
  ],
  "Câmara de congelamento": [
    { categoria: "Temperatura", titulo: "Temperatura de congelamento adequada", referencia: "Derivada do Manual, cap. 2, item 2.1; cap. 3, item 10.1" },
    { categoria: "Organização", titulo: "Produtos organizados e separados por categoria", referencia: "Derivada do Manual, cap. 2, item 2" },
    { categoria: "Identificação", titulo: "Produtos identificados e dentro do prazo", referencia: "Parcial: tema do Manual, cap. 2, item 3.4; o texto da pergunta difere" },
    { categoria: "Integridade", titulo: "Ausência de queimadura por frio ou embalagens rompidas", referencia: "Parcial: tema do Manual, cap. 2, item 3.4; o texto da pergunta difere" },
    { categoria: "Higiene", titulo: "Equipamento limpo e em bom estado", referencia: "Parcial: tema do Manual, cap. 3, item 9; o texto da pergunta difere" },
  ],
  "Pré-preparo": [
    { categoria: "Higiene", titulo: "Bancadas e utensílios higienizados adequadamente" },
    { categoria: "Contaminação cruzada", titulo: "Fluxo evita contato entre alimentos crus e prontos" },
    { categoria: "Manipuladores", titulo: "Manipuladores seguem boas práticas de higiene" },
    { categoria: "Tempo/temperatura", titulo: "Exposição dos alimentos fora de refrigeração é controlada" },
    { categoria: "Identificação", titulo: "Alimentos em preparo identificados quando necessário" },
  ],
  "Preparo / Cocção": [
    { categoria: "Temperatura", titulo: "Cocção atinge parâmetros seguros definidos" },
    { categoria: "Higiene", titulo: "Equipamentos e utensílios em boas condições de higiene" },
    { categoria: "Manipuladores", titulo: "Conduta dos manipuladores adequada durante o preparo" },
    { categoria: "Contaminação cruzada", titulo: "Utensílios e superfícies evitam contaminação cruzada" },
    { categoria: "Manutenção", titulo: "Equipamentos estão íntegros e em funcionamento adequado" },
  ],
  "Distribuição / Exposição": [
    { categoria: "Temperatura", titulo: "Temperatura de exposição é monitorada" },
    { categoria: "Proteção", titulo: "Alimentos expostos estão protegidos contra contaminação" },
    { categoria: "Tempo", titulo: "Tempo de exposição é controlado" },
    { categoria: "Utensílios", titulo: "Utensílios de serviço estão limpos e adequados" },
    { categoria: "Higiene", titulo: "Área de distribuição permanece limpa e organizada" },
  ],
  "Higienização de utensílios": [
    { categoria: "Fluxo", titulo: "Fluxo de higienização evita cruzamento entre sujo e limpo" },
    { categoria: "Produto químico", titulo: "Produtos saneantes estão regularizados e identificados" },
    { categoria: "Diluição", titulo: "Diluição e tempo de contato seguem orientação definida" },
    { categoria: "Secagem", titulo: "Utensílios secam de forma higiênica" },
    { categoria: "Armazenamento", titulo: "Utensílios limpos são armazenados protegidos" },
  ],
  "DML / Material de limpeza": [
    { categoria: "Armazenamento", titulo: "Produtos químicos armazenados separados de alimentos" },
    { categoria: "Identificação", titulo: "Frascos e recipientes estão identificados" },
    { categoria: "Segurança", titulo: "Acesso e uso dos produtos são controlados" },
    { categoria: "Organização", titulo: "Materiais de limpeza estão organizados" },
    { categoria: "Higiene", titulo: "DML está limpo e sem acúmulo de resíduos" },
  ],
  "Sanitários / Vestiários": [
    { categoria: "Higiene", titulo: "Instalações estão limpas e conservadas", referencia: "Derivada do Manual, cap. 1, itens 2.8 a 2.13; cap. 3, item 9.3" },
    { categoria: "Lavatório", titulo: "Há sabonete líquido, papel e meio adequado de secagem", referencia: "Derivada do Manual, cap. 1, item 2.9; cap. 3, item 3.4" },
    { categoria: "Acesso", titulo: "Sanitários não se comunicam diretamente com áreas de preparo", referencia: "Fonte não registrada" },
    { categoria: "Organização", titulo: "Pertences pessoais estão armazenados adequadamente", referencia: "Derivada do Manual, cap. 2, item 6" },
    { categoria: "Conservação", titulo: "Portas, ralos e instalações estão em bom estado", referencia: "Derivada do Manual, cap. 1, itens 2.9 e 2.11 a 2.13" },
  ],
  "Área de resíduos": [
    { categoria: "Acondicionamento", titulo: "Resíduos estão acondicionados em recipientes adequados", referencia: "Derivada do Manual, cap. 2, item 5" },
    { categoria: "Tampa", titulo: "Lixeiras possuem tampa e acionamento adequado quando aplicável", referencia: "Derivada do Manual, cap. 3, item 8" },
    { categoria: "Fluxo", titulo: "Retirada de resíduos não contamina áreas de produção", referencia: "Derivada do Manual, cap. 3, item 9.7" },
    { categoria: "Higiene", titulo: "Área de resíduos está limpa e organizada", referencia: "Parcial: tema do Manual, cap. 3, item 9.7; o texto da pergunta difere" },
    { categoria: "Controle de pragas", titulo: "Não há sinais de atração ou abrigo de pragas", referencia: "Derivada do Manual, cap. 3, item 6" },
  ],
  "Área externa": [
    { categoria: "Conservação", titulo: "Área externa está conservada e sem acúmulo de materiais", referencia: "Derivada do Manual, cap. 1, item 2 (introdução); cap. 3, item 6" },
    { categoria: "Pragas", titulo: "Não há condições favoráveis à proliferação de pragas", referencia: "Derivada do Manual, cap. 3, item 6" },
    { categoria: "Drenagem", titulo: "Não há água parada ou problemas de drenagem", referencia: "Fonte não registrada" },
    { categoria: "Acesso", titulo: "Acessos estão protegidos e organizados", referencia: "Parcial: tema do Manual, cap. 1, item 2 (introdução); o texto da pergunta difere" },
    { categoria: "Higiene", titulo: "Entorno do estabelecimento está limpo", referencia: "Derivada do Manual, cap. 1, item 2 (introdução)" },
  ],
};
