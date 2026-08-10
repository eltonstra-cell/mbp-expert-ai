"use client";

import { useEffect, useMemo, useState } from "react";
import MetricCard from "@/components/MetricCard";
import type {
  AppDB,
  ChecklistCriticidade,
  ChecklistItem,
  ChecklistStatus,
  Empresa,
  Visita,
} from "@/types";
import { emptyDB, loadDB, saveDB } from "@/lib/storage";

type View = "inicio" | "empresas" | "visitas" | "visita" | "ambientes" | "checklist" | "ncs" | "plano";

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

export default function Home() {
  const [db, setDb] = useState<AppDB>(emptyDB);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("inicio");
  const [showEmpresaForm, setShowEmpresaForm] = useState(false);
  const [showVisitaForm, setShowVisitaForm] = useState(false);
  const [visitaAtualId, setVisitaAtualId] = useState<string | null>(null);
  const [criandoVisita, setCriandoVisita] = useState(false);
  const [ambientesSelecionados, setAmbientesSelecionados] = useState<string[]>([]);
  const [ambientePersonalizado, setAmbientePersonalizado] = useState("");
  const [ambienteChecklistAtivo, setAmbienteChecklistAtivo] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

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

  const [vf, setVf] = useState({
    data: hojeISO(),
    responsavel: "",
    observacoes: "",
  });

  useEffect(() => {
    const s = loadDB();
    const vs = (s.visitas || []).map((v: any) => ({
      id: v.id,
      empresaId: v.empresaId,
      data: v.data || hojeISO(),
      status: v.status === "Concluída" ? "Concluída" : "Em andamento",
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
            criadoEm: existente?.criadoEm || new Date().toISOString(),
          };
          ncsSincronizadas = existente
            ? ncsSincronizadas.map((x: any) => x.id === idNc ? { ...x, ...nc } : x)
            : [nc, ...ncsSincronizadas];
        } else {
          ncsSincronizadas = ncsSincronizadas.filter((nc: any) => nc.id !== idNc);
        }
      }
    }

    setDb({ ...s, visitas: vs, ncs: ncsSincronizadas });
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveDB(db);
  }, [db, ready]);

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

  const checklistAtual = visitaAtual?.checklist || [];
  const respondidos = checklistAtual.filter((i) => i.status !== "Pendente").length;
  const totalChecklist = checklistAtual.length;
  const percentualChecklist = totalChecklist
    ? Math.round((respondidos / totalChecklist) * 100)
    : 0;
  const ncsVisita = (db.ncs || []).filter((nc) => nc.visitaId === visitaAtual?.id);
  const ncsAbertas = ncsVisita.filter((nc) => nc.status !== "Resolvida").length;
  const acoesDefinidas = ncsVisita.filter(
    (nc: any) => (nc.acaoCorretiva || "").trim().length > 0
  ).length;
  const acoesConcluidas = ncsVisita.filter((nc) => nc.status === "Resolvida").length;

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
    const id = form.cnpj.replace(/\D/g, "") || crypto.randomUUID();
    const emp: Empresa = {
      id,
      ...form,
      nomeFantasia: form.nomeFantasia || form.razaoSocial || "Sem nome",
      criadoEm: new Date().toISOString(),
    };
    setDb((o) => ({
      ...o,
      empresaAtualId: id,
      empresas: { ...o.empresas, [id]: emp },
    }));
    setShowEmpresaForm(false);
    setView("empresas");
  }

  function novaVisita() {
    if (!atual) {
      setView("empresas");
      return;
    }
    setVf({ data: hojeISO(), responsavel: "", observacoes: "" });
    setShowVisitaForm(true);
    setView("visitas");
  }

  function salvarVisita() {
    if (!atual || criandoVisita) return;
    setCriandoVisita(true);
    const v: Visita = {
      id: crypto.randomUUID(),
      empresaId: atual.id,
      data: vf.data || hojeISO(),
      status: "Em andamento",
      responsavel: vf.responsavel.trim(),
      observacoes: vf.observacoes.trim(),
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
            criadoEm: existente?.criadoEm || new Date().toISOString(),
          };
          ncs = existente ? ncs.map((x) => x.id === idNc ? { ...x, ...nc } : x) : [nc, ...ncs];
        } else {
          ncs = ncs.filter((nc) => nc.id !== idNc);
        }
      }

      return { ...o, visitas: visitasAtualizadas, ncs };
    });
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
    setDb((o) => ({
      ...o,
      ncs: (o.ncs || []).map((nc) =>
        nc.id === ncId ? { ...nc, ...patch } : nc
      ),
    }));
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
    if (!window.confirm("Excluir esta visita? Esta ação não pode ser desfeita.")) return;
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
              Sistema Operacional para Consultoria em Segurança dos Alimentos • v2.6
            </div>
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
      </header>

      <div className="mx-auto max-w-7xl p-4">
        <nav className="mb-4 flex gap-2">
          <button
            onClick={() => setView("inicio")}
            className="rounded-xl bg-slate-200 px-4 py-2 font-bold"
          >
            Início
          </button>
          <button
            onClick={() => setView("empresas")}
            className="rounded-xl bg-slate-200 px-4 py-2 font-bold"
          >
            Empresas
          </button>
          <button
            onClick={() => setView("visitas")}
            className="rounded-xl bg-[#17365D] px-4 py-2 font-bold text-white"
          >
            Visitas
          </button>
        </nav>

        {showEmpresaForm ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold">Nova empresa</h2>
                <p className="text-sm text-slate-500">
                  Digite o CNPJ para buscar os dados automaticamente.
                </p>
              </div>
              <button
                onClick={() => setShowEmpresaForm(false)}
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
                    className="w-full rounded-xl border p-3"
                    value={form.cnpj}
                    onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                  />
                  <button
                    onClick={buscar}
                    className="rounded-xl bg-slate-900 px-4 font-bold text-white"
                  >
                    {loading ? "..." : "Buscar"}
                  </button>
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
                  Responsável pela visita
                </span>
                <input
                  className="w-full rounded-xl border p-3"
                  value={vf.responsavel}
                  onChange={(e) =>
                    setVf({ ...vf, responsavel: e.target.value })
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
                <MetricCard label="NCs" value={ncsVisita.length} />
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

                      <select
                        value={nc.status}
                        onChange={(e) =>
                          atualizarNC(nc.id, {
                            status: e.target.value as "Aberta" | "Em tratamento" | "Resolvida",
                          })
                        }
                        className="rounded-xl border bg-white px-3 py-2 text-sm font-extrabold"
                      >
                        <option value="Aberta">Aberta</option>
                        <option value="Em tratamento">Em tratamento</option>
                        <option value="Resolvida">Resolvida</option>
                      </select>
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
                          onChange={(e) =>
                            atualizarNC(nc.id, { acompanhamento: e.target.value })
                          }
                          placeholder="Registre retorno, evidência de correção ou observações do acompanhamento..."
                          className="w-full rounded-xl border p-3"
                        />
                      </label>
                    </div>

                    <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                      As alterações são salvas automaticamente.
                    </div>
                  </article>
                ))}
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
                          {respAmb}/{itensAmb.length} respondidos
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <div className="space-y-3">
                <div className="rounded-2xl bg-white p-5 shadow-sm">
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
                  .map((item, idx) => (
                    <article
                      key={item.id}
                      className={`rounded-2xl bg-white p-5 shadow-sm ${
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
                              : item.status === "Não Conforme"
                              ? "bg-red-50 text-red-700"
                              : item.status === "Não se aplica"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {item.status}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {(["Conforme", "Não Conforme", "Não se aplica"] as ChecklistStatus[]).map(
                          (status) => (
                            <button
                              key={status}
                              onClick={() =>
                                atualizarChecklistItem(item.id, {
                                  status,
                                  ...(status !== "Não Conforme"
                                    ? { observacao: "" }
                                    : {}),
                                })
                              }
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

                      <label className="mt-4 block">
                        <span className="mb-1 block text-xs font-bold text-slate-500">
                          Observação
                        </span>
                        <textarea
                          rows={3}
                          className="w-full rounded-xl border p-3"
                          placeholder={
                            item.status === "Não Conforme"
                              ? "Descreva a não conformidade observada..."
                              : "Observação opcional"
                          }
                          value={item.observacao}
                          onChange={(e) =>
                            atualizarChecklistItem(item.id, {
                              observacao: e.target.value,
                            })
                          }
                        />
                      </label>

                      {item.status === "Não Conforme" && (
                        <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
                          Este item ficará preparado para alimentar o módulo de
                          Não Conformidades na próxima etapa.
                        </div>
                      )}
                    </article>
                  ))}

                <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-900">
                  As respostas são salvas automaticamente no navegador. Na próxima
                  versão, os itens marcados como <b>Não Conforme</b> poderão gerar
                  NC com foto, risco, legislação, prazo e ação corretiva.
                </div>
              </div>
            </div>
          </section>
        ) : view === "visita" && visitaAtual ? (
          <section className="space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:justify-between">
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
                  className="rounded-xl bg-slate-100 px-4 py-2 font-bold"
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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <button
                onClick={abrirAmbientes}
                className="rounded-2xl border-2 border-[#2F5597] bg-white p-5 text-left shadow-sm"
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

              <div className="rounded-2xl bg-white p-5 shadow-sm opacity-70">
                <div className="text-xs font-extrabold uppercase text-slate-400">
                  Evidências
                </div>
                <div className="mt-2 text-xl font-extrabold">Fotos e áudio</div>
                <p className="mt-1 text-sm text-slate-500">
                  Registros de campo vinculados à visita.
                </p>
              </div>

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

              <div className="rounded-2xl bg-white p-5 shadow-sm opacity-70">
                <div className="text-xs font-extrabold uppercase text-slate-400">
                  Encerramento
                </div>
                <div className="mt-2 text-xl font-extrabold">Relatório</div>
                <p className="mt-1 text-sm text-slate-500">
                  Revisão e geração do documento final.
                </p>
              </div>
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
                onClick={() => setShowEmpresaForm(true)}
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
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() =>
                        setDb((o) => ({ ...o, empresaAtualId: e.id }))
                      }
                      className="flex-1 rounded-xl bg-slate-100 px-4 py-2 font-bold"
                    >
                      {db.empresaAtualId === e.id
                        ? "Empresa ativa"
                        : "Selecionar"}
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

                <button
                  onClick={novaVisita}
                  disabled={!atual}
                  className="rounded-xl bg-[#2F5597] px-4 py-3 font-extrabold text-white disabled:opacity-40"
                >
                  + Nova visita
                </button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {visitas.map((v) => {
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
