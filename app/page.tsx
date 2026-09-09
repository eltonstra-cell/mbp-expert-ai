"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MetricCard from "@/components/MetricCard";
import AccessPreparationPanel from "@/components/AccessPreparationPanel";
import ManualBaseFields from "@/components/ManualBaseFields";
import OperationalFlowsFields from "@/components/OperationalFlowsFields";
import QualityProgramsFields from "@/components/QualityProgramsFields";
import PopsFields from "@/components/PopsFields";
import type {
  AppDB,
  AcaoPermissao,
  AnaliseFotoIA,
  ChecklistCriticidade,
  ChecklistItem,
  ChecklistStatus,
  Empresa,
  EquipamentoSetor,
  EstadoEquipamento,
  Evidencia,
  FluxoOperacional,
  ProgramaControleQualidade,
  ProcedimentoOperacionalPadronizado,
  ResponsabilidadeManual,
  StatusUsuario,
  Visita,
} from "@/types";
import {
  criarResponsabilidadesPadrao,
  AMBIENTES_DETALHADOS_RESTAURANTE,
  criarModelosQuestionarioAmbientes,
  normalizarEquipamentos,
  normalizarHorarios,
  normalizarListaAmbientesReais,
  normalizarResponsabilidades,
  normalizarSetorManual,
  checklistPossuiRespostas,
  migrarSetoresLegados,
  migrarVisitaParaChecklistManual,
  obterModeloQuestionarioParaAmbiente,
  OPCOES_MODELO_QUESTIONARIO,
  resumirHorarioFuncionamento,
  SETORES_OFICIAIS_MANUAL,
} from "@/lib/manualBase";
import { obterModeloChecklistManual } from "@/lib/manualChecklist";
import {
  adequarFluxosAosSetores,
  criarFluxosOperacionaisPadrao,
  obterCriteriosOperacionaisParaSetor,
} from "@/lib/operationalFlows";
import {
  AMBIENTE_PROGRAMAS_CONTROLE,
  criarProgramasControlePadrao,
  normalizarProgramasControle,
  obterCriteriosProgramasControle,
} from "@/lib/qualityPrograms";
import { normalizarPops, situacaoRevisaoPOP } from "@/lib/pops";
import {
  clearOfflineSession,
  emptyDB,
  loadDB,
  loadOfflineSession,
  saveDB,
  saveOfflineSession,
  scopedStorageKey,
} from "@/lib/storage";
import { authClient } from "@/lib/auth/client";
import { registrarMudancaStatus } from "@/lib/visitAudit";
import {
  confirmarSugestaoFotoIA,
  descartarSugestaoFotoIA,
  registrarSugestaoFotoIA,
  ultimaAnaliseConfirmada,
  type ResultadoFotoIA,
} from "@/lib/photoAnalysis";
import {
  shouldSyncOnActivation,
  SYNC_ACTIVATION_DEDUP_MS,
} from "@/lib/syncPolicy";
import {
  hasLocalOnlyRecords,
  localOnlyCounts,
  mergeForRecovery,
  type RecoveryCounts,
} from "@/lib/recovery";
import {
  createLocalBackup,
  localBackupFilename,
} from "@/lib/localBackup";
import {
  criarRegistroAuditoria,
  podeAcessarEmpresa,
  podeExecutar,
  possuiPermissao,
} from "@/lib/permissions";
import {
  alterarStatusUsuario,
  atualizarUsuarioPreparacao,
  criarUsuarioPreparacao,
  vincularSessaoUsuario,
  type DadosUsuarioPreparacao,
} from "@/lib/userManagement";
import { resumoConfiguracaoEmpresa } from "@/lib/companyReadiness";

type View = "inicio" | "empresas" | "visitas" | "visita" | "ambientes" | "checklist" | "ncs" | "plano" | "acompanhamento" | "historico" | "evidencias" | "relatorio" | "acessos";
type EmpresaSecao = "dados" | "manual" | "ambientes" | "fluxos" | "programas" | "pops";
type FiltroChecklistRapido = "Todos" | "Pendentes" | "Não conformes";

const NAV_STORAGE_KEY = "mbp-expert-ai:navegacao:v1";
const CHECKLIST_VERSAO_ATUAL = 10;
const VISIT_VIEWS: View[] = ["visita", "ambientes", "checklist", "ncs", "plano", "acompanhamento", "historico", "evidencias", "relatorio"];

const labels: Record<string, string> = {
  nomeFantasia: "Nome fantasia",
  razaoSocial: "Razão social",
  situacao: "Situação cadastral",
  cnae: "CNAE",
  cnaeDescricao: "Descrição do CNAE",
  tipo: "Tipo de estabelecimento",
  logradouro: "Logradouro",
  numero: "Número",
  complemento: "Complemento",
  bairro: "Bairro",
  cep: "CEP",
  municipio: "Município",
  uf: "UF",
  telefone: "Telefone",
  email: "E-mail",
  responsavel: "Responsável pelo estabelecimento",
  horarioFuncionamento: "Horário de funcionamento",
  atividadeDescricao: "Atividades, produção e serviços realizados",
  cargoResponsavel: "Cargo do responsável pelo estabelecimento",
  consultorNome: "Nome do Consultor/RT",
  consultorCpfCnpj: "CPF ou CNPJ do Consultor/RT",
  consultorEndereco: "Endereço do Consultor/RT",
  consultorTelefone: "Telefone do Consultor/RT",
  consultorRegistro: "Profissão e registro no conselho",
  dataElaboracaoManual: "Data de elaboração do Manual",
  elaboradoPor: "Manual elaborado por",
  revisadoPor: "Manual revisado por",
  aprovadoPor: "Manual aprovado por",
};

const ambientesPadrao = [...SETORES_OFICIAIS_MANUAL];

const formEmpresaVazio = {
  cnpj: "",
  nomeFantasia: "",
  razaoSocial: "",
  situacao: "",
  cnae: "",
  cnaeDescricao: "",
  tipo: "Outro",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cep: "",
  municipio: "",
  uf: "",
  telefone: "",
  email: "",
  responsavel: "",
  horarioFuncionamento: "",
  atividadeDescricao: "",
  cargoResponsavel: "",
  consultorNome: "",
  consultorCpfCnpj: "",
  consultorEndereco: "",
  consultorTelefone: "",
  consultorRegistro: "",
  dataElaboracaoManual: "",
  elaboradoPor: "",
  revisadoPor: "",
  aprovadoPor: "",
};

const camposEmpresaPrincipais = [
  "nomeFantasia", "razaoSocial", "situacao", "cnae", "cnaeDescricao", "tipo",
  "logradouro", "numero", "complemento", "bairro", "cep", "municipio", "uf",
  "telefone", "email", "responsavel", "cargoResponsavel", "horarioFuncionamento",
] as const;

const camposIdentificacaoManual = [
  "atividadeDescricao", "consultorNome", "consultorCpfCnpj", "consultorEndereco",
  "consultorTelefone", "consultorRegistro", "dataElaboracaoManual", "elaboradoPor",
  "revisadoPor", "aprovadoPor",
] as const;

const gruposAmbientesCentral = [
  {
    titulo: "Recebimento, produção e atendimento",
    setores: [
      SETORES_OFICIAIS_MANUAL[0],
      SETORES_OFICIAIS_MANUAL[4],
      SETORES_OFICIAIS_MANUAL[6],
    ],
  },
  {
    titulo: "Armazenamento e depósitos",
    setores: [SETORES_OFICIAIS_MANUAL[1]],
  },
  {
    titulo: "Apoio, higienização e segurança",
    setores: [
      SETORES_OFICIAIS_MANUAL[2],
      SETORES_OFICIAIS_MANUAL[3],
      SETORES_OFICIAIS_MANUAL[5],
      "Armazenamento Temporário de Resíduos",
      "Área Administrativa",
    ],
  },
  {
    titulo: "Vestiários e sanitários",
    setores: SETORES_OFICIAIS_MANUAL.slice(7),
  },
];

const modelosChecklist: Record<
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
    { categoria: "Temperatura", titulo: "Temperatura da câmara dentro do padrão definido" },
    { categoria: "Organização", titulo: "Alimentos organizados evitando contaminação cruzada" },
    { categoria: "Identificação", titulo: "Preparações e produtos identificados e datados" },
    { categoria: "Integridade", titulo: "Equipamento em bom estado e sem excesso de gelo" },
    { categoria: "Higiene", titulo: "Câmara limpa e sem acúmulo de resíduos" },
  ],
  "Câmara de congelamento": [
    { categoria: "Temperatura", titulo: "Temperatura de congelamento adequada" },
    { categoria: "Organização", titulo: "Produtos organizados e separados por categoria" },
    { categoria: "Identificação", titulo: "Produtos identificados e dentro do prazo" },
    { categoria: "Integridade", titulo: "Ausência de queimadura por frio ou embalagens rompidas" },
    { categoria: "Higiene", titulo: "Equipamento limpo e em bom estado" },
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
    { categoria: "Higiene", titulo: "Instalações estão limpas e conservadas" },
    { categoria: "Lavatório", titulo: "Há sabonete líquido, papel e meio adequado de secagem" },
    { categoria: "Acesso", titulo: "Sanitários não se comunicam diretamente com áreas de preparo" },
    { categoria: "Organização", titulo: "Pertences pessoais estão armazenados adequadamente" },
    { categoria: "Conservação", titulo: "Portas, ralos e instalações estão em bom estado" },
  ],
  "Área de resíduos": [
    { categoria: "Acondicionamento", titulo: "Resíduos estão acondicionados em recipientes adequados" },
    { categoria: "Tampa", titulo: "Lixeiras possuem tampa e acionamento adequado quando aplicável" },
    { categoria: "Fluxo", titulo: "Retirada de resíduos não contamina áreas de produção" },
    { categoria: "Higiene", titulo: "Área de resíduos está limpa e organizada" },
    { categoria: "Controle de pragas", titulo: "Não há sinais de atração ou abrigo de pragas" },
  ],
  "Área externa": [
    { categoria: "Conservação", titulo: "Área externa está conservada e sem acúmulo de materiais" },
    { categoria: "Pragas", titulo: "Não há condições favoráveis à proliferação de pragas" },
    { categoria: "Drenagem", titulo: "Não há água parada ou problemas de drenagem" },
    { categoria: "Acesso", titulo: "Acessos estão protegidos e organizados" },
    { categoria: "Higiene", titulo: "Entorno do estabelecimento está limpo" },
  ],
};

function hojeISO() {
  const n = new Date();
  const o = n.getTimezoneOffset();
  return new Date(n.getTime() - o * 60000).toISOString().slice(0, 10);
}

function fdata(d: string) {
  return d ? new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("pt-BR") : "—";
}

function criarChecklist(
  ambientes: string[],
  fluxosOperacionais?: FluxoOperacional[],
  programasControle?: ProgramaControleQualidade[],
  modelosQuestionario?: Record<string, string>
): ChecklistItem[] {
  const itensAmbientes = ambientes.flatMap((ambiente, ambienteIndex) => {
    const modeloReferencia = modelosQuestionario?.[ambiente] ||
      obterModeloQuestionarioParaAmbiente(ambiente);
    const setorNormalizado = normalizarSetorManual(modeloReferencia);
    const setorDoManual = SETORES_OFICIAIS_MANUAL.includes(
      setorNormalizado as (typeof SETORES_OFICIAIS_MANUAL)[number]
    );
    const itensEstrutura = setorDoManual
      ? obterModeloChecklistManual(ambiente, modeloReferencia)
      : modelosChecklist[ambiente] || obterModeloChecklistManual(ambiente, modeloReferencia);
    const itens = [
      ...itensEstrutura.filter((item) => item.categoria !== "Equipamentos e móveis"),
      ...obterCriteriosOperacionaisParaSetor(fluxosOperacionais, setorNormalizado, ambiente),
    ];

    return itens.map((item, itemIndex) => ({
      id: `${ambienteIndex}-${itemIndex}-${crypto.randomUUID()}`,
      ambiente,
      titulo: item.titulo,
      categoria: item.categoria,
      status: "Pendente" as ChecklistStatus,
      observacao: "",
      criticidade: item.criticidade || "Rotina",
      referencia: item.referencia || "Boas Práticas — critério operacional",
      orientacao: item.orientacao || "",
    }));
  });

  const itensProgramas = obterCriteriosProgramasControle(programasControle).map(
    (item, itemIndex) => ({
      id: `programa-${itemIndex}-${crypto.randomUUID()}`,
      ambiente: AMBIENTE_PROGRAMAS_CONTROLE,
      titulo: item.titulo,
      categoria: item.categoria,
      status: "Pendente" as ChecklistStatus,
      observacao: "",
      criticidade: item.criticidade,
      referencia: item.referencia,
      orientacao: item.orientacao,
    })
  );

  return [...itensAmbientes, ...itensProgramas];
}

function situacaoPrazoNC(prazo?: string, status?: string) {
  if (status === "Resolvida") {
    return { label: "Concluída", classe: "bg-emerald-100 text-emerald-800" };
  }

  if (!prazo) {
    return { label: "Sem prazo", classe: "bg-slate-100 text-slate-700" };
  }

  const partes = prazo.split("-").map(Number);
  if (partes.length !== 3 || partes.some((n) => !Number.isFinite(n))) {
    return { label: "Sem prazo", classe: "bg-slate-100 text-slate-700" };
  }

  const [ano, mes, dia] = partes;

  // Usa datas locais ao meio-dia para evitar qualquer deslocamento de fuso/DST.
  const agora = new Date();
  const hojeLocal = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate(),
    12,
    0,
    0,
    0
  );

  const prazoLocal = new Date(
    ano,
    mes - 1,
    dia,
    12,
    0,
    0,
    0
  );

  const diffDias = Math.round(
    (prazoLocal.getTime() - hojeLocal.getTime()) / 86400000
  );

  if (diffDias < 0) {
    return { label: "Vencida", classe: "bg-red-600 text-white" };
  }

  if (diffDias <= 3) {
    return { label: "Vencendo", classe: "bg-amber-100 text-amber-900" };
  }

  return { label: "Dentro do prazo", classe: "bg-blue-100 text-blue-800" };
}

function chaveCriterio(item: {
  ambiente?: string;
  categoria?: string;
  titulo?: string;
}) {
  return [
    (item.ambiente || "").trim().toLocaleLowerCase("pt-BR"),
    (item.categoria || "").trim().toLocaleLowerCase("pt-BR"),
    (item.titulo || "").trim().toLocaleLowerCase("pt-BR"),
  ].join("::");
}

type MobileNavIconName = "inicio" | "empresas" | "visitas" | "acessos";

function MobileNavIcon({ name }: { name: MobileNavIconName }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "inicio") return <svg {...common}><path d="m3 11 9-7 9 7" /><path d="M5.5 9.5V20h13V9.5" /><path d="M9.5 20v-6h5v6" /></svg>;
  if (name === "empresas") return <svg {...common}><path d="M3 21h18" /><path d="M5 21V7h9v14" /><path d="M14 11h5v10" /><path d="M8 10h3M8 14h3M8 18h3M17 14h.01M17 18h.01" /></svg>;
  if (name === "visitas") return <svg {...common}><path d="M9 5h6" /><path d="M9 3h6v4H9z" /><path d="M7 5H5.5A1.5 1.5 0 0 0 4 6.5v13A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 18.5 5H17" /><path d="m8 14 2.2 2.2L16 10.5" /></svg>;
  return <svg {...common}><path d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M5 21a7 7 0 0 1 14 0" /><path d="M18 4.5h3M19.5 3v3" /></svg>;
}

function CompanySectionIcon({ name }: { name: EmpresaSecao }) {
  const common = { width: 23, height: 23, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "dados") return <svg {...common}><path d="M4 5h16v14H4z" /><path d="M8 9h4M8 13h8M8 16h6" /></svg>;
  if (name === "manual") return <svg {...common}><path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3Z" /><path d="M8 17h10M9 8h5M9 11h6" /></svg>;
  if (name === "ambientes") return <svg {...common}><path d="M3 21h18M5 21V7h9v14M14 11h5v10" /><path d="M8 10h3M8 14h3M17 14h.01M17 18h.01" /></svg>;
  if (name === "fluxos") return <svg {...common}><path d="M4 6h11M15 6l-2-2M15 6l-2 2M20 12H9M9 12l2-2M9 12l2 2M4 18h11M15 18l-2-2M15 18l-2 2" /></svg>;
  if (name === "programas") return <svg {...common}><path d="M7 4h10v4H7z" /><path d="M5 6H4v15h16V6h-1" /><path d="m8 14 2 2 5-5" /></svg>;
  return <svg {...common}><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v5h5M10 12h6M10 16h6" /><path d="M4 7v13" /></svg>;
}

function quantidadeComNome(quantidade: number, singular: string, plural: string) {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

function assinaturaEdicaoEmpresa(valor: {
  form: typeof formEmpresaVazio;
  responsabilidades: ResponsabilidadeManual[];
  setores: string[];
  equipamentos: EquipamentoSetor[];
  fluxos: FluxoOperacional[];
  programas: ProgramaControleQualidade[];
  pops: ProcedimentoOperacionalPadronizado[];
}) {
  return JSON.stringify(valor);
}

export default function Home() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => navigator.serviceWorker.ready)
      .then((registro) => {
        registro.active?.postMessage({ type: "CACHE_APP_SHELL" });
      })
      .catch(() => {
        // O acesso online continua normal em navegadores sem suporte offline.
      });
  }, []);

  const [db, setDb] = useState<AppDB>(emptyDB);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("inicio");
  const [filtroInicio, setFiltroInicio] = useState<"Em andamento" | "Concluída">("Em andamento");
  const [buscaEmpresas, setBuscaEmpresas] = useState("");
  const [filtroListaVisitas, setFiltroListaVisitas] = useState<"Todas" | "Em andamento" | "Concluída">("Todas");
  const [showEmpresaForm, setShowEmpresaForm] = useState(false);
  const [editingEmpresaId, setEditingEmpresaId] = useState<string | null>(null);
  const [empresaSecao, setEmpresaSecao] = useState<EmpresaSecao | null>(null);
  const [showVisitaForm, setShowVisitaForm] = useState(false);
  const [visitaAtualId, setVisitaAtualId] = useState<string | null>(null);
  const [criandoVisita, setCriandoVisita] = useState(false);
  const [ambientesSelecionados, setAmbientesSelecionados] = useState<string[]>([]);
  const [modelosAmbientesSelecionados, setModelosAmbientesSelecionados] = useState<Record<string, string>>({});
  const [ambientePersonalizado, setAmbientePersonalizado] = useState("");
  const [statusAmbientes, setStatusAmbientes] = useState("");
  const [ambienteChecklistAtivo, setAmbienteChecklistAtivo] = useState<string | null>(null);
  const [filtroChecklistRapido, setFiltroChecklistRapido] = useState<FiltroChecklistRapido>("Todos");
  const [ultimoItemChecklistId, setUltimoItemChecklistId] = useState<string | null>(null);
  const [novoEquipamentoVisitaNome, setNovoEquipamentoVisitaNome] = useState("");
  const [novoEquipamentoVisitaQuantidade, setNovoEquipamentoVisitaQuantidade] = useState("1");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [evidenciaDescricao, setEvidenciaDescricao] = useState("");
  const [evidenciaAmbiente, setEvidenciaAmbiente] = useState("");
  const [evidenciaChecklistItemId, setEvidenciaChecklistItemId] = useState("");
  const [evidenciaNcId, setEvidenciaNcId] = useState("");
  const [evidenciaMsg, setEvidenciaMsg] = useState("");
  const [analiseIAEmAndamentoId, setAnaliseIAEmAndamentoId] = useState<string | null>(null);
  const [analiseIAMensagens, setAnaliseIAMensagens] = useState<Record<string, string>>({});
  const [analiseIATextos, setAnaliseIATextos] = useState<Record<string, string>>({});
  const [filtroAcompanhamento, setFiltroAcompanhamento] = useState<
    "Todos" | "Abertas" | "Em tratamento" | "Resolvidas" | "Vencidas"
  >("Todos");
  const [textoAcompanhamento, setTextoAcompanhamento] = useState<Record<string, string>>({});
  const [statusAcompanhamento, setStatusAcompanhamento] = useState<
    Record<string, "Aberta" | "Em tratamento" | "Resolvida">
  >({});
  const [syncStatus, setSyncStatus] = useState<
    "conectando" | "sincronizado" | "local" | "erro" | "recuperacao"
  >("conectando");
  const [syncErroVisivel, setSyncErroVisivel] = useState(false);
  const [syncAtualizadoEm, setSyncAtualizadoEm] = useState("");
  const ultimaNuvemRef = useRef<number>(0);
  const ultimaNuvemVersaoRef = useRef<string | null>(null);
  const aplicandoNuvemRef = useRef(false);
  const falhasSyncRef = useRef(0);
  const retrySyncTimerRef = useRef<number | null>(null);
  const salvamentoImediatoRef = useRef(false);
  const ultimaSincronizacaoAtivacaoRef = useRef(0);
  const syncBloqueadaRef = useRef(false);
  const sessaoVinculadaRef = useRef(false);
  const storageIdentityRef = useRef<string | null>(null);
  const [recuperacaoPendente, setRecuperacaoPendente] = useState<{
    local: AppDB;
    cloud: AppDB;
    merged: AppDB;
    counts: RecoveryCounts;
    cloudUpdatedAt: string | null;
  } | null>(null);
  const [recuperandoDados, setRecuperandoDados] = useState(false);
  const [protecaoLocalAtiva, setProtecaoLocalAtiva] = useState(false);
  const [sessaoAtual, setSessaoAtual] = useState<{
    id: string;
    email: string;
    name: string;
  } | null>(null);
  const [sessaoConsultada, setSessaoConsultada] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [armazenamentoLocalIndisponivel, setArmazenamentoLocalIndisponivel] =
    useState(false);
  const [estaOnline, setEstaOnline] = useState(true);

  useEffect(() => {
    const atualizarConexao = () => setEstaOnline(window.navigator.onLine);
    atualizarConexao();
    window.addEventListener("online", atualizarConexao);
    window.addEventListener("offline", atualizarConexao);
    return () => {
      window.removeEventListener("online", atualizarConexao);
      window.removeEventListener("offline", atualizarConexao);
    };
  }, []);

  function salvarDBLocal(valor: AppDB) {
    const salvo = saveDB(valor, storageIdentityRef.current);
    setArmazenamentoLocalIndisponivel(!salvo);
    return salvo;
  }

  function chaveNavegacaoLocal() {
    return scopedStorageKey(NAV_STORAGE_KEY, storageIdentityRef.current);
  }

  const [form, setForm] = useState(formEmpresaVazio);
  const [responsabilidadesEmpresa, setResponsabilidadesEmpresa] = useState<
    ResponsabilidadeManual[]
  >(criarResponsabilidadesPadrao());
  const [setoresEmpresa, setSetoresEmpresa] = useState<string[]>([]);
  const [equipamentosEmpresa, setEquipamentosEmpresa] = useState<EquipamentoSetor[]>([]);
  const [fluxosEmpresa, setFluxosEmpresa] = useState<FluxoOperacional[]>(
    criarFluxosOperacionaisPadrao()
  );
  const [programasEmpresa, setProgramasEmpresa] = useState<ProgramaControleQualidade[]>(
    criarProgramasControlePadrao()
  );
  const [popsEmpresa, setPopsEmpresa] = useState<ProcedimentoOperacionalPadronizado[]>([]);
  const [assinaturaEmpresaSalva, setAssinaturaEmpresaSalva] = useState("");
  const assinaturaEmpresaAtual = assinaturaEdicaoEmpresa({
    form,
    responsabilidades: responsabilidadesEmpresa,
    setores: setoresEmpresa,
    equipamentos: equipamentosEmpresa,
    fluxos: fluxosEmpresa,
    programas: programasEmpresa,
    pops: popsEmpresa,
  });
  const empresaTemAlteracoes =
    showEmpresaForm &&
    empresaSecao !== null &&
    Boolean(assinaturaEmpresaSalva) &&
    assinaturaEmpresaAtual !== assinaturaEmpresaSalva;
  const popsComRevisaoVencida = popsEmpresa.filter(
    (pop) => situacaoRevisaoPOP(pop).label === "Revisão vencida"
  ).length;

  useEffect(() => {
    if (!empresaTemAlteracoes) return;
    const avisarSaida = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", avisarSaida);
    return () => window.removeEventListener("beforeunload", avisarSaida);
  }, [empresaTemAlteracoes]);

  useEffect(() => {
    if (syncStatus !== "erro") {
      setSyncErroVisivel(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setSyncErroVisivel(true);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [syncStatus]);

  useEffect(() => {
    return () => {
      if (retrySyncTimerRef.current !== null) {
        window.clearTimeout(retrySyncTimerRef.current);
      }
    };
  }, []);

  const [vf, setVf] = useState({
    data: hojeISO(),
    responsavel: "",
    responsavelIdentificacao: "",
    observacoes: "",
  });


  function sincronizacaoOk() {
    falhasSyncRef.current = 0;

    if (retrySyncTimerRef.current !== null) {
      window.clearTimeout(retrySyncTimerRef.current);
      retrySyncTimerRef.current = null;
    }
  }

  function registrarFalhaSincronizacao() {
    falhasSyncRef.current += 1;

    // Falhas rápidas de rede são comuns durante F5/reconexão.
    // Nas primeiras tentativas, mostramos "Conectando..." em vez de
    // assustar o usuário com um falso erro.
    if (falhasSyncRef.current < 3) {
      setSyncStatus("conectando");

      if (retrySyncTimerRef.current !== null) {
        window.clearTimeout(retrySyncTimerRef.current);
      }

      retrySyncTimerRef.current = window.setTimeout(() => {
        retrySyncTimerRef.current = null;
        void buscarEstadoNuvem(false);
      }, 1500);

      return;
    }

    // Só após três falhas consecutivas mostramos erro real.
    setSyncStatus("erro");
  }

  function aplicarEstadoDaNuvem(cloud: any) {
    if (!cloud?.data || typeof cloud.data !== "object") return false;

    const recebido = cloud.data as AppDB;
    const novo: AppDB = {
      ...recebido,
      visitas: Array.isArray(recebido.visitas)
        ? recebido.visitas.map((visita) => migrarVisitaParaChecklistManual(visita, CHECKLIST_VERSAO_ATUAL, true))
        : [],
    };
    aplicandoNuvemRef.current = true;
    ultimaNuvemVersaoRef.current = cloud.updatedAt || null;
    ultimaNuvemRef.current = cloud.updatedAt
      ? new Date(cloud.updatedAt).getTime()
      : 0;

    setDb(novo);
    salvarDBLocal(novo);

    window.setTimeout(() => {
      aplicandoNuvemRef.current = false;
    }, 0);

    return true;
  }

  async function tratarConflitoDaNuvem(response: Response) {
    if (response.status !== 409) return false;

    const conflito = await response.json();

    if (conflito?.data && typeof conflito.data === "object") {
      aplicarEstadoDaNuvem(conflito);
      sincronizacaoOk();
      setSyncStatus("sincronizado");
      setSyncAtualizadoEm(
        conflito.updatedAt
          ? new Date(conflito.updatedAt).toLocaleString("pt-BR")
          : ""
      );
    }

    return true;
  }

  async function buscarEstadoNuvem(aplicarMesmoSeIgual = false) {
    if (salvamentoImediatoRef.current || syncBloqueadaRef.current) return;

    try {
      // Consulta leve: retorna apenas configured + updatedAt.
      const metaResponse = await fetch("/api/state?meta=1", {
        method: "GET",
        cache: "no-store",
      });
      if (!metaResponse.ok) {
        throw new Error(`Falha ao consultar a nuvem (${metaResponse.status})`);
      }
      const meta = await metaResponse.json();

      if (!meta?.configured) {
        setSyncStatus("local");
        return;
      }

      const versaoMudou =
        !!meta.updatedAt &&
        meta.updatedAt !== ultimaNuvemVersaoRef.current;

      if (aplicarMesmoSeIgual || versaoMudou) {
        // Só baixa o JSON completo quando a versão realmente mudou.
        const response = await fetch("/api/state", {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Falha ao carregar a nuvem (${response.status})`);
        }
        const cloud = await response.json();

        if (cloud?.data && typeof cloud.data === "object") {
          aplicarEstadoDaNuvem(cloud);
        } else if (cloud?.updatedAt) {
          ultimaNuvemVersaoRef.current = cloud.updatedAt;
          ultimaNuvemRef.current = new Date(cloud.updatedAt).getTime();
        }

        setSyncAtualizadoEm(
          cloud?.updatedAt
            ? new Date(cloud.updatedAt).toLocaleString("pt-BR")
            : ""
        );
      } else if (meta.updatedAt) {
        ultimaNuvemVersaoRef.current = meta.updatedAt;
        ultimaNuvemRef.current = new Date(meta.updatedAt).getTime();
        setSyncAtualizadoEm(
          new Date(meta.updatedAt).toLocaleString("pt-BR")
        );
      }

      sincronizacaoOk();
      setSyncStatus("sincronizado");
    } catch {
      registrarFalhaSincronizacao();
    }
  }

  useEffect(() => {
    let cancelado = false;

    async function iniciarDados() {
      // Descobre primeiro quem está conectado. Só então abre o armazenamento
      // local exclusivo dessa conta, evitando misturar dados entre perfis.
      let identidadeLocal: string | null = null;
      let sessaoOffline = loadOfflineSession();
      try {
        const responseSessao = await fetch("/api/access/session", {
          method: "GET",
          cache: "no-store",
        });
        if (responseSessao.ok) {
          const sessao = await responseSessao.json();
          if (sessao?.authenticated && sessao?.user?.id && sessao?.user?.email) {
            identidadeLocal = sessao.user.email;
            sessaoOffline = {
              id: sessao.user.id,
              email: sessao.user.email,
              name: sessao.user.name || "",
            };
            saveOfflineSession(sessaoOffline);
            if (!cancelado) {
              setSessaoAtual(sessaoOffline);
            }
          }
        }
      } catch {
        // Sem internet, usa apenas a última sessão que foi validada online
        // neste aparelho. O botão Sair remove essa autorização local.
        if (sessaoOffline) {
          identidadeLocal = sessaoOffline.email;
          if (!cancelado) setSessaoAtual(sessaoOffline);
        }
      } finally {
        storageIdentityRef.current = identidadeLocal;
        if (!cancelado) setSessaoConsultada(true);
      }

      const local = loadDB(identidadeLocal);
      let s = local;

      setSyncStatus("conectando");

      try {
        const response = await fetch("/api/state", {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Falha ao carregar a nuvem (${response.status})`);
        }
        const cloud = await response.json();

        if (cloud?.configured) {
          if (cloud.data && typeof cloud.data === "object") {
            const cloudDb = cloud.data as AppDB;
            const counts = localOnlyCounts(local, cloudDb);

            if (hasLocalOnlyRecords(counts)) {
              // Nunca apaga silenciosamente registros que existam somente
              // neste navegador. Bloqueia a sincronização até o profissional
              // confirmar a mesclagem segura com a nuvem.
              const merged = mergeForRecovery(local, cloudDb);
              s = merged;
              syncBloqueadaRef.current = true;
              setRecuperacaoPendente({
                local,
                cloud: cloudDb,
                merged,
                counts,
                cloudUpdatedAt: cloud.updatedAt || null,
              });
              setSyncStatus("recuperacao");
              salvarDBLocal(merged);
            } else {
              // Nuvem já existente e sem perda local: passa a ser a fonte compartilhada.
              s = cloudDb;
              salvarDBLocal(s);
              sincronizacaoOk();
              setSyncStatus("sincronizado");
            }
            ultimaNuvemRef.current = cloud.updatedAt
              ? new Date(cloud.updatedAt).getTime()
              : 0;
            ultimaNuvemVersaoRef.current = cloud.updatedAt || null;
            setSyncAtualizadoEm(
              cloud.updatedAt
                ? new Date(cloud.updatedAt).toLocaleString("pt-BR")
                : ""
            );
          } else {
            // Primeira migração: envia o conteúdo deste dispositivo apenas
            // se ele realmente possuir dados.
            const possuiDadosLocais =
              Object.keys(s.empresas || {}).length > 0 ||
              (s.visitas || []).length > 0 ||
              (s.ncs || []).length > 0 ||
              (s.evidencias || []).length > 0;

            if (possuiDadosLocais) {
              const upload = await fetch("/api/state", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  data: s,
                  expectedUpdatedAt: null,
                }),
              });

              if (upload.ok) {
                const salvo = await upload.json();
                ultimaNuvemRef.current = salvo.updatedAt
                  ? new Date(salvo.updatedAt).getTime()
                  : Date.now();
                ultimaNuvemVersaoRef.current = salvo.updatedAt || null;
                sincronizacaoOk();
            setSyncStatus("sincronizado");
                setSyncAtualizadoEm(
                  salvo.updatedAt
                    ? new Date(salvo.updatedAt).toLocaleString("pt-BR")
                    : ""
                );
              } else {
                setSyncStatus("erro");
              }
            } else {
              // Dispositivo novo + nuvem ainda vazia:
              // não grava uma base vazia.
              sincronizacaoOk();
            setSyncStatus("sincronizado");
            }
          }
        } else {
          setSyncStatus("local");
        }
      } catch {
        // Preserva o localStorage, mas bloqueia qualquer gravação automática.
        // Uma falha de leitura nunca pode ser tratada como nuvem vazia.
        syncBloqueadaRef.current = true;
        falhasSyncRef.current = 3;
        setSyncStatus("erro");
        setSyncErroVisivel(true);
        setProtecaoLocalAtiva(true);
      }

    const visitasCarregadas = (s.visitas || []).map((v: any) => ({
      id: v.id,
      empresaId: v.empresaId,
      data: v.data || hojeISO(),
      status: v.status === "Concluída" ? "Concluída" : "Em andamento",
      encerradaEm: typeof v.encerradaEm === "string" ? v.encerradaEm : undefined,
      historicoStatus: Array.isArray(v.historicoStatus) ? v.historicoStatus : [],
      responsavel: v.responsavel || "",
      responsavelIdentificacao:
        typeof v.responsavelIdentificacao === "string"
          ? v.responsavelIdentificacao
          : undefined,
      observacoes: v.observacoes || "",
      conclusao: typeof v.conclusao === "string" ? v.conclusao : undefined,
      progresso:
        typeof v.progresso === "number"
          ? v.progresso
          : v.status === "Concluída"
          ? 100
          : 0,
      criadoEm: v.criadoEm || v.data || new Date().toISOString(),
      ambientes: Array.isArray(v.ambientes)
        ? v.ambientes
            .map((a: any) =>
              typeof a === "string" ? a : typeof a?.nome === "string" ? a.nome : ""
            )
            .filter(Boolean)
        : [],
      checklist: Array.isArray(v.checklist) ? v.checklist : [],
      checklistVersao: typeof v.checklistVersao === "number" ? v.checklistVersao : 1,
      modelosQuestionarioAmbientes:
        v.modelosQuestionarioAmbientes && typeof v.modelosQuestionarioAmbientes === "object"
          ? v.modelosQuestionarioAmbientes
          : criarModelosQuestionarioAmbientes(v.ambientes),
      avaliacoesEquipamentos: Array.isArray(v.avaliacoesEquipamentos)
        ? v.avaliacoesEquipamentos.map((avaliacao: any) => ({
            id: typeof avaliacao.id === "string" && avaliacao.id ? avaliacao.id : crypto.randomUUID(),
            equipamentoId: typeof avaliacao.equipamentoId === "string" ? avaliacao.equipamentoId : undefined,
            ambiente: typeof avaliacao.ambiente === "string" ? avaliacao.ambiente : "",
            nome: typeof avaliacao.nome === "string" ? avaliacao.nome : "Equipamento",
            quantidade: Math.max(1, Number(avaliacao.quantidade) || 1),
            estado: (["Não avaliado", "Adequado", "Requer atenção", "Inadequado"] as EstadoEquipamento[]).includes(avaliacao.estado)
              ? avaliacao.estado
              : "Não avaliado",
            observacao: typeof avaliacao.observacao === "string" ? avaliacao.observacao : "",
          }))
        : [],
    })) as Visita[];

    const vs = visitasCarregadas.map((visita) =>
      migrarVisitaParaChecklistManual(visita, CHECKLIST_VERSAO_ATUAL, true)
    );

    // Sincroniza NCs já existentes no checklist com o módulo de Não Conformidades.
    // Isso também migra visitas criadas antes da v2.5.
    let ncsSincronizadas = Array.isArray(s.ncs) ? [...s.ncs] : [];
    for (const visita of vs) {
      for (const item of visita.checklist || []) {
        const idNc = `${visita.id}:${item.id}`;
        if (item.status === "Não Conforme") {
          const existente = ncsSincronizadas.find((nc: any) => nc.id === idNc);
          const nc = {
            id: idNc,
            empresaId: visita.empresaId,
            visitaId: visita.id,
            ambiente: item.ambiente,
            checklistItemId: item.id,
            titulo: item.titulo,
            categoria: item.categoria,
            criticidade: item.criticidade || "Rotina" as const,
            referencia: item.referencia || "",
            orientacao: item.orientacao || "",
            observacao: item.observacao || "",
            prioridade: item.criticidade || "Rotina",
            status: existente?.status || "Aberta" as const,
            inativaNoChecklist: false,
            criadoEm: existente?.criadoEm || new Date().toISOString(),
          };
          ncsSincronizadas = existente
            ? ncsSincronizadas.map((x: any) => x.id === idNc ? { ...x, ...nc } : x)
            : [nc, ...ncsSincronizadas];
        } else {
          ncsSincronizadas = ncsSincronizadas.map((nc: any) =>
            nc.id === idNc ? { ...nc, inativaNoChecklist: true } : nc
          );
        }
      }
    }

    const dbNormalizado: AppDB = {
      ...s,
      empresas: Object.fromEntries(
        Object.entries((s as any).empresas || {}).map(([id, empresa]: [string, any]) => [
          id,
          {
            ...empresa,
            horarioFuncionamento:
              typeof empresa.horarioFuncionamento === "string"
                ? empresa.horarioFuncionamento
                : Array.isArray(empresa.horariosFuncionamento) &&
                  empresa.horariosFuncionamento.some((item: any) => item?.aberto)
                ? resumirHorarioFuncionamento(empresa.horariosFuncionamento)
                : "",
            horariosFuncionamento: normalizarHorarios(empresa.horariosFuncionamento),
            responsabilidadesManual: normalizarResponsabilidades(
              empresa.responsabilidadesManual
            ),
            setoresManual: normalizarListaAmbientesReais(empresa.setoresManual),
            modelosQuestionarioAmbientes: criarModelosQuestionarioAmbientes(
              empresa.setoresManual,
              empresa.modelosQuestionarioAmbientes
            ),
            equipamentosSetores: normalizarEquipamentos(empresa.equipamentosSetores),
            fluxosOperacionais: adequarFluxosAosSetores(
              empresa.fluxosOperacionais,
              normalizarListaAmbientesReais(empresa.setoresManual)
            ),
            programasControleQualidade: normalizarProgramasControle(
              empresa.programasControleQualidade
            ),
            pops: normalizarPops(empresa.pops),
          },
        ])
      ),
      visitas: vs,
      ncs: ncsSincronizadas,
      evidencias: Array.isArray((s as any).evidencias) ? (s as any).evidencias : [],
      usuarios: Array.isArray((s as any).usuarios) ? (s as any).usuarios : [],
      registrosAuditoria: Array.isArray((s as any).registrosAuditoria)
        ? (s as any).registrosAuditoria
        : [],
      configuracaoAcesso:
        (s as any).configuracaoAcesso && typeof (s as any).configuracaoAcesso === "object"
          ? (s as any).configuracaoAcesso
          : emptyDB.configuracaoAcesso,
    };

    setDb(dbNormalizado);

    // Restaura a tela e a visita em que o consultor estava antes de atualizar
    // a página. A navegação é local ao dispositivo; os dados continuam na nuvem.
    try {
      const rawNav = window.localStorage.getItem(chaveNavegacaoLocal());
      if (rawNav) {
        const nav = JSON.parse(rawNav) as {
          view?: View;
          visitaAtualId?: string | null;
          ambienteChecklistAtivo?: string | null;
          ultimoItemChecklistId?: string | null;
        };
        const viewSalva = nav.view;
        const visitaSalva = nav.visitaAtualId
          ? dbNormalizado.visitas.find((v) => v.id === nav.visitaAtualId)
          : undefined;

        if (viewSalva && VISIT_VIEWS.includes(viewSalva)) {
          if (visitaSalva) {
            setVisitaAtualId(visitaSalva.id);
            setView(viewSalva);
            if (
              nav.ambienteChecklistAtivo &&
              [
                ...(visitaSalva.ambientes || []),
                AMBIENTE_PROGRAMAS_CONTROLE,
              ].includes(nav.ambienteChecklistAtivo)
            ) {
              setAmbienteChecklistAtivo(nav.ambienteChecklistAtivo);
            }
            if (
              nav.ultimoItemChecklistId &&
              (visitaSalva.checklist || []).some(
                (item) => item.id === nav.ultimoItemChecklistId
              )
            ) {
              setUltimoItemChecklistId(nav.ultimoItemChecklistId);
            }
          } else {
            setVisitaAtualId(null);
            setView("visitas");
          }
        } else if (viewSalva && ["inicio", "empresas", "visitas", "acessos"].includes(viewSalva)) {
          setView(viewSalva);
          // Mantém a visita selecionada ao atualizar a página quando o usuário
          // estiver na lista de visitas. Em Início/Empresas a seleção não é exibida.
          if (viewSalva === "visitas" && visitaSalva) {
            setVisitaAtualId(visitaSalva.id);
          } else {
            setVisitaAtualId(null);
          }
        }
      }
    } catch {
      // Se a preferência local estiver inválida, inicia normalmente.
    }

      if (!cancelado) setReady(true);
    }

    void iniciarDados();

    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    try {
      window.localStorage.setItem(
        chaveNavegacaoLocal(),
        JSON.stringify({
          view,
          visitaAtualId,
          ambienteChecklistAtivo,
          ultimoItemChecklistId,
        })
      );
    } catch {
      // A navegação continua funcionando mesmo se o armazenamento local falhar.
    }
  }, [view, visitaAtualId, ambienteChecklistAtivo, ultimoItemChecklistId, ready]);

  useEffect(() => {
    if (view !== "checklist" || !ultimoItemChecklistId) return;
    const timer = window.setTimeout(() => {
      document
        .getElementById(`checklist-item-${ultimoItemChecklistId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 260);
    return () => window.clearTimeout(timer);
  }, [view, ambienteChecklistAtivo, ultimoItemChecklistId]);

  useEffect(() => {
    if (!ready || !sessaoAtual || sessaoVinculadaRef.current) return;
    sessaoVinculadaRef.current = true;

    setDb((atual) => {
          const agora = new Date().toISOString();
          const resultado = vincularSessaoUsuario(
            {
              authId: sessaoAtual.id,
              email: sessaoAtual.email,
              nome: sessaoAtual.name,
            },
            atual.usuarios,
            agora
          );
          if (resultado.status !== "Vinculado" || !resultado.alterado) return atual;

          const registro = criarRegistroAuditoria(
            {
              usuarioId: resultado.usuario.id,
              usuarioNome: resultado.usuario.nome,
              acao: "usuario.sessao_vinculada",
              entidade: "Usuário",
              entidadeId: resultado.usuario.id,
              detalhes: `${resultado.usuario.nome} • ${resultado.usuario.perfil} • conta autenticada vinculada e ativada.`,
            },
            agora
          );

          return {
            ...atual,
            usuarios: atual.usuarios.map((usuario) =>
              usuario.id === resultado.usuario.id ? resultado.usuario : usuario
            ),
            registrosAuditoria: [...atual.registrosAuditoria, registro],
          };
        });
  }, [ready, sessaoAtual]);

  async function sairDoSistema() {
    if (saindo) return;
    setSaindo(true);
    try {
      await authClient.signOut();
      clearOfflineSession();
      window.location.replace("/auth/sign-in");
    } catch {
      setSaindo(false);
      window.alert("Não foi possível encerrar a sessão. Tente novamente.");
    }
  }

  const usuarioDaSessao = useMemo(() => {
    if (!sessaoAtual?.email) return null;
    const email = sessaoAtual.email.trim().toLocaleLowerCase("pt-BR");
    return db.usuarios.find(
      (usuario) => usuario.email.trim().toLocaleLowerCase("pt-BR") === email
    ) || null;
  }, [db.usuarios, sessaoAtual]);

  function permitido(acao: AcaoPermissao, empresaId?: string): boolean {
    return podeExecutar(usuarioDaSessao, acao, empresaId);
  }

  function exigirPermissao(acao: AcaoPermissao, empresaId?: string): boolean {
    if (permitido(acao, empresaId)) return true;
    window.alert("Seu perfil não possui permissão para executar esta ação.");
    return false;
  }

  useEffect(() => {
    if (
      usuarioDaSessao &&
      view === "acessos" &&
      !possuiPermissao(usuarioDaSessao, "usuarios.gerenciar")
    ) {
      setView("inicio");
    }
  }, [usuarioDaSessao, view]);

  useEffect(() => {
    if (!ready) return;

    salvarDBLocal(db);

    if (
      aplicandoNuvemRef.current ||
      salvamentoImediatoRef.current ||
      syncBloqueadaRef.current
    ) return;

    const timer = window.setTimeout(async () => {
      try {
        // Checagem leve antes de gravar: não baixa o banco completo.
        const metaResponse = await fetch("/api/state?meta=1", {
          method: "GET",
          cache: "no-store",
        });
        if (!metaResponse.ok) {
          throw new Error(`Falha ao consultar a nuvem (${metaResponse.status})`);
        }
        const meta = await metaResponse.json();

        if (!meta?.configured) {
          setSyncStatus("local");
          return;
        }

        const versaoMudou =
          !!meta.updatedAt &&
          meta.updatedAt !== ultimaNuvemVersaoRef.current;

        if (versaoMudou) {
          // Outro aparelho alterou a base. Só agora baixamos o estado completo.
          const cloudResponse = await fetch("/api/state", {
            method: "GET",
            cache: "no-store",
          });
          if (!cloudResponse.ok) {
            throw new Error(`Falha ao carregar a nuvem (${cloudResponse.status})`);
          }
          const cloud = await cloudResponse.json();

          if (cloud?.data && typeof cloud.data === "object") {
            aplicarEstadoDaNuvem(cloud);
          }

          sincronizacaoOk();
          setSyncStatus("sincronizado");
          setSyncAtualizadoEm(
            cloud?.updatedAt
              ? new Date(cloud.updatedAt).toLocaleString("pt-BR")
              : ""
          );
          return;
        }

        const response = await fetch("/api/state", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: db,
            expectedUpdatedAt: ultimaNuvemVersaoRef.current,
          }),
        });

        if (await tratarConflitoDaNuvem(response)) return;

        if (response.ok) {
          const result = await response.json();

          if (result?.configured !== false) {
            ultimaNuvemVersaoRef.current = result.updatedAt || null;
            ultimaNuvemRef.current = result.updatedAt
              ? new Date(result.updatedAt).getTime()
              : Date.now();

            sincronizacaoOk();
            setSyncStatus("sincronizado");
            setSyncAtualizadoEm(
              result.updatedAt
                ? new Date(result.updatedAt).toLocaleString("pt-BR")
                : new Date().toLocaleString("pt-BR")
            );
          } else {
            setSyncStatus("local");
          }
        } else if (response.status === 503) {
          setSyncStatus("local");
        } else {
          registrarFalhaSincronizacao();
        }
      } catch {
        registrarFalhaSincronizacao();
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [db, ready]);


  useEffect(() => {
    if (!ready) return;

    const atualizar = () => {
      const agora = Date.now();
      const deveSincronizar = shouldSyncOnActivation({
        ready,
        visible: document.visibilityState === "visible",
        now: agora,
        lastSyncAt: ultimaSincronizacaoAtivacaoRef.current,
        minIntervalMs: SYNC_ACTIVATION_DEDUP_MS,
      });

      if (!deveSincronizar) return;

      ultimaSincronizacaoAtivacaoRef.current = agora;
      void buscarEstadoNuvem(false);
    };

    window.addEventListener("focus", atualizar);
    document.addEventListener("visibilitychange", atualizar);

    return () => {
      window.removeEventListener("focus", atualizar);
      document.removeEventListener("visibilitychange", atualizar);
    };
  }, [ready]);

  async function atualizarNuvemManualmente() {
    if (syncBloqueadaRef.current) return;
    setSyncStatus("conectando");
    await buscarEstadoNuvem(false);
  }

  function baixarBackupLocal() {
    const agora = new Date();
    const conteudo = JSON.stringify(createLocalBackup(db, agora.toISOString()), null, 2);
    const blob = new Blob([conteudo], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = localBackupFilename(agora);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function confirmarRecuperacaoLocal() {
    if (!recuperacaoPendente || recuperandoDados) return;

    if (!recuperacaoPendente.cloudUpdatedAt) {
      window.alert(
        "A versão atual da nuvem não pôde ser confirmada. Mantenha o sistema fechado e tente novamente mais tarde."
      );
      return;
    }

    setRecuperandoDados(true);

    try {
      const response = await fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: recuperacaoPendente.merged,
          expectedUpdatedAt: recuperacaoPendente.cloudUpdatedAt,
        }),
      });

      if (response.status === 409) {
        window.alert(
          "A nuvem mudou enquanto a recuperação estava aberta. Nenhum dado local foi apagado. Atualize a página para recalcular a mesclagem."
        );
        return;
      }

      if (!response.ok) {
        throw new Error(`Falha ao recuperar dados (${response.status})`);
      }

      const result = await response.json();
      salvarDBLocal(recuperacaoPendente.merged);
      setDb(recuperacaoPendente.merged);
      registrarConfirmacaoNuvem(result.updatedAt || null);
      syncBloqueadaRef.current = false;
      setProtecaoLocalAtiva(false);
      setRecuperacaoPendente(null);
      window.alert(
        "Registros locais mesclados com a nuvem. Nenhuma empresa, visita, não conformidade ou evidência foi removida."
      );
    } catch {
      setSyncStatus("recuperacao");
      window.alert(
        "A recuperação ainda não pôde ser gravada. Os dados locais continuam preservados neste computador."
      );
    } finally {
      setRecuperandoDados(false);
    }
  }

  useEffect(() => {
    if (!visitaAtualId) return;
    const visita = db.visitas.find((v) => v.id === visitaAtualId);
    if (visita && db.empresaAtualId && visita.empresaId !== db.empresaAtualId) {
      setVisitaAtualId(null);
      if (VISIT_VIEWS.includes(view)) setView("visitas");
    }
  }, [db.empresaAtualId, db.visitas, visitaAtualId, view]);

  const empresasVisiveis = useMemo(
    () =>
      Object.values(db.empresas).filter((empresa) =>
        podeAcessarEmpresa(usuarioDaSessao, empresa.id)
      ),
    [db.empresas, usuarioDaSessao]
  );
  const empresasFiltradas = useMemo(() => {
    const termo = buscaEmpresas.trim().toLocaleLowerCase("pt-BR");
    if (!termo) return empresasVisiveis;
    return empresasVisiveis.filter((empresa) =>
      [empresa.nomeFantasia, empresa.razaoSocial, empresa.cnpj, empresa.municipio]
        .some((valor) => valor?.toLocaleLowerCase("pt-BR").includes(termo))
    );
  }, [empresasVisiveis, buscaEmpresas]);
  const empresaAtualCadastrada = db.empresaAtualId
    ? db.empresas[db.empresaAtualId]
    : undefined;
  const atual =
    empresaAtualCadastrada &&
    podeAcessarEmpresa(usuarioDaSessao, empresaAtualCadastrada.id)
      ? empresaAtualCadastrada
      : undefined;
  const configuracaoEmpresaAtual = resumoConfiguracaoEmpresa(atual);
  const empresaGerenciada = editingEmpresaId
    ? db.empresas[editingEmpresaId]
    : atual;
  const configuracaoEmpresaGerenciada = resumoConfiguracaoEmpresa(empresaGerenciada);
  const visitaAtualCadastrada = visitaAtualId
    ? db.visitas.find((v) => v.id === visitaAtualId)
    : undefined;
  const visitaAtual =
    visitaAtualCadastrada &&
    podeAcessarEmpresa(usuarioDaSessao, visitaAtualCadastrada.empresaId)
      ? visitaAtualCadastrada
      : undefined;
  const empresaVisita = visitaAtual ? db.empresas[visitaAtual.empresaId] : undefined;
  const programasControleAtivos = normalizarProgramasControle(
    empresaVisita?.programasControleQualidade
  ).filter(
    (programa) => programa.status === "Implantado" || programa.status === "Em implantação"
  );
  const programasChecklistAtivos = obterCriteriosProgramasControle(
    empresaVisita?.programasControleQualidade
  );
  const popsRelatorio = normalizarPops(empresaVisita?.pops).filter(
    (pop) => pop.status !== "Inativo"
  );
  const ambientesChecklistVisita = visitaAtual
    ? [
        ...(visitaAtual.ambientes || []),
        ...(programasChecklistAtivos.length > 0 ? [AMBIENTE_PROGRAMAS_CONTROLE] : []),
      ]
    : [];
  const equipamentosDaVisita = (empresaVisita?.equipamentosSetores || []).filter(
    (equipamento) => (visitaAtual?.ambientes || []).includes(equipamento.setor)
  );
  const totalUnidadesEquipamentos = equipamentosDaVisita.reduce(
    (total, equipamento) => total + Math.max(1, Number(equipamento.quantidade) || 1),
    0
  );
  const equipamentosRelatorio = equipamentosDaVisita.map((equipamento) => ({
    id: equipamento.id,
    ambiente: equipamento.setor,
    nome: equipamento.nome,
    quantidade: equipamento.quantidade,
  }));
  const equipamentosAmbienteAtivo = (empresaVisita?.equipamentosSetores || []).filter(
    (equipamento) => equipamento.setor === ambienteChecklistAtivo
  );
  // Uma atualização pode restaurar diretamente a tela do checklist depois de
  // migrar os ambientes antigos. Nesse caso, recria as perguntas sem exigir
  // que o usuário saia e entre novamente na visita.
  useEffect(() => {
    if (
      !ready ||
      view !== "checklist" ||
      !visitaAtual ||
      (visitaAtual.checklist || []).length > 0 ||
      (visitaAtual.ambientes || []).length === 0
    ) return;

    const novoChecklist = criarChecklist(
      visitaAtual.ambientes || [],
      empresaVisita?.fluxosOperacionais,
      empresaVisita?.programasControleQualidade,
      visitaAtual.modelosQuestionarioAmbientes || empresaVisita?.modelosQuestionarioAmbientes
    );
    if (novoChecklist.length === 0) return;

    setDb((atual) => ({
      ...atual,
      visitas: atual.visitas.map((visita) =>
        visita.id === visitaAtual.id
          ? { ...visita, checklist: novoChecklist, checklistVersao: CHECKLIST_VERSAO_ATUAL }
          : visita
      ),
    }));
  }, [
    ready,
    view,
    visitaAtual,
    empresaVisita?.fluxosOperacionais,
    empresaVisita?.programasControleQualidade,
  ]);

  const gruposRoteiroChecklist = visitaAtual
    ? [
        { titulo: "Capítulos 1 e 2 • Ambientes da visita", itens: visitaAtual.ambientes || [] },
        ...(programasChecklistAtivos.length > 0
          ? [{ titulo: "Verificação geral", itens: [AMBIENTE_PROGRAMAS_CONTROLE] }]
          : []),
      ]
    : [];
  const ambientesSugeridosVisita =
    empresaVisita?.setoresManual?.length
      ? empresaVisita.setoresManual
      : ambientesPadrao;
  const visitas = useMemo(
    () =>
      db.visitas
        .filter(
          (visita) =>
            podeAcessarEmpresa(usuarioDaSessao, visita.empresaId) &&
            (podeExecutar(usuarioDaSessao, "visitas.executar", visita.empresaId) ||
              visita.status === "Concluída")
        )
        .sort((a, b) =>
          (b.criadoEm || b.data || "").localeCompare(a.criadoEm || a.data || "")
        ),
    [db.visitas, usuarioDaSessao]
  );

  const visitasEmpresaAtual = useMemo(
    () =>
      visitas.filter((v) => v.empresaId === db.empresaAtualId),
    [visitas, db.empresaAtualId]
  );
  const visitasFiltradas = useMemo(
    () =>
      filtroListaVisitas === "Todas"
        ? visitas
        : visitas.filter(
            (visita) => visita.status === filtroListaVisitas
          ),
    [visitas, filtroListaVisitas]
  );

  const prefixoMesAtual = new Date().toISOString().slice(0, 7);
  const visitasDoMes = visitas.filter((visita) => visita.data?.startsWith(prefixoMesAtual));
  const visitasRecentesInicio = visitas
    .filter((visita) => visita.status === filtroInicio)
    .slice(0, 3);

  const visitaEmAndamentoDestaque = visitas.find(
    (visita) => visita.status === "Em andamento"
  );
  const progressoVisitaDestaque = visitaEmAndamentoDestaque?.checklist?.length
    ? Math.round(
        (visitaEmAndamentoDestaque.checklist.filter(
          (item) => item.status !== "Pendente"
        ).length /
          visitaEmAndamentoDestaque.checklist.length) *
          100
      )
    : 0;

  const numeroVisitaPorId = useMemo(() => {
    const numeros = new Map<string, number>();
    const porEmpresa = new Map<string, Visita[]>();
    visitas.forEach((visita) => {
      porEmpresa.set(visita.empresaId, [
        ...(porEmpresa.get(visita.empresaId) || []),
        visita,
      ]);
    });
    porEmpresa.forEach((visitasDaEmpresa) => {
      visitasDaEmpresa
        .sort((a, b) =>
          (a.criadoEm || a.data || "").localeCompare(
            b.criadoEm || b.data || ""
          )
        )
        .forEach((visita, indice) => numeros.set(visita.id, indice + 1));
    });
    return numeros;
  }, [visitas]);

  const idsVisitasEmpresaAtual = useMemo(
    () => new Set(visitasEmpresaAtual.map((v) => v.id)),
    [visitasEmpresaAtual]
  );

  const ncsEmpresaAtual = useMemo(
    () =>
      (db.ncs || []).filter(
        (nc) =>
          nc.empresaId === db.empresaAtualId &&
          idsVisitasEmpresaAtual.has(nc.visitaId) &&
          !nc.inativaNoChecklist
      ),
    [db.ncs, db.empresaAtualId, idsVisitasEmpresaAtual]
  );

  const visitasEmpresaConcluidas = visitasEmpresaAtual.filter(
    (v) => v.status === "Concluída"
  ).length;

  const ncsEmpresaAbertas = ncsEmpresaAtual.filter(
    (nc) => nc.status !== "Resolvida"
  ).length;

  const ncsEmpresaResolvidas = ncsEmpresaAtual.filter(
    (nc) => nc.status === "Resolvida"
  ).length;

  const ncsEmpresaForaDoHistorico = (db.ncs || []).filter(
    (nc) =>
      nc.empresaId === db.empresaAtualId &&
      !idsVisitasEmpresaAtual.has(nc.visitaId)
  ).length;

  const comparacaoVisitas = useMemo(() => {
    const ordenadas = [...visitasEmpresaAtual].sort((a, b) =>
      (b.data || b.criadoEm || "").localeCompare(a.data || a.criadoEm || "")
    );

    if (ordenadas.length < 2) return null;

    const atualComp = ordenadas[0];
    const anteriorComp = ordenadas[1];

    function resumoChecklist(visita: Visita) {
      const checklist = visita.checklist || [];
      const conformes = checklist.filter((item) => item.status === "Conforme").length;
      const naoConformes = checklist.filter((item) => item.status === "Não Conforme").length;
      const avaliados = conformes + naoConformes;
      return {
        conformes,
        naoConformes,
        avaliados,
        conformidade: avaliados ? Math.round((conformes / avaliados) * 100) : 0,
      };
    }

    const resumoAtual = resumoChecklist(atualComp);
    const resumoAnterior = resumoChecklist(anteriorComp);

    const ncsAtual = (db.ncs || []).filter((nc) => nc.visitaId === atualComp.id);
    const ncsAnterior = (db.ncs || []).filter((nc) => nc.visitaId === anteriorComp.id);

    const chavesAtual = new Set(ncsAtual.map(chaveCriterio));
    const chavesAnterior = new Set(ncsAnterior.map(chaveCriterio));

    const novas = ncsAtual.filter((nc) => !chavesAnterior.has(chaveCriterio(nc)));
    const reincidentes = ncsAtual.filter((nc) => chavesAnterior.has(chaveCriterio(nc)));

    const checklistAtualPorChave = new Map(
      (atualComp.checklist || []).map((item) => [chaveCriterio(item), item])
    );

    const corrigidas = ncsAnterior.filter((nc) => {
      const itemAtual = checklistAtualPorChave.get(chaveCriterio(nc));
      return itemAtual?.status === "Conforme";
    });

    const aindaPendentes = ncsAnterior.filter((nc) =>
      chavesAtual.has(chaveCriterio(nc))
    );

    return {
      atual: atualComp,
      anterior: anteriorComp,
      resumoAtual,
      resumoAnterior,
      deltaConformidade: resumoAtual.conformidade - resumoAnterior.conformidade,
      deltaNc: ncsAtual.length - ncsAnterior.length,
      ncsAtual,
      ncsAnterior,
      novas,
      reincidentes,
      corrigidas,
      aindaPendentes,
    };
  }, [visitasEmpresaAtual, db.ncs]);

  const checklistAtual = visitaAtual?.checklist || [];
  const pendentesAmbienteAtivo = checklistAtual.filter(
    (item) =>
      item.ambiente === ambienteChecklistAtivo &&
      item.status === "Pendente"
  ).length;
  const respondidos = checklistAtual.filter((i) => i.status !== "Pendente").length;
  const totalChecklist = checklistAtual.length;
  const percentualChecklist = totalChecklist
    ? Math.round((respondidos / totalChecklist) * 100)
    : 0;
  const itensAmbienteChecklistAtivo = checklistAtual.filter(
    (item) => item.ambiente === ambienteChecklistAtivo
  );
  const itensChecklistVisiveis = itensAmbienteChecklistAtivo.filter((item) => {
    if (filtroChecklistRapido === "Pendentes") return item.status === "Pendente";
    if (filtroChecklistRapido === "Não conformes") return item.status === "Não Conforme";
    return true;
  });
  const ncsVisita = (db.ncs || []).filter((nc) => nc.visitaId === visitaAtual?.id && !nc.inativaNoChecklist);
  const ncsAbertas = ncsVisita.filter((nc) => nc.status !== "Resolvida").length;
  const acoesDefinidas = ncsVisita.filter(
    (nc: any) => (nc.acaoCorretiva || "").trim().length > 0
  ).length;
  const acoesConcluidas = ncsVisita.filter((nc) => nc.status === "Resolvida").length;
  const evidenciasVisita = (db.evidencias || []).filter(
    (ev) => ev.visitaId === visitaAtual?.id
  );
  const fotosVisita = evidenciasVisita.filter((ev) => ev.tipo === "Foto").length;
  const audiosVisita = evidenciasVisita.filter((ev) => ev.tipo === "Áudio").length;
  const analisesIAPendentes = evidenciasVisita.reduce(
    (total, ev) =>
      total + (ev.analisesIA || []).filter((analise) => analise.status === "Aguardando revisão").length,
    0
  );
  const analisesIAConfirmadas = evidenciasVisita.reduce(
    (total, ev) =>
      total + (ev.analisesIA || []).filter((analise) => analise.status === "Confirmada").length,
    0
  );
  const ncsSomenteAbertas = ncsVisita.filter(
    (nc) => nc.status === "Aberta"
  ).length;
  const ncsEmTratamento = ncsVisita.filter(
    (nc) => nc.status === "Em tratamento"
  ).length;
  const ncsResolvidas = ncsVisita.filter(
    (nc) => nc.status === "Resolvida"
  ).length;
  const ncsSemAcao = ncsVisita.filter(
    (nc: any) => !(nc.acaoCorretiva || "").trim()
  ).length;
  const conformesVisita = checklistAtual.filter(
    (item) => item.status === "Conforme"
  ).length;
  const naoConformesVisita = checklistAtual.filter(
    (item) => item.status === "Não Conforme"
  ).length;
  const naoSeAplicaVisita = checklistAtual.filter(
    (item) => item.status === "Não se aplica"
  ).length;
  const pendentesVisita = checklistAtual.filter(
    (item) => item.status === "Pendente"
  ).length;
  const itensAvaliadosVisita = conformesVisita + naoConformesVisita;
  const percentualConformidade = itensAvaliadosVisita
    ? Math.round((conformesVisita / itensAvaliadosVisita) * 100)
    : 0;
  const resumoAmbientesVisita = (visitaAtual?.ambientes || []).map((ambiente) => {
    const itens = checklistAtual.filter((item) => item.ambiente === ambiente);
    const respondidosAmbiente = itens.filter((item) => item.status !== "Pendente").length;
    const equipamentosAmbiente = (empresaVisita?.equipamentosSetores || []).filter(
      (equipamento) => equipamento.setor === ambiente
    );
    const temNaoConforme = itens.some((item) => item.status === "Não Conforme");
    const temPendente = itens.some((item) => item.status === "Pendente");
    const status = itens.length === 0 || respondidosAmbiente === 0
      ? "Não verificado"
      : temNaoConforme
      ? "Não conforme"
      : temPendente
      ? "Atenção"
      : "Conforme";
    return {
      ambiente,
      itens: itens.length,
      respondidos: respondidosAmbiente,
      equipamentos: equipamentosAmbiente.length,
      status,
    };
  });
  const ambientesAgrupadosCentral = (() => {
    const incluidos = new Set<string>();
    const grupos = gruposAmbientesCentral
      .map((grupo) => {
        const ambientes = resumoAmbientesVisita.filter((resumo) => {
          const modeloQuestionario =
            visitaAtual?.modelosQuestionarioAmbientes?.[resumo.ambiente] ||
            empresaVisita?.modelosQuestionarioAmbientes?.[resumo.ambiente] ||
            obterModeloQuestionarioParaAmbiente(resumo.ambiente);
          return grupo.setores.some((setor) => setor === modeloQuestionario);
        });
        ambientes.forEach((resumo) => incluidos.add(resumo.ambiente));
        return { titulo: grupo.titulo, ambientes };
      })
      .filter((grupo) => grupo.ambientes.length > 0);
    const outros = resumoAmbientesVisita.filter(
      (resumo) => !incluidos.has(resumo.ambiente)
    );
    return outros.length > 0
      ? [...grupos, { titulo: "Outros ambientes", ambientes: outros }]
      : grupos;
  })();
  const itensProgramasCentral = checklistAtual.filter(
    (item) => item.ambiente === AMBIENTE_PROGRAMAS_CONTROLE
  );
  const respondidosProgramasCentral = itensProgramasCentral.filter(
    (item) => item.status !== "Pendente"
  ).length;
  const statusProgramasCentral = itensProgramasCentral.length === 0 || respondidosProgramasCentral === 0
    ? "Não verificado"
    : itensProgramasCentral.some((item) => item.status === "Não Conforme")
    ? "Não conforme"
    : itensProgramasCentral.some((item) => item.status === "Pendente")
    ? "Atenção"
    : "Conforme";
  const proximoAmbienteVisita = resumoAmbientesVisita.find(
    (ambiente) => ambiente.itens === 0 || ambiente.respondidos < ambiente.itens
  )?.ambiente;
  const ncsCriticasVisita = ncsVisita.filter(
    (nc) => nc.criticidade === "Crítica"
  ).length;
  const ncsImportantesVisita = ncsVisita.filter(
    (nc) => nc.criticidade === "Importante"
  ).length;
  const ncsSemResponsavel = ncsVisita.filter(
    (nc: any) => !(nc.responsavelAcao || "").trim()
  ).length;
  const ncsSemPrazo = ncsVisita.filter(
    (nc: any) => !(nc.prazo || "").trim()
  ).length;
  const ncsVencidasRelatorio = ncsVisita.filter(
    (nc: any) => situacaoPrazoNC(nc.prazo, nc.status).label === "Vencida"
  ).length;
  const relatorioProntoParaEncerrar =
    pendentesVisita === 0 &&
    ncsSemAcao === 0 &&
    ncsSemResponsavel === 0 &&
    ncsSemPrazo === 0;

  async function baixarPdfRelatorio() {
    if (!visitaAtual || !empresaVisita || gerandoPdf) return;
    if (!exigirPermissao("relatorios.exportar", visitaAtual.empresaId)) return;

    const elemento = document.getElementById("relatorio-visita");
    if (!elemento) return;

    setGerandoPdf(true);

    try {
      // Aguarda as evidências fotográficas carregarem.
      const imagens = Array.from(
        elemento.querySelectorAll("img")
      ) as HTMLImageElement[];

      await Promise.all(
        imagens.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve();
                return;
              }
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            })
        )
      );

      elemento.classList.add("pdf-export");

      // Aguarda o navegador aplicar o layout específico da exportação.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve())
        )
      );

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);

      const elementoRect = elemento.getBoundingClientRect();

      // Blocos que não devem ser cortados no meio entre páginas.
      const blocosProtegidos = Array.from(
        elemento.querySelectorAll(".print-card, .print-block")
      ).map((node) => {
        const rect = (node as HTMLElement).getBoundingClientRect();
        return {
          topCss: Math.max(0, rect.top - elementoRect.top),
          bottomCss: Math.max(0, rect.bottom - elementoRect.top),
          heightCss: rect.height,
        };
      });

      // Proteção rígida da abertura da seção Evidências:
      // título + contador + primeira linha de fotos devem permanecer juntos.
      const secaoEvidencias = elemento.querySelector(
        '[data-pdf-section="evidencias"]'
      ) as HTMLElement | null;

      if (secaoEvidencias) {
        const cardsEvidencia = Array.from(
          secaoEvidencias.querySelectorAll(".print-card")
        ) as HTMLElement[];

        if (cardsEvidencia.length > 0) {
          const secaoRect = secaoEvidencias.getBoundingClientRect();

          // Em telas largas, protege os dois primeiros cards (primeira linha).
          // Em telas estreitas, protege pelo menos o primeiro card.
          const primeiroRect = cardsEvidencia[0].getBoundingClientRect();
          const segundoRect =
            cardsEvidencia.length > 1
              ? cardsEvidencia[1].getBoundingClientRect()
              : null;

          const mesmaLinha =
            segundoRect &&
            Math.abs(segundoRect.top - primeiroRect.top) < 20;

          const fimProtegido = mesmaLinha
            ? Math.max(primeiroRect.bottom, segundoRect!.bottom)
            : primeiroRect.bottom;

          blocosProtegidos.push({
            topCss: Math.max(0, secaoRect.top - elementoRect.top),
            bottomCss: Math.max(0, fimProtegido - elementoRect.top),
            heightCss: Math.max(0, fimProtegido - secaoRect.top),
          });
        }
      }

      // Mantém o título de Não Conformidades junto da primeira NC.
      // Evita uma página terminar apenas com o cabeçalho da seção.
      const secaoNCs = elemento.querySelector(
        '[data-pdf-section="nao-conformidades"]'
      ) as HTMLElement | null;

      if (secaoNCs) {
        const primeiraNC = secaoNCs.querySelector(".print-card") as HTMLElement | null;

        if (primeiraNC) {
          const secaoRect = secaoNCs.getBoundingClientRect();
          const primeiraRect = primeiraNC.getBoundingClientRect();

          blocosProtegidos.push({
            topCss: Math.max(0, secaoRect.top - elementoRect.top),
            bottomCss: Math.max(0, primeiraRect.bottom - elementoRect.top),
            heightCss: Math.max(0, primeiraRect.bottom - secaoRect.top),
          });
        }
      }

      blocosProtegidos.sort((a, b) => a.topCss - b.topCss);

      const canvas = await html2canvas(elemento, {
        scale: 1.6,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 1100,
        ignoreElements: (node) =>
          node instanceof HTMLElement &&
          node.classList.contains("print-control"),
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const paginaLargura = 210;
      const paginaAltura = 297;
      const margemX = 10;
      const margemTopo = 11;
      const margemRodape = 12;
      const larguraUtil = paginaLargura - margemX * 2;
      const alturaUtil = paginaAltura - margemTopo - margemRodape;

      const mmPorCanvasPx = larguraUtil / canvas.width;
      const alturaPaginaPx = Math.floor(alturaUtil / mmPorCanvasPx);

      // Converte as posições dos cards do DOM para pixels do canvas.
      const escalaCanvasY =
        elementoRect.height > 0 ? canvas.height / elementoRect.height : 1;

      const protegidosPx = blocosProtegidos.map((bloco) => ({
        top: Math.round(bloco.topCss * escalaCanvasY),
        bottom: Math.round(bloco.bottomCss * escalaCanvasY),
        height: Math.round(bloco.heightCss * escalaCanvasY),
      }));

      const cortes: { inicio: number; fim: number }[] = [];
      let inicio = 0;
      const folgaPx = Math.max(10, Math.round(5 / mmPorCanvasPx));

      while (inicio < canvas.height) {
        let fimDesejado = Math.min(
          inicio + alturaPaginaPx,
          canvas.height
        );

        if (fimDesejado < canvas.height) {
          // Se a quebra cair dentro de um cartão, move a quebra para
          // imediatamente antes do cartão.
          const atravessados = protegidosPx.filter(
            (bloco) =>
              bloco.top > inicio + folgaPx &&
              bloco.top < fimDesejado &&
              bloco.bottom > fimDesejado &&
              bloco.height < alturaPaginaPx - folgaPx
          );

          // Se mais de um bloco protegido atravessar a quebra, usa o que
          // começa mais cedo. Isso garante que o cabeçalho de Evidências
          // seja levado junto com a primeira linha de fotos.
          const atravessado = atravessados.sort(
            (a, b) => a.top - b.top
          )[0];

          if (atravessado) {
            const fimSeguro = atravessado.top - folgaPx;

            // Evita criar uma página quase vazia.
            if (fimSeguro - inicio >= alturaPaginaPx * 0.35) {
              fimDesejado = fimSeguro;
            }
          }
        }

        // Proteção contra loop em layouts inesperados.
        if (fimDesejado <= inicio) {
          fimDesejado = Math.min(
            inicio + alturaPaginaPx,
            canvas.height
          );
        }

        cortes.push({ inicio, fim: fimDesejado });
        inicio = fimDesejado;
      }

      const totalPaginas = cortes.length;

      cortes.forEach((corte, indice) => {
        const alturaRecorte = corte.fim - corte.inicio;

        const paginaCanvas = document.createElement("canvas");
        paginaCanvas.width = canvas.width;
        paginaCanvas.height = alturaRecorte;

        const ctx = paginaCanvas.getContext("2d");
        if (!ctx) {
          throw new Error("Falha ao preparar uma página do PDF.");
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(
          0,
          0,
          paginaCanvas.width,
          paginaCanvas.height
        );

        ctx.drawImage(
          canvas,
          0,
          corte.inicio,
          canvas.width,
          alturaRecorte,
          0,
          0,
          canvas.width,
          alturaRecorte
        );

        const imagem = paginaCanvas.toDataURL(
          "image/jpeg",
          0.9
        );
        const alturaMm = alturaRecorte * mmPorCanvasPx;

        if (indice > 0) pdf.addPage();

        pdf.addImage(
          imagem,
          "JPEG",
          margemX,
          margemTopo,
          larguraUtil,
          alturaMm,
          undefined,
          "FAST"
        );

        // Cabeçalho discreto a partir da segunda página.
        if (indice > 0) {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8);
          pdf.setTextColor(23, 54, 93);
          pdf.text(
            "MBP Expert AI • Relatório Técnico de Inspeção",
            margemX,
            6.5
          );
        }

        // Rodapé profissional em todas as páginas.
        pdf.setDrawColor(210, 218, 229);
        pdf.line(
          margemX,
          paginaAltura - 8.5,
          paginaLargura - margemX,
          paginaAltura - 8.5
        );

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(100, 116, 139);

        const empresaRodape =
          empresaVisita.nomeFantasia ||
          empresaVisita.razaoSocial ||
          "Visita técnica";

        pdf.text(
          empresaRodape.slice(0, 62),
          margemX,
          paginaAltura - 4.5
        );

        pdf.text(
          `Página ${indice + 1} de ${totalPaginas}`,
          paginaLargura - margemX,
          paginaAltura - 4.5,
          { align: "right" }
        );
      });

      const nomeEmpresa = (
        empresaVisita.nomeFantasia ||
        empresaVisita.razaoSocial ||
        "empresa"
      )
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();

      const dataArquivo = (visitaAtual.data || "")
        .replace(/\//g, "-")
        .replace(/\s+/g, "-");

      pdf.save(
        `relatorio-tecnico-${nomeEmpresa || "visita"}-${dataArquivo || "inspecao"}.pdf`
      );
    } catch (error) {
      console.error("Falha ao gerar PDF:", error);
      const detalhe =
        error instanceof Error ? error.message : "erro desconhecido";
      window.alert(
        `Não foi possível gerar o PDF automaticamente. Detalhe: ${detalhe}. Use “Imprimir” como alternativa enquanto corrigimos.`
      );
    } finally {
      elemento.classList.remove("pdf-export");
      setGerandoPdf(false);
    }
  }

  function gerarConclusaoAutomatica() {
    const partes: string[] = [];

    partes.push(
      `A inspeção avaliou ${itensAvaliadosVisita} item(ns), com ${conformesVisita} conforme(s) e ${naoConformesVisita} não conforme(s), resultando em ${percentualConformidade}% de conformidade entre os itens avaliados.`
    );

    if (ncsVisita.length === 0) {
      partes.push("Não foram registradas não conformidades nesta visita.");
    } else {
      partes.push(
        `Foram registradas ${ncsVisita.length} não conformidade(s): ${ncsResolvidas} resolvida(s), ${ncsEmTratamento} em tratamento e ${ncsSomenteAbertas} aberta(s).`
      );

      if (ncsCriticasVisita > 0 || ncsImportantesVisita > 0) {
        partes.push(
          `Entre os achados, ${ncsCriticasVisita} foram classificados como críticos e ${ncsImportantesVisita} como importantes.`
        );
      }

      if (acoesDefinidas === ncsVisita.length) {
        partes.push("Todas as não conformidades possuem ação corretiva definida.");
      } else {
        partes.push(
          `${ncsVisita.length - acoesDefinidas} não conformidade(s) ainda necessita(m) de definição de ação corretiva.`
        );
      }
    }

    if (evidenciasVisita.length > 0) {
      partes.push(
        `Foram vinculadas ${evidenciasVisita.length} evidência(s) aos registros da inspeção para fins de rastreabilidade.`
      );
    }

    if (pendentesVisita > 0) {
      partes.push(
        `A inspeção permanece parcial, com ${pendentesVisita} item(ns) pendente(s) no checklist.`
      );
    } else {
      partes.push("O checklist foi integralmente respondido.");
    }

    return partes.join(" ");
  }

  function atualizarConclusaoRelatorio(valor: string) {
    if (!visitaAtual) return;
    if (!exigirPermissao("relatorios.aprovar", visitaAtual.empresaId)) return;

    setDb((atual) => ({
      ...atual,
      visitas: atual.visitas.map((visita) =>
        visita.id === visitaAtual.id
          ? { ...visita, conclusao: valor }
          : visita
      ),
    }));
  }

  function atualizarResponsavelRelatorio(nome: string, identificacao?: string) {
    if (!visitaAtual) return;
    if (!exigirPermissao("relatorios.aprovar", visitaAtual.empresaId)) return;

    setDb((atual) => ({
      ...atual,
      visitas: atual.visitas.map((visita) =>
        visita.id === visitaAtual.id
          ? {
              ...visita,
              responsavel: nome,
              responsavelIdentificacao:
                identificacao !== undefined
                  ? identificacao
                  : visita.responsavelIdentificacao,
            }
          : visita
      ),
    }));
  }

  function estadosIguais(a: unknown, b: unknown) {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }

  function registrarConfirmacaoNuvem(updatedAt?: string | null) {
    ultimaNuvemVersaoRef.current = updatedAt || null;
    ultimaNuvemRef.current = updatedAt
      ? new Date(updatedAt).getTime()
      : Date.now();

    sincronizacaoOk();
    setSyncStatus("sincronizado");
    setSyncAtualizadoEm(
      updatedAt
        ? new Date(updatedAt).toLocaleString("pt-BR")
        : new Date().toLocaleString("pt-BR")
    );
  }

  async function confirmarEstadoSalvoNaNuvem(novo: AppDB) {
    try {
      const response = await fetch("/api/state", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) return false;

      const cloud = await response.json();
      if (!cloud?.configured || !cloud?.data) return false;

      if (!estadosIguais(cloud.data, novo)) return false;

      registrarConfirmacaoNuvem(cloud.updatedAt || null);
      return true;
    } catch {
      return false;
    }
  }

  async function salvarEstadoImediato(novo: AppDB) {
    // Finalizar/reabrir são ações críticas. Enquanto esta gravação está em
    // andamento, pausamos o autosave e a consulta periódica para que eles não
    // disputem a mesma versão da nuvem.
    salvamentoImediatoRef.current = true;
    salvarDBLocal(novo);
    setDb(novo);
    setSyncStatus("conectando");

    let ultimoErro: unknown = null;

    try {
      for (let tentativa = 1; tentativa <= 3; tentativa += 1) {
        try {
          const response = await fetch("/api/state", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              data: novo,
              expectedUpdatedAt: ultimaNuvemVersaoRef.current,
            }),
          });

          if (response.status === 409) {
            const conflito = await response.json();

            // Pode ocorrer quando uma resposta anterior foi perdida, mas o
            // servidor já gravou exatamente esta alteração. Nesse caso não é
            // conflito real: confirmamos o estado e seguimos normalmente.
            if (
              conflito?.data &&
              typeof conflito.data === "object" &&
              estadosIguais(conflito.data, novo)
            ) {
              registrarConfirmacaoNuvem(conflito.updatedAt || null);
              return true;
            }

            if (conflito?.data && typeof conflito.data === "object") {
              aplicarEstadoDaNuvem(conflito);
              sincronizacaoOk();
              setSyncStatus("sincronizado");
              setSyncAtualizadoEm(
                conflito.updatedAt
                  ? new Date(conflito.updatedAt).toLocaleString("pt-BR")
                  : ""
              );
            }

            window.alert(
              "Outro dispositivo alterou estes dados antes desta ação. A versão mais recente da nuvem foi carregada. Confira a visita e repita a ação."
            );
            return false;
          }

          if (!response.ok) {
            throw new Error(`Falha ao salvar na nuvem (${response.status})`);
          }

          const result = await response.json();
          registrarConfirmacaoNuvem(result.updatedAt || null);
          return true;
        } catch (error) {
          ultimoErro = error;
          console.warn(
            `Tentativa ${tentativa} de gravação imediata não confirmada:`,
            error
          );

          // Se a conexão caiu depois que o servidor recebeu o PUT, a resposta
          // pode ter se perdido. Antes de chamar isso de erro, consultamos a
          // nuvem e verificamos se o conteúdo já é exatamente o esperado.
          if (await confirmarEstadoSalvoNaNuvem(novo)) {
            return true;
          }

          if (tentativa < 3) {
            await new Promise((resolve) =>
              window.setTimeout(resolve, 800 * tentativa)
            );
            setSyncStatus("conectando");
          }
        }
      }

      console.error(
        "Falha ao salvar alteração na nuvem após novas tentativas:",
        ultimoErro
      );
      registrarFalhaSincronizacao();
      window.alert(
        "A alteração foi salva neste dispositivo e continua pendente de sincronização. O sistema tentou confirmar a gravação na nuvem mais de uma vez, mas ainda não conseguiu. Mantenha esta página aberta e verifique a conexão."
      );
      return false;
    } finally {
      salvamentoImediatoRef.current = false;
    }
  }

  async function finalizarInspecao() {
    if (!visitaAtual) return;
    if (!exigirPermissao("visitas.concluir", visitaAtual.empresaId)) return;

    // Uma inspeção só pode ser marcada como concluída quando todos os itens
    // do checklist dos ambientes selecionados tiverem sido avaliados.
    // Não conformidades podem permanecer abertas, pois seguem para o pós-visita.
    if (pendentesVisita > 0) {
      window.alert(
        `Não é possível finalizar esta inspeção ainda.\n\n` +
        `Existem ${pendentesVisita} item(ns) pendente(s) no checklist.\n\n` +
        `Avalie todos os itens selecionados como Conforme, Não conforme ou Não se aplica. ` +
        `Depois disso, a inspeção poderá ser concluída normalmente.`
      );
      return;
    }

    const alertas: string[] = [];
    if (ncsSomenteAbertas > 0) alertas.push(`${ncsSomenteAbertas} não conformidade(s) seguirá(ão) aberta(s) para acompanhamento`);
    if (ncsSemAcao > 0) alertas.push(`${ncsSemAcao} não conformidade(s) ainda está(ão) sem ação corretiva definida`);
    if (analisesIAPendentes > 0) alertas.push(`${analisesIAPendentes} sugestão(ões) de análise fotográfica por IA ainda aguarda(m) confirmação ou descarte`);
    if (!(visitaAtual.conclusao || "").trim()) alertas.push("conclusão / observação final não preenchida — será gerada uma sugestão automática");

    const ressalvas = alertas.length
      ? `\n\nAtenção:\n• ${alertas.join("\n• ")}\n\nEssas pendências não impedem o encerramento da inspeção e continuarão disponíveis no pós-visita.`
      : "";
    if (!window.confirm(`Finalizar esta inspeção?${ressalvas}\n\nA visita ficará marcada como Concluída.`)) return;

    const agora = new Date().toISOString();
    const novo: AppDB = {
      ...db,
      visitas: db.visitas.map((visita) =>
        visita.id === visitaAtual.id
          ? ({
              ...registrarMudancaStatus(
                visita,
                "Concluída",
                "Inspeção finalizada pelo usuário.",
                "Relatório",
                agora
              ),
              conclusao: (visita.conclusao || "").trim() || gerarConclusaoAutomatica(),
            } as any)
          : visita
      ),
    };

    await salvarEstadoImediato(novo);
    setVisitaAtualId(null);
    setView("visitas");
  }

  async function reabrirInspecao() {
    if (!visitaAtual) return;
    if (!exigirPermissao("visitas.concluir", visitaAtual.empresaId)) return;

    const confirmado = window.confirm(
      "Reabrir esta inspeção?\n\n" +
      "A visita voltará para Em andamento e poderá ser alterada novamente. " +
      "O encerramento anterior permanecerá registrado no histórico de rastreabilidade."
    );
    if (!confirmado) return;

    const agora = new Date().toISOString();
    const novo: AppDB = {
      ...db,
      visitas: db.visitas.map((visita) =>
        visita.id === visitaAtual.id
          ? registrarMudancaStatus(
              visita,
              "Em andamento",
              "Inspeção reaberta pelo usuário.",
              "Relatório",
              agora
            )
          : visita
      ),
    };

    await salvarEstadoImediato(novo);
  }

  async function buscar() {
    if (!exigirPermissao("empresas.editar")) return;
    const c = form.cnpj.replace(/\D/g, "");
    if (c.length !== 14) {
      setMsg("Informe um CNPJ com 14 dígitos.");
      return;
    }
    setLoading(true);
    setMsg("Buscando...");
    try {
      const r = await fetch(`/api/cnpj/${c}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Não encontrado");
      setForm((f) => ({
        ...f,
        cnpj: d.cnpj || c,
        nomeFantasia: d.nome_fantasia || "",
        razaoSocial: d.razao_social || "",
        situacao: d.descricao_situacao_cadastral || "",
        cnae: String(d.cnae_fiscal || ""),
        cnaeDescricao: d.cnae_fiscal_descricao || "",
        logradouro: d.logradouro || "",
        numero: d.numero || "",
        complemento: d.complemento || "",
        bairro: d.bairro || "",
        cep: d.cep || "",
        municipio: d.municipio || "",
        uf: d.uf || "",
        telefone: d.ddd_telefone_1 || "",
        email: d.email || "",
      }));
      setMsg("Empresa encontrada. Confira os dados.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha na consulta");
    } finally {
      setLoading(false);
    }
  }

  function salvarEmpresa() {
    if (!exigirPermissao("empresas.editar")) return;
    const id = editingEmpresaId || form.cnpj.replace(/\D/g, "") || crypto.randomUUID();
    const anterior = editingEmpresaId ? db.empresas[editingEmpresaId] : undefined;
    const emp: Empresa = {
      id,
      ...form,
      cnpj: editingEmpresaId ? (anterior?.cnpj || form.cnpj) : form.cnpj,
      nomeFantasia: form.nomeFantasia || form.razaoSocial || "Sem nome",
      horariosFuncionamento: anterior?.horariosFuncionamento,
      responsabilidadesManual: normalizarResponsabilidades(responsabilidadesEmpresa),
      setoresManual: setoresEmpresa,
      modelosQuestionarioAmbientes: criarModelosQuestionarioAmbientes(
        setoresEmpresa,
        anterior?.modelosQuestionarioAmbientes
      ),
      equipamentosSetores: normalizarEquipamentos(equipamentosEmpresa),
      fluxosOperacionais: adequarFluxosAosSetores(fluxosEmpresa, setoresEmpresa),
      programasControleQualidade: normalizarProgramasControle(programasEmpresa),
      pops: normalizarPops(popsEmpresa),
      criadoEm: anterior?.criadoEm || new Date().toISOString(),
    };
    setDb((o) => ({
      ...o,
      empresaAtualId: id,
      empresas: { ...o.empresas, [id]: emp },
      visitas: o.visitas.map((visita) => {
        if (visita.empresaId !== id) return visita;
        const possuiRespostas = checklistPossuiRespostas(visita.checklist);
        return possuiRespostas
          ? visita
          : { ...visita, checklist: [], checklistVersao: CHECKLIST_VERSAO_ATUAL };
      }),
    }));
    setAssinaturaEmpresaSalva(assinaturaEmpresaAtual);
    setEditingEmpresaId(id);
    setEmpresaSecao(null);
    setShowEmpresaForm(true);
    setMsg("Alterações salvas com sucesso.");
    setView("empresas");
  }

  function editarEmpresa(empresa: Empresa) {
    if (!exigirPermissao("empresas.editar", empresa.id)) return;
    const formCarregado = {
      cnpj: empresa.cnpj || "",
      nomeFantasia: empresa.nomeFantasia || "",
      razaoSocial: empresa.razaoSocial || "",
      situacao: empresa.situacao || "",
      cnae: empresa.cnae || "",
      cnaeDescricao: empresa.cnaeDescricao || "",
      tipo: empresa.tipo || "Outro",
      logradouro: empresa.logradouro || "",
      numero: empresa.numero || "",
      complemento: empresa.complemento || "",
      bairro: empresa.bairro || "",
      cep: empresa.cep || "",
      municipio: empresa.municipio || "",
      uf: empresa.uf || "",
      telefone: empresa.telefone || "",
      email: empresa.email || "",
      responsavel: empresa.responsavel || "",
      horarioFuncionamento:
        empresa.horarioFuncionamento ||
        (empresa.horariosFuncionamento?.some((item) => item.aberto)
          ? resumirHorarioFuncionamento(empresa.horariosFuncionamento)
          : ""),
      atividadeDescricao: empresa.atividadeDescricao || "",
      cargoResponsavel: empresa.cargoResponsavel || "",
      consultorNome: empresa.consultorNome || "",
      consultorCpfCnpj: empresa.consultorCpfCnpj || "",
      consultorEndereco: empresa.consultorEndereco || "",
      consultorTelefone: empresa.consultorTelefone || "",
      consultorRegistro: empresa.consultorRegistro || "",
      dataElaboracaoManual: empresa.dataElaboracaoManual || "",
      elaboradoPor: empresa.elaboradoPor || "",
      revisadoPor: empresa.revisadoPor || "",
      aprovadoPor: empresa.aprovadoPor || "",
    };
    const responsabilidadesCarregadas = normalizarResponsabilidades(
      empresa.responsabilidadesManual
    );
    const setoresCarregados = normalizarListaAmbientesReais(empresa.setoresManual);
    const equipamentosCarregados = normalizarEquipamentos(empresa.equipamentosSetores);
    const fluxosCarregados = adequarFluxosAosSetores(
      empresa.fluxosOperacionais,
      setoresCarregados
    );
    const programasCarregados = normalizarProgramasControle(
      empresa.programasControleQualidade
    );
    const popsCarregados = normalizarPops(empresa.pops);
    setForm(formCarregado);
    setResponsabilidadesEmpresa(responsabilidadesCarregadas);
    setSetoresEmpresa(setoresCarregados);
    setEquipamentosEmpresa(equipamentosCarregados);
    setFluxosEmpresa(fluxosCarregados);
    setProgramasEmpresa(programasCarregados);
    setPopsEmpresa(popsCarregados);
    setAssinaturaEmpresaSalva(assinaturaEdicaoEmpresa({
      form: formCarregado,
      responsabilidades: responsabilidadesCarregadas,
      setores: setoresCarregados,
      equipamentos: equipamentosCarregados,
      fluxos: fluxosCarregados,
      programas: programasCarregados,
      pops: popsCarregados,
    }));
    setEditingEmpresaId(empresa.id);
    setEmpresaSecao(null);
    setMsg("");
    setShowEmpresaForm(true);
    setView("empresas");
  }

  function novaVisita() {
    if (!exigirPermissao("visitas.criar", atual?.id)) return;
    if (!atual) {
      setView("empresas");
      return;
    }
    setVf({ data: hojeISO(), responsavel: "", responsavelIdentificacao: "", observacoes: "" });
    setShowVisitaForm(true);
    setView("visitas");
  }

  function salvarVisita() {
    if (!atual || criandoVisita) return;
    if (!exigirPermissao("visitas.criar", atual.id)) return;
    if (!vf.responsavel.trim()) {
      window.alert("Informe o responsável pela visita antes de criar a inspeção.");
      return;
    }
    setCriandoVisita(true);
    const v: Visita = {
      id: crypto.randomUUID(),
      empresaId: atual.id,
      data: vf.data || hojeISO(),
      status: "Em andamento",
      responsavel: vf.responsavel.trim(),
      responsavelIdentificacao: vf.responsavelIdentificacao.trim(),
      observacoes: vf.observacoes.trim(),
      conclusao: "",
      progresso: 0,
      criadoEm: new Date().toISOString(),
      ambientes: [],
      checklist: [],
      checklistVersao: CHECKLIST_VERSAO_ATUAL,
      avaliacoesEquipamentos: [],
      modelosQuestionarioAmbientes: {},
    };
    setDb((o) => ({ ...o, visitas: [v, ...o.visitas] }));
    setShowVisitaForm(false);
    setVisitaAtualId(v.id);
    setView("visita");
    setTimeout(() => setCriandoVisita(false), 500);
  }

  function continuar(id: string) {
    const original = db.visitas.find((x) => x.id === id);
    const v = original ? migrarVisitaParaChecklistManual(original, CHECKLIST_VERSAO_ATUAL, true) : undefined;
    if (!v) return;
    if (!exigirPermissao("visitas.executar", v.empresaId)) return;
    setDb((o) => ({
      ...o,
      empresaAtualId: v.empresaId,
      visitas: o.visitas.map((visita) => visita.id === v.id ? v : visita),
    }));
    setVisitaAtualId(id);
    setView("visita");
  }

  function abrirAmbientes() {
    if (!visitaAtual) return;
    if (!exigirPermissao("visitas.executar", visitaAtual.empresaId)) return;
    setAmbientesSelecionados(
      visitaAtual.ambientes?.length
        ? visitaAtual.ambientes
        : empresaVisita?.setoresManual || []
    );
    const ambientesIniciais = visitaAtual.ambientes?.length
      ? visitaAtual.ambientes
      : empresaVisita?.setoresManual || [];
    setModelosAmbientesSelecionados(
      criarModelosQuestionarioAmbientes(
        ambientesIniciais,
        visitaAtual.modelosQuestionarioAmbientes || empresaVisita?.modelosQuestionarioAmbientes
      )
    );
    setAmbientePersonalizado("");
    setStatusAmbientes("");
    setView("ambientes");
  }

  function atualizarAmbientesDaVisita(
    proximos: string[],
    modelos = modelosAmbientesSelecionados
  ) {
    if (!visitaAtual) return;
    const proximosModelos = criarModelosQuestionarioAmbientes(proximos, modelos);
    setAmbientesSelecionados(proximos);
    setModelosAmbientesSelecionados(proximosModelos);
    setDb((o) => ({
      ...o,
      visitas: o.visitas.map((visita) => {
        if (visita.id !== visitaAtual.id) return visita;
        const checklistExistente = visita.checklist || [];
        const possuiRespostas = checklistPossuiRespostas(checklistExistente);
        if (!possuiRespostas) {
          return {
            ...visita,
            ambientes: proximos,
            modelosQuestionarioAmbientes: proximosModelos,
            checklist: [],
            checklistVersao: CHECKLIST_VERSAO_ATUAL,
            progresso: proximos.length ? Math.max(visita.progresso || 0, 15) : 0,
          };
        }

        const adicionados = proximos.filter(
          (ambiente) => !(visita.ambientes || []).includes(ambiente)
        );
        const preservados = checklistExistente.filter(
          (item) =>
            item.ambiente === AMBIENTE_PROGRAMAS_CONTROLE ||
            proximos.includes(item.ambiente)
        );
        const novos = criarChecklist(
          adicionados,
          empresaVisita?.fluxosOperacionais,
          undefined,
          proximosModelos
        );
        return {
          ...visita,
          ambientes: proximos,
          modelosQuestionarioAmbientes: proximosModelos,
          checklist: [...preservados, ...novos],
          checklistVersao: CHECKLIST_VERSAO_ATUAL,
          progresso: proximos.length ? Math.max(visita.progresso || 0, 15) : 0,
        };
      }),
    }));
    setStatusAmbientes("Ambientes atualizados");
  }

  function toggleAmbiente(nome: string) {
    const removendo = ambientesSelecionados.includes(nome);
    if (removendo) {
      const possuiRegistro = (visitaAtual?.checklist || []).some(
        (item) =>
          item.ambiente === nome &&
          checklistPossuiRespostas([item])
      );
      if (
        possuiRegistro &&
        !window.confirm(`O ambiente “${nome}” possui respostas. Remover mesmo assim?`)
      ) return;
    }
    atualizarAmbientesDaVisita(
      removendo
        ? ambientesSelecionados.filter((item) => item !== nome)
        : [...ambientesSelecionados, nome]
    );
  }

  function adicionarPersonalizado() {
    const nome = ambientePersonalizado.trim();
    if (!nome) return;
    if (!ambientesSelecionados.includes(nome)) {
      atualizarAmbientesDaVisita([...ambientesSelecionados, nome]);
    }
    setAmbientePersonalizado("");
  }

  function atualizarModeloQuestionarioAmbiente(ambiente: string, modelo: string) {
    if (!visitaAtual) return;
    const proximosModelos = { ...modelosAmbientesSelecionados, [ambiente]: modelo };
    const possuiRespostas = checklistPossuiRespostas(
      (visitaAtual.checklist || []).filter((item) => item.ambiente === ambiente)
    );
    if (possuiRespostas) {
      window.alert("Este ambiente já possui respostas. O modelo não pode ser trocado sem preservar a avaliação realizada.");
      return;
    }
    setModelosAmbientesSelecionados(proximosModelos);
    setDb((atual) => ({
      ...atual,
      visitas: atual.visitas.map((visita) =>
        visita.id === visitaAtual.id
          ? { ...visita, modelosQuestionarioAmbientes: proximosModelos, checklist: (visita.checklist || []).filter((item) => item.ambiente !== ambiente), checklistVersao: CHECKLIST_VERSAO_ATUAL }
          : visita
      ),
    }));
    setStatusAmbientes("Modelo atualizado");
  }

  function aplicarModeloDetalhadoRestaurante() {
    if (!visitaAtual || !empresaVisita) return;
    if (checklistPossuiRespostas(visitaAtual.checklist)) {
      window.alert("Esta visita já possui respostas. Crie uma nova visita para aplicar a lista detalhada sem perder registros.");
      return;
    }
    const ambientes = [...AMBIENTES_DETALHADOS_RESTAURANTE];
    const modelos = criarModelosQuestionarioAmbientes(ambientes);
    setAmbientesSelecionados(ambientes);
    setModelosAmbientesSelecionados(modelos);
    setDb((atual) => ({
      ...atual,
      empresas: {
        ...atual.empresas,
        [empresaVisita.id]: {
          ...atual.empresas[empresaVisita.id],
          setoresManual: ambientes,
          modelosQuestionarioAmbientes: modelos,
        },
      },
      visitas: atual.visitas.map((visita) =>
        visita.id === visitaAtual.id
          ? { ...visita, ambientes, modelosQuestionarioAmbientes: modelos, checklist: [], checklistVersao: CHECKLIST_VERSAO_ATUAL }
          : visita
      ),
    }));
    setStatusAmbientes("Lista detalhada aplicada");
  }

  function salvarAmbientes() {
    if (
      visitaAtual &&
      JSON.stringify(visitaAtual.ambientes || []) !== JSON.stringify(ambientesSelecionados)
    ) {
      atualizarAmbientesDaVisita(ambientesSelecionados);
    }
    setView("visita");
  }

  function abrirChecklistNoAmbiente(ambienteInicial?: string) {
    if (!visitaAtual || !(visitaAtual.ambientes || []).length) return;
    if (!exigirPermissao("visitas.executar", visitaAtual.empresaId)) return;

    const visitaMigrada = migrarVisitaParaChecklistManual(visitaAtual, CHECKLIST_VERSAO_ATUAL, true);
    const checklistExistente = visitaMigrada.checklist || [];
    const possuiRespostas = checklistPossuiRespostas(checklistExistente);
    const precisaAtualizarModelo =
      (visitaMigrada.checklistVersao || 1) < CHECKLIST_VERSAO_ATUAL && !possuiRespostas;

    if (checklistExistente.length === 0 || precisaAtualizarModelo) {
      const novoChecklist = criarChecklist(
        visitaMigrada.ambientes || [],
        empresaVisita?.fluxosOperacionais,
        empresaVisita?.programasControleQualidade,
        visitaMigrada.modelosQuestionarioAmbientes || empresaVisita?.modelosQuestionarioAmbientes
      );
      setDb((o) => ({
        ...o,
        visitas: o.visitas.map((v) =>
          v.id === visitaMigrada.id
            ? { ...visitaMigrada, checklist: novoChecklist, checklistVersao: CHECKLIST_VERSAO_ATUAL }
            : v
        ),
      }));
    } else if (visitaMigrada !== visitaAtual) {
      setDb((o) => ({
        ...o,
        visitas: o.visitas.map((v) => v.id === visitaMigrada.id ? visitaMigrada : v),
      }));
    }

    const ambientesDaVisita = [
      ...(visitaMigrada.ambientes || []),
      ...(programasChecklistAtivos.length > 0 ? [AMBIENTE_PROGRAMAS_CONTROLE] : []),
    ];
    const itemRetomada = checklistExistente.find(
      (item) => item.id === ultimoItemChecklistId
    );
    const ambienteDestino =
      ambienteInicial && ambientesDaVisita.includes(ambienteInicial)
        ? ambienteInicial
        : itemRetomada && ambientesDaVisita.includes(itemRetomada.ambiente)
        ? itemRetomada.ambiente
        : ambientesDaVisita[0] || null;
    setAmbienteChecklistAtivo(ambienteDestino);
    setFiltroChecklistRapido("Todos");

    setView("checklist");
  }

  function abrirChecklist() {
    const primeiraPendente = (visitaAtual?.checklist || []).find(
      (item) => item.status === "Pendente"
    );
    if (primeiraPendente) {
      setUltimoItemChecklistId(primeiraPendente.id);
      abrirChecklistNoAmbiente(primeiraPendente.ambiente);
      setFiltroChecklistRapido("Pendentes");
      return;
    }
    abrirChecklistNoAmbiente();
  }

  function irParaProximaPendencia() {
    if (!visitaAtual) return;
    const checklist = visitaAtual.checklist || [];
    const pendentes = checklist.filter(
      (item) => item.status === "Pendente"
    );
    if (pendentes.length === 0) {
      window.alert("Não há perguntas pendentes nesta visita.");
      return;
    }

    const indiceAtual = ultimoItemChecklistId
      ? checklist.findIndex((item) => item.id === ultimoItemChecklistId)
      : -1;
    const proxima =
      (indiceAtual >= 0
        ? checklist.slice(indiceAtual + 1).find((item) => item.status === "Pendente")
        : undefined) || pendentes[0];
    setFiltroChecklistRapido("Pendentes");
    setAmbienteChecklistAtivo(proxima.ambiente);
    setUltimoItemChecklistId(proxima.id);
  }

  function rolarParaProximoItem(itemIdAtual: string) {
    if (!visitaAtual) return;

    const itensDoAmbiente = (visitaAtual.checklist || []).filter((item) => {
      if (item.ambiente !== ambienteChecklistAtivo) return false;
      if (filtroChecklistRapido === "Pendentes") return item.status === "Pendente";
      if (filtroChecklistRapido === "Não conformes") return item.status === "Não Conforme";
      return true;
    });
    const indiceAtual = itensDoAmbiente.findIndex((item) => item.id === itemIdAtual);

    if (indiceAtual < 0) return;

    const proximo = itensDoAmbiente[indiceAtual + 1];

    if (!proximo) {
      window.setTimeout(() => {
        const topoAmbiente = document.getElementById("checklist-ambiente-topo");
        topoAmbiente?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 180);
      return;
    }

    setUltimoItemChecklistId(proximo.id);
    window.setTimeout(() => {
      document
        .getElementById(`checklist-item-${proximo.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 180);
  }

  function atualizarQuantidadeEquipamento(equipamentoId: string, quantidade: number) {
    if (!visitaAtual || !empresaVisita) return;
    if (!exigirPermissao("visitas.executar", visitaAtual.empresaId)) return;
    const quantidadeNormalizada = Math.max(1, Number(quantidade) || 1);
    setDb((atual) => ({
      ...atual,
      empresas: {
        ...atual.empresas,
        [empresaVisita.id]: {
          ...atual.empresas[empresaVisita.id],
          equipamentosSetores: (atual.empresas[empresaVisita.id]?.equipamentosSetores || []).map(
            (equipamento) =>
              equipamento.id === equipamentoId
                ? { ...equipamento, quantidade: quantidadeNormalizada }
                : equipamento
          ),
        },
      },
    }));
  }

  function adicionarEquipamentoEncontradoNaVisita() {
    const nome = novoEquipamentoVisitaNome.trim();
    if (!visitaAtual || !empresaVisita || !ambienteChecklistAtivo || !nome) return;
    const quantidade = Math.max(1, Number(novoEquipamentoVisitaQuantidade) || 1);
    const equipamentoId = crypto.randomUUID();
    const equipamento: EquipamentoSetor = {
      id: equipamentoId,
      setor: ambienteChecklistAtivo,
      nome,
      quantidade,
      estado: "Não avaliado",
      observacao: "",
    };
    setDb((atual) => ({
      ...atual,
      empresas: {
        ...atual.empresas,
        [empresaVisita.id]: {
          ...atual.empresas[empresaVisita.id],
          equipamentosSetores: [
            ...(atual.empresas[empresaVisita.id]?.equipamentosSetores || []),
            equipamento,
          ],
        },
      },
    }));
    setNovoEquipamentoVisitaNome("");
    setNovoEquipamentoVisitaQuantidade("1");
  }

  function avancarParaProximoAmbiente() {
    if (
      pendentesAmbienteAtivo > 0 &&
      !window.confirm(
        `Ainda há ${pendentesAmbienteAtivo} pergunta(s) pendente(s) neste ambiente. Deseja avançar mesmo assim?`
      )
    ) return;
    const indiceAtual = ambientesChecklistVisita.findIndex(
      (ambiente) => ambiente === ambienteChecklistAtivo
    );
    const proximo = ambientesChecklistVisita[indiceAtual + 1];
    if (proximo) setAmbienteChecklistAtivo(proximo);
    else setView("visita");
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 120);
  }

  function atualizarChecklistItem(
    itemId: string,
    patch: Partial<Pick<ChecklistItem, "status" | "observacao">>
  ) {
    if (!visitaAtual) return;
    if (!exigirPermissao("visitas.executar", visitaAtual.empresaId)) return;

    setDb((o) => {
      let itemAtualizado: ChecklistItem | undefined;
      const visitasAtualizadas = o.visitas.map((v) => {
        if (v.id !== visitaAtual.id) return v;

        const novoChecklist = (v.checklist || []).map((item) => {
          if (item.id !== itemId) return item;

          const itemComMemoria = item as ChecklistItem & {
            observacaoNCMemoria?: string;
          };

          let patchNormalizado: any = { ...patch };

          // Ao sair de "Não Conforme", limpa a observação visível,
          // mas guarda internamente a última constatação para possível retorno.
          if (
            patch.status !== undefined &&
            patch.status !== "Não Conforme" &&
            patch.status !== "Pendente"
          ) {
            patchNormalizado = {
              ...patchNormalizado,
              observacaoNCMemoria:
                item.observacao ||
                itemComMemoria.observacaoNCMemoria ||
                "",
              observacao: "",
            };
          }

          // Ao voltar para "Não Conforme", restaura automaticamente
          // a última constatação registrada.
          if (patch.status === "Não Conforme") {
            patchNormalizado = {
              ...patchNormalizado,
              observacao:
                item.observacao ||
                itemComMemoria.observacaoNCMemoria ||
                "",
            };
          }

          // Enquanto estiver "Não Conforme", cada edição da observação
          // também atualiza a memória interna.
          if (
            patch.status === undefined &&
            patch.observacao !== undefined &&
            item.status === "Não Conforme"
          ) {
            patchNormalizado = {
              ...patchNormalizado,
              observacaoNCMemoria: patch.observacao,
            };
          }

          const atualizado = {
            ...item,
            ...patchNormalizado,
          } as ChecklistItem;

          itemAtualizado = atualizado;
          return atualizado;
        });

        const respondidosLocal = novoChecklist.filter((i) => i.status !== "Pendente").length;
        const pct = novoChecklist.length
          ? Math.round((respondidosLocal / novoChecklist.length) * 100)
          : 0;
        const progresso = Math.max(15, Math.min(55, 15 + Math.round(pct * 0.4)));

        return { ...v, checklist: novoChecklist, progresso };
      });

      let ncs = o.ncs || [];
      if (itemAtualizado) {
        const item = itemAtualizado as ChecklistItem;
        const idNc = `${visitaAtual.id}:${item.id}`;
        if (item.status === "Não Conforme") {
          const existente = ncs.find((nc) => nc.id === idNc);
          const nc = {
            id: idNc,
            empresaId: visitaAtual.empresaId,
            visitaId: visitaAtual.id,
            ambiente: item.ambiente,
            checklistItemId: item.id,
            titulo: item.titulo,
            categoria: item.categoria,
            criticidade: item.criticidade || "Rotina" as const,
            referencia: item.referencia || "",
            orientacao: item.orientacao || "",
            observacao: item.observacao || "",
            prioridade: item.criticidade || "Rotina",
            status: existente?.status || "Aberta" as const,
            inativaNoChecklist: false,
            criadoEm: existente?.criadoEm || new Date().toISOString(),
          };
          ncs = existente ? ncs.map((x) => x.id === idNc ? { ...x, ...nc } : x) : [nc, ...ncs];
        } else {
          // Não apaga a NC: apenas a retira dos módulos ativos. Se o item voltar
          // a "Não Conforme", todo o plano, evidências e histórico reaparecem.
          ncs = ncs.map((nc) =>
            nc.id === idNc ? { ...nc, inativaNoChecklist: true } : nc
          );
        }
      }

      return { ...o, visitas: visitasAtualizadas, ncs };
    });
  }

  function abrirEvidencias() {
    if (!visitaAtual) return;
    setEvidenciaDescricao("");
    setEvidenciaAmbiente((visitaAtual.ambientes || [])[0] || "");
    setEvidenciaChecklistItemId("");
    setEvidenciaNcId("");
    setEvidenciaMsg("");
    setView("evidencias");
  }

  function arquivoParaDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
      reader.readAsDataURL(file);
    });
  }

  async function comprimirFoto(file: File): Promise<string> {
    const maxDim = 1600;
    const alvo = 700 * 1024;

    // Object URL tende a ser mais confiável no Safari/iPhone para fotos
    // recém-capturadas pela câmera do que carregar uma data URL diretamente.
    const objectUrl = URL.createObjectURL(file);

    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();

        el.onload = () => resolve(el);
        el.onerror = () =>
          reject(new Error("O navegador não conseguiu abrir a foto capturada."));

        el.src = objectUrl;
      });

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (!width || !height) {
        throw new Error("A foto não possui dimensões válidas.");
      }

      if (width > maxDim || height > maxDim) {
        const escala = Math.min(maxDim / width, maxDim / height);
        width = Math.max(1, Math.round(width * escala));
        height = Math.max(1, Math.round(height * escala));
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Não foi possível preparar a foto.");

      ctx.drawImage(img, 0, 0, width, height);

      let qualidade = 0.82;
      let resultado = canvas.toDataURL("image/jpeg", qualidade);

      while (
        Math.ceil((resultado.length * 3) / 4) > alvo &&
        qualidade > 0.5
      ) {
        qualidade = Math.max(0.5, qualidade - 0.08);
        resultado = canvas.toDataURL("image/jpeg", qualidade);
      }

      if (!resultado || resultado === "data:,") {
        throw new Error("A conversão da foto falhou.");
      }

      return resultado;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function dataUrlParaBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl);
    if (!response.ok) throw new Error("Não foi possível preparar a foto para envio.");
    return await response.blob();
  }

  async function enviarArquivoParaBlob(
    conteudo: Blob | File,
    nomeArquivo: string,
    visitaId: string,
    evidenciaId: string
  ): Promise<{ pathname: string; url: string }> {
    const form = new FormData();
    form.append("file", conteudo, nomeArquivo);
    form.append("visitaId", visitaId);
    form.append("evidenciaId", evidenciaId);

    const response = await fetch("/api/evidencias/upload", {
      method: "POST",
      body: form,
    });

    const body = await response.json().catch(() => null);

    if (!response.ok || !body?.pathname) {
      throw new Error(
        body?.error || "Não foi possível enviar a evidência para o armazenamento."
      );
    }

    return {
      pathname: String(body.pathname),
      url: String(body.url || ""),
    };
  }

  function urlEvidencia(ev: Evidencia): string {
    if (ev.blobPathname) {
      return `/api/evidencias/file?pathname=${encodeURIComponent(
        ev.blobPathname
      )}`;
    }

    // Compatibilidade com evidências antigas já salvas em Base64.
    return ev.dataUrl || "";
  }

  function atualizarEvidenciaRegistrada(
    evidenciaId: string,
    atualizar: (evidencia: Evidencia) => Evidencia
  ) {
    setDb((atual) => {
      const novo: AppDB = {
        ...atual,
        evidencias: (atual.evidencias || []).map((evidencia) =>
          evidencia.id === evidenciaId ? atualizar(evidencia) : evidencia
        ),
      };
      salvarDBLocal(novo);
      return novo;
    });
  }

  function atualizarAnaliseRegistrada(
    evidenciaId: string,
    analiseId: string,
    atualizar: (analise: AnaliseFotoIA) => AnaliseFotoIA
  ) {
    atualizarEvidenciaRegistrada(evidenciaId, (evidencia) => ({
      ...evidencia,
      analisesIA: (evidencia.analisesIA || []).map((analise) =>
        analise.id === analiseId ? atualizar(analise) : analise
      ),
    }));
  }

  async function analisarFotoComIA(ev: Evidencia) {
    if (ev.tipo !== "Foto" || analiseIAEmAndamentoId) return;
    if (!exigirPermissao("ia.analisar", ev.empresaId)) return;
    if (!ev.blobPathname) {
      setAnaliseIAMensagens((atual) => ({
        ...atual,
        [ev.id]: "Esta foto é de uma versão antiga e precisa ser reenviada para análise.",
      }));
      return;
    }

    const privacidadeConfirmada = window.confirm(
      "Antes de enviar esta foto para análise por IA, confirme que você a revisou e que ela não contém rostos, crachás, documentos ou outros dados pessoais desnecessários.\n\nContinuar com a análise?"
    );
    if (!privacidadeConfirmada) return;

    const itemChecklist = (visitaAtual?.checklist || []).find(
      (item) => item.id === ev.checklistItemId
    );

    try {
      setAnaliseIAEmAndamentoId(ev.id);
      setAnaliseIAMensagens((atual) => ({
        ...atual,
        [ev.id]: "A IA está examinando a foto. Aguarde alguns instantes...",
      }));

      const response = await fetch("/api/evidencias/analisar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathname: ev.blobPathname,
          ambiente: ev.ambiente,
          descricao: ev.descricao,
          checklistTitulo: itemChecklist?.titulo,
          checklistCategoria: itemChecklist?.categoria,
          checklistReferencia: itemChecklist?.referencia,
          checklistStatus: itemChecklist?.status,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.resultado) {
        throw new Error(body?.error || "A análise não pôde ser concluída.");
      }

      const analise = registrarSugestaoFotoIA(
        body.resultado as ResultadoFotoIA,
        String(body.modelo || "modelo de visão")
      );
      atualizarEvidenciaRegistrada(ev.id, (evidencia) => ({
        ...evidencia,
        analisesIA: [...(evidencia.analisesIA || []), analise],
      }));
      setAnaliseIATextos((atual) => ({
        ...atual,
        [analise.id]: analise.textoRevisado,
      }));
      setAnaliseIAMensagens((atual) => ({
        ...atual,
        [ev.id]: "Sugestão gerada. Revise o texto antes de confirmar ou descarte a análise.",
      }));
    } catch (error) {
      setAnaliseIAMensagens((atual) => ({
        ...atual,
        [ev.id]: error instanceof Error ? error.message : "Falha ao analisar a foto.",
      }));
    } finally {
      setAnaliseIAEmAndamentoId(null);
    }
  }

  function confirmarAnaliseFoto(ev: Evidencia, analise: AnaliseFotoIA) {
    if (!exigirPermissao("ia.analisar", ev.empresaId)) return;
    try {
      const texto = analiseIATextos[analise.id] ?? analise.textoRevisado;
      const confirmada = confirmarSugestaoFotoIA(
        analise,
        texto,
        visitaAtual?.responsavel || ""
      );
      atualizarAnaliseRegistrada(ev.id, analise.id, () => confirmada);
      setAnaliseIAMensagens((atual) => ({
        ...atual,
        [ev.id]: "Análise confirmada pelo profissional e incluída na rastreabilidade da evidência.",
      }));
    } catch (error) {
      setAnaliseIAMensagens((atual) => ({
        ...atual,
        [ev.id]: error instanceof Error ? error.message : "Revise o texto antes de confirmar.",
      }));
    }
  }

  function descartarAnaliseFoto(ev: Evidencia, analise: AnaliseFotoIA) {
    if (!exigirPermissao("ia.analisar", ev.empresaId)) return;
    if (!window.confirm("Descartar esta sugestão da IA? Ela permanecerá registrada no histórico como descartada.")) {
      return;
    }
    const descartada = descartarSugestaoFotoIA(
      analise,
      visitaAtual?.responsavel || ""
    );
    atualizarAnaliseRegistrada(ev.id, analise.id, () => descartada);
    setAnaliseIAMensagens((atual) => ({
      ...atual,
      [ev.id]: "Sugestão descartada. Nenhum registro técnico foi alterado.",
    }));
  }

  async function adicionarEvidencia(
    file: File | undefined,
    tipo: "Foto" | "Áudio"
  ) {
    if (!file || !visitaAtual) return;
    if (!exigirPermissao("evidencias.adicionar", visitaAtual.empresaId)) return;

    if (tipo === "Áudio" && file.size > 3 * 1024 * 1024) {
      setEvidenciaMsg(
        "O áudio está muito grande para esta versão. Use um arquivo de até 3 MB."
      );
      return;
    }

    try {
      setEvidenciaMsg(
        tipo === "Foto" ? "Otimizando foto..." : "Processando áudio..."
      );

      const evidenciaId = crypto.randomUUID();
      const nomeArquivo =
        file.name || (tipo === "Foto" ? "foto.jpg" : "audio");
      const mimeType =
        tipo === "Foto" ? "image/jpeg" : file.type || "audio/mpeg";

      const conteudo: Blob | File =
        tipo === "Foto"
          ? await dataUrlParaBlob(await comprimirFoto(file))
          : file;

      setEvidenciaMsg("Enviando evidência para o armazenamento seguro...");

      const blob = await enviarArquivoParaBlob(
        conteudo,
        nomeArquivo,
        visitaAtual.id,
        evidenciaId
      );

      const ev: Evidencia = {
        id: evidenciaId,
        empresaId: visitaAtual.empresaId,
        visitaId: visitaAtual.id,
        tipo,
        nomeArquivo,
        mimeType,
        blobPathname: blob.pathname,
        blobUrl: blob.url,
        descricao: evidenciaDescricao.trim(),
        ambiente: evidenciaAmbiente || "",
        checklistItemId: evidenciaChecklistItemId || undefined,
        ncId: evidenciaNcId || undefined,
        criadoEm: new Date().toISOString(),
      };

      setDb((o) => {
        const atualizado: AppDB = {
          ...o,
          evidencias: [ev, ...(o.evidencias || [])],
          visitas: o.visitas.map((v) =>
            v.id === visitaAtual.id
              ? { ...v, progresso: Math.max(v.progresso || 0, 60) }
              : v
          ),
        };

        // Grava imediatamente no armazenamento local antes da sincronização.
        salvarDBLocal(atualizado);
        return atualizado;
      });

      setEvidenciaDescricao("");
      setEvidenciaMsg(
        tipo === "Foto"
          ? "Foto enviada ao armazenamento e registrada. Sincronizando dados..."
          : "Áudio enviado ao armazenamento e registrado. Sincronizando dados..."
      );
    } catch (error) {
      console.error("Falha ao adicionar evidência:", error);
      setEvidenciaMsg(
        tipo === "Foto"
          ? "A foto foi capturada, mas não pôde ser processada. Tente novamente."
          : "Não foi possível adicionar este áudio."
      );
    }
  }

  function excluirEvidencia(id: string) {
    const evidencia = (db.evidencias || []).find((ev) => ev.id === id);
    if (!evidencia) return;
    if (!exigirPermissao("evidencias.adicionar", evidencia.empresaId)) return;

    const ncRelacionada = evidencia.ncId
      ? (db.ncs || []).find((nc) => nc.id === evidencia.ncId)
      : undefined;

    if (ncRelacionada?.status === "Resolvida") {
      window.alert(
        "Esta evidência está vinculada a uma Não Conformidade resolvida e faz parte da rastreabilidade do fechamento.\n\n" +
        "Para alterá-la, reabra primeiro a Não Conformidade pelo Acompanhamento."
      );
      return;
    }

    const descricao = evidencia.descricao || evidencia.nomeArquivo || "evidência";
    if (
      !window.confirm(
        `Remover esta evidência do registro da visita?\n\n${descricao}\n\nEssa ação altera a documentação da inspeção.`
      )
    ) return;

    setDb((o) => ({
      ...o,
      evidencias: (o.evidencias || []).filter((ev) => ev.id !== id),
    }));
  }

  function atualizarNC(
    ncId: string,
    patch: {
      acaoCorretiva?: string;
      responsavelAcao?: string;
      prazo?: string;
      acompanhamento?: string;
      status?: "Aberta" | "Em tratamento" | "Resolvida";
    }
  ) {
    const ncAtualPermissao = (db.ncs || []).find((nc) => nc.id === ncId);
    if (
      !ncAtualPermissao ||
      !exigirPermissao("ncs.acompanhar", ncAtualPermissao.empresaId)
    ) return;
    if (patch.status === "Em tratamento") {
      const ncAtual = (db.ncs || []).find((nc) => nc.id === ncId);
      if (ncAtual) {
        const faltantes = [
          !ncAtual.acaoCorretiva?.trim() ? "Ação corretiva" : "",
          !ncAtual.responsavelAcao?.trim() ? "Responsável" : "",
          !ncAtual.prazo?.trim() ? "Prazo" : "",
        ].filter(Boolean);
        if (faltantes.length) {
          window.alert(
            `Antes de colocar esta Não Conformidade em tratamento, preencha: ${faltantes.join(", ")}.`
          );
          return;
        }
      }
    }

    setDb((o) => ({
      ...o,
      ncs: (o.ncs || []).map((nc) =>
        nc.id === ncId ? { ...nc, ...patch } : nc
      ),
    }));
  }

  function registrarAcompanhamento(ncId: string) {
    const ncPermissao = (db.ncs || []).find((nc) => nc.id === ncId);
    if (!ncPermissao || !exigirPermissao("ncs.acompanhar", ncPermissao.empresaId)) return;
    const texto = (textoAcompanhamento[ncId] || "").trim();

    if (!texto) {
      window.alert("Digite uma atualização antes de registrar.");
      return;
    }

    const ncAtual = (db.ncs || []).find((nc) => nc.id === ncId);
    if (!ncAtual) return;

    const statusFinal = statusAcompanhamento[ncId] || ncAtual.status;
    const evidenciasDaNc = (db.evidencias || []).filter((ev) => ev.ncId === ncId);

    if (statusFinal === "Em tratamento") {
      const faltantes = [
        !ncAtual.acaoCorretiva?.trim() ? "Ação corretiva" : "",
        !ncAtual.responsavelAcao?.trim() ? "Responsável" : "",
        !ncAtual.prazo?.trim() ? "Prazo" : "",
      ].filter(Boolean);

      if (faltantes.length) {
        window.alert(
          `Antes de colocar esta Não Conformidade em tratamento, preencha: ${faltantes.join(", ")}.`
        );
        return;
      }
    }

    if (statusFinal === "Resolvida") {
      const historicoAtual = ncAtual.historicoAcompanhamento || [];
      let indiceUltimaResolucao = -1;
      historicoAtual.forEach((item, indice) => {
        if (item.status === "Resolvida") indiceUltimaResolucao = indice;
      });
      const reaberturaDepoisDaResolucao =
        indiceUltimaResolucao >= 0
          ? historicoAtual
              .slice(indiceUltimaResolucao + 1)
              .find((item) => item.status !== "Resolvida")
          : undefined;
      const exigeNovaEvidencia = !!reaberturaDepoisDaResolucao;
      const possuiEvidenciaNova = exigeNovaEvidencia
        ? evidenciasDaNc.some(
            (ev) =>
              new Date(ev.criadoEm).getTime() >
              new Date(reaberturaDepoisDaResolucao!.criadoEm).getTime()
          )
        : evidenciasDaNc.length > 0;

      const faltantes = [
        !ncAtual.acaoCorretiva?.trim() ? "Ação corretiva" : "",
        !ncAtual.responsavelAcao?.trim() ? "Responsável" : "",
        !ncAtual.prazo?.trim() ? "Prazo" : "",
        !possuiEvidenciaNova
          ? exigeNovaEvidencia
            ? "pelo menos uma nova evidência registrada após a reabertura"
            : "pelo menos uma evidência da correção"
          : "",
      ].filter(Boolean);

      if (faltantes.length) {
        window.alert(
          `Não é possível concluir esta Não Conformidade. Preencha/vincule: ${faltantes.join(", ")}.`
        );
        return;
      }
    }

    const agora = new Date().toISOString();
    const concluidaAposPrazo =
      statusFinal === "Resolvida" &&
      situacaoPrazoNC(ncAtual.prazo, "Em tratamento").label === "Vencida";
    const observacaoHistorico = concluidaAposPrazo
      ? `${texto} • Concluída após o prazo. Prazo original: ${fdata(
          ncAtual.prazo || ""
        )} | Conclusão: ${new Date(agora).toLocaleString("pt-BR")}.`
      : texto;

    setDb((o) => ({
      ...o,
      ncs: (o.ncs || []).map((nc) => {
        if (nc.id !== ncId) return nc;

        const historico = [
          ...(nc.historicoAcompanhamento || []),
          {
            id: crypto.randomUUID(),
            criadoEm: agora,
            observacao: observacaoHistorico,
            status: statusFinal,
          },
        ];

        return {
          ...nc,
          status: statusFinal,
          acompanhamento: texto,
          resolvidaEm: statusFinal === "Resolvida" ? agora : undefined,
          historicoAcompanhamento: historico,
        };
      }),
    }));

    setTextoAcompanhamento((o) => ({ ...o, [ncId]: "" }));
    setStatusAcompanhamento((o) => {
      const novo = { ...o };
      delete novo[ncId];
      return novo;
    });
  }

  async function concluir(id: string) {
    const visitaPermissao = db.visitas.find((item) => item.id === id);
    if (
      !visitaPermissao ||
      !exigirPermissao("visitas.concluir", visitaPermissao.empresaId)
    ) return;
    const pendentesIA = (db.evidencias || [])
      .filter((ev) => ev.visitaId === id)
      .reduce(
        (total, ev) =>
          total + (ev.analisesIA || []).filter((analise) => analise.status === "Aguardando revisão").length,
        0
      );
    if (
      pendentesIA > 0 &&
      !window.confirm(
        `Esta visita possui ${pendentesIA} sugestão(ões) de análise fotográfica por IA ainda sem revisão.\n\n` +
        "Elas não serão apresentadas como conclusão técnica no relatório. Deseja concluir mesmo assim?"
      )
    ) {
      return;
    }

    const agora = new Date().toISOString();
    const novo: AppDB = {
      ...db,
      visitas: db.visitas.map((v) =>
        v.id === id
          ? {
              ...registrarMudancaStatus(
                v,
                "Concluída",
                "Inspeção finalizada pelo usuário.",
                "Lista de visitas",
                agora
              ),
              progresso: 100,
            }
          : v
      ),
    };

    await salvarEstadoImediato(novo);
    if (visitaAtualId === id) {
      setVisitaAtualId(null);
    }
  }

  async function reabrir(id: string) {
    const visitaPermissao = db.visitas.find((item) => item.id === id);
    if (
      !visitaPermissao ||
      !exigirPermissao("visitas.concluir", visitaPermissao.empresaId)
    ) return;
    const agora = new Date().toISOString();
    const novo: AppDB = {
      ...db,
      visitas: db.visitas.map((v) =>
        v.id === id
          ? {
              ...registrarMudancaStatus(
                v,
                "Em andamento",
                "Inspeção reaberta pelo usuário.",
                "Lista de visitas",
                agora
              ),
              progresso: Math.min(v.progresso || 0, 90),
            }
          : v
      ),
    };

    await salvarEstadoImediato(novo);
  }

  function excluir(id: string) {
    const visita = db.visitas.find((v) => v.id === id);
    if (!visita) return;
    if (!exigirPermissao("visitas.concluir", visita.empresaId)) return;

    const respostas = (visita.checklist || []).filter(
      (item) => item.status !== "Pendente"
    ).length;
    const ncsLigadas = (db.ncs || []).filter((nc) => nc.visitaId === id).length;
    const evidenciasLigadas = (db.evidencias || []).filter(
      (ev) => ev.visitaId === id
    ).length;

    if (
      respostas > 0 ||
      ncsLigadas > 0 ||
      evidenciasLigadas > 0 ||
      visita.status === "Concluída"
    ) {
      window.alert(
        "Esta visita já possui registros e foi protegida contra exclusão acidental.\n\n" +
        `Respostas: ${respostas}\nNão conformidades: ${ncsLigadas}\nEvidências: ${evidenciasLigadas}\n\n` +
        "Nesta versão, somente visitas vazias podem ser excluídas."
      );
      return;
    }

    const digitado = window.prompt(
      'Esta visita ainda está vazia. Para excluí-la definitivamente, digite EXCLUIR:'
    );

    if (digitado !== "EXCLUIR") return;

    setDb((o) => ({ ...o, visitas: o.visitas.filter((v) => v.id !== id) }));
    if (visitaAtualId === id) {
      setVisitaAtualId(null);
      setView("visitas");
    }
  }

  function salvarUsuarioPreparacao(
    dados: DadosUsuarioPreparacao,
    usuarioId?: string
  ): boolean {
    if (!exigirPermissao("usuarios.gerenciar")) return false;
    try {
      const agora = new Date().toISOString();
      const existente = usuarioId
        ? db.usuarios.find((usuario) => usuario.id === usuarioId)
        : undefined;
      if (usuarioId && !existente) throw new Error("Usuário preparado não encontrado.");

      const usuario = existente
        ? atualizarUsuarioPreparacao(existente, dados, db.usuarios, agora)
        : criarUsuarioPreparacao(dados, db.usuarios, agora);
      const registro = criarRegistroAuditoria(
        {
          usuarioId: "preparacao-sistema",
          usuarioNome: "Preparação do sistema",
          acao: existente ? "usuario.preparacao_atualizada" : "usuario.preparado",
          entidade: "Usuário",
          entidadeId: usuario.id,
          detalhes: `${usuario.nome} • ${usuario.perfil} • convite ainda não enviado.`,
        },
        agora
      );
      const novo: AppDB = {
        ...db,
        usuarios: existente
          ? db.usuarios.map((item) => item.id === usuario.id ? usuario : item)
          : [usuario, ...db.usuarios],
        registrosAuditoria: [...db.registrosAuditoria, registro],
      };
      salvarDBLocal(novo);
      setDb(novo);
      return true;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Não foi possível preparar o usuário.");
      return false;
    }
  }

  function mudarStatusUsuarioPreparacao(
    usuarioId: string,
    status: StatusUsuario
  ): boolean {
    if (!exigirPermissao("usuarios.gerenciar")) return false;
    try {
      const usuarioAtual = db.usuarios.find((usuario) => usuario.id === usuarioId);
      if (!usuarioAtual) throw new Error("Usuário preparado não encontrado.");
      const agora = new Date().toISOString();
      const usuario = alterarStatusUsuario(usuarioAtual, status, db.usuarios, agora);
      const registro = criarRegistroAuditoria(
        {
          usuarioId: "preparacao-sistema",
          usuarioNome: "Preparação do sistema",
          acao: status === "Suspenso" ? "usuario.preparacao_suspensa" : "usuario.preparacao_restaurada",
          entidade: "Usuário",
          entidadeId: usuario.id,
          detalhes: `${usuario.nome} • status alterado para ${status} sem envio de convite.`,
        },
        agora
      );
      const novo: AppDB = {
        ...db,
        usuarios: db.usuarios.map((item) => item.id === usuario.id ? usuario : item),
        registrosAuditoria: [...db.registrosAuditoria, registro],
      };
      salvarDBLocal(novo);
      setDb(novo);
      return true;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Não foi possível alterar este usuário.");
      return false;
    }
  }

  async function enviarAcessoUsuario(usuarioId: string): Promise<boolean> {
    if (!exigirPermissao("usuarios.gerenciar")) return false;
    const usuario = db.usuarios.find((item) => item.id === usuarioId);
    if (!usuario) {
      window.alert("Usuário preparado não encontrado.");
      return false;
    }

    try {
      const response = await fetch("/api/access/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "Não foi possível enviar o acesso.");
      }

      const agora = new Date().toISOString();
      const registro = criarRegistroAuditoria(
        {
          usuarioId: usuarioDaSessao?.id || "preparacao-sistema",
          usuarioNome: usuarioDaSessao?.nome || "Administrador",
          acao: "usuario.acesso_enviado",
          entidade: "Usuário",
          entidadeId: usuario.id,
          detalhes: `${usuario.nome} • e-mail enviado para definição da senha.`,
        },
        agora
      );
      setDb((atual) => ({
        ...atual,
        registrosAuditoria: [...atual.registrosAuditoria, registro],
      }));
      window.alert(result.message || "Acesso enviado com sucesso.");
      return true;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Não foi possível enviar o acesso.");
      return false;
    }
  }

  function confirmarSaidaDaEdicao() {
    if (!empresaTemAlteracoes) return true;
    return window.confirm(
      "Há alterações ainda não salvas nesta área. Deseja sair e descartá-las?"
    );
  }

  function navegarPrincipal(destino: View) {
    if (!confirmarSaidaDaEdicao()) return;
    if (showEmpresaForm) {
      setShowEmpresaForm(false);
      setEditingEmpresaId(null);
      setEmpresaSecao(null);
    }
    setView(destino);
  }

  if (
    ready &&
    sessaoConsultada &&
    sessaoAtual &&
    (!usuarioDaSessao || usuarioDaSessao.status !== "Ativo")
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 text-center shadow-sm">
          <div className="text-xs font-extrabold uppercase text-[#2F5597]">
            Acesso não liberado
          </div>
          <h1 className="mt-2 text-2xl font-extrabold">Esta conta não pode entrar no sistema</h1>
          <p className="mt-3 text-sm text-slate-600">
            Peça ao Administrador para preparar ou reativar este e-mail no diretório de pessoas.
          </p>
          <button
            type="button"
            onClick={() => void sairDoSistema()}
            className="mt-5 rounded-xl bg-[#17365D] px-5 py-3 font-extrabold text-white"
          >
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <header className="relative overflow-hidden bg-[#0e315b] text-white">
        <div className="relative mx-auto max-w-7xl px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/25 bg-white/10">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2.8 20 6v5.8c0 4.9-3.3 8-8 9.4-4.7-1.4-8-4.5-8-9.4V6l8-3.2Z" />
                  <path d="m8.2 12 2.3 2.3 5.4-5.4" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="whitespace-nowrap text-sm font-extrabold tracking-tight sm:text-base">MBP Expert AI</div>
                <div className="whitespace-nowrap text-[9px] text-blue-100 sm:text-[11px]">Segurança dos Alimentos</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void atualizarNuvemManualmente()}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold sm:px-3 sm:text-xs ${
                syncStatus === "sincronizado"
                  ? "bg-emerald-100 text-emerald-800"
                  : syncStatus === "conectando"
                  ? "bg-blue-100 text-blue-800"
                  : syncStatus === "local"
                  ? "bg-amber-100 text-amber-800"
                  : syncStatus === "recuperacao"
                  ? "bg-amber-100 text-amber-900"
                  : syncErroVisivel && !estaOnline
                  ? "bg-amber-100 text-amber-800"
                  : syncErroVisivel
                  ? "bg-red-100 text-red-800"
                  : "bg-blue-100 text-blue-800"
              }`}
              title={
                syncAtualizadoEm
                  ? `Última sincronização: ${syncAtualizadoEm}. Clique para atualizar.`
                  : "Clique para atualizar a nuvem."
              }
            >
              {syncStatus === "sincronizado"
                ? "● Sincronizado"
                : syncStatus === "conectando"
                ? "● Conectando"
                : syncStatus === "local"
                ? "● Somente local"
                : syncStatus === "recuperacao"
                ? "🛟 Recuperação necessária"
                : syncErroVisivel && !estaOnline
                ? "● Modo offline"
                : syncErroVisivel
                ? "⚠️ Nuvem indisponível"
                : "● Conectando"}
            </button>
          </div>

          {usuarioDaSessao && (
            <div className="mt-2 flex min-w-0 items-center justify-between gap-3 border-t border-white/15 pt-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#4874bd] text-[10px] font-extrabold text-white">
                  {usuarioDaSessao.nome.split(" ").filter(Boolean).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-extrabold sm:text-sm">{atual?.nomeFantasia || "Selecione uma empresa"}</div>
                  <div className="truncate text-[9px] text-blue-100 sm:text-[10px]">{usuarioDaSessao.nome} • {usuarioDaSessao.perfil}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void sairDoSistema()}
                disabled={saindo}
                aria-label="Sair"
                title="Sair"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/20 bg-white/10 text-white disabled:opacity-60"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 17l5-5-5-5" />
                  <path d="M15 12H3" />
                  <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </header>

      {recuperacaoPendente && (
        <div className="border-b border-amber-300 bg-amber-50">
          <div className="mx-auto max-w-7xl px-4 py-4 text-amber-950">
            <div className="font-extrabold">
              Encontramos registros neste computador que não estão na nuvem.
            </div>
            <p className="mt-1 text-sm">
              A sincronização foi bloqueada para evitar perda. Serão recuperados:
              {` ${recuperacaoPendente.counts.empresas} empresa(s), ${recuperacaoPendente.counts.visitas} visita(s), ${recuperacaoPendente.counts.ncs} não conformidade(s) e ${recuperacaoPendente.counts.evidencias} evidência(s).`}
            </p>
            <button
              type="button"
              disabled={recuperandoDados}
              onClick={() => void confirmarRecuperacaoLocal()}
              className="mt-3 rounded-xl bg-amber-800 px-4 py-2 font-bold text-white disabled:opacity-60"
            >
              {recuperandoDados
                ? "Recuperando..."
                : "Mesclar registros locais com a nuvem"}
            </button>
          </div>
        </div>
      )}

      {protecaoLocalAtiva && !recuperacaoPendente && (
        <div className={`border-b ${estaOnline ? "border-red-200 bg-red-50" : "border-blue-200 bg-blue-50"}`}>
          <div className={`mx-auto max-w-7xl px-4 py-3 ${estaOnline ? "text-red-950" : "text-blue-950"}`}>
            <div className="font-extrabold">
              {estaOnline ? "A nuvem não respondeu. Seus dados foram preservados." : "Modo offline ativo"}
            </div>
            <p className="mt-1 text-sm">
              {estaOnline
                ? "Nenhum dado local será substituído enquanto esta proteção estiver ativa."
                : "Continue trabalhando normalmente. As alterações ficam neste aparelho e serão sincronizadas quando a conexão voltar."}
            </p>
            {estaOnline && (
              <button type="button" onClick={baixarBackupLocal} className="mt-3 rounded-xl bg-red-800 px-4 py-2 font-bold text-white">
                Baixar backup local
              </button>
            )}
          </div>
        </div>
      )}

      {armazenamentoLocalIndisponivel && (
        <div className="border-b border-amber-300 bg-amber-50">
          <div className="mx-auto max-w-7xl px-4 py-3 text-amber-950">
            <div className="font-extrabold">
              O armazenamento local deste aparelho está cheio ou indisponível.
            </div>
            <p className="mt-1 text-sm">
              O sistema continua conectado à nuvem, mas o uso offline só ficará disponível depois de limpar os dados antigos deste site no navegador.
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-3 py-4 pb-28 sm:p-4 md:pb-4">
        <nav className="mb-4 hidden flex-wrap gap-2 md:flex">
          <button
            onClick={() => navegarPrincipal("inicio")}
            className={`rounded-xl px-4 py-2 font-bold ${
              view === "inicio"
                ? "bg-[#17365D] text-white"
                : "bg-slate-200 text-slate-900"
            }`}
          >
            Início
          </button>
          <button
            onClick={() => navegarPrincipal("empresas")}
            className={`rounded-xl px-4 py-2 font-bold ${
              view === "empresas"
                ? "bg-[#17365D] text-white"
                : "bg-slate-200 text-slate-900"
            }`}
          >
            Empresas
          </button>
          <button
            onClick={() => navegarPrincipal("visitas")}
            className={`rounded-xl px-4 py-2 font-bold ${
              view === "visitas" ||
              view === "visita" ||
              view === "ambientes" ||
              view === "checklist" ||
              view === "ncs" ||
              view === "plano" ||
              view === "acompanhamento" ||
              view === "historico" ||
              view === "evidencias" ||
              view === "relatorio"
                ? "bg-[#17365D] text-white"
                : "bg-slate-200 text-slate-900"
            }`}
          >
            Visitas
          </button>
          {permitido("usuarios.gerenciar") && (
            <button
              onClick={() => navegarPrincipal("acessos")}
              className={`rounded-xl px-4 py-2 font-bold ${
                view === "acessos"
                  ? "bg-[#17365D] text-white"
                  : "bg-slate-200 text-slate-900"
              }`}
            >
              Acessos
            </button>
          )}
        </nav>

        {view === "acessos" && permitido("usuarios.gerenciar") ? (
          <AccessPreparationPanel
            usuarios={db.usuarios}
            empresas={db.empresas}
            registrosAuditoria={db.registrosAuditoria}
            onSalvarUsuario={salvarUsuarioPreparacao}
            onAlterarStatus={mudarStatusUsuarioPreparacao}
            onEnviarAcesso={enviarAcessoUsuario}
          />
        ) : view === "empresas" && showEmpresaForm && permitido("empresas.editar") ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex justify-between gap-4">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-wide text-[#2F5597]">
                  {editingEmpresaId ? "Gestão da empresa" : "Cadastro"}
                </div>
                <h2 className="mt-1 text-2xl font-extrabold">
                  {!editingEmpresaId
                    ? "Nova empresa"
                    : empresaSecao === null
                    ? "Central da Empresa"
                    : empresaSecao === "dados"
                    ? "Dados da empresa"
                    : empresaSecao === "manual"
                    ? "Manual e responsabilidades"
                    : empresaSecao === "ambientes"
                    ? "Ambientes e equipamentos"
                    : empresaSecao === "fluxos"
                    ? "Fluxos operacionais"
                    : empresaSecao === "programas"
                    ? "Programas de Controle"
                    : "POPs"}
                </h2>
                <p className="text-sm text-slate-500">
                  {!editingEmpresaId
                    ? "Digite o CNPJ, confira os dados básicos e salve para abrir a Central da Empresa."
                    : empresaSecao === null
                    ? `${form.nomeFantasia || "Empresa"} • escolha somente a área que deseja consultar ou alterar.`
                    : form.nomeFantasia || "Empresa"}
                </p>
              </div>
              <button
                onClick={() => {
                  if (editingEmpresaId && empresaSecao !== null) {
                    if (!confirmarSaidaDaEdicao()) return;
                    setEmpresaSecao(null);
                    setMsg("");
                    return;
                  }
                  if (!confirmarSaidaDaEdicao()) return;
                  setShowEmpresaForm(false);
                  setEditingEmpresaId(null);
                  setEmpresaSecao(null);
                }}
                className="h-fit shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm"
              >
                {editingEmpresaId && empresaSecao !== null
                  ? "← Central"
                  : editingEmpresaId
                  ? "← Voltar às empresas"
                  : "Cancelar"}
              </button>
            </div>

            {editingEmpresaId && empresaSecao === null ? (
              <div className="mt-5">
                {msg && (
                  <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
                    {msg}
                  </div>
                )}

                <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#2F5597]">
                        Preparação da empresa
                      </div>
                      <div className="mt-1 font-extrabold text-slate-950">
                        {configuracaoEmpresaGerenciada.prontaParaVisita
                          ? "Dados essenciais prontos para iniciar visitas"
                          : "Complete os dados essenciais antes da primeira visita"}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        {configuracaoEmpresaGerenciada.concluidas} de {configuracaoEmpresaGerenciada.total} áreas configuradas. As áreas técnicas podem ser concluídas gradualmente.
                      </div>
                    </div>
                    <span className={`w-fit shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold ${
                      configuracaoEmpresaGerenciada.prontaParaVisita
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {configuracaoEmpresaGerenciada.percentual}% configurada
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-[#2F5597] transition-all"
                      style={{ width: `${configuracaoEmpresaGerenciada.percentual}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/60 p-3 sm:p-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {([
                      {
                        secao: "dados" as EmpresaSecao,
                        categoria: "Cadastro",
                        titulo: "Dados da empresa",
                        resumo: "Endereço, contato, responsável e horário.",
                        cor: "bg-blue-100 text-blue-700",
                      },
                      {
                        secao: "manual" as EmpresaSecao,
                        categoria: "Manual",
                        titulo: "Manual e responsabilidades",
                        resumo: `${quantidadeComNome(responsabilidadesEmpresa.filter((item) => item.ativa).length, "responsabilidade ativa", "responsabilidades ativas")}.`,
                        cor: "bg-violet-100 text-violet-700",
                      },
                      {
                        secao: "ambientes" as EmpresaSecao,
                        categoria: "Estrutura",
                        titulo: "Ambientes e equipamentos",
                        resumo: `${quantidadeComNome(setoresEmpresa.length, "ambiente", "ambientes")} • ${quantidadeComNome(equipamentosEmpresa.length, "tipo de equipamento", "tipos de equipamento")}.`,
                        cor: "bg-cyan-100 text-cyan-700",
                      },
                      {
                        secao: "fluxos" as EmpresaSecao,
                        categoria: "Operação",
                        titulo: "Fluxos operacionais",
                        resumo: `${quantidadeComNome(fluxosEmpresa.filter((fluxo) => fluxo.aplicavel).length, "fluxo ativo", "fluxos ativos")} de ${fluxosEmpresa.length}.`,
                        cor: "bg-amber-100 text-amber-700",
                      },
                      {
                        secao: "programas" as EmpresaSecao,
                        categoria: "Qualidade",
                        titulo: "Programas de Controle",
                        resumo: `${quantidadeComNome(programasEmpresa.filter((programa) => programa.status === "Implantado" || programa.status === "Em implantação").length, "programa ativo ou em implantação", "programas ativos ou em implantação")}.`,
                        cor: "bg-indigo-100 text-indigo-700",
                      },
                      {
                        secao: "pops" as EmpresaSecao,
                        categoria: "Procedimentos",
                        titulo: "POPs",
                        resumo: popsComRevisaoVencida > 0
                          ? `${quantidadeComNome(popsEmpresa.length, "POP cadastrado", "POPs cadastrados")} • ${quantidadeComNome(popsComRevisaoVencida, "revisão vencida", "revisões vencidas")}.`
                          : `${quantidadeComNome(popsEmpresa.length, "POP cadastrado", "POPs cadastrados")} • nenhuma revisão vencida.`,
                        cor: "bg-emerald-100 text-emerald-700",
                      },
                    ]).map((item) => (
                      <button
                        key={item.secao}
                        type="button"
                        onClick={() => { setEmpresaSecao(item.secao); setMsg(""); }}
                        className="group rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300 sm:p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className={`grid h-10 w-10 place-items-center rounded-xl ${item.cor}`}>
                            <CompanySectionIcon name={item.secao} />
                          </span>
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-50 text-lg font-bold text-[#2F5597] transition group-hover:bg-blue-100">→</span>
                        </div>
                        <div className="mt-3 text-[10px] font-extrabold uppercase tracking-wider text-[#2F5597]">{item.categoria}</div>
                        <div className="mt-0.5 font-extrabold text-slate-950">{item.titulo}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">{item.resumo}</div>
                        <div className={`mt-3 text-[11px] font-extrabold ${
                          configuracaoEmpresaGerenciada.etapas.find((etapa) => etapa.id === item.secao)?.concluida
                            ? "text-emerald-700"
                            : "text-amber-700"
                        }`}>
                          {configuracaoEmpresaGerenciada.etapas.find((etapa) => etapa.id === item.secao)?.concluida
                            ? "✓ Configurado"
                            : item.secao === "dados" || item.secao === "ambientes"
                            ? "Essencial • completar"
                            : "Pode ser concluído depois"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {editingEmpresaId && empresaSecao !== null && (
                  <details className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-3">
                    <summary className="cursor-pointer text-sm font-extrabold text-[#2F5597]">
                      Para que serve esta área?
                    </summary>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {empresaSecao === "dados"
                        ? "Reúne a identificação, os contatos e o funcionamento do estabelecimento. Esses dados aparecem nas visitas e nos relatórios."
                        : empresaSecao === "manual"
                        ? "Registra quem elabora, revisa, aprova e executa as responsabilidades previstas no Manual de Boas Práticas."
                        : empresaSecao === "ambientes"
                        ? "Define os locais que poderão ser selecionados em uma visita e os equipamentos existentes em cada ambiente."
                        : empresaSecao === "fluxos"
                        ? "Informa como as atividades acontecem na prática. Os fluxos marcados como aplicáveis acrescentam verificações ao checklist."
                        : empresaSecao === "programas"
                        ? "Acompanha os controles permanentes de qualidade, sua implantação, responsáveis, registros e documentos relacionados."
                        : "Organiza os procedimentos escritos da empresa, indicando situação, responsável, versão e próxima revisão."}
                    </p>
                  </details>
                )}
                {(!editingEmpresaId || empresaSecao === "dados") && (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <label>
                      <span className="mb-1 block text-xs font-bold text-slate-500">CNPJ</span>
                      <div className="flex gap-2">
                        <input
                          className="w-full rounded-xl border p-3 disabled:bg-slate-100 disabled:text-slate-500"
                          value={form.cnpj}
                          disabled={Boolean(editingEmpresaId)}
                          onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                        />
                        {!editingEmpresaId && (
                          <button onClick={buscar} className="rounded-xl bg-slate-900 px-4 font-bold text-white">
                            {loading ? "..." : "Buscar"}
                          </button>
                        )}
                      </div>
                    </label>

                    {camposEmpresaPrincipais.map((k) => (
                  <label key={k}>
                    <span className="mb-1 block text-xs font-bold text-slate-500">
                      {labels[k] || k}
                    </span>
                    <input
                      type="text"
                      className="w-full rounded-xl border p-3"
                      value={form[k]}
                      onChange={(e) =>
                        setForm({ ...form, [k]: e.target.value })
                      }
                    />
                  </label>
                    ))}
                  </div>
                )}

                {editingEmpresaId && empresaSecao === "manual" && (
                  <div className="mt-4 space-y-4">
                    <details open className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <summary className="cursor-pointer list-none">
                        <div className="font-extrabold text-slate-950">Identificação complementar do Manual</div>
                        <div className="mt-0.5 text-xs text-slate-500">Dados técnicos, elaboração, revisão e aprovação.</div>
                      </summary>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {camposIdentificacaoManual.map((k) => (
                          <label key={k}>
                            <span className="mb-1 block text-xs font-bold text-slate-500">{labels[k]}</span>
                            <input type={k === "dataElaboracaoManual" ? "date" : "text"} className="w-full rounded-xl border bg-white p-3" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                          </label>
                        ))}
                      </div>
                    </details>
                    <ManualBaseFields responsabilidades={responsabilidadesEmpresa} onResponsabilidadesChange={setResponsabilidadesEmpresa} setores={setoresEmpresa} onSetoresChange={setSetoresEmpresa} equipamentos={equipamentosEmpresa} onEquipamentosChange={setEquipamentosEmpresa} modo="responsabilidades" />
                  </div>
                )}

                {editingEmpresaId && empresaSecao === "ambientes" && (
                  <div className="mt-4">
                    <ManualBaseFields responsabilidades={responsabilidadesEmpresa} onResponsabilidadesChange={setResponsabilidadesEmpresa} setores={setoresEmpresa} onSetoresChange={setSetoresEmpresa} equipamentos={equipamentosEmpresa} onEquipamentosChange={setEquipamentosEmpresa} modo="ambientes" />
                  </div>
                )}

                {editingEmpresaId && empresaSecao === "fluxos" && (
                  <OperationalFlowsFields fluxos={fluxosEmpresa} setores={setoresEmpresa} onChange={setFluxosEmpresa} aberto />
                )}

                {editingEmpresaId && empresaSecao === "programas" && (
                  <QualityProgramsFields programas={programasEmpresa} onChange={setProgramasEmpresa} aberto />
                )}

                {editingEmpresaId && empresaSecao === "pops" && (
                  <PopsFields pops={popsEmpresa} onChange={setPopsEmpresa} aberto />
                )}

                {msg && <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm">{msg}</div>}

                <div className="sticky bottom-20 z-20 mt-4 rounded-2xl border border-blue-100 bg-white/95 p-2 shadow-lg backdrop-blur md:bottom-4">
                  {editingEmpresaId && (
                    <div className={`mb-2 px-1 text-xs font-bold ${empresaTemAlteracoes ? "text-amber-700" : "text-emerald-700"}`}>
                      {empresaTemAlteracoes
                        ? "● Alterações ainda não salvas"
                        : "✓ Todas as alterações desta área estão salvas"}
                    </div>
                  )}
                  <button onClick={salvarEmpresa} className="w-full rounded-xl bg-[#2F5597] p-3 font-extrabold text-white">
                    {editingEmpresaId ? "Salvar e voltar à Central" : "Salvar e abrir a Central"}
                  </button>
                </div>
              </>
            )}
          </section>
        ) : view === "visitas" && showVisitaForm ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex justify-between gap-4">
              <div>
                <div className="text-xs font-extrabold uppercase text-[#2F5597]">
                  Nova visita
                </div>
                <h2 className="mt-1 text-2xl font-extrabold">
                  {atual?.nomeFantasia}
                </h2>
                <p className="text-sm text-slate-500">
                  Esta visita ficará vinculada automaticamente à empresa ativa.
                </p>
              </div>
              <button
                onClick={() => setShowVisitaForm(false)}
                className="rounded-xl bg-slate-100 px-3 py-2 font-bold"
              >
                Fechar
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-1 block text-xs font-bold text-slate-500">
                  Data da visita
                </span>
                <input
                  type="date"
                  className="w-full rounded-xl border p-3"
                  value={vf.data}
                  onChange={(e) => setVf({ ...vf, data: e.target.value })}
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-bold text-slate-500">
                  Responsável pela visita *
                </span>
                <input
                  className="w-full rounded-xl border p-3"
                  required
                  placeholder="Nome do consultor / responsável técnico"
                  value={vf.responsavel}
                  onChange={(e) =>
                    setVf({ ...vf, responsavel: e.target.value })
                  }
                />
              </label>


              <label>
                <span className="mb-1 block text-xs font-bold text-slate-500">
                  Identificação profissional (opcional)
                </span>
                <input
                  className="w-full rounded-xl border p-3"
                  placeholder="Ex.: Nutricionista • CRN 2-00000"
                  value={vf.responsavelIdentificacao}
                  onChange={(e) =>
                    setVf({ ...vf, responsavelIdentificacao: e.target.value })
                  }
                />
              </label>

              <label className="md:col-span-2">
                <span className="mb-1 block text-xs font-bold text-slate-500">
                  Observações iniciais
                </span>
                <textarea
                  rows={4}
                  className="w-full rounded-xl border p-3"
                  value={vf.observacoes}
                  onChange={(e) =>
                    setVf({ ...vf, observacoes: e.target.value })
                  }
                />
              </label>
            </div>

            <button
              onClick={salvarVisita}
              disabled={criandoVisita}
              className="mt-5 w-full rounded-xl bg-[#2F5597] p-3 font-extrabold text-white disabled:opacity-50"
            >
              {criandoVisita ? "Criando..." : "Criar visita"}
            </button>
          </section>
        ) : view === "ambientes" && visitaAtual ? (
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#2F5597]">
                    Ambientes
                  </div>
                  <h1 className="mt-1 text-2xl font-extrabold">
                    Defina os setores desta visita
                  </h1>
                  <p className="text-sm text-slate-500">
                    {empresaVisita?.nomeFantasia} • {fdata(visitaAtual.data)}
                  </p>
                </div>
                <button
                  onClick={() => setView("visita")}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700"
                >
                  Voltar à Central
                </button>
              </div>

              <div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
                Selecione apenas os ambientes que realmente serão avaliados. O
                checklist será montado a partir desta seleção.
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-extrabold">
                      Ambientes sugeridos
                    </h2>
                    <p className="text-sm text-slate-500">
                      Clique para incluir ou remover da visita.
                    </p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold">
                    {ambientesSelecionados.length} selecionados
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {ambientesSugeridosVisita.map((nome) => {
                    const ativo = ambientesSelecionados.includes(nome);
                    return (
                      <button
                        key={nome}
                        onClick={() => toggleAmbiente(nome)}
                        className={`flex items-center justify-between rounded-xl border p-4 text-left font-extrabold transition ${
                          ativo
                            ? "border-[#2F5597] bg-blue-50 text-[#17365D]"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <span>{nome}</span>
                        <span>{ativo ? "✓" : "+"}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <div className="font-extrabold text-[#17365D]">Lista detalhada do restaurante</div>
                  <p className="mt-1 text-xs text-slate-600">
                    Aplica os 18 ambientes enviados pela empresa e inclui a Central de Gás como item 19. Os nomes reais são preservados e cada um recebe o questionário correspondente.
                  </p>
                  <button
                    type="button"
                    onClick={aplicarModeloDetalhadoRestaurante}
                    className="mt-3 w-full rounded-xl bg-[#2F5597] px-4 py-3 text-sm font-extrabold text-white"
                  >
                    Aplicar lista detalhada de 19 ambientes
                  </button>
                </div>

                <div className="mt-6 border-t pt-5">
                  <h3 className="font-extrabold">
                    Adicionar ambiente personalizado
                  </h3>
                  <div className="mt-2 flex gap-2">
                    <input
                      className="w-full rounded-xl border p-3"
                      placeholder="Ex.: Padaria, Açougue, Sushi bar..."
                      value={ambientePersonalizado}
                      onChange={(e) =>
                        setAmbientePersonalizado(e.target.value)
                      }
                    />
                    <button
                      onClick={adicionarPersonalizado}
                      className="rounded-xl bg-[#17365D] px-4 font-bold text-white"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-extrabold">Roteiro da visita</h2>
                  <span className={`text-xs font-bold ${statusAmbientes ? "text-emerald-700" : "text-slate-400"}`}>
                    {statusAmbientes || "salvamento automático"}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {ambientesSelecionados.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-5 text-center text-sm text-slate-500">
                      Nenhum ambiente selecionado ainda.
                    </div>
                  ) : (
                    ambientesSelecionados.map((nome, idx) => (
                      <div
                        key={nome}
                        className="rounded-xl bg-slate-50 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-slate-400">
                              {String(idx + 1).padStart(2, "0")}
                            </div>
                            <div className="font-extrabold leading-snug">{nome}</div>
                          </div>
                          <button
                            onClick={() => toggleAmbiente(nome)}
                            className="shrink-0 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
                          >
                            Remover
                          </button>
                        </div>
                        <label className="mt-3 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Questionário baseado em
                        </label>
                        <select
                          value={modelosAmbientesSelecionados[nome] || obterModeloQuestionarioParaAmbiente(nome)}
                          onChange={(event) => atualizarModeloQuestionarioAmbiente(nome, event.target.value)}
                          className="mt-1 min-w-0 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"
                        >
                          {OPCOES_MODELO_QUESTIONARIO.map((modelo) => (
                            <option key={modelo} value={modelo}>{modelo}</option>
                          ))}
                        </select>
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={salvarAmbientes}
                  className="mt-5 w-full rounded-xl bg-[#2F5597] p-3 font-extrabold text-white"
                >
                  Concluir e voltar à Central
                </button>
              </div>
            </div>
          </section>
        ) : view === "evidencias" && visitaAtual ? (
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#2F5597]">
                    Evidências da inspeção
                  </div>
                  <h1 className="mt-1 text-2xl font-extrabold">Fotos e áudio</h1>
                  <p className="text-sm text-slate-500">
                    {empresaVisita?.nomeFantasia} • {fdata(visitaAtual.data)}
                  </p>
                </div>
                <button
                  onClick={() => setView("visita")}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700"
                >
                  Voltar à Central
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <MetricCard label="Evidências" value={evidenciasVisita.length} />
                <MetricCard label="Fotos" value={fotosVisita} />
                <MetricCard label="Áudios" value={audiosVisita} />
                <MetricCard label="IA para revisar" value={analisesIAPendentes} />
              </div>
            </div>

            <div className={`grid gap-4 ${permitido("evidencias.adicionar", visitaAtual.empresaId) ? "lg:grid-cols-[380px_1fr]" : "grid-cols-1"}`}>
              {permitido("evidencias.adicionar", visitaAtual.empresaId) && (
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="text-xl font-extrabold">Nova evidência</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Registre a situação observada e vincule ao ambiente ou à NC quando necessário.
                </p>

                <label className="mt-5 block">
                  <span className="mb-1 block text-xs font-extrabold text-slate-500">
                    Ambiente
                  </span>
                  <select
                    value={evidenciaAmbiente}
                    onChange={(e) => {
                      setEvidenciaAmbiente(e.target.value);
                      setEvidenciaChecklistItemId("");
                    }}
                    className="w-full rounded-xl border bg-white p-3"
                  >
                    <option value="">Sem ambiente específico</option>
                    {(visitaAtual.ambientes || []).map((amb) => (
                      <option key={amb} value={amb}>{amb}</option>
                    ))}
                  </select>
                </label>

                <label className="mt-3 block">
                  <span className="mb-1 block text-xs font-extrabold text-slate-500">
                    Item do checklist (opcional)
                  </span>
                  <select
                    value={evidenciaChecklistItemId}
                    onChange={(e) => {
                      const itemId = e.target.value;
                      setEvidenciaChecklistItemId(itemId);
                      const item = checklistAtual.find((registro) => registro.id === itemId);
                      if (item) {
                        setEvidenciaAmbiente(item.ambiente);
                        const ncDoItem = ncsVisita.find((nc) => nc.checklistItemId === item.id);
                        if (ncDoItem) setEvidenciaNcId(ncDoItem.id);
                      }
                    }}
                    className="w-full rounded-xl border bg-white p-3"
                  >
                    <option value="">Nenhum item específico</option>
                    {checklistAtual
                      .filter((item) => !evidenciaAmbiente || item.ambiente === evidenciaAmbiente)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.categoria} — {item.titulo}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="mt-3 block">
                  <span className="mb-1 block text-xs font-extrabold text-slate-500">
                    Vincular à Não Conformidade
                  </span>
                  <select
                    value={evidenciaNcId}
                    onChange={(e) => setEvidenciaNcId(e.target.value)}
                    className="w-full rounded-xl border bg-white p-3"
                  >
                    <option value="">Nenhuma NC específica</option>
                    {ncsVisita.map((nc, idx) => (
                      <option key={nc.id} value={nc.id}>
                        NC {idx + 1} — {nc.ambiente} — {nc.titulo}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="mt-3 block">
                  <span className="mb-1 block text-xs font-extrabold text-slate-500">
                    Descrição
                  </span>
                  <textarea
                    rows={3}
                    value={evidenciaDescricao}
                    onChange={(e) => setEvidenciaDescricao(e.target.value)}
                    placeholder="Ex.: embalagem avariada identificada no recebimento..."
                    className="w-full rounded-xl border p-3"
                  />
                </label>

                <div className="mt-5 grid gap-3">
                  <label className="cursor-pointer rounded-xl bg-[#2F5597] p-4 text-center font-extrabold text-white">
                    📷 Tirar ou adicionar foto
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={async (e) => {
                        const input = e.currentTarget;
                        const file = input.files?.[0];

                        if (!file) {
                          setEvidenciaMsg("Nenhuma foto foi recebida da câmera.");
                          return;
                        }

                        await adicionarEvidencia(file, "Foto");
                        input.value = "";
                      }}
                    />
                  </label>

                  <label className="cursor-pointer rounded-xl bg-[#17365D] p-4 text-center font-extrabold text-white">
                    🎙️ Adicionar áudio
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        void adicionarEvidencia(file, "Áudio");
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>

                {evidenciaMsg && (
                  <div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
                    {evidenciaMsg}
                  </div>
                )}

                <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                  Fotos e áudios novos são armazenados no Blob privado.
                  O Neon guarda apenas os dados e a referência da evidência.
                </div>
                <div className="mt-3 rounded-xl bg-violet-50 p-3 text-xs text-violet-900">
                  A análise por IA é opcional. Antes do envio, retire do enquadramento
                  rostos, crachás e documentos pessoais desnecessários. Toda sugestão
                  exige confirmação profissional.
                </div>
              </div>
              )}

              <div className="space-y-3">
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-extrabold">Registros da visita</h2>
                      <p className="text-sm text-slate-500">
                        Evidências organizadas da mais recente para a mais antiga.
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold">
                      {evidenciasVisita.length}
                    </span>
                  </div>
                </div>

                {evidenciasVisita.length === 0 ? (
                  <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                    <div className="text-xl font-extrabold">Nenhuma evidência registrada</div>
                    <p className="mt-2 text-sm text-slate-500">
                      Adicione uma foto ou áudio durante a inspeção.
                    </p>
                  </div>
                ) : (
                  evidenciasVisita.map((ev) => {
                    const ncRelacionada = ncsVisita.find((nc) => nc.id === ev.ncId);
                    const itemChecklistRelacionado = checklistAtual.find(
                      (item) => item.id === ev.checklistItemId
                    );
                    const analises = ev.analisesIA || [];
                    const ultimaAnalise = analises.length ? analises[analises.length - 1] : undefined;
                    const analisando = analiseIAEmAndamentoId === ev.id;
                    return (
                      <article key={ev.id} className="rounded-2xl bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-extrabold uppercase text-slate-400">
                              {ev.tipo} • {ev.ambiente || "Sem ambiente específico"}
                            </div>
                            <div className="mt-1 font-extrabold">
                              {ev.descricao || ev.nomeArquivo}
                            </div>
                            {ncRelacionada && (
                              <div className="mt-2 inline-block rounded-full bg-red-50 px-3 py-1 text-xs font-extrabold text-red-700">
                                Vinculada à NC — {ncRelacionada.categoria}
                              </div>
                            )}
                            {itemChecklistRelacionado && (
                              <div className="mt-2 rounded-xl bg-blue-50 p-3 text-xs text-blue-900">
                                <span className="font-extrabold">Item vinculado:</span>{" "}
                                {itemChecklistRelacionado.categoria} — {itemChecklistRelacionado.titulo}
                              </div>
                            )}
                          </div>
                          {permitido("evidencias.adicionar", ev.empresaId) && (
                            <button
                              onClick={() => excluirEvidencia(ev.id)}
                              className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
                            >
                              Excluir
                            </button>
                          )}
                        </div>

                        {ev.tipo === "Foto" ? (
                          <>
                            <img
                              src={urlEvidencia(ev)}
                              alt={ev.descricao || "Evidência fotográfica"}
                              className="mt-4 max-h-[520px] w-full rounded-xl border object-contain"
                            />

                            <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <div className="text-xs font-extrabold uppercase text-violet-700">
                                    Análise assistida por IA
                                  </div>
                                  <p className="mt-1 text-xs text-violet-900">
                                    Sugestão visual; não cria nem altera uma NC automaticamente.
                                  </p>
                                </div>
                                {permitido("ia.analisar", ev.empresaId) && (!ultimaAnalise || ultimaAnalise.status !== "Aguardando revisão") && (
                                  <button
                                    type="button"
                                    onClick={() => void analisarFotoComIA(ev)}
                                    disabled={analisando || analiseIAEmAndamentoId !== null}
                                    className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
                                  >
                                    {analisando ? "Analisando..." : analises.length ? "Analisar novamente" : "Analisar foto com IA"}
                                  </button>
                                )}
                              </div>

                              {analiseIAMensagens[ev.id] && (
                                <div className="mt-3 rounded-lg bg-white p-3 text-xs text-slate-700">
                                  {analiseIAMensagens[ev.id]}
                                </div>
                              )}

                              {ultimaAnalise && (
                                <div className="mt-4 rounded-xl bg-white p-4">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                                      ultimaAnalise.status === "Confirmada"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : ultimaAnalise.status === "Descartada"
                                        ? "bg-slate-100 text-slate-700"
                                        : "bg-amber-100 text-amber-900"
                                    }`}>
                                      {ultimaAnalise.status}
                                    </span>
                                    <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                                      ultimaAnalise.situacao === "Conforme"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : ultimaAnalise.situacao === "Atenção"
                                        ? "bg-amber-100 text-amber-900"
                                        : ultimaAnalise.situacao === "Possível não conformidade"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-slate-100 text-slate-700"
                                    }`}>
                                      {ultimaAnalise.situacao || ultimaAnalise.classificacao}
                                    </span>
                                  </div>

                                  <p className="mt-3 font-bold text-slate-800">{ultimaAnalise.resumo}</p>

                                  {ultimaAnalise.achados[0]?.acaoSugerida && (
                                    <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
                                      <span className="font-extrabold">Ação:</span>{" "}
                                      {ultimaAnalise.achados[0].acaoSugerida}
                                    </p>
                                  )}

                                  {ultimaAnalise.achados.length > 0 && (
                                    <details className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                                      <summary className="cursor-pointer font-extrabold text-slate-700">
                                        Ver detalhes técnicos
                                      </summary>
                                      <div className="mt-3 space-y-2">
                                        {ultimaAnalise.achados.map((achado, indice) => (
                                          <div key={`${ultimaAnalise.id}-${indice}`} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                              <span className="font-extrabold text-slate-800">{achado.titulo}</span>
                                              <span className="text-[11px] font-bold text-slate-400">
                                                Confiança {achado.confianca.toLowerCase()}
                                              </span>
                                            </div>
                                            <p className="mt-1">{achado.descricao}</p>
                                            {achado.acaoSugerida && (
                                              <p className="mt-2 text-emerald-800">
                                                <span className="font-extrabold">Ação:</span> {achado.acaoSugerida}
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                      {ultimaAnalise.alertasPrivacidade.length > 0 && (
                                        <p className="mt-2 text-red-800">
                                          <span className="font-extrabold">Privacidade:</span>{" "}
                                          {ultimaAnalise.alertasPrivacidade.join(" • ")}
                                        </p>
                                      )}
                                      {ultimaAnalise.observacoesLimitacoes.length > 0 && (
                                        <p className="mt-2">
                                          <span className="font-extrabold">Limitações:</span>{" "}
                                          {ultimaAnalise.observacoesLimitacoes.join(" • ")}
                                        </p>
                                      )}
                                    </details>
                                  )}

                                  {ultimaAnalise.status === "Aguardando revisão" && permitido("ia.analisar", ev.empresaId) ? (
                                    <div className="mt-4">
                                      <details className="rounded-lg border border-slate-200 p-3">
                                        <summary className="cursor-pointer text-xs font-extrabold text-slate-600">
                                          Editar texto antes de confirmar
                                        </summary>
                                        <textarea
                                          rows={3}
                                          value={analiseIATextos[ultimaAnalise.id] ?? ultimaAnalise.textoRevisado}
                                          onChange={(e) =>
                                            setAnaliseIATextos((atual) => ({
                                              ...atual,
                                              [ultimaAnalise.id]: e.target.value,
                                            }))
                                          }
                                          className="mt-3 w-full rounded-xl border p-3 text-sm"
                                        />
                                      </details>
                                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                        <button
                                          type="button"
                                          onClick={() => confirmarAnaliseFoto(ev, ultimaAnalise)}
                                          className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-extrabold text-white"
                                        >
                                          Confirmar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => descartarAnaliseFoto(ev, ultimaAnalise)}
                                          className="rounded-xl bg-slate-200 px-4 py-3 text-sm font-extrabold text-slate-800"
                                        >
                                          Descartar sugestão
                                        </button>
                                      </div>
                                    </div>
                                  ) : ultimaAnalise.status === "Confirmada" ? (
                                    <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
                                      <div className="font-extrabold">Análise confirmada pelo profissional</div>
                                      <div className="mt-2 text-xs">
                                        {ultimaAnalise.revisadaPor} • {ultimaAnalise.revisadaEm ? new Date(ultimaAnalise.revisadaEm).toLocaleString("pt-BR") : ""}
                                      </div>
                                      <details className="mt-2">
                                        <summary className="cursor-pointer text-xs font-extrabold">
                                          Ver texto confirmado
                                        </summary>
                                        <div className="mt-2 whitespace-pre-wrap">{ultimaAnalise.textoRevisado}</div>
                                      </details>
                                    </div>
                                  ) : ultimaAnalise.status === "Descartada" ? (
                                    <div className="mt-4 text-xs text-slate-500">
                                      Sugestão descartada por {ultimaAnalise.revisadaPor || "profissional"}. Ela não integra o registro técnico confirmado.
                                    </div>
                                  ) : (
                                    <div className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                                      Esta sugestão aguarda revisão de um Administrador ou Consultor/RT.
                                    </div>
                                  )}

                                  {analises.length > 1 && (
                                    <div className="mt-3 text-xs text-slate-400">
                                      {analises.length} análises preservadas no histórico desta foto.
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <audio controls src={urlEvidencia(ev)} className="mt-4 w-full" />
                        )}

                        <div className="mt-3 text-xs text-slate-400">
                          {new Date(ev.criadoEm).toLocaleString("pt-BR")}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        ) : view === "plano" && visitaAtual ? (
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#2F5597]">
                    Gestão das correções
                  </div>
                  <h1 className="mt-1 text-2xl font-extrabold">Plano de ação</h1>
                  <p className="text-sm text-slate-500">
                    {empresaVisita?.nomeFantasia} • {fdata(visitaAtual.data)}
                  </p>
                </div>
                <button
                  onClick={() => setView("visita")}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700"
                >
                  Voltar à Central
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <MetricCard label="Não conformidades" value={ncsVisita.length} />
                <MetricCard label="Ações definidas" value={acoesDefinidas} />
                <MetricCard label="Em aberto" value={ncsAbertas} />
                <MetricCard label="Resolvidas" value={acoesConcluidas} />
              </div>
            </div>

            {ncsVisita.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <div className="text-xl font-extrabold">Nenhuma ação necessária</div>
                <p className="mt-2 text-sm text-slate-500">
                  O plano de ação será formado a partir das não conformidades da visita.
                </p>
                <button
                  onClick={() => setView("checklist")}
                  className="mt-5 rounded-xl bg-[#2F5597] px-5 py-3 font-extrabold text-white"
                >
                  Abrir checklist
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {ncsVisita.map((nc, idx) => (
                  <article
                    key={nc.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                          Ação {String(idx + 1).padStart(2, "0")} • {nc.ambiente} • {nc.categoria}
                        </div>
                        <h2 className="mt-1 text-xl font-extrabold">{nc.titulo}</h2>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                              nc.criticidade === "Crítica"
                                ? "bg-red-50 text-red-700"
                                : nc.criticidade === "Importante"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {nc.criticidade}
                          </span>
                          {nc.referencia && (
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                              {nc.referencia}
                            </span>
                          )}
                        </div>
                      </div>

                      {nc.status === "Resolvida" ? (
                        <div className="rounded-xl bg-emerald-100 px-3 py-2 text-sm font-extrabold text-emerald-800">
                          Resolvida • edição protegida
                        </div>
                      ) : (
                        <select
                          value={nc.status}
                          onChange={(e) =>
                            atualizarNC(nc.id, {
                              status: e.target.value as "Aberta" | "Em tratamento",
                            })
                          }
                          className="rounded-xl border bg-white px-3 py-2 text-sm font-extrabold"
                        >
                          <option value="Aberta">Aberta</option>
                          <option value="Em tratamento">Em tratamento</option>
                        </select>
                      )}
                    </div>

                    {nc.observacao && (
                      <div className="mt-4 rounded-xl bg-red-50 p-4">
                        <div className="text-xs font-extrabold uppercase text-red-700">
                          Constatação em campo
                        </div>
                        <p className="mt-1 text-sm text-red-900">{nc.observacao}</p>
                      </div>
                    )}

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="md:col-span-2">
                        <span className="mb-1 block text-xs font-extrabold text-slate-500">
                          Ação corretiva
                        </span>
                        <textarea
                          rows={3}
                          value={(nc as any).acaoCorretiva || ""}
                          disabled={nc.status === "Resolvida"}
                          onChange={(e) =>
                            atualizarNC(nc.id, { acaoCorretiva: e.target.value })
                          }
                          placeholder="Descreva o que deverá ser feito para corrigir a não conformidade..."
                          className="w-full rounded-xl border p-3"
                        />
                      </label>

                      <label>
                        <span className="mb-1 block text-xs font-extrabold text-slate-500">
                          Responsável
                        </span>
                        <input
                          value={(nc as any).responsavelAcao || ""}
                          disabled={nc.status === "Resolvida"}
                          onChange={(e) =>
                            atualizarNC(nc.id, { responsavelAcao: e.target.value })
                          }
                          placeholder="Nome do responsável pela correção"
                          className="w-full rounded-xl border p-3"
                        />
                      </label>

                      <label>
                        <span className="mb-1 block text-xs font-extrabold text-slate-500">
                          Prazo
                        </span>
                        <input
                          type="date"
                          value={(nc as any).prazo || ""}
                          disabled={nc.status === "Resolvida"}
                          onChange={(e) =>
                            atualizarNC(nc.id, { prazo: e.target.value })
                          }
                          className="w-full rounded-xl border p-3"
                        />
                      </label>

                      <label className="md:col-span-2">
                        <span className="mb-1 block text-xs font-extrabold text-slate-500">
                          Acompanhamento / verificação
                        </span>
                        <textarea
                          rows={2}
                          value={(nc as any).acompanhamento || ""}
                          disabled={nc.status === "Resolvida"}
                          onChange={(e) =>
                            atualizarNC(nc.id, { acompanhamento: e.target.value })
                          }
                          placeholder="Registre retorno, evidência de correção ou observações do acompanhamento..."
                          className="w-full rounded-xl border p-3"
                        />
                      </label>
                    </div>

                    {nc.status === "Resolvida" ? (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                        Registro protegido. Para reabrir ou alterar uma Não Conformidade resolvida,
                        use o módulo Acompanhamento e registre uma nova atualização no histórico.
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                        As alterações são salvas automaticamente.
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : view === "acompanhamento" && visitaAtual ? (
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase text-emerald-700">Pós-visita</div>
                  <h1 className="mt-1 text-2xl font-extrabold">Acompanhamento das ações</h1>
                  <p className="text-sm text-slate-500">{empresaVisita?.nomeFantasia} • {fdata(visitaAtual.data)}</p>
                </div>
                <button onClick={() => setView("visita")} className="rounded-xl bg-slate-100 px-4 py-2 font-bold">Voltar à Central</button>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <MetricCard label="Não conformidades" value={ncsVisita.length} />
                <MetricCard label="Em aberto" value={ncsVisita.filter((nc) => nc.status !== "Resolvida").length} />
                <MetricCard label="Resolvidas" value={ncsVisita.filter((nc) => nc.status === "Resolvida").length} />
                <MetricCard label="Vencidas" value={ncsVisita.filter((nc) => situacaoPrazoNC(nc.prazo, nc.status).label === "Vencida").length} />
              </div>
            </div>
            {ncsVisita.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <div className="text-xl font-extrabold">Nenhuma ação para acompanhar</div>
                <p className="mt-2 text-sm text-slate-500">As não conformidades identificadas na visita aparecerão aqui.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap gap-2">
                    {(["Todos", "Abertas", "Em tratamento", "Resolvidas", "Vencidas"] as const).map((filtro) => (
                      <button key={filtro} onClick={() => setFiltroAcompanhamento(filtro)}
                        className={`rounded-full px-4 py-2 text-sm font-extrabold ${filtroAcompanhamento === filtro ? "bg-[#2F5597] text-white" : "bg-slate-100 text-slate-700"}`}>
                        {filtro}
                      </button>
                    ))}
                  </div>
                </div>
                {[...ncsVisita].filter((nc) => {
                  if (filtroAcompanhamento === "Todos") return true;
                  if (filtroAcompanhamento === "Abertas") return nc.status === "Aberta";
                  if (filtroAcompanhamento === "Em tratamento") return nc.status === "Em tratamento";
                  if (filtroAcompanhamento === "Resolvidas") return nc.status === "Resolvida";
                  return situacaoPrazoNC(nc.prazo, nc.status).label === "Vencida";
                }).sort((a,b) => {
                  if (a.status === "Resolvida" && b.status !== "Resolvida") return 1;
                  if (a.status !== "Resolvida" && b.status === "Resolvida") return -1;
                  return (a.prazo || "9999-12-31").localeCompare(b.prazo || "9999-12-31");
                }).map((nc) => {
                  const situacaoPrazo = situacaoPrazoNC(nc.prazo, nc.status);
                  const vencida = situacaoPrazo.label === "Vencida";
                  const evidenciasDaNc = (db.evidencias || []).filter((ev) => ev.ncId === nc.id);
                  return (
                    <div
                      key={nc.id}
                      className={`rounded-2xl p-5 shadow-sm ${
                        nc.status === "Resolvida"
                          ? "border border-emerald-200 bg-emerald-50/40"
                          : "bg-white"
                      }`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold">{nc.criticidade}</span>
                            <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${nc.status === "Resolvida" ? "bg-emerald-100 text-emerald-800" : nc.status === "Em tratamento" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>{nc.status}</span>
                            <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${situacaoPrazo.classe}`}>{situacaoPrazo.label}</span>
                            <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                              evidenciasDaNc.length > 0
                                ? "bg-violet-100 text-violet-800"
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              {evidenciasDaNc.length > 0
                                ? `${evidenciasDaNc.length} evidência(s)`
                                : "Sem evidência"}
                            </span>
                            {!nc.acaoCorretiva?.trim() && nc.status !== "Resolvida" && <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-extrabold text-white">Ação não definida</span>}
                          </div>
                          <h2 className="mt-3 text-lg font-extrabold">{nc.titulo}</h2>
                          <p className="mt-1 text-sm text-slate-500">{nc.ambiente} • {nc.categoria}</p>
                        </div>
                        <button onClick={() => setView("plano")} className="rounded-xl bg-[#2F5597] px-4 py-2 text-sm font-extrabold text-white">Editar plano</button>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs font-extrabold uppercase text-slate-500">Responsável</div><div className="mt-1 font-bold">{nc.responsavelAcao || "Não definido"}</div></div>
                        <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs font-extrabold uppercase text-slate-500">Prazo</div><div className={`mt-1 font-bold ${vencida ? "text-red-700" : ""}`}>{nc.prazo ? fdata(nc.prazo) : "Não definido"}</div></div>
                        <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs font-extrabold uppercase text-slate-500">Situação do prazo</div><div className="mt-1 font-bold">{situacaoPrazo.label}</div></div>
                        {nc.status === "Resolvida" && nc.resolvidaEm && (
                          <div className="rounded-xl bg-emerald-50 p-3 md:col-span-3">
                            <div className="text-xs font-extrabold uppercase text-emerald-700">Resolvida em</div>
                            <div className="mt-1 font-bold text-emerald-900">
                              {new Date(nc.resolvidaEm).toLocaleString("pt-BR")}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 rounded-xl border border-slate-200 p-3"><div className="text-xs font-extrabold uppercase text-slate-500">Ação corretiva</div><div className="mt-1 text-sm">{nc.acaoCorretiva?.trim() || "Ainda não definida no plano de ação."}</div></div>
                      {nc.status === "Resolvida" && (
                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                            <div className="text-xs font-extrabold uppercase text-emerald-700">Fechamento</div>
                            <div className="mt-1 font-bold text-emerald-950">
                              {nc.resolvidaEm ? new Date(nc.resolvidaEm).toLocaleString("pt-BR") : "Data não registrada"}
                            </div>
                          </div>
                          <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
                            <div className="text-xs font-extrabold uppercase text-violet-700">Evidências</div>
                            <div className="mt-1 font-bold text-violet-950">{evidenciasDaNc.length} vinculada(s)</div>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-xs font-extrabold uppercase text-slate-500">Registros de acompanhamento</div>
                            <div className="mt-1 font-bold text-slate-900">{nc.historicoAcompanhamento?.length || 0} registro(s)</div>
                          </div>
                        </div>
                      )}
                      {nc.status === "Resolvida" && evidenciasDaNc.length === 0 && (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                          <span className="font-extrabold">Atenção:</span> esta ação está marcada como resolvida, mas ainda não possui evidência vinculada.
                        </div>
                      )}
                      <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="text-xs font-extrabold uppercase text-violet-800">
                              Evidências da correção
                            </div>
                            <div className="mt-1 text-sm text-violet-950">
                              {evidenciasDaNc.length > 0
                                ? `${evidenciasDaNc.length} registro(s) vinculado(s) a esta não conformidade.`
                                : "Nenhuma evidência vinculada a esta não conformidade."}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setEvidenciaNcId(nc.id);
                              setEvidenciaAmbiente(nc.ambiente || "");
                              setView("evidencias");
                            }}
                            className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-extrabold text-white"
                          >
                            + Adicionar evidência
                          </button>
                        </div>

                        {evidenciasDaNc.length > 0 && (
                          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {evidenciasDaNc.slice(0, 6).map((ev) => (
                              <div key={ev.id} className="rounded-xl border border-violet-100 bg-white p-3">
                                <div className="text-xs font-extrabold uppercase text-violet-700">
                                  {ev.tipo}
                                </div>
                                <div className="mt-1 truncate text-sm font-bold">
                                  {ev.descricao?.trim() || ev.nomeArquivo}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {new Date(ev.criadoEm).toLocaleString("pt-BR")}
                                </div>
                                {ev.tipo === "Foto" && urlEvidencia(ev) && (
                                  <a
                                    href={urlEvidencia(ev)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block"
                                  >
                                    <img
                                      src={urlEvidencia(ev)}
                                      alt={ev.descricao || ev.nomeArquivo}
                                      className="mt-3 h-28 w-full rounded-lg object-cover"
                                    />
                                  </a>
                                )}
                                {ev.tipo === "Áudio" && urlEvidencia(ev) && (
                                  <audio
                                    controls
                                    className="mt-3 w-full"
                                    src={urlEvidencia(ev)}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {evidenciasDaNc.length > 6 && (
                          <button
                            onClick={() => {
                              setEvidenciaNcId(nc.id);
                              setView("evidencias");
                            }}
                            className="mt-3 text-sm font-extrabold text-violet-800"
                          >
                            Ver todas as evidências →
                          </button>
                        )}
                      </div>

                      {nc.status === "Resolvida" && (
                        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                          <div className="text-sm font-extrabold text-emerald-900">
                            ✓ Não conformidade resolvida
                          </div>
                          <div className="mt-1 text-sm text-emerald-800">
                            O histórico e as evidências permanecem disponíveis para rastreabilidade.
                          </div>
                          {nc.historicoAcompanhamento?.length ? (
                            <div className="mt-3 rounded-xl bg-white/70 p-3">
                              <div className="text-xs font-extrabold uppercase text-emerald-700">Registro final</div>
                              <div className="mt-1 text-sm font-medium text-emerald-950">
                                {[...nc.historicoAcompanhamento].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))[0].observacao}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}

                      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                        <div className="text-xs font-extrabold uppercase text-[#2F5597]">
                          {nc.status === "Resolvida" ? "Registrar nova atualização / reabrir" : "Registrar atualização"}
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_190px]">
                          <textarea
                            rows={3}
                            className="w-full rounded-xl border bg-white p-3 text-sm"
                            placeholder="Ex.: piso comprado; aguardando instalação; correção concluída..."
                            value={textoAcompanhamento[nc.id] || ""}
                            onChange={(e) =>
                              setTextoAcompanhamento((o) => ({
                                ...o,
                                [nc.id]: e.target.value,
                              }))
                            }
                          />
                          <div className="space-y-2">
                            <select
                              className="w-full rounded-xl border bg-white p-3 text-sm font-bold"
                              value={statusAcompanhamento[nc.id] || nc.status}
                              onChange={(e) =>
                                setStatusAcompanhamento((o) => ({
                                  ...o,
                                  [nc.id]: e.target.value as "Aberta" | "Em tratamento" | "Resolvida",
                                }))
                              }
                            >
                              <option value="Aberta">Aberta</option>
                              <option value="Em tratamento">Em tratamento</option>
                              <option value="Resolvida">Resolvida</option>
                            </select>
                            <button
                              onClick={() => registrarAcompanhamento(nc.id)}
                              className="w-full rounded-xl bg-[#17365D] p-3 text-sm font-extrabold text-white"
                            >
                              {statusAcompanhamento[nc.id] === "Resolvida"
                                ? "Concluir e registrar"
                                : "Registrar atualização"}
                            </button>
                            {statusAcompanhamento[nc.id] === "Resolvida" && (
                              <div className="rounded-lg bg-amber-50 p-2 text-xs font-bold text-amber-900">
                                Para concluir, é necessário ter pelo menos uma evidência vinculada.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {(nc.historicoAcompanhamento?.length || nc.acompanhamento?.trim()) && (
                        <div className="mt-4 rounded-xl border border-slate-200 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-xs font-extrabold uppercase text-slate-500">Histórico de acompanhamento</div>
                            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                              {nc.historicoAcompanhamento?.length || 1} registro(s)
                            </div>
                          </div>

                          <div className="mt-3 space-y-3">
                            {nc.historicoAcompanhamento?.length ? (
                              [...nc.historicoAcompanhamento]
                                .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
                                .map((item) => (
                                  <div key={item.id} className="rounded-xl bg-slate-50 p-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="text-xs font-bold text-slate-500">
                                        {new Date(item.criadoEm).toLocaleString("pt-BR")}
                                      </div>
                                      <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                                        item.status === "Resolvida"
                                          ? "bg-emerald-100 text-emerald-800"
                                          : item.status === "Em tratamento"
                                            ? "bg-amber-100 text-amber-800"
                                            : "bg-red-100 text-red-800"
                                      }`}>
                                        {item.status}
                                      </span>
                                    </div>
                                    <div className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                                      {item.observacao}
                                    </div>
                                  </div>
                                ))
                            ) : (
                              <div className="rounded-xl bg-slate-50 p-3">
                                <div className="text-xs font-bold text-slate-500">Registro anterior</div>
                                <div className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                                  {nc.acompanhamento}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : view === "ncs" && visitaAtual ? (
          <section className="space-y-4">
            <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wider text-red-700">Resultado da inspeção</div>
                  <h1 className="mt-1 text-2xl font-extrabold">Não conformidades</h1>
                  <p className="text-sm text-slate-500">{empresaVisita?.nomeFantasia} • {fdata(visitaAtual.data)}</p>
                </div>
                <button onClick={() => setView("visita")} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">Voltar à Central</button>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <MetricCard label="NCs identificadas" value={ncsVisita.length} />
                <MetricCard label="Abertas" value={ncsAbertas} />
                <MetricCard label="Resolvidas" value={ncsVisita.filter((nc) => nc.status === "Resolvida").length} />
              </div>
            </div>

            {ncsVisita.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <div className="text-xl font-extrabold">Nenhuma não conformidade registrada</div>
                <p className="mt-2 text-sm text-slate-500">Itens marcados como Não Conforme no checklist aparecerão aqui automaticamente.</p>
                <button onClick={abrirChecklist} className="mt-5 rounded-xl bg-[#2F5597] px-5 py-3 font-extrabold text-white">Abrir checklist</button>
              </div>
            ) : (
              <div className="space-y-3">
                {ncsVisita.map((nc, idx) => (
                  <article key={nc.id} className="rounded-2xl border-2 border-red-100 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-xs font-extrabold uppercase tracking-wide text-slate-400">NC {String(idx + 1).padStart(2, "0")} • {nc.ambiente} • {nc.categoria}</div>
                        <h2 className="mt-1 text-xl font-extrabold">{nc.titulo}</h2>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${nc.criticidade === "Crítica" ? "bg-red-50 text-red-700" : nc.criticidade === "Importante" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{nc.criticidade}</span>
                          {nc.referencia && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">{nc.referencia}</span>}
                        </div>
                      </div>
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-extrabold text-red-700">{nc.status}</span>
                    </div>
                    {nc.observacao && <div className="mt-4 rounded-xl bg-red-50 p-4"><div className="text-xs font-extrabold uppercase text-red-700">Constatação em campo</div><p className="mt-1 text-sm text-red-900">{nc.observacao}</p></div>}
                    {nc.orientacao && <div className="mt-3 rounded-xl bg-slate-50 p-4"><div className="text-xs font-extrabold uppercase text-slate-500">Orientação técnica</div><p className="mt-1 text-sm text-slate-700">{nc.orientacao}</p></div>}
                    <div className="mt-4 text-xs text-slate-400">Gerada automaticamente a partir do checklist técnico.</div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : view === "checklist" && visitaAtual ? (
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#2F5597]">
                    Checklist técnico
                  </div>
                  <h1 className="mt-1 text-2xl font-extrabold">
                    Avaliação por ambiente
                  </h1>
                  <p className="text-sm text-slate-500">
                    {empresaVisita?.nomeFantasia} • {fdata(visitaAtual.data)}
                  </p>
                </div>

                <button
                  onClick={() => setView("visita")}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700"
                >
                  Voltar à Central
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <MetricCard label="Itens" value={totalChecklist} />
                <MetricCard label="Respondidos" value={respondidos} />
                <MetricCard label="Progresso checklist" value={`${percentualChecklist}%`} />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
              <aside className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="text-sm font-extrabold">Roteiro do checklist</div>
                <div className="mt-3 space-y-4">
                  {gruposRoteiroChecklist.map((grupo) => (
                    <div
                      key={grupo.titulo}
                      className={grupo.titulo === "Verificação geral" ? "border-t-2 border-blue-100 pt-4" : ""}
                    >
                      <div className={`mb-2 font-extrabold uppercase tracking-wide ${
                        grupo.titulo === "Verificação geral"
                          ? "text-sm text-[#2F5597]"
                          : "text-xs text-slate-400"
                      }`}>
                        {grupo.titulo}
                      </div>
                      <div className="space-y-2">
                        {grupo.itens.map((ambiente) => {
                          const itensAmb = checklistAtual.filter((i) => i.ambiente === ambiente);
                          const respAmb = itensAmb.filter((i) => i.status !== "Pendente").length;
                          const ativo = ambienteChecklistAtivo === ambiente;
                          const verificacaoGeral = ambiente === AMBIENTE_PROGRAMAS_CONTROLE;

                          return (
                            <button
                              key={ambiente}
                              onClick={() => setAmbienteChecklistAtivo(ambiente)}
                              className={`w-full rounded-xl p-3 text-left ${
                                ativo
                                  ? "bg-[#17365D] text-white"
                                  : verificacaoGeral
                                  ? "border-2 border-blue-200 bg-blue-50 text-[#17365D]"
                                  : "bg-slate-50"
                              }`}
                            >
                              <div className={verificacaoGeral ? "text-base font-extrabold" : "font-extrabold"}>
                                {verificacaoGeral ? "▣ Programas de Controle de Qualidade" : ambiente}
                              </div>
                              {verificacaoGeral && (
                                <div className={`mt-1 text-xs ${ativo ? "text-blue-100" : "text-slate-600"}`}>
                                  Documentos, registros, responsáveis e frequências
                                </div>
                              )}
                              <div className={`mt-1 text-xs ${ativo ? "text-blue-100" : "text-slate-500"}`}>
                                <span>{respAmb}/{itensAmb.length} respondidos</span>
                                {itensAmb.length > 0 && respAmb === itensAmb.length && (
                                  <span className={`ml-2 font-extrabold ${ativo ? "text-emerald-200" : "text-emerald-700"}`}>
                                    ✓ Concluído
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </aside>

              <div className="space-y-3">
                <div
                  id="checklist-ambiente-topo"
                  className="scroll-mt-4 rounded-2xl bg-white p-5 shadow-sm"
                >
                  <div className="text-xs font-extrabold uppercase text-slate-400">
                    Etapa atual
                  </div>
                  <h2 className="mt-1 text-2xl font-extrabold">
                    {ambienteChecklistAtivo}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Marque Conforme, Não Conforme ou Não se aplica e registre observações quando necessário.
                  </p>
                  {ambienteChecklistAtivo !== AMBIENTE_PROGRAMAS_CONTROLE && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-extrabold">
                      <span className="rounded-full bg-blue-50 px-3 py-1.5 text-[#2F5597]">
                        Capítulo 1 • Estrutura física
                      </span>
                      {checklistAtual.some(
                        (item) =>
                          item.ambiente === ambienteChecklistAtivo &&
                          item.referencia?.includes("Capítulo 2")
                      ) && (
                        <span className="rounded-full bg-violet-50 px-3 py-1.5 text-violet-700">
                          Capítulo 2 • Fluxos operacionais
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="sticky top-2 z-20 rounded-2xl border border-blue-200 bg-white/95 p-3 shadow-lg backdrop-blur">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#2F5597]">
                        Modo visita rápida
                      </div>
                      <div className="mt-0.5 text-sm font-bold text-slate-700">
                        {pendentesAmbienteAtivo} pendente{pendentesAmbienteAtivo === 1 ? "" : "s"} neste ambiente
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={irParaProximaPendencia}
                      className="rounded-xl bg-[#17365D] px-4 py-2.5 text-sm font-extrabold text-white"
                    >
                      Próxima pendência →
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
                    {(["Todos", "Pendentes", "Não conformes"] as FiltroChecklistRapido[]).map((filtro) => (
                      <button
                        key={filtro}
                        type="button"
                        onClick={() => setFiltroChecklistRapido(filtro)}
                        className={`rounded-lg px-2 py-2 text-xs font-extrabold ${
                          filtroChecklistRapido === filtro
                            ? "bg-white text-[#17365D] shadow-sm"
                            : "text-slate-500"
                        }`}
                      >
                        {filtro}
                      </button>
                    ))}
                  </div>
                </div>

                {itensChecklistVisiveis.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
                    <div className="font-extrabold text-slate-800">
                      Nenhum item neste filtro
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Escolha “Todos” ou avance para a próxima pendência da visita.
                    </p>
                  </div>
                )}

                {itensChecklistVisiveis
                  .map((item) => {
                    const idx = itensAmbienteChecklistAtivo.findIndex(
                      (itemOriginal) => itemOriginal.id === item.id
                    );
                    const criterioCapitulo2 = item.referencia?.includes("Capítulo 2");
                    const criterioCapitulo3 = item.referencia?.includes("Capítulo 3");
                    const ncDoItem = (db.ncs || []).find(
                      (nc) =>
                        nc.visitaId === visitaAtual.id &&
                        nc.checklistItemId === item.id &&
                        !nc.inativaNoChecklist
                    );
                    return (
                    <article
                      key={item.id}
                      id={`checklist-item-${item.id}`}
                      onFocusCapture={() => setUltimoItemChecklistId(item.id)}
                      className={`scroll-mt-4 rounded-2xl bg-white p-5 shadow-sm ${
                        item.status === "Não Conforme"
                          ? "border-2 border-red-200"
                          : item.status === "Conforme"
                          ? "border border-emerald-200"
                          : criterioCapitulo2
                          ? "border-2 border-violet-200"
                          : criterioCapitulo3
                          ? "border-2 border-blue-200"
                          : "border border-transparent"
                      }`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className={`text-xs font-extrabold uppercase tracking-wide ${
                            criterioCapitulo2
                              ? "text-violet-700"
                              : criterioCapitulo3
                              ? "text-[#2F5597]"
                              : "text-slate-400"
                          }`}>
                            {criterioCapitulo2
                              ? `Capítulo 2 • ${item.categoria.replace("Operação — ", "")}`
                              : criterioCapitulo3
                              ? `Capítulo 3 • ${item.categoria}`
                              : `Capítulo 1 • Item ${idx + 1} • ${item.categoria}`}
                          </div>
                          <h3 className="mt-1 text-lg font-extrabold">
                            {item.titulo}
                          </h3>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.criticidade && (
                              <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                                  item.criticidade === "Crítica"
                                    ? "bg-red-50 text-red-700"
                                    : item.criticidade === "Importante"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {item.criticidade}
                              </span>
                            )}
                            {item.referencia && (
                              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                                {item.referencia}
                              </span>
                            )}
                          </div>
                          {item.orientacao && (
                            <p className="mt-2 text-sm text-slate-500">
                              {item.orientacao}
                            </p>
                          )}
                        </div>

                        <div
                          className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                            item.status === "Conforme"
                              ? "bg-emerald-50 text-emerald-700"
                              : item.status === "Não Conforme" && ncDoItem?.status === "Resolvida"
                              ? "bg-emerald-50 text-emerald-700"
                              : item.status === "Não Conforme"
                              ? "bg-red-50 text-red-700"
                              : item.status === "Não se aplica"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {item.status === "Não Conforme" && ncDoItem
                            ? `Não Conforme • ${ncDoItem.status}`
                            : item.status}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {(["Conforme", "Não Conforme", "Não se aplica"] as ChecklistStatus[]).map(
                          (status) => (
                            <button
                              key={status}
                              onClick={() => {
                                atualizarChecklistItem(item.id, {
                                  status,
                                  ...(status !== "Não Conforme"
                                    ? { observacao: "" }
                                    : {}),
                                });

                                if (
                                  status === "Conforme" ||
                                  status === "Não se aplica"
                                ) {
                                  rolarParaProximoItem(item.id);
                                }
                              }}
                              className={`rounded-xl px-3 py-3 text-sm font-extrabold ${
                                item.status === status
                                  ? status === "Conforme"
                                    ? "bg-emerald-600 text-white"
                                    : status === "Não Conforme"
                                    ? "bg-red-600 text-white"
                                    : "bg-slate-700 text-white"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {status}
                            </button>
                          )
                        )}
                      </div>

                      {item.status === "Não Conforme" ? (
                        <label className="mt-4 block">
                          <span className="mb-1 block text-xs font-bold text-red-700">
                            Descrição da não conformidade
                          </span>
                          <textarea
                            rows={3}
                            className="w-full rounded-xl border border-red-200 p-3"
                            placeholder="Descreva a não conformidade observada..."
                            value={item.observacao}
                            onChange={(e) =>
                              atualizarChecklistItem(item.id, {
                                observacao: e.target.value,
                              })
                            }
                          />
                          {item.observacao.trim() && (
                            <button
                              type="button"
                              onClick={() => rolarParaProximoItem(item.id)}
                              className="mt-2 w-full rounded-xl bg-[#173B67] px-4 py-3 text-sm font-extrabold text-white"
                            >
                              Próximo item →
                            </button>
                          )}
                        </label>
                      ) : (
                        <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60">
                          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-bold text-slate-500">
                            + Observação opcional
                          </summary>
                          <div className="px-3 pb-3">
                            <textarea
                              rows={2}
                              className="w-full rounded-xl border p-3"
                              placeholder="Observação opcional"
                              value={item.observacao}
                              onChange={(e) =>
                                atualizarChecklistItem(item.id, {
                                  observacao: e.target.value,
                                })
                              }
                            />
                          </div>
                        </details>
                      )}

                      {item.status === "Não Conforme" && (
                        ncDoItem ? (
                          <div
                            className={`mt-3 rounded-xl p-3 text-sm ${
                              ncDoItem.status === "Resolvida"
                                ? "bg-emerald-50 text-emerald-800"
                                : "bg-amber-50 text-amber-900"
                            }`}
                          >
                            {ncDoItem.status === "Resolvida"
                              ? "Não conformidade registrada e resolvida. O achado original permanece no checklist para rastreabilidade."
                              : `Não conformidade já registrada e em acompanhamento — status: ${ncDoItem.status}.`}
                          </div>
                        ) : (
                          <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
                            Este item gerará uma Não Conformidade para acompanhamento.
                          </div>
                        )
                      )}
                    </article>
                    );
                  })}

                {ambienteChecklistAtivo !== AMBIENTE_PROGRAMAS_CONTROLE && (
                  <article className="rounded-2xl border-2 border-blue-100 bg-white p-4 shadow-sm">
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-wide text-[#2F5597]">
                        Quadro do ambiente
                      </div>
                      <h3 className="mt-0.5 text-lg font-extrabold text-slate-950">
                        Equipamentos e móveis
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Itens existentes neste ambiente, conforme o Manual.
                      </p>
                    </div>

                    {equipamentosAmbienteAtivo.length === 0 ? (
                      <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                        Nenhum equipamento ou móvel cadastrado para este ambiente. Você pode incluir o item encontrado abaixo.
                      </div>
                    ) : (
                      <div className="mt-3 overflow-hidden rounded-xl border-2 border-blue-200 bg-blue-50/70">
                        <div className="flex items-center justify-between gap-3 bg-blue-100/80 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-wide text-[#2F5597]">
                          <span>Equipamento ou móvel</span>
                          <span>Qtd.</span>
                        </div>
                        {equipamentosAmbienteAtivo.map((equipamento, indice) => (
                          <div
                            key={equipamento.id}
                            className={`flex items-center justify-between gap-3 px-3 py-2 ${
                              indice > 0 ? "border-t border-blue-200" : ""
                            }`}
                          >
                            <div className="min-w-0 flex-1 text-sm font-normal text-slate-900">
                              {equipamento.nome}
                            </div>
                            <input
                              type="number"
                              min="1"
                              value={equipamento.quantidade}
                              onChange={(event) => atualizarQuantidadeEquipamento(equipamento.id, Number(event.target.value))}
                              aria-label={`Quantidade de ${equipamento.nome}`}
                              className="w-16 shrink-0 rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-center text-sm font-semibold text-slate-900"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <details className="mt-3 rounded-xl bg-slate-50 p-3">
                      <summary className="cursor-pointer select-none text-xs font-extrabold text-[#2F5597]">
                        + Adicionar equipamento ou móvel
                      </summary>
                      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_100px_auto]">
                        <input
                          value={novoEquipamentoVisitaNome}
                          onChange={(event) => setNovoEquipamentoVisitaNome(event.target.value)}
                          placeholder="Ex.: Refrigerador, bancada, armário"
                          className="min-w-0 rounded-xl border bg-white p-3 text-sm"
                        />
                        <input
                          type="number"
                          min="1"
                          value={novoEquipamentoVisitaQuantidade}
                          onChange={(event) => setNovoEquipamentoVisitaQuantidade(event.target.value)}
                          aria-label="Quantidade"
                          className="rounded-xl border bg-white p-3 text-sm"
                        />
                        <button
                          type="button"
                          onClick={adicionarEquipamentoEncontradoNaVisita}
                          className="rounded-xl bg-[#2F5597] px-4 py-3 text-sm font-extrabold text-white"
                        >
                          Adicionar
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        O item ficará cadastrado neste ambiente e aparecerá nas próximas visitas.
                      </p>
                    </details>

                    <button
                      type="button"
                      onClick={avancarParaProximoAmbiente}
                      className="mt-3 w-full rounded-xl bg-[#17365D] px-4 py-2.5 text-sm font-extrabold text-white"
                    >
                      {pendentesAmbienteAtivo > 0
                        ? `Avançar com ${pendentesAmbienteAtivo} pendente(s) →`
                        : "Concluir ambiente e avançar →"}
                    </button>
                  </article>
                )}

                <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-900">
                  As respostas são salvas automaticamente. Itens marcados como
                  <b> Não Conforme</b> geram uma Não Conformidade vinculada ao critério,
                  preservando plano, evidências e histórico para rastreabilidade.
                </div>
              </div>
            </div>
          </section>
        ) : view === "visita" && visitaAtual ? (
          <section className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#2F5597]">
                    Central da Visita
                  </div>
                  <h1 className="mt-1 truncate text-lg font-extrabold leading-tight text-slate-950">
                    {empresaVisita?.nomeFantasia}
                  </h1>
                  <div className="mt-1 text-xs text-slate-500">
                    {fdata(visitaAtual.data)}
                    {visitaAtual.responsavel
                      ? ` • ${visitaAtual.responsavel}`
                      : " • Responsável não informado"}
                  </div>
                </div>

                <button
                  onClick={() => setView("visitas")}
                  className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600"
                >
                  ← Voltar
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2 p-4 pb-3">
                <div>
                  <div className="text-sm font-extrabold text-slate-950">Visão geral da inspeção</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {(visitaAtual.ambientes || []).length} ambientes selecionados • toque em um ambiente para abrir
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-x-2 gap-y-1 text-[9px] font-bold text-slate-500">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Conforme</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />Atenção</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />Não conforme</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-400" />Não verificado</span>
                </div>
              </div>
              <div className="relative aspect-[16/8] overflow-hidden bg-slate-50 sm:aspect-[16/7]">
                <img src="/images/mapa-inspecao.webp" alt="Ilustração de uma área de produção de alimentos" className="h-full w-full object-cover" />
                <div className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-extrabold text-slate-600 shadow-sm">
                  Imagem ilustrativa • não representa a planta real
                </div>
                {resumoAmbientesVisita.length === 0 && (
                  <button type="button" onClick={abrirAmbientes} className="absolute inset-x-4 bottom-4 rounded-xl bg-white/95 px-4 py-3 text-sm font-extrabold text-[#2F5597] shadow-md">
                    Selecionar ambientes →
                  </button>
                )}
              </div>
              {resumoAmbientesVisita.length > 0 && (
                <div className="space-y-5 border-t border-slate-100 p-4">
                  {ambientesAgrupadosCentral.map((grupo) => (
                    <div key={grupo.titulo}>
                      <div className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-[#2F5597]">
                        {grupo.titulo}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {grupo.ambientes.map((resumo) => (
                          <button
                            key={resumo.ambiente}
                            type="button"
                            onClick={() => abrirChecklistNoAmbiente(resumo.ambiente)}
                            className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50"
                          >
                            <span className={`h-3 w-3 shrink-0 rounded-full ${
                              resumo.status === "Conforme" ? "bg-emerald-500" :
                              resumo.status === "Atenção" ? "bg-amber-500" :
                              resumo.status === "Não conforme" ? "bg-red-500" : "bg-slate-400"
                            }`} />
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-extrabold leading-snug text-slate-800">
                                {resumo.ambiente}
                              </span>
                              <span className="mt-1 block text-[10px] text-slate-500">
                                {resumo.respondidos} de {resumo.itens} perguntas
                                {resumo.equipamentos > 0
                                  ? ` • ${resumo.equipamentos} equipamento(s)`
                                  : ""}
                                {` • ${resumo.status}`}
                              </span>
                            </span>
                            <span className="shrink-0 text-sm font-bold text-[#2F5597]">→</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {programasChecklistAtivos.length > 0 && (
              <button
                type="button"
                onClick={() => abrirChecklistNoAmbiente(AMBIENTE_PROGRAMAS_CONTROLE)}
                className="w-full rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 text-left shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#2F5597]">
                      Verificação geral • Capítulo 3
                    </div>
                    <div className="mt-1 text-base font-extrabold text-[#17365D]">
                      Programas de Controle de Qualidade
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {programasControleAtivos.length} programa(s) • {respondidosProgramasCentral} de {itensProgramasCentral.length} verificações • {statusProgramasCentral}
                    </div>
                  </div>
                  <span className="shrink-0 text-xl font-extrabold text-[#2F5597]">→</span>
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={() => abrirChecklistNoAmbiente(
                equipamentosDaVisita[0]?.setor || (visitaAtual.ambientes || [])[0]
              )}
              disabled={(visitaAtual.ambientes || []).length === 0}
              className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm disabled:opacity-50"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#2F5597]">
                    Quadro dos ambientes
                  </div>
                  <div className="mt-1 text-base font-extrabold text-slate-900">
                    Equipamentos e móveis
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {equipamentosDaVisita.length} tipo(s) cadastrado(s) • {totalUnidadesEquipamentos} unidade(s)
                  </div>
                </div>
                <span className="shrink-0 text-xl font-extrabold text-[#2F5597]">→</span>
              </div>
            </button>

            <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#2F5597 ${percentualChecklist * 3.6}deg, #e8eef7 0deg)` }}>
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-lg font-extrabold text-[#17365D]">{percentualChecklist}%</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-500">Próxima etapa</div>
                  <div className="font-extrabold leading-snug text-slate-950">{proximoAmbienteVisita || ((visitaAtual.ambientes || []).length ? "Revisar a inspeção" : "Definir ambientes")}</div>
                  <button
                    type="button"
                    onClick={() => (visitaAtual.ambientes || []).length ? abrirChecklist() : abrirAmbientes()}
                    disabled={!permitido("visitas.executar", visitaAtual.empresaId)}
                    className="mt-2 w-full rounded-lg bg-[#2F5597] px-3 py-2 text-xs font-extrabold text-white disabled:opacity-50"
                  >
                    {(visitaAtual.ambientes || []).length ? "Continuar checklist →" : "Selecionar ambientes →"}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <button type="button" onClick={abrirChecklist} className="rounded-2xl border border-emerald-100 bg-white p-4 text-left shadow-sm">
                <div className="text-xs font-bold text-emerald-700">✓ Conformes</div>
                <div className="mt-1 text-2xl font-extrabold text-slate-950">{conformesVisita}</div>
                <div className="text-[10px] text-slate-500">{percentualConformidade}% dos avaliados</div>
              </button>
              <button type="button" onClick={() => setView("ncs")} disabled={!permitido("ncs.acompanhar", visitaAtual.empresaId)} className="rounded-2xl border border-red-100 bg-white p-4 text-left shadow-sm disabled:opacity-50">
                <div className="text-xs font-bold text-red-700">× Não conformidades</div>
                <div className="mt-1 text-2xl font-extrabold text-slate-950">{ncsVisita.length}</div>
                <div className="text-[10px] text-slate-500">{ncsAbertas} em acompanhamento</div>
              </button>
              <button type="button" onClick={abrirEvidencias} className="rounded-2xl border border-blue-100 bg-white p-4 text-left shadow-sm">
                <div className="text-xs font-bold text-[#2F5597]">▣ Evidências</div>
                <div className="mt-1 text-2xl font-extrabold text-slate-950">{evidenciasVisita.length}</div>
                <div className="text-[10px] text-slate-500">{fotosVisita} fotos • {audiosVisita} áudios</div>
              </button>
              <button type="button" onClick={abrirChecklist} className="rounded-2xl border border-amber-100 bg-white p-4 text-left shadow-sm">
                <div className="text-xs font-bold text-amber-700">△ Pendências</div>
                <div className="mt-1 text-2xl font-extrabold text-slate-950">{pendentesVisita}</div>
                <div className="text-[10px] text-slate-500">Itens a verificar</div>
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-extrabold text-slate-950">Ações da visita</div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button type="button" onClick={abrirAmbientes} className="rounded-xl bg-blue-50 px-3 py-2.5 text-xs font-extrabold text-[#2F5597]">Ambientes</button>
                <button type="button" onClick={abrirEvidencias} className="rounded-xl bg-violet-50 px-3 py-2.5 text-xs font-extrabold text-violet-700">Evidências</button>
                <button type="button" onClick={() => setView("plano")} disabled={!ncsVisita.length || !permitido("ncs.acompanhar", visitaAtual.empresaId)} className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-extrabold text-amber-700 disabled:opacity-40">Plano de ação</button>
                <button type="button" onClick={() => setView("relatorio")} disabled={!permitido("relatorios.exportar", visitaAtual.empresaId) && !permitido("relatorios.aprovar", visitaAtual.empresaId)} className="rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-extrabold text-slate-700 disabled:opacity-40">Relatório</button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold text-slate-950">Atividade da visita</div>
                <button type="button" onClick={() => setView("acompanhamento")} disabled={!permitido("ncs.acompanhar", visitaAtual.empresaId)} className="text-xs font-extrabold text-[#2F5597] disabled:opacity-40">Acompanhamento →</button>
              </div>
              <div className="mt-3 space-y-3 text-xs">
                <div className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 font-extrabold text-emerald-700">✓</span><div><div className="font-extrabold">Visita iniciada</div><div className="text-slate-500">{fdata(visitaAtual.data)} • {visitaAtual.responsavel || "Responsável não informado"}</div></div></div>
                <div className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-100 font-extrabold text-[#2F5597]">•</span><div><div className="font-extrabold">Checklist em andamento</div><div className="text-slate-500">{respondidos} de {totalChecklist} itens respondidos</div></div></div>
                <div className="flex gap-3"><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full font-extrabold ${ncsVisita.length ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{ncsVisita.length ? "!" : "—"}</span><div><div className="font-extrabold">Não conformidades registradas</div><div className="text-slate-500">{ncsVisita.length} registros • {ncsAbertas} ainda abertos</div></div></div>
              </div>
            </div>
          </section>
        ) : view === "relatorio" && visitaAtual ? (
          <section id="relatorio-visita" className="report-print space-y-4">
            <div className="print-only report-document-header">
              <div>
                <div className="report-brand">MBP Expert AI</div>
                <div className="report-subtitle">Relatório Técnico de Inspeção em Segurança dos Alimentos</div>
              </div>
              <div className="report-date">{fdata(visitaAtual.data)}</div>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#2F5597]">
                    Encerramento da inspeção
                  </div>
                  <h1 className="mt-1 text-2xl font-extrabold">
                    Relatório da visita
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Revisão consolidada dos registros realizados em campo.
                  </p>
                  <div className="mt-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${visitaAtual.status === "Concluída" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                      {visitaAtual.status === "Concluída" ? "● Inspeção concluída" : "● Inspeção em andamento"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setView("visita")}
                  className="print-control rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700"
                >
                  Voltar à Central
                </button>
              </div>

              <div className="print-control mt-5" data-html2canvas-ignore="true">
                {visitaAtual.status === "Concluída" ? (
                  <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-extrabold text-emerald-900">✓ Inspeção finalizada</div>
                      <div className="text-sm text-emerald-800">Esta visita está marcada como Concluída.</div>
                    </div>
                    {permitido("visitas.concluir", visitaAtual.empresaId) && (
                      <button type="button" onClick={reabrirInspecao} className="rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-emerald-900 shadow-sm">
                        Reabrir inspeção
                      </button>
                    )}
                  </div>
                ) : permitido("visitas.concluir", visitaAtual.empresaId) ? (
                  <button type="button" onClick={finalizarInspecao} className="w-full rounded-xl bg-emerald-700 px-5 py-4 text-base font-extrabold text-white shadow-md">
                    ✓ Finalizar inspeção
                  </button>
                ) : null}
              </div>

              {permitido("relatorios.exportar", visitaAtual.empresaId) && (
              <div
                className="print-control mt-5 grid gap-2 md:grid-cols-[1fr_auto]"
                data-html2canvas-ignore="true"
              >
                <button
                  type="button"
                  onClick={baixarPdfRelatorio}
                  disabled={gerandoPdf}
                  className="w-full rounded-xl bg-[#2F5597] px-5 py-4 text-base font-extrabold text-white shadow-md transition hover:bg-[#24477f] disabled:cursor-wait disabled:opacity-70"
                >
                  {gerandoPdf ? "Gerando PDF..." : "Baixar relatório em PDF"}
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-xl bg-slate-100 px-5 py-4 text-base font-bold text-slate-900"
                >
                  Imprimir
                </button>

                <p className="text-center text-xs text-slate-500 md:col-span-2">
                  O PDF é gerado diretamente. Use “Imprimir” apenas se quiser enviar para uma impressora.
                </p>
              </div>
              )}

              {pendentesVisita > 0 && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <strong>Atenção:</strong> ainda existem {pendentesVisita} item(ns)
                  pendente(s) no checklist. O relatório pode ser revisado, mas a
                  inspeção ainda não está totalmente preenchida.
                </div>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <MetricCard label="Progresso do checklist" value={`${percentualChecklist}%`} />
              <MetricCard label="Conformidade dos itens avaliados" value={`${percentualConformidade}%`} />
              <MetricCard label="Não conformidades" value={ncsVisita.length} />
              <MetricCard label="Evidências" value={evidenciasVisita.length} />
            </div>

            <article className="print-card rounded-2xl bg-white p-5 shadow-sm">
              <div className="text-xs font-extrabold uppercase text-[#2F5597]">
                Resumo executivo
              </div>
              <h2 className="mt-1 text-xl font-extrabold">Panorama da inspeção</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Foram avaliados <strong>{itensAvaliadosVisita} item(ns)</strong>, com{" "}
                <strong>{conformesVisita} conforme(s)</strong> e{" "}
                <strong>{naoConformesVisita} não conforme(s)</strong>, resultando em{" "}
                <strong>{percentualConformidade}% de conformidade</strong> entre os itens avaliados.
                {pendentesVisita > 0
                  ? ` Permanecem ${pendentesVisita} item(ns) pendente(s) de avaliação.`
                  : " Não há itens pendentes no checklist."}
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-red-50 p-4">
                  <div className="text-xs font-extrabold uppercase text-red-700">NCs críticas</div>
                  <div className="mt-1 text-2xl font-extrabold text-red-950">{ncsCriticasVisita}</div>
                </div>
                <div className="rounded-xl bg-amber-50 p-4">
                  <div className="text-xs font-extrabold uppercase text-amber-700">NCs importantes</div>
                  <div className="mt-1 text-2xl font-extrabold text-amber-950">{ncsImportantesVisita}</div>
                </div>
                <div className="rounded-xl bg-blue-50 p-4">
                  <div className="text-xs font-extrabold uppercase text-blue-700">Ações definidas</div>
                  <div className="mt-1 text-2xl font-extrabold text-blue-950">{acoesDefinidas}/{ncsVisita.length}</div>
                </div>
                <div className="rounded-xl bg-slate-100 p-4">
                  <div className="text-xs font-extrabold uppercase text-slate-600">Ações vencidas</div>
                  <div className="mt-1 text-2xl font-extrabold text-slate-950">{ncsVencidasRelatorio}</div>
                </div>
              </div>

              {!relatorioProntoParaEncerrar && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="font-extrabold">Pendências para um fechamento completo</div>
                  <div className="mt-1">
                    {pendentesVisita > 0 && <span>{pendentesVisita} item(ns) de checklist pendente(s). </span>}
                    {ncsSemAcao > 0 && <span>{ncsSemAcao} NC(s) sem ação corretiva. </span>}
                    {ncsSemResponsavel > 0 && <span>{ncsSemResponsavel} NC(s) sem responsável. </span>}
                    {ncsSemPrazo > 0 && <span>{ncsSemPrazo} NC(s) sem prazo.</span>}
                  </div>
                </div>
              )}
            </article>

            <div className="grid gap-4 lg:grid-cols-3">
              <article className="rounded-2xl bg-white p-5 shadow-sm lg:col-span-2">
                <div className="text-xs font-extrabold uppercase text-slate-400">
                  Identificação
                </div>
                <h2 className="mt-1 text-xl font-extrabold">
                  {empresaVisita?.nomeFantasia || empresaVisita?.razaoSocial || "Empresa"}
                </h2>
                <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <span className="font-extrabold text-slate-500">CNPJ</span>
                    <div>{empresaVisita?.cnpj || "Não informado"}</div>
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-500">Data da visita</span>
                    <div>{fdata(visitaAtual.data)}</div>
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-500">Responsável pela visita</span>
                    <div>{visitaAtual.responsavel || "Não informado"}</div>
                    {visitaAtual.responsavelIdentificacao && (
                      <div className="text-xs text-slate-500">{visitaAtual.responsavelIdentificacao}</div>
                    )}
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-500">Município / UF</span>
                    <div>
                      {[empresaVisita?.municipio, empresaVisita?.uf]
                        .filter(Boolean)
                        .join(" / ") || "Não informado"}
                    </div>
                  </div>
                </div>
              </article>

              <article className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-xs font-extrabold uppercase text-slate-400">
                  Escopo
                </div>
                <h2 className="mt-1 text-xl font-extrabold">Ambientes avaliados</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(visitaAtual.ambientes || []).length > 0 ? (
                    (visitaAtual.ambientes || []).map((ambiente) => (
                      <span
                        key={ambiente}
                        className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800"
                      >
                        {ambiente}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">
                      Nenhum ambiente selecionado.
                    </span>
                  )}
                </div>
              </article>
            </div>

            <article className="print-block rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase text-slate-400">
                    Resultado técnico
                  </div>
                  <h2 className="mt-1 text-xl font-extrabold">
                    Resumo do checklist
                  </h2>
                </div>
                <div className="text-sm font-bold text-slate-500">
                  {respondidos}/{totalChecklist} respondidos • {itensAvaliadosVisita} item(ns) avaliados para conformidade
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-emerald-50 p-4">
                  <div className="text-xs font-extrabold uppercase text-emerald-700">
                    Conforme
                  </div>
                  <div className="mt-1 text-2xl font-extrabold">
                    {conformesVisita}
                  </div>
                </div>
                <div className="rounded-xl bg-red-50 p-4">
                  <div className="text-xs font-extrabold uppercase text-red-700">
                    Não conforme
                  </div>
                  <div className="mt-1 text-2xl font-extrabold">
                    {naoConformesVisita}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-100 p-4">
                  <div className="text-xs font-extrabold uppercase text-slate-600">
                    Não se aplica
                  </div>
                  <div className="mt-1 text-2xl font-extrabold">
                    {naoSeAplicaVisita}
                  </div>
                </div>
                <div className="rounded-xl bg-amber-50 p-4">
                  <div className="text-xs font-extrabold uppercase text-amber-700">
                    Pendente
                  </div>
                  <div className="mt-1 text-2xl font-extrabold">
                    {pendentesVisita}
                  </div>
                </div>
              </div>
            </article>

            <article className="print-block rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase text-[#2F5597]">
                    Capítulo 3
                  </div>
                  <h2 className="mt-1 text-xl font-extrabold">Programas de Controle e POPs</h2>
                </div>
                <div className="text-sm font-bold text-slate-500">
                  {programasControleAtivos.length} programa(s) • {popsRelatorio.length} POP(s)
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs font-extrabold uppercase text-slate-500">
                    Programas ativos ou em implantação
                  </div>
                  {programasControleAtivos.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">Nenhum programa ativo informado.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {programasControleAtivos.map((programa) => (
                        <div key={programa.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                          <div className="font-bold text-slate-900">{programa.nome}</div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            {programa.status}
                            {programa.responsavel ? ` • Responsável: ${programa.responsavel}` : ""}
                            {programa.frequencia ? ` • Frequência: ${programa.frequencia}` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs font-extrabold uppercase text-slate-500">
                    Procedimentos Operacionais Padronizados
                  </div>
                  {popsRelatorio.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">Nenhum POP cadastrado.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {popsRelatorio.map((pop) => (
                        <div key={pop.id} className="rounded-lg bg-blue-50 p-3 text-sm">
                          <div className="font-bold text-slate-900">
                            {pop.codigo ? `${pop.codigo} — ` : ""}{pop.titulo}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            {pop.status}{pop.versao ? ` • Versão ${pop.versao}` : ""}
                            {pop.responsavel ? ` • Responsável: ${pop.responsavel}` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>

            <article className="print-block rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase text-[#2F5597]">
                    Quadro dos ambientes
                  </div>
                  <h2 className="mt-1 text-xl font-extrabold">Equipamentos e móveis</h2>
                </div>
                <div className="text-sm font-bold text-slate-500">
                  {equipamentosRelatorio.length} tipo(s) • {totalUnidadesEquipamentos} unidade(s)
                </div>
              </div>

              {equipamentosRelatorio.length === 0 ? (
                <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  Nenhum equipamento ou móvel foi cadastrado nos ambientes desta visita.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                    <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                      <tr>
                        <th className="p-3">Ambiente</th>
                        <th className="p-3">Equipamento ou móvel</th>
                        <th className="p-3">Quantidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipamentosRelatorio.map((equipamento) => (
                        <tr key={equipamento.id} className="border-t border-slate-200 align-top">
                          <td className="p-3 font-bold">{equipamento.ambiente}</td>
                          <td className="p-3">{equipamento.nome}</td>
                          <td className="p-3 font-bold">{equipamento.quantidade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>

            <article
              data-pdf-section="nao-conformidades"
              className="print-block rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-extrabold uppercase text-slate-400">
                    Achados da inspeção
                  </div>
                  <h2 className="mt-1 text-xl font-extrabold">
                    Não conformidades
                  </h2>
                </div>
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-extrabold text-red-700">
                  {ncsVisita.length}
                </span>
              </div>

              {ncsVisita.length === 0 ? (
                <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                  Nenhuma não conformidade registrada nesta visita.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {ncsVisita.map((nc, idx) => (
                    <div
                      key={nc.id}
                      className="print-card rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="text-xs font-extrabold uppercase text-slate-400">
                            NC {String(idx + 1).padStart(2, "0")} • {nc.ambiente}
                          </div>
                          <div className="mt-1 font-extrabold">{nc.titulo}</div>
                        </div>
                        <span
                          className={`w-fit rounded-full px-3 py-1 text-xs font-extrabold ${
                            nc.status === "Resolvida"
                              ? "bg-emerald-50 text-emerald-700"
                              : nc.status === "Em tratamento"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-red-50 text-red-700"
                          }`}
                        >
                          {nc.status}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                          nc.criticidade === "Crítica"
                            ? "bg-red-100 text-red-800"
                            : nc.criticidade === "Importante"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                        }`}>
                          {nc.criticidade}
                        </span>
                        {nc.referencia && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                            {nc.referencia}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm">
                        <span className="font-extrabold text-red-700">
                          Constatação:
                        </span>{" "}
                        {nc.observacao || "Sem observação registrada."}
                      </div>

                      <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                        <div>
                          <span className="font-extrabold text-slate-500">
                            Ação corretiva
                          </span>
                          <div>{nc.acaoCorretiva || "Não definida"}</div>
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-500">
                            Responsável / Prazo
                          </span>
                          <div>
                            {nc.responsavelAcao || "Não informado"}
                            {nc.prazo ? ` • ${fdata(nc.prazo)}` : " • Sem prazo"}
                          </div>
                          <div className="mt-1 text-xs font-bold text-slate-500">
                            Situação do prazo: {situacaoPrazoNC(nc.prazo, nc.status).label}
                          </div>
                        </div>
                        {nc.acompanhamento && (
                          <div className="md:col-span-2">
                            <span className="font-extrabold text-slate-500">
                              Acompanhamento / verificação
                            </span>
                            <div>{nc.acompanhamento}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article
              data-pdf-section="evidencias"
              className="print-block rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-extrabold uppercase text-slate-400">
                    Registros de campo
                  </div>
                  <h2 className="mt-1 text-xl font-extrabold">Evidências</h2>
                </div>
                <div className="text-sm font-bold text-slate-500">
                  {fotosVisita} foto(s) • {audiosVisita} áudio(s) • {analisesIAConfirmadas} análise(s) confirmada(s)
                </div>
              </div>

              {evidenciasVisita.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  Nenhuma evidência registrada nesta visita.
                </p>
              ) : (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {evidenciasVisita.map((ev) => {
                    const ncRelacionadaRelatorio = ncsVisita.find((nc) => nc.id === ev.ncId);
                    const itemChecklistRelatorio = checklistAtual.find((item) => item.id === ev.checklistItemId);
                    const analiseConfirmada = ultimaAnaliseConfirmada(ev.analisesIA);
                    return (
                    <div
                      key={ev.id}
                      className="print-card overflow-hidden rounded-xl border border-slate-200"
                    >
                      <div className="p-4">
                        <div className="text-xs font-extrabold uppercase text-slate-400">
                          {ev.tipo} • {ev.ambiente || "Sem ambiente"}
                        </div>
                        <div className="mt-1 font-extrabold">
                          {ev.descricao || ev.nomeArquivo}
                        </div>
                        {ncRelacionadaRelatorio && (
                          <div className="mt-2 text-xs font-bold text-red-700">
                            Evidência vinculada: {ncRelacionadaRelatorio.titulo}
                          </div>
                        )}
                        {itemChecklistRelatorio && (
                          <div className="mt-2 text-xs font-bold text-blue-800">
                            Checklist: {itemChecklistRelatorio.categoria} — {itemChecklistRelatorio.titulo}
                          </div>
                        )}
                        {analiseConfirmada && (
                          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950">
                            <div className="font-extrabold uppercase text-emerald-800">
                              Análise assistida confirmada pelo profissional
                            </div>
                            <div className="mt-1 whitespace-pre-wrap">
                              {analiseConfirmada.textoRevisado}
                            </div>
                            <div className="mt-2 text-[10px] text-emerald-800">
                              Revisão: {analiseConfirmada.revisadaPor || "Profissional responsável"}
                              {analiseConfirmada.revisadaEm ? ` • ${new Date(analiseConfirmada.revisadaEm).toLocaleString("pt-BR")}` : ""}
                            </div>
                          </div>
                        )}
                        <div className="mt-2 text-[11px] text-slate-400">
                          Registro: {new Date(ev.criadoEm).toLocaleString("pt-BR")}
                        </div>
                      </div>
                      {ev.tipo === "Foto" ? (
                        <img
                          src={urlEvidencia(ev)}
                          alt={ev.descricao || "Evidência fotográfica"}
                          className="max-h-80 w-full object-contain"
                        />
                      ) : (
                        <div className="p-4 pt-0">
                          <audio
                            controls
                            src={urlEvidencia(ev)}
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </article>

            <article
              data-pdf-section="fechamento"
              className="print-card rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className="text-xs font-extrabold uppercase text-slate-400">
                Fechamento técnico
              </div>
              <h2 className="mt-1 text-xl font-extrabold">
                Síntese da inspeção
              </h2>
              <div className={`mt-3 rounded-xl border p-3 text-sm font-extrabold ${visitaAtual.status === "Concluída" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                Status da inspeção: {visitaAtual.status}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-slate-100 p-4">
                  <div className="text-xs font-extrabold uppercase text-slate-500">
                    Checklist
                  </div>
                  <div className="mt-1 font-extrabold">
                    {respondidos}/{totalChecklist} respondidos
                  </div>
                </div>

                <div className="rounded-xl bg-red-50 p-4">
                  <div className="text-xs font-extrabold uppercase text-red-700">
                    Abertas
                  </div>
                  <div className="mt-1 text-xl font-extrabold">
                    {ncsSomenteAbertas}
                  </div>
                </div>

                <div className="rounded-xl bg-amber-50 p-4">
                  <div className="text-xs font-extrabold uppercase text-amber-700">
                    Em tratamento
                  </div>
                  <div className="mt-1 text-xl font-extrabold">
                    {ncsEmTratamento}
                  </div>
                </div>

                <div className="rounded-xl bg-emerald-50 p-4">
                  <div className="text-xs font-extrabold uppercase text-emerald-700">
                    Resolvidas
                  </div>
                  <div className="mt-1 text-xl font-extrabold">
                    {ncsResolvidas}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {pendentesVisita > 0 ? (
                  <p>
                    A inspeção permanece <strong>em andamento</strong>, com{" "}
                    <strong>{pendentesVisita} item(ns) pendente(s)</strong> no
                    checklist.
                  </p>
                ) : (
                  <p>
                    O checklist desta visita foi totalmente respondido.
                  </p>
                )}

                {ncsVisita.length > 0 ? (
                  <p className="mt-2">
                    Foram registradas{" "}
                    <strong>{ncsVisita.length} não conformidade(s)</strong>.
                    {" "}
                    {ncsSemAcao > 0
                      ? `${ncsSemAcao} ainda não possui(em) ação corretiva definida.`
                      : "Todas possuem ação corretiva definida."}
                  </p>
                ) : (
                  <p className="mt-2">
                    Não foram registradas não conformidades nesta visita.
                  </p>
                )}
              </div>

              {permitido("relatorios.aprovar", visitaAtual.empresaId) && (
              <div className="no-print mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-extrabold text-slate-700">
                  Identificação do responsável pela inspeção
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Estes dados são usados na identificação e na assinatura do PDF.
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label>
                    <span className="mb-1 block text-xs font-bold text-slate-500">Nome</span>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
                      value={visitaAtual.responsavel || ""}
                      placeholder="Nome do consultor / responsável técnico"
                      onChange={(e) =>
                        atualizarResponsavelRelatorio(
                          e.target.value,
                          visitaAtual.responsavelIdentificacao || ""
                        )
                      }
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-bold text-slate-500">Identificação profissional</span>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
                      value={visitaAtual.responsavelIdentificacao || ""}
                      placeholder="Ex.: Nutricionista • registro profissional"
                      onChange={(e) =>
                        atualizarResponsavelRelatorio(
                          visitaAtual.responsavel || "",
                          e.target.value
                        )
                      }
                    />
                  </label>
                </div>
              </div>
              )}

              <div className="mt-5">
                {permitido("relatorios.aprovar", visitaAtual.empresaId) && (
                <label className="no-print block">
                  <span className="mb-2 block text-sm font-extrabold text-slate-700">
                    Conclusão / observações do consultor
                  </span>
                  <textarea
                    value={visitaAtual.conclusao || ""}
                    onChange={(e) =>
                      atualizarConclusaoRelatorio(e.target.value)
                    }
                    placeholder="Registre aqui a conclusão técnica, orientações gerais, pontos prioritários ou observações finais da visita."
                    className="min-h-32 w-full rounded-xl border border-slate-300 bg-white p-4 text-sm outline-none focus:border-[#2F5597]"
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="block text-xs text-slate-500">
                      O conteúdo é salvo junto da visita e incluído no PDF.
                    </span>
                    <button
                      type="button"
                      onClick={() => atualizarConclusaoRelatorio(gerarConclusaoAutomatica())}
                      className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-extrabold text-blue-800"
                    >
                      ✨ Gerar sugestão automática
                    </button>
                  </div>
                </label>
                )}

                <div className={permitido("relatorios.aprovar", visitaAtual.empresaId) ? "print-only" : "block"}>
                  <div className="mb-2 text-sm font-extrabold text-slate-700">
                    Conclusão / observações do consultor
                  </div>
                  <div className="min-h-20 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    {visitaAtual.conclusao?.trim() || gerarConclusaoAutomatica()}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
                <div className="font-extrabold uppercase text-slate-700">Rastreabilidade do relatório</div>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <div><strong>Empresa:</strong> {empresaVisita?.cnpj || "CNPJ não informado"} — {empresaVisita?.nomeFantasia || empresaVisita?.razaoSocial || "Empresa"}</div>
                  <div><strong>Visita:</strong> {fdata(visitaAtual.data)} — {visitaAtual.id}</div>
                  <div><strong>Status:</strong> {visitaAtual.status}</div>
                  <div><strong>Último encerramento:</strong> {visitaAtual.encerradaEm ? new Date(visitaAtual.encerradaEm).toLocaleString("pt-BR") : "Não registrado"}</div>
                  <div><strong>Relatório gerado em:</strong> {new Date().toLocaleString("pt-BR")}</div>
                </div>
                <div className="mt-4 border-t border-slate-200 pt-3">
                  <div className="font-extrabold text-slate-700">
                    Histórico permanente de encerramentos e reaberturas
                  </div>
                  {(visitaAtual.historicoStatus || []).length > 0 ? (
                    <ol className="mt-2 space-y-2">
                      {[...(visitaAtual.historicoStatus || [])]
                        .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))
                        .map((evento, indice) => (
                          <li key={evento.id} className="rounded-lg bg-slate-50 p-2">
                            <div className="font-bold text-slate-700">
                              {indice + 1}. {new Date(evento.criadoEm).toLocaleString("pt-BR")} — {evento.de} → {evento.para}
                            </div>
                            <div className="mt-1 text-slate-500">
                              {evento.motivo} • Responsável: {evento.responsavel || visitaAtual.responsavel || "Não informado"}
                              {evento.origem ? ` • Origem: ${evento.origem}` : ""}
                            </div>
                          </li>
                        ))}
                    </ol>
                  ) : (
                    <p className="mt-2 text-slate-500">
                      Nenhuma mudança de status registrada nesta visita. Registros anteriores à v2.44 podem não possuir o histórico retroativo.
                    </p>
                  )}
                </div>
                <p className="mt-2">
                  Este documento consolida os registros vinculados à visita. Cada mudança de status é acrescentada ao histórico sem substituir os eventos anteriores. Informações não registradas permanecem identificadas como não informadas ou pendentes.
                </p>
              </div>

              <div className="mt-10 grid gap-10 md:grid-cols-2">
                <div>
                  <div className="border-t border-slate-500 pt-2 text-center text-xs font-extrabold text-slate-700">
                    {visitaAtual.responsavel ||
                      "Consultor / Responsável técnico"}
                  </div>
                  <div className="mt-1 text-center text-[11px] text-slate-500">
                    {visitaAtual.responsavelIdentificacao?.trim() || "Responsável pela inspeção"}
                  </div>
                </div>

                <div>
                  <div className="border-t border-slate-500 pt-2 text-center text-xs font-extrabold text-slate-700">
                    {empresaVisita?.responsavel ||
                      "Responsável pelo estabelecimento"}
                  </div>
                  <div className="mt-1 text-center text-[11px] text-slate-500">
                    Ciência e recebimento
                  </div>
                </div>
              </div>
            </article>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 no-print">
              <div className="text-sm font-extrabold text-blue-900">
                Relatório pronto para revisão
              </div>
              <p className="mt-1 text-sm text-blue-800">
                Use “Baixar relatório em PDF” no topo para gerar o arquivo diretamente.
                Itens pendentes permanecem sinalizados para evitar interpretar uma inspeção parcial como concluída.
              </p>
            </div>
          </section>
        ) : view === "inicio" ? (
          <div className="space-y-3">
            <section className="-mx-3 -mt-4 overflow-hidden border-y border-slate-200 bg-white shadow-sm md:mx-0 md:mt-0 md:rounded-2xl md:border">
              <div className="aspect-[16/7] min-h-36 bg-[#17365D] bg-[url('/images/cozinha-inspecao.webp')] bg-cover bg-center" />
            </section>

            <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#2F5597]">
                O que fazer agora
              </div>
              {visitaEmAndamentoDestaque ? (
                <div className="mt-3 rounded-xl bg-[#17365D] p-4 text-white">
                  <div className="text-xs font-bold text-blue-100">Visita em andamento</div>
                  <div className="mt-1 text-lg font-extrabold">
                    {db.empresas[visitaEmAndamentoDestaque.empresaId]?.nomeFantasia || "Empresa"}
                  </div>
                  <div className="mt-1 text-xs text-blue-100">
                    {progressoVisitaDestaque}% concluída • {fdata(visitaEmAndamentoDestaque.data)}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDb((estado) => ({ ...estado, empresaAtualId: visitaEmAndamentoDestaque.empresaId }));
                      setVisitaAtualId(visitaEmAndamentoDestaque.id);
                      setView("visita");
                    }}
                    className="mt-3 w-full rounded-lg bg-white px-4 py-2.5 text-sm font-extrabold text-[#17365D]"
                  >
                    Continuar visita →
                  </button>
                </div>
              ) : (
                <div className="mt-3 rounded-xl bg-blue-50 p-4">
                  <div className="font-extrabold text-slate-950">Nenhuma visita em andamento</div>
                  <p className="mt-1 text-xs text-slate-600">
                    {atual
                      ? `A próxima visita será criada para ${atual.nomeFantasia}.`
                      : "Selecione uma empresa para começar."}
                  </p>
                  <button
                    type="button"
                    onClick={atual ? novaVisita : () => setView("empresas")}
                    className="mt-3 w-full rounded-lg bg-[#2F5597] px-4 py-2.5 text-sm font-extrabold text-white"
                  >
                    {atual ? "Iniciar nova visita →" : "Selecionar empresa →"}
                  </button>
                </div>
              )}

              {atual && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => editarEmpresa(atual)}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-extrabold text-slate-900">Preparação da empresa</span>
                      <span className="text-xs font-extrabold text-[#2F5597]">{configuracaoEmpresaAtual.percentual}%</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {configuracaoEmpresaAtual.prontaParaVisita
                        ? "Dados essenciais prontos"
                        : `Próximo: ${configuracaoEmpresaAtual.proximaEtapa?.titulo || "completar cadastro"}`}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("visitas")}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-extrabold text-slate-900">Pendências técnicas</span>
                      <span className={`text-xs font-extrabold ${ncsEmpresaAbertas ? "text-red-700" : "text-emerald-700"}`}>
                        {ncsEmpresaAbertas}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {ncsEmpresaAbertas ? "Não conformidades em acompanhamento" : "Nenhuma não conformidade aberta"}
                    </div>
                  </button>
                </div>
              )}
            </section>

            <section className="grid grid-cols-4 gap-2">
              <div className="rounded-xl border border-slate-100 bg-white px-2 py-3 text-center shadow-sm">
                <div className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-blue-50 text-sm font-extrabold text-[#2F5597]">▣</div>
                <div className="mt-1 text-xl font-extrabold text-[#2F5597]">{visitasDoMes.length}</div>
                <div className="text-[11px] leading-tight text-slate-500">Visitas<br />este mês</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white px-2 py-3 text-center shadow-sm">
                <div className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-lg font-extrabold text-emerald-700">✓</div>
                <div className="mt-1 text-xl font-extrabold text-emerald-700">{visitasDoMes.filter((v) => v.status === "Concluída").length}</div>
                <div className="text-[11px] leading-tight text-slate-500">Concluídas<br />este mês</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white px-2 py-3 text-center shadow-sm">
                <div className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-amber-50 text-lg font-extrabold text-amber-600">◷</div>
                <div className="mt-1 text-xl font-extrabold text-amber-600">{visitas.filter((v) => v.status === "Em andamento").length}</div>
                <div className="text-[11px] leading-tight text-slate-500">Em andamento<br />agora</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white px-2 py-3 text-center shadow-sm">
                <div className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-blue-50 text-[#2F5597]"><MobileNavIcon name="empresas" /></div>
                <div className="mt-1 text-xl font-extrabold text-[#2F5597]">{empresasVisiveis.length}</div>
                <div className="text-[11px] leading-tight text-slate-500">Empresas<br />ativas</div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-extrabold text-slate-950">Visitas</h2>
                <div className="flex rounded-lg bg-slate-50 p-0.5 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setFiltroInicio("Em andamento")}
                    className={`rounded-md px-3 py-1.5 ${filtroInicio === "Em andamento" ? "bg-[#2F5597] text-white shadow-sm" : "text-slate-500"}`}
                  >
                    Em andamento
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroInicio("Concluída")}
                    className={`rounded-md px-3 py-1.5 ${filtroInicio === "Concluída" ? "bg-[#2F5597] text-white shadow-sm" : "text-slate-500"}`}
                  >
                    Concluídas
                  </button>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-slate-100 px-3">
                <div className="pt-3 text-xs font-extrabold">Visitas recentes</div>
                <div className="divide-y divide-slate-100">
                  {visitasRecentesInicio.map((visita) => (
                    <button
                      key={visita.id}
                      type="button"
                      onClick={() => { setVisitaAtualId(visita.id); setView("visita"); }}
                      className="flex w-full items-center gap-2 py-3 text-left"
                    >
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${visita.status === "Concluída" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-600"}`}>
                        {visita.status === "Concluída" ? "✓" : "◷"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-extrabold text-slate-950">{db.empresas[visita.empresaId]?.nomeFantasia || "Empresa"}</span>
                        <span className="block truncate text-[11px] text-slate-500">{fdata(visita.data)} • {visita.responsavel || "Responsável não informado"}</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${visita.status === "Concluída" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{visita.status}</span>
                      <span className="shrink-0 text-[#2F5597]">›</span>
                    </button>
                  ))}
                  {visitasRecentesInicio.length === 0 && (
                    <div className="py-5 text-center text-xs text-slate-400">Nenhuma visita nesta situação.</div>
                  )}
                </div>
              </div>

              <button type="button" onClick={() => setView("visitas")} className="mt-3 flex w-full items-center justify-between px-1 text-xs font-extrabold text-[#2F5597]">
                <span>Ver todas as visitas</span><span>›</span>
              </button>
            </section>
          </div>
        ) : view === "empresas" ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold">Empresas</h1>
                <p className="text-sm text-slate-500">
                  Cadastre e selecione seus clientes.
                </p>
              </div>

              {permitido("empresas.editar") && (
                <button
                  onClick={() => {
                    const responsabilidadesIniciais = criarResponsabilidadesPadrao();
                    const fluxosIniciais = criarFluxosOperacionaisPadrao();
                    const programasIniciais = criarProgramasControlePadrao();
                    setEditingEmpresaId(null);
                    setForm(formEmpresaVazio);
                    setResponsabilidadesEmpresa(responsabilidadesIniciais);
                    setSetoresEmpresa([]);
                    setEquipamentosEmpresa([]);
                    setFluxosEmpresa(fluxosIniciais);
                    setProgramasEmpresa(programasIniciais);
                    setPopsEmpresa([]);
                    setAssinaturaEmpresaSalva(assinaturaEdicaoEmpresa({
                      form: formEmpresaVazio,
                      responsabilidades: responsabilidadesIniciais,
                      setores: [],
                      equipamentos: [],
                      fluxos: fluxosIniciais,
                      programas: programasIniciais,
                      pops: [],
                    }));
                    setEmpresaSecao("dados");
                    setMsg("");
                    setShowEmpresaForm(true);
                  }}
                  className="rounded-xl bg-[#2F5597] px-4 py-3 font-extrabold text-white"
                >
                  + Nova empresa
                </button>
              )}
            </div>

            <label className="mt-4 block">
              <span className="sr-only">Buscar empresa</span>
              <input
                value={buscaEmpresas}
                onChange={(event) => setBuscaEmpresas(event.target.value)}
                placeholder="Buscar por nome, CNPJ ou município"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-blue-300 focus:bg-white"
              />
            </label>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {empresasFiltradas.map((e) => (
                <div
                  key={e.id}
                  className={`rounded-xl border p-4 ${
                    db.empresaAtualId === e.id
                      ? "border-[#2F5597] bg-blue-50"
                      : ""
                  }`}
                >
                  <div className="font-extrabold">{e.nomeFantasia}</div>
                  <div className="text-sm text-slate-500">{e.razaoSocial}</div>
                  {e.responsavel && (
                    <div className="mt-1 text-xs text-slate-500">Responsável: {e.responsavel}</div>
                  )}
                  <div className="mt-2 text-xs text-slate-500">
                    <span className="font-bold">Horário:</span>{" "}
                    {e.horarioFuncionamento ||
                      (e.horariosFuncionamento?.some((item) => item.aberto)
                        ? resumirHorarioFuncionamento(e.horariosFuncionamento)
                        : "Não informado")}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {(e.setoresManual || []).length} setor(es) • {(e.equipamentosSetores || []).length} equipamento(s) e móvel(is)
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {(e.fluxosOperacionais || []).filter((fluxo) => fluxo.aplicavel).length} fluxo(s) operacional(is)
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {(e.programasControleQualidade || []).filter((programa) => programa.status === "Implantado" || programa.status === "Em implantação").length} programa(s) de controle ativo(s)
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {(e.pops || []).length} POP(s) cadastrado(s)
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setDb((o) => ({ ...o, empresaAtualId: e.id }));
                        setVisitaAtualId(null);
                      }}
                      className="flex-1 rounded-xl bg-slate-100 px-4 py-2 font-bold"
                    >
                      {db.empresaAtualId === e.id
                        ? "Empresa ativa"
                        : "Selecionar"}
                    </button>

                    {permitido("empresas.editar", e.id) && (
                      <button
                        onClick={() => editarEmpresa(e)}
                        className="rounded-xl bg-slate-100 px-4 py-2 font-bold"
                      >
                        Gerenciar
                      </button>
                    )}

                    {db.empresaAtualId === e.id && permitido("visitas.criar", e.id) && (
                      <button
                        onClick={novaVisita}
                        className="rounded-xl bg-[#2F5597] px-4 py-2 font-bold text-white"
                      >
                        Nova visita
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {empresasFiltradas.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 md:col-span-2">
                  Nenhuma empresa encontrada com esse termo.
                </div>
              )}
            </div>
          </section>
        ) : view === "historico" && atual ? (
          <section className="space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase text-[#2F5597]">
                    Histórico da empresa
                  </div>
                  <h1 className="mt-1 text-2xl font-extrabold">
                    Evolução das visitas
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    {atual.nomeFantasia} • acompanhamento consolidado ao longo do tempo
                  </p>
                </div>
                <button
                  onClick={() => setView("visitas")}
                  className="rounded-xl bg-slate-100 px-4 py-2 font-bold"
                >
                  Voltar às visitas
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <MetricCard label="Visitas" value={visitasEmpresaAtual.length} />
                <MetricCard label="Concluídas" value={visitasEmpresaConcluidas} />
                <MetricCard label="Não conformidades abertas" value={ncsEmpresaAbertas} />
                <MetricCard label="NCs resolvidas no histórico" value={ncsEmpresaResolvidas} />
              </div>

              {ncsEmpresaForaDoHistorico > 0 && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <span className="font-extrabold">Dados anteriores preservados:</span>{" "}
                  {ncsEmpresaForaDoHistorico} registro(s) de não conformidade da empresa não estão
                  vinculados a uma visita atualmente existente. Eles foram excluídos dos indicadores
                  de evolução para evitar contagem incorreta.
                </div>
              )}
            </div>

            {comparacaoVisitas ? (
              <div className="space-y-4">
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="text-xs font-extrabold uppercase text-[#2F5597]">
                    Comparação entre visitas
                  </div>
                  <div className="mt-1 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h2 className="text-xl font-extrabold">Tendência de evolução</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {fdata(comparacaoVisitas.anterior.data)} → {fdata(comparacaoVisitas.atual.data)}
                      </p>
                    </div>
                    <div className={`rounded-full px-4 py-2 text-sm font-extrabold ${
                      comparacaoVisitas.deltaConformidade > 0
                        ? "bg-emerald-100 text-emerald-800"
                        : comparacaoVisitas.deltaConformidade < 0
                          ? "bg-red-100 text-red-800"
                          : "bg-slate-100 text-slate-700"
                    }`}>
                      {comparacaoVisitas.deltaConformidade > 0 ? "+" : ""}
                      {comparacaoVisitas.deltaConformidade} p.p. de conformidade
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-4">
                    <div className="rounded-xl bg-blue-50 p-4">
                      <div className="text-xs font-extrabold uppercase text-blue-700">Conformidade anterior</div>
                      <div className="mt-1 text-2xl font-extrabold text-blue-950">
                        {comparacaoVisitas.resumoAnterior.avaliados
                          ? `${comparacaoVisitas.resumoAnterior.conformidade}%`
                          : "—"}
                      </div>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-4">
                      <div className="text-xs font-extrabold uppercase text-emerald-700">Conformidade atual</div>
                      <div className="mt-1 text-2xl font-extrabold text-emerald-950">
                        {comparacaoVisitas.resumoAtual.avaliados
                          ? `${comparacaoVisitas.resumoAtual.conformidade}%`
                          : "—"}
                      </div>
                    </div>
                    <div className="rounded-xl bg-red-50 p-4">
                      <div className="text-xs font-extrabold uppercase text-red-700">Não conformidades</div>
                      <div className="mt-1 text-2xl font-extrabold text-red-950">
                        {comparacaoVisitas.ncsAnterior.length} → {comparacaoVisitas.ncsAtual.length}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="text-xs font-extrabold uppercase text-slate-500">Variação de NCs</div>
                      <div className={`mt-1 text-2xl font-extrabold ${
                        comparacaoVisitas.deltaNc < 0
                          ? "text-emerald-700"
                          : comparacaoVisitas.deltaNc > 0
                            ? "text-red-700"
                            : "text-slate-900"
                      }`}>
                        {comparacaoVisitas.deltaNc > 0 ? "+" : ""}
                        {comparacaoVisitas.deltaNc}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-4">
                  <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                    <div className="text-xs font-extrabold uppercase text-red-700">Novas não conformidades</div>
                    <div className="mt-1 text-3xl font-extrabold text-red-950">{comparacaoVisitas.novas.length}</div>
                    <p className="mt-1 text-xs text-red-800">Não apareciam na visita anterior.</p>
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <div className="text-xs font-extrabold uppercase text-amber-700">Reincidências</div>
                    <div className="mt-1 text-3xl font-extrabold text-amber-950">{comparacaoVisitas.reincidentes.length}</div>
                    <p className="mt-1 text-xs text-amber-800">Persistiram como não conformes.</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <div className="text-xs font-extrabold uppercase text-emerald-700">Itens corrigidos</div>
                    <div className="mt-1 text-3xl font-extrabold text-emerald-950">{comparacaoVisitas.corrigidas.length}</div>
                    <p className="mt-1 text-xs text-emerald-800">Eram NCs e passaram a Conforme.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-extrabold uppercase text-slate-600">Pendências mantidas</div>
                    <div className="mt-1 text-3xl font-extrabold text-slate-950">{comparacaoVisitas.aindaPendentes.length}</div>
                    <p className="mt-1 text-xs text-slate-600">Continuam presentes na nova visita.</p>
                  </div>
                </div>

                {(comparacaoVisitas.reincidentes.length > 0 ||
                  comparacaoVisitas.novas.length > 0 ||
                  comparacaoVisitas.corrigidas.length > 0) && (
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <h3 className="text-lg font-extrabold">Leitura da evolução</h3>
                    <div className="mt-4 grid gap-4 lg:grid-cols-3">
                      <div>
                        <div className="text-xs font-extrabold uppercase text-amber-700">Reincidências</div>
                        <div className="mt-2 space-y-2">
                          {comparacaoVisitas.reincidentes.length ? comparacaoVisitas.reincidentes.slice(0, 5).map((nc) => (
                            <div key={nc.id} className="rounded-xl bg-amber-50 p-3 text-sm">
                              <div className="font-extrabold">{nc.titulo}</div>
                              <div className="mt-1 text-xs text-amber-800">{nc.ambiente}</div>
                            </div>
                          )) : <div className="text-sm text-slate-500">Nenhuma reincidência.</div>}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-extrabold uppercase text-red-700">Novas</div>
                        <div className="mt-2 space-y-2">
                          {comparacaoVisitas.novas.length ? comparacaoVisitas.novas.slice(0, 5).map((nc) => (
                            <div key={nc.id} className="rounded-xl bg-red-50 p-3 text-sm">
                              <div className="font-extrabold">{nc.titulo}</div>
                              <div className="mt-1 text-xs text-red-800">{nc.ambiente}</div>
                            </div>
                          )) : <div className="text-sm text-slate-500">Nenhuma nova não conformidade.</div>}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-extrabold uppercase text-emerald-700">Corrigidas</div>
                        <div className="mt-2 space-y-2">
                          {comparacaoVisitas.corrigidas.length ? comparacaoVisitas.corrigidas.slice(0, 5).map((nc) => (
                            <div key={nc.id} className="rounded-xl bg-emerald-50 p-3 text-sm">
                              <div className="font-extrabold">{nc.titulo}</div>
                              <div className="mt-1 text-xs text-emerald-800">{nc.ambiente}</div>
                            </div>
                          )) : <div className="text-sm text-slate-500">Nenhum item confirmado como corrigido.</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : visitasEmpresaAtual.length === 1 ? (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <div className="text-xs font-extrabold uppercase text-blue-700">
                  Comparação entre visitas
                </div>
                <h2 className="mt-1 text-lg font-extrabold text-blue-950">
                  Aguardando a próxima visita
                </h2>
                <p className="mt-1 text-sm text-blue-900">
                  Quando uma segunda visita for registrada para esta empresa, o sistema comparará
                  automaticamente conformidade, novas não conformidades, reincidências, pendências
                  mantidas e itens corrigidos.
                </p>
              </div>
            ) : null}

            {visitasEmpresaAtual.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <div className="text-xl font-extrabold">Nenhuma visita registrada</div>
                <p className="mt-2 text-sm text-slate-500">
                  O histórico será formado conforme novas visitas forem realizadas.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...visitasEmpresaAtual]
                  .sort((a, b) => (b.data || "").localeCompare(a.data || ""))
                  .map((v, idx) => {
                    const checklist = v.checklist || [];
                    const conformes = checklist.filter((item) => item.status === "Conforme").length;
                    const naoConformes = checklist.filter((item) => item.status === "Não Conforme").length;
                    const avaliados = conformes + naoConformes;
                    const conformidade = avaliados
                      ? Math.round((conformes / avaliados) * 100)
                      : 0;
                    const ncsDaVisita = (db.ncs || []).filter((nc) => nc.visitaId === v.id);
                    const abertas = ncsDaVisita.filter((nc) => nc.status !== "Resolvida").length;
                    const resolvidas = ncsDaVisita.filter((nc) => nc.status === "Resolvida").length;
                    const evidencias = (db.evidencias || []).filter((ev) => ev.visitaId === v.id).length;

                    return (
                      <article
                        key={v.id}
                        className={`rounded-2xl bg-white p-5 shadow-sm ${
                          v.id === visitaAtualId ? "ring-2 ring-[#2F5597] ring-offset-2" : ""
                        }`}
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-600">
                                Visita {numeroVisitaPorId.get(v.id) || visitasEmpresaAtual.length - idx}
                              </span>
                              <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                                v.status === "Concluída"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}>
                                {v.status}
                              </span>
                              {v.id === visitaAtualId && (
                                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-extrabold text-blue-800">
                                  Visita selecionada
                                </span>
                              )}
                            </div>
                            <h2 className="mt-3 text-xl font-extrabold">{fdata(v.data)}</h2>
                            <p className="mt-1 text-sm text-slate-500">
                              {v.responsavel || "Responsável não informado"}
                            </p>
                          </div>

                          <button
                            onClick={() => {
                              setVisitaAtualId(v.id);
                              setView(v.status === "Concluída" ? "relatorio" : "visita");
                            }}
                            className="rounded-xl bg-[#17365D] px-4 py-2 font-bold text-white"
                          >
                            {v.status === "Concluída" ? "Abrir relatório" : "Abrir visita"}
                          </button>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-4">
                          <div className="rounded-xl bg-blue-50 p-3">
                            <div className="text-xs font-extrabold uppercase text-blue-700">
                              Conformidade
                            </div>
                            <div className="mt-1 text-2xl font-extrabold text-blue-950">
                              {avaliados ? `${conformidade}%` : "—"}
                            </div>
                          </div>
                          <div className="rounded-xl bg-red-50 p-3">
                            <div className="text-xs font-extrabold uppercase text-red-700">
                              Não conformidades
                            </div>
                            <div className="mt-1 text-2xl font-extrabold text-red-950">
                              {ncsDaVisita.length}
                            </div>
                          </div>
                          <div className="rounded-xl bg-amber-50 p-3">
                            <div className="text-xs font-extrabold uppercase text-amber-700">
                              Em aberto
                            </div>
                            <div className="mt-1 text-2xl font-extrabold text-amber-950">
                              {abertas}
                            </div>
                          </div>
                          <div className="rounded-xl bg-violet-50 p-3">
                            <div className="text-xs font-extrabold uppercase text-violet-700">
                              Evidências
                            </div>
                            <div className="mt-1 text-2xl font-extrabold text-violet-950">
                              {evidencias}
                            </div>
                          </div>
                        </div>

                        {ncsDaVisita.length > 0 && (
                          <div className="mt-4 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                            <span className="font-extrabold">
                              Situação das não conformidades:
                            </span>{" "}
                            {abertas} aberta(s) • {resolvidas} resolvida(s)
                          </div>
                        )}
                      </article>
                    );
                  })}
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex justify-between gap-4">
                <div>
                  <div className="text-xs font-extrabold uppercase text-[#2F5597]">
                    Módulo Visitas
                  </div>
                  <h1 className="mt-1 text-2xl font-extrabold">
                    Visitas técnicas
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Visão geral de todas as empresas • empresa ativa: {atual?.nomeFantasia || "nenhuma"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setView("historico")}
                    disabled={!atual}
                    className="rounded-xl bg-slate-100 px-4 py-3 font-extrabold text-[#17365D] disabled:opacity-40"
                  >
                    Histórico da empresa
                  </button>
                  <button
                    onClick={novaVisita}
                    disabled={!atual || !permitido("visitas.criar", atual.id)}
                    className="rounded-xl bg-[#2F5597] px-4 py-3 font-extrabold text-white disabled:opacity-40"
                  >
                    + Nova visita
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              {(["Todas", "Em andamento", "Concluída"] as const).map((filtro) => (
                <button
                  key={filtro}
                  type="button"
                  onClick={() => setFiltroListaVisitas(filtro)}
                  className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-extrabold ${
                    filtroListaVisitas === filtro
                      ? "bg-[#17365D] text-white"
                      : "bg-slate-50 text-slate-600"
                  }`}
                >
                  {filtro === "Todas" ? "Todas" : filtro === "Concluída" ? "Concluídas" : "Em andamento"}
                </button>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {visitasFiltradas.map((v) => {
                const e = db.empresas[v.empresaId];
                return (
                  <article
                    key={v.id}
                    className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
                      v.id === visitaAtualId ? "border-blue-200" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-600">
                            Visita {numeroVisitaPorId.get(v.id) || "—"}
                          </span>
                          <span className="text-xs font-extrabold uppercase text-slate-400">
                            {fdata(v.data)}
                          </span>
                          {v.id === visitaAtualId && (
                            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-extrabold text-blue-800">
                              Selecionada
                            </span>
                          )}
                        </div>
                        <h2 className="mt-2 truncate text-lg font-extrabold">
                          {e?.nomeFantasia}
                        </h2>
                        <p className="text-sm text-slate-500">
                          {v.responsavel || "Responsável não informado"}
                        </p>
                      </div>

                      <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-extrabold ${v.status === "Concluída" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {v.status}
                      </span>
                    </div>

                    <div className="mt-4 flex gap-2 text-sm">
                      {v.status === "Em andamento" ? (
                        <>
                          {permitido("visitas.executar", v.empresaId) && (
                            <button
                              onClick={() => continuar(v.id)}
                              className="flex-1 rounded-xl bg-[#17365D] px-4 py-2 font-bold text-white"
                            >
                              Continuar visita
                            </button>
                          )}
                          {permitido("visitas.concluir", v.empresaId) && (
                            <button
                              onClick={() => concluir(v.id)}
                              className="rounded-xl bg-emerald-50 px-4 py-2 font-bold text-emerald-700"
                            >
                              Concluir
                            </button>
                          )}
                        </>
                      ) : (
                        permitido("visitas.concluir", v.empresaId) ? (
                          <button
                            onClick={() => reabrir(v.id)}
                            className="flex-1 rounded-xl bg-slate-100 px-4 py-2 font-bold"
                          >
                            Reabrir visita
                          </button>
                        ) : permitido("relatorios.exportar", v.empresaId) ? (
                          <button
                            onClick={() => {
                              setDb((estado) => ({ ...estado, empresaAtualId: v.empresaId }));
                              setVisitaAtualId(v.id);
                              setView("relatorio");
                            }}
                            className="flex-1 rounded-xl bg-[#17365D] px-4 py-2 font-bold text-white"
                          >
                            Abrir relatório
                          </button>
                        ) : null
                      )}

                      {usuarioDaSessao?.perfil === "Administrador" && (
                        <button
                          onClick={() => excluir(v.id)}
                          className="rounded-xl bg-red-50 px-4 py-2 font-bold text-red-700"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
              {visitasFiltradas.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 lg:col-span-2">
                  Nenhuma visita nesta situação.
                </div>
              )}
            </div>
          </section>
        )}
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
          {([
            ["inicio", "Início"],
            ["empresas", "Empresas"],
            ["visitas", "Visitas"],
            ["acessos", "Acessos"],
          ] as const).map(([destino, rotulo]) => {
            if (destino === "acessos" && !permitido("usuarios.gerenciar")) return null;
            const ativo = destino === "visitas" ? view === "visitas" || VISIT_VIEWS.includes(view) : view === destino;
            return (
              <button key={destino} type="button" onClick={() => navegarPrincipal(destino)} className={`flex min-h-14 flex-col items-center justify-center rounded-2xl px-2 text-[11px] font-extrabold ${ativo ? "bg-blue-50 text-[#17365D]" : "text-slate-500"}`}>
                <MobileNavIcon name={destino} />
                <span className="mt-1">{rotulo}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
