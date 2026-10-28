"use client";

import { useCallback, useRef, useState, type CSSProperties } from "react";
import { CorDaEmpresaJanela } from "@/components/CorDaEmpresa";
import type { Props as PropsEmpresas } from "@/components/pc/PcEmpresas";
import { menuDaEmpresa } from "@/components/pc/PcEmpresas";
import { Pill } from "@/components/ui/Pill";
import { RowMenu } from "@/components/ui/RowMenu";
import { subtituloDaEmpresa, textoDaPreparacao } from "@/lib/listaDeEmpresas";
import { iniciaisDaEmpresa } from "@/lib/navigation";
import "../../app/cadastro-empresas.css";

// Empresas no celular (modo Campo): busca, cartões compactos e escolha da cor pelo avatar.
export default function CampoEmpresas({
  empresas,
  busca,
  onBusca,
  podeCriar,
  onNova,
  onSelecionar,
  onGerenciar,
  onHistorico,
  onAcessos,
  onArquivar,
  onCor,
  arquivadasTotal,
  mostrarArquivadas,
  onMostrarArquivadas,
}: PropsEmpresas) {
  const [corAberta, setCorAberta] = useState<string | null>(null);
  const idDaCor = useRef<string | null>(null);
  // Fechar a janela de cor devolve o foco ao ⋯ da mesma empresa.
  const fecharCor = useCallback(() => {
    const id = idDaCor.current;
    setCorAberta(null);
    if (id) window.setTimeout(() => document.querySelector<HTMLElement>(`[data-empresa="${id.replace(/"/g, '\\"')}"] .row-menu button, [data-empresa="${id.replace(/"/g, '\\"')}"] [aria-haspopup="menu"]`)?.focus(), 0);
  }, []);
  const empresaDaCor = corAberta ? empresas.find((item) => item.id === corAberta) : undefined;

  return (
    <section className="campo-tela campo-tela--fixa cemp" aria-label="Empresas">
      <div className="cemp-topo">
        <h1 className="campo-h1">Empresas</h1>
        {podeCriar && (
          <button type="button" className="ui-btn ui-btn--primary ui-btn--small" onClick={onNova}>
            + Nova
          </button>
        )}
      </div>
      <input
        type="search"
        className="ui-input cemp-busca"
        placeholder="Buscar por nome, CNPJ ou município"
        aria-label="Buscar empresa"
        value={busca}
        onChange={(evento) => onBusca(evento.target.value)}
      />
      {arquivadasTotal > 0 && (
        <button type="button" className="cemp-arquivadas" aria-pressed={mostrarArquivadas} onClick={() => onMostrarArquivadas(!mostrarArquivadas)}>
          {mostrarArquivadas ? "Ocultar arquivadas" : `Ver arquivadas (${arquivadasTotal})`}
        </button>
      )}
      <ul className="cemp-lista">
        {empresas.map((empresa) => {
          const menu = menuDaEmpresa(empresa, { onGerenciar, onCor: (id) => { idDaCor.current = id; setCorAberta(id); }, onHistorico, onAcessos, onArquivar });
          const avatar = (
            <span id={`emp-av-${empresa.id}`} className="ui-avatar ui-avatar--round emp-avatar-cor cemp-avatar" style={{ "--emp-cor": empresa.cor } as CSSProperties} aria-hidden="true">
              {iniciaisDaEmpresa(empresa.nome)}
            </span>
          );
          return (
            <li key={empresa.id} data-empresa={empresa.id} className={`cemp-cartao${empresa.ativa ? " is-ativa" : ""}${empresa.arquivada ? " is-arquivada" : ""}`}>
              <div className="cemp-linha">
                {avatar}
                <div className="cemp-textos">
                  <span className="cemp-nome">{empresa.nome}</span>
                  <span className="cemp-sub">{subtituloDaEmpresa(empresa)}</span>
                  <span className="cemp-situacao">
                    {empresa.arquivada && <Pill tom="na">Arquivada</Pill>}
                    <span className="cemp-falta">{textoDaPreparacao(empresa.faltas)}</span>
                  </span>
                </div>
                {empresa.ativa ? (
                  <span className="cemp-ativa" aria-current="true">
                    ✓ Ativa
                  </span>
                ) : (
                  <button type="button" className="ui-btn ui-btn--secondary cemp-sel" aria-label={`Selecionar ${empresa.nome}`} onClick={() => onSelecionar(empresa.id)}>
                    Selecionar
                  </button>
                )}
                <RowMenu itens={menu} />
              </div>
              <div className="cemp-progresso" role="img" aria-label={`Preparação ${empresa.preparacao}%`}>
                <span className="cemp-barra">
                  <span style={{ width: `${empresa.preparacao}%` }} />
                </span>
                <span className="cemp-pct">{empresa.preparacao}%</span>
              </div>
            </li>
          );
        })}
        {empresas.length === 0 && <li className="ui-empty">Nenhuma empresa encontrada com esse termo.</li>}
      </ul>
      {corAberta && empresaDaCor && (
        <CorDaEmpresaJanela
          nome={empresaDaCor.nome}
          iniciais={iniciaisDaEmpresa(empresaDaCor.nome)}
          cor={empresaDaCor.cor}
          ancora={null}
          onEscolher={(cor) => onCor(empresaDaCor.id, cor)}
          onFechar={fecharCor}
        />
      )}
    </section>
  );
}
