"use client";

import { formatarDataHora } from "@/lib/dataLocal";
import { useEffect, useMemo, useState } from "react";
import type { Empresa, PerfilUsuario, RegistroAuditoria, StatusUsuario, UsuarioSistema } from "@/types";
import type { DadosUsuarioPreparacao } from "@/lib/userManagement";
import { PERMISSIONS_BY_PROFILE, PERMISSION_LABELS, PROFILE_DESCRIPTIONS } from "@/lib/permissions";
import { TILE_GRADIENTS } from "@/lib/brand";
import { ListRow } from "@/components/ui/ListRow";
import { Pill } from "@/components/ui/Pill";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import TelasLiberadasModal from "@/components/pc/TelasLiberadasModal";
import ConfirmarExclusaoModal from "@/components/pc/ConfirmarExclusaoModal";
import { telasDiferentesDoPadrao, type TelasDoUsuario } from "@/lib/screenAccess";
import type { ItemMenu } from "@/components/ui/RowMenu";
import { acoesDoAcesso } from "@/lib/menuActions";
import { contarPessoas, filtrarPessoas, type FiltroPessoas } from "@/lib/userManagement";
import { nomeProprio } from "@/lib/nomeCargo";
import { PERFIS_NOVOS, PODE_E_NAO_PODE } from "@/lib/perfisTexto";
import { confirmar } from "@/lib/dialogos";
import { PRAZOS_DE_VALIDADE, acessoVigente, calcularValidade, dataDaValidade, textoDoConvite } from "@/lib/validadeDeAcesso";

const PERFIS: PerfilUsuario[] = ["Administrador", "Consultor/RT", "Cliente Gestor", "Gerente", "Executor de campo", "Fiscal"];

const GRADIENTE_PERFIL: Record<PerfilUsuario, string> = {
  Administrador: `linear-gradient(160deg, ${TILE_GRADIENTS.roxo[0]}, ${TILE_GRADIENTS.roxo[1]})`,
  "Consultor/RT": `linear-gradient(160deg, ${TILE_GRADIENTS.azul[0]}, ${TILE_GRADIENTS.azul[1]})`,
  "Cliente Gestor": `linear-gradient(160deg, ${TILE_GRADIENTS.turquesa[0]}, ${TILE_GRADIENTS.turquesa[1]})`,
  Gerente: `linear-gradient(160deg, ${TILE_GRADIENTS.ambar[0]}, ${TILE_GRADIENTS.ambar[1]})`,
  "Executor de campo": `linear-gradient(160deg, ${TILE_GRADIENTS.laranja[0]}, ${TILE_GRADIENTS.laranja[1]})`,
  Fiscal: `linear-gradient(160deg, ${TILE_GRADIENTS.ceu[0]}, ${TILE_GRADIENTS.ceu[1]})`,
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
  podeExcluir: (usuario: UsuarioSistema) => boolean;
  onExcluir: (usuarioId: string) => void;
  onSalvarTelas: (usuarioId: string, dados: { perfil: PerfilUsuario; empresaIds: string[]; telas: TelasDoUsuario }) => boolean;
  /** Fiscal: renova a validade (3, 7, 15 ou 30 dias a partir de hoje). */
  onRenovar: (usuarioId: string, dias: number) => void;
  /** Fiscal: corta o acesso na hora. */
  onEncerrar: (usuarioId: string) => void;
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
  podeExcluir,
  onExcluir,
  onSalvarTelas,
  onRenovar,
  onEncerrar,
}: Props) {
  const [renovarDe, setRenovarDe] = useState<UsuarioSistema | null>(null);
  const [diasRenovacao, setDiasRenovacao] = useState<number>(0);
  const [telasDe, setTelasDe] = useState<UsuarioSistema | null>(null);
  const [telasDoNovo, setTelasDoNovo] = useState(false);
  const [excluirDe, setExcluirDe] = useState<UsuarioSistema | null>(null);
  const [filtroPessoas, setFiltroPessoas] = useState<FiltroPessoas>("ativos");
  const [aba, setAba] = useState<Aba>("pessoas");
  // Ao fechar a janela de edição, a linha da pessoa editada fica em creme por alguns segundos.
  const [editandoLocalId, setEditandoLocalId] = useState<string | null>(null);
  const [destacadoId, setDestacadoId] = useState<string | null>(null);
  useEffect(() => {
    if (formulario || !editandoLocalId) return;
    setDestacadoId(editandoLocalId);
    setEditandoLocalId(null);
    const timer = window.setTimeout(() => setDestacadoId(null), 3500);
    return () => window.clearTimeout(timer);
  }, [formulario, editandoLocalId]);
  const editarPessoa = (usuario: UsuarioSistema) => {
    setEditandoLocalId(usuario.id);
    onEditar(usuario);
  };
  const [tocado, setTocado] = useState<{ nome: boolean; email: boolean }>({ nome: false, email: false });

  // Ativos primeiro, suspensos por último.
  const ordenados = useMemo(
    () => [...filtrarPessoas(usuarios, filtroPessoas)].sort((a, b) => Number(a.status === "Suspenso") - Number(b.status === "Suspenso")),
    [usuarios, filtroPessoas]
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
  const erroValidade =
    formulario && formulario.perfil === "Fiscal" && !formulario.jaEraFiscal && !(formulario.validadeDias && (PRAZOS_DE_VALIDADE as readonly number[]).includes(formulario.validadeDias))
      ? "Escolha a validade do acesso: 3, 7, 15 ou 30 dias."
      : "";
  const formularioValido = !erroNome && !erroEmail && !erroEmpresas && !erroValidade;

  return (
    <section className="ui-screen" aria-label="Acessos">
      <div className="ui-head">
        <div>
          <h1 className="sr-only">Acessos</h1>
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
              <div className="pc-modal-layer" role="presentation">
              {/* Fundo escurecido: a lista fica parada atrás e o formulário só existe aqui. */}
              <div className="pc-modal-backdrop" />
              <section className="pc-modal acc-modal" role="dialog" aria-modal="true" aria-label={editando ? "Editar usuário" : "Preparar usuário"}>
                <h2 className="pc-modal-title">{editando ? "Editar usuário" : "Preparar usuário"}</h2>
                <div className="acc-grade">
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
                <div className="acc-grade">
                {(formulario.perfil === "Consultor/RT" || formulario.perfil === "Administrador") && (
                  <label className="pc-field">
                    <span className="ui-eyebrow">CRN (assina os relatórios)</span>
                    <input className="ui-input" value={formulario.crn || ""} onChange={(evento) => onCampo({ crn: evento.target.value })} placeholder="Ex.: CRN-2 12345" />
                  </label>
                )}
                {(formulario.perfil === "Consultor/RT" || formulario.perfil === "Administrador") && (
                  <label className="pc-field">
                    <span className="ui-eyebrow">Telefone (sai no relatório)</span>
                    <input className="ui-input" inputMode="tel" value={formulario.telefone || ""} onChange={(evento) => onCampo({ telefone: evento.target.value })} placeholder="Ex.: (51) 99999-0000" />
                  </label>
                )}
                <label className="pc-field">
                  <span className="ui-eyebrow">{formulario.perfil === "Consultor/RT" || formulario.perfil === "Administrador" ? "Cargo na assinatura" : "Cargo (opcional)"}</span>
                  <input className="ui-input" value={formulario.cargo || ""} onChange={(evento) => onCampo({ cargo: evento.target.value })} placeholder="Ex.: Nutricionista RT" />
                </label>
                </div>
                {formulario.perfil === "Fiscal" && !formulario.jaEraFiscal && (
                  <label className="pc-field">
                    <span className="ui-eyebrow">Validade do acesso</span>
                    <select
                      className={`ui-input${erroValidade ? " is-invalid" : ""}`}
                      value={formulario.validadeDias ?? ""}
                      onChange={(evento) => onCampo({ validadeDias: evento.target.value ? Number(evento.target.value) : undefined })}
                      aria-invalid={Boolean(erroValidade)}
                    >
                      <option value="">Escolha…</option>
                      {PRAZOS_DE_VALIDADE.map((dias) => (
                        <option key={dias} value={dias}>
                          {dias} dias
                        </option>
                      ))}
                    </select>
                    {erroValidade ? (
                      <span className="ui-field-error">{erroValidade}</span>
                    ) : formulario.validadeDias ? (
                      <span className="ui-row-sub">{textoDoConvite(calcularValidade(formulario.validadeDias))}</span>
                    ) : null}
                  </label>
                )}
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
                    Salvar
                  </button>
                  {!editando && (
                    <button type="button" className="ui-btn ui-btn--soft" onClick={() => setTelasDoNovo(true)}>
                      Telas liberadas…{formulario.telas && Object.keys(formulario.telas).length > 0 ? ` (${Object.keys(formulario.telas).length} ajustada${Object.keys(formulario.telas).length === 1 ? "" : "s"})` : ""}
                    </button>
                  )}
                  <button type="button" className="ui-btn ui-btn--secondary" onClick={onCancelar}>
                    Cancelar
                  </button>
                </div>
              </section>
              </div>
            )}

            <div className="ui-toolbar" role="group" aria-label="Filtrar pessoas">
              <SegmentedTabs<FiltroPessoas>
                rotulo="Filtrar pessoas"
                valor={filtroPessoas}
                onChange={setFiltroPessoas}
                abas={[
                  { id: "ativos", rotulo: "Ativos", contagem: contarPessoas(usuarios).ativos },
                  { id: "suspensos", rotulo: "Suspensos", contagem: contarPessoas(usuarios).suspensos },
                  { id: "todos", rotulo: "Todos", contagem: contarPessoas(usuarios).todos },
                ]}
              />
            </div>
            <div className="ui-list">
              {ordenados.map((usuario) => (
                <ListRow
                  key={usuario.id}
                  selecionada={destacadoId === usuario.id}
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
                  titulo={nomeProprio(usuario.nome)}
                  secundario={usuario.email}
                  pilulas={
                    <>
                      <Pill tom="brand">{usuario.perfil}</Pill>
                      {usuario.perfil === "Fiscal" && usuario.validoAte && (
                        <Pill tom={usuario.acessoEncerradoEm ? "nc" : acessoVigente(usuario) ? "info" : "nc"}>
                          {usuario.acessoEncerradoEm ? "Encerrado" : acessoVigente(usuario) ? `Expira em ${dataDaValidade(usuario.validoAte).slice(0, 5)}` : `Expirou em ${dataDaValidade(usuario.validoAte).slice(0, 5)}`}
                        </Pill>
                      )}
                      {telasDiferentesDoPadrao(usuario).length > 0 && <Pill tom="amber">Diferente do padrão</Pill>}
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
                      {usuario.perfil === "Fiscal" && (
                        <>
                          <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => { setRenovarDe(usuario); setDiasRenovacao(0); }}>
                            Renovar
                          </button>
                          {!usuario.acessoEncerradoEm && (
                            <button
                              type="button"
                              className="ui-btn ui-btn--soft ui-btn--small"
                              onClick={async () => {
                                if (await confirmar(`Encerrar agora o acesso de ${usuario.nome}? A pessoa deixa de entrar na hora.`, { titulo: "Encerrar acesso", confirmarRotulo: "Encerrar agora", perigoso: true })) onEncerrar(usuario.id);
                              }}
                            >
                              Encerrar agora
                            </button>
                          )}
                        </>
                      )}
                      <button type="button" className="ui-btn ui-btn--soft ui-btn--small" aria-label={`Telas liberadas de ${usuario.nome}`} onClick={() => setTelasDe(usuario)}>
                        Telas
                      </button>
                      <button type="button" className="ui-btn ui-btn--secondary" onClick={() => editarPessoa(usuario)}>
                        Editar
                      </button>
                    </>
                  }
                  menu={acoesDoAcesso({ status: usuario.status, podeGerenciar: true, podeExcluir: podeExcluir(usuario) }).map((acao): ItemMenu => {
                    switch (acao) {
                      case "editar":
                        return { rotulo: "Editar", onClick: () => editarPessoa(usuario) };
                      case "desativar":
                        return { rotulo: "Desativar acesso", perigo: true, confirmar: `Desativar o acesso de ${usuario.nome}? A pessoa continua cadastrada e o acesso pode ser reativado.`, onClick: () => onAlterarStatus(usuario.id, "Suspenso") };
                      case "excluir":
                        return {
                          rotulo: "Excluir usuário…",
                          perigo: true,
                          onClick: () => setExcluirDe(usuario),
                        };
                      default:
                        return { rotulo: "Reativar acesso", onClick: () => onAlterarStatus(usuario.id, "Convidado") };
                    }
                  })}
                />
              ))}
              {ordenados.length === 0 && <div className="ui-empty">{usuarios.length === 0 ? "Nenhum usuário preparado." : "Ninguém neste filtro."}</div>}
            </div>
          </>
        )}

        {aba === "perfis" && (
          <div className="pc-perfis">
            {PERFIS.map((perfil) => (
              <article key={perfil} className="ui-card">
                <h2 className="ui-card-title">
                  {perfil}
                  {PERFIS_NOVOS.includes(perfil) && <span className="perfil-novo">novo</span>}
                </h2>
                <p className="ui-subtitle">{PROFILE_DESCRIPTIONS[perfil]}</p>
                {PODE_E_NAO_PODE[perfil] ? (
                  <>
                    <span className="ui-eyebrow">Pode</span>
                    <ul className="pc-perm-list">
                      {PODE_E_NAO_PODE[perfil]!.pode.map((texto) => (
                        <li key={texto}>✓ {texto}</li>
                      ))}
                    </ul>
                    <span className="ui-eyebrow">Não pode</span>
                    <ul className="pc-perm-list pc-perm-list--nao">
                      {PODE_E_NAO_PODE[perfil]!.naoPode.map((texto) => (
                        <li key={texto}>✕ {texto}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <ul className="pc-perm-list">
                    {PERMISSIONS_BY_PROFILE[perfil].map((acao) => (
                      <li key={acao}>✓ {PERMISSION_LABELS[acao]}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        )}

        {aba === "historico" && (
          <div className="ui-list">
            {historico.map((registro) => (
              <div key={registro.id} className="ui-card pc-history-row">
                <span>{registro.detalhes}</span>
                <span className="ui-row-sub">{formatarDataHora(registro.criadoEm)}</span>
              </div>
            ))}
            {historico.length === 0 && <div className="ui-empty">Nenhum registro de acesso ainda.</div>}
          </div>
        )}
      </div>
      {renovarDe && (
        <div className="pc-modal-layer" role="presentation">
          <div className="pc-modal-backdrop" onClick={() => setRenovarDe(null)} />
          <section className="pc-modal pc-renovar" role="dialog" aria-modal="true" aria-label="Renovar acesso">
            <h2 className="pc-modal-title">Renovar acesso</h2>
            <p className="ui-subtitle">{renovarDe.nome} · escolha a nova validade, contada a partir de hoje.</p>
            <label className="pc-field">
              <span className="ui-eyebrow">Nova validade</span>
              <select className="ui-input" value={diasRenovacao || ""} onChange={(evento) => setDiasRenovacao(Number(evento.target.value))}>
                <option value="">Escolha…</option>
                {PRAZOS_DE_VALIDADE.map((dias) => (
                  <option key={dias} value={dias}>
                    {dias} dias
                  </option>
                ))}
              </select>
              {diasRenovacao ? <span className="ui-row-sub">{textoDoConvite(calcularValidade(diasRenovacao))}</span> : <span className="ui-field-error">Escolha 3, 7, 15 ou 30 dias.</span>}
            </label>
            <div className="ui-footer-actions">
              <button
                type="button"
                className="ui-btn ui-btn--save"
                disabled={!diasRenovacao}
                onClick={() => {
                  onRenovar(renovarDe.id, diasRenovacao);
                  setRenovarDe(null);
                }}
              >
                Renovar
              </button>
              <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setRenovarDe(null)}>
                Cancelar
              </button>
            </div>
          </section>
        </div>
      )}
      {excluirDe && (
        <ConfirmarExclusaoModal
          titulo="Excluir usuário"
          nome={`${excluirDe.nome} · ${excluirDe.email}`}
          explicacao="A exclusão é definitiva. Só é possível porque esta pessoa nunca entrou no sistema; quem já entrou deve ser desativado."
          onCancelar={() => setExcluirDe(null)}
          onConfirmar={() => {
            onExcluir(excluirDe.id);
            setExcluirDe(null);
          }}
        />
      )}
      {telasDoNovo && formulario && (
        <TelasLiberadasModal
          usuario={{
            id: "novo",
            nome: formulario.nome.trim() || "Nova pessoa",
            email: formulario.email,
            perfil: formulario.perfil,
            status: "Convidado",
            empresaIds: formulario.empresaIds,
            telas: formulario.telas,
            criadoEm: "",
            atualizadoEm: "",
          }}
          empresas={empresas}
          onFechar={() => setTelasDoNovo(false)}
          onSalvar={(dados) => {
            onCampo({ perfil: dados.perfil, empresaIds: dados.empresaIds, telas: Object.keys(dados.telas).length > 0 ? dados.telas : undefined });
            setTelasDoNovo(false);
          }}
        />
      )}
      {telasDe && (
        <TelasLiberadasModal
          usuario={telasDe}
          empresas={empresas}
          onFechar={() => setTelasDe(null)}
          onSalvar={(dados) => {
            if (onSalvarTelas(telasDe.id, dados)) setTelasDe(null);
          }}
        />
      )}
    </section>
  );
}
