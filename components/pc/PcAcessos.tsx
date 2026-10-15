"use client";

import { useMemo, useState } from "react";
import type { Empresa, PerfilUsuario, RegistroAuditoria, StatusUsuario, UsuarioSistema } from "@/types";
import type { DadosUsuarioPreparacao } from "@/lib/userManagement";
import { PERMISSIONS_BY_PROFILE, PERMISSION_LABELS, PROFILE_DESCRIPTIONS } from "@/lib/permissions";
import { TILE_GRADIENTS } from "@/lib/brand";
import { ListRow } from "@/components/ui/ListRow";
import { Pill } from "@/components/ui/Pill";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";

const PERFIS: PerfilUsuario[] = ["Administrador", "Consultor/RT", "Cliente Gestor"];

const GRADIENTE_PERFIL: Record<PerfilUsuario, string> = {
  Administrador: `linear-gradient(160deg, ${TILE_GRADIENTS.roxo[0]}, ${TILE_GRADIENTS.roxo[1]})`,
  "Consultor/RT": `linear-gradient(160deg, ${TILE_GRADIENTS.azul[0]}, ${TILE_GRADIENTS.azul[1]})`,
  "Cliente Gestor": `linear-gradient(160deg, ${TILE_GRADIENTS.turquesa[0]}, ${TILE_GRADIENTS.turquesa[1]})`,
};

type Aba = "pessoas" | "perfis" | "historico";

type Props = {
  usuarios: UsuarioSistema[];
  empresas: Empresa[];
  registrosAuditoria: RegistroAuditoria[];
  loginProtegido: boolean;
  formulario: DadosUsuarioPreparacao | null;
  editando: boolean;
  enviandoId?: string;
  onNovo: () => void;
  onEditar: (usuario: UsuarioSistema) => void;
  onCampo: (alteracao: Partial<DadosUsuarioPreparacao>) => void;
  onAlternarEmpresa: (empresaId: string) => void;
  onSalvar: () => void;
  onCancelar: () => void;
  onEnviarAcesso: (usuarioId: string) => void;
  onAlterarStatus: (usuarioId: string, status: StatusUsuario) => void;
};

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PcAcessos({
  usuarios,
  empresas,
  registrosAuditoria,
  loginProtegido,
  formulario,
  editando,
  enviandoId,
  onNovo,
  onEditar,
  onCampo,
  onAlternarEmpresa,
  onSalvar,
  onCancelar,
  onEnviarAcesso,
  onAlterarStatus,
}: Props) {
  const [aba, setAba] = useState<Aba>("pessoas");
  const [tocado, setTocado] = useState<{ nome: boolean; email: boolean }>({ nome: false, email: false });

  // Ativos primeiro, suspensos por último.
  const ordenados = useMemo(
    () => [...usuarios].sort((a, b) => Number(a.status === "Suspenso") - Number(b.status === "Suspenso")),
    [usuarios]
  );
  const historico = useMemo(
    () => registrosAuditoria.filter((registro) => registro.entidade === "Usuário").slice(-50).reverse(),
    [registrosAuditoria]
  );

  const erroNome = formulario && !formulario.nome.trim() ? "Informe o nome." : "";
  const erroEmail =
    formulario && !formulario.email.trim()
      ? "Informe o e-mail."
      : formulario && !EMAIL_VALIDO.test(formulario.email.trim())
      ? "Esse e-mail parece incompleto."
      : "";
  const erroEmpresas =
    formulario && formulario.perfil !== "Administrador" && formulario.empresaIds.length === 0
      ? "Escolha ao menos uma empresa autorizada."
      : "";
  const formularioValido = !erroNome && !erroEmail && !erroEmpresas;

  return (
    <section className="ui-screen" aria-label="Acessos">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">Acessos</h1>
          <div className="pc-badges">
            {loginProtegido && <Pill tom="ok">Login protegido</Pill>}
            <Pill tom="ok">Diretório preparado</Pill>
          </div>
          <p className="ui-subtitle">
            {loginProtegido
              ? "Cada pessoa entra com o próprio acesso e vê só as empresas e funções autorizadas."
              : "Prepare quem poderá entrar e envie o acesso. A proteção do login será ativada depois do primeiro Administrador testado."}
          </p>
        </div>
        <button type="button" className="ui-btn ui-btn--primary" onClick={onNovo}>
          + Preparar usuário
        </button>
      </div>

      <div className="ui-toolbar">
        <SegmentedTabs<Aba>
          rotulo="Seções de acessos"
          valor={aba}
          onChange={setAba}
          abas={[
            { id: "pessoas", rotulo: "Pessoas", contagem: usuarios.length },
            { id: "perfis", rotulo: "Perfis e permissões" },
            { id: "historico", rotulo: "Histórico de acessos" },
          ]}
        />
      </div>

      <div className="ui-scroll">
        {aba === "pessoas" && (
          <>
            {formulario && (
              <div className="ui-card pc-form" role="group" aria-label={editando ? "Editar pessoa" : "Preparar usuário"}>
                <div className="pc-form-grid">
                  <label className="pc-field">
                    <span className="ui-eyebrow">Nome</span>
                    <input
                      className={`ui-input${tocado.nome && erroNome ? " is-invalid" : ""}`}
                      value={formulario.nome}
                      onChange={(evento) => onCampo({ nome: evento.target.value })}
                      onBlur={() => setTocado((atual) => ({ ...atual, nome: true }))}
                      aria-invalid={Boolean(tocado.nome && erroNome)}
                    />
                    {tocado.nome && erroNome && <span className="ui-field-error">{erroNome}</span>}
                  </label>
                  <label className="pc-field">
                    <span className="ui-eyebrow">E-mail</span>
                    <input
                      type="email"
                      className={`ui-input${tocado.email && erroEmail ? " is-invalid" : ""}`}
                      value={formulario.email}
                      onChange={(evento) => onCampo({ email: evento.target.value })}
                      onBlur={() => setTocado((atual) => ({ ...atual, email: true }))}
                      aria-invalid={Boolean(tocado.email && erroEmail)}
                    />
                    {tocado.email && erroEmail && <span className="ui-field-error">{erroEmail}</span>}
                  </label>
                  <label className="pc-field">
                    <span className="ui-eyebrow">Perfil</span>
                    <select
                      className="ui-input"
                      value={formulario.perfil}
                      onChange={(evento) =>
                        onCampo({
                          perfil: evento.target.value as PerfilUsuario,
                          empresaIds: evento.target.value === "Administrador" ? [] : formulario.empresaIds,
                        })
                      }
                    >
                      {PERFIS.map((perfil) => (
                        <option key={perfil}>{perfil}</option>
                      ))}
                    </select>
                  </label>
                </div>
                {formulario.perfil !== "Administrador" && (
                  <div className="pc-form-empresas">
                    <span className="ui-eyebrow">Empresas autorizadas</span>
                    <div className="pc-empresas-grid">
                      {empresas.map((empresa) => (
                        <label key={empresa.id} className="pc-check">
                          <input
                            type="checkbox"
                            checked={formulario.empresaIds.includes(empresa.id)}
                            onChange={() => onAlternarEmpresa(empresa.id)}
                          />
                          <span>{empresa.nomeFantasia || empresa.razaoSocial}</span>
                        </label>
                      ))}
                    </div>
                    {erroEmpresas && <span className="ui-field-error">{erroEmpresas}</span>}
                  </div>
                )}
                <div className="ui-footer-actions pc-form-actions">
                  <button
                    type="button"
                    className="ui-btn ui-btn--save"
                    disabled={!formularioValido}
                    onClick={() => {
                      setTocado({ nome: true, email: true });
                      if (formularioValido) onSalvar();
                    }}
                  >
                    Salvar preparação
                  </button>
                  <button type="button" className="ui-btn ui-btn--secondary" onClick={onCancelar}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="ui-list">
              {ordenados.map((usuario) => (
                <ListRow
                  key={usuario.id}
                  esmaecida={usuario.status === "Suspenso"}
                  icone={
                    <span
                      className="ui-avatar ui-avatar--round"
                      style={{ background: GRADIENTE_PERFIL[usuario.perfil] }}
                      aria-hidden="true"
                    >
                      {iniciais(usuario.nome)}
                    </span>
                  }
                  titulo={usuario.nome}
                  secundario={usuario.email}
                  pilulas={
                    <>
                      <Pill tom="brand">{usuario.perfil}</Pill>
                      <Pill tom={usuario.status === "Ativo" ? "ok" : usuario.status === "Suspenso" ? "nc" : "pend"}>
                        {usuario.status}
                      </Pill>
                    </>
                  }
                  acao={
                    <>
                      {usuario.status === "Convidado" && (
                        <button
                          type="button"
                          className="ui-btn ui-btn--primary"
                          disabled={Boolean(enviandoId)}
                          onClick={() => onEnviarAcesso(usuario.id)}
                        >
                          {enviandoId === usuario.id ? "Enviando..." : "Enviar acesso"}
                        </button>
                      )}
                      <button
                        type="button"
                        className="ui-btn ui-btn--secondary"
                        onClick={() => onAlterarStatus(usuario.id, usuario.status === "Suspenso" ? "Convidado" : "Suspenso")}
                      >
                        {usuario.status === "Suspenso" ? "Restaurar" : "Suspender"}
                      </button>
                      <button type="button" className="ui-btn ui-btn--secondary" onClick={() => onEditar(usuario)}>
                        Editar
                      </button>
                    </>
                  }
                />
              ))}
              {usuarios.length === 0 && <div className="ui-empty">Nenhum usuário preparado.</div>}
            </div>
          </>
        )}

        {aba === "perfis" && (
          <div className="pc-perfis">
            {PERFIS.map((perfil) => (
              <article key={perfil} className="ui-card">
                <h2 className="ui-card-title">{perfil}</h2>
                <p className="ui-subtitle">{PROFILE_DESCRIPTIONS[perfil]}</p>
                <ul className="pc-perm-list">
                  {PERMISSIONS_BY_PROFILE[perfil].map((acao) => (
                    <li key={acao}>✓ {PERMISSION_LABELS[acao]}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}

        {aba === "historico" && (
          <div className="ui-list">
            {historico.map((registro) => (
              <div key={registro.id} className="ui-card pc-history-row">
                <span>{registro.detalhes}</span>
                <span className="ui-row-sub">{new Date(registro.criadoEm).toLocaleString("pt-BR")}</span>
              </div>
            ))}
            {historico.length === 0 && <div className="ui-empty">Nenhum registro de acesso ainda.</div>}
          </div>
        )}
      </div>
    </section>
  );
}
