"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  Empresa,
  PerfilUsuario,
  RegistroAuditoria,
  StatusUsuario,
  UsuarioSistema,
} from "@/types";
import type { DadosUsuarioPreparacao } from "@/lib/userManagement";
import {
  PERMISSIONS_BY_PROFILE,
  PERMISSION_LABELS,
  PROFILE_DESCRIPTIONS,
} from "@/lib/permissions";

const perfis: PerfilUsuario[] = ["Administrador", "Consultor/RT", "Cliente Gestor"];
const vazio: DadosUsuarioPreparacao = {
  nome: "",
  email: "",
  perfil: "Consultor/RT",
  empresaIds: [],
};

type Props = {
  usuarios: UsuarioSistema[];
  empresas: Record<string, Empresa>;
  registrosAuditoria: RegistroAuditoria[];
  onSalvarUsuario: (dados: DadosUsuarioPreparacao, usuarioId?: string) => boolean;
  onAlterarStatus: (usuarioId: string, status: StatusUsuario) => boolean;
};

type Readiness = {
  authConfigured: boolean;
  enforcementActive: boolean;
  directoryReady: boolean;
};

export default function AccessPreparationPanel(props: Props) {
  const [formulario, setFormulario] = useState<DadosUsuarioPreparacao | null>(null);
  const [editandoId, setEditandoId] = useState<string>();
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const empresas = useMemo(
    () => Object.values(props.empresas).sort((a, b) =>
      (a.nomeFantasia || a.razaoSocial).localeCompare(b.nomeFantasia || b.razaoSocial, "pt-BR")
    ),
    [props.empresas]
  );

  useEffect(() => {
    fetch("/api/access/readiness", { cache: "no-store" })
      .then((resposta) => resposta.json())
      .then((dados) => setReadiness(dados))
      .catch(() => setReadiness(null));
  }, []);

  function iniciarNovo() {
    setEditandoId(undefined);
    setFormulario(vazio);
  }

  function iniciarEdicao(usuario: UsuarioSistema) {
    setEditandoId(usuario.id);
    setFormulario({
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      empresaIds: usuario.empresaIds,
    });
  }

  function alternarEmpresa(empresaId: string) {
    if (!formulario) return;
    setFormulario({
      ...formulario,
      empresaIds: formulario.empresaIds.includes(empresaId)
        ? formulario.empresaIds.filter((id) => id !== empresaId)
        : [...formulario.empresaIds, empresaId],
    });
  }

  function salvar() {
    if (!formulario || !props.onSalvarUsuario(formulario, editandoId)) return;
    setFormulario(null);
    setEditandoId(undefined);
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="text-xs font-extrabold uppercase text-[#2F5597]">CORE-050 • v2.46</div>
        <h1 className="mt-1 text-2xl font-extrabold">Usuários e permissões</h1>
        <p className="mt-2 max-w-4xl text-sm text-slate-600">
          Prepare quem poderá entrar, o perfil de cada pessoa e as empresas autorizadas. Nesta etapa nenhum convite é enviado.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Status titulo="Diretório" valor="Preparado" classe="bg-emerald-50 text-emerald-900" />
          <Status
            titulo="Neon Auth"
            valor={readiness?.authConfigured ? "Configurado" : "Aguardando ativação"}
            classe={readiness?.authConfigured ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}
          />
          <Status
            titulo="Proteção de login"
            valor={readiness?.enforcementActive ? "Ativa" : "Modo preparação"}
            classe={readiness?.enforcementActive ? "bg-emerald-50 text-emerald-900" : "bg-blue-50 text-blue-900"}
          />
        </div>
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
          A proteção só será ativada após criar e testar o primeiro Administrador. Isso evita bloquear o sistema atual por engano.
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold">Diretório de pessoas</h2>
            <p className="mt-1 text-sm text-slate-500">Cadastros preparatórios; sem senha e sem acesso liberado.</p>
          </div>
          <button
            type="button"
            onClick={iniciarNovo}
            className="inline-flex items-center justify-center rounded-xl px-4 py-3 font-extrabold shadow-sm"
            style={{ backgroundColor: "#2F5597", border: "1px solid #244578", color: "#ffffff" }}
          >
            + Preparar usuário
          </button>
        </div>

        {formulario && (
          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Campo titulo="Nome"><input className="w-full rounded-xl border bg-white p-3" value={formulario.nome} onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })} /></Campo>
              <Campo titulo="E-mail"><input type="email" className="w-full rounded-xl border bg-white p-3" value={formulario.email} onChange={(e) => setFormulario({ ...formulario, email: e.target.value })} /></Campo>
              <Campo titulo="Perfil"><select className="w-full rounded-xl border bg-white p-3" value={formulario.perfil} onChange={(e) => setFormulario({ ...formulario, perfil: e.target.value as PerfilUsuario, empresaIds: e.target.value === "Administrador" ? [] : formulario.empresaIds })}>{perfis.map((perfil) => <option key={perfil}>{perfil}</option>)}</select></Campo>
            </div>
            {formulario.perfil !== "Administrador" && (
              <div className="mt-4">
                <div className="text-xs font-extrabold text-slate-600">Empresas autorizadas</div>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {empresas.map((empresa) => (
                    <label key={empresa.id} className="flex gap-3 rounded-xl bg-white p-3 text-sm">
                      <input type="checkbox" checked={formulario.empresaIds.includes(empresa.id)} onChange={() => alternarEmpresa(empresa.id)} />
                      <span className="font-bold">{empresa.nomeFantasia || empresa.razaoSocial}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={salvar}
                className="inline-flex items-center justify-center rounded-xl px-4 py-3 font-extrabold shadow-sm"
                style={{ backgroundColor: "#17365D", border: "1px solid #102844", color: "#ffffff" }}
              >
                Salvar preparação
              </button>
              <button type="button" onClick={() => setFormulario(null)} className="rounded-xl bg-white px-4 py-3 font-bold">Cancelar</button>
            </div>
          </div>
        )}

        <div className="mt-5 space-y-3">
          {props.usuarios.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">Nenhum usuário preparado.</div>
          ) : props.usuarios.map((usuario) => (
            <article key={usuario.id} className="rounded-xl border p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-extrabold">{usuario.nome}</div>
                  <div className="text-sm text-slate-500">{usuario.email}</div>
                  <div className="mt-2 text-xs font-bold text-slate-600">{usuario.perfil} • {usuario.status}</div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => iniciarEdicao(usuario)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold">Editar</button>
                  <button type="button" onClick={() => props.onAlterarStatus(usuario.id, usuario.status === "Suspenso" ? "Convidado" : "Suspenso")} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{usuario.status === "Suspenso" ? "Restaurar" : "Suspender"}</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {perfis.map((perfil) => (
          <article key={perfil} className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-xl font-extrabold">{perfil}</h2>
            <p className="mt-2 text-sm text-slate-600">{PROFILE_DESCRIPTIONS[perfil]}</p>
            <div className="mt-4 space-y-2">{PERMISSIONS_BY_PROFILE[perfil].map((acao) => <div key={acao} className="rounded-lg bg-slate-50 p-2 text-xs font-bold">✓ {PERMISSION_LABELS[acao]}</div>)}</div>
          </article>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-extrabold">Auditoria do diretório</h2>
        <div className="mt-3 space-y-2">
          {props.registrosAuditoria.filter((r) => r.entidade === "Usuário").slice(-10).reverse().map((registro) => (
            <div key={registro.id} className="rounded-xl bg-slate-50 p-3 text-sm"><div className="font-bold">{registro.detalhes}</div><div className="mt-1 text-xs text-slate-500">{new Date(registro.criadoEm).toLocaleString("pt-BR")}</div></div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Status({ titulo, valor, classe }: { titulo: string; valor: string; classe: string }) {
  return <div className={`rounded-xl p-4 ${classe}`}><div className="text-xs font-extrabold uppercase">{titulo}</div><div className="mt-1 text-lg font-extrabold">{valor}</div></div>;
}

function Campo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return <label><span className="mb-1 block text-xs font-extrabold text-slate-600">{titulo}</span>{children}</label>;
}
