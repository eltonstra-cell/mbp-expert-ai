"use client";

import { useEffect, useMemo, useState } from "react";
import type { CapaDosPops, ComprovanteTerceiro, Empresa, ProcedimentoOperacionalPadronizado, UsuarioSistema } from "@/types";
import PcPopEditor from "@/components/pc/PcPopEditor";
import type { CabecalhoDeImpressao } from "@/lib/printFooter";
import PcRegistrosDoPop from "@/components/pc/PcRegistrosDoPop";
import PcTreinamentoDoPop from "@/components/pc/PcTreinamentoDoPop";
import QuemAindaNaoLeu from "@/components/pc/QuemAindaNaoLeu";
import PcComprovantes from "@/components/pc/PcComprovantes";
import type { RegistrosEmpresaValor } from "@/components/RegistrosEmpresaContext";
import { CORES_DA_SITUACAO, comprovantesVigentesDoPop, montarLinhaDoPop, ultimoRegistroDoPop } from "@/lib/popGestao";
import { CONJUNTO_DA_NORMA, MENSAGEM_NORMA_ALTERADA, hojeISO, popPrecisaRevisarPorNorma, popVigente } from "@/lib/popsNorma";
import { formatarData, formatarDataCurta, formatarHora } from "@/lib/dataLocal";
import { mensagemDeComprovanteVazio } from "@/lib/comprovantePop";
import { ROTULO_CURTO_NAO_CONFERIDO, ROTULO_NAO_CONFERIDO, itensFeitos, marcarComoConferido, marcarItemAConferir, podeMarcarComoConferido, popNaoConferido } from "@/lib/popConferencia";
import { nomeECargo } from "@/lib/nomeCargo";
import type { AlvoDaPendencia } from "@/lib/popPendencias";
import type { EstiloDoCartaz } from "@/lib/cartazLavagem";
import { ROTULO_DA_VALIDADE, diasEntre, leituraDaVersao, rotuloDoTipo, situacaoDaValidade } from "@/lib/registrosEmpresa";

export type AbaFicha = "resumo" | "documento" | "registros" | "comprovantes" | "quemleu" | "historico";

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
  /** Capa dos POPs da empresa (opcional, desligada por padrão) e como salvá-la. */
  capaDaEmpresa?: CapaDosPops;
  onSalvarCapa?: (capa: CapaDosPops) => void;
  /** Cartaz de lavagem de mãos: tema guardado na empresa e como salvar tema e logotipo. */
  estiloDoCartaz?: EstiloDoCartaz;
  onSalvarCartaz?: (estilo: EstiloDoCartaz, logotipo: string | undefined) => void;
};

const ROTULO: Record<AbaFicha, string> = { resumo: "Resumo", documento: "Documento", registros: "Registros", comprovantes: "Comprovantes", quemleu: "Quem leu", historico: "Histórico" };

// Datas e horas sempre em São Paulo (lib/dataLocal.ts): o texto ISO em UTC nunca é cortado na mão.
const dataBr = (iso?: string) => formatarData(iso);
const dataCurta = (iso?: string) => formatarDataCurta(iso);
const horaBr = (iso: string) => formatarHora(iso);

const DESTINO_DA_ABA: Record<NonNullable<ReturnType<typeof montarLinhaDoPop>["acao"]["botao"]>["destino"], AbaFicha> = {
  comprovantes: "comprovantes",
  documento: "documento",
  registros: "registros",
  leitura: "quemleu",
  aprovar: "documento",
};

// Ficha do POP: o POP é o centro. Resumo, Documento, Registros, Comprovantes, Quem leu e Histórico no mesmo lugar.
export default function PcFichaPop({ pop, empresa, usuario, podeEditar, onImprimir, responsavelDoEstabelecimento, popsDaEmpresa, podeAprovar, contexto, mensagem, abaInicial = "resumo", alvoInicial, onVoltar, onSalvarRascunho, onEnviar, onAprovar, onNovaVersao, onDescartar, onAtualizarConferencia, capaDaEmpresa, onSalvarCapa, estiloDoCartaz, onSalvarCartaz }: Props) {
  const [aba, setAba] = useState<AbaFicha>(abaInicial);
  const hoje = hojeISO();
  useEffect(() => setAba(abaInicial), [abaInicial]);
  // A conferência do modelo fica no Resumo: o aviso e o botão "Aprovar" levam até ela, com o bloco em destaque.
  const [destacarConferencia, setDestacarConferencia] = useState(alvoInicial === "conferencia");
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

  const definicao = CONJUNTO_DA_NORMA.find((item) => item.catalogoId === pop.catalogoId);
  const linha = useMemo(
    () =>
      montarLinhaDoPop(pop, definicao, {
        empresa: { normasAplicadas: empresa.normasAplicadas, pops: [pop] },
        hoje,
        comprovantes: contexto?.comprovantes,
        ncs: contexto?.ncs,
        registros: contexto?.registros,
        colaboradores: contexto?.colaboradores,
        leituras: contexto?.leituras,
        podeAprovar,
      }),
    [pop, definicao, empresa.normasAplicadas, hoje, contexto, podeAprovar]
  );
  const cor = CORES_DA_SITUACAO[linha.situacao];
  const vigente = popVigente(pop);
  const verPessoas = Boolean(contexto?.podeGerenciarPessoas);
  const verComprovantes = Boolean(contexto?.podeVerComprovantes);
  const leitura = vigente && contexto && verPessoas ? leituraDaVersao(pop.id, vigente.versao, contexto.colaboradores, contexto.leituras) : null;
  const ultimo = ultimoRegistroDoPop(contexto?.registros, pop.id);
  const comprovantesDoPop = comprovantesVigentesDoPop(contexto?.comprovantes, pop.id).sort((a, b) => a.validade.localeCompare(b.validade));
  const proximoComprovante = comprovantesDoPop[0];
  const situacaoComprovante = proximoComprovante ? situacaoDaValidade(proximoComprovante.validade, hoje) : null;
  const abas: AbaFicha[] = ["resumo", "documento", ...(contexto ? (["registros"] as AbaFicha[]) : []), ...(verComprovantes ? (["comprovantes"] as AbaFicha[]) : []), ...(verPessoas ? (["quemleu"] as AbaFicha[]) : []), "historico"];
  const recentes = (contexto?.registros || []).filter((registro) => registro.popId === pop.id).sort((a, b) => b.dataHora.localeCompare(a.dataHora)).slice(0, 3);
  const botao = linha.acao.botao;
  const abaDoBotao = botao ? DESTINO_DA_ABA[botao.destino] : null;
  const botaoValido = botao && abaDoBotao && abas.includes(abaDoBotao);
  const editorVisivel = aba === "documento" || aba === "historico";
  // "Ver quem falta" rola e leva o foco ao bloco "Quem ainda não leu" do próprio Resumo; os demais botões trocam de aba.
  function irParaOBotao() {
    if (botao?.destino === "leitura" && aba === "resumo") {
      const bloco = document.getElementById("ficha-quem-nao-leu");
      if (bloco) {
        bloco.scrollIntoView({ behavior: "smooth", block: "center" });
        bloco.focus({ preventScroll: true });
        return;
      }
    }
    if (abaDoBotao) setAba(abaDoBotao);
  }

  const tomDaValidade = situacaoComprovante === "vencido" ? "nc" : situacaoComprovante === "vence-em-breve" ? "pend" : "ok";
  const detalheValidade = proximoComprovante
    ? situacaoComprovante === "vencido"
      ? `venceu ${dataCurta(proximoComprovante.validade)}`
      : `vence ${dataCurta(proximoComprovante.validade)}`
    : "nenhum vinculado";

  return (
    <section className="ficha" aria-label="Ficha do POP">
      <div className="ficha-topo">
        <div className="ficha-titulo-linha">
          <h1 className="ficha-titulo">{`${pop.codigo ? `${pop.codigo} · ` : ""}${pop.titulo || "POP"}`}</h1>
          <span className="pgl-etiqueta" style={{ background: cor.fundo, color: cor.texto }}>
            {linha.situacao}
          </span>
          <span className="ficha-chip">v{pop.versao}</span>
          {pop.catalogoId && <span className="ficha-chip ficha-chip--modelo">Modelo do app</span>}
          {popNaoConferido(pop) && <span className="pop-revisar pop-nao-conferido" title={ROTULO_NAO_CONFERIDO}>{ROTULO_CURTO_NAO_CONFERIDO}</span>}
          {popPrecisaRevisarPorNorma(pop) && (
            <span className="pop-revisar" title={MENSAGEM_NORMA_ALTERADA}>
              revisar
            </span>
          )}
        </div>
        {/* A frase completa da próxima ação (que saiu da lista) fica no topo da ficha; no Resumo o cartão "Próxima ação" já a mostra. */}
        {aba !== "resumo" && aba !== "documento" && (
          <p className="ficha-proxima-linha">
            <span className="ficha-proxima-linha-rotulo">Próxima ação:</span> {linha.acao.texto}
          </p>
        )}
        <div className="ficha-abas" role="tablist" aria-label="Partes do POP">
          {abas.map((id) => (
            <button key={id} type="button" role="tab" aria-selected={aba === id} className={`ficha-aba${aba === id ? " is-ativa" : ""}`} onClick={() => setAba(id)}>
              {ROTULO[id]}
            </button>
          ))}
        </div>
      </div>

      <div className="ficha-corpo">
        {aba === "resumo" && (
          <div className="ficha-resumo">
            <div className="ficha-cartoes">
              <div className={`ficha-cartao ficha-cartao--${vigente?.aprovacao ? "ok" : "pend"}`}>
                <span className="ficha-cartao-rotulo">Aprovação</span>
                <span className="ficha-cartao-valor">{vigente?.aprovacao ? `${vigente.aprovacao.nome.split(" ")[0]} · ${dataCurta(vigente.aprovacao.em)}` : "ainda sem aprovação"}</span>
              </div>
              <div className={`ficha-cartao ficha-cartao--${leitura && leitura.total > 0 && leitura.lidos === leitura.total ? "ok" : "pend"}`}>
                <span className="ficha-cartao-rotulo">Leitura da {vigente ? `v${vigente.versao}` : "versão vigente"}</span>
                <span className="ficha-cartao-valor">{leitura ? (leitura.total > 0 ? `${leitura.lidos} de ${leitura.total}` : "sem equipe cadastrada") : verPessoas ? "sem versão aprovada" : "não se aplica"}</span>
              </div>
              <div className={`ficha-cartao ficha-cartao--${ultimo ? "ok" : "pend"}`}>
                <span className="ficha-cartao-rotulo">Último registro</span>
                <span className="ficha-cartao-valor">{ultimo ? `${dataCurta(ultimo.dataHora)} · ${horaBr(ultimo.dataHora)}` : "nenhum ainda"}</span>
              </div>
              <div className={`ficha-cartao ficha-cartao--${proximoComprovante ? tomDaValidade : "na"}`}>
                <span className="ficha-cartao-rotulo">Comprovante</span>
                <span className="ficha-cartao-valor">{detalheValidade}</span>
              </div>
            </div>

            {pop.origemModelo && pop.conferencia?.conferido && (
              // Depois de conferido: bloco neutro (cinza), recolhido; os itens ficam à mão ao expandir.
              <details id="ficha-conferir" tabIndex={-1} className="ficha-conferir ficha-conferir--feito" aria-label="Para conferir antes de aprovar">
                <summary className="ficha-conferir-resumo">
                  <span className="ficha-conferir-marca" aria-hidden="true">✓</span>
                  <span className="ficha-conferir-ok">
                    Conferido por {nomeECargo(pop.conferencia.por?.nome, pop.conferencia.por?.cargo) || "responsável"}
                    {pop.conferencia.em ? `, em ${dataBr(pop.conferencia.em)}` : ""}
                  </span>
                </summary>
                {(pop.itensAConferir || []).length === 0 ? (
                  <p className="ficha-vazio">Nenhum item pendente neste modelo.</p>
                ) : (
                  <ul className="ficha-conferir-lista">
                    {(pop.itensAConferir || []).map((item, indice) => (
                      <li key={`${indice}-${item.texto}`}>
                        <label className="ficha-conferir-item">
                          <input type="checkbox" checked={item.feito} disabled={!podeEditar || !onAtualizarConferencia} onChange={(evento) => onAtualizarConferencia?.(marcarItemAConferir(pop, indice, evento.target.checked))} />
                          <span>{item.texto}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            )}

            {pop.origemModelo && !pop.conferencia?.conferido && (
              <div id="ficha-conferir" tabIndex={-1} className={`ficha-conferir${destacarConferencia ? " is-destaque" : ""}`} role="group" aria-label="Para conferir antes de aprovar">
                <div className="ficha-sub-linha">
                  <h3 className="ficha-sub">Para conferir antes de aprovar</h3>
                  <span className="ficha-conferir-conta">{itensFeitos(pop).feitos} de {itensFeitos(pop).total} marcados</span>
                </div>
                {(pop.itensAConferir || []).length === 0 ? (
                  <p className="ficha-vazio">Nenhum item pendente neste modelo.</p>
                ) : (
                  <ul className="ficha-conferir-lista">
                    {(pop.itensAConferir || []).map((item, indice) => (
                      <li key={`${indice}-${item.texto}`}>
                        <label className="ficha-conferir-item">
                          <input type="checkbox" checked={item.feito} disabled={!podeEditar || !onAtualizarConferencia} onChange={(evento) => onAtualizarConferencia?.(marcarItemAConferir(pop, indice, evento.target.checked))} />
                          <span>{item.texto}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
                {podeEditar && onAtualizarConferencia && (
                  <div className="ficha-conferir-acao">
                    <button
                      type="button"
                      className="ui-btn ui-btn--save ui-btn--small"
                      disabled={!podeMarcarComoConferido(pop)}
                      title={podeMarcarComoConferido(pop) ? undefined : "Marque todos os itens para liberar"}
                      onClick={() => onAtualizarConferencia(marcarComoConferido(pop, { nome: usuario?.nome || responsavelDoEstabelecimento?.nome, cargo: usuario?.cargo || responsavelDoEstabelecimento?.cargo }, new Date().toISOString()))}
                    >
                      Marcar como conferido
                    </button>
                    {!podeMarcarComoConferido(pop) && <span className="pdoc-falta" role="status">Marque todos os itens para liberar</span>}
                  </div>
                )}
              </div>
            )}

            <div className="ficha-proxima">
              <div className="ficha-proxima-textos">
                <span className="ficha-proxima-titulo">Próxima ação</span>
                <span className="ficha-proxima-texto">{linha.acao.texto}</span>
              </div>
              {botaoValido && (
                <button type="button" className="ui-btn ui-btn--criar" onClick={() => irParaOBotao()}>
                  {botao!.rotulo}
                </button>
              )}
            </div>

            <div className="ficha-duas">
              <div className="ficha-coluna">
                <div className="ficha-sub-linha">
                  <h3 className="ficha-sub">Registros recentes</h3>
                  {contexto?.podeCriarRegistro && vigente && abas.includes("registros") && (
                    <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => setAba("registros")}>
                      + Registrar execução
                    </button>
                  )}
                </div>
                {recentes.length === 0 ? (
                  <p className="ficha-vazio">Nenhum registro ainda.</p>
                ) : (
                  <ul className="ficha-lista">
                    {recentes.map((registro) => (
                      <li key={registro.id}>
                        {dataCurta(registro.dataHora)} · {registro.ambiente ? `${registro.ambiente}, ` : ""}
                        {registro.descricao}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {verComprovantes && (
                <div className="ficha-coluna">
                  <div className="ficha-sub-linha">
                    <h3 className="ficha-sub">Comprovante vinculado</h3>
                    {contexto?.podeGerenciarComprovantes && abas.includes("comprovantes") && (
                      <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => setAba("comprovantes")}>
                        + Anexar comprovante
                      </button>
                    )}
                  </div>
                  {proximoComprovante ? (
                    <ul className="ficha-lista">
                      <li>
                        {rotuloDoTipo(proximoComprovante.tipo)} · {proximoComprovante.emissor}
                        <br />
                        {ROTULO_DA_VALIDADE[situacaoComprovante!]} · validade {dataBr(proximoComprovante.validade)}
                        {situacaoComprovante === "vencido" ? ` (há ${Math.abs(diasEntre(hoje, proximoComprovante.validade))} dias)` : ""}
                      </li>
                    </ul>
                  ) : (
                    <p className="ficha-vazio">Nenhum comprovante vinculado a este POP.</p>
                  )}
                </div>
              )}
            </div>

            {leitura && vigente && contexto && (
              <QuemAindaNaoLeu popId={pop.id} versao={vigente.versao} linhas={leitura.linhas} podeRegistrar={contexto.podeGerenciarPessoas} onRegistrar={contexto.registrarLeitura} />
            )}

          </div>
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
            proximaAcao={linha.acao.texto}
            onIrParaConferencia={pop.origemModelo ? irParaAConferencia : undefined}
            capaDaEmpresa={capaDaEmpresa}
            onSalvarCapa={onSalvarCapa}
            estiloDoCartaz={estiloDoCartaz}
            onSalvarCartaz={onSalvarCartaz}
            onTrocarIconeDeCapa={onAtualizarConferencia}
          />
        </div>

        {aba === "registros" && contexto && (
          <div className="pop-registros-area">
            <PcRegistrosDoPop pop={pop} />
          </div>
        )}

        {aba === "comprovantes" && contexto && verComprovantes && (
          <PcComprovantes
            embutido
            empresa=""
            comprovantes={contexto.comprovantes.filter((item: ComprovanteTerceiro) => item.popId === pop.id)}
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
        )}

        {aba === "quemleu" && verPessoas && (
          <div className="pop-registros-area">
            <PcTreinamentoDoPop pop={pop} />
          </div>
        )}
      </div>
    </section>
  );
}
