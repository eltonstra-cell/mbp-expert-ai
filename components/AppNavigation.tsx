"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { LogoHorizontal } from "@/components/BrandLogo";
import { NavIcon, type NavIconName } from "@/components/NavIcons";
import type { PassoTrilha, PassoVisita } from "@/lib/visitTrail";
import {
  barraInferior,
  itensDaBarra,
  itensDaFolhaMais,
  menuLateralPC,
  registrarDisponivel,
  trilhoDoTablet,
  type NavContexto,
  type NavItem,
  type NavKey,
  type NavTom,
} from "@/lib/navigation";

export type AcaoUtilitaria = {
  id: "texto" | "sincronizar" | "sobre" | "sair";
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
  visitaMenu?: { empresa: string; passos: PassoTrilha[]; atual: PassoVisita | null; emTelaDaVisita: boolean } | null;
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
}: Props) {
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

      {/* Tablet: trilho de 104px */}
      <nav className="pc-rail" aria-label="Navegação principal">
        {temRegistrar && (
          <button type="button" className="pc-item pc-item--rail pc-item--rail-fab" onClick={() => onSelecionar("registrar")}>
            <Tile tom="laranja" icone="registrar" tamanho={62} />
            <span className="pc-label">Registrar</span>
          </button>
        )}
        <div className="pc-rail-list">{trilho.map((item) => botaoItem(item, "rail", 48))}</div>
        {botaoMais("rail")}
        <button
          type="button"
          className={`pc-rail-sync is-${sincronizacao.estado}`}
          aria-label={sincronizacao.rotulo}
          onClick={sincronizacao.onClick}
        >
          <span className="pc-sync-dot" aria-hidden="true" />
          Sinc.
        </button>
      </nav>

      {/* PC: menu lateral azul */}
      <aside className={`pc-side${visitaMenu ? " pc-side--visita" : ""}`} aria-label="Menu lateral">
        <div className="pc-side-brand">
          <LogoHorizontal size={38} showSubtitle={!visitaMenu} textClassName="text-xl" />
        </div>

        {temRegistrar && (
          <button type="button" className="pc-register-line" onClick={() => onSelecionar("registrar")}>
            <span className="pc-register-orb">
              <NavIcon name="registrar" size={22} strokeWidth={2.2} />
            </span>
            <span className="pc-register-label">Registrar agora</span>
          </button>
        )}

        <nav className="pc-side-nav" aria-label="Navegação principal">
          {lateral.topo.map((item) => linkLateral(item, false))}

          {visitaMenu && (
            <section className="pc-vcard" aria-label="Visita atual">
              <button type="button" className="pc-vcard-head" aria-expanded={grupoVisitaAberto} onClick={alternarGrupoVisita}>
                <span className="pc-vcard-tile">
                  <NavIcon name="visitas" size={20} strokeWidth={1.9} />
                </span>
                <span className="pc-vgroup-text">
                  <span className="pc-vcard-title">Visita atual</span>
                  <span className="pc-vcard-company">{visitaMenu.empresa}</span>
                </span>
                <span className="pc-chev" aria-hidden="true">{grupoVisitaAberto ? "⌃" : "⌄"}</span>
              </button>
              {grupoVisitaAberto && (
                <div className="pc-vcard-steps">
                  {visitaMenu.passos.map((passo) => {
                    const ehAtivo = visitaMenu.atual === passo.chave;
                    return (
                      <button
                        key={passo.chave}
                        type="button"
                        className={`pc-link pc-link--step${ehAtivo ? " is-active" : ""}`}
                        aria-current={ehAtivo ? "page" : undefined}
                        onClick={() => onIrPasso?.(passo.chave)}
                      >
                        <span className="pc-link-icon">
                          <NavIcon name={ICONE_DO_PASSO[passo.chave]} size={15} strokeWidth={1.9} />
                        </span>
                        <span className="pc-link-label">{passo.rotulo}</span>
                        {passo.contador && <span className="pc-link-count">{passo.contador}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {!visitaMenu && (lateral.apoio.length > 0 || lateral.admin.length > 0) && <div className="pc-side-sep" role="separator" />}
          {!visitaMenu && lateral.apoio.map((item) => linkLateral(item, false))}
          {!visitaMenu && lateral.admin.length > 0 && (
            <div className="pc-agroup">
              <button
                type="button"
                className="pc-agroup-head"
                aria-expanded={grupoAdminAberto}
                onClick={() => setGrupoAdminAberto((aberto) => !aberto)}
              >
                <span className="pc-link-label">Administração</span>
                <span className="pc-chev" aria-hidden="true">{grupoAdminAberto ? "⌄" : "›"}</span>
              </button>
              {grupoAdminAberto && <div className="pc-vsteps">{lateral.admin.map((item) => linkLateral(item, true))}</div>}
            </div>
          )}
        </nav>

        <div className="pc-side-foot">
          {visitaMenu && (lateral.apoio.length > 0 || lateral.admin.length > 0) && (
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
                  Ajuda
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
                    <NavIcon name="acessos" size={16} strokeWidth={1.9} />
                    Admin
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
          {!visitaMenu && (
            <button type="button" className={`pc-sync is-${sincronizacao.estado}`} onClick={sincronizacao.onClick}>
              <span className="pc-sync-dot" aria-hidden="true" />
              {sincronizacao.rotulo}
            </button>
          )}
          {usuario && (
            <div className="pc-user-card">
              <div className="pc-user-line">
                <span className="pc-user-avatar">
                  {usuario.iniciais}
                  {visitaMenu && (
                    <button
                      type="button"
                      className={`pc-avatar-dot is-${sincronizacao.estado}`}
                      title={sincronizacao.rotulo}
                      aria-label={sincronizacao.rotulo}
                      onClick={sincronizacao.onClick}
                    />
                  )}
                </span>
                <span className="pc-user-text">
                  <span className="pc-user-role">{usuario.perfil}</span>
                  <span className="pc-user-name">{usuario.nome}</span>
                </span>
              </div>
              <button type="button" className="pc-logout" onClick={onSair} disabled={saindo}>
                <NavIcon name="sair" size={16} strokeWidth={2} />
                Sair
              </button>
            </div>
          )}
          {versao && !visitaMenu && <div className="pc-version">v{versao}</div>}
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
