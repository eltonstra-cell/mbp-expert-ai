"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MetricCard from "@/components/MetricCard";
import type {
  AppDB,
  ChecklistCriticidade,
  ChecklistItem,
  ChecklistStatus,
  Empresa,
  Evidencia,
  Visita,
} from "@/types";
import { emptyDB, loadDB, saveDB } from "@/lib/storage";

type View = "inicio" | "empresas" | "visitas" | "visita" | "ambientes" | "checklist" | "ncs" | "plano" | "acompanhamento" | "historico" | "evidencias" | "relatorio";

const NAV_STORAGE_KEY = "mbp-expert-ai:navegacao:v1";
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
  responsavel: "Responsável",
};

const ambientesPadrao = [
  "Recebimento",
  "Armazenamento seco / Estoque",
  "Câmara refrigerada",
  "Câmara de congelamento",
  "Pré-preparo",
  "Preparo / Cocção",
  "Distribuição / Exposição",
  "Higienização de utensílios",
  "DML / Material de limpeza",
  "Sanitários / Vestiários",
  "Área de resíduos",
  "Área externa",
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

function criarChecklist(ambientes: string[]): ChecklistItem[] {
  return ambientes.flatMap((ambiente, ambienteIndex) => {
    const itens = modelosChecklist[ambiente] || [
      { categoria: "Estrutura", titulo: "Estrutura em boas condições de conservação" },
      { categoria: "Higiene", titulo: "Ambiente limpo e organizado" },
      { categoria: "Processo", titulo: "Fluxo operacional reduz risco de contaminação" },
      { categoria: "Identificação", titulo: "Materiais e produtos estão identificados adequadamente" },
      { categoria: "Boas práticas", titulo: "Boas práticas são observadas no ambiente" },
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

export default function Home() {
  const [db, setDb] = useState<AppDB>(emptyDB);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("inicio");
  const [showEmpresaForm, setShowEmpresaForm] = useState(false);
  const [editingEmpresaId, setEditingEmpresaId] = useState<string | null>(null);
  const [showVisitaForm, setShowVisitaForm] = useState(false);
  const [visitaAtualId, setVisitaAtualId] = useState<string | null>(null);
  const [criandoVisita, setCriandoVisita] = useState(false);
  const [ambientesSelecionados, setAmbientesSelecionados] = useState<string[]>([]);
  const [ambientePersonalizado, setAmbientePersonalizado] = useState("");
  const [ambienteChecklistAtivo, setAmbienteChecklistAtivo] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [evidenciaDescricao, setEvidenciaDescricao] = useState("");
  const [evidenciaAmbiente, setEvidenciaAmbiente] = useState("");
  const [evidenciaNcId, setEvidenciaNcId] = useState("");
  const [evidenciaMsg, setEvidenciaMsg] = useState("");
  const [filtroAcompanhamento, setFiltroAcompanhamento] = useState<
    "Todos" | "Abertas" | "Em tratamento" | "Resolvidas" | "Vencidas"
  >("Todos");
  const [textoAcompanhamento, setTextoAcompanhamento] = useState<Record<string, string>>({});
  const [statusAcompanhamento, setStatusAcompanhamento] = useState<
    Record<string, "Aberta" | "Em tratamento" | "Resolvida">
  >({});
  const [syncStatus, setSyncStatus] = useState<
    "conectando" | "sincronizado" | "local" | "erro"
  >("conectando");
  const [syncErroVisivel, setSyncErroVisivel] = useState(false);
  const [syncAtualizadoEm, setSyncAtualizadoEm] = useState("");
  const ultimaNuvemRef = useRef<number>(0);
  const ultimaNuvemVersaoRef = useRef<string | null>(null);
  const aplicandoNuvemRef = useRef(false);
  const falhasSyncRef = useRef(0);
  const retrySyncTimerRef = useRef<number | null>(null);

  const [form, setForm] = useState({
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
  });

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

  useEffect(() => {
    const sincronizarAoVoltar = () => {
      if (document.visibilityState === "visible") {
        void buscarEstadoNuvem(false);
      }
    };

    const sincronizarAoFocar = () => {
      void buscarEstadoNuvem(false);
    };

    document.addEventListener("visibilitychange", sincronizarAoVoltar);
    window.addEventListener("focus", sincronizarAoFocar);

    return () => {
      document.removeEventListener("visibilitychange", sincronizarAoVoltar);
      window.removeEventListener("focus", sincronizarAoFocar);
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

    const novo = cloud.data as AppDB;
    aplicandoNuvemRef.current = true;
    ultimaNuvemVersaoRef.current = cloud.updatedAt || null;
    ultimaNuvemRef.current = cloud.updatedAt
      ? new Date(cloud.updatedAt).getTime()
      : 0;

    setDb(novo);
    saveDB(novo);

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
    try {
      // Consulta leve: retorna apenas configured + updatedAt.
      const metaResponse = await fetch("/api/state?meta=1", {
        method: "GET",
        cache: "no-store",
      });
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
      let s = loadDB();

      setSyncStatus("conectando");

      try {
        const response = await fetch("/api/state", {
          method: "GET",
          cache: "no-store",
        });
        const cloud = await response.json();

        if (cloud?.configured) {
          if (cloud.data && typeof cloud.data === "object") {
            // Nuvem já existente: passa a ser a fonte compartilhada.
            s = cloud.data as AppDB;
            saveDB(s);
            ultimaNuvemRef.current = cloud.updatedAt
              ? new Date(cloud.updatedAt).getTime()
              : 0;
            ultimaNuvemVersaoRef.current = cloud.updatedAt || null;
            sincronizacaoOk();
            setSyncStatus("sincronizado");
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
        // Continua funcionando pelo localStorage enquanto tenta reconectar.
        registrarFalhaSincronizacao();
      }

    const vs = (s.visitas || []).map((v: any) => ({
      id: v.id,
      empresaId: v.empresaId,
      data: v.data || hojeISO(),
      status: v.status === "Concluída" ? "Concluída" : "Em andamento",
      encerradaEm: typeof v.encerradaEm === "string" ? v.encerradaEm : undefined,
      historicoStatus: Array.isArray(v.historicoStatus) ? v.historicoStatus : [],
      responsavel: v.responsavel || "",
      observacoes: v.observacoes || "",
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
    })) as Visita[];

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
      visitas: vs,
      ncs: ncsSincronizadas,
      evidencias: Array.isArray((s as any).evidencias) ? (s as any).evidencias : [],
    };

    setDb(dbNormalizado);

    // Restaura a tela e a visita em que o consultor estava antes de atualizar
    // a página. A navegação é local ao dispositivo; os dados continuam na nuvem.
    try {
      const rawNav = window.localStorage.getItem(NAV_STORAGE_KEY);
      if (rawNav) {
        const nav = JSON.parse(rawNav) as {
          view?: View;
          visitaAtualId?: string | null;
          ambienteChecklistAtivo?: string | null;
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
              (visitaSalva.ambientes || []).includes(nav.ambienteChecklistAtivo)
            ) {
              setAmbienteChecklistAtivo(nav.ambienteChecklistAtivo);
            }
          } else {
            setVisitaAtualId(null);
            setView("visitas");
          }
        } else if (viewSalva && ["inicio", "empresas", "visitas"].includes(viewSalva)) {
          setView(viewSalva);
          setVisitaAtualId(null);
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
        NAV_STORAGE_KEY,
        JSON.stringify({ view, visitaAtualId, ambienteChecklistAtivo })
      );
    } catch {
      // A navegação continua funcionando mesmo se o armazenamento local falhar.
    }
  }, [view, visitaAtualId, ambienteChecklistAtivo, ready]);

  useEffect(() => {
    if (!ready) return;

    saveDB(db);

    if (aplicandoNuvemRef.current) return;

    const timer = window.setTimeout(async () => {
      try {
        // Checagem leve antes de gravar: não baixa o banco completo.
        const metaResponse = await fetch("/api/state?meta=1", {
          method: "GET",
          cache: "no-store",
        });
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
      if (document.visibilityState === "visible") {
        void buscarEstadoNuvem();
      }
    };

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void buscarEstadoNuvem();
      }
    }, 5000);

    window.addEventListener("focus", atualizar);
    document.addEventListener("visibilitychange", atualizar);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", atualizar);
      document.removeEventListener("visibilitychange", atualizar);
    };
  }, [ready]);

  useEffect(() => {
    if (!visitaAtualId) return;
    const visita = db.visitas.find((v) => v.id === visitaAtualId);
    if (visita && db.empresaAtualId && visita.empresaId !== db.empresaAtualId) {
      setVisitaAtualId(null);
      if (VISIT_VIEWS.includes(view)) setView("visitas");
    }
  }, [db.empresaAtualId, db.visitas, visitaAtualId, view]);

  const atual = db.empresaAtualId ? db.empresas[db.empresaAtualId] : undefined;
  const visitaAtual = visitaAtualId ? db.visitas.find((v) => v.id === visitaAtualId) : undefined;
  const empresaVisita = visitaAtual ? db.empresas[visitaAtual.empresaId] : undefined;
  const visitas = useMemo(
    () =>
      [...db.visitas].sort((a, b) =>
        (b.criadoEm || b.data || "").localeCompare(a.criadoEm || a.data || "")
      ),
    [db.visitas]
  );

  const visitasEmpresaAtual = useMemo(
    () =>
      visitas.filter((v) => v.empresaId === db.empresaAtualId),
    [visitas, db.empresaAtualId]
  );

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
  const respondidos = checklistAtual.filter((i) => i.status !== "Pendente").length;
  const totalChecklist = checklistAtual.length;
  const percentualChecklist = totalChecklist
    ? Math.round((respondidos / totalChecklist) * 100)
    : 0;
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

  async function salvarEstadoImediato(novo: AppDB) {
    saveDB(novo);
    setDb(novo);
    setSyncStatus("conectando");

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
      return true;
    } catch (error) {
      console.error("Falha ao salvar alteração na nuvem:", error);
      setSyncStatus("erro");
      window.alert(
        "A alteração foi salva neste dispositivo, mas não foi possível confirmar a gravação na nuvem. Verifique a conexão antes de sair da página."
      );
      return false;
    }
  }

  async function finalizarInspecao() {
    if (!visitaAtual) return;

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
              ...visita,
              status: "Concluída",
              conclusao: (visita.conclusao || "").trim() || gerarConclusaoAutomatica(),
              encerradaEm: agora,
              historicoStatus: [
                ...(visita.historicoStatus || []),
                {
                  id: crypto.randomUUID(),
                  criadoEm: agora,
                  de: visita.status,
                  para: "Concluída",
                  motivo: "Inspeção finalizada pelo usuário.",
                },
              ],
            } as any)
          : visita
      ),
    };

    await salvarEstadoImediato(novo);
  }

  async function reabrirInspecao() {
    if (!visitaAtual) return;

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
          ? ({
              ...visita,
              status: "Em andamento",
              historicoStatus: [
                ...(visita.historicoStatus || []),
                {
                  id: crypto.randomUUID(),
                  criadoEm: agora,
                  de: visita.status,
                  para: "Em andamento",
                  motivo: "Inspeção reaberta pelo usuário.",
                },
              ],
            } as any)
          : visita
      ),
    };

    await salvarEstadoImediato(novo);
  }

  async function buscar() {
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
    const id = editingEmpresaId || form.cnpj.replace(/\D/g, "") || crypto.randomUUID();
    const anterior = editingEmpresaId ? db.empresas[editingEmpresaId] : undefined;
    const emp: Empresa = {
      id,
      ...form,
      cnpj: editingEmpresaId ? (anterior?.cnpj || form.cnpj) : form.cnpj,
      nomeFantasia: form.nomeFantasia || form.razaoSocial || "Sem nome",
      criadoEm: anterior?.criadoEm || new Date().toISOString(),
    };
    setDb((o) => ({
      ...o,
      empresaAtualId: id,
      empresas: { ...o.empresas, [id]: emp },
    }));
    setEditingEmpresaId(null);
    setShowEmpresaForm(false);
    setView("empresas");
  }

  function editarEmpresa(empresa: Empresa) {
    setForm({
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
    });
    setEditingEmpresaId(empresa.id);
    setMsg("");
    setShowEmpresaForm(true);
    setView("empresas");
  }

  function novaVisita() {
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
      checklistVersao: 2,
    };
    setDb((o) => ({ ...o, visitas: [v, ...o.visitas] }));
    setShowVisitaForm(false);
    setVisitaAtualId(v.id);
    setView("visita");
    setTimeout(() => setCriandoVisita(false), 500);
  }

  function continuar(id: string) {
    const v = db.visitas.find((x) => x.id === id);
    if (!v) return;
    setDb((o) => ({ ...o, empresaAtualId: v.empresaId }));
    setVisitaAtualId(id);
    setView("visita");
  }

  function abrirAmbientes() {
    if (!visitaAtual) return;
    setAmbientesSelecionados(visitaAtual.ambientes || []);
    setAmbientePersonalizado("");
    setView("ambientes");
  }

  function toggleAmbiente(nome: string) {
    setAmbientesSelecionados((atual) =>
      atual.includes(nome) ? atual.filter((x) => x !== nome) : [...atual, nome]
    );
  }

  function adicionarPersonalizado() {
    const nome = ambientePersonalizado.trim();
    if (!nome) return;
    if (!ambientesSelecionados.includes(nome)) {
      setAmbientesSelecionados((a) => [...a, nome]);
    }
    setAmbientePersonalizado("");
  }

  function salvarAmbientes() {
    if (!visitaAtual || ambientesSelecionados.length === 0) return;

    setDb((o) => ({
      ...o,
      visitas: o.visitas.map((v) => {
        if (v.id !== visitaAtual.id) return v;

        const ambientesMudaram =
          JSON.stringify(v.ambientes || []) !== JSON.stringify(ambientesSelecionados);

        return {
          ...v,
          ambientes: ambientesSelecionados,
          checklist: ambientesMudaram ? [] : v.checklist || [],
          progresso: Math.max(v.progresso || 0, 15),
        };
      }),
    }));

    setView("visita");
  }

  function abrirChecklist() {
    if (!visitaAtual || !(visitaAtual.ambientes || []).length) return;

    const checklistExistente = visitaAtual.checklist || [];
    const possuiRespostas = checklistExistente.some(
      (item) => item.status !== "Pendente" || item.observacao.trim().length > 0
    );
    const precisaAtualizarModelo =
      (visitaAtual.checklistVersao || 1) < 2 && !possuiRespostas;

    if (checklistExistente.length === 0 || precisaAtualizarModelo) {
      const novoChecklist = criarChecklist(visitaAtual.ambientes || []);
      setDb((o) => ({
        ...o,
        visitas: o.visitas.map((v) =>
          v.id === visitaAtual.id
            ? { ...v, checklist: novoChecklist, checklistVersao: 2 }
            : v
        ),
      }));
    }

    setAmbienteChecklistAtivo((visitaAtual.ambientes || [])[0] || null);

    setView("checklist");
  }

  function rolarParaProximoItem(itemIdAtual: string) {
    if (!visitaAtual) return;

    const itensDoAmbiente = (visitaAtual.checklist || []).filter(
      (item) => item.ambiente === ambienteChecklistAtivo
    );
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

    window.setTimeout(() => {
      document
        .getElementById(`checklist-item-${proximo.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 180);
  }

  function atualizarChecklistItem(
    itemId: string,
    patch: Partial<Pick<ChecklistItem, "status" | "observacao">>
  ) {
    if (!visitaAtual) return;

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

  async function adicionarEvidencia(
    file: File | undefined,
    tipo: "Foto" | "Áudio"
  ) {
    if (!file || !visitaAtual) return;

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
        saveDB(atualizado);
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

  function concluir(id: string) {
    setDb((o) => ({
      ...o,
      visitas: o.visitas.map((v) =>
        v.id === id ? { ...v, status: "Concluída", progresso: 100 } : v
      ),
    }));
  }

  function reabrir(id: string) {
    setDb((o) => ({
      ...o,
      visitas: o.visitas.map((v) =>
        v.id === id
          ? { ...v, status: "Em andamento", progresso: Math.min(v.progresso || 0, 90) }
          : v
      ),
    }));
  }

  function excluir(id: string) {
    const visita = db.visitas.find((v) => v.id === id);
    if (!visita) return;

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

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <header className="bg-[#17365D] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xl font-extrabold">MBP Expert AI</div>
            <div className="text-xs text-blue-100">
              Sistema Operacional para Consultoria em Segurança dos Alimentos • v2.38
            </div>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div
              className={`rounded-xl px-3 py-2 text-xs font-bold ${
                syncStatus === "sincronizado"
                  ? "bg-emerald-100 text-emerald-800"
                  : syncStatus === "conectando"
                  ? "bg-blue-100 text-blue-800"
                  : syncStatus === "local"
                  ? "bg-amber-100 text-amber-800"
                  : syncErroVisivel
                  ? "bg-red-100 text-red-800"
                  : "bg-blue-100 text-blue-800"
              }`}
              title={
                syncAtualizadoEm
                  ? `Última sincronização: ${syncAtualizadoEm}`
                  : ""
              }
            >
              {syncStatus === "sincronizado"
                ? "☁️ Nuvem sincronizada"
                : syncStatus === "conectando"
                ? "☁️ Conectando..."
                : syncStatus === "local"
                ? "💻 Somente local"
                : syncErroVisivel
                ? "⚠️ Falha na sincronização"
                : "☁️ Conectando..."}
            </div>

            {atual && (
              <div className="rounded-xl bg-white/10 px-4 py-2">
              <div className="text-[10px] font-extrabold uppercase text-blue-100">
                Empresa ativa
              </div>
                <div className="font-extrabold">{atual.nomeFantasia}</div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-3 py-4 sm:p-4">
        <nav className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setView("inicio")}
            className={`rounded-xl px-4 py-2 font-bold ${
              view === "inicio"
                ? "bg-[#17365D] text-white"
                : "bg-slate-200 text-slate-900"
            }`}
          >
            Início
          </button>
          <button
            onClick={() => setView("empresas")}
            className={`rounded-xl px-4 py-2 font-bold ${
              view === "empresas"
                ? "bg-[#17365D] text-white"
                : "bg-slate-200 text-slate-900"
            }`}
          >
            Empresas
          </button>
          <button
            onClick={() => setView("visitas")}
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
        </nav>

        {showEmpresaForm ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold">{editingEmpresaId ? "Editar empresa" : "Nova empresa"}</h2>
                <p className="text-sm text-slate-500">
                  {editingEmpresaId ? "Atualize os dados do cliente, incluindo o responsável que assinará o relatório." : "Digite o CNPJ para buscar os dados automaticamente."}
                </p>
              </div>
              <button
                onClick={() => { setShowEmpresaForm(false); setEditingEmpresaId(null); }}
                className="rounded-xl bg-slate-100 px-3 py-2 font-bold"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label>
                <span className="mb-1 block text-xs font-bold text-slate-500">
                  CNPJ
                </span>
                <div className="flex gap-2">
                  <input
                    className="w-full rounded-xl border p-3 disabled:bg-slate-100 disabled:text-slate-500"
                    value={form.cnpj}
                    disabled={Boolean(editingEmpresaId)}
                    onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                  />
                  {!editingEmpresaId && (
                    <button
                      onClick={buscar}
                      className="rounded-xl bg-slate-900 px-4 font-bold text-white"
                    >
                      {loading ? "..." : "Buscar"}
                    </button>
                  )}
                </div>
              </label>

              {Object.entries(form)
                .filter(([k]) => k !== "cnpj")
                .map(([k, v]) => (
                  <label key={k}>
                    <span className="mb-1 block text-xs font-bold text-slate-500">
                      {labels[k] || k}
                    </span>
                    <input
                      className="w-full rounded-xl border p-3"
                      value={v}
                      onChange={(e) =>
                        setForm({ ...form, [k]: e.target.value })
                      }
                    />
                  </label>
                ))}
            </div>

            {msg && (
              <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm">
                {msg}
              </div>
            )}

            <button
              onClick={salvarEmpresa}
              className="mt-4 w-full rounded-xl bg-[#2F5597] p-3 font-extrabold text-white"
            >
              Salvar empresa
            </button>
          </section>
        ) : showVisitaForm ? (
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
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase text-[#2F5597]">
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
                  className="rounded-xl bg-slate-100 px-4 py-2 font-bold"
                >
                  Voltar à Central
                </button>
              </div>

              <div className="mt-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
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
                  {ambientesPadrao.map((nome) => {
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
                  <span className="text-xs font-bold text-slate-400">
                    ordem atual
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
                        className="flex items-center justify-between rounded-xl bg-slate-50 p-3"
                      >
                        <div>
                          <div className="text-xs font-extrabold text-slate-400">
                            {String(idx + 1).padStart(2, "0")}
                          </div>
                          <div className="font-extrabold">{nome}</div>
                        </div>
                        <button
                          onClick={() => toggleAmbiente(nome)}
                          className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
                        >
                          Remover
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={salvarAmbientes}
                  disabled={ambientesSelecionados.length === 0}
                  className="mt-5 w-full rounded-xl bg-[#2F5597] p-3 font-extrabold text-white disabled:opacity-40"
                >
                  Salvar ambientes
                </button>

                <button
                  onClick={() => setView("visita")}
                  className="mt-2 w-full rounded-xl bg-slate-100 p-3 font-bold"
                >
                  Voltar à Central da Visita
                </button>
              </div>
            </div>
          </section>
        ) : view === "evidencias" && visitaAtual ? (
          <section className="space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase text-[#2F5597]">
                    Evidências da inspeção
                  </div>
                  <h1 className="mt-1 text-2xl font-extrabold">Fotos e áudio</h1>
                  <p className="text-sm text-slate-500">
                    {empresaVisita?.nomeFantasia} • {fdata(visitaAtual.data)}
                  </p>
                </div>
                <button
                  onClick={() => setView("visita")}
                  className="rounded-xl bg-slate-100 px-4 py-2 font-bold"
                >
                  Voltar à Central
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <MetricCard label="Evidências" value={evidenciasVisita.length} />
                <MetricCard label="Fotos" value={fotosVisita} />
                <MetricCard label="Áudios" value={audiosVisita} />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
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
                    onChange={(e) => setEvidenciaAmbiente(e.target.value)}
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
              </div>

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
                          </div>
                          <button
                            onClick={() => excluirEvidencia(ev.id)}
                            className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
                          >
                            Excluir
                          </button>
                        </div>

                        {ev.tipo === "Foto" ? (
                          <img
                            src={urlEvidencia(ev)}
                            alt={ev.descricao || "Evidência fotográfica"}
                            className="mt-4 max-h-[520px] w-full rounded-xl border object-contain"
                          />
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
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase text-[#2F5597]">
                    Gestão das correções
                  </div>
                  <h1 className="mt-1 text-2xl font-extrabold">Plano de ação</h1>
                  <p className="text-sm text-slate-500">
                    {empresaVisita?.nomeFantasia} • {fdata(visitaAtual.data)}
                  </p>
                </div>
                <button
                  onClick={() => setView("visita")}
                  className="rounded-xl bg-slate-100 px-4 py-2 font-bold"
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
            <div className="rounded-2xl bg-white p-5 shadow-sm">
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
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase text-red-700">Resultado da inspeção</div>
                  <h1 className="mt-1 text-2xl font-extrabold">Não conformidades</h1>
                  <p className="text-sm text-slate-500">{empresaVisita?.nomeFantasia} • {fdata(visitaAtual.data)}</p>
                </div>
                <button onClick={() => setView("visita")} className="rounded-xl bg-slate-100 px-4 py-2 font-bold">Voltar à Central</button>
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
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase text-[#2F5597]">
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
                  className="rounded-xl bg-slate-100 px-4 py-2 font-bold"
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
                <div className="text-sm font-extrabold">Ambientes da visita</div>
                <div className="mt-3 space-y-2">
                  {(visitaAtual.ambientes || []).map((ambiente) => {
                    const itensAmb = checklistAtual.filter((i) => i.ambiente === ambiente);
                    const respAmb = itensAmb.filter((i) => i.status !== "Pendente").length;
                    const ativo = ambienteChecklistAtivo === ambiente;

                    return (
                      <button
                        key={ambiente}
                        onClick={() => setAmbienteChecklistAtivo(ambiente)}
                        className={`w-full rounded-xl p-3 text-left ${
                          ativo ? "bg-[#17365D] text-white" : "bg-slate-50"
                        }`}
                      >
                        <div className="font-extrabold">{ambiente}</div>
                        <div
                          className={`mt-1 text-xs ${
                            ativo ? "text-blue-100" : "text-slate-500"
                          }`}
                        >
                          <span>{respAmb}/{itensAmb.length} respondidos</span>
                          {itensAmb.length > 0 && respAmb === itensAmb.length && (
                            <span className={`ml-2 font-extrabold ${
                              ativo ? "text-emerald-200" : "text-emerald-700"
                            }`}>
                              ✓ Concluído
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <div className="space-y-3">
                <div
                  id="checklist-ambiente-topo"
                  className="scroll-mt-4 rounded-2xl bg-white p-5 shadow-sm"
                >
                  <div className="text-xs font-extrabold uppercase text-slate-400">
                    Ambiente atual
                  </div>
                  <h2 className="mt-1 text-2xl font-extrabold">
                    {ambienteChecklistAtivo}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Marque Conforme, Não Conforme ou Não se aplica e registre observações quando necessário.
                  </p>
                </div>

                {checklistAtual
                  .filter((i) => i.ambiente === ambienteChecklistAtivo)
                  .map((item, idx) => {
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
                      className={`scroll-mt-4 rounded-2xl bg-white p-5 shadow-sm ${
                        item.status === "Não Conforme"
                          ? "border-2 border-red-200"
                          : item.status === "Conforme"
                          ? "border border-emerald-200"
                          : "border border-transparent"
                      }`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                            Item {idx + 1} • {item.categoria}
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

                <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-900">
                  As respostas são salvas automaticamente. Itens marcados como
                  <b> Não Conforme</b> geram uma Não Conformidade vinculada ao critério,
                  preservando plano, evidências e histórico para rastreabilidade.
                </div>
              </div>
            </div>
          </section>
        ) : view === "visita" && visitaAtual ? (
          <section className="space-y-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase text-[#2F5597]">
                    Central da Visita
                  </div>
                  <h1 className="mt-1 text-2xl font-extrabold">
                    {empresaVisita?.nomeFantasia}
                  </h1>
                  <div className="mt-1 text-sm text-slate-500">
                    {fdata(visitaAtual.data)}
                    {visitaAtual.responsavel
                      ? ` • ${visitaAtual.responsavel}`
                      : " • Responsável não informado"}
                  </div>
                </div>

                <button
                  onClick={() => setView("visitas")}
                  className="w-full rounded-xl bg-slate-100 px-4 py-3 font-bold sm:w-auto"
                >
                  Voltar
                </button>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex justify-between text-xs font-bold text-slate-500">
                  <span>Progresso da visita</span>
                  <span>{visitaAtual.progresso || 0}%</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#2F5597]"
                    style={{ width: `${visitaAtual.progresso || 0}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <button
                onClick={abrirAmbientes}
                className="min-h-[118px] rounded-2xl border-2 border-[#2F5597] bg-white p-4 text-left shadow-sm sm:p-5"
              >
                <div className="text-xs font-extrabold uppercase text-[#2F5597]">
                  Etapa 1
                </div>
                <div className="mt-2 text-xl font-extrabold">Ambientes</div>
                <p className="mt-1 text-sm text-slate-500">
                  Selecione os setores que serão avaliados nesta visita.
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-extrabold text-[#2F5597]">
                    Abrir ambientes →
                  </span>
                  {(visitaAtual.ambientes || []).length > 0 && (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                      {(visitaAtual.ambientes || []).length} selecionados
                    </span>
                  )}
                </div>
              </button>

              <button
                onClick={abrirChecklist}
                disabled={!(visitaAtual.ambientes || []).length}
                className={`rounded-2xl bg-white p-5 text-left shadow-sm ${
                  (visitaAtual.ambientes || []).length
                    ? "border-2 border-emerald-200"
                    : "opacity-60"
                }`}
              >
                <div className="text-xs font-extrabold uppercase text-slate-400">
                  Etapa 2
                </div>
                <div className="mt-2 text-xl font-extrabold">Checklist</div>
                <p className="mt-1 text-sm text-slate-500">
                  Avaliação guiada por ambiente e critérios técnicos.
                </p>
                <div className="mt-4">
                  {(visitaAtual.ambientes || []).length ? (
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-emerald-700">
                        Abrir checklist técnico →
                      </span>
                      {totalChecklist > 0 && (
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
                          {percentualChecklist}%
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">
                      Defina os ambientes primeiro
                    </span>
                  )}
                </div>
              </button>

              <button
                onClick={abrirEvidencias}
                className={`rounded-2xl bg-white p-5 text-left shadow-sm ${
                  evidenciasVisita.length > 0
                    ? "border-2 border-violet-200"
                    : "border border-transparent"
                }`}
              >
                <div className="text-xs font-extrabold uppercase text-slate-400">
                  Evidências
                </div>
                <div className="mt-2 text-xl font-extrabold">Fotos e áudio</div>
                <p className="mt-1 text-sm text-slate-500">
                  Registros de campo vinculados à visita.
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-extrabold text-violet-700">
                    Abrir evidências →
                  </span>
                  {evidenciasVisita.length > 0 && (
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-extrabold text-violet-700">
                      {evidenciasVisita.length} registros
                    </span>
                  )}
                </div>
              </button>

              <button
                onClick={() => setView("ncs")}
                className={`rounded-2xl bg-white p-5 text-left shadow-sm ${ncsVisita.length ? "border-2 border-red-200" : "border border-transparent"}`}
              >
                <div className="text-xs font-extrabold uppercase text-slate-400">Resultado</div>
                <div className="mt-2 text-xl font-extrabold">Não conformidades</div>
                <p className="mt-1 text-sm text-slate-500">Pendências, risco, legislação e ação corretiva.</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-extrabold text-red-700">Abrir não conformidades →</span>
                  {ncsVisita.length > 0 && <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-extrabold text-red-700">{ncsAbertas} abertas</span>}
                </div>
              </button>

              <button
                onClick={() => setView("plano")}
                disabled={ncsVisita.length === 0}
                className={`rounded-2xl bg-white p-5 text-left shadow-sm ${
                  ncsVisita.length > 0
                    ? "border-2 border-blue-200"
                    : "opacity-60"
                }`}
              >
                <div className="text-xs font-extrabold uppercase text-slate-400">
                  Gestão
                </div>
                <div className="mt-2 text-xl font-extrabold">Plano de ação</div>
                <p className="mt-1 text-sm text-slate-500">
                  Responsáveis, prazos e acompanhamento.
                </p>
                <div className="mt-4">
                  {ncsVisita.length > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[#2F5597]">
                        Abrir plano de ação →
                      </span>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
                        {acoesDefinidas}/{ncsVisita.length}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">
                      Gere uma NC primeiro
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setView("acompanhamento")}
                className="min-h-[118px] rounded-2xl bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
              >
                <div className="text-xs font-extrabold uppercase text-emerald-700">Pós-visita</div>
                <div className="mt-1 text-lg font-extrabold">Acompanhamento</div>
                <p className="mt-2 text-sm text-slate-500">Prazos, responsáveis e andamento das ações corretivas.</p>
              </button>

              <button
                onClick={() => setView("relatorio")}
                className="min-h-[118px] rounded-2xl bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
              >
                <div className="text-xs font-extrabold uppercase text-slate-400">
                  Encerramento
                </div>
                <div className="mt-2 text-xl font-extrabold">Relatório</div>
                <p className="mt-1 text-sm text-slate-500">
                  Revisão consolidada da inspeção e dos registros da visita.
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-extrabold text-[#2F5597]">
                    Abrir relatório →
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-600">
                    {totalChecklist > 0
                      ? `${percentualChecklist}% checklist`
                      : "Prévia"}
                  </span>
                </div>
              </button>
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
                  <div className="text-xs font-extrabold uppercase text-[#2F5597]">
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
                  className="print-control rounded-xl bg-slate-100 px-4 py-3 font-bold"
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
                    <button type="button" onClick={reabrirInspecao} className="rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-emerald-900 shadow-sm">
                      Reabrir inspeção
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={finalizarInspecao} className="w-full rounded-xl bg-emerald-700 px-5 py-4 text-base font-extrabold text-white shadow-md">
                    ✓ Finalizar inspeção
                  </button>
                )}
              </div>

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
                  {fotosVisita} foto(s) • {audiosVisita} áudio(s)
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

              <div className="mt-5">
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

                <div className="print-only">
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
                  <div><strong>Gerado em:</strong> {new Date().toLocaleString("pt-BR")}</div>
                </div>
                <p className="mt-2">
                  Este documento consolida os registros vinculados à visita. Informações não registradas permanecem identificadas como não informadas ou pendentes.
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
          <div className="space-y-4">
            <section className="rounded-2xl bg-gradient-to-r from-[#17365D] to-[#2F5597] p-5 text-white shadow-sm">
              <div className="text-xs font-extrabold uppercase text-blue-100">
                Painel da consultoria
              </div>
              <h1 className="mt-2 text-3xl font-extrabold">
                Operação em campo
              </h1>
            </section>

            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricCard
                label="Empresas"
                value={Object.keys(db.empresas).length}
              />
              <MetricCard label="Visitas" value={db.visitas.length} />
              <MetricCard
                label="Em andamento"
                value={db.visitas.filter((v) => v.status === "Em andamento").length}
              />
              <MetricCard
                label="Concluídas"
                value={db.visitas.filter((v) => v.status === "Concluída").length}
              />
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

              <button
                onClick={() => {
                  setEditingEmpresaId(null);
                  setForm({ cnpj: "", nomeFantasia: "", razaoSocial: "", situacao: "", cnae: "", cnaeDescricao: "", tipo: "Outro", logradouro: "", numero: "", complemento: "", bairro: "", cep: "", municipio: "", uf: "", telefone: "", email: "", responsavel: "" });
                  setMsg("");
                  setShowEmpresaForm(true);
                }}
                className="rounded-xl bg-[#2F5597] px-4 py-3 font-extrabold text-white"
              >
                + Nova empresa
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {Object.values(db.empresas).map((e) => (
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

                    <button
                      onClick={() => editarEmpresa(e)}
                      className="rounded-xl bg-slate-100 px-4 py-2 font-bold"
                    >
                      Editar
                    </button>

                    {db.empresaAtualId === e.id && (
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
                <MetricCard label="Não conformidades resolvidas" value={ncsEmpresaResolvidas} />
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
                      <article key={v.id} className="rounded-2xl bg-white p-5 shadow-sm">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-600">
                                Visita {visitasEmpresaAtual.length - idx}
                              </span>
                              <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                                v.status === "Concluída"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}>
                                {v.status}
                              </span>
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
                    disabled={!atual}
                    className="rounded-xl bg-[#2F5597] px-4 py-3 font-extrabold text-white disabled:opacity-40"
                  >
                    + Nova visita
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {visitasEmpresaAtual.map((v) => {
                const e = db.empresas[v.empresaId];
                return (
                  <article
                    key={v.id}
                    className="rounded-2xl bg-white p-5 shadow-sm"
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <div className="text-xs font-extrabold uppercase text-slate-400">
                          {fdata(v.data)}
                        </div>
                        <h2 className="mt-1 text-xl font-extrabold">
                          {e?.nomeFantasia}
                        </h2>
                        <p className="text-sm text-slate-500">
                          {v.responsavel || "Responsável não informado"}
                        </p>
                      </div>

                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">
                        {v.status}
                      </span>
                    </div>

                    <div className="mt-5 flex gap-2">
                      {v.status === "Em andamento" ? (
                        <>
                          <button
                            onClick={() => continuar(v.id)}
                            className="flex-1 rounded-xl bg-[#17365D] px-4 py-2 font-bold text-white"
                          >
                            Continuar visita
                          </button>
                          <button
                            onClick={() => concluir(v.id)}
                            className="rounded-xl bg-emerald-50 px-4 py-2 font-bold text-emerald-700"
                          >
                            Concluir
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => reabrir(v.id)}
                          className="flex-1 rounded-xl bg-slate-100 px-4 py-2 font-bold"
                        >
                          Reabrir visita
                        </button>
                      )}

                      <button
                        onClick={() => excluir(v.id)}
                        className="rounded-xl bg-red-50 px-4 py-2 font-bold text-red-700"
                      >
                        Excluir
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
