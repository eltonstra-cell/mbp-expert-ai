"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { NavIcon } from "@/components/NavIcons";
import { RowMenu, type ItemMenu } from "@/components/ui/RowMenu";
import { ROTULO_DE_USO, type ModoTela } from "@/lib/screenMode";

// Exemplos que trocam a cada poucos segundos na barra (só o texto de ajuda; nada é buscado sozinho).
const EXEMPLOS_DA_BARRA = ["nova visita, POPs, correções abertas", "relatório emitido, dossiê, norma", "ambientes, comprovantes, pessoas", "central da empresa, dados, responsável"];

const ROTULO_SYNC = { ok: "Sincronizado", pendente: "Sincronizando…", erro: "Sem conexão" } as const;

type Props = {
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
  /** Abre a caixa inteligente (Ctrl K); com voz, já começa a ouvir. */
  onAbrirCaixa: (comVoz: boolean) => void;
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
  onPrimeiro,
  empresaAtiva,
  empresaCor = "#4A5D73",
  empresaIniciais = "",
  iniciais,
  mostrarTodasVisitas,
  onTodasVisitas,
  onAbrirCaixa,
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
  const [exemplo, setExemplo] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setExemplo((atual) => (atual + 1) % EXEMPLOS_DA_BARRA.length), 4500);
    return () => window.clearInterval(timer);
  }, []);
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
            title="Toque para atualizar agora"
          >
            <span className="pc-sync-dot" aria-hidden="true" />
            {ROTULO_SYNC[sincronizacao.estado]}
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
          <button type="button" className="pc-mode-chip" onClick={onAbrirConfigModo} title="Configurar o modo de tela">
            {ROTULO_DE_USO[modo]}
          </button>
        )}
        {itensModo.length > 0 && <RowMenu itens={itensModo} rotulo="Modo de tela" />}
        {iniciais && (
          <span className="pc-avatar" aria-hidden="true">
            {iniciais}
          </span>
        )}
      </div>    </div>
    <div className="pc-smartwrap">
    <div className="pc-smartbar">
      <span className="pc-bolt" aria-hidden="true">
        <NavIcon name="raio" size={22} />
      </span>
      <button type="button" className="pc-smartbar-field" onClick={() => onAbrirCaixa(false)} aria-label="Abrir a caixa inteligente (Ctrl K)">
        <span className="pc-smartbar-text">Ex.: {EXEMPLOS_DA_BARRA[exemplo]}</span>
        <span className="pc-smartbar-text-short">Diga o que quer fazer</span>
        <kbd className="pc-kbd">Ctrl K</kbd>
      </button>
      {micDisponivel && (
        <button type="button" className="pc-mic" aria-label="Falar em vez de digitar" onClick={() => onAbrirCaixa(true)}>
          <NavIcon name="microfone" size={18} />
        </button>
      )}
      <button type="button" className="pc-go" onClick={() => onAbrirCaixa(false)}>
        Ir →
      </button>
    </div>
    {atalhos.length > 0 && (
      <div className="pc-atalhos" role="group" aria-label="Atalhos">
        <span className="pc-atalhos-rotulo">Atalhos</span>
        {atalhos.map((atalho) => (
          <button key={atalho.id} type="button" className="pc-atalho" onClick={atalho.onClick}>
            {atalho.rotulo}
          </button>
        ))}
      </div>
    )}
    </div>
    </>
  );
}
