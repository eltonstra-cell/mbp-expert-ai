"use client";

import Select from "@/components/Select";
import { formatarCnpj } from "@/lib/cnpj";
import { useEffect, useMemo, useRef, useState } from "react";
import MetricCard from "@/components/MetricCard";
import FaixaVisitaOutraEmpresa from "@/components/FaixaVisitaOutraEmpresa";
import { textoDeBaseLegal } from "@/lib/conteudoValidado";
import {
  desligarIa,
  erroDaGuarda,
  guardaDaEmpresa,
  iaJaFoiLiberada,
  iaLiberada,
  liberarIa,
  MENSAGEM_IA_DESLIGADA,
  textoDeLiberacao,
  visitasComGuardaVencendo,
} from "@/lib/privacidadeEmpresa";
import PcPrivacidadeEmpresa from "@/components/pc/PcPrivacidadeEmpresa";
import PcNormaAplicavel, { type DadosDaNorma } from "@/components/pc/PcNormaAplicavel";
import { normasDaEmpresa } from "@/lib/normas";
import PopLeituraFolha from "@/components/PopLeituraFolha";
import PcFilaDeEnvio from "@/components/pc/PcFilaDeEnvio";
import PcComprovantes, { type DadosDoFormulario } from "@/components/pc/PcComprovantes";
import { RegistrosEmpresaContext, type RegistrosEmpresaValor } from "@/components/RegistrosEmpresaContext";
import { criarRegistroPop, podeCriarRegistroPop, podeGerenciarComprovantes, podeGerenciarPessoas, podeVerComprovantes, rotuloDoTipo } from "@/lib/registrosEmpresa";
import { alterarPopVinculado, marcarSubstituidoNaRenovacao } from "@/lib/comprovantePop";
import PcPessoas from "@/components/pc/PcPessoas";
import PcEmitirRelatorio from "@/components/pc/PcEmitirRelatorio";
import PcRelatoriosEmitidos from "@/components/pc/PcRelatoriosEmitidos";
import PcDossie from "@/components/pc/PcDossie";
import PcEvolucao from "@/components/pc/PcEvolucao";
import { evidenciasEmRelatorioEmitido, podeEmitirRelatorio, ultimaVersao } from "@/lib/relatorioEmitido";
import { podeGerarDossie } from "@/lib/dossie";
import { CAPACIDADE_VAZIA, TEXTO_DA_CAPACIDADE, capacidadeDoFormulario, capacidadeParaFormulario, validarCapacidade, type CapacidadeEmTexto } from "@/lib/capacidadeEmpresa";
import PainelHojeCard, { AtalhosDeRelatorios } from "@/components/PainelHoje";
import { fonteParaExibir } from "@/lib/fonteDaPergunta";
import PcLembrete from "@/components/pc/PcLembrete";
import PcResumo from "@/components/pc/PcResumo";
import { montarLembrete, montarPainelHoje, montarResumo, podeEnviarLembrete, podeVerPainel, type ItemDoPainel } from "@/lib/painelHoje";
import { useFilaDeEvidencias } from "@/components/useFilaDeEvidencias";
import { useOnline } from "@/components/useOnline";
import { FalhaDeEnvio, LIMITE_AVISO_FILA_BYTES, causaDaResposta, textoDeEspaco, type ItemSemArquivo } from "@/lib/filaEvidencias";
import { estadoVisivelDaEvidencia, reconciliarComEvidencias } from "@/lib/filaReconciliacao";
import { armazemDoAparelho } from "@/lib/filaEvidenciasIdb";
import { MENSAGEM_SEM_NORMA_APLICADA, acaoCorretivaDoPopVigente, popVigente, avisoDePopsComNormaAlterada, conjuntoDaEmpresa, criarPopsFaltantesDoConjunto, CONJUNTO_DA_NORMA, criarPopDoTextoBase } from "@/lib/popsNorma";
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
import { conferenciaDoRelatorio, destinoDoPreencherCrn } from "@/lib/reportCheck";
import { ocultarAmbiente, mostrarAmbiente, excluirAmbienteOculto, resumoOcultos } from "@/lib/hiddenEnvs";
import { reincidenciaDaNc } from "@/lib/actionPlan";
import { DURACAO_DO_AVISO_DO_AVANCO_MS, textoDoAvanco } from "@/lib/avancoAutomatico";
import { acharItemDeDestino, mostrarCartaoProximaEtapa, primeiroItemSemResposta, proximaEtapaDaVisita, textoDoContinuar, type ItemDeDestino } from "@/lib/proximaEtapa";
import { corDaEmpresa, proximaCorLivre } from "@/lib/empresaCor";
import { BolinhasDeCor } from "@/components/CorDaEmpresa";
import { avisoDeDivergencia, conciliarNcs } from "@/lib/ncReconcile";
import { contagemDeEvidencias, correcoesAbertas, itensNaoConformes, progressoDoChecklist } from "@/lib/contagens";
import { comPerfilProprio, motivoParaNaoExcluir } from "@/lib/userManagement";
import { dataDaValidade, diasRestantes, expiracoesSemRegistro, faixaDeLeitura } from "@/lib/validadeDeAcesso";
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
import PcVisitas, { type FiltroVisitas } from "@/components/pc/PcVisitas";
import ConfiguracaoDeVisitas from "@/components/pc/ConfiguracaoDeVisitas";
import { avisoDeVisitaAberta, limiteDeDiasDaVisita, motivoParaNaoExcluirVisita, textoDeProgressoDaVisita } from "@/lib/visitasLista";
import PcEmpresas from "@/components/pc/PcEmpresas";
import CampoEmpresas from "@/components/campo/CampoEmpresas";
import { useScreenMode } from "@/components/useScreenMode";
import PcModoTela from "@/components/pc/PcModoTela";
import ChecklistFocoItem from "@/components/ChecklistFocoItem";
import { trocaDeGravidade } from "@/lib/checklistUi";
import { avisar, confirmar, perguntar } from "@/lib/dialogos";
import { opcoesDeEmpresa } from "@/lib/trocarEmpresa";
import TrocarEmpresaPainel from "@/components/campo/TrocarEmpresaPainel";
import { prepararFotoParaEnvio, dependenciasDoNavegador, validarFotoEscolhida } from "@/lib/fotoCompressao";
import PcChecklist, { type ApoioDoItem } from "@/components/pc/PcChecklist";
import RevisaoTranscricao from "@/components/RevisaoTranscricao";
import MeuPerfilModal from "@/components/pc/MeuPerfilModal";
import { iniciarMedidorDeVolume } from "@/components/useNivelDeAudio";
import { MENSAGEM_SEM_FALA, ehSilencio } from "@/lib/transcricao";
import { nomeDoArquivoPdf, rotuloDoRelatorio, seloDoPdf } from "@/lib/reportLabels";
import { nomeCurtoDoAmbiente, nomeDeExibicaoDoAmbiente } from "@/lib/checklistEnvs";
import { calcularCortes } from "@/lib/pdfPaginacao";
import { cssDoDocumentoImpresso, cssDoRodapeDeImpressao, suportaCaixasDeMargem, type CabecalhoDeImpressao } from "@/lib/printFooter";
import { sincronizarNcDoItem } from "@/lib/checklistNcs";
import { visitaDaEmpresaAtiva } from "@/lib/trocarEmpresa";
import { dadosExtrasDoItem, desfazerLimpeza, limparResposta, listaEmTexto, type InstantaneoDaResposta } from "@/lib/limparResposta";
import { ABAS_PADRAO, CampoBarra, CampoCabecalho, CampoCorrecoes, CampoInicio, CampoMais, type AbaDaBarra, type TelaCampo } from "@/components/campo/CampoTelas";
import FiscalInicio from "@/components/FiscalInicio";
import { AvisoFotoProvider, useAvisoAntesDeFotografar } from "@/components/AvisoAntesDeFotografar";
import type { ItemMenu } from "@/components/ui/RowMenu";
import { ROTULO_DE_USO, descreverAparelho } from "@/lib/screenMode";
import { preparacaoDaEmpresa, pendenciasDaEmpresa, textoDaPendencia, destinoDaPendencia } from "@/lib/companyReadiness";
import ChecklistEnvStrip from "@/components/ChecklistEnvStrip";
import CommandPalette from "@/components/CommandPalette";
import { construirDestinos, construirDestinosDaVisita, type Destino, type EntradaDeDestinos } from "@/lib/commandSearch";
import type { ContextoDaVoz } from "@/components/BuscaNaBarra";
import { quantidadeDeAmbientes, resumoAmbientes, vizinhoDoAmbiente } from "@/lib/checklistEnvs";
import { NavIcon } from "@/components/NavIcons";
import { iniciaisDaEmpresa, chaveAtiva, itemDoMenu, itensVisiveis, nomeSemNumerosNoInicio, type NavContexto, type NavKey } from "@/lib/navigation";
import ManualBaseFields from "@/components/ManualBaseFields";
import OperationalFlowsFields from "@/components/OperationalFlowsFields";
import QualityProgramsFields from "@/components/QualityProgramsFields";
import CentralEmpresaNav from "@/components/pc/CentralEmpresaNav";
import RelatoriosAbas, { type AbaDeRelatorios } from "@/components/pc/RelatoriosAbas";
import { niveisDoCaminho } from "@/lib/caminhoDaFicha";
import { assinaturaEdicaoEmpresa, temAlteracoesNaoSalvas } from "@/lib/estadoNaoSalvo";
import { renomearAmbiente, resumoDaRenomeacao, textoDoResumo } from "@/lib/renomearAmbiente";
import { caixasDoContinuar, colunasDoInicio, comAmbienteDasCorrecoes, correcoesSemPrazo, passosDeConfiguracao, resumoDaConfiguracao } from "@/lib/inicio";
import { ePaginaDeCadastro, marcarComoRevisado } from "@/lib/revisaoDeCadastros";
import RevisaoDaPagina from "@/components/pc/RevisaoDaPagina";
import { avisoParaEmitir, avisoParaFinalizar, erroDoCnpj, erroDoNomeDaEmpresa, itensRespondidos, pendenciasParaSalvarEmpresa } from "@/lib/regrasDoPacote3";
import { ambientesParaVisita, limparVinculos, nomeJaExistente } from "@/lib/ambientesVisita";
import IdentificacaoComplementar from "@/components/IdentificacaoComplementar";
import { prefillDoPerfilDoRt, preencherIdentificacao, semOCampo, type CampoDaIdentificacao } from "@/lib/manualIdentificacao";
import { estadoDaBarraDeSalvar, marcadosDoUltimoSalvo } from "@/lib/escolhaEmJanela";
import { TENTATIVAS_DA_NUVEM, conexaoAtual, esperaAposFalhaDaNuvem, rotuloDoSeloComProblema, seloDeSincronizacao, umaTentativa } from "@/lib/conexao";
import { mostrarVoltar, nivelAcima, registrarLocal, voltarUma, type LocalDeTela } from "@/lib/historicoDeTelas";
import { esquecerTela, lerContinuar, limparContinuar, registrarTela, type TelaRecente } from "@/lib/continuarDeOndeParei";
import { nomeDeExibicaoDaEmpresa, nomeEmFormatoNatural } from "@/lib/nomeEmpresa";
import PcImplantacao from "@/components/pc/PcImplantacao";
import { mostrarToast } from "@/lib/toast";
import { limparTextoDePessoa, nomeECargo, nomeProprio } from "@/lib/nomeCargo";
import { diasEntreDatas, formatarData, formatarDataCurta, formatarDataHora, formatarHora, hojeLocalISO } from "@/lib/dataLocal";
import { palavra as pal, quantidade as qtd } from "@/lib/plural";
import { ROTULO_DA_SUBABA, grupoDaSubaba, gruposVisiveis, lembrarSubaba, lerSubabaLembrada, opcoesDoSeletorDeSecao, resolverSubaba, subabaAoEscolherSecao, subabasVisiveis, type GrupoCentral, type SubAbaCentral } from "@/lib/centralEmpresa";
import { empresaTemImplantacao, implantacaoConcluida, implantacaoDeEmpresaNova, passosDeImplantacao } from "@/lib/implantacao";
import { divergenciaDeResponsavel, responsavelEfetivo, textoDoResponsavel } from "@/lib/responsavelEstabelecimento";
import type { AbaFicha } from "@/components/pc/PcFichaPop";
import FieldVoiceTools from "@/components/FieldVoiceTools";
import { BRAND } from "@/lib/brand";
import pacote from "../package.json";
import { LogoHorizontal, LogoSymbol, LogoWordmark } from "@/components/BrandLogo";
import { IaPermitidaContext, useIaPermitida } from "@/components/IaPermissionContext";
import type {
  ComprovanteTerceiro,
  ConfigQuestionario,
  RelatorioEmitido,
  Capacitacao,
  Colaborador,
  LeituraPop,
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
import { comPerguntasNovasDoModelo, itensDoQuestionario, materializarModelo, perguntaFoiUsada, podeEditarQuestionario } from "@/lib/questionarioAmbiente";
import PcQuestionario from "@/components/pc/PcQuestionario";
import { MENSAGEM_LIMITE_DE_FOTOS, comprovacaoDaCorrecao, fotosDoItem, podeAdicionarFotoNoItem } from "@/lib/fotosDoItem";
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
import { ambientesIniciais, moverAmbiente } from "@/lib/visitaRapida";
import { historicoDaReincidencia, memoriaDoPlano, seloDaReincidencia } from "@/lib/memoriaDoPlano";
import { ordemAdaptativa, VISITAS_RECENTES } from "@/lib/checklistAdaptativo";
import { aplicarLote, contarEmLote, desfazerLote, planoDoLote, textoDaConfirmacaoDoLote } from "@/lib/loteConforme";
import DitadoDoAmbiente from "@/components/DitadoDoAmbiente";
import ReservaDeAltura from "@/components/ReservaDeAltura";
import PropostaDeCnpjPainel from "@/components/PropostaDeCnpj";
import PacoteDoTipoPainel, { type EscolhaDoPacote } from "@/components/PacoteDoTipo";
import CaixaQueCresce from "@/components/CaixaQueCresce";
import { camposDaProposta, mensagemDeFalhaDaConsulta, propostaDaConsulta, type PropostaDeCnpj } from "@/lib/cnpjConsulta";
import { TIPOS_DE_ESTABELECIMENTO, limiteSugeridoParaEquipamento, tipoSugeridoPorCnae } from "@/lib/tiposDeEstabelecimento";
import { equipamentosDoPacote } from "@/lib/equipamentosCadastro";
import { linhasDeTemperaturaDoRelatorio } from "@/lib/limitesDeTemperatura";
import type { PropostaDeVoz } from "@/lib/vozDoAmbiente";
import ConflitosDeEdicao from "@/components/ConflitosDeEdicao";
import { contarAlteracoesPendentes, iguais as estadosIguais, mesclarTresVias, usarVersaoDaNuvem, type Conflito } from "@/lib/mesclaTresVias";
import { gravarBase, gravarConflitos, juntarConflitos, lerBase, lerConflitos, type BaseSalva } from "@/lib/estadoBase";
import {
  hasLocalOnlyRecords,
  localOnlyCounts,
  mergeForRecovery,
  type RecoveryCounts, textoDaRecuperacao } from "@/lib/recovery";
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
  encerrarAcessoFiscal,
  renovarAcessoFiscal,
  type DadosUsuarioPreparacao,
} from "@/lib/userManagement";
import { resumoConfiguracaoEmpresa } from "@/lib/companyReadiness";

type View = "inicio" | "pops" | "ajuda" | "empresas" | "visitas" | "visita" | "ambientes" | "checklist" | "ncs" | "plano" | "acompanhamento" | "historico" | "evidencias" | "relatorio" | "acessos" | "correcoes" | "popsvisita" | "modotela" | "campomais" | "fila" | "comprovantes" | "pessoas" | "resumo" | "relatoriosemitidos" | "dossie" | "evolucao";
type EmpresaSecao = SubAbaCentral;
type FiltroChecklistRapido = "Todos" | "Pendentes" | "Não conformes";

const NAV_STORAGE_KEY = "mbp-expert-ai:navegacao:v1";
// Último item aberto no checklist, por visita, só neste aparelho.
const ULTIMO_ITEM_STORAGE_KEY = "mbp-expert-ai:checklist-ultimo-item:v1";
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
  responsavel: "Responsável do estabelecimento",
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
  cor: "",
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

function hojeISO() {
  return hojeLocalISO();
}

function fdata(d: string) {
  return d ? formatarData(d) || "—" : "—";
}

function criarChecklist(
  ambientes: string[],
  fluxosOperacionais?: FluxoOperacional[],
  programasControle?: ProgramaControleQualidade[],
  modelosQuestionario?: Record<string, string>,
  questionarios?: Record<string, ConfigQuestionario>
): ChecklistItem[] {
  const itensAmbientes = ambientes.flatMap((ambiente, ambienteIndex) => {
    const modeloReferencia = modelosQuestionario?.[ambiente] ||
      obterModeloQuestionarioParaAmbiente(ambiente);
    const setorNormalizado = normalizarSetorManual(modeloReferencia);
    const setorDoManual = SETORES_OFICIAIS_MANUAL.includes(
      setorNormalizado as (typeof SETORES_OFICIAIS_MANUAL)[number]
    );
    // Questionário personalizado pelo RT (perguntas ativas, na ordem escolhida); sem ele, vale o modelo do app.
    // As perguntas que o modelo ganhou depois da edição entram também nos ambientes já editados (ativas, sem apagar nada da empresa).
    const modeloDoAmbiente = (setorDoManual ? obterModeloChecklistManual(ambiente, modeloReferencia) : modelosChecklist[ambiente] || obterModeloChecklistManual(ambiente, modeloReferencia)).filter((item) => item.categoria !== "Equipamentos e móveis");
    const personalizado = itensDoQuestionario(questionarios?.[ambiente], modeloDoAmbiente);
    const itensEstrutura = personalizado ? personalizado : setorDoManual
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
      referencia: item.referencia || "Fonte não registrada",
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

  // Dias de calendário de São Paulo entre hoje e o prazo (AAAA-MM-DD).
  const diffDias = diasEntreDatas(hojeLocalISO(), prazo);

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

type VisitAreaIconName = "evidencias" | "plano" | "relatorio" | "equipamentos" | "programas";

function VisitAreaIcon({ name }: { name: VisitAreaIconName }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "evidencias") return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m7 15 3-3 2.5 2.5 2-2L19 17" /><circle cx="16.5" cy="9" r="1.5" /></svg>;
  if (name === "plano") return <svg {...common}><path d="M7 4h10v3H7z" /><path d="M5 6h14v15H5z" /><path d="m8 14 2.2 2.2L16 10.5" /></svg>;
  if (name === "relatorio") return <svg {...common}><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v5h5M9 12h6M9 16h6" /></svg>;
  if (name === "equipamentos") return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 8h8M8 12h5M8 16h7" /></svg>;
  return <svg {...common}><path d="M7 3h10v4H7z" /><path d="M5 5v16h14V5" /><path d="m8 14 2 2 5-5" /></svg>;
}

// O aviso "Antes de fotografar" vive no provedor; esta ponte entrega a função ao botão Registrar, que fica na página.
function AvisoFotoPonte({ alvo }: { alvo: { current: (acao: () => void) => void } }) {
  alvo.current = useAvisoAntesDeFotografar();
  return null;
}

function quantidadeComNome(quantidade: number, singular: string, plural: string) {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

// Nome da página atual no topo do modo Campo (perto da empresa ativa; o nome da empresa não se repete no título).
const TITULO_DA_TELA_NO_CAMPO: Partial<Record<View, string>> = { inicio: "Início", checklist: "Checklist", correcoes: "Correções", evidencias: "Evidências", campomais: "Mais", empresas: "Empresas", visitas: "Visitas", visita: "Visita", ambientes: "Ambientes", relatorio: "Relatório", fila: "Fila de envio", ajuda: "Ajuda" };

const SUBABA_DO_ITEM_DE_PREPARACAO: Record<string, SubAbaCentral> = { responsavel: "dados", horario: "dados", setores: "ambientes", equipamentos: "equipamentos", programas: "programas", pops: "pops" };

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
  const pedirAvisoDeFotoRef = useRef<(acao: () => void) => void>((acao) => acao());
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
  const [emissaoSelo, setEmissaoSelo] = useState<{ texto: string; modo: "previa" | "parcial" | "oficial" } | null>(null);
  const [rodapeImpressao, setRodapeImpressao] = useState<{ empresa: string; selo: string; fixo: boolean } | null>(null);
  const telaModo = useScreenMode();
  const modo = telaModo.modo;
  // Completo e Equilibrado usam o kit de telas do PC; Campo tem apresentação própria.
  const ehPC = modo !== "campo";
  const ComponenteEmpresas = ehPC ? PcEmpresas : CampoEmpresas;
  // Evidências, Ambientes, Ajuda, Empresas e Visitas usam as mesmas telas compactas no celular (cabem numa tela, a lista rola por dentro).
  const telaEmLista = true;
  useEffect(() => {
    if (modo !== "campo" && view === "campomais") setView("inicio");
  }, [modo, view]);
  const [caixaAberta, setCaixaAberta] = useState(false);
  const [caixaComVoz, setCaixaComVoz] = useState(false);
  const [buscaNaBarraAtiva, setBuscaNaBarraAtiva] = useState(false);
  const [pedidoDeFocoNaBusca, setPedidoDeFocoNaBusca] = useState(0);
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
        // No PC a busca vive na barra do topo: Ctrl K só leva o foco para ela. Sem barra visível (celular), abre a caixa.
        const barra = document.querySelector<HTMLElement>(".pc-busca");
        if (barra && barra.offsetParent !== null) {
          setPedidoDeFocoNaBusca((n) => n + 1);
        } else {
          setCaixaComVoz(false);
          setCaixaAberta((aberta) => !aberta);
        }
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
  const [filtroListaVisitas, setFiltroListaVisitas] = useState<FiltroVisitas>("Todas");
  const [filtroNcs, setFiltroNcs] = useState<"Todas" | "Abertas" | "Resolvidas">("Todas");
  const [planoNcAbertaId, setPlanoNcAbertaId] = useState<string>("");
  // Correções: da visita aberta (padrão) ou todas as abertas da empresa (toque em "Correções abertas na empresa").
  const [correcoesDaEmpresa, setCorrecoesDaEmpresa] = useState(false);
  // POP aberto para leitura numa folha (checklist), sem sair da visita.
  const [popLeituraId, setPopLeituraId] = useState<string | null>(null);
  // Folha curta depois de registrar evidência sem sinal.
  const [avisoSemSinal, setAvisoSemSinal] = useState<string | null>(null);
  const [showEmpresaForm, setShowEmpresaForm] = useState(false);
  const [editingEmpresaId, setEditingEmpresaId] = useState<string | null>(null);
  const [empresaSecao, setEmpresaSecao] = useState<EmpresaSecao | null>(null);
  // Quem não edita a empresa vê só Documentos (POPs, Comprovantes, Pessoas): a sub-aba aberta fica aqui.
  const [usuarioResponsavelForm, setUsuarioResponsavelForm] = useState("");
  const [docSecao, setDocSecao] = useState<SubAbaCentral>("pops");
  // Pedido para abrir a ficha de um POP (vindo do painel, de uma correção ou de outra tela).
  const [fichaAbertaRotulo, setFichaAbertaRotulo] = useState<string | null>(null);
  const [pedidoDeListaDePops, setPedidoDeListaDePops] = useState(0);
  const [fichaPedida, setFichaPedida] = useState<{ popId: string; aba?: AbaFicha; chave: number } | null>(null);
  const [verPassosDeImplantacao, setVerPassosDeImplantacao] = useState(false);
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
  // Fila do estado (visitas, respostas, correções): a base é o que o servidor tinha na última sincronização; o que difere dela está pendente.
  const baseRef = useRef<BaseSalva | null>(null);
  const dbRef = useRef<AppDB>(emptyDB);
  dbRef.current = db;
  const [conflitos, setConflitos] = useState<Conflito[]>([]);
  const conflitosRef = useRef<Conflito[]>([]);
  const [pendentesDoEstado, setPendentesDoEstado] = useState(0);
  const [envioForcado, setEnvioForcado] = useState(0);
  const [loteParaDesfazer, setLoteParaDesfazer] = useState<{ visitaId: string; ids: string[]; em: string; texto: string } | null>(null);
  const [versaoDaBase, setVersaoDaBase] = useState(0);
  const [sessaoDoEstadoExpirou, setSessaoDoEstadoExpirou] = useState(false);
  const [armazenamentoNaoGarantido, setArmazenamentoNaoGarantido] = useState(false);
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

  // O selo "Sem conexão" nunca depende só de navigator.onLine: reavalia ao voltar o foco e depois de atualizar o service worker,
  // e só marca offline depois de duas falhas seguidas (lib/conexao.ts).
  useEffect(() => {
    let ativo = true;
    const reavaliar = () => {
      void conexaoAtual(window.navigator.onLine, () => umaTentativa((url, init) => fetch(url, init))).then((online) => {
        if (ativo) setEstaOnline(online);
      });
    };
    const aoVoltarAVisibilidade = () => {
      if (document.visibilityState === "visible") reavaliar();
    };
    reavaliar();
    window.addEventListener("online", reavaliar);
    window.addEventListener("offline", reavaliar);
    window.addEventListener("focus", reavaliar);
    document.addEventListener("visibilitychange", aoVoltarAVisibilidade);
    navigator.serviceWorker?.addEventListener("controllerchange", reavaliar);
    return () => {
      ativo = false;
      window.removeEventListener("online", reavaliar);
      window.removeEventListener("offline", reavaliar);
      window.removeEventListener("focus", reavaliar);
      document.removeEventListener("visibilitychange", aoVoltarAVisibilidade);
      navigator.serviceWorker?.removeEventListener("controllerchange", reavaliar);
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
  // Capacidade e turnos (não é critério de norma; não gera regra automática).
  const [capacidadeForm, setCapacidadeForm] = useState<CapacidadeEmTexto>(CAPACIDADE_VAZIA);
  const [responsabilidadesEmpresa, setResponsabilidadesEmpresa] = useState<
    ResponsabilidadeManual[]
  >(criarResponsabilidadesPadrao());
  const [setoresEmpresa, setSetoresEmpresa] = useState<string[]>([]);
  const [vinculosEmpresa, setVinculosEmpresa] = useState<Record<string, string>>({});
  // Questionário (modelo) de cada ambiente, editado na lista de ambientes e gravado no Salvar da barra de baixo.
  const [modelosEmpresa, setModelosEmpresa] = useState<Record<string, string>>({});
  // Renomeações de ambiente feitas nesta edição: o formulário já mostra o nome novo; visitas, NCs e o resto mudam ao salvar.
  const [renomeacoesPendentes, setRenomeacoesPendentes] = useState<{ de: string; para: string }[]>([]);
  // Avisos na hora, no campo: nome e CNPJ da empresa.
  const [tocouNomeEmpresa, setTocouNomeEmpresa] = useState(false);
  const [tocouCnpjEmpresa, setTocouCnpjEmpresa] = useState(false);
  // Consulta de CNPJ: chega como PROPOSTA (o RT usa ou ignora); o que veio dela fica marcado "da consulta" até ser editado.
  const [propostaCnpj, setPropostaCnpj] = useState<PropostaDeCnpj | null>(null);
  const [consultaMsg, setConsultaMsg] = useState("");
  const [camposDaConsulta, setCamposDaConsulta] = useState<string[]>([]);
  const [tipoSugerido, setTipoSugerido] = useState(false);
  // UF que não veio da consulta (deduzida pelo CEP ou vazia): o campo avisa, sem bloquear.
  const [avisoUf, setAvisoUf] = useState("");
  // Consulta sem nome fantasia / sem e-mail: o campo diz isso (nada é inventado) e oferece o atalho quando cabe.
  const [semFantasiaNaReceita, setSemFantasiaNaReceita] = useState(false);
  const [semEmailNaConsulta, setSemEmailNaConsulta] = useState(false);
  const [respNovaAberta, setRespNovaAberta] = useState(false);
  const [cnaesSecundariosForm, setCnaesSecundariosForm] = useState<{ codigo: string; descricao: string }[]>([]);
  const [consultaEmForm, setConsultaEmForm] = useState("");
  const cnpjConsultadoRef = useRef("");
  // Foto do cadastro antes do pacote do tipo, para o "Desfazer".
  const [pacoteDesfazer, setPacoteDesfazer] = useState<{ setores: string[]; equipamentos: EquipamentoSetor[]; fluxos: FluxoOperacional[] } | null>(null);
  const [tentouSalvarEmpresa, setTentouSalvarEmpresa] = useState(false);
  // Campos do Manual que vieram do perfil do RT e ainda não foram editados (selo "do perfil do RT").
  const [camposDoPerfilRt, setCamposDoPerfilRt] = useState<CampoDaIdentificacao[]>([]);
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
    vinculos: limparVinculos(vinculosEmpresa, setoresEmpresa),
    modelos: modelosEmpresa,
    pops: popsEmpresa,
  });
  const empresaTemAlteracoes = temAlteracoesNaoSalvas(showEmpresaForm, assinaturaEmpresaSalva, assinaturaEmpresaAtual);
  const marcadosSalvos = marcadosDoUltimoSalvo(assinaturaEmpresaSalva);
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


  function registrarBase(estado: AppDB, versao: string | null) {
    baseRef.current = { estado, versao, salvoEm: new Date().toISOString() };
    setVersaoDaBase((n) => n + 1);
    void gravarBase(storageIdentityRef.current, estado, versao);
  }

  function definirConflitos(lista: Conflito[]) {
    conflitosRef.current = lista;
    setConflitos(lista);
    gravarConflitos(storageIdentityRef.current, lista);
  }

  function escolherConflito(conflito: Conflito, escolha: "meu" | "nuvem") {
    if (escolha === "nuvem") setDb((atual) => usarVersaoDaNuvem(atual, conflito));
    const restantes = conflitosRef.current.filter((item) => item.id !== conflito.id);
    definirConflitos(restantes);
    if (restantes.length === 0) setEnvioForcado((n) => n + 1);
  }

  function sincronizacaoOk() {
    falhasSyncRef.current = 0;
    setSessaoDoEstadoExpirou(false);
    if (!syncBloqueadaRef.current) setProtecaoLocalAtiva(false);

    if (retrySyncTimerRef.current !== null) {
      window.clearTimeout(retrySyncTimerRef.current);
      retrySyncTimerRef.current = null;
    }
  }

  function registrarFalhaSincronizacao() {
    falhasSyncRef.current += 1;

    // Falhas rápidas de rede são comuns durante F5/reconexão e quando o banco "acorda".
    // Nas primeiras tentativas, mostramos "Conectando..." em vez de
    // assustar o usuário com um falso erro. A espera cresce (1,5 / 4 / 8 s).
    const espera = esperaAposFalhaDaNuvem(falhasSyncRef.current);
    if (espera !== null) {
      setSyncStatus("conectando");

      if (retrySyncTimerRef.current !== null) {
        window.clearTimeout(retrySyncTimerRef.current);
      }

      retrySyncTimerRef.current = window.setTimeout(() => {
        retrySyncTimerRef.current = null;
        void buscarEstadoNuvem(false);
      }, espera);

      return;
    }

    // Só depois da última tentativa mostramos erro real.
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

    // O que este aparelho mudou e ainda não enviou NUNCA é trocado pelo estado da nuvem: mescla por item e, se os dois mudaram o mesmo item, pergunta.
    // A mesclagem roda sobre o estado MAIS RECENTE (função de atualização): nada que mudou entre a leitura e agora se perde,
    // por exemplo a foto que acabou de ser marcada como enviada.
    const base = baseRef.current?.estado;
    registrarBase(novo, cloud.updatedAt || null);
    setDb((atual) => {
      let aplicar = novo;
      if (base && !estadosIguais(base, atual)) {
        const mesclado = mesclarTresVias(base, atual, novo);
        aplicar = mesclado.estado;
        if (mesclado.conflitos.length) definirConflitos(juntarConflitos(conflitosRef.current, mesclado.conflitos));
      }
      salvarDBLocal(aplicar);
      return aplicar;
    });

    window.setTimeout(() => {
      aplicandoNuvemRef.current = false;
      // Se sobrou algo deste aparelho, envia agora, já em cima da versão nova da nuvem (o envio é dispensado quando nada difere da base).
      setEnvioForcado((n) => n + 1);
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
          ? formatarDataHora(conflito.updatedAt)
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
            ? formatarDataHora(cloud.updatedAt)
            : ""
        );
      } else if (meta.updatedAt) {
        ultimaNuvemVersaoRef.current = meta.updatedAt;
        ultimaNuvemRef.current = new Date(meta.updatedAt).getTime();
        setSyncAtualizadoEm(
          formatarDataHora(meta.updatedAt)
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
      baseRef.current = await lerBase(identidadeLocal);
      conflitosRef.current = lerConflitos(identidadeLocal);
      if (!cancelado) setConflitos(conflitosRef.current);

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

            if (baseRef.current) {
              // Este aparelho já sabe o que o servidor tinha da última vez: o que foi feito sem sinal é mesclado, nunca trocado.
              const mesclado = mesclarTresVias(baseRef.current.estado, local, cloudDb);
              s = mesclado.estado;
              if (mesclado.conflitos.length) definirConflitos(juntarConflitos(conflitosRef.current, mesclado.conflitos));
              registrarBase(cloudDb, cloud.updatedAt || null);
              salvarDBLocal(s);
              sincronizacaoOk();
              setSyncStatus("sincronizado");
              if (!estadosIguais(cloudDb, s)) window.setTimeout(() => setEnvioForcado((n) => n + 1), 0);
            } else if (hasLocalOnlyRecords(counts)) {
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
              registrarBase(cloudDb, cloud.updatedAt || null);
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
                ? formatarDataHora(cloud.updatedAt)
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
                registrarBase(s, salvo.updatedAt || null);
                ultimaNuvemRef.current = salvo.updatedAt
                  ? new Date(salvo.updatedAt).getTime()
                  : Date.now();
                ultimaNuvemVersaoRef.current = salvo.updatedAt || null;
                sincronizacaoOk();
            setSyncStatus("sincronizado");
                setSyncAtualizadoEm(
                  salvo.updatedAt
                    ? formatarDataHora(salvo.updatedAt)
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
        // Preserva o localStorage. Uma falha de leitura nunca pode ser tratada como nuvem vazia: sem a base da última
        // sincronização, bloqueia a gravação automática; com a base, o trabalho segue e é mesclado quando o sinal voltar.
        syncBloqueadaRef.current = !baseRef.current;
        falhasSyncRef.current = TENTATIVAS_DA_NUVEM;
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
      registrosPop: Array.isArray((s as any).registrosPop) ? (s as any).registrosPop : [],
      comprovantes: Array.isArray((s as any).comprovantes) ? (s as any).comprovantes : [],
      colaboradores: Array.isArray((s as any).colaboradores) ? (s as any).colaboradores : [],
      relatoriosEmitidos: Array.isArray((s as any).relatoriosEmitidos) ? (s as any).relatoriosEmitidos : [],
      capacitacoes: Array.isArray((s as any).capacitacoes) ? (s as any).capacitacoes : [],
      leiturasPop: Array.isArray((s as any).leiturasPop) ? (s as any).leiturasPop : [],
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

  // Itens na fila continuam guardados ao sair ou trocar de empresa; só avisa antes.
  async function confirmarComFila(acao: "sair" | "trocar"): Promise<boolean> {
    const n = fila.resumo.pendentes;
    const alteracoes = pendentesDoEstado;
    if (!n && !alteracoes) return true;
    const partes = [];
    if (alteracoes) partes.push(alteracoes === 1 ? "1 alteração" : `${alteracoes} alterações`);
    if (n) partes.push(n === 1 ? "1 evidência" : `${n} evidências`);
    const plural = `${partes.join(" e ")} aguardando envio`;
    return confirmar(
      acao === "sair"
        ? `Há ${plural} neste aparelho.\n\nSe você sair, ficam guardadas, mas só serão enviadas quando você entrar de novo com a mesma conta e houver conexão. Não limpe os dados do navegador antes disso.`
        : `Há ${plural} neste aparelho.\n\nContinuam guardadas e serão enviadas normalmente, com qualquer empresa aberta.`,
      { titulo: "Envio pendente", confirmarRotulo: acao === "sair" ? "Sair mesmo assim" : "Trocar mesmo assim" }
    );
  }

  // ===== Registros por POP e comprovantes de terceiros =====
  // Emissão do relatório assinado (RT e Administrador): o servidor atribui o número e guarda o instantâneo.
  const [emitirAberto, setEmitirAberto] = useState(false);
  const [emitindoRelatorio, setEmitindoRelatorio] = useState(false);
  const [erroDeEmissao, setErroDeEmissao] = useState("");

  async function emitirRelatorioDaVisita(motivo: string) {
    if (!visitaAtual || emitindoRelatorio) return;
    if (avisoParaEmitir(visitaAtual.status, itensRespondidos(checklistAtual))) return;
    setEmitindoRelatorio(true);
    setErroDeEmissao("");
    try {
      const anterior = ultimaVersao(db.relatoriosEmitidos || [], visitaAtual.id);
      const resposta = await fetch("/api/relatorios/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitaId: visitaAtual.id, novaVersao: Boolean(anterior), motivo, secoes: secoesRelatorio, nomeLocal: usuarioDaSessao?.nome || sessaoAtual?.name || "" }),
      });
      const corpo = (resposta.headers.get("content-type") || "").includes("application/json") ? await resposta.json().catch(() => null) : null;
      if (!resposta.ok || !corpo?.relatorio) {
        setErroDeEmissao(corpo?.error || "Não foi possível emitir agora. Emitir precisa de internet.");
        return;
      }
      const emitido = corpo.relatorio as RelatorioEmitido;
      setDb((o) => {
        const atualizado: AppDB = { ...o, relatoriosEmitidos: [...(o.relatoriosEmitidos || []).filter((item) => item.id !== emitido.id), emitido] };
        salvarDBLocal(atualizado);
        return atualizado;
      });
      setEmitirAberto(false);
      setView("relatoriosemitidos");
    } catch {
      setErroDeEmissao("Sem conexão. Emitir o relatório precisa de internet.");
    } finally {
      setEmitindoRelatorio(false);
    }
  }

  // Relatório emitido, resumo de uma página e dossiê: o cabeçalho (empresa, CNPJ, número, emissão, versão e motivo) e o
  // "Página X de Y" saem em TODAS as páginas pelas caixas de margem do @page (Chrome/Edge 131+).
  function imprimirDocumento(titulo: string, cabecalho: CabecalhoDeImpressao) {
    const marcas = (navigator as Navigator & { userAgentData?: { brands: { brand: string; version: string }[] } }).userAgentData?.brands;
    const estilo = document.createElement("style");
    estilo.id = "estilo-impressao-documento";
    estilo.textContent = cssDoDocumentoImpresso({ cabecalho, comCaixasDeMargem: suportaCaixasDeMargem(marcas, navigator.userAgent) });
    document.head.appendChild(estilo);
    const tituloAntes = document.title;
    document.title = titulo.replace(/[\\/:*?"<>|]+/g, "").trim();
    const limpar = () => {
      estilo.remove();
      document.title = tituloAntes;
      window.removeEventListener("afterprint", limpar);
    };
    window.addEventListener("afterprint", limpar);
    window.setTimeout(() => window.print(), 150);
  }

  async function compartilharResumo(texto: string) {
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ text: texto });
        return;
      }
    } catch {
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
  }

  // Uma porta só: POPs, Comprovantes e Pessoas ficam em Central › Documentos. Quem edita a empresa abre a Central;
  // quem só lê (Gerente, Gestor, Fiscal) abre o mesmo Documentos, sem as áreas de configuração.
  function abrirDocumentos(sub: SubAbaCentral) {
    if (!atual) {
      void avisar("Escolha a empresa para abrir os documentos.", { titulo: "Escolha a empresa" });
      setView("empresas");
      return;
    }
    if (permitido("empresas.editar", atual.id)) {
      void abrirSecaoEmpresaPeloMenu(sub);
      return;
    }
    setDocSecao(sub);
    setView("pops");
  }

  // Caixa inteligente: leva à sub-aba da Central (quem edita) ou ao Documentos (quem só lê), sempre da empresa ativa.
  function abrirDocumentosOuCentral(sub: SubAbaCentral) {
    abrirDocumentos(sub);
  }

  function abrirComprovantes() {
    abrirDocumentos("comprovantes");
  }

  function abrirPessoas() {
    abrirDocumentos("pessoas");
  }

  function abrirFichaDoPop(popId: string, aba?: AbaFicha) {
    setFichaPedida({ popId, aba, chave: Date.now() });
    abrirDocumentos("pops");
  }

  function salvarColaborador(dados: { id?: string; nome: string; cargo: string }) {
    if (!atual || !podeGerenciarPessoasAqui) return;
    setDb((o) => {
      const lista = o.colaboradores || [];
      const existente = dados.id ? lista.find((item) => item.id === dados.id) : undefined;
      const novo: Colaborador = existente
        ? { ...existente, nome: nomeProprio(dados.nome), cargo: limparTextoDePessoa(dados.cargo) }
        : { id: crypto.randomUUID(), empresaId: atual.id, nome: nomeProprio(dados.nome), cargo: limparTextoDePessoa(dados.cargo), ativo: true, criadoEm: new Date().toISOString() };
      const atualizado: AppDB = { ...o, colaboradores: existente ? lista.map((item) => (item.id === novo.id ? novo : item)) : [...lista, novo] };
      salvarDBLocal(atualizado);
      return atualizado;
    });
  }

  function alternarColaborador(id: string) {
    if (!podeGerenciarPessoasAqui) return;
    setDb((o) => {
      const atualizado: AppDB = { ...o, colaboradores: (o.colaboradores || []).map((item) => (item.id === id ? { ...item, ativo: !item.ativo } : item)) };
      salvarDBLocal(atualizado);
      return atualizado;
    });
  }

  function salvarCapacitacao(dados: { colaboradorId: string; conteudo: string; cargaHoraria: string; data: string; venceEm: string; instrutor: string }) {
    if (!atual || !podeGerenciarPessoasAqui) return;
    const registro: Capacitacao = {
      id: crypto.randomUUID(),
      empresaId: atual.id,
      colaboradorId: dados.colaboradorId,
      conteudo: dados.conteudo.trim(),
      cargaHoraria: Number(dados.cargaHoraria.replace(",", ".")),
      data: dados.data,
      venceEm: dados.venceEm,
      ...(dados.instrutor.trim() ? { instrutor: dados.instrutor.trim() } : {}),
      criadoEm: new Date().toISOString(),
    };
    setDb((o) => {
      const atualizado: AppDB = { ...o, capacitacoes: [...(o.capacitacoes || []), registro] };
      salvarDBLocal(atualizado);
      return atualizado;
    });
  }

  async function removerCapacitacao(id: string) {
    if (!podeGerenciarPessoasAqui) return;
    if (!(await confirmar("Remover este registro de capacitação?", { titulo: "Remover capacitação", confirmarRotulo: "Remover", perigoso: true }))) return;
    setDb((o) => {
      const atualizado: AppDB = { ...o, capacitacoes: (o.capacitacoes || []).filter((item) => item.id !== id) };
      salvarDBLocal(atualizado);
      return atualizado;
    });
  }

  // Comprovante: o arquivo vai para o armazenamento (exige internet; não entra na fila offline) e só então o registro é salvo.
  async function salvarComprovante(dados: DadosDoFormulario, arquivo: File | null): Promise<string> {
    const empresaId = atual?.id;
    if (!empresaId) return "Escolha uma empresa.";
    if (!podeGerenciarComprovantesAqui) return "Seu perfil não permite anexar comprovantes.";
    const anterior = dados.id ? (db.comprovantes || []).find((item) => item.id === dados.id) : undefined;
    const id = dados.id || crypto.randomUUID();
    let blob: { pathname: string; url: string } | null = null;
    let nomeArquivo = anterior?.nomeArquivo;
    let mimeType = anterior?.mimeType;
    if (arquivo) {
      if (!navigator.onLine) return "Precisa de internet para enviar o arquivo.";
      let conteudo: Blob = arquivo;
      nomeArquivo = arquivo.name || "comprovante";
      mimeType = arquivo.type || "application/pdf";
      if (arquivo.type.startsWith("image/")) {
        const preparo = await prepararFotoParaEnvio(arquivo, dependenciasDoNavegador);
        if (!preparo.ok) return preparo.motivo;
        conteudo = preparo.arquivo;
        nomeArquivo = preparo.nome;
        mimeType = "image/jpeg";
      }
      const form = new FormData();
      form.append("file", conteudo, nomeArquivo);
      form.append("empresaId", empresaId);
      form.append("comprovanteId", id);
      try {
        const resposta = await fetch("/api/comprovantes/upload", { method: "POST", body: form });
        const corpo = (resposta.headers.get("content-type") || "").includes("application/json") ? await resposta.json().catch(() => null) : null;
        if (!resposta.ok || !corpo?.pathname) return corpo?.error || "Não foi possível enviar o comprovante. Tente de novo com internet.";
        blob = { pathname: String(corpo.pathname), url: String(corpo.url || "") };
      } catch {
        return "Sem conexão para enviar o arquivo. Precisa de internet.";
      }
    }
    const comprovante: ComprovanteTerceiro = {
      id,
      empresaId,
      tipo: dados.tipo,
      emissor: dados.emissor.trim(),
      dataServico: dados.dataServico,
      validade: dados.validade,
      observacao: dados.observacao.trim(),
      ...(blob ? { blobPathname: blob.pathname } : anterior?.blobPathname ? { blobPathname: anterior.blobPathname } : {}),
      ...(nomeArquivo ? { nomeArquivo } : {}),
      ...(mimeType ? { mimeType } : {}),
      ...(dados.renovaId || anterior?.renovaId ? { renovaId: dados.renovaId || anterior?.renovaId } : {}),
      // Vínculo direto da renovação: o botão Renovar grava o id do anterior aqui; o anterior ganha "substituidoPor".
      ...(dados.renovaId || anterior?.renovaDe ? { renovaDe: dados.renovaId || anterior?.renovaDe } : {}),
      // POP vinculado: só vale se o POP existe nesta empresa (sem POP: comprovante geral da empresa).
      ...(dados.popId && (db.empresas[empresaId]?.pops || []).some((pop) => pop.id === dados.popId) ? { popId: dados.popId } : {}),
      criadoPorId: anterior?.criadoPorId || usuarioDaSessao?.id,
      criadoEm: anterior?.criadoEm || new Date().toISOString(),
    };
    setDb((o) => {
      const lista = o.comprovantes || [];
      const aplicada = anterior ? lista.map((item) => (item.id === id ? comprovante : item)) : [...lista, comprovante];
      // Renovação: o comprovante anterior (mesmo tipo e POP) ganha "Substituído"; nada é apagado.
      const atualizado: AppDB = { ...o, comprovantes: comprovante.renovaDe ? marcarSubstituidoNaRenovacao(aplicada, comprovante) : aplicada };
      salvarDBLocal(atualizado);
      return atualizado;
    });
    // Trocou o arquivo de um comprovante existente: o arquivo antigo sai do armazenamento.
    if (blob && anterior?.blobPathname && anterior.blobPathname !== blob.pathname) {
      void fetch(`/api/comprovantes/file?pathname=${encodeURIComponent(anterior.blobPathname)}`, { method: "DELETE" }).catch(() => undefined);
    }
    return "";
  }

  // Troca o POP vinculado sem apagar o comprovante: fica uma linha no histórico dele e um registro de auditoria.
  function alterarPopDoComprovante(item: ComprovanteTerceiro, popId: string | undefined) {
    if (!exigirPermissao("empresas.ver", item.empresaId) || !podeGerenciarComprovantesAqui) return;
    const agora = new Date().toISOString();
    const quem = { id: usuarioDaSessao?.id, nome: usuarioDaSessao?.nome };
    const novo = alterarPopVinculado(item, popId, db.empresas[item.empresaId]?.pops || [], quem, agora);
    if (novo === item) return;
    const registro = criarRegistroAuditoria(
      {
        usuarioId: usuarioDaSessao?.id || "local",
        usuarioNome: usuarioDaSessao?.nome || "Usuário local",
        acao: "comprovante.pop_alterado",
        entidade: "Empresa",
        entidadeId: item.id,
        empresaId: item.empresaId,
        detalhes: `${rotuloDoTipo(item.tipo)} • POP vinculado alterado.`,
      },
      agora
    );
    setDb((o) => {
      const atualizado: AppDB = { ...o, comprovantes: (o.comprovantes || []).map((registroAtual) => (registroAtual.id === item.id ? novo : registroAtual)), registrosAuditoria: [...o.registrosAuditoria, registro] };
      salvarDBLocal(atualizado);
      return atualizado;
    });
    mostrarToast("POP vinculado alterado");
  }

  function removerComprovante(item: ComprovanteTerceiro) {
    if (!exigirPermissao("empresas.ver", item.empresaId) || !podeGerenciarComprovantesAqui) return;
    if (item.blobPathname) {
      void fetch(`/api/comprovantes/file?pathname=${encodeURIComponent(item.blobPathname)}`, { method: "DELETE" }).catch(() => undefined);
    }
    setDb((o) => {
      const atualizado: AppDB = { ...o, comprovantes: (o.comprovantes || []).filter((registro) => registro.id !== item.id) };
      salvarDBLocal(atualizado);
      return atualizado;
    });
  }

  // Arquivo enviado pela fila: a evidência passa a apontar para ele e mostra "Enviada".
  function aplicarEvidenciaEnviada(item: ItemSemArquivo, resultado: { pathname: string; url: string }): boolean {
    const existe = (dbAtualRef.current.evidencias || []).some((ev) => ev.id === item.id);
    if (!existe) {
      // O registro da evidência sumiu (a pessoa que remove uma evidência com foto na fila já descarta o item antes): o arquivo enviado
      // NUNCA é apagado aqui; o registro é recriado para a foto não ficar invisível.
      recriarEvidenciaDaFila(item, resultado);
      return true;
    }
    atualizarEvidenciaRegistrada(item.id, (ev) => ({ ...ev, blobPathname: resultado.pathname, blobUrl: resultado.url, envio: "enviada" }));
    return true;
  }

  // Refaz o registro da evidência a partir do que a fila guardou (a foto na fila é, muitas vezes, a única cópia).
  function recriarEvidenciaDaFila(item: ItemSemArquivo, resultado?: { pathname: string; url: string }) {
    const recriada: Evidencia = {
      id: item.id,
      empresaId: item.empresaId,
      visitaId: item.visitaId,
      tipo: item.tipo,
      nomeArquivo: item.nomeArquivo,
      mimeType: item.mimeType,
      ...(resultado ? { blobPathname: resultado.pathname, blobUrl: resultado.url, envio: "enviada" as const } : { envio: "aguardando" as const }),
      descricao: item.descricao,
      ambiente: item.ambiente,
      checklistItemId: item.checklistItemId,
      ncId: item.ncId,
      criadoEm: item.capturadoEm,
    };
    setDb((o) => {
      if ((o.evidencias || []).some((ev) => ev.id === item.id)) return o;
      const atualizado: AppDB = { ...o, evidencias: [recriada, ...(o.evidencias || [])] };
      salvarDBLocal(atualizado);
      return atualizado;
    });
  }

  async function sairDoSistema() {
    if (saindo) return;
    if (!(await confirmarComFila("sair"))) return;
    setSaindo(true);
    try {
      limparContinuar();
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

  // Fila de envio de evidências feitas sem sinal: só do usuário logado, só nas empresas a que ele ainda tem acesso.
  const usuarioDaFila = (sessaoAtual?.email || "").trim().toLocaleLowerCase("pt-BR") || "local";
  const dbAtualRef = useRef(db);
  dbAtualRef.current = db;
  const online = useOnline();
  const fila = useFilaDeEvidencias({
    usuarioId: usuarioDaFila,
    pronto: ready && (sessaoConsultada || !sessaoAtual),
    podeAcessarEmpresa: (empresaId) => !usuarioDaSessao || podeAcessarEmpresa(usuarioDaSessao, empresaId),
    aplicarResultado: aplicarEvidenciaEnviada,
  });

  // Imagens que o servidor não entregou (404): o registro mostra "Arquivo não enviado" com "Anexar de novo".
  // Guarda o arquivo (pathname) que o servidor não entregou; vale só enquanto o registro aponta para esse mesmo arquivo.
  const [arquivosIndisponiveis, setArquivosIndisponiveis] = useState<Record<string, string>>({});

  // "Anexar de novo": o RT escolhe o arquivo outra vez; ele entra na fila COM O MESMO id do registro (sem duplicar) e com a data da captura original.
  async function anexarDeNovo(ev: Evidencia, arquivo: File) {
    if (!exigirPermissao("evidencias.adicionar", ev.empresaId)) return;
    try {
      let conteudo: Blob | File = arquivo;
      let nomeArquivo = arquivo.name || ev.nomeArquivo;
      if (ev.tipo === "Foto") {
        const validacao = await validarFotoEscolhida(arquivo, dependenciasDoNavegador);
        if (!validacao.ok) return void avisar(validacao.motivo, { titulo: "Arquivo não aceito" });
        const preparo = await prepararFotoParaEnvio(arquivo, dependenciasDoNavegador);
        if (!preparo.ok) return void avisar(preparo.motivo, { titulo: "Foto não aceita" });
        conteudo = preparo.arquivo;
        nomeArquivo = preparo.nome;
      }
      await fila.guardar(
        {
          id: ev.id,
          usuarioId: usuarioDaFila,
          empresaId: ev.empresaId,
          visitaId: ev.visitaId,
          tipo: ev.tipo,
          nomeArquivo,
          mimeType: ev.tipo === "Foto" ? "image/jpeg" : arquivo.type || ev.mimeType || "audio/mpeg",
          ambiente: ev.ambiente || "",
          checklistItemId: ev.checklistItemId,
          ncId: ev.ncId,
          descricao: ev.descricao || "",
          capturadoEm: ev.criadoEm,
        },
        conteudo
      );
      // Mesmo registro: só muda o estado (o arquivo antigo, se existia, deixa de valer; a data e o vínculo continuam).
      setArquivosIndisponiveis((atual) => {
        const { [ev.id]: _tira, ...resto } = atual;
        return resto;
      });
      atualizarEvidenciaRegistrada(ev.id, (registro) => {
        const { blobPathname: _p, blobUrl: _u, ...semArquivo } = registro;
        return { ...semArquivo, nomeArquivo, envio: "aguardando" as const };
      });
      mostrarToast("Arquivo anexado. Enviando…");
      void fila.enviarAgora();
    } catch {
      void avisar("Não foi possível guardar o arquivo neste aparelho. Libere espaço e tente de novo.", { titulo: "Não foi anexado" });
    }
  }

  // Detalhes do registro para conferência (sem nome de pessoa e sem endereço do arquivo).
  function detalhesDoRegistro(ev: Evidencia): string {
    const item = fila.itens.find((registro) => registro.id === ev.id);
    return [
      `Registro: ${ev.id.slice(0, 8)}… · ${ev.tipo}`,
      `Data da captura: ${ev.criadoEm}`,
      `Campo envio: ${ev.envio ?? "(vazio)"}`,
      `Arquivo no servidor: ${ev.blobPathname ? "sim" : "não"} · Arquivo antigo no registro: ${ev.dataUrl ? "sim" : "não"}`,
      `Item vinculado: ${ev.checklistItemId ? "sim" : "não"} · Registrado por (id): ${ev.registradoPorId ? ev.registradoPorId.slice(0, 8) + "…" : "(vazio)"}`,
      item ? `Fila neste aparelho: ${item.estado} · tentativas ${item.tentativas} · causa ${item.causaDaFalha ?? "-"} · conta ${item.usuarioId === usuarioDaFila ? "esta" : item.usuarioId === "local" ? "sem conta" : "outra"}` : "Fila neste aparelho: sem item",
    ].join("\n");
  }

  // Miniaturas das fotos que ainda estão só neste aparelho (a foto na fila aparece, e ampliar ao tocar funciona antes do envio).
  const [miniaturasDaFila, setMiniaturasDaFila] = useState<Record<string, string>>({});
  const miniaturasRef = useRef<Record<string, string>>({});
  useEffect(() => {
    let cancelado = false;
    const idsPendentes = new Set(fila.itens.filter((item) => item.estado !== "enviado" && item.tipo === "Foto").map((item) => item.id));
    for (const id of Object.keys(miniaturasRef.current)) {
      if (!idsPendentes.has(id)) {
        URL.revokeObjectURL(miniaturasRef.current[id]);
        delete miniaturasRef.current[id];
      }
    }
    void (async () => {
      for (const id of idsPendentes) {
        if (miniaturasRef.current[id]) continue;
        try {
          const guardado = await armazemDoAparelho.ler(id);
          if (cancelado || !guardado?.arquivo) continue;
          miniaturasRef.current[id] = URL.createObjectURL(guardado.arquivo);
        } catch {
          // Sem leitura do aparelho: o cartão fica sem miniatura, o envio continua.
        }
      }
      if (!cancelado) setMiniaturasDaFila({ ...miniaturasRef.current });
    })();
    return () => {
      cancelado = true;
    };
  }, [fila.itens]);

  // Conferência da fila com o registro da visita: foto que está na fila e não aparece em Evidências é recriada; resultado que não chegou é aplicado.
  useEffect(() => {
    if (!ready) return;
    for (const acao of reconciliarComEvidencias(fila.itens, db.evidencias || [])) {
      if (acao.tipo === "recriar") recriarEvidenciaDaFila(acao.item, acao.item.estado === "enviado" ? acao.item.resultado : undefined);
      else aplicarEvidenciaEnviada(acao.item, acao.resultado);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fila.itens, db.evidencias]);

  // Selo de sincronização: "Sincronizado" só com AS DUAS filas vazias (estado e fotos/áudios); falha de foto vira "Erro ao enviar" (toque abre a fila).
  // Registro sem arquivo enviado e sem item na fila (e que é do usuário atual) conta como "Erro ao enviar".
  const idsNaFila = new Set(fila.itens.map((item) => item.id));
  const semArquivo = (db.evidencias || []).filter(
    (ev) => !ev.blobPathname && !ev.dataUrl && !idsNaFila.has(ev.id) && (!ev.registradoPorId || ev.registradoPorId === usuarioDaSessao?.id) && Boolean(visitaPorIdParaSelo(ev.visitaId))
  ).length;
  const seloAtual = seloDeSincronizacao({ online: estaOnline, syncStatus, pendentes: fila.resumo.pendentes + pendentesDoEstado, falhas: fila.resumo.falhou + semArquivo + (db.evidencias || []).filter((ev) => ev.blobPathname && arquivosIndisponiveis[ev.id] === ev.blobPathname).length });
  function visitaPorIdParaSelo(id: string) {
    return db.visitas.find((visita) => visita.id === id);
  }

  function tocarNoSelo() {
    if (!estaOnline) {
      mostrarToast("Sem sinal · alterações guardadas neste aparelho. Elas são enviadas quando a conexão voltar.", { tipo: "aviso", duracaoMs: 4500 });
      return;
    }
    if (fila.resumo.pendentes > 0) {
      setView("fila");
      void fila.enviarAgora();
    }
    void atualizarNuvemManualmente();
  }
  async function enviarTudoAgora() {
    await fila.enviarAgora();
    await atualizarNuvemManualmente();
  }

  const ehExecutor = usuarioDaSessao?.perfil === "Executor de campo";
  const ehFiscal = usuarioDaSessao?.perfil === "Fiscal";
  // Barra de baixo do Campo: o Executor só tem Início, Checklist, Registrar e Evidências; o Fiscal, só o Início.
  const abasDoCampo: AbaDaBarra[] = ehExecutor ? ["inicio", "checklist", "registrar", "evidencias"] : ehFiscal ? ["inicio"] : ABAS_PADRAO;

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

  // Quando um acesso de Fiscal vence, o Administrador que estiver com o app aberto registra "Acesso expirou" no histórico (uma vez só).
  useEffect(() => {
    if (!ready || usuarioDaSessao?.perfil !== "Administrador") return;
    const vencidos = expiracoesSemRegistro(db.usuarios.filter((usuario) => usuario.perfil === "Fiscal"), db.registrosAuditoria);
    if (vencidos.length === 0) return;
    const agora = new Date().toISOString();
    setDb((estado) => ({
      ...estado,
      registrosAuditoria: [
        ...estado.registrosAuditoria,
        ...vencidos.map((pessoa) =>
          criarRegistroAuditoria(
            {
              usuarioId: "preparacao-sistema",
              usuarioNome: "Preparação do sistema",
              acao: `Acesso expirou em ${dataDaValidade(pessoa.validoAte!)}`,
              entidade: "Usuário",
              entidadeId: pessoa.id,
              detalhes: `${pessoa.nome} • Fiscal • acesso expirou em ${dataDaValidade(pessoa.validoAte!)}.`,
            },
            agora
          )
        ),
      ],
    }));
  }, [ready, usuarioDaSessao, db.usuarios, db.registrosAuditoria]);

  // Tela bloqueada para o perfil: nem digitando o endereço nem restaurando a última tela. O servidor também nega os dados.
  useEffect(() => {
    if (!usuarioDaSessao || view === "campomais" || view === "modotela" || view === "ajuda") return;
    const tela = telaDaVisao(view);
    if (tela && nivelDaTela(usuarioDaSessao, tela) === "oculta") setView("inicio");
  }, [usuarioDaSessao, view]);

  useEffect(() => {
    if (!ready) return;

    salvarDBLocal(db);

    if (
      aplicandoNuvemRef.current ||
      salvamentoImediatoRef.current ||
      syncBloqueadaRef.current ||
      conflitosRef.current.length > 0
    ) return;

    const timer = window.setTimeout(async () => {
      try {
        // Nada mudou desde a última sincronização: não há o que enviar.
        if (baseRef.current && estadosIguais(baseRef.current.estado, db)) return;
        // Checagem leve antes de gravar: não baixa o banco completo.
        const metaResponse = await fetch("/api/state?meta=1", {
          method: "GET",
          cache: "no-store",
        });
        if (metaResponse.status === 401) {
          setSessaoDoEstadoExpirou(true);
          setSyncStatus("erro");
          return;
        }
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
              ? formatarDataHora(cloud.updatedAt)
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

        if (response.status === 401) {
          setSessaoDoEstadoExpirou(true);
          setSyncStatus("erro");
          return;
        }

        if (response.ok) {
          const result = await response.json();

          if (result?.configured !== false) {
            registrarBase(db, result.updatedAt || null);
            ultimaNuvemVersaoRef.current = result.updatedAt || null;
            ultimaNuvemRef.current = result.updatedAt
              ? new Date(result.updatedAt).getTime()
              : Date.now();

            sincronizacaoOk();
            setSyncStatus("sincronizado");
            setSyncAtualizadoEm(
              result.updatedAt
                ? formatarDataHora(result.updatedAt)
                : formatarDataHora(new Date())
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
  }, [db, ready, envioForcado]);

  // Contador de pendências do estado (respostas, correções e registros que ainda não chegaram ao servidor).
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      setPendentesDoEstado(baseRef.current ? contarAlteracoesPendentes(baseRef.current.estado, db) : 0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [db, ready, versaoDaBase]);

  // O sinal voltou: lê a nuvem (mescla) e envia o que ficou pendente. Sem Background Sync (iPhone), vale também ao voltar para o app (efeito de foco abaixo).
  useEffect(() => {
    if (!ready) return;
    const aoVoltarOnline = () => {
      falhasSyncRef.current = 0;
      void buscarEstadoNuvem(false);
      setEnvioForcado((n) => n + 1);
    };
    window.addEventListener("online", aoVoltarOnline);
    return () => window.removeEventListener("online", aoVoltarOnline);
  }, [ready]);

  // Saída com pendência: o navegador pergunta antes de fechar a página.
  useEffect(() => {
    if (pendentesDoEstado <= 0 && fila.resumo.pendentes <= 0) return;
    const avisarSaida = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", avisarSaida);
    return () => window.removeEventListener("beforeunload", avisarSaida);
  }, [pendentesDoEstado, fila.resumo.pendentes]);

  // Pede armazenamento persistente; se o navegador negar, avisa (ele pode apagar o que está guardado no aparelho).
  useEffect(() => {
    if (!ready) return;
    void (async () => {
      try {
        if (!navigator.storage?.persist) return;
        const ja = (await navigator.storage.persisted?.()) ?? false;
        const garantido = ja || (await navigator.storage.persist());
        setArmazenamentoNaoGarantido(!garantido);
      } catch {
        // Sem a API, nada a avisar.
      }
    })();
  }, [ready]);


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

  const empresasVisiveis = useMemo(
    () =>
      Object.values(db.empresas).filter((empresa) =>
        podeAcessarEmpresa(usuarioDaSessao, empresa.id)
      ),
    [db.empresas, usuarioDaSessao]
  );
  const [trocarEmpresaAberto, setTrocarEmpresaAberto] = useState(false);
  // O aviso curto de Evidências some sozinho; só os que terminam em "..." (em andamento) esperam o resultado.
  useEffect(() => {
    if (!evidenciaMsg || evidenciaMsg.endsWith("...")) return;
    const timer = window.setTimeout(() => setEvidenciaMsg(""), 4000);
    return () => window.clearTimeout(timer);
  }, [evidenciaMsg]);
  const [respostaLimpa, setRespostaLimpa] = useState<InstantaneoDaResposta | null>(null);
  const respostaLimpaTimerRef = useRef<number | null>(null);
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
  // O RT é avisado no Início quando a norma citada por um POP aprovado mudou no catálogo.
  const avisoPopsDoInicio = atual && usuarioDaSessao && permitido("empresas.editar", atual.id) ? avisoDePopsComNormaAlterada(atual.pops || []) : null;

  const empresaDosRegistros = view === "empresas" && editingEmpresaId ? db.empresas[editingEmpresaId] : atual;
  const podeCriarRegistro = !usuarioDaSessao || podeCriarRegistroPop(usuarioDaSessao);
  const podeGerenciarComprovantesAqui = !usuarioDaSessao || podeGerenciarComprovantes(usuarioDaSessao);
  const podeVerComprovantesAqui = !usuarioDaSessao || podeVerComprovantes(usuarioDaSessao);
  const podeGerenciarPessoasAqui = !usuarioDaSessao || podeGerenciarPessoas(usuarioDaSessao);

  function atualizarEmpresaDosRegistros(empresaId: string, mudar: (empresa: Empresa) => Empresa) {
    setDb((o) => {
      const empresa = o.empresas[empresaId];
      if (!empresa) return o;
      const atualizado: AppDB = { ...o, empresas: { ...o.empresas, [empresaId]: mudar(empresa) } };
      salvarDBLocal(atualizado);
      return atualizado;
    });
  }

  const registrosDaEmpresa: RegistrosEmpresaValor | null = empresaDosRegistros
    ? {
        empresaId: empresaDosRegistros.id,
        empresa: empresaDosRegistros,
        usuario: usuarioDaSessao,
        registros: (db.registrosPop || []).filter((registro) => registro.empresaId === empresaDosRegistros.id),
        comprovantes: podeVerComprovantesAqui ? (db.comprovantes || []).filter((item) => item.empresaId === empresaDosRegistros.id) : [],
        podeCriarRegistro,
        podeGerenciarPessoas: podeGerenciarPessoasAqui,
        colaboradores: podeGerenciarPessoasAqui ? (db.colaboradores || []).filter((pessoa) => pessoa.empresaId === empresaDosRegistros.id) : [],
        leituras: podeGerenciarPessoasAqui ? (db.leiturasPop || []).filter((leitura) => leitura.empresaId === empresaDosRegistros.id) : [],
        registrarLeitura: (popId, popVersao, colaboradorId, data) => {
          if (!podeGerenciarPessoasAqui) return;
          const leitura: LeituraPop = { id: crypto.randomUUID(), empresaId: empresaDosRegistros.id, popId, popVersao, colaboradorId, data, registradoPorId: usuarioDaSessao?.id, criadoEm: new Date().toISOString() };
          setDb((o) => {
            const atualizado: AppDB = { ...o, leiturasPop: [...(o.leiturasPop || []), leitura] };
            salvarDBLocal(atualizado);
            return atualizado;
          });
        },
        podeEditarEmpresa: permitido("empresas.editar", empresaDosRegistros.id),
        ncs: permitido("ncs.acompanhar", empresaDosRegistros.id) ? db.ncs.filter((nc) => nc.empresaId === empresaDosRegistros.id) : [],
        ambientes: empresaDosRegistros.setoresManual || [],
        podeGerenciarComprovantes: podeGerenciarComprovantesAqui,
        podeVerComprovantes: podeVerComprovantesAqui,
        online,
        salvarComprovante,
        alterarPopDoComprovante,
        criarPopDoModelo: permitido("empresas.editar", empresaDosRegistros.id) ? (catalogoId) => criarPopDoModeloPorCatalogo(empresaDosRegistros, catalogoId) : undefined,
        removerComprovante,
        urlDoComprovante: (item) => `/api/comprovantes/file?pathname=${encodeURIComponent(item.blobPathname || "")}`,
        novoRegistro: (dados) => {
          const resultado = criarRegistroPop({
            ...dados,
            id: crypto.randomUUID(),
            empresaId: empresaDosRegistros.id,
            responsavel: usuarioDaSessao?.nome || sessaoAtual?.name || "",
            responsavelId: usuarioDaSessao?.id,
          });
          if (resultado.ok) {
            setDb((o) => {
              const atualizado: AppDB = { ...o, registrosPop: [...(o.registrosPop || []), resultado.registro] };
              salvarDBLocal(atualizado);
              return atualizado;
            });
          }
          return resultado;
        },
        definirGuarda: (dias) => {
          if (!exigirPermissao("empresas.editar", empresaDosRegistros.id)) return;
          atualizarEmpresaDosRegistros(empresaDosRegistros.id, (empresa) => ({ ...empresa, guardaRegistrosDias: dias }));
        },
        definirProva: (popId, registroId) => {
          if (!exigirPermissao("empresas.editar", empresaDosRegistros.id)) return;
          atualizarEmpresaDosRegistros(empresaDosRegistros.id, (empresa) => ({ ...empresa, registroProvaPorPop: { ...(empresa.registroProvaPorPop || {}), [popId]: registroId } }));
        },
      }
    : null;

  // Painel "Hoje precisa de você" (gestor), lembrete ao responsável do estabelecimento e resumo de uma página.
  const [lembreteAberto, setLembreteAberto] = useState(false);
  const [renovarComprovanteId, setRenovarComprovanteId] = useState<string | undefined>(undefined);
  const painelHoje =
    atual && usuarioDaSessao && podeVerPainel(usuarioDaSessao)
      ? montarPainelHoje({
          empresa: atual,
          usuario: usuarioDaSessao,
          usuarioId: usuarioDaSessao.id,
          comprovantes: db.comprovantes,
          capacitacoes: db.capacitacoes,
          colaboradores: db.colaboradores,
          ncs: db.ncs,
          podeVerCorrecoes: permitido("ncs.acompanhar", atual.id),
        })
      : null;

  function acaoDoPainel(item: Pick<ItemDoPainel, "id" | "origem">) {
    if (item.origem === "comprovante") {
      setRenovarComprovanteId(item.id.split(":")[1]);
      abrirComprovantes();
    } else if (item.origem === "capacitacao") abrirPessoas();
    else if (item.origem === "correcao") abrirCorrecoesDaEmpresa();
    else abrirPopsPeloAtalho();
  }

  const painelNode =
    painelHoje && atual ? (
      <>
        <PainelHojeCard painel={painelHoje} onAcao={acaoDoPainel} />
        <AtalhosDeRelatorios onEvolucao={() => setView("evolucao")} onDossie={podeGerarDossie(usuarioDaSessao) ? () => setView("dossie") : undefined} onEmitidos={() => setView("relatoriosemitidos")} onLembrete={podeEnviarLembrete(usuarioDaSessao) ? () => setLembreteAberto(true) : undefined} onResumo={() => setView("resumo")} />
      </>
    ) : null;


  const empresaGerenciada = editingEmpresaId
    ? db.empresas[editingEmpresaId]
    : atual;
  // Telas antigas de Comprovantes e Pessoas: levam para a sub-aba correspondente de Documentos.
  useEffect(() => {
    if (view === "comprovantes") abrirDocumentos("comprovantes");
    else if (view === "pessoas") abrirDocumentos("pessoas");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);
  const configuracaoEmpresaGerenciada = resumoConfiguracaoEmpresa(empresaGerenciada);
  // Central da Empresa (quem edita) e Documentos (quem só lê): o que cada perfil enxerga e qual sub-aba está aberta.
  const quemVeNaCentral = { editar: true, verComprovantes: podeVerComprovantesAqui, gerenciarPessoas: podeGerenciarPessoasAqui && usuarioDaSessao?.perfil !== "Fiscal" && usuarioDaSessao?.perfil !== "Executor de campo" };
  const quemVeNosDocumentos = { ...quemVeNaCentral, editar: false };
  const secaoEmpresa: EmpresaSecao | null = editingEmpresaId ? resolverSubaba(empresaSecao, lerSubabaLembrada(editingEmpresaId), subabasVisiveis(quemVeNaCentral)) : empresaSecao;
  const subabaDosDocumentos = resolverSubaba(docSecao, null, subabasVisiveis(quemVeNosDocumentos));
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
    // A nova evidência já nasce vinculada ao último item tocado (mesma regra do Registrar).
    if (view !== "evidencias" || !visitaAtual || evidenciaChecklistItemId || !ultimoItemChecklistId) return;
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
      visitaAtual.modelosQuestionarioAmbientes || empresaVisita?.modelosQuestionarioAmbientes,
      empresaVisita?.questionarios
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
      ? ambientesParaVisita(empresaVisita.setoresManual, empresaVisita.setorOficialDoAmbiente)
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
  // Visita arquivada some das listas do dia a dia (a lista do PC tem o filtro "Arquivadas"); a numeração segue com todas.
  const visitasSemArquivadas = useMemo(() => visitas.filter((visita) => !visita.arquivada), [visitas]);
  const visitasFiltradas = useMemo(
    () =>
      filtroListaVisitas === "Todas" || filtroListaVisitas === "Arquivadas"
        ? visitasSemArquivadas
        : visitasSemArquivadas.filter(
            (visita) => visita.status === filtroListaVisitas
          ),
    [visitasSemArquivadas, filtroListaVisitas]
  );

  const prefixoMesAtual = hojeLocalISO().slice(0, 7);
  const visitasDoMes = visitas.filter((visita) => visita.data?.startsWith(prefixoMesAtual));
  const visitasRecentesInicio = visitasSemArquivadas
    .filter((visita) => visita.status === filtroInicio)
    .slice(0, 4);

  // "Continue de onde parou" segue a visita aberta no momento; sem uma, a mais recente em andamento da empresa ativa.
  const visitaEmAndamentoDestaque = visitaDaEmpresaAtiva(visitasSemArquivadas, db.empresaAtualId, visitaAtual?.id);
  const progressoVisitaDestaque = progressoDoChecklist(visitaEmAndamentoDestaque?.checklist).percentual;

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

  // ===== Botão "←" (Voltar) e "Continuar de onde parei" =====
  const [fichaAbertaId, setFichaAbertaId] = useState<string | null>(null);
  const [fichaAbertaRotuloCompleto, setFichaAbertaRotuloCompleto] = useState<string | null>(null);
  const [telasRecentes, setTelasRecentes] = useState<TelaRecente[]>([]);
  const pilhaDeTelasRef = useRef<LocalDeTela[]>([]);
  const subDoLocal = view === "empresas" && showEmpresaForm && editingEmpresaId ? String(secaoEmpresa ?? "") : view === "pops" ? subabaDosDocumentos : "";
  const localDaTela: LocalDeTela = { view, ...(fichaAbertaId ? { popId: fichaAbertaId } : {}), ...(subDoLocal ? { sub: subDoLocal } : {}) };
  const chaveDoLocal = `${localDaTela.view}|${localDaTela.popId || ""}|${localDaTela.sub || ""}`;
  useEffect(() => {
    pilhaDeTelasRef.current = registrarLocal(pilhaDeTelasRef.current, localDaTela);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveDoLocal]);
  const usuarioIdDasTelas = usuarioDaSessao?.id;
  const empresaIdDasTelas = db.empresaAtualId;
  useEffect(() => {
    setTelasRecentes(lerContinuar(usuarioIdDasTelas, empresaIdDasTelas));
  }, [usuarioIdDasTelas, empresaIdDasTelas]);
  const rotuloDaVisitaRecente = visitaAtual ? `Visita ${numeroVisitaPorId.get(visitaAtual.id) || "—"} · ${fdata(visitaAtual.data)}` : "";
  useEffect(() => {
    if (!usuarioIdDasTelas || !empresaIdDasTelas) return;
    const subDeDocumentos = view === "pops" || (view === "empresas" && showEmpresaForm);
    let tela: TelaRecente | null = null;
    if (fichaAbertaId && fichaAbertaRotuloCompleto) tela = { tipo: "pop", id: fichaAbertaId, rotulo: fichaAbertaRotuloCompleto };
    else if (subDoLocal === "comprovantes" && subDeDocumentos) tela = { tipo: "comprovantes", id: "", rotulo: "Comprovantes" };
    else if (visitaAtual && visitaAtual.status === "Em andamento" && VISIT_VIEWS.includes(view)) tela = { tipo: "visita", id: visitaAtual.id, rotulo: rotuloDaVisitaRecente };
    if (tela) setTelasRecentes(registrarTela(tela, usuarioIdDasTelas, empresaIdDasTelas));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveDoLocal, fichaAbertaRotuloCompleto, visitaAtual?.id]);

  async function irParaLocal(alvo: LocalDeTela) {
    if (alvo.popId) {
      abrirFichaDoPop(alvo.popId);
      return;
    }
    if ((alvo.view === "empresas" || alvo.view === "pops") && alvo.sub) {
      if (alvo.sub === "pops") setPedidoDeListaDePops((n) => n + 1);
      abrirDocumentos(alvo.sub as SubAbaCentral);
      return;
    }
    await navegarPrincipal(alvo.view as View);
  }

  // Volta uma tela pelo histórico do app; sem histórico, vai ao nível acima.
  async function voltarUmaTela() {
    const { destino, pilha } = voltarUma(pilhaDeTelasRef.current);
    if (destino) pilhaDeTelasRef.current = pilha;
    await irParaLocal(destino ?? nivelAcima(localDaTela));
  }

  function abrirTelaRecente(tela: TelaRecente) {
    if (tela.tipo === "pop") {
      if (!(atual?.pops || []).some((pop) => pop.id === tela.id)) {
        setTelasRecentes(esquecerTela("pop", tela.id, usuarioIdDasTelas, empresaIdDasTelas));
        mostrarToast("Este POP não existe mais");
        return;
      }
      abrirFichaDoPop(tela.id);
    } else if (tela.tipo === "comprovantes") {
      abrirComprovantes();
    } else if (db.visitas.some((visita) => visita.id === tela.id && visita.status === "Em andamento")) {
      setVisitaAtualId(tela.id);
      setView("visita");
    } else {
      setTelasRecentes(esquecerTela("visita", tela.id, usuarioIdDasTelas, empresaIdDasTelas));
      mostrarToast("Esta visita não está mais em andamento");
    }
  }

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

  function lerUltimosItensDoChecklist(): Record<string, string> {
    try {
      const bruto = JSON.parse(window.localStorage.getItem(scopedStorageKey(ULTIMO_ITEM_STORAGE_KEY, storageIdentityRef.current)) || "{}");
      return bruto && typeof bruto === "object" && !Array.isArray(bruto) ? bruto : {};
    } catch {
      return {};
    }
  }

  // Guarda o item em foco de cada visita; ao voltar ao checklist (menu, outra tela ou recarregar), abre nele.
  useEffect(() => {
    if (!ready || !visitaAtualId || !itemFocoId || !checklistAtual.some((item) => item.id === itemFocoId)) return;
    try {
      const guardados = lerUltimosItensDoChecklist();
      if (guardados[visitaAtualId] === itemFocoId) return;
      window.localStorage.setItem(
        scopedStorageKey(ULTIMO_ITEM_STORAGE_KEY, storageIdentityRef.current),
        JSON.stringify({ ...guardados, [visitaAtualId]: itemFocoId })
      );
    } catch {
      // sem armazenamento local: abre como antes
    }
  }, [ready, visitaAtualId, itemFocoId, checklistAtual]);

  useEffect(() => {
    if (!ready || view !== "checklist" || !visitaAtualId) return;
    if (itemFocoId && checklistAtual.some((item) => item.id === itemFocoId)) return;
    const guardado = lerUltimosItensDoChecklist()[visitaAtualId];
    const item = guardado ? checklistAtual.find((registro) => registro.id === guardado) : undefined;
    if (!item) return;
    setItemFocoId(item.id);
    setAmbienteChecklistAtivo(item.ambiente);
    setUltimoItemChecklistId(item.id);
  }, [ready, view, visitaAtualId, itemFocoId, checklistAtual]);
  const pendentesAmbienteAtivo = checklistAtual.filter(
    (item) =>
      item.ambiente === ambienteChecklistAtivo &&
      item.status === "Pendente"
  ).length;
  const progressoChecklist = progressoDoChecklist(checklistAtual);
  const respondidos = progressoChecklist.respondidos;
  const totalChecklist = progressoChecklist.total;
  const conformesChecklist = checklistAtual.filter((i) => i.status === "Conforme").length;
  const naoConformesChecklist = itensNaoConformes(checklistAtual);
  const naoSeAplicaChecklist = checklistAtual.filter((i) => i.status === "Não se aplica").length;
  const pendentesChecklist = checklistAtual.filter((i) => i.status === "Pendente").length;
  const percentualChecklist = progressoChecklist.percentual;
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
  const ncsAbertas = correcoesAbertas(ncsVisita);
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
  const contagemEvidencias = contagemDeEvidencias(evidenciasVisita);
  const fotosVisita = contagemEvidencias.fotos;
  const audiosVisita = contagemEvidencias.audios;
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
      `A inspeção avaliou ${qtd(itensAvaliadosVisita, "item", "itens")}, com ${qtd(conformesVisita, "conforme", "conformes")} e ${qtd(naoConformesVisita, "não conforme", "não conformes")}, resultando em ${percentualConformidade}% de conformidade entre os itens avaliados.`
    );

    if (ncsVisita.length === 0) {
      partes.push("Não foram registradas não conformidades nesta visita.");
    } else {
      partes.push(
        `${pal(ncsVisita.length, "Foi registrada", "Foram registradas")} ${qtd(ncsVisita.length, "não conformidade", "não conformidades")}: ${qtd(ncsResolvidas, "resolvida", "resolvidas")}, ${ncsEmTratamento} em tratamento e ${qtd(ncsSomenteAbertas, "aberta", "abertas")}.`
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
          `${qtd(ncsVisita.length - acoesDefinidas, "não conformidade", "não conformidades")} ainda ${pal(ncsVisita.length - acoesDefinidas, "necessita", "necessitam")} de definição de ação corretiva.`
        );
      }
    }

    if (evidenciasVisita.length > 0) {
      partes.push(
        `${pal(contagemEvidencias.total, "Foi vinculada", "Foram vinculadas")} ${qtd(contagemEvidencias.total, "evidência", "evidências")} (${contagemEvidencias.texto}) aos registros da inspeção para fins de rastreabilidade.`
      );
    }

    if (pendentesVisita > 0) {
      partes.push(
        `A inspeção permanece parcial, com ${qtd(pendentesVisita, "item pendente", "itens pendentes")} no checklist.`
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
        ? formatarDataHora(updatedAt)
        : formatarDataHora(new Date())
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
                  ? formatarDataHora(conflito.updatedAt)
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
    const avisoSemItem = avisoParaFinalizar(itensRespondidos(checklistAtual));
    if (avisoSemItem) {
      void avisar(avisoSemItem);
      return;
    }

    // Uma inspeção só pode ser marcada como concluída quando todos os itens
    // do checklist dos ambientes selecionados tiverem sido avaliados.
    // Não conformidades podem permanecer abertas, pois seguem para o pós-visita.
    if (pendentesVisita > 0) {
      void avisar(
        `Não é possível finalizar esta inspeção ainda.\n\n` +
        `${pal(pendentesVisita, "Existe", "Existem")} ${qtd(pendentesVisita, "item pendente", "itens pendentes")} no checklist.\n\n` +
        `Avalie todos os itens selecionados como Conforme, Não conforme ou Não se aplica. ` +
        `Depois disso, a inspeção poderá ser concluída normalmente.`
      );
      return;
    }

    const alertas: string[] = [];
    if (ncsSomenteAbertas > 0) alertas.push(`${qtd(ncsSomenteAbertas, "não conformidade", "não conformidades")} ${pal(ncsSomenteAbertas, "seguirá", "seguirão")} ${pal(ncsSomenteAbertas, "aberta", "abertas")} para acompanhamento`);
    if (ncsSemAcao > 0) alertas.push(`${qtd(ncsSemAcao, "não conformidade", "não conformidades")} ainda ${pal(ncsSemAcao, "está", "estão")} sem ação corretiva definida`);
    if (analisesIAPendentes > 0) alertas.push(`${qtd(analisesIAPendentes, "sugestão", "sugestões")} de análise fotográfica por IA ainda ${pal(analisesIAPendentes, "aguarda", "aguardam")} confirmação ou descarte`);
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

  // Consulta o CNPJ e devolve uma PROPOSTA: nada entra no cadastro até o RT tocar em "Usar estes dados".
  // Sem sinal ou com a consulta falhando, o cadastro manual segue normal e a consulta pode ser refeita depois.
  async function buscar() {
    if (!exigirPermissao("empresas.editar")) return;
    const c = form.cnpj.replace(/\D/g, "");
    const erro = erroDoCnpj(form.cnpj);
    if (c.length !== 14 || erro) {
      setConsultaMsg(erro || "Informe um CNPJ com 14 dígitos.");
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setConsultaMsg(mensagemDeFalhaDaConsulta(false));
      return;
    }
    setLoading(true);
    setConsultaMsg("Consultando…");
    try {
      const r = await fetch(`/api/cnpj/${c}`);
      const d = await r.json().catch(() => null);
      if (!r.ok || !d) throw new Error("falha");
      setPropostaCnpj(propostaDaConsulta(d));
      setConsultaMsg("Encontrei dados para este CNPJ. Confira e toque em “Usar estes dados”.");
    } catch {
      setPropostaCnpj(null);
      setConsultaMsg(mensagemDeFalhaDaConsulta(typeof navigator === "undefined" ? true : navigator.onLine));
    } finally {
      setLoading(false);
    }
  }

  function usarPropostaDoCnpj() {
    if (!propostaCnpj) return;
    const { valores, campos } = camposDaProposta(propostaCnpj);
    const tipo = tipoSugeridoPorCnae(propostaCnpj.cnaePrincipal.codigo, propostaCnpj.cnaesSecundarios);
    const trocaTipo = tipo.correspondencia || !form.tipo || form.tipo === "Outro";
    // MEI/empresário individual: a razão social é o nome da pessoa e NÃO é guardada; também não deixa a de uma consulta anterior misturada.
    setForm((atual) => ({ ...atual, ...valores, ...(propostaCnpj.titularPessoaFisica ? { razaoSocial: "" } : {}), ...(trocaTipo ? { tipo: tipo.rotulo } : {}) }));
    setCamposDaConsulta(trocaTipo ? [...campos, "tipo"] : campos);
    setTipoSugerido(trocaTipo);
    setCnaesSecundariosForm(propostaCnpj.cnaesSecundarios);
    setAvisoUf(propostaCnpj.ufAviso);
    setSemFantasiaNaReceita(!propostaCnpj.nomeFantasia && !propostaCnpj.titularPessoaFisica);
    setSemEmailNaConsulta(!propostaCnpj.email);
    setConsultaEmForm(new Date().toISOString());
    setConsultaMsg(propostaCnpj.titularPessoaFisica ? "Dados aplicados. Informe o nome do estabelecimento: o nome do titular não é guardado." : "Dados aplicados. Confira e edite o que precisar.");
    setPropostaCnpj(null);
  }

  function mudarCampoDaEmpresa(campo: string, valor: string) {
    if (campo === "uf") setAvisoUf("");
    if (campo === "nomeFantasia" && valor.trim()) setSemFantasiaNaReceita(false);
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setCamposDaConsulta((atual) => (atual.includes(campo) ? atual.filter((item) => item !== campo) : atual));
  }

  // Pacote do tipo de estabelecimento: ambientes, equipamentos e fluxos propostos; só entra o que o RT deixou marcado.
  function aplicarPacoteDoTipo(escolha: EscolhaDoPacote) {
    setPacoteDesfazer({ setores: setoresEmpresa, equipamentos: equipamentosEmpresa, fluxos: fluxosEmpresa });
    const setoresNovos = [...setoresEmpresa, ...escolha.ambientes.filter((ambiente) => !setoresEmpresa.includes(ambiente))];
    setSetoresEmpresa(setoresNovos);
    const novos = equipamentosDoPacote(escolha.equipamentos, setoresNovos, equipamentosEmpresa, () => crypto.randomUUID(), (nome) => limiteSugeridoParaEquipamento(nome)?.id);
    if (novos.length) setEquipamentosEmpresa([...equipamentosEmpresa, ...novos]);
    // O setor de cada fluxo é o que o RT deixou na janela; fluxo sem setor ("") não soma perguntas até ele escolher.
    setFluxosEmpresa(fluxosEmpresa.map((fluxo) => (escolha.fluxos.includes(fluxo.tipo) ? { ...fluxo, aplicavel: true, ...(escolha.setorDosFluxos && fluxo.tipo in escolha.setorDosFluxos ? { setorVinculado: escolha.setorDosFluxos[fluxo.tipo] || "" } : {}) } : fluxo)));
  }

  function desfazerPacoteDoTipo() {
    if (!pacoteDesfazer) return;
    setSetoresEmpresa(pacoteDesfazer.setores);
    setEquipamentosEmpresa(pacoteDesfazer.equipamentos);
    setFluxosEmpresa(pacoteDesfazer.fluxos);
    setPacoteDesfazer(null);
  }

  // Digitou os 14 dígitos (válidos) de um CNPJ novo: consulta sozinho, uma vez por número, e só se houver sinal.
  useEffect(() => {
    if (editingEmpresaId || !showEmpresaForm) return;
    const c = form.cnpj.replace(/\D/g, "");
    if (c.length !== 14 || erroDoCnpj(form.cnpj) || cnpjConsultadoRef.current === c) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    cnpjConsultadoRef.current = c;
    void buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.cnpj, editingEmpresaId, showEmpresaForm]);

  function salvarEmpresa() {
    if (!exigirPermissao("empresas.editar")) return;
    setTentouSalvarEmpresa(true);
    const faltasDaEmpresa = pendenciasParaSalvarEmpresa(form, Boolean(editingEmpresaId));
    if (faltasDaEmpresa.length) {
      setMsg(faltasDaEmpresa.join(" "));
      return;
    }
    if (Object.keys(validarCapacidade(capacidadeForm)).length) {
      void avisar("Confira os números de capacidade e turnos antes de salvar.");
      return;
    }
    const id = editingEmpresaId || form.cnpj.replace(/\D/g, "") || crypto.randomUUID();
    const anterior = editingEmpresaId ? db.empresas[editingEmpresaId] : undefined;
    // Responsável do estabelecimento: fonte única em Dados. Só o Administrador escolhe a pessoa de Acessos (o servidor repete a regra).
    const vinculoResponsavel = !usuarioDaSessao || usuarioDaSessao.perfil === "Administrador" ? usuarioResponsavelForm || undefined : anterior?.responsavelEstabelecimento?.usuarioId;
    // Com acesso vinculado, nome e cargo vêm do usuário (se ele não tiver cargo, vale o que foi informado aqui).
    const usuarioVinculado = vinculoResponsavel ? db.usuarios.find((pessoa) => pessoa.id === vinculoResponsavel) : undefined;
    const nomeResponsavel = limparTextoDePessoa(usuarioVinculado ? usuarioVinculado.nome : form.responsavel);
    const cargoResponsavel = limparTextoDePessoa(limparTextoDePessoa(usuarioVinculado?.cargo) || form.cargoResponsavel);
    const emp: Empresa = {
      id,
      ...form,
      cnpj: editingEmpresaId ? (anterior?.cnpj || form.cnpj) : form.cnpj,
      nomeFantasia: form.nomeFantasia || form.razaoSocial || "Sem nome",
      horariosFuncionamento: anterior?.horariosFuncionamento,
      capacidade: capacidadeDoFormulario(capacidadeForm),
      responsabilidadesManual: normalizarResponsabilidades(responsabilidadesEmpresa),
      setoresManual: setoresEmpresa,
      modelosQuestionarioAmbientes: criarModelosQuestionarioAmbientes(
        setoresEmpresa,
        { ...(anterior?.modelosQuestionarioAmbientes || {}), ...modelosEmpresa }
      ),
      ...(Object.keys(limparVinculos(vinculosEmpresa, setoresEmpresa)).length ? { setorOficialDoAmbiente: limparVinculos(vinculosEmpresa, setoresEmpresa) } : {}),
      ...(cnaesSecundariosForm.length ? { cnaesSecundarios: cnaesSecundariosForm } : {}),
      ...(consultaEmForm ? { consultaCnpjEm: consultaEmForm } : {}),
      equipamentosSetores: normalizarEquipamentos(equipamentosEmpresa),
      fluxosOperacionais: adequarFluxosAosSetores(fluxosEmpresa, setoresEmpresa),
      programasControleQualidade: normalizarProgramasControle(programasEmpresa),
      pops: normalizarPops(popsEmpresa),
      criadoEm: anterior?.criadoEm || new Date().toISOString(),
      cor: form.cor || (anterior ? anterior.cor : proximaCorLivre(Object.values(db.empresas))),
      ...(anterior
        ? {
            arquivada: anterior.arquivada,
            arquivadaEm: anterior.arquivadaEm,
            privacidade: anterior.privacidade,
            normasAplicadas: anterior.normasAplicadas,
            normasConfirmadasPeloRt: anterior.normasConfirmadasPeloRt,
            responsavelEstabelecimento: anterior.responsavelEstabelecimento,
            guardaRegistrosDias: anterior.guardaRegistrosDias,
            questionarios: anterior.questionarios,
            capaDosPops: anterior.capaDosPops,
            cartazLavagem: anterior.cartazLavagem,
            cadastrosRevisados: anterior.cadastrosRevisados,
            registroProvaPorPop: anterior.registroProvaPorPop,
            // Empresa cadastrada antes do "Colocar em dia" não ganha o cartão: o campo só existe em empresa nova.
            ...(anterior.implantacao ? { implantacao: anterior.implantacao } : {}),
          }
        : { implantacao: implantacaoDeEmpresaNova(new Date().toISOString()) }),
      responsavelEstabelecimento:
        nomeResponsavel || cargoResponsavel || vinculoResponsavel
          ? { nome: nomeResponsavel, cargo: cargoResponsavel, ...(vinculoResponsavel ? { usuarioId: vinculoResponsavel } : {}) }
          : undefined,
    };
    setDb((o) => {
      const base: AppDB = {
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
      };
      // Ambiente renomeado: o nome novo entra também em visitas, não conformidades, evidências, registros de POP e questionário personalizado.
      return renomeacoesPendentes.reduce((atual, troca) => renomearAmbiente(atual, id, troca.de, troca.para), base);
    });
    setRenomeacoesPendentes([]);
    setAssinaturaEmpresaSalva(assinaturaEmpresaAtual);
    setEditingEmpresaId(id);
    setEmpresaSecao(null);
    setShowEmpresaForm(true);
    setMsg("");
    setView("empresas");
  }

  // Renomear ambiente próprio: mostra quantos registros serão afetados antes de confirmar; o formulário muda já, o resto ao Salvar.
  async function renomearAmbienteDaEmpresa(de: string, para: string): Promise<boolean> {
    const novo = para.trim();
    if (!editingEmpresaId || !novo || novo === de) return false;
    const resumo = resumoDaRenomeacao(db, editingEmpresaId, de);
    const confirmado = await confirmar(
      `Renomear “${de}” para “${novo}”?\n\n${textoDoResumo(resumo)}\n\nOs relatórios já emitidos não mudam. A troca vale ao salvar.`,
      { titulo: "Renomear ambiente", confirmarRotulo: "Renomear" }
    );
    if (!confirmado) return false;
    const troca = (nome: string) => (nome === de ? novo : nome);
    setSetoresEmpresa((atual) => atual.map(troca));
    setEquipamentosEmpresa((atual) => atual.map((item) => (item.setor === de ? { ...item, setor: novo } : item)));
    setFluxosEmpresa((atual) => atual.map((item) => (item.setorVinculado === de ? { ...item, setorVinculado: novo } : item)));
    setVinculosEmpresa((atual) => (de in atual ? Object.fromEntries(Object.entries(atual).map(([nome, oficial]) => [troca(nome), oficial])) : atual));
    setModelosEmpresa((atual) => (de in atual ? Object.fromEntries(Object.entries(atual).map(([nome, modelo]) => [troca(nome), modelo])) : atual));
    setRenomeacoesPendentes((atual) => {
      const anterior = atual.find((item) => item.para === de);
      return anterior ? atual.map((item) => (item === anterior ? { de: item.de, para: novo } : item)) : [...atual, { de, para: novo }];
    });
    return true;
  }

  // RT da empresa para preencher a identificação do Manual: a pessoa logada (se for RT) ou o primeiro RT com acesso à empresa.
  function usuarioRtDaEmpresa(empresa: Empresa) {
    if (usuarioDaSessao?.perfil === "Consultor/RT") return usuarioDaSessao;
    return db.usuarios.find((pessoa) => pessoa.perfil === "Consultor/RT" && pessoa.status !== "Suspenso" && pessoa.empresaIds.includes(empresa.id));
  }

  function editarEmpresa(empresa: Empresa) {
    if (!exigirPermissao("empresas.editar", empresa.id)) return;
    const rtDaEmpresa = usuarioRtDaEmpresa(empresa);
    const prefillRt = prefillDoPerfilDoRt(
      { consultorNome: empresa.consultorNome, consultorTelefone: empresa.consultorTelefone, consultorRegistro: empresa.consultorRegistro },
      rtDaEmpresa,
      (cargo, crn) => nomeECargo(cargo, crn, " ")
    );
    const formCarregado = {
      cor: corDaEmpresa(empresa),
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
      responsavel: responsavelEfetivo(empresa, db.usuarios).nome,
      horarioFuncionamento:
        empresa.horarioFuncionamento ||
        (empresa.horariosFuncionamento?.some((item) => item.aberto)
          ? resumirHorarioFuncionamento(empresa.horariosFuncionamento)
          : ""),
      atividadeDescricao: empresa.atividadeDescricao || "",
      cargoResponsavel: responsavelEfetivo(empresa, db.usuarios).cargo,
      // Identificação do Consultor/RT: só o que estiver em branco vem do perfil do RT (nome, telefone, cargo e CRN); o digitado nunca é trocado.
      consultorNome: empresa.consultorNome || prefillRt.valores.consultorNome || "",
      consultorCpfCnpj: empresa.consultorCpfCnpj || "",
      consultorEndereco: empresa.consultorEndereco || "",
      consultorTelefone: empresa.consultorTelefone || prefillRt.valores.consultorTelefone || "",
      consultorRegistro: empresa.consultorRegistro || prefillRt.valores.consultorRegistro || "",
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
    setCamposDoPerfilRt(prefillRt.doPerfil);
    setCapacidadeForm(capacidadeParaFormulario(empresa.capacidade));
    setResponsabilidadesEmpresa(responsabilidadesCarregadas);
    setSetoresEmpresa(setoresCarregados);
    setVinculosEmpresa(limparVinculos(empresa.setorOficialDoAmbiente, setoresCarregados));
    setModelosEmpresa(empresa.modelosQuestionarioAmbientes || {});
    setRenomeacoesPendentes([]);
    setTocouNomeEmpresa(false);
    setTocouCnpjEmpresa(false);
    setTentouSalvarEmpresa(false);
    setPropostaCnpj(null);
    setConsultaMsg("");
    setCamposDaConsulta([]);
    setTipoSugerido(false);
    setCnaesSecundariosForm(empresa.cnaesSecundarios || []);
    setAvisoUf("");
    setConsultaEmForm(empresa.consultaCnpjEm || "");
    setPacoteDesfazer(null);
    cnpjConsultadoRef.current = form.cnpj.replace(/\D/g, "");
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
      vinculos: limparVinculos(empresa.setorOficialDoAmbiente, setoresCarregados),
      modelos: empresa.modelosQuestionarioAmbientes || {},
      pops: popsCarregados,
    }));
    setUsuarioResponsavelForm(empresa.responsavelEstabelecimento?.usuarioId || "");
    // A Central trabalha na empresa aberta: comprovantes, pessoas e registros usam a empresa ativa.
    setDb((o) => (o.empresaAtualId === empresa.id ? o : { ...o, empresaAtualId: empresa.id }));
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
    setVf({ data: hojeISO(), responsavel: usuarioDaSessao?.nome || sessaoAtual?.name || "", responsavelIdentificacao: "", observacoes: "" });
    setShowVisitaForm(true);
    setView("visitas");
  }

  // Nova visita pelo grupo da empresa: a empresa do grupo vira a ativa e a visita já nasce nela.
  function novaVisitaDaEmpresa(empresaId: string) {
    if (!db.empresas[empresaId] || !exigirPermissao("visitas.criar", empresaId)) return;
    setDb((o) => (o.empresaAtualId === empresaId ? o : { ...o, empresaAtualId: empresaId }));
    setVf({ data: hojeISO(), responsavel: usuarioDaSessao?.nome || sessaoAtual?.name || "", responsavelIdentificacao: "", observacoes: "" });
    setShowVisitaForm(true);
    setView("visitas");
  }

  // Arquivar tira a visita da lista sem apagar nada (visita abandonada); vale para quem pode concluir visitas.
  function arquivarVisita(id: string, arquivar: boolean) {
    const visita = db.visitas.find((item) => item.id === id);
    if (!visita || !exigirPermissao("visitas.concluir", visita.empresaId)) return;
    const agora = new Date().toISOString();
    const registro = criarRegistroAuditoria(
      {
        usuarioId: usuarioDaSessao?.id || "local",
        usuarioNome: usuarioDaSessao?.nome || "Usuário local",
        acao: arquivar ? "visita.arquivada" : "visita.desarquivada",
        entidade: "Visita",
        entidadeId: id,
        empresaId: visita.empresaId,
        detalhes: `${nomeParaExibir(db.empresas[visita.empresaId])} • visita de ${fdata(visita.data)} ${arquivar ? "arquivada" : "desarquivada"}.`,
      },
      agora
    );
    setDb((o) => ({
      ...o,
      visitas: o.visitas.map((item) => (item.id === id ? (arquivar ? { ...item, arquivada: true, arquivadaEm: agora } : { ...item, arquivada: false, arquivadaEm: undefined }) : item)),
      registrosAuditoria: [...o.registrosAuditoria, registro],
    }));
    mostrarToast(arquivar ? "Visita arquivada" : "Visita desarquivada");
    if (arquivar && visitaAtualId === id) setVisitaAtualId(null);
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
      const iniciais = ambientesIniciais(ambientesParaVisita(atual.setoresManual || [], atual.setorOficialDoAmbiente), db.visitas, atual.id, v.id);
      setAmbientesSelecionados(iniciais);
      setModelosAmbientesSelecionados(criarModelosQuestionarioAmbientes(iniciais, atual.modelosQuestionarioAmbientes, atual.setorOficialDoAmbiente));
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

  function continuar(id: string, retomarChecklist = false, destino?: ItemDeDestino) {
    const original = db.visitas.find((x) => x.id === id);
    const v = original ? migrarVisitaParaChecklistManual(original, CHECKLIST_VERSAO_ATUAL, true) : undefined;
    if (!v) return;
    if (!podeAbrirVisita(v.empresaId)) {
      void avisar("Seu perfil não possui permissão para abrir esta visita.");
      return;
    }
    const empresaDaVisita = db.empresas[v.empresaId];

    if (retomarChecklist && !(v.ambientes || []).length && nivelDe("ambientes") === "oculta") {
      // Quem não tem a tela Ambientes (Executor de campo) abre a visita sem erro; o responsável define os ambientes.
      setDb((o) => ({ ...o, empresaAtualId: v.empresaId, visitas: o.visitas.map((visita) => (visita.id === v.id ? v : visita)) }));
      setVisitaAtualId(id);
      setView("checklist");
      return;
    }

    if (retomarChecklist && !(v.ambientes || []).length) {
      const ambientesDaPartida = ambientesIniciais(ambientesParaVisita(empresaDaVisita?.setoresManual || [], empresaDaVisita?.setorOficialDoAmbiente), db.visitas, v.empresaId, v.id);
      setDb((o) => ({
        ...o,
        empresaAtualId: v.empresaId,
        visitas: o.visitas.map((visita) => visita.id === v.id ? v : visita),
      }));
      setVisitaAtualId(id);
      setAmbientesSelecionados(ambientesDaPartida);
      setModelosAmbientesSelecionados(criarModelosQuestionarioAmbientes(ambientesDaPartida, empresaDaVisita?.modelosQuestionarioAmbientes, empresaDaVisita?.setorOficialDoAmbiente));
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
            v.modelosQuestionarioAmbientes || empresaDaVisita?.modelosQuestionarioAmbientes,
            empresaDaVisita?.questionarios
          )
        : checklistExistente;
      visitaDestino = { ...v, checklist: checklistDestino, checklistVersao: CHECKLIST_VERSAO_ATUAL };
      const primeiraPendente = checklistDestino.find((item) => item.status === "Pendente");
      const itemRetomada = checklistDestino.find((item) => item.id === ultimoItemChecklistId);
      const itemEscolhido = destino ? acharItemDeDestino(checklistDestino, destino) : undefined;
      const itemDestino = itemEscolhido || primeiraPendente || itemRetomada || checklistDestino[0];
      if (itemEscolhido) setItemFocoId(itemEscolhido.id);
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
    const ambientesDaPartida = visitaAtual.ambientes?.length
      ? visitaAtual.ambientes
      : ambientesIniciais(ambientesParaVisita(empresaVisita?.setoresManual || [], empresaVisita?.setorOficialDoAmbiente), db.visitas, visitaAtual.empresaId, visitaAtual.id);
    setAmbientesSelecionados(ambientesDaPartida);
    setModelosAmbientesSelecionados(
      criarModelosQuestionarioAmbientes(
        ambientesDaPartida,
        visitaAtual.modelosQuestionarioAmbientes || empresaVisita?.modelosQuestionarioAmbientes,
        empresaVisita?.setorOficialDoAmbiente
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
    const proximosModelos = criarModelosQuestionarioAmbientes(proximos, modelos, empresaVisita?.setorOficialDoAmbiente);
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
          proximosModelos,
          empresaVisita?.questionarios
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

  function adicionarPersonalizado(salvarNoCadastro = false) {
    const nome = ambientePersonalizado.trim();
    if (!nome) return;
    // Nome que já existe no Cadastro ou entre os setores oficiais não entra duplicado (a tela avisa na hora, no campo).
    if (nomeJaExistente(nome, [...(empresaVisita?.setoresManual || []), ...ambientesSelecionados])) return;
    if (salvarNoCadastro && empresaVisita) {
      const empresaId = empresaVisita.id;
      setDb((o) => {
        const empresa = o.empresas[empresaId];
        if (!empresa) return o;
        const setoresNovos = normalizarListaAmbientesReais([...(empresa.setoresManual || []), nome]);
        return {
          ...o,
          empresas: {
            ...o.empresas,
            [empresaId]: {
              ...empresa,
              setoresManual: setoresNovos,
              modelosQuestionarioAmbientes: criarModelosQuestionarioAmbientes(setoresNovos, empresa.modelosQuestionarioAmbientes, empresa.setorOficialDoAmbiente),
            },
          },
        };
      });
    }
    atualizarAmbientesDaVisita([...ambientesSelecionados, nome]);
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
    if (!visitaAtual) return;
    if (!(visitaAtual.ambientes || []).length) {
      // Sem ambientes o checklist não tem o que mostrar: avisa e leva à escolha dos ambientes da visita.
      mostrarToast("Escolha os ambientes da visita para abrir o checklist.", { tipo: "aviso", duracaoMs: 3500 });
      setView("ambientes");
      return;
    }
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
        visitaMigrada.modelosQuestionarioAmbientes || empresaVisita?.modelosQuestionarioAmbientes,
        empresaVisita?.questionarios
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
        `Ainda há ${qtd(pendentesAmbienteAtivo, "pergunta pendente", "perguntas pendentes")} neste ambiente. Deseja avançar mesmo assim?`,
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
      `${qtd(respondidos.length, "resposta voltará", "respostas voltarão")} para Pendente. ` +
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
    patch: Partial<Pick<ChecklistItem, "status" | "observacao" | "criticidade" | "criticidadeSugerida" | "temperatura" | "porVoz">>
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
          // Responder o item (de qualquer forma) tira a marca de "resposta em lote".
          if (patch.status !== undefined && item.lote) patchNormalizado.lote = undefined;
          if (patch.status !== undefined && item.porVoz && patch.porVoz === undefined) patchNormalizado.porVoz = undefined;

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

  async function limparRespostaDoItem(itemId: string) {
    if (!visitaAtual) return;
    if (!exigirPermissao("visitas.executar", visitaAtual.empresaId)) return;
    const item = (visitaAtual.checklist || []).find((registro) => registro.id === itemId);
    if (!item || item.status === "Pendente") return;
    const nc = (db.ncs || []).find((registro) => registro.id === `${visitaAtual.id}:${item.id}`);
    const evidenciasDoItem = (db.evidencias || []).filter((evidencia) => evidencia.visitaId === visitaAtual.id && evidencia.checklistItemId === item.id);
    const extras = dadosExtrasDoItem(item, evidenciasDoItem, nc);
    if (extras.length > 0) {
      const confirmado = await confirmar(
        `Esta resposta tem ${listaEmTexto(extras)}. Ao limpar, o item volta a "Pendente"${nc && !nc.inativaNoChecklist ? " e a Correção ligada a ele fica como \"Cancelada pelo usuário\"" : ""}. As fotos e os áudios continuam nas Evidências da visita.`,
        { titulo: "Limpar a resposta?", confirmarRotulo: "Limpar resposta", cancelarRotulo: "Manter", perigoso: true }
      );
      if (!confirmado) return;
    }
    const visitaId = visitaAtual.id;
    setDb((o) => {
      const atualNoEstado = (o.visitas.find((v) => v.id === visitaId)?.checklist || []).find((registro) => registro.id === itemId);
      if (!atualNoEstado) return o;
      const resultado = limparResposta(o.ncs || [], { id: visitaId }, atualNoEstado, new Date().toISOString());
      const visitas = o.visitas.map((v) => {
        if (v.id !== visitaId) return v;
        const checklist = (v.checklist || []).map((registro) => (registro.id === itemId ? resultado.item : registro));
        const pct = checklist.length ? Math.round((checklist.filter((i) => i.status !== "Pendente").length / checklist.length) * 100) : 0;
        return { ...v, checklist, progresso: Math.max(15, Math.min(55, 15 + Math.round(pct * 0.4))) };
      });
      return { ...o, visitas, ncs: resultado.ncs };
    });
    setItemFocoId(itemId);
    setRespostaLimpa({ visitaId, item: { ...item }, nc: nc ? { ...nc } : undefined });
    if (respostaLimpaTimerRef.current) window.clearTimeout(respostaLimpaTimerRef.current);
    respostaLimpaTimerRef.current = window.setTimeout(() => setRespostaLimpa(null), 6000);
  }

  function desfazerLimparResposta() {
    const instantaneo = respostaLimpa;
    if (!instantaneo) return;
    if (respostaLimpaTimerRef.current) window.clearTimeout(respostaLimpaTimerRef.current);
    setRespostaLimpa(null);
    setDb((o) => {
      const volta = desfazerLimpeza(o.ncs || [], instantaneo);
      const visitas = o.visitas.map((v) => {
        if (v.id !== instantaneo.visitaId) return v;
        const checklist = (v.checklist || []).map((registro) => (registro.id === instantaneo.item.id ? volta.item : registro));
        const pct = checklist.length ? Math.round((checklist.filter((i) => i.status !== "Pendente").length / checklist.length) * 100) : 0;
        return { ...v, checklist, progresso: Math.max(15, Math.min(55, 15 + Math.round(pct * 0.4))) };
      });
      return { ...o, visitas, ncs: volta.ncs };
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

  // "POPs e documentos": uma porta só, Central › Documentos › POPs da empresa ativa (sem empresa, pede para escolher).
  function abrirPopsPeloAtalho() {
    abrirDocumentos("pops");
  }

  // abrirCamera=false (caixa inteligente): só leva à tela de captura, sem tentar abrir a câmera.
  // Atalho do celular (Mais e seletor de empresa): vai direto ao formulário de empresa nova.
  function abrirNovaEmpresaPeloMenu() {
    setMenuMaisAberto(false);
    if (!exigirPermissao("empresas.editar")) return;
    setView("empresas");
    iniciarNovaEmpresa();
  }

  function iniciarNovaEmpresa() {
    const responsabilidadesIniciais = criarResponsabilidadesPadrao();
    const fluxosIniciais = criarFluxosOperacionaisPadrao();
    const programasIniciais = criarProgramasControlePadrao();
    const formNovo = { ...formEmpresaVazio, cor: proximaCorLivre(Object.values(db.empresas)) };
    setEditingEmpresaId(null);
    setForm(formNovo);
    setCapacidadeForm(CAPACIDADE_VAZIA);
    setResponsabilidadesEmpresa(responsabilidadesIniciais);
    setSetoresEmpresa([]);
    setVinculosEmpresa({});
    setModelosEmpresa({});
    setRenomeacoesPendentes([]);
    setTocouNomeEmpresa(false);
    setTocouCnpjEmpresa(false);
    setTentouSalvarEmpresa(false);
    setPropostaCnpj(null);
    setConsultaMsg("");
    setCamposDaConsulta([]);
    setTipoSugerido(false);
    setCnaesSecundariosForm([]);
    setAvisoUf("");
    setSemFantasiaNaReceita(false);
    setSemEmailNaConsulta(false);
    setConsultaEmForm("");
    setPacoteDesfazer(null);
    cnpjConsultadoRef.current = "";
    setCamposDoPerfilRt([]);
    setEquipamentosEmpresa([]);
    setFluxosEmpresa(fluxosIniciais);
    setProgramasEmpresa(programasIniciais);
    setPopsEmpresa([]);
    setAssinaturaEmpresaSalva(assinaturaEdicaoEmpresa({
      form: formNovo,
      responsabilidades: responsabilidadesIniciais,
      setores: [],
      equipamentos: [],
      fluxos: fluxosIniciais,
      programas: programasIniciais,
      pops: [],
    }));
    setUsuarioResponsavelForm("");
    setEmpresaSecao("dados");
    setMsg("");
    setShowEmpresaForm(true);
  }

  // Lista plana na ordem da visita: base do "um item por vez" (Campo e Equilibrado).
  // Checklist adaptativo: usa só as últimas visitas da empresa que já estão no aparelho.
  function adaptativoDaVisita() {
    const base = (() => {
      const ordem = infosAmbientes.map((info) => info.nome);
      const lista = checklistAtual;
      const ordenados = ordem.flatMap((nome) => lista.filter((item) => item.ambiente === nome));
      // Itens de um ambiente que não está na lista não somem: entram no fim, para o total bater com o do menu.
      const nomes = new Set(ordem);
      return [...ordenados, ...lista.filter((item) => !nomes.has(item.ambiente))];
    })();
    const anteriores = visitaAtual
      ? db.visitas
          .filter((visita) => visita.empresaId === visitaAtual.empresaId && visita.id !== visitaAtual.id && visita.data <= visitaAtual.data && !visita.arquivada)
          .sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm))
          .slice(0, VISITAS_RECENTES)
      : [];
    return ordemAdaptativa(base, anteriores);
  }

  function itensEmOrdem(): ChecklistItem[] {
    return adaptativoDaVisita().itens;
  }

  // Marcar o restante do ambiente como Conforme: confirma com o número, registra como lote e deixa desfazer por 12 s.
  function planoDoLoteDoAmbiente(ambiente: string) {
    return planoDoLote(visitaAtual?.checklist || [], ambiente, adaptativoDaVisita().reprovaram);
  }

  async function marcarRestanteDoAmbiente(ambiente: string) {
    if (!visitaAtual || !exigirPermissao("visitas.executar", visitaAtual.empresaId)) return;
    const plano = planoDoLoteDoAmbiente(ambiente);
    if (plano.marcar.length === 0) return;
    const rotulo = nomeDeExibicaoDoAmbiente(ambiente);
    const ok = await confirmar(textoDaConfirmacaoDoLote(rotulo, plano), { titulo: "Marcar o restante como Conforme", confirmarRotulo: `Marcar ${plano.marcar.length}` });
    if (!ok) return;
    const visitaId = visitaAtual.id;
    const em = new Date().toISOString();
    const ids = plano.marcar.map((item) => item.id);
    setDb((o) => ({ ...o, visitas: o.visitas.map((v) => (v.id === visitaId ? { ...v, checklist: aplicarLote(v.checklist || [], ids, em) } : v)) }));
    const texto = `${ids.length === 1 ? "1 item marcado" : `${ids.length} itens marcados`} como Conforme em lote.`;
    setLoteParaDesfazer({ visitaId, ids, em, texto });
    window.setTimeout(() => setLoteParaDesfazer((atual) => (atual && atual.em === em ? null : atual)), 12000);
  }

  // Ditado do ambiente: só o que o RT confirmou na tela de conferência; as respostas ficam marcadas "por voz" no relatório.
  function gravarDitadoDoAmbiente(propostas: PropostaDeVoz[]) {
    for (const proposta of propostas) {
      if (!proposta.itemId || !proposta.status) continue;
      atualizarChecklistItem(proposta.itemId, {
        status: proposta.status,
        ...(proposta.status === "Não Conforme" ? { observacao: proposta.observacao } : {}),
        ...(proposta.temperatura ? { temperatura: proposta.temperatura } : {}),
        porVoz: true,
      });
    }
    mostrarToast(propostas.length === 1 ? "1 resposta gravada por voz." : `${propostas.length} respostas gravadas por voz.`);
  }

  function desfazerOLote() {
    const lote = loteParaDesfazer;
    if (!lote) return;
    setDb((o) => ({ ...o, visitas: o.visitas.map((v) => (v.id === lote.visitaId ? { ...v, checklist: desfazerLote(v.checklist || [], lote.ids, lote.em) } : v)) }));
    setLoteParaDesfazer(null);
  }

  // Fila numerada do ambiente com o selo de "reprovou antes" e os itens recolhidos (Não se aplica em todas as visitas recentes).
  function filaDoAmbiente(doAmbiente: ChecklistItem[]) {
    const { reprovaram, recolhidos } = adaptativoDaVisita();
    return doAmbiente.map((item) => ({ id: item.id, status: item.status, reprovou: reprovaram.has(item.id), recolhido: recolhidos.has(item.id) }));
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

  // Temperatura no item: classifica pelo limite da norma na hora; o RT pode corrigir a resposta.
  function dadosDeTemperaturaDoItem(foco: ChecklistItem) {
    return {
      equipamentosDoAmbiente: (empresaVisita?.equipamentosSetores || []).filter((equipamento) => equipamento.setor === foco.ambiente).map((equipamento) => equipamento.nome),
      limitesDosEquipamentos: (empresaVisita?.equipamentosSetores || []).filter((equipamento) => equipamento.setor === foco.ambiente && equipamento.limiteTemperaturaId && equipamento.limiteConfirmado).map((equipamento) => equipamento.limiteTemperaturaId as string),
      onTemperatura: (medida: { valor: number; limiteId: string } | null, resultado: "Conforme" | "Não Conforme" | null) => {
        setItemFocoId(foco.id);
        atualizarChecklistItem(foco.id, { temperatura: medida || undefined, ...(resultado ? { status: resultado, ...(resultado !== "Não Conforme" ? { observacao: "" } : {}) } : {}) });
      },
    };
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
    // Modo caminhada: ao passar para outro ambiente, diz qual é.
    if (passo === 1 && alvo.ambiente !== atual.ambiente) mostrarToast(`Próximo ambiente: ${nomeDeExibicaoDoAmbiente(alvo.ambiente)}`);
    setItemFocoId(alvo.id);
    setAmbienteChecklistAtivo(alvo.ambiente);
    setUltimoItemChecklistId(alvo.id);
  }

  // Avanço automático: a resposta ("Conforme" ou "Não se aplica") já foi gravada; abre o próximo item e avisa com "Desfazer".
  function avancarAposResponder(item: ChecklistItem, status: ChecklistStatus) {
    const lista = itensEmOrdem();
    const alvo = lista[lista.findIndex((registro) => registro.id === item.id) + 1];
    const doAmbiente = lista.filter((registro) => registro.ambiente === item.ambiente);
    const proximoAmbiente = alvo && alvo.ambiente !== item.ambiente ? nomeDeExibicaoDoAmbiente(alvo.ambiente) : "";
    const desfazer = () => {
      setItemFocoId(item.id);
      setAmbienteChecklistAtivo(item.ambiente);
      setUltimoItemChecklistId(item.id);
      atualizarChecklistItem(item.id, { status: "Pendente" });
    };
    mostrarToast(
      textoDoAvanco({ posNoAmbiente: doAmbiente.findIndex((registro) => registro.id === item.id) + 1, status, proximoAmbiente, fimDaLista: !alvo }),
      { duracaoMs: DURACAO_DO_AVISO_DO_AVANCO_MS, acao: { rotulo: "Desfazer", aoClicar: desfazer } }
    );
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
    if (abrirCamera) pedirAvisoDeFotoRef.current(() => registrarInputRef.current?.click());
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

  // Foto tirada dentro do item do checklist: vira evidência já ligada a este ambiente e item (e à NC dele, se houver).
  async function salvarFotoDoItem(item: ChecklistItem, arquivo: File): Promise<string | null> {
    if (!visitaAtual) return null;
    const ncDoItem = (db.ncs || []).find(
      (nc) => nc.visitaId === visitaAtual.id && nc.checklistItemId === item.id && !nc.inativaNoChecklist
    );
    const evidenciaId = crypto.randomUUID();
    const ok = await adicionarEvidencia(
      arquivo,
      "Foto",
      { ambiente: item.ambiente, checklistItemId: item.id, ncId: ncDoItem?.id || "" },
      { descricao: "", evidenciaId }
    );
    if (!ok) return null;
    setUltimoItemChecklistId(item.id);
    return evidenciaId;
  }

  // Apaga o arquivo daquela evidência no armazenamento (LGPD). Se falhar, a ação do usuário segue; não registra URL.
  function apagarArquivoDaEvidenciaNaNuvem(evidencia?: Evidencia) {
    const caminho = evidencia?.blobPathname;
    if (!caminho) return;
    void fetch(`/api/evidencias/file?pathname=${encodeURIComponent(caminho)}`, { method: "DELETE" })
      .then((resposta) => {
        if (!resposta.ok) console.error("Não foi possível apagar o arquivo de uma evidência no armazenamento.");
      })
      .catch(() => console.error("Não foi possível apagar o arquivo de uma evidência no armazenamento."));
  }

  // Desfazer da foto do item: tira só a evidência recém-criada (um único id), sem mexer nas demais.
  function desfazerFotoDoItem(evidenciaId: string) {
    void fila.descartar(evidenciaId);
    apagarArquivoDaEvidenciaNaNuvem((db.evidencias || []).find((ev) => ev.id === evidenciaId));
    setDb((o) => {
      const atualizado: AppDB = { ...o, evidencias: (o.evidencias || []).filter((ev) => ev.id !== evidenciaId) };
      salvarDBLocal(atualizado);
      return atualizado;
    });
  }

  function vincularFotoAguardandoAoItem(item: ChecklistItem, ncId: string) {
    if (!fotoAguardando) return;
    const arquivo = fotoAguardando;
    setFotoAguardando(null);
    setView("evidencias");
    void adicionarEvidencia(arquivo, "Foto", { ambiente: item.ambiente, checklistItemId: item.id, ncId });
  }

  // "Trocar para [empresa] e abrir [destino]": só depois da confirmação por clique na busca. Segue o mesmo caminho do seletor "Empresa ativa"
  // (avisa da fila offline, troca a empresa e zera a visita aberta) e abre o destino quando a nova empresa já é a ativa.
  const destinoAposTrocaRef = useRef<{ empresaId: string; destino: Destino } | null>(null);
  async function trocarEmpresaEAbrir(empresaId: string, destino: Destino) {
    if (!podeAcessarEmpresa(usuarioDaSessao, empresaId) && usuarioDaSessao) return;
    if (empresaId === db.empresaAtualId) {
      escolherDestinoDaCaixa(destino);
      return;
    }
    if (!(await confirmarComFila("trocar"))) return;
    destinoAposTrocaRef.current = { empresaId, destino };
    setDb((o) => ({ ...o, empresaAtualId: empresaId }));
    setVisitaAtualId(null);
  }
  useEffect(() => {
    const pendente = destinoAposTrocaRef.current;
    if (!pendente || db.empresaAtualId !== pendente.empresaId) return;
    destinoAposTrocaRef.current = null;
    escolherDestinoDaCaixa(pendente.destino);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.empresaAtualId]);

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
      case "central":
        abrirDocumentosOuCentral(acao.subaba);
        return;
      case "popsvisita": {
        const alvo = visitaAtual || visitaEmAndamentoDestaque;
        if (!alvo) {
          setView("visitas");
          return;
        }
        setVisitaAtualId(alvo.id);
        setView("popsvisita");
        return;
      }
      case "relatorios":
        irParaRelatorios(acao.aba);
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
      subtituloDaLista={correcoesDaEmpresa ? `${nomeSemNumerosNoInicio(nomeParaExibir(empresaVisita))} · todas as visitas` : `${nomeSemNumerosNoInicio(nomeParaExibir(empresaVisita))}`}
      onSalvarPlano={(id, dados) =>
        atualizarNC(id, { acaoCorretiva: dados.acao, responsavelAcao: dados.responsavel, prazo: dados.prazo, ...(dados.causaRaiz !== undefined ? { causaRaiz: dados.causaRaiz } : {}), status: dados.etapa === "acompanhamento" ? "Em tratamento" : "Aberta" })
      }
      onMarcarFeita={(id) => marcarCorrecaoComoFeita(id, "")}
      onDesfazerFeita={desfazerCorrecaoFeita}
      onLote={(ids, valores) => alteracoesEmLote(ncsDaTelaDeCorrecoes(), ids, valores).forEach((alteracao) => atualizarNC(alteracao.id, alteracao.patch))}
      onVerNoChecklist={(itemId) => verItemNoChecklist(itemId)}
      responsavelPadrao={usuarioDaSessao?.nome || ""}
      onAbrirPop={abrirPopsPeloAtalho}
      podeEvidenciar={permitido("evidencias.adicionar", visitaAtual.empresaId)}
      onFotoDepois={fotoDoDepois}
    />
    );
  }

  // Questionário por ambiente (só PC, só Administrador e RT): materializa o modelo na primeira edição.
  const [ambienteDoQuestionario, setAmbienteDoQuestionario] = useState<string | null>(null);

  function itensDoModeloDoAmbiente(ambiente: string, modeloReferencia?: string) {
    const referencia = modeloReferencia || obterModeloQuestionarioParaAmbiente(ambiente);
    const setor = normalizarSetorManual(referencia);
    const doManual = SETORES_OFICIAIS_MANUAL.includes(setor as (typeof SETORES_OFICIAIS_MANUAL)[number]);
    const itens = doManual ? obterModeloChecklistManual(ambiente, referencia) : modelosChecklist[ambiente] || obterModeloChecklistManual(ambiente, referencia);
    return itens.filter((item) => item.categoria !== "Equipamentos e móveis");
  }

  function abrirQuestionario(ambiente: string) {
    if (!empresaVisita || (usuarioDaSessao && !podeEditarQuestionario(usuarioDaSessao))) return;
    const modelo = itensDoModeloDoAmbiente(ambiente, visitaAtual?.modelosQuestionarioAmbientes?.[ambiente] || empresaVisita.modelosQuestionarioAmbientes?.[ambiente]);
    const existente = empresaVisita.questionarios?.[ambiente];
    // Ambiente já editado: as perguntas novas do modelo entram agora (ativas, marcadas como novas), sem apagar nada da empresa.
    const config = existente ? comPerguntasNovasDoModelo(existente, modelo, new Date().toISOString()) : materializarModelo(modelo, ambiente, new Date().toISOString());
    if (config !== existente) {
      atualizarEmpresaDosRegistros(empresaVisita.id, (empresa) => ({ ...empresa, questionarios: { ...(empresa.questionarios || {}), [ambiente]: config } }));
    }
    setAmbienteDoQuestionario(ambiente);
  }

  // "Adicionar foto do depois": a foto entra como evidência da correção (papel "depois"); sem sinal, vai para a fila de envio.
  function fotoDoDepois(ncId: string, arquivo: File) {
    const nc = (db.ncs || []).find((registro) => registro.id === ncId);
    const visita = nc ? db.visitas.find((registro) => registro.id === nc.visitaId) : undefined;
    if (!nc || !visita) return;
    void adicionarEvidencia(
      arquivo,
      "Foto",
      { ambiente: nc.ambiente, checklistItemId: nc.checklistItemId, ncId: nc.id },
      { visita, descricao: "Depois da correção", papel: "depois" }
    );
  }

  // Itens da tela de Correções (PC, tablet e celular usam a mesma montagem).
  function montarItensDeCorrecao(): CorrecaoItem[] {
    if (!visitaAtual) return [];
    return ncsDaTelaDeCorrecoes().map((nc, posicao) => {
        const indice = ncsVisita.indexOf(nc);
        const daVisita = nc.visitaId === visitaAtual.id;
        const rein = reincidenciaDaNc(
          nc,
          (db.ncs || []).filter((outra) => !outra.inativaNoChecklist),
          (id) => db.visitas.find((visita) => visita.id === id)?.data || ""
        );
        const linhaPop = indice >= 0 ? resumoPopsVisita.linhas.find((linha) => linha.ncs.includes(indice + 1)) : undefined;
        const historico = historicoDaReincidencia(nc, (db.ncs || []).filter((outra) => !outra.inativaNoChecklist), (id) => db.visitas.find((visita) => visita.id === id)?.data || "");
        const memoria = memoriaDoPlano(db.ncs || [], nc);
        return {
          id: nc.id,
          numero: posicao + 1,
          vezes: historico.vezes,
          acaoQueFuncionou: historico.acaoQueFuncionou || undefined,
          responsavelSugerido: memoria.responsavelDoAmbiente || undefined,
          memoriaResponsaveis: memoria.responsaveis,
          memoriaAcoes: memoria.acoes,
          causaRaiz: nc.causaRaiz || "",
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
          acaoDoPop: (() => {
            const registro = popRegistroDoCriterio(nc.categoria, nc.popCatalogoId);
            const texto = acaoCorretivaDoPopVigente(registro);
            return registro && texto ? { codigo: registro.codigo || registro.titulo, texto } : undefined;
          })(),
          marcadaFeita: nc.marcadaFeita || null,
          checklistItemId: daVisita ? nc.checklistItemId : "",
          itemNumero: !daVisita ? 0 : (visitaAtual.checklist || []).filter((item) => item.ambiente === nc.ambiente).findIndex((item) => item.id === nc.checklistItemId) + 1,
          observacao: nc.observacao || "",
          registradoEm: nc.criadoEm || "",
          ultimaOcorrencia: ultimaOcorrenciaDaNc(nc),
          par: (() => {
            const comp = comprovacaoDaCorrecao(nc, db.evidencias || []);
            const paraFoto = (ev: Evidencia) => ({ id: ev.id, url: urlEvidencia(ev), nome: ev.descricao?.trim() || `${ev.tipo} · ${ev.ambiente ? nomeDeExibicaoDoAmbiente(ev.ambiente) : "Sem ambiente"}`, quando: formatarDataHora(ev.criadoEm) });
            return { antes: comp.antes.map(paraFoto), depois: comp.depois.map(paraFoto) };
          })(),
          evidencias: (db.evidencias || [])
            .filter((ev) => ev.ncId === nc.id)
            .map((ev) => ({ id: ev.id, tipo: ev.tipo, nome: ev.descricao?.trim() || `${ev.tipo} · ${ev.ambiente ? nomeDeExibicaoDoAmbiente(ev.ambiente) : "Sem ambiente"}`, quando: formatarDataHora(ev.criadoEm), url: urlEvidencia(ev) })),
          historico: [...(nc.historicoAcompanhamento || [])]
            .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
            .map((item) => ({ id: item.id, quando: formatarDataHora(item.criadoEm), status: item.status, observacao: item.observacao })),
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
        setCorrecoesDaEmpresa(false);
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
        (o.ncs || []).filter((nc) => nc.visitaId === visitaAtual.id && !nc.inativaNoChecklist).map((nc, i) => ({ numero: i + 1, categoria: nc.categoria, popCatalogoId: nc.popCatalogoId })),
        pops,
        conjuntoDaEmpresa(empresa)
      ).linhas.filter((linha) => linha.situacao === "a-criar" && (!codigo || linha.sugestao.codigo === codigo));
      // Cria do texto-base só os POPs do conjunto da norma que faltam (estrutura e orientações, sem passos redigidos).
      let atual = { normasAplicadas: empresa.normasAplicadas, pops };
      let criados = 0;
      for (const linha of linhas) {
        const feito = criarPopsFaltantesDoConjunto(atual, () => crypto.randomUUID(), linha.sugestao.catalogoId);
        atual = { normasAplicadas: empresa.normasAplicadas, pops: feito.pops };
        criados += feito.criados;
      }
      if (criados === 0) return o;
      return { ...o, empresas: { ...o.empresas, [empresaId]: { ...empresa, pops: atual.pops } } };
    });
  }

  // POP ligado ao critério (ou à NC do item) na empresa da visita; só leitura.
  function popRegistroDoCriterio(categoria: string, popCatalogoId?: string): ProcedimentoOperacionalPadronizado | undefined {
    const pops = empresaVisita?.pops || [];
    const linha = popsDaVisita([{ numero: 1, categoria, popCatalogoId }], pops, conjuntoDaVisita).linhas[0];
    return linha?.popId ? pops.find((pop) => pop.id === linha.popId) : undefined;
  }

  // "Ver POP" no checklist: só quando o POP do item tem versão aprovada (rascunho nunca é mostrado como vigente).
  function verPopDoItem(item: ChecklistItem): { rotulo: string; onAbrir: () => void } | undefined {
    const pop = popRegistroDoCriterio(item.categoria, ncsVisita.find((nc) => nc.checklistItemId === item.id)?.popCatalogoId);
    if (!pop || !popVigente(pop)) return undefined;
    return { rotulo: pop.codigo || pop.titulo, onAbrir: () => setPopLeituraId(pop.id) };
  }

  // POPs da visita › ⋯ Trocar vínculo: guarda na NC o POP escolhido (ou "nenhum"); vazio volta ao padrão pela categoria.
  function trocarVinculoDaNc(numero: number, catalogoId: string) {
    if (!visitaAtual || !exigirPermissao("empresas.editar", visitaAtual.empresaId)) return;
    const alvo = ncsVisita[numero - 1];
    if (!alvo) return;
    setDb((o) => ({
      ...o,
      ncs: (o.ncs || []).map((nc) => {
        if (nc.id !== alvo.id) return nc;
        const { popCatalogoId: _anterior, ...resto } = nc;
        return catalogoId ? { ...resto, popCatalogoId: catalogoId } : resto;
      }),
    }));
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
    const selo = seloDoPdf(tipo);
    const marcas = (navigator as Navigator & { userAgentData?: { brands: { brand: string; version: string }[] } }).userAgentData?.brands;
    const comCaixasDeMargem = suportaCaixasDeMargem(marcas, navigator.userAgent);
    const estilo = document.createElement("style");
    estilo.id = "estilo-impressao-relatorio";
    estilo.textContent = cssDoRodapeDeImpressao({ empresa, selo, comCaixasDeMargem });
    document.head.appendChild(estilo);
    setRodapeImpressao({ empresa, selo, fixo: !comCaixasDeMargem });
    const tituloAntes = document.title;
    document.title = nomeDoArquivoPdf(empresa, dataVisita, tipo).replace(/\.pdf$/, "");
    setEmissaoSelo({ texto: selo, modo: tipo });
    const limpar = () => {
      estilo.remove();
      document.title = tituloAntes;
      setRodapeImpressao(null);
      setEmissaoSelo(null);
      window.removeEventListener("afterprint", limpar);
    };
    window.addEventListener("afterprint", limpar);
    await new Promise((resolver) => window.setTimeout(resolver, 150));
    window.print();
  }

  // Caminho da ficha do POP, com cada nível clicável: Central (quem edita), Documentos e a lista de POPs.
  function caminhoClicavel(rotuloDoPop: string, naCentral: boolean) {
    const niveis = niveisDoCaminho(rotuloDoPop, {
      central: atual && permitido("empresas.editar", atual.id) ? () => void abrirSecaoEmpresaPeloMenu("dados") : undefined,
      documentos: () => abrirDocumentos(subabasVisiveis(naCentral ? quemVeNaCentral : quemVeNosDocumentos).find((sub) => grupoDaSubaba(sub) === "documentos") || "pops"),
      pops: () => setPedidoDeListaDePops((n) => n + 1),
    });
    return (
      <nav className="ficha-caminho" aria-label="Caminho">
        {niveis.map((nivel, indice) => (
          <span key={nivel.rotulo} className="ficha-caminho-nivel">
            {nivel.ir ? (
              <button type="button" className="ficha-caminho-link" onClick={nivel.ir}>
                {nivel.rotulo}
              </button>
            ) : (
              <span aria-current={indice === niveis.length - 1 ? "page" : undefined}>{nivel.rotulo}</span>
            )}
            {indice < niveis.length - 1 && <span aria-hidden="true"> › </span>}
          </span>
        ))}
      </nav>
    );
  }

  function irParaRelatorios(aba: AbaDeRelatorios) {
    if (!atual) {
      void avisar("Escolha a empresa para abrir os relatórios.", { titulo: "Escolha a empresa" });
      setView("empresas");
      return;
    }
    setView(aba === "emitidos" ? "relatoriosemitidos" : aba);
  }

  function abasDeRelatoriosDisponiveis(): AbaDeRelatorios[] {
    const disponiveis: AbaDeRelatorios[] = ["emitidos"];
    if (painelHoje) disponiveis.push("resumo");
    if (podeGerarDossie(usuarioDaSessao)) disponiveis.push("dossie");
    if (painelHoje) disponiveis.push("evolucao");
    return disponiveis;
  }

  function abasDeRelatorios(atualAba: AbaDeRelatorios) {
    return <RelatoriosAbas atual={atualAba} disponiveis={abasDeRelatoriosDisponiveis()} onIr={irParaRelatorios} />;
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
      case "cadastros":
        // Central da Empresa › Cadastros › Ambientes (só quem edita a empresa; o item nem aparece para os demais).
        void abrirSecaoEmpresaPeloMenu("ambientes");
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
      case "relatorios":
        irParaRelatorios("emitidos");
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
    else if (tela === "evidencias") irParaMenu("evidencias");
    else if (tela === "correcoes") {
      const alvo = visitaAtual || visitaEmAndamentoDestaque;
      if (!alvo) {
        setView("visitas");
        return;
      }
      setDb((estado) => ({ ...estado, empresaAtualId: alvo.empresaId }));
      setVisitaAtualId(alvo.id);
      setPlanoNcAbertaId("");
      setCorrecoesDaEmpresa(false);
      setView("correcoes");
    }
    else setView("campomais");
  }

  // Todas as correções abertas da empresa ativa, de qualquer visita. A tela usa a visita aberta (ou a mais recente) só como âncora.
  function abrirCorrecoesDaEmpresa() {
    const ancora =
      visitaAtual ||
      visitaEmAndamentoDestaque ||
      [...visitas].filter((visita) => visita.empresaId === atual?.id).sort((a, b) => b.data.localeCompare(a.data))[0];
    if (!ancora) {
      setView("visitas");
      return;
    }
    setDb((estado) => ({ ...estado, empresaAtualId: ancora.empresaId }));
    setVisitaAtualId(ancora.id);
    setPlanoNcAbertaId("");
    setCorrecoesDaEmpresa(true);
    setView("correcoes");
  }

  /** NCs mostradas na tela de Correções: as da visita ou todas as abertas da empresa. */
  function ncsDaTelaDeCorrecoes(): NaoConformidade[] {
    if (!visitaAtual) return [];
    if (!correcoesDaEmpresa) return ncsVisita;
    return (db.ncs || []).filter((nc) => nc.empresaId === visitaAtual.empresaId && !nc.inativaNoChecklist && nc.status !== "Resolvida");
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

    form.append("chaveEnvio", evidenciaId);

    let response: Response;
    try {
      response = await fetch("/api/evidencias/upload", {
        method: "POST",
        body: form,
      });
    } catch {
      throw new FalhaDeEnvio("rede", "Sem conexão para enviar a evidência.");
    }

    const ehJson = (response.headers.get("content-type") || "").includes("application/json");
    const body = ehJson ? await response.json().catch(() => null) : null;
    const causa = causaDaResposta(response.status, ehJson, response.redirected);

    if (causa || !body?.pathname) {
      throw new FalhaDeEnvio(
        causa || "servidor",
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
    if (!iaLiberada(db.empresas[ev.empresaId])) {
      setAnaliseIAMensagens((atual) => ({ ...atual, [ev.id]: MENSAGEM_IA_DESLIGADA }));
      return;
    }
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
    opcoes?: { visita?: Visita; descricao?: string; evidenciaId?: string; papel?: "depois" }
  ): Promise<boolean> {
    const alvoVisita = opcoes?.visita || visitaAtual;
    if (!file || !alvoVisita) return false;
    if (!exigirPermissao("evidencias.adicionar", alvoVisita.empresaId)) return false;
    // No máximo 5 fotos por item do checklist (a foto "depois" da correção não conta).
    const itemDaFoto = (vinculo ? vinculo.checklistItemId : evidenciaChecklistItemId) || "";
    if (tipo === "Foto" && itemDaFoto && opcoes?.papel !== "depois" && !podeAdicionarFotoNoItem(db.evidencias || [], alvoVisita.id, itemDaFoto)) {
      setEvidenciaMsg(MENSAGEM_LIMITE_DE_FOTOS);
      void avisar(MENSAGEM_LIMITE_DE_FOTOS, { titulo: "Limite de fotos" });
      return false;
    }

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

      const evidenciaId = opcoes?.evidenciaId || crypto.randomUUID();
      let nomeArquivo = file.name || (tipo === "Foto" ? "foto.jpg" : "audio");
      const mimeType =
        tipo === "Foto" ? "image/jpeg" : file.type || "audio/mpeg";

      let conteudo: Blob | File = file;
      if (tipo === "Foto") {
        const validacao = await validarFotoEscolhida(file, dependenciasDoNavegador);
        if (!validacao.ok) {
          setEvidenciaMsg("Arquivo não aceito.");
          void avisar(validacao.motivo, { titulo: "Arquivo não aceito" });
          return false;
        }
        const preparo = await prepararFotoParaEnvio(file, dependenciasDoNavegador);
        if (!preparo.ok) {
          setEvidenciaMsg(preparo.motivo);
          void avisar(preparo.motivo, { titulo: "Foto não aceita" });
          return false;
        }
        conteudo = preparo.arquivo;
        nomeArquivo = preparo.nome;
      }

      const criadoEm = new Date().toISOString();
      let blob: { pathname: string; url: string } | null = null;
      let motivoDaFila = "";
      if (!navigator.onLine) {
        motivoDaFila = "Sem sinal.";
      } else {
        setEvidenciaMsg("Enviando...");
        try {
          blob = await enviarArquivoParaBlob(conteudo, nomeArquivo, alvoVisita.id, evidenciaId);
        } catch (erroDeEnvio) {
          const causa = erroDeEnvio instanceof FalhaDeEnvio ? erroDeEnvio.causa : "rede";
          // Erro do arquivo em si (tipo, tamanho): vale a mensagem de sempre, sem fila.
          if (causa === "invalido") throw erroDeEnvio;
          motivoDaFila = causa === "sessao" ? "Sessão expirada. Entre de novo para enviar." : "Não foi possível enviar agora.";
        }
      }

      if (!blob) {
        // Sem sinal (ou o envio falhou): guarda o arquivo no aparelho, com a data e a hora da captura.
        try {
          await fila.guardar(
            {
              id: evidenciaId,
              usuarioId: usuarioDaFila,
              empresaId: alvoVisita.empresaId,
              visitaId: alvoVisita.id,
              tipo,
              nomeArquivo,
              mimeType,
              ambiente: (vinculo ? vinculo.ambiente : evidenciaAmbiente) || "",
              checklistItemId: (vinculo ? vinculo.checklistItemId : evidenciaChecklistItemId) || undefined,
              ncId: (vinculo ? vinculo.ncId : evidenciaNcId) || undefined,
              descricao: (opcoes?.descricao ?? evidenciaDescricao).trim(),
              capturadoEm: criadoEm,
            },
            conteudo
          );
        } catch {
          setEvidenciaMsg("Sem sinal e sem espaço no aparelho para guardar. Libere espaço e tente de novo.");
          void avisar("Não foi possível guardar o arquivo no aparelho. Libere espaço e tente de novo; sem internet ele não pode ser enviado.", { titulo: "Não foi salvo" });
          return false;
        }
        setAvisoSemSinal(`${motivoDaFila} ${tipo === "Foto" ? "Foto salva" : "Áudio salvo"} no aparelho.`);
      }

      const ev: Evidencia = {
        id: evidenciaId,
        empresaId: alvoVisita.empresaId,
        visitaId: alvoVisita.id,
        tipo,
        nomeArquivo,
        mimeType,
        ...(blob ? { blobPathname: blob.pathname, blobUrl: blob.url } : { envio: "aguardando" as const }),
        ...(opcoes?.papel ? { papel: opcoes.papel } : {}),
        registradoPorId: usuarioDaSessao?.id,
        registradoPorNome: usuarioDaSessao?.nome || sessaoAtual?.name || undefined,
        descricao: (opcoes?.descricao ?? evidenciaDescricao).trim(),
        ambiente: (vinculo ? vinculo.ambiente : evidenciaAmbiente) || "",
        checklistItemId: (vinculo ? vinculo.checklistItemId : evidenciaChecklistItemId) || undefined,
        ncId: (vinculo ? vinculo.ncId : evidenciaNcId) || undefined,
        criadoEm,
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
        !blob
          ? "Salva no aparelho. Aguardando envio."
          : tipo === "Foto"
          ? "Foto registrada."
          : "Áudio registrado."
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
    if (evidenciasEmRelatorioEmitido(db.relatoriosEmitidos).has(id)) {
      void avisar("Esta foto está citada em um relatório emitido e não pode ser removida.", { titulo: "Foto em relatório emitido" });
      return;
    }

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

    // Só depois da confirmação: o arquivo guardado no aparelho nunca é apagado antes (pode ser a única cópia).
    if (evidencia.envio === "aguardando" || fila.itens.some((registro) => registro.id === id && registro.estado !== "enviado")) void fila.descartar(id);
    apagarArquivoDaEvidenciaNaNuvem(evidencia);
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
        )} | Conclusão: ${formatarDataHora(agora)}.`
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
        `Esta visita possui ${qtd(pendentesIA, "sugestão", "sugestões")} de análise fotográfica por IA ainda sem revisão.\n\n` +
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
    if (usuarioDaSessao && usuarioDaSessao.perfil !== "Administrador") {
      void avisar("Só o Administrador exclui uma visita. Para tirá-la da lista, use Arquivar.", { titulo: "Excluir visita" });
      return;
    }

    const respostas = (visita.checklist || []).filter(
      (item) => item.status !== "Pendente"
    ).length;
    const ncsLigadas = (db.ncs || []).filter((nc) => nc.visitaId === id).length;
    const evidenciasLigadas = (db.evidencias || []).filter(
      (ev) => ev.visitaId === id
    ).length;
    const bloqueio = motivoParaNaoExcluirVisita({
      respostas,
      naoConformidades: ncsLigadas,
      evidencias: evidenciasLigadas,
      concluida: visita.status === "Concluída",
      temRelatorioEmitido: (db.relatoriosEmitidos || []).some((relatorio) => relatorio.visitaId === id),
    });
    if (bloqueio) {
      void avisar(bloqueio, { titulo: "Excluir visita" });
      return;
    }

    const motivo = await perguntar("Por que esta visita vai ser excluída? O motivo fica no histórico (sem dados da visita).", {
      titulo: "Excluir visita",
      confirmarRotulo: "Continuar",
    });
    if (motivo === null) return;
    if (motivo.trim().length < 5) {
      void avisar("Informe o motivo da exclusão (mínimo de 5 letras).", { titulo: "Excluir visita" });
      return;
    }
    const digitado = await perguntar("Esta visita ainda está vazia. Para excluí-la definitivamente, digite EXCLUIR:", {
      titulo: "Excluir visita",
      confirmarRotulo: "Excluir",
      perigoso: true,
    });

    if (digitado !== "EXCLUIR") return;

    const registro = criarRegistroAuditoria({
      usuarioId: usuarioDaSessao?.id || "local",
      usuarioNome: usuarioDaSessao?.nome || "Usuário local",
      acao: "visita.excluida",
      entidade: "Visita",
      entidadeId: id,
      empresaId: visita.empresaId,
      detalhes: `${nomeParaExibir(db.empresas[visita.empresaId])} • visita vazia de ${fdata(visita.data)} excluída. Motivo: ${motivo.trim()}`,
    });
    setDb((o) => ({ ...o, visitas: o.visitas.filter((v) => v.id !== id), registrosAuditoria: [...o.registrosAuditoria, registro] }));
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
          detalhes: `${usuario.nome} • ${usuario.perfil} • convite ainda não enviado.${usuario.perfil === "Fiscal" && usuario.validoAte && !existente ? ` Acesso de leitura válido até ${dataDaValidade(usuario.validoAte)}.` : ""}${!existente && usuario.telas ? ` Telas diferentes do padrão: ${telasDiferentesDoPadrao(usuario).join(", ")}.` : ""}`,
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

  // POPs: grava na hora (sem esperar o "Salvar" da empresa); a aprovação é conferida de novo no servidor.
  function persistirPopsDaEmpresa(empresaId: string, novos: ProcedimentoOperacionalPadronizado[]) {
    if (!db.empresas[empresaId]) return;
    const normalizados = normalizarPops(novos);
    if (editingEmpresaId === empresaId) setPopsEmpresa(normalizados);
    setDb((estado) => ({
      ...estado,
      empresas: { ...estado.empresas, [empresaId]: { ...estado.empresas[empresaId], pops: normalizados } },
    }));
  }

  // Norma aplicável: vale na hora e fica no histórico. O responsável do estabelecimento é definido em Dados.
  function salvarNormaDaEmpresa(empresaId: string, dados: DadosDaNorma) {
    const alvo = db.empresas[empresaId];
    if (!alvo) return;
    if (!exigirPermissao("empresas.editar", empresaId)) return;
    const agora = new Date().toISOString();
    const confirmacaoAnterior = alvo.normasConfirmadasPeloRt;
    const confirmou = dados.rtConfirmou
      ? confirmacaoAnterior || { nome: usuarioDaSessao?.nome || "Usuário local", usuarioId: usuarioDaSessao?.id, em: agora }
      : undefined;
    const registro = criarRegistroAuditoria(
      {
        usuarioId: usuarioDaSessao?.id || "local",
        usuarioNome: usuarioDaSessao?.nome || "Usuário local",
        acao: "empresa.norma_atualizada",
        entidade: "Empresa",
        entidadeId: empresaId,
        empresaId,
        detalhes: `${alvo.nomeFantasia} • normas: ${dados.normasAplicadas.join(", ") || "nenhuma"}${confirmou ? " • confirmadas pelo RT" : ""}.`,
      },
      agora
    );
    setDb((estado) => ({
      ...estado,
      empresas: {
        ...estado.empresas,
        [empresaId]: {
          ...estado.empresas[empresaId],
          normasAplicadas: dados.normasAplicadas,
          normasConfirmadasPeloRt: confirmou,
        },
      },
      registrosAuditoria: [...estado.registrosAuditoria, registro],
    }));
    mostrarToast("Salvo");
  }

  // Privacidade da empresa: vale na hora e fica no histórico (quem liberou e quando). Não passa pelo "Salvar empresa".
  function alterarPrivacidadeDaEmpresa(empresaId: string, mudanca: "ia" | "desligar" | "guarda", extra: { aceite?: boolean; dias?: number } = {}) {
    const alvo = db.empresas[empresaId];
    if (!alvo) return;
    if (mudanca === "guarda" ? !exigirPermissao("empresas.editar", empresaId) : !exigirPermissao("ia.analisar", empresaId)) return;
    try {
      const agora = new Date().toISOString();
      let privacidade = alvo.privacidade;
      let acao = "";
      let detalhes = "";
      if (mudanca === "ia") {
        privacidade = liberarIa(privacidade, { id: usuarioDaSessao?.id || "local", nome: usuarioDaSessao?.nome || "Usuário local" }, Boolean(extra.aceite), agora);
        acao = "empresa.ia_fotos_liberada";
        detalhes = `${alvo.nomeFantasia} • IA nas fotos liberada por ${usuarioDaSessao?.nome || "usuário local"}.`;
      } else if (mudanca === "desligar") {
        privacidade = desligarIa(privacidade);
        acao = "empresa.ia_fotos_desligada";
        detalhes = `${alvo.nomeFantasia} • IA nas fotos desligada.`;
      } else {
        const erro = erroDaGuarda(extra.dias);
        if (erro) throw new Error(erro);
        privacidade = { ...privacidade, guardaDias: extra.dias };
        acao = "empresa.guarda_alterada";
        detalhes = `${alvo.nomeFantasia} • guarda de fotos e áudios: ${extra.dias} dias.`;
      }
      const registro = criarRegistroAuditoria(
        { usuarioId: usuarioDaSessao?.id || "local", usuarioNome: usuarioDaSessao?.nome || "Usuário local", acao, entidade: "Empresa", entidadeId: empresaId, empresaId, detalhes },
        agora
      );
      setDb((estado) => ({
        ...estado,
        empresas: { ...estado.empresas, [empresaId]: { ...estado.empresas[empresaId], privacidade } },
        registrosAuditoria: [...estado.registrosAuditoria, registro],
      }));
    } catch (error) {
      void avisar(error instanceof Error ? error.message : "Não foi possível alterar a privacidade.");
    }
  }

  function gravarMudancaDeAcesso(usuarioNovo: UsuarioSistema, acao: string, detalhes: string, agora: string) {
    const registro = criarRegistroAuditoria(
      { usuarioId: "preparacao-sistema", usuarioNome: "Preparação do sistema", acao, entidade: "Usuário", entidadeId: usuarioNovo.id, detalhes },
      agora
    );
    const novo: AppDB = {
      ...db,
      usuarios: db.usuarios.map((item) => (item.id === usuarioNovo.id ? usuarioNovo : item)),
      registrosAuditoria: [...db.registrosAuditoria, registro],
    };
    salvarDBLocal(novo);
    setDb(novo);
  }

  function renovarAcessoDoFiscal(usuarioId: string, dias: number) {
    if (!exigirPermissao("usuarios.gerenciar")) return;
    try {
      const alvo = db.usuarios.find((usuario) => usuario.id === usuarioId);
      if (!alvo) throw new Error("Usuário não encontrado.");
      const agora = new Date();
      const usuario = renovarAcessoFiscal(alvo, dias, agora);
      gravarMudancaDeAcesso(usuario, "usuario.acesso_renovado", `${usuario.nome} • Fiscal • acesso renovado até ${dataDaValidade(usuario.validoAte!)}.`, agora.toISOString());
    } catch (error) {
      void avisar(error instanceof Error ? error.message : "Não foi possível renovar o acesso.");
    }
  }

  function encerrarAcessoDoFiscal(usuarioId: string) {
    if (!exigirPermissao("usuarios.gerenciar")) return;
    try {
      const alvo = db.usuarios.find((usuario) => usuario.id === usuarioId);
      if (!alvo) throw new Error("Usuário não encontrado.");
      const agora = new Date();
      const usuario = encerrarAcessoFiscal(alvo, agora);
      gravarMudancaDeAcesso(usuario, "usuario.acesso_encerrado", `${usuario.nome} • Fiscal • acesso encerrado agora.`, agora.toISOString());
    } catch (error) {
      void avisar(error instanceof Error ? error.message : "Não foi possível encerrar o acesso.");
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

  // Central da Empresa: ir para uma sub-aba lembra a escolha por empresa (estado local).
  function irParaSubaba(sub: SubAbaCentral) {
    setEmpresaSecao(sub);
    if (editingEmpresaId) lembrarSubaba(editingEmpresaId, sub);
    setMsg("");
  }

  // "Criar agora" no comprovante: cria o rascunho do POP do modelo que o tipo pede e devolve o id para vincular.
  function criarPopDoModeloPorCatalogo(empresaDoc: Empresa, catalogoId: string): string | undefined {
    if (!permitido("empresas.editar", empresaDoc.id)) return undefined;
    const definicao = CONJUNTO_DA_NORMA.find((item) => item.catalogoId === catalogoId);
    if (!definicao) return undefined;
    const novo = criarPopDoTextoBase(definicao, { normasAplicadas: empresaDoc.normasAplicadas, pops: empresaDoc.pops || [] }, crypto.randomUUID());
    persistirPopsDaEmpresa(empresaDoc.id, [...(empresaDoc.pops || []), novo]);
    mostrarToast("POP criado como rascunho");
    return novo.id;
  }

  // Documentos (POPs, Comprovantes, Pessoas): o mesmo conteúdo na Central de quem edita e no Documentos de quem só lê.
  function conteudoDeDocumentos(sub: SubAbaCentral, empresaDoc: Empresa, podeEditarDoc: boolean) {
    if (sub === "pops") {
      const efetivo = responsavelEfetivo(empresaDoc, db.usuarios);
      const passos = podeEditarDoc && empresaTemImplantacao(empresaDoc)
        ? passosDeImplantacao(empresaDoc, { colaboradores: (db.colaboradores || []).filter((pessoa) => pessoa.empresaId === empresaDoc.id), leiturasPop: db.leiturasPop, registrosPop: db.registrosPop })
        : null;
      const concluida = passos ? implantacaoConcluida(passos) : false;
      const topo = passos ? (
        concluida && !verPassosDeImplantacao ? (
          <button type="button" className="pc-link-btn pc-self-start" onClick={() => setVerPassosDeImplantacao(true)}>
            Ver passos de implantação
          </button>
        ) : (
          <PcImplantacao passos={passos} onContinuar={(destino) => (destino === "pops" ? undefined : irParaSubaba(destino))} />
        )
      ) : null;
      return (
        <PcPops
          pops={empresaDoc.pops || []}
          empresa={empresaDoc}
          usuario={usuarioDaSessao}
          podeEditar={podeEditarDoc}
          onPersistir={(novos) => persistirPopsDaEmpresa(empresaDoc.id, novos)}
          topo={topo}
          onSalvarCartaz={podeEditarDoc ? (estilo, logotipo) => atualizarEmpresaDosRegistros(empresaDoc.id, (empresa) => {
            const { logotipo: _antigo, ...restoDaCapa } = empresa.capaDosPops || {};
            void _antigo;
            return { ...empresa, cartazLavagem: { ...(empresa.cartazLavagem || {}), tema: estilo }, capaDosPops: { ...restoDaCapa, ...(logotipo ? { logotipo } : {}) } };
          }) : undefined}
          onSalvarCapaDosPops={podeEditarDoc ? (capa) => atualizarEmpresaDosRegistros(empresaDoc.id, (empresa) => ({ ...empresa, capaDosPops: capa })) : undefined}
          abas={(pendencias: number) => (
            <CentralEmpresaNav
              grupos={gruposVisiveis(podeEditarDoc ? quemVeNaCentral : quemVeNosDocumentos)}
              subaba="pops"
              onSubaba={podeEditarDoc ? irParaSubaba : setDocSecao}
              contagens={{ pops: pendencias }}
            />
          )}
          onAlterarEmDados={podeEditarDoc ? () => irParaSubaba("dados") : undefined}
          avisoSemVinculo={
            efetivo.vinculado ? undefined : (
              <div className="priv-faixa" role="status">
                <span>Sem pessoa de Acessos vinculada, ninguém aprova POP.</span>
                {podeEditarDoc && (
                  <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => irParaSubaba("dados")}>
                    Vincular em Dados
                  </button>
                )}
              </div>
            )
          }
          onIrParaNorma={podeEditarDoc ? () => irParaSubaba("norma") : undefined}
          abrirFicha={fichaPedida}
          aoConsumirPedido={() => setFichaPedida(null)}
          aoMudarFicha={(rotulo, info) => {
            setFichaAbertaRotulo(rotulo);
            setFichaAbertaId(info?.id ?? null);
            setFichaAbertaRotuloCompleto(info?.rotuloCompleto ?? null);
          }}
          responsavelDoEstabelecimento={{ nome: efetivo.nome, cargo: efetivo.cargo, usuarioId: efetivo.usuarioId }}
          pedidoDeLista={pedidoDeListaDePops}
          onImprimir={imprimirDocumento}
        />
      );
    }
    if (sub === "comprovantes" && podeVerComprovantesAqui) {
      return (
        <PcComprovantes
          embutido
          empresa={nomeParaExibir(empresaDoc)}
          comprovantes={(db.comprovantes || []).filter((item) => item.empresaId === empresaDoc.id)}
          podeGerenciar={podeGerenciarComprovantesAqui}
          online={online}
          onSalvar={salvarComprovante}
          onRemover={removerComprovante}
          onAlterarPop={alterarPopDoComprovante}
          urlDoArquivo={(item) => `/api/comprovantes/file?pathname=${encodeURIComponent(item.blobPathname || "")}`}
          onVoltar={() => setRenovarComprovanteId(undefined)}
          renovarId={renovarComprovanteId}
          pops={empresaDoc.pops || []}
          onCriarPopDoModelo={podeEditarDoc ? (catalogoId) => criarPopDoModeloPorCatalogo(empresaDoc, catalogoId) : undefined}
        />
      );
    }
    if (sub === "pessoas" && podeGerenciarPessoasAqui && usuarioDaSessao?.perfil !== "Fiscal" && usuarioDaSessao?.perfil !== "Executor de campo") {
      return (
        <PcPessoas
          embutido
          empresa={nomeParaExibir(empresaDoc)}
          normas={empresaDoc}
          colaboradores={(db.colaboradores || []).filter((item) => item.empresaId === empresaDoc.id)}
          capacitacoes={(db.capacitacoes || []).filter((item) => item.empresaId === empresaDoc.id)}
          onSalvarColaborador={salvarColaborador}
          onAlternarAtivo={alternarColaborador}
          onSalvarCapacitacao={salvarCapacitacao}
          onRemoverCapacitacao={(id) => void removerCapacitacao(id)}
          onVoltar={() => undefined}
        />
      );
    }
    return null;
  }

  async function abrirSecaoEmpresaPeloMenu(secao: EmpresaSecao) {
    if (!atual || !permitido("empresas.editar", atual.id)) return;
    lembrarSubaba(atual.id, secao);
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
  // A visita aberta é de uma empresa diferente da ativa: a tela avisa e oferece a troca, sem fechar nada.
  const visitaDeOutraEmpresa = !!visitaAtual && !!atual && visitaAtual.empresaId !== atual.id && VISIT_VIEWS.includes(view);
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
        checklist: { texto: progressoChecklist.curto },
        evidencias: { texto: contagemEvidencias.texto },
        ncs: { texto: `${ncsAbertas} abertas`, tom: "nc" },
        plano: { texto: `${ncsAbertas} abertas`, tom: "pend" },
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
  const entradaDeDestinos: EntradaDeDestinos | null = caixaAberta || buscaNaBarraAtiva
    ? {
        itensMenu: itensVisiveis(contextoMenu),
        empresas: Object.values(db.empresas)
          .filter((empresa) => podeAcessarEmpresa(usuarioDaSessao, empresa.id) || !usuarioDaSessao)
          .map((empresa) => ({ id: empresa.id, nome: nomeDeExibicaoDaEmpresa(empresa) })),
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
        subabasCentral: atual ? subabasVisiveis(permitido("empresas.editar", atual.id) ? quemVeNaCentral : quemVeNosDocumentos) : [],
        subabaCentralInicial: atual ? resolverSubaba(null, lerSubabaLembrada(atual.id), subabasVisiveis(permitido("empresas.editar", atual.id) ? quemVeNaCentral : quemVeNosDocumentos)) : undefined,
        nomeEmpresaAtiva: atual ? nomeDeExibicaoDaEmpresa(atual) : undefined,
        abasRelatorios: atual && itensVisiveis(contextoMenu).some((item) => item.key === "relatorios") ? abasDeRelatoriosDisponiveis() : [],
        temVisitaEmAndamento: Boolean(visitaEmAndamentoDestaque),
        podePopsDaVisita: telaVisivel("popsVisita"),
      }
    : null;
  const destinosCaixa: Destino[] = entradaDeDestinos ? construirDestinos(entradaDeDestinos) : [];
  const contextoDaVoz: ContextoDaVoz | undefined = entradaDeDestinos
    ? {
        empresas: entradaDeDestinos.empresas,
        empresaAtivaId: db.empresaAtualId,
        destinosDaVisita: construirDestinosDaVisita(entradaDeDestinos),
        temVisitaNaEmpresa: (empresaId) => db.visitas.some((visita) => visita.empresaId === empresaId && visita.status === "Em andamento" && !visita.arquivada),
        onTrocarEAbrir: (empresaId, destino) => void trocarEmpresaEAbrir(empresaId, destino),
        onAbrirVisitas: () => navegarPrincipal("visitas"),
      }
    : undefined;
  const chavesDoMenu = new Set(itensVisiveis(contextoMenu).map((item) => item.key));
  const atalhosDaBarra: { id: string; rotulo: string; onClick: () => void }[] = [
    ...(atual && permitido("visitas.criar", atual.id) ? [{ id: "nova-visita", rotulo: "Nova visita", onClick: novaVisita }] : []),
    ...(atual && chavesDoMenu.has("empresas") && permitido("empresas.editar", atual.id) ? [{ id: "central", rotulo: "Central da Empresa", onClick: () => editarEmpresa(atual) }] : []),
    ...(chavesDoMenu.has("ncs") ? [{ id: "correcoes", rotulo: "Correções abertas", onClick: () => irParaMenu("ncs") }] : []),
    ...(chavesDoMenu.has("relatorios") ? [{ id: "relatorios", rotulo: "Relatórios", onClick: () => irParaMenu("relatorios") }] : []),
  ];
  const checklistDestaque = visitaEmAndamentoDestaque?.checklist || [];
  const inicioPc = {
    continuar: visitaEmAndamentoDestaque
      ? {
          empresa: nomeEmFormatoNatural(db.empresas[visitaEmAndamentoDestaque.empresaId]?.nomeFantasia) || "Empresa",
          proximaEtapa:
            checklistDestaque.find((item) => item.status === "Pendente")?.ambiente ||
            ((visitaEmAndamentoDestaque.ambientes || []).length ? "Revisar a inspeção" : "Definir os ambientes da visita"),
          respondidos: progressoDoChecklist(checklistDestaque).respondidos,
          total: progressoDoChecklist(checklistDestaque).total,
          percentual: progressoVisitaDestaque,
          divergencia: ehExecutor ? null : avisoDeDivergencia(
            conciliarNcs(
              checklistDestaque,
              (db.ncs || []).filter((nc) => nc.visitaId === visitaEmAndamentoDestaque.id && !nc.inativaNoChecklist)
            )
          ),
          conformes: checklistDestaque.filter((item) => item.status === "Conforme").length,
          naoConformes: itensNaoConformes(checklistDestaque),
          naoSeAplica: checklistDestaque.filter((item) => item.status === "Não se aplica").length,
          pendentes: checklistDestaque.filter((item) => item.status === "Pendente").length,
          onContinuar: () => {
            setDb((estado) => ({ ...estado, empresaAtualId: visitaEmAndamentoDestaque.empresaId }));
            setVisitaAtualId(visitaEmAndamentoDestaque.id);
            setView("visita");
          },
        }
      : null,
    ncAcompanhamento: atual
      ? correcoesAbertas(db.ncs, { empresaId: atual.id, visitaIds: new Set(visitas.filter((visita) => visita.empresaId === atual.id).map((visita) => visita.id)) })
      : 0,
    preparacaoAtual: atual ? preparacaoDaEmpresa(atual) : null,
    recentes: (filtro: "Em andamento" | "Concluída") =>
      visitas
        .filter((visita) => visita.status === filtro)
        .slice(0, 12)
        .map((visita) => {
          const itens = visita.checklist || [];
          return {
            id: visita.id,
            empresa: nomeEmFormatoNatural(db.empresas[visita.empresaId]?.nomeFantasia) || "Empresa",
            data: fdata(visita.data),
            responsavel: visita.responsavel || "Responsável não informado",
            status: visita.status,
            percentual: progressoDoChecklist(itens).percentual,
            cor: db.empresas[visita.empresaId] ? corDaEmpresa(db.empresas[visita.empresaId]) : undefined,
          };
        }),
  };
  const nomeParaExibir = (empresa?: Empresa) => nomeDeExibicaoDaEmpresa(empresa);
  // Guia "Primeiros passos" (Ajuda e guias): o mesmo cálculo de `passosDeConfiguracao`.
  const passosDoGuia = passosDeConfiguracao({ usuario: usuarioDaSessao, empresa: atual, visitas: db.visitas, relatoriosEmitidos: db.relatoriosEmitidos });
  // Início (PC): caixas do "Continuar de onde parei", linha de configuração (some em 7 de 7) e as duas colunas.
  const caixasDoInicio = caixasDoContinuar({
    telas: telasRecentes,
    visitas: visitasSemArquivadas.filter((visita) => visita.empresaId === atual?.id),
    pops: atual?.pops || [],
    numeroDaVisita: (id) => numeroVisitaPorId.get(id),
    formatarData: fdata,
    proximaEtapa: (id) => {
      const visita = db.visitas.find((item) => item.id === id);
      return (visita?.checklist || []).find((item) => item.status === "Pendente")?.ambiente || ((visita?.ambientes || []).length ? "Revisar a inspeção" : "Definir os ambientes da visita");
    },
  }).map((caixa) => ({ chave: caixa.chave, titulo: caixa.titulo, subtitulo: caixa.subtitulo, tipo: caixa.tela.tipo, onAbrir: () => abrirTelaRecente(caixa.tela) }));
  const abrirPassoDoGuia = (chave: string) => {
    if (chave === "perfil") setPerfilAberto(true);
    else if (chave === "empresa") void abrirSecaoEmpresaPeloMenu("dados");
    else if (chave === "ambientes" || chave === "equipamentos" || chave === "fluxos") void abrirSecaoEmpresaPeloMenu(chave);
    else if (chave === "visita") (atual ? novaVisita : () => setView("empresas"))();
    else irParaMenu("relatorio");
  };
  const resumoDoGuia = resumoDaConfiguracao(passosDoGuia);
  const configuracaoDoInicio =
    atual && !resumoDoGuia.completo
      ? { feitos: resumoDoGuia.feitos, total: resumoDoGuia.total, faltam: resumoDoGuia.faltam.map((passo) => ({ id: passo.chave, titulo: passo.titulo, onAbrir: () => abrirPassoDoGuia(passo.chave) })), onGuia: () => setView("ajuda") }
      : null;
  const dadosDasColunas = painelHoje && atual && !ehExecutor ? colunasDoInicio(painelHoje.itens, atual.pops || [], hojeISO(), permitido("ncs.acompanhar", atual.id) ? correcoesSemPrazo(db.ncs, atual.id) : []) : null;
  const colunasDoInicioPc = dadosDasColunas
    ? {
        ...dadosDasColunas,
        precisa: comAmbienteDasCorrecoes(dadosDasColunas.precisa, db.ncs),
        onVerTodasCorrecoes: abrirCorrecoesDaEmpresa,
        onAbrirPendencia: acaoDoPainel,
        onAbrirVencimento: (item: { id: string; origem: string }) => {
          if (item.origem === "pop-revisao") abrirFichaDoPop(item.id.replace("revisao:", ""));
          else {
            const original = painelHoje?.itens.find((candidato) => candidato.id === item.id);
            if (original) acaoDoPainel(original);
          }
        },
        onLembrete: podeEnviarLembrete(usuarioDaSessao) ? () => setLembreteAberto(true) : undefined,
        onTodosVencimentos: () => setView("resumo"),
      }
    : null;
  const conjuntoDaVisita = conjuntoDaEmpresa(empresaVisita);
  const resumoPopsVisita = popsDaVisita(
    ncsVisita.map((nc, indice) => ({ numero: indice + 1, categoria: nc.categoria, popCatalogoId: nc.popCatalogoId })),
    empresaVisita?.pops || [],
    conjuntoDaVisita
  );
  const dadosTrilha = {
    respondidos,
    total: totalChecklist,
    evidencias: evidenciasVisita.length,
    correcoesAbertas: ncsAbertas,
    popsPendentes: resumoPopsVisita.pendentes,
  };
  const destinoDoCrn = destinoDoPreencherCrn({ perfil: usuarioDaSessao?.perfil, podeGerenciarAcessos: permitido("usuarios.gerenciar") });
  const linhasConferenciaRel = conferenciaDoRelatorio({
                  respondidos,
                  totalChecklist,
                  ncsAbertas,
                  ncsSemResponsavelOuPrazo: ncsVisita.filter((nc) => nc.status !== "Resolvida" && (!nc.responsavelAcao?.trim() || !nc.prazo?.trim())).length,
                  evidencias: contagemEvidencias.total,
                  evidenciasTexto: contagemEvidencias.texto,
                  popsPendentes: resumoPopsVisita.pendentes,
                  popsSugeridos: resumoPopsVisita.linhas.length,
                  cadastroPreenchidos: empresaVisita ? preparacaoDaEmpresa(empresaVisita).preenchidos : 0,
                  cadastroTotal: empresaVisita ? preparacaoDaEmpresa(empresaVisita).total : 0,
                  assinatura: { nome: usuarioDaSessao?.nome || sessaoAtual?.name, cargo: usuarioDaSessao?.cargo, crn: usuarioDaSessao?.crn, destinoDoCrn: destinoDoCrn },
  });
  const passoAtualDaTrilha = passoDaView(view);
  const percentualVisitaTrilha = percentualDaVisita(respondidos, totalChecklist);
  const classesSecoesRelatorio = (Object.keys(secoesRelatorio) as SecaoRelatorio[])
    .filter((chave) => !secoesRelatorio[chave])
    .map((chave) => `rep-off-${chave}`)
    .join(" ");
  const chaveDaTela: NavKey | null =
    view === "empresas" && showEmpresaForm && ["pops", "comprovantes", "pessoas"].includes(secaoEmpresa || "")
      ? "pops"
      : view === "empresas" && showEmpresaForm && editingEmpresaId && secaoEmpresa && grupoDaSubaba(secaoEmpresa as SubAbaCentral) === "estrutura"
        ? "cadastros"
        : chaveAtiva(view);
  const itemDaTela = chaveDaTela ? itemDoMenu(chaveDaTela) : undefined;
  const rotuloDaTela =
    view === "relatoriosemitidos"
      ? "Relatórios emitidos"
      : view === "dossie"
        ? "Dossiê"
        : view === "evolucao"
          ? "Evolução"
          : view === "resumo"
            ? "Resumo de uma página"
            : view === "fila"
              ? "Fila de envio"
              : view === "empresas" && showEmpresaForm && editingEmpresaId
                ? "Central da Empresa"
                : view === "historico"
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
  // Central da Empresa: "← Central da Empresa › Documentos ▾". O menu troca de seção e substitui os três botões que ficavam numa linha própria.
  const naCentralComMenu =
    !dentroDaVisita && !!atual && ((view === "pops" && (telaVisivel("pops") || ehFiscal)) || (view === "empresas" && showEmpresaForm && !!editingEmpresaId && permitido("empresas.editar")));
  const gruposDoMenu = view === "pops" ? gruposVisiveis(quemVeNosDocumentos) : gruposVisiveis(quemVeNaCentral);
  const subabaDoMenu: SubAbaCentral = view === "pops" ? subabaDosDocumentos : ((secaoEmpresa as SubAbaCentral) || "dados");
  const secaoDoTopo =
    naCentralComMenu && !(fichaAbertaRotulo && subabaDoMenu === "pops")
      ? {
          rotulo: gruposDoMenu.find((grupo) => grupo.id === grupoDaSubaba(subabaDoMenu))?.rotulo || "Documentos",
          opcoes: opcoesDoSeletorDeSecao(gruposDoMenu, subabaDoMenu),
          onEscolher: (id: string) => {
            const alvo = subabaAoEscolherSecao(gruposDoMenu, id as GrupoCentral, subabaDoMenu);
            if (!alvo) return;
            if (view === "pops") setDocSecao(alvo);
            else irParaSubaba(alvo);
          },
        }
      : undefined;
  const caminhoTopo = dentroDaVisita
    ? ["Visitas", `Visita ${numeroVisitaPorId.get(visitaAtual?.id || "") || "—"}`, rotuloDaTela || "Central"]
    : secaoDoTopo
      ? ["Central da Empresa"]
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
    <RegistrosEmpresaContext.Provider value={registrosDaEmpresa}>
    <AvisoFotoProvider visitaId={visitaAtual?.id ?? visitaEmAndamentoDestaque?.id ?? null}>
    <AvisoFotoPonte alvo={pedirAvisoDeFotoRef} />
    <div className="min-h-screen bg-[var(--bg)]">
      <UpdateNotice />
      {perfilAberto && usuarioDaSessao && (
        <MeuPerfilModal
          nome={usuarioDaSessao.nome}
          email={usuarioDaSessao.email}
          perfil={usuarioDaSessao.perfil}
          empresas={usuarioDaSessao.perfil === "Administrador" ? ["Todas as empresas"] : usuarioDaSessao.empresaIds.map((id) => nomeParaExibir(db.empresas[id])).filter(Boolean)}
          versao={pacote.version}
          editavel={usuarioDaSessao.perfil === "Consultor/RT" ? { crn: usuarioDaSessao.crn, cargo: usuarioDaSessao.cargo, telefone: usuarioDaSessao.telefone } : undefined}
          onSalvar={
            usuarioDaSessao.perfil === "Consultor/RT"
              ? (dados) => {
                  const idDoProprio = usuarioDaSessao.id;
                  setDb((o) => {
                    const atualizado: AppDB = { ...o, usuarios: o.usuarios.map((item) => (item.id === idDoProprio ? comPerfilProprio(item, dados) : item)) };
                    salvarDBLocal(atualizado);
                    return atualizado;
                  });
                  mostrarToast("Perfil salvo");
                }
              : undefined
          }
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
      {respostaLimpa && (
        <div className="pc-toast" role="status">
          <span>Resposta limpa</span>
          <button type="button" className="pc-link-btn" onClick={desfazerLimparResposta}>
            Desfazer
          </button>
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
          { id: "sincronizar", rotulo: fila.resumo.pendentes + pendentesDoEstado ? `Sincronizar · ${fila.resumo.pendentes + pendentesDoEstado} ${fila.resumo.pendentes + pendentesDoEstado === 1 ? "pendente" : "pendentes"}` : "Sincronizar", onClick: () => { setMenuMaisAberto(false); void atualizarNuvemManualmente(); setView("fila"); } },
          ...(fila.resumo.pendentes > 0 ? [{ id: "enviar-agora" as const, rotulo: "Enviar agora", onClick: () => { setMenuMaisAberto(false); void enviarTudoAgora(); } }] : []),
          { id: "modo", rotulo: "Modo de tela", onClick: () => { setMenuMaisAberto(false); setView("modotela"); } },
          { id: "sobre", rotulo: "Sobre", onClick: () => void avisar(`${BRAND.name}\n${BRAND.subtitle}`, { titulo: "Sobre" }) },
          { id: "sair", rotulo: "Sair", desabilitado: saindo, onClick: () => { setMenuMaisAberto(false); void sairDoSistema(); } },
        ]}
        sincronizacao={{ estado: seloAtual.estado, rotulo: seloAtual.rotulo, onClick: tocarNoSelo }}
        contagens={contagensMenu}
        visita={cartaoVisita}
        onSair={() => void sairDoSistema()}
        visitaMenu={ehPC && visitaAbertaNoMenu ? { numero: visitaAtual ? numeroVisitaPorId.get(visitaAtual.id) : undefined, empresa: nomeSemNumerosNoInicio(nomeParaExibir(empresaVisita)), cor: empresaVisita ? corDaEmpresa(empresaVisita) : undefined, data: `${visitaAtual ? fdata(visitaAtual.data).slice(0, 5) : ""} · ${visitaAtual?.status === "Concluída" ? "concluída" : "em andamento"}`, passos: passosDaTrilha(dadosTrilha).filter((passo) => telaVisivel(passo.chave === "pops" ? "popsVisita" : (passo.chave as TelaKey))), atual: passoAtualDaTrilha, emTelaDaVisita: VISIT_VIEWS.includes(view) } : null}
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
              {` ${textoDaRecuperacao(recuperacaoPendente.counts)}.`}
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

      <ConflitosDeEdicao conflitos={conflitos} onEscolher={escolherConflito} />

      {loteParaDesfazer && (
        <div className="lote-desfazer" role="status">
          <span>{loteParaDesfazer.texto}</span>
          <button type="button" className="pc-link-btn" onClick={desfazerOLote}>Desfazer</button>
        </div>
      )}

      <ReservaDeAltura>
      {sessaoDoEstadoExpirou && (
        <div className="border-b border-amber-300 bg-[var(--pend-bg)] pc-offset">
          <div className="mx-auto max-w-7xl px-4 py-3 text-amber-950">
            <div className="font-extrabold">Sua sessão expirou.</div>
            <p className="mt-1 text-sm">O que você fez continua guardado neste aparelho e nada foi descartado. Entre de novo para enviar.</p>
            <button type="button" onClick={() => window.location.assign("/auth/sign-in")} className="mt-3 rounded-xl bg-[var(--brand)] px-4 py-2 font-bold text-white">Entrar de novo</button>
          </div>
        </div>
      )}

      {armazenamentoNaoGarantido && (
        <div className="border-b border-amber-300 bg-[var(--pend-bg)] pc-offset">
          <div className="faixa-fina" title="O navegador não garantiu o armazenamento deste aparelho: ele pode apagar o que está guardado se faltar espaço. Envie o que está pendente assim que tiver sinal.">
            Armazenamento não garantido pelo navegador · envie os pendentes quando tiver sinal
          </div>
        </div>
      )}

      {protecaoLocalAtiva && !recuperacaoPendente && estaOnline && (
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
      </ReservaDeAltura>

      <div className="mx-auto min-w-0 max-w-[1500px] overflow-x-hidden px-3 py-4 pb-28 sm:p-5 pc-offset pc-content-pad md:overflow-visible md:pb-6 lg:p-7">
        {ehFiscal && usuarioDaSessao?.validoAte && (
          <FaixaVisitaOutraEmpresa mensagem={faixaDeLeitura(usuarioDaSessao.validoAte)} />
        )}
        {ambienteDoQuestionario && empresaVisita?.questionarios?.[ambienteDoQuestionario] && (
          <PcQuestionario
            ambiente={nomeDeExibicaoDoAmbiente(ambienteDoQuestionario)}
            config={empresaVisita.questionarios[ambienteDoQuestionario]}
            foiUsada={(pergunta) => perguntaFoiUsada(pergunta, ambienteDoQuestionario, db.visitas.filter((visita) => visita.empresaId === empresaVisita.id))}
            quem={{ id: usuarioDaSessao?.id, nome: usuarioDaSessao?.nome }}
            onSalvar={(config) => atualizarEmpresaDosRegistros(empresaVisita.id, (empresa) => ({ ...empresa, questionarios: { ...(empresa.questionarios || {}), [ambienteDoQuestionario]: config } }))}
            onFechar={() => setAmbienteDoQuestionario(null)}
          />
        )}
        {emitirAberto && visitaAtual && (
          <PcEmitirRelatorio
            versaoAnterior={(() => {
              const ultimo = ultimaVersao(db.relatoriosEmitidos || [], visitaAtual.id);
              return ultimo ? { numero: ultimo.numero, versao: ultimo.versao } : undefined;
            })()}
            assinante={usuarioDaSessao?.nome || sessaoAtual?.name || "RT"}
            cargo={usuarioDaSessao?.cargo || ""}
            crn={usuarioDaSessao?.crn || ""}
            onPreencherCrn={destinoDoCrn ? () => { setEmitirAberto(false); if (destinoDoCrn === "perfil") setPerfilAberto(true); else setView("acessos"); } : undefined}
            emitindo={emitindoRelatorio}
            erro={erroDeEmissao}
            onConfirmar={(motivo) => void emitirRelatorioDaVisita(motivo)}
            onCancelar={() => setEmitirAberto(false)}
          />
        )}
        {lembreteAberto && atual && painelHoje && podeEnviarLembrete(usuarioDaSessao) && (() => {
          const responsavel = atual.responsavelEstabelecimento;
          const pessoaDoResponsavel = responsavel?.usuarioId ? db.usuarios.find((usuario) => usuario.id === responsavel.usuarioId) : undefined;
          return (
            <PcLembrete
              lembrete={montarLembrete({ empresaNome: nomeParaExibir(atual), painel: painelHoje, remetente: usuarioDaSessao?.nome || "", destinatarioNome: responsavel?.nome, destinatarioEmail: pessoaDoResponsavel?.email })}
              destinatarioNome={responsavel?.nome}
              onFechar={() => setLembreteAberto(false)}
            />
          );
        })()}
        {avisoSemSinal && (
          <div className="pc-modal-layer sem-sinal-camada" role="presentation">
            <div className="pc-modal-backdrop" onClick={() => setAvisoSemSinal(null)} />
            <section className="pc-modal sem-sinal-folha" role="dialog" aria-modal="true" aria-label="Salvo no aparelho">
              <p className="sem-sinal-texto">{avisoSemSinal}</p>
              <p className="ui-row-sub">Vai ser enviada sozinha quando o sinal voltar, com o app aberto. O checklist continua normal.</p>
              <button type="button" className="ui-btn ui-btn--primary" onClick={() => setAvisoSemSinal(null)} autoFocus>
                Ok
              </button>
            </section>
          </div>
        )}
        {popLeituraId && (empresaVisita?.pops || []).some((pop) => pop.id === popLeituraId) && (
          <PopLeituraFolha pop={(empresaVisita?.pops || []).find((pop) => pop.id === popLeituraId)!} onFechar={() => setPopLeituraId(null)} />
        )}
        {visitaDeOutraEmpresa && visitaAtual && atual && (
          <FaixaVisitaOutraEmpresa
            empresaDaVisita={nomeEmFormatoNatural(empresaVisita?.nomeFantasia) || "outra empresa"}
            empresaAtiva={nomeEmFormatoNatural(atual.nomeFantasia) || "empresa"}
            onTrocar={() => setDb((estado) => ({ ...estado, empresaAtualId: visitaAtual.empresaId }))}
          />
        )}
        {modo === "campo" && (
          <>
            <CampoCabecalho
              empresa={nomeEmFormatoNatural(atual?.nomeFantasia) || ""}
              empresaCor={atual ? corDaEmpresa(atual) : undefined}
              empresaIniciais={atual ? iniciaisDaEmpresa(atual.nomeFantasia || "") : ""}
              titulo={TITULO_DA_TELA_NO_CAMPO[view] || ""}
              sincronizacao={{ ...seloAtual, onClick: tocarNoSelo }}
              menuModo={itensMenuModo}
              onTrocarEmpresa={() => setTrocarEmpresaAberto(true)}
              onVoltar={mostrarVoltar(localDaTela) ? () => void voltarUmaTela() : undefined}
            />
            <CampoBarra
              tela={view === "inicio" ? "inicio" : view === "checklist" ? "checklist" : view === "correcoes" ? "correcoes" : view === "evidencias" ? "evidencias" : view === "campomais" || view === "empresas" ? "mais" : null}
              correcoesAbertas={ncsAbertas}
              podeRegistrar={permitido("evidencias.adicionar") || permitido("visitas.executar")}
              onIr={irParaTelaCampo}
              abas={abasDoCampo}
              onRegistrar={() => setRegistrarAberto(true)}
            />
          </>
        )}
        <AppTopbar
          variante={view === "inicio" && ehPC && !ehFiscal ? "inicio" : undefined}
          caminho={caminhoTopo}
          subtituloDoCaminho={view === "relatorio" && visitaAtual ? `${fdata(visitaAtual.data)} · ${visitaAtual.status === "Concluída" ? "inspeção concluída" : "inspeção em andamento"}` : undefined}
          onPrimeiro={() => navegarPrincipal("visitas")}
          empresaAtiva={atual ? nomeDeExibicaoDaEmpresa(atual) : null}
          empresaCor={atual ? corDaEmpresa(atual) : undefined}
          empresaIniciais={atual ? iniciaisDaEmpresa(atual.nomeFantasia || "") : ""}
          iniciais={iniciaisUsuario}
          mostrarTodasVisitas={dentroDaVisita}
          onTodasVisitas={() => navegarPrincipal("visitas")}
          destinos={destinosCaixa}
          onEscolherDestino={escolherDestinoDaCaixa}
          onBuscaAtiva={setBuscaNaBarraAtiva}
          pedidoDeFocoNaBusca={pedidoDeFocoNaBusca}
          usuarioId={usuarioDaSessao?.id}
          contextoDaVoz={contextoDaVoz}
          micDisponivel={deveExibirRecursosDeIa(usuarioDaSessao)}
          modo={modo}
          sincronizacao={{ ...seloAtual, onClick: tocarNoSelo }}
          automatico={telaModo.preferencia.automatico}
          onEscolherModo={telaModo.escolherModo}
          onVoltarAoAutomatico={telaModo.voltarAoAutomatico}
          onAbrirConfigModo={() => setView("modotela")}
          onTrocarEmpresa={() => setTrocarEmpresaAberto(true)}
          atalhos={atalhosDaBarra}
          onVoltar={mostrarVoltar(localDaTela) ? () => void voltarUmaTela() : undefined}
          ocultarChipDeModo={Boolean(secaoDoTopo)}
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

        {trocarEmpresaAberto && (
          <TrocarEmpresaPainel
            opcoes={opcoesTrocaDeEmpresa.map((opcao) => ({ ...opcao, nome: nomeParaExibir(db.empresas[opcao.id]) }))}
            corDe={(id) => (db.empresas[id] ? corDaEmpresa(db.empresas[id]) : "#4A5D73")}
            onFechar={() => setTrocarEmpresaAberto(false)}
            onNovaEmpresa={permitido("empresas.editar") ? () => { setTrocarEmpresaAberto(false); abrirNovaEmpresaPeloMenu(); } : undefined}
            onEscolher={async (id) => {
              setTrocarEmpresaAberto(false);
              if (id === db.empresaAtualId) return;
              if (!(await confirmarComFila("trocar"))) return;
              setDb((o) => ({ ...o, empresaAtualId: id }));
              setVisitaAtualId(null);
              setView("inicio");
            }}
          />
        )}
        {modo === "campo" && view === "campomais" ? (
          <CampoMais
            secoes={(() => {
              const visiveis = new Set(itensVisiveis(contextoMenu).map((item) => item.key));
              const pendentesTotal = fila.resumo.pendentes + pendentesDoEstado;
              return [
                {
                  titulo: "Da visita atual",
                  itens: visitaAtual
                    ? [
                        ...(visiveis.has("central") ? [{ id: "central", rotulo: "Central da visita", detalhe: "Resumo e etapas desta visita", icone: "central" as const, tom: "azul", onClick: () => irParaMenu("central") }] : []),
                        ...(visiveis.has("ambientes") ? [{ id: "ambientes", rotulo: "Ambientes", detalhe: "Escolher por onde a visita passa", icone: "ambientes" as const, tom: "turquesa", onClick: () => irParaMenu("ambientes") }] : []),
                        ...(visiveis.has("evidencias") ? [{ id: "evidencias", rotulo: "Evidências", detalhe: "Fotos e áudios desta visita", icone: "evidencias" as const, tom: "ceu", onClick: () => irParaMenu("evidencias") }] : []),
                        ...(telaVisivel("popsVisita") ? [{ id: "popsvisita", rotulo: "POPs desta visita", detalhe: "Procedimentos ligados aos itens", icone: "pops" as const, tom: "violeta", onClick: () => { setMenuMaisAberto(false); setView("popsvisita"); } }] : []),
                        ...(visiveis.has("relatorio") ? [{ id: "relatorio", rotulo: "Relatório da visita", detalhe: "Conferir e gerar o relatório", icone: "relatorio" as const, tom: "ardosia", onClick: () => irParaMenu("relatorio") }] : []),
                      ]
                    : [],
                },
                {
                  titulo: "Cadastro e documentos",
                  itens: [
                    ...(visiveis.has("cadastros") ? [{ id: "cadastros", rotulo: "Cadastros", detalhe: "Ambientes, equipamentos e fluxos", icone: "cadastros" as const, tom: "turquesa", onClick: () => irParaMenu("cadastros") }] : []),
                    ...(visiveis.has("empresas") ? [{ id: "empresas", rotulo: "Empresas", detalhe: "Cadastro, cor e seleção", icone: "empresas" as const, tom: "turquesa", onClick: () => irParaMenu("empresas"), ...(permitido("empresas.editar") ? { atalho: { rotulo: "+ Nova empresa", onClick: abrirNovaEmpresaPeloMenu } } : {}) }] : []),
                    ...(visiveis.has("pops") ? [{ id: "pops", rotulo: "POPs e documentos", detalhe: "POPs, comprovantes e pessoas", icone: "pops" as const, tom: "ceu", onClick: () => irParaMenu("pops") }] : []),
                    ...(visiveis.has("relatorios") ? [{ id: "relatorios", rotulo: "Relatórios", detalhe: "Emitidos, resumo, dossiê e evolução", icone: "relatorios" as const, tom: "ardosia", onClick: () => irParaMenu("relatorios") }] : []),
                  ],
                },
                {
                  titulo: "Conta e app",
                  itens: [
                    ...(usuarioDaSessao ? [{ id: "perfil", rotulo: "Meu perfil", detalhe: "Seus dados e preferências neste aparelho", icone: "acessos" as const, tom: "indigo", onClick: () => { setMenuMaisAberto(false); setPerfilAberto(true); } }] : []),
                    { id: "ajuda", rotulo: "Ajuda e guias", detalhe: "Primeiros passos e guia rápido", icone: "ajuda" as const, tom: "laranja", onClick: () => irParaMenu("ajuda") },
                    ...(visiveis.has("acessos") ? [{ id: "acessos", rotulo: "Administração", detalhe: "Acessos e permissões", icone: "escudo" as const, tom: "ardosia", onClick: () => irParaMenu("acessos") }] : []),
                    { id: "modo", rotulo: "Modo de tela", detalhe: "Celular, tablet ou computador", icone: "modo" as const, tom: "roxo", onClick: () => setView("modotela") },
                  ],
                },
                {
                  titulo: "Ações",
                  itens: [
                    { id: "trocar-empresa", rotulo: "Trocar empresa", detalhe: "Escolher a empresa ativa", icone: "empresas" as const, tom: "turquesa", onClick: () => setTrocarEmpresaAberto(true) },
                    { id: "sincronizar", rotulo: "Sincronizar", detalhe: pendentesTotal ? "Enviar e atualizar agora" : "Tudo enviado", icone: "sincronizar" as const, tom: "verde", ...(pendentesTotal ? { contador: `${pendentesTotal} ${pendentesTotal === 1 ? "pendente" : "pendentes"}` } : {}), onClick: () => { void atualizarNuvemManualmente(); setView("fila"); } },
                    ...(fila.resumo.pendentes > 0 ? [{ id: "enviar-agora", rotulo: "Enviar agora", detalhe: "Mandar as fotos e áudios guardados", icone: "sincronizar" as const, tom: "verde", onClick: () => { void enviarTudoAgora(); } }] : []),
                    { id: "sair", rotulo: "Sair", detalhe: "Encerrar a sessão neste aparelho", icone: "sair" as const, tom: "vermelho", onClick: () => void sairDoSistema() },
                  ],
                },
              ];
            })()}
            onVersaoCompleta={() => telaModo.escolherModo("completo")}
          />
        ) : modo === "campo" && view === "inicio" && !ehFiscal ? (
          (() => {
            const alvo = visitaEmAndamentoDestaque;
            const lista = alvo?.checklist || [];
            const ordemAmbientes = alvo?.ambientes?.length ? alvo.ambientes : [...new Set(lista.map((item) => item.ambiente))];
            const proximoItem = primeiroItemSemResposta(lista, ordemAmbientes);
            const itensDoAmbiente = proximoItem ? lista.filter((item) => item.ambiente === proximoItem.ambiente) : [];
            const ncsAbertasDoAlvo = alvo ? (db.ncs || []).filter((nc) => nc.visitaId === alvo.id && !nc.inativaNoChecklist && nc.status !== "Resolvida") : [];
            const abertasNaEmpresa = atual
              ? correcoesAbertas(db.ncs, { empresaId: atual.id, visitaIds: new Set(visitas.filter((visita) => visita.empresaId === atual.id).map((visita) => visita.id)) })
              : 0;
            const progressoDoAlvo = progressoDoChecklist(lista);
            const divergenciaDoAlvo = alvo && !ehExecutor ? avisoDeDivergencia(conciliarNcs(lista, (db.ncs || []).filter((nc) => nc.visitaId === alvo.id && !nc.inativaNoChecklist))) : null;
            const etapaDoAlvo = alvo ? proximaEtapaDaVisita(lista.filter((item) => item.status === "Pendente").length, ncsAbertasDoAlvo) : null;
            return (
              <CampoInicio
                usuario={usuarioDaSessao?.nome || ""}
                empresa={atual ? nomeParaExibir(atual) : ""}
                visitaAtiva={alvo ? { empresa: nomeParaExibir(db.empresas[alvo.empresaId]), data: fdata(alvo.data) } : null}
                respondidos={progressoDoAlvo.respondidos}
                total={progressoDoAlvo.total}
                naoConformes={itensNaoConformes(lista)}
                correcoesAbertas={abertasNaEmpresa}
                divergencia={divergenciaDoAlvo}
                somenteCampo={ehExecutor}
                avisoPops={avisoPopsDoInicio}
                painel={painelNode}
                outras={db.visitas
                  .filter((visita) => visita.status === "Em andamento" && visita.id !== alvo?.id && podeAbrirVisita(visita.empresaId))
                  .map((visita) => ({ id: visita.id, rotulo: `${nomeParaExibir(db.empresas[visita.empresaId])} · ${fdata(visita.data)}` }))}
                podeRegistrar={permitido("evidencias.adicionar", alvo?.empresaId) || permitido("visitas.executar", alvo?.empresaId)}
                onContinuar={() => alvo && continuar(alvo.id, true, proximoItem)}
                onRegistrar={() => setRegistrarAberto(true)}
                onCorrecoes={abrirCorrecoesDaEmpresa}
                onAbrirVisita={(id) => continuar(id, true)}
                onVisitas={() => irParaMenu("visitas")}
                onIniciar={permitido("visitas.criar", atual?.id) && atual ? novaVisita : undefined}
                proxima={
                  etapaDoAlvo && !ehExecutor && mostrarCartaoProximaEtapa(etapaDoAlvo)
                    ? {
                        titulo: etapaDoAlvo.titulo,
                        detalhe:
                          etapaDoAlvo.tipo === "checklist" && proximoItem
                            ? `${infosAmbientes.find((info) => info.nome === proximoItem.ambiente)?.rotulo || proximoItem.ambiente} · Item ${itensDoAmbiente.findIndex((item) => item.id === proximoItem.id) + 1} de ${itensDoAmbiente.length}: ${proximoItem.titulo}`
                            : etapaDoAlvo.tipo === "correcoes"
                              ? "Defina ação, responsável e prazo de cada uma."
                              : "Checklist e correções em dia. Falta o relatório.",
                      }
                    : null
                }
                onProxima={() => {
                  if (!alvo || !etapaDoAlvo) return;
                  if (etapaDoAlvo.tipo === "checklist") {
                    if (proximoItem) continuar(alvo.id, true, proximoItem);
                  } else if (etapaDoAlvo.tipo === "correcoes") {
                    irParaTelaCampo("correcoes");
                  } else {
                    setDb((estado) => ({ ...estado, empresaAtualId: alvo.empresaId }));
                    setVisitaAtualId(alvo.id);
                    setView("relatorio");
                  }
                }}
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
                {foco ? (
                  <ChecklistFocoItem
                    item={foco}
                    destaque={destaqueItemId === foco.id}
                    ambientes={infosAmbientes}
                    onAmbiente={(nome) => {
                      const primeiro = lista.find((item) => item.ambiente === nome && item.status === "Pendente") || lista.find((item) => item.ambiente === nome);
                      setAmbienteChecklistAtivo(nome);
                      if (primeiro) setItemFocoId(primeiro.id);
                    }}
                    {...dadosDoAmbienteEmFoco(foco, lista)}
                      {...dadosDeTemperaturaDoItem(foco)}
                    onGravidade={(gravidade) => { setItemFocoId(foco.id); atualizarChecklistItem(foco.id, trocaDeGravidade(foco, gravidade)); }}
                    posicao={posicao + 1}
                    total={lista.length}
                    podeEditar={permitido("visitas.executar", visitaAtual.empresaId)}
                    temAnterior={posicao > 0}
                    temProximo={posicao < lista.length - 1}
                    onStatus={(status) => { setItemFocoId(foco.id); atualizarChecklistItem(foco.id, { status, ...(status !== "Não Conforme" ? { observacao: "" } : {}) }); }}
                    onObservacao={(texto) => atualizarChecklistItem(foco.id, { observacao: texto })}
                    podeFotografar={permitido("evidencias.adicionar", visitaAtual.empresaId)}
                    fila={lista.filter((item) => item.ambiente === foco.ambiente).map((item) => ({ id: item.id, status: item.status }))}
                    onItem={(id) => { setItemFocoId(id); setUltimoItemChecklistId(id); }}
                    onFotoCapturada={(arquivo) => salvarFotoDoItem(foco, arquivo)}
                    verPop={verPopDoItem(foco)}
                    fotosNoItem={fotosDoItem(db.evidencias || [], visitaAtual.id, foco.id).length}
                    onDesfazerFoto={desfazerFotoDoItem}
                    onLimpar={() => void limparRespostaDoItem(foco.id)}
                      onAnterior={() => moverItemFoco(-1)}
                    onProximo={() => moverItemFoco(1)}
                    onAvancar={(status) => avancarAposResponder(foco, status)}
                  />
                ) : (
                  <p className="campo-sub" role="status">{(visitaAtual.ambientes || []).length === 0 ? "Peça ao responsável para definir os ambientes." : "Esta visita não tem itens de checklist."}</p>
                )}
              </section>
            );
          })()
        ) : modo === "campo" && view === "correcoes" && visitaAtual ? (
          correcoesDoCelular()
        ) : view === "acessos" && permitido("usuarios.gerenciar") ? (
          <>
          <ConfiguracaoDeVisitas
            dias={limiteDeDiasDaVisita(db.configuracaoVisitas?.diasAvisoVisitaAberta)}
            podeEditar={!usuarioDaSessao || usuarioDaSessao.perfil === "Administrador"}
            onDias={(dias) => setDb((o) => ({ ...o, configuracaoVisitas: { ...o.configuracaoVisitas, diasAvisoVisitaAberta: dias } }))}
          />
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
            onRenovarAcesso={renovarAcessoDoFiscal}
            onEncerrarAcesso={encerrarAcessoDoFiscal}
            motivoNaoExcluir={(usuario) => motivoParaNaoExcluir(usuario, contextoExclusaoUsuario())}
          />
          </>
        ) : view === "relatoriosemitidos" && atual ? (
          <>
          {abasDeRelatorios("emitidos")}
          <PcRelatoriosEmitidos
            empresa={nomeParaExibir(atual)}
            relatorios={(db.relatoriosEmitidos || []).filter((item) => item.empresaId === atual.id)}
            urlDaFoto={(pathname) => `/api/evidencias/file?pathname=${encodeURIComponent(pathname)}`}
            onImprimir={imprimirDocumento}
            onVoltar={() => setView(visitaAtual ? "relatorio" : "inicio")}
          />
          </>
        ) : view === "dossie" && atual && podeGerarDossie(usuarioDaSessao) ? (
          <>
          {abasDeRelatorios("dossie")}
          <PcDossie
            dados={{ empresa: atual, relatorios: db.relatoriosEmitidos, registros: db.registrosPop, comprovantes: db.comprovantes, colaboradores: db.colaboradores, capacitacoes: db.capacitacoes }}
            urlDaFoto={(pathname) => `/api/evidencias/file?pathname=${encodeURIComponent(pathname)}`}
            onImprimir={imprimirDocumento}
            onVoltar={() => setView("inicio")}
          />
          </>
        ) : view === "evolucao" && atual && painelHoje ? (
          <>
          {abasDeRelatorios("evolucao")}
          <PcEvolucao
            empresa={nomeParaExibir(atual)}
            visitas={db.visitas.filter((visita) => visita.empresaId === atual.id)}
            ncs={(db.ncs || []).filter((nc) => nc.empresaId === atual.id)}
            hoje={hojeISO()}
            onVoltar={() => setView("inicio")}
          />
          </>
        ) : view === "resumo" && atual && painelHoje ? (
          <>
          {abasDeRelatorios("resumo")}
          <PcResumo
            resumo={montarResumo({
              empresaNome: nomeParaExibir(atual),
              empresaCnpj: atual.cnpj,
              relatorios: (db.relatoriosEmitidos || []).filter((item) => item.empresaId === atual.id).map((item) => ({ visitaId: item.visitaId, numero: item.numero, versao: item.versao })),
              visitas: db.visitas.filter((visita) => visita.empresaId === atual.id),
              ncs: (db.ncs || []).filter((nc) => nc.empresaId === atual.id),
              painel: painelHoje,
            })}
            onImprimir={imprimirDocumento}
            onCompartilhar={(texto) => void compartilharResumo(texto)}
            onVoltar={() => setView("inicio")}
          />
          </>
        ) : view === "fila" ? (
          <PcFilaDeEnvio
            itens={fila.itens}
            resumo={fila.resumo}
            online={online}
            sessaoExpirada={fila.sessaoExpirada}
            enviando={fila.enviando}
            limiteTexto={textoDeEspaco(LIMITE_AVISO_FILA_BYTES)}
            nomeDaEmpresa={(empresaId) => nomeParaExibir(db.empresas[empresaId]) || "Empresa"}
            onEnviarAgora={() => void fila.enviarAgora()}
            onRepetir={(id) => void fila.repetir(id)}
            onDescartar={async (id) => {
              const item = fila.itens.find((registro) => registro.id === id);
              if (!item) return;
              if (!(await confirmar("Descartar este item da fila?\n\nO arquivo será apagado deste aparelho e não será enviado. A evidência sai do registro da visita.", { titulo: "Descartar da fila", confirmarRotulo: "Descartar", perigoso: true }))) return;
              await fila.descartar(id);
              setDb((o) => {
                const atualizado: AppDB = { ...o, evidencias: (o.evidencias || []).filter((ev) => ev.id !== id) };
                salvarDBLocal(atualizado);
                return atualizado;
              });
            }}
            onEntrar={() => window.location.assign("/auth/sign-in")}
            onVoltar={() => setView(modo === "campo" ? "campomais" : "inicio")}
          />
        ) : view === "pops" && atual && (telaVisivel("pops") || ehFiscal) ? (
          <section className="central-empresa" aria-label="Documentos da empresa">
            <h1 className="sr-only">{ROTULO_DA_SUBABA[subabaDosDocumentos]}</h1>
            {fichaAbertaRotulo && subabaDosDocumentos === "pops" ? (
              caminhoClicavel(fichaAbertaRotulo, false)
            ) : subabaDosDocumentos === "pops" ? null : (
              <CentralEmpresaNav grupos={gruposVisiveis(quemVeNosDocumentos)} subaba={subabaDosDocumentos} onSubaba={setDocSecao} />
            )}
            <div className="cen-conteudo">{conteudoDeDocumentos(subabaDosDocumentos, atual, false)}</div>
          </section>
        ) : view === "empresas" && showEmpresaForm && permitido("empresas.editar") ? (
          <section className={`central-empresa${editingEmpresaId ? "" : " central-empresa--nova"}`} aria-label={editingEmpresaId ? "Central da Empresa" : "Nova empresa"}>
            {editingEmpresaId && <h1 className="sr-only">{ROTULO_DA_SUBABA[(secaoEmpresa as SubAbaCentral) || "dados"] || "Central da Empresa"}</h1>}
            {!editingEmpresaId && (
            <div className="ui-head cen-cabeca">
              <div>
                {!editingEmpresaId && <h1 className="ui-title">Nova empresa</h1>}
                {!editingEmpresaId && <p className="ui-subtitle">Digite o CNPJ, confira os dados básicos e salve para abrir a Central da Empresa.</p>}
              </div>
              <button
                type="button"
                className="ui-btn ui-btn--secondary"
                onClick={async () => {
                  if (!(await confirmarSaidaDaEdicao())) return;
                  setShowEmpresaForm(false);
                  setEditingEmpresaId(null);
                  setEmpresaSecao(null);
                }}
              >
                Cancelar
              </button>
            </div>
            )}

            {editingEmpresaId && (fichaAbertaRotulo && secaoEmpresa === "pops" ? (
              caminhoClicavel(fichaAbertaRotulo, true)
            ) : secaoEmpresa === "pops" ? null : (
              <CentralEmpresaNav grupos={gruposVisiveis(quemVeNaCentral)} subaba={secaoEmpresa as SubAbaCentral} onSubaba={irParaSubaba} />
            ))}
            {editingEmpresaId && msg && <div className="ui-note cen-msg">{msg}</div>}
            {editingEmpresaId && empresaGerenciada && secaoEmpresa === "dados" && pendenciasDaEmpresa(empresaGerenciada).length > 0 && (
              <div className="priv-faixa" role="status">
                <span>{textoDaPendencia(pendenciasDaEmpresa(empresaGerenciada))}</span>
              </div>
            )}

            <div className="cen-conteudo">
              <>
                {(!editingEmpresaId || secaoEmpresa === "dados") && (
                  <div className={editingEmpresaId ? "mt-4 grid gap-3 md:grid-cols-2" : "nova-form"}>
                    <label className={editingEmpresaId ? undefined : "nova-campo nova-campo--cnpj"}>
                      <span className="mb-1 block text-xs font-bold text-slate-500">CNPJ</span>
                      <div className="flex gap-2">
                        <input
                          className="w-full rounded-xl border p-3 disabled:bg-slate-100 disabled:text-slate-500"
                          value={form.cnpj}
                          disabled={Boolean(editingEmpresaId)}
                          aria-invalid={Boolean(!editingEmpresaId && erroDoCnpj(form.cnpj) && (tocouCnpjEmpresa || tentouSalvarEmpresa || form.cnpj.replace(/\D/g, "").length >= 14))}
                          onBlur={() => setTocouCnpjEmpresa(true)}
                          onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                        />
                        <button type="button" onClick={buscar} className="ui-btn ui-btn--criar" disabled={loading}>
                          {loading ? "..." : editingEmpresaId ? "Consultar de novo" : "Buscar"}
                        </button>
                      </div>
                      {consultaMsg && <span className="cnpj-consulta-msg" role="status">{consultaMsg}</span>}
                      {!editingEmpresaId && (tocouCnpjEmpresa || tentouSalvarEmpresa || form.cnpj.replace(/D/g, "").length >= 14) && erroDoCnpj(form.cnpj) && <span className="ui-field-error" role="alert">{erroDoCnpj(form.cnpj)}</span>}
                    </label>

                    {propostaCnpj && (
                      <PropostaDeCnpjPainel
                        proposta={propostaCnpj}
                        vaiTrocar={camposDaProposta(propostaCnpj).campos.filter((campo) => String((form as Record<string, unknown>)[campo] || "").trim() && String((form as Record<string, unknown>)[campo]) !== camposDaProposta(propostaCnpj).valores[campo]).map((campo) => labels[campo as keyof typeof labels] || campo)}
                        onUsar={usarPropostaDoCnpj}
                        onIgnorar={() => { setPropostaCnpj(null); setConsultaMsg("Consulta ignorada. Preencha à mão ou consulte de novo."); }}
                      />
                    )}

                    {camposDaConsulta.some((campo) => campo !== "tipo") && (
                      <p className="nova-consulta-aviso md:col-span-2" role="status">
                        <span>Preenchido pela consulta. Confira e edite o que precisar.</span>
                        <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setCamposDaConsulta((atual) => atual.filter((campo) => campo === "tipo"))}>Confirmei tudo</button>
                      </p>
                    )}
                    {camposEmpresaPrincipais.filter((k) => k !== "responsavel" && k !== "cargoResponsavel").map((k) => (
                  <label key={k} className={editingEmpresaId ? (k === "cnaeDescricao" ? "md:col-span-2" : undefined) : `nova-campo nova-campo--${k}`}>
                    <span className="mb-1 block text-xs font-bold text-slate-500">
                      {labels[k] || k}
                      {k === "tipo" && camposDaConsulta.includes(k) && <span className="chip-consulta">sugerido pelo CNAE</span>}
                    </span>
                    {k === "tipo" ? (
                      <span className="tipo-estab">
                        <Select className="w-full rounded-xl border p-3" value={form.tipo || "Outro"} onChange={(e) => { mudarCampoDaEmpresa("tipo", e.target.value); setTipoSugerido(false); }} aria-label="Tipo de estabelecimento">
                          {TIPOS_DE_ESTABELECIMENTO.map((tipo) => <option key={tipo.id} value={tipo.rotulo}>{tipo.rotulo}</option>)}
                          {form.tipo && !TIPOS_DE_ESTABELECIMENTO.some((tipo) => tipo.rotulo === form.tipo) && <option value={form.tipo}>{form.tipo}</option>}
                        </Select>
                        {tipoSugerido && <button type="button" className="ui-btn ui-btn--secondary pacote-confirmar-tipo" onClick={() => { setTipoSugerido(false); setCamposDaConsulta((atual) => atual.filter((item) => item !== "tipo")); }}>Confirmar tipo</button>}
                      </span>
                    ) : k === "cnaeDescricao" ? (
                      <CaixaQueCresce
                        className="w-full resize-none rounded-xl border p-3 nova-descricao"
                        value={form[k]}
                        onChange={(e) => mudarCampoDaEmpresa(k, e.target.value)}
                      />
                    ) : (
                      <input
                        type="text"
                        className={`w-full rounded-xl border p-3${camposDaConsulta.includes(k) ? " is-da-consulta" : ""}`}
                        value={form[k]}
                        placeholder={k === "horarioFuncionamento" ? "Ex.: Seg a sáb, 11h às 23h" : k === "nomeFantasia" && semFantasiaNaReceita ? "Sem nome fantasia na Receita" : undefined}
                        aria-invalid={k === "nomeFantasia" && (tocouNomeEmpresa || tentouSalvarEmpresa) && Boolean(erroDoNomeDaEmpresa(form.nomeFantasia, form.razaoSocial))}
                        onBlur={k === "nomeFantasia" ? () => setTocouNomeEmpresa(true) : undefined}
                        onChange={(e) => mudarCampoDaEmpresa(k, e.target.value)}
                      />
                    )}
                    {k === "uf" && avisoUf && <span className="cnpj-uf-aviso" role="status">{avisoUf}</span>}
                    {k === "nomeFantasia" && semFantasiaNaReceita && !form.nomeFantasia.trim() && form.razaoSocial.trim() && (
                      <button type="button" className="ui-btn ui-btn--secondary nova-usar-razao" onClick={() => mudarCampoDaEmpresa("nomeFantasia", form.razaoSocial)}>Usar a razão social</button>
                    )}
                    {k === "email" && semEmailNaConsulta && !form.email.trim() && <span className="cad-dica">A consulta não traz e-mail (a BrasilAPI não informa). Preencha à mão.</span>}
                    {k === "nomeFantasia" && (tocouNomeEmpresa || tentouSalvarEmpresa) && erroDoNomeDaEmpresa(form.nomeFantasia, form.razaoSocial) && <span className="ui-field-error" role="alert">{erroDoNomeDaEmpresa(form.nomeFantasia, form.razaoSocial)}</span>}
                  </label>
                    ))}
                    <PacoteDoTipoPainel
                      tipo={form.tipo || "Outro"}
                      ambientesDaEmpresa={setoresEmpresa}
                      equipamentosDaEmpresa={equipamentosEmpresa.map((item) => `${item.setor}|${item.nome.toLocaleLowerCase("pt-BR")}`)}
                      fluxosAplicaveis={fluxosEmpresa.filter((fluxo) => fluxo.aplicavel).map((fluxo) => fluxo.tipo)}
                      onAplicar={aplicarPacoteDoTipo}
                      onDesfazer={desfazerPacoteDoTipo}
                      aplicadoAgora={Boolean(pacoteDesfazer)}
                    />
                    {(() => {
                      // Responsável do estabelecimento: escolhe-se primeiro o acesso vinculado; nome e cargo vêm desse usuário (em leitura).
                      const vinculado = db.usuarios.find((pessoa) => pessoa.id === usuarioResponsavelForm);
                      const cargoDoUsuario = limparTextoDePessoa(vinculado?.cargo);
                      const podeVincular = !usuarioDaSessao || usuarioDaSessao.perfil === "Administrador";
                      return (
                        <fieldset className={editingEmpresaId ? "md:col-span-2 rounded-xl border border-slate-200 p-3" : "nova-resp md:col-span-2 rounded-xl border border-slate-200 p-3"}>
                          <legend className="px-1 text-xs font-bold text-slate-500">Responsável do estabelecimento</legend>
                          {!editingEmpresaId && !vinculado && (
                            <button type="button" className="ui-btn ui-btn--secondary nova-resp-botao" aria-expanded={respNovaAberta} onClick={() => setRespNovaAberta((aberta) => !aberta)}>
                              {respNovaAberta ? "Recolher responsável" : "Informar responsável (opcional)"}
                            </button>
                          )}
                          <div className={`grid gap-3 md:grid-cols-3${!editingEmpresaId && !vinculado && !respNovaAberta ? " hidden" : ""}`}>
                            {editingEmpresaId && (
                              <label>
                                <span className="mb-1 block text-xs font-bold text-slate-500">Acesso vinculado (quem aprova os POPs)</span>
                                <Select
                                  className="w-full rounded-xl border p-3"
                                  value={usuarioResponsavelForm}
                                  disabled={!podeVincular}
                                  onChange={(e) => {
                                    const escolhido = db.usuarios.find((pessoa) => pessoa.id === e.target.value);
                                    setUsuarioResponsavelForm(e.target.value);
                                    if (escolhido) setForm((atual) => ({ ...atual, responsavel: escolhido.nome, cargoResponsavel: limparTextoDePessoa(escolhido.cargo) || atual.cargoResponsavel }));
                                  }}
                                >
                                  <option value="">Ainda não vinculada</option>
                                  {db.usuarios
                                    .filter((pessoa) => pessoa.perfil === "Administrador" || pessoa.empresaIds.includes(editingEmpresaId))
                                    .map((pessoa) => (
                                      <option key={pessoa.id} value={pessoa.id}>
                                        {pessoa.nome} · {pessoa.perfil}
                                      </option>
                                    ))}
                                </Select>
                                {!podeVincular && <span className="mt-1 block text-xs text-slate-500">Só o Administrador vincula a pessoa de Acessos.</span>}
                              </label>
                            )}
                            <label>
                              <span className="mb-1 block text-xs font-bold text-slate-500">Nome</span>
                              <input type="text" className="w-full rounded-xl border p-3 disabled:bg-slate-100" value={vinculado ? vinculado.nome : form.responsavel} readOnly={Boolean(vinculado)} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
                            </label>
                            <label>
                              <span className="mb-1 block text-xs font-bold text-slate-500">Cargo</span>
                              <input
                                type="text"
                                className="w-full rounded-xl border p-3 disabled:bg-slate-100"
                                value={vinculado && cargoDoUsuario ? cargoDoUsuario : form.cargoResponsavel}
                                readOnly={Boolean(vinculado && cargoDoUsuario)}
                                onChange={(e) => setForm({ ...form, cargoResponsavel: e.target.value })}
                              />
                              {vinculado && !cargoDoUsuario && <span className="mt-1 block text-xs text-slate-500">Sem cargo em Acessos: informe aqui ou cadastre em Acessos.</span>}
                            </label>
                          </div>
                          {!editingEmpresaId && (respNovaAberta || vinculado) && <p className="mt-2 text-xs text-slate-500">Depois de salvar a empresa, escolha o acesso vinculado: nome e cargo passam a vir dele.</p>}
                        </fieldset>
                      );
                    })()}
                    {editingEmpresaId && (
                      <fieldset className="md:col-span-2 rounded-xl border border-slate-200 p-3">
                        <legend className="px-1 text-xs font-bold text-slate-500">Capacidade e turnos</legend>
                        <p className="mb-2 text-xs text-slate-500">{TEXTO_DA_CAPACIDADE}</p>
                        <div className="grid gap-3 md:grid-cols-3">
                          {(
                            [
                              ["refeicoesPorDia", "Refeições por dia"],
                              ["funcionarios", "Funcionários"],
                              ["turnos", "Turnos"],
                            ] as const
                          ).map(([campo, rotulo]) => {
                            const erro = validarCapacidade(capacidadeForm)[campo];
                            return (
                              <label key={campo}>
                                <span className="mb-1 block text-xs font-bold text-slate-500">{rotulo}</span>
                                <input
                                  inputMode="numeric"
                                  className={`w-full rounded-xl border p-3 ${erro ? "border-red-500" : ""}`}
                                  value={capacidadeForm[campo]}
                                  onChange={(e) => setCapacidadeForm({ ...capacidadeForm, [campo]: e.target.value.replace(/\D/g, "") })}
                                  aria-invalid={Boolean(erro)}
                                />
                                {erro && <span className="mt-1 block text-xs text-red-700">{erro}</span>}
                              </label>
                            );
                          })}
                          <label className="md:col-span-2">
                            <span className="mb-1 block text-xs font-bold text-slate-500">Tipo de serviço</span>
                            <input className="w-full rounded-xl border p-3" value={capacidadeForm.tipoDeServico} onChange={(e) => setCapacidadeForm({ ...capacidadeForm, tipoDeServico: e.target.value })} placeholder="Ex.: restaurante comercial, cozinha industrial, escolar" />
                          </label>
                          <label>
                            <span className="mb-1 block text-xs font-bold text-slate-500">Vigilância de referência (opcional)</span>
                            <input className="w-full rounded-xl border p-3" value={capacidadeForm.vigilanciaDeReferencia} onChange={(e) => setCapacidadeForm({ ...capacidadeForm, vigilanciaDeReferencia: e.target.value })} />
                          </label>
                        </div>
                      </fieldset>
                    )}
                    <div className="md:col-span-2">
                      <span className="mb-1 block text-xs font-bold text-slate-500">Cor</span>
                      <BolinhasDeCor valor={form.cor} onEscolher={(cor) => setForm({ ...form, cor })} rotulo="Cor da empresa" variante="linha" />
                    </div>
                  </div>
                )}

                {editingEmpresaId && secaoEmpresa === "manual" && (
                  <div className="mt-4 space-y-4">
                    <IdentificacaoComplementar
                      valores={form as unknown as Record<CampoDaIdentificacao, string>}
                      rotulos={labels}
                      doPerfil={camposDoPerfilRt}
                      onChange={(campo, valor) => {
                        setForm({ ...form, [campo]: valor });
                        setCamposDoPerfilRt((atuais) => semOCampo(atuais, campo));
                      }}
                      onPreencher={() => {
                        const empresaAberta = db.empresas[editingEmpresaId];
                        const rt = empresaAberta ? usuarioRtDaEmpresa(empresaAberta) : undefined;
                        const resultado = preencherIdentificacao(form as unknown as Record<CampoDaIdentificacao, string>, {
                          rt: rt ? { nome: rt.nome, cargo: rt.cargo, crn: rt.crn, telefone: rt.telefone } : undefined,
                          juntar: (cargo, crn) => nomeECargo(cargo, crn, " "),
                          atividade: form.cnaeDescricao,
                          responsavel: form.responsavel,
                          cargoResponsavel: form.cargoResponsavel,
                        });
                        if (resultado.preenchidos.length === 0) return resultado.semFonte.length ? "Nada novo para preencher: o que falta não existe no cadastro." : "Tudo já está preenchido.";
                        setForm({ ...form, ...resultado.valores });
                        setCamposDoPerfilRt((atuais) => [...new Set([...atuais, ...resultado.doPerfil])]);
                        const faltam = resultado.semFonte.length;
                        return `${resultado.preenchidos.length === 1 ? "1 campo preenchido" : `${resultado.preenchidos.length} campos preenchidos`}.${faltam ? ` ${faltam === 1 ? "1 campo continua vazio" : `${faltam} campos continuam vazios`}: não há esse dado no cadastro.` : ""} Salve para guardar.`;
                      }}
                    />
                    <ManualBaseFields tipoDoEstabelecimento={form.tipo} responsabilidades={responsabilidadesEmpresa} onResponsabilidadesChange={setResponsabilidadesEmpresa} setores={setoresEmpresa} onSetoresChange={setSetoresEmpresa} equipamentos={equipamentosEmpresa} onEquipamentosChange={setEquipamentosEmpresa} modo="responsabilidades" />
                  </div>
                )}

                {editingEmpresaId && ePaginaDeCadastro(secaoEmpresa) && db.empresas[editingEmpresaId] && <div className="rev-linha">{(secaoEmpresa === "ambientes" || secaoEmpresa === "equipamentos" ? (["ambientes", "equipamentos"] as const) : ([secaoEmpresa] as const)).map((paginaRevisada) => (
                  <RevisaoDaPagina
                    key={paginaRevisada}
                    pagina={paginaRevisada}
                    empresa={db.empresas[editingEmpresaId]}
                    podeMarcar={permitido("empresas.editar", editingEmpresaId)}
                    naoSalvo={empresaTemAlteracoes}
                    onMarcar={() => {
                      const quem = usuarioDaSessao;
                      atualizarEmpresaDosRegistros(editingEmpresaId, (empresa) => marcarComoRevisado(empresa, paginaRevisada, { nome: quem?.nome || sessaoAtual?.name || "Usuário", cargo: quem?.cargo, id: quem?.id }, new Date().toISOString()));
                      mostrarToast("Página marcada como revisada");
                    }}
                  />
                ))}</div>}

                {editingEmpresaId && (secaoEmpresa === "ambientes" || secaoEmpresa === "equipamentos") && (
                  <div className="cen-cadastro">
                    <ManualBaseFields tipoDoEstabelecimento={form.tipo} responsabilidades={responsabilidadesEmpresa} onResponsabilidadesChange={setResponsabilidadesEmpresa} setores={setoresEmpresa} onSetoresChange={setSetoresEmpresa} vinculos={vinculosEmpresa} onVinculosChange={setVinculosEmpresa} modelos={modelosEmpresa} onModelosChange={setModelosEmpresa} onRenomearAmbiente={renomearAmbienteDaEmpresa} equipamentos={equipamentosEmpresa} onEquipamentosChange={setEquipamentosEmpresa} setoresSalvos={marcadosSalvos.setores} modo="estrutura" />
                  </div>
                )}

                {editingEmpresaId && secaoEmpresa === "fluxos" && (
                  <OperationalFlowsFields fluxos={fluxosEmpresa} setores={setoresEmpresa} onChange={setFluxosEmpresa} fluxosSalvos={marcadosSalvos.fluxos} aberto />
                )}

                {editingEmpresaId && secaoEmpresa === "programas" && (
                  <QualityProgramsFields programas={programasEmpresa} onChange={setProgramasEmpresa} aberto />
                )}

                {editingEmpresaId && secaoEmpresa === "norma" && empresaGerenciada && (
                  <PcNormaAplicavel
                    key={empresaGerenciada.id}
                    uf={empresaGerenciada.uf || ""}
                    municipio={empresaGerenciada.municipio || ""}
                    normasAplicadas={empresaGerenciada.normasAplicadas || []}
                    confirmacao={empresaGerenciada.normasConfirmadasPeloRt}
                    responsavel={responsavelEfetivo(empresaGerenciada, db.usuarios)}
                    responsavelTexto={textoDoResponsavel(responsavelEfetivo(empresaGerenciada, db.usuarios))}
                    onAlterarEmDados={() => irParaSubaba("dados")}
                    podeEditar={permitido("empresas.editar", empresaGerenciada.id)}
                    somenteLeitura={modo === "campo"}
                    onSalvar={(dados) => salvarNormaDaEmpresa(empresaGerenciada.id, dados)}
                  />
                )}

                {editingEmpresaId && secaoEmpresa === "privacidade" && empresaGerenciada && (
                  <PcPrivacidadeEmpresa
                    empresaNome={nomeParaExibir(empresaGerenciada)}
                    iaLiberada={iaLiberada(empresaGerenciada)}
                    textoLiberacao={textoDeLiberacao(empresaGerenciada)}
                    jaFoiLiberada={iaJaFoiLiberada(empresaGerenciada)}
                    podeLiberarIa={permitido("ia.analisar", empresaGerenciada.id)}
                    podeEditarGuarda={permitido("empresas.editar", empresaGerenciada.id)}
                    somenteLeitura={modo === "campo"}
                    guardaDias={guardaDaEmpresa(empresaGerenciada)}
                    vencendo={visitasComGuardaVencendo(
                      db.visitas.filter((visita) => visita.empresaId === empresaGerenciada.id),
                      db.evidencias || [],
                      guardaDaEmpresa(empresaGerenciada),
                      new Date(),
                      undefined,
                      evidenciasEmRelatorioEmitido(db.relatoriosEmitidos)
                    ).map((linha) => ({
                      ...linha,
                      rotulo: `Visita ${numeroVisitaPorId.get(linha.visitaId) || "—"}`,
                      concluidaTexto: formatarData(linha.concluidaEm),
                      venceTexto: formatarData(linha.venceEm),
                    }))}
                    onLiberarIa={(aceite) => alterarPrivacidadeDaEmpresa(empresaGerenciada.id, "ia", { aceite })}
                    onDesligarIa={() => alterarPrivacidadeDaEmpresa(empresaGerenciada.id, "desligar")}
                    onSalvarGuarda={(dias) => alterarPrivacidadeDaEmpresa(empresaGerenciada.id, "guarda", { dias })}
                  />
                )}


                {editingEmpresaId && empresaGerenciada && ["pops", "comprovantes", "pessoas"].includes(secaoEmpresa || "") && conteudoDeDocumentos(secaoEmpresa as SubAbaCentral, empresaGerenciada, true)}
              </>
            </div>

            {(!editingEmpresaId || ["dados", "manual", "ambientes", "equipamentos", "fluxos", "programas"].includes(secaoEmpresa || "")) && (
              <div className={`cen-salvar${editingEmpresaId ? ` ${estadoDaBarraDeSalvar(empresaTemAlteracoes).classe}` : ""}`}>
                {!editingEmpresaId && msg && <span className="cen-salvar-aviso">{msg}</span>}
                {editingEmpresaId && (
                  <span className="cen-salvar-aviso" role="status">
                    <span className="cen-salvar-marca" aria-hidden="true">{estadoDaBarraDeSalvar(empresaTemAlteracoes).marca}</span>
                    {estadoDaBarraDeSalvar(empresaTemAlteracoes).texto}
                  </span>
                )}
                <button type="button" onClick={salvarEmpresa} className={`ui-btn ui-btn--save${editingEmpresaId && !empresaTemAlteracoes ? " is-apagado" : ""}`}>
                  {editingEmpresaId ? "Salvar" : "Salvar e abrir a Central"}
                </button>
              </div>
            )}
          </section>
        ) : view === "visitas" && showVisitaForm ? (
                    <section className="nv-form">
            <div className="nv-topo">
              <div>
                <div className="nv-etiqueta">Nova visita</div>
                <h2 className="nv-titulo">{nomeDeExibicaoDaEmpresa(atual)}</h2>
                <p className="nv-apoio">Esta visita ficará vinculada automaticamente à empresa ativa.</p>
              </div>
              <button type="button" onClick={() => setShowVisitaForm(false)} className="ui-btn ui-btn--secondary">
                Fechar
              </button>
            </div>

            <div className="nv-linha">
              <label className="nv-campo nv-campo--data">
                <span>Data da visita</span>
                <input type="date" className="nv-input" value={vf.data} onChange={(e) => setVf({ ...vf, data: e.target.value })} />
              </label>
              <label className="nv-campo">
                <span>Responsável pela visita *</span>
                <input
                  className="nv-input"
                  required
                  placeholder="Nome do consultor / responsável técnico"
                  value={vf.responsavel}
                  onChange={(e) => setVf({ ...vf, responsavel: e.target.value })}
                />
              </label>
              <label className="nv-campo">
                <span>Identificação profissional (opcional)</span>
                <input
                  className="nv-input"
                  placeholder="Ex.: Nutricionista • CRN 2-00000"
                  value={vf.responsavelIdentificacao}
                  onChange={(e) => setVf({ ...vf, responsavelIdentificacao: e.target.value })}
                />
              </label>
            </div>

            <label className="nv-campo">
              <span>Observações iniciais</span>
              <div className="mbp-voice-wrap">
                <textarea
                  rows={3}
                  className="nv-area"
                  value={vf.observacoes}
                  onChange={(e) => setVf({ ...vf, observacoes: e.target.value })}
                />
                <VoiceDictationButton
                  ativo={campoVozAtivo === "visita-observacoes"}
                  melhorando={campoIaAtivo === "visita-observacoes"}
                  onIniciar={() => iniciarDitado("visita-observacoes", (texto) => setVf((atual) => ({ ...atual, observacoes: juntarTextoDitado(atual.observacoes, texto) })))}
                    onMelhorar={() => melhorarTextoComIa("visita-observacoes", vf.observacoes, (texto) => setVf((atual) => ({ ...atual, observacoes: texto })), "Observações iniciais de uma visita técnica de Boas Práticas em serviços de alimentação.")}
                />
              </div>
            </label>

            <div className="nv-rodape">
              <button type="button" onClick={salvarVisita} disabled={criandoVisita} className="ui-btn ui-btn--criar nv-criar">
                {criandoVisita ? "Criando..." : "Criar visita"}
              </button>
            </div>
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
            onMover={(nome, delta) => atualizarAmbientesDaVisita(moverAmbiente(ambientesSelecionados, nome, delta))}
            ocultos={resumoOcultos(visitaAtual)}
            onMostrar={mostrarAmbienteDaVisita}
            onExcluirOculto={excluirAmbienteOcultoDaVisita}
            onDetalhado={aplicarModeloDetalhadoRestaurante}
            onAdicionar={adicionarPersonalizado}
            cadastro={empresaVisita?.setoresManual || []}
            onModelo={atualizarModeloQuestionarioAmbiente}
            onQuestionario={ehPC && (!usuarioDaSessao || podeEditarQuestionario(usuarioDaSessao)) ? abrirQuestionario : undefined}
            cadastroVazio={!(empresaVisita?.setoresManual || []).length}
            onGerenciarAmbientes={atual && atual.id === visitaAtual.empresaId && permitido("empresas.editar", atual.id) ? () => void abrirSecaoEmpresaPeloMenu("ambientes") : undefined}
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
            pendentesNaFila={fila.resumo.pendentes}
            onAbrirFila={() => setView("fila")}
            vinculo={(() => {
              const item = checklistAtual.find((registro) => registro.id === evidenciaChecklistItemId);
              return {
                ambiente: evidenciaAmbiente ? nomeDeExibicaoDoAmbiente(evidenciaAmbiente) : "",
                temItem: Boolean(item),
                item: item ? item.titulo : "",
              };
            })()}
            grupos={(visitaAtual.ambientes || []).map((nome) => ({
              nome,
              rotulo: nomeDeExibicaoDoAmbiente(nome),
              itens: checklistAtual
                .filter((item) => item.ambiente === nome)
                .map((item, indice) => ({ id: item.id, numero: indice + 1, titulo: item.titulo })),
            }))}
            ambienteSel={evidenciaAmbiente}
            itemSel={evidenciaChecklistItemId}
            onAmbiente={(valor) => { setEvidenciaAmbiente(valor); setEvidenciaChecklistItemId(""); setEvidenciaNcId(""); }}
            onItem={(itemId) => {
              setEvidenciaChecklistItemId(itemId);
              const item = checklistAtual.find((registro) => registro.id === itemId);
              if (item) {
                setEvidenciaAmbiente(item.ambiente);
                const ncDoItem = ncsVisita.find((nc) => nc.checklistItemId === item.id);
                setEvidenciaNcId(ncDoItem ? ncDoItem.id : "");
              }
            }}
            descricao={evidenciaDescricao}
            onDescricao={setEvidenciaDescricao}
            mensagem={evidenciaMsg}
            onLimparMensagem={() => setEvidenciaMsg("")}
            onFoto={async (arquivo) => {
              if (!arquivo) {
                setEvidenciaMsg("Nenhuma foto foi recebida da câmera.");
                return false;
              }
              return adicionarEvidencia(arquivo, "Foto");
            }}
            onAudio={(arquivo) => adicionarEvidencia(arquivo, "Áudio")}
            evidencias={evidenciasVisita.map((ev) => {
              const analises = ev.analisesIA || [];
              const ultima = analises.length ? analises[analises.length - 1] : undefined;
              const itemDaEvidencia = ev.checklistItemId ? checklistAtual.find((registro) => registro.id === ev.checklistItemId) : undefined;
              const numeroDoItem = itemDaEvidencia ? checklistAtual.filter((registro) => registro.ambiente === itemDaEvidencia.ambiente).findIndex((registro) => registro.id === itemDaEvidencia.id) + 1 : 0;
              const ambienteDaEvidencia = ev.ambiente ? nomeDeExibicaoDoAmbiente(ev.ambiente) : "Sem ambiente";
              const ambienteCurto = ev.ambiente ? nomeCurtoDoAmbiente(ev.ambiente) : "Sem ambiente";
              const titulo = numeroDoItem ? `${ambienteCurto} · Item ${numeroDoItem}` : ambienteCurto;
              const tituloCompleto = numeroDoItem ? `${ambienteDaEvidencia} · Item ${numeroDoItem}` : ambienteDaEvidencia;
              const itemDaFila = fila.itens.find((registro) => registro.id === ev.id);
              const hora = formatarHora(ev.criadoEm);
              return {
                id: ev.id,
                tipo: ev.tipo,
                ambiente: ev.ambiente || "",
                ambienteRotulo: ev.ambiente ? nomeDeExibicaoDoAmbiente(ev.ambiente) : "",
                titulo,
                tituloCompleto,
                descricao: ev.descricao || "",
                vinculo: itemDaEvidencia ? `${tituloCompleto} · ${itemDaEvidencia.titulo}` : tituloCompleto,
                dataCurta: `${formatarDataCurta(ev.criadoEm)} · ${hora}`,
                dataCompleta: `${formatarData(ev.criadoEm)} · ${hora}`,
                url: urlEvidencia(ev) || miniaturasDaFila[ev.id] || "",
                envio: ev.envio,
                estadoEnvio: estadoVisivelDaEvidencia(itemDaFila, ev.envio, Boolean(ev.blobPathname || ev.dataUrl), Boolean(ev.blobPathname && arquivosIndisponiveis[ev.id] === ev.blobPathname)),
                onAnexarDeNovo: (arquivo: File) => void anexarDeNovo(ev, arquivo),
                detalhes: detalhesDoRegistro(ev),
                onDetalhes: () => void avisar(detalhesDoRegistro(ev), { titulo: "Detalhes do registro" }),
                onArquivoIndisponivel: (id: string) => {
                  const caminho = (db.evidencias || []).find((registro) => registro.id === id)?.blobPathname;
                  if (caminho) setArquivosIndisponiveis((atual) => (atual[id] === caminho ? atual : { ...atual, [id]: caminho }));
                },
                onEnviarAgora: () => void fila.repetir(ev.id).then(() => fila.enviarAgora()),
                registradoPor: ev.registradoPorNome,
                emRelatorio: evidenciasEmRelatorioEmitido(db.relatoriosEmitidos).has(ev.id),
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
                iaDesligada: !iaLiberada(db.empresas[ev.empresaId]),
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
              onLembrete={podeEnviarLembrete(usuarioDaSessao) ? () => setLembreteAberto(true) : undefined}
              empresa={nomeParaExibir(empresaVisita)}
              data={correcoesDaEmpresa ? "todas as visitas" : fdata(visitaAtual.data)}
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
                  ...(dados.causaRaiz !== undefined ? { causaRaiz: dados.causaRaiz } : {}),
                  status: dados.etapa === "acompanhamento" ? "Em tratamento" : "Aberta",
                })
              }
              onRegistrar={(id, texto, status) => registrarAcompanhamento(id, texto, status)}
              onFotoDepois={fotoDoDepois}
              onAdicionarEvidencia={(id) => {
                const nc = ncsDaTelaDeCorrecoes().find((registro) => registro.id === id);
                setEvidenciaNcId(id);
                setEvidenciaAmbiente(nc?.ambiente || "");
                setEvidenciaChecklistItemId("");
                setView("evidencias");
              }}
              onCriarPop={(codigo) => criarPopsSugeridos(codigo)}
              onAbrirPop={abrirPopsPeloAtalho}
              onLote={(ids, valores) => alteracoesEmLote(ncsDaTelaDeCorrecoes(), ids, valores).forEach((alteracao) => atualizarNC(alteracao.id, alteracao.patch))}
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
              semNorma={conjuntoDaVisita.length === 0 ? MENSAGEM_SEM_NORMA_APLICADA : undefined}
              ncsDaVisita={ncsVisita.map((nc, indice) => ({ numero: indice + 1, titulo: nc.titulo, ambiente: nc.ambiente, popCatalogoId: nc.popCatalogoId || "" }))}
              opcoesDeVinculo={conjuntoDaVisita.map((definicao) => ({ catalogoId: definicao.catalogoId, rotulo: `${definicao.codigo} · ${definicao.titulo}` }))}
              onTrocarVinculo={trocarVinculoDaNc}
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
              const linhaPop = popsDaVisita([{ numero: 1, categoria: foco.categoria, popCatalogoId: ncsVisita.find((nc) => nc.checklistItemId === foco.id)?.popCatalogoId }], empresaVisita?.pops || [], conjuntoDaVisita).linhas[0];
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
              const historicoDoItem = foco.status === "Não Conforme"
                ? historicoDaReincidencia({ id: `${visitaAtual.id}:${foco.id}`, empresaId: visitaAtual.empresaId, visitaId: visitaAtual.id, ambiente: foco.ambiente, categoria: foco.categoria, titulo: foco.titulo }, (db.ncs || []).filter((outra) => !outra.inativaNoChecklist), (id) => db.visitas.find((visita) => visita.id === id)?.data || "")
                : null;
              const seloDoItem = historicoDoItem ? seloDaReincidencia(historicoDoItem.vezes) : "";
              apoio = {
                fonte: fonteParaExibir(foco.referencia),
                reincidencia: seloDoItem ? `${seloDoItem} neste critério. Informe a causa raiz no plano de ação.` : undefined,
                orientacao: foco.orientacao || undefined,
                baseLegal: textoDeBaseLegal(foco) ? { referencia: textoDeBaseLegal(foco) } : undefined,
                pop: linhaPop ? { codigo: linhaPop.sugestao.codigo, titulo: linhaPop.sugestao.titulo, situacao: linhaPop.situacao } : undefined,
                ultimaVisita,
                evidencias: (db.evidencias || [])
                  .filter((ev) => ev.visitaId === visitaAtual.id && ev.checklistItemId === foco.id)
                  .map((ev) => ({ id: ev.id, url: urlEvidencia(ev), tipo: ev.tipo, nome: ev.descricao?.trim() || ev.nomeArquivo, criadoEm: ev.criadoEm })),
              };
            }
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
                onPularAmbiente={(nome) => {
                  const primeiro = lista.find((item) => item.ambiente === nome && item.status === "Pendente") || lista.find((item) => item.ambiente === nome);
                  setAmbienteChecklistAtivo(nome);
                  if (primeiro) setItemFocoId(primeiro.id);
                }}
                ditado={podeEditar ? <DitadoDoAmbiente ambienteRotulo={nomeDeExibicaoDoAmbiente(ambienteDoFoco)} itens={lista.filter((item) => item.ambiente === ambienteDoFoco)} equipamentos={(empresaVisita?.equipamentosSetores || []).filter((equipamento) => equipamento.setor === ambienteDoFoco).map((equipamento) => equipamento.nome)} onGravar={gravarDitadoDoAmbiente} /> : undefined}
                restanteDoLote={podeEditar ? { quantos: planoDoLoteDoAmbiente(ambienteDoFoco).marcar.length, onMarcar: () => void marcarRestanteDoAmbiente(ambienteDoFoco) } : undefined}
                fila={filaDoAmbiente(doAmbiente)}
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
                      miniaturaNoItem={false}
                      {...dadosDoAmbienteEmFoco(foco, lista)}
                      {...dadosDeTemperaturaDoItem(foco)}
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
                      podeFotografar={permitido("evidencias.adicionar", visitaAtual.empresaId)}
                      onFotoCapturada={(arquivo) => salvarFotoDoItem(foco, arquivo)}
                    verPop={verPopDoItem(foco)}
                    fotosNoItem={fotosDoItem(db.evidencias || [], visitaAtual.id, foco.id).length}
                      onDesfazerFoto={desfazerFotoDoItem}
                      onLimpar={() => void limparRespostaDoItem(foco.id)}
                      onAnterior={() => moverItemFoco(-1)}
                      onProximo={() => moverItemFoco(1)}
                    onAvancar={(status) => avancarAposResponder(foco, status)}
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
                onPularAmbiente={(nome) => {
                  const primeiro = lista.find((item) => item.ambiente === nome && item.status === "Pendente") || lista.find((item) => item.ambiente === nome);
                  setAmbienteChecklistAtivo(nome);
                  if (primeiro) setItemFocoId(primeiro.id);
                }}
                fila={filaDoAmbiente(doAmbiente)}
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
                      {...dadosDeTemperaturaDoItem(foco)}
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
                      podeFotografar={permitido("evidencias.adicionar", visitaAtual.empresaId)}
                      onFotoCapturada={(arquivo) => salvarFotoDoItem(foco, arquivo)}
                    verPop={verPopDoItem(foco)}
                    fotosNoItem={fotosDoItem(db.evidencias || [], visitaAtual.id, foco.id).length}
                      onDesfazerFoto={desfazerFotoDoItem}
                      onLimpar={() => void limparRespostaDoItem(foco.id)}
                      onAnterior={() => moverItemFoco(-1)}
                      onProximo={() => moverItemFoco(1)}
                    onAvancar={(status) => avancarAposResponder(foco, status)}
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
                    const criterioCapitulo2 = /cap(?:ítulo|\.)\s*2\b/i.test(item.referencia || "") && Boolean(item.categoria?.startsWith("Operação"));
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
                              {[item.criticidade, item.referencia ? fonteParaExibir(item.referencia).replace(" — ", " · ").replace("Capítulo", "Cap.") : ""]
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
                              title={ncDoItem ? "Abrir a correção desta não conformidade" : "A não conformidade é criada ao registrar o achado"}
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
                          className="ui-btn ui-btn--criar"
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
              naoConformidades: ncsAbertas,
              evidencias: contagemEvidencias.total,
              evidenciasTexto: contagemEvidencias.texto,
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
                  else if (destino === "assinatura") {
                    if (destinoDoCrn === "perfil") setPerfilAberto(true);
                    else setView("acessos");
                  }
                  else abrirSecaoEmpresaPeloMenu("dados");
                }}
                onSelecionavel={(tipo) => void gerarPdfSelecionavel(tipo)}
                onFinalizar={finalizarInspecao}
                avisoFinalizar={avisoParaFinalizar(itensRespondidos(checklistAtual))}
                avisoEmitir={avisoParaEmitir(visitaAtual.status, itensRespondidos(checklistAtual))}
                onReabrir={reabrirInspecao}
                onVoltar={() => setView("visita")}
                podeEmitir={podeEmitirRelatorio(usuarioDaSessao) || (!usuarioDaSessao && true)}
                emitido={(() => {
                  const ultimo = ultimaVersao(db.relatoriosEmitidos || [], visitaAtual.id);
                  return ultimo ? { numero: ultimo.numero, versao: ultimo.versao } : undefined;
                })()}
                onEmitir={() => { if (avisoParaEmitir(visitaAtual.status, itensRespondidos(checklistAtual))) return; setErroDeEmissao(""); setEmitirAberto(true); }}
                onVerEmitidos={() => setView("relatoriosemitidos")}
              />
            )}
          <section id="relatorio-visita" data-empresa={nomeParaExibir(empresaVisita)} data-data-visita={visitaAtual.data} data-visita-id={visitaAtual.id} className={`report-print space-y-4${telaEmLista ? ` rep-offscreen ${classesSecoesRelatorio}` : ""}`}>
            {emissaoSelo && <div className="print-only report-selo" data-modo={emissaoSelo.modo}>{emissaoSelo.texto}</div>}
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
                  {linhasDeTemperaturaDoRelatorio(visitaAtual.checklist || []).length > 0 && (
                    <div className="mt-2 text-sm text-slate-600" data-testid="temperaturas-do-relatorio">
                      <div className="font-medium">Temperaturas medidas e classificadas pelo app</div>
                      <ul className="mt-1 list-disc pl-5">
                        {linhasDeTemperaturaDoRelatorio(visitaAtual.checklist || []).map((linha) => (
                          <li key={linha}>{linha}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(visitaAtual.checklist || []).some((item) => item.porVoz) && (
                    <p className="mt-1 text-sm text-slate-500">
                      {(visitaAtual.checklist || []).filter((item) => item.porVoz).length} {(visitaAtual.checklist || []).filter((item) => item.porVoz).length === 1 ? "resposta foi registrada" : "respostas foram registradas"} por voz (conferidas pelo responsável técnico antes de gravar).
                    </p>
                  )}
                  {contarEmLote(visitaAtual.checklist || []) > 0 && (
                    <p className="mt-1 text-sm text-slate-500">
                      {contarEmLote(visitaAtual.checklist || [])} {contarEmLote(visitaAtual.checklist || []) === 1 ? "item foi marcado" : "itens foram marcados"} como Conforme em lote (resposta em bloco, não individual).
                    </p>
                  )}
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
                  <button type="button" onClick={finalizarInspecao} className="ui-btn ui-btn--save w-full">
                    ✓ Finalizar inspeção
                  </button>
                ) : null}
              </div>


              {pendentesVisita > 0 && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-[var(--pend-bg)] p-4 text-sm text-[color:var(--ink)]">
                  <strong>Atenção:</strong> ainda {pal(pendentesVisita, "existe", "existem")} {qtd(pendentesVisita, "item pendente", "itens pendentes")}{" "}
                  no checklist. O relatório pode ser revisado, mas a
                  inspeção ainda não está totalmente preenchida.
                </div>
              )}
            </div>

            <div data-rep="resumo" className="grid gap-3 md:grid-cols-4">
              <MetricCard label="Progresso do checklist" value={`${percentualChecklist}%`} helper={progressoChecklist.frase} />
              <MetricCard label="Conformidade dos itens avaliados" value={`${percentualConformidade}%`} />
              <MetricCard label="Correções abertas" value={ncsAbertas} helper={`${ncsVisita.length} registradas na visita`} />
              <MetricCard label="Evidências" value={contagemEvidencias.total} helper={contagemEvidencias.texto} />
            </div>

            <article data-rep="resumo" className="print-card rounded-2xl bg-white p-5 shadow-sm">
              <div className="text-xs font-extrabold uppercase text-[color:var(--brand)]">
                Resumo executivo
              </div>
              <h2 className="mt-1 text-xl font-extrabold">Panorama da inspeção</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {pal(itensAvaliadosVisita, "Foi avaliado", "Foram avaliados")} <strong>{qtd(itensAvaliadosVisita, "item", "itens")}</strong>, com{" "}
                <strong>{qtd(conformesVisita, "conforme", "conformes")}</strong> e{" "}
                <strong>{qtd(naoConformesVisita, "item não conforme", "itens não conformes")} no checklist</strong>, resultando em{" "}
                <strong>{percentualConformidade}% de conformidade</strong> entre os itens avaliados.
                {pendentesVisita > 0
                  ? ` ${pal(pendentesVisita, "Permanece", "Permanecem")} ${qtd(pendentesVisita, "item pendente", "itens pendentes")} de avaliação.`
                  : " Não há itens pendentes no checklist."}
              </p>
              {(() => {
                const conciliacao = conciliarNcs(checklistAtual, ncsVisita);
                return conciliacao.diverge ? (
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    Observação: o checklist tem {qtd(conciliacao.itensNaoConformes, "item não conforme", "itens não conformes")} e há {qtd(conciliacao.ncsRegistradas, "não conformidade registrada", "não conformidades registradas")}
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
                    {pendentesVisita > 0 && <span>{qtd(pendentesVisita, "item de checklist pendente", "itens de checklist pendentes")}. </span>}
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
                    <div>{formatarCnpj(empresaVisita?.cnpj) || "Não informado"}</div>
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
                  {respondidos}/{totalChecklist} respondidos • {qtd(itensAvaliadosVisita, "item avaliado", "itens avaliados")} para conformidade
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
                  {qtd(programasControleAtivos.length, "programa", "programas")} • {qtd(popsRelatorio.length, "POP", "POPs")}
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
                  {qtd(equipamentosRelatorio.length, "tipo", "tipos")} • {qtd(totalUnidadesEquipamentos, "unidade", "unidades")}
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

                      {(() => {
                        const comp = comprovacaoDaCorrecao(nc, db.evidencias || []);
                        if (comp.antes.length === 0 && comp.depois.length === 0 && !comp.semComprovacao) return null;
                        const quadro = (titulo: string, fotos: Evidencia[]) => (
                          <div>
                            <span className="text-xs font-extrabold uppercase text-slate-400">{titulo}</span>
                            {fotos.length === 0 ? (
                              <div className="text-xs text-slate-500">Sem foto</div>
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={urlEvidencia(fotos[0])} alt={titulo} className="rep-antes-depois-foto" />
                            )}
                            {fotos[0] && <div className="text-[11px] text-slate-500">{formatarDataHora(fotos[0].criadoEm)}</div>}
                          </div>
                        );
                        return (
                          <div className="rep-antes-depois mt-3" data-pdf-keep>
                            {quadro("Antes", comp.antes)}
                            {quadro("Depois", comp.depois)}
                            {comp.semComprovacao && <div className="rep-sem-comprovacao">Sem comprovação: correção resolvida sem foto do depois.</div>}
                          </div>
                        );
                      })()}

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
                  {qtd(fotosVisita, "foto", "fotos")} • {qtd(audiosVisita, "áudio", "áudios")} • {qtd(analisesIAConfirmadas, "análise confirmada", "análises confirmadas")}
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
                              {analiseConfirmada.revisadaEm ? ` • ${formatarDataHora(analiseConfirmada.revisadaEm)}` : ""}
                            </div>
                          </div>
                        )}
                        <div className="mt-2 text-[11px] text-slate-400">
                          Registro: {formatarDataHora(ev.criadoEm)}
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
                    <strong>{qtd(pendentesVisita, "item pendente", "itens pendentes")}</strong> no
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
                    <strong>{qtd(ncsVisita.length, "não conformidade", "não conformidades")}</strong>.
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
                  <div><strong>Empresa:</strong> {formatarCnpj(empresaVisita?.cnpj) || "CNPJ não informado"} — {nomeSemNumerosNoInicio(empresaVisita?.nomeFantasia || empresaVisita?.razaoSocial || "Empresa")}</div>
                  <div><strong>Visita:</strong> {fdata(visitaAtual.data)} — {numeroVisitaPorId.get(visitaAtual.id) ? `visita ${numeroVisitaPorId.get(visitaAtual.id)}` : "visita"}{visitaAtual.responsavel ? ` · responsável ${visitaAtual.responsavel}` : ""}</div>
                  <div><strong>Status:</strong> {visitaAtual.status}</div>
                  <div><strong>Último encerramento:</strong> {visitaAtual.encerradaEm ? formatarDataHora(visitaAtual.encerradaEm) : "Não registrado"}</div>
                  <div><strong>Relatório gerado em:</strong> {formatarDataHora(new Date())}</div>
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
                              {indice + 1}. {formatarDataHora(evento.criadoEm)} — {evento.de} → {evento.para}
                            </div>
                            <div className="mt-1 text-slate-500">
                              {evento.motivo} • Responsável: {evento.responsavel || visitaAtual.responsavel || "Não informado"}
                              {evento.origem ? ` • Origem: ${evento.origem}` : ""}
                            </div>
                          </li>
                        ))}
                    </ol>
                  ) : (
                    <p className="mt-2 text-slate-500">Nenhuma mudança de status registrada nesta visita.</p>
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
            onEscolherModo={telaModo.escolherModo}
            onAutomatico={telaModo.alternarAutomatico}
            onNome={telaModo.nomearAparelho}
          />
        ) : view === "ajuda" ? (
          <PcAjuda
            primeirosPassos={passosDoGuia.map((passo) => ({ chave: passo.chave, titulo: passo.titulo, feito: passo.feito, onAbrir: () => abrirPassoDoGuia(passo.chave) }))}
            onVoltar={() => setView("inicio")}
            onModoDeTela={() => setView("modotela")}
            guiasLiberados={{ guiaRapido: telaVisivel("guiaRapido"), manualCompleto: telaVisivel("manualCompleto") }}
          />
        ) : view === "inicio" && ehFiscal ? (
          <FiscalInicio
            nome={usuarioDaSessao?.nome.split(" ").filter(Boolean)[0] || "bem-vindo"}
            empresa={atual ? nomeParaExibir(atual) : ""}
            popsAprovados={(atual?.pops || [])
              .filter((pop) => pop.status === "Aprovado" && !pop.arquivado)
              .map((pop) => ({ id: pop.id, codigo: pop.codigo, titulo: pop.titulo, versao: pop.versao }))}
            relatorios={(db.relatoriosEmitidos || []).filter((item) => atual && item.empresaId === atual.id).sort((a, b) => b.emitidoEm.localeCompare(a.emitidoEm)).map((item) => ({ id: item.id, numero: item.numero, versao: item.versao, emitidoEm: item.emitidoEm, motivo: item.motivoDaNovaVersao }))}
            onAbrirRelatorios={() => setView("relatoriosemitidos")}
            onAbrirPops={abrirPopsPeloAtalho}
            onAbrirComprovantes={abrirComprovantes}
          />
        ) : view === "inicio" ? (
          ehPC ? (
            <PcInicio
              nome={usuarioDaSessao?.nome.split(" ").filter(Boolean)[0] || "bem-vindo"}
              avisoPops={avisoPopsDoInicio}
              caixas={caixasDoInicio}
              onNovaVisita={atual && permitido("visitas.criar", atual.id) && !ehExecutor ? novaVisita : null}
              configuracao={configuracaoDoInicio}
              colunas={colunasDoInicioPc}
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
                { valor: empresasVisiveis.length, rotulo: "Empresas ativas", cor: "bg-[#EEF1F5] text-[color:var(--ink)]", icone: "□" },
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
          <ComponenteEmpresas
            totalClientes={empresasVisiveis.length}
            busca={buscaEmpresas}
            onBusca={setBuscaEmpresas}
            podeCriar={permitido("empresas.editar")}
            onNova={iniciarNovaEmpresa}
            onSelecionar={(id) => { setDb((o) => ({ ...o, empresaAtualId: id })); setVisitaAtualId(null); }}
            onGerenciar={(id) => { const alvo = db.empresas[id]; if (alvo) editarEmpresa(alvo); }}
            onAbrirPendencia={(id, falta) => {
              const alvo = db.empresas[id];
              if (!alvo) return;
              const sub = destinoDaPendencia(falta);
              editarEmpresa(alvo);
              setEmpresaSecao(sub);
              lembrarSubaba(id, sub);
            }}
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
            onCor={(id, cor) => {
              if (!exigirPermissao("empresas.editar", id)) return;
              setDb((o) => (o.empresas[id] ? { ...o, empresas: { ...o.empresas, [id]: { ...o.empresas[id], cor } } } : o));
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
                faltas: pendenciasDaEmpresa(e),
                podeGerenciar: permitido("empresas.editar", e.id),
                podeAcessos: permitido("usuarios.gerenciar"),
                arquivada: Boolean(e.arquivada),
                cor: corDaEmpresa(e),
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
                  {qtd(ncsEmpresaForaDoHistorico, "registro", "registros")} de não conformidade da empresa {pal(ncsEmpresaForaDoHistorico, "não está", "não estão")}
                  vinculado{ncsEmpresaForaDoHistorico === 1 ? "" : "s"} a uma visita atualmente existente. Eles foram excluídos dos indicadores
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
                          <div className="rounded-xl bg-[#EEF1F5] p-3">
                            <div className="text-xs font-extrabold uppercase text-[color:var(--ink-2)]">
                              Evidências
                            </div>
                            <div className="mt-1 text-2xl font-extrabold text-[color:var(--ink)]">
                              {evidencias}
                            </div>
                          </div>
                        </div>

                        {ncsDaVisita.length > 0 && (
                          <div className="mt-4 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                            <span className="font-extrabold">
                              Situação das não conformidades:
                            </span>{" "}
                            {qtd(abertas, "aberta", "abertas")} • {qtd(resolvidas, "resolvida", "resolvidas")}
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
            onArquivar={arquivarVisita}
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
              const nEvidencias = (db.evidencias || []).filter((ev) => ev.visitaId === v.id).length;
              const nNcs = (db.ncs || []).filter((nc) => nc.visitaId === v.id && !nc.inativaNoChecklist && !nc.canceladaPeloUsuarioEm).length;
              const pct = progressoDoChecklist(itens).percentual;
              return {
                id: v.id,
                empresaId: v.empresaId,
                evidencias: nEvidencias,
                naoConformidades: nNcs,
                aviso: avisoDeVisitaAberta(v.status, v.data, hojeISO(), limiteDeDiasDaVisita(db.configuracaoVisitas?.diasAvisoVisitaAberta)),
                arquivada: Boolean(v.arquivada),
                podeArquivar: permitido("visitas.concluir", v.empresaId),
                podeCriarNesta: permitido("visitas.criar", v.empresaId),
                empresa: nomeParaExibir(db.empresas[v.empresaId]),
                empresaAtiva: v.empresaId === db.empresaAtualId,
                cor: db.empresas[v.empresaId] ? corDaEmpresa(db.empresas[v.empresaId]) : "#4A5D73",
                numero: numeroVisitaPorId.get(v.id) || "—",
                data: fdata(v.data),
                responsavel: v.responsavel || "Responsável não informado",
                percentual: pct,
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
    </AvisoFotoProvider>
    </RegistrosEmpresaContext.Provider>
    </IaPermitidaContext.Provider>
  );
}
