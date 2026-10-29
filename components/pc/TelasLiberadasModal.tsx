"use client";
import Select from "@/components/Select";
import { nomeDeExibicaoDaEmpresa } from "@/lib/nomeEmpresa";

import { useEffect, useMemo, useState } from "react";
import type { Empresa, PerfilUsuario, UsuarioSistema } from "@/types";
import {
  PADRAO_DO_PERFIL,
  POR_TELA,
  TELAS,
  ajustesDiferentes,
  rotuloDoNivel,
  telasEfetivas,
  type GrupoTela,
  type NivelTela,
  type TelaKey,
  type TelasDoUsuario,
} from "@/lib/screenAccess";

const PERFIS: PerfilUsuario[] = ["Administrador", "Consultor/RT", "Cliente Gestor", "Gerente"];

const GRUPOS: { id: GrupoTela; titulo: string; cor: string }[] = [
  { id: "visita", titulo: "Visita atual", cor: "#2A4D7C" },
  { id: "cadastros", titulo: "Cadastros e acervo", cor: "#168080" },
  { id: "geral", titulo: "Geral", cor: "#0D9488" },
];

// Ordem e cores do painel "Menu que essa pessoa vê".
const MENU_PREVIA: { tela: TelaKey; cor: string }[] = [
  { tela: "inicio", cor: "#2A4D7C" },
  { tela: "visitas", cor: "#526477" },
  { tela: "central", cor: "#0EA5E9" },
  { tela: "checklist", cor: "#21805B" },
  { tela: "evidencias", cor: "#0EA5E9" },
  { tela: "correcoes", cor: "#C83F45" },
  { tela: "popsVisita", cor: "#E0A800" },
  { tela: "relatorio", cor: "#475569" },
  { tela: "pops", cor: "#168080" },
  { tela: "empresas", cor: "#0D9488" },
  { tela: "ambientes", cor: "#14B8A6" },
  { tela: "guiaRapido", cor: "#0D9488" },
  { tela: "manualCompleto", cor: "#0D9488" },
];

type Props = {
  usuario: UsuarioSistema;
  empresas: Empresa[];
  onSalvar: (dados: { perfil: PerfilUsuario; empresaIds: string[]; telas: TelasDoUsuario }) => void;
  onFechar: () => void;
};

function iniciais(nome: string) {
  return nome.split(" ").filter(Boolean).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase();
}

function nomeDaEmpresa(empresa: Empresa) {
  return nomeDeExibicaoDaEmpresa(empresa);
}

export default function TelasLiberadasModal({ usuario, empresas, onSalvar, onFechar }: Props) {
  const [perfil, setPerfil] = useState<PerfilUsuario>(usuario.perfil);
  const [empresaIds, setEmpresaIds] = useState<string[]>(usuario.empresaIds);
  const [niveis, setNiveis] = useState<Record<TelaKey, NivelTela>>(() => telasEfetivas(usuario));
  const [adicionando, setAdicionando] = useState(false);
  const padrao = PADRAO_DO_PERFIL[perfil];

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  const diferentes = useMemo(
    () => TELAS.filter((tela) => !(tela.somenteAdmin && perfil !== "Administrador") && niveis[tela.key] !== padrao[tela.key]).length,
    [niveis, padrao, perfil]
  );
  const semEmpresa = perfil !== "Administrador" && empresaIds.length === 0;
  const empresasDisponiveis = empresas.filter((empresa) => !empresaIds.includes(empresa.id));

  function trocarPerfil(novo: PerfilUsuario) {
    setPerfil(novo);
    setNiveis({ ...PADRAO_DO_PERFIL[novo] });
  }

  function ligar(tela: TelaKey, ligada: boolean) {
    setNiveis((atual) => {
      if (!ligada) return { ...atual, [tela]: "oculta" };
      const definicao = POR_TELA.get(tela)!;
      const doPadrao = padrao[tela];
      return { ...atual, [tela]: doPadrao !== "oculta" ? doPadrao : definicao.niveis[0] };
    });
  }

  const ligadas = TELAS.filter((tela) => niveis[tela.key] !== "oculta" && tela.key !== "administracao");
  const registrarAparece = niveis.evidencias === "editar";

  return (
    <div className="pc-modal-layer" role="presentation">
      <div className="pc-modal-backdrop" onClick={onFechar} />
      <section className="pc-modal pc-telas" role="dialog" aria-modal="true" aria-label="Telas liberadas">
        <header className="pc-telas-head">
          <span className="ui-avatar ui-avatar--round pc-avatar-neutro" aria-hidden="true">
            {iniciais(usuario.nome)}
          </span>
          <div className="pc-telas-id">
            <h2 className="pc-modal-title">Telas liberadas</h2>
            <p className="ui-row-sub">
              {usuario.nome} · {usuario.email}
            </p>
          </div>
          <label className="pc-telas-field">
            <span className="ui-eyebrow">Perfil</span>
            <Select className="ui-input" value={perfil} onChange={(evento) => trocarPerfil(evento.target.value as PerfilUsuario)}>
              {PERFIS.map((opcao) => (
                <option key={opcao} value={opcao}>
                  {opcao}
                </option>
              ))}
            </Select>
          </label>
          <div className="pc-telas-field pc-telas-empresas">
            <span className="ui-eyebrow">Empresa</span>
            <div className="pc-chips">
              {perfil === "Administrador" ? (
                <span className="pc-chip">Todas as empresas</span>
              ) : (
                empresaIds.map((id) => {
                  const empresa = empresas.find((item) => item.id === id);
                  return (
                    <span key={id} className="pc-chip">
                      {empresa ? nomeDaEmpresa(empresa) : id}
                      <button type="button" aria-label="Remover empresa" onClick={() => setEmpresaIds((atual) => atual.filter((item) => item !== id))}>
                        ×
                      </button>
                    </span>
                  );
                })
              )}
              {perfil !== "Administrador" &&
                (adicionando ? (
                  <Select
                    className="ui-input pc-chip-select"
                    value=""
                    autoFocus
                    onChange={(evento) => {
                      if (evento.target.value) setEmpresaIds((atual) => [...atual, evento.target.value]);
                      setAdicionando(false);
                    }}
                    onBlur={() => setAdicionando(false)}
                  >
                    <option value="">Escolha...</option>
                    {empresasDisponiveis.map((empresa) => (
                      <option key={empresa.id} value={empresa.id}>
                        {nomeDaEmpresa(empresa)}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <button type="button" className="pc-chip pc-chip--add" disabled={empresasDisponiveis.length === 0} onClick={() => setAdicionando(true)}>
                    + adicionar
                  </button>
                ))}
            </div>
            {semEmpresa && <span className="ui-field-error">Escolha pelo menos uma empresa.</span>}
          </div>
          <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={onFechar} aria-label="Fechar">
            ×
          </button>
        </header>

        <div className="pc-telas-banner" role="status">
          <span>
            Padrão do perfil {perfil} aplicado
            {diferentes > 0 ? `, com ${diferentes} ${diferentes === 1 ? "tela diferente" : "telas diferentes"} do padrão.` : "."}
          </span>
          <button type="button" className="pc-link-btn" disabled={diferentes === 0} onClick={() => setNiveis({ ...PADRAO_DO_PERFIL[perfil] })}>
            Voltar ao padrão do perfil
          </button>
        </div>

        <div className="pc-telas-cols">
          {GRUPOS.map((grupo) => (
            <div key={grupo.id} className="pc-telas-col">
              <h3 className="pc-telas-col-title">
                <i style={{ background: grupo.cor }} aria-hidden="true" /> {grupo.titulo}
              </h3>
              <div className="pc-telas-list scroll-fino">
                {TELAS.filter((tela) => tela.grupo === grupo.id).map((tela) => {
                  const travada = Boolean(tela.somenteAdmin) && perfil !== "Administrador";
                  const nivel = niveis[tela.key];
                  const ligada = nivel !== "oculta";
                  const mudou = !travada && nivel !== padrao[tela.key];
                  return (
                    <div key={tela.key} className="pc-telas-row">
                      <div className="pc-telas-row-top">
                        <span className="pc-telas-name">{tela.rotulo}</span>
                        {tela.somenteAdmin ? (
                          <span className="pc-telas-lock">
                            <span className="pc-pill-mini">Só Administrador</span>
                            <span aria-label="Bloqueado" role="img">🔒</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            role="switch"
                            aria-checked={ligada}
                            aria-label={`${tela.rotulo}: ${ligada ? "liberada" : "bloqueada"}`}
                            className={`pc-switch${ligada ? " is-on" : ""}`}
                            onClick={() => ligar(tela.key, !ligada)}
                          >
                            <i />
                          </button>
                        )}
                      </div>
                      {!tela.somenteAdmin && !ligada && <span className="pc-pill-mini">Bloqueada</span>}
                      {!tela.somenteAdmin && ligada && tela.niveis.length > 1 && (
                        <div className="pc-telas-niveis" role="group" aria-label={`Nível de ${tela.rotulo}`}>
                          {tela.niveis.map((opcao) => (
                            <button
                              key={opcao}
                              type="button"
                              aria-pressed={nivel === opcao}
                              className={`pc-nivel${nivel === opcao ? " is-on" : ""}`}
                              onClick={() => setNiveis((atual) => ({ ...atual, [tela.key]: opcao }))}
                            >
                              {rotuloDoNivel(opcao)}
                            </button>
                          ))}
                        </div>
                      )}
                      {ligada && tela.nota && nivel === "marcar" && <span className="ui-row-sub">{tela.nota}</span>}
                      {mudou && <span className="pc-pill-mini pc-pill-mini--diff">Diferente do padrão</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <aside className="pc-telas-preview" aria-label="Menu que essa pessoa vê">
            <h3>Menu que essa pessoa vê</h3>
            <ul>
              {MENU_PREVIA.filter((item) => ligadas.some((tela) => tela.key === item.tela)).map((item) => (
                <li key={item.tela}>
                  <i style={{ background: item.cor }} aria-hidden="true" />
                  {POR_TELA.get(item.tela)!.rotulo}
                </li>
              ))}
            </ul>
            {registrarAparece && <p>Registrar agora aparece porque Evidências está em Editar.</p>}
          </aside>
        </div>

        <footer className="pc-telas-foot">
          <p>Vale no servidor: mesmo digitando o endereço de uma tela bloqueada, o acesso é negado. Cada mudança fica no Histórico de acessos.</p>
          <div className="ui-footer-actions">
            <button type="button" className="ui-btn ui-btn--secondary" onClick={onFechar}>
              Cancelar
            </button>
            <button
              type="button"
              className="ui-btn ui-btn--save"
              disabled={semEmpresa}
              onClick={() => onSalvar({ perfil, empresaIds: perfil === "Administrador" ? [] : empresaIds, telas: ajustesDiferentes(perfil, niveis) })}
            >
              Salvar
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
