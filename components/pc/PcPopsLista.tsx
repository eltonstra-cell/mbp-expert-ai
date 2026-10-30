"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import type { Empresa, ProcedimentoOperacionalPadronizado } from "@/types";
import FieldVoiceTools from "@/components/FieldVoiceTools";
import { RowMenu, type ItemMenu } from "@/components/ui/RowMenu";
import MenuMais, { type ItemDoMenuMais } from "@/components/pc/MenuMais";
import { MENSAGEM_NORMA_ALTERADA, MENSAGEM_SEM_NORMA_APLICADA, popPrecisaRevisarPorNorma } from "@/lib/popsNorma";
import { COR_DO_ESTADO, botaoDaLinha, contadoresDaLista, estadoVisualDaLinha, textoDoCriarDaNorma, type LinhaComDetalhe } from "@/lib/popGestao";
import { acoesDoPop } from "@/lib/menuActions";
import { AVISO_JA_TEM_DO_MODELO, adicionarPop, arquivarPop, duplicarPop } from "@/lib/pops";
import MotivoDaMudanca from "@/components/pc/MotivoDaMudanca";
import PcModelosPop from "@/components/pc/PcModelosPop";
import { ROTULO_CURTO_NAO_CONFERIDO, ROTULO_NAO_CONFERIDO, popNaoConferido } from "@/lib/popConferencia";
import type { ResultadoDaCriacao } from "@/lib/popModelos";
import type { AbaFicha } from "@/components/pc/PcFichaPop";

const contadoresDe = (linhas: LinhaComDetalhe[]) => ({ pendencias: contadoresDaLista(linhas).vigentesComPendencia });

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
  /** Responsável do estabelecimento (fonte: Empresa › Dados), no subtítulo do cabeçalho "N POPs · Responsável". */
  responsavel?: { nome: string; cargo: string };
  onAlterarEmDados?: () => void;
  topo?: ReactNode;
  mensagem?: string;
  /** Quem arquiva: o motivo, o autor e a data ficam gravados no POP. */
  autor?: { nome: string; id?: string };
};

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
          {naoConferido && !linha.detalhe?.startsWith("Etapa") && <span className="pgl-estado-cinza" title={ROTULO_NAO_CONFERIDO}> · {ROTULO_CURTO_NAO_CONFERIDO}</span>}
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
  responsavel,
  onAlterarEmDados,
  topo,
  mensagem,
  autor,
}: Props) {
  const [arquivando, setArquivando] = useState<ProcedimentoOperacionalPadronizado | null>(null);
  const [avisoLocal, setAvisoLocal] = useState("");
  const [adicionando, setAdicionando] = useState(false);
  const [deModelo, setDeModelo] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [erro, setErro] = useState<{ campo: "titulo" | "codigo"; aviso: string } | null>(null);
  const linhasDosPops = [...conjunto, ...outros].filter((linha) => linha.pop);
  const faltantes = conjunto.filter((linha) => !linha.pop && linha.definicao);
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
            return { rotulo: "Duplicar", onClick: () => {
              const depois = duplicarPop(pops, pop.id, crypto.randomUUID());
              if (depois === pops) setAvisoLocal(AVISO_JA_TEM_DO_MODELO);
              else {
                setAvisoLocal("");
                onPersistir(depois);
              }
            } };
          case "arquivar":
            return { rotulo: "Arquivar", onClick: () => setArquivando(pop) };
          case "desarquivar":
            return { rotulo: "Desarquivar", onClick: () => onPersistir(arquivarPop(pops, pop.id, false)) };
          default:
            return { rotulo: "Excluir POP", perigo: true, confirmar: `Excluir o POP "${pop.titulo || pop.codigo}"?`, onClick: () => onPersistir(pops.filter((item) => item.id !== pop.id)) };
        }
      });
  }

  // Menu ⋯ do cabeçalho: criar o que falta do conjunto da norma, ver arquivados e trocar o responsável (os POPs que faltam não ocupam linha na lista).
  const itensDoMenu: ItemDoMenuMais[] = [];
  if (podeEditar && temConjunto) {
    for (const linha of faltantes) itensDoMenu.push({ rotulo: `Criar ${linha.codigo ? `${linha.codigo} · ` : ""}${linha.titulo}`, onClick: () => onCriarDoModelo(linha.definicao!.catalogoId) });
    if (faltantes.length > 1) itensDoMenu.push({ rotulo: `Criar os ${faltantes.length} POPs da norma`, onClick: onCriarFaltantes, titulo: textoDoCriarDaNorma(faltamCriar) });
  }
  if (arquivados > 0) itensDoMenu.push({ rotulo: verArquivados ? "Ocultar arquivados" : `Ver arquivados (${arquivados})`, onClick: onVerArquivados });
  if (onAlterarEmDados) itensDoMenu.push({ rotulo: "Alterar o responsável em Dados", onClick: onAlterarEmDados });

  const formularios = (
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
    </>
  );

  return (
    <div className="pgl pgl--indice">
      {abas ? <aside className="pgl-indice">{typeof abas === "function" ? abas(contadoresDe(linhasDosPops).pendencias) : abas}</aside> : null}
      <div className="pgl-conteudo">
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

      <div className="pgl-cab">
        <div className="pgl-cab-textos">
          <h2 className="pgl-cab-titulo">POPs</h2>
          <p className="pgl-cab-sub">
            {linhasDosPops.length} {linhasDosPops.length === 1 ? "POP" : "POPs"} · Responsável: <strong>{nomeDoResponsavel || "ainda não definido"}</strong>
          </p>
        </div>
        {podeEditar && (
          <div className="pgl-acoes">
            <button type="button" className="pgl-adicionar-botao" aria-haspopup="dialog" aria-label="Adicionar POP" onClick={() => (onCriarDeModelo ? setDeModelo(true) : setAdicionando(true))}>
              <span className="pgl-add-longo">+ Adicionar POP</span>
              <span className="pgl-add-curto" aria-hidden="true">+ POP</span>
            </button>
            {itensDoMenu.length > 0 && <MenuMais rotulo="Mais ações dos POPs" itens={itensDoMenu} />}
          </div>
        )}
      </div>

      {formularios}
      <div className="pgl-lista">
        {linhasDosPops.length === 0 && !adicionando && !deModelo && <div className="ui-empty">Nenhum POP cadastrado.</div>}
        {linhasDosPops.map((linha) => (
          <Linha key={linha.chave} linha={linha} podeEditar={podeEditar} onAbrirFicha={onAbrirFicha} onCriarDoModelo={onCriarDoModelo} menu={!linha.definicao && linha.pop ? menuDoOutro(linha.pop) : undefined} />
        ))}
      </div>
      {mensagem && <div className="ui-note">{mensagem}</div>}
      {avisoLocal && <div className="ui-note" role="status">{avisoLocal}</div>}
      {arquivando && (
        <MotivoDaMudanca
          titulo={`Arquivar ${arquivando.codigo || "o POP"}`}
          explicacao="O POP sai da lista, mas continua guardado. O motivo, quem e quando ficam registrados."
          rotuloDoBotao="Arquivar"
          onCancelar={() => setArquivando(null)}
          onConfirmar={(motivo) => {
            onPersistir(arquivarPop(pops, arquivando.id, true, { motivo, porNome: autor?.nome || "", porId: autor?.id, em: new Date().toISOString() }));
            setArquivando(null);
          }}
        />
      )}
      </div>
    </div>
  );
}
