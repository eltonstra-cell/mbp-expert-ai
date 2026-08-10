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

export type ChecklistItem = {
  id: string;
  ambiente: string;
  titulo: string;
  categoria: string;
  status: ChecklistStatus;
  observacao: string;
};

export type Visita = {
  id: string;
  empresaId: string;
  data: string;
  status: "Em andamento" | "Concluída";
  responsavel: string;
  observacoes: string;
  progresso: number;
  criadoEm: string;
  ambientes?: string[];
  checklist?: ChecklistItem[];
};

export type NaoConformidade = {
  id: string;
  empresaId: string;
  visitaId?: string;
  ambiente?: string;
  checklistItemId?: string;
  titulo: string;
  prioridade: string;
  status: string;
};

export type AppDB = {
  empresas: Record<string, Empresa>;
  empresaAtualId: string | null;
  visitas: Visita[];
  ncs: NaoConformidade[];
};
