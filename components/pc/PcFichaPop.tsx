"use client";

import PcHistoricoDoPop from "@/components/pc/PcHistoricoDoPop";
import { veNomesNoHistorico } from "@/lib/popHistorico";
import { useEffect, useMemo, useState } from "react";
import type { CapaDosPops, ComprovanteTerceiro, Empresa, ProcedimentoOperacionalPadronizado, UsuarioSistema } from "@/types";
import PcPopEditor from "@/components/pc/PcPopEditor";
import type { CabecalhoDeImpressao } from "@/lib/printFooter";
import PcRegistrosDoPop from "@/components/pc/PcRegistrosDoPop";
import PcTreinamentoDoPop from "@/components/pc/PcTreinamentoDoPop";
import PcComprovantes from "@/components/pc/PcComprovantes";
import PcResumoDoPop from "@/components/pc/PcResumoDoPop";
import ColherCiencia from "@/components/pc/ColherCiencia";
import MotivoDaMudanca from "@/components/pc/MotivoDaMudanca";
import MenuMais, { type ItemDoMenuMais } from "@/components/pc/MenuMais";
import type { RegistrosEmpresaValor } from "@/components/RegistrosEmpresaContext";
import { MENSAGEM_NORMA_ALTERADA, hojeISO, motivoParaNaoAprovar, popPrecisaRevisarPorNorma, popVigente } from "@/lib/popsNorma";
import { etapaDoPop, TOTAL_DE_ETAPAS } from "@/lib/popCiclo";
import { AVISO_DA_CIENCIA, cienciaPorFuncao, equipeDaCiencia } from "@/lib/cienciaPop";
import { podeInativarPop } from "@/lib/popInativo";
import { formatarData } from "@/lib/dataLocal";
import { mensagemDeComprovanteVazio } from "@/lib/comprovantePop";
import type { AlvoDaPendencia } from "@/lib/popPendencias";
import type { EstiloDoCartaz } from "@/lib/cartazLavagem";

export type AbaFicha = "resumo" | "documento" | "registros" | "historico" | "comprovantes" | "quemleu";
type AbaVisivel = "resumo" | "documento" | "registros" | "historico";

type Props = {
  pop: ProcedimentoOperacionalPadronizado;
  empresa: Pick<Empresa, "normasAplicadas" | "responsavelEstabelecimento"> & Partial<Pick<Empresa, "nomeFantasia" | "razaoSocial" | "cnpj">>;
  usuario: UsuarioSistema | null;
  podeEditar: boolean;
  onImprimir?: (titulo: string, cabecalho: CabecalhoDeImpressao) => void;
  responsavelDoEstabelecimento?: { nome: string; cargo: string; usuarioId?: string };
  /** Todos os POPs da empresa (destinos de "Mover para outro POP"). */
  popsDaEmpresa?: ProcedimentoOperacionalPadronizado[];
  podeAprovar: boolean;
  contexto: RegistrosEmpresaValor | null;
  mensagem?: string;
  abaInicial?: AbaFicha;
  /** Pendência a mostrar em destaque ao abrir (ex.: o bloco de conferência no Resumo). */
  alvoInicial?: AlvoDaPendencia;
  onVoltar: () => void;
  onSalvarRascunho: (pop: ProcedimentoOperacionalPadronizado) => void;
  onEnviar: (pop: ProcedimentoOperacionalPadronizado) => void;
  onAprovar: (pop: ProcedimentoOperacionalPadronizado) => void;
  onNovaVersao: (pop: ProcedimentoOperacionalPadronizado) => void;
  onDescartar?: (pop: ProcedimentoOperacionalPadronizado) => void;
  /** Grava na hora a conferência do conteúdo de modelo (itens marcados e "Marcar como conferido"). */
  onAtualizarConferencia?: (pop: ProcedimentoOperacionalPadronizado) => void;
  /** Arquivar, inativar e reativar: o motivo é obrigatório; quem e quando ficam gravados junto. */
  onArquivar?: (motivo: string) => void;
  onInativar?: (motivo: string) => void;
  onReativar?: () => void;
  /** Capa dos POPs da empresa (opcional, desligada por padrão) e como salvá-la. */
  capaDaEmpresa?: CapaDosPops;
  onSalvarCapa?: (capa: CapaDosPops) => void;
  /** Cartaz de lavagem de mãos: tema guardado na empresa e como salvar tema e logotipo. */
  estiloDoCartaz?: EstiloDoCartaz;
  onSalvarCartaz?: (estilo: EstiloDoCartaz, logotipo: string | undefined) => void;
};

const ROTULO: Record<AbaVisivel, string> = { resumo: "Resumo", documento: "Documento", registros: "Registros", historico: "Histórico" };

// As abas antigas foram incorporadas: Comprovantes entram em Registros; versões, aprovação e ciência por pessoa, em Histórico.
const ABA_DO_PEDIDO: Record<AbaFicha, AbaVisivel> = { resumo: "resumo", documento: "documento", registros: "registros", historico: "historico", comprovantes: "registros", quemleu: "historico" };

const dataBr = (iso?: string) => formatarData(iso);

// Ficha do POP (rodada 12e): 4 abas. O Resumo mostra as 6 etapas do ciclo e a ação da etapa atual (lib/popCiclo.ts, derivada do estado).
export default function PcFichaPop({ pop, empresa, usuario, podeEditar, onImprimir, responsavelDoEstabelecimento, popsDaEmpresa, podeAprovar, contexto, mensagem, abaInicial = "resumo", alvoInicial, onSalvarRascunho, onEnviar, onAprovar, onNovaVersao, onDescartar, onAtualizarConferencia, onArquivar, onInativar, onReativar, capaDaEmpresa, onSalvarCapa, estiloDoCartaz, onSalvarCartaz }: Props) {
  const [aba, setAba] = useState<AbaVisivel>(ABA_DO_PEDIDO[abaInicial]);
  const hoje = hojeISO();
  useEffect(() => setAba(ABA_DO_PEDIDO[abaInicial]), [abaInicial]);
  const [destacarConferencia, setDestacarConferencia] = useState(alvoInicial === "conferencia");
  const [mudanca, setMudanca] = useState<"arquivar" | "inativar" | null>(null);
  const [colhendo, setColhendo] = useState(false);
  const [pedidoDeImpressao, setPedidoDeImpressao] = useState<{ n: number; assinar: boolean } | undefined>(undefined);
  function irParaAConferencia() {
    setAba("resumo");
    setDestacarConferencia(true);
  }
  useEffect(() => {
    if (!destacarConferencia || aba !== "resumo") return;
    const temporizador = setTimeout(() => {
      const bloco = document.getElementById("ficha-conferir");
      bloco?.scrollIntoView({ behavior: "smooth", block: "center" });
      bloco?.focus({ preventScroll: true });
    }, 60);
    return () => clearTimeout(temporizador);
  }, [destacarConferencia, aba]);

  const vigente = popVigente(pop);
  const verPessoas = Boolean(contexto?.podeGerenciarPessoas);
  const verComprovantes = Boolean(contexto?.podeVerComprovantes);
  const equipe = useMemo(
    () => (vigente && contexto && verPessoas ? equipeDaCiencia(pop.id, vigente.versao, contexto.colaboradores, contexto.leituras) : null),
    [pop.id, vigente, contexto, verPessoas]
  );
  const dadosDoResponsavel = responsavelDoEstabelecimento ? { nome: responsavelDoEstabelecimento.nome, cargo: responsavelDoEstabelecimento.cargo } : undefined;
  const etapa = etapaDoPop(pop, { equipe: equipe ? { total: equipe.total, confirmadas: equipe.confirmadas } : undefined, dadosDoResponsavel, hoje });
  const estado =
    pop.status === "Aprovado" ? { texto: "Vigente", cor: "#21805B", corTexto: "#1B2433" } : pop.status === "Inativo" ? { texto: "Inativo", cor: "#6B7587", corTexto: "#1B2433" } : pop.arquivado ? { texto: "Arquivado", cor: "#6B7587", corTexto: "#1B2433" } : { texto: pop.status, cor: "#AF640A", corTexto: "#8A5A00" };
  const abas: AbaVisivel[] = ["resumo", "documento", ...(contexto ? (["registros"] as AbaVisivel[]) : []), "historico"];
  const editorVisivel = aba === "documento" || aba === "historico";

  function imprimir(assinar: boolean) {
    setAba("documento");
    setPedidoDeImpressao((atual) => ({ n: (atual?.n || 0) + 1, assinar }));
  }

  const itensDoMenu: ItemDoMenuMais[] = [];
  if (vigente) itensDoMenu.push({ rotulo: "Imprimir para assinar", onClick: () => imprimir(true), titulo: "PDF do POP com campo de assinatura do responsável" });
  if (podeEditar && onInativar && podeInativarPop(pop)) itensDoMenu.push({ rotulo: "Inativar", onClick: () => setMudanca("inativar"), assumeFoco: true });
  if (podeEditar && onReativar && pop.status === "Inativo") itensDoMenu.push({ rotulo: "Reativar", onClick: () => onReativar() });
  if (podeEditar && onArquivar && !pop.arquivado) itensDoMenu.push({ rotulo: "Arquivar", onClick: () => setMudanca("arquivar"), perigo: true, assumeFoco: true });

  const comprovantesDoPop = (contexto?.comprovantes || []).filter((item: ComprovanteTerceiro) => item.popId === pop.id);
  const funcoes = equipe ? cienciaPorFuncao(equipe.linhas) : [];
  const hashAprovado = vigente?.aprovacao?.hashDoConteudo;

  return (
    <section className="ficha" aria-label="Ficha do POP">
      <div className="ficha-topo">
        <div className="ficha-titulo-linha">
          <h1 className="ficha-titulo">{`${pop.codigo ? `${pop.codigo} · ` : ""}${pop.titulo || "POP"}`}</h1>
          {itensDoMenu.length > 0 && <MenuMais rotulo="Mais ações do POP" itens={itensDoMenu} />}
        </div>
        <p className="rz-estado">
          <i className="rz-bolinha" style={{ background: estado.cor }} aria-hidden="true" />
          <span className="rz-estado-nome" style={{ color: estado.corTexto }}>{estado.texto}</span>
          <span className="rz-estado-versao">
            {` · v${pop.versao}`}
            {etapa ? ` · etapa ${etapa.numero} de ${TOTAL_DE_ETAPAS}` : ""}
          </span>
          {popPrecisaRevisarPorNorma(pop) && (
            <span className="pop-revisar" title={MENSAGEM_NORMA_ALTERADA}>
              revisar
            </span>
          )}
        </p>
        <div className="ficha-abas ficha-abas--texto" role="tablist" aria-label="Partes do POP">
          {abas.map((id) => (
            <button key={id} type="button" role="tab" aria-selected={aba === id} className={`ficha-aba${aba === id ? " is-ativa" : ""}`} onClick={() => setAba(id)}>
              {ROTULO[id]}
            </button>
          ))}
        </div>
      </div>

      <div className="ficha-corpo">
        {aba === "resumo" && (
          <PcResumoDoPop
            pop={pop}
            etapa={etapa}
            dadosDoResponsavel={dadosDoResponsavel}
            nomeDoAprovador={empresa.responsavelEstabelecimento?.nome || ""}
            motivoParaNaoAprovar={motivoParaNaoAprovar(usuario, empresa)}
            podeEditar={podeEditar}
            podeAprovar={podeAprovar}
            quemConfere={{ nome: usuario?.nome || responsavelDoEstabelecimento?.nome, cargo: usuario?.cargo || responsavelDoEstabelecimento?.cargo }}
            equipe={equipe}
            destacarConferencia={destacarConferencia}
            onAbrirDocumento={() => setAba("documento")}
            onAtualizarPop={(novo) => (onAtualizarConferencia ? onAtualizarConferencia(novo) : onSalvarRascunho(novo))}
            onEnviar={onEnviar}
            onAprovar={onAprovar}
            onColherCiencia={verPessoas && vigente && contexto ? () => setColhendo(true) : undefined}
            onImprimirCopia={vigente ? () => imprimir(false) : undefined}
            onAbrirRegistros={contexto ? () => setAba("registros") : undefined}
            onNovaVersao={() => onNovaVersao(pop)}
          />
        )}

        <div hidden={!editorVisivel} className="ficha-editor">
          <PcPopEditor
            key={`${pop.id}-${pop.versao}-${pop.status}`}
            pop={pop}
            empresa={empresa}
            usuario={usuario}
            podeEditar={podeEditar}
            onImprimir={onImprimir}
            responsavelDoEstabelecimento={responsavelDoEstabelecimento}
            mensagem={mensagem}
            parte={aba === "historico" ? "historico" : "documento"}
            onSalvarRascunho={onSalvarRascunho}
            onEnviar={onEnviar}
            onAprovar={onAprovar}
            onNovaVersao={onNovaVersao}
            onDescartar={onDescartar}
            onIrParaConferencia={pop.origemModelo ? irParaAConferencia : undefined}
            capaDaEmpresa={capaDaEmpresa}
            onSalvarCapa={onSalvarCapa}
            estiloDoCartaz={estiloDoCartaz}
            onSalvarCartaz={onSalvarCartaz}
            onTrocarIconeDeCapa={onAtualizarConferencia}
            pedidoDeImpressao={pedidoDeImpressao}
          />
        </div>

        {aba === "registros" && contexto && (
          <div className="pop-registros-area">
            <PcRegistrosDoPop
              pop={pop}
              mensagemDoComprovante={mensagemDeComprovanteVazio(pop)}
              comprovantes={verComprovantes ? (
            <PcComprovantes
              embutido
              empresa=""
              comprovantes={comprovantesDoPop}
              podeGerenciar={contexto.podeGerenciarComprovantes}
              online={contexto.online}
              onSalvar={(dados, arquivo) => contexto.salvarComprovante({ ...dados, popId: pop.id }, arquivo)}
              onRemover={contexto.removerComprovante}
              urlDoArquivo={contexto.urlDoComprovante}
              popFixo={{ id: pop.id, rotulo: pop.titulo, catalogoId: pop.catalogoId }}
              pops={popsDaEmpresa}
              onAlterarPop={contexto.podeGerenciarComprovantes ? contexto.alterarPopDoComprovante : undefined}
              onCriarPopDoModelo={contexto.criarPopDoModelo}
              mensagemVazia={mensagemDeComprovanteVazio(pop)}
              onVoltar={() => setAba("resumo")}
            />
              ) : undefined}
            />
          </div>
        )}

        {aba === "historico" && (
          <div className="pop-registros-area rz-historico-extra">
            <PcHistoricoDoPop pop={pop} ocultarNomes={!veNomesNoHistorico(usuario?.perfil)} onBaixarPdf={vigente && pop.status === "Aprovado" ? () => imprimir(false) : undefined} />
            {hashAprovado && (
              <p className="ui-row-sub" title={hashAprovado}>
                Conteúdo aprovado (v{vigente?.versao}): impressão digital {hashAprovado.slice(0, 12)}…
              </p>
            )}
            {pop.inativacao && (
              <p className="ui-row-sub">
                Inativado por {pop.inativacao.porNome} em {dataBr(pop.inativacao.em)}: {pop.inativacao.motivo}
              </p>
            )}
            {pop.arquivamento && (
              <p className="ui-row-sub">
                Arquivado por {pop.arquivamento.porNome} em {dataBr(pop.arquivamento.em)}: {pop.arquivamento.motivo}
              </p>
            )}
            {verPessoas && (
              <>
                <PcTreinamentoDoPop pop={pop} />
                {funcoes.length > 0 && (
                  <div className="rz-funcoes">
                    <h3 className="ficha-sub">Ciência por função</h3>
                    <ul className="ficha-lista">
                      {funcoes.map((item) => (
                        <li key={item.funcao}>
                          {item.funcao}: {item.confirmadas} de {item.total}
                        </li>
                      ))}
                    </ul>
                    <p className="ui-row-sub">{AVISO_DA_CIENCIA} Pode precisar de revisão jurídica antes de ser usado como prova.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {mudanca && (
        <MotivoDaMudanca
          titulo={mudanca === "arquivar" ? "Arquivar o POP" : "Inativar o POP"}
          explicacao={mudanca === "arquivar" ? "O POP sai da lista, mas fica guardado. O motivo, quem e quando ficam registrados." : "O POP deixa de valer, mas a versão aprovada fica guardada. Dá para reativar depois. O motivo, quem e quando ficam registrados."}
          rotuloDoBotao={mudanca === "arquivar" ? "Arquivar" : "Inativar"}
          onCancelar={() => setMudanca(null)}
          onConfirmar={(motivo) => {
            if (mudanca === "arquivar") onArquivar?.(motivo);
            else onInativar?.(motivo);
            setMudanca(null);
          }}
        />
      )}
      {colhendo && contexto && vigente && equipe && (
        <ColherCiencia
          empresaId={contexto.empresaId}
          popId={pop.id}
          versao={vigente.versao}
          pendentes={equipe.linhas.filter((linha) => !linha.confirmou)}
          onRegistrada={contexto.incluirCiencia}
          onFechar={() => setColhendo(false)}
        />
      )}
    </section>
  );
}
