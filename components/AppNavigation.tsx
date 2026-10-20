"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { LogoHorizontal, LogoSymbol } from "@/components/BrandLogo";
import { NavIcon, type NavIconName } from "@/components/NavIcons";
import type { PassoTrilha, PassoVisita } from "@/lib/visitTrail";
import {
  barraInferior,
  itensDaBarra,
  itensDaFolhaMais,
  iniciaisDaEmpresa,
  itensVisiveis,
  menuLateralPC,
  registrarDisponivel,
  trilhoDoTablet,
  type NavContexto,
  type NavItem,
  type NavKey,
  type NavTom,
} from "@/lib/navigation";

export type AcaoUtilitaria = {
  id: "texto" | "sincronizar" | "sobre" | "sair" | "modo";
  rotulo: string;
  onClick: () => void;
  desabilitado?: boolean;
};

export type ContagemEtapa = { texto: string; tom?: "nc" | "pend" };

export type CartaoVisita = {
  rotulo: string;
  empresa: string;
  data: string;
  percentual: number;
  conformes: number;
  naoConformes: number;
  naoSeAplica: number;
  pendentes: number;
};

type Props = {
  contexto: NavContexto;
  ativa: NavKey | null;
  onSelecionar: (key: NavKey) => void;
  /** Quantidade de não conformidades abertas da visita (badge do item). */
  ncsAbertas: number;
  /** Contagens exibidas ao lado das etapas (mesmos dados da Central da visita). */
  contagens: Partial<Record<NavKey, ContagemEtapa>>;
  /** Dados do cartão "Visita em andamento" (só existe dentro de uma visita). */
  visita: CartaoVisita | null;
  maisAberto: boolean;
  onAbrirMais: () => void;
  onFecharMais: () => void;
  utilitarias: AcaoUtilitaria[];
  sincronizacao: { estado: "ok" | "erro" | "pendente"; rotulo: string; onClick: () => void };
  onSair: () => void;
  saindo: boolean;
  /** Pessoa conectada (cartão do rodapé do menu do PC); null no modo local. */
  usuario: { nome: string; perfil: string; iniciais: string } | null;
  versao: string;
  /** Grupo "Visita atual" do menu do PC; null quando não há visita aberta. */
  visitaMenu?: { empresa: string; cor?: string; data: string; passos: PassoTrilha[]; atual: PassoVisita | null; emTelaDaVisita: boolean } | null;
  /** Abre a janela "Meu perfil" (menu do cartão do usuário). */
  onMeuPerfil?: () => void;
  onIrPasso?: (passo: PassoVisita) => void;
};

const ICONE_DO_PASSO: Record<PassoVisita, NavIconName> = {
  central: "central",
  checklist: "checklist",
  evidencias: "evidencias",
  correcoes: "ncs",
  pops: "pops",
  relatorio: "relatorio",
};

const CHAVE_GRUPO_VISITA = "mbp-menu-visita-atual";

function Tile({
  tom,
  icone,
  tamanho,
  ativo = false,
  badge = 0,
}: {
  tom: NavTom;
  icone: NavIconName;
  tamanho: number;
  ativo?: boolean;
  badge?: number;
}) {
  const estilo = {
    width: tamanho,
    height: tamanho,
    background: `linear-gradient(160deg, var(--tile-${tom}-from), var(--tile-${tom}-to))`,
  } as CSSProperties;
  return (
    <span className={`pc-tile${ativo ? " is-active" : ""}`} style={estilo}>
      <NavIcon name={icone} size={Math.round(tamanho * 0.5)} />
      {badge > 0 && (
        <span className="pc-badge" aria-hidden="true">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </span>
  );
}

function rotuloAcessivel(item: NavItem, badge: number) {
  return badge > 0 ? `${item.rotulo}, ${badge} em aberto` : undefined;
}

export default function AppNavigation({
  contexto,
  ativa,
  onSelecionar,
  ncsAbertas,
  contagens,
  visita,
  maisAberto,
  onAbrirMais,
  onFecharMais,
  utilitarias,
  sincronizacao,
  onSair,
  saindo,
  usuario,
  versao,
  visitaMenu = null,
  onIrPasso,
  onMeuPerfil,
}: Props) {
  const [perfilPopAberto, setPerfilPopAberto] = useState(false);
  const perfilRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!perfilPopAberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setPerfilPopAberto(false);
    };
    const aoClicarFora = (evento: MouseEvent) => {
      if (perfilRef.current && !perfilRef.current.contains(evento.target as Node)) setPerfilPopAberto(false);
    };
    window.addEventListener("keydown", aoTeclar);
    window.addEventListener("mousedown", aoClicarFora);
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      window.removeEventListener("mousedown", aoClicarFora);
    };
  }, [perfilPopAberto]);
  // Escolha do usuário (recolher/expandir) guardada na sessão; sem escolha, abre só nas telas da visita.
  const [escolhaGrupoVisita, setEscolhaGrupoVisita] = useState<boolean | null>(null);
  const [adminPopAberto, setAdminPopAberto] = useState(false);
  const adminRef = useRef<HTMLDivElement | null>(null);
  const [grupoAdminAberto, setGrupoAdminAberto] = useState(true);
  useEffect(() => {
    try {
      const salvo = window.sessionStorage.getItem(CHAVE_GRUPO_VISITA);
      if (salvo === "1" || salvo === "0") setEscolhaGrupoVisita(salvo === "1");
    } catch {
      // sessão sem armazenamento: segue o padrão
    }
  }, []);
  useEffect(() => {
    if (!adminPopAberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAdminPopAberto(false);
    };
    const aoClicarFora = (evento: MouseEvent) => {
      if (adminRef.current && !adminRef.current.contains(evento.target as Node)) setAdminPopAberto(false);
    };
    window.addEventListener("keydown", aoTeclar);
    window.addEventListener("mousedown", aoClicarFora);
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      window.removeEventListener("mousedown", aoClicarFora);
    };
  }, [adminPopAberto]);
  const grupoVisitaAberto = escolhaGrupoVisita ?? Boolean(visitaMenu?.emTelaDaVisita);
  const alternarGrupoVisita = () => {
    const proximo = !grupoVisitaAberto;
    setEscolhaGrupoVisita(proximo);
    try {
      window.sessionStorage.setItem(CHAVE_GRUPO_VISITA, proximo ? "1" : "0");
    } catch {
      // sem armazenamento da sessão
    }
  };
  const slots = barraInferior(contexto);
  const itensBarra = itensDaBarra(slots);
  const trilho = trilhoDoTablet(contexto);
  // Equilibrado: Início, Visitas e as etapas da visita (Registrar fica embaixo; o resto vai em "Mais").
  const ORDEM_TRILHO: NavKey[] = ["inicio", "visitas", "central", "checklist", "evidencias", "ncs", "pops", "relatorio"];
  const visiveisDoTrilho = itensVisiveis(contexto);
  const itensDoTrilho = ORDEM_TRILHO.map((chave) => visiveisDoTrilho.find((item) => item.key === chave)).filter((item): item is NavItem => Boolean(item));
  const lateral = menuLateralPC(contexto);
  const temRegistrar = registrarDisponivel(contexto);
  const badgeDe = (item: NavItem) => (item.key === "ncs" ? ncsAbertas : 0);

  // A folha "Mais" serve o celular (o que não coube na barra) e o tablet (o que não coube no trilho).
  const larguraCelular = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
  const naFolha = itensDaFolhaMais(contexto, larguraCelular ? itensBarra : trilho);

  const primeiroBotaoRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (maisAberto) primeiroBotaoRef.current?.focus();
  }, [maisAberto]);

  const botaoItem = (item: NavItem, variante: "capsule" | "rail" | "side", tamanho: number) => {
    const ehAtivo = ativa === item.key;
    const badge = badgeDe(item);
    return (
      <button
        key={item.key}
        type="button"
        className={`pc-item pc-item--${variante}${ehAtivo ? " is-active" : ""}`}
        aria-current={ehAtivo ? "page" : undefined}
        aria-label={rotuloAcessivel(item, badge)}
        onClick={() => onSelecionar(item.key)}
      >
        <Tile tom={item.tom} icone={item.key} tamanho={tamanho} ativo={ehAtivo} badge={badge} />
        <span className="pc-label">{variante === "side" ? item.rotulo : item.curto}</span>
      </button>
    );
  };

  const botaoMais = (variante: "capsule" | "rail") => (
    <button
      type="button"
      className={`pc-item pc-item--${variante}${maisAberto ? " is-active" : ""}`}
      aria-haspopup="dialog"
      aria-expanded={maisAberto}
      onClick={maisAberto ? onFecharMais : onAbrirMais}
    >
      <Tile tom="roxo" icone="mais" tamanho={variante === "capsule" ? 40 : 48} ativo={maisAberto} />
      <span className="pc-label">Mais</span>
    </button>
  );

  const linkLateral = (item: NavItem, sub: boolean) => {
    const ehAtivo = ativa === item.key;
    const contagem = contagens[item.key];
    return (
      <button
        key={item.key}
        type="button"
        className={`pc-link${sub ? " pc-link--sub" : ""}${ehAtivo ? " is-active" : ""}`}
        aria-current={ehAtivo ? "page" : undefined}
        onClick={() => onSelecionar(item.key)}
      >
        <span className="pc-link-icon">
          <NavIcon name={item.key} size={sub ? 16 : 18} strokeWidth={1.9} />
        </span>
        <span className="pc-link-label">{item.rotulo}</span>
        {sub && contagem && <span className="pc-link-count">{contagem.texto}</span>}
      </button>
    );
  };

  const total = visita
    ? Math.max(1, visita.conformes + visita.naoConformes + visita.naoSeAplica + visita.pendentes)
    : 1;

  return (
    <>
      {/* Celular: cápsula flutuante */}
      <nav className="pc-capsule" aria-label="Navegação principal">
        {slots.map((slot) => {
          if (slot.tipo === "mais") return <span key="mais" className="pc-slot">{botaoMais("capsule")}</span>;
          if (slot.item.key === "registrar") {
            const ehAtivo = ativa === "registrar";
            return (
              <span key="registrar" className="pc-slot pc-slot--fab">
                <button
                  type="button"
                  className={`pc-item pc-item--fab${ehAtivo ? " is-active" : ""}`}
                  aria-current={ehAtivo ? "page" : undefined}
                  onClick={() => onSelecionar("registrar")}
                >
                  <Tile tom="laranja" icone="registrar" tamanho={62} ativo={ehAtivo} />
                  <span className="pc-label">Registrar</span>
                </button>
              </span>
            );
          }
          return <span key={slot.item.key} className="pc-slot">{botaoItem(slot.item, "capsule", 40)}</span>;
        })}
      </nav>

      {/* Equilibrado (tablet): trilho de 108 px com ícone e nome */}
      <nav className="pc-rail" aria-label="Navegação principal">
        <span className="pc-rail-logo" aria-hidden="true">
          <LogoSymbol size={38} />
        </span>
        <div className="pc-rail-list">
          {itensDoTrilho.map((item) => {
            const ehAtivo = ativa === item.key || (item.key === "ncs" && (ativa === "plano" || ativa === "acompanhamento"));
            const contador = item.key === "ncs" ? ncsAbertas : 0;
            return (
              <button
                key={item.key}
                type="button"
                className={`pc-rail-item${ehAtivo ? " is-active" : ""}`}
                aria-current={ehAtivo ? "page" : undefined}
                aria-label={rotuloAcessivel(item, contador)}
                onClick={() => onSelecionar(item.key)}
              >
                <span className="pc-rail-icon">
                  <NavIcon name={item.key} size={22} strokeWidth={1.9} />
                  {contador > 0 && <span className="pc-rail-count">{contador > 99 ? "99+" : contador}</span>}
                </span>
                <span className="pc-rail-label">{item.key === "ncs" ? "Correções" : item.key === "pops" ? "POPs" : item.curto}</span>
              </button>
            );
          })}
        </div>
        {temRegistrar && (
          <button type="button" className="pc-rail-register" onClick={() => onSelecionar("registrar")}>
            <span className="pc-rail-register-orb">
              <NavIcon name="registrar" size={24} strokeWidth={2.1} />
            </span>
            <span className="pc-rail-label">Registrar</span>
          </button>
        )}
        <button type="button" className="pc-rail-item" aria-haspopup="dialog" aria-expanded={maisAberto} onClick={maisAberto ? onFecharMais : onAbrirMais}>
          <span className="pc-rail-icon">
            <NavIcon name="mais" size={22} strokeWidth={1.9} />
          </span>
          <span className="pc-rail-label">Mais</span>
        </button>
        {usuario && (
          <button type="button" className="pc-rail-avatar" title={`${usuario.nome} · ${sincronizacao.rotulo}`} aria-label={`${usuario.nome}. ${sincronizacao.rotulo}`} onClick={sincronizacao.onClick}>
            {usuario.iniciais}
            <span className={`pc-avatar-dot is-${sincronizacao.estado}`} aria-hidden="true" />
          </button>
        )}
      </nav>

      {/* PC: menu lateral azul */}
      <aside className={`pc-side${visitaMenu ? " pc-side--visita" : ""}`} aria-label="Menu lateral">
        <div className="pc-side-brand">
          <LogoHorizontal size={38} showSubtitle={false} textClassName="text-xl" />
        </div>

        {temRegistrar && (
          <button type="button" className="pc-register-line" onClick={() => onSelecionar("registrar")}>
            <span className="pc-register-orb">
              <span className="pc-register-mais" aria-hidden="true">+</span>
            </span>
            <span className="pc-register-label">Registrar agora</span>
          </button>
        )}

        <nav className="pc-side-nav" aria-label="Navegação principal">
          {lateral.topo.map((item) => linkLateral(item, false))}

          {visitaMenu && (
            <section className="pc-vcard" aria-label="Visita atual">
              <div className="pc-vcard-rotulo">VISITA ATUAL</div>
              <div className="pc-vcard-corpo">
                <button
                  type="button"
                  className={`pc-vcard-head${visitaMenu.atual === "central" ? " is-active" : ""}`}
                  aria-label={`Central da visita de ${visitaMenu.empresa}`}
                  onClick={() => onIrPasso?.("central")}
                >
                  <span className="pc-vcard-mono" style={{ "--emp-cor": visitaMenu.cor || "#4A5D73" } as CSSProperties} aria-hidden="true">
                    {iniciaisDaEmpresa(visitaMenu.empresa, usuario?.iniciais || "?")}
                  </span>
                  <span className="pc-vgroup-text">
                    <span className="pc-vcard-company">{visitaMenu.empresa}</span>
                    <span className="pc-vcard-sub">{visitaMenu.data}</span>
                  </span>
                </button>
                <div className="pc-vcard-steps">
                  {visitaMenu.passos
                    .filter((passo) => passo.chave !== "central")
                    .map((passo) => {
                      const ehAtivo = visitaMenu.atual === passo.chave;
                      return (
                        <button
                          key={passo.chave}
                          type="button"
                          className={`pc-step${ehAtivo ? " is-active" : ""}`}
                          aria-current={ehAtivo ? "page" : undefined}
                          onClick={() => onIrPasso?.(passo.chave)}
                        >
                          <span className="pc-step-label">{passo.chave === "pops" ? "POPs desta visita" : passo.rotulo}</span>
                          {passo.contador && <span className={`pc-step-count${passo.chave === "correcoes" ? " is-badge" : ""}`}>{passo.contador}</span>}
                        </button>
                      );
                    })}
                </div>
              </div>
            </section>
          )}
        </nav>

        <div className="pc-side-foot">
          {(lateral.apoio.length > 0 || lateral.admin.length > 0) && (
            <div className="pc-mini-row">
              {lateral.apoio.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`pc-mini${ativa === item.key ? " is-active" : ""}`}
                  aria-current={ativa === item.key ? "page" : undefined}
                  onClick={() => onSelecionar(item.key)}
                >
                  <NavIcon name={item.key} size={16} strokeWidth={1.9} />
                  Ajuda e guias
                </button>
              ))}
              {lateral.admin.length > 0 && (
                <div className="pc-mini-wrap" ref={adminRef}>
                  <button
                    type="button"
                    className={`pc-mini${lateral.admin.some((item) => item.key === ativa) ? " is-active" : ""}`}
                    aria-haspopup="menu"
                    aria-expanded={adminPopAberto}
                    onClick={() => setAdminPopAberto((aberto) => !aberto)}
                  >
                    <NavIcon name="escudo" size={16} strokeWidth={1.9} />
                    Administração
                  </button>
                  {adminPopAberto && (
                    <div className="pc-admin-pop" role="menu">
                      {lateral.admin.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          role="menuitem"
                          className="pc-admin-item"
                          onClick={() => {
                            setAdminPopAberto(false);
                            onSelecionar(item.key);
                          }}
                        >
                          {item.rotulo}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {usuario && (
            <div className="pc-user-wrap" ref={perfilRef}>
              {perfilPopAberto && (
                <div className="pc-user-pop" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="pc-user-pop-item"
                    onClick={() => {
                      setPerfilPopAberto(false);
                      onMeuPerfil?.();
                    }}
                  >
                    <NavIcon name="acessos" size={16} strokeWidth={1.9} />
                    Meu perfil
                  </button>
                  <button type="button" role="menuitem" className="pc-user-pop-item is-sair" onClick={onSair} disabled={saindo}>
                    <NavIcon name="sair" size={16} strokeWidth={2} />
                    Sair
                  </button>
                </div>
              )}
              <button type="button" className="pc-user-card" aria-haspopup="menu" aria-expanded={perfilPopAberto} onClick={() => setPerfilPopAberto((aberto) => !aberto)}>
                <span className="pc-user-avatar">
                  {usuario.iniciais}
                  <span className={`pc-avatar-dot is-${sincronizacao.estado}`} title={sincronizacao.rotulo} aria-hidden="true" />
                </span>
                <span className="pc-user-text">
                  <span className="pc-user-name">{usuario.nome}</span>
                  <span className="pc-user-role">{usuario.perfil}</span>
                </span>
                <span className="pc-chev" aria-hidden="true">{perfilPopAberto ? "⌄" : "⌃"}</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Folha "Mais" (celular e tablet) */}
      {maisAberto && (
        <div className="pc-sheet-layer" role="presentation">
          <button type="button" className="pc-sheet-backdrop" aria-label="Fechar" onClick={onFecharMais} />
          <section className="pc-sheet" role="dialog" aria-modal="true" aria-label="Mais opções">
            <div className="pc-sheet-handle" aria-hidden="true" />
            <div className="pc-sheet-grid">
              {naFolha.map((item, indice) => {
                const badge = badgeDe(item);
                return (
                  <button
                    key={item.key}
                    ref={indice === 0 ? primeiroBotaoRef : undefined}
                    type="button"
                    className="pc-item pc-item--sheet"
                    aria-label={rotuloAcessivel(item, badge)}
                    onClick={() => onSelecionar(item.key)}
                  >
                    <Tile tom={item.tom} icone={item.key} tamanho={56} badge={badge} />
                    <span className="pc-label">{item.curto}</span>
                  </button>
                );
              })}
              {utilitarias.map((acao, indice) => (
                <button
                  key={acao.id}
                  ref={naFolha.length === 0 && indice === 0 ? primeiroBotaoRef : undefined}
                  type="button"
                  className="pc-item pc-item--sheet"
                  disabled={acao.desabilitado}
                  onClick={acao.onClick}
                >
                  <Tile tom="ardosia" icone={acao.id} tamanho={56} />
                  <span className="pc-label">{acao.rotulo}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
