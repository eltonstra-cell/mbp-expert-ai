"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { Empresa, ProcedimentoOperacionalPadronizado } from "@/types";
import FieldVoiceTools from "@/components/FieldVoiceTools";
import { RowMenu, type ItemMenu } from "@/components/ui/RowMenu";
import { MENSAGEM_NORMA_ALTERADA, MENSAGEM_SEM_NORMA_APLICADA, popPrecisaRevisarPorNorma } from "@/lib/popsNorma";
import { COR_DO_ESTADO, botaoDaLinha, contadoresDaLista, estadoVisualDaLinha, filtrarLinhas, grupoComecaAberto, linhasDoGrupo, resumoDoGrupo, textoDoCriarDaNorma, POPS_EM_DESTAQUE, type FiltroDaLista, type LinhaComDetalhe } from "@/lib/popGestao";
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
  abas?: ReactNode | ((pendencias: number) => ReactNode);
  /** Chave do aparelho para lembrar quais grupos estão abertos (por empresa). */
  empresaId?: string;
  /** Responsável do estabelecimento (fonte: Empresa › Dados), na ponta direita do cabeçalho "Conjunto da norma". */
  responsavel?: { nome: string; cargo: string };
  onAlterarEmDados?: () => void;
  topo?: ReactNode;
  mensagem?: string;
};

type ContadorDeFiltro = { id: FiltroDaLista | null; rotulo: string; conta: (c: ReturnType<typeof contadoresDaLista>) => number };

// Contadores em texto (número em Outfit 22 + rótulo) que também filtram; o escolhido fica sublinhado em laranja e os zerados somem ("todos" sempre aparece).
const CONTADORES: ContadorDeFiltro[] = [
  { id: null, rotulo: "todos", conta: (c) => c.total },
  { id: "com-pendencia", rotulo: "com pendência", conta: (c) => c.vigentesComPendencia },
  { id: "aguardando", rotulo: "aguardando aprovação", conta: (c) => c.aguardando },
  { id: "rascunho", rotulo: "rascunhos", conta: (c) => c.rascunho },
  { id: "falta-criar", rotulo: "falta criar", conta: (c) => c.faltaCriar },
];

const ROTULO_DO_ESTADO_TEXTO: Record<string, string> = { Vigente: "Vigente", Rascunho: "Rascunho", "Aguardando aprovação": "Aguardando aprovação", "Revisão vencida": "Revisão vencida", "Falta criar": "Falta criar", Inativo: "Inativo" };

// Uma linha por POP: fundo branco, moldura de 1,5 px na cor do estado, bolinha + código + título; embaixo o estado em texto colorido.
// A linha inteira abre o POP (sem botão "Abrir"); ficam o "⋯" e, quando é a vez de quem olha, o "Aprovar".
function Linha({ linha, podeEditar, onAbrirFicha, onCriarDoModelo, menu }: { linha: LinhaComDetalhe; podeEditar: boolean; onAbrirFicha: (id: string, aba?: AbaFicha) => void; onCriarDoModelo: (catalogoId: string) => void; menu?: ItemMenu[] }) {
  const estado = estadoVisualDaLinha(linha);
  const cor = COR_DO_ESTADO[estado];
  const botao = botaoDaLinha(linha);
  const abre = Boolean(linha.pop);
  const naoConferido = Boolean(linha.pop && popNaoConferido(linha.pop));
  const revisar = Boolean(linha.pop && popPrecisaRevisarPorNorma(linha.pop));
  return (
    <div
      className={`pgl-linha${abre ? " is-clicavel" : ""}${linha.pop?.arquivado ? " is-arquivado" : ""}`}
      style={{ "--cor-do-estado": cor } as CSSProperties}
      role={abre ? "link" : undefined}
      tabIndex={abre ? 0 : undefined}
      aria-label={abre ? `Abrir ${linha.codigo ? `${linha.codigo} · ` : ""}${linha.titulo}` : undefined}
      title={linha.situacao !== "Falta criar" ? linha.acao.texto : undefined}
      onClick={abre ? () => onAbrirFicha(linha.pop!.id) : undefined}
      onKeyDown={abre ? (evento) => { if (evento.key === "Enter" && evento.target === evento.currentTarget) onAbrirFicha(linha.pop!.id); } : undefined}
    >
      <span className="pgl-bolinha" aria-hidden="true" />
      <div className="pgl-textos">
        <span className="pgl-titulo">{linha.codigo ? `${linha.codigo} · ${linha.titulo}` : linha.titulo}</span>
        <span className="pgl-estado">
          {linha.registroAtrasado && <span className="pgl-estado-atraso">Registro atrasado · </span>}
          {revisar && <span className="pgl-estado-revisar" title={MENSAGEM_NORMA_ALTERADA}>Revisar · </span>}
          <span className="pgl-estado-situacao" style={{ color: estado === "neutro" ? "#526477" : cor }}>{ROTULO_DO_ESTADO_TEXTO[linha.situacao] || linha.situacao}</span>
          {naoConferido && <span className="pgl-estado-cinza" title={ROTULO_NAO_CONFERIDO}> · {ROTULO_CURTO_NAO_CONFERIDO}</span>}
          {linha.detalhe ? <span className="pgl-estado-cinza"> · {linha.detalhe}</span> : null}
        </span>
      </div>
      <div className="pgl-botoes" onClick={(evento) => evento.stopPropagation()}>
        {linha.pop && botao.principal ? (
          // "Aprovar" não aprova com um clique: abre a ficha, no ponto onde o fluxo de aprovação já existe.
          <button type="button" className="pgl-aprovar" onClick={() => onAbrirFicha(linha.pop!.id, "documento")}>
            {botao.rotulo}
          </button>
        ) : !linha.pop && podeEditar && linha.definicao ? (
          <button type="button" className="ui-btn ui-btn--secondary" onClick={() => onCriarDoModelo(linha.definicao!.catalogoId)}>
            Criar do modelo
          </button>
        ) : !linha.pop ? (
          <span className="pgl-sem-botao">sem versão</span>
        ) : null}
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
  empresaId,
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
  // Cada grupo é um painel que abre e fecha; o estado fica no aparelho, por empresa. Sem escolha guardada, abre sozinho quando há POP fora de "vigente".
  const chaveDosGrupos = `mbp-pops-grupos:${empresaId || "empresa"}`;
  const [grupos, setGrupos] = useState<Record<string, boolean>>({});
  const [verTodosDoGrupo, setVerTodosDoGrupo] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      setGrupos(JSON.parse(window.localStorage.getItem(chaveDosGrupos) || "{}") || {});
    } catch {
      setGrupos({});
    }
  }, [chaveDosGrupos]);
  function alternarGrupo(id: string, abertoAgora: boolean) {
    const proximo = { ...grupos, [id]: !abertoAgora };
    setGrupos(proximo);
    try {
      window.localStorage.setItem(chaveDosGrupos, JSON.stringify(proximo));
    } catch {
      /* sem armazenamento: vale só nesta abertura */
    }
  }
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
    <span className="pgl-resp-linha">
      Responsável: <strong>{nomeDoResponsavel || "ainda não definido"}</strong>
      {nomeDoResponsavel && responsavel?.cargo ? ` · ${responsavel.cargo}` : ""}
      {onAlterarEmDados && (
        <>
          {" · "}
          <button type="button" className="pgl-resp-link" onClick={onAlterarEmDados}>
            alterar em Dados
          </button>
        </>
      )}
    </span>
  );

  const pendenciasDaLista = contadores.vigentesComPendencia;

  // Painel de um grupo: faixa de cabeçalho clicável (chevron), resumo e, aberto, as linhas. Com mais de 8 POPs mostra os 5 mais urgentes.
  function Grupo({ id, titulo, classe, linhas, todas, direita, aoFinalDasLinhas }: { id: string; titulo: string; classe: string; linhas: LinhaComDetalhe[]; todas: LinhaComDetalhe[]; direita?: ReactNode; aoFinalDasLinhas?: ReactNode }) {
    const aberto = grupos[id] ?? grupoComecaAberto(todas);
    const verTodos = Boolean(verTodosDoGrupo[id]);
    const mostradas = linhasDoGrupo(linhas, verTodos);
    return (
      <section className="pgl-grupo" aria-label={titulo}>
        <div className={`pgg-faixa ${classe}`}>
          <button type="button" className="pgg-faixa-botao" aria-expanded={aberto} onClick={() => alternarGrupo(id, aberto)}>
            <span className="pgg-faixa-seta" aria-hidden="true">{aberto ? "▾" : "▸"}</span>
            <span className="pgg-faixa-titulo">{titulo}</span>
            <span className="pgg-faixa-resumo">{resumoDoGrupo(todas)}</span>
          </button>
          {direita}
        </div>
        {aberto && (
          <div className="pgl-grupo-corpo">
            {aoFinalDasLinhas}
            {linhas.length === 0 && <div className="ui-empty">Nenhum POP nesta situação.</div>}
            {mostradas.map((linha) => (
              <Linha key={linha.chave} linha={linha} podeEditar={podeEditar} onAbrirFicha={onAbrirFicha} onCriarDoModelo={onCriarDoModelo} menu={id === "outros" && linha.pop ? menuDoOutro(linha.pop) : undefined} />
            ))}
            {linhas.length > mostradas.length && (
              <button type="button" className="pc-link-btn pc-self-start" onClick={() => setVerTodosDoGrupo((atual) => ({ ...atual, [id]: true }))}>
                Ver todos ({linhas.length})
              </button>
            )}
            {verTodos && linhas.length > POPS_EM_DESTAQUE && linhas.length > 8 && (
              <button type="button" className="pc-link-btn pc-self-start" onClick={() => setVerTodosDoGrupo((atual) => ({ ...atual, [id]: false }))}>
                Mostrar só os {POPS_EM_DESTAQUE} mais urgentes
              </button>
            )}
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="pgl">
      <h2 className="sr-only">POPs</h2>

      {abas ? (typeof abas === "function" ? abas(pendenciasDaLista) : abas) : null}
      {topo}

      {(conjunto.length === 0 || avisoSemVinculo) && (
        <div className="pgl-avisos">
          {conjunto.length === 0 && (
            <div className="priv-faixa" role="status">
              <span>{MENSAGEM_SEM_NORMA_APLICADA}</span>
              {onIrParaNorma && (
                <button type="button" className="ui-btn ui-btn--secondary" onClick={onIrParaNorma}>
                  Ir para Norma aplicável
                </button>
              )}
            </div>
          )}
          {avisoSemVinculo}
        </div>
      )}

      <div className="pgg-contadores-linha">
        <div className="pgg-contadores" role="group" aria-label="Mostrar POPs por situação">
          {CONTADORES.filter((item) => item.id === null || item.conta(contadores) > 0).map((item) => {
            const ativo = filtro === item.id;
            return (
              <button key={item.rotulo} type="button" className={`pgg-conta${ativo ? " is-ativo" : ""}`} aria-pressed={ativo} onClick={() => setFiltro(item.id === null ? null : filtro === item.id ? null : item.id)}>
                <span className="pgg-conta-num">{item.conta(contadores)}</span> <span className="pgg-conta-rotulo">{item.rotulo}</span>
              </button>
            );
          })}
        </div>
        {podeEditar && (
          <div className="pgl-acoes">
            {temConjunto && faltamCriar > 0 && (
              <button type="button" className="ui-btn ui-btn--secondary" onClick={onCriarFaltantes} title={textoDoCriarDaNorma(faltamCriar)}>
                Criar POPs da norma ({faltamCriar})
              </button>
            )}
            <button type="button" className="pgl-adicionar-botao" aria-haspopup="dialog" onClick={() => (onCriarDeModelo ? setDeModelo(true) : setAdicionando(true))}>
              + Adicionar POP
            </button>
          </div>
        )}
      </div>

      <div className="pgl-lista">
        {temConjunto && (
          <Grupo id="conjunto" titulo="Conjunto da norma" classe="pgg-faixa--norma" linhas={conjuntoVisivel} todas={conjunto} direita={<span className="pgg-faixa-direita">{respostaDoResponsavel}</span>} />
        )}

        <Grupo
          id="outros"
          titulo="Outros POPs e documentos da empresa"
          classe="pgg-faixa--outros"
          linhas={outrosVisiveis}
          todas={outros}
          direita={!temConjunto ? <span className="pgg-faixa-direita">{respostaDoResponsavel}</span> : undefined}
          aoFinalDasLinhas={
            <>
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
              {outros.length === 0 && <div className="ui-empty">Nenhum outro POP ou documento cadastrado.</div>}
            </>
          }
        />
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
