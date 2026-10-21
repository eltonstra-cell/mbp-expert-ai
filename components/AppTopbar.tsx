"use client";

import type { CSSProperties } from "react";
import BuscaNaBarra from "@/components/BuscaNaBarra";
import type { Destino } from "@/lib/commandSearch";
import { RowMenu, type ItemMenu } from "@/components/ui/RowMenu";
import { ROTULO_DE_USO, type ModoTela } from "@/lib/screenMode";

const ROTULO_SYNC = { ok: "Sincronizado", pendente: "Sincronizando…", erro: "Sem conexão" } as const;

type Props = {
  /** Texto pequeno ao lado do caminho (ex.: data e situação da visita). */
  subtituloDoCaminho?: string;
  /** Caminho exibido no PC, por exemplo: Visitas › Empresa › Central. */
  caminho: string[];
  /** Chamado ao tocar no primeiro item do caminho (Visitas), quando houver. */
  onPrimeiro?: () => void;
  empresaAtiva: string | null;
  /** Cor da empresa ativa (paleta fixa) e suas iniciais, para o avatar. */
  empresaCor?: string;
  empresaIniciais?: string;
  iniciais: string | null;
  /** Tablet, dentro de uma visita: link para voltar à lista. */
  mostrarTodasVisitas: boolean;
  onTodasVisitas: () => void;
  /** Busca na própria barra: índice de destinos, escolha, aviso de uso e pedido de foco (Ctrl K). */
  destinos: Destino[];
  onEscolherDestino: (destino: Destino) => void;
  onBuscaAtiva: (ativa: boolean) => void;
  pedidoDeFocoNaBusca: number;
  /** Usuário de quem usa (recentes da busca guardados só dele). */
  usuarioId?: string | null;
  micDisponivel: boolean;
  /** Modo de tela em uso e ações da troca rápida (menu ⋯ do topo). */
  modo?: ModoTela;
  /** Situação da sincronização: chip discreto no topo. */
  sincronizacao?: { estado: "ok" | "pendente" | "erro"; onClick: () => void };
  automatico?: boolean;
  onEscolherModo?: (modo: ModoTela) => void;
  onVoltarAoAutomatico?: () => void;
  onAbrirConfigModo?: () => void;
  /** Abre o painel de trocar empresa sobre a tela atual (o chip vira botão). */
  onTrocarEmpresa?: () => void;
  /** Chips logo abaixo da barra; cada um chama a mesma ação do menu. */
  atalhos?: { id: string; rotulo: string; onClick: () => void }[];
};

export default function AppTopbar({
  caminho,
  subtituloDoCaminho,
  onPrimeiro,
  empresaAtiva,
  empresaCor = "#4A5D73",
  empresaIniciais = "",
  iniciais,
  mostrarTodasVisitas,
  onTodasVisitas,
  destinos,
  onEscolherDestino,
  onBuscaAtiva,
  pedidoDeFocoNaBusca,
  usuarioId,
  micDisponivel,
  modo,
  sincronizacao,
  automatico = true,
  onEscolherModo,
  onVoltarAoAutomatico,
  onAbrirConfigModo,
  onTrocarEmpresa,
  atalhos = [],
}: Props) {
  const itensModo: ItemMenu[] =
    modo && onEscolherModo
      ? [
          ...(Object.keys(ROTULO_DE_USO) as ModoTela[]).map((opcao): ItemMenu => ({
            rotulo: `${modo === opcao ? "● " : "○ "}${ROTULO_DE_USO[opcao]}`,
            onClick: () => onEscolherModo(opcao),
          })),
          { rotulo: "Voltar ao automático", onClick: () => onVoltarAoAutomatico?.(), desabilitado: automatico },
          { rotulo: "Configurar modo de tela…", onClick: () => onAbrirConfigModo?.() },
        ]
      : [];
  return (
    <>
    <div className="pc-topbar">
      <nav className="pc-crumbs" aria-label="Caminho">
        {caminho.map((parte, indice) => {
          const ultimo = indice === caminho.length - 1;
          return (
            <span key={`${parte}-${indice}`} className="pc-crumb-wrap">
              {indice === 0 && onPrimeiro && !ultimo ? (
                <button type="button" className="pc-crumb-link" onClick={onPrimeiro}>
                  {parte}
                </button>
              ) : (
                <span className={ultimo ? "pc-crumb-current" : "pc-crumb"} aria-current={ultimo ? "page" : undefined}>
                  {parte}
                </span>
              )}
              {!ultimo && <span className="pc-crumb-sep" aria-hidden="true">›</span>}
            </span>
          );
        })}
      </nav>
      <BuscaNaBarra destinos={destinos} atalhos={atalhos} usuarioId={usuarioId} onAtiva={onBuscaAtiva} onEscolher={onEscolherDestino} micDisponivel={micDisponivel} pedidoDeFoco={pedidoDeFocoNaBusca} />
      {subtituloDoCaminho && <span className="pc-crumb-apoio">{subtituloDoCaminho}</span>}

      {mostrarTodasVisitas && (
        <button type="button" className="pc-back-link" onClick={onTodasVisitas}>
          ← Todas as visitas
        </button>
      )}

      <div className="pc-topbar-end">
        {sincronizacao && (
          <button
            type="button"
            className={`pc-sync-chip is-${sincronizacao.estado}`}
            onClick={sincronizacao.onClick}
            title={`${ROTULO_SYNC[sincronizacao.estado]}. Toque para atualizar agora`}
            aria-label={`${ROTULO_SYNC[sincronizacao.estado]}. Toque para atualizar agora`}
          >
            <span className="pc-sync-dot" aria-hidden="true" />
            <span className="pc-sync-texto">{ROTULO_SYNC[sincronizacao.estado]}</span>
          </button>
        )}
        {empresaAtiva && (
          <div className="emp-ativa" style={{ "--emp-cor": empresaCor } as CSSProperties}>
            <span className="emp-ativa-avatar" aria-hidden="true">
              {empresaIniciais}
            </span>
            <button type="button" className="emp-ativa-caixa" title={empresaAtiva} aria-label={`Trocar empresa. Empresa ativa: ${empresaAtiva}`} onClick={onTrocarEmpresa} disabled={!onTrocarEmpresa}>
              <span className="emp-ativa-selo">Empresa ativa</span>
              <span className="emp-ativa-nome">{empresaAtiva}</span>
              <span className="emp-ativa-seta" aria-hidden="true">▾</span>
            </button>
          </div>
        )}
        {modo && onAbrirConfigModo && (
          <button type="button" className="pc-mode-chip" onClick={onAbrirConfigModo} title={`${ROTULO_DE_USO[modo]}. Configurar o modo de tela`} aria-label={`${ROTULO_DE_USO[modo]}. Configurar o modo de tela`}>
            <span className="pc-mode-texto">{ROTULO_DE_USO[modo]}</span>
            <span className="pc-mode-icone" aria-hidden="true">▭</span>
          </button>
        )}
        {itensModo.length > 0 && <RowMenu itens={itensModo} rotulo="Modo de tela" />}
        {iniciais && (
          <span className="pc-avatar" aria-hidden="true">
            {iniciais}
          </span>
        )}
      </div>    </div>
    </>
  );
}
