"use client";

import { confirmar } from "@/lib/dialogos";
import { useEffect, useMemo, useRef, useState } from "react";
import FieldVoiceTools from "@/components/FieldVoiceTools";
import { NavIcon } from "@/components/NavIcons";
import { Pill, type Tom } from "@/components/ui/Pill";
import { NOME_DA_GRAVIDADE, linhaDaCorrecao, mensagemDeFaltas, primeiroCampoComProblema, type CampoDoPlano } from "@/lib/correcaoRotulos";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import {
  contarEtapas,
  etapaDaCorrecao,
  ncAtrasada,
  ordenarCorrecoes,
  ORDEM_ETAPAS,
  prazoSugerido,
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
  /** Item do checklist que gerou a NC (para "Ver no checklist"). */
  checklistItemId: string;
  /** Posição do item dentro do ambiente, no checklist. */
  itemNumero: number;
  /** O que foi escrito no checklist ao marcar Não conforme, e quando. */
  observacao: string;
  registradoEm: string;
  /** Como foi o mesmo critério, no mesmo ambiente, na visita anterior da empresa (só se existir). */
  ultimaOcorrencia: { data: string; situacao: string; acao: string } | null;
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
  /** Pessoas da empresa, para sugerir o responsável. */
  pessoas: string[];
  onVerNoChecklist: (checklistItemId: string, ambiente: string) => void;
  /** Quem está logado: vem pré-preenchido como responsável (editável). */
  responsavelPadrao?: string;
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
const COR_DA_GRAVIDADE: Record<GravidadeNc, string> = { Crítica: "#D93A3A", Importante: "#F5A623", Rotina: "#3AA6D9" };

type Agrupar = "gravidade" | "ambiente";
type AbaDetalhe = "plano" | "evidencias" | "atualizacoes";

function dataCurta(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : iso;
}
function quandoCurto(iso: string) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  const hoje = new Date();
  const mesmoDia = data.toDateString() === hoje.toDateString();
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return mesmoDia ? `hoje ${hora}` : `${data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${hora}`;
}
function dataMes(iso: string) {
  const [, mes, dia] = iso.split("-");
  return mes && dia ? `${dia}/${mes}` : iso;
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
  pessoas,
  onVerNoChecklist,
  responsavelPadrao = "",
}: Props) {
  const [etapa, setEtapa] = useState<EtapaCorrecao | null>(null);
  const [agrupar, setAgrupar] = useState<Agrupar>("gravidade");
  const [rapidos, setRapidos] = useState<{ recorrentes: boolean; semResp: boolean; atrasadas: boolean }>({ recorrentes: false, semResp: false, atrasadas: false });
  const [escolhidaId, setEscolhidaId] = useState(selecionadaInicial);
  const [aba, setAba] = useState<AbaDetalhe>("plano");
  const [lote, setLote] = useState(false);
  const [aviso, setAviso] = useState("");
  const [filtrarAberto, setFiltrarAberto] = useState(false);

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

  const abertas = itens.filter((nc) => nc.status !== "Resolvida").length;
  const semPlano = contagem.identificadas;
  const subtitulo = `${abertas} não conformidade${abertas === 1 ? "" : "s"} aberta${abertas === 1 ? "" : "s"} · ${
    abertas === 0 ? "nada pendente" : contagem.plano === 0 ? "nenhuma com plano ainda" : `${contagem.plano} com plano`
  }`;
  const etapaAtiva = etapa ?? (selecionada ? etapaDaCorrecao(selecionada) : null);
  const filtrosAtivos = Number(rapidos.recorrentes) + Number(rapidos.semResp) + Number(rapidos.atrasadas);

  // "Próxima correção": a seguinte sem plano; se não houver, a seguinte da lista.
  const irParaProxima = () => {
    if (ordenados.length === 0) return;
    const posicao = ordenados.findIndex((nc) => nc.id === selecionada?.id);
    const depois = [...ordenados.slice(posicao + 1), ...ordenados.slice(0, Math.max(0, posicao))];
    const alvo = depois.find((nc) => etapaDaCorrecao(nc) === "identificadas") || depois[0];
    if (alvo) setEscolhidaId(alvo.id);
  };

  return (
    <section className="ui-screen pc-cor" aria-label="Correções">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">Correções</h1>
          <p className="ui-subtitle">{subtitulo}</p>
        </div>
        <div className="ui-head-actions">
          {podeEditar && (
            <button type="button" className="ui-btn ui-btn--creme" onClick={() => setLote(true)} disabled={itens.every((nc) => nc.status === "Resolvida")}>
              Definir em lote
            </button>
          )}
        </div>
      </div>

      <div className="pc-etapas" role="group" aria-label="Etapas das correções">
        {ETAPAS.map((passo, indice) => (
          <span key={passo.chave} className="pc-etapa-par">
            <button
              type="button"
              className={`pc-etapa ${passo.classe}${etapaAtiva === passo.chave ? " is-ativa" : ""}${contagem[passo.chave] === 0 ? " is-zero" : ""}${etapa === passo.chave ? " is-on" : ""}`}
              aria-pressed={etapa === passo.chave}
              onClick={() => setEtapa((atual) => (atual === passo.chave ? null : passo.chave))}
            >
              <span className="pc-etapa-num">{contagem[passo.chave]}</span>
              <span className="pc-etapa-label">{passo.rotulo}</span>
            </button>
            {indice < ETAPAS.length - 1 && (
              <span className="pc-etapa-seta" aria-hidden="true">
                ›
              </span>
            )}
          </span>
        ))}
      </div>

      {itens.length === 0 ? (
        <div className="ui-empty">Nenhuma não conformidade nesta visita. Itens marcados como Não Conforme no checklist aparecem aqui.</div>
      ) : (
        <div className="pc-master pc-master--corr">
          <div className="pc-master-list">
            <div className="pc-cor-barra">
              <span className="ui-row-sub">Agrupar por</span>
              <SegmentedTabs<Agrupar>
                rotulo="Agrupar correções por gravidade ou ambiente"
                valor={agrupar}
                onChange={setAgrupar}
                abas={[
                  { id: "gravidade", rotulo: "Gravidade" },
                  { id: "ambiente", rotulo: "Ambiente" },
                ]}
              />
              <div className="pc-filtrar">
                <button type="button" className={`pc-filtrar-btn${filtrosAtivos > 0 ? " is-on" : ""}`} aria-haspopup="true" aria-expanded={filtrarAberto} onClick={() => setFiltrarAberto((aberto) => !aberto)}>
                  Filtrar{filtrosAtivos > 0 ? ` (${filtrosAtivos})` : ""} ▾
                </button>
                {filtrarAberto && (
                  <div className="pc-filtrar-menu" role="group" aria-label="Filtros rápidos">
                    {(
                      [
                        ["recorrentes", "Recorrentes", recorrentes],
                        ["semResp", "Sem responsável", semResp],
                        ["atrasadas", "Atrasadas", atrasadas],
                      ] as [keyof typeof rapidos, string, number][]
                    ).map(([chave, rotulo, quantos]) => (
                      <label key={chave} className="pc-filtrar-item">
                        <input type="checkbox" checked={rapidos[chave]} onChange={() => alternarRapido(chave)} />
                        <span>
                          {rotulo} ({quantos})
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
                      {grupo.itens.map((nc) => {
                        const linha = linhaDaCorrecao(nc);
                        return (
                          <button
                            key={nc.id}
                            type="button"
                            className={`pc-cor-card${selecionada?.id === nc.id ? " is-selected" : ""}`}
                            style={{ "--grav": COR_DA_GRAVIDADE[nc.gravidade] } as React.CSSProperties}
                            aria-pressed={selecionada?.id === nc.id}
                            onClick={() => setEscolhidaId(nc.id)}
                          >
                            <span className="pc-cor-topo">
                              {agrupar === "gravidade" && (
                                <span className="pc-cor-pino">
                                  <IconePino />
                                  {linha.ambiente}
                                </span>
                              )}
                              {nc.reincidente && <span className="pc-cor-aviso">Reincidente</span>}
                              {nc.marcadaFeita && nc.status !== "Resolvida" && <span className="pc-cor-aviso">Feita, aguardando confirmação</span>}
                              <span className="pc-cor-grav">{NOME_DA_GRAVIDADE[nc.gravidade]}</span>
                            </span>
                            <span className="pc-cor-titulo">{linha.titulo}</span>
                          </button>
                        );
                      })}
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
                pessoas={pessoas}
                onMarcarFeita={onMarcarFeita}
                onDesfazerFeita={onDesfazerFeita}
                onSalvarPlano={salvarPlano}
                onRegistrar={onRegistrar}
                onAdicionarEvidencia={onAdicionarEvidencia}
                onCriarPop={onCriarPop}
                onAbrirPop={onAbrirPop}
                onVerNoChecklist={onVerNoChecklist}
                responsavelPadrao={responsavelPadrao}
                onProxima={irParaProxima}
                temOutras={ordenados.length > 1}
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

function IconePino() {
  return (
    <svg className="pc-cor-pino-icone" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-6-5.2-6-10a6 6 0 0 1 12 0c0 4.8-6 10-6 10z" />
      <circle cx="12" cy="11" r="2.2" />
    </svg>
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
  pessoas,
  onVerNoChecklist,
  onProxima,
  temOutras,
  responsavelPadrao,
}: {
  responsavelPadrao: string;
  pessoas: string[];
  onVerNoChecklist: Props["onVerNoChecklist"];
  onProxima: () => void;
  temOutras: boolean;
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
  const [responsavel, setResponsavel] = useState(nc.responsavelAcao || responsavelPadrao);
  const [prazo, setPrazo] = useState(nc.prazo);
  // Salvar o plano leva a correção para "Com plano"; quem já está em acompanhamento continua lá.
  const etapaAlvo: EtapaCorrecao = etapaDaCorrecao(nc) === "acompanhamento" ? "acompanhamento" : "plano";
  const [tentou, setTentou] = useState(false);
  const [tocado, setTocado] = useState<Record<CampoDoPlano, boolean>>({ acao: false, responsavel: false, prazo: false });
  const [faltas, setFaltas] = useState("");
  const acaoRef = useRef<HTMLTextAreaElement | null>(null);
  const responsavelRef = useRef<HTMLInputElement | null>(null);
  const prazoRef = useRef<HTMLInputElement | null>(null);
  const [notaFeita, setNotaFeita] = useState("");
  const [texto, setTexto] = useState("");
  const [statusNovo, setStatusNovo] = useState<StatusNc>(nc.status);
  const resolvida = nc.status === "Resolvida";
  const bloqueado = resolvida || !podeEditar;
  const sugestao = prazoSugerido(nc.gravidade, hoje);
  const erros = validarPlano({ acaoCorretiva: acao, responsavelAcao: responsavel, prazo }, hoje, true);
  // Nenhum erro ao abrir: o campo só acusa depois de sair dele vazio (ou ao tentar salvar).
  const mostrarErro = (campo: CampoDoPlano) => (tentou || tocado[campo] || Boolean(prazo && campo === "prazo")) && erros[campo];
  const marcarTocado = (campo: CampoDoPlano) => setTocado((atual) => ({ ...atual, [campo]: true }));
  const vazioNoPlano: Record<CampoDoPlano, boolean> = { acao: !acao.trim(), responsavel: !responsavel.trim(), prazo: !prazo };

  function salvar() {
    setTentou(true);
    const faltando = (Object.keys(vazioNoPlano) as CampoDoPlano[]).filter((campo) => vazioNoPlano[campo]);
    const invalidos = (Object.keys(erros) as CampoDoPlano[]).filter((campo) => !vazioNoPlano[campo]);
    if (faltando.length > 0 || invalidos.length > 0) {
      setFaltas(mensagemDeFaltas(faltando, invalidos));
      const primeiro = primeiroCampoComProblema(faltando, invalidos);
      const alvo = primeiro === "acao" ? acaoRef.current : primeiro === "responsavel" ? responsavelRef.current : prazoRef.current;
      alvo?.focus();
      return;
    }
    setFaltas("");
    onSalvarPlano(nc.id, { acao, responsavel, prazo, etapa: etapaAlvo });
    setTentou(false);
  }

  // A mensagem do botão some assim que tudo é preenchido.
  useEffect(() => {
    if (faltas && Object.keys(erros).length === 0) setFaltas("");
  }, [faltas, erros]);

  const vazio = (valor: string) => !valor.trim();

  return (
    <>
      <div className="pc-detail-head">
        <div className="pc-detail-line">
          <span className="pc-grav-chip" style={{ "--grav": COR_DA_GRAVIDADE[nc.gravidade] } as React.CSSProperties}>
            <i aria-hidden="true" />
            {NOME_DA_GRAVIDADE[nc.gravidade]}
          </span>
          <span className="pc-codigo-chip">{linhaDaCorrecao(nc).codigo}</span>
          {nc.reincidente && <span className="pc-codigo-chip">Reincidente</span>}
          {nc.referencia && <span className="pc-norma">{nc.referencia}</span>}
        </div>
        <h2 className="pc-detail-title" title={nc.titulo}>
          {nc.titulo}
        </h2>
        <div className="pc-detail-linha2">
          <span className="pc-detail-ambiente">
            Ambiente: <strong>{linhaDaCorrecao(nc).ambiente}</strong>
            {nc.itemNumero > 0 ? ` · item ${nc.itemNumero}` : ""}
            {nc.criterio ? ` · ${nc.criterio}` : ""}
            {nc.reincidente ? ` · também na visita de ${dataMes(nc.dataAnterior)}` : ""}
          </span>
          {nc.pop?.existe && (
            <button type="button" className="pc-chip-btn" title={`${nc.pop.codigo ? nc.pop.codigo + " · " : ""}${nc.pop.titulo}`} onClick={onAbrirPop}>
              POP
            </button>
          )}
          {nc.checklistItemId && (
            <button type="button" className="pc-chip-btn pc-chip-btn--soft" onClick={() => onVerNoChecklist(nc.checklistItemId, nc.ambiente)}>
              Ver no checklist ›
            </button>
          )}
        </div>
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
            <div className="pc-plan-stack">
              {(nc.observacao.trim() || nc.ultimaOcorrencia) && (
                <div className="pc-plan-info">
                  {nc.observacao.trim() && (
                    <div className="pc-registrado">
                      <span className="ui-eyebrow">Registrado no checklist · {quandoCurto(nc.registradoEm)}</span>
                      <p className="pc-registrado-texto">“{nc.observacao.trim()}”</p>
                    </div>
                  )}
                  {nc.ultimaOcorrencia && (
                    <div className="pc-ultima">
                      <span className="ui-eyebrow">Como foi nesse critério na última visita</span>
                      <p className="pc-registrado-texto">
                        {nc.ultimaOcorrencia.data} · {nc.ultimaOcorrencia.situacao}
                        {nc.ultimaOcorrencia.acao ? ` · ${nc.ultimaOcorrencia.acao}` : ""}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {!bloqueado && nc.acaoSugerida && acao.trim() !== nc.acaoSugerida.trim() && (
                <div className="pc-acao-padrao">
                  <span className="ui-row-sub">Ação padrão do critério: “{nc.acaoSugerida}”</span>
                  <button type="button" className="pc-chip-btn pc-chip-btn--soft" onClick={() => setAcao(nc.acaoSugerida || "")}>
                    Usar
                  </button>
                </div>
              )}
              <div className="pc-plan-block pc-plan-acao">
                <span className="ui-eyebrow">
                  O que será feito <span className="pc-obrig">· obrigatório</span>
                </span>
                <span className="ui-field-wrap ui-field-wrap--area">
                  <textarea
                    ref={acaoRef}
                    className={`ui-input pc-input-tools pc-acao-area${mostrarErro("acao") ? " is-invalid" : ""}`}
                    value={acao}
                    disabled={bloqueado}
                    onChange={(evento) => setAcao(evento.target.value)}
                    onBlur={() => marcarTocado("acao")}
                    placeholder="Descreva a ação corretiva"
                    aria-label="O que será feito (ação corretiva)"
                    aria-invalid={Boolean(mostrarErro("acao"))}
                  />
                  {!bloqueado && (
                    <span className="ui-field-tools">
                      <FieldVoiceTools fieldKey={`acao-${nc.id}`} value={acao} onChange={setAcao} rotuloIa="Sugerir com IA" contexto="Ação corretiva para uma não conformidade em segurança dos alimentos." />
                    </span>
                  )}
                </span>
                {mostrarErro("acao") && <span className="ui-field-error">{erros.acao}</span>}
              </div>
              <div className="pc-plan-two">
                <label className="pc-plan-block">
                  <span className="ui-eyebrow">Responsável</span>
                  <input
                    ref={responsavelRef}
                    className={`ui-input ui-input--lista${mostrarErro("responsavel") ? " is-invalid" : ""}`}
                    value={responsavel}
                    list={`pessoas-${nc.id}`}
                    disabled={bloqueado}
                    onChange={(evento) => setResponsavel(evento.target.value)}
                    onBlur={() => marcarTocado("responsavel")}
                    placeholder="Quem vai fazer"
                    aria-invalid={Boolean(mostrarErro("responsavel"))}
                  />
                  <datalist id={`pessoas-${nc.id}`}>
                    {pessoas.map((pessoa) => (
                      <option key={pessoa} value={pessoa} />
                    ))}
                  </datalist>
                  {mostrarErro("responsavel") && <span className="ui-field-error">{erros.responsavel}</span>}
                </label>
                <label className="pc-plan-block">
                  <span className="ui-eyebrow">Prazo</span>
                  <span className="pc-prazo-campo">
                    <input
                      ref={prazoRef}
                      type="date"
                      className={`ui-input${mostrarErro("prazo") ? " is-invalid" : ""}`}
                      value={prazo}
                      disabled={bloqueado}
                      onChange={(evento) => setPrazo(evento.target.value)}
                      onBlur={() => marcarTocado("prazo")}
                      aria-invalid={Boolean(mostrarErro("prazo"))}
                    />
                    {!bloqueado && (
                      <button type="button" className="pc-prazo-sugerido" title={`Usar ${dataMes(sugestao.data)}`} onClick={() => setPrazo(sugestao.data)}>
                        {sugestao.dias} dias · {nc.gravidade === "Rotina" ? "leve" : nc.gravidade.toLocaleLowerCase("pt-BR")}
                      </button>
                    )}
                  </span>
                  {mostrarErro("prazo") && <span className="ui-field-error">{erros.prazo}</span>}
                </label>
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

      {aba === "plano" && !bloqueado && (
        <div className="pc-detail-foot pc-detail-foot--plano">
          {faltas && (
            <span className="pc-falta" role="alert">
              {faltas}
            </span>
          )}
          {temOutras && (
            <button type="button" className="ui-btn ui-btn--secondary" onClick={onProxima}>
              Próxima correção →
            </button>
          )}
          <button type="button" className="ui-btn ui-btn--save" onClick={salvar}>
            Salvar plano
          </button>
        </div>
      )}
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

export function LoteJanela({
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

  async function aplicar() {
    setTentou(true);
    if (marcadas.length === 0 || semValores || prazoPassado) return;
    if (!(await confirmar(`Aplicar a ${marcadas.length} ${marcadas.length === 1 ? "não conformidade" : "não conformidades"}?`, { titulo: "Aplicar a várias", confirmarRotulo: "Aplicar" }))) return;
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
