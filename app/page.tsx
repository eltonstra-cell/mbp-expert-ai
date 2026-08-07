"use client";

import { useEffect, useMemo, useState } from "react";

type Client = {
  id: string;
  cnpj: string;
  nome: string;
  razao: string;
  situacao: string;
  cnae: string;
  cnaeDesc: string;
  tipo: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  municipio: string;
  uf: string;
  telefone: string;
  responsavel: string;
  environments: string[];
  answers: Record<string, { question: string; value: string; note?: string }>;
  ncs: NC[];
  qIndex: number;
  visits: number;
};

type NC = {
  id: string;
  description: string;
  category: string;
  priority: string;
  owner: string;
  due: string;
  status: string;
};

type DB = {
  clients: Record<string, Client>;
  currentId: string | null;
  totalVisits: number;
};

type Screen = "home" | "clients" | "new" | "environments" | "visit" | "nc" | "report";

const ENVIRONMENTS = [
  "Recebimento",
  "Estoque seco",
  "Câmara fria",
  "Freezer",
  "Açougue / Pré-preparo",
  "Cozinha / Produção",
  "Buffet / Distribuição",
  "DML",
  "Sanitários / Vestiários",
  "Resíduos / Área externa",
];

const QUESTIONS = [
  ["REC-001","Existe área exclusiva para recebimento?",["Sim","Não","Compartilhada"]],
  ["REC-002","O espaço de recebimento é coberto?",["Sim","Parcialmente","Não"]],
  ["REC-003","Qual é o material predominante do piso?",["Cerâmica","Epóxi","Granilite","Concreto","Outro"]],
  ["REC-004","Qual é o estado de conservação do piso?",["Ótimo","Bom","Regular","Ruim"]],
  ["REC-005","Existem ralos no setor?",["Sim","Não","Não verificado"]],
  ["REC-006","As paredes estão em bom estado, sem rachaduras, descascamentos ou infiltração?",["Sim","Não","Parcialmente"]],
  ["REC-007","As janelas possuem telas milimétricas removíveis?",["Sim","Não","Não se aplica"]],
  ["REC-008","A porta ou portão possui fechamento automático?",["Sim","Não","Não se aplica"]],
  ["REC-009","Existe lavatório para higienização das mãos no setor?",["Sim","Não","Compartilhado"]],
  ["REC-010","O recebimento inclui conferência visual, validade e temperatura quando aplicável?",["Sim","Parcialmente","Não"]],
] as const;

const emptyDB: DB = { clients: {}, currentId: null, totalVisits: 0 };

function normalizeCNPJ(value: string) {
  return value.replace(/\D/g, "");
}

function inferType(description = "") {
  const s = description.toLowerCase();
  if (s.includes("restaurante") || s.includes("alimentação")) return "Restaurante";
  if (s.includes("padaria") || s.includes("panificação")) return "Padaria";
  if (s.includes("hotel") || s.includes("hospedagem")) return "Hotel";
  return "Outro";
}

export default function Home() {
  const [db, setDb] = useState<DB>(emptyDB);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [lookupStatus, setLookupStatus] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [note, setNote] = useState("");
  const [form, setForm] = useState({
    cnpj: "", nome: "", razao: "", situacao: "", cnae: "", cnaeDesc: "",
    tipo: "Outro", logradouro: "", numero: "", complemento: "", bairro: "",
    cep: "", municipio: "", uf: "", telefone: "", responsavel: ""
  });
  const [ncForm, setNcForm] = useState({
    description: "", category: "Estrutural", priority: "Média",
    owner: "", due: "", status: "Aberta"
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mbp-expert-ai-v1");
      if (stored) setDb(JSON.parse(stored));
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("mbp-expert-ai-v1", JSON.stringify(db));
  }, [db, ready]);

  const current = db.currentId ? db.clients[db.currentId] : undefined;

  const progress = useMemo(() => {
    if (!current) return 0;
    return Math.round((Object.keys(current.answers).length / QUESTIONS.length) * 100);
  }, [current]);

  const activeNCs = Object.values(db.clients)
    .flatMap((c) => c.ncs)
    .filter((n) => n.status !== "Concluída").length;

  function updateCurrent(mutator: (client: Client) => Client) {
    if (!db.currentId || !db.clients[db.currentId]) return;
    setDb((old) => ({
      ...old,
      clients: {
        ...old.clients,
        [old.currentId!]: mutator(old.clients[old.currentId!]),
      },
    }));
  }

  async function searchCNPJ() {
    const cnpj = normalizeCNPJ(form.cnpj);
    if (cnpj.length !== 14) {
      setLookupStatus("Informe um CNPJ com 14 dígitos.");
      return;
    }
    setLookupStatus("Buscando empresa...");
    try {
      const response = await fetch(`/api/cnpj/${cnpj}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Empresa não encontrada.");
      setForm((f) => ({
        ...f,
        cnpj: data.cnpj || cnpj,
        nome: data.nome_fantasia || "",
        razao: data.razao_social || "",
        situacao: data.descricao_situacao_cadastral || "",
        cnae: String(data.cnae_fiscal || ""),
        cnaeDesc: data.cnae_fiscal_descricao || "",
        tipo: inferType(data.cnae_fiscal_descricao),
        logradouro: data.logradouro || "",
        numero: data.numero || "",
        complemento: data.complemento || "",
        bairro: data.bairro || "",
        cep: data.cep || "",
        municipio: data.municipio || "",
        uf: data.uf || "",
        telefone: data.ddd_telefone_1 || data.ddd_telefone_2 || "",
      }));
      setLookupStatus("Empresa encontrada. Confira os dados antes de salvar.");
    } catch (error) {
      setLookupStatus(error instanceof Error ? error.message : "Falha na consulta.");
    }
  }

  function saveClient() {
    const key = normalizeCNPJ(form.cnpj) || crypto.randomUUID();
    const existing = db.clients[key];
    const client: Client = {
      id: key,
      ...form,
      nome: form.nome || form.razao || "Sem nome",
      environments: existing?.environments || [...ENVIRONMENTS],
      answers: existing?.answers || {},
      ncs: existing?.ncs || [],
      qIndex: existing?.qIndex || 0,
      visits: existing?.visits || 0,
    };
    setDb((old) => ({
      ...old,
      currentId: key,
      clients: { ...old.clients, [key]: client },
    }));
    setScreen("clients");
  }

  function startNewClient() {
    setForm({
      cnpj: "", nome: "", razao: "", situacao: "", cnae: "", cnaeDesc: "",
      tipo: "Outro", logradouro: "", numero: "", complemento: "", bairro: "",
      cep: "", municipio: "", uf: "", telefone: "", responsavel: ""
    });
    setLookupStatus("");
    setScreen("new");
  }

  function saveAnswer() {
    if (!current || !selectedAnswer || current.qIndex >= QUESTIONS.length) return;
    const [id, question] = QUESTIONS[current.qIndex];
    updateCurrent((c) => ({
      ...c,
      answers: {
        ...c.answers,
        [id]: { question, value: selectedAnswer, note },
      },
      qIndex: c.qIndex + 1,
    }));
    setSelectedAnswer("");
    setNote("");
  }

  function saveNC() {
    if (!current || !ncForm.description.trim()) return;
    updateCurrent((c) => ({
      ...c,
      ncs: [...c.ncs, { id: crypto.randomUUID(), ...ncForm }],
    }));
    setNcForm({
      description: "", category: "Estrutural", priority: "Média",
      owner: "", due: "", status: "Aberta"
    });
  }

  function reportText() {
    if (!current) return "Selecione um cliente.";
    let text = `MBP EXPERT AI — RELATÓRIO DE TESTE\n\n`;
    text += `CLIENTE\n${current.nome}\n${current.razao}\nCNPJ: ${current.cnpj}\n`;
    text += `${current.logradouro}, ${current.numero} ${current.complemento}\n`;
    text += `${current.bairro} • ${current.municipio}/${current.uf} • CEP ${current.cep}\n`;
    text += `CNAE: ${current.cnae} — ${current.cnaeDesc}\nSituação cadastral: ${current.situacao}\n\n`;
    text += `RECEBIMENTO\n`;
    Object.entries(current.answers).forEach(([id, answer]) => {
      text += `${id} — ${answer.question}\nResposta: ${answer.value}`;
      if (answer.note) text += `\nObservação: ${answer.note}`;
      text += `\n\n`;
    });
    text += `NÃO CONFORMIDADES\n`;
    if (!current.ncs.length) text += "Nenhuma registrada.\n";
    current.ncs.forEach((n, i) => {
      text += `${i + 1}. ${n.description} | ${n.category} | ${n.priority} | ${n.status}\n`;
    });
    return text;
  }

  const nav = [
    ["home","Início"],["clients","Clientes"],["new","Novo cliente"],
    ["environments","Ambientes"],["visit","Visita"],["nc","NC"],["report","Relatório"]
  ] as const;

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <header className="sticky top-0 z-30 bg-[#17365D] px-4 py-4 text-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <div className="text-xl font-extrabold">MBP Expert AI</div>
            <div className="text-xs text-blue-100">Sistema Operacional para Consultoria em Segurança dos Alimentos</div>
          </div>
          <div className="rounded-full bg-white/10 px-3 py-1 text-xs">v1.0 • teste</div>
        </div>
      </header>

      <div className="sticky top-[76px] z-20 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2">
        <div className="mx-auto flex max-w-6xl gap-2">
          {nav.map(([id,label]) => (
            <button key={id} onClick={() => setScreen(id)}
              className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-bold ${screen===id ? "bg-[#2F5597] text-white" : "bg-slate-100 text-slate-700"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="safe-bottom mx-auto max-w-6xl p-3 md:p-5">
        {screen === "home" && (
          <>
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-5">
                <h1 className="text-2xl font-extrabold">Painel da consultoria</h1>
                <p className="mt-1 text-sm text-slate-500">Seu ponto de partida para clientes, visitas e pendências.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Metric label="Clientes" value={Object.keys(db.clients).length} />
                <Metric label="Visitas" value={db.totalVisits} />
                <Metric label="NC abertas" value={activeNCs} />
                <Metric label="Progresso" value={`${progress}%`} />
              </div>
            </section>
            <section className="mt-3 rounded-2xl bg-white p-5 shadow-sm">
              <div className="text-sm font-bold text-slate-500">CLIENTE ATUAL</div>
              {current ? (
                <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div><div className="text-xl font-extrabold">{current.nome}</div><div className="text-sm text-slate-500">{current.razao}</div><div className="mt-1 text-xs text-slate-400">{current.cnpj} • {current.municipio}/{current.uf}</div></div>
                  <button className="rounded-xl bg-[#2F5597] px-5 py-3 font-bold text-white" onClick={() => setScreen("visit")}>▶ Iniciar visita</button>
                </div>
              ) : (
                <div className="mt-3"><p className="text-slate-500">Nenhum cliente selecionado.</p><button className="mt-3 rounded-xl bg-[#2F5597] px-5 py-3 font-bold text-white" onClick={() => setScreen("clients")}>Selecionar cliente</button></div>
              )}
            </section>
          </>
        )}

        {screen === "clients" && (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><h2 className="text-2xl font-extrabold">Clientes</h2><p className="text-sm text-slate-500">Selecione quem você vai atender.</p></div>
              <button onClick={startNewClient} className="rounded-xl bg-[#2F5597] px-4 py-3 font-bold text-white">+ Novo</button>
            </div>
            <div className="space-y-3">
              {!Object.keys(db.clients).length && <Notice text="Nenhum cliente cadastrado. Cadastre o primeiro pelo CNPJ." />}
              {Object.values(db.clients).map((c) => (
                <div key={c.id} className={`rounded-2xl border p-4 ${db.currentId===c.id ? "border-[#2F5597] bg-blue-50" : "border-slate-200"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div><div className="font-extrabold">{c.nome}</div><div className="text-sm text-slate-500">{c.razao}</div><div className="mt-1 text-xs text-slate-400">{c.cnpj} • {c.municipio}/{c.uf}</div></div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{c.tipo}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setDb((old)=>({...old,currentId:c.id}))} className="flex-1 rounded-xl bg-[#2F5597] px-3 py-2 font-bold text-white">Selecionar</button>
                    <button onClick={() => setDb((old)=>{const copy={...old.clients};delete copy[c.id];return {...old,clients:copy,currentId:old.currentId===c.id?null:old.currentId};})} className="rounded-xl bg-red-50 px-3 py-2 font-bold text-red-700">Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {screen === "new" && (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-extrabold">Novo cliente</h2>
            <p className="mt-1 text-sm text-slate-500">Digite o CNPJ para preencher os dados automaticamente.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="CNPJ"><div className="flex gap-2"><input className="w-full rounded-xl border border-slate-300 px-3 py-3" value={form.cnpj} onChange={(e)=>setForm({...form,cnpj:e.target.value})}/><button onClick={searchCNPJ} className="rounded-xl bg-slate-900 px-4 font-bold text-white">Buscar</button></div></Field>
              <Field label="Tipo"><select className="w-full rounded-xl border border-slate-300 px-3 py-3" value={form.tipo} onChange={(e)=>setForm({...form,tipo:e.target.value})}>{["Churrascaria","Restaurante","Padaria","Hotel","UAN","Outro"].map(x=><option key={x}>{x}</option>)}</select></Field>
              <Field label="Nome fantasia"><Input v={form.nome} set={(v)=>setForm({...form,nome:v})}/></Field>
              <Field label="Razão social"><Input v={form.razao} set={(v)=>setForm({...form,razao:v})}/></Field>
              <Field label="Situação cadastral"><Input v={form.situacao} set={(v)=>setForm({...form,situacao:v})}/></Field>
              <Field label="CNAE"><Input v={form.cnae} set={(v)=>setForm({...form,cnae:v})}/></Field>
              <Field label="Descrição CNAE"><Input v={form.cnaeDesc} set={(v)=>setForm({...form,cnaeDesc:v})}/></Field>
              <Field label="Logradouro"><Input v={form.logradouro} set={(v)=>setForm({...form,logradouro:v})}/></Field>
              <Field label="Número"><Input v={form.numero} set={(v)=>setForm({...form,numero:v})}/></Field>
              <Field label="Complemento"><Input v={form.complemento} set={(v)=>setForm({...form,complemento:v})}/></Field>
              <Field label="Bairro"><Input v={form.bairro} set={(v)=>setForm({...form,bairro:v})}/></Field>
              <Field label="CEP"><Input v={form.cep} set={(v)=>setForm({...form,cep:v})}/></Field>
              <Field label="Município"><Input v={form.municipio} set={(v)=>setForm({...form,municipio:v})}/></Field>
              <Field label="UF"><Input v={form.uf} set={(v)=>setForm({...form,uf:v})}/></Field>
              <Field label="Telefone"><Input v={form.telefone} set={(v)=>setForm({...form,telefone:v})}/></Field>
              <Field label="Responsável local"><Input v={form.responsavel} set={(v)=>setForm({...form,responsavel:v})}/></Field>
            </div>
            {lookupStatus && <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{lookupStatus}</div>}
            <button onClick={saveClient} className="mt-4 w-full rounded-xl bg-[#2F5597] px-5 py-3 font-extrabold text-white">Salvar cliente</button>
          </section>
        )}

        {screen === "environments" && (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-extrabold">Ambientes</h2>
            <p className="text-sm text-slate-500">{current?.nome || "Selecione um cliente."}</p>
            {current && <div className="mt-4 grid gap-2 md:grid-cols-2">{ENVIRONMENTS.map((env)=><label key={env} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><input type="checkbox" checked={current.environments.includes(env)} onChange={()=>updateCurrent((c)=>({...c,environments:c.environments.includes(env)?c.environments.filter(x=>x!==env):[...c.environments,env]}))}/><span className="font-medium">{env}</span></label>)}</div>}
          </section>
        )}

        {screen === "visit" && (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            {!current ? <Notice text="Selecione um cliente antes de iniciar a visita." /> : current.qIndex >= QUESTIONS.length ? (
              <div><div className="text-xs font-extrabold text-green-700">MODO CAMPO</div><h2 className="mt-2 text-2xl font-extrabold">{current.nome}</h2><div className="mt-4 rounded-xl bg-green-50 p-4 font-bold text-green-800">Recebimento concluído ✅</div></div>
            ) : (
              <>
                <div className="text-xs font-extrabold text-green-700">MODO CAMPO • RECEBIMENTO</div>
                <h2 className="mt-2 text-2xl font-extrabold">{current.nome}</h2>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-[#2e7d32]" style={{width:`${progress}%`}}/></div>
                <div className="mt-2 text-sm font-bold text-slate-500">Pergunta {current.qIndex + 1} de {QUESTIONS.length}</div>
                <div className="mt-5 text-xl font-extrabold">{QUESTIONS[current.qIndex][1]}</div>
                <div className="mt-3 space-y-2">{QUESTIONS[current.qIndex][2].map((opt)=><button key={opt} onClick={()=>setSelectedAnswer(opt)} className={`w-full rounded-xl border p-4 text-left text-base font-bold ${selectedAnswer===opt?"border-[#2F5597] bg-blue-50":"border-slate-200 bg-white"}`}>{opt}</button>)}</div>
                <Field label="Observação opcional"><textarea className="min-h-24 w-full rounded-xl border border-slate-300 p-3" value={note} onChange={(e)=>setNote(e.target.value)}/></Field>
                <button disabled={!selectedAnswer} onClick={saveAnswer} className="mt-3 w-full rounded-xl bg-[#2F5597] px-5 py-3 font-extrabold text-white disabled:opacity-40">Salvar e avançar ➜</button>
              </>
            )}
          </section>
        )}

        {screen === "nc" && (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-extrabold">Não conformidade</h2>
            <p className="text-sm text-slate-500">{current?.nome || "Selecione um cliente."}</p>
            {current && <>
              <Field label="Descrição"><textarea className="min-h-24 w-full rounded-xl border border-slate-300 p-3" value={ncForm.description} onChange={(e)=>setNcForm({...ncForm,description:e.target.value})}/></Field>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Categoria"><select className="w-full rounded-xl border border-slate-300 p-3" value={ncForm.category} onChange={(e)=>setNcForm({...ncForm,category:e.target.value})}>{["Estrutural","Operacional","Documental","Equipamento","Outro"].map(x=><option key={x}>{x}</option>)}</select></Field>
                <Field label="Prioridade"><select className="w-full rounded-xl border border-slate-300 p-3" value={ncForm.priority} onChange={(e)=>setNcForm({...ncForm,priority:e.target.value})}>{["Baixa","Média","Alta"].map(x=><option key={x}>{x}</option>)}</select></Field>
                <Field label="Responsável"><Input v={ncForm.owner} set={(v)=>setNcForm({...ncForm,owner:v})}/></Field>
                <Field label="Prazo"><input type="date" className="w-full rounded-xl border border-slate-300 p-3" value={ncForm.due} onChange={(e)=>setNcForm({...ncForm,due:e.target.value})}/></Field>
              </div>
              <button onClick={saveNC} className="mt-4 w-full rounded-xl bg-[#2F5597] px-5 py-3 font-extrabold text-white">Salvar NC</button>
              <div className="mt-5 space-y-2">{current.ncs.map((n)=><div key={n.id} className="rounded-xl border border-slate-200 p-3"><div className="font-extrabold">{n.category} • {n.priority}</div><div className="mt-1">{n.description}</div><div className="mt-1 text-xs text-slate-500">{n.owner || "Sem responsável"} {n.due && `• prazo ${n.due}`}</div></div>)}</div>
            </>}
          </section>
        )}

        {screen === "report" && (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-extrabold">Relatório de demonstração</h2>
            <p className="text-sm text-slate-500">{current?.nome || "Selecione um cliente."}</p>
            <pre className="mt-4 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">{reportText()}</pre>
          </section>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-4 gap-2 border-t border-slate-200 bg-white p-2">
        <button onClick={()=>alert("Câmera real será o próximo módulo.")} className="rounded-xl bg-slate-100 py-2 text-xs font-bold">📷<br/>Foto</button>
        <button onClick={()=>alert("Áudio real será o próximo módulo.")} className="rounded-xl bg-slate-100 py-2 text-xs font-bold">🎤<br/>Áudio</button>
        <button onClick={()=>setScreen("nc")} className="rounded-xl bg-slate-100 py-2 text-xs font-bold">⚠️<br/>NC</button>
        <button onClick={()=>setScreen("visit")} className="rounded-xl bg-slate-100 py-2 text-xs font-bold">📋<br/>Visita</button>
      </div>
    </div>
  );
}

function Metric({label,value}:{label:string;value:string|number}) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-bold text-slate-500">{label}</div><div className="mt-1 text-2xl font-extrabold">{value}</div></div>
}

function Field({label,children}:{label:string;children:React.ReactNode}) {
  return <label className="block"><span className="mb-1 block text-xs font-bold text-slate-600">{label}</span>{children}</label>
}

function Input({v,set}:{v:string;set:(value:string)=>void}) {
  return <input className="w-full rounded-xl border border-slate-300 px-3 py-3" value={v} onChange={(e)=>set(e.target.value)}/>
}

function Notice({text}:{text:string}) {
  return <div className="rounded-xl bg-amber-50 p-4 text-sm font-medium text-amber-900">{text}</div>
}
