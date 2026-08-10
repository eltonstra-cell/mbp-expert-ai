"use client";

import { useEffect, useMemo, useState } from "react";
import MetricCard from "@/components/MetricCard";
import type { AmbienteVisita, AppDB, Empresa, Visita } from "@/types";
import { emptyDB, loadDB, saveDB } from "@/lib/storage";

type View = "inicio" | "empresas" | "visitas" | "visita" | "ambientes";

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

const AMBIENTES_PADRAO = [
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

const hoje = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
};

const formatarData = (data: string) =>
  data
    ? new Date(data.length === 10 ? `${data}T12:00:00` : data).toLocaleDateString("pt-BR")
    : "—";

export default function Home() {
  const [db, setDb] = useState<AppDB>(emptyDB);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("inicio");
  const [showEmpresaForm, setShowEmpresaForm] = useState(false);
  const [showVisitaForm, setShowVisitaForm] = useState(false);
  const [visitaAtualId, setVisitaAtualId] = useState<string | null>(null);
  const [criandoVisita, setCriandoVisita] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [novoAmbiente, setNovoAmbiente] = useState("");
  const [ambientesRascunho, setAmbientesRascunho] = useState<AmbienteVisita[]>([]);
  const [ambientesSalvosAgora, setAmbientesSalvosAgora] = useState(false);

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

  const [visitaForm, setVisitaForm] = useState({
    data: hoje(),
    responsavel: "",
    observacoes: "",
  });

  useEffect(() => {
    const stored = loadDB();
    const visitasNormalizadas = (stored.visitas || []).map((v: any) => ({
      id: v.id,
      empresaId: v.empresaId,
      data: v.data || hoje(),
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
      ambientes: Array.isArray(v.ambientes) ? v.ambientes : [],
    })) as Visita[];

    setDb({ ...stored, visitas: visitasNormalizadas });
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveDB(db);
  }, [db, ready]);

  const empresaAtual = db.empresaAtualId ? db.empresas[db.empresaAtualId] : undefined;
  const visitaAtual = visitaAtualId ? db.visitas.find((v) => v.id === visitaAtualId) : undefined;
  const empresaDaVisita = visitaAtual ? db.empresas[visitaAtual.empresaId] : undefined;

  const visitasOrdenadas = useMemo(
    () =>
      [...db.visitas].sort((a, b) =>
        (b.criadoEm || b.data || "").localeCompare(a.criadoEm || a.data || ""),
      ),
    [db.visitas],
  );

  async function buscarCnpj() {
    const cnpj = form.cnpj.replace(/\D/g, "");
    if (cnpj.length !== 14) {
      setMsg("Informe um CNPJ com 14 dígitos.");
      return;
    }

    setLoading(true);
    setMsg("Buscando...");

    try {
      const response = await fetch(`/api/cnpj/${cnpj}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não encontrado");

      setForm((current) => ({
        ...current,
        cnpj: data.cnpj || cnpj,
        nomeFantasia: data.nome_fantasia || "",
        razaoSocial: data.razao_social || "",
        situacao: data.descricao_situacao_cadastral || "",
        cnae: String(data.cnae_fiscal || ""),
        cnaeDescricao: data.cnae_fiscal_descricao || "",
        logradouro: data.logradouro || "",
        numero: data.numero || "",
        complemento: data.complemento || "",
        bairro: data.bairro || "",
        cep: data.cep || "",
        municipio: data.municipio || "",
        uf: data.uf || "",
        telefone: data.ddd_telefone_1 || "",
        email: data.email || "",
      }));
      setMsg("Empresa encontrada. Confira os dados.");
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Falha na consulta");
    } finally {
      setLoading(false);
    }
  }

  function salvarEmpresa() {
    const id = form.cnpj.replace(/\D/g, "") || crypto.randomUUID();
    const empresa: Empresa = {
      id,
      ...form,
      nomeFantasia: form.nomeFantasia || form.razaoSocial || "Sem nome",
      criadoEm: new Date().toISOString(),
    };

    setDb((current) => ({
      ...current,
      empresaAtualId: id,
      empresas: { ...current.empresas, [id]: empresa },
    }));
    setShowEmpresaForm(false);
    setView("empresas");
  }

  function abrirNovaVisita() {
    if (!empresaAtual) {
      setView("empresas");
      return;
    }

    setVisitaForm({ data: hoje(), responsavel: "", observacoes: "" });
    setShowVisitaForm(true);
    setView("visitas");
  }

  function salvarVisita() {
    if (!empresaAtual || criandoVisita) return;

    setCriandoVisita(true);
    const visita: Visita = {
      id: crypto.randomUUID(),
      empresaId: empresaAtual.id,
      data: visitaForm.data || hoje(),
      status: "Em andamento",
      responsavel: visitaForm.responsavel.trim(),
      observacoes: visitaForm.observacoes.trim(),
      progresso: 0,
      criadoEm: new Date().toISOString(),
      ambientes: [],
    };

    setDb((current) => ({ ...current, visitas: [visita, ...current.visitas] }));
    setShowVisitaForm(false);
    setVisitaAtualId(visita.id);
    setView("visita");
    window.setTimeout(() => setCriandoVisita(false), 500);
  }

  function continuarVisita(id: string) {
    const visita = db.visitas.find((item) => item.id === id);
    if (!visita) return;

    setDb((current) => ({ ...current, empresaAtualId: visita.empresaId }));
    setVisitaAtualId(id);
    setView("visita");
  }

  function concluirVisita(id: string) {
    setDb((current) => ({
      ...current,
      visitas: current.visitas.map((v) =>
        v.id === id ? { ...v, status: "Concluída", progresso: 100 } : v,
      ),
    }));
  }

  function reabrirVisita(id: string) {
    setDb((current) => ({
      ...current,
      visitas: current.visitas.map((v) =>
        v.id === id
          ? { ...v, status: "Em andamento", progresso: Math.min(v.progresso || 0, 90) }
          : v,
      ),
    }));
  }

  function excluirVisita(id: string) {
    if (!window.confirm("Excluir esta visita? Esta ação não pode ser desfeita.")) return;

    setDb((current) => ({
      ...current,
      visitas: current.visitas.filter((v) => v.id !== id),
    }));

    if (visitaAtualId === id) {
      setVisitaAtualId(null);
      setView("visitas");
    }
  }

  function abrirAmbientes() {
    if (!visitaAtual) return;
    setAmbientesRascunho(visitaAtual.ambientes || []);
    setNovoAmbiente("");
    setAmbientesSalvosAgora(false);
    setView("ambientes");
  }

  function ambienteSelecionado(nome: string) {
    return ambientesRascunho.some((a) => a.nome.toLowerCase() === nome.toLowerCase());
  }

  function alternarAmbientePadrao(nome: string) {
    if (ambienteSelecionado(nome)) {
      setAmbientesRascunho((current) =>
        current
          .filter((a) => a.nome.toLowerCase() !== nome.toLowerCase())
          .map((a, index) => ({ ...a, ordem: index + 1 })),
      );
      return;
    }

    setAmbientesRascunho((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        nome,
        origem: "Padrão",
        ordem: current.length + 1,
      },
    ]);
  }

  function adicionarAmbientePersonalizado() {
    const nome = novoAmbiente.trim();
    if (!nome || ambienteSelecionado(nome)) return;

    setAmbientesRascunho((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        nome,
        origem: "Personalizado",
        ordem: current.length + 1,
      },
    ]);
    setNovoAmbiente("");
  }

  function removerAmbiente(id: string) {
    setAmbientesRascunho((current) =>
      current
        .filter((a) => a.id !== id)
        .map((a, index) => ({ ...a, ordem: index + 1 })),
    );
  }

  function salvarAmbientes() {
    if (!visitaAtual) return;

    const ambientesOrdenados = ambientesRascunho.map((a, index) => ({
      ...a,
      ordem: index + 1,
    }));

    setDb((current) => ({
      ...current,
      visitas: current.visitas.map((v) =>
        v.id === visitaAtual.id
          ? {
              ...v,
              ambientes: ambientesOrdenados,
              progresso: ambientesOrdenados.length > 0 ? Math.max(v.progresso || 0, 15) : 0,
            }
          : v,
      ),
    }));
    setAmbientesSalvosAgora(true);
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <header className="bg-[#17365D] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xl font-extrabold">MBP Expert AI</div>
            <div className="text-xs text-blue-100">
              Sistema Operacional para Consultoria em Segurança dos Alimentos • v2.2
            </div>
          </div>
          {empresaAtual && (
            <div className="rounded-xl bg-white/10 px-4 py-2">
              <div className="text-[10px] font-extrabold uppercase text-blue-100">Empresa ativa</div>
              <div className="font-extrabold">{empresaAtual.nomeFantasia}</div>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-4">
        <nav className="mb-4 flex flex-wrap gap-2">
          <button onClick={() => setView("inicio")} className="rounded-xl bg-slate-200 px-4 py-2 font-bold">Início</button>
          <button onClick={() => setView("empresas")} className="rounded-xl bg-slate-200 px-4 py-2 font-bold">Empresas</button>
          <button onClick={() => setView("visitas")} className="rounded-xl bg-[#17365D] px-4 py-2 font-bold text-white">Visitas</button>
        </nav>

        {showEmpresaForm ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold">Nova empresa</h2>
                <p className="text-sm text-slate-500">Digite o CNPJ para buscar os dados automaticamente.</p>
              </div>
              <button onClick={() => setShowEmpresaForm(false)} className="rounded-xl bg-slate-100 px-3 py-2 font-bold">Fechar</button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label>
                <span className="mb-1 block text-xs font-bold text-slate-500">CNPJ</span>
                <div className="flex gap-2">
                  <input className="w-full rounded-xl border p-3" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
                  <button onClick={buscarCnpj} className="rounded-xl bg-slate-900 px-4 font-bold text-white">{loading ? "..." : "Buscar"}</button>
                </div>
              </label>
              {Object.entries(form).filter(([key]) => key !== "cnpj").map(([key, value]) => (
                <label key={key}>
                  <span className="mb-1 block text-xs font-bold text-slate-500">{labels[key] || key}</span>
                  <input className="w-full rounded-xl border p-3" value={value} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                </label>
              ))}
            </div>
            {msg && <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm">{msg}</div>}
            <button onClick={salvarEmpresa} className="mt-4 w-full rounded-xl bg-[#2F5597] p-3 font-extrabold text-white">Salvar empresa</button>
          </section>
        ) : showVisitaForm ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex justify-between gap-4">
              <div>
                <div className="text-xs font-extrabold uppercase text-[#2F5597]">Nova visita</div>
                <h2 className="mt-1 text-2xl font-extrabold">{empresaAtual?.nomeFantasia}</h2>
                <p className="text-sm text-slate-500">Esta visita ficará vinculada automaticamente à empresa ativa.</p>
              </div>
              <button onClick={() => setShowVisitaForm(false)} className="rounded-xl bg-slate-100 px-3 py-2 font-bold">Fechar</button>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-1 block text-xs font-bold text-slate-500">Data da visita</span>
                <input type="date" className="w-full rounded-xl border p-3" value={visitaForm.data} onChange={(e) => setVisitaForm({ ...visitaForm, data: e.target.value })} />
              </label>
              <label>
                <span className="mb-1 block text-xs font-bold text-slate-500">Responsável pela visita</span>
                <input className="w-full rounded-xl border p-3" value={visitaForm.responsavel} onChange={(e) => setVisitaForm({ ...visitaForm, responsavel: e.target.value })} />
              </label>
              <label className="md:col-span-2">
                <span className="mb-1 block text-xs font-bold text-slate-500">Observações iniciais</span>
                <textarea rows={4} className="w-full rounded-xl border p-3" value={visitaForm.observacoes} onChange={(e) => setVisitaForm({ ...visitaForm, observacoes: e.target.value })} />
              </label>
            </div>
            <button onClick={salvarVisita} disabled={criandoVisita} className="mt-5 w-full rounded-xl bg-[#2F5597] p-3 font-extrabold text-white disabled:opacity-50">{criandoVisita ? "Criando..." : "Criar visita"}</button>
          </section>
        ) : view === "ambientes" && visitaAtual ? (
          <section className="space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wide text-[#2F5597]">Etapa 1 • Ambientes</div>
                  <h1 className="mt-1 text-2xl font-extrabold">Defina os setores desta visita</h1>
                  <p className="mt-1 text-sm text-slate-500">{empresaDaVisita?.nomeFantasia} • {formatarData(visitaAtual.data)}</p>
                </div>
                <button onClick={() => setView("visita")} className="rounded-xl bg-slate-100 px-4 py-2 font-bold">Voltar à central</button>
              </div>
              <div className="mt-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
                Selecione apenas os ambientes que realmente serão avaliados. O checklist da próxima etapa será montado a partir desta seleção.
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold">Ambientes sugeridos</h2>
                    <p className="text-sm text-slate-500">Clique para incluir ou remover da visita.</p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-600">
                    {ambientesRascunho.length} selecionado{ambientesRascunho.length === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {AMBIENTES_PADRAO.map((nome) => {
                    const selecionado = ambienteSelecionado(nome);
                    return (
                      <button
                        key={nome}
                        onClick={() => alternarAmbientePadrao(nome)}
                        className={`rounded-xl border-2 p-4 text-left transition ${
                          selecionado
                            ? "border-[#2F5597] bg-blue-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-extrabold">{nome}</div>
                          <div className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-extrabold ${selecionado ? "bg-[#2F5597] text-white" : "bg-slate-100 text-slate-400"}`}>
                            {selecionado ? "✓" : "+"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 border-t pt-5">
                  <h3 className="font-extrabold">Adicionar ambiente personalizado</h3>
                  <p className="mt-1 text-sm text-slate-500">Use quando o estabelecimento tiver um setor específico que não aparece acima.</p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={novoAmbiente}
                      onChange={(e) => setNovoAmbiente(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          adicionarAmbientePersonalizado();
                        }
                      }}
                      placeholder="Ex.: Açougue, Padaria, Sushi bar, Lactário..."
                      className="flex-1 rounded-xl border p-3"
                    />
                    <button onClick={adicionarAmbientePersonalizado} className="rounded-xl bg-slate-900 px-5 py-3 font-extrabold text-white">Adicionar</button>
                  </div>
                </div>
              </div>

              <aside className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-extrabold">Roteiro da visita</h2>
                  <span className="text-xs font-bold text-slate-400">ordem atual</span>
                </div>

                {ambientesRascunho.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed p-5 text-center text-sm text-slate-500">Nenhum ambiente selecionado ainda.</div>
                ) : (
                  <div className="mt-4 space-y-2">
                    {ambientesRascunho.map((ambiente, index) => (
                      <div key={ambiente.id} className="flex items-center gap-3 rounded-xl border p-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#17365D] text-xs font-extrabold text-white">{index + 1}</div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-extrabold">{ambiente.nome}</div>
                          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{ambiente.origem}</div>
                        </div>
                        <button onClick={() => removerAmbiente(ambiente.id)} className="rounded-lg bg-red-50 px-2 py-1 text-xs font-extrabold text-red-600">Remover</button>
                      </div>
                    ))}
                  </div>
                )}

                {ambientesSalvosAgora && (
                  <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">Ambientes salvos nesta visita.</div>
                )}

                <button
                  onClick={salvarAmbientes}
                  disabled={ambientesRascunho.length === 0}
                  className="mt-5 w-full rounded-xl bg-[#2F5597] p-3 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Salvar ambientes
                </button>

                <button
                  onClick={() => setView("visita")}
                  className="mt-2 w-full rounded-xl bg-slate-100 p-3 font-bold text-slate-700"
                >
                  Voltar à Central da Visita
                </button>
              </aside>
            </div>
          </section>
        ) : view === "visita" && visitaAtual ? (
          <section className="space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase text-[#2F5597]">Central da Visita</div>
                  <h1 className="mt-1 text-2xl font-extrabold">{empresaDaVisita?.nomeFantasia}</h1>
                  <div className="mt-1 text-sm text-slate-500">
                    {formatarData(visitaAtual.data)}
                    {visitaAtual.responsavel ? ` • ${visitaAtual.responsavel}` : " • Responsável não informado"}
                  </div>
                </div>
                <button onClick={() => setView("visitas")} className="rounded-xl bg-slate-100 px-4 py-2 font-bold">Voltar</button>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex justify-between text-xs font-bold text-slate-500">
                  <span>Progresso da visita</span>
                  <span>{visitaAtual.progresso || 0}%</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#2F5597]" style={{ width: `${visitaAtual.progresso || 0}%` }} />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <button onClick={abrirAmbientes} className="rounded-2xl border-2 border-[#2F5597] bg-white p-5 text-left shadow-sm transition hover:bg-blue-50">
                <div className="text-xs font-extrabold uppercase text-[#2F5597]">Etapa 1</div>
                <div className="mt-2 text-xl font-extrabold">Ambientes</div>
                <p className="mt-1 text-sm text-slate-500">Selecione os setores que serão avaliados nesta visita.</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="font-extrabold text-[#2F5597]">Abrir ambientes →</span>
                  {visitaAtual.ambientes.length > 0 && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">{visitaAtual.ambientes.length} selecionados</span>}
                </div>
              </button>

              <div className={`rounded-2xl bg-white p-5 shadow-sm ${visitaAtual.ambientes.length > 0 ? "border-2 border-emerald-200" : "opacity-65"}`}>
                <div className="text-xs font-extrabold uppercase text-slate-400">Etapa 2</div>
                <div className="mt-2 text-xl font-extrabold">Checklist</div>
                <p className="mt-1 text-sm text-slate-500">Avaliação guiada por ambiente e critérios técnicos.</p>
                <div className="mt-4 text-xs font-bold text-slate-400">
                  {visitaAtual.ambientes.length > 0 ? "Ambientes definidos • próxima versão" : "Defina os ambientes primeiro"}
                </div>
              </div>

              {[
                ["Evidências", "Fotos e áudio", "Registros de campo vinculados à visita."],
                ["Resultado", "Não conformidades", "Pendências, risco, legislação e ação corretiva."],
                ["Gestão", "Plano de ação", "Responsáveis, prazos e acompanhamento."],
                ["Encerramento", "Relatório", "Revisão e geração do documento final."],
              ].map(([etapa, titulo, descricao]) => (
                <div key={titulo} className="rounded-2xl bg-white p-5 shadow-sm opacity-65">
                  <div className="text-xs font-extrabold uppercase text-slate-400">{etapa}</div>
                  <div className="mt-2 text-xl font-extrabold">{titulo}</div>
                  <p className="mt-1 text-sm text-slate-500">{descricao}</p>
                </div>
              ))}
            </div>
          </section>
        ) : view === "inicio" ? (
          <div className="space-y-4">
            <section className="rounded-2xl bg-gradient-to-r from-[#17365D] to-[#2F5597] p-5 text-white shadow-sm">
              <div className="text-xs font-extrabold uppercase text-blue-100">Painel da consultoria</div>
              <h1 className="mt-2 text-3xl font-extrabold">Operação em campo</h1>
            </section>
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricCard label="Empresas" value={Object.keys(db.empresas).length} />
              <MetricCard label="Visitas" value={db.visitas.length} />
              <MetricCard label="Em andamento" value={db.visitas.filter((v) => v.status === "Em andamento").length} />
              <MetricCard label="Concluídas" value={db.visitas.filter((v) => v.status === "Concluída").length} />
            </section>
          </div>
        ) : view === "empresas" ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold">Empresas</h1>
                <p className="text-sm text-slate-500">Cadastre e selecione seus clientes.</p>
              </div>
              <button onClick={() => setShowEmpresaForm(true)} className="rounded-xl bg-[#2F5597] px-4 py-3 font-extrabold text-white">+ Nova empresa</button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {Object.values(db.empresas).map((empresa) => (
                <div key={empresa.id} className={`rounded-xl border p-4 ${db.empresaAtualId === empresa.id ? "border-[#2F5597] bg-blue-50" : ""}`}>
                  <div className="font-extrabold">{empresa.nomeFantasia}</div>
                  <div className="text-sm text-slate-500">{empresa.razaoSocial}</div>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => setDb((current) => ({ ...current, empresaAtualId: empresa.id }))} className="flex-1 rounded-xl bg-slate-100 px-4 py-2 font-bold">
                      {db.empresaAtualId === empresa.id ? "Empresa ativa" : "Selecionar"}
                    </button>
                    {db.empresaAtualId === empresa.id && (
                      <button onClick={abrirNovaVisita} className="rounded-xl bg-[#2F5597] px-4 py-2 font-bold text-white">Nova visita</button>
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
                  <div className="text-xs font-extrabold uppercase text-[#2F5597]">Módulo Visitas</div>
                  <h1 className="mt-1 text-2xl font-extrabold">Visitas técnicas</h1>
                </div>
                <button onClick={abrirNovaVisita} disabled={!empresaAtual} className="rounded-xl bg-[#2F5597] px-4 py-3 font-extrabold text-white disabled:opacity-40">+ Nova visita</button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {visitasOrdenadas.map((visita) => {
                const empresa = db.empresas[visita.empresaId];
                return (
                  <article key={visita.id} className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="flex justify-between gap-3">
                      <div>
                        <div className="text-xs font-extrabold uppercase text-slate-400">{formatarData(visita.data)}</div>
                        <h2 className="mt-1 text-xl font-extrabold">{empresa?.nomeFantasia}</h2>
                        <p className="text-sm text-slate-500">{visita.responsavel || "Responsável não informado"}</p>
                        {visita.ambientes.length > 0 && <p className="mt-2 text-xs font-bold text-[#2F5597]">{visita.ambientes.length} ambientes definidos</p>}
                      </div>
                      <span className={`h-fit rounded-full px-3 py-1 text-xs font-extrabold ${visita.status === "Concluída" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {visita.status}
                      </span>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {visita.status === "Em andamento" ? (
                        <>
                          <button onClick={() => continuarVisita(visita.id)} className="flex-1 rounded-xl bg-[#17365D] px-4 py-2 font-bold text-white">Continuar visita</button>
                          <button onClick={() => concluirVisita(visita.id)} className="rounded-xl bg-emerald-50 px-4 py-2 font-bold text-emerald-700">Concluir</button>
                        </>
                      ) : (
                        <button onClick={() => reabrirVisita(visita.id)} className="flex-1 rounded-xl bg-slate-100 px-4 py-2 font-bold">Reabrir visita</button>
                      )}
                      <button onClick={() => excluirVisita(visita.id)} className="rounded-xl bg-red-50 px-4 py-2 font-bold text-red-700">Excluir</button>
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
