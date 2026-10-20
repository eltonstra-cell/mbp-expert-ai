"use client";

import { useCallback, useState, type CSSProperties } from "react";
import { CorDaEmpresaJanela } from "@/components/CorDaEmpresa";
import { ListRow } from "@/components/ui/ListRow";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { ItemMenu } from "@/components/ui/RowMenu";
import { acoesDaEmpresa } from "@/lib/menuActions";
import { nomeSemNumerosNoInicio } from "@/lib/navigation";
import { iniciaisDaEmpresa } from "@/lib/navigation";

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
  busca: string;
  onBusca: (valor: string) => void;
  podeCriar: boolean;
  onNova: () => void;
  onSelecionar: (id: string) => void;
  onGerenciar: (id: string) => void;
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
      case "editar":
        return { rotulo: "Editar empresa", onClick: () => acoes.onGerenciar(empresa.id) };
      case "cor":
        return { rotulo: "Mudar cor", onClick: () => acoes.onCor(empresa.id) };
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
  const fecharCor = useCallback(() => setCorAberta(null), []);
  const abrirCor = (id: string) => {
    const caixa = document.getElementById(`emp-av-${id}`)?.getBoundingClientRect();
    setCorAberta({ id, ancora: caixa ? { left: caixa.left, top: caixa.top, bottom: caixa.bottom } : { left: 16, top: 120, bottom: 160 } });
  };
  const empresaDaCor = corAberta ? empresas.find((item) => item.id === corAberta.id) : undefined;
  return (
    <section className="ui-screen" aria-label="Empresas">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">Empresas</h1>
          <p className="ui-subtitle">{plural(totalClientes, "cliente", "clientes")} · escolha a empresa ativa para trabalhar</p>
        </div>
        {podeCriar && (
          <button type="button" className="ui-btn ui-btn--primary" onClick={onNova}>
            + Nova empresa
          </button>
        )}
      </div>

      <div className="ui-toolbar">
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
      </div>

      <div className="ui-scroll">
        <div className="ui-list">
          {empresas.map((empresa) => {
            const detalhes =
              empresa.setores === 0 && empresa.equipamentos === 0
                ? "sem setores nem equipamentos"
                : [
                    plural(empresa.setores, "setor", "setores"),
                    plural(empresa.equipamentos, "equipamento", "equipamentos"),
                    plural(empresa.programas, "programa", "programas"),
                    plural(empresa.pops, "POP", "POPs"),
                  ].join(" · ");
            const menu = menuDaEmpresa(empresa, { onGerenciar, onCor: abrirCor, onHistorico, onAcessos, onArquivar });
            return (
              <ListRow
                key={empresa.id}
                faixa={empresa.ativa ? "brand" : undefined}
                selecionada={empresa.ativa}
                esmaecida={empresa.arquivada}
                icone={
                  empresa.podeGerenciar ? (
                    <button
                      type="button"
                      id={`emp-av-${empresa.id}`}
                      className="emp-avatar-btn"
                      aria-label={`Mudar a cor de ${empresa.nome}`}
                      aria-haspopup="dialog"
                      onClick={() => abrirCor(empresa.id)}
                    >
                      <span className="ui-avatar ui-avatar--round emp-avatar-cor" style={{ "--emp-cor": empresa.cor } as CSSProperties} aria-hidden="true">
                        {iniciaisDaEmpresa(empresa.nome)}
                      </span>
                      <span className="emp-lapis" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z" />
                        </svg>
                      </span>
                    </button>
                  ) : (
                    <span className="ui-avatar ui-avatar--round emp-avatar-cor" style={{ "--emp-cor": empresa.cor } as CSSProperties} aria-hidden="true">
                      {iniciaisDaEmpresa(empresa.nome)}
                    </span>
                  )
                }
                titulo={empresa.nome}
                chip={empresa.arquivada ? <Pill tom="na">Arquivada</Pill> : empresa.ativa ? <Pill tom="brand">Empresa ativa</Pill> : undefined}
                secundario={<span className="pc-sub-quebra">{`${nomeSemNumerosNoInicio(empresa.razaoSocial)} · ${detalhes}`}</span>}
                meio={
                  <>
                    <ProgressBar percentual={empresa.preparacao} largura={120} rotulo={`Preparação ${empresa.preparacao}%`} />
                    <span className="ui-row-sub" title="Preparação mede 6 itens: responsável, horário, setor, equipamento, programa e POP">Preparação {empresa.preparacao}%</span>
                  </>
                }
                pilulas={
                  <span className="pc-cadastro-status">
                    <Pill tom={empresa.faltas.length === 0 ? "ok" : "pend"}>
                      {empresa.faltas.length === 0 ? "Cadastro completo" : "Cadastro incompleto"}
                    </Pill>
                    {empresa.faltas.length > 0 && <span className="ui-row-sub">Falta: {empresa.faltas.join(", ")}</span>}
                  </span>
                }
                acao={
                  <>
                    {empresa.ativa ? (
                      <span className="ui-btn ui-btn--secondary" aria-current="true">Ativa ✓</span>
                    ) : (
                      <button type="button" className="ui-btn ui-btn--secondary" onClick={() => onSelecionar(empresa.id)}>
                        Selecionar
                      </button>
                    )}
                    {empresa.ativa && empresa.podeNovaVisita && (
                      <button type="button" className="ui-btn ui-btn--primary" onClick={onNovaVisita}>
                        Nova visita
                      </button>
                    )}
                  </>
                }
                menu={menu}
              />
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
