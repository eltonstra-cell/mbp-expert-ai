"use client";

import { useCallback, useState, type CSSProperties } from "react";
import { CorDaEmpresaJanela } from "@/components/CorDaEmpresa";
import type { Props as PropsEmpresas } from "@/components/pc/PcEmpresas";
import { menuDaEmpresa } from "@/components/pc/PcEmpresas";
import { Pill } from "@/components/ui/Pill";
import { RowMenu } from "@/components/ui/RowMenu";
import { iniciaisDaEmpresa } from "@/lib/navigation";

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
  const fecharCor = useCallback(() => setCorAberta(null), []);
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
          const menu = menuDaEmpresa(empresa, { onGerenciar, onCor: setCorAberta, onHistorico, onAcessos, onArquivar });
          const avatar = (
            <span className="ui-avatar ui-avatar--round emp-avatar-cor cemp-avatar" style={{ "--emp-cor": empresa.cor } as CSSProperties} aria-hidden="true">
              {iniciaisDaEmpresa(empresa.nome)}
            </span>
          );
          return (
            <li key={empresa.id} className={`cemp-cartao${empresa.ativa ? " is-ativa" : ""}${empresa.arquivada ? " is-arquivada" : ""}`}>
              <div className="cemp-linha">
                {empresa.podeGerenciar ? (
                  <button
                    type="button"
                    id={`emp-av-${empresa.id}`}
                    className="emp-avatar-btn cemp-avatar-btn"
                    aria-label={`Mudar a cor de ${empresa.nome}`}
                    aria-haspopup="dialog"
                    onClick={() => setCorAberta(empresa.id)}
                  >
                    {avatar}
                    <span className="emp-lapis" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z" />
                      </svg>
                    </span>
                  </button>
                ) : (
                  avatar
                )}
                <div className="cemp-textos">
                  <span className="cemp-nome">{empresa.nome}</span>
                  <span className="cemp-situacao">
                    {empresa.arquivada ? (
                      <Pill tom="na">Arquivada</Pill>
                    ) : (
                      <Pill tom={empresa.faltas.length === 0 ? "ok" : "pend"}>{empresa.faltas.length === 0 ? "Completo" : "Incompleto"}</Pill>
                    )}
                  </span>
                </div>
                {empresa.ativa ? (
                  <span className="ui-btn ui-btn--secondary ui-btn--small cemp-sel" aria-current="true">
                    Ativa ✓
                  </span>
                ) : (
                  <button type="button" className="ui-btn ui-btn--secondary ui-btn--small cemp-sel" onClick={() => onSelecionar(empresa.id)}>
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
