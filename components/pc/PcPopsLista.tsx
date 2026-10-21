"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Empresa, ProcedimentoOperacionalPadronizado } from "@/types";
import FieldVoiceTools from "@/components/FieldVoiceTools";
import { RowMenu, type ItemMenu } from "@/components/ui/RowMenu";
import { MENSAGEM_NORMA_ALTERADA, MENSAGEM_SEM_NORMA_APLICADA, popPrecisaRevisarPorNorma } from "@/lib/popsNorma";
import { CORES_DA_SITUACAO, contadoresDaLista, type LinhaComDetalhe } from "@/lib/popGestao";
import { acoesDoPop } from "@/lib/menuActions";
import { adicionarPop, arquivarPop, duplicarPop } from "@/lib/pops";

type Props = {
  empresa: Pick<Empresa, "normasAplicadas" | "pops">;
  conjunto: LinhaComDetalhe[];
  outros: LinhaComDetalhe[];
  podeEditar: boolean;
  arquivados: number;
  verArquivados: boolean;
  onVerArquivados: () => void;
  /** Faltam POPs do conjunto para criar de uma vez (só RT e Administrador). */
  faltamCriar: number;
  motivoSemCriar: string;
  avisoSemVinculo?: ReactNode;
  onIrParaNorma?: () => void;
  onCriarFaltantes: () => void;
  onCriarDoModelo: (catalogoId: string) => void;
  onAbrirFicha: (popId: string) => void;
  pops: ProcedimentoOperacionalPadronizado[];
  onPersistir: (pops: ProcedimentoOperacionalPadronizado[]) => void;
  /** Nome do responsável de Dados e atalho para alterar. */
  responsavel: ReactNode;
  topo?: ReactNode;
  mensagem?: string;
};

function Etiqueta({ situacao }: { situacao: LinhaComDetalhe["situacao"] }) {
  const cor = CORES_DA_SITUACAO[situacao];
  return (
    <span className="pgl-etiqueta" style={{ background: cor.fundo, color: cor.texto }}>
      {situacao}
    </span>
  );
}

const PENDENTES = new Set(["comprovante-vencido", "correcao-atrasada", "registro-atrasado", "leitura-pendente", "comprovante-vence", "aguardando-aprovacao"]);

function Linha({ linha, podeEditar, onAbrirFicha, onCriarDoModelo, menu }: { linha: LinhaComDetalhe; podeEditar: boolean; onAbrirFicha: (id: string) => void; onCriarDoModelo: (catalogoId: string) => void; menu?: ItemMenu[] }) {
  const cor = CORES_DA_SITUACAO[linha.situacao];
  const destaque = PENDENTES.has(linha.acao.tipo) && linha.situacao !== "Falta criar";
  return (
    <div className={`pgl-linha${destaque ? " is-destaque" : ""}${linha.pop?.arquivado ? " is-arquivado" : ""}`}>
      <span className="pgl-faixa" style={{ background: cor.faixa }} aria-hidden="true" />
      <div className="pgl-textos">
        <span className="pgl-titulo">{linha.codigo ? `${linha.codigo} · ${linha.titulo}` : linha.titulo}</span>
        <span className="pgl-detalhe">{linha.detalhe}</span>
      </div>
      <div className="pgl-situacao">
        <Etiqueta situacao={linha.situacao} />
        {linha.pop && popPrecisaRevisarPorNorma(linha.pop) && (
          <span className="pop-revisar" title={MENSAGEM_NORMA_ALTERADA}>
            revisar
          </span>
        )}
      </div>
      {linha.situacao !== "Falta criar" && <div className="pgl-acao">{linha.acao.texto}</div>}
      <div className="pgl-botoes">
        {linha.pop ? (
          <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => onAbrirFicha(linha.pop!.id)}>
            Abrir ficha
          </button>
        ) : podeEditar && linha.definicao ? (
          <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => onCriarDoModelo(linha.definicao!.catalogoId)}>
            Criar do modelo
          </button>
        ) : (
          <span className="pgl-sem-botao">sem versão</span>
        )}
        {menu && menu.length > 0 && <RowMenu itens={menu} />}
      </div>
    </div>
  );
}

// Documentos › POPs: contadores, a lista com situação e UMA próxima ação por POP, e "Outros POPs e documentos".
export default function PcPopsLista({
  empresa,
  conjunto,
  outros,
  podeEditar,
  arquivados,
  verArquivados,
  onVerArquivados,
  faltamCriar,
  motivoSemCriar,
  avisoSemVinculo,
  onIrParaNorma,
  onCriarFaltantes,
  onCriarDoModelo,
  onAbrirFicha,
  pops,
  onPersistir,
  responsavel,
  topo,
  mensagem,
}: Props) {
  const [codigo, setCodigo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [erro, setErro] = useState<{ campo: "titulo" | "codigo"; aviso: string } | null>(null);
  const contadores = contadoresDaLista([...conjunto, ...outros]);
  // "Criar os N POPs de uma vez" vai para a linha das abas da Central, à direita; sem a linha (tela fora da Central), fica no topo da lista.
  const [lugarDoBotao, setLugarDoBotao] = useState<HTMLElement | null>(null);
  useEffect(() => setLugarDoBotao(document.getElementById("cen-acoes-slot")), []);

  function adicionar() {
    const resultado = adicionarPop(pops, codigo, titulo, crypto.randomUUID());
    if (!resultado.ok) {
      setErro({ campo: resultado.campo, aviso: resultado.aviso });
      return;
    }
    onPersistir(resultado.pops);
    setCodigo("");
    setTitulo("");
    setErro(null);
  }

  function menuDoOutro(pop: ProcedimentoOperacionalPadronizado): ItemMenu[] {
    return acoesDoPop({ arquivado: Boolean(pop.arquivado), podeEditar })
      .filter((acao) => acao !== "abrir")
      .map((acao): ItemMenu => {
        switch (acao) {
          case "duplicar":
            return { rotulo: "Duplicar", onClick: () => onPersistir(duplicarPop(pops, pop.id, crypto.randomUUID())) };
          case "arquivar":
            return { rotulo: "Arquivar", confirmar: `Arquivar o POP "${pop.titulo || pop.codigo}"? Ele sai da lista, mas continua guardado.`, onClick: () => onPersistir(arquivarPop(pops, pop.id, true)) };
          case "desarquivar":
            return { rotulo: "Desarquivar", onClick: () => onPersistir(arquivarPop(pops, pop.id, false)) };
          default:
            return { rotulo: "Excluir POP", perigo: true, confirmar: `Excluir o POP "${pop.titulo || pop.codigo}"?`, onClick: () => onPersistir(pops.filter((item) => item.id !== pop.id)) };
        }
      });
  }

  return (
    <div className="pgl">
      <h2 className="sr-only">POPs</h2>
      {podeEditar && conjunto.length > 0 &&
        (() => {
          const botao = (
            <div className="pgl-criar">
              {faltamCriar === 0 && motivoSemCriar && <span className="pgl-motivo">{motivoSemCriar}</span>}
              <button type="button" className="ui-btn ui-btn--criar ui-btn--small" disabled={faltamCriar === 0} onClick={onCriarFaltantes}>
                {faltamCriar === 0 ? "Criar POPs de uma vez" : faltamCriar === 1 ? "Criar 1 POP de uma vez" : `Criar os ${faltamCriar} POPs de uma vez`}
              </button>
            </div>
          );
          return lugarDoBotao ? createPortal(botao, lugarDoBotao) : <div className="pgl-topo">{botao}</div>;
        })()}

      {topo}

      {avisoSemVinculo}

      <div className="pgl-faixa-topo">
        <div className="pgl-chips" role="group" aria-label="Situação dos POPs">
          <span className="pgl-chip pgl-conta--ok"><b>{contadores.vigentesEmDia}</b> em dia</span>
          <span className="pgl-chip pgl-conta--pend"><b>{contadores.vigentesComPendencia}</b> com pendência</span>
          <span className="pgl-chip pgl-conta--aguarda"><b>{contadores.aguardando}</b> aguardando aprovação</span>
          <span className="pgl-chip pgl-conta--rascunho"><b>{contadores.rascunho}</b> rascunho</span>
          <span className="pgl-chip pgl-conta--falta"><b>{contadores.faltaCriar}</b> falta criar</span>
        </div>
        <div className="pgl-resp">{responsavel}</div>
      </div>

      <div className="pgl-lista">
        {conjunto.length === 0 ? (
          <div className="priv-faixa" role="status">
            <span>{MENSAGEM_SEM_NORMA_APLICADA}</span>
            {onIrParaNorma && (
              <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={onIrParaNorma}>
                Ir para Norma aplicável
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="pgl-secao">Conjunto da norma</div>
            {conjunto.map((linha) => (
              <Linha key={linha.chave} linha={linha} podeEditar={podeEditar} onAbrirFicha={onAbrirFicha} onCriarDoModelo={onCriarDoModelo} />
            ))}
          </>
        )}

        <div className="pgl-secao">Outros POPs e documentos da empresa</div>
        {podeEditar && (
          <div className="pgl-adicionar">
            <label className="pc-add-code">
              <input
                className={`ui-input${erro?.campo === "codigo" ? " is-invalid" : ""}`}
                value={codigo}
                onChange={(evento) => {
                  setCodigo(evento.target.value);
                  if (erro?.campo === "codigo") setErro(null);
                }}
                placeholder="Código (opcional)"
                aria-label="Código do POP (opcional)"
                aria-invalid={erro?.campo === "codigo"}
              />
              {erro?.campo === "codigo" && <span className="ui-field-error">{erro.aviso}</span>}
            </label>
            <label className="pc-add-title">
              <span className="ui-field-wrap">
                <input
                  className={`ui-input pc-input-tools${erro?.campo === "titulo" ? " is-invalid" : ""}`}
                  value={titulo}
                  onChange={(evento) => {
                    setTitulo(evento.target.value);
                    if (erro?.campo === "titulo") setErro(null);
                  }}
                  placeholder="Título do POP"
                  aria-label="Título do POP"
                  aria-invalid={erro?.campo === "titulo"}
                />
                <span className="ui-field-tools">
                  <FieldVoiceTools fieldKey="novo-pop-titulo" value={titulo} onChange={setTitulo} contexto="Título curto e objetivo de um Procedimento Operacional Padronizado." />
                </span>
              </span>
              {erro?.campo === "titulo" && <span className="ui-field-error">{erro.aviso}</span>}
            </label>
            <button type="button" className="ui-btn ui-btn--criar" onClick={adicionar}>
              + Adicionar POP
            </button>
          </div>
        )}
        {outros.length === 0 ? <div className="ui-empty">Nenhum outro POP ou documento cadastrado.</div> : null}
        {outros.map((linha) => (
          <Linha key={linha.chave} linha={linha} podeEditar={podeEditar} onAbrirFicha={onAbrirFicha} onCriarDoModelo={onCriarDoModelo} menu={linha.pop ? menuDoOutro(linha.pop) : undefined} />
        ))}
        {arquivados > 0 && (
          <button type="button" className="pc-link-btn pc-self-start" onClick={onVerArquivados}>
            {verArquivados ? "Ocultar arquivados" : `Ver arquivados (${arquivados})`}
          </button>
        )}
      </div>
      {mensagem && <div className="ui-note">{mensagem}</div>}
    </div>
  );
}
