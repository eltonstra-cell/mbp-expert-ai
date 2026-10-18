"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MetricCard from "@/components/MetricCard";
import AccessPreparationPanel from "@/components/AccessPreparationPanel";
import AppNavigation, { type CartaoVisita, type ContagemEtapa } from "@/components/AppNavigation";
import AppTopbar from "@/components/AppTopbar";
import PcInicio from "@/components/pc/PcInicio";
import RegistrarAgoraModal from "@/components/pc/RegistrarAgoraModal";
import PcCorrecoes, { type CorrecaoItem } from "@/components/pc/PcCorrecoes";
import PcPopsVisita from "@/components/pc/PcPopsVisita";
import PcRelatorio, { type SecaoRelatorio } from "@/components/pc/PcRelatorio";
import PcAjuda from "@/components/pc/PcAjuda";
import { passoDaView, passosDaTrilha, percentualDaVisita, type PassoVisita } from "@/lib/visitTrail";
import { conferenciaDoRelatorio } from "@/lib/reportCheck";
import { ocultarAmbiente, mostrarAmbiente, excluirAmbienteOculto, resumoOcultos } from "@/lib/hiddenEnvs";
import { reincidenciaDaNc } from "@/lib/actionPlan";
import { conciliarNcs } from "@/lib/ncReconcile";
import { motivoParaNaoExcluir } from "@/lib/userManagement";
import { diferencasDeTelas, nivelDaTela, telaDaVisao, telasDiferentesDoPadrao, telasEfetivas, type NivelTela, type TelaKey, type TelasDoUsuario } from "@/lib/screenAccess";
import { maisRecentesPrimeiro, visitaPadraoParaRegistro } from "@/lib/registerTarget";
import { listaSemArquivadas, marcarArquivada } from "@/lib/menuActions";
import { adicionarSugestaoPop, criarRascunhosFaltantes, popsDaVisita } from "@/lib/pops";
import UpdateNotice from "@/components/UpdateNotice";
import { alteracoesEmLote, contarNcsPorGravidade, resumoDoPlano } from "@/lib/actionPlan";
import PcEvidencias from "@/components/pc/PcEvidencias";
import PcAmbientes from "@/components/pc/PcAmbientes";
import PcCentral, { type PassoCentral } from "@/components/pc/PcCentral";
import PcPops from "@/components/pc/PcPops";
import PcVisitas from "@/components/pc/PcVisitas";
import PcEmpresas from "@/components/pc/PcEmpresas";
import { useScreenMode } from "@/components/useScreenMode";
import PcModoTela from "@/components/pc/PcModoTela";
import ChecklistFocoItem from "@/components/ChecklistFocoItem";
import { trocaDeGravidade } from "@/lib/checklistUi";
import { avisar, confirmar, perguntar } from "@/lib/dialogos";
import { opcoesDeEmpresa } from "@/lib/trocarEmpresa";
import TrocarEmpresaPainel from "@/components/campo/TrocarEmpresaPainel";
import { prepararFotoParaEnvio, dependenciasDoNavegador } from "@/lib/fotoCompressao";
import PcChecklist, { type ApoioDoItem } from "@/components/pc/PcChecklist";
import RevisaoTranscricao from "@/components/RevisaoTranscricao";
import MeuPerfilModal from "@/components/pc/MeuPerfilModal";
import { iniciarMedidorDeVolume } from "@/components/useNivelDeAudio";
import { MENSAGEM_SEM_FALA, ehSilencio } from "@/lib/transcricao";
import { nomeDoArquivoPdf, rotuloDoRelatorio, seloDoPdf } from "@/lib/reportLabels";
import { nomeDeExibicaoDoAmbiente } from "@/lib/checklistEnvs";
import { calcularCortes } from "@/lib/pdfPaginacao";
import { cssDoRodapeDeImpressao, suportaCaixasDeMargem } from "@/lib/printFooter";
import { sincronizarNcDoItem } from "@/lib/checklistNcs";
import { CampoBarra, CampoCabecalho, CampoCorrecoes, CampoInicio, CampoMais, type TelaCampo } from "@/components/campo/CampoTelas";
import type { ItemMenu } from "@/components/ui/RowMenu";
import { ROTULO_DE_USO, descreverAparelho } from "@/lib/screenMode";
import { preparacaoDaEmpresa, faltasDoCadastro } from "@/lib/companyReadiness";
import ChecklistEnvStrip from "@/components/ChecklistEnvStrip";
import CommandPalette from "@/components/CommandPalette";
import { construirDestinos, type Destino } from "@/lib/commandSearch";
import { quantidadeDeAmbientes, resumoAmbientes, vizinhoDoAmbiente } from "@/lib/checklistEnvs";
import { NavIcon } from "@/components/NavIcons";
import { chaveAtiva, itemDoMenu, itensVisiveis, nomeSemNumerosNoInicio, type NavContexto, type NavKey } from "@/lib/navigation";
import ManualBaseFields from "@/components/ManualBaseFields";
import OperationalFlowsFields from "@/components/OperationalFlowsFields";
import QualityProgramsFields from "@/components/QualityProgramsFields";
import PopsFields from "@/components/PopsFields";
import FieldVoiceTools from "@/components/FieldVoiceTools";
import { BRAND } from "@/lib/brand";
import pacote from "../package.json";
import { LogoHorizontal, LogoSymbol, LogoWordmark } from "@/components/BrandLogo";
import { IaPermitidaContext, useIaPermitida } from "@/components/IaPermissionContext";
import type {
  NaoConformidade,
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
  PerfilUsuario,
  UsuarioSistema,
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
  deveExibirRecursosDeIa,
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

type View = "inicio" | "ajuda" | "empresas" | "visitas" | "visita" | "ambientes" | "checklist" | "ncs" | "plano" | "acompanhamento" | "historico" | "evidencias" | "relatorio" | "acessos" | "correcoes" | "popsvisita" | "modotela" | "campomais";
type EmpresaSecao = "dados" | "manual" | "ambientes" | "fluxos" | "programas" | "pops";
type FiltroChecklistRapido = "Todos" | "Pendentes" | "Não conformes";

const NAV_STORAGE_KEY = "mbp-expert-ai:navegacao:v1";
const CHECKLIST_VERSAO_ATUAL = 10;
const VISIT_VIEWS: View[] = ["visita", "ambientes", "checklist", "ncs", "plano", "acompanhamento", "historico", "evidencias", "relatorio", "correcoes", "popsvisita"];

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
    return { label: "Concluída", classe: "bg-[var(--ok-bg)] text-[color:var(--ink)]" };
  }

  if (!prazo) {
    return { label: "Sem prazo", classe: "bg-[var(--na-bg)] text-[color:var(--ink)]" };
  }

  const partes = prazo.split("-").map(Number);
  if (partes.length !== 3 || partes.some((n) => !Number.isFinite(n))) {
    return { label: "Sem prazo", classe: "bg-[var(--na-bg)] text-[color:var(--ink)]" };
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
    return { label: "Vencendo", classe: "bg-[var(--pend-bg)] text-[color:var(--ink)]" };
  }

  return { label: "Dentro do prazo", classe: "bg-[var(--brand-soft)] text-[color:var(--ink)]" };
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

function juntarTextoDitado(atual: string, novo: string) {
  const base = (atual || "").trimEnd();
  const trecho = (novo || "").trim();
  if (!trecho) return atual || "";
  return base ? `${base} ${trecho}` : trecho;
}

function VoiceDictationButton({
  ativo,
  onIniciar,
  melhorando = false,
  onMelhorar,
}: {
  ativo: boolean;
  onIniciar: () => void;
  melhorando?: boolean;
  onMelhorar?: () => void;
}) {
  const iaPermitida = useIaPermitida();
  if (!iaPermitida) return null;

  return (
    <div className="mbp-field-tools">
      {onMelhorar && (
        <button
          type="button"
          onClick={onMelhorar}
          disabled={melhorando || ativo}
          className={`mbp-ai-text-button ${melhorando ? "is-working" : ""}`}
          aria-label="Melhorar texto com IA"
          title="Deixar o texto mais claro, técnico e objetivo"
        >
          <span aria-hidden="true">✦</span>
          <span>{melhorando ? "Ajustando" : "IA"}</span>
        </button>
      )}
      <button
        type="button"
        onClick={onIniciar}
        disabled={melhorando}
        className={`mbp-voice-button ${ativo ? "is-listening" : ""}`}
        aria-label={ativo ? "Parar gravação" : "Falar para preencher este campo"}
        title={ativo ? "Toque para encerrar e transcrever" : "Ditado por voz"}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M6 10a6 6 0 0 0 12 0" />
          <path d="M12 16v5M9 21h6" />
        </svg>
        <span className="mbp-voice-label">{ativo ? "Parar" : "Falar"}</span>
      </button>
    </div>
  );
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

type VisitAreaIconName = "evidencias" | "plano" | "relatorio" | "equipamentos" | "programas";

function VisitAreaIcon({ name }: { name: VisitAreaIconName }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "evidencias") return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m7 15 3-3 2.5 2.5 2-2L19 17" /><circle cx="16.5" cy="9" r="1.5" /></svg>;
  if (name === "plano") return <svg {...common}><path d="M7 4h10v3H7z" /><path d="M5 6h14v15H5z" /><path d="m8 14 2.2 2.2L16 10.5" /></svg>;
  if (name === "relatorio") return <svg {...common}><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v5h5M9 12h6M9 16h6" /></svg>;
  if (name === "equipamentos") return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 8h8M8 12h5M8 16h7" /></svg>;
  return <svg {...common}><path d="M7 3h10v4H7z" /><path d="M5 5v16h14V5" /><path d="m8 14 2 2 5-5" /></svg>;
}

function nomeEmFormatoNatural(nome?: string) {
  if (nome) nome = nomeSemNumerosNoInicio(nome);
  if (!nome || nome !== nome.toUpperCase()) return nome;
  const conectores = new Set(["da", "das", "de", "do", "dos", "e"]);
  return nome.toLocaleLowerCase("pt-BR").split(" ").map((palavra, indice) =>
    indice > 0 && conectores.has(palavra)
      ? palavra
      : palavra.charAt(0).toLocaleUpperCase("pt-BR") + palavra.slice(1)
  ).join(" ");
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
  const [menuMaisAberto, setMenuMaisAberto] = useState(false);
  const [painelTamanhoTextoAberto, setPainelTamanhoTextoAberto] = useState(false);
  const [tamanhoTexto, setTamanhoTexto] = useState(100);
  const [tamanhoTextoRascunho, setTamanhoTextoRascunho] = useState(100);
  const [campoVozAtivo, setCampoVozAtivo] = useState<string | null>(null);
  const [campoIaAtivo, setCampoIaAtivo] = useState<string | null>(null);
  const registrarInputRef = useRef<HTMLInputElement | null>(null);
  const criandoVisitaRef = useRef(false);
  const [registrarAberto, setRegistrarAberto] = useState(false);
  const [registrarComCamera, setRegistrarComCamera] = useState(false);
  const [mostrarEmpresasArquivadas, setMostrarEmpresasArquivadas] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; visitaId: string } | null>(null);
  useEffect(() => {
    if (!aviso) return;
    const timer = window.setTimeout(() => setAviso(null), 7000);
    return () => window.clearTimeout(timer);
  }, [aviso]);
  const [secoesRelatorio, setSecoesRelatorio] = useState<Record<SecaoRelatorio, boolean>>({ resumo: true, ambientes: true, ncs: true, evidencias: true, pops: true });
  const [emissaoParcial, setEmissaoParcial] = useState(false);
  const [rodapeImpressao, setRodapeImpressao] = useState<{ empresa: string; selo: string; fixo: boolean } | null>(null);
  const telaModo = useScreenMode();
  const modo = telaModo.modo;
  // Completo e Equilibrado usam o kit de telas do PC; Campo tem apresentação própria.
  const ehPC = modo !== "campo";
  // Evidências, Ambientes, Ajuda, Empresas e Visitas usam as mesmas telas compactas no celular (cabem numa tela, a lista rola por dentro).
  const telaEmLista = true;
  useEffect(() => {
    if (modo !== "campo" && view === "campomais") setView("inicio");
  }, [modo, view]);
  const [caixaAberta, setCaixaAberta] = useState(false);
  const [caixaComVoz, setCaixaComVoz] = useState(false);
  // Foto escolhida em "Registrar": confirma o vínculo antes de enviar (nada é vinculado em silêncio).
  const [confirmaFoto, setConfirmaFoto] = useState<{
    arquivo: File;
    itemId: string;
    itemTitulo: string;
    ambiente: string;
    ncId: string;
  } | null>(null);
  // Foto aguardando o usuário escolher o item no Checklist ("Escolher outro item").
  const [fotoAguardando, setFotoAguardando] = useState<File | null>(null);
  const gravadorVozRef = useRef<MediaRecorder | null>(null);
  const streamVozRef = useRef<MediaStream | null>(null);
  const timerVozRef = useRef<number | null>(null);

  useEffect(() => {
    const salvo = Number(window.localStorage.getItem("mbp-expert-ai:tamanho-texto") || "100");
    const valor = [90, 100, 110, 120, 130].includes(salvo) ? salvo : 100;
    setTamanhoTexto(valor);
    setTamanhoTextoRascunho(valor);
    document.documentElement.style.setProperty("--mbp-text-scale", String(valor / 100));
  }, []);

  useEffect(() => {
    if (!menuMaisAberto && !painelTamanhoTextoAberto) return;
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (painelTamanhoTextoAberto) setPainelTamanhoTextoAberto(false);
      else setMenuMaisAberto(false);
    };
    window.addEventListener("keydown", fecharComEscape);
    return () => window.removeEventListener("keydown", fecharComEscape);
  }, [menuMaisAberto, painelTamanhoTextoAberto]);

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault();
        setCaixaComVoz(false);
        setCaixaAberta((aberta) => !aberta);
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  async function melhorarTextoComIa(
    chave: string,
    textoAtual: string,
    aoMelhorar: (texto: string) => void,
    contexto?: string
  ) {
    const texto = (textoAtual || "").trim();
    if (!texto) {
      void avisar("Primeiro escreva ou dite algum texto para a IA melhorar.");
      return;
    }
    if (!navigator.onLine) {
      void avisar("A melhoria de texto com IA precisa de internet.");
      return;
    }
    if (campoIaAtivo) return;

    try {
      setCampoIaAtivo(chave);
      const response = await fetch("/api/texto/melhorar", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, contexto: contexto || "" }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error || "Não foi possível melhorar o texto agora.");
      }
      const melhorado = typeof body?.text === "string" ? body.text.trim() : "";
      if (!melhorado) throw new Error("A IA não retornou um texto utilizável.");
      aoMelhorar(melhorado);
    } catch (error) {
      void avisar(error instanceof Error ? error.message : "Não foi possível melhorar o texto agora.");
    } finally {
      setCampoIaAtivo(null);
    }
  }

  async function iniciarDitado(chave: string, aoTranscrever: (texto: string) => void) {
    // Segundo toque no mesmo microfone encerra a gravação e inicia a transcrição.
    if (campoVozAtivo === chave && gravadorVozRef.current?.state === "recording") {
      const gravadorAtual = gravadorVozRef.current;
      try {
        gravadorAtual.requestData();
      } catch {
        // Alguns navegadores não exigem requestData antes de parar.
      }
      window.setTimeout(() => {
        if (gravadorAtual.state === "recording") gravadorAtual.stop();
      }, 120);
      return;
    }

    if (!navigator.onLine) {
      void avisar("O ditado por voz precisa de internet para transformar a fala em texto.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      void avisar("Este aparelho não liberou a gravação pelo navegador. Verifique a permissão do microfone nas configurações do Safari/app.");
      return;
    }

    try {
      if (gravadorVozRef.current?.state === "recording") {
        gravadorVozRef.current.stop();
      }

      if (timerVozRef.current) {
        window.clearTimeout(timerVozRef.current);
        timerVozRef.current = null;
      }

      streamVozRef.current?.getTracks().forEach((track) => track.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamVozRef.current = stream;
      const medidor = iniciarMedidorDeVolume(stream);
      const inicioDoDitado = Date.now();

      const tiposPreferidos = [
        "audio/mp4",
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
      ];
      const mimeType = tiposPreferidos.find((tipo) => MediaRecorder.isTypeSupported(tipo));

      let gravador: MediaRecorder;
      try {
        gravador = new MediaRecorder(
          stream,
          mimeType ? { mimeType, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 }
        );
      } catch {
        gravador = new MediaRecorder(stream);
      }

      const partes: BlobPart[] = [];
      gravadorVozRef.current = gravador;
      setCampoVozAtivo(chave);

      gravador.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) partes.push(event.data);
      };

      gravador.onerror = () => {
        setCampoVozAtivo(null);
        stream.getTracks().forEach((track) => track.stop());
        streamVozRef.current = null;
        gravadorVozRef.current = null;
        void avisar("Não foi possível gravar o áudio. Verifique a permissão do microfone e tente novamente.");
      };

      gravador.onstop = async () => {
        if (timerVozRef.current) {
          window.clearTimeout(timerVozRef.current);
          timerVozRef.current = null;
        }

        stream.getTracks().forEach((track) => track.stop());
        streamVozRef.current = null;
        gravadorVozRef.current = null;
        setCampoVozAtivo(null);

        const pico = medidor.pico();
        medidor.parar();
        const duracaoDitado = Math.max(0, Math.round((Date.now() - inicioDoDitado) / 1000));
        const tipoAudio = gravador.mimeType || mimeType || "audio/mp4";
        const audio = new Blob(partes, { type: tipoAudio });
        // Sem som: não envia para transcrever.
        if (ehSilencio(pico)) {
          setAvisoVoz(MENSAGEM_SEM_FALA);
          return;
        }
        if (!audio.size) {
          void avisar("Não detectei áudio. Toque em Falar, dite o texto e toque novamente para encerrar.");
          return;
        }

        try {
          const extensao = tipoAudio.includes("webm")
            ? "webm"
            : tipoAudio.includes("ogg")
            ? "ogg"
            : tipoAudio.includes("wav")
            ? "wav"
            : "m4a";
          const form = new FormData();
          form.append("audio", audio, `ditado.${extensao}`);
          form.append("duracao", String(duracaoDitado));

          const response = await fetch("/api/audio/transcrever", {
            method: "POST",
            credentials: "same-origin",
            body: form,
          });
          const body = await response.json().catch(() => null);
          if (body?.semFala) {
            setAvisoVoz(MENSAGEM_SEM_FALA);
            return;
          }
          if (!response.ok) {
            throw new Error(body?.error || "Não foi possível transcrever o áudio.");
          }

          const texto = typeof body?.text === "string" ? body.text.trim() : "";
          if (!texto) {
            setAvisoVoz(MENSAGEM_SEM_FALA);
            return;
          }
          // O texto ouvido só entra no campo depois da revisão.
          setRevisaoVoz({ texto, aplicar: aoTranscrever });
        } catch (error) {
          void avisar(error instanceof Error ? error.message : "Não foi possível transcrever o áudio.");
        }
      };

      // O intervalo força o Safari/iOS a entregar blocos de áudio durante a gravação,
      // evitando gravações vazias quando o usuário encerra rapidamente.
      gravador.start(250);
      // Evita gravações esquecidas abertas em campo.
      timerVozRef.current = window.setTimeout(() => {
        if (gravador.state === "recording") gravador.stop();
      }, 45000);
    } catch (error: any) {
      setCampoVozAtivo(null);
      streamVozRef.current?.getTracks().forEach((track) => track.stop());
      streamVozRef.current = null;
      gravadorVozRef.current = null;

      if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
        void avisar("O acesso ao microfone foi bloqueado. Libere o microfone para este app/site nas configurações do iPhone e tente novamente.");
      } else {
        void avisar("Não foi possível iniciar o microfone neste momento.");
      }
    }
  }

  function aplicarTamanhoTexto(valor: number) {
    setTamanhoTexto(valor);
    setTamanhoTextoRascunho(valor);
    window.localStorage.setItem("mbp-expert-ai:tamanho-texto", String(valor));
    document.documentElement.style.setProperty("--mbp-text-scale", String(valor / 100));
    setPainelTamanhoTextoAberto(false);
    setMenuMaisAberto(false);
  }
  const [filtroInicio, setFiltroInicio] = useState<"Em andamento" | "Concluída">("Em andamento");
  const [buscaEmpresas, setBuscaEmpresas] = useState("");
  const [filtroListaVisitas, setFiltroListaVisitas] = useState<"Todas" | "Em andamento" | "Concluída">("Todas");
  const [filtroNcs, setFiltroNcs] = useState<"Todas" | "Abertas" | "Resolvidas">("Todas");
  const [planoNcAbertaId, setPlanoNcAbertaId] = useState<string>("");
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
  const [iniciarChecklistPendente, setIniciarChecklistPendente] = useState(false);
  const [ambienteChecklistAtivo, setAmbienteChecklistAtivo] = useState<string | null>(null);
  const [filtroChecklistRapido, setFiltroChecklistRapido] = useState<FiltroChecklistRapido>("Todos");
  const [ultimoItemChecklistId, setUltimoItemChecklistId] = useState<string | null>(null);
  const [itemFocoId, setItemFocoId] = useState<string | null>(null);
  const [revisaoVoz, setRevisaoVoz] = useState<{ texto: string; aplicar: (texto: string) => void } | null>(null);
  const [avisoVoz, setAvisoVoz] = useState("");
  const [destaqueItemId, setDestaqueItemId] = useState<string | null>(null);
  useEffect(() => {
    if (!destaqueItemId) return;
    const tempo = window.setTimeout(() => setDestaqueItemId(null), 2600);
    return () => window.clearTimeout(tempo);
  }, [destaqueItemId]);
  const [perfilAberto, setPerfilAberto] = useState(false);
  useEffect(() => {
    if (!avisoVoz) return;
    const tempo = window.setTimeout(() => setAvisoVoz(""), 3500);
    return () => window.clearTimeout(tempo);
  }, [avisoVoz]);
  const [novoEquipamentoVisitaNome, setNovoEquipamentoVisitaNome] = useState("");
  const [novoEquipamentoVisitaQuantidade, setNovoEquipamentoVisitaQuantidade] = useState("1");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
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
      ambientesOcultos: Array.isArray(v.ambientesOcultos) ? v.ambientesOcultos : [],
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
        } else if (viewSalva && ["inicio", "ajuda", "empresas", "visitas", "acessos"].includes(viewSalva)) {
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
      void avisar("Não foi possível encerrar a sessão. Tente novamente.");
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
    void avisar("Seu perfil não possui permissão para executar esta ação.");
    return false;
  }

  // Telas liberadas da pessoa (padrão do perfil + ajustes). Sem pessoa identificada (modo local) nada é escondido por aqui.
  function nivelDe(tela: TelaKey): NivelTela {
    // Equilibrado (tablet) não tem Acessos nem o cadastro de Empresas.
    if (modo === "equilibrado" && (tela === "acessos" || tela === "administracao" || tela === "empresas")) return "oculta";
    return usuarioDaSessao ? nivelDaTela(usuarioDaSessao, tela) : "editar";
  }
  function telaVisivel(tela: TelaKey): boolean {
    return nivelDe(tela) !== "oculta";
  }
  function podeAbrirVisita(empresaId: string): boolean {
    return (
      permitido("visitas.executar", empresaId) ||
      (!!usuarioDaSessao && podeAcessarEmpresa(usuarioDaSessao, empresaId) && telaVisivel("central"))
    );
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
      void avisar(
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
        void avisar(
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
      void avisar(
        "Registros locais mesclados com a nuvem. Nenhuma empresa, visita, não conformidade ou evidência foi removida."
      );
    } catch {
      setSyncStatus("recuperacao");
      void avisar(
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
  const [trocarEmpresaAberto, setTrocarEmpresaAberto] = useState(false);
  const opcoesTrocaDeEmpresa = useMemo(
    () => opcoesDeEmpresa(Object.values(db.empresas), usuarioDaSessao, db.empresaAtualId),
    [db.empresas, usuarioDaSessao, db.empresaAtualId]
  );
  const empresasFiltradas = useMemo(() => {
    const termo = buscaEmpresas.trim().toLocaleLowerCase("pt-BR");
    // Só o PC tem "Arquivar"; no tablet e no celular a lista continua completa.
    const base = ehPC ? listaSemArquivadas(empresasVisiveis, mostrarEmpresasArquivadas) : empresasVisiveis;
    if (!termo) return base;
    return base.filter((empresa) =>
      [empresa.nomeFantasia, empresa.razaoSocial, empresa.cnpj, empresa.municipio]
        .some((valor) => valor?.toLocaleLowerCase("pt-BR").includes(termo))
    );
  }, [empresasVisiveis, buscaEmpresas, ehPC, mostrarEmpresasArquivadas]);
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
  useEffect(() => {
    if (!usuarioDaSessao) return;
    const tela = telaDaVisao(view);
    if (tela && nivelDe(tela) === "oculta") setView("inicio");
    if (view === "ajuda" && !telaVisivel("guiaRapido") && !telaVisivel("manualCompleto")) setView("inicio");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioDaSessao, view, modo]);

  useEffect(() => {
    // PC: Não conformidades, Plano e Acompanhamento viraram "Correções"; fora do PC essas telas novas não existem.
    if (view === "ncs" || view === "plano" || view === "acompanhamento") setView("correcoes");
  }, [ehPC, view]);
  useEffect(() => {
    // PC: a nova evidência já nasce vinculada ao último item tocado (mesma regra do Registrar).
    if (!ehPC || view !== "evidencias" || !visitaAtual || evidenciaChecklistItemId || !ultimoItemChecklistId) return;
    const item = (visitaAtual.checklist || []).find((registro) => registro.id === ultimoItemChecklistId);
    if (!item) return;
    setEvidenciaChecklistItemId(item.id);
    setEvidenciaAmbiente(item.ambiente);
    const ncDoItem = (db.ncs || []).find((nc) => nc.visitaId === visitaAtual.id && nc.checklistItemId === item.id && !nc.inativaNoChecklist);
    setEvidenciaNcId(ncDoItem?.id || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ehPC, view, visitaAtual?.id]);
  useEffect(() => {
    if (!iniciarChecklistPendente || !visitaAtual) return;
    if (!(visitaAtual.ambientes || []).length) return;
    setIniciarChecklistPendente(false);
    abrirChecklist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iniciarChecklistPendente, visitaAtual]);
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
              podeExecutar(usuarioDaSessao, "evidencias.adicionar", visita.empresaId) ||
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
    .slice(0, 4);

  // "Continue de onde parou" segue a visita aberta no momento; sem uma, a mais recente em andamento.
  const visitaEmAndamentoDestaque =
    (visitaAtual && visitaAtual.status === "Em andamento" ? visitas.find((visita) => visita.id === visitaAtual.id) : undefined) ||
    visitas.find((visita) => visita.status === "Em andamento");
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
  const conformesChecklist = checklistAtual.filter((i) => i.status === "Conforme").length;
  const naoConformesChecklist = checklistAtual.filter((i) => i.status === "Não Conforme").length;
  const naoSeAplicaChecklist = checklistAtual.filter((i) => i.status === "Não se aplica").length;
  const pendentesChecklist = checklistAtual.filter((i) => i.status === "Pendente").length;
  const percentualChecklist = totalChecklist
    ? Math.round((respondidos / totalChecklist) * 100)
    : 0;
  const itensAmbienteChecklistAtivo = checklistAtual.filter(
    (item) => item.ambiente === ambienteChecklistAtivo
  );
  const naoConformesAmbienteAtivo = itensAmbienteChecklistAtivo.filter(
    (item) => item.status === "Não Conforme"
  ).length;
  const situacaoAmbienteAtivo = naoConformesAmbienteAtivo > 0
    ? "Não conforme"
    : itensAmbienteChecklistAtivo.length > 0 && pendentesAmbienteAtivo === 0
    ? "Conforme"
    : "Em andamento";
  const itensChecklistVisiveis = itensAmbienteChecklistAtivo.filter((item) => {
    if (filtroChecklistRapido === "Pendentes") return item.status === "Pendente";
    if (filtroChecklistRapido === "Não conformes") return item.status === "Não Conforme";
    return true;
  });
  const ncsVisita = (db.ncs || []).filter((nc) => nc.visitaId === visitaAtual?.id && !nc.inativaNoChecklist);
  const ncsAbertas = ncsVisita.filter((nc) => nc.status !== "Resolvida").length;
  const ncsVisiveis = ncsVisita.filter((nc) => {
    if (filtroNcs === "Todas") return true;
    if (filtroNcs === "Abertas") return nc.status !== "Resolvida";
    return nc.status === "Resolvida";
  });
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
  const { criticas: ncsCriticasVisita, importantes: ncsImportantesVisita, leves: ncsLevesVisita } = contarNcsPorGravidade(ncsVisita);
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

      if (ncsCriticasVisita > 0 || ncsImportantesVisita > 0 || ncsLevesVisita > 0) {
        partes.push(
          `Entre os achados, ${ncsCriticasVisita} foram classificados como críticos, ${ncsImportantesVisita} como importantes e ${ncsLevesVisita} como leves.`
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

            void avisar(
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
      void avisar(
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
      void avisar(
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
    if (!(await confirmar(`Finalizar esta inspeção?${ressalvas}\n\nA visita ficará marcada como Concluída.`, { titulo: "Finalizar inspeção", confirmarRotulo: "Finalizar" }))) return;

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

    const confirmado = await confirmar(
      "Reabrir esta inspeção?\n\n" +
      "A visita voltará para Em andamento e poderá ser alterada novamente. " +
      "O encerramento anterior permanecerá registrado no histórico de rastreabilidade.",
      { titulo: "Reabrir inspeção", confirmarRotulo: "Reabrir" }
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
    if (!atual || criandoVisita || criandoVisitaRef.current) return;
    if (!exigirPermissao("visitas.criar", atual.id)) return;
    if (!vf.responsavel.trim()) {
      void avisar("Informe o responsável pela visita antes de criar a inspeção.");
      return;
    }
    criandoVisitaRef.current = true;
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
    if (ehPC) {
      const iniciais = atual.setoresManual || [];
      setAmbientesSelecionados(iniciais);
      setModelosAmbientesSelecionados(criarModelosQuestionarioAmbientes(iniciais, atual.modelosQuestionarioAmbientes));
      setAmbientePersonalizado("");
      setStatusAmbientes("");
      setView("ambientes");
    } else {
      setView("visita");
    }
    setTimeout(() => {
      criandoVisitaRef.current = false;
      setCriandoVisita(false);
    }, 500);
  }

  function continuar(id: string, retomarChecklist = false) {
    const original = db.visitas.find((x) => x.id === id);
    const v = original ? migrarVisitaParaChecklistManual(original, CHECKLIST_VERSAO_ATUAL, true) : undefined;
    if (!v) return;
    if (!podeAbrirVisita(v.empresaId)) {
      void avisar("Seu perfil não possui permissão para abrir esta visita.");
      return;
    }
    const empresaDaVisita = db.empresas[v.empresaId];

    if (retomarChecklist && !(v.ambientes || []).length) {
      const ambientesIniciais = empresaDaVisita?.setoresManual || [];
      setDb((o) => ({
        ...o,
        empresaAtualId: v.empresaId,
        visitas: o.visitas.map((visita) => visita.id === v.id ? v : visita),
      }));
      setVisitaAtualId(id);
      setAmbientesSelecionados(ambientesIniciais);
      setModelosAmbientesSelecionados(criarModelosQuestionarioAmbientes(ambientesIniciais, empresaDaVisita?.modelosQuestionarioAmbientes));
      setView("ambientes");
      return;
    }

    let visitaDestino = v;
    if (retomarChecklist) {
      const checklistExistente = v.checklist || [];
      const possuiRespostas = checklistPossuiRespostas(checklistExistente);
      const precisaAtualizarModelo = (v.checklistVersao || 1) < CHECKLIST_VERSAO_ATUAL && !possuiRespostas;
      const checklistDestino = checklistExistente.length === 0 || precisaAtualizarModelo
        ? criarChecklist(
            v.ambientes || [],
            empresaDaVisita?.fluxosOperacionais,
            empresaDaVisita?.programasControleQualidade,
            v.modelosQuestionarioAmbientes || empresaDaVisita?.modelosQuestionarioAmbientes
          )
        : checklistExistente;
      visitaDestino = { ...v, checklist: checklistDestino, checklistVersao: CHECKLIST_VERSAO_ATUAL };
      const primeiraPendente = checklistDestino.find((item) => item.status === "Pendente");
      const itemRetomada = checklistDestino.find((item) => item.id === ultimoItemChecklistId);
      const itemDestino = primeiraPendente || itemRetomada || checklistDestino[0];
      setUltimoItemChecklistId(itemDestino?.id || null);
      setAmbienteChecklistAtivo(itemDestino?.ambiente || (v.ambientes || [])[0] || null);
      setFiltroChecklistRapido(primeiraPendente ? "Pendentes" : "Todos");
    }
    setDb((o) => ({
      ...o,
      empresaAtualId: visitaDestino.empresaId,
      visitas: o.visitas.map((visita) => visita.id === visitaDestino.id ? visitaDestino : visita),
    }));
    setVisitaAtualId(id);
    setView(retomarChecklist ? "checklist" : "visita");
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

  async function toggleAmbiente(nome: string) {
    const removendo = ambientesSelecionados.includes(nome);
    if (removendo) {
      const possuiRegistro = (visitaAtual?.checklist || []).some(
        (item) =>
          item.ambiente === nome &&
          checklistPossuiRespostas([item])
      );
      if (
        possuiRegistro &&
        !(await confirmar(`O ambiente “${nome}” possui respostas. Remover mesmo assim?`, { titulo: "Remover ambiente", confirmarRotulo: "Remover", perigoso: true }))
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
      void avisar("Este ambiente já possui respostas. O modelo não pode ser trocado sem preservar a avaliação realizada.");
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
      void avisar("Esta visita já possui respostas. Crie uma nova visita para aplicar a lista detalhada sem perder registros.");
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
    if (!(permitido("visitas.executar", visitaAtual.empresaId) || (!!usuarioDaSessao && telaVisivel("checklist")))) {
      void avisar("Seu perfil não possui permissão para abrir o checklist.");
      return;
    }

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
      void avisar("Não há perguntas pendentes nesta visita.");
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

  function abrirEvidenciasDoItem(item: ChecklistItem, ncId?: string) {
    if (!visitaAtual) return;
    setEvidenciaDescricao("");
    setEvidenciaAmbiente(item.ambiente);
    setEvidenciaChecklistItemId(item.id);
    setEvidenciaNcId(ncId || "");
    setEvidenciaMsg("");
    setView("evidencias");
  }

  // Depois de Conforme ou Não se aplica: rola até o próximo item pendente do ambiente.
  function rolarParaProximaPendenciaDoAmbiente(itemIdAtual: string) {
    if (!visitaAtual) return;
    const itens = (visitaAtual.checklist || []).filter((item) => item.ambiente === ambienteChecklistAtivo);
    const indiceAtual = itens.findIndex((item) => item.id === itemIdAtual);
    if (indiceAtual < 0) return;
    const pendentes = itens.filter((item) => item.id !== itemIdAtual && item.status === "Pendente");
    const proximo =
      pendentes.find((item) => itens.indexOf(item) > indiceAtual) || pendentes[0];
    if (!proximo) return;
    setUltimoItemChecklistId(proximo.id);
    window.setTimeout(() => {
      document
        .getElementById(`checklist-item-${proximo.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 180);
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

  function atualizarObservacaoEquipamento(equipamentoId: string, observacao: string) {
    if (!visitaAtual || !empresaVisita) return;
    if (!exigirPermissao("visitas.executar", visitaAtual.empresaId)) return;
    setDb((atual) => ({
      ...atual,
      empresas: {
        ...atual.empresas,
        [empresaVisita.id]: {
          ...atual.empresas[empresaVisita.id],
          equipamentosSetores: (atual.empresas[empresaVisita.id]?.equipamentosSetores || []).map(
            (equipamento) =>
              equipamento.id === equipamentoId
                ? { ...equipamento, observacao }
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

  async function avancarParaProximoAmbiente() {
    if (
      pendentesAmbienteAtivo > 0 &&
      !(await confirmar(
        `Ainda há ${pendentesAmbienteAtivo} pergunta(s) pendente(s) neste ambiente. Deseja avançar mesmo assim?`,
        { titulo: "Perguntas pendentes", confirmarRotulo: "Avançar" }
      ))
    ) return;
    const indiceAtual = ambientesChecklistVisita.findIndex(
      (ambiente) => ambiente === ambienteChecklistAtivo
    );
    const proximo = ambientesChecklistVisita[indiceAtual + 1];
    if (proximo) setAmbienteChecklistAtivo(proximo);
    else setView("visita");
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 120);
  }

  async function limparRespostaChecklist(itemId: string) {
    if (!visitaAtual) return;
    const item = (visitaAtual.checklist || []).find((registro) => registro.id === itemId);
    if (!item || item.status === "Pendente") return;

    const confirmou = await confirmar(
      `Deseja limpar a resposta deste item?\n\nO item voltará para Pendente. A resposta e a observação atual serão removidas.`,
      { titulo: "Limpar resposta", confirmarRotulo: "Limpar", perigoso: true }
    );
    if (!confirmou) return;

    atualizarChecklistItem(itemId, { status: "Pendente", observacao: "" });
  }

  async function zerarAmbienteChecklist() {
    if (!visitaAtual || !ambienteChecklistAtivo) return;
    if (!exigirPermissao("visitas.executar", visitaAtual.empresaId)) return;

    const itensDoAmbiente = (visitaAtual.checklist || []).filter(
      (item) => item.ambiente === ambienteChecklistAtivo
    );
    const respondidos = itensDoAmbiente.filter((item) => item.status !== "Pendente");

    if (!respondidos.length) {
      void avisar("Este ambiente já está zerado.");
      return;
    }

    const confirmou = await confirmar(
      `Zerar o ambiente “${ambienteChecklistAtivo}”?\n\n` +
      `${respondidos.length} resposta(s) voltarão para Pendente. ` +
      `As respostas e observações desses itens serão removidas.\n\n` +
      `Esta ação não apaga a visita nem as evidências já registradas.`,
      { titulo: "Zerar ambiente", confirmarRotulo: "Zerar", perigoso: true }
    );
    if (!confirmou) return;

    const ids = new Set(itensDoAmbiente.map((item) => item.id));

    setDb((atual) => {
      const visitas = atual.visitas.map((visita) => {
        if (visita.id !== visitaAtual.id) return visita;

        const checklist = (visita.checklist || []).map((item) => {
          if (!ids.has(item.id)) return item;

          return {
            ...item,
            status: "Pendente" as ChecklistStatus,
            observacao: "",
            observacaoNCMemoria: "",
          } as ChecklistItem;
        });

        const totalRespondidos = checklist.filter((item) => item.status !== "Pendente").length;
        const pct = checklist.length ? Math.round((totalRespondidos / checklist.length) * 100) : 0;
        const progresso = Math.max(15, Math.min(55, 15 + Math.round(pct * 0.4)));

        return { ...visita, checklist, progresso };
      });

      const ncs = (atual.ncs || []).map((nc) =>
        nc.visitaId === visitaAtual.id && ids.has(nc.checklistItemId || "")
          ? { ...nc, inativaNoChecklist: true }
          : nc
      );

      return { ...atual, visitas, ncs };
    });

    setFiltroChecklistRapido("Todos");
    setUltimoItemChecklistId("");
    window.setTimeout(
      () => document.getElementById("checklist-ambiente-topo")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      80
    );
  }

  function atualizarChecklistItem(
    itemId: string,
    patch: Partial<Pick<ChecklistItem, "status" | "observacao" | "criticidade" | "criticidadeSugerida">>
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
        ncs = sincronizarNcDoItem(ncs, { id: visitaAtual.id, empresaId: visitaAtual.empresaId }, itemAtualizado as ChecklistItem, new Date().toISOString());
      }

      return { ...o, visitas: visitasAtualizadas, ncs };
    });
  }

  function abrirAtalhoDaVisita(destino: "checklist" | "evidencias" | "ncs" | "plano" | "relatorio") {
    const alvo = visitaAtual || visitaEmAndamentoDestaque;

    if (!alvo) {
      setView("visitas");
      return;
    }

    if (destino === "checklist") {
      continuar(alvo.id, true);
      return;
    }

    if ((destino === "ncs" || destino === "plano") && !exigirPermissao("ncs.acompanhar", alvo.empresaId)) {
      return;
    }

    if (destino === "relatorio" && !exigirPermissao("relatorios.exportar", alvo.empresaId)) {
      return;
    }

    setDb((estado) => ({ ...estado, empresaAtualId: alvo.empresaId }));
    setVisitaAtualId(alvo.id);

    if (destino === "evidencias") {
      setEvidenciaDescricao("");
      setEvidenciaAmbiente((alvo.ambientes || [])[0] || "");
      setEvidenciaChecklistItemId("");
      setEvidenciaNcId("");
      setEvidenciaMsg("");
    }

    setView(destino);
  }

  function abrirPopsPeloAtalho() {
    if (!atual) {
      setView("empresas");
      return;
    }
    abrirSecaoEmpresaPeloMenu("pops");
  }

  // abrirCamera=false (caixa inteligente): só leva à tela de captura, sem tentar abrir a câmera.
  function iniciarNovaEmpresa() {
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
  }

  // Lista plana na ordem da visita: base do "um item por vez" (Campo e Equilibrado).
  function itensEmOrdem(): ChecklistItem[] {
    const ordem = infosAmbientes.map((info) => info.nome);
    const lista = checklistAtual;
    return ordem.flatMap((nome) => lista.filter((item) => item.ambiente === nome));
  }

  function itemEmFoco(): ChecklistItem | undefined {
    const lista = itensEmOrdem();
    return (
      lista.find((item) => item.id === itemFocoId) ||
      lista.find((item) => item.ambiente === ambienteChecklistAtivo && item.status === "Pendente") ||
      lista.find((item) => item.status === "Pendente") ||
      lista[0]
    );
  }

  // Cabeçalho do ambiente no Checklist em foco: posição do item dentro do ambiente e progresso.
  function dadosDoAmbienteEmFoco(foco: ChecklistItem, lista: ChecklistItem[]) {
    const doAmbiente = lista.filter((item) => item.ambiente === foco.ambiente);
    return {
      ambienteRotulo: infosAmbientes.find((info) => info.nome === foco.ambiente)?.rotulo || foco.ambiente,
      posAmbiente: doAmbiente.findIndex((item) => item.id === foco.id) + 1,
      totalAmbiente: doAmbiente.length,
      respondidosAmbiente: doAmbiente.filter((item) => item.status !== "Pendente").length,
    };
  }

  function moverItemFoco(passo: 1 | -1) {
    const lista = itensEmOrdem();
    const atual = itemEmFoco();
    if (!atual) return;
    const alvo = lista[lista.findIndex((item) => item.id === atual.id) + passo];
    if (!alvo) return;
    setItemFocoId(alvo.id);
    setAmbienteChecklistAtivo(alvo.ambiente);
    setUltimoItemChecklistId(alvo.id);
  }

  function registrarRapido(abrirCamera = true) {
    const alvo = visitaAtual?.status === "Em andamento" ? visitaAtual : visitaEmAndamentoDestaque;
    if (!alvo) {
      setView("visitas");
      void avisar("Escolha a visita em que deseja registrar ou inicie uma nova visita.");
      return;
    }
    if (!exigirPermissao("evidencias.adicionar", alvo.empresaId)) return;
    setDb((estado) => ({ ...estado, empresaAtualId: alvo.empresaId }));
    setVisitaAtualId(alvo.id);

    const ultimoItem = (alvo.checklist || []).find((item) => item.id === ultimoItemChecklistId);
    setEvidenciaDescricao("");
    setEvidenciaAmbiente(
      ultimoItem?.ambiente ||
        (ambienteChecklistAtivo && (alvo.ambientes || []).includes(ambienteChecklistAtivo)
          ? ambienteChecklistAtivo
          : (alvo.ambientes || [])[0] || "")
    );
    setEvidenciaChecklistItemId("");
    setEvidenciaNcId("");
    setEvidenciaMsg("");
    setView("evidencias");

    // O toque em Registrar é o gesto do usuário: abre a câmera de forma síncrona.
    if (abrirCamera) registrarInputRef.current?.click();
  }

  // Depois da foto: pergunta antes de vincular ao último item tocado no checklist.
  function aoEscolherFotoDoRegistro(arquivo: File) {
    const ultimoItem = (visitaAtual?.checklist || []).find((item) => item.id === ultimoItemChecklistId);
    if (!ultimoItem || !visitaAtual) {
      void adicionarEvidencia(arquivo, "Foto");
      return;
    }
    const ncDoItem = (db.ncs || []).find(
      (nc) => nc.visitaId === visitaAtual.id && nc.checklistItemId === ultimoItem.id && !nc.inativaNoChecklist
    );
    setConfirmaFoto({
      arquivo,
      itemId: ultimoItem.id,
      itemTitulo: ultimoItem.titulo,
      ambiente: ultimoItem.ambiente,
      ncId: ncDoItem?.id || "",
    });
  }

  function vincularFotoAguardandoAoItem(item: ChecklistItem, ncId: string) {
    if (!fotoAguardando) return;
    const arquivo = fotoAguardando;
    setFotoAguardando(null);
    setView("evidencias");
    void adicionarEvidencia(arquivo, "Foto", { ambiente: item.ambiente, checklistItemId: item.id, ncId });
  }

  function escolherDestinoDaCaixa(destino: Destino) {
    const acao = destino.acao;
    switch (acao.tipo) {
      case "nav":
        irParaMenu(acao.key);
        return;
      case "registrar":
        if (ehPC) setRegistrarAberto(true);
        else registrarRapido(false);
        return;
      case "continuar":
        if (visitaEmAndamentoDestaque) continuar(visitaEmAndamentoDestaque.id, true);
        return;
      case "empresa":
        setDb((estado) => ({ ...estado, empresaAtualId: acao.id }));
        navegarPrincipal("visitas");
        return;
      case "visita":
        continuar(acao.id);
        return;
      case "ambiente":
        setAmbienteChecklistAtivo(acao.nome);
        setFiltroChecklistRapido("Todos");
        if (visitaAtual) setView("checklist");
        return;
      case "item":
        setAmbienteChecklistAtivo(acao.ambiente);
        setFiltroChecklistRapido("Todos");
        setUltimoItemChecklistId(acao.id);
        if (visitaAtual) setView("checklist");
        window.setTimeout(() => {
          document.getElementById("checklist-item-" + acao.id)?.scrollIntoView({ block: "start" });
        }, 250);
        return;
    }
  }

  function verEvidenciasDaVisita(id: string) {
    const visita = db.visitas.find((registro) => registro.id === id);
    if (!visita) return;
    setDb((o) => ({ ...o, empresaAtualId: visita.empresaId }));
    setVisitaAtualId(visita.id);
    setEvidenciaDescricao("");
    setEvidenciaAmbiente((visita.ambientes || [])[0] || "");
    setEvidenciaChecklistItemId("");
    setEvidenciaNcId("");
    setEvidenciaMsg("");
    setAviso(null);
    setView("evidencias");
  }

  // "Ver no checklist": abre exatamente o item da não conformidade (nunca outro item).
  function verItemNoChecklist(itemId: string) {
    const item = (visitaAtual?.checklist || []).find((registro) => registro.id === itemId);
    if (!item) {
      setAvisoVoz("Esse item do checklist não existe mais nesta visita.");
      return;
    }
    setFiltroChecklistRapido("Todos");
    setAmbienteChecklistAtivo(item.ambiente);
    setItemFocoId(item.id);
    setUltimoItemChecklistId(item.id);
    setDestaqueItemId(item.id);
    setView("checklist");
  }

  // Mesmo critério, no mesmo ambiente, na visita anterior da empresa (só devolve se existir de verdade).
  function ultimaOcorrenciaDaNc(nc: NaoConformidade): { data: string; situacao: string; acao: string } | null {
    if (!visitaAtual) return null;
    const anteriores = (db.ncs || [])
      .filter(
        (outra) =>
          outra.visitaId !== nc.visitaId &&
          outra.empresaId === nc.empresaId &&
          outra.ambiente === nc.ambiente &&
          outra.titulo === nc.titulo
      )
      .map((outra) => ({ outra, visita: db.visitas.find((visita) => visita.id === outra.visitaId) }))
      .filter((par): par is { outra: NaoConformidade; visita: Visita } => Boolean(par.visita) && par.visita!.data < visitaAtual.data)
      .sort((a, b) => b.visita.data.localeCompare(a.visita.data));
    const ultima = anteriores[0];
    if (!ultima) return null;
    return {
      data: fdata(ultima.visita.data),
      situacao: ultima.outra.status === "Em tratamento" ? "Em acompanhamento" : ultima.outra.status,
      acao: (ultima.outra.acaoCorretiva || "").trim(),
    };
  }

  function nomesDasPessoasDaEmpresa(empresaId: string): string[] {
    return Array.from(
      new Set(
        db.usuarios
          .filter((usuario) => usuario.status !== "Suspenso" && (usuario.perfil === "Administrador" || usuario.empresaIds.includes(empresaId)))
          .map((usuario) => usuario.nome)
          .filter(Boolean)
      )
    );
  }

  // Correções em tela cheia (celular e tablet em pé): lista -> plano com a barra "Pular | Salvar plano".
  function correcoesDoCelular() {
    if (!visitaAtual) return null;
    return (
    <CampoCorrecoes
      hoje={hojeISO()}
      podeEditar={permitido("ncs.acompanhar", visitaAtual.empresaId)}
      podeMarcar={permitido("ncs.marcar_feita", visitaAtual.empresaId)}
      itens={montarItensDeCorrecao()}
      pessoas={nomesDasPessoasDaEmpresa(visitaAtual.empresaId)}
      subtituloDaLista={`${nomeSemNumerosNoInicio(nomeParaExibir(empresaVisita))}`}
      onSalvarPlano={(id, dados) =>
        atualizarNC(id, { acaoCorretiva: dados.acao, responsavelAcao: dados.responsavel, prazo: dados.prazo, status: dados.etapa === "acompanhamento" ? "Em tratamento" : "Aberta" })
      }
      onMarcarFeita={(id) => marcarCorrecaoComoFeita(id, "")}
      onDesfazerFeita={desfazerCorrecaoFeita}
      onLote={(ids, valores) => alteracoesEmLote(ncsVisita, ids, valores).forEach((alteracao) => atualizarNC(alteracao.id, alteracao.patch))}
      onVerNoChecklist={(itemId) => verItemNoChecklist(itemId)}
      responsavelPadrao={usuarioDaSessao?.nome || ""}
      onAbrirPop={abrirPopsPeloAtalho}
    />
    );
  }

  // Itens da tela de Correções (PC, tablet e celular usam a mesma montagem).
  function montarItensDeCorrecao(): CorrecaoItem[] {
    if (!visitaAtual) return [];
    return ncsVisita.map((nc, indice) => {
        const rein = reincidenciaDaNc(
          nc,
          (db.ncs || []).filter((outra) => !outra.inativaNoChecklist),
          (id) => db.visitas.find((visita) => visita.id === id)?.data || ""
        );
        const linhaPop = resumoPopsVisita.linhas.find((linha) => linha.ncs.includes(indice + 1));
        return {
          id: nc.id,
          numero: indice + 1,
          titulo: nc.titulo,
          ambiente: nc.ambiente,
          criterio: nc.categoria,
          referencia: nc.referencia,
          gravidade: nc.criticidade,
          status: nc.status,
          acaoCorretiva: nc.acaoCorretiva || "",
          responsavelAcao: nc.responsavelAcao || "",
          prazo: nc.prazo || "",
          reincidente: rein.reincidente,
          dataAnterior: rein.dataAnterior,
          orientacao: nc.orientacao || "",
          pop: linhaPop ? { codigo: linhaPop.sugestao.codigo, titulo: linhaPop.sugestao.titulo, existe: linhaPop.situacao !== "a-criar" } : null,
          marcadaFeita: nc.marcadaFeita || null,
          checklistItemId: nc.checklistItemId,
          itemNumero: (visitaAtual.checklist || []).filter((item) => item.ambiente === nc.ambiente).findIndex((item) => item.id === nc.checklistItemId) + 1,
          observacao: nc.observacao || "",
          registradoEm: nc.criadoEm || "",
          ultimaOcorrencia: ultimaOcorrenciaDaNc(nc),
          evidencias: (db.evidencias || [])
            .filter((ev) => ev.ncId === nc.id)
            .map((ev) => ({ id: ev.id, tipo: ev.tipo, nome: ev.descricao?.trim() || ev.nomeArquivo, quando: new Date(ev.criadoEm).toLocaleString("pt-BR"), url: urlEvidencia(ev) })),
          historico: [...(nc.historicoAcompanhamento || [])]
            .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
            .map((item) => ({ id: item.id, quando: new Date(item.criadoEm).toLocaleString("pt-BR"), status: item.status, observacao: item.observacao })),
        };
    });
  }

  function marcarCorrecaoComoFeita(ncId: string, observacao: string) {
    const nc = (db.ncs || []).find((registro) => registro.id === ncId);
    if (!nc || !exigirPermissao("ncs.marcar_feita", nc.empresaId)) return;
    if (nc.status === "Resolvida") return;
    const marca = { em: new Date().toISOString(), por: usuarioDaSessao?.nome || "Responsável", ...(observacao.trim() ? { observacao: observacao.trim() } : {}) };
    setDb((o) => ({ ...o, ncs: (o.ncs || []).map((item) => (item.id === ncId ? { ...item, marcadaFeita: marca } : item)) }));
  }

  function desfazerCorrecaoFeita(ncId: string) {
    const nc = (db.ncs || []).find((registro) => registro.id === ncId);
    if (!nc || !exigirPermissao("ncs.marcar_feita", nc.empresaId)) return;
    setDb((o) => ({
      ...o,
      ncs: (o.ncs || []).map((item) => {
        if (item.id !== ncId) return item;
        const { marcadaFeita: _desfeita, ...resto } = item;
        return resto;
      }),
    }));
  }

  function irParaPasso(passo: PassoVisita) {
    switch (passo) {
      case "central":
        setView("visita");
        return;
      case "checklist":
        abrirChecklist();
        return;
      case "evidencias":
        abrirEvidencias();
        return;
      case "correcoes":
        setPlanoNcAbertaId("");
        setView("correcoes");
        return;
      case "pops":
        setView("popsvisita");
        return;
      case "relatorio":
        setView("relatorio");
        return;
    }
  }

  function criarPopsSugeridos(codigo?: string) {
    if (!visitaAtual) return;
    const empresaId = visitaAtual.empresaId;
    if (!exigirPermissao("empresas.editar", empresaId)) return;
    setDb((o) => {
      const empresa = o.empresas[empresaId];
      if (!empresa) return o;
      const pops = empresa.pops || [];
      const linhas = popsDaVisita(
        (o.ncs || []).filter((nc) => nc.visitaId === visitaAtual.id && !nc.inativaNoChecklist).map((nc, i) => ({ numero: i + 1, categoria: nc.categoria })),
        pops
      ).linhas.filter((linha) => !codigo || linha.sugestao.codigo === codigo);
      const resultado = criarRascunhosFaltantes(pops, linhas, () => crypto.randomUUID());
      if (resultado.criados === 0) return o;
      return { ...o, empresas: { ...o.empresas, [empresaId]: { ...empresa, pops: resultado.pops } } };
    });
  }

  function ocultarAmbienteDaVisita(nome: string) {
    if (!visitaAtual) return;
    setAmbientesSelecionados((atual) => atual.filter((item) => item !== nome));
    setDb((o) => {
      const visita = o.visitas.find((registro) => registro.id === visitaAtual.id);
      if (!visita) return o;
      const resultado = ocultarAmbiente(visita, o.ncs || [], nome, new Date().toISOString());
      return { ...o, visitas: o.visitas.map((registro) => (registro.id === visita.id ? resultado.visita : registro)), ncs: resultado.ncs };
    });
    setStatusAmbientes(`“${nome}” ficou oculto; as respostas foram mantidas`);
  }

  function mostrarAmbienteDaVisita(nome: string) {
    if (!visitaAtual) return;
    setAmbientesSelecionados((atual) => (atual.includes(nome) ? atual : [...atual, nome]));
    setDb((o) => {
      const visita = o.visitas.find((registro) => registro.id === visitaAtual.id);
      if (!visita) return o;
      const resultado = mostrarAmbiente(visita, o.ncs || [], nome);
      return { ...o, visitas: o.visitas.map((registro) => (registro.id === visita.id ? resultado.visita : registro)), ncs: resultado.ncs };
    });
    setStatusAmbientes(`“${nome}” voltou para a visita`);
  }

  async function excluirAmbienteOcultoDaVisita(nome: string) {
    if (!visitaAtual) return;
    const guardado = (visitaAtual.ambientesOcultos || []).find((registro) => registro.ambiente === nome);
    if (!guardado) return;
    const respostas = resumoOcultos(visitaAtual).find((registro) => registro.ambiente === nome)?.respostas || 0;
    if (!(await confirmar(`Excluir definitivamente “${nome}”? ${respostas} ${respostas === 1 ? "resposta será perdida" : "respostas serão perdidas"} e não poderão ser recuperadas.`, { titulo: "Excluir ambiente", confirmarRotulo: "Excluir definitivamente", perigoso: true }))) return;
    setDb((o) => {
      const visita = o.visitas.find((registro) => registro.id === visitaAtual.id);
      if (!visita) return o;
      const resultado = excluirAmbienteOculto(visita, nome);
      return { ...o, visitas: o.visitas.map((registro) => (registro.id === visita.id ? resultado.visita : registro)) };
    });
    setStatusAmbientes(`“${nome}” foi excluído definitivamente`);
  }

  // PC: desmarcar um ambiente com respostas OCULTA (não apaga); marcar um ambiente oculto o traz de volta.
  function alternarAmbientePc(nome: string) {
    if (!visitaAtual) return;
    if ((visitaAtual.ambientesOcultos || []).some((registro) => registro.ambiente === nome)) {
      mostrarAmbienteDaVisita(nome);
      return;
    }
    if (ambientesSelecionados.includes(nome)) {
      const temRespostas = (visitaAtual.checklist || []).some((item) => item.ambiente === nome && checklistPossuiRespostas([item]));
      if (temRespostas) {
        ocultarAmbienteDaVisita(nome);
        return;
      }
    }
    toggleAmbiente(nome);
  }

  // PDF com texto selecionável: usa a impressão do navegador ("Salvar como PDF"), com rodapé em todas as páginas.
  async function gerarPdfSelecionavel(tipo: "previa" | "parcial" | "oficial") {
    if (!visitaAtual || !empresaVisita) return;
    if (tipo === "oficial" && !exigirPermissao("relatorios.aprovar", visitaAtual.empresaId)) return;
    if (!exigirPermissao("relatorios.exportar", visitaAtual.empresaId)) return;
    const elemento = document.getElementById("relatorio-visita");
    if (!elemento) return;
    const empresa = elemento.dataset.empresa || nomeParaExibir(empresaVisita);
    const dataVisita = elemento.dataset.dataVisita || visitaAtual.data || "";
    const selo = seloDoPdf(tipo) || "VERSÃO OFICIAL";
    const marcas = (navigator as Navigator & { userAgentData?: { brands: { brand: string; version: string }[] } }).userAgentData?.brands;
    const comCaixasDeMargem = suportaCaixasDeMargem(marcas, navigator.userAgent);
    const estilo = document.createElement("style");
    estilo.id = "estilo-impressao-relatorio";
    estilo.textContent = cssDoRodapeDeImpressao({ empresa, selo, comCaixasDeMargem });
    document.head.appendChild(estilo);
    setRodapeImpressao({ empresa, selo, fixo: !comCaixasDeMargem });
    const tituloAntes = document.title;
    document.title = nomeDoArquivoPdf(empresa, dataVisita, tipo).replace(/\.pdf$/, "");
    if (tipo === "parcial") setEmissaoParcial(true);
    const limpar = () => {
      estilo.remove();
      document.title = tituloAntes;
      setRodapeImpressao(null);
      setEmissaoParcial(false);
      window.removeEventListener("afterprint", limpar);
    };
    window.addEventListener("afterprint", limpar);
    await new Promise((resolver) => window.setTimeout(resolver, 150));
    window.print();
  }

  function irParaMenu(key: NavKey) {
    setMenuMaisAberto(false);
    switch (key) {
      case "inicio":
      case "visitas":
      case "empresas":
      case "acessos":
        navegarPrincipal(key);
        return;
      case "central":
        setView("visita");
        return;
      case "ambientes":
        abrirAmbientes();
        return;
      case "checklist":
        if (visitaAtual) abrirChecklist();
        else abrirAtalhoDaVisita("checklist");
        return;
      case "evidencias":
        if (visitaAtual) abrirEvidencias();
        else abrirAtalhoDaVisita("evidencias");
        return;
      case "ncs":
      case "plano":
      case "relatorio":
        abrirAtalhoDaVisita(key);
        return;
      case "acompanhamento":
        setView("acompanhamento");
        return;
      case "ajuda":
        abrirAjudaRapida();
        return;
      case "pops":
        abrirPopsPeloAtalho();
        return;
      case "registrar":
        if (ehPC || modo === "campo") setRegistrarAberto(true);
        else registrarRapido(true);
        return;
    }
  }

  function irParaTelaCampo(tela: TelaCampo) {
    setMenuMaisAberto(false);
    if (tela === "inicio") navegarPrincipal("inicio");
    else if (tela === "checklist") irParaMenu("checklist");
    else if (tela === "correcoes") {
      const alvo = visitaAtual || visitaEmAndamentoDestaque;
      if (!alvo) {
        setView("visitas");
        return;
      }
      setDb((estado) => ({ ...estado, empresaAtualId: alvo.empresaId }));
      setVisitaAtualId(alvo.id);
      setPlanoNcAbertaId("");
      setView("correcoes");
    }
    else setView("campomais");
  }

  function abrirAjudaRapida() {
    setMenuMaisAberto(false);
    setView("ajuda");
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 40);
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

    const privacidadeConfirmada = await confirmar(
      "Antes de enviar esta foto para análise por IA, confirme que você a revisou e que ela não contém rostos, crachás, documentos ou outros dados pessoais desnecessários.\n\nContinuar com a análise?",
      { titulo: "Enviar foto para a IA", confirmarRotulo: "Continuar" }
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

  function confirmarAnaliseFoto(ev: Evidencia, analise: AnaliseFotoIA, textoEditado?: string) {
    if (!exigirPermissao("ia.analisar", ev.empresaId)) return;
    try {
      const texto = textoEditado ?? analiseIATextos[analise.id] ?? analise.textoRevisado;
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

  async function descartarAnaliseFoto(ev: Evidencia, analise: AnaliseFotoIA) {
    if (!exigirPermissao("ia.analisar", ev.empresaId)) return;
    if (!(await confirmar("Descartar esta sugestão da IA? Ela permanecerá registrada no histórico como descartada.", { titulo: "Descartar sugestão", confirmarRotulo: "Descartar", perigoso: true }))) {
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
    tipo: "Foto" | "Áudio",
    vinculo?: { ambiente: string; checklistItemId: string; ncId: string },
    opcoes?: { visita?: Visita; descricao?: string }
  ): Promise<boolean> {
    const alvoVisita = opcoes?.visita || visitaAtual;
    if (!file || !alvoVisita) return false;
    if (!exigirPermissao("evidencias.adicionar", alvoVisita.empresaId)) return false;

    if (tipo === "Áudio" && file.size > 3 * 1024 * 1024) {
      setEvidenciaMsg(
        "O áudio está muito grande para esta versão. Use um arquivo de até 3 MB."
      );
      return false;
    }

    try {
      setEvidenciaMsg(
        tipo === "Foto" ? "Otimizando foto..." : "Processando áudio..."
      );

      const evidenciaId = crypto.randomUUID();
      let nomeArquivo = file.name || (tipo === "Foto" ? "foto.jpg" : "audio");
      const mimeType =
        tipo === "Foto" ? "image/jpeg" : file.type || "audio/mpeg";

      let conteudo: Blob | File = file;
      if (tipo === "Foto") {
        const preparo = await prepararFotoParaEnvio(file, dependenciasDoNavegador);
        if (!preparo.ok) {
          setEvidenciaMsg(preparo.motivo);
          void avisar(preparo.motivo, { titulo: "Foto não aceita" });
          return false;
        }
        conteudo = preparo.arquivo;
        nomeArquivo = preparo.nome;
      }

      setEvidenciaMsg("Enviando evidência para o armazenamento seguro...");

      const blob = await enviarArquivoParaBlob(
        conteudo,
        nomeArquivo,
        alvoVisita.id,
        evidenciaId
      );

      const ev: Evidencia = {
        id: evidenciaId,
        empresaId: alvoVisita.empresaId,
        visitaId: alvoVisita.id,
        tipo,
        nomeArquivo,
        mimeType,
        blobPathname: blob.pathname,
        blobUrl: blob.url,
        descricao: (opcoes?.descricao ?? evidenciaDescricao).trim(),
        ambiente: (vinculo ? vinculo.ambiente : evidenciaAmbiente) || "",
        checklistItemId: (vinculo ? vinculo.checklistItemId : evidenciaChecklistItemId) || undefined,
        ncId: (vinculo ? vinculo.ncId : evidenciaNcId) || undefined,
        criadoEm: new Date().toISOString(),
      };

      setDb((o) => {
        const atualizado: AppDB = {
          ...o,
          evidencias: [ev, ...(o.evidencias || [])],
          visitas: o.visitas.map((v) =>
            v.id === alvoVisita.id
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
      return true;
    } catch (error) {
      console.error("Falha ao adicionar evidência:", error);
      setEvidenciaMsg(
        tipo === "Foto"
          ? "A foto foi capturada, mas não pôde ser processada. Tente novamente."
          : "Não foi possível adicionar este áudio."
      );
      return false;
    }
  }

  async function excluirEvidencia(id: string) {
    const evidencia = (db.evidencias || []).find((ev) => ev.id === id);
    if (!evidencia) return;
    if (!exigirPermissao("evidencias.adicionar", evidencia.empresaId)) return;

    const ncRelacionada = evidencia.ncId
      ? (db.ncs || []).find((nc) => nc.id === evidencia.ncId)
      : undefined;

    if (ncRelacionada?.status === "Resolvida") {
      void avisar(
        "Esta evidência está vinculada a uma Não Conformidade resolvida e faz parte da rastreabilidade do fechamento.\n\n" +
        "Para alterá-la, reabra primeiro a Não Conformidade pelo Acompanhamento."
      );
      return;
    }

    const descricao = evidencia.descricao || evidencia.nomeArquivo || "evidência";
    if (
      !(await confirmar(
        `Remover esta evidência do registro da visita?\n\n${descricao}\n\nEssa ação altera a documentação da inspeção.`,
        { titulo: "Remover evidência", confirmarRotulo: "Remover", perigoso: true }
      ))
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
        const fusao = { ...ncAtual, ...patch };
        const faltantes = [
          !fusao.acaoCorretiva?.trim() ? "Ação corretiva" : "",
          !fusao.responsavelAcao?.trim() ? "Responsável" : "",
          !fusao.prazo?.trim() ? "Prazo" : "",
        ].filter(Boolean);
        if (faltantes.length) {
          void avisar(
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

  function registrarAcompanhamento(ncId: string, textoOverride?: string, statusOverride?: "Aberta" | "Em tratamento" | "Resolvida") {
    const ncPermissao = (db.ncs || []).find((nc) => nc.id === ncId);
    if (!ncPermissao || !exigirPermissao("ncs.acompanhar", ncPermissao.empresaId)) return;
    const texto = (textoOverride ?? textoAcompanhamento[ncId] ?? "").trim();

    if (!texto) {
      void avisar("Digite uma atualização antes de registrar.");
      return;
    }

    const ncAtual = (db.ncs || []).find((nc) => nc.id === ncId);
    if (!ncAtual) return;

    const statusFinal = statusOverride || statusAcompanhamento[ncId] || ncAtual.status;
    const evidenciasDaNc = (db.evidencias || []).filter((ev) => ev.ncId === ncId);

    if (statusFinal === "Em tratamento") {
      const faltantes = [
        !ncAtual.acaoCorretiva?.trim() ? "Ação corretiva" : "",
        !ncAtual.responsavelAcao?.trim() ? "Responsável" : "",
        !ncAtual.prazo?.trim() ? "Prazo" : "",
      ].filter(Boolean);

      if (faltantes.length) {
        void avisar(
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
        void avisar(
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
      !(await confirmar(
        `Esta visita possui ${pendentesIA} sugestão(ões) de análise fotográfica por IA ainda sem revisão.\n\n` +
        "Elas não serão apresentadas como conclusão técnica no relatório. Deseja concluir mesmo assim?",
        { titulo: "Concluir visita", confirmarRotulo: "Concluir" }
      ))
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

  async function excluir(id: string) {
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
      void avisar(
        "Esta visita já possui registros e foi protegida contra exclusão acidental.\n\n" +
        `Respostas: ${respostas}\nNão conformidades: ${ncsLigadas}\nEvidências: ${evidenciasLigadas}\n\n` +
        "Nesta versão, somente visitas vazias podem ser excluídas."
      );
      return;
    }

    const digitado = await perguntar(
      "Esta visita ainda está vazia. Para excluí-la definitivamente, digite EXCLUIR:",
      { titulo: "Excluir visita", confirmarRotulo: "Excluir", perigoso: true }
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
          detalhes: `${usuario.nome} • ${usuario.perfil} • convite ainda não enviado.${!existente && usuario.telas ? ` Telas diferentes do padrão: ${telasDiferentesDoPadrao(usuario).join(", ")}.` : ""}`,
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
      void avisar(error instanceof Error ? error.message : "Não foi possível preparar o usuário.");
      return false;
    }
  }

  function contextoExclusaoUsuario() {
    return {
      solicitanteId: usuarioDaSessao?.id,
      solicitanteEmail: usuarioDaSessao?.email,
      registrosAuditoria: db.registrosAuditoria,
    };
  }

  function excluirUsuarioPreparacao(usuarioId: string): boolean {
    if (!exigirPermissao("usuarios.gerenciar")) return false;
    const alvo = db.usuarios.find((usuario) => usuario.id === usuarioId);
    if (!alvo) return false;
    const motivo = motivoParaNaoExcluir(alvo, contextoExclusaoUsuario());
    if (motivo) {
      void avisar(motivo);
      return false;
    }
    const agora = new Date().toISOString();
    const registro = criarRegistroAuditoria(
      {
        usuarioId: usuarioDaSessao?.id || "preparacao-sistema",
        usuarioNome: usuarioDaSessao?.nome || "Preparação do sistema",
        acao: "usuario.excluido",
        entidade: "Usuário",
        entidadeId: alvo.id,
        detalhes: `Usuário preparado excluído (nunca entrou no sistema) • ${alvo.perfil}.`,
      },
      agora
    );
    const novo: AppDB = {
      ...db,
      usuarios: db.usuarios.filter((usuario) => usuario.id !== alvo.id),
      registrosAuditoria: [...db.registrosAuditoria, registro],
    };
    salvarDBLocal(novo);
    setDb(novo);
    return true;
  }

  function salvarTelasLiberadas(
    usuarioId: string,
    dados: { perfil: PerfilUsuario; empresaIds: string[]; telas: TelasDoUsuario }
  ): boolean {
    if (!exigirPermissao("usuarios.gerenciar")) return false;
    const alvo = db.usuarios.find((usuario) => usuario.id === usuarioId);
    if (!alvo) return false;
    if (dados.perfil !== "Administrador" && dados.empresaIds.length === 0) {
      void avisar("Escolha pelo menos uma empresa para este perfil.");
      return false;
    }
    const outrosAdministradores = db.usuarios.filter((usuario) => usuario.id !== alvo.id && usuario.perfil === "Administrador" && usuario.status !== "Suspenso");
    if (alvo.perfil === "Administrador" && dados.perfil !== "Administrador" && outrosAdministradores.length === 0) {
      void avisar("Não é possível tirar o perfil do único Administrador.");
      return false;
    }
    const agora = new Date().toISOString();
    const atualizado: UsuarioSistema = {
      ...alvo,
      perfil: dados.perfil,
      empresaIds: dados.perfil === "Administrador" ? [] : dados.empresaIds,
      telas: Object.keys(dados.telas).length > 0 ? dados.telas : undefined,
      atualizadoEm: agora,
    };
    const antes = telasEfetivas(alvo);
    const depois = telasEfetivas(atualizado);
    const diferencas = diferencasDeTelas(antes, depois);
    const partes = [
      alvo.perfil !== atualizado.perfil ? `Perfil: ${alvo.perfil} → ${atualizado.perfil}` : "",
      JSON.stringify([...alvo.empresaIds].sort()) !== JSON.stringify([...atualizado.empresaIds].sort()) ? "Empresas alteradas" : "",
      ...diferencas,
    ].filter(Boolean);
    if (partes.length === 0) return true;
    const registro = criarRegistroAuditoria(
      {
        usuarioId: usuarioDaSessao?.id || "preparacao-sistema",
        usuarioNome: usuarioDaSessao?.nome || "Preparação do sistema",
        acao: "usuario.telas_alteradas",
        entidade: "Usuário",
        entidadeId: alvo.id,
        detalhes: `${usuarioDaSessao?.nome || "Administrador"} alterou as telas de ${alvo.nome}. Antes → depois: ${partes.join("; ")}.`,
      },
      agora
    );
    const novo: AppDB = {
      ...db,
      usuarios: db.usuarios.map((usuario) => (usuario.id === alvo.id ? atualizado : usuario)),
      registrosAuditoria: [...db.registrosAuditoria, registro],
    };
    salvarDBLocal(novo);
    setDb(novo);
    return true;
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
      void avisar(error instanceof Error ? error.message : "Não foi possível alterar este usuário.");
      return false;
    }
  }

  async function enviarAcessoUsuario(usuarioId: string): Promise<boolean> {
    if (!exigirPermissao("usuarios.gerenciar")) return false;
    const usuario = db.usuarios.find((item) => item.id === usuarioId);
    if (!usuario) {
      void avisar("Usuário preparado não encontrado.");
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
      void avisar(result.message || "Acesso enviado com sucesso.");
      return true;
    } catch (error) {
      void avisar(error instanceof Error ? error.message : "Não foi possível enviar o acesso.");
      return false;
    }
  }

  async function confirmarSaidaDaEdicao() {
    if (!empresaTemAlteracoes) return true;
    return confirmar(
      "Há alterações ainda não salvas nesta área. Deseja sair e descartá-las?",
      { titulo: "Alterações não salvas", confirmarRotulo: "Sair e descartar", cancelarRotulo: "Continuar editando", perigoso: true }
    );
  }

  async function navegarPrincipal(destino: View) {
    if (!(await confirmarSaidaDaEdicao())) return;
    if (showEmpresaForm) {
      setShowEmpresaForm(false);
      setEditingEmpresaId(null);
      setEmpresaSecao(null);
    }
    setView(destino);
  }

  async function abrirSecaoEmpresaPeloMenu(secao: EmpresaSecao) {
    if (!atual || !permitido("empresas.editar", atual.id)) return;
    if (showEmpresaForm && editingEmpresaId === atual.id) {
      if (!(await confirmarSaidaDaEdicao())) return;
      setEmpresaSecao(secao);
      setMsg("");
      setView("empresas");
      return;
    }
    editarEmpresa(atual);
    setEmpresaSecao(secao);
  }

  if (
    ready &&
    sessaoConsultada &&
    sessaoAtual &&
    (!usuarioDaSessao || usuarioDaSessao.status !== "Ativo")
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 text-center shadow-sm">
          <div className="text-xs font-extrabold uppercase text-[color:var(--brand)]">
            Acesso não liberado
          </div>
          <h1 className="mt-2 text-2xl font-extrabold">Esta conta não pode entrar no sistema</h1>
          <p className="mt-3 text-sm text-slate-600">
            Peça ao Administrador para preparar ou reativar este e-mail no diretório de pessoas.
          </p>
          <button
            type="button"
            onClick={() => void sairDoSistema()}
            className="mt-5 rounded-xl bg-[var(--brand)] px-5 py-3 font-medium text-white"
          >
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  const contextoMenu: NavContexto = {
    dentroDeVisita: VISIT_VIEWS.includes(view),
    pode: (acao) => permitido(acao, visitaAtual?.empresaId ?? atual?.id),
    nivelTela: usuarioDaSessao ? (tela) => nivelDe(tela) : undefined,
  };
  const dentroDaVisita = contextoMenu.dentroDeVisita && !!visitaAtual;
  // UMA fonte para os ambientes: o menu e a lista do checklist usam esta mesma resposta.
  const infosAmbientes = visitaAtual
    ? resumoAmbientes(
        visitaAtual.ambientes || [],
        checklistAtual,
        programasChecklistAtivos.length > 0
          ? [{ nome: AMBIENTE_PROGRAMAS_CONTROLE, rotulo: AMBIENTE_PROGRAMAS_CONTROLE }]
          : []
      )
    : [];
  // Mesmos números que a Central da visita já usa; nenhuma consulta nova.
  const contagensMenu: Partial<Record<NavKey, ContagemEtapa>> = dentroDaVisita
    ? {
        ambientes: { texto: String(quantidadeDeAmbientes(infosAmbientes)) },
        checklist: { texto: `${respondidos}/${totalChecklist}` },
        evidencias: { texto: String(evidenciasVisita.length) },
        ncs: { texto: String(ncsVisita.length), tom: "nc" },
        plano: { texto: String(ncsVisita.length), tom: "pend" },
      }
    : {};
  const cartaoVisita: CartaoVisita | null =
    dentroDaVisita && visitaAtual
      ? {
          rotulo: visitaAtual.status === "Concluída" ? "Visita concluída" : "Visita em andamento",
          empresa: nomeEmFormatoNatural(empresaVisita?.nomeFantasia) || "Empresa",
          data: fdata(visitaAtual.data),
          percentual: percentualChecklist,
          conformes: conformesChecklist,
          naoConformes: naoConformesChecklist,
          naoSeAplica: naoSeAplicaChecklist,
          pendentes: pendentesChecklist,
        }
      : null;
  const podeUsarChecklistNaBusca = permitido("visitas.executar", visitaAtual?.empresaId ?? atual?.id);
  const destinosCaixa: Destino[] = caixaAberta
    ? construirDestinos({
        itensMenu: itensVisiveis(contextoMenu),
        empresas: Object.values(db.empresas)
          .filter((empresa) => podeAcessarEmpresa(usuarioDaSessao, empresa.id) || !usuarioDaSessao)
          .map((empresa) => ({ id: empresa.id, nome: nomeEmFormatoNatural(empresa.nomeFantasia) || empresa.razaoSocial || "Empresa" })),
        empresaAtivaId: db.empresaAtualId,
        visitas: visitas.map((visita) => ({
          id: visita.id,
          empresaId: visita.empresaId,
          rotulo: fdata(visita.data),
          status: visita.status,
        })),
        dentroDeVisita: dentroDaVisita,
        ambientes: dentroDaVisita ? infosAmbientes.map((info) => info.nome) : [],
        itensChecklist: dentroDaVisita
          ? checklistAtual.map((item) => ({ id: item.id, ambiente: item.ambiente, titulo: item.titulo, status: item.status }))
          : [],
        visitaEmAndamentoId: visitaEmAndamentoDestaque?.id ?? null,
        podeChecklist: podeUsarChecklistNaBusca && !!visitaEmAndamentoDestaque,
      })
    : [];
  const checklistDestaque = visitaEmAndamentoDestaque?.checklist || [];
  const inicioPc = {
    continuar: visitaEmAndamentoDestaque
      ? {
          empresa: nomeEmFormatoNatural(db.empresas[visitaEmAndamentoDestaque.empresaId]?.nomeFantasia) || "Empresa",
          proximaEtapa:
            checklistDestaque.find((item) => item.status === "Pendente")?.ambiente ||
            ((visitaEmAndamentoDestaque.ambientes || []).length ? "Revisar a inspeção" : "Definir os ambientes da visita"),
          respondidos: checklistDestaque.filter((item) => item.status !== "Pendente").length,
          total: checklistDestaque.length,
          percentual: progressoVisitaDestaque,
          conformes: checklistDestaque.filter((item) => item.status === "Conforme").length,
          naoConformes: checklistDestaque.filter((item) => item.status === "Não Conforme").length,
          naoSeAplica: checklistDestaque.filter((item) => item.status === "Não se aplica").length,
          pendentes: checklistDestaque.filter((item) => item.status === "Pendente").length,
          onContinuar: () => {
            setDb((estado) => ({ ...estado, empresaAtualId: visitaEmAndamentoDestaque.empresaId }));
            setVisitaAtualId(visitaEmAndamentoDestaque.id);
            setView("visita");
          },
        }
      : null,
    ncAcompanhamento: (db.ncs || []).filter(
      (nc) =>
        !nc.inativaNoChecklist &&
        nc.status !== "Resolvida" &&
        visitas.some((visita) => visita.id === nc.visitaId)
    ).length,
    preparacaoAtual: atual ? preparacaoDaEmpresa(atual) : null,
    recentes: (filtro: "Em andamento" | "Concluída") =>
      visitas
        .filter((visita) => visita.status === filtro)
        .slice(0, 12)
        .map((visita) => {
          const itens = visita.checklist || [];
          const respondidosVisita = itens.filter((item) => item.status !== "Pendente").length;
          return {
            id: visita.id,
            empresa: nomeEmFormatoNatural(db.empresas[visita.empresaId]?.nomeFantasia) || "Empresa",
            data: fdata(visita.data),
            responsavel: visita.responsavel || "Responsável não informado",
            status: visita.status,
            percentual: itens.length ? Math.round((respondidosVisita / itens.length) * 100) : 0,
          };
        }),
  };
  const nomeParaExibir = (empresa?: Empresa) => {
    if (!empresa) return "Empresa";
    const fantasia = (empresa.nomeFantasia || "").trim();
    const pareceCnpj = /^[\d.\/\-\s]+$/.test(fantasia);
    return nomeEmFormatoNatural(pareceCnpj || !fantasia ? empresa.razaoSocial || fantasia : fantasia) || "Empresa";
  };
  const resumoPopsVisita = popsDaVisita(
    ncsVisita.map((nc, indice) => ({ numero: indice + 1, categoria: nc.categoria })),
    empresaVisita?.pops || []
  );
  const dadosTrilha = {
    respondidos,
    total: totalChecklist,
    evidencias: evidenciasVisita.length,
    correcoesAbertas: ncsAbertas,
    popsPendentes: resumoPopsVisita.pendentes,
  };
  const linhasConferenciaRel = conferenciaDoRelatorio({
                  respondidos,
                  totalChecklist,
                  ncsAbertas,
                  ncsSemResponsavelOuPrazo: ncsVisita.filter((nc) => nc.status !== "Resolvida" && (!nc.responsavelAcao?.trim() || !nc.prazo?.trim())).length,
                  evidencias: evidenciasVisita.length,
                  popsPendentes: resumoPopsVisita.pendentes,
                  popsSugeridos: resumoPopsVisita.linhas.length,
                  cadastroPreenchidos: empresaVisita ? preparacaoDaEmpresa(empresaVisita).preenchidos : 0,
                  cadastroTotal: empresaVisita ? preparacaoDaEmpresa(empresaVisita).total : 0,
  });
  const passoAtualDaTrilha = passoDaView(view);
  const percentualVisitaTrilha = percentualDaVisita(respondidos, totalChecklist);
  const classesSecoesRelatorio = (Object.keys(secoesRelatorio) as SecaoRelatorio[])
    .filter((chave) => !secoesRelatorio[chave])
    .map((chave) => `rep-off-${chave}`)
    .join(" ");
  const chaveDaTela: NavKey | null =
    view === "empresas" && showEmpresaForm && empresaSecao === "pops" ? "pops" : chaveAtiva(view);
  const itemDaTela = chaveDaTela ? itemDoMenu(chaveDaTela) : undefined;
  const rotuloDaTela =
    view === "historico"
      ? "Histórico"
      : view === "correcoes"
        ? "Correções"
        : view === "popsvisita"
          ? "POPs da visita"
          : chaveDaTela === "central"
            ? "Central"
            : itemDaTela?.rotulo || "";
  // No PC o menu não lista as etapas da visita: dentro dela, o item ativo é "Visitas".
  const chaveMenuAtivo: NavKey | null = ehPC && VISIT_VIEWS.includes(view) ? null : chaveDaTela;
  const visitaAbertaNoMenu = !!visitaAtual && (VISIT_VIEWS.includes(view) || visitaAtual.status !== "Concluída");
  const caminhoTopo = dentroDaVisita
    ? ["Visitas", cartaoVisita?.empresa || "Empresa", rotuloDaTela || "Central"]
    : [rotuloDaTela || "Início"];
  const iniciaisUsuario = usuarioDaSessao
    ? usuarioDaSessao.nome.split(" ").filter(Boolean).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase()
    : null;

  const itensMenuModo: ItemMenu[] = [
    ...(Object.keys(ROTULO_DE_USO) as Array<keyof typeof ROTULO_DE_USO>).map((opcao): ItemMenu => ({
      rotulo: `${modo === opcao ? "● " : "○ "}${ROTULO_DE_USO[opcao]}`,
      onClick: () => telaModo.escolherModo(opcao),
    })),
    { rotulo: "Voltar ao automático", onClick: () => telaModo.voltarAoAutomatico(), desabilitado: telaModo.preferencia.automatico },
    { rotulo: "Configurar modo de tela…", onClick: () => setView("modotela") },
  ];

  return (
    <IaPermitidaContext.Provider value={deveExibirRecursosDeIa(usuarioDaSessao)}>
    <div className="min-h-screen bg-[var(--bg)]">
      <UpdateNotice />
      {perfilAberto && usuarioDaSessao && (
        <MeuPerfilModal
          nome={usuarioDaSessao.nome}
          email={usuarioDaSessao.email}
          perfil={usuarioDaSessao.perfil}
          empresas={usuarioDaSessao.perfil === "Administrador" ? ["Todas as empresas"] : usuarioDaSessao.empresaIds.map((id) => nomeParaExibir(db.empresas[id])).filter(Boolean)}
          versao={pacote.version}
          onFechar={() => setPerfilAberto(false)}
        />
      )}
      {revisaoVoz && (
        <RevisaoTranscricao
          texto={revisaoVoz.texto}
          onDescartar={() => setRevisaoVoz(null)}
          onUsar={(texto) => {
            revisaoVoz.aplicar(texto);
            setRevisaoVoz(null);
          }}
        />
      )}
      {avisoVoz && (
        <div className="pc-toast voz-toast" role="status">
          <span>{avisoVoz}</span>
        </div>
      )}
      {aviso && (
        <div className="pc-toast" role="status">
          <span>{aviso.texto}</span>
          <button type="button" className="pc-link-btn" onClick={() => verEvidenciasDaVisita(aviso.visitaId)}>
            Ver
          </button>
        </div>
      )}
      {registrarAberto && (() => {
        const abertasBrutas = (db.visitas || []).filter(
          (visita) => visita.status !== "Concluída" && permitido("evidencias.adicionar", visita.empresaId)
        );
        const abertas = maisRecentesPrimeiro(abertasBrutas);
        const visitas = abertas.map((visita) => ({
          id: visita.id,
          rotulo: `${nomeParaExibir(db.empresas[visita.empresaId])} · visita de ${fdata(visita.data)}`,
          itens: (visita.checklist || []).map((item) => ({ id: item.id, rotulo: item.titulo, ambiente: item.ambiente })),
        }));
        const padrao = visitaPadraoParaRegistro(abertas, visitaAtualId, db.empresaAtualId);
        const inicial = visitas.find((visita) => visita.id === padrao?.id);
        const itemInicial = inicial?.itens.some((item) => item.id === ultimoItemChecklistId) ? ultimoItemChecklistId || "" : "";
        return (
          <RegistrarAgoraModal
            aparelho={descreverAparelho(telaModo.larguraDoAparelho).toLocaleLowerCase("pt-BR") as "celular" | "tablet" | "computador"}
            visitas={visitas}
            visitaInicialId={inicial?.id || ""}
            itemInicialId={itemInicial}
            iniciarCamera={registrarComCamera}
            onFechar={() => { setRegistrarAberto(false); setRegistrarComCamera(false); }}
            onIrVisitas={() => { setRegistrarAberto(false); setRegistrarComCamera(false); navegarPrincipal("visitas"); }}
            onSalvar={async ({ visitaId, arquivo, tipo, origem, descricao, item }) => {
              const alvo = db.visitas.find((visita) => visita.id === visitaId);
              if (!alvo) throw new Error("visita não encontrada");
              const nc = item ? (db.ncs || []).find((registro) => registro.visitaId === alvo.id && registro.checklistItemId === item.id && !registro.inativaNoChecklist) : undefined;
              const ok = await adicionarEvidencia(
                arquivo,
                tipo,
                { ambiente: item?.ambiente || "", checklistItemId: item?.id || "", ncId: nc?.id || "" },
                { visita: alvo, descricao }
              );
              if (!ok) throw new Error("falha ao salvar");
              const nomeEmpresa = nomeParaExibir(db.empresas[alvo.empresaId]);
              setAviso({
                texto: `${origem === "audio" || tipo === "Áudio" ? "Áudio salvo" : origem === "arquivo" ? "Arquivo salvo" : "Foto salva"} em ${nomeEmpresa} · Evidências`,
                visitaId: alvo.id,
              });
            }}
          />
        );
      })()}
      <AppNavigation
        contexto={contextoMenu}
        ativa={chaveMenuAtivo}
        onSelecionar={irParaMenu}
        ncsAbertas={ncsAbertas}
        maisAberto={menuMaisAberto}
        onAbrirMais={() => setMenuMaisAberto(true)}
        onFecharMais={() => setMenuMaisAberto(false)}
        utilitarias={[
          { id: "texto", rotulo: "Texto", onClick: () => { setTamanhoTextoRascunho(tamanhoTexto); setPainelTamanhoTextoAberto(true); } },
          { id: "sincronizar", rotulo: "Sincronizar", onClick: () => { setMenuMaisAberto(false); void atualizarNuvemManualmente(); } },
          { id: "modo", rotulo: "Modo de tela", onClick: () => { setMenuMaisAberto(false); setView("modotela"); } },
          { id: "sobre", rotulo: "Sobre", onClick: () => void avisar(`${BRAND.name}\n${BRAND.subtitle}`, { titulo: "Sobre" }) },
          { id: "sair", rotulo: "Sair", desabilitado: saindo, onClick: () => { setMenuMaisAberto(false); void sairDoSistema(); } },
        ]}
        sincronizacao={{
          estado: syncStatus === "sincronizado" ? "ok" : syncStatus === "erro" ? "erro" : "pendente",
          rotulo: syncStatus === "sincronizado" ? "Dados sincronizados" : syncStatus === "conectando" ? "Sincronizando dados" : "Verificar sincronização",
          onClick: () => void atualizarNuvemManualmente(),
        }}
        contagens={contagensMenu}
        visita={cartaoVisita}
        onSair={() => void sairDoSistema()}
        visitaMenu={ehPC && visitaAbertaNoMenu ? { empresa: nomeSemNumerosNoInicio(nomeParaExibir(empresaVisita)), data: `${visitaAtual ? fdata(visitaAtual.data).slice(0, 5) : ""} · ${visitaAtual?.status === "Concluída" ? "concluída" : "em andamento"}`, passos: passosDaTrilha(dadosTrilha).filter((passo) => telaVisivel(passo.chave === "pops" ? "popsVisita" : (passo.chave as TelaKey))), atual: passoAtualDaTrilha, emTelaDaVisita: VISIT_VIEWS.includes(view) } : null}
        onIrPasso={irParaPasso}
        onMeuPerfil={() => setPerfilAberto(true)}
        usuario={usuarioDaSessao ? { nome: usuarioDaSessao.nome, perfil: usuarioDaSessao.perfil, iniciais: iniciaisUsuario || "" } : null}
        versao={pacote.version.split(".").slice(0, 2).join(".")}
        saindo={saindo}
      />

      <input
        ref={registrarInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const input = event.currentTarget;
          const arquivo = input.files?.[0];
          if (arquivo) aoEscolherFotoDoRegistro(arquivo);
          input.value = "";
        }}
      />

      {confirmaFoto && (
        <div className="pc-dialog-layer" role="presentation">
          <div className="pc-dialog" role="dialog" aria-modal="true" aria-labelledby="pc-dialog-titulo">
            <p id="pc-dialog-titulo" className="pc-dialog-title">Vincular a: {confirmaFoto.itemTitulo}?</p>
            <p className="pc-dialog-sub">{confirmaFoto.ambiente}</p>
            <div className="pc-dialog-actions">
              <button
                type="button"
                className="pc-dialog-primary"
                onClick={() => {
                  const foto = confirmaFoto;
                  setConfirmaFoto(null);
                  void adicionarEvidencia(foto.arquivo, "Foto", { ambiente: foto.ambiente, checklistItemId: foto.itemId, ncId: foto.ncId });
                }}
              >
                Sim
              </button>
              <button
                type="button"
                className="pc-dialog-outline"
                onClick={() => {
                  setFotoAguardando(confirmaFoto.arquivo);
                  setConfirmaFoto(null);
                  abrirChecklist();
                }}
              >
                Escolher outro item
              </button>
              <button
                type="button"
                className="pc-dialog-outline"
                onClick={() => {
                  const foto = confirmaFoto;
                  setConfirmaFoto(null);
                  void adicionarEvidencia(foto.arquivo, "Foto", { ambiente: "", checklistItemId: "", ncId: "" });
                }}
              >
                Só salvar como evidência da visita
              </button>
            </div>
          </div>
        </div>
      )}

      <CommandPalette
        aberto={caixaAberta}
        comVoz={caixaComVoz}
        destinos={destinosCaixa}
        onEscolher={escolherDestinoDaCaixa}
        onFechar={() => setCaixaAberta(false)}
      />

      <header className="mobile-app-header relative overflow-hidden border-b border-[var(--border)] bg-white text-[color:var(--ink)] md:hidden">
        <div className="relative mx-auto max-w-7xl px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <LogoSymbol size={30} />
              <div className="min-w-0">
                <LogoWordmark className="whitespace-nowrap text-base" />
                <div className="hidden whitespace-nowrap text-[9px] text-[color:var(--ink-2)] sm:block sm:text-[11px]">{BRAND.subtitle}</div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
              type="button"
              onClick={() => void atualizarNuvemManualmente()}
              className={`rounded-full px-2.5 py-1.5 text-[11px] font-semibold sm:px-3 sm:text-xs ${
                syncStatus === "sincronizado"
                  ? "bg-[var(--ok-bg)] text-[color:var(--ink)]"
                  : syncStatus === "conectando"
                  ? "bg-[var(--brand-soft)] text-[color:var(--ink)]"
                  : syncStatus === "local"
                  ? "bg-[var(--pend-bg)] text-[color:var(--ink)]"
                  : syncStatus === "recuperacao"
                  ? "bg-[var(--pend-bg)] text-[color:var(--ink)]"
                  : syncErroVisivel && !estaOnline
                  ? "bg-[var(--pend-bg)] text-[color:var(--ink)]"
                  : syncErroVisivel
                  ? "bg-[var(--nc-bg)] text-[color:var(--ink)]"
                  : "bg-[var(--brand-soft)] text-[color:var(--ink)]"
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
              <button
                type="button"
                onClick={() => { setCaixaComVoz(false); setCaixaAberta(true); }}
                aria-label="Buscar ou dizer o que quer fazer"
                title="Buscar"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-white text-[color:var(--ink)]"
              >
                <NavIcon name="lupa" size={16} />
              </button>
              <button
                type="button"
                onClick={() => setMenuMaisAberto(true)}
                aria-label="Mais opções"
                title="Mais opções"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-white text-lg font-bold leading-none text-[color:var(--ink)]"
              >
                <span aria-hidden="true" className="-mt-1">•••</span>
              </button>
            </div>
          </div>

          {usuarioDaSessao && (
            <div className="mt-1.5 flex min-w-0 items-center justify-between gap-3 border-t border-[var(--border)] pt-1.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-[9px] font-medium text-white">
                  {usuarioDaSessao.nome.split(" ").filter(Boolean).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold sm:text-sm">{nomeEmFormatoNatural(atual?.nomeFantasia) || "Selecione uma empresa"}</div>
                  <div className="hidden truncate text-[9px] text-[color:var(--ink-2)] sm:block sm:text-[10px]">{usuarioDaSessao.nome} • {usuarioDaSessao.perfil}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void sairDoSistema()}
                disabled={saindo}
                aria-label="Sair"
                title="Sair"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-white text-[color:var(--ink)] disabled:opacity-60"
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

      {painelTamanhoTextoAberto && (
        <div className="mbp-sheet-layer pc-hide-xl" role="presentation">
          <button
            type="button"
            className="mbp-sheet-backdrop"
            aria-label="Voltar"
            onClick={() => setPainelTamanhoTextoAberto(false)}
          />
          <section className="mbp-bottom-sheet mbp-text-sheet" role="dialog" aria-modal="true" aria-label="Tamanho do texto">
            <div className="mbp-sheet-handle" aria-hidden="true" />
            <div className="mbp-sheet-title-row">
              <button type="button" className="mbp-sheet-close" aria-label="Voltar" onClick={() => setPainelTamanhoTextoAberto(false)}>←</button>
              <h2>Tamanho do texto</h2>
              <button type="button" className="mbp-sheet-close" aria-label="Fechar" onClick={() => { setPainelTamanhoTextoAberto(false); setMenuMaisAberto(false); }}>×</button>
            </div>
            <p className="mbp-text-sheet-intro">Escolha o tamanho mais confortável. A preferência fica salva neste aparelho.</p>

            <div className="mbp-text-options">
              {[
                [90, "Menor"],
                [100, "Padrão"],
                [110, "Um pouco maior"],
                [120, "Maior"],
                [130, "Muito maior"],
              ].map(([valor, rotulo]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setTamanhoTextoRascunho(Number(valor))}
                  className={`mbp-text-option ${tamanhoTextoRascunho === Number(valor) ? "is-selected" : ""}`}
                >
                  <span className="mbp-text-a" style={{ fontSize: `${0.8 + (Number(valor) - 90) * 0.006}rem` }}>A</span>
                  <strong>{valor}%</strong>
                  <span>{rotulo}</span>
                  <span className="mbp-text-check" aria-hidden="true">{tamanhoTextoRascunho === Number(valor) ? "✓" : ""}</span>
                </button>
              ))}
            </div>

            <div className="mbp-text-preview" style={{ fontSize: `${tamanhoTextoRascunho / 100}rem` }}>
              <span>Prévia de visualização</span>
              <p>Este é um exemplo de como o texto ficará no aplicativo.</p>
            </div>

            <button type="button" className="mbp-text-apply" onClick={() => aplicarTamanhoTexto(tamanhoTextoRascunho)}>Aplicar</button>
            <button type="button" className="mbp-text-reset" onClick={() => setTamanhoTextoRascunho(100)}>Restaurar padrão</button>
          </section>
        </div>
      )}

      {recuperacaoPendente && (
        <div className="border-b border-amber-300 bg-[var(--pend-bg)] pc-offset">
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
              className="mt-3 rounded-xl bg-[var(--orange)] px-4 py-2 font-normal text-white disabled:opacity-60"
            >
              {recuperandoDados
                ? "Recuperando..."
                : "Mesclar registros locais com a nuvem"}
            </button>
          </div>
        </div>
      )}

      {protecaoLocalAtiva && !recuperacaoPendente && (
        <div className={`border-b pc-offset ${estaOnline ? "border-red-200 bg-[var(--nc-bg)]" : "border-blue-200 bg-[var(--brand-soft)]"}`}>
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
              <button type="button" onClick={baixarBackupLocal} className="mt-3 rounded-xl bg-[var(--nc)] px-4 py-2 font-bold text-white">
                Baixar backup local
              </button>
            )}
          </div>
        </div>
      )}

      {armazenamentoLocalIndisponivel && (
        <div className="border-b border-amber-300 bg-[var(--pend-bg)] pc-offset">
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

      <div className="mx-auto min-w-0 max-w-[1500px] overflow-x-hidden px-3 py-4 pb-28 sm:p-5 pc-offset pc-content-pad md:overflow-visible md:pb-6 lg:p-7">
        {modo === "campo" && (
          <>
            <CampoCabecalho
              empresa={nomeEmFormatoNatural(atual?.nomeFantasia) || ""}
              sincronizacao={{
                estado: !estaOnline || syncStatus === "erro" ? "erro" : syncStatus === "sincronizado" ? "ok" : "pendente",
                rotulo: !estaOnline ? "Sem conexão" : syncStatus === "sincronizado" ? "Sincronizado" : syncStatus === "conectando" ? "Sincronizando…" : "Verificar sincronização",
                onClick: () => void atualizarNuvemManualmente(),
              }}
              menuModo={itensMenuModo}
              onTrocarEmpresa={() => setTrocarEmpresaAberto(true)}
            />
            <CampoBarra
              tela={view === "inicio" ? "inicio" : view === "checklist" ? "checklist" : view === "correcoes" ? "correcoes" : view === "campomais" ? "mais" : null}
              correcoesAbertas={ncsAbertas}
              podeRegistrar={permitido("evidencias.adicionar") || permitido("visitas.executar")}
              onIr={irParaTelaCampo}
              onRegistrar={() => setRegistrarAberto(true)}
            />
          </>
        )}
        <AppTopbar
          caminho={caminhoTopo}
          onPrimeiro={() => navegarPrincipal("visitas")}
          empresaAtiva={nomeEmFormatoNatural(atual?.nomeFantasia) || null}
          iniciais={iniciaisUsuario}
          mostrarTodasVisitas={dentroDaVisita}
          onTodasVisitas={() => navegarPrincipal("visitas")}
          onAbrirCaixa={(comVoz) => { setCaixaComVoz(comVoz); setCaixaAberta(true); }}
          micDisponivel={deveExibirRecursosDeIa(usuarioDaSessao)}
          modo={modo}
          sincronizacao={{
            estado: !estaOnline || syncStatus === "erro" ? "erro" : syncStatus === "sincronizado" ? "ok" : "pendente",
            onClick: () => void atualizarNuvemManualmente(),
          }}
          automatico={telaModo.preferencia.automatico}
          onEscolherModo={telaModo.escolherModo}
          onVoltarAoAutomatico={telaModo.voltarAoAutomatico}
          onAbrirConfigModo={() => setView("modotela")}
        />
        <nav className="hidden">
          <button
            onClick={() => navegarPrincipal("inicio")}
            className={`rounded-xl px-4 py-2 font-bold ${
              view === "inicio"
                ? "bg-[var(--brand-soft)] text-[color:var(--ink)]"
                : "bg-slate-200 text-slate-900"
            }`}
          >
            Início
          </button>
          <button
            onClick={() => navegarPrincipal("empresas")}
            className={`rounded-xl px-4 py-2 font-bold ${
              view === "empresas"
                ? "bg-[var(--brand-soft)] text-[color:var(--ink)]"
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
                ? "bg-[var(--brand-soft)] text-[color:var(--ink)]"
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
                  ? "bg-[var(--brand-soft)] text-[color:var(--ink)]"
                  : "bg-slate-200 text-slate-900"
              }`}
            >
              Acessos
            </button>
          )}
        </nav>

        {modo === "campo" && trocarEmpresaAberto && (
          <TrocarEmpresaPainel
            opcoes={opcoesTrocaDeEmpresa}
            onFechar={() => setTrocarEmpresaAberto(false)}
            onEscolher={(id) => {
              setTrocarEmpresaAberto(false);
              if (id !== db.empresaAtualId) {
                setDb((o) => ({ ...o, empresaAtualId: id }));
                setVisitaAtualId(null);
              }
              setView("inicio");
            }}
          />
        )}
        {modo === "campo" && view === "campomais" ? (
          <CampoMais
            daVisita={
              visitaAtual
                ? [
                    { id: "central", rotulo: "Central da visita", icone: "central", tom: "azul", onClick: () => irParaMenu("central") },
                    { id: "ambientes", rotulo: "Ambientes", icone: "ambientes", tom: "turquesa", onClick: () => irParaMenu("ambientes") },
                    { id: "evidencias", rotulo: "Evidências", icone: "evidencias", tom: "ceu", onClick: () => irParaMenu("evidencias") },
                    ...(telaVisivel("popsVisita") ? [{ id: "popsvisita", rotulo: "POPs da visita", icone: "pops" as const, tom: "violeta", onClick: () => { setMenuMaisAberto(false); setView("popsvisita"); } }] : []),
                    ...(telaVisivel("relatorio") ? [{ id: "relatorio", rotulo: "Relatório", icone: "relatorio" as const, tom: "ardosia", onClick: () => irParaMenu("relatorio") }] : []),
                  ]
                : []
            }
            gerais={[
              { id: "visitas", rotulo: "Visitas", icone: "visitas", tom: "indigo", onClick: () => irParaMenu("visitas") },
              { id: "trocar-empresa", rotulo: "Trocar empresa", icone: "empresas", tom: "turquesa", onClick: () => setTrocarEmpresaAberto(true) },
              { id: "ajuda", rotulo: "Ajuda", icone: "ajuda", tom: "laranja", onClick: () => irParaMenu("ajuda") },
              { id: "modo", rotulo: "Modo de tela", icone: "modo", tom: "roxo", onClick: () => setView("modotela") },
              { id: "sincronizar", rotulo: "Sincronizar", icone: "sincronizar", tom: "verde", onClick: () => void atualizarNuvemManualmente() },
              { id: "sair", rotulo: "Sair", icone: "sair", tom: "vermelho", onClick: () => void sairDoSistema() },
            ]}
            onVersaoCompleta={() => telaModo.escolherModo("completo")}
          />
        ) : modo === "campo" && view === "inicio" ? (
          (() => {
            const alvo = visitaAtual?.status === "Em andamento" ? visitaAtual : visitaEmAndamentoDestaque;
            const lista = alvo?.checklist || [];
            const abertasDoAlvo = alvo ? (db.ncs || []).filter((nc) => nc.visitaId === alvo.id && !nc.inativaNoChecklist && nc.status !== "Resolvida").length : 0;
            return (
              <CampoInicio
                usuario={usuarioDaSessao?.nome || ""}
                visitaAtiva={alvo ? { empresa: nomeParaExibir(db.empresas[alvo.empresaId]), data: fdata(alvo.data) } : null}
                respondidos={lista.filter((item) => item.status !== "Pendente").length}
                total={lista.length}
                naoConformes={lista.filter((item) => item.status === "Não Conforme").length}
                correcoesAbertas={abertasDoAlvo}
                outras={db.visitas
                  .filter((visita) => visita.status === "Em andamento" && visita.id !== alvo?.id && podeAbrirVisita(visita.empresaId))
                  .map((visita) => ({ id: visita.id, rotulo: `${nomeParaExibir(db.empresas[visita.empresaId])} · ${fdata(visita.data)}` }))}
                podeRegistrar={permitido("evidencias.adicionar", alvo?.empresaId) || permitido("visitas.executar", alvo?.empresaId)}
                onContinuar={() => alvo && continuar(alvo.id, true)}
                onRegistrar={() => setRegistrarAberto(true)}
                onCorrecoes={() => irParaTelaCampo("correcoes")}
                onAbrirVisita={(id) => continuar(id, true)}
                onVisitas={() => irParaMenu("visitas")}
              />
            );
          })()
        ) : modo === "campo" && view === "checklist" && visitaAtual ? (
          (() => {
            const lista = itensEmOrdem();
            const foco = itemEmFoco();
            const posicao = foco ? lista.findIndex((item) => item.id === foco.id) : -1;
            return (
              <section className="campo-tela campo-tela--fixa" aria-label="Checklist">
                <div className="campo-chips" role="tablist" aria-label="Ambientes">
                  {infosAmbientes.map((info) => (
                    <button
                      key={info.nome}
                      type="button"
                      role="tab"
                      aria-selected={foco?.ambiente === info.nome}
                      className={`campo-chip-env${foco?.ambiente === info.nome ? " is-on" : ""}`}
                      onClick={() => {
                        const primeiro = lista.find((item) => item.ambiente === info.nome && item.status === "Pendente") || lista.find((item) => item.ambiente === info.nome);
                        setAmbienteChecklistAtivo(info.nome);
                        if (primeiro) setItemFocoId(primeiro.id);
                      }}
                    >
                      {info.rotulo} {info.respondidos}/{info.total}
                    </button>
                  ))}
                </div>
                {foco ? (
                  <ChecklistFocoItem
                    item={foco}
                    destaque={destaqueItemId === foco.id}
                    {...dadosDoAmbienteEmFoco(foco, lista)}
                    onGravidade={(gravidade) => { setItemFocoId(foco.id); atualizarChecklistItem(foco.id, trocaDeGravidade(foco, gravidade)); }}
                    posicao={posicao + 1}
                    total={lista.length}
                    podeEditar={permitido("visitas.executar", visitaAtual.empresaId)}
                    temAnterior={posicao > 0}
                    temProximo={posicao < lista.length - 1}
                    onStatus={(status) => { setItemFocoId(foco.id); atualizarChecklistItem(foco.id, { status, ...(status !== "Não Conforme" ? { observacao: "" } : {}) }); }}
                    onObservacao={(texto) => atualizarChecklistItem(foco.id, { observacao: texto })}
                    onFoto={() => { setUltimoItemChecklistId(foco.id); setRegistrarAberto(true); }}
                    onAnterior={() => moverItemFoco(-1)}
                    onProximo={() => moverItemFoco(1)}
                  />
                ) : (
                  <p className="campo-sub">Esta visita não tem itens de checklist.</p>
                )}
              </section>
            );
          })()
        ) : modo === "campo" && view === "correcoes" && visitaAtual ? (
          correcoesDoCelular()
        ) : view === "acessos" && permitido("usuarios.gerenciar") ? (
          <AccessPreparationPanel
            pc={telaEmLista}
            usuarios={db.usuarios}
            empresas={db.empresas}
            registrosAuditoria={db.registrosAuditoria}
            onSalvarUsuario={salvarUsuarioPreparacao}
            onAlterarStatus={mudarStatusUsuarioPreparacao}
            onEnviarAcesso={enviarAcessoUsuario}
            onExcluirUsuario={excluirUsuarioPreparacao}
            onSalvarTelas={salvarTelasLiberadas}
            motivoNaoExcluir={(usuario) => motivoParaNaoExcluir(usuario, contextoExclusaoUsuario())}
          />
        ) : view === "empresas" && showEmpresaForm && permitido("empresas.editar") ? (
          telaEmLista && !!editingEmpresaId && empresaSecao === "pops" ? (
            <PcPops
              pops={popsEmpresa}
              onChange={setPopsEmpresa}
              temAlteracoes={empresaTemAlteracoes}
              mensagem={msg}
              onSalvar={salvarEmpresa}
              onVoltar={async () => { if (await confirmarSaidaDaEdicao()) setEmpresaSecao(null); }}
            />
          ) : (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex justify-between gap-4">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-wide text-[color:var(--brand)]">
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
                onClick={async () => {
                  if (editingEmpresaId && empresaSecao !== null) {
                    if (!(await confirmarSaidaDaEdicao())) return;
                    setEmpresaSecao(null);
                    setMsg("");
                    return;
                  }
                  if (!(await confirmarSaidaDaEdicao())) return;
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
                  <div className="mb-4 rounded-xl border border-emerald-200 bg-[var(--ok-bg)] p-3 text-sm font-bold text-[color:var(--ink)]">
                    {msg}
                  </div>
                )}

                <div className="mb-4 rounded-2xl border border-blue-100 bg-[var(--brand-soft)]/70 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-[color:var(--brand)]">
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
                        ? "bg-[var(--ok-bg)] text-[color:var(--ink)]"
                        : "bg-[var(--pend-bg)] text-[color:var(--ink)]"
                    }`}>
                      {configuracaoEmpresaGerenciada.percentual}% configurada
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-[var(--brand)] transition-all"
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
                        cor: "bg-[var(--brand-soft)] text-[color:var(--ink)]",
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
                        cor: "bg-[var(--pend-bg)] text-[color:var(--ink)]",
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
                        cor: "bg-[var(--ok-bg)] text-[color:var(--ink)]",
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
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-50 text-lg font-bold text-[color:var(--brand)] transition group-hover:bg-[var(--brand-soft)]">→</span>
                        </div>
                        <div className="mt-3 text-[10px] font-extrabold uppercase tracking-wider text-[color:var(--brand)]">{item.categoria}</div>
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
                  <details className="mt-4 rounded-xl border border-blue-100 bg-[var(--brand-soft)]/70 p-3">
                    <summary className="cursor-pointer text-sm font-extrabold text-[color:var(--brand)]">
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
                          <button onClick={buscar} className="rounded-xl bg-[var(--brand)] px-4 font-medium text-white">
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

                {msg && <div className="mt-3 rounded-xl bg-[var(--pend-bg)] p-3 text-sm">{msg}</div>}

                <div className="sticky bottom-20 z-20 mt-4 rounded-2xl border border-blue-100 bg-white/95 p-2 shadow-lg backdrop-blur md:bottom-4">
                  {editingEmpresaId && (
                    <div className={`mb-2 px-1 text-xs font-bold ${empresaTemAlteracoes ? "text-amber-700" : "text-emerald-700"}`}>
                      {empresaTemAlteracoes
                        ? "● Alterações ainda não salvas"
                        : "✓ Todas as alterações desta área estão salvas"}
                    </div>
                  )}
                  <button onClick={salvarEmpresa} className="w-full rounded-xl bg-[var(--brand)] p-3 font-medium text-white">
                    {editingEmpresaId ? "Salvar e voltar à Central" : "Salvar e abrir a Central"}
                  </button>
                </div>
              </>
            )}
          </section>)
        ) : view === "visitas" && showVisitaForm ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex justify-between gap-4">
              <div>
                <div className="text-xs font-extrabold uppercase text-[color:var(--brand)]">
                  Nova visita
                </div>
                <h2 className="mt-1 text-2xl font-extrabold">
                  {nomeSemNumerosNoInicio(atual?.nomeFantasia || "")}
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
                <div className="mbp-voice-wrap">
                  <textarea
                    rows={4}
                    className="w-full rounded-xl border p-3"
                    value={vf.observacoes}
                    onChange={(e) =>
                      setVf({ ...vf, observacoes: e.target.value })
                    }
                  />
                  <VoiceDictationButton
                    ativo={campoVozAtivo === "visita-observacoes"}
                    melhorando={campoIaAtivo === "visita-observacoes"}
                    onIniciar={() => iniciarDitado("visita-observacoes", (texto) => setVf((atual) => ({ ...atual, observacoes: juntarTextoDitado(atual.observacoes, texto) })))}
                    onMelhorar={() => melhorarTextoComIa("visita-observacoes", vf.observacoes, (texto) => setVf((atual) => ({ ...atual, observacoes: texto })), "Observações iniciais de uma visita técnica de Boas Práticas em serviços de alimentação.")}
                  />
                </div>
              </label>
            </div>

            <button
              onClick={salvarVisita}
              disabled={criandoVisita}
              className="mt-5 w-full rounded-xl bg-[var(--brand)] p-3 font-medium text-white disabled:opacity-50"
            >
              {criandoVisita ? "Criando..." : "Criar visita"}
            </button>
          </section>
        ) : view === "ambientes" && visitaAtual ? (
          <PcAmbientes
            empresa={nomeParaExibir(empresaVisita)}
            data={fdata(visitaAtual.data)}
            sugeridos={ambientesSugeridosVisita}
            selecionados={ambientesSelecionados}
            opcoesModelo={[...OPCOES_MODELO_QUESTIONARIO]}
            modeloDoAmbiente={(nome) => modelosAmbientesSelecionados[nome] || obterModeloQuestionarioParaAmbiente(nome)}
            personalizado={ambientePersonalizado}
            onPersonalizado={setAmbientePersonalizado}
            statusSalvo={statusAmbientes}
            onToggle={alternarAmbientePc}
            ocultos={resumoOcultos(visitaAtual)}
            onMostrar={mostrarAmbienteDaVisita}
            onExcluirOculto={excluirAmbienteOcultoDaVisita}
            onDetalhado={aplicarModeloDetalhadoRestaurante}
            onAdicionar={adicionarPersonalizado}
            onModelo={atualizarModeloQuestionarioAmbiente}
            onVoltar={() => setView("visita")}
            onIniciar={() => {
              if (JSON.stringify(visitaAtual.ambientes || []) !== JSON.stringify(ambientesSelecionados)) {
                atualizarAmbientesDaVisita(ambientesSelecionados);
              }
              setIniciarChecklistPendente(true);
            }}
          />
        ) : view === "evidencias" && visitaAtual ? (
          <PcEvidencias
            empresa={nomeParaExibir(empresaVisita)}
            data={fdata(visitaAtual.data)}
            totais={{ evidencias: evidenciasVisita.length, fotos: fotosVisita, audios: audiosVisita, revisar: analisesIAPendentes }}
            podeAdicionar={permitido("evidencias.adicionar", visitaAtual.empresaId)}
            onTirarFoto={() => {
              if (evidenciaChecklistItemId) setUltimoItemChecklistId(evidenciaChecklistItemId);
              setRegistrarComCamera(true);
              setRegistrarAberto(true);
            }}
            vinculo={(() => {
              const item = checklistAtual.find((registro) => registro.id === evidenciaChecklistItemId);
              const posicao = item ? checklistAtual.filter((registro) => registro.ambiente === item.ambiente).findIndex((registro) => registro.id === item.id) + 1 : 0;
              return {
                ambiente: evidenciaAmbiente,
                temItem: Boolean(item),
                item: item ? `Item ${posicao} · ${item.titulo}` : "",
              };
            })()}
            ambientes={visitaAtual.ambientes || []}
            itens={checklistAtual
              .filter((item) => !evidenciaAmbiente || item.ambiente === evidenciaAmbiente)
              .map((item) => ({ id: item.id, rotulo: `${item.categoria} — ${item.titulo}` }))}
            ncs={ncsVisita.map((nc, idx) => ({ id: nc.id, rotulo: `NC ${idx + 1} — ${nomeDeExibicaoDoAmbiente(nc.ambiente)} — ${nc.titulo}` }))}
            ambienteSel={evidenciaAmbiente}
            itemSel={evidenciaChecklistItemId}
            ncSel={evidenciaNcId}
            onAmbiente={(valor) => { setEvidenciaAmbiente(valor); setEvidenciaChecklistItemId(""); }}
            onItem={(itemId) => {
              setEvidenciaChecklistItemId(itemId);
              const item = checklistAtual.find((registro) => registro.id === itemId);
              if (item) {
                setEvidenciaAmbiente(item.ambiente);
                const ncDoItem = ncsVisita.find((nc) => nc.checklistItemId === item.id);
                if (ncDoItem) setEvidenciaNcId(ncDoItem.id);
              }
            }}
            onNc={setEvidenciaNcId}
            descricao={evidenciaDescricao}
            onDescricao={setEvidenciaDescricao}
            mensagem={evidenciaMsg}
            onFoto={async (arquivo) => {
              if (!arquivo) {
                setEvidenciaMsg("Nenhuma foto foi recebida da câmera.");
                return;
              }
              await adicionarEvidencia(arquivo, "Foto");
            }}
            onAudio={(arquivo) => void adicionarEvidencia(arquivo, "Áudio")}
            onVoltar={() => setView("visita")}
            evidencias={evidenciasVisita.map((ev) => {
              const analises = ev.analisesIA || [];
              const ultima = analises.length ? analises[analises.length - 1] : undefined;
              return {
                id: ev.id,
                tipo: ev.tipo,
                nome: ev.nomeArquivo,
                descricao: ev.descricao || "",
                ambiente: ev.ambiente || "",
                quando: new Date(ev.criadoEm).toLocaleString("pt-BR"),
                url: urlEvidencia(ev),
                possivelNc: ultima?.situacao === "Possível não conformidade",
                analise: ultima
                  ? {
                      id: ultima.id,
                      status: ultima.status,
                      situacao: ultima.situacao || ultima.classificacao || "",
                      resumo: ultima.resumo,
                      acao: ultima.achados[0]?.acaoSugerida || "",
                      textoRevisado: ultima.textoRevisado,
                      revisadoPor: ultima.revisadaPor || "",
                      podeRevisar: permitido("ia.analisar", ev.empresaId),
                    }
                  : null,
                podeAnalisar: ev.tipo === "Foto" && permitido("ia.analisar", ev.empresaId),
                analisando: analiseIAEmAndamentoId === ev.id,
                bloqueioIA: analiseIAEmAndamentoId !== null,
                mensagemIA: analiseIAMensagens[ev.id] || "",
                podeExcluir: permitido("evidencias.adicionar", ev.empresaId),
                onAnalisar: () => void analisarFotoComIA(ev),
                onConfirmar: (texto: string) => ultima && confirmarAnaliseFoto(ev, ultima, texto),
                onDescartar: () => ultima && descartarAnaliseFoto(ev, ultima),
                onExcluir: () => excluirEvidencia(ev.id),
              };
            })}
          />
        ) : modo === "equilibrado" && telaModo.larguraDoAparelho < 900 && view === "correcoes" && visitaAtual ? (
          correcoesDoCelular()
        ) : view === "correcoes" && visitaAtual ? (
            <PcCorrecoes
              empresa={nomeParaExibir(empresaVisita)}
              data={fdata(visitaAtual.data)}
              hoje={hojeISO()}
              selecionadaInicial={planoNcAbertaId}
              podeEditar={permitido("ncs.acompanhar", visitaAtual.empresaId)}
              podeEvidenciar={permitido("evidencias.adicionar", visitaAtual.empresaId)}
              podeMarcar={permitido("ncs.marcar_feita", visitaAtual.empresaId)}
              onMarcarFeita={marcarCorrecaoComoFeita}
              onDesfazerFeita={desfazerCorrecaoFeita}
              itens={montarItensDeCorrecao()}
              onSalvarPlano={(id, dados) =>
                atualizarNC(id, {
                  acaoCorretiva: dados.acao,
                  responsavelAcao: dados.responsavel,
                  prazo: dados.prazo,
                  status: dados.etapa === "acompanhamento" ? "Em tratamento" : "Aberta",
                })
              }
              onRegistrar={(id, texto, status) => registrarAcompanhamento(id, texto, status)}
              onAdicionarEvidencia={(id) => {
                const nc = ncsVisita.find((registro) => registro.id === id);
                setEvidenciaNcId(id);
                setEvidenciaAmbiente(nc?.ambiente || "");
                setEvidenciaChecklistItemId("");
                setView("evidencias");
              }}
              onCriarPop={(codigo) => criarPopsSugeridos(codigo)}
              onAbrirPop={abrirPopsPeloAtalho}
              onLote={(ids, valores) => alteracoesEmLote(ncsVisita, ids, valores).forEach((alteracao) => atualizarNC(alteracao.id, alteracao.patch))}
              onVoltar={() => setView("visita")}
              pessoas={Array.from(
                new Set(
                  db.usuarios
                    .filter((usuario) => usuario.status !== "Suspenso" && (usuario.perfil === "Administrador" || usuario.empresaIds.includes(visitaAtual.empresaId)))
                    .map((usuario) => usuario.nome)
                    .filter(Boolean)
                )
              )}
              onVerNoChecklist={(itemId) => verItemNoChecklist(itemId)}
              responsavelPadrao={usuarioDaSessao?.nome || ""}
            />
        ) : view === "popsvisita" && visitaAtual ? (
            <PcPopsVisita
              empresa={nomeParaExibir(empresaVisita)}
              data={fdata(visitaAtual.data)}
              resumo={{
                totalNcs: resumoPopsVisita.totalNcs,
                ncsComPop: resumoPopsVisita.ncsComPop,
                rascunho: resumoPopsVisita.rascunho,
                aCriar: resumoPopsVisita.aCriar,
                aprovados: resumoPopsVisita.aprovados,
                semPop: resumoPopsVisita.semPop,
              }}
              linhas={resumoPopsVisita.linhas}
              podeCriar={permitido("empresas.editar", visitaAtual.empresaId)}
              onCriar={(codigo) => criarPopsSugeridos(codigo)}
              onAbrir={abrirPopsPeloAtalho}
              onCriarTodos={() => criarPopsSugeridos()}
              onContinuar={() => setView("relatorio")}
              onTodosPops={abrirPopsPeloAtalho}
              onVoltar={() => setView("visita")}
            />
        ) : view === "checklist" && visitaAtual && modo === "completo" ? (
          (() => {
            const lista = itensEmOrdem();
            const foco = itemEmFoco();
            const posicao = foco ? lista.findIndex((item) => item.id === foco.id) : -1;
            const ambienteDoFoco = foco?.ambiente || ambienteChecklistAtivo || "";
            const doAmbiente = lista.filter((item) => item.ambiente === ambienteDoFoco);
            const podeEditar = permitido("visitas.executar", visitaAtual.empresaId);
            let apoio: ApoioDoItem = { evidencias: [] };
            if (foco) {
              const linhaPop = popsDaVisita([{ numero: 1, categoria: foco.categoria }], empresaVisita?.pops || []).linhas[0];
              const anteriores = db.visitas
                .filter((visita) => visita.empresaId === visitaAtual.empresaId && visita.id !== visitaAtual.id && visita.data <= visitaAtual.data)
                .sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm));
              let ultimaVisita: ApoioDoItem["ultimaVisita"];
              for (const anterior of anteriores) {
                const igual = (anterior.checklist || []).find(
                  (item) => item.status !== "Pendente" && (item.id === foco.id || (item.titulo === foco.titulo && item.ambiente === foco.ambiente))
                );
                if (igual) {
                  ultimaVisita = { data: fdata(anterior.data), status: igual.status, observacao: igual.observacao || "" };
                  break;
                }
              }
              apoio = {
                orientacao: foco.orientacao || undefined,
                baseLegal: foco.referencia ? { referencia: foco.referencia } : undefined,
                pop: linhaPop ? { codigo: linhaPop.sugestao.codigo, titulo: linhaPop.sugestao.titulo, situacao: linhaPop.situacao } : undefined,
                ultimaVisita,
                evidencias: (db.evidencias || [])
                  .filter((ev) => ev.visitaId === visitaAtual.id && ev.checklistItemId === foco.id)
                  .map((ev) => ({ id: ev.id, url: urlEvidencia(ev), tipo: ev.tipo, nome: ev.descricao?.trim() || ev.nomeArquivo })),
              };
            }
            return (
              <PcChecklist
                titulo="Checklist"
                subtitulo={`${respondidos} de ${totalChecklist} respondidos · ${percentualChecklist}% · ${nomeParaExibir(empresaVisita)}`}
                ambientes={infosAmbientes}
                ambienteAtual={ambienteDoFoco}
                onAmbiente={(nome) => {
                  const primeiro = lista.find((item) => item.ambiente === nome && item.status === "Pendente") || lista.find((item) => item.ambiente === nome);
                  setAmbienteChecklistAtivo(nome);
                  if (primeiro) setItemFocoId(primeiro.id);
                }}
                fila={doAmbiente.map((item) => ({ id: item.id, status: item.status }))}
                itemAtualId={foco?.id || ""}
                onItem={(id) => {
                  setItemFocoId(id);
                  setUltimoItemChecklistId(id);
                }}
                onVoltar={() => setView("visita")}
                apoio={apoio}
                principal={
                  foco ? (
                    <ChecklistFocoItem
                      item={foco}
                      destaque={destaqueItemId === foco.id}
                      semCabecalhoDeAmbiente
                      mostrarApoio={false}
                      {...dadosDoAmbienteEmFoco(foco, lista)}
                      onGravidade={(gravidade) => {
                        setItemFocoId(foco.id);
                        atualizarChecklistItem(foco.id, trocaDeGravidade(foco, gravidade));
                      }}
                      posicao={posicao + 1}
                      total={lista.length}
                      podeEditar={podeEditar}
                      temAnterior={posicao > 0}
                      temProximo={posicao < lista.length - 1}
                      onStatus={(status) => {
                        setItemFocoId(foco.id);
                        atualizarChecklistItem(foco.id, { status, ...(status !== "Não Conforme" ? { observacao: "" } : {}) });
                      }}
                      onObservacao={(texto) => atualizarChecklistItem(foco.id, { observacao: texto })}
                      onFoto={() => {
                        setUltimoItemChecklistId(foco.id);
                        registrarRapido();
                      }}
                      onAnterior={() => moverItemFoco(-1)}
                      onProximo={() => moverItemFoco(1)}
                    />
                  ) : (
                    <p className="ui-row-sub">Esta visita não tem itens de checklist.</p>
                  )
                }
              />
            );
          })()
        ) : view === "checklist" && visitaAtual && modo === "equilibrado" ? (
          (() => {
            const lista = itensEmOrdem();
            const foco = itemEmFoco();
            const posicao = foco ? lista.findIndex((item) => item.id === foco.id) : -1;
            const ambienteDoFoco = foco?.ambiente || ambienteChecklistAtivo || "";
            const doAmbiente = lista.filter((item) => item.ambiente === ambienteDoFoco);
            const podeEditar = permitido("visitas.executar", visitaAtual.empresaId);
            return (
              <PcChecklist
                titulo="Checklist"
                subtitulo={`${respondidos} de ${totalChecklist} respondidos · ${percentualChecklist}%`}
                ambientes={infosAmbientes}
                ambienteAtual={ambienteDoFoco}
                onAmbiente={(nome) => {
                  const primeiro = lista.find((item) => item.ambiente === nome && item.status === "Pendente") || lista.find((item) => item.ambiente === nome);
                  setAmbienteChecklistAtivo(nome);
                  if (primeiro) setItemFocoId(primeiro.id);
                }}
                fila={doAmbiente.map((item) => ({ id: item.id, status: item.status }))}
                itemAtualId={foco?.id || ""}
                onItem={(id) => {
                  setItemFocoId(id);
                  setUltimoItemChecklistId(id);
                }}
                onVoltar={() => setView("visita")}
                principal={
                  foco ? (
                    <ChecklistFocoItem
                      item={foco}
                      destaque={destaqueItemId === foco.id}
                      semCabecalhoDeAmbiente
                      {...dadosDoAmbienteEmFoco(foco, lista)}
                      onGravidade={(gravidade) => {
                        setItemFocoId(foco.id);
                        atualizarChecklistItem(foco.id, trocaDeGravidade(foco, gravidade));
                      }}
                      posicao={posicao + 1}
                      total={lista.length}
                      podeEditar={podeEditar}
                      temAnterior={posicao > 0}
                      temProximo={posicao < lista.length - 1}
                      onStatus={(status) => {
                        setItemFocoId(foco.id);
                        atualizarChecklistItem(foco.id, { status, ...(status !== "Não Conforme" ? { observacao: "" } : {}) });
                      }}
                      onObservacao={(texto) => atualizarChecklistItem(foco.id, { observacao: texto })}
                      onFoto={() => {
                        setUltimoItemChecklistId(foco.id);
                        registrarRapido();
                      }}
                      onAnterior={() => moverItemFoco(-1)}
                      onProximo={() => moverItemFoco(1)}
                    />
                  ) : (
                    <p className="ui-row-sub">Esta visita não tem itens de checklist.</p>
                  )
                }
              />
            );
          })()
        ) : view === "checklist" && visitaAtual ? (
          <section className={`checklist-screen space-y-3${ehPC ? " ui-screen" : ""}`}>
            <div className="pc-check-head">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="pc-check-title">Checklist</h1>
                  <p className="pc-check-sub">{respondidos} de {totalChecklist} · {percentualChecklist}%</p>
                </div>
                <button
                  onClick={() => setView("visita")}
                  aria-label="Voltar à Central da visita"
                  className="pc-check-back"
                >
                  ← Central da visita
                </button>
              </div>
              <div
                className="pc-segbar pc-segbar--lg"
                role="img"
                aria-label={`${conformesChecklist} conformes, ${naoConformesChecklist} não conformes, ${naoSeAplicaChecklist} não se aplica, ${pendentesChecklist} pendentes`}
              >
                {([
                  [conformesChecklist, "var(--ok)"],
                  [naoConformesChecklist, "var(--nc)"],
                  [naoSeAplicaChecklist, "var(--na)"],
                  [pendentesChecklist, "var(--seg-pend)"],
                ] as const).map(([qtd, cor], indice) => qtd > 0 ? (
                  <span key={indice} style={{ flexGrow: qtd, background: cor }} />
                ) : null)}
              </div>
              <p className="pc-counts">
                <span><i style={{ background: "var(--ok)" }} aria-hidden="true" />{conformesChecklist} conformes</span>
                <span><i style={{ background: "var(--nc)" }} aria-hidden="true" />{naoConformesChecklist} não conformes</span>
                <span><i style={{ background: "var(--na)" }} aria-hidden="true" />{naoSeAplicaChecklist} não se aplica</span>
                <span><i style={{ background: "var(--seg-pend)" }} aria-hidden="true" />{pendentesChecklist} pendentes</span>
              </p>
              <ChecklistEnvStrip
                ambientes={infosAmbientes}
                atual={ambienteChecklistAtivo}
                onSelecionar={(nome) => setAmbienteChecklistAtivo(nome)}
                onEditar={permitido("visitas.executar", visitaAtual?.empresaId) ? () => abrirAmbientes() : undefined}
              />
              {fotoAguardando && (
                <div className="pc-photo-wait" role="status">
                  <span>Foto aguardando vínculo: toque em “Vincular foto aqui” no item correto.</span>
                  <button
                    type="button"
                    onClick={() => {
                      const arquivo = fotoAguardando;
                      setFotoAguardando(null);
                      void adicionarEvidencia(arquivo, "Foto", { ambiente: "", checklistItemId: "", ncId: "" });
                    }}
                  >
                    Salvar só na visita
                  </button>
                  <button type="button" onClick={() => setFotoAguardando(null)}>Cancelar</button>
                </div>
              )}
            </div>

            <div className="checklist-layout">
              <div className="min-w-0 space-y-2.5">
                <div id="checklist-ambiente-topo" className="pc-env-head scroll-mt-3">
                  <div className="pc-env-head-main">
                    <div className="min-w-0">
                      <h2 className="pc-env-title">{infosAmbientes.find((info) => info.nome === ambienteChecklistAtivo)?.rotulo || ambienteChecklistAtivo}</h2>
                      <p className="pc-env-sub">
                        {itensAmbienteChecklistAtivo.length - pendentesAmbienteAtivo} de {itensAmbienteChecklistAtivo.length} respondidos · {pendentesAmbienteAtivo} pendente{pendentesAmbienteAtivo === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="pc-env-step">
                      <button
                        type="button"
                        disabled={!vizinhoDoAmbiente(infosAmbientes, ambienteChecklistAtivo, -1)}
                        onClick={() => {
                          const nome = vizinhoDoAmbiente(infosAmbientes, ambienteChecklistAtivo, -1);
                          if (nome) setAmbienteChecklistAtivo(nome);
                        }}
                      >
                        ‹ Anterior
                      </button>
                      <button
                        type="button"
                        disabled={!vizinhoDoAmbiente(infosAmbientes, ambienteChecklistAtivo, 1)}
                        onClick={() => {
                          const nome = vizinhoDoAmbiente(infosAmbientes, ambienteChecklistAtivo, 1);
                          if (nome) setAmbienteChecklistAtivo(nome);
                        }}
                      >
                        Próximo ›
                      </button>
                    </div>
                  </div>
                  <div className="pc-env-actions">
                    <div className="checklist-filter-tabs pc-seg">
                      {(["Todos", "Pendentes", "Não conformes"] as FiltroChecklistRapido[]).map((filtro) => (
                        <button
                          key={filtro}
                          type="button"
                          onClick={() => setFiltroChecklistRapido(filtro)}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                            filtroChecklistRapido === filtro
                              ? "bg-[var(--brand-soft)] text-[color:var(--ink)]"
                              : "text-slate-500"
                          }`}
                        >
                          {filtro}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={irParaProximaPendencia}
                      disabled={totalChecklist === respondidos}
                      className="pc-next-pending"
                    >
                      Próxima pendência →
                    </button>
                    {itensAmbienteChecklistAtivo.some((item) => item.status !== "Pendente") && (
                      <button type="button" onClick={zerarAmbienteChecklist} className="checklist-reset-environment" title="Limpar todas as respostas deste ambiente">
                        <span aria-hidden="true">↺</span>
                        <span>Zerar ambiente</span>
                      </button>
                    )}
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
                      className={`checklist-item-card scroll-mt-28 ${
                        item.status === "Não Conforme"
                          ? "is-nonconforming"
                          : item.status === "Conforme"
                          ? "is-conforming"
                          : item.status === "Não se aplica"
                          ? "is-na"
                          : ""
                      }`}
                    >
                      <div className="checklist-item-heading">
                        <div className="min-w-0">
                          <div className="pc-item-head">
                            <span className="pc-item-badge">Item {idx + 1}</span>
                            <span className="pc-item-env">{infosAmbientes.find((info) => info.nome === item.ambiente)?.rotulo || item.ambiente}</span>
                          </div>
                          <h3 className="mt-2 text-[19px] font-medium leading-snug text-[color:var(--ink)]">
                            {item.titulo}
                          </h3>
                          {(item.criticidade || item.referencia) && (
                            <p className="pc-item-meta">
                              {[item.criticidade, item.referencia ? item.referencia.replace(" — ", " · ").replace("Capítulo", "Cap.") : ""]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                          {item.orientacao && (
                            <p className="mt-2 text-sm leading-relaxed text-[color:var(--ink-2)]">
                              {item.orientacao}
                            </p>
                          )}
                        </div>

                        <div
                          className={`checklist-status-pill pc-state-text is-${item.status === "Conforme" || (item.status === "Não Conforme" && ncDoItem?.status === "Resolvida") ? "ok" : item.status === "Não Conforme" ? "nc" : item.status === "Não se aplica" ? "na" : "pend"}`}
                        >
                          {item.status === "Não Conforme" && ncDoItem
                            ? `Não Conforme • ${ncDoItem.status}`
                            : item.status}
                        </div>
                      </div>

                      {fotoAguardando && (
                        <button
                          type="button"
                          className="pc-link-photo"
                          onClick={() => vincularFotoAguardandoAoItem(item, ncDoItem?.id || "")}
                        >
                          Vincular foto aqui
                        </button>
                      )}
                      <div className="checklist-answer-grid">
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
                                  rolarParaProximaPendenciaDoAmbiente(item.id);
                                }
                              }}
                              className={`checklist-answer ${item.status === status ? "is-selected " : ""}${
                                item.status === status
                                  ? status === "Conforme"
                                    ? "is-yes"
                                    : status === "Não Conforme"
                                    ? "is-no"
                                    : "is-na"
                                  : ""
                              }`}
                            >
                              <span aria-hidden="true" className="checklist-answer-icon">{status === "Conforme" ? "✓" : status === "Não Conforme" ? "×" : "–"}</span>
                              <span>{status}</span>
                            </button>
                          )
                        )}
                      </div>
                      {item.status !== "Pendente" && (
                        <div className="checklist-clear-row">
                          <button
                            type="button"
                            onClick={() => limparRespostaChecklist(item.id)}
                            className="checklist-clear-answer"
                          >
                            <span aria-hidden="true">↺</span>
                            Limpar resposta
                          </button>
                        </div>
                      )}

                      {item.status === "Não Conforme" ? (
                        <div className="pc-nc-panel">
                          <label className="block">
                            <span className="pc-nc-label">O que foi encontrado</span>
                            <div className="mbp-voice-wrap">
                              <textarea
                                rows={3}
                                className={`w-full rounded-xl border p-3 ${item.observacao.trim() ? "" : "pc-needs"}`}
                                placeholder="Descreva a não conformidade observada..."
                                aria-invalid={!item.observacao.trim()}
                                value={item.observacao}
                                onChange={(e) =>
                                  atualizarChecklistItem(item.id, {
                                    observacao: e.target.value,
                                  })
                                }
                              />
                              <VoiceDictationButton
                                ativo={campoVozAtivo === `checklist-nc-${item.id}`}
                                melhorando={campoIaAtivo === `checklist-nc-${item.id}`}
                                onIniciar={() => iniciarDitado(`checklist-nc-${item.id}`, (texto) => atualizarChecklistItem(item.id, { observacao: juntarTextoDitado(item.observacao, texto) }))}
                                onMelhorar={() => melhorarTextoComIa(`checklist-nc-${item.id}`, item.observacao, (texto) => atualizarChecklistItem(item.id, { observacao: texto }), "Descrição objetiva de uma não conformidade observada durante checklist de Boas Práticas.")}
                              />
                            </div>
                          </label>
                          {!item.observacao.trim() && (
                            <p className="pc-warn" role="alert">
                              Falta descrever. Escreva ou grave um áudio antes de seguir.
                            </p>
                          )}
                          <div className="pc-nc-actions">
                            {permitido("evidencias.adicionar", visitaAtual.empresaId) && (
                              <>
                                <button type="button" className="pc-btn-info" onClick={() => abrirEvidenciasDoItem(item, ncDoItem?.id)}>
                                  Adicionar foto
                                </button>
                                <button type="button" className="pc-btn-info" onClick={() => abrirEvidenciasDoItem(item, ncDoItem?.id)}>
                                  Gravar áudio
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              className="pc-btn-amber"
                              disabled={!ncDoItem || !permitido("ncs.acompanhar", visitaAtual.empresaId)}
                              title={ncDoItem ? "Abrir o plano de ação desta não conformidade" : "A não conformidade é criada ao registrar o achado"}
                              onClick={() => {
                                if (!ncDoItem) return;
                                setPlanoNcAbertaId(ncDoItem.id);
                                setView("plano");
                              }}
                            >
                              Criar ação corretiva
                            </button>
                          </div>
                          {item.observacao.trim() && (
                            <button
                              type="button"
                              onClick={() => rolarParaProximoItem(item.id)}
                              className="mt-3 w-full rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-medium text-white"
                            >
                              Próximo item →
                            </button>
                          )}
                        </div>
                      ) : (
                        <details className="checklist-note mt-2.5">
                          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-slate-500">
                            + Observação opcional
                          </summary>
                          <div className="px-3 pb-3">
                            <div className="mbp-voice-wrap">
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
                              <VoiceDictationButton
                                ativo={campoVozAtivo === `checklist-obs-${item.id}`}
                                melhorando={campoIaAtivo === `checklist-obs-${item.id}`}
                                onIniciar={() => iniciarDitado(`checklist-obs-${item.id}`, (texto) => atualizarChecklistItem(item.id, { observacao: juntarTextoDitado(item.observacao, texto) }))}
                                onMelhorar={() => melhorarTextoComIa(`checklist-obs-${item.id}`, item.observacao, (texto) => atualizarChecklistItem(item.id, { observacao: texto }), "Observação técnica de checklist de Boas Práticas.")}
                              />
                            </div>
                          </div>
                        </details>
                      )}

                      {item.status === "Não Conforme" && (
                        ncDoItem ? (
                          <div
                            className={`mt-3 rounded-xl p-3 text-sm ${
                              ncDoItem.status === "Resolvida"
                                ? "bg-[var(--ok-bg)] text-[color:var(--ink)]"
                                : "bg-[var(--pend-bg)] text-[color:var(--ink)]"
                            }`}
                          >
                            {ncDoItem.status === "Resolvida"
                              ? "Não conformidade registrada e resolvida. O achado original permanece no checklist para rastreabilidade."
                              : `Não conformidade já registrada e em acompanhamento — status: ${ncDoItem.status}.`}
                          </div>
                        ) : (
                          <div className="mt-3 rounded-xl bg-[var(--nc-bg)] p-3 text-sm text-[color:var(--ink)]">
                            Este item gerará uma Não Conformidade para acompanhamento.
                          </div>
                        )
                      )}
                    </article>
                    );
                  })}

                {ambienteChecklistAtivo !== AMBIENTE_PROGRAMAS_CONTROLE && (
                  <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                    <details className="checklist-equipment-card">
                      <summary className="checklist-equipment-summary">
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#315da8]">Quadro do ambiente</div>
                          <h3 className="mt-0.5 text-base font-medium text-[color:var(--ink)] sm:text-lg">Equipamentos e móveis</h3>
                          <p className="mt-0.5 text-xs text-slate-500">{equipamentosAmbienteAtivo.length} {equipamentosAmbienteAtivo.length === 1 ? "item cadastrado" : "itens cadastrados"}</p>
                        </div>
                        <span className="checklist-equipment-toggle" aria-hidden="true">⌄</span>
                      </summary>

                      <div className="checklist-equipment-content">

                    {equipamentosAmbienteAtivo.length === 0 ? (
                      <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
                        Nenhum equipamento ou móvel cadastrado para este ambiente. Você pode incluir o item encontrado abaixo.
                      </div>
                    ) : (
                      <div className="mt-3 overflow-hidden rounded-xl border-2 border-blue-200 bg-[var(--brand-soft)]/70">
                        <div className="flex items-center justify-between gap-3 bg-[var(--brand-soft)]/80 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-wide text-[color:var(--brand)]">
                          <span>Equipamento ou móvel</span>
                          <span>Qtd.</span>
                        </div>
                        {equipamentosAmbienteAtivo.map((equipamento, indice) => (
                          <div
                            key={equipamento.id}
                            className={`equipment-visit-row px-3 py-2 ${
                              indice > 0 ? "border-t border-blue-200" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
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

                            <details className="equipment-visit-note">
                              <summary>+ Observação do equipamento</summary>
                              <textarea
                                rows={2}
                                value={equipamento.observacao || ""}
                                onChange={(event) => atualizarObservacaoEquipamento(equipamento.id, event.target.value)}
                                placeholder="Ex.: borracha danificada, excesso de gelo, manutenção necessária..."
                                className="mt-2 min-w-0 w-full rounded-lg border border-blue-100 bg-white p-2 text-sm"
                              />
                              <FieldVoiceTools
                                fieldKey={`visita-equipamento-${equipamento.id}`}
                                value={equipamento.observacao || ""}
                                onChange={(texto) => atualizarObservacaoEquipamento(equipamento.id, texto)}
                                contexto={`Observação técnica sobre o equipamento "${equipamento.nome}" no ambiente "${ambienteChecklistAtivo}". Preserve os fatos e deixe o texto claro e objetivo.`}
                              />
                            </details>
                          </div>
                        ))}
                      </div>
                    )}

                    <details className="mt-3 rounded-xl bg-slate-50 p-3">
                      <summary className="cursor-pointer select-none text-xs font-extrabold text-[color:var(--brand)]">
                        + Adicionar equipamento ou móvel
                      </summary>
                      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_100px_auto]">
                        <div className="min-w-0">
                          <input
                            value={novoEquipamentoVisitaNome}
                            onChange={(event) => setNovoEquipamentoVisitaNome(event.target.value)}
                            placeholder="Ex.: Refrigerador, bancada, armário"
                            className="min-w-0 w-full rounded-xl border bg-white p-3 text-sm"
                          />
                          <FieldVoiceTools
                            fieldKey="visita-novo-equipamento"
                            value={novoEquipamentoVisitaNome}
                            onChange={setNovoEquipamentoVisitaNome}
                            contexto="Nome curto de um equipamento ou móvel encontrado durante uma visita técnica."
                            somenteVoz
                          />
                        </div>
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
                          className="rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-medium text-white"
                        >
                          Adicionar
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        O item ficará cadastrado neste ambiente e aparecerá nas próximas visitas.
                      </p>
                    </details>

                      </div>
                    </details>

                    <button
                      type="button"
                      onClick={avancarParaProximoAmbiente}
                      className="pc-hide-pc mt-3 w-full rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white"
                    >
                      {pendentesAmbienteAtivo > 0
                        ? `Avançar com ${pendentesAmbienteAtivo} ${pendentesAmbienteAtivo === 1 ? "pendência" : "pendências"} →`
                        : "Concluir ambiente e avançar →"}
                    </button>
                  </article>
                )}

                <div className="rounded-2xl bg-[var(--brand-soft)] p-4 text-sm text-[color:var(--ink)]">
                  As respostas são salvas automaticamente. Itens marcados como
                  <b> Não Conforme</b> geram uma Não Conformidade vinculada ao critério,
                  preservando plano, evidências e histórico para rastreabilidade.
                </div>
              </div>
            </div>
            {ehPC && (
              <div className="ui-footer">
                <span className="ui-row-sub">As respostas são salvas automaticamente.</span>
                <button type="button" className="ui-btn ui-btn--primary" onClick={avancarParaProximoAmbiente}>
                  {pendentesAmbienteAtivo > 0
                    ? `Avançar com ${pendentesAmbienteAtivo} ${pendentesAmbienteAtivo === 1 ? "pendência" : "pendências"} →`
                    : "Concluir ambiente e avançar →"}
                </button>
              </div>
            )}
          </section>
        ) : view === "visita" && visitaAtual ? (
          <PcCentral
            passos={([
              { chave: "checklist", rotulo: "Checklist", resumo: `${respondidos} de ${totalChecklist} respondidos`, icone: "checklist", tom: "ok" },
              { chave: "evidencias", rotulo: "Evidências", resumo: `${fotosVisita} ${fotosVisita === 1 ? "foto" : "fotos"} · ${audiosVisita} ${audiosVisita === 1 ? "áudio" : "áudios"}`, icone: "evidencias", tom: "info" },
              { chave: "correcoes", rotulo: "Correções", resumo: `${ncsAbertas} em aberto`, icone: "ncs", tom: "nc" },
              { chave: "pops", rotulo: "POPs da visita", resumo: `${resumoPopsVisita.pendentes} a criar ou em rascunho`, icone: "pops", tom: "pend" },
              { chave: "relatorio", rotulo: "Relatório", resumo: `${linhasConferenciaRel.filter((linha) => !linha.ok).length} pendências`, icone: "relatorio", tom: "lilas" },
            ] as PassoCentral[]).filter((passo) => telaVisivel(passo.chave === "pops" ? "popsVisita" : (passo.chave as TelaKey)))}
            onIrPasso={(chave) => irParaPasso(chave as PassoVisita)}
            empresa={nomeParaExibir(empresaVisita)}
            detalhe={`${fdata(visitaAtual.data)} · ${visitaAtual.responsavel || "Responsável não informado"}`}
            proxima={{
              titulo: proximoAmbienteVisita || ((visitaAtual.ambientes || []).length ? "Revisar a inspeção" : "Definir os ambientes da visita"),
              respondidos,
              total: totalChecklist,
              percentual: percentualChecklist,
              conformes: conformesChecklist,
              naoConformes: naoConformesChecklist,
              naoSeAplica: naoSeAplicaChecklist,
              pendentes: pendentesChecklist,
              botao: (visitaAtual.ambientes || []).length ? "Continuar inspeção →" : "Selecionar ambientes →",
              desabilitado: !(permitido("visitas.executar", visitaAtual.empresaId) || (!!usuarioDaSessao && telaVisivel("checklist"))),
              onContinuar: () => ((visitaAtual.ambientes || []).length ? abrirChecklist() : abrirAmbientes()),
            }}
            indicadores={{
              conformes: conformesVisita,
              naoConformidades: ncsVisita.length,
              evidencias: evidenciasVisita.length,
              pendencias: pendentesVisita,
            }}
            equipamentos={{
              texto: `${equipamentosDaVisita.length} tipos · ${totalUnidadesEquipamentos} unidades`,
              desabilitado: (visitaAtual.ambientes || []).length === 0,
              onAbrir: () => abrirChecklistNoAmbiente(equipamentosDaVisita[0]?.setor || (visitaAtual.ambientes || [])[0]),
            }}
            programas={
              programasChecklistAtivos.length > 0
                ? {
                    texto: `${respondidosProgramasCentral} de ${itensProgramasCentral.length} · ${statusProgramasCentral}`,
                    onAbrir: () => abrirChecklistNoAmbiente(AMBIENTE_PROGRAMAS_CONTROLE),
                  }
                : null
            }
            atividade={{
              texto: `${respondidos} itens respondidos · ${ncsVisita.length} não conformidades`,
              onAcompanhar: permitido("ncs.acompanhar", visitaAtual.empresaId) ? () => setView("acompanhamento") : null,
            }}
            ncsAbertas={
              permitido("ncs.acompanhar", visitaAtual.empresaId)
                ? [...ncsVisita]
                    .filter((nc) => nc.status !== "Resolvida")
                    .sort((a, b) => String(a.criadoEm).localeCompare(String(b.criadoEm)))
                    .slice(0, 4)
                    .map((nc) => ({
                      id: nc.id,
                      titulo: nc.titulo,
                      detalhe: `${nomeDeExibicaoDoAmbiente(nc.ambiente)} · ${nc.categoria}`,
                      status: nc.status,
                      onAbrir: () => { setPlanoNcAbertaId(nc.id); setView("plano"); },
                    }))
                : null
            }
            onVerNcs={() => setView("ncs")}
            onEditarAmbientes={permitido("visitas.executar", visitaAtual.empresaId) ? () => abrirAmbientes() : null}
            onTodasVisitas={() => navegarPrincipal("visitas")}
          />
        ) : view === "relatorio" && visitaAtual ? (
          <>
            {telaEmLista && (
              <PcRelatorio
                empresa={nomeParaExibir(empresaVisita)}
                data={fdata(visitaAtual.data)}
                linhas={linhasConferenciaRel}
                secoes={secoesRelatorio}
                onSecao={(chave, valor) => setSecoesRelatorio((atual) => ({ ...atual, [chave]: valor }))}
                podeGerar={permitido("relatorios.exportar", visitaAtual.empresaId)}
                podeOficial={permitido("relatorios.aprovar", visitaAtual.empresaId)}
                concluida={visitaAtual.status === "Concluída"}
                podeConcluir={permitido("visitas.concluir", visitaAtual.empresaId)}
                onIr={(destino) => {
                  if (destino === "checklist") abrirChecklist();
                  else if (destino === "correcoes") setView("correcoes");
                  else if (destino === "evidencias") abrirEvidencias();
                  else if (destino === "pops") setView("popsvisita");
                  else abrirSecaoEmpresaPeloMenu("dados");
                }}
                onSelecionavel={(tipo) => void gerarPdfSelecionavel(tipo)}
                onFinalizar={finalizarInspecao}
                onReabrir={reabrirInspecao}
                onVoltar={() => setView("visita")}
              />
            )}
          <section id="relatorio-visita" data-empresa={nomeParaExibir(empresaVisita)} data-data-visita={visitaAtual.data} data-visita-id={visitaAtual.id} className={`report-print space-y-4${telaEmLista ? ` rep-offscreen ${classesSecoesRelatorio}` : ""}`}>
            {emissaoParcial && <div className="print-only report-partial">RELATÓRIO PARCIAL</div>}
            {rodapeImpressao?.fixo && (
              <div className="print-only rep-rodape-fixo">
                <span>{rodapeImpressao.empresa}</span>
                <span>{rodapeImpressao.selo}</span>
              </div>
            )}
            <div className="print-only report-document-header">
              <div>
                <div className="report-brand">{BRAND.name}</div>
                <div className="report-subtitle">Relatório Técnico de Inspeção em Segurança dos Alimentos</div>
              </div>
              <div className="report-date">{fdata(visitaAtual.data)}</div>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[color:var(--brand)]">
                    {rotuloDoRelatorio(visitaAtual.status)}
                  </div>
                  <h1 className="mt-1 text-2xl font-extrabold">
                    Relatório da visita
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Revisão consolidada dos registros realizados em campo.
                  </p>
                  <div className="mt-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${visitaAtual.status === "Concluída" ? "bg-[var(--ok-bg)] text-[color:var(--ink)]" : "bg-[var(--pend-bg)] text-[color:var(--ink)]"}`}>
                      {visitaAtual.status === "Concluída" ? "● Inspeção concluída" : "● Inspeção em andamento"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setView("visita")}
                  className="print-control rounded-xl bg-[var(--na-bg)] px-3 py-2 text-sm font-bold text-[color:var(--ink)]"
                >
                  Voltar à Central
                </button>
              </div>

              <div className="print-control mt-5">
                {visitaAtual.status === "Concluída" ? (
                  <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-[var(--ok-bg)] p-4 md:flex-row md:items-center md:justify-between">
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
                  <button type="button" onClick={finalizarInspecao} className="w-full rounded-xl bg-[var(--brand)] px-5 py-4 text-base font-extrabold text-white shadow-md">
                    ✓ Finalizar inspeção
                  </button>
                ) : null}
              </div>


              {pendentesVisita > 0 && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-[var(--pend-bg)] p-4 text-sm text-[color:var(--ink)]">
                  <strong>Atenção:</strong> ainda existem {pendentesVisita} item(ns)
                  pendente(s) no checklist. O relatório pode ser revisado, mas a
                  inspeção ainda não está totalmente preenchida.
                </div>
              )}
            </div>

            <div data-rep="resumo" className="grid gap-3 md:grid-cols-4">
              <MetricCard label="Progresso do checklist" value={`${percentualChecklist}%`} />
              <MetricCard label="Conformidade dos itens avaliados" value={`${percentualConformidade}%`} />
              <MetricCard label="Não conformidades registradas" value={ncsVisita.length} />
              <MetricCard label="Evidências" value={evidenciasVisita.length} />
            </div>

            <article data-rep="resumo" className="print-card rounded-2xl bg-white p-5 shadow-sm">
              <div className="text-xs font-extrabold uppercase text-[color:var(--brand)]">
                Resumo executivo
              </div>
              <h2 className="mt-1 text-xl font-extrabold">Panorama da inspeção</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Foram avaliados <strong>{itensAvaliadosVisita} item(ns)</strong>, com{" "}
                <strong>{conformesVisita} conforme(s)</strong> e{" "}
                <strong>{naoConformesVisita} item(ns) não conforme(s) no checklist</strong>, resultando em{" "}
                <strong>{percentualConformidade}% de conformidade</strong> entre os itens avaliados.
                {pendentesVisita > 0
                  ? ` Permanecem ${pendentesVisita} item(ns) pendente(s) de avaliação.`
                  : " Não há itens pendentes no checklist."}
              </p>
              {(() => {
                const conciliacao = conciliarNcs(checklistAtual, ncsVisita);
                return conciliacao.diverge ? (
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    Observação: o checklist tem {conciliacao.itensNaoConformes} item(ns) não conforme(s) e há {conciliacao.ncsRegistradas} não conformidade(s) registrada(s)
                    {conciliacao.ncsSemItem.length > 0 ? `, das quais ${conciliacao.ncsSemItem.length} sem item não conforme correspondente no checklist atual` : ""}.
                  </p>
                ) : null;
              })()}

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-xl bg-[var(--nc-bg)] p-4">
                  <div className="text-xs font-extrabold uppercase text-red-700">NCs críticas</div>
                  <div className="mt-1 text-2xl font-extrabold text-red-950">{ncsCriticasVisita}</div>
                </div>
                <div className="rounded-xl bg-[var(--pend-bg)] p-4">
                  <div className="text-xs font-extrabold uppercase text-amber-700">NCs importantes</div>
                  <div className="mt-1 text-2xl font-extrabold text-amber-950">{ncsImportantesVisita}</div>
                </div>
                <div className="rounded-xl bg-[var(--info-bg)] p-4">
                  <div className="text-xs font-extrabold uppercase text-sky-700">NCs leves</div>
                  <div className="mt-1 text-2xl font-extrabold text-sky-950">{ncsLevesVisita}</div>
                </div>
                <div className="rounded-xl bg-[var(--brand-soft)] p-4">
                  <div className="text-xs font-extrabold uppercase text-blue-700">Ações definidas</div>
                  <div className="mt-1 text-2xl font-extrabold text-blue-950">{acoesDefinidas}/{ncsVisita.length}</div>
                </div>
                <div className="rounded-xl bg-slate-100 p-4">
                  <div className="text-xs font-extrabold uppercase text-slate-600">Ações vencidas</div>
                  <div className="mt-1 text-2xl font-extrabold text-slate-950">{ncsVencidasRelatorio}</div>
                </div>
              </div>

              {!relatorioProntoParaEncerrar && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-[var(--pend-bg)] p-4 text-sm text-[color:var(--ink)]">
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

            <div className="print-block grid gap-4 lg:grid-cols-3">
              <article className="rounded-2xl bg-white p-5 shadow-sm lg:col-span-2">
                <div className="text-xs font-extrabold uppercase text-slate-400">
                  Identificação
                </div>
                <h2 className="mt-1 text-xl font-extrabold">
                  {nomeSemNumerosNoInicio(empresaVisita?.nomeFantasia || empresaVisita?.razaoSocial || "Empresa")}
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
                    {visitaAtual.responsavelIdentificacao &&
                      visitaAtual.responsavelIdentificacao.trim().toLocaleLowerCase("pt-BR") !== (visitaAtual.responsavel || "").trim().toLocaleLowerCase("pt-BR") && (
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

              <article className="print-block rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-xs font-extrabold uppercase text-slate-400">
                  Escopo
                </div>
                <h2 className="mt-1 text-xl font-extrabold">Ambientes avaliados</h2>
                <div className="rep-chips mt-4 flex flex-wrap gap-2">
                  {(visitaAtual.ambientes || []).length > 0 ? (
                    (visitaAtual.ambientes || []).map((ambiente) => (
                      <span
                        key={ambiente}
                        className="rep-chip rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs text-[color:var(--ink)]"
                      >
                        {nomeDeExibicaoDoAmbiente(ambiente)}
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

            <article data-rep="ambientes" className="print-block rounded-2xl bg-white p-5 shadow-sm">
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
                <div className="rounded-xl bg-[var(--ok-bg)] p-4">
                  <div className="text-xs font-extrabold uppercase text-emerald-700">
                    Conforme
                  </div>
                  <div className="mt-1 text-2xl font-extrabold">
                    {conformesVisita}
                  </div>
                </div>
                <div className="rounded-xl bg-[var(--nc-bg)] p-4">
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
                <div className="rounded-xl bg-[var(--pend-bg)] p-4">
                  <div className="text-xs font-extrabold uppercase text-amber-700">
                    Pendente
                  </div>
                  <div className="mt-1 text-2xl font-extrabold">
                    {pendentesVisita}
                  </div>
                </div>
              </div>
            </article>

            <article data-rep="pops" className="print-block rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase text-[color:var(--brand)]">
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
                        <div key={pop.id} className="rounded-lg bg-[var(--brand-soft)] p-3 text-sm">
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
                  <div className="text-xs font-extrabold uppercase text-[color:var(--brand)]">
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
                    <thead className="bg-[var(--na-bg)] text-xs uppercase text-[color:var(--ink)]">
                      <tr>
                        <th className="p-3">Ambiente</th>
                        <th className="p-3">Equipamento ou móvel</th>
                        <th className="p-3">Quantidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipamentosRelatorio.map((equipamento) => (
                        <tr key={equipamento.id} className="border-t border-slate-200 align-top">
                          <td className="p-3 font-bold">{nomeDeExibicaoDoAmbiente(equipamento.ambiente)}</td>
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
                <span className="rounded-full bg-[var(--nc-bg)] px-3 py-1 text-xs font-extrabold text-[color:var(--ink)]">
                  {ncsVisita.length}
                </span>
              </div>

              {ncsVisita.length === 0 ? (
                <div className="mt-4 rounded-xl bg-[var(--ok-bg)] p-4 text-sm text-[color:var(--ink)]">
                  Nenhuma não conformidade registrada nesta visita.
                </div>
              ) : (
                <div className="rep-nc-grid mt-4 space-y-3">
                  {ncsVisita.map((nc, idx) => (
                    <div
                      key={nc.id}
                      className="print-card rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="text-xs font-extrabold uppercase text-slate-400">
                            NC {String(idx + 1).padStart(2, "0")} • {nomeDeExibicaoDoAmbiente(nc.ambiente)}
                          </div>
                          <div className="mt-1 font-extrabold">{nc.titulo}</div>
                        </div>
                        <span
                          className={`w-fit rounded-full px-3 py-1 text-xs font-extrabold ${
                            nc.status === "Resolvida"
                              ? "bg-[var(--ok-bg)] text-[color:var(--ink)]"
                              : nc.status === "Em tratamento"
                                ? "bg-[var(--pend-bg)] text-[color:var(--ink)]"
                                : "bg-[var(--nc-bg)] text-[color:var(--ink)]"
                          }`}
                        >
                          {nc.status}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                          nc.criticidade === "Crítica"
                            ? "bg-[var(--nc-bg)] text-[color:var(--ink)]"
                            : nc.criticidade === "Importante"
                              ? "bg-[var(--pend-bg)] text-[color:var(--ink)]"
                              : "bg-[var(--na-bg)] text-[color:var(--ink)]"
                        }`}>
                          {nc.criticidade}
                        </span>
                        {nc.referencia && (
                          <span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[11px] font-bold text-[color:var(--ink)]">
                            {nc.referencia}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 rounded-lg bg-[var(--nc-bg)] p-3 text-sm">
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
                <div className="rep-ev-grid mt-4 grid gap-4 md:grid-cols-2">
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
                          {ev.tipo} • {nomeDeExibicaoDoAmbiente(ev.ambiente) || "Sem ambiente"}
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
                          <div className="mt-3 rounded-lg border border-emerald-200 bg-[var(--ok-bg)] p-3 text-xs text-emerald-950">
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
              <div className={`mt-3 rounded-xl border p-3 text-sm font-extrabold ${visitaAtual.status === "Concluída" ? "border-emerald-200 bg-[var(--ok-bg)] text-[color:var(--ink)]" : "border-amber-200 bg-[var(--pend-bg)] text-[color:var(--ink)]"}`}>
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

                <div className="rounded-xl bg-[var(--nc-bg)] p-4">
                  <div className="text-xs font-extrabold uppercase text-red-700">
                    Abertas
                  </div>
                  <div className="mt-1 text-xl font-extrabold">
                    {ncsSomenteAbertas}
                  </div>
                </div>

                <div className="rounded-xl bg-[var(--pend-bg)] p-4">
                  <div className="text-xs font-extrabold uppercase text-amber-700">
                    Em tratamento
                  </div>
                  <div className="mt-1 text-xl font-extrabold">
                    {ncsEmTratamento}
                  </div>
                </div>

                <div className="rounded-xl bg-[var(--ok-bg)] p-4">
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
                  <div className="mbp-voice-wrap">
                    <textarea
                      value={visitaAtual.conclusao || ""}
                      onChange={(e) =>
                        atualizarConclusaoRelatorio(e.target.value)
                      }
                      placeholder="Registre aqui a conclusão técnica, orientações gerais, pontos prioritários ou observações finais da visita."
                      className="min-h-32 w-full rounded-xl border border-slate-300 bg-white p-4 text-sm outline-none focus:border-[var(--brand)]"
                    />
                    <VoiceDictationButton
                      ativo={campoVozAtivo === `relatorio-${visitaAtual.id}`}
                      melhorando={campoIaAtivo === `relatorio-${visitaAtual.id}`}
                      onIniciar={() => iniciarDitado(`relatorio-${visitaAtual.id}`, (texto) => atualizarConclusaoRelatorio(juntarTextoDitado(visitaAtual.conclusao || "", texto)))}
                      onMelhorar={() => melhorarTextoComIa(`relatorio-${visitaAtual.id}`, visitaAtual.conclusao || "", atualizarConclusaoRelatorio, "Conclusão técnica de uma visita de Boas Práticas. Mantenha linguagem profissional, clara e objetiva.")}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="block text-xs text-slate-500">
                      O conteúdo é salvo junto da visita e incluído no PDF.
                    </span>
                    <button
                      type="button"
                      onClick={() => atualizarConclusaoRelatorio(gerarConclusaoAutomatica())}
                      className="rounded-lg bg-[var(--brand-soft)] px-3 py-2 text-xs font-extrabold text-[color:var(--ink)]"
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
                  <div><strong>Empresa:</strong> {empresaVisita?.cnpj || "CNPJ não informado"} — {nomeSemNumerosNoInicio(empresaVisita?.nomeFantasia || empresaVisita?.razaoSocial || "Empresa")}</div>
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

            <div className="rounded-2xl border border-blue-200 bg-[var(--brand-soft)] p-5 no-print">
              <div className="text-sm font-extrabold text-blue-900">
                Relatório pronto para revisão
              </div>
              <p className="mt-1 text-sm text-blue-800">
                Use “Baixar relatório em PDF” no topo para gerar o arquivo diretamente.
                Itens pendentes permanecem sinalizados para evitar interpretar uma inspeção parcial como concluída.
              </p>
            </div>
          </section>
          </>
        ) : view === "modotela" ? (
          <PcModoTela
            preferencia={telaModo.preferencia}
            modoEmUso={modo}
            modoRecomendado={telaModo.modoRecomendado}
            larguraDoAparelho={telaModo.larguraDoAparelho}
            onSalvar={(preferencia) => { telaModo.salvar(preferencia); setView("inicio"); }}
            onCancelar={() => setView("ajuda")}
          />
        ) : view === "ajuda" ? (
          <PcAjuda
            onVoltar={() => setView("inicio")}
            onModoDeTela={() => setView("modotela")}
            guiasLiberados={{ guiaRapido: telaVisivel("guiaRapido"), manualCompleto: telaVisivel("manualCompleto") }}
          />
        ) : view === "inicio" ? (
          ehPC ? (
            <PcInicio
              simples={nivelDe("inicio") === "simples"}
              nome={usuarioDaSessao?.nome.split(" ").filter(Boolean)[0] || "bem-vindo"}
              continuar={inicioPc.continuar}
              novaVisita={{
                texto: atual
                  ? `A próxima visita será criada para ${nomeEmFormatoNatural(atual.nomeFantasia)}.`
                  : "Selecione uma empresa para começar.",
                botao: atual ? "Nova visita" : "Selecionar empresa →",
                onClick: atual ? novaVisita : () => setView("empresas"),
              }}
              indicadores={{
                emAndamento: visitas.filter((visita) => visita.status === "Em andamento").length,
                ncAcompanhamento: inicioPc.ncAcompanhamento,
                concluidasMes: visitasDoMes.filter((visita) => visita.status === "Concluída").length,
                empresasAtivas: empresasVisiveis.length,
              }}
              preparacao={
                atual && inicioPc.preparacaoAtual
                  ? {
                      percentual: inicioPc.preparacaoAtual.percentual,
                      texto: inicioPc.preparacaoAtual.completo
                        ? "Cadastro completo"
                        : `${inicioPc.preparacaoAtual.preenchidos} de ${inicioPc.preparacaoAtual.total} itens preenchidos`,
                      onAbrir: () => editarEmpresa(atual),
                    }
                  : null
              }
              pendencias={{
                texto: ncsEmpresaAbertas ? `${ncsEmpresaAbertas} não conformidade(s) em acompanhamento nesta empresa` : "Nenhuma não conformidade aberta nesta empresa",
                onVer: permitido("ncs.acompanhar", atual?.id) ? () => irParaMenu("ncs") : null,
              }}
              filtro={filtroInicio}
              onFiltro={setFiltroInicio}
              contagemEmAndamento={visitas.filter((visita) => visita.status === "Em andamento").length}
              contagemConcluidas={visitas.filter((visita) => visita.status === "Concluída").length}
              recentes={inicioPc.recentes(filtroInicio)}
              onAbrirVisita={(id) => { setVisitaAtualId(id); setView("visita"); }}
              onVerTodas={() => setView("visitas")}
            />
          ) : (
          <div className="space-y-4">
            <section className="grid gap-3 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-4">
              <div className="pc-hero flex flex-col overflow-hidden rounded-2xl bg-[var(--brand)] p-4 text-white shadow-[0_16px_40px_rgba(6,27,79,0.16)] lg:min-h-[320px] lg:rounded-[28px] lg:p-7 lg:shadow-[0_22px_60px_rgba(6,27,79,0.20)]">
                <div className="hidden lg:block">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-blue-200">Visão geral</div>
                  <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                    Olá, {usuarioDaSessao?.nome.split(" ").filter(Boolean)[0] || "bem-vindo"}
                  </h1>
                  <p className="mt-2 text-sm text-blue-100">Acompanhe sua operação e continue de onde parou.</p>
                </div>

                <div className="flex-1 lg:mt-6 lg:rounded-2xl lg:border lg:border-white/15 lg:bg-white/[0.09] lg:p-5 lg:backdrop-blur-sm">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-cyan-200">O que fazer agora</div>
                  {visitaEmAndamentoDestaque ? (
                    <div className="mt-2">
                      <div className="text-xs font-bold text-blue-100">Visita em andamento</div>
                      <div className="mt-1 text-lg font-extrabold lg:text-xl">{nomeSemNumerosNoInicio(db.empresas[visitaEmAndamentoDestaque.empresaId]?.nomeFantasia || "Empresa")}</div>
                      <div className="mt-1 text-xs text-blue-100">{progressoVisitaDestaque}% concluída • {fdata(visitaEmAndamentoDestaque.data)}</div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15 lg:mt-4"><div className="h-full rounded-full bg-cyan-300" style={{ width: `${progressoVisitaDestaque}%` }} /></div>
                      <button type="button" onClick={() => { setDb((estado) => ({ ...estado, empresaAtualId: visitaEmAndamentoDestaque.empresaId })); setVisitaAtualId(visitaEmAndamentoDestaque.id); setView("visita"); }} className="mt-3 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-[#0b2d72] shadow-lg transition hover:bg-[var(--brand-soft)] lg:mt-4 lg:py-3">Continuar visita →</button>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <div className="text-lg font-extrabold">Nenhuma visita em andamento</div>
                      <p className="mt-1 text-xs text-blue-100">{atual ? `A próxima visita será criada para ${nomeSemNumerosNoInicio(atual.nomeFantasia)}.` : "Selecione uma empresa para começar."}</p>
                      <button type="button" onClick={atual ? novaVisita : () => setView("empresas")} className="mt-3 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-[#0b2d72] lg:mt-4 lg:py-3">{atual ? "Iniciar nova visita →" : "Selecionar empresa →"}</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative min-h-[145px] overflow-hidden rounded-2xl bg-[#061b4f] bg-[url('/images/cozinha-inspecao.webp')] bg-cover bg-center shadow-sm lg:min-h-[320px] lg:rounded-[28px]">
                <div className="absolute inset-0 bg-gradient-to-t from-[#061b4f]/80 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white lg:p-6">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-cyan-200">{BRAND.name}</div>
                  <div className="mt-1 max-w-md text-sm font-extrabold leading-snug lg:text-lg">Inspeções mais claras, rápidas e organizadas.</div>
                </div>
              </div>
            </section>

            {atual && (
              <section className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => editarEmpresa(atual)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md">
                  <div className="flex items-center justify-between gap-3"><div><div className="text-[10px] font-extrabold uppercase tracking-wide text-[color:var(--brand)]">Preparação da empresa</div><div className="mt-1 font-extrabold text-[color:var(--ink)]">{configuracaoEmpresaAtual.prontaParaVisita ? "Dados essenciais prontos" : `Próximo: ${configuracaoEmpresaAtual.proximaEtapa?.titulo || "completar cadastro"}`}</div></div><span className="rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-extrabold text-[color:var(--ink)]">{configuracaoEmpresaAtual.percentual}%</span></div>
                </button>
                <button type="button" onClick={() => setView("visitas")} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md">
                  <div className="flex items-center justify-between gap-3"><div><div className="text-[10px] font-extrabold uppercase tracking-wide text-[color:var(--brand)]">Pendências técnicas</div><div className="mt-1 font-extrabold text-[color:var(--ink)]">{ncsEmpresaAbertas ? "Não conformidades em acompanhamento" : "Nenhuma não conformidade aberta"}</div></div><span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${ncsEmpresaAbertas ? "bg-[var(--nc-bg)] text-[color:var(--ink)]" : "bg-[var(--ok-bg)] text-[color:var(--ink)]"}`}>{ncsEmpresaAbertas}</span></div>
                </button>
              </section>
            )}

            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { valor: visitasDoMes.length, rotulo: "Visitas este mês", cor: "bg-[var(--brand-soft)] text-[color:var(--brand)]", icone: "▣" },
                { valor: visitasDoMes.filter((v) => v.status === "Concluída").length, rotulo: "Concluídas este mês", cor: "bg-[var(--ok-bg)] text-[color:var(--ink)]", icone: "✓" },
                { valor: visitas.filter((v) => v.status === "Em andamento").length, rotulo: "Em andamento agora", cor: "bg-[var(--pend-bg)] text-[color:var(--ink)]", icone: "◷" },
                { valor: empresasVisiveis.length, rotulo: "Empresas ativas", cor: "bg-violet-50 text-violet-700", icone: "□" },
              ].map((indicador) => (
                <div key={indicador.rotulo} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-base font-extrabold ${indicador.cor}`}>{indicador.icone}</div>
                  <div><div className="text-xl font-extrabold leading-none text-[color:var(--ink)]">{indicador.valor}</div><div className="mt-1 text-xs text-slate-500">{indicador.rotulo}</div></div>
                </div>
              ))}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div><div className="text-[10px] font-extrabold uppercase tracking-wide text-[color:var(--brand)]">Acompanhamento</div><h2 className="mt-1 text-lg font-extrabold text-[color:var(--ink)]">Visitas recentes</h2></div>
                <div className="flex rounded-lg bg-slate-50 p-0.5 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setFiltroInicio("Em andamento")}
                    className={`rounded-md px-3 py-1.5 ${filtroInicio === "Em andamento" ? "bg-[var(--brand)] text-white shadow-sm" : "text-slate-500"}`}
                  >
                    Em andamento
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroInicio("Concluída")}
                    className={`rounded-md px-3 py-1.5 ${filtroInicio === "Concluída" ? "bg-[var(--brand)] text-white shadow-sm" : "text-slate-500"}`}
                  >
                    Concluídas
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-100 px-3">
                <div className="divide-y divide-slate-100">
                  {visitasRecentesInicio.map((visita) => (
                    <button
                      key={visita.id}
                      type="button"
                      onClick={() => { setVisitaAtualId(visita.id); setView("visita"); }}
                      className="flex w-full items-center gap-3 py-3 text-left transition hover:bg-slate-50"
                    >
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${visita.status === "Concluída" ? "bg-[var(--ok-bg)] text-[color:var(--ink)]" : "bg-[var(--pend-bg)] text-[color:var(--ink)]"}`}>
                        {visita.status === "Concluída" ? "✓" : "◷"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-extrabold text-slate-950">{nomeSemNumerosNoInicio(db.empresas[visita.empresaId]?.nomeFantasia || "Empresa")}</span>
                        <span className="block truncate text-[11px] text-slate-500">{fdata(visita.data)} • {visita.responsavel || "Responsável não informado"}</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${visita.status === "Concluída" ? "bg-[var(--ok-bg)] text-[color:var(--ink)]" : "bg-[var(--pend-bg)] text-[color:var(--ink)]"}`}>{visita.status}</span>
                      <span className="shrink-0 text-[color:var(--brand)]">›</span>
                    </button>
                  ))}
                  {visitasRecentesInicio.length === 0 && (
                    <div className="py-5 text-center text-xs text-slate-400">Nenhuma visita nesta situação.</div>
                  )}
                </div>
              </div>

              <button type="button" onClick={() => setView("visitas")} className="mt-3 flex w-full items-center justify-between rounded-xl bg-[var(--brand-soft)] px-3 py-2.5 text-xs font-extrabold text-[color:var(--ink)]">
                <span>Ver todas as visitas</span><span>›</span>
              </button>
            </section>
          </div>)
        ) : view === "empresas" ? (
          <PcEmpresas
            totalClientes={empresasVisiveis.length}
            busca={buscaEmpresas}
            onBusca={setBuscaEmpresas}
            podeCriar={permitido("empresas.editar")}
            onNova={iniciarNovaEmpresa}
            onSelecionar={(id) => { setDb((o) => ({ ...o, empresaAtualId: id })); setVisitaAtualId(null); }}
            onGerenciar={(id) => { const alvo = db.empresas[id]; if (alvo) editarEmpresa(alvo); }}
            onNovaVisita={novaVisita}
            onHistorico={(id) => {
              setDb((o) => ({ ...o, empresaAtualId: id }));
              setVisitaAtualId(null);
              setView("historico");
            }}
            onAcessos={() => navegarPrincipal("acessos")}
            onArquivar={(id, arquivar) => {
              if (!exigirPermissao("empresas.editar", id)) return;
              setDb((o) => (o.empresas[id] ? { ...o, empresas: { ...o.empresas, [id]: marcarArquivada(o.empresas[id], arquivar, new Date().toISOString()) } } : o));
            }}
            arquivadasTotal={empresasVisiveis.filter((e) => e.arquivada).length}
            mostrarArquivadas={mostrarEmpresasArquivadas}
            onMostrarArquivadas={setMostrarEmpresasArquivadas}
            empresas={empresasFiltradas.map((e) => {
              const prep = preparacaoDaEmpresa(e);
              return {
                id: e.id,
                nome: nomeParaExibir(e),
                razaoSocial: e.razaoSocial || "",
                ativa: db.empresaAtualId === e.id,
                setores: prep.contagens.setores,
                equipamentos: prep.contagens.equipamentos,
                programas: prep.contagens.programas,
                pops: prep.contagens.pops,
                preparacao: prep.percentual,
                completo: prep.completo,
                faltas: faltasDoCadastro(e),
                podeGerenciar: permitido("empresas.editar", e.id),
                podeAcessos: permitido("usuarios.gerenciar"),
                arquivada: Boolean(e.arquivada),
                podeNovaVisita: permitido("visitas.criar", e.id),
              };
            })}
          />
        ) : view === "historico" && atual ? (
          <section className="space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase text-[color:var(--brand)]">
                    Histórico da empresa
                  </div>
                  <h1 className="mt-1 text-2xl font-extrabold">
                    Evolução das visitas
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    {nomeSemNumerosNoInicio(atual.nomeFantasia)} • acompanhamento consolidado ao longo do tempo
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
                <div className="mt-4 rounded-xl border border-amber-200 bg-[var(--pend-bg)] p-3 text-sm text-[color:var(--ink)]">
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
                  <div className="text-xs font-extrabold uppercase text-[color:var(--brand)]">
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
                        ? "bg-[var(--ok-bg)] text-[color:var(--ink)]"
                        : comparacaoVisitas.deltaConformidade < 0
                          ? "bg-[var(--nc-bg)] text-[color:var(--ink)]"
                          : "bg-[var(--na-bg)] text-[color:var(--ink)]"
                    }`}>
                      {comparacaoVisitas.deltaConformidade > 0 ? "+" : ""}
                      {comparacaoVisitas.deltaConformidade} p.p. de conformidade
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-4">
                    <div className="rounded-xl bg-[var(--brand-soft)] p-4">
                      <div className="text-xs font-extrabold uppercase text-blue-700">Conformidade anterior</div>
                      <div className="mt-1 text-2xl font-extrabold text-blue-950">
                        {comparacaoVisitas.resumoAnterior.avaliados
                          ? `${comparacaoVisitas.resumoAnterior.conformidade}%`
                          : "—"}
                      </div>
                    </div>
                    <div className="rounded-xl bg-[var(--ok-bg)] p-4">
                      <div className="text-xs font-extrabold uppercase text-emerald-700">Conformidade atual</div>
                      <div className="mt-1 text-2xl font-extrabold text-emerald-950">
                        {comparacaoVisitas.resumoAtual.avaliados
                          ? `${comparacaoVisitas.resumoAtual.conformidade}%`
                          : "—"}
                      </div>
                    </div>
                    <div className="rounded-xl bg-[var(--nc-bg)] p-4">
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
                  <div className="rounded-2xl border border-red-100 bg-[var(--nc-bg)] p-4">
                    <div className="text-xs font-extrabold uppercase text-red-700">Novas não conformidades</div>
                    <div className="mt-1 text-3xl font-extrabold text-red-950">{comparacaoVisitas.novas.length}</div>
                    <p className="mt-1 text-xs text-red-800">Não apareciam na visita anterior.</p>
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-[var(--pend-bg)] p-4">
                    <div className="text-xs font-extrabold uppercase text-amber-700">Reincidências</div>
                    <div className="mt-1 text-3xl font-extrabold text-amber-950">{comparacaoVisitas.reincidentes.length}</div>
                    <p className="mt-1 text-xs text-amber-800">Persistiram como não conformes.</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-[var(--ok-bg)] p-4">
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
                            <div key={nc.id} className="rounded-xl bg-[var(--pend-bg)] p-3 text-sm">
                              <div className="font-extrabold">{nc.titulo}</div>
                              <div className="mt-1 text-xs text-amber-800">{nomeDeExibicaoDoAmbiente(nc.ambiente)}</div>
                            </div>
                          )) : <div className="text-sm text-slate-500">Nenhuma reincidência.</div>}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-extrabold uppercase text-red-700">Novas</div>
                        <div className="mt-2 space-y-2">
                          {comparacaoVisitas.novas.length ? comparacaoVisitas.novas.slice(0, 5).map((nc) => (
                            <div key={nc.id} className="rounded-xl bg-[var(--nc-bg)] p-3 text-sm">
                              <div className="font-extrabold">{nc.titulo}</div>
                              <div className="mt-1 text-xs text-red-800">{nomeDeExibicaoDoAmbiente(nc.ambiente)}</div>
                            </div>
                          )) : <div className="text-sm text-slate-500">Nenhuma nova não conformidade.</div>}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-extrabold uppercase text-emerald-700">Corrigidas</div>
                        <div className="mt-2 space-y-2">
                          {comparacaoVisitas.corrigidas.length ? comparacaoVisitas.corrigidas.slice(0, 5).map((nc) => (
                            <div key={nc.id} className="rounded-xl bg-[var(--ok-bg)] p-3 text-sm">
                              <div className="font-extrabold">{nc.titulo}</div>
                              <div className="mt-1 text-xs text-emerald-800">{nomeDeExibicaoDoAmbiente(nc.ambiente)}</div>
                            </div>
                          )) : <div className="text-sm text-slate-500">Nenhum item confirmado como corrigido.</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : visitasEmpresaAtual.length === 1 ? (
              <div className="rounded-2xl border border-blue-100 bg-[var(--brand-soft)] p-5">
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
                          v.id === visitaAtualId ? "ring-2 ring-[var(--brand)] ring-offset-2" : ""
                        }`}
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-[var(--na-bg)] px-3 py-1 text-xs font-extrabold text-[color:var(--ink)]">
                                Visita {numeroVisitaPorId.get(v.id) || visitasEmpresaAtual.length - idx}
                              </span>
                              <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                                v.status === "Concluída"
                                  ? "bg-[var(--ok-bg)] text-[color:var(--ink)]"
                                  : "bg-[var(--pend-bg)] text-[color:var(--ink)]"
                              }`}>
                                {v.status}
                              </span>
                              {v.id === visitaAtualId && (
                                <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-extrabold text-[color:var(--ink)]">
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
                            className="rounded-xl bg-[var(--brand)] px-4 py-2 font-medium text-white"
                          >
                            {v.status === "Concluída" ? "Abrir relatório" : "Abrir visita"}
                          </button>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-4">
                          <div className="rounded-xl bg-[var(--brand-soft)] p-3">
                            <div className="text-xs font-extrabold uppercase text-blue-700">
                              Conformidade
                            </div>
                            <div className="mt-1 text-2xl font-extrabold text-blue-950">
                              {avaliados ? `${conformidade}%` : "—"}
                            </div>
                          </div>
                          <div className="rounded-xl bg-[var(--nc-bg)] p-3">
                            <div className="text-xs font-extrabold uppercase text-red-700">
                              Não conformidades
                            </div>
                            <div className="mt-1 text-2xl font-extrabold text-red-950">
                              {ncsDaVisita.length}
                            </div>
                          </div>
                          <div className="rounded-xl bg-[var(--pend-bg)] p-3">
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
          <PcVisitas
            empresaAtiva={atual ? nomeParaExibir(atual) : "nenhuma"}
            filtro={filtroListaVisitas}
            onFiltro={setFiltroListaVisitas}
            historicoDesabilitado={!atual}
            novaDesabilitada={!atual || !permitido("visitas.criar", atual.id)}
            onHistorico={() => setView("historico")}
            onNova={novaVisita}
            onContinuar={(id) => continuar(id)}
            onConcluir={(id) => void concluir(id)}
            onReabrir={(id) => void reabrir(id)}
            onExcluir={(id) => excluir(id)}
            onRelatorio={(id) => {
              const alvo = db.visitas.find((visita) => visita.id === id);
              if (!alvo) return;
              setDb((estado) => ({ ...estado, empresaAtualId: alvo.empresaId }));
              setVisitaAtualId(id);
              setView("relatorio");
            }}
            visitas={visitas.map((v) => {
              const itens = v.checklist || [];
              const respondidosV = itens.filter((item) => item.status !== "Pendente").length;
              return {
                id: v.id,
                empresa: nomeParaExibir(db.empresas[v.empresaId]),
                empresaAtiva: v.empresaId === db.empresaAtualId,
                numero: numeroVisitaPorId.get(v.id) || "—",
                data: fdata(v.data),
                responsavel: v.responsavel || "Responsável não informado",
                percentual: itens.length ? Math.round((respondidosV / itens.length) * 100) : 0,
                status: v.status,
                podeContinuar: podeAbrirVisita(v.empresaId),
                podeConcluir: permitido("visitas.concluir", v.empresaId),
                podeReabrir: permitido("visitas.concluir", v.empresaId),
                podeRelatorio: permitido("relatorios.exportar", v.empresaId),
                podeExcluir: usuarioDaSessao?.perfil === "Administrador",
              };
            })}
          />
        )}
      </div>
    </div>
    </IaPermitidaContext.Provider>
  );
}
