"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import FieldVoiceTools from "@/components/FieldVoiceTools";
import { useAvisoAntesDeFotografar } from "@/components/AvisoAntesDeFotografar";
import FotoAmpliada from "@/components/FotoAmpliada";
import AmbientesCortina from "@/components/AmbientesCortina";
import { avancarAoResponderLigado, cameraAutomaticaLigada } from "@/lib/preferenciasDeCampo";
import { reToqueValido } from "@/lib/reToque";
import { ESPERA_DO_AVANCO_MS, deveAvancarSozinho } from "@/lib/avancoAutomatico";
import CampoDeTemperatura, { ehItemDeTemperatura } from "@/components/CampoDeTemperatura";
import type { ResultadoDaTemperatura } from "@/lib/limitesDeTemperatura";
import { progressoDaCaminhada, textoDaCaminhada } from "@/lib/caminhada";
import { NavIcon } from "@/components/NavIcons";
import { linhaDeProgressoDoAmbiente, type InfoAmbiente } from "@/lib/checklistEnvs";
import { COR_DO_SEGMENTO, rotuloDoSegmento } from "@/lib/checklistSegmentos";
import { useCapturaCamera } from "@/components/useCapturaMidia";
import { estadosDosBotoes, gravidadeSugerida } from "@/lib/checklistUi";
import { textoDeBaseLegal } from "@/lib/conteudoValidado";
import { fonteParaExibir, rotuloDaFonte, SEM_FONTE } from "@/lib/fonteDaPergunta";
import type { EstadoVoz } from "@/lib/vozLinha";
import { dependenciasDoNavegador, validarFotoEscolhida } from "@/lib/fotoCompressao";
import type { ChecklistCriticidade, ChecklistItem, ChecklistStatus } from "@/types";

type Props = {
  item: ChecklistItem;
  posicao: number;
  total: number;
  /** Cabeçalho do ambiente: nome, posição do item dentro dele e progresso. */
  ambienteRotulo: string;
  posAmbiente: number;
  totalAmbiente: number;
  respondidosAmbiente: number;
  /** No PC o ambiente aparece nas abas, então o cabeçalho do ambiente não se repete aqui. */
  semCabecalhoDeAmbiente?: boolean;
  /** Mostra "O que verificar" e "Base legal" abaixo da observação (no PC eles ficam no painel de apoio). */
  mostrarApoio?: boolean;
  /** Celular: o cabeçalho do ambiente vira o seletor que abre a cortina com todos os ambientes. */
  ambientes?: InfoAmbiente[];
  onAmbiente?: (nome: string) => void;
  /** Celular: itens do ambiente, um segmento colorido por item; tocar leva direto ao item. */
  fila?: { id: string; status: ChecklistStatus }[];
  onItem?: (id: string) => void;
  /** Destaque rápido do item (ao chegar por "Ver no checklist"). */
  destaque?: boolean;
  podeEditar: boolean;
  temAnterior: boolean;
  temProximo: boolean;
  onStatus: (status: ChecklistStatus) => void;
  onObservacao: (texto: string) => void;
  onGravidade: (gravidade: ChecklistCriticidade) => void;
  /** Mostra a miniatura da última foto no item; no PC ela fica só em "Evidências deste item". */
  miniaturaNoItem?: boolean;
  /** Pode registrar foto (evidências.adicionar). */
  podeFotografar?: boolean;
  /** Salva a foto como evidência ligada a este item. Devolve o id da evidência criada, ou null se falhou. */
  onFotoCapturada: (arquivo: File) => Promise<string | null>;
  /** Remove somente a evidência recém-criada por este item. */
  onDesfazerFoto: (evidenciaId: string) => void;
  /** Volta o item a "Pendente"; quem chama decide se pergunta antes. */
  onLimpar?: () => void;
  onAnterior: () => void;
  onProximo: () => void;
  /** Avanço automático: chamado ~0,5 s depois de "Conforme" ou "Não se aplica" (a resposta já foi gravada). Ausente = não avança. */
  onAvancar?: () => void;
  /** Item ligado a um POP com versão aprovada: abre a leitura do POP sem sair do checklist. */
  verPop?: { rotulo: string; onAbrir: () => void };
  /** Fotos já registradas neste item (até o máximo); no máximo, o botão Foto fica desligado. */
  fotosNoItem?: number;
  maxFotos?: number;
  /** Equipamentos do ambiente (nomes), para sugerir o limite de temperatura. */
  equipamentosDoAmbiente?: string[];
  /** Limites de temperatura confirmados nos equipamentos do ambiente (Cadastro). */
  limitesDosEquipamentos?: string[];
  /** Grava a temperatura medida; o resultado indicado pelo limite vira a resposta do item (corrigível). */
  onTemperatura?: (medida: { valor: number; limiteId: string } | null, resultado: ResultadoDaTemperatura | null) => void;
  /** Modo Campo (celular): observação sem rótulo (placeholder "Observação"), "Limpar resposta" abaixo do campo e o texto inteiro da pergunta no "i". */
  campo?: boolean;
};

const NOME_GRAVIDADE: Record<string, string> = { Crítica: "Crítica", Importante: "Importante", Rotina: "Leve" };
const CLASSE_DO_SEGMENTO: Record<string, string> = { Conforme: "ok", "Não Conforme": "nc", "Não se aplica": "na", Pendente: "pend" };
const CLASSE_GRAVIDADE: Record<string, string> = { Crítica: "nc", Importante: "amber", Rotina: "leve" };

// Linha recolhível: o texto abre sobre o checklist, sem criar rolagem nem ficar atrás do rodapé.
function LinhaDeApoio({ titulo, texto }: { titulo: string; texto: string }) {
  const [aberta, setAberta] = useState(false);
  return (
    <div className={`chk-apoio-linha${aberta ? " is-aberta" : ""}`}>
      <button type="button" className="chk-apoio-toggle" aria-expanded={aberta} onClick={() => setAberta((valor) => !valor)}>
        <span>{titulo}</span>
        <span aria-hidden="true">{aberta ? "▴" : "▾"}</span>
      </button>
      {aberta && <p className="chk-apoio-corpo">{texto}</p>}
    </div>
  );
}

// Um item por vez, com botões de resposta, gravidade (só se não conforme) e observação.
export default function ChecklistFocoItem({
  item,
  posicao,
  total,
  ambienteRotulo,
  posAmbiente,
  totalAmbiente,
  respondidosAmbiente,
  semCabecalhoDeAmbiente = false,
  mostrarApoio = true,
  destaque = false,
  ambientes,
  onAmbiente,
  fila,
  onItem,
  podeEditar,
  podeFotografar = true,
  miniaturaNoItem = true,
  temAnterior,
  temProximo,
  onStatus,
  onObservacao,
  onGravidade,
  onFotoCapturada,
  onDesfazerFoto,
  onLimpar,
  onAnterior,
  onProximo,
  onAvancar,
  verPop,
  fotosNoItem = 0,
  maxFotos = 5,
  equipamentosDoAmbiente = [],
  limitesDosEquipamentos = [],
  onTemperatura,
  campo = false,
}: Props) {
  const [texto, setTexto] = useState(item.observacao || "");
  // Celular: o texto inteiro da pergunta fica atrás de um "i" discreto (a fonte aparece sempre, logo abaixo do enunciado).
  const [fonteAberta, setFonteAberta] = useState(false);
  const [verFonte, setVerFonte] = useState(false);
  useEffect(() => {
    setFonteAberta(false);
    setVerFonte(false);
  }, [item.id]);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const primeiraRespostaRef = useRef<HTMLButtonElement | null>(null);
  const caixaRef = useRef<HTMLDivElement | null>(null);
  const timerAvanco = useRef<ReturnType<typeof setTimeout> | null>(null);
  const marcadoEmRef = useRef<number | null>(null);
  const cancelarAvanco = useCallback(() => {
    if (timerAvanco.current) clearTimeout(timerAvanco.current);
    timerAvanco.current = null;
  }, []);
  // Trocar de item (por qualquer caminho) ou sair cancela um avanço que ainda esperava.
  useEffect(() => cancelarAvanco, [item.id, cancelarAvanco]);

  useEffect(() => {
    setTexto(item.observacao || "");
  }, [item.id, item.observacao]);

  // A observação começa com ~3 linhas (84 px de altura mínima no CSS) e cresce enquanto a pessoa digita.
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    area.style.height = "auto";
    area.style.height = `${area.scrollHeight + 2}px`;
  }, [texto, item.id]);

  // Foto do item: a câmera abre por cima, a foto vira evidência deste item e dá para desfazer por 6 s.
  const [salvandoFoto, setSalvandoFoto] = useState(false);
  const [recente, setRecente] = useState<{ id: string; url: string } | null>(null);
  const [avisoFoto, setAvisoFoto] = useState<{ texto: string; id?: string } | null>(null);
  const [ampliada, setAmpliada] = useState(false);
  const [estadoVoz, setEstadoVoz] = useState<EstadoVoz>("ocioso");
  const [avisoVoz, setAvisoVoz] = useState("");
  const arquivoRef = useRef<HTMLInputElement | null>(null);
  const timerFoto = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recenteRef = useRef<{ id: string; url: string } | null>(null);
  recenteRef.current = recente;

  const guardarFoto = useCallback(
    async (arquivo: File) => {
      if (timerFoto.current) clearTimeout(timerFoto.current);
      setAvisoFoto(null);
      setSalvandoFoto(true);
      const url = URL.createObjectURL(arquivo);
      const id = await onFotoCapturada(arquivo);
      setSalvandoFoto(false);
      if (!id) {
        URL.revokeObjectURL(url);
        setAvisoFoto({ texto: "Não foi possível salvar a foto. Tente de novo." });
        return;
      }
      if (recenteRef.current) URL.revokeObjectURL(recenteRef.current.url);
      setRecente({ id, url });
      // Sem sinal a foto fica guardada no aparelho e entra na fila de envio.
      setAvisoFoto({ texto: typeof navigator !== "undefined" && !navigator.onLine ? "Foto guardada · Na fila" : "Foto guardada", id });
      timerFoto.current = setTimeout(() => setAvisoFoto(null), 6000);
    },
    [onFotoCapturada]
  );

  const pedirAvisoDeFoto = useAvisoAntesDeFotografar();
  const camera = useCapturaCamera({ alternativa: "Escolher arquivo", aoCapturar: (foto) => void guardarFoto(foto) });
  const { liberar: liberarCamera, setAviso: limparAvisoCamera } = camera;

  // Ao trocar de item (ou sair) a câmera fecha e a miniatura temporária é liberada.
  useEffect(() => {
    return () => {
      liberarCamera();
      limparAvisoCamera("");
      if (timerFoto.current) clearTimeout(timerFoto.current);
      if (recenteRef.current) URL.revokeObjectURL(recenteRef.current.url);
      setRecente(null);
      setAvisoFoto(null);
      setAmpliada(false);
    };
  }, [item.id, liberarCamera, limparAvisoCamera]);

  async function escolherArquivoDeFoto(arquivo: File | undefined) {
    if (!arquivo) return;
    const validacao = await validarFotoEscolhida(arquivo, dependenciasDoNavegador);
    if (!validacao.ok) {
      setAvisoFoto({ texto: validacao.motivo });
      return;
    }
    await guardarFoto(arquivo);
  }

  useEffect(() => {
    if (!avisoVoz) return;
    const tempo = setTimeout(() => setAvisoVoz(""), 7000);
    return () => clearTimeout(tempo);
  }, [avisoVoz]);

  useEffect(() => {
    setAvisoVoz("");
  }, [item.id]);

  const botaoFoto = (gravando: boolean) => (
    <>
    <button
      type="button"
      className={`chk-linha-foto${naoConforme ? " chk-linha-foto--destaque" : ""}${gravando ? " is-apagado" : ""}`}
      disabled={!podeFotografar || salvandoFoto || camera.ativa || gravando || fotosNoItem >= maxFotos}
      title={fotosNoItem >= maxFotos ? `Este item já tem ${maxFotos} fotos` : "Foto"}
      aria-label={fotosNoItem > 0 ? `Foto (${fotosNoItem} de ${maxFotos})` : "Foto"}
      onClick={() => {
        setAvisoFoto(null);
        pedirAvisoDeFoto(() => void camera.abrir());
      }}
    >
      <NavIcon name="registrar" size={18} strokeWidth={1.9} /> <span className="chip-texto">{salvandoFoto ? "Salvando..." : fotosNoItem > 0 ? `${fotosNoItem}/${maxFotos}` : "Foto"}</span>
    </button>
    {recente && miniaturaNoItem && (
      <button type="button" className="chk-foto-mini-botao chk-foto-mini-ao-lado" onClick={() => setAmpliada(true)} aria-label="Ampliar a foto deste item">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="chk-foto-mini" src={recente.url} alt="Última foto deste item" />
      </button>
    )}
    </>
  );

  function desfazerFoto() {
    if (!recente) return;
    if (timerFoto.current) clearTimeout(timerFoto.current);
    onDesfazerFoto(recente.id);
    URL.revokeObjectURL(recente.url);
    setRecente(null);
    setAvisoFoto(null);
    setAmpliada(false);
  }

  const botaoLimpar =
    podeEditar && onLimpar && item.status !== "Pendente" ? (
      <button
        type="button"
        className="chk-limpar"
        onClick={() => {
          onLimpar?.();
          // O botão sai da tela quando a resposta é limpa: o foco volta ao primeiro botão de resposta.
          primeiraRespostaRef.current?.focus();
        }}
      >
        Limpar resposta
      </button>
    ) : null;

  const salvarTexto = () => {
    if (podeEditar && texto !== (item.observacao || "")) onObservacao(texto);
  };
  const naoConforme = item.status === "Não Conforme";
  const gravidade = item.criticidade || "Rotina";
  const sugerida = gravidadeSugerida(item);
  const estados = estadosDosBotoes(item.status);

  const caminhada = ambientes ? progressoDaCaminhada(ambientes, item.ambiente) : null;
  const textoCaminhada = caminhada ? textoDaCaminhada(caminhada) : "";

  return (
    <div className="chk-foco">
      <div className="chk-foco-topo">
      {!semCabecalhoDeAmbiente && (() => {
        const posicaoNoAmbiente = (
          <span className="chk-foco-amb-pos" aria-label={`${respondidosAmbiente} de ${totalAmbiente} respondidos neste ambiente`}>
            {respondidosAmbiente}/{totalAmbiente} respondidos
          </span>
        );
        // Campo: "N de M respondidas · P%" dentro da caixa do ambiente (no lugar da barra pontilhada).
        const respondidasDoAmbiente = campo ? (
          <span className="chk-foco-amb-resp" aria-label={`${respondidosAmbiente} de ${totalAmbiente} respondidas neste ambiente`}>
            {respondidosAmbiente} de {totalAmbiente} respondidas · {totalAmbiente ? Math.round((respondidosAmbiente / totalAmbiente) * 100) : 0}%
          </span>
        ) : null;
        const corpo = (aberto: boolean, alternar?: () => void) => (
          <div className="chk-foco-amb">
            {alternar ? (
              <>
                <button
                  type="button"
                  className="chk-amb-botao"
                  aria-haspopup="listbox"
                  aria-expanded={aberto}
                  aria-label={`Ambiente: ${ambienteRotulo}. Trocar de ambiente`}
                  onClick={alternar}
                >
                  <span className="chk-amb-botao-nome">{ambienteRotulo}</span>
                  <span className="chk-amb-botao-seta" aria-hidden="true">{aberto ? "▴" : "▾"}</span>
                </button>
                <span className="chk-foco-amb-resp" role="status">
                  {ambientes ? linhaDeProgressoDoAmbiente(ambientes, item.ambiente) : ""}
                </span>
              </>
            ) : (
              <div className="chk-foco-amb-top">
                <span className="chk-foco-amb-nome">{ambienteRotulo}</span>
                {!campo && posicaoNoAmbiente}
                {respondidasDoAmbiente}
              </div>
            )}
            {fila && onItem && campo && (() => {
              const indice = fila.findIndex((outro) => outro.id === item.id);
              return (
                <div className="chk-pergunta-barra">
                  <span className="chk-pergunta-rotulo">Pergunta {indice + 1} de {fila.length}</span>
                  <span className="chk-pergunta-setas">
                    <button type="button" aria-label="Pergunta anterior" disabled={indice <= 0} onClick={() => onItem(fila[indice - 1].id)}>‹</button>
                    <button type="button" aria-label="Próxima pergunta" disabled={indice < 0 || indice >= fila.length - 1} onClick={() => onItem(fila[indice + 1].id)}>›</button>
                  </span>
                </div>
              );
            })()}
            {fila && onItem ? (
              <div className="chk-segmentos" role="group" aria-label="Itens do ambiente">
                {fila.map((outro, indice) => (
                  <button
                    key={outro.id}
                    type="button"
                    className={`chk-seg${outro.id === item.id ? " is-atual" : ""}${campo ? ` chk-seg--num chk-seg--${CLASSE_DO_SEGMENTO[outro.status] || "pend"}` : ""}`}
                    style={campo ? undefined : { background: COR_DO_SEGMENTO[outro.status] }}
                    aria-label={rotuloDoSegmento(indice, outro.status)}
                    aria-current={outro.id === item.id ? "true" : undefined}
                    onClick={() => onItem(outro.id)}
                  >
                    {campo ? indice + 1 : null}
                  </button>
                ))}
              </div>
            ) : (
              <div className="chk-foco-bar" role="img" aria-label={`${respondidosAmbiente} de ${totalAmbiente} respondidos`}>
                <span style={{ width: `${totalAmbiente ? Math.round((respondidosAmbiente / totalAmbiente) * 100) : 0}%` }} />
              </div>
            )}
            {!campo && <span className="chk-foco-count">
              <span className="chk-foco-count-texto">{textoCaminhada || `Item ${posicao} de ${total} na visita`}</span>
              {caminhada?.nomeDoProximo && onAmbiente && (
                <>
                  <span className="chk-foco-count-sep" aria-hidden="true">·</span>
                  <button type="button" className="pc-link-btn" onClick={() => onAmbiente(caminhada.nomeDoProximo as string)}>
                    Pular ambiente
                  </button>
                </>
              )}
            </span>}
          </div>
        );
        return ambientes && onAmbiente ? (
          <AmbientesCortina ambientes={ambientes} atual={item.ambiente} onSelecionar={onAmbiente} renderBotao={({ aberto, alternar }) => corpo(aberto, alternar)} />
        ) : (
          corpo(false)
        );
      })()}
      <div className={`chk-foco-card${destaque ? " is-destaque" : ""}`}>
        <h2 className="chk-foco-title" title={campo ? item.titulo : undefined}>{item.titulo}</h2>
        {campo && mostrarApoio && (
          <button type="button" className="chk-fonte-i" aria-expanded={fonteAberta} aria-label="Pergunta completa" title="Pergunta completa" onClick={() => setFonteAberta((valor) => !valor)}>
            i
          </button>
        )}
        <p className={`chk-fonte-abaixo${naoConforme && rotuloDaFonte(item.referencia) === "Fonte não registrada" ? " chk-fonte-abaixo--vazia" : ""}`}>
          <span className="chk-fonte-corte">{rotuloDaFonte(item.referencia)}</span>
          {fonteParaExibir(item.referencia) !== SEM_FONTE && (
            <button type="button" className="chk-fonte-ver" aria-expanded={verFonte} onClick={() => setVerFonte((valor) => !valor)}>
              {verFonte ? "Ocultar fonte" : "Ver fonte"}
            </button>
          )}
        </p>
        {verFonte && fonteParaExibir(item.referencia) !== SEM_FONTE && (
          <p className="chk-fonte-completa" role="note">{fonteParaExibir(item.referencia)}</p>
        )}
        {campo && mostrarApoio && fonteAberta && (
          <div className="chk-fonte-linha chk-fonte-linha--campo" role="note">
            <p className="chk-fonte-pergunta">{item.titulo}</p>
          </div>
        )}
      </div>
      </div>

      <div className="chk-foco-corpo">
      <div className="chk-foco-botoes" role="group" aria-label="Resposta do item">
        {(
          [
            ["Conforme", "ok", "Conforme"],
            ["Não Conforme", "nc", "Não conforme"],
            ["Não se aplica", "na", "Não se aplica"],
          ] as [ChecklistStatus, string, string][]
        ).map(([resposta, tom, rotulo], indice) => {
          const estado = estados[resposta as "Conforme" | "Não Conforme" | "Não se aplica"];
          return (
            <button
              key={resposta}
              ref={indice === 0 ? primeiraRespostaRef : undefined}
              type="button"
              disabled={!podeEditar}
              aria-pressed={estado === "marcado"}
              className={`chk-resp chk-resp--${tom} is-${estado}`}
              onClick={() => {
                cancelarAvanco();
                // Tocar de novo na resposta já marcada a limpa (mesma regra de "Limpar resposta": confirma se houver observação, foto etc.).
                if (estado === "marcado") {
                  // Toque duplo acidental logo depois de marcar não apaga a resposta.
                  if (reToqueValido(Date.now(), marcadoEmRef.current)) onLimpar?.();
                  return;
                }
                marcadoEmRef.current = Date.now();
                // Decide ANTES de gravar: observação já digitada = o RT ainda está no item, então não avança sozinho.
                const avancaSozinho = Boolean(onAvancar) && deveAvancarSozinho({ status: resposta, avancarLigado: avancarAoResponderLigado(), observacaoDigitada: texto.trim().length > 0 || (item.observacao || "").trim().length > 0, podeEditar });
                onStatus(resposta);
                if (avancaSozinho) timerAvanco.current = setTimeout(() => { timerAvanco.current = null; onAvancar?.(); }, ESPERA_DO_AVANCO_MS);
                // Opção do aparelho (desligada por padrão): ao marcar Não conforme, abre a câmera no mesmo toque.
                if (resposta === "Não Conforme" && podeFotografar && fotosNoItem < maxFotos && cameraAutomaticaLigada()) pedirAvisoDeFoto(() => void camera.abrir());
              }}
            >
              {estado === "marcado" && (
                <svg className="chk-resp-check" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                  <path d="M3 8.5l3.2 3.2L13 4.5" />
                </svg>
              )}
              <span>{rotulo}</span>
            </button>
          );
        })}
        {botaoLimpar}
      </div>

      {podeEditar && onTemperatura && ehItemDeTemperatura(item.titulo) && (
        <CampoDeTemperatura itemId={item.id} titulo={item.titulo} equipamentos={equipamentosDoAmbiente} limitesConfirmados={limitesDosEquipamentos} atual={item.temperatura} onTemperatura={onTemperatura} />
      )}

      {naoConforme && (
        <div className="chk-grav-bloco" role="group" aria-label="Quão grave é?">
          <span className="chk-grav-titulo">{campo ? "Gravidade" : `Gravidade${sugerida ? ` · sugestão do app: ${NOME_GRAVIDADE[sugerida]}` : ""}`}</span>
          {campo && sugerida && (
            <span className="chk-grav-sugestao">
              <span className="chk-sug-tablet">Sugestão do app: {NOME_GRAVIDADE[sugerida]}</span>
              <span className="chk-sug-celular"> · sugestão do app: {NOME_GRAVIDADE[sugerida]}</span>
            </span>
          )}
          <div className="chk-grav-linha">
            {(["Rotina", "Importante", "Crítica"] as const).map((nivel) => (
              <button
                key={nivel}
                type="button"
                disabled={!podeEditar}
                aria-pressed={gravidade === nivel}
                className={`chk-grav chk-grav--${CLASSE_GRAVIDADE[nivel]}${gravidade === nivel ? " is-on" : ""}`}
                onClick={() => onGravidade(nivel)}
              >
                {NOME_GRAVIDADE[nivel]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chk-foco-obs" ref={caixaRef}>
        <span className={`chk-obs-rotulo${campo ? " chk-obs-rotulo--campo" : ""}`}>Observação (opcional)</span>
        <div className="chk-obs-cabeca">
          {podeEditar ? (
            <FieldVoiceTools
              variante="linha"
              linhaInicio={botaoFoto}
              onEstado={setEstadoVoz}
              onAviso={setAvisoVoz}
              fieldKey={`checklist-${item.id}`}
              value={texto}
              onChange={setTexto}
              contexto="Observação de um item de checklist de boas práticas em segurança dos alimentos."
            />
          ) : (
            <div className="voz-linha">{botaoFoto(false)}</div>
          )}
        </div>
        {(avisoFoto || camera.aviso) && (
          <div className="chk-foto-linha" role="status">
            {(avisoFoto || camera.aviso) && (
              <span className="chk-foto-aviso">{camera.aviso || avisoFoto?.texto}</span>
            )}
            {camera.aviso ? (
              <button
                type="button"
                className="chk-foto-link"
                onClick={() => {
                  camera.setAviso("");
                  arquivoRef.current?.click();
                }}
              >
                Escolher arquivo
              </button>
            ) : (
              avisoFoto?.id && (
                <button type="button" className="chk-foto-link" onClick={desfazerFoto}>
                  Desfazer
                </button>
              )
            )}
          </div>
        )}
        {ampliada && recente && <FotoAmpliada url={recente.url} descricao="Última foto deste item" onFechar={() => setAmpliada(false)} />}
        <input
          ref={arquivoRef}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          onChange={(evento) => {
            const entrada = evento.currentTarget;
            const arquivo = entrada.files?.[0];
            void escolherArquivoDeFoto(arquivo);
            entrada.value = "";
          }}
        />
        {camera.ativa &&
          createPortal(
            <div className="chk-cam-fundo">
              <div className="chk-cam" role="dialog" aria-label="Tirar foto do item">
                <span className="chk-cam-titulo">Foto do item</span>
                <video ref={camera.videoRef} className="chk-cam-video" muted playsInline aria-label="Prévia da câmera" />
                <div className="chk-cam-botoes">
                  <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={camera.cancelar}>
                    Cancelar
                  </button>
                  <button type="button" className="ui-btn ui-btn--primary ui-btn--small" onClick={camera.capturar}>
                    Capturar
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
        <div className="chk-obs-campo">
          <textarea
            ref={areaRef}
            className="ui-input chk-obs-area"
            value={texto}
            disabled={!podeEditar}
            placeholder={estadoVoz === "gravando" ? "Ouvindo… fale a observação" : ehItemDeTemperatura(item.titulo) || campo ? "Ex.: termômetro a 9 °C" : ""}
            rows={2}
            aria-label="Observação do item"
            onChange={(evento) => {
              cancelarAvanco();
              setTexto(evento.target.value);
            }}
            onBlur={salvarTexto}
          />
          {estadoVoz !== "ocioso" && (
            <span className="chk-obs-ouvindo" role="status">
              {estadoVoz === "gravando" ? "Ouvindo… o texto entra quando você parar" : "Transcrevendo…"}
              <span className="chk-cursor" aria-hidden="true" />
            </span>
          )}
          {avisoVoz && (
            <span className="chk-obs-aviso" role="alert">
              {avisoVoz}
            </span>
          )}
        </div>
      </div>

      {!campo && mostrarApoio && (item.orientacao || textoDeBaseLegal(item)) && (
        <div className="chk-foco-apoio" key={item.id}>
          {item.orientacao && <LinhaDeApoio titulo="O que verificar" texto={item.orientacao} />}
          {textoDeBaseLegal(item) && <LinhaDeApoio titulo="Base legal" texto={textoDeBaseLegal(item)} />}
        </div>
      )}

      {verPop && (
        <div className="chk-foco-verpop">
          <button type="button" className="pc-chip-btn pc-chip-btn--soft" onClick={verPop.onAbrir}>
            Ver POP · {verPop.rotulo}
          </button>
        </div>
      )}

      </div>

      {campo && mostrarApoio && (item.orientacao || textoDeBaseLegal(item)) && (
        <div className="chk-foco-apoio" key={item.id}>
          {item.orientacao && <LinhaDeApoio titulo="O que verificar" texto={item.orientacao} />}
          {textoDeBaseLegal(item) && <LinhaDeApoio titulo="Base legal" texto={textoDeBaseLegal(item)} />}
        </div>
      )}

      <div className="chk-foco-rodape">
        <button
          type="button"
          className="ui-btn ui-btn--secondary"
          aria-label="Anterior"
          disabled={!temAnterior}
          onClick={() => {
            salvarTexto();
            onAnterior();
          }}
        >
          <span className="chk-rot-longo">← Anterior</span>
          <span className="chk-rot-curto" aria-hidden="true">←</span>
        </button>
        <button
          type="button"
          className="ui-btn ui-btn--save"
          disabled={!temProximo}
          onClick={() => {
            salvarTexto();
            onProximo();
          }}
        >
          Salvar e próximo →
        </button>
      </div>
    </div>
  );
}
