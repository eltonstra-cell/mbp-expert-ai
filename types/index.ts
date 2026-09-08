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

export type StatusPOP = "Rascunho" | "Em revisão" | "Aprovado" | "Inativo";

export type ProcedimentoOperacionalPadronizado = {
  id: string;
  codigo: string;
  titulo: string;
  versao: string;
  status: StatusPOP;
  programaRelacionado: string;
  responsavel: string;
  proximaRevisao: string;
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
  referencia?: string;
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
  checklist?: ChecklistItem[];
  checklistVersao?: number;
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
  /** Mantém a NC para restauração caso o checklist seja temporariamente alterado para Conforme/Não se aplica. */
  inativaNoChecklist?: boolean;
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
  criadoEm: string;
};

export type PerfilUsuario =
  | "Administrador"
  | "Consultor/RT"
  | "Cliente Gestor";

export type StatusUsuario = "Convidado" | "Ativo" | "Suspenso";

export type UsuarioSistema = {
  id: string;
  authId?: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  status: StatusUsuario;
  empresaIds: string[];
  criadoEm: string;
  atualizadoEm: string;
  convidadoEm?: string;
  ultimoAcessoEm?: string;
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
