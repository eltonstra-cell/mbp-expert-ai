"use client";

import { useState } from "react";
import type { FrequenciaDoPop, ProcedimentoOperacionalPadronizado } from "@/types";
import CampoDeFrequencia from "@/components/pc/CampoDeFrequencia";
import { confirmar } from "@/lib/dialogos";
import { formatarData, formatarDataCurta } from "@/lib/dataLocal";
import { equipeDaCiencia } from "@/lib/cienciaPop";
import { TOTAL_DE_ETAPAS, linhaDeEtapas, verificacoesDeAprovacao, type EtapaDoPop } from "@/lib/popCiclo";
import { MENSAGEM_APROVAR_NAO_CONFERIDO, bloqueioDeAprovacao, exigenciaDeAprovacao, itensFeitos, marcarComoConferido, marcarItemAConferir, podeMarcarComoConferido } from "@/lib/popConferencia";
import { conteudoComFrequencia, frequenciaDoPop, textoDaFrequencia } from "@/lib/popFrequencia";
import { responsavelDaExecucao, type NomeECargo } from "@/lib/responsavelDoPop";

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
};

const FRASE_DA_FALTA: Record<string, string> = { passos: "os passos do procedimento", responsavel: "o responsável e o cargo", frequencia: "a frequência" };

const Marca = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
    <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Resumo da ficha do POP (rodada 12e): as 6 etapas do ciclo, UMA faixa creme com a ação da etapa atual e campos curtos embaixo.
// A etapa é derivada do estado do POP (lib/popCiclo.ts). As regras de aprovação não mudam: só o responsável vinculado aprova (o servidor
// repete a checagem), o modelo comp-13 bloqueia sem conferência e os demais modelos pedem "Aprovar mesmo assim?".
export default function PcResumoDoPop({ pop, etapa, dadosDoResponsavel, nomeDoAprovador, motivoParaNaoAprovar, podeEditar, podeAprovar, quemConfere, equipe, destacarConferencia, onAbrirDocumento, onAtualizarPop, onEnviar, onAprovar, onColherCiencia, onImprimirCopia }: Props) {
  const [definindo, setDefinindo] = useState(false);
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
      const faltam = verificacoes.filter((item) => !item.ok && item.id !== "conferidos");
      return (
        <div id="ficha-conferir" tabIndex={-1} className={`rz-faixa${destacarConferencia ? " is-destaque" : ""}`} role="group" aria-label="Para conferir antes de aprovar">
          <div className="rz-faixa-topo">
            <h3 className="rz-faixa-titulo">{naoModelo ? "Complete antes de aprovar" : "Para conferir antes de aprovar"}</h3>
            {!naoModelo && (
              <span className="rz-faixa-conta">
                {feitos.feitos} de {feitos.total}
              </span>
            )}
          </div>
          {!naoModelo && (pop.itensAConferir || []).length > 0 && (
            <ul className="rz-conferir-lista">
              {(pop.itensAConferir || []).map((item, indice) => (
                <li key={`${indice}-${item.texto}`}>
                  <label className="rz-conferir-item">
                    <input type="checkbox" checked={item.feito} disabled={!podeEditar} onChange={(evento) => onAtualizarPop(marcarItemAConferir(pop, indice, evento.target.checked))} />
                    <span>{item.texto}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {faltam.length > 0 && (
            <ul className="rz-faltam">
              {faltam.map((item) => (
                <li key={item.id}>Falta: {FRASE_DA_FALTA[item.id]}</li>
              ))}
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
      return (
        <div className="rz-faixa" role="group" aria-label={todasOk ? "Pronto para aprovar" : "Falta para aprovar"}>
          <div className="rz-faixa-topo">
            <h3 className="rz-faixa-titulo">{todasOk ? "Pronto para aprovar" : "Falta para aprovar"}</h3>
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
          {todasOk && <p className="rz-faixa-nota">Ao aprovar, ficam registrados nome, cargo, data e versão.</p>}
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
          <p className="rz-faixa-nota">Confirmação por PIN no aparelho do gestor. Registra pessoa, versão e data.</p>
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
    return null;
  }

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

      {faixaDaEtapa()}

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
              <dt>Responsável</dt>
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
    </div>
  );
}
