"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { LogoSymbol } from "@/components/BrandLogo";
import { NavIcon } from "@/components/NavIcons";
import { itensVisiveis, maisEstaAtivo, registrarDisponivel, type NavContexto, type NavItem, type NavKey } from "@/lib/navigation";

type Props = {
  contexto: NavContexto;
  ativa: NavKey | null;
  onSelecionar: (key: NavKey) => void;
  /** Correções abertas da empresa ativa (número do item Correções). */
  vencidas: number;
  sincronizacao: { estado: "ok" | "erro" | "pendente" | "sem-sinal"; rotulo: string; onClick: () => void };
  onSair: () => void;
  saindo: boolean;
  /** Pessoa conectada (avatar do rodapé do trilho); null no modo local. */
  usuario: { nome: string; perfil: string; iniciais: string } | null;
  /** Abre a janela "Meu perfil" (menu do avatar). */
  onMeuPerfil?: () => void;
};

const PRINCIPAIS: NavKey[] = ["inicio", "visitas", "ncs", "pops", "relatorios"];
const EXTRAS: NavKey[] = ["empresas", "cadastros", "ajuda", "acessos"];
const ROTULO_DO_ITEM: Partial<Record<NavKey, string>> = { ncs: "Correções", pops: "POPs", relatorios: "Relatórios", ajuda: "Ajuda e guias", acessos: "Administração" };

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

// UM trilho, sempre o mesmo (dentro e fora da visita). Os assuntos da visita ficam na faixa da visita (FaixaDaVisita), não aqui.
export default function AppNavigation({ contexto, ativa, onSelecionar, vencidas, sincronizacao, onSair, saindo, usuario, onMeuPerfil }: Props) {
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
  const maisAtivo = maisEstaAtivo(ativa, extras);

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

  const botao = (item: NavItem) => {
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
        aria-label={badge > 0 ? `${rotulo}, ${badge} ${badge === 1 ? "correção aberta" : "correções abertas"} na empresa` : undefined}
        title={badge > 0 ? `${badge} na empresa (${badge === 1 ? "correção aberta" : "correções abertas"}, de todas as visitas; a Central da visita conta só as da visita)` : undefined}
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

  return (
    <>
      <nav className="tr" aria-label="Navegação principal">
        <span className="tr-logo" aria-hidden="true">
          <LogoSymbol size={36} />
        </span>

        {temRegistrar && (
          <button type="button" className="tr-registrar" onClick={() => onSelecionar("registrar")}>
            <span className="tr-registrar-disco">
              <NavIcon name="registrar" size={26} strokeWidth={2} />
            </span>
            <span className="tr-rotulo">Registrar</span>
          </button>
        )}

        <div className="tr-lista">
          {principais.map((item) => botao(item))}
          {extras.length > 0 && (
            <button
              ref={maisBotaoRef}
              type="button"
              className={`tr-item${maisAberto || maisAtivo ? " is-mais" : ""}${maisAtivo ? " is-atual" : ""}`}
              aria-current={maisAtivo ? "page" : undefined}
              aria-haspopup="menu"
              aria-expanded={maisAberto}
              onClick={alternarMais}
            >
              <Ladrilho ativo={maisAtivo}>
                <NavIcon name="mais" size={24} strokeWidth={1.7} />
              </Ladrilho>
              <span className="tr-rotulo">Mais</span>
            </button>
          )}
        </div>

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
            <NavIcon name="acessos" size={22} strokeWidth={1.8} />
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
