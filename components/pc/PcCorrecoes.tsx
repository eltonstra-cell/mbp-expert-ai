"use client";

import { useEffect, useMemo, useState } from "react";
import FieldVoiceTools from "@/components/FieldVoiceTools";
import { Pill, type Tom } from "@/components/ui/Pill";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import {
  contarEtapas,
  etapaDaCorrecao,
  ncAtrasada,
  ordenarCorrecoes,
  ORDEM_ETAPAS,
  prazoSugerido,
  progressoDaCorrecao,
  validarPlano,
  type EtapaCorrecao,
  type GravidadeNc,
} from "@/lib/actionPlan";

type StatusNc = "Aberta" | "Em tratamento" | "Resolvida";

export type CorrecaoItem = {
  id: string;
  numero: number;
  titulo: string;
  ambiente: string;
  criterio: string;
  referencia: string;
  gravidade: GravidadeNc;
  status: StatusNc;
  acaoCorretiva: string;
  responsavelAcao: string;
  prazo: string;
  reincidente: boolean;
  dataAnterior: string;
  orientacao: string;
  /** Ação corretiva real do critério (catálogo normativo); ainda não existe nos dados. */
  acaoSugerida?: string;
  pop: { codigo: string; titulo: string; existe: boolean } | null;
  evidencias: { id: string; tipo: string; nome: string; quando: string; url: string }[];
  historico: { id: string; quando: string; status: StatusNc; observacao: string }[];
  /** Marcada como feita por quem não pode resolver; aguarda confirmação do Consultor/RT. */
  marcadaFeita: { em: string; por: string; observacao?: string } | null;
};

type Props = {
  empresa: string;
  data: string;
  hoje: string;
  itens: CorrecaoItem[];
  selecionadaInicial: string;
  podeEditar: boolean;
  podeEvidenciar: boolean;
  /** Nível "Marcar como feita": marca a ação como feita, sem resolver. */
  podeMarcar: boolean;
  onMarcarFeita: (id: string, observacao: string) => void;
  onDesfazerFeita: (id: string) => void;
  onSalvarPlano: (id: string, dados: { acao: string; responsavel: string; prazo: string; etapa: EtapaCorrecao }) => void;
  onRegistrar: (id: string, texto: string, status: StatusNc) => void;
  onAdicionarEvidencia: (id: string) => void;
  onCriarPop: (codigo: string) => void;
  onAbrirPop: () => void;
  onLote: (ids: string[], valores: { responsavel: string; prazo: string }) => void;
  onVoltar: () => void;
};

const ETAPAS: { chave: EtapaCorrecao; rotulo: string; tom: Tom; classe: string }[] = [
  { chave: "identificadas", rotulo: "Identificadas", tom: "nc", classe: "pc-etapa--nc" },
  { chave: "plano", rotulo: "Com plano", tom: "pend", classe: "pc-etapa--pend" },
  { chave: "acompanhamento", rotulo: "Em acompanhamento", tom: "info", classe: "pc-etapa--info" },
  { chave: "resolvidas", rotulo: "Resolvidas", tom: "ok", classe: "pc-etapa--ok" },
];
const FAIXA: Record<GravidadeNc, Tom> = { Crítica: "nc", Importante: "amber", Rotina: "na" };
const GRUPOS: GravidadeNc[] = ["Crítica", "Importante", "Rotina"];
const NOME_GRAVIDADE: Record<GravidadeNc, string> = { Crítica: "CRÍTICAS", Importante: "IMPORTANTES", Rotina: "LEVES" };

type Agrupar = "gravidade" | "ambiente";
type AbaDetalhe = "plano" | "evidencias" | "atualizacoes";

function dataCurta(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : iso;
}
function dataMes(iso: string) {
  const [, mes, dia] = iso.split("-");
  return mes && dia ? `${dia}/${mes}` : iso;
}

function Bolinhas({ nc }: { nc: CorrecaoItem }) {
  const acesas = progressoDaCorrecao(nc);
  return (
    <span className="pc-dots" role="img" aria-label={`Etapa ${acesas} de 4`}>
      {[1, 2, 3, 4].map((n) => (
        <span key={n} className={`pc-dot${n <= acesas ? " is-on" : ""}`} />
      ))}
    </span>
  );
}

export default function PcCorrecoes({
  empresa,
  data,
  hoje,
  itens,
  selecionadaInicial,
  podeEditar,
  podeEvidenciar,
  podeMarcar,
  onMarcarFeita,
  onDesfazerFeita,
  onSalvarPlano,
  onRegistrar,
  onAdicionarEvidencia,
  onCriarPop,
  onAbrirPop,
  onLote,
  onVoltar,
}: Props) {
  const [etapa, setEtapa] = useState<EtapaCorrecao | null>(null);
  const [agrupar, setAgrupar] = useState<Agrupar>("gravidade");
  const [rapidos, setRapidos] = useState<{ recorrentes: boolean; semResp: boolean; atrasadas: boolean }>({ recorrentes: false, semResp: false, atrasadas: false });
  const [escolhidaId, setEscolhidaId] = useState(selecionadaInicial);
  const [aba, setAba] = useState<AbaDetalhe>("plano");
  const [lote, setLote] = useState(false);
  const [aviso, setAviso] = useState("");

  const contagem = contarEtapas(itens);
  const recorrentes = itens.filter((nc) => nc.reincidente).length;
  const semResp = itens.filter((nc) => nc.status !== "Resolvida" && !nc.responsavelAcao.trim()).length;
  const atrasadas = itens.filter((nc) => ncAtrasada(nc, hoje)).length;

  const filtrados = useMemo(
    () =>
      itens.filter((nc) => {
        if (etapa && etapaDaCorrecao(nc) !== etapa) return false;
        if (rapidos.recorrentes && !nc.reincidente) return false;
        if (rapidos.semResp && (nc.status === "Resolvida" || nc.responsavelAcao.trim())) return false;
        if (rapidos.atrasadas && !ncAtrasada(nc, hoje)) return false;
        return true;
      }),
    [itens, etapa, rapidos, hoje]
  );
  const ordenados = ordenarCorrecoes(filtrados);
  const selecionada = ordenados.find((nc) => nc.id === escolhidaId) || ordenados[0];

  useEffect(() => {
    setAba("plano");
  }, [selecionada?.id]);

  useEffect(() => {
    if (!aviso) return;
    const tempo = window.setTimeout(() => setAviso(""), 2600);
    return () => window.clearTimeout(tempo);
  }, [aviso]);

  const salvarPlano: Props["onSalvarPlano"] = (id, dados) => {
    onSalvarPlano(id, dados);
    setAviso("Plano salvo");
  };

  const grupos: { rotulo: string; faixa: Tom; itens: CorrecaoItem[] }[] =
    agrupar === "gravidade"
      ? GRUPOS.map((g) => ({ rotulo: NOME_GRAVIDADE[g], faixa: FAIXA[g], itens: ordenados.filter((nc) => nc.gravidade === g) }))
      : Array.from(new Set(ordenados.map((nc) => nc.ambiente || "Sem ambiente"))).map((ambiente) => ({
          rotulo: ambiente.toLocaleUpperCase("pt-BR"),
          faixa: "info" as Tom,
          itens: ordenados.filter((nc) => (nc.ambiente || "Sem ambiente") === ambiente),
        }));

  const alternarRapido = (chave: keyof typeof rapidos) => setRapidos((atual) => ({ ...atual, [chave]: !atual[chave] }));

  return (
    <section className="ui-screen" aria-label="Correções">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">Correções</h1>
          <p className="ui-subtitle">
            Da não conformidade ao plano e ao acompanhamento, num só lugar · {empresa} · {data}
          </p>
        </div>
        <div className="ui-head-actions">
          <div className="ui-toolbar pc-toolbar-compacta">
            <div className="pc-group-by">
              <SegmentedTabs<Agrupar>
                rotulo="Agrupar correções por gravidade ou ambiente"
                valor={agrupar}
                onChange={setAgrupar}
                abas={[
                  { id: "gravidade", rotulo: "Gravidade" },
                  { id: "ambiente", rotulo: "Ambiente" },
                ]}
              />
            </div>
            <div className="pc-quick" role="group" aria-label="Filtros rápidos">
              <button type="button" className={`pc-quick-btn${rapidos.recorrentes ? " is-on" : ""}`} aria-pressed={rapidos.recorrentes} onClick={() => alternarRapido("recorrentes")}>
                Recorrentes ({recorrentes})
              </button>
              <button type="button" className={`pc-quick-btn${rapidos.semResp ? " is-on" : ""}`} aria-pressed={rapidos.semResp} onClick={() => alternarRapido("semResp")}>
                Sem responsável ({semResp})
              </button>
              <button type="button" className={`pc-quick-btn${rapidos.atrasadas ? " is-on" : ""}`} aria-pressed={rapidos.atrasadas} onClick={() => alternarRapido("atrasadas")}>
                Atrasadas ({atrasadas})
              </button>
            </div>
          </div>
          {podeEditar && (
            <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setLote(true)} disabled={itens.every((nc) => nc.status === "Resolvida")}>
              Definir em lote
            </button>
          )}
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onVoltar}>
            ← Central
          </button>
        </div>
      </div>

      <div className="pc-etapas" role="group" aria-label="Etapas das correções">
        {ETAPAS.map((passo, indice) => (
          <button
            key={passo.chave}
            type="button"
            className={`pc-etapa ${passo.classe}${etapa === passo.chave ? " is-on" : ""}`}
            aria-pressed={etapa === passo.chave}
            onClick={() => setEtapa((atual) => (atual === passo.chave ? null : passo.chave))}
          >
            <span className="pc-etapa-num">{contagem[passo.chave]}</span>
            <span className="pc-etapa-label">
              {indice + 1} · {passo.rotulo}
            </span>
          </button>
        ))}
      </div>


      {itens.length === 0 ? (
        <div className="ui-empty">Nenhuma não conformidade nesta visita. Itens marcados como Não Conforme no checklist aparecem aqui.</div>
      ) : (
        <div className="pc-master pc-master--corr">
          <div className="pc-master-list">
            <div className="ui-scroll">
              {ordenados.length === 0 ? (
                <div className="ui-empty">Nenhuma correção neste filtro.</div>
              ) : (
                grupos
                  .filter((grupo) => grupo.itens.length > 0)
                  .map((grupo) => (
                    <div key={grupo.rotulo} className="ui-list">
                      <div className="ui-group-title">
                        {grupo.rotulo} · {grupo.itens.length}
                      </div>
                      {grupo.itens.map((nc) => (
                        <button
                          key={nc.id}
                          type="button"
                          className={`ui-row has-strip ui-row--${FAIXA[nc.gravidade]} pc-master-row${selecionada?.id === nc.id ? " is-selected" : ""}`}
                          aria-pressed={selecionada?.id === nc.id}
                          onClick={() => setEscolhidaId(nc.id)}
                        >
                          <span className="pc-master-text">
                            <span className="ui-row-title-text">
                              {nc.ambiente ? `${nc.ambiente} · ` : ""}
                              {nc.titulo}
                            </span>
                            <span className="ui-row-sub">{nc.criterio}</span>
                          </span>
                          {nc.reincidente && <Pill tom="lilas">Reincidente</Pill>}
                          <span className="pc-nc-codigo">NC{String(nc.numero).padStart(2, "0")}</span>
                          {nc.marcadaFeita && nc.status !== "Resolvida" && <Pill tom="info">Feita, aguardando confirmação</Pill>}
                          <Bolinhas nc={nc} />
                        </button>
                      ))}
                    </div>
                  ))
              )}
            </div>
          </div>

          <div className="ui-card pc-detail pc-detail--corr">
            {selecionada ? (
              <Detalhe
                key={selecionada.id}
                nc={selecionada}
                hoje={hoje}
                aba={aba}
                onAba={setAba}
                podeEditar={podeEditar}
                podeEvidenciar={podeEvidenciar}
                podeMarcar={podeMarcar}
                onMarcarFeita={onMarcarFeita}
                onDesfazerFeita={onDesfazerFeita}
                onSalvarPlano={salvarPlano}
                onRegistrar={onRegistrar}
                onAdicionarEvidencia={onAdicionarEvidencia}
                onCriarPop={onCriarPop}
                onAbrirPop={onAbrirPop}
              />
            ) : (
              <div className="ui-empty">Selecione uma correção.</div>
            )}
          </div>
        </div>
      )}

      {aviso && (
        <div className="pc-toast pc-toast--ok" role="status">
          <span>{aviso}</span>
        </div>
      )}

      {lote && (
        <LoteJanela
          itens={itens.filter((nc) => nc.status !== "Resolvida")}
          hoje={hoje}
          onFechar={() => setLote(false)}
          onAplicar={(ids, valores) => {
            onLote(ids, valores);
            setLote(false);
          }}
        />
      )}
    </section>
  );
}

function Detalhe({
  nc,
  hoje,
  aba,
  onAba,
  podeEditar,
  podeEvidenciar,
  podeMarcar,
  onMarcarFeita,
  onDesfazerFeita,
  onSalvarPlano,
  onRegistrar,
  onAdicionarEvidencia,
  onCriarPop,
  onAbrirPop,
}: {
  nc: CorrecaoItem;
  hoje: string;
  aba: AbaDetalhe;
  onAba: (aba: AbaDetalhe) => void;
  podeEditar: boolean;
  podeEvidenciar: boolean;
  podeMarcar: boolean;
  onMarcarFeita: Props["onMarcarFeita"];
  onDesfazerFeita: Props["onDesfazerFeita"];
  onSalvarPlano: Props["onSalvarPlano"];
  onRegistrar: Props["onRegistrar"];
  onAdicionarEvidencia: Props["onAdicionarEvidencia"];
  onCriarPop: Props["onCriarPop"];
  onAbrirPop: Props["onAbrirPop"];
}) {
  const [acao, setAcao] = useState(nc.acaoCorretiva);
  const [responsavel, setResponsavel] = useState(nc.responsavelAcao);
  const [prazo, setPrazo] = useState(nc.prazo);
  const [etapaAlvo, setEtapaAlvo] = useState<EtapaCorrecao>(etapaDaCorrecao(nc));
  const [tentou, setTentou] = useState(false);
  const [notaFeita, setNotaFeita] = useState("");
  const [texto, setTexto] = useState("");
  const [statusNovo, setStatusNovo] = useState<StatusNc>(nc.status);
  const resolvida = nc.status === "Resolvida";
  const bloqueado = resolvida || !podeEditar;
  const sugestao = prazoSugerido(nc.gravidade, hoje);
  const comPlano = etapaAlvo !== "identificadas";
  const erros = validarPlano({ acaoCorretiva: acao, responsavelAcao: responsavel, prazo }, hoje, comPlano);
  const mostrarErro = (campo: "acao" | "responsavel" | "prazo") => (tentou || Boolean(prazo && campo === "prazo")) && erros[campo];

  function salvar() {
    setTentou(true);
    if (Object.keys(erros).length > 0) return;
    onSalvarPlano(nc.id, { acao, responsavel, prazo, etapa: etapaAlvo });
    setTentou(false);
  }

  const vazio = (valor: string) => !valor.trim();

  return (
    <>
      <div className="pc-detail-head">
        <div className="pc-detail-line">
          <Pill tom="na">{`NC${String(nc.numero).padStart(2, "0")}`}</Pill>
          <Pill tom={FAIXA[nc.gravidade]}>{nc.gravidade}</Pill>
          {nc.reincidente && <Pill tom="lilas">Reincidente</Pill>}
          <h2 className="pc-detail-title" title={nc.titulo}>{nc.titulo}</h2>
        </div>
        <div className="pc-detail-sub">
        <p className="ui-row-sub pc-detail-meta">
          {[nc.ambiente, nc.criterio, nc.referencia].filter(Boolean).join(" · ")}
          {nc.reincidente ? ` · também na visita de ${dataMes(nc.dataAnterior)}` : ""}
        </p>
        <SegmentedTabs<AbaDetalhe>
          rotulo="Seções da correção"
          valor={aba}
          onChange={onAba}
          abas={[
            { id: "plano", rotulo: "Plano" },
            { id: "evidencias", rotulo: "Evidências", contagem: nc.evidencias.length },
            { id: "atualizacoes", rotulo: "Atualizações", contagem: nc.historico.length },
          ]}
        />
        </div>
      </div>

      <div className="ui-scroll pc-detail-scroll">
        {aba === "plano" && (
          <>
            {nc.marcadaFeita && !resolvida && (
              <div className="pc-feita" role="status">
                <span>
                  Feita, aguardando confirmação · por {nc.marcadaFeita.por} em {new Date(nc.marcadaFeita.em).toLocaleString("pt-BR")}
                  {nc.marcadaFeita.observacao ? ` — ${nc.marcadaFeita.observacao}` : ""}
                </span>
                {podeEditar ? (
                  <button
                    type="button"
                    className="ui-btn ui-btn--primary ui-btn--small"
                    onClick={() => {
                      setStatusNovo("Resolvida");
                      onAba("atualizacoes");
                    }}
                  >
                    Confirmar e resolver
                  </button>
                ) : (
                  podeMarcar && (
                    <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => onDesfazerFeita(nc.id)}>
                      Desfazer
                    </button>
                  )
                )}
              </div>
            )}
            {podeMarcar && !podeEditar && !resolvida && !nc.marcadaFeita && (
              <div className="pc-feita is-form">
                <span className="ui-eyebrow">Esta correção já foi feita?</span>
                <input className="ui-input" value={notaFeita} onChange={(evento) => setNotaFeita(evento.target.value)} placeholder="Observação (opcional)" aria-label="Observação ao marcar como feita" />
                <button
                  type="button"
                  className="ui-btn ui-btn--primary ui-btn--small pc-self-start"
                  onClick={() => {
                    onMarcarFeita(nc.id, notaFeita);
                    setNotaFeita("");
                  }}
                >
                  Marcar como feita
                </button>
                <span className="ui-row-sub">O Consultor/RT confirma antes de resolver.</span>
              </div>
            )}
            <div className="pc-plan-cols">
              <div className="pc-plan-col pc-plan-col--main">
            <div className="pc-plan-block">
              <span className="ui-eyebrow">O que será feito (ação corretiva)</span>
              <span className="ui-field-wrap ui-field-wrap--area">
                <textarea
                  className={`ui-input pc-input-tools${vazio(acao) ? " pc-empty" : ""}${mostrarErro("acao") ? " is-invalid" : ""}`}
                  rows={3}
                  value={acao}
                  disabled={bloqueado}
                  onChange={(evento) => setAcao(evento.target.value)}
                  placeholder="+ Definir ação corretiva"
                  aria-label="Ação corretiva"
                  aria-invalid={Boolean(mostrarErro("acao"))}
                />
                {!bloqueado && (
                  <span className="ui-field-tools">
                    <FieldVoiceTools fieldKey={`acao-${nc.id}`} value={acao} onChange={setAcao} contexto="Ação corretiva para uma não conformidade em segurança dos alimentos." />
                  </span>
                )}
              </span>
              {mostrarErro("acao") ? (
                <span className="ui-field-error">{erros.acao}</span>
              ) : (
                !bloqueado && vazio(acao) && <span className="pc-field-hint" role="note">Obrigatório para salvar o plano.</span>
              )}
              {!bloqueado && nc.acaoSugerida && acao.trim() !== nc.acaoSugerida.trim() && (
                <div className="pc-suggest-line">
                  <span className="ui-row-sub">Ação sugerida: {nc.acaoSugerida}</span>
                  <button type="button" className="pc-link-btn" onClick={() => setAcao(nc.acaoSugerida || "")}>
                    Usar ação sugerida
                  </button>
                </div>
              )}
            </div>

            <div className="pc-plan-block">
              <span className="ui-eyebrow">POP relacionado</span>
              {nc.pop ? (
                <div className="pc-pop-line">
                  <span>{nc.pop.codigo ? `${nc.pop.codigo} · ` : ""}{nc.pop.titulo}</span>
                  {nc.pop.existe ? (
                    <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={onAbrirPop}>
                      Abrir
                    </button>
                  ) : (
                    podeEditar && (
                      <button type="button" className="ui-btn ui-btn--primary ui-btn--small" onClick={() => onCriarPop(nc.pop!.codigo)}>
                        Criar POP
                      </button>
                    )
                  )}
                </div>
              ) : (
                <span className="ui-row-sub">Sem POP sugerido para este critério.</span>
              )}
            </div>

              </div>
              <div className="pc-plan-col">
            <div className="pc-plan-two">
              <label className="pc-plan-block">
                <span className="ui-eyebrow">Responsável</span>
                <input
                  className={`ui-input${vazio(responsavel) ? " pc-empty" : ""}${mostrarErro("responsavel") ? " is-invalid" : ""}`}
                  value={responsavel}
                  disabled={bloqueado}
                  onChange={(evento) => setResponsavel(evento.target.value)}
                  placeholder="+ Responsável"
                  aria-invalid={Boolean(mostrarErro("responsavel"))}
                />
                {mostrarErro("responsavel") && <span className="ui-field-error">{erros.responsavel}</span>}
              </label>
              <label className="pc-plan-block">
                <span className="ui-eyebrow">Prazo</span>
                <input
                  type="date"
                  className={`ui-input${!prazo ? " pc-empty" : ""}${mostrarErro("prazo") ? " is-invalid" : ""}`}
                  value={prazo}
                  disabled={bloqueado}
                  onChange={(evento) => setPrazo(evento.target.value)}
                  aria-invalid={Boolean(mostrarErro("prazo"))}
                />
                {mostrarErro("prazo") && <span className="ui-field-error">{erros.prazo}</span>}
                {!bloqueado && (
                  <span className="pc-suggest-line">
                    <span className="ui-row-sub">
                      Sugerido: {sugestao.dias} dias ({nc.gravidade === "Rotina" ? "leve" : nc.gravidade.toLocaleLowerCase("pt-BR")})
                    </span>
                    <button type="button" className="pc-link-btn" title={`Usar ${dataMes(sugestao.data)}`} onClick={() => setPrazo(sugestao.data)}>
                      Usar prazo
                    </button>
                  </span>
                )}
              </label>
            </div>

            {!bloqueado && (
              <div className="pc-plan-block">
                <span className="ui-eyebrow">Situação</span>
                <select
                  className="ui-input"
                  aria-label="Situação da correção"
                  value={etapaAlvo}
                  onChange={(evento) => {
                    const chave = evento.target.value as EtapaCorrecao;
                    if (chave === "resolvidas") {
                      setStatusNovo("Resolvida");
                      onAba("atualizacoes");
                      return;
                    }
                    setEtapaAlvo(chave);
                  }}
                >
                  <option value="identificadas">Identificada</option>
                  <option value="plano">Com plano</option>
                  <option value="acompanhamento">Em acompanhamento</option>
                  <option value="resolvidas">Resolvida (registrar em Atualizações)</option>
                </select>
              </div>
            )}
                {!bloqueado && (
                  <div className="pc-plan-salvar">
                    <button type="button" className="ui-btn ui-btn--save" onClick={salvar}>
                      Salvar plano
                    </button>
                  </div>
                )}
              </div>
            </div>
            {resolvida && <div className="ui-note">Correção resolvida: o plano está protegido. Novas atualizações ou reabertura ficam na aba Atualizações.</div>}
          </>
        )}

        {aba === "evidencias" && (
          <>
            {podeEvidenciar && (
              <button type="button" className="pc-orange-btn pc-self-start" onClick={() => onAdicionarEvidencia(nc.id)}>
                + Adicionar evidência
              </button>
            )}
            {nc.evidencias.length === 0 ? (
              <p className="ui-row-sub">Nenhuma evidência vinculada a esta não conformidade.</p>
            ) : (
              <div className="pc-detail-evs">
                {nc.evidencias.map((ev) => (
                  <a key={ev.id} href={ev.url || undefined} target="_blank" rel="noreferrer" className="pc-detail-ev">
                    {ev.tipo === "Foto" && ev.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ev.url} alt={ev.nome} />
                    ) : (
                      <span className="pc-detail-ev-audio">{ev.tipo}</span>
                    )}
                    <span className="ui-row-sub">{ev.nome}</span>
                    <span className="ui-row-sub">{ev.quando}</span>
                  </a>
                ))}
              </div>
            )}
          </>
        )}

        {aba === "atualizacoes" && (
          <>
            {podeEditar && (
              <div className="pc-update">
                <div className="ui-eyebrow">{resolvida ? "Registrar nova atualização / reabrir" : "Registrar atualização"}</div>
                <span className="ui-field-wrap ui-field-wrap--area">
                  <textarea
                    className="ui-input pc-input-tools"
                    rows={3}
                    value={texto}
                    onChange={(evento) => setTexto(evento.target.value)}
                    placeholder="Ex.: piso comprado; aguardando instalação; correção concluída..."
                    aria-label="Texto da atualização"
                  />
                  <span className="ui-field-tools">
                    <FieldVoiceTools fieldKey={`atualizacao-${nc.id}`} value={texto} onChange={setTexto} contexto="Atualização de acompanhamento de uma não conformidade em segurança dos alimentos." />
                  </span>
                </span>
                <div className="pc-status-buttons" role="group" aria-label="Situação após a atualização">
                  {(["Aberta", "Em tratamento", "Resolvida"] as StatusNc[]).map((status) => (
                    <button key={status} type="button" aria-pressed={statusNovo === status} className={`pc-status-btn${statusNovo === status ? " is-on" : ""}`} onClick={() => setStatusNovo(status)}>
                      {status === "Aberta" ? "Aberta" : status === "Em tratamento" ? "Em acompanhamento" : "Resolvida"}
                    </button>
                  ))}
                </div>
                {statusNovo === "Resolvida" && !resolvida && <div className="ui-note">Para concluir, é necessário ter pelo menos uma evidência vinculada.</div>}
              </div>
            )}
            {nc.historico.length === 0 ? (
              <p className="ui-row-sub">Nenhuma atualização registrada ainda.</p>
            ) : (
              <div className="pc-history">
                {nc.historico.map((item) => (
                  <div key={item.id} className="pc-history-item">
                    <div className="pc-ev-pills">
                      <Pill tom={item.status === "Resolvida" ? "ok" : item.status === "Em tratamento" ? "pend" : "nc"}>{item.status === "Em tratamento" ? "Em acompanhamento" : item.status}</Pill>
                      <span className="ui-row-sub">{item.quando}</span>
                    </div>
                    <div className="pc-history-text">{item.observacao}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {aba === "atualizacoes" && podeEditar && (
        <div className="pc-detail-foot">
          <span className="ui-row-sub">{texto.trim() ? "Pronto para registrar." : "Escreva a atualização para registrar."}</span>
          <button
            type="button"
            className="ui-btn ui-btn--save"
            disabled={!texto.trim()}
            onClick={() => {
              onRegistrar(nc.id, texto, statusNovo);
              setTexto("");
            }}
          >
            {statusNovo === "Resolvida" && !resolvida ? "Concluir e registrar" : "Registrar atualização"}
          </button>
        </div>
      )}
    </>
  );
}

function LoteJanela({
  itens,
  hoje,
  onFechar,
  onAplicar,
}: {
  itens: CorrecaoItem[];
  hoje: string;
  onFechar: () => void;
  onAplicar: (ids: string[], valores: { responsavel: string; prazo: string }) => void;
}) {
  const [marcadas, setMarcadas] = useState<string[]>(itens.map((nc) => nc.id));
  const [responsavel, setResponsavel] = useState("");
  const [prazo, setPrazo] = useState("");
  const [tentou, setTentou] = useState(false);
  const semValores = !responsavel.trim() && !prazo;
  const prazoPassado = Boolean(prazo && prazo < hoje);

  function aplicar() {
    setTentou(true);
    if (marcadas.length === 0 || semValores || prazoPassado) return;
    if (!window.confirm(`Aplicar a ${marcadas.length} ${marcadas.length === 1 ? "não conformidade" : "não conformidades"}?`)) return;
    onAplicar(marcadas, { responsavel, prazo });
  }

  return (
    <div className="pc-modal-layer" role="presentation">
      <div className="pc-modal-backdrop" onClick={onFechar} />
      <section className="pc-modal" role="dialog" aria-modal="true" aria-label="Definir em lote">
        <h2 className="pc-modal-title">Definir em lote</h2>
        <p className="ui-row-sub">Vale só para as marcadas e ainda não resolvidas. Preencha apenas o que quer alterar.</p>
        <div className="pc-plan-two">
          <label className="pc-plan-block">
            <span className="ui-eyebrow">Responsável</span>
            <input className="ui-input" value={responsavel} onChange={(evento) => setResponsavel(evento.target.value)} placeholder="Nome do responsável" />
          </label>
          <label className="pc-plan-block">
            <span className="ui-eyebrow">Prazo</span>
            <input type="date" className={`ui-input${prazoPassado ? " is-invalid" : ""}`} value={prazo} onChange={(evento) => setPrazo(evento.target.value)} aria-invalid={prazoPassado} />
            {prazoPassado && <span className="ui-field-error">O prazo não pode estar no passado.</span>}
          </label>
        </div>
        {tentou && semValores && <span className="ui-field-error">Informe o responsável ou o prazo.</span>}
        <div className="pc-modal-list scroll-fino">
          {itens.map((nc) => (
            <label key={nc.id} className="pc-modal-row">
              <input
                type="checkbox"
                checked={marcadas.includes(nc.id)}
                onChange={() => setMarcadas((atual) => (atual.includes(nc.id) ? atual.filter((id) => id !== nc.id) : [...atual, nc.id]))}
              />
              <span>
                NC{String(nc.numero).padStart(2, "0")} · {nc.titulo}
              </span>
            </label>
          ))}
        </div>
        <div className="pc-modal-foot">
          <button type="button" className="pc-link-btn" onClick={() => setMarcadas(marcadas.length === itens.length ? [] : itens.map((nc) => nc.id))}>
            {marcadas.length === itens.length ? "Limpar seleção" : "Selecionar todas"}
          </button>
          <div className="ui-footer-actions">
            <button type="button" className="ui-btn ui-btn--secondary" onClick={onFechar}>
              Cancelar
            </button>
            <button type="button" className="ui-btn ui-btn--primary" disabled={marcadas.length === 0} onClick={aplicar}>
              Aplicar a {marcadas.length}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
