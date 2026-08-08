"use client";

import { useEffect, useMemo, useState } from "react";
import MetricCard from "@/components/MetricCard";
import type { AppDB, Empresa, Visita } from "@/types";
import { emptyDB, loadDB, saveDB } from "@/lib/storage";

type View = "inicio" | "empresas" | "visitas";

const fieldLabels: Record<string, string> = {
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

function hojeISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function formatarData(data: string) {
  if (!data) return "—";
  const base = data.length === 10 ? `${data}T12:00:00` : data;
  return new Date(base).toLocaleDateString("pt-BR");
}

export default function Home() {
  const [db, setDb] = useState<AppDB>(emptyDB);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("inicio");
  const [showEmpresaForm, setShowEmpresaForm] = useState(false);
  const [showVisitaForm, setShowVisitaForm] = useState(false);
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

  const [visitaForm, setVisitaForm] = useState({
    data: hojeISO(),
    responsavel: "",
    observacoes: "",
  });

  useEffect(() => {
    const stored = loadDB();

    const visitasNormalizadas = (stored.visitas || []).map((v: any) => ({
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
    })) as Visita[];

    setDb({ ...stored, visitas: visitasNormalizadas });
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveDB(db);
  }, [db, ready]);

  const atual = db.empresaAtualId ? db.empresas[db.empresaAtualId] : undefined;

  const visitasOrdenadas = useMemo(
    () => [...db.visitas].sort((a, b) => (b.data || "").localeCompare(a.data || "")),
    [db.visitas]
  );

  const visitasEmpresaAtual = atual
    ? visitasOrdenadas.filter((v) => v.empresaId === atual.id)
    : [];

  const visitasEmAndamento = db.visitas.filter((v) => v.status === "Em andamento").length;
  const visitasConcluidas = db.visitas.filter((v) => v.status === "Concluída").length;

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

    setVisitaForm({
      data: hojeISO(),
      responsavel: "",
      observacoes: "",
    });

    setShowVisitaForm(true);
    setView("visitas");
  }

  function salvarVisita() {
    if (!atual) return;

    const visita: Visita = {
      id: crypto.randomUUID(),
      empresaId: atual.id,
      data: visitaForm.data || hojeISO(),
      status: "Em andamento",
      responsavel: visitaForm.responsavel.trim(),
      observacoes: visitaForm.observacoes.trim(),
      progresso: 0,
      criadoEm: new Date().toISOString(),
    };

    setDb((o) => ({
      ...o,
      visitas: [visita, ...o.visitas],
    }));

    setShowVisitaForm(false);
  }

  function concluirVisita(id: string) {
    setDb((o) => ({
      ...o,
      visitas: o.visitas.map((v) =>
        v.id === id ? { ...v, status: "Concluída", progresso: 100 } : v
      ),
    }));
  }

  function reabrirVisita(id: string) {
    setDb((o) => ({
      ...o,
      visitas: o.visitas.map((v) =>
        v.id === id
          ? { ...v, status: "Em andamento", progresso: Math.min(v.progresso || 0, 90) }
          : v
      ),
    }));
  }

  function selecionarEmpresa(id: string) {
    setDb((o) => ({ ...o, empresaAtualId: id }));
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <header className="bg-[#17365D] text-white">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xl font-extrabold">MBP Expert AI</div>
              <div className="text-xs text-blue-100">
                Sistema Operacional para Consultoria em Segurança dos Alimentos • v2.1
              </div>
            </div>

            {atual && (
              <div className="rounded-xl bg-white/10 px-4 py-2">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-100">
                  Empresa ativa
                </div>
                <div className="font-extrabold">{atual.nomeFantasia}</div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-4">
        <nav className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setView("inicio")}
            className={`rounded-xl px-4 py-2 font-bold ${
              view === "inicio" ? "bg-[#17365D] text-white" : "bg-slate-200"
            }`}
          >
            Início
          </button>

          <button
            onClick={() => setView("empresas")}
            className={`rounded-xl px-4 py-2 font-bold ${
              view === "empresas" ? "bg-[#17365D] text-white" : "bg-slate-200"
            }`}
          >
            Empresas
          </button>

          <button
            onClick={() => setView("visitas")}
            className={`rounded-xl px-4 py-2 font-bold ${
              view === "visitas" ? "bg-[#17365D] text-white" : "bg-slate-200"
            }`}
          >
            Visitas
          </button>
        </nav>

        {showEmpresaForm ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
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
                <span className="mb-1 block text-xs font-bold text-slate-500">CNPJ</span>
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
                      {fieldLabels[k] || k}
                    </span>
                    <input
                      className="w-full rounded-xl border p-3"
                      value={v}
                      onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    />
                  </label>
                ))}
            </div>

            {msg && <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm">{msg}</div>}

            <button
              onClick={salvarEmpresa}
              className="mt-4 w-full rounded-xl bg-[#2F5597] p-3 font-extrabold text-white"
            >
              Salvar empresa
            </button>
          </section>
        ) : showVisitaForm ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-wider text-[#2F5597]">
                  Nova visita
                </div>
                <h2 className="mt-1 text-2xl font-extrabold">
                  {atual?.nomeFantasia || "Empresa"}
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
                  value={visitaForm.data}
                  onChange={(e) => setVisitaForm({ ...visitaForm, data: e.target.value })}
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-bold text-slate-500">
                  Responsável pela visita
                </span>
                <input
                  className="w-full rounded-xl border p-3"
                  placeholder="Nome do consultor"
                  value={visitaForm.responsavel}
                  onChange={(e) =>
                    setVisitaForm({ ...visitaForm, responsavel: e.target.value })
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
                  placeholder="Objetivo da visita, retorno de pendências, informações importantes..."
                  value={visitaForm.observacoes}
                  onChange={(e) =>
                    setVisitaForm({ ...visitaForm, observacoes: e.target.value })
                  }
                />
              </label>
            </div>

            <div className="mt-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
              Na próxima etapa, esta visita abrirá o fluxo guiado de ambientes,
              checklist, fotos e não conformidades.
            </div>

            <button
              onClick={salvarVisita}
              className="mt-5 w-full rounded-xl bg-[#2F5597] p-3 font-extrabold text-white"
            >
              Criar visita
            </button>
          </section>
        ) : view === "inicio" ? (
          <div className="space-y-4">
            <section className="rounded-2xl bg-gradient-to-r from-[#17365D] to-[#2F5597] p-5 text-white shadow-sm">
              <div className="text-xs font-extrabold uppercase tracking-wider text-blue-100">
                Painel da consultoria
              </div>
              <h1 className="mt-2 text-3xl font-extrabold">Operação em campo</h1>
              <p className="mt-2 text-sm text-blue-100">
                Empresas e visitas já conectadas. O próximo passo será percorrer
                ambientes, registrar evidências e gerar não conformidades.
              </p>
            </section>

            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricCard label="Empresas" value={Object.keys(db.empresas).length} />
              <MetricCard label="Visitas" value={db.visitas.length} />
              <MetricCard label="Em andamento" value={visitasEmAndamento} />
              <MetricCard label="Concluídas" value={visitasConcluidas} />
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-extrabold">Empresa atual</h2>
                  <p className="text-sm text-slate-500">
                    Cliente selecionado para a operação em campo.
                  </p>
                </div>

                <button
                  onClick={() => setView("empresas")}
                  className="rounded-xl bg-slate-100 px-3 py-2 font-bold"
                >
                  Trocar
                </button>
              </div>

              {atual ? (
                <div className="mt-4 rounded-xl border p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-xl font-extrabold">{atual.nomeFantasia}</div>
                      <div className="text-sm text-slate-500">{atual.razaoSocial}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {atual.cnpj} • {atual.municipio}/{atual.uf}
                      </div>
                    </div>

                    <button
                      onClick={novaVisita}
                      className="rounded-xl bg-[#2F5597] px-5 py-3 font-extrabold text-white"
                    >
                      + Nova visita
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed p-5 text-sm text-slate-500">
                  Nenhuma empresa selecionada. Vá em Empresas e escolha o cliente antes
                  de iniciar a visita.
                </div>
              )}
            </section>

            {atual && visitasEmpresaAtual.length > 0 && (
              <section className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-extrabold">Últimas visitas</h2>
                    <p className="text-sm text-slate-500">
                      Histórico recente de {atual.nomeFantasia}.
                    </p>
                  </div>

                  <button
                    onClick={() => setView("visitas")}
                    className="text-sm font-extrabold text-[#2F5597]"
                  >
                    Ver histórico
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {visitasEmpresaAtual.slice(0, 3).map((v) => (
                    <div key={v.id} className="rounded-xl border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-extrabold">{formatarData(v.data)}</div>
                          <div className="text-sm text-slate-500">
                            {v.responsavel || "Responsável não informado"}
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                            v.status === "Concluída"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {v.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : view === "empresas" ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
                      : "border-slate-200"
                  }`}
                >
                  <div className="font-extrabold">{e.nomeFantasia}</div>
                  <div className="text-sm text-slate-500">{e.razaoSocial}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {e.cnpj} • {e.municipio}/{e.uf}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => selecionarEmpresa(e.id)}
                      className={`flex-1 rounded-xl px-4 py-2 font-bold ${
                        db.empresaAtualId === e.id
                          ? "bg-[#17365D] text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {db.empresaAtualId === e.id ? "Empresa ativa" : "Selecionar"}
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

              {Object.values(db.empresas).length === 0 && (
                <div className="rounded-xl border border-dashed p-6 text-center text-slate-500 md:col-span-2">
                  Nenhuma empresa cadastrada.
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#2F5597]">
                    Módulo Visitas
                  </div>
                  <h1 className="mt-1 text-2xl font-extrabold">Visitas técnicas</h1>
                  <p className="text-sm text-slate-500">
                    Histórico das inspeções e ponto de entrada para o trabalho em campo.
                  </p>
                </div>

                <button
                  onClick={novaVisita}
                  disabled={!atual}
                  className="rounded-xl bg-[#2F5597] px-4 py-3 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  + Nova visita
                </button>
              </div>

              {!atual && (
                <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                  Selecione uma empresa antes de criar uma visita.
                </div>
              )}
            </div>

            {visitasOrdenadas.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <div className="text-lg font-extrabold">Nenhuma visita registrada</div>
                <p className="mt-1 text-sm text-slate-500">
                  Selecione uma empresa e crie a primeira visita técnica.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {visitasOrdenadas.map((v) => {
                  const empresa = db.empresas[v.empresaId];

                  return (
                    <article key={v.id} className="rounded-2xl bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                            {formatarData(v.data)}
                          </div>
                          <h2 className="mt-1 text-xl font-extrabold">
                            {empresa?.nomeFantasia || "Empresa não encontrada"}
                          </h2>
                          <p className="text-sm text-slate-500">
                            {v.responsavel || "Responsável não informado"}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                            v.status === "Concluída"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {v.status}
                        </span>
                      </div>

                      {v.observacoes && (
                        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                          {v.observacoes}
                        </div>
                      )}

                      <div className="mt-4">
                        <div className="mb-1 flex justify-between text-xs font-bold text-slate-500">
                          <span>Progresso da visita</span>
                          <span>{v.progresso || 0}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[#2F5597]"
                            style={{
                              width: `${Math.max(0, Math.min(100, v.progresso || 0))}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {v.status === "Em andamento" ? (
                          <>
                            <button
                              onClick={() =>
                                setDb((o) => ({ ...o, empresaAtualId: v.empresaId }))
                              }
                              className="flex-1 rounded-xl bg-[#17365D] px-4 py-2 font-bold text-white"
                            >
                              Continuar visita
                            </button>

                            <button
                              onClick={() => concluirVisita(v.id)}
                              className="rounded-xl bg-emerald-50 px-4 py-2 font-bold text-emerald-700"
                            >
                              Concluir
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => reabrirVisita(v.id)}
                            className="w-full rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-700"
                          >
                            Reabrir visita
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
