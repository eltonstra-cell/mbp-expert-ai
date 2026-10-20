import type { PerfilUsuario } from "../types/index.ts";

// Textos da aba "Perfis e permissões" para os perfis novos (Pode / Não pode).
export const PERFIS_NOVOS: PerfilUsuario[] = ["Executor de campo", "Fiscal"];

export const PODE_E_NAO_PODE: Partial<Record<PerfilUsuario, { pode: string[]; naoPode: string[] }>> = {
  "Executor de campo": {
    pode: [
      "Ver o Início e continuar o checklist das visitas em andamento",
      "Responder o Checklist e editar observações",
      "Registrar fotos e áudios (Evidências e Registrar agora)",
      "Trabalhar só nas empresas atribuídas a ele",
    ],
    naoPode: [
      "Ver Correções, Relatório, Ambientes, Empresas, POPs e documentos",
      "Ver Acessos e Administração",
      "Ver ou alterar outras empresas",
      "Usar a IA",
    ],
  },
  Fiscal: {
    pode: [
      "Ler relatórios emitidos, dossiê da empresa e POPs aprovados (onde já existem)",
      "Entrar até a data de validade, de 3 a 30 dias",
    ],
    naoPode: [
      "Ver checklist, evidências, correções e rascunhos",
      "Editar qualquer coisa",
      "Ver Acessos e Administração",
      "Entrar depois da validade ou depois de “Encerrar agora”",
    ],
  },
};
