"use client";
import {useEffect,useState} from "react";
import MetricCard from "@/components/MetricCard";
import type {AppDB,Empresa} from "@/types";
import {emptyDB,loadDB,saveDB} from "@/lib/storage";

export default function Home(){
 const [db,setDb]=useState<AppDB>(emptyDB); const [ready,setReady]=useState(false); const [view,setView]=useState<"inicio"|"empresas">("inicio"); const [showForm,setShowForm]=useState(false);
 const [form,setForm]=useState({cnpj:"",nomeFantasia:"",razaoSocial:"",situacao:"",cnae:"",cnaeDescricao:"",tipo:"Outro",logradouro:"",numero:"",complemento:"",bairro:"",cep:"",municipio:"",uf:"",telefone:"",email:"",responsavel:""});
 const [msg,setMsg]=useState(""); const [loading,setLoading]=useState(false);
 useEffect(()=>{setDb(loadDB());setReady(true)},[]);
 useEffect(()=>{if(ready)saveDB(db)},[db,ready]);
 const atual=db.empresaAtualId?db.empresas[db.empresaAtualId]:undefined;
 async function buscar(){const c=form.cnpj.replace(/\D/g,"");if(c.length!==14){setMsg("Informe um CNPJ com 14 dígitos.");return}setLoading(true);setMsg("Buscando...");try{const r=await fetch(`/api/cnpj/${c}`);const d=await r.json();if(!r.ok)throw new Error(d.error||"Não encontrado");setForm(f=>({...f,cnpj:d.cnpj||c,nomeFantasia:d.nome_fantasia||"",razaoSocial:d.razao_social||"",situacao:d.descricao_situacao_cadastral||"",cnae:String(d.cnae_fiscal||""),cnaeDescricao:d.cnae_fiscal_descricao||"",logradouro:d.logradouro||"",numero:d.numero||"",complemento:d.complemento||"",bairro:d.bairro||"",cep:d.cep||"",municipio:d.municipio||"",uf:d.uf||"",telefone:d.ddd_telefone_1||"",email:d.email||""}));setMsg("Empresa encontrada. Confira os dados.")}catch(e){setMsg(e instanceof Error?e.message:"Falha na consulta")}finally{setLoading(false)}}
 function salvar(){const id=form.cnpj.replace(/\D/g,"")||crypto.randomUUID();const emp:Empresa={id,...form,nomeFantasia:form.nomeFantasia||form.razaoSocial||"Sem nome",criadoEm:new Date().toISOString()};setDb(o=>({...o,empresaAtualId:id,empresas:{...o.empresas,[id]:emp}}));setShowForm(false);setView("empresas")}
 return <div className="min-h-screen">
   <header className="bg-[#17365D] text-white"><div className="mx-auto max-w-7xl px-4 py-4"><div className="text-xl font-extrabold">MBP Expert AI</div><div className="text-xs text-blue-100">Sistema Operacional para Consultoria em Segurança dos Alimentos • v2.0</div></div></header>
   <div className="mx-auto max-w-7xl p-4">
    <div className="mb-4 flex gap-2"><button onClick={()=>setView("inicio")} className="rounded-xl bg-slate-200 px-4 py-2 font-bold">Início</button><button onClick={()=>setView("empresas")} className="rounded-xl bg-slate-200 px-4 py-2 font-bold">Empresas</button></div>
    {showForm? <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex justify-between"><div><h2 className="text-2xl font-extrabold">Nova empresa</h2><p className="text-sm text-slate-500">Digite o CNPJ para buscar os dados automaticamente.</p></div><button onClick={()=>setShowForm(false)} className="rounded-xl bg-slate-100 px-3 py-2 font-bold">Fechar</button></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
       <label><span className="mb-1 block text-xs font-bold text-slate-500">CNPJ</span><div className="flex gap-2"><input className="w-full rounded-xl border p-3" value={form.cnpj} onChange={e=>setForm({...form,cnpj:e.target.value})}/><button onClick={buscar} className="rounded-xl bg-slate-900 px-4 font-bold text-white">{loading?"...":"Buscar"}</button></div></label>
       {Object.entries(form).filter(([k])=>k!=="cnpj").map(([k,v])=><label key={k}><span className="mb-1 block text-xs font-bold text-slate-500">{k}</span><input className="w-full rounded-xl border p-3" value={v} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}
      </div>{msg&&<div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm">{msg}</div>}
      <button onClick={salvar} className="mt-4 w-full rounded-xl bg-[#2F5597] p-3 font-extrabold text-white">Salvar empresa</button>
    </section>:
    view==="inicio"? <div className="space-y-4">
      <section className="rounded-2xl bg-gradient-to-r from-[#17365D] to-[#2F5597] p-5 text-white shadow-sm"><div className="text-xs font-extrabold uppercase tracking-wider text-blue-100">Painel da consultoria</div><h1 className="mt-2 text-3xl font-extrabold">Base profissional da v2.0</h1><p className="mt-2 text-sm text-blue-100">Empresas, visitas e não conformidades preparados para a próxima etapa com banco online e login.</p></section>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4"><MetricCard label="Empresas" value={Object.keys(db.empresas).length}/><MetricCard label="Visitas" value={db.visitas.length}/><MetricCard label="NC abertas" value={db.ncs.filter(n=>n.status!=="Concluída").length}/><MetricCard label="Empresa ativa" value={atual?"1":"0"} helper={atual?.nomeFantasia||"nenhuma"}/></section>
      <section className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-xl font-extrabold">Empresa atual</h2><p className="text-sm text-slate-500">Cliente selecionado para a operação em campo.</p></div><button onClick={()=>setView("empresas")} className="rounded-xl bg-slate-100 px-3 py-2 font-bold">Trocar</button></div>{atual?<div className="mt-4 rounded-xl border p-4"><div className="text-xl font-extrabold">{atual.nomeFantasia}</div><div className="text-sm text-slate-500">{atual.razaoSocial}</div><div className="mt-1 text-xs text-slate-400">{atual.cnpj} • {atual.municipio}/{atual.uf}</div></div>:<div className="mt-4 text-sm text-slate-500">Nenhuma empresa selecionada.</div>}</section>
    </div>:
    <section className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h1 className="text-2xl font-extrabold">Empresas</h1><p className="text-sm text-slate-500">Cadastre e selecione seus clientes.</p></div><button onClick={()=>setShowForm(true)} className="rounded-xl bg-[#2F5597] px-4 py-3 font-extrabold text-white">+ Nova empresa</button></div><div className="mt-4 grid gap-3 md:grid-cols-2">{Object.values(db.empresas).map(e=><button key={e.id} onClick={()=>setDb(o=>({...o,empresaAtualId:e.id}))} className={`rounded-xl border p-4 text-left ${db.empresaAtualId===e.id?"border-[#2F5597] bg-blue-50":"border-slate-200"}`}><div className="font-extrabold">{e.nomeFantasia}</div><div className="text-sm text-slate-500">{e.razaoSocial}</div><div className="mt-1 text-xs text-slate-400">{e.cnpj} • {e.municipio}/{e.uf}</div></button>)}</div></section>}
   </div>
 </div>
}