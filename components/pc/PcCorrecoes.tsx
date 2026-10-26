"use client";

import { dataISOLocal, formatarDataCurta, formatarDataHora, formatarHora, hojeLocalISO } from "@/lib/dataLocal";
import AntesDepois, { type FotoDoPar } from "@/components/AntesDepois";
import { sugestoesDeResponsavel } from "@/lib/pessoas";
import { confirmar } from "@/lib/dialogos";
import { useEffect, useMemo, useRef, useState } from "react";
import FieldVoiceTools from "@/components/FieldVoiceTools";
import { NavIcon } from "@/components/NavIcons";
import { Pill, type Tom } from "@/components/ui/Pill";
import { NOME_DA_GRAVIDADE, linhaDaCorrecao, mensagemDeFaltas, primeiroCampoComProblema, type CampoDoPlano } from "@/lib/correcaoRotulos";
import { acaoPadraoVisivel } from "@/lib/conteudoValidado";
import { criarRascunhosDeCorrecao, planoAoAbrir, textoDoQueFalta, type RascunhosDeCorrecao } from "@/lib/rascunhoDeCorrecao";
import { CAUSAS_RAIZ, seloDaReincidencia, validarCausaRaiz } from "@/lib/memoriaDoPlano";
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
  /** 1 = primeira vez; 2 = "pela 2ª vez"... (histórico do aparelho, funciona sem sinal). */
  vezes?: number;
  /** Ação da correção anterior do mesmo critério que foi resolvida. */
  acaoQueFuncionou?: string;
  /** Número da visita que trouxe a ação que funcionou (para o chip "Ação que funcionou antes · Visita N"). */
  acaoQueFuncionouVisita?: number;
  /** Último responsável das correções deste ambiente (proposta, o RT confirma). */
  responsavelSugerido?: string;
  /** Chips de memória: últimos responsáveis e últimas ações da empresa. */
  memoriaResponsaveis?: string[];
  memoriaAcoes?: string[];
  causaRaiz?: string;
  orientacao: string;
  /** Ação corretiva real do critério (catálogo normativo); ainda não existe nos dados. */
  acaoSugerida?: string;
  /** A ação padrão só aparece depois de validada pelo RT. */
  acaoSugeridaValidada?: boolean;
  pop: { codigo: string; titulo: string; existe: boolean } | null;
  /** Ação corretiva cadastrada no POP vigente da NC; sem POP aprovado ou sem ação, fica vazio e o bloco não aparece. */
  acaoDoPop?: { codigo: string; texto: string };
  evidencias: { id: string; tipo: string; nome: string; quando: string; url: string }[];
  /** Par antes/depois da correção (fotos da não conformidade e a foto anexada ao resolver). */
  par?: { antes: FotoDoPar[]; depois: FotoDoPar[] };
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
  onSalvarPlano: (id: string, dados: { acao: string; responsavel: string; prazo: string; etapa: EtapaCorrecao; causaRaiz?: string }) => void;
  onRegistrar: (id: string, texto: string, status: StatusNc) => void;
  onAdicionarEvidencia: (id: string) => void;
  /** Anexa a foto do "depois" (passa pela fila offline como qualquer evidência). */
  onFotoDepois?: (ncId: string, arquivo: File) => void;
  onCriarPop: (codigo: string) => void;
  /** RT e Administrador: abre a prévia do lembrete ao responsável do estabelecimento (saiu do Início). */
  onLembrete?: () => void;
  onAbrirPop: () => void;
  onLote: (ids: string[], valores: { responsavel: string; prazo: string }) => void;
  onVoltar: () => void;
  /** Pessoas da empresa, para sugerir o responsável. */
  pessoas: string[];
  onVerNoChecklist: (checklistItemId: string, ambiente: string) => void;
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

function dataCurta(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : iso;
}
function quandoCurto(iso: string) {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return "";
  const hora = formatarHora(iso);
  return dataISOLocal(iso) === hojeLocalISO() ? `hoje ${hora}` : `${formatarDataCurta(iso)} ${hora}`;
}
function dataMes(iso: string) {
  const [, mes, dia] = iso.split("-");
  return mes && dia ? `${dia}/${mes}` : iso;
}

/** A aba aberta ao entrar: a da correção escolhida; senão a primeira etapa que tem itens. A lista sempre mostra só a etapa da aba. */
function etapaInicial(itens: CorrecaoItem[], escolhidaId: string): EtapaCorrecao {
  const escolhida = itens.find((nc) => nc.id === escolhidaId);
  if (escolhida) return etapaDaCorrecao(escolhida);
  return ETAPAS.map((passo) => passo.chave).find((chave) => itens.some((nc) => etapaDaCorrecao(nc) === chave)) ?? "identificadas";
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
  onFotoDepois,
  onCriarPop,
  onLembrete,
  onAbrirPop,
  onLote,
  pessoas,
  onVerNoChecklist,
}: Props) {
  const [etapa, setEtapa] = useState<EtapaCorrecao>(() => etapaInicial(itens, selecionadaInicial));
  const [agrupar, setAgrupar] = useState<Agrupar>("gravidade");
  const [rapidos, setRapidos] = useState<{ recorrentes: boolean; semResp: boolean; atrasadas: boolean }>({ recorrentes: false, semResp: false, atrasadas: false });
  const [escolhidaId, setEscolhidaId] = useState(selecionadaInicial);
  const [lote, setLote] = useState(false);
  const [aviso, setAviso] = useState("");
  const [filtrarAberto, setFiltrarAberto] = useState(false);
  // Rascunho por correção (só os campos editados), só na memória desta tela: trocar de cartão ou de etapa não descarta o que foi digitado.
  // Salvar, resolver, marcar/desfazer feita e aplicar em lote limpam; sair da tela, trocar de empresa/usuário ou sair da conta desmonta (a página usa key).
  const [rascunhos] = useState(criarRascunhosDeCorrecao);

  const contagem = contarEtapas(itens);
  const recorrentes = itens.filter((nc) => nc.reincidente).length;
  const semResp = itens.filter((nc) => nc.status !== "Resolvida" && !nc.responsavelAcao.trim()).length;
  const atrasadas = itens.filter((nc) => ncAtrasada(nc, hoje)).length;

  const filtrados = useMemo(
    () =>
      itens.filter((nc) => {
        if (etapaDaCorrecao(nc) !== etapa) return false;
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
    if (!aviso) return;
    const tempo = window.setTimeout(() => setAviso(""), 2600);
    return () => window.clearTimeout(tempo);
  }, [aviso]);

  const salvarPlano: Props["onSalvarPlano"] = (id, dados) => {
    onSalvarPlano(id, dados);
    rascunhos.limpar(id);
    setEtapa(dados.etapa);
    setAviso("Plano salvo");
  };

  const registrarAtualizacao: Props["onRegistrar"] = (id, texto, status) => {
    onRegistrar(id, texto, status);
    if (status === "Resolvida") rascunhos.limpar(id);
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
  const etapaAtiva = etapa;
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
      <h1 className="sr-only">Correções</h1>
      <p className="sr-only">{subtitulo}</p>

      <div className="pc-etapas" role="group" aria-label="Etapas das correções">
        {ETAPAS.map((passo) => (
          <button
            key={passo.chave}
            type="button"
            className={`pc-etapa ${passo.classe}${etapaAtiva === passo.chave ? " is-ativa" : ""}${contagem[passo.chave] === 0 ? " is-zero" : ""}${etapa === passo.chave ? " is-on" : ""}`}
            aria-pressed={etapa === passo.chave}
            onClick={() => setEtapa(passo.chave)}
          >
            <span className="pc-etapa-label">{passo.rotulo}</span>
            <span className="pc-etapa-num">{contagem[passo.chave]}</span>
          </button>
        ))}
      </div>

      {itens.length === 0 ? (
        <div className="ui-empty">Nenhuma não conformidade nesta visita. Itens marcados como Não Conforme no checklist aparecem aqui.</div>
      ) : (
        <div className="pc-master pc-master--corr">
          <div className="pc-master-list">
            <div className="pc-cor-barra">
              <span className="pc-cor-agrupar">Agrupar por</span>
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
            <div className="ui-scroll">
              {ordenados.length === 0 ? (
                <div className="ui-empty">Nenhuma correção neste filtro.</div>
              ) : (
                grupos
                  .filter((grupo) => grupo.itens.length > 0)
                  .map((grupo) => (
                    <div key={grupo.rotulo} className="ui-list">
                      <div className="ui-group-title">
                        {agrupar === "gravidade" && <i className="pc-grupo-ponto" style={{ "--grav": COR_DA_GRAVIDADE[grupo.itens[0].gravidade] } as React.CSSProperties} aria-hidden="true" />}
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
                            title={`${NOME_DA_GRAVIDADE[nc.gravidade]} · ${linha.titulo}`}
                            onClick={() => setEscolhidaId(nc.id)}
                          >
                            <span className="pc-cor-titulo">{linha.titulo}</span>
                            <span className="pc-cor-topo">
                              <span className="pc-cor-pino">
                                <IconePino />
                                <span className="pc-cor-ambiente">{linha.ambiente}</span>
                                {nc.itemNumero > 0 && <span className="pc-cor-item">· item {nc.itemNumero}</span>}
                              </span>
                              {nc.reincidente && <span className="pc-cor-aviso">Reincidente</span>}
                              {nc.marcadaFeita && nc.status !== "Resolvida" && <span className="pc-cor-aviso">Feita, aguardando confirmação</span>}
                            </span>
                            <span className="pc-cor-seta" aria-hidden="true">›</span>
                          </button>
                        );
                      })}
                    </div>
                  ))
              )}
            </div>
            <div className="pc-cor-rodape">
              {podeEditar && (
                <button type="button" className="pc-cor-botao" onClick={() => setLote(true)} disabled={itens.every((nc) => nc.status === "Resolvida")}>
                  Definir em lote
                </button>
              )}
              <div className="pc-filtrar">
                <button type="button" className={`pc-cor-botao${filtrosAtivos > 0 ? " is-on" : ""}`} aria-haspopup="true" aria-expanded={filtrarAberto} onClick={() => setFiltrarAberto((aberto) => !aberto)}>
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
          </div>

          <div className="pc-detail pc-detail--corr">
            {selecionada ? (
              <Detalhe
                key={selecionada.id}
                nc={selecionada}
                hoje={hoje}
                podeEditar={podeEditar}
                podeEvidenciar={podeEvidenciar}
                podeMarcar={podeMarcar}
                pessoas={pessoas}
                onMarcarFeita={(id, observacao) => {
                  onMarcarFeita(id, observacao);
                  rascunhos.limpar(id);
                }}
                onDesfazerFeita={(id) => {
                  onDesfazerFeita(id);
                  rascunhos.limpar(id);
                }}
                onSalvarPlano={salvarPlano}
                onRegistrar={registrarAtualizacao}
                rascunhos={rascunhos}
                onAdicionarEvidencia={onAdicionarEvidencia}
                onFotoDepois={onFotoDepois}
                onCriarPop={onCriarPop}
                onAbrirPop={onAbrirPop}
                onVerNoChecklist={onVerNoChecklist}
                onLembrete={onLembrete}
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
            ids.forEach((id) => rascunhos.limpar(id));
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
  podeEditar,
  podeEvidenciar,
  podeMarcar,
  onMarcarFeita,
  onDesfazerFeita,
  onSalvarPlano,
  onRegistrar,
  onAdicionarEvidencia,
  onFotoDepois,
  onCriarPop,
  onAbrirPop,
  pessoas,
  onVerNoChecklist,
  onLembrete,
  onProxima,
  temOutras,
  rascunhos,
}: {
  rascunhos: RascunhosDeCorrecao;
  onLembrete?: () => void;
  pessoas: string[];
  onVerNoChecklist: Props["onVerNoChecklist"];
  onProxima: () => void;
  temOutras: boolean;
  nc: CorrecaoItem;
  hoje: string;
  podeEditar: boolean;
  podeEvidenciar: boolean;
  podeMarcar: boolean;
  onMarcarFeita: Props["onMarcarFeita"];
  onDesfazerFeita: Props["onDesfazerFeita"];
  onSalvarPlano: Props["onSalvarPlano"];
  onRegistrar: Props["onRegistrar"];
  onAdicionarEvidencia: Props["onAdicionarEvidencia"];
  onFotoDepois?: Props["onFotoDepois"];
  onCriarPop: Props["onCriarPop"];
  onAbrirPop: Props["onAbrirPop"];
}) {
  // O responsável começa vazio (o RT escolhe); o último responsável do ambiente aparece como o primeiro chip. Prazo = o da gravidade.
  const planoDaCorrecao = { acao: nc.acaoCorretiva, responsavel: nc.responsavelAcao || "", prazo: nc.prazo || prazoSugerido(nc.gravidade, hoje).data, causa: nc.causaRaiz || "" };
  const [aoAbrir] = useState(() => planoAoAbrir(planoDaCorrecao, rascunhos.obter(nc.id)));
  const [acao, setAcao] = useState(aoAbrir.acao);
  const [responsavel, setResponsavel] = useState(aoAbrir.responsavel);
  const [prazo, setPrazo] = useState(aoAbrir.prazo);
  const [causa, setCausa] = useState(aoAbrir.causa);
  const baseRef = useRef(planoDaCorrecao);
  baseRef.current = planoDaCorrecao;
  // Só reage ao que a pessoa digita (não ao salvar): o rascunho some quando o texto volta a ser o da correção.
  useEffect(() => {
    rascunhos.guardar(nc.id, { acao, responsavel, prazo, causa }, baseRef.current);
  }, [rascunhos, nc.id, acao, responsavel, prazo, causa]);
  const causaRef = useRef<HTMLInputElement | null>(null);
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
  const erroCausa = validarCausaRaiz(nc.reincidente, causa);
  // Nenhum erro ao abrir: o campo só acusa depois de sair dele vazio (ou ao tentar salvar).
  const mostrarErro = (campo: CampoDoPlano) => (tentou || tocado[campo] || Boolean(prazo && campo === "prazo")) && erros[campo];
  const marcarTocado = (campo: CampoDoPlano) => setTocado((atual) => ({ ...atual, [campo]: true }));
  const vazioNoPlano: Record<CampoDoPlano, boolean> = { acao: !acao.trim(), responsavel: !responsavel.trim(), prazo: !prazo };

  function salvar() {
    setTentou(true);
    if (erroCausa) {
      setFaltas(erroCausa);
      causaRef.current?.focus();
      return;
    }
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
    onSalvarPlano(nc.id, { acao, responsavel, prazo, etapa: etapaAlvo, ...(nc.reincidente ? { causaRaiz: causa.trim() } : {}) });
    setTentou(false);
  }

  // A mensagem do botão some assim que tudo é preenchido.
  useEffect(() => {
    if (faltas && Object.keys(erros).length === 0 && !erroCausa) setFaltas("");
  }, [faltas, erros, erroCausa]);

  const vazio = (valor: string) => !valor.trim();

  // Chips: só pessoas cadastradas na empresa (e o usuário atual), no máximo 3; nome digitado à mão em outra correção nunca vira sugestão.
  const nomesSugeridos = sugestoesDeResponsavel({ cadastradas: pessoas, ultimoDoAmbiente: nc.responsavelSugerido, escolhido: responsavel, limite: 3 });
  const responsavelVazio = vazio(responsavel);
  const faltaParaSalvar = [vazio(acao) ? "a ação" : "", responsavelVazio ? "o responsável" : "", erros.prazo ? "o prazo" : "", erroCausa ? "a causa raiz" : ""].filter(Boolean);
  const motivoDoBotao = textoDoQueFalta(faltaParaSalvar);
  const [registrando, setRegistrando] = useState(false);
  const contextoDaLinha = linhaDaCorrecao(nc);
  const funcionouVisivel = nc.reincidente && Boolean(nc.acaoQueFuncionou) && acao.trim() !== nc.acaoQueFuncionou;
  const [sugestoesAbertas, setSugestoesAbertas] = useState(false);
  const sugestoes: { rotulo: string; texto: string }[] = [
    ...(acaoPadraoVisivel(nc) ? [{ rotulo: "Ação padrão do critério", texto: acaoPadraoVisivel(nc) }] : []),
    ...(nc.acaoDoPop ? [{ rotulo: `Ação do POP ${nc.acaoDoPop.codigo}`, texto: nc.acaoDoPop.texto }] : []),
    ...(nc.memoriaAcoes || []).map((texto) => ({ rotulo: "Usada antes", texto })),
  ].filter((item, indice, todos) => item.texto && item.texto !== acao.trim() && item.texto !== nc.acaoQueFuncionou && todos.findIndex((outro) => outro.texto === item.texto) === indice);

  return (
    <>
      <div className="pc-detail-head">
        <div className="pc-detail-titulo-linha">
          <h2 className="pc-detail-title" title={nc.titulo}>
            {nc.titulo}
          </h2>
          {nc.checklistItemId && (
            <button type="button" className="pc-detail-ver" onClick={() => onVerNoChecklist(nc.checklistItemId, nc.ambiente)}>
              Ver no checklist ›
            </button>
          )}
        </div>
        <div className="pc-detail-contexto">
          <span className="pc-detail-ponto" style={{ "--grav": COR_DA_GRAVIDADE[nc.gravidade] } as React.CSSProperties} aria-hidden="true" />
          {NOME_DA_GRAVIDADE[nc.gravidade]} · {contextoDaLinha.codigo} · {contextoDaLinha.ambiente}
          {nc.itemNumero > 0 ? ` · item ${nc.itemNumero}` : ""}
          {nc.reincidente ? ` · ${seloDaReincidencia(nc.vezes || 0) || "Reincidente"}` : ""}
        </div>
        <div className="pc-detail-fonte">
          {nc.criterio ? `${nc.criterio} · ` : ""}
          {nc.referencia ? `Fonte: ${nc.referencia}` : "Fonte não registrada"}
          {nc.pop?.existe && (
            <button type="button" className="pc-detail-pop" title={`${nc.pop.codigo ? nc.pop.codigo + " · " : ""}${nc.pop.titulo}`} onClick={onAbrirPop}>
              POP
            </button>
          )}
        </div>
      </div>

      <div className="ui-scroll pc-detail-scroll">
        {nc.marcadaFeita && !resolvida && (
          <div className="pc-feita" role="status">
            <span>
              Feita, aguardando confirmação · por {nc.marcadaFeita.por} em {formatarDataHora(nc.marcadaFeita.em)}
              {nc.marcadaFeita.observacao ? ` — ${nc.marcadaFeita.observacao}` : ""}
            </span>
            {podeEditar ? (
              <button
                type="button"
                className="ui-btn ui-btn--acao"
                onClick={() => {
                  setStatusNovo("Resolvida");
                  setRegistrando(true);
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
              className="ui-btn ui-btn--acao pc-self-start"
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
          {nc.reincidente && (
            <div className="pc-plan-block">
              <span className="ui-eyebrow">
                Causa raiz <span className="pc-obrig">· obrigatória: o problema voltou</span>
              </span>
              <div className="pc-memoria" role="group" aria-label="Causas comuns">
                {CAUSAS_RAIZ.map((opcao) => (
                  <button key={opcao} type="button" className={`pc-chip-btn pc-chip-btn--soft${causa === opcao ? " is-on" : ""}`} disabled={bloqueado} aria-pressed={causa === opcao} onClick={() => setCausa(opcao)}>
                    {opcao}
                  </button>
                ))}
              </div>
              <input ref={causaRef} className={`ui-input${tentou && erroCausa ? " is-invalid" : ""}`} value={causa} disabled={bloqueado} onChange={(evento) => setCausa(evento.target.value)} placeholder="Por que voltou a acontecer?" aria-label="Causa raiz" aria-invalid={Boolean(tentou && erroCausa)} />
              {tentou && erroCausa && <span className="ui-field-error">{erroCausa}</span>}
            </div>
          )}

          <div className="pc-plan-block pc-plan-acao">
            <span className="ui-eyebrow">
              O que será feito <span className="pc-obrig">· obrigatório</span>
            </span>
            <textarea
              ref={acaoRef}
              className={`ui-input pc-acao-area${mostrarErro("acao") ? " is-invalid" : ""}`}
              value={acao}
              disabled={bloqueado}
              onChange={(evento) => setAcao(evento.target.value)}
              onBlur={() => marcarTocado("acao")}
              placeholder="Descreva a ação corretiva"
              aria-label="O que será feito (ação corretiva)"
              aria-invalid={Boolean(mostrarErro("acao"))}
            />
            {!bloqueado && (
              <div className="pc-acao-linha">
                <span className="ui-field-tools">
                  <FieldVoiceTools fieldKey={`acao-${nc.id}`} value={acao} onChange={setAcao} rotuloIa="Sugerir com IA" contexto="Ação corretiva para uma não conformidade em segurança dos alimentos." />
                </span>
                {funcionouVisivel && (
                  <button type="button" className="pc-chip-btn pc-chip-btn--soft pc-chip-funcionou" title={nc.acaoQueFuncionou} onClick={() => setAcao(nc.acaoQueFuncionou as string)}>
                    ↺ Ação que funcionou antes{nc.acaoQueFuncionouVisita ? ` · Visita ${nc.acaoQueFuncionouVisita}` : nc.dataAnterior ? ` · visita de ${dataMes(nc.dataAnterior)}` : ""}
                  </button>
                )}
                {sugestoes.length > 0 && (
                  <button type="button" className="pc-acao-mais" aria-expanded={sugestoesAbertas} onClick={() => setSugestoesAbertas((aberto) => !aberto)}>
                    {sugestoesAbertas ? "Recolher sugestões" : `+${sugestoes.length} ${sugestoes.length === 1 ? "sugestão" : "sugestões"}`}
                  </button>
                )}
              </div>
            )}
            {!bloqueado && sugestoesAbertas && sugestoes.length > 0 && (
              <div className="pc-acao-sugestoes" role="group" aria-label="Outras sugestões de ação">
                {sugestoes.map((sugestao) => (
                  <button key={`${sugestao.rotulo}:${sugestao.texto}`} type="button" className="pc-acao-sugestao" title={sugestao.texto} onClick={() => setAcao(sugestao.texto)}>
                    <span className="pc-acao-sugestao-rotulo">{sugestao.rotulo}</span>
                    <span className="pc-acao-sugestao-texto">{sugestao.texto}</span>
                  </button>
                ))}
              </div>
            )}
            {mostrarErro("acao") && <span className="ui-field-error">{erros.acao}</span>}
          </div>

          <div className="pc-plan-campos">
            <div className="pc-plan-block pc-plan-resp">
              <span className="pc-plan-rotulo">
                <label htmlFor={`resp-${nc.id}`}>Responsável</label>
                {onLembrete && (
                  <button type="button" className="pc-plan-lembrete" onClick={onLembrete}>
                    Enviar lembrete
                  </button>
                )}
              </span>
              <input
                id={`resp-${nc.id}`}
                ref={responsavelRef}
                className={`ui-input ui-input--lista${!bloqueado && responsavelVazio ? " is-invalid" : ""}`}
                value={responsavel}
                list={`pessoas-${nc.id}`}
                disabled={bloqueado}
                onChange={(evento) => setResponsavel(evento.target.value)}
                onBlur={() => marcarTocado("responsavel")}
                placeholder={bloqueado ? "Sem responsável" : "Escolha o responsável"}
                aria-invalid={!bloqueado && responsavelVazio}
              />
              <datalist id={`pessoas-${nc.id}`}>
                {pessoas.map((pessoa) => (
                  <option key={pessoa} value={pessoa} />
                ))}
              </datalist>
              {!bloqueado && nomesSugeridos.length > 0 && (
                <span className="pc-memoria" role="group" aria-label="Responsáveis sugeridos">
                  {nomesSugeridos.map((nome) => (
                    <button key={nome} type="button" className="pc-chip-btn pc-chip-btn--soft" onClick={() => setResponsavel(nome)}>
                      {nome}
                    </button>
                  ))}
                </span>
              )}
            </div>
            <label className="pc-plan-block pc-plan-prazo">
              <span className="pc-plan-rotulo">Prazo</span>
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
                  aria-describedby={mostrarErro("prazo") ? `prazo-erro-${nc.id}` : undefined}
                />
                {mostrarErro("prazo") ? (
                  <span id={`prazo-erro-${nc.id}`} className="pc-prazo-erro" role="alert">
                    {erros.prazo}
                  </span>
                ) : (
                  !bloqueado && (
                  <button type="button" className="pc-prazo-sugerido" title={`Usar ${dataMes(sugestao.data)}`} onClick={() => setPrazo(sugestao.data)}>
                    {sugestao.dias} dias · {nc.gravidade === "Rotina" ? "leve" : nc.gravidade.toLocaleLowerCase("pt-BR")}
                  </button>
                  )
                )}
              </span>
            </label>
          </div>
        </div>
        {resolvida && <div className="ui-note">Correção resolvida: o plano está protegido. Novas atualizações ou reabertura ficam em Atualizações.</div>}

        <div className="pc-detail-duas">
          <section className="pc-detail-secao" aria-label="Evidências">
            <div className="pc-detail-secao-titulo">
              Evidências <span>{nc.evidencias.length}</span>
            </div>
            {nc.par ? (
              <AntesDepois
                variante="pc"
                antes={nc.par.antes}
                depois={nc.par.depois}
                podeAdicionar={podeEvidenciar && Boolean(onFotoDepois)}
                resolvida={resolvida}
                onFotoDepois={(arquivo) => onFotoDepois?.(nc.id, arquivo)}
              />
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
                    <span className="pc-detail-ev-data">{ev.quando}</span>
                  </a>
                ))}
                {podeEvidenciar && (
                  <button type="button" className="pc-detail-foto" onClick={() => onAdicionarEvidencia(nc.id)}>
                    + Foto
                  </button>
                )}
              </div>
            )}
          </section>

          <section className="pc-detail-secao" aria-label="Atualizações">
            <div className="pc-detail-secao-titulo">
              Atualizações <span>{nc.historico.length}</span>
            </div>
            {nc.historico.length === 0 ? (
              <p className="pc-sem-atualizacoes">
                <span>Sem atualizações</span>
                {podeEditar && !registrando && (
                  <>
                    <span aria-hidden="true"> · </span>
                    <button type="button" className="pc-detail-registrar" onClick={() => setRegistrando(true)}>
                      + Registrar
                    </button>
                  </>
                )}
              </p>
            ) : (
              <div className="pc-history">
                {nc.historico.map((item) => (
                  <div key={item.id} className="pc-history-item">
                    <span className={`pc-history-ponto is-${item.status === "Resolvida" ? "ok" : item.status === "Em tratamento" ? "pend" : "nc"}`} aria-hidden="true" />
                    <span className="pc-history-corpo">
                      <span className="pc-history-text">{item.observacao}</span>
                      <span className="pc-history-quando">{item.quando}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
            {podeEditar && !registrando && nc.historico.length > 0 && (
              <button type="button" className="pc-detail-registrar" onClick={() => setRegistrando(true)}>
                {resolvida ? "Registrar nova atualização / reabrir" : "+ Registrar atualização"}
              </button>
            )}
            {podeEditar && registrando && (
              <div className="pc-update">
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
                <div className="pc-update-acoes">
                  <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setRegistrando(false)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="ui-btn ui-btn--save"
                    disabled={!texto.trim()}
                    onClick={() => {
                      onRegistrar(nc.id, texto, statusNovo);
                      setTexto("");
                      setRegistrando(false);
                    }}
                  >
                    {statusNovo === "Resolvida" && !resolvida ? "Concluir e registrar" : "Registrar atualização"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="pc-detail-foot pc-detail-foot--plano">
        {faltas && !bloqueado && faltaParaSalvar.length === 0 && (
          <span className="pc-falta" role="alert">
            {faltas}
          </span>
        )}
        {!bloqueado && motivoDoBotao && (
          <span id={`falta-${nc.id}`} className="pc-falta pc-falta--motivo">
            {motivoDoBotao}
          </span>
        )}
        {temOutras && (
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onProxima}>
            Próxima correção →
          </button>
        )}
        {!bloqueado && (
          <button
            type="button"
            className="ui-btn ui-btn--save"
            disabled={faltaParaSalvar.length > 0}
            aria-describedby={motivoDoBotao ? `falta-${nc.id}` : undefined}
            onClick={salvar}
          >
            Salvar plano
          </button>
        )}
      </div>
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
            <button type="button" className="ui-btn ui-btn--acao" disabled={marcadas.length === 0} onClick={aplicar}>
              Aplicar a {marcadas.length}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
