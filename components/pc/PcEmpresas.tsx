"use client";

import { ListRow } from "@/components/ui/ListRow";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { ItemMenu } from "@/components/ui/RowMenu";
import { acoesDaEmpresa } from "@/lib/menuActions";
import { TILE_GRADIENTS } from "@/lib/brand";

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
  podeGerenciar: boolean;
  podeAcessos: boolean;
  arquivada: boolean;
  podeNovaVisita: boolean;
};

type Props = {
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
  arquivadasTotal: number;
  mostrarArquivadas: boolean;
  onMostrarArquivadas: (valor: boolean) => void;
};

const TONS = ["azul", "verde", "violeta", "turquesa", "rosa", "indigo", "ambar", "ceu"] as const;

// Cor estável por empresa (a partir do id), usando os gradientes da marca.
function gradienteDaEmpresa(id: string) {
  let soma = 0;
  for (const letra of id) soma = (soma + letra.charCodeAt(0)) % 997;
  const [claro, base] = TILE_GRADIENTS[TONS[soma % TONS.length]];
  return `linear-gradient(160deg, ${claro}, ${base})`;
}

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter((parte) => parte.length > 2 || /^\p{L}$/u.test(parte))
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

function plural(quantidade: number, singular: string, pluralTexto: string) {
  return `${quantidade} ${quantidade === 1 ? singular : pluralTexto}`;
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
  arquivadasTotal,
  mostrarArquivadas,
  onMostrarArquivadas,
}: Props) {
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
            const menu: ItemMenu[] = acoesDaEmpresa({
              podeEditar: empresa.podeGerenciar,
              podeGerenciarAcessos: empresa.podeAcessos,
              arquivada: empresa.arquivada,
            }).map((acao): ItemMenu => {
              switch (acao) {
                case "editar":
                  return { rotulo: "Editar empresa", onClick: () => onGerenciar(empresa.id) };
                case "historico":
                  return { rotulo: "Histórico da empresa", onClick: () => onHistorico(empresa.id) };
                case "acessos":
                  return { rotulo: "Acessos", onClick: onAcessos };
                case "arquivar":
                  return { rotulo: "Arquivar empresa", confirmar: `Arquivar "${empresa.nome}"? Nada será apagado; ela sai da lista e pode ser desarquivada depois.`, onClick: () => onArquivar(empresa.id, true) };
                default:
                  return { rotulo: "Desarquivar empresa", onClick: () => onArquivar(empresa.id, false) };
              }
            });
            return (
              <ListRow
                key={empresa.id}
                faixa={empresa.ativa ? "brand" : undefined}
                selecionada={empresa.ativa}
                esmaecida={empresa.arquivada}
                icone={
                  <span className="ui-avatar" style={{ background: gradienteDaEmpresa(empresa.id) }} aria-hidden="true">
                    {iniciais(empresa.nome)}
                  </span>
                }
                titulo={empresa.nome}
                chip={empresa.arquivada ? <Pill tom="na">Arquivada</Pill> : empresa.ativa ? <Pill tom="brand">Empresa ativa</Pill> : undefined}
                secundario={`${empresa.razaoSocial} · ${detalhes}`}
                meio={
                  <>
                    <ProgressBar percentual={empresa.preparacao} largura={120} rotulo={`Preparação ${empresa.preparacao}%`} />
                    <span className="ui-row-sub">Preparação {empresa.preparacao}%</span>
                  </>
                }
                pilulas={
                  <Pill tom={empresa.completo ? "ok" : "pend"}>
                    {empresa.completo ? "Cadastro completo" : "Cadastro incompleto"}
                  </Pill>
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
    </section>
  );
}
