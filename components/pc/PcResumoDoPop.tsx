"use client";

import Chevron from "@/components/ui/Chevron";
import { useEffect, useState } from "react";
import type { FrequenciaDoPop, ProcedimentoOperacionalPadronizado } from "@/types";
import CampoDeFrequencia from "@/components/pc/CampoDeFrequencia";
import { confirmar } from "@/lib/dialogos";
import { diasEntreDatas as diasEntre, formatarData, formatarDataCurta, formatarHora } from "@/lib/dataLocal";
import { equipeDaCiencia } from "@/lib/cienciaPop";
import { TOTAL_DE_ETAPAS, linhaDeEtapas, verificacoesDeAprovacao, type EtapaDoPop } from "@/lib/popCiclo";
import { MENSAGEM_APROVAR_NAO_CONFERIDO, bloqueioDeAprovacao, exigenciaDeAprovacao, itensFeitos, marcarComoConferido, marcarItemAConferir, podeMarcarComoConferido } from "@/lib/popConferencia";
import { conteudoComFrequencia, frequenciaDoPop, textoDaFrequencia } from "@/lib/popFrequencia";
import { responsavelDaExecucao, type NomeECargo } from "@/lib/responsavelDoPop";
import { tituloDoItemAConferir } from "@/lib/popTitulosConferencia";
import { useRegistrosDaEmpresa } from "@/components/RegistrosEmpresaContext";
import { resumoDosRegistros } from "@/lib/popRegistrosResumo";
import { hojeISO, popPrecisaRevisarPorNorma } from "@/lib/popsNorma";
import { guardaDosRegistros } from "@/lib/registrosEmpresa";

type Props = {
  pop: ProcedimentoOperacionalPadronizado;
  etapa: EtapaDoPop | null;
  dadosDoResponsavel?: NomeECargo;
  /** Nome do responsável do estabelecimento (vinculado em Acessos): só ele aprova. */
  nomeDoAprovador: string;
  /** Mensagem de por que a pessoa não aprova (vazia quando aprova). */
  motivoParaNaoAprovar: string;
  podeEditar: boolean;
  podeAprovar: boolean;
  quemConfere: { nome?: string; cargo?: string };
  /** Ciência da versão vigente; null quando a pessoa não gerencia a equipe. */
  equipe: ReturnType<typeof equipeDaCiencia> | null;
  destacarConferencia: boolean;
  onAbrirDocumento: () => void;
  onAtualizarPop: (pop: ProcedimentoOperacionalPadronizado) => void;
  onEnviar: (pop: ProcedimentoOperacionalPadronizado) => void;
  onAprovar: (pop: ProcedimentoOperacionalPadronizado) => void;
  onColherCiencia?: () => void;
  onImprimirCopia?: () => void;
  /** Abre a aba Registros (etapa 5). */
  onAbrirRegistros?: () => void;
  /** Cria a nova versão em rascunho (etapa 6). */
  onNovaVersao?: () => void;
};

const Marca = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
    <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Resumo da ficha do POP (rodada 12e): as 6 etapas do ciclo, UMA faixa creme com a ação da etapa atual e campos curtos embaixo.
// A etapa é derivada do estado do POP (lib/popCiclo.ts). As regras de aprovação não mudam: só o responsável vinculado aprova (o servidor
// repete a checagem), o modelo comp-13 bloqueia sem conferência e os demais modelos pedem "Aprovar mesmo assim?".
// O catálogo escreve "Procedimento (retirar os itens): a frase…"; na tela o texto começa direto no que tem de ser feito.
function textoSemPrefixo(texto: string): string {
  const limpo = texto.replace(/^Procedimento \([^)]*\):\s*/i, "");
  return limpo ? limpo.charAt(0).toUpperCase() + limpo.slice(1) : texto;
}

export default function PcResumoDoPop({ pop, etapa, dadosDoResponsavel, nomeDoAprovador, motivoParaNaoAprovar, podeEditar, podeAprovar, quemConfere, equipe, destacarConferencia, onAbrirDocumento, onAtualizarPop, onEnviar, onAprovar, onColherCiencia, onImprimirCopia, onAbrirRegistros, onNovaVersao }: Props) {
  const contextoDeRegistros = useRegistrosDaEmpresa();
  const [definindo, setDefinindo] = useState(false);
  // Item de conferência aberto (um por vez): no PC e no tablet o primeiro vem aberto; no celular, todos fechados.
  const [itemAberto, setItemAberto] = useState<number | null>(null);
  useEffect(() => {
    try {
      setItemAberto(window.matchMedia("(max-width:599px)").matches ? null : 0);
    } catch {
      setItemAberto(null);
    }
  }, [pop.id]);
  const [rascunhoDaFrequencia, setRascunhoDaFrequencia] = useState<FrequenciaDoPop | null>(null);
  const linha = linhaDeEtapas(etapa);
  const aprovado = pop.status === "Aprovado";
  const rascunho = pop.status === "Rascunho";
  const executor = responsavelDaExecucao(pop.conteudo, dadosDoResponsavel);
  const frequencia = frequenciaDoPop(pop.conteudo);
  const podeDefinirFrequencia = podeEditar && rascunho;
  const verificacoes = verificacoesDeAprovacao(pop, dadosDoResponsavel);
  const todasOk = verificacoes.every((item) => item.ok);
  const exigencia = exigenciaDeAprovacao(pop);
  const feitos = itensFeitos(pop);

  function salvarFrequencia() {
    onAtualizarPop({ ...pop, conteudo: conteudoComFrequencia(pop.conteudo || {}, rascunhoDaFrequencia) });
    setDefinindo(false);
  }

  async function aprovarVersao() {
    if (exigencia === "confirmar" && !(await confirmar(MENSAGEM_APROVAR_NAO_CONFERIDO, { titulo: "Aprovar mesmo assim?", confirmarRotulo: "Aprovar mesmo assim", cancelarRotulo: "Cancelar" }))) return;
    onAprovar(pop);
  }

  function faixaDaEtapa() {
    if (!etapa) return null;
    if (etapa.numero === 1) {
      return (
        <div className="rz-faixa" role="group" aria-label="Criar">
          <div className="rz-faixa-topo">
            <h3 className="rz-faixa-titulo">Escreva os passos do procedimento</h3>
          </div>
          <p className="rz-faixa-texto">O POP ainda não tem nenhum passo. Escreva o que é feito, na ordem.</p>
          <div className="rz-faixa-acoes">
            <button type="button" className="rz-btn rz-btn--pri" onClick={onAbrirDocumento}>
              Abrir documento
            </button>
          </div>
        </div>
      );
    }
    if (etapa.numero === 2) {
      const naoModelo = !pop.origemModelo;
      return (
        <div id="ficha-conferir" tabIndex={-1} className={`rz-faixa${destacarConferencia ? " is-destaque" : ""}`} role="group" aria-label="Conferir antes de aprovar">
          <div className="rz-faixa-topo">
            <h3 className="rz-faixa-titulo">{naoModelo ? "Complete antes de aprovar" : "Conferir antes de aprovar"}</h3>
            {!naoModelo && (
              <span className="rz-faixa-conta">
                {feitos.feitos} de {feitos.total}
              </span>
            )}
          </div>
          {!naoModelo && (pop.itensAConferir || []).length > 0 && (
            <ul className="rz-conferir-lista">
              {(pop.itensAConferir || []).map((item, indice) => {
                const aberto = itemAberto === indice;
                const titulo = tituloDoItemAConferir(pop, indice);
                return (
                  <li key={`${indice}-${item.texto}`} className={`rz-item${aberto ? " is-aberto" : ""}`}>
                    <div className="rz-item-linha">
                      <input type="checkbox" aria-label={titulo} checked={item.feito} disabled={!podeEditar} onChange={(evento) => onAtualizarPop(marcarItemAConferir(pop, indice, evento.target.checked))} />
                      <button type="button" className="rz-item-titulo" aria-expanded={aberto} aria-controls={`rz-item-texto-${indice}`} onClick={() => setItemAberto(aberto ? null : indice)}>
                        <span>{titulo}</span>
                        <span className="rz-item-seta" aria-hidden="true"><Chevron aberto={aberto} /></span>
                      </button>
                    </div>
                    {aberto && (
                      <p id={`rz-item-texto-${indice}`} className="rz-item-texto">
                        {textoSemPrefixo(item.texto)}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="rz-faixa-acoes">
            <button type="button" className="rz-btn rz-btn--sec" onClick={onAbrirDocumento}>
              Abrir documento
            </button>
            {!naoModelo && podeEditar && (
              <button
                type="button"
                className="rz-btn rz-btn--pri"
                disabled={!podeMarcarComoConferido(pop)}
                title={podeMarcarComoConferido(pop) ? undefined : "Marque todos os itens para liberar"}
                onClick={() => onAtualizarPop(marcarComoConferido(pop, quemConfere, new Date().toISOString()))}
              >
                Marcar como conferido
              </button>
            )}
          </div>
        </div>
      );
    }
    if (etapa.numero === 3) {
      const aguardando = pop.status === "Aguardando aprovação" || pop.status === "Em revisão";
      // Rascunho completo: "Pronto para enviar" e o botão de enviar; depois de enviado, "Aguardando aprovação de <responsável>" e, só para ele, "Aprovar versão X".
      const tituloDaEtapa3 = aguardando && todasOk && podeAprovar ? "Pronto para aprovar" : aguardando ? (nomeDoAprovador ? `Aguardando aprovação de ${nomeDoAprovador}` : "Aguardando aprovação") : todasOk ? "Pronto para enviar" : "Falta para enviar";
      return (
        <div className="rz-faixa" role="group" aria-label={tituloDaEtapa3}>
          <div className="rz-faixa-topo">
            <h3 className="rz-faixa-titulo">{tituloDaEtapa3}</h3>
            <span className={`rz-faixa-conta${todasOk ? " is-ok" : ""}`}>
              {verificacoes.filter((item) => item.ok).length} de {verificacoes.length}
            </span>
          </div>
          <ul className="rz-verificacoes">
            {verificacoes.map((item) => (
              <li key={item.id} className={item.ok ? "is-ok" : "is-falta"}>
                <span className="rz-verificacao-marca" aria-hidden="true">{item.ok ? <Marca /> : null}</span>
                <span>{item.texto}</span>
              </li>
            ))}
          </ul>
          {aguardando && todasOk && <p className="rz-faixa-nota">Ao aprovar, ficam registrados nome, cargo, data e versão.</p>}
          <div className="rz-faixa-acoes">
            <button type="button" className="rz-btn rz-btn--sec" onClick={onAbrirDocumento}>
              Abrir documento
            </button>
            {rascunho && podeEditar && (
              <button type="button" className="rz-btn rz-btn--pri" disabled={!todasOk} onClick={() => onEnviar(pop)} title={todasOk ? "O responsável do estabelecimento aprova em seguida" : "Complete as verificações para enviar"}>
                Enviar para aprovação
              </button>
            )}
            {aguardando && podeAprovar && (
              <button type="button" className="rz-btn rz-btn--pri" disabled={exigencia === "bloqueada" || !todasOk} title={exigencia === "bloqueada" ? bloqueioDeAprovacao(pop) : undefined} onClick={aprovarVersao}>
                Aprovar versão {pop.versao}
              </button>
            )}
            {aguardando && !podeAprovar && (
              <span className="rz-so-responsavel" role="status" title={motivoParaNaoAprovar || undefined}>
                {nomeDoAprovador ? `Só o responsável (${nomeDoAprovador}) aprova` : "Só o responsável do estabelecimento aprova"}
              </span>
            )}
          </div>
          {aguardando && podeAprovar && exigencia === "bloqueada" && (
            <p className="rz-faixa-nota rz-faixa-nota--aviso" role="status">
              {bloqueioDeAprovacao(pop)}
            </p>
          )}
        </div>
      );
    }
    if (etapa.numero === 4) {
      return (
        <div className="rz-faixa" role="group" aria-label="Ciência da equipe">
          <div className="rz-faixa-topo">
            <h3 className="rz-faixa-titulo">Ciência da equipe</h3>
            {equipe && equipe.total > 0 && (
              <span className="rz-faixa-conta">
                {equipe.confirmadas} de {equipe.total}
              </span>
            )}
          </div>
          {equipe && equipe.linhas.length > 0 && (
            <ul className="rz-equipe">
              {equipe.linhas.map((item) => (
                <li key={item.colaborador.id}>
                  <span>
                    {item.colaborador.nome}
                    {item.colaborador.cargo ? <span className="rz-equipe-cargo"> · {item.colaborador.cargo}</span> : null}
                  </span>
                  {item.confirmou ? (
                    <span className="rz-equipe-ok">
                      <Marca /> Confirmou {item.dataDaCiencia ? formatarDataCurta(item.dataDaCiencia) : ""}
                    </span>
                  ) : (
                    <span className="rz-equipe-pend">
                      <i className="rz-bolinha" aria-hidden="true" /> Pendente
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="rz-faixa-nota">Confirmação por PIN no tablet. Registra pessoa, versão e data.</p>
          <div className="rz-faixa-acoes">
            {onImprimirCopia && (
              <button type="button" className="rz-btn rz-btn--sec" onClick={onImprimirCopia}>
                Imprimir cópia
              </button>
            )}
            {onColherCiencia && (
              <button type="button" className="rz-btn rz-btn--pri" onClick={onColherCiencia}>
                Colher ciência
              </button>
            )}
          </div>
        </div>
      );
    }
    if (etapa.numero === 5) {
      const resumo = resumoDosRegistros(pop.id, pop.conteudo, contextoDeRegistros?.registros, hojeISO(), pop.aprovacao?.em);
      const guarda = contextoDeRegistros?.empresa ? guardaDosRegistros(contextoDeRegistros.empresa) : null;
      const naoFeitos = resumo.esperados30 === null ? 0 : resumo.esperados30 - resumo.feitos30;
      return (
        <div className="rz-faixa" role="group" aria-label="Registros em andamento">
          <div className="rz-faixa-topo">
            <h3 className="rz-faixa-titulo">Registros em andamento</h3>
          </div>
          <ul className="rz-linhas">
            <li>
              <span>Próximo registro</span>
              <span>{resumo.proximo ? <><span className={resumo.proximo.urgente ? "rz-terra" : undefined}>{resumo.proximo.texto}</span>{resumo.frequencia ? ` · ${resumo.frequencia}` : ""}</> : "Defina a frequência"}</span>
            </li>
            <li>
              <span>Último registro</span>
              <span>{!contextoDeRegistros ? "—" : resumo.ultimo ? <>{formatarDataCurta(resumo.ultimo.dataHora)} · {formatarHora(resumo.ultimo.dataHora)} · {resumo.ultimo.quem} · <span className={resumo.ultimo.comDesvio ? "rz-ambar" : "rz-verde"}>{resumo.ultimo.comDesvio ? "Ação corretiva" : "Conforme"}</span></> : "Nenhum ainda"}</span>
            </li>
            {contextoDeRegistros && resumo.esperados30 !== null && (
              <li>
                <span>Últimos 30 dias</span>
                <span>{resumo.feitos30} de {resumo.esperados30} feitos{naoFeitos > 0 ? <> · <span className="rz-ambar">{naoFeitos} {naoFeitos === 1 ? "não feito" : "não feitos"}</span></> : null}</span>
              </li>
            )}
          </ul>
          {guarda?.dias ? <p className="rz-faixa-nota">Guarda dos registros: {guarda.dias} dias{guarda.citacao ? ` (${guarda.citacao})` : ""}.</p> : null}
          {onAbrirRegistros && (
            <div className="rz-faixa-acoes">
              <button type="button" className="rz-btn rz-btn--sec" onClick={onAbrirRegistros}>
                Ver registros
              </button>
              <button type="button" className="rz-btn rz-btn--terra" onClick={onAbrirRegistros}>
                + Novo registro
              </button>
            </div>
          )}
        </div>
      );
    }
    if (etapa.numero === 6) {
      const dias = pop.proximaRevisao ? diasEntre(hojeISO(), pop.proximaRevisao) : null;
      return (
        <div className="rz-faixa" role="group" aria-label="Revisão do POP">
          <div className="rz-faixa-topo">
            <h3 className="rz-faixa-titulo">Revisão do POP</h3>
          </div>
          <ul className="rz-linhas">
            <li>
              <span>Próxima revisão</span>
              <span>{pop.proximaRevisao ? <>{formatarData(pop.proximaRevisao)}{dias !== null ? (dias < 0 ? <> · <span className="rz-terra">vencida há {-dias} {dias === -1 ? "dia" : "dias"}</span></> : ` · em ${dias} ${dias === 1 ? "dia" : "dias"}`) : null}</> : "Sem data definida"}</span>
            </li>
            {popPrecisaRevisarPorNorma(pop) && (
              <li>
                <span>Motivo para antecipar</span>
                <span className="rz-ambar">Norma alterada</span>
              </li>
            )}
          </ul>
          <p className="rz-faixa-nota">Uma nova versão volta ao ciclo (Criar, Conferir, Aprovar). A versão vigente continua valendo até a nova ser aprovada.</p>
          {podeEditar && onNovaVersao && (
            <div className="rz-faixa-acoes">
              <button type="button" className="rz-btn rz-btn--terra" onClick={onNovaVersao}>
                Criar nova versão
              </button>
            </div>
          )}
        </div>
      );
    }
    return null;
  }

  const rotuloResponsavel = (
    <>
      <span className="rz-rot-longo">Responsável e cargo</span>
      <span className="rz-rot-curto">Responsável</span>
    </>
  );

  return (
    <div className="rz-resumo">
      <ol className="rz-etapas" aria-label={`Etapa ${etapa?.numero ?? "—"} de ${TOTAL_DE_ETAPAS}`}>
        {linha.map((item) => (
          <li key={item.numero} className={`rz-etapa rz-etapa--${item.situacao}`} aria-current={item.situacao === "atual" ? "step" : undefined}>
            <span className="rz-etapa-bola">{item.situacao === "concluida" ? <Marca /> : item.numero}</span>
            <span className="rz-etapa-nome">{item.nome}</span>
          </li>
        ))}
      </ol>

      <dl className="rz-campos">
        {aprovado && pop.aprovacao ? (
          <>
            <div>
              <dt>Aprovado por</dt>
              <dd>{pop.aprovacao.nome}</dd>
            </div>
            <div>
              <dt>Aprovado em</dt>
              <dd>{formatarData(pop.aprovacao.em)}</dd>
            </div>
            <div>
              <dt>Versão</dt>
              <dd>{pop.versao}</dd>
            </div>
          </>
        ) : (
          <>
            <div>
              <dt>{rotuloResponsavel}</dt>
              <dd>{executor.nome || <button type="button" className="rz-link" onClick={onAbrirDocumento}>Definir</button>}</dd>
            </div>
            <div>
              <dt>Frequência</dt>
              <dd>
                {frequencia ? (
                  textoDaFrequencia(frequencia)
                ) : podeDefinirFrequencia ? (
                  <button type="button" className="rz-link" aria-expanded={definindo} onClick={() => { setRascunhoDaFrequencia(frequenciaDoPop(pop.conteudo) || null); setDefinindo((valor) => !valor); }}>
                    Definir
                  </button>
                ) : (
                  "—"
                )}
                {frequencia && podeDefinirFrequencia && (
                  <>
                    {" "}
                    <button type="button" className="rz-link" onClick={() => { setRascunhoDaFrequencia(frequencia); setDefinindo((valor) => !valor); }}>
                      Alterar
                    </button>
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt>Versão</dt>
              <dd>{pop.versao}</dd>
            </div>
          </>
        )}
      </dl>

      {definindo && podeDefinirFrequencia && (
        <div className="rz-frequencia" role="group" aria-label="Definir a frequência">
          <CampoDeFrequencia
            frequencia={pop.conteudo?.frequencia}
            estruturada={rascunhoDaFrequencia || undefined}
            onChange={setRascunhoDaFrequencia}
          />
          <div className="rz-faixa-acoes">
            <button type="button" className="rz-btn rz-btn--sec" onClick={() => setDefinindo(false)}>
              Cancelar
            </button>
            <button type="button" className="rz-btn rz-btn--pri" disabled={!rascunhoDaFrequencia || (rascunhoDaFrequencia.tipo === "outra" && !(rascunhoDaFrequencia.texto || "").trim())} onClick={salvarFrequencia}>
              Salvar frequência
            </button>
          </div>
        </div>
      )}

      {faixaDaEtapa()}
    </div>
  );
}
