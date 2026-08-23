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
  criadoEm: string;
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
  ncId?: string;
  criadoEm: string;
};

export type AppDB = {
  empresas: Record<string, Empresa>;
  empresaAtualId: string | null;
  visitas: Visita[];
  ncs: NaoConformidade[];
  evidencias: Evidencia[];
};
