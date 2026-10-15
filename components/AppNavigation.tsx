"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { LogoHorizontal } from "@/components/BrandLogo";
import { NavIcon, type NavIconName } from "@/components/NavIcons";
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
};

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
}: Props) {
  const [grupoVisitaAberto, setGrupoVisitaAberto] = useState(true);
  const [grupoAdminAberto, setGrupoAdminAberto] = useState(true);
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
      <aside className="pc-side" aria-label="Menu lateral">
        <div className="pc-side-brand">
          <LogoHorizontal size={38} showSubtitle textClassName="text-xl" />
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

          {(lateral.apoio.length > 0 || lateral.admin.length > 0) && <div className="pc-side-sep" role="separator" />}
          {lateral.apoio.map((item) => linkLateral(item, false))}
          {lateral.admin.length > 0 && (
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
          <button type="button" className={`pc-sync is-${sincronizacao.estado}`} onClick={sincronizacao.onClick}>
            <span className="pc-sync-dot" aria-hidden="true" />
            {sincronizacao.rotulo}
          </button>
          {usuario && (
            <div className="pc-user-card">
              <div className="pc-user-line">
                <span className="pc-user-avatar" aria-hidden="true">{usuario.iniciais}</span>
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
          {versao && <div className="pc-version">v{versao}</div>}
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
