"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { LogoSymbol } from "@/components/BrandLogo";
import { NavIcon, type NavIconName } from "@/components/NavIcons";
import type { PassoTrilha, PassoVisita } from "@/lib/visitTrail";
import { itensVisiveis, registrarDisponivel, type NavContexto, type NavItem, type NavKey } from "@/lib/navigation";

type Props = {
  contexto: NavContexto;
  ativa: NavKey | null;
  onSelecionar: (key: NavKey) => void;
  /** Correções abertas da visita (modo visita). */
  ncsAbertas: number;
  /** Correções vencidas da empresa ativa (modo geral). */
  vencidas: number;
  sincronizacao: { estado: "ok" | "erro" | "pendente" | "sem-sinal"; rotulo: string; onClick: () => void };
  onSair: () => void;
  saindo: boolean;
  /** Pessoa conectada (avatar do rodapé do trilho); null no modo local. */
  usuario: { nome: string; perfil: string; iniciais: string } | null;
  /** Modo visita: visita aberta e o usuário dentro dela; null no modo geral. */
  visitaMenu?: { numero?: number; dataCurta: string; percentual: number; passos: PassoTrilha[]; atual: PassoVisita | null } | null;
  onIrPasso?: (passo: PassoVisita) => void;
  /** "Finalizar" abre a revisão que já existe (sem mudar o fluxo de emissão). */
  onFinalizar?: () => void;
  podeFinalizar?: boolean;
  /** "Sair" da visita: volta ao modo geral; a visita continua em andamento. */
  onSairDaVisita?: () => void;
  /** Abre a janela "Meu perfil" (menu do avatar). */
  onMeuPerfil?: () => void;
};

const ICONE_DO_PASSO: Record<PassoVisita, NavIconName> = {
  central: "central",
  checklist: "checklist",
  evidencias: "evidencias",
  correcoes: "ncs",
  pops: "pops",
  relatorio: "relatorio",
};

const PRINCIPAIS: NavKey[] = ["inicio", "visitas", "ncs", "pops", "relatorios"];
const EXTRAS: NavKey[] = ["empresas", "cadastros", "ajuda", "acessos"];
const ROTULO_DO_ITEM: Partial<Record<NavKey, string>> = { ncs: "Correções", pops: "POPs", relatorios: "Relatórios", ajuda: "Ajuda e guias", acessos: "Administração" };
const ROTULO_DO_PASSO: Record<PassoVisita, string> = { central: "Visita", checklist: "Checklist", evidencias: "Evidências", correcoes: "Correções", pops: "POPs", relatorio: "Relatório" };
const CIRCUNFERENCIA = 2 * Math.PI * 15;

/** Fecha com Esc e ao tocar fora (o "Mais" e o menu do avatar). */
function useFechar(aberto: boolean, fechar: () => void, dentro: Array<{ current: HTMLElement | null }>) {
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") fechar();
    };
    const aoClicar = (evento: MouseEvent) => {
      if (dentro.some((ref) => ref.current?.contains(evento.target as Node))) return;
      fechar();
    };
    window.addEventListener("keydown", aoTeclar);
    window.addEventListener("mousedown", aoClicar);
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      window.removeEventListener("mousedown", aoClicar);
    };
  }, [aberto, fechar, dentro]);
}

function Ladrilho({ ativo, badge, children }: { ativo: boolean; badge?: number; children: React.ReactNode }) {
  return (
    <span className={`tr-ladrilho${ativo ? " is-ativo" : ""}`}>
      {children}
      {!!badge && badge > 0 && (
        <span className="tr-badge" aria-hidden="true">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </span>
  );
}

export default function AppNavigation({
  contexto,
  ativa,
  onSelecionar,
  ncsAbertas,
  vencidas,
  sincronizacao,
  onSair,
  saindo,
  usuario,
  visitaMenu = null,
  onIrPasso,
  onFinalizar,
  podeFinalizar = false,
  onSairDaVisita,
  onMeuPerfil,
}: Props) {
  const [maisAberto, setMaisAberto] = useState(false);
  const [perfilAberto, setPerfilAberto] = useState(false);
  const [topoDoQuadro, setTopoDoQuadro] = useState<number | undefined>(undefined);
  const maisBotaoRef = useRef<HTMLButtonElement | null>(null);
  const maisQuadroRef = useRef<HTMLDivElement | null>(null);
  const perfilBotaoRef = useRef<HTMLButtonElement | null>(null);
  const perfilQuadroRef = useRef<HTMLDivElement | null>(null);
  const fecharMais = () => setMaisAberto(false);
  const fecharPerfil = () => setPerfilAberto(false);
  useFechar(maisAberto, fecharMais, [maisBotaoRef, maisQuadroRef]);
  useFechar(perfilAberto, fecharPerfil, [perfilBotaoRef, perfilQuadroRef]);

  const visiveis = itensVisiveis(contexto);
  const pegar = (chaves: NavKey[]) => chaves.map((chave) => visiveis.find((item) => item.key === chave)).filter((item): item is NavItem => Boolean(item));
  const principais = pegar(PRINCIPAIS);
  const extras = pegar(EXTRAS);
  const temRegistrar = registrarDisponivel(contexto);
  const maisAtivo = extras.some((item) => item.key === ativa);

  const alternarMais = () => {
    setPerfilAberto(false);
    // Trilho de lado: o quadro abre ao lado do botão. Barra de baixo (janela estreita): o CSS posiciona acima da barra.
    if (!maisAberto) setTopoDoQuadro(window.matchMedia("(max-width: 767px)").matches ? undefined : Math.max(8, Math.round((maisBotaoRef.current?.getBoundingClientRect().top ?? 0) - 40)));
    setMaisAberto((aberto) => !aberto);
  };
  const alternarPerfil = () => {
    setMaisAberto(false);
    setPerfilAberto((aberto) => !aberto);
  };

  const botaoGeral = (item: NavItem) => {
    const ehAtivo = ativa === item.key;
    const badge = item.key === "ncs" ? vencidas : 0;
    const rotulo = ROTULO_DO_ITEM[item.key] ?? item.rotulo;
    return (
      <button
        key={item.key}
        type="button"
        data-chave={item.key}
        className={`tr-item${ehAtivo ? " is-atual" : ""}`}
        aria-current={ehAtivo ? "page" : undefined}
        aria-label={badge > 0 ? `${rotulo}, ${badge} ${badge === 1 ? "vencida" : "vencidas"}` : undefined}
        onClick={() => {
          setMaisAberto(false);
          onSelecionar(item.key);
        }}
      >
        <Ladrilho ativo={ehAtivo} badge={badge}>
          <NavIcon name={item.key} size={24} strokeWidth={1.7} />
        </Ladrilho>
        <span className="tr-rotulo">{rotulo}</span>
      </button>
    );
  };

  const passosDaVisita = visitaMenu ? visitaMenu.passos.filter((passo) => passo.chave !== "central") : [];
  const dashoffset = visitaMenu ? CIRCUNFERENCIA * (1 - Math.min(100, Math.max(0, visitaMenu.percentual)) / 100) : CIRCUNFERENCIA;

  return (
    <>
      <nav className="tr" data-menu={visitaMenu ? "visita" : "geral"} aria-label={visitaMenu ? "Visita aberta" : "Navegação principal"}>
        <span className="tr-logo" aria-hidden="true">
          <LogoSymbol size={36} />
        </span>

        {temRegistrar && (
          <button type="button" className="tr-registrar" onClick={() => onSelecionar("registrar")}>
            <span className="tr-registrar-disco">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span className="tr-rotulo">Registrar</span>
          </button>
        )}

        {visitaMenu ? (
          <>
            <button
              type="button"
              className={`tr-visita${visitaMenu.atual === "central" ? " is-atual" : ""}`}
              aria-label={`Resumo da visita ${visitaMenu.numero ?? ""}`.trim()}
              onClick={() => onIrPasso?.("central")}
            >
              <svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true">
                <circle cx="19" cy="19" r="15" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="4" />
                <circle cx="19" cy="19" r="15" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeDasharray={CIRCUNFERENCIA} strokeDashoffset={dashoffset} transform="rotate(-90 19 19)" />
              </svg>
              <span>Visita {visitaMenu.numero ?? ""}</span>
              <span className="tr-visita-data">{visitaMenu.dataCurta}</span>
            </button>
            <div className="tr-lista">
              {passosDaVisita.map((passo) => {
                const ehAtivo = visitaMenu.atual === passo.chave;
                const badge = passo.chave === "correcoes" ? ncsAbertas : 0;
                const rotulo = ROTULO_DO_PASSO[passo.chave];
                return (
                  <button
                    key={passo.chave}
                    type="button"
                    data-chave={passo.chave}
                    className={`tr-item${ehAtivo ? " is-atual" : ""}`}
                    aria-current={ehAtivo ? "page" : undefined}
                    aria-label={badge > 0 ? `${rotulo}, ${badge} em aberto` : undefined}
                    onClick={() => onIrPasso?.(passo.chave)}
                  >
                    <Ladrilho ativo={ehAtivo} badge={badge}>
                      <NavIcon name={ICONE_DO_PASSO[passo.chave]} size={24} strokeWidth={1.7} />
                    </Ladrilho>
                    <span className="tr-rotulo">{rotulo}</span>
                  </button>
                );
              })}
            </div>
            <div className="tr-fim">
              {podeFinalizar && (
                <button type="button" className="tr-item tr-item--finalizar" onClick={onFinalizar}>
                  <span className="tr-ladrilho tr-ladrilho--verde">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </span>
                  <span className="tr-rotulo">Finalizar</span>
                </button>
              )}
              <button type="button" className="tr-item" onClick={onSairDaVisita}>
                <Ladrilho ativo={false}>
                  <NavIcon name="sair" size={24} strokeWidth={1.7} />
                </Ladrilho>
                <span className="tr-rotulo">Sair</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="tr-lista">
              {principais.map((item) => botaoGeral(item))}
              {extras.length > 0 && (
                <button
                  ref={maisBotaoRef}
                  type="button"
                  className={`tr-item${maisAberto || maisAtivo ? " is-mais" : ""}`}
                  aria-haspopup="menu"
                  aria-expanded={maisAberto}
                  onClick={alternarMais}
                >
                  <Ladrilho ativo={false}>
                    <NavIcon name="mais" size={24} strokeWidth={1.7} />
                  </Ladrilho>
                  <span className="tr-rotulo">Mais</span>
                </button>
              )}
            </div>
            <div className="tr-fim" />
          </>
        )}

        {usuario && (
          <button
            ref={perfilBotaoRef}
            type="button"
            className="tr-avatar"
            aria-haspopup="menu"
            aria-expanded={perfilAberto}
            aria-label={`${usuario.nome}. ${sincronizacao.rotulo}`}
            title={`${usuario.nome} · ${usuario.perfil} · ${sincronizacao.rotulo}`}
            onClick={alternarPerfil}
          >
            {usuario.iniciais}
            <span className={`pc-avatar-dot is-${sincronizacao.estado}`} aria-hidden="true" />
          </button>
        )}
      </nav>

      {maisAberto && (
        <div ref={maisQuadroRef} className="tr-quadro" role="menu" style={{ top: topoDoQuadro } as CSSProperties}>
          {extras.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              className={`tr-quadro-item${ativa === item.key ? " is-atual" : ""}`}
              onClick={() => {
                setMaisAberto(false);
                onSelecionar(item.key);
              }}
            >
              <NavIcon name={item.key} size={22} strokeWidth={1.7} />
              {ROTULO_DO_ITEM[item.key] ?? item.rotulo}
            </button>
          ))}
        </div>
      )}

      {perfilAberto && usuario && (
        <div ref={perfilQuadroRef} className="tr-quadro tr-quadro--perfil" role="menu">
          <button
            type="button"
            role="menuitem"
            className="tr-quadro-item"
            onClick={() => {
              setPerfilAberto(false);
              onMeuPerfil?.();
            }}
          >
            <NavIcon name="acessos" size={22} strokeWidth={1.7} />
            Meu perfil
          </button>
          <button type="button" role="menuitem" className="tr-quadro-item" onClick={onSair} disabled={saindo}>
            <NavIcon name="sair" size={22} strokeWidth={1.7} />
            Sair do sistema
          </button>
        </div>
      )}
    </>
  );
}
