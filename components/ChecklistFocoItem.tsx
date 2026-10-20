"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import FieldVoiceTools from "@/components/FieldVoiceTools";
import FotoAmpliada from "@/components/FotoAmpliada";
import AmbientesCortina from "@/components/AmbientesCortina";
import { NavIcon } from "@/components/NavIcons";
import type { InfoAmbiente } from "@/lib/checklistEnvs";
import { useCapturaCamera } from "@/components/useCapturaMidia";
import { estadosDosBotoes, gravidadeSugerida } from "@/lib/checklistUi";
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
};

const NOME_GRAVIDADE: Record<string, string> = { Crítica: "Crítica", Importante: "Importante", Rotina: "Leve" };
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
}: Props) {
  const [texto, setTexto] = useState(item.observacao || "");
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const caixaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setTexto(item.observacao || "");
  }, [item.id, item.observacao]);

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
      setAvisoFoto({ texto: "Foto salva em Evidências", id });
      timerFoto.current = setTimeout(() => setAvisoFoto(null), 6000);
    },
    [onFotoCapturada]
  );

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
    <button
      type="button"
      className={`chk-linha-foto${gravando ? " is-apagado" : ""}`}
      disabled={!podeFotografar || salvandoFoto || camera.ativa || gravando}
      onClick={() => {
        setAvisoFoto(null);
        void camera.abrir();
      }}
    >
      <NavIcon name="registrar" size={18} strokeWidth={1.9} /> <span>{salvandoFoto ? "Salvando..." : "Foto"}</span>
    </button>
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

  const salvarTexto = () => {
    if (podeEditar && texto !== (item.observacao || "")) onObservacao(texto);
  };
  const naoConforme = item.status === "Não Conforme";
  const gravidade = item.criticidade || "Rotina";
  const sugerida = gravidadeSugerida(item);
  const estados = estadosDosBotoes(item.status);

  return (
    <div className="chk-foco">
      {!semCabecalhoDeAmbiente && (() => {
        const posicaoNoAmbiente = (
          <span className="chk-foco-amb-pos" aria-label={`${respondidosAmbiente} de ${totalAmbiente} respondidos neste ambiente`}>
            {respondidosAmbiente}/{totalAmbiente} respondidos
          </span>
        );
        const corpo = (aberto: boolean, alternar?: () => void) => (
          <div className="chk-foco-amb">
            {alternar ? (
              <button type="button" className="chk-foco-amb-top chk-foco-amb-botao" aria-haspopup="dialog" aria-expanded={aberto} onClick={alternar}>
                <span className="chk-foco-amb-nome">{ambienteRotulo}</span>
                {posicaoNoAmbiente}
                <span className="chk-foco-amb-seta" aria-hidden="true">▾</span>
              </button>
            ) : (
              <div className="chk-foco-amb-top">
                <span className="chk-foco-amb-nome">{ambienteRotulo}</span>
                {posicaoNoAmbiente}
              </div>
            )}
            <div className="chk-foco-bar" role="img" aria-label={`${respondidosAmbiente} de ${totalAmbiente} respondidos`}>
              <span style={{ width: `${totalAmbiente ? Math.round((respondidosAmbiente / totalAmbiente) * 100) : 0}%` }} />
            </div>
            <span className="chk-foco-count">
              Item {posicao} de {total} na visita
            </span>
          </div>
        );
        return ambientes && onAmbiente ? (
          <AmbientesCortina ambientes={ambientes} atual={item.ambiente} onSelecionar={onAmbiente} renderBotao={({ aberto, alternar }) => corpo(aberto, alternar)} />
        ) : (
          corpo(false)
        );
      })()}
      <div className={`chk-foco-card${destaque ? " is-destaque" : ""}`}>
        <h2 className="chk-foco-title">{item.titulo}</h2>
      </div>

      <div className="chk-foco-botoes" role="group" aria-label="Resposta do item">
        {(
          [
            ["Conforme", "ok", "Conforme", "✓"],
            ["Não Conforme", "nc", "Não conforme", "×"],
            ["Não se aplica", "na", "Não se aplica", "—"],
          ] as [ChecklistStatus, string, string, string][]
        ).map(([resposta, tom, rotulo, simbolo]) => {
          const estado = estados[resposta as "Conforme" | "Não Conforme" | "Não se aplica"];
          return (
            <button
              key={resposta}
              type="button"
              disabled={!podeEditar}
              aria-pressed={estado === "marcado"}
              className={`chk-resp chk-resp--${tom} is-${estado}`}
              onClick={() => {
                if (estado === "marcado") return;
                onStatus(resposta);
              }}
            >
              <span aria-hidden="true">{estado === "marcado" ? "✓" : simbolo}</span>
              <span>{rotulo}</span>
            </button>
          );
        })}
      </div>

      {naoConforme && (
        <div className="chk-grav-bloco" role="group" aria-label="Quão grave é?">
          <span className="chk-grav-titulo">Quão grave é?</span>
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
                {sugerida === nivel && <span className="chk-grav-sug">sugerida</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chk-foco-obs" ref={caixaRef}>
        <div className="chk-obs-titulo">
          <span className="ui-eyebrow">{naoConforme ? "Registrar a não conformidade" : "Observação (opcional)"}</span>
          {podeEditar && onLimpar && item.status !== "Pendente" && (
            <button type="button" className="chk-limpar" onClick={onLimpar}>
              Limpar resposta
            </button>
          )}
        </div>
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
        {((recente && miniaturaNoItem) || avisoFoto || camera.aviso) && (
          <div className="chk-foto-linha" role="status">
            {recente && miniaturaNoItem && (
              <button type="button" className="chk-foto-mini-botao" onClick={() => setAmpliada(true)} aria-label="Ampliar a foto deste item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="chk-foto-mini" src={recente.url} alt="Última foto deste item" />
              </button>
            )}
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
            placeholder={estadoVoz === "gravando" ? "Ouvindo… fale a observação" : "Ex.: termômetro a 9 °C"}
            aria-label="Observação do item"
            onChange={(evento) => setTexto(evento.target.value)}
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

      {mostrarApoio && (item.orientacao || item.referencia) && (
        <div className="chk-foco-apoio" key={item.id}>
          {item.orientacao && <LinhaDeApoio titulo="O que verificar" texto={item.orientacao} />}
          {item.referencia && <LinhaDeApoio titulo="Base legal" texto={item.referencia} />}
        </div>
      )}

      <div className="chk-foco-rodape">
        <button
          type="button"
          className="ui-btn ui-btn--secondary"
          disabled={!temAnterior}
          onClick={() => {
            salvarTexto();
            onAnterior();
          }}
        >
          ← Anterior
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
