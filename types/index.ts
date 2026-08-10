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

export type AmbienteVisita = {
  id: string;
  nome: string;
  origem: "Padrão" | "Personalizado";
  ordem: number;
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
  ambientes: AmbienteVisita[];
};

export type NaoConformidade = {
  id: string;
  empresaId: string;
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
