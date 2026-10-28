"use client";

import type { CSSProperties } from "react";
import BuscaNaBarra, { type ContextoDaVoz } from "@/components/BuscaNaBarra";
import type { Destino } from "@/lib/commandSearch";
import { RowMenu, type ItemMenu } from "@/components/ui/RowMenu";
import SeletorDeSecao, { type OpcaoDeSecao } from "@/components/SeletorDeSecao";
import { ROTULO_DE_USO, ROTULO_DO_MODO, type ModoTela } from "@/lib/screenMode";

const ROTULO_SYNC = { ok: "Sincronizado", pendente: "Sincronizando…", "sem-sinal": "Sem sinal", erro: "Erro ao enviar" } as const;

type Props = {
  /** Texto pequeno ao lado do caminho (ex.: data e situação da visita). */
  subtituloDoCaminho?: string;
  /** Caminho exibido no PC, por exemplo: Visitas › Empresa › Central. */
  caminho: string[];
  /** Chamado ao tocar no primeiro item do caminho (Visitas), quando houver. */
  onPrimeiro?: () => void;
  empresaAtiva: string | null;
  /** Cor da empresa ativa (paleta fixa): contorno do seletor. */
  empresaCor?: string;
  iniciais: string | null;
  /** Tablet, dentro de uma visita: link para voltar à lista. */
  mostrarTodasVisitas: boolean;
  onTodasVisitas: () => void;
  /** Busca na própria barra: índice de destinos, escolha, aviso de uso e pedido de foco (Ctrl K). */
  destinos: Destino[];
  onEscolherDestino: (destino: Destino) => void;
  onBuscaAtiva: (ativa: boolean) => void;
  pedidoDeFocoNaBusca: number;
  /** O que a busca por voz precisa para entender "[destino] em [empresa]". */
  contextoDaVoz?: ContextoDaVoz;
  /** Usuário de quem usa (recentes da busca guardados só dele). */
  usuarioId?: string | null;
  micDisponivel: boolean;
  /** Modo de tela em uso e ações da troca rápida (menu ⋯ do topo). */
  modo?: ModoTela;
  /** Situação da sincronização: chip discreto no topo. */
  sincronizacao?: { estado: "ok" | "pendente" | "sem-sinal" | "erro"; /** Texto do chip (sempre visível). */ rotulo?: string; /** Frase do tooltip. */ dica?: string; onClick: () => void };
  automatico?: boolean;
  onEscolherModo?: (modo: ModoTela) => void;
  onVoltarAoAutomatico?: () => void;
  onAbrirConfigModo?: () => void;
  /** Abre o painel de trocar empresa sobre a tela atual (o chip vira botão). */
  onTrocarEmpresa?: () => void;
  /** Chips logo abaixo da barra; cada um chama a mesma ação do menu. */
  atalhos?: { id: string; rotulo: string; onClick: () => void }[];
  /** Botão "←" no canto esquerdo das telas internas: volta uma tela (ou ao nível acima). Ausente no Início. */
  onVoltar?: () => void;
  /** Central da Empresa: "Central da Empresa › Documentos ▾". O menu troca de seção (Empresa, Cadastros, Documentos). */
  secao?: { rotulo: string; opcoes: OpcaoDeSecao[]; onEscolher: (id: string) => void };
  /** Central da Empresa: o chip do modo de tela fica só no menu ⋯. */
  ocultarChipDeModo?: boolean;
  /** "inicio": barra do Início (PC) no desenho aprovado: busca larga sem Ctrl K nem Ir, sincronização sem pílula, seletor de empresa sem borda. */
  variante?: "inicio";
  /** Modo Campo (celular): a busca fica no cabeçalho do Campo (CampoCabecalho), então esta barra, escondida por CSS, não a repete. */
  semBusca?: boolean;
};

export default function AppTopbar({
  caminho,
  subtituloDoCaminho,
  onPrimeiro,
  empresaAtiva,
  empresaCor = "#4A5D73",
  iniciais,
  mostrarTodasVisitas,
  onTodasVisitas,
  destinos,
  onEscolherDestino,
  onBuscaAtiva,
  pedidoDeFocoNaBusca,
  usuarioId,
  contextoDaVoz,
  micDisponivel,
  modo,
  sincronizacao,
  automatico = true,
  onEscolherModo,
  onVoltarAoAutomatico,
  onAbrirConfigModo,
  onTrocarEmpresa,
  atalhos = [],
  onVoltar,
  secao,
  ocultarChipDeModo = false,
  variante,
  semBusca = false,
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
    <div className={`pc-topbar${variante === "inicio" ? " pc-topbar--inicio" : ""}`}>
      {onVoltar && (
        <button type="button" className="pc-voltar" aria-label="Voltar" title="Voltar" onClick={onVoltar}>
          <span aria-hidden="true">←</span>
        </button>
      )}
      <nav className={`pc-crumbs${secao ? " pc-crumbs--secao" : ""}`} aria-label="Caminho">
        {caminho.map((parte, indice) => {
          const ultimo = indice === caminho.length - 1;
          return (
            <span key={`${parte}-${indice}`} className="pc-crumb-wrap">
              {indice === 0 && onPrimeiro && !ultimo ? (
                <button type="button" className="pc-crumb-link" onClick={onPrimeiro}>
                  {parte}
                </button>
              ) : (
                <span className={ultimo ? "pc-crumb-current" : "pc-crumb"} aria-current={ultimo && !secao ? "page" : undefined}>
                  {parte}
                </span>
              )}
              {!ultimo && <span className="pc-crumb-sep" aria-hidden="true">›</span>}
            </span>
          );
        })}
        {/* O "›" anda junto com o menu: se a largura faltar, os dois caem para a linha de baixo juntos, nunca o "›" sozinho. */}
        {secao && (
          <span className="pc-crumb-menu">
            <span className="pc-crumb-sep" aria-hidden="true">›</span>
            {secao.opcoes.length > 1 ? <SeletorDeSecao rotulo={secao.rotulo} opcoes={secao.opcoes} onEscolher={secao.onEscolher} /> : <span className="sec-menu-botao sec-menu-botao--so" aria-current="page">{secao.rotulo}</span>}
          </span>
        )}
      </nav>
      {!semBusca && <BuscaNaBarra variante={variante} destinos={destinos} atalhos={atalhos} usuarioId={usuarioId} onAtiva={onBuscaAtiva} onEscolher={onEscolherDestino} micDisponivel={micDisponivel} pedidoDeFoco={pedidoDeFocoNaBusca} voz={contextoDaVoz} />}
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
            title={sincronizacao.dica || `${sincronizacao.rotulo || ROTULO_SYNC[sincronizacao.estado]}. Toque para atualizar agora`}
            aria-label={sincronizacao.dica || `${sincronizacao.rotulo || ROTULO_SYNC[sincronizacao.estado]}. Toque para atualizar agora`}
          >
            <span className="pc-sync-dot" aria-hidden="true" />
            <span className="pc-sync-texto">{sincronizacao.rotulo || ROTULO_SYNC[sincronizacao.estado]}</span>
          </button>
        )}
        {empresaAtiva && (
          <div className="emp-ativa" style={{ "--emp-cor": empresaCor } as CSSProperties}>
            <button type="button" className="emp-ativa-caixa" title={empresaAtiva} aria-label={`Trocar empresa. Empresa ativa: ${empresaAtiva}`} onClick={onTrocarEmpresa} disabled={!onTrocarEmpresa}>
              <span className="emp-ativa-selo">Empresa ativa</span>
              <span className="emp-ativa-nome">{empresaAtiva}</span>
              <span className="emp-ativa-seta" aria-hidden="true">▾</span>
            </button>
          </div>
        )}
        {modo && onAbrirConfigModo && !secao && !ocultarChipDeModo && (
          <button type="button" className="pc-mode-chip" onClick={onAbrirConfigModo} title={`${ROTULO_DE_USO[modo]}. Configurar o modo de tela`} aria-label={`${ROTULO_DE_USO[modo]}. Configurar o modo de tela`}>
            <span className="pc-mode-texto">Modo de tela: {ROTULO_DO_MODO[modo]}</span>
            <svg className="pc-mode-icone" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <rect x="3" y="4" width="18" height="12" rx="2" />
              <path d="M8 20h8M12 16v4" />
            </svg>
          </button>
        )}
        {itensModo.length > 0 && <RowMenu itens={itensModo} rotulo="Modo de tela" />}
      </div>    </div>
    </>
  );
}
