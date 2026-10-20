import type { NivelTela, TelaKey } from "../lib/screenAccess.ts";
export type Empresa = {
  id: string;
  cnpj: string;
  nomeFantasia: string;
  razaoSocial: string;
  situacao: string;
  cnae: string;
  cnaeDescricao: string;
  tipo: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  municipio: string;
  uf: string;
  telefone: string;
  email: string;
  responsavel: string;
  site?: string;
  redeSocial?: string;
  horarioFuncionamento?: string;
  atividadeDescricao?: string;
  cargoResponsavel?: string;
  consultorNome?: string;
  consultorCpfCnpj?: string;
  consultorEndereco?: string;
  consultorTelefone?: string;
  consultorRegistro?: string;
  dataElaboracaoManual?: string;
  elaboradoPor?: string;
  revisadoPor?: string;
  aprovadoPor?: string;
  horariosFuncionamento?: HorarioFuncionamento[];
  responsabilidadesManual?: ResponsabilidadeManual[];
  setoresManual?: string[];
  modelosQuestionarioAmbientes?: Record<string, string>;
  equipamentosSetores?: EquipamentoSetor[];
  fluxosOperacionais?: FluxoOperacional[];
  programasControleQualidade?: ProgramaControleQualidade[];
  pops?: ProcedimentoOperacionalPadronizado[];
  criadoEm: string;
  /** Cor da empresa (uma da paleta fixa, ex.: "#2E7D4F"); sem ela, a cor é derivada do id. */
  cor?: string;
  /** Arquivada: some da lista principal, sem apagar nada. */
  arquivada?: boolean;
  arquivadaEm?: string;
  /** Privacidade e guarda (opcional, dentro do JSON do estado). */
  privacidade?: PrivacidadeEmpresa;
  /** Normas aplicadas à empresa (ids do catálogo em lib/normas). */
  normasAplicadas?: string[];
  /** O RT confirmou as normas aplicadas (quem e quando). */
  normasConfirmadasPeloRt?: { nome: string; usuarioId?: string; em: string };
  /** Responsável do estabelecimento (RDC 216, 4.11.2): só a pessoa vinculada em Acessos aprova POPs. */
  responsavelEstabelecimento?: { nome: string; cargo: string; usuarioId?: string };
};

export type PrivacidadeEmpresa = {
  /** IA nas fotos: desligada até alguém com permissão liberar (com aceite na primeira vez). */
  iaFotos?: {
    liberada: boolean;
    liberadaPorId?: string;
    liberadaPorNome?: string;
    liberadaEm?: string;
    aceite?: boolean;
  };
  /** Guarda de fotos e áudios, em dias contados da conclusão da visita (padrão sugerido: 180). */
  guardaDias?: number;
};

export type DiaSemana =
  | "Segunda-feira"
  | "Terça-feira"
  | "Quarta-feira"
  | "Quinta-feira"
  | "Sexta-feira"
  | "Sábado"
  | "Domingo";

export type HorarioFuncionamento = {
  dia: DiaSemana;
  aberto: boolean;
  abertura: string;
  fechamento: string;
};

export type PapelResponsabilidadeManual = "Proprietário" | "Consultor/RT";

export type ResponsabilidadeManual = {
  id: string;
  papel: PapelResponsabilidadeManual;
  descricao: string;
  ativa: boolean;
};

export type EstadoEquipamento =
  | "Não avaliado"
  | "Adequado"
  | "Requer atenção"
  | "Inadequado";

export type EquipamentoSetor = {
  id: string;
  setor: string;
  nome: string;
  quantidade: number;
  estado: EstadoEquipamento;
  observacao: string;
};

export type AvaliacaoEquipamentoVisita = {
  id: string;
  equipamentoId?: string;
  ambiente: string;
  nome: string;
  quantidade: number;
  estado: EstadoEquipamento;
  observacao: string;
};

export type TipoFluxoOperacional =
  | "Recebimento"
  | "Armazenamento"
  | "Manipulação e produção"
  | "Higienização de FLV"
  | "Pré-preparo e preparo"
  | "Porcionamento e fracionamento"
  | "Congelamento"
  | "Descongelamento"
  | "Distribuição"
  | "Manejo de resíduos"
  | "Entrada e saída de colaboradores";

export type FluxoOperacional = {
  id: string;
  tipo: TipoFluxoOperacional;
  aplicavel: boolean;
  setorVinculado: string;
  descricao: string;
  responsavel: string;
  controlesRegistros: string;
};

export type StatusProgramaControle =
  | "Não iniciado"
  | "Em implantação"
  | "Implantado"
  | "Não se aplica";

export type ProgramaControleQualidade = {
  id: string;
  nome: string;
  status: StatusProgramaControle;
  responsavel: string;
  frequencia: string;
  registro: string;
  documentoRelacionado: string;
  observacao: string;
};

export type StatusPOP = "Rascunho" | "Aguardando aprovação" | "Em revisão" | "Aprovado" | "Inativo";

/** Quem aprovou e assinou uma versão do POP (dado pessoal: só aparece para quem tem acesso à empresa). */
export type AprovacaoPop = {
  nome: string;
  cargo: string;
  usuarioId: string;
  em: string;
  versao: string;
};

export type PassoPop = { id: string; texto: string };

export type ReferenciaPop = {
  norma: string;
  item: string;
  /** O que a norma pede neste item (vem do catálogo, não é texto da empresa). */
  orientacao: string;
  conferir?: boolean;
};

/** Conteúdo do POP em campos. Os passos ficam em branco para o RT e a empresa preencherem. */
export type ConteudoPop = {
  objetivo?: string;
  campoAplicacao?: string;
  referencias?: ReferenciaPop[];
  responsavelExecucao?: { nome: string; cargo: string };
  frequencia?: string;
  passos?: PassoPop[];
  acaoCorretiva?: string;
  registroProva?: string;
  higienizacao?: {
    superficie: string;
    metodo: string;
    produto: string;
    principioAtivo: string;
    concentracao: string;
    tempoContato: string;
    temperatura: string;
  };
  pragas?: { preventivas: string; corretivas: string; comprovanteEmpresa: string };
  manipuladores?: {
    lavagemMaosEtapas: string;
    lavagemMaosFrequencia: string;
    lesoesSintomas: string;
    /** Só "apto" e a validade: nunca o laudo (dado de saúde sensível). */
    examesApto: "" | "apto" | "nao-apto";
    examesValidade: string;
    examesPeriodicidade: string;
    capacitacaoCargaHoraria: string;
    capacitacaoConteudo: string;
    capacitacaoFrequencia: string;
  };
};

/** Versão guardada de um POP (as aprovadas nunca são apagadas). */
export type VersaoPop = {
  versao: string;
  status: StatusPOP;
  criadaEm: string;
  conteudo?: ConteudoPop;
  aprovacao?: AprovacaoPop;
  revisarAte?: string;
  versaoCatalogo?: Record<string, string>;
};

export type ProcedimentoOperacionalPadronizado = {
  id: string;
  codigo: string;
  titulo: string;
  versao: string;
  status: StatusPOP;
  programaRelacionado: string;
  responsavel: string;
  /** "Revisar até": passou da data, o POP aprovado vira Vencido. */
  proximaRevisao: string;
  /** Arquivado: sai da lista principal, mas continua guardado. */
  arquivado?: boolean;
  /** POP do conjunto da norma (id do catálogo em lib/popsNorma.ts). */
  catalogoId?: string;
  /** Veio do texto-base: normas e itens citados e a versão do catálogo usada. */
  origemTextoBase?: { normas: string[]; itens: string[]; versaoCatalogo: Record<string, string> };
  conteudo?: ConteudoPop;
  /** Aprovação da versão atual (vazia em rascunho). */
  aprovacao?: AprovacaoPop;
  /** Versões anteriores e aprovadas, guardadas. */
  versoes?: VersaoPop[];
  /** Versão do catálogo de cada norma no momento da aprovação. */
  versaoCatalogoAprovada?: Record<string, string>;
};

export type ChecklistStatus = "Pendente" | "Conforme" | "Não Conforme" | "Não se aplica";

export type ChecklistCriticidade = "Crítica" | "Importante" | "Rotina";

export type ChecklistItem = {
  id: string;
  ambiente: string;
  titulo: string;
  categoria: string;
  status: ChecklistStatus;
  observacao: string;
  criticidade?: ChecklistCriticidade;
  /** Gravidade que veio do critério, guardada na primeira vez que o profissional a troca. */
  criticidadeSugerida?: ChecklistCriticidade;
  referencia?: string;
  /** Texto oficial da norma para o critério. Só existe quando foi salvo e conferido; sem ele o bloco "Base legal" não aparece. */
  baseLegal?: string;
  orientacao?: string;
};

export type HistoricoStatusVisita = {
  id: string;
  criadoEm: string;
  de: "Em andamento" | "Concluída";
  para: "Em andamento" | "Concluída";
  motivo: string;
  responsavel?: string;
  origem?: "Relatório" | "Lista de visitas";
};

export type Visita = {
  id: string;
  empresaId: string;
  data: string;
  status: "Em andamento" | "Concluída";
  responsavel: string;
  responsavelIdentificacao?: string;
  observacoes: string;
  conclusao?: string;
  progresso: number;
  criadoEm: string;
  ambientes?: string[];
  modelosQuestionarioAmbientes?: Record<string, string>;
  avaliacoesEquipamentos?: AvaliacaoEquipamentoVisita[];
  checklist?: ChecklistItem[];
  checklistVersao?: number;
  /** Ambientes ocultos: itens e respostas guardados até serem mostrados de novo. */
  ambientesOcultos?: { ambiente: string; itens: ChecklistItem[]; modelo?: string; ocultadoEm: string }[];
  encerradaEm?: string;
  historicoStatus?: HistoricoStatusVisita[];
};

export type HistoricoAcompanhamento = {
  id: string;
  criadoEm: string;
  observacao: string;
  status: "Aberta" | "Em tratamento" | "Resolvida";
};

export type NaoConformidade = {
  id: string;
  empresaId: string;
  visitaId: string;
  ambiente: string;
  checklistItemId: string;
  titulo: string;
  categoria: string;
  criticidade: ChecklistCriticidade;
  referencia: string;
  orientacao: string;
  observacao: string;
  prioridade: string;
  status: "Aberta" | "Em tratamento" | "Resolvida";
  acaoCorretiva?: string;
  responsavelAcao?: string;
  prazo?: string;
  acompanhamento?: string;
  historicoAcompanhamento?: HistoricoAcompanhamento[];
  resolvidaEm?: string;
  /** Marcada como feita por quem não pode resolver; o Consultor/RT confirma antes de resolver. */
  marcadaFeita?: { em: string; por: string; observacao?: string };
  /** Mantém a NC para restauração caso o checklist seja temporariamente alterado para Conforme/Não se aplica. */
  inativaNoChecklist?: boolean;
  /** O usuário limpou a resposta do item: a Correção fica guardada como "Cancelada pelo usuário" e sai das abertas. */
  canceladaPeloUsuarioEm?: string;
  /** Vínculo escolhido à mão com um POP do conjunto da norma (catalogoId); "nenhum" tira o vínculo. Vazio: vale o padrão pela categoria. */
  popCatalogoId?: string;
  criadoEm: string;
};

export type ConfiancaAchadoIA = "Baixa" | "Média" | "Alta";

export type ClassificacaoFotoIA =
  | "Visão geral"
  | "Detalhe"
  | "Possível evidência de não conformidade"
  | "Comprovação de correção"
  | "Não determinada";

export type AchadoFotoIA = {
  titulo: string;
  descricao: string;
  acaoSugerida?: string;
  confianca: ConfiancaAchadoIA;
  requerConfirmacao: boolean;
};

export type AnaliseFotoIA = {
  id: string;
  status: "Aguardando revisão" | "Confirmada" | "Descartada";
  modelo: string;
  geradaEm: string;
  analisavel: boolean;
  situacao?: "Conforme" | "Atenção" | "Possível não conformidade" | "Não foi possível avaliar";
  resumo: string;
  classificacao: ClassificacaoFotoIA;
  achados: AchadoFotoIA[];
  alertasPrivacidade: string[];
  observacoesLimitacoes: string[];
  textoRevisado: string;
  revisadaEm?: string;
  revisadaPor?: string;
};

export type Evidencia = {
  id: string;
  empresaId: string;
  visitaId: string;
  tipo: "Foto" | "Áudio";
  nomeArquivo: string;
  mimeType: string;
  dataUrl?: string;
  blobPathname?: string;
  blobUrl?: string;
  descricao: string;
  ambiente: string;
  checklistItemId?: string;
  ncId?: string;
  analisesIA?: AnaliseFotoIA[];
  /** Só nas feitas pela fila offline: "aguardando" até o arquivo subir, depois "enviada". Ausente = enviada na hora. */
  envio?: "aguardando" | "enviada";
  criadoEm: string;
};

export type PerfilUsuario =
  | "Administrador"
  | "Consultor/RT"
  | "Cliente Gestor"
  | "Gerente"
  | "Executor de campo"
  | "Fiscal";

export type StatusUsuario = "Convidado" | "Ativo" | "Suspenso";

export type UsuarioSistema = {
  id: string;
  authId?: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  status: StatusUsuario;
  empresaIds: string[];
  /** Ajustes de telas liberadas além do padrão do perfil (JSON opcional). */
  telas?: Partial<Record<TelaKey, NivelTela>>;
  criadoEm: string;
  atualizadoEm: string;
  convidadoEm?: string;
  ultimoAcessoEm?: string;
  /** Fiscal: último instante do acesso (ISO). Depois dele a pessoa não entra. Opcional, dentro do JSON do estado. */
  validoAte?: string;
  /** Fiscal: "Encerrar agora" corta o acesso na hora. */
  acessoEncerradoEm?: string;
};

export type AcaoPermissao =
  | "usuarios.gerenciar"
  | "empresas.ver"
  | "empresas.editar"
  | "visitas.criar"
  | "visitas.executar"
  | "visitas.concluir"
  | "relatorios.aprovar"
  | "relatorios.exportar"
  | "ncs.acompanhar"
  | "ncs.marcar_feita"
  | "evidencias.adicionar"
  | "ia.analisar"
  | "auditoria.ver";

export type RegistroAuditoria = {
  id: string;
  criadoEm: string;
  usuarioId: string;
  usuarioNome: string;
  acao: string;
  entidade:
    | "Usuário"
    | "Empresa"
    | "Visita"
    | "Relatório"
    | "Não conformidade"
    | "Evidência"
    | "Sistema";
  entidadeId?: string;
  empresaId?: string;
  visitaId?: string;
  detalhes: string;
};

export type ConfiguracaoAcesso = {
  versao: 1;
  modo: "Preparação" | "Ativo";
  autenticacao: "Não configurada" | "Configurada";
  atualizadoEm: string;
};

export type AppDB = {
  empresas: Record<string, Empresa>;
  empresaAtualId: string | null;
  visitas: Visita[];
  ncs: NaoConformidade[];
  evidencias: Evidencia[];
  usuarios: UsuarioSistema[];
  registrosAuditoria: RegistroAuditoria[];
  configuracaoAcesso: ConfiguracaoAcesso;
};
