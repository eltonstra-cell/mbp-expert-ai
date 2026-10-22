"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import type { Empresa, ProcedimentoOperacionalPadronizado } from "@/types";
import FieldVoiceTools from "@/components/FieldVoiceTools";
import { RowMenu, type ItemMenu } from "@/components/ui/RowMenu";
import { MENSAGEM_NORMA_ALTERADA, MENSAGEM_SEM_NORMA_APLICADA, popPrecisaRevisarPorNorma } from "@/lib/popsNorma";
import { CORES_DA_SITUACAO, botaoDaLinha, contadoresDaLista, etiquetasDaLinha, filtrarLinhas, linhaPedeAtencao, textoDoCriarDaNorma, type FiltroDaLista, type LinhaComDetalhe } from "@/lib/popGestao";
import { acoesDoPop } from "@/lib/menuActions";
import { adicionarPop, arquivarPop, duplicarPop } from "@/lib/pops";
import PcModelosPop from "@/components/pc/PcModelosPop";
import { ROTULO_CURTO_NAO_CONFERIDO, ROTULO_NAO_CONFERIDO, popNaoConferido } from "@/lib/popConferencia";
import type { ResultadoDaCriacao } from "@/lib/popModelos";
import type { AbaFicha } from "@/components/pc/PcFichaPop";

type Props = {
  empresa: Pick<Empresa, "normasAplicadas" | "pops">;
  conjunto: LinhaComDetalhe[];
  outros: LinhaComDetalhe[];
  podeEditar: boolean;
  arquivados: number;
  verArquivados: boolean;
  onVerArquivados: () => void;
  /** Quantos POPs do conjunto da norma ainda não existem (criar o conjunto é só de RT e Administrador). */
  faltamCriar: number;
  avisoSemVinculo?: ReactNode;
  onIrParaNorma?: () => void;
  onCriarFaltantes: () => void;
  onCriarDoModelo: (catalogoId: string) => void;
  /** "A partir de modelo": cria um rascunho do catálogo de modelos e abre a ficha. */
  onCriarDeModelo?: (modeloId: string, codigo: string, titulo: string) => ResultadoDaCriacao;
  /** Abre a ficha do POP; "Aprovar" abre a mesma ficha, na aba onde o fluxo de aprovação já existe. */
  onAbrirFicha: (popId: string, aba?: AbaFicha) => void;
  pops: ProcedimentoOperacionalPadronizado[];
  onPersistir: (pops: ProcedimentoOperacionalPadronizado[]) => void;
  /** Abas da seção (Manual, POPs, Programas…): ficam na linha 2, ao lado da coluna de botões. */
  abas?: ReactNode;
  /** Responsável do estabelecimento (fonte: Empresa › Dados), na ponta direita do cabeçalho "Conjunto da norma". */
  responsavel?: { nome: string; cargo: string };
  onAlterarEmDados?: () => void;
  topo?: ReactNode;
  mensagem?: string;
};

type ChipDeFiltro = { id: FiltroDaLista; classe: string; rotulo: string; conta: (c: ReturnType<typeof contadoresDaLista>) => number };

const CHIPS: ChipDeFiltro[] = [
  { id: "em-dia", classe: "pgl-conta--ok", rotulo: "em dia", conta: (c) => c.vigentesEmDia },
  { id: "com-pendencia", classe: "pgl-conta--pend", rotulo: "com pendência", conta: (c) => c.vigentesComPendencia },
  { id: "aguardando", classe: "pgl-conta--aguarda", rotulo: "aguardando aprovação", conta: (c) => c.aguardando },
  { id: "rascunho", classe: "pgl-conta--rascunho", rotulo: "rascunhos", conta: (c) => c.rascunho },
  { id: "falta-criar", classe: "pgl-conta--falta", rotulo: "falta criar", conta: (c) => c.faltaCriar },
];

function Etiqueta({ situacao }: { situacao: LinhaComDetalhe["situacao"] }) {
  const cor = CORES_DA_SITUACAO[situacao];
  return (
    <span className="pgl-etiqueta" style={{ background: cor.fundo, color: cor.texto }}>
      {situacao}
    </span>
  );
}

// Uma linha por POP: barra de cor, "POP-NN · nome" (quebra, nunca é cortado), etiquetas de status e o botão. A altura nasce do conteúdo.
function Linha({ linha, podeEditar, onAbrirFicha, onCriarDoModelo, menu }: { linha: LinhaComDetalhe; podeEditar: boolean; onAbrirFicha: (id: string, aba?: AbaFicha) => void; onCriarDoModelo: (catalogoId: string) => void; menu?: ItemMenu[] }) {
  const cor = CORES_DA_SITUACAO[linha.situacao];
  const atencao = linhaPedeAtencao(linha);
  const botao = botaoDaLinha(linha);
  return (
    // A barra de cor de 6 px à esquerda é um sombreado interno (acompanha o canto e a altura da linha, que cresce com o título).
    <div className={`pgl-linha${atencao ? " is-destaque" : ""}${linha.pop?.arquivado ? " is-arquivado" : ""}`} style={{ "--faixa": cor.faixa } as CSSProperties} title={linha.situacao !== "Falta criar" ? linha.acao.texto : undefined}>
      <span className="pgl-titulo">{linha.codigo ? `${linha.codigo} · ${linha.titulo}` : linha.titulo}</span>
      <div className="pgl-etiquetas">
        {/* Alerta primeiro, situação por último (ordem em `etiquetasDaLinha`). */}
        {etiquetasDaLinha(linha, { revisar: Boolean(linha.pop && popPrecisaRevisarPorNorma(linha.pop)), naoConferido: Boolean(linha.pop && popNaoConferido(linha.pop)) }).map((etiqueta) =>
          etiqueta === "atraso" ? (
            <span key={etiqueta} className="pgl-etiqueta pgl-etiqueta--atraso">Registro atrasado</span>
          ) : etiqueta === "revisar" ? (
            <span key={etiqueta} className="pop-revisar" title={MENSAGEM_NORMA_ALTERADA}>
              revisar
            </span>
          ) : etiqueta === "nao-conferido" ? (
            <span key={etiqueta} className="pop-revisar pop-nao-conferido" title={ROTULO_NAO_CONFERIDO}>{ROTULO_CURTO_NAO_CONFERIDO}</span>
          ) : (
            <Etiqueta key={etiqueta} situacao={linha.situacao} />
          )
        )}
      </div>
      <div className="pgl-botoes">
        {linha.pop ? (
          // "Aprovar" não aprova com um clique: abre a ficha, no ponto onde o fluxo de aprovação já existe.
          <button type="button" className={`ui-btn ui-btn--small ${botao.principal ? "ui-btn--criar" : "ui-btn--secondary"}`} onClick={() => onAbrirFicha(linha.pop!.id, botao.principal ? "documento" : undefined)}>
            {botao.rotulo}
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

// Documentos › POPs: abas, filtros por situação, a coluna de botões da direita e a lista (uma linha por POP).
export default function PcPopsLista({
  empresa,
  conjunto,
  outros,
  podeEditar,
  arquivados,
  verArquivados,
  onVerArquivados,
  faltamCriar,
  avisoSemVinculo,
  onIrParaNorma,
  onCriarFaltantes,
  onCriarDoModelo,
  onCriarDeModelo,
  onAbrirFicha,
  pops,
  onPersistir,
  abas,
  responsavel,
  onAlterarEmDados,
  topo,
  mensagem,
}: Props) {
  const [adicionando, setAdicionando] = useState(false);
  const [deModelo, setDeModelo] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [erro, setErro] = useState<{ campo: "titulo" | "codigo"; aviso: string } | null>(null);
  // Filtro só na tela (não é guardado): cada chip de contagem mostra só os POPs daquela situação; "Todos" limpa.
  const [filtro, setFiltro] = useState<FiltroDaLista | null>(null);
  const contadores = contadoresDaLista([...conjunto, ...outros]);
  const conjuntoVisivel = filtrarLinhas(conjunto, filtro);
  const outrosVisiveis = filtrarLinhas(outros, filtro);
  const temConjunto = conjunto.length > 0;
  const nomeDoResponsavel = (responsavel?.nome || "").trim();

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
    setAdicionando(false);
  }

  function cancelarAdicao() {
    setAdicionando(false);
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

  const respostaDoResponsavel = (
    <div className="pgl-resp-linha">
      <span>
        Responsável: <strong>{nomeDoResponsavel || "ainda não definido"}</strong>
        {nomeDoResponsavel && responsavel?.cargo ? ` · ${responsavel.cargo}` : ""}
      </span>
      {onAlterarEmDados && (
        <button type="button" className="pgl-resp-link" onClick={onAlterarEmDados}>
          Alterar em Dados
        </button>
      )}
    </div>
  );

  return (
    <div className="pgl">
      <h2 className="sr-only">POPs</h2>

      {topo}

      {(conjunto.length === 0 || avisoSemVinculo) && (
        <div className="pgl-avisos">
          {conjunto.length === 0 && (
            <div className="priv-faixa" role="status">
              <span>{MENSAGEM_SEM_NORMA_APLICADA}</span>
              {onIrParaNorma && (
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={onIrParaNorma}>
                  Ir para Norma aplicável
                </button>
              )}
            </div>
          )}
          {avisoSemVinculo}
        </div>
      )}

      <div className={`pgl-cabeca${podeEditar ? " pgl-cabeca--com-lateral" : ""}`}>
        <div className="pgl-cabeca-esq">
          {abas}
          <div className="pgl-filtros" role="group" aria-label="Mostrar POPs por situação">
            <span className="pgl-filtros-rotulo">Mostrar:</span>
            <button type="button" className={`pgl-chip pgl-chip--todos${filtro === null ? " is-ativo" : ""}`} aria-pressed={filtro === null} onClick={() => setFiltro(null)}>
              Todos
            </button>
            {CHIPS.map((chip) => (
              <button key={chip.id} type="button" className={`pgl-chip ${chip.classe}${filtro === chip.id ? " is-ativo" : ""}`} aria-pressed={filtro === chip.id} onClick={() => setFiltro(filtro === chip.id ? null : chip.id)}>
                <b>{chip.conta(contadores)}</b> {chip.rotulo}
              </button>
            ))}
          </div>
        </div>
        {podeEditar && (
          <div className="pgl-lateral">
            {temConjunto && <p className="pgl-apoio">{textoDoCriarDaNorma(faltamCriar)}</p>}
            <div className="pgl-criar">
              {temConjunto && (
                <button type="button" className={`ui-btn ui-btn--criar ui-btn--small${faltamCriar === 0 ? " is-desligado" : ""}`} disabled={faltamCriar === 0} onClick={onCriarFaltantes}>
                  Criar POPs da norma
                </button>
              )}
              {/* Só um laranja vivo por bloco: este botão fica laranja quando o de cima está desligado (ou não existe). */}
              <button type="button" className={`ui-btn ui-btn--small ${temConjunto && faltamCriar > 0 ? "ui-btn--secondary" : "ui-btn--criar"}`} aria-haspopup="dialog" onClick={() => (onCriarDeModelo ? setDeModelo(true) : setAdicionando(true))}>
                + Adicionar POP
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="pgl-lista">
        {temConjunto && (
          <>
            <div className="pgl-secao-linha">
              <h3 className="pgl-secao">Conjunto da norma</h3>
              {respostaDoResponsavel}
            </div>
            {conjuntoVisivel.length === 0 && <div className="ui-empty">Nenhum POP nesta situação.</div>}
            {conjuntoVisivel.map((linha) => (
              <Linha key={linha.chave} linha={linha} podeEditar={podeEditar} onAbrirFicha={onAbrirFicha} onCriarDoModelo={onCriarDoModelo} />
            ))}
          </>
        )}

        <div className="pgl-secao-linha">
          <h3 className="pgl-secao">Outros POPs e documentos da empresa</h3>
          {!temConjunto && respostaDoResponsavel}
        </div>
        {podeEditar && deModelo && onCriarDeModelo && (
          <PcModelosPop
            pops={pops}
            onCancelar={() => setDeModelo(false)}
            onEmBranco={() => {
              setDeModelo(false);
              setAdicionando(true);
            }}
            onCriar={(modeloId, codigo, titulo) => {
              const resultado = onCriarDeModelo(modeloId, codigo, titulo);
              if (resultado.ok) setDeModelo(false);
              return resultado;
            }}
          />
        )}
        {podeEditar && adicionando && (
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
            <button type="button" className="ui-btn ui-btn--secondary" onClick={cancelarAdicao}>
              Cancelar
            </button>
            <button type="button" className="ui-btn ui-btn--save" onClick={adicionar}>
              Salvar
            </button>
          </div>
        )}
        {outros.length === 0 ? <div className="ui-empty">Nenhum outro POP ou documento cadastrado.</div> : outrosVisiveis.length === 0 ? <div className="ui-empty">Nenhum POP nesta situação.</div> : null}
        {outrosVisiveis.map((linha) => (
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
