import type { NivelTela, TelaKey } from "../lib/screenAccess.ts";
import type { RelatorioMontado } from "../lib/relatorioDaVisita.ts";
export type Empresa = {
  id: string;
  cnpj: string;
  nomeFantasia: string;
  razaoSocial: string;
  situacao: string;
  cnae: string;
  cnaeDescricao: string;
  /** CNAEs secundários vindos da consulta de CNPJ (opcional). */
  cnaesSecundarios?: { codigo: string; descricao: string }[];
  /** Data (ISO) da última consulta de CNPJ aceita pelo RT (opcional). */
  consultaCnpjEm?: string;
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
  /** Opcional: ambiente com nome próprio -> setor oficial marcado ao qual ele corresponde (a visita mostra um item só). */
  setorOficialDoAmbiente?: Record<string, string>;
  /** Capa opcional dos POPs (desligada por padrão). */
  capaDosPops?: CapaDosPops;
  /** Cartaz "Como lavar as mãos": tema escolhido (o logotipo é o mesmo da capa dos POPs). */
  cartazLavagem?: { tema?: string };
  /** Páginas de Cadastros revisadas pelo RT (quem, quando e a assinatura do que foi revisado). Ausente = nunca revisadas. */
  cadastrosRevisados?: Partial<Record<"ambientes" | "equipamentos" | "fluxos", { nome: string; cargo?: string; usuarioId?: string; em: string; assinatura: string }>>;
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
  /** Guarda dos registros por POP, em dias, quando nenhuma norma estadual aplicada fixa o prazo: quem define é o RT. */
  guardaRegistrosDias?: number;
  /** Questionário personalizado por ambiente (só Administrador e RT editam). Sem entrada: vale o modelo do app. */
  questionarios?: Record<string, ConfigQuestionario>;
  capacidade?: CapacidadeDaEmpresa;
  /** Registro que prova a execução de cada POP (popId -> id do registro), escolhido pelo RT. */
  registroProvaPorPop?: Record<string, string>;
  /** Responsável do estabelecimento (RDC 216, 4.11.2): só a pessoa vinculada em Acessos aprova POPs. */
  responsavelEstabelecimento?: { nome: string; cargo: string; usuarioId?: string };
  /** Passos de implantação ("Colocar a empresa em dia"). Ausente = empresa antiga: tratada como concluída, sem o cartão. */
  implantacao?: { ativa: boolean; criadaEm: string };
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
  /** Transcrição do áudio das evidências por serviço de IA no exterior: desligada até alguém com permissão registrar o consentimento. */
  audioIa?: {
    consentido: boolean;
    consentidoPorId?: string;
    consentidoPorNome?: string;
    consentidoEm?: string;
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
  /** Veio da sugestão do tipo de estabelecimento e o RT ainda não confirmou (opcional). */
  sugerido?: boolean;
  /** Limite de temperatura (id em lib/limitesDeTemperatura) proposto pelo tipo do equipamento (opcional). */
  limiteTemperaturaId?: string;
  /** O RT confirmou o limite proposto (opcional). */
  limiteConfirmado?: boolean;
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

/** Estado de uma versão guardada: a aprovada que uma versão mais nova substituiu vira "Substituída" (continua guardada). */
export type StatusDaVersao = StatusPOP | "Substituída";

/** Frequência do POP em campo estruturado (rodada 12e). "outra" guarda o texto original. */
export type TipoDeFrequencia = "diaria" | "semanal" | "mensal" | "semestral" | "anual" | "outra";
export type FrequenciaDoPop = { tipo: TipoDeFrequencia; texto?: string };

/** Quem fez uma mudança de estado do POP e por quê (arquivar e inativar exigem motivo, autor e data). */
export type MotivoDeMudancaDoPop = { motivo: string; porNome: string; porId?: string; em: string };

/** Quem aprovou e assinou uma versão do POP (dado pessoal: só aparece para quem tem acesso à empresa). */
export type AprovacaoPop = {
  nome: string;
  cargo: string;
  usuarioId: string;
  em: string;
  versao: string;
  /** SHA-256 (hex) do conteúdo aprovado: prova de que o texto aprovado não mudou depois. Ausente nas aprovações antigas. */
  hashDoConteudo?: string;
};

/** `tabela`: id de uma tabela do POP (ConteudoPop.tabelas) que a folha imprime logo depois deste passo. */
/** `subtitulo` abre um grupo de passos (linha sem número na folha; a numeração reinicia no grupo). */
export type PassoPop = { id: string; texto: string; tabela?: string; subtitulo?: string };

/** Item de uma lista de modelo: texto, texto com subitens ou texto que cita uma tabela. */
export type ItemDeModeloPop = string | { texto: string; subitens?: string[]; tabela?: string };

export type GrupoDeModeloPop = { titulo: string | null; itens: ItemDeModeloPop[] };

export type TabelaDoPop = { id: string; titulo: string; colunas: string[]; linhas: string[][] };

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
  /**
   * true: o nome/cargo acima foi digitado à mão e vale como está. false: acompanha o responsável de Empresa › Dados (lido na hora de
   * exibir e imprimir). Ausente (POP antigo): vale o texto gravado, como sempre foi.
   */
  responsavelManual?: boolean;
  frequencia?: string;
  /** Frequência estruturada (rodada 12e). Ausente em POP antigo: lê-se do texto de `frequencia`. */
  frequenciaEstruturada?: FrequenciaDoPop;
  passos?: PassoPop[];
  acaoCorretiva?: string;
  registroProva?: string;
  /** Campos vindos de um modelo do catálogo (todos opcionais; POP sem eles segue igual). */
  alcance?: string;
  definicoes?: { termo: string; texto: string }[];
  materiais?: ItemDeModeloPop[];
  epis?: ItemDeModeloPop[];
  cuidadosEspeciais?: ItemDeModeloPop[];
  acoesNaoConformidade?: ItemDeModeloPop[];
  verificacao?: ItemDeModeloPop[];
  quemRealiza?: ItemDeModeloPop[];
  acoesPreventivas?: ItemDeModeloPop[];
  responsabilidades?: GrupoDeModeloPop[];
  tabelas?: TabelaDoPop[];
  /** Frequência do modelo: só sugestão ao lado do campo Frequência (nunca preenche sozinha). */
  frequenciaDetalhe?: GrupoDeModeloPop[];
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
/** Capa opcional dos POPs (guardada na empresa; todos os campos opcionais, sem migração). Ver lib/capaPop.ts. */
export type CapaDosPops = {
  ativa?: boolean;
  estilo?: "A" | "B" | "C" | "D" | "E" | "F";
  cor?: "laranja" | "verde" | "terra" | "ambar" | "grafite" | "pb";
  icone?: "colorido" | "traco";
  /** Logotipo da empresa (PNG ou JPG já reduzido, em data URL). */
  logotipo?: string;
};

export type VersaoPop = {
  versao: string;
  status: StatusDaVersao;
  /** Quando uma versão mais nova foi aprovada e esta passou a "Substituída". */
  substituidaEm?: string;
  criadaEm: string;
  conteudo?: ConteudoPop;
  aprovacao?: AprovacaoPop;
  revisarAte?: string;
  versaoCatalogo?: Record<string, string>;
  /** Por que esta versão foi criada (opcional, escrito por quem iniciou a nova versão). */
  motivo?: string;
  /** Capa que valia quando a versão foi aprovada: aprovada não muda retroativamente. */
  capa?: CapaDosPops;
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
  /** Motivo, autor e data do último arquivamento (opcional; POP arquivado antes não tem). */
  arquivamento?: MotivoDeMudancaDoPop;
  /** Motivo, autor e data da inativação (POP aprovado tirado de uso; volta como nova versão em rascunho). */
  inativacao?: MotivoDeMudancaDoPop;
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
  /** Motivo da versão em edição (vai para o histórico quando a versão é aprovada). */
  motivoDaVersao?: string;
  /** POP criado de um modelo do catálogo de modelos (lib/popModelos.ts). */
  origemModelo?: { id: string; versaoCatalogo: number };
  /** Ícone da capa escolhido para este POP (um dos 16 de public/capas); vazio = o do mapa de modelos. */
  iconeCapa?: string;
  /** Conferência do conteúdo de modelo: quem e quando. Sem `conferido`, a folha avisa que os valores são do modelo. */
  conferencia?: { conferido: boolean; por?: { nome: string; cargo: string }; em?: string };
  /** Pendências do modelo para o RT marcar uma a uma antes de aprovar. */
  itensAConferir?: { texto: string; feito: boolean; /** Título curto do item (rodada 12f); sem ele, a ficha usa o do modelo ou o trecho até os dois-pontos. */ titulo?: string }[];
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
  /** Temperatura medida e o tipo de limite usado para classificar a resposta (opcional; a resposta pode ser corrigida pelo RT). */
  temperatura?: { valor: number; limiteId: string };
  /** Marcado como Conforme em lote ("marcar o restante do ambiente"): fica registrado no relatório; some quando o RT responde o item. */
  lote?: { em: string };
  /** Resposta que veio de ditado por voz (conferida pelo RT antes de gravar): fica marcada no relatório; some quando o RT responde o item de outra forma. */
  porVoz?: boolean;
  /** A tela avançou sozinha depois desta resposta (avanço automático). A resposta foi do RT, individual; a marca só registra o fato no relatório. */
  avancouSozinho?: boolean;
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
  /** Arquivada: some da lista principal, sem apagar nada (visita abandonada, por exemplo). */
  arquivada?: boolean;
  arquivadaEm?: string;
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
  /** Causa raiz: obrigatória quando o problema volta (reincidência). Opcional nos dados antigos. */
  causaRaiz?: string;
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
  /** "depois" = foto anexada ao resolver a correção (par antes/depois). Sem valor: foto da não conformidade ("antes"). */
  papel?: "antes" | "depois";
  /** Carimbo gravado pelo app e conferido no servidor: quem registrou (a data e hora da captura é criadoEm). Sem GPS. */
  registradoPorId?: string;
  registradoPorNome?: string;
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
  /** Registro no CRN (nutricionista), opcional; entra na assinatura do relatório emitido. Vazio: "CRN a preencher". */
  crn?: string;
  /** Cargo profissional que sai na assinatura do relatório (ex.: "Nutricionista RT"). Vazio: "Responsável técnico". */
  cargo?: string;
  /** Telefone do RT, opcional; só entra no relatório emitido quando preenchido. */
  telefone?: string;
  /** RT: CPF ou CNPJ, endereço e "profissão e registro" que o Manual usa (opcionais; só Administrador e o próprio RT leem ou gravam). */
  cpfCnpj?: string;
  endereco?: string;
  registroProfissional?: string;
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

/** Registro de execução de um POP. Nunca é editado: a correção vira um novo registro que cita o anterior. */
/** Pergunta do questionário de um ambiente: do modelo da norma ou criada pela empresa. Nunca é apagada se já foi usada. */
export type PerguntaDoQuestionario = {
  id: string;
  origem: "modelo" | "empresa";
  titulo: string;
  categoria: string;
  criticidade?: ChecklistCriticidade;
  /** Fonte como já está no app (ex.: Manual de Boas Práticas); o app mostra "conferir". */
  referencia?: string;
  orientacao?: string;
  ativa: boolean;
  ordem: number;
  /** Obrigatória para desligar pergunta do modelo. */
  justificativaDeDesligar?: string;
  desligadaPorId?: string;
  desligadaPorNome?: string;
  desligadaEm?: string;
  /** Pergunta que o modelo ganhou depois que a empresa editou o ambiente: entra ativa e fica marcada como nova. */
  nova?: boolean;
  criadoEm: string;
};

export type ConfigQuestionario = {
  perguntas: PerguntaDoQuestionario[];
  atualizadoEm: string;
  ambiente?: string;
};

export type RegistroPop = {
  id: string;
  empresaId: string;
  popId: string;
  /** Versão do POP vigente quando o registro foi feito. */
  popVersao: string;
  /** Data e hora do que foi feito (ISO); editável na hora de criar. */
  dataHora: string;
  responsavel: string;
  /** Quem estava no app (o servidor grava o dele). */
  responsavelId?: string;
  descricao: string;
  ambiente?: string;
  corrigeRegistroId?: string;
  /** Verificação do que foi feito (quem conferiu e como): texto livre (opcional). */
  verificacao?: string;
  /** Houve desvio da regra do POP; então a ação corretiva é pedida. */
  desvio?: boolean;
  acaoCorretiva?: string;
  criadoEm: string;
};

export type TipoComprovante = "pragas" | "reservatorio" | "contrato-rt" | "outro";

/** Documento de terceiros com validade (certificado de pragas, limpeza do reservatório, contrato do RT...). */
export type ComprovanteTerceiro = {
  id: string;
  empresaId: string;
  tipo: TipoComprovante;
  emissor: string;
  /** AAAA-MM-DD */
  dataServico: string;
  /** AAAA-MM-DD */
  validade: string;
  blobPathname?: string;
  nomeArquivo?: string;
  mimeType?: string;
  observacao: string;
  /** POP a que o comprovante pertence (opcional). Sem POP: comprovante geral da empresa. */
  popId?: string;
  /** Comprovante que este renovou. */
  renovaId?: string;
  /** Id do comprovante que este renovou pelo botão "Renovar" (opcional); o anterior guarda o id deste em "substituidoPor". */
  renovaDe?: string;
  /** Id do comprovante que o substituiu numa renovação (opcional): o antigo ganha a etiqueta "Substituído" e sai das contagens. */
  substituidoPor?: string;
  /** Histórico das trocas de POP vinculado (opcional); o comprovante nunca é apagado ao trocar. */
  historicoDePop?: { em: string; porId?: string; porNome?: string; de?: string; para?: string }[];
  criadoPorId?: string;
  criadoEm: string;
};

/** Pessoa da equipe da empresa para o treinamento nominal. Não é conta de acesso: só nome, cargo e se está ativa. */
export type Colaborador = {
  id: string;
  empresaId: string;
  nome: string;
  cargo: string;
  ativo: boolean;
  criadoEm: string;
};

/** Capacitação nominal: só nome (pelo colaborador), conteúdo, horas e datas. Nada de saúde, CPF, foto ou nascimento. */
export type Capacitacao = {
  id: string;
  empresaId: string;
  colaboradorId: string;
  conteudo: string;
  cargaHoraria: number;
  /** AAAA-MM-DD */
  data: string;
  /** AAAA-MM-DD; vazio = sem vencimento. Sempre editável. */
  venceEm: string;
  instrutor?: string;
  criadoEm: string;
};

/** Leitura de uma versão de POP por um colaborador. Nova versão do POP começa sem leituras. */
export type LeituraPop = {
  id: string;
  empresaId: string;
  popId: string;
  popVersao: string;
  colaboradorId: string;
  /** AAAA-MM-DD */
  data: string;
  registradoPorId?: string;
  /** Confirmada pelo próprio colaborador com PIN (rodada 12e). Só pessoa, versão, data e hora (criadoEm). */
  viaPin?: boolean;
  criadoEm: string;
};

/** Instantâneo do que o relatório emitido mostrava; nunca muda depois da emissão. */
export type InstantaneoDoRelatorio = {
  empresa: { nome: string; cnpj: string; municipio?: string; uf?: string };
  visita: { id: string; data: string; responsavel: string; observacoes: string; conclusao: string };
  conformidade: { conformes: number; naoConformes: number; respondidos: number; percentual: number | null };
  itens: { id: string; ambiente: string; titulo: string; categoria: string; status: string; observacao: string; criticidade?: string }[];
  ncs: { id: string; titulo: string; ambiente: string; criticidade: string; referencia?: string; status: string; observacao: string; acaoCorretiva?: string; responsavelAcao?: string; prazo?: string; resolvidaEm?: string; semComprovacao: boolean }[];
  evidencias: { id: string; tipo: string; ambiente: string; descricao: string; criadoEm: string; registradoPorNome?: string; blobPathname?: string; papel?: string; ncId?: string; checklistItemId?: string }[];
  /** Seções marcadas em "Conteúdo do relatório" na hora da emissão. Sem o campo (relatórios antigos): todas. */
  secoes?: { resumo: boolean; ambientes: boolean; ncs: boolean; evidencias: boolean; pops: boolean };
  /** Relatório montado só com dados registrados (resumo, pontuação por setor, comparação, reincidências, marcas, mapa), com as fórmulas escritas. Relatórios antigos não têm. */
  montado?: RelatorioMontado;
  /** POPs da empresa no dia da emissão (só código, título, versão, situação e quem aprovou). */
  pops?: { codigo: string; titulo: string; versao: string; situacao: string; aprovadoPor?: string; aprovadoEm?: string }[];
};

/** Relatório de visita emitido e assinado. Gravado só pelo servidor, que também atribui o número. */
export type RelatorioEmitido = {
  id: string;
  empresaId: string;
  visitaId: string;
  /** PC-AAAA-NNNN, sequencial por empresa e ano; a versão 2 mantém o número da versão 1. */
  numero: string;
  ano: number;
  sequencia: number;
  versao: number;
  emitidoEm: string;
  emitidoPorId?: string;
  assinatura: { nome: string; cargo: string; crn: string; crnPendente: boolean; telefone?: string };
  aviso: string;
  motivoDaNovaVersao?: string;
  instantaneo: InstantaneoDoRelatorio;
};

/** Capacidade e turnos: usados para dimensionar o plano e sugerir a frequência das visitas. Não é critério de norma. */
export type CapacidadeDaEmpresa = {
  refeicoesPorDia?: number;
  funcionarios?: number;
  turnos?: number;
  tipoDeServico?: string;
  vigilanciaDeReferencia?: string;
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
  /** Coleções novas, opcionais no JSON do estado (sem migration). */
  registrosPop?: RegistroPop[];
  comprovantes?: ComprovanteTerceiro[];
  colaboradores?: Colaborador[];
  capacitacoes?: Capacitacao[];
  leiturasPop?: LeituraPop[];
  /** Só o servidor grava (rota de emissão); o PUT do estado nunca substitui esta lista. */
  relatoriosEmitidos?: RelatorioEmitido[];
  /** Aviso de visita aberta há muito tempo (só o Administrador muda; sem valor vale 3 dias). */
  configuracaoVisitas?: { diasAvisoVisitaAberta?: number };
};
