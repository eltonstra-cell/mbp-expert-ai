"use client";

import { useCallback, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import BuscaDeEmpresas from "@/components/campo/BuscaDeEmpresas";
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
  micDisponivel = true,
}: PropsEmpresas & { micDisponivel?: boolean }) {
  const [corAberta, setCorAberta] = useState<string | null>(null);
  const idDaCor = useRef<string | null>(null);
  // Fechar a janela de cor devolve o foco ao ⋯ da mesma empresa.
  const fecharCor = useCallback(() => {
    const id = idDaCor.current;
    setCorAberta(null);
    if (id) window.setTimeout(() => document.querySelector<HTMLElement>(`[data-empresa="${id.replace(/"/g, '\\"')}"] .row-menu button, [data-empresa="${id.replace(/"/g, '\\"')}"] [aria-haspopup="menu"]`)?.focus(), 0);
  }, []);
  const empresaDaCor = corAberta ? empresas.find((item) => item.id === corAberta) : undefined;

  const aoTocarNaLinha = (evento: MouseEvent<HTMLElement>, empresa: (typeof empresas)[number]) => {
    if ((evento.target as HTMLElement).closest(".row-menu, [aria-haspopup]")) return;
    if (!empresa.ativa) onSelecionar(empresa.id);
  };

  return (
    <section className="campo-tela campo-tela--fixa cemp" aria-label="Empresas">
      <h1 className="sr-only">Empresas</h1>
      <div className="cemp-topo">
        <p className="cemp-resumo">
          {empresas.length} {empresas.length === 1 ? "empresa" : "empresas"} · toque numa empresa para torná-la ativa
        </p>
        <BuscaDeEmpresas className="cemp-busca-corpo" valor={busca} onChange={onBusca} placeholder="Nome, CNPJ ou município" micDisponivel={micDisponivel} />
        {podeCriar && (
          <button type="button" className="ui-btn ui-btn--primary cemp-nova" onClick={onNova} aria-label="Nova empresa">
            <span className="cemp-nova-longo">+ Nova empresa</span>
            <span className="cemp-nova-curto" aria-hidden="true">+ Nova</span>
          </button>
        )}
      </div>
      {arquivadasTotal > 0 && (
        <button type="button" className="cemp-arquivadas" aria-pressed={mostrarArquivadas} onClick={() => onMostrarArquivadas(!mostrarArquivadas)}>
          {mostrarArquivadas ? "Ocultar arquivadas" : `Ver arquivadas (${arquivadasTotal})`}
        </button>
      )}
      <ul className="cemp-lista">
        {empresas.map((empresa) => {
          const menu = menuDaEmpresa(empresa, { onGerenciar, onCor: (id) => { idDaCor.current = id; setCorAberta(id); }, onHistorico, onAcessos, onArquivar });
          return (
            <li key={empresa.id} data-empresa={empresa.id} className={`cemp-cartao${empresa.ativa ? " is-ativa" : ""}${empresa.arquivada ? " is-arquivada" : ""}`} onClick={(evento) => aoTocarNaLinha(evento, empresa)}>
              <span id={`emp-av-${empresa.id}`} className="ui-avatar ui-avatar--round emp-avatar-cor cemp-avatar" style={{ "--emp-cor": empresa.cor } as CSSProperties} aria-hidden="true">
                {iniciaisDaEmpresa(empresa.nome)}
              </span>
              <button type="button" className="cemp-textos" aria-current={empresa.ativa ? "true" : undefined} aria-label={empresa.ativa ? `${empresa.nome}, empresa ativa` : `Tornar ${empresa.nome} a empresa ativa`}>
                <span className="cemp-nome">{empresa.nome}</span>
                <span className="cemp-sub">{subtituloDaEmpresa(empresa)}</span>
                <span className="cemp-situacao">
                  {empresa.arquivada && <Pill tom="na">Arquivada</Pill>}
                  <span className={`cemp-ponto${empresa.faltas.length === 0 ? " is-ok" : ""}`} aria-hidden="true" />
                  <span className="cemp-falta">{textoDaPreparacao(empresa.faltas)}</span>
                </span>
              </button>
              <span className="cemp-fim">
                {empresa.ativa && <span className="cemp-ativa">Ativa</span>}
                <RowMenu itens={menu} />
              </span>
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
