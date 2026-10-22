"use client";

import { nomeDeExibicaoDoAmbiente } from "@/lib/checklistEnvs";
import { resumoCurtoDosSetores } from "@/lib/manualBase";

import { useState } from "react";

type Props = {
  empresa: string;
  data: string;
  sugeridos: string[];
  selecionados: string[];
  opcoesModelo: string[];
  modeloDoAmbiente: (nome: string) => string;
  personalizado: string;
  onPersonalizado: (valor: string) => void;
  statusSalvo: string;
  onToggle: (nome: string) => void;
  ocultos: { ambiente: string; respostas: number }[];
  onMostrar: (nome: string) => void;
  onExcluirOculto: (nome: string) => void;
  onDetalhado: () => void;
  onAdicionar: () => void;
  onModelo: (nome: string, modelo: string) => void;
  /** Editar as perguntas do ambiente (só no PC e só para Administrador e RT). */
  onQuestionario?: (nome: string) => void;
  /** A empresa ainda não cadastrou ambientes em Central › Cadastros › Ambientes (a lista abaixo é a sugestão padrão do app). */
  cadastroVazio?: boolean;
  /** Leva a Central › Cadastros › Ambientes (só quem edita a empresa). */
  onGerenciarAmbientes?: () => void;
  onVoltar: () => void;
  onIniciar: () => void;
};

const LIMITE_SUGERIDOS = 8;
const LIMITE_ROTEIRO = 6;

export default function PcAmbientes({
  empresa,
  data,
  sugeridos,
  selecionados,
  opcoesModelo,
  modeloDoAmbiente,
  personalizado,
  onPersonalizado,
  statusSalvo,
  onToggle,
  ocultos,
  onMostrar,
  onExcluirOculto,
  onDetalhado,
  onAdicionar,
  onModelo,
  onQuestionario,
  cadastroVazio = false,
  onGerenciarAmbientes,
  onVoltar,
  onIniciar,
}: Props) {
  const [verTodosSugeridos, setVerTodosSugeridos] = useState(false);
  const [verTodosRoteiro, setVerTodosRoteiro] = useState(false);
  const [tocado, setTocado] = useState(false);
  const [verOcultos, setVerOcultos] = useState(false);
  // No celular só um painel aparece por vez: escolher os ambientes ou ver o roteiro.
  const [painelCampo, setPainelCampo] = useState<"escolher" | "roteiro">("escolher");

  const mostrarSugeridos = verTodosSugeridos ? sugeridos : sugeridos.slice(0, LIMITE_SUGERIDOS);
  const mostrarRoteiro = verTodosRoteiro ? selecionados : selecionados.slice(0, LIMITE_ROTEIRO);
  const semAmbientes = selecionados.length === 0;
  const novoNome = personalizado.trim();
  const duplicado = novoNome !== "" && [...sugeridos, ...selecionados].some((nome) => nome.toLocaleLowerCase("pt-BR") === novoNome.toLocaleLowerCase("pt-BR"));

  return (
    <section className="ui-screen" aria-label="Ambientes da visita">
      <ol className="pc-steps" aria-label="Passos da visita">
        <li className="pc-step-item is-current" aria-current="step">
          <span className="pc-step-num">1</span> Ambientes
        </li>
        <li className="pc-step-sep" aria-hidden="true">›</li>
        <li className="pc-step-item">
          <span className="pc-step-num">2</span> Checklist
        </li>
      </ol>

      <div className="ui-head">
        <div>
          <h1 className="ui-title">Quais ambientes serão avaliados?</h1>
          <p className="ui-subtitle">
            {data}. O checklist será montado a partir desta escolha.
          </p>
        </div>
      </div>

      <div className="pc-amb-painel-troca" role="group" aria-label="Escolher ambientes ou ver o roteiro">
        <button type="button" className={painelCampo === "escolher" ? "is-active" : ""} aria-pressed={painelCampo === "escolher"} onClick={() => setPainelCampo("escolher")}>
          Escolher
        </button>
        <button type="button" className={painelCampo === "roteiro" ? "is-active" : ""} aria-pressed={painelCampo === "roteiro"} onClick={() => setPainelCampo("roteiro")}>
          Roteiro ({selecionados.length})
        </button>
      </div>

      <div className={`pc-amb-cols is-painel-${painelCampo}`}>
        <div className="ui-card pc-amb-left">
          <div className="ui-head">
            <h2 className="ui-card-title">Ambientes sugeridos</h2>
          </div>
          <div className="ui-scroll">
            <div className="pc-choice-grid">
              {mostrarSugeridos.map((nome) => {
                const ativo = selecionados.includes(nome);
                return (
                  <button
                    key={nome}
                    type="button"
                    aria-pressed={ativo}
                    className={`pc-choice${ativo ? " is-on" : ""}`}
                    onClick={() => onToggle(nome)}
                  >
                    <span className="pc-choice-dot" aria-hidden="true">{ativo ? "✓" : ""}</span>
                    <span className="pc-choice-name">{nomeDeExibicaoDoAmbiente(nome)}</span>
                  </button>
                );
              })}
            </div>
            {sugeridos.length > LIMITE_SUGERIDOS && (
              <button type="button" className="pc-link-btn" onClick={() => setVerTodosSugeridos((aberto) => !aberto)}>
                {verTodosSugeridos ? "Mostrar menos ←" : `Ver todos os ${sugeridos.length} ambientes →`}
              </button>
            )}
            {cadastroVazio ? (
              <p className="pc-amb-cadastro-aviso" role="status">
                Nenhum ambiente cadastrado.{" "}
                {onGerenciarAmbientes && (
                  <button type="button" className="pc-link-btn" onClick={onGerenciarAmbientes}>
                    Cadastrar ambientes
                  </button>
                )}
              </p>
            ) : (
              onGerenciarAmbientes && (
                <button type="button" className="pc-link-btn pc-amb-gerenciar" onClick={onGerenciarAmbientes}>
                  Gerenciar ambientes
                </button>
              )
            )}
          </div>
          <div className="pc-amb-extra">
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={onDetalhado}>
              Usar a lista detalhada do restaurante
            </button>
            <div className="pc-amb-add">
              <label className="pc-amb-add-field">
                <span className="ui-eyebrow">Outro ambiente</span>
                <input
                  className={`ui-input${duplicado ? " is-invalid" : ""}`}
                  value={personalizado}
                  onChange={(evento) => onPersonalizado(evento.target.value)}
                  placeholder="Ex.: Padaria, Açougue, Sushi bar..."
                  aria-invalid={duplicado}
                />
                {duplicado && <span className="ui-field-error">Esse ambiente já está na lista.</span>}
              </label>
              <button type="button" className="ui-btn ui-btn--criar" disabled={!novoNome || duplicado} onClick={onAdicionar}>
                + Adicionar
              </button>
            </div>
          </div>
        </div>

        <div className="ui-card pc-amb-right">
          <div className="ui-head">
            <h2 className="ui-card-title">Roteiro da visita</h2>
            <span className="ui-row-sub">{resumoCurtoDosSetores(selecionados)}</span>
          </div>
          <div className="ui-scroll">
            {semAmbientes && <div className="ui-empty">Nenhum ambiente escolhido ainda.</div>}
            <ol className="pc-route">
              {mostrarRoteiroLista(mostrarRoteiro, opcoesModelo, modeloDoAmbiente, onModelo, onToggle, onQuestionario)}
            </ol>
            {selecionados.length > LIMITE_ROTEIRO && (
              <button type="button" className="pc-link-btn" onClick={() => setVerTodosRoteiro((aberto) => !aberto)}>
                {verTodosRoteiro ? "Mostrar menos ←" : `Ver os outros ${selecionados.length - LIMITE_ROTEIRO} ambientes →`}
              </button>
            )}
            {ocultos.length > 0 && (
              <div className="pc-hidden">
                <button type="button" className="pc-link-btn" aria-expanded={verOcultos} onClick={() => setVerOcultos((aberto) => !aberto)}>
                  Ocultos ({ocultos.length}) {verOcultos ? "⌄" : "›"}
                </button>
                {verOcultos &&
                  ocultos.map((oculto) => (
                    <div key={oculto.ambiente} className="pc-hidden-row">
                      <span className="pc-hidden-name">
                        {nomeDeExibicaoDoAmbiente(oculto.ambiente)}
                        <span className="ui-row-sub">
                          {oculto.respostas} {oculto.respostas === 1 ? "resposta guardada" : "respostas guardadas"}
                        </span>
                      </span>
                      <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => onMostrar(oculto.ambiente)}>
                        Mostrar de novo
                      </button>
                      <button type="button" className="ui-btn ui-btn--soft-nc ui-btn--small" onClick={() => onExcluirOculto(oculto.ambiente)}>
                        Excluir definitivamente
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="ui-footer">
        <span className="ui-row-sub" role="status">
          {selecionados.length} {selecionados.length === 1 ? "ambiente escolhido" : "ambientes escolhidos"} ·{" "}
          {statusSalvo || "alterações salvas"}
          {tocado && semAmbientes ? " · escolha ao menos um ambiente" : ""}
        </span>
        <div className="ui-footer-actions">
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onVoltar}>
            Voltar à Central
          </button>
          <button
            type="button"
            className="ui-btn ui-btn--save"
            onClick={() => {
              setTocado(true);
              if (!semAmbientes) onIniciar();
            }}
          >
            Salvar e iniciar checklist →
          </button>
        </div>
      </div>
    </section>
  );
}

function mostrarRoteiroLista(
  nomes: string[],
  opcoesModelo: string[],
  modeloDoAmbiente: (nome: string) => string,
  onModelo: (nome: string, modelo: string) => void,
  onToggle: (nome: string) => void,
  onQuestionario?: (nome: string) => void
) {
  return nomes.map((nome, indice) => (
    <li key={nome} className="pc-route-row">
      <span className="pc-route-num">{String(indice + 1).padStart(2, "0")}</span>
      <span className="pc-route-name">{nome}</span>
      <label className="pc-route-model">
        <span>Questionário:</span>
        <select value={modeloDoAmbiente(nome)} onChange={(evento) => onModelo(nome, evento.target.value)} aria-label={`Questionário de ${nome}`}>
          {opcoesModelo.map((modelo) => (
            <option key={modelo} value={modelo}>
              {modelo}
            </option>
          ))}
        </select>
      </label>
      {onQuestionario && (
        <button type="button" className="ui-btn ui-btn--secondary ui-btn--small pc-route-editar" onClick={() => onQuestionario(nome)}>
          Editar perguntas
        </button>
      )}
      <button type="button" className="pc-route-remove" aria-label={`Remover ${nome}`} onClick={() => onToggle(nome)}>
        ×
      </button>
    </li>
  ));
}
