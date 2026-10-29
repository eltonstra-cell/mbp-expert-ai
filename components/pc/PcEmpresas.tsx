"use client";

import { useCallback, useRef, useState, type CSSProperties } from "react";
import { CorDaEmpresaJanela } from "@/components/CorDaEmpresa";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RowMenu, type ItemMenu } from "@/components/ui/RowMenu";
import { acoesDaEmpresa } from "@/lib/menuActions";
import { subtituloDaEmpresa } from "@/lib/listaDeEmpresas";
import PendenciasChip from "@/components/pc/PendenciasChip";
import { iniciaisDaEmpresa } from "@/lib/navigation";
import "../../app/cadastro-empresas.css";

export type LinhaEmpresa = {
  id: string;
  nome: string;
  razaoSocial: string;
  ativa: boolean;
  setores: number;
  equipamentos: number;
  programas: number;
  pops: number;
  preparacao: number;
  completo: boolean;
  faltas: string[];
  podeGerenciar: boolean;
  podeAcessos: boolean;
  arquivada: boolean;
  podeNovaVisita: boolean;
  /** Cor da empresa (da paleta fixa). */
  cor: string;
};

export type Props = {
  empresas: LinhaEmpresa[];
  totalClientes: number;
  /** Mostra o microfone da busca (Campo); o PC não usa. */
  micDisponivel?: boolean;
  busca: string;
  onBusca: (valor: string) => void;
  podeCriar: boolean;
  onNova: () => void;
  onSelecionar: (id: string) => void;
  onGerenciar: (id: string) => void;
  /** Abre a Central da empresa na sub-aba onde a pendência se resolve. */
  onAbrirPendencia?: (empresaId: string, falta: string) => void;
  onNovaVisita: () => void;
  onHistorico: (id: string) => void;
  onAcessos: () => void;
  onArquivar: (id: string, arquivar: boolean) => void;
  onCor: (id: string, cor: string) => void;
  arquivadasTotal: number;
  mostrarArquivadas: boolean;
  onMostrarArquivadas: (valor: boolean) => void;
};

function plural(quantidade: number, singular: string, pluralTexto: string) {
  return `${quantidade} ${quantidade === 1 ? singular : pluralTexto}`;
}

/** Ações do ⋯ de uma empresa; a mesma lista serve ao PC e ao celular (Campo). */
export function menuDaEmpresa(
  empresa: LinhaEmpresa,
  acoes: {
    onGerenciar: (id: string) => void;
    onCor: (id: string) => void;
    onHistorico: (id: string) => void;
    onAcessos: () => void;
    onArquivar: (id: string, arquivar: boolean) => void;
  }
): ItemMenu[] {
  return acoesDaEmpresa({
    podeEditar: empresa.podeGerenciar,
    podeGerenciarAcessos: empresa.podeAcessos,
    arquivada: empresa.arquivada,
  }).map((acao): ItemMenu => {
    switch (acao) {
      case "central":
        return { rotulo: "Central da Empresa", onClick: () => acoes.onGerenciar(empresa.id) };
      case "cor":
        return { rotulo: "Editar cor/avatar", onClick: () => acoes.onCor(empresa.id) };
      case "historico":
        return { rotulo: "Histórico da empresa", onClick: () => acoes.onHistorico(empresa.id) };
      case "acessos":
        return { rotulo: "Acessos", onClick: acoes.onAcessos };
      case "arquivar":
        return { rotulo: "Arquivar empresa", confirmar: `Arquivar "${empresa.nome}"? Nada será apagado; ela sai da lista e pode ser desarquivada depois.`, onClick: () => acoes.onArquivar(empresa.id, true) };
      default:
        return { rotulo: "Desarquivar empresa", onClick: () => acoes.onArquivar(empresa.id, false) };
    }
  });
}

export default function PcEmpresas({
  empresas,
  totalClientes,
  busca,
  onBusca,
  podeCriar,
  onNova,
  onSelecionar,
  onGerenciar,
  onAbrirPendencia,
  onNovaVisita,
  onHistorico,
  onAcessos,
  onArquivar,
  onCor,
  arquivadasTotal,
  mostrarArquivadas,
  onMostrarArquivadas,
}: Props) {
  const [corAberta, setCorAberta] = useState<{ id: string; ancora: { left: number; top: number; bottom: number } } | null>(null);
  const idDaCor = useRef<string | null>(null);
  // Fechar a janela de cor devolve o foco ao ⋯ da mesma empresa (de onde ela foi aberta).
  const fecharCor = useCallback(() => {
    const id = idDaCor.current;
    setCorAberta(null);
    if (id) window.setTimeout(() => document.querySelector<HTMLElement>(`[data-empresa="${id.replace(/"/g, '\\"')}"] .emp-c-menu button`)?.focus(), 0);
  }, []);
  const abrirCor = (id: string) => {
    idDaCor.current = id;
    const caixa = document.getElementById(`emp-av-${id}`)?.getBoundingClientRect();
    setCorAberta({ id, ancora: caixa ? { left: caixa.left, top: caixa.top, bottom: caixa.bottom } : { left: 16, top: 120, bottom: 160 } });
  };
  const empresaDaCor = corAberta ? empresas.find((item) => item.id === corAberta.id) : undefined;
  return (
    <section className="ui-screen" aria-label="Empresas">
      <h1 className="sr-only">Empresas</h1>
      <div className="ui-head ui-head--so-direita">
        <span className="ui-subtitle ui-subtitle--linha">{plural(totalClientes, "cliente", "clientes")} · escolha a empresa ativa para trabalhar</span>
      </div>

      <div className="ui-toolbar emp-toolbar">
        <input
          type="search"
          className="ui-input pc-search pc-search--wide"
          placeholder="Buscar por nome, CNPJ ou município"
          aria-label="Buscar empresa"
          value={busca}
          onChange={(evento) => onBusca(evento.target.value)}
        />
        {arquivadasTotal > 0 && (
          <button type="button" className="pc-quick-btn" aria-pressed={mostrarArquivadas} onClick={() => onMostrarArquivadas(!mostrarArquivadas)}>
            {mostrarArquivadas ? "Ocultar arquivadas" : `Ver arquivadas (${arquivadasTotal})`}
          </button>
        )}
        {podeCriar && (
          <button type="button" className="ui-btn ui-btn--criar" onClick={onNova}>
            + Nova empresa
          </button>
        )}
      </div>

      <div className="ui-scroll">
        <div className="ui-list emp-lista" role="list">
          {empresas.map((empresa) => {
            const menu = menuDaEmpresa(empresa, { onGerenciar, onCor: abrirCor, onHistorico, onAcessos, onArquivar });
            return (
              <div key={empresa.id} role="listitem" className={`emp-linha${empresa.ativa ? " is-ativa" : ""}${empresa.arquivada ? " is-arquivada" : ""}`} data-empresa={empresa.id} aria-current={empresa.ativa ? "true" : undefined}>
                <span id={`emp-av-${empresa.id}`} className="ui-avatar ui-avatar--round emp-avatar-cor emp-c-avatar" style={{ "--emp-cor": empresa.cor } as CSSProperties} aria-hidden="true">
                  {iniciaisDaEmpresa(empresa.nome)}
                </span>
                <div className="emp-c-nome">
                  <span className="emp-nome">
                    {empresa.nome}
                    {empresa.arquivada && <Pill tom="na">Arquivada</Pill>}
                  </span>
                  <span className="emp-sub">{subtituloDaEmpresa(empresa)}</span>
                </div>
                <div className="emp-c-prep">
                  <div className="emp-prep-linha" title="Preparação mede 6 itens: responsável, horário, setor, equipamento, programa e POP">
                    <ProgressBar percentual={empresa.preparacao} rotulo={`Preparação ${empresa.preparacao}%`} />
                    <span className="emp-pct">{empresa.preparacao}%</span>
                  </div>
                  <span className="emp-falta">
                    {empresa.faltas.length === 0 ? "Cadastro completo" : <PendenciasChip faltas={empresa.faltas} texto onAbrir={empresa.podeGerenciar && onAbrirPendencia ? (falta) => onAbrirPendencia(empresa.id, falta) : undefined} />}
                  </span>
                </div>
                <div className="emp-c-sel">
                  {empresa.ativa ? (
                    <span className="emp-ativa-texto">✓ Ativa</span>
                  ) : (
                    <button type="button" className="ui-btn ui-btn--secondary" aria-label={`Selecionar ${empresa.nome}`} onClick={() => onSelecionar(empresa.id)}>
                      Selecionar
                    </button>
                  )}
                </div>
                <div className="emp-c-central">
                  <button type="button" className="ui-btn ui-btn--secondary" aria-label={`Central da Empresa de ${empresa.nome}`} onClick={() => onGerenciar(empresa.id)}>
                    Central da Empresa
                  </button>
                </div>
                <div className="emp-c-visita">
                  {empresa.ativa && empresa.podeNovaVisita && (
                    <button type="button" className="ui-btn ui-btn--criar" aria-label={`Nova visita em ${empresa.nome}`} onClick={onNovaVisita}>
                      Nova visita
                    </button>
                  )}
                </div>
                <div className="emp-c-menu">
                  <RowMenu itens={menu} />
                </div>
              </div>
            );
          })}
          {empresas.length === 0 && <div className="ui-empty">Nenhuma empresa encontrada com esse termo.</div>}
        </div>
      </div>
      {corAberta && empresaDaCor && (
        <CorDaEmpresaJanela
          nome={empresaDaCor.nome}
          iniciais={iniciaisDaEmpresa(empresaDaCor.nome)}
          cor={empresaDaCor.cor}
          ancora={corAberta.ancora}
          onEscolher={(cor) => onCor(empresaDaCor.id, cor)}
          onFechar={fecharCor}
        />
      )}
    </section>
  );
}
