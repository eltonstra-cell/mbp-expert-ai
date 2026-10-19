"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import FieldVoiceTools from "@/components/FieldVoiceTools";
import { RowMenu } from "@/components/ui/RowMenu";
import { Pill } from "@/components/ui/Pill";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { avisar } from "@/lib/dialogos";
import { dependenciasDoNavegador, validarFotoEscolhida } from "@/lib/fotoCompressao";

export type AnaliseEvidencia = {
  id: string;
  status: "Aguardando revisão" | "Confirmada" | "Descartada" | string;
  situacao: string;
  resumo: string;
  acao: string;
  textoRevisado: string;
  revisadoPor: string;
  podeRevisar: boolean;
};

export type CartaoEvidencia = {
  id: string;
  tipo: "Foto" | "Áudio";
  /** "Ambiente · Item N" (ou só o ambiente). */
  titulo: string;
  descricao: string;
  /** "Ambiente · Item N · texto do item", mostrado na foto ampliada. */
  vinculo: string;
  dataCurta: string;
  dataCompleta: string;
  url: string;
  possivelNc: boolean;
  analise: AnaliseEvidencia | null;
  podeAnalisar: boolean;
  analisando: boolean;
  bloqueioIA: boolean;
  mensagemIA: string;
  podeExcluir: boolean;
  onAnalisar: () => void;
  onConfirmar: (texto: string) => void;
  onDescartar: () => void;
  onExcluir: () => void;
};

export type GrupoDeAmbiente = {
  nome: string;
  rotulo: string;
  itens: { id: string; numero: number; titulo: string }[];
};

type Props = {
  empresa: string;
  data: string;
  totais: { evidencias: number; fotos: number; audios: number; revisar: number };
  evidencias: CartaoEvidencia[];
  podeAdicionar: boolean;
  vinculo: { ambiente: string; item: string; temItem: boolean };
  grupos: GrupoDeAmbiente[];
  ambienteSel: string;
  itemSel: string;
  onAmbiente: (valor: string) => void;
  onItem: (valor: string) => void;
  descricao: string;
  onDescricao: (valor: string) => void;
  mensagem: string;
  onFoto: (arquivo: File | undefined) => boolean | void | Promise<boolean | void>;
  onAudio: (arquivo: File | undefined) => boolean | void | Promise<boolean | void>;
  /** Apaga o aviso curto do rodapé (ao cancelar). */
  onLimparMensagem?: () => void;
};

type Aba = "todas" | "fotos" | "audios" | "revisar";
type Anexo = { arquivo: File; tipo: "Foto" | "Áudio" };

const PRAZO_DESFAZER_MS = 6000;

function Icone({ children, tamanho = 18 }: { children: ReactNode; tamanho?: number }) {
  return (
    <svg aria-hidden="true" width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const CameraIcon = () => (
  <Icone tamanho={20}>
    <path d="M4 8h3l1.6-2h6.8L17 8h3v11H4z" />
    <circle cx="12" cy="13" r="3.4" />
  </Icone>
);
const FolderIcon = () => (
  <Icone tamanho={20}>
    <path d="M3 7h6l2 2h10v10H3z" />
  </Icone>
);
const MicIcon = () => (
  <Icone tamanho={20}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M6 10a6 6 0 0 0 12 0M12 16v5M9 21h6" />
  </Icone>
);
const PinIcon = () => (
  <Icone>
    <path d="M12 21s-6-5.2-6-10a6 6 0 0 1 12 0c0 4.8-6 10-6 10z" />
    <circle cx="12" cy="11" r="2.2" />
  </Icone>
);
const ExpandIcon = ({ tamanho = 12 }: { tamanho?: number }) => (
  <Icone tamanho={tamanho}>
    <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
  </Icone>
);
const PlayIcon = () => (
  <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 4l13 8-13 8z" />
  </svg>
);
const PauseIcon = () => (
  <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
  </svg>
);

/** Caixa da sugestão da IA: fundo #FFFBF2 com barra âmbar à esquerda. */
function CaixaIA({ ev, vazia = false }: { ev: CartaoEvidencia; vazia?: boolean }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const analise = ev.analise;

  if (!analise) {
    if (!vazia) return null;
    return (
      <div className="ev7-ia">
        <div className="ev7-ia-rotulo">✦ Análise da IA</div>
        <p className="ev7-ia-texto">Ainda não analisada. A IA só sugere; nada vira NC sem a sua confirmação.</p>
        {ev.podeAnalisar && (
          <div className="ev7-ia-acoes">
            <button type="button" className="ev7-btn-ia" disabled={ev.analisando || ev.bloqueioIA} onClick={ev.onAnalisar}>
              {ev.analisando ? "Analisando..." : "✦ Analisar com IA"}
            </button>
          </div>
        )}
      </div>
    );
  }

  const aguardando = analise.status === "Aguardando revisão";
  if (analise.status === "Descartada") {
    return <p className="ev7-ia-descartada">Sugestão descartada. Não integra o registro técnico.</p>;
  }

  return (
    <div className="ev7-ia">
      <div className="ev7-ia-rotulo">
        {aguardando ? (
          <>✦ Sugestão da IA <span>· confirme antes de valer</span></>
        ) : (
          <>✦ Análise da IA <span>· confirmada por {analise.revisadoPor || "profissional"}</span></>
        )}
      </div>
      {analise.situacao && (
        <div className="ev7-chips">
          <Pill tom={analise.situacao === "Conforme" ? "ok" : analise.situacao === "Atenção" ? "pend" : analise.situacao === "Possível não conformidade" ? "nc" : "na"}>{analise.situacao}</Pill>
        </div>
      )}
      <p className="ev7-ia-texto">
        {aguardando ? analise.resumo : analise.textoRevisado || analise.resumo}
        {aguardando && analise.acao ? ` Ação: ${analise.acao}` : ""}
      </p>
      {aguardando && analise.podeRevisar && (
        <>
          {editando && (
            <span className="ui-field-wrap ui-field-wrap--area">
              <textarea className="ui-input pc-input-tools" rows={3} value={texto} onChange={(evento) => setTexto(evento.target.value)} aria-label="Texto da análise" />
              <span className="ui-field-tools">
                <FieldVoiceTools
                  fieldKey={`analise-${analise.id}`}
                  value={texto}
                  onChange={setTexto}
                  contexto="Texto técnico de análise de evidência fotográfica em segurança dos alimentos."
                />
              </span>
            </span>
          )}
          <div className="ev7-ia-acoes">
            <button type="button" className="ui-btn ui-btn--save ui-btn--small" onClick={() => ev.onConfirmar(editando ? texto : analise.textoRevisado)}>
              Confirmar
            </button>
            <button
              type="button"
              className="ui-btn ui-btn--secondary ui-btn--small"
              onClick={() => {
                if (!editando) setTexto(analise.textoRevisado);
                setEditando((aberto) => !aberto);
              }}
            >
              {editando ? "Fechar edição" : "Editar texto"}
            </button>
            <button type="button" className="ev7-link" onClick={ev.onDescartar}>
              Descartar
            </button>
          </div>
        </>
      )}
      {aguardando && !analise.podeRevisar && <p className="ev7-ia-nota">Aguarda revisão de um Administrador ou Consultor/RT.</p>}
    </div>
  );
}

function Cartao({ ev, onAmpliar }: { ev: CartaoEvidencia; onAmpliar: (id: string) => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [tocando, setTocando] = useState(false);
  const aguardando = ev.analise?.status === "Aguardando revisão";
  const mostrarAnalisar = ev.tipo === "Foto" && ev.podeAnalisar && !aguardando;

  function alternarAudio() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }

  return (
    <article className="ev7-card">
      <div className="ev7-card-topo">
        <h3 className="ev7-card-titulo">{ev.titulo}</h3>
        {ev.podeExcluir && (
          <RowMenu
            itens={[
              ev.tipo === "Foto" && ev.url
                ? { rotulo: "Ampliar foto", onClick: () => onAmpliar(ev.id) }
                : { rotulo: "Abrir arquivo", onClick: () => window.open(ev.url, "_blank", "noopener"), desabilitado: !ev.url },
              { rotulo: "Excluir evidência", perigo: true, onClick: ev.onExcluir },
            ]}
          />
        )}
      </div>
      <p className="ev7-card-desc">{ev.descricao || (ev.tipo === "Áudio" ? "Registro de voz." : "Sem descrição.")}</p>
      <div className="ev7-chips">
        {ev.tipo === "Foto" ? (
          <button type="button" className="ev7-chip ev7-chip--botao" disabled={!ev.url} onClick={() => onAmpliar(ev.id)} aria-label="Ver foto ampliada">
            <ExpandIcon /> Ver foto
          </button>
        ) : (
          <>
            <button type="button" className="ev7-chip ev7-chip--botao" disabled={!ev.url} onClick={alternarAudio} aria-label={tocando ? "Pausar áudio" : "Ouvir áudio"}>
              {tocando ? <PauseIcon /> : <PlayIcon />} {tocando ? "Pausar" : "Ouvir"}
            </button>
            {ev.url && (
              <audio ref={audioRef} src={ev.url} preload="none" onPlay={() => setTocando(true)} onPause={() => setTocando(false)} onEnded={() => setTocando(false)} />
            )}
          </>
        )}
        <span className="ev7-chip">{ev.dataCurta}</span>
        {aguardando && <span className="ev7-chip ev7-chip--ia">IA aguardando revisão</span>}
        {ev.possivelNc && <Pill tom="nc">Possível NC</Pill>}
        {mostrarAnalisar && (
          <button type="button" className="ev7-btn-ia ev7-chips-fim" disabled={ev.analisando || ev.bloqueioIA} onClick={ev.onAnalisar}>
            {ev.analisando ? "Analisando..." : ev.analise ? "✦ Analisar novamente" : "✦ Analisar com IA"}
          </button>
        )}
      </div>
      {ev.mensagemIA && <div className="ev7-nota">{ev.mensagemIA}</div>}
      <CaixaIA ev={ev} />
    </article>
  );
}

export default function PcEvidencias({
  empresa,
  data,
  totais,
  evidencias,
  podeAdicionar,
  vinculo,
  grupos,
  ambienteSel,
  itemSel,
  onAmbiente,
  onItem,
  descricao,
  onDescricao,
  mensagem,
  onFoto,
  onAudio,
  onLimparMensagem,
}: Props) {
  const [aba, setAba] = useState<Aba>("todas");
  // No celular o formulário é uma tela própria; no tablet e no PC fica sempre ao lado da lista.
  const [formAberto, setFormAberto] = useState(false);
  const [trocando, setTrocando] = useState(false);
  const [ambienteAberto, setAmbienteAberto] = useState("");
  const [pendente, setPendente] = useState<Anexo | null>(null);
  const [removendo, setRemovendo] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; desfazer: () => void } | null>(null);
  const [previaUrl, setPreviaUrl] = useState("");
  const [previaAberta, setPreviaAberta] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [ampliadaId, setAmpliadaId] = useState<string | null>(null);
  const descricaoRef = useRef<HTMLTextAreaElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const arquivoRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLInputElement | null>(null);
  const trocarRef = useRef<HTMLInputElement | null>(null);
  const timerAviso = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const [celular, setCelular] = useState(false);

  const temFoto = Boolean(pendente && pendente.tipo === "Foto" && !removendo);
  const temAnexo = Boolean(pendente && !removendo);

  useEffect(() => {
    const consulta = window.matchMedia("(max-width: 767px)");
    const atualizar = () => setCelular(consulta.matches);
    atualizar();
    consulta.addEventListener("change", atualizar);
    return () => consulta.removeEventListener("change", atualizar);
  }, []);

  // Miniatura local: só vive no navegador, nunca vira endereço público.
  useEffect(() => {
    if (!pendente || pendente.tipo !== "Foto") {
      setPreviaUrl("");
      return;
    }
    const url = URL.createObjectURL(pendente.arquivo);
    setPreviaUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendente]);

  useEffect(() => () => {
    if (timerAviso.current) clearTimeout(timerAviso.current);
  }, []);

  // No PC a lista de vínculos nunca passa da borda de baixo do formulário (no celular ela é uma folha fixa).
  useLayoutEffect(() => {
    if (!trocando) return;
    const ajustar = () => {
      const lista = pickerRef.current;
      const formulario = lista?.closest<HTMLElement>(".ev7-form");
      if (!lista || !formulario) return;
      lista.style.maxHeight = "";
      if (getComputedStyle(lista).position !== "absolute") return;
      const espaco = formulario.getBoundingClientRect().bottom - lista.getBoundingClientRect().top - 8;
      lista.style.maxHeight = `${Math.max(160, Math.min(espaco, 460))}px`;
    };
    ajustar();
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, [trocando, ambienteAberto]);

  function limparAviso() {
    if (timerAviso.current) clearTimeout(timerAviso.current);
    timerAviso.current = null;
    setAviso(null);
  }

  function avisarComDesfazer(texto: string, desfazer: () => void, aoExpirar?: () => void) {
    if (timerAviso.current) clearTimeout(timerAviso.current);
    setAviso({
      texto,
      desfazer: () => {
        if (timerAviso.current) clearTimeout(timerAviso.current);
        timerAviso.current = null;
        setAviso(null);
        desfazer();
      },
    });
    timerAviso.current = setTimeout(() => {
      timerAviso.current = null;
      setAviso(null);
      aoExpirar?.();
    }, PRAZO_DESFAZER_MS);
  }

  // A caixa cresce com o texto até o espaço livre do formulário, para o formulário não ganhar barra de rolagem.
  useEffect(() => {
    const ajustar = () => {
      const campo = descricaoRef.current;
      const corpo = campo?.closest<HTMLElement>(".ev7-corpo");
      if (!campo || !corpo || corpo.clientHeight === 0) return;
      campo.style.height = "auto";
      const minimo = campo.offsetHeight;
      const filhos = Array.from(corpo.children) as HTMLElement[];
      const espaco = parseFloat(getComputedStyle(corpo).rowGap) || 0;
      const usado = filhos.reduce((soma, filho) => soma + filho.offsetHeight, 0) + espaco * Math.max(0, filhos.length - 1);
      const maximo = Math.max(minimo, corpo.clientHeight - (usado - minimo) - 2);
      const altura = Math.min(Math.max(campo.scrollHeight, minimo), maximo);
      campo.style.height = `${altura}px`;
      campo.style.overflowY = campo.scrollHeight > altura + 1 ? "auto" : "hidden";
    };
    ajustar();
    window.addEventListener("resize", ajustar);
    const corpo = descricaoRef.current?.closest<HTMLElement>(".ev7-corpo");
    const observador = corpo && typeof ResizeObserver !== "undefined" ? new ResizeObserver(ajustar) : null;
    if (corpo) observador?.observe(corpo);
    return () => {
      window.removeEventListener("resize", ajustar);
      observador?.disconnect();
    };
  }, [descricao, formAberto, temAnexo, aviso, mensagem]);

  // Só entra no formulário o que é mesmo uma foto: o tipo real vale mais que a extensão.
  async function validar(arquivo: File | undefined): Promise<File | null> {
    if (!arquivo) return null;
    const validacao = await validarFotoEscolhida(arquivo, dependenciasDoNavegador);
    if (!validacao.ok) {
      void avisar(validacao.motivo, { titulo: "Arquivo não aceito" });
      return null;
    }
    return arquivo;
  }

  async function escolherFoto(arquivo: File | undefined) {
    const valido = await validar(arquivo);
    if (!valido) return;
    limparAviso();
    setRemovendo(false);
    setPendente({ arquivo: valido, tipo: "Foto" });
  }

  async function trocarFoto(arquivo: File | undefined) {
    const valido = await validar(arquivo);
    if (!valido) return;
    const anterior = pendente;
    setRemovendo(false);
    setPendente({ arquivo: valido, tipo: "Foto" });
    avisarComDesfazer("Foto trocada.", () => setPendente(anterior));
  }

  // A remoção só vale depois do prazo: até lá o anexo fica guardado e dá para desfazer.
  function removerAnexo() {
    if (!pendente) return;
    setRemovendo(true);
    avisarComDesfazer(
      pendente.tipo === "Foto" ? "Foto removida." : "Áudio removido.",
      () => setRemovendo(false),
      () => {
        setPendente(null);
        setRemovendo(false);
      }
    );
  }

  function cancelar() {
    limparAviso();
    setPendente(null);
    setRemovendo(false);
    onDescricao("");
    onLimparMensagem?.();
    setTrocando(false);
    setFormAberto(false);
  }

  async function salvar() {
    if (!pendente || removendo) return;
    const atual = pendente;
    setSalvando(true);
    try {
      const ok = atual.tipo === "Foto" ? await onFoto(atual.arquivo) : await onAudio(atual.arquivo);
      if (ok !== false) {
        limparAviso();
        setPendente(null);
        setFormAberto(false);
      }
    } finally {
      setSalvando(false);
    }
  }

  const visiveis = evidencias.filter((ev) =>
    aba === "todas" ? true : aba === "fotos" ? ev.tipo === "Foto" : aba === "audios" ? ev.tipo === "Áudio" : ev.analise?.status === "Aguardando revisão"
  );
  const fotosVisiveis = visiveis.filter((ev) => ev.tipo === "Foto" && ev.url);
  const indiceAmpliada = ampliadaId ? fotosVisiveis.findIndex((ev) => ev.id === ampliadaId) : -1;
  const ampliada = indiceAmpliada >= 0 ? fotosVisiveis[indiceAmpliada] : null;

  function irPara(passo: 1 | -1) {
    if (fotosVisiveis.length < 2 || indiceAmpliada < 0) return;
    setAmpliadaId(fotosVisiveis[(indiceAmpliada + passo + fotosVisiveis.length) % fotosVisiveis.length].id);
  }

  useEffect(() => {
    if (!ampliada && !previaAberta) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        setAmpliadaId(null);
        setPreviaAberta(false);
      } else if (ampliada && evento.key === "ArrowRight") irPara(1);
      else if (ampliada && evento.key === "ArrowLeft") irPara(-1);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ampliada?.id, previaAberta, fotosVisiveis.length]);

  function abrirSeletor() {
    setTrocando((aberto) => {
      if (!aberto) setAmbienteAberto(ambienteSel || grupos[0]?.nome || "");
      return !aberto;
    });
  }

  function escolherAmbiente(nome: string) {
    onAmbiente(nome);
    setTrocando(false);
  }

  function escolherItem(id: string) {
    onItem(id);
    setTrocando(false);
  }

  const campoDescricao: ReactNode = (
    <span className="ui-field-wrap ui-field-wrap--area">
      <textarea
        ref={descricaoRef}
        className="ui-input pc-input-tools ev7-descricao"
        rows={2}
        value={descricao}
        onChange={(evento) => onDescricao(evento.target.value)}
        placeholder="Ex.: embalagem avariada identificada no recebimento..."
        aria-label="Descrição da evidência"
      />
      <span className="ui-field-tools">
        <FieldVoiceTools
          fieldKey="evidencia-descricao"
          value={descricao}
          onChange={onDescricao}
          contexto="Descrição curta de uma evidência registrada durante inspeção de Boas Práticas."
        />
      </span>
    </span>
  );

  return (
    <section className="ui-screen ev7" aria-label="Evidências da visita">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">Evidências</h1>
          <p className="ui-subtitle">
            Fotos e áudios da visita · {empresa} · {data}
          </p>
        </div>
      </div>

      <div className={`ev7-cols${podeAdicionar ? "" : " is-single"}`}>
        {podeAdicionar && (
          <div className={`ev7-form${formAberto ? " is-aberto" : ""}`}>
            <div className="ev7-campo-topo">
              <button type="button" className="ev7-voltar" onClick={cancelar} aria-label="Voltar para a lista de evidências">
                <Icone tamanho={20}>
                  <path d="M15 5l-7 7 7 7" />
                </Icone>
              </button>
              <div className="ev7-campo-titulos">
                <span className="ev7-campo-sub">Visita de {data}</span>
                <span className="ev7-campo-titulo">Nova evidência</span>
              </div>
            </div>

            <div className="ev7-cabeca">
              <span className="ev7-eyebrow">
                <span className="ev7-ey-pc">Nova evidência</span>
                <span className="ev7-ey-campo">Vinculada a</span>
              </span>
              <button type="button" className="ev7-vinculo" aria-haspopup="dialog" aria-expanded={trocando} onClick={abrirSeletor}>
                <span className="ev7-vinculo-pino"><PinIcon /></span>
                <span className="ev7-vinculo-txt">
                  <span className="ev7-vinculo-amb">{vinculo.ambiente || "Sem ambiente"}</span>
                  <span className="ev7-vinculo-item">{vinculo.temItem ? vinculo.item : "Sem item específico"}</span>
                </span>
                <span className="ev7-vinculo-seta" aria-hidden="true">▾</span>
              </button>

              {trocando && (
                <>
                  <div className="ev7-fundo" onClick={() => setTrocando(false)} />
                  <div className="ev7-picker" role="dialog" aria-label="Vincular evidência a" ref={pickerRef}>
                    <div className="ev7-picker-topo">
                      <span className="ev7-picker-titulo">Vincular evidência a</span>
                      <button type="button" className="ev7-picker-fechar" onClick={() => setTrocando(false)} aria-label="Fechar">
                        ✕
                      </button>
                    </div>
                    <div className="ev7-picker-lista">
                      {grupos.length === 0 && (
                        <button type="button" className="ev7-sem-item is-atual" onClick={() => escolherAmbiente("")}>
                          Sem ambiente específico
                        </button>
                      )}
                      {grupos.map((grupo) => {
                        const aberto = ambienteAberto === grupo.nome;
                        const atual = ambienteSel === grupo.nome;
                        return (
                          <div key={grupo.nome} className="ev7-grupo">
                            <button
                              type="button"
                              className={`ev7-amb${atual ? " is-atual" : ""}`}
                              aria-expanded={aberto}
                              onClick={() => setAmbienteAberto(aberto ? "" : grupo.nome)}
                            >
                              <span className="ev7-amb-nome">{grupo.rotulo}</span>
                              <span className="ev7-amb-cnt">
                                {grupo.itens.length} {grupo.itens.length === 1 ? "item" : "itens"} {aberto ? "▴" : "▾"}
                              </span>
                            </button>
                            {aberto && (
                              <div className="ev7-itens">
                                <button type="button" className={`ev7-sem-item${atual && !itemSel ? " is-atual" : ""}`} onClick={() => escolherAmbiente(grupo.nome)}>
                                  <span>Sem item específico</span>
                                  {atual && !itemSel && <span className="ev7-chip-atual">vínculo atual</span>}
                                </button>
                                {grupo.itens.map((item) => (
                                  <button key={item.id} type="button" className={`ev7-sem-item${itemSel === item.id ? " is-atual" : ""}`} onClick={() => escolherItem(item.id)}>
                                    <span>
                                      Item {item.numero} · {item.titulo}
                                    </span>
                                    {itemSel === item.id && <span className="ev7-chip-atual">vínculo atual</span>}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="ev7-corpo">
              <div className="ev7-capturas">
                <button type="button" className="ev7-cap ev7-cap--foto" disabled={temFoto} onClick={() => cameraRef.current?.click()}>
                  <CameraIcon /> Tirar foto
                </button>
                <button type="button" className="ev7-cap ev7-cap--audio" onClick={() => audioRef.current?.click()}>
                  <MicIcon /> Áudio
                </button>
                <button type="button" className="ev7-cap ev7-cap--arquivo" onClick={() => arquivoRef.current?.click()}>
                  <FolderIcon /> Arquivo
                </button>
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  tabIndex={-1}
                  onChange={(evento) => {
                    const entrada = evento.currentTarget;
                    const arquivo = entrada.files?.[0];
                    void escolherFoto(arquivo);
                    entrada.value = "";
                  }}
                />
                <input
                  ref={arquivoRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  tabIndex={-1}
                  onChange={(evento) => {
                    const entrada = evento.currentTarget;
                    const arquivo = entrada.files?.[0];
                    void escolherFoto(arquivo);
                    entrada.value = "";
                  }}
                />
                <input
                  ref={audioRef}
                  type="file"
                  accept="audio/*"
                  className="sr-only"
                  tabIndex={-1}
                  onChange={(evento) => {
                    const entrada = evento.currentTarget;
                    const arquivo = entrada.files?.[0];
                    entrada.value = "";
                    if (!arquivo) return;
                    limparAviso();
                    setRemovendo(false);
                    setPendente({ arquivo, tipo: "Áudio" });
                  }}
                />
                <input
                  ref={trocarRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  tabIndex={-1}
                  onChange={(evento) => {
                    const entrada = evento.currentTarget;
                    const arquivo = entrada.files?.[0];
                    void trocarFoto(arquivo);
                    entrada.value = "";
                  }}
                />
              </div>

              {temAnexo && pendente && (
                <div className="ev7-anexo">
                  {pendente.tipo === "Foto" ? (
                    <button type="button" className="ev7-miniatura" onClick={() => setPreviaAberta(true)} aria-label="Ampliar a foto" disabled={!previaUrl}>
                      {previaUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previaUrl} alt="" />
                      )}
                      <span className="ev7-miniatura-ampliar"><ExpandIcon tamanho={13} /></span>
                    </button>
                  ) : (
                    <span className="ev7-miniatura ev7-miniatura--audio" aria-hidden="true"><MicIcon /></span>
                  )}
                  <div className="ev7-anexo-acoes">
                    {pendente.tipo === "Foto" && (
                      <button type="button" className="ev7-mini-btn" onClick={() => trocarRef.current?.click()}>
                        Trocar foto
                      </button>
                    )}
                    <button type="button" className="ev7-mini-btn" onClick={removerAnexo}>
                      Remover
                    </button>
                  </div>
                </div>
              )}

              <label className="ev7-campo-descricao">
                <span className="ui-eyebrow">Descrição (opcional)</span>
                {campoDescricao}
              </label>

              <p className="ev7-privacidade">Antes de usar a IA, evite enquadrar rostos, crachás e documentos pessoais.</p>
            </div>

            <div className="ev7-rodape">
              {(aviso || mensagem) && (
                <div className={`ev7-aviso${aviso ? " is-desfazer" : ""}`} role="status">
                  <span className="ev7-aviso-texto">{aviso ? aviso.texto : mensagem}</span>
                  {aviso && (
                    <button type="button" className="ev7-link" onClick={aviso.desfazer}>
                      Desfazer
                    </button>
                  )}
                </div>
              )}
              <div className="ev7-botoes">
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--small ev7-cancelar" onClick={cancelar}>
                  Cancelar
                </button>
                <button type="button" className="ui-btn ui-btn--save ui-btn--small" disabled={!temAnexo || salvando} onClick={() => void salvar()}>
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="ev7-lista">
          {podeAdicionar && (
            <button type="button" className="ui-btn ui-btn--primary ev7-nova-campo" onClick={() => setFormAberto(true)}>
              + Nova evidência
            </button>
          )}
          <div className="ev7-lista-topo">
            <SegmentedTabs<Aba>
              rotulo="Filtrar evidências"
              valor={aba}
              onChange={setAba}
              abas={[
                { id: "todas", rotulo: "Todas", contagem: totais.evidencias },
                { id: "fotos", rotulo: "Fotos", contagem: totais.fotos },
                { id: "audios", rotulo: "Áudios", contagem: totais.audios },
                { id: "revisar", rotulo: celular ? "IA p/ revisar" : "IA para revisar", contagem: totais.revisar, acao: true },
              ]}
            />
            <p className="ev7-aviso-ia">A IA só sugere. Nada vira NC sem a sua confirmação.</p>
          </div>
          <div className="ui-scroll ev7-scroll">
            {visiveis.length === 0 ? (
              <div className="ui-empty">
                {evidencias.length === 0 ? "Nenhuma evidência registrada. Adicione uma foto ou áudio durante a inspeção." : "Nenhuma evidência neste filtro."}
              </div>
            ) : (
              visiveis.map((ev) => <Cartao key={ev.id} ev={ev} onAmpliar={setAmpliadaId} />)
            )}
          </div>
        </div>
      </div>

      {ampliada && (
        <div className="ev7-veu" role="dialog" aria-label="Foto ampliada" onClick={() => setAmpliadaId(null)}>
          <div className="ev7-lb" onClick={(evento) => evento.stopPropagation()}>
            <div className="ev7-lb-foto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ampliada.url} alt={ampliada.descricao || ampliada.titulo} />
              {fotosVisiveis.length > 1 && (
                <>
                  <button type="button" className="ev7-seta ev7-seta--ant" onClick={() => irPara(-1)} aria-label="Foto anterior">
                    ‹
                  </button>
                  <button type="button" className="ev7-seta ev7-seta--prox" onClick={() => irPara(1)} aria-label="Próxima foto">
                    ›
                  </button>
                </>
              )}
              <span className="ev7-lb-pos">
                {indiceAmpliada + 1} de {fotosVisiveis.length}
              </span>
            </div>
            <div className="ev7-lb-info">
              <div className="ev7-lb-cab">
                <h2 className="ev7-lb-titulo">{ampliada.titulo}</h2>
                <button type="button" className="ev7-lb-x" onClick={() => setAmpliadaId(null)} aria-label="Fechar">
                  ✕
                </button>
              </div>
              <div className="ev7-chips">
                <span className="ev7-chip ev7-chip--info">Foto</span>
                <span className="ev7-chip">{ampliada.dataCompleta}</span>
              </div>
              <div className="ev7-lb-bloco">
                <div className="ui-eyebrow">Descrição</div>
                <p className="ev7-lb-texto">{ampliada.descricao || "Sem descrição."}</p>
              </div>
              <div className="ev7-lb-bloco ev7-lb-bloco--vinculo">
                <div className="ui-eyebrow">Vinculada a</div>
                <div className="ev7-lb-vinculo">
                  <PinIcon />
                  <span>{ampliada.vinculo}</span>
                </div>
              </div>
              <div className="ev7-lb-ia">
                <CaixaIA ev={ampliada} vazia />
              </div>
              <div className="ev7-lb-rodape">
                {ampliada.podeExcluir && (
                  <button
                    type="button"
                    className="ev7-excluir"
                    onClick={() => {
                      setAmpliadaId(null);
                      ampliada.onExcluir();
                    }}
                  >
                    Excluir
                  </button>
                )}
                <button type="button" className="ui-btn ui-btn--secondary ev7-fechar" onClick={() => setAmpliadaId(null)}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previaAberta && previaUrl && (
        <div className="ev7-veu" role="dialog" aria-label="Foto ampliada" onClick={() => setPreviaAberta(false)}>
          <div className="ev7-lb ev7-lb--so-foto" onClick={(evento) => evento.stopPropagation()}>
            <div className="ev7-lb-foto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previaUrl} alt="Foto escolhida" />
            </div>
            <div className="ev7-lb-info">
              <div className="ev7-lb-rodape">
                <button type="button" className="ui-btn ui-btn--secondary ev7-fechar" onClick={() => setPreviaAberta(false)}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
