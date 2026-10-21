"use client";

import { useMemo, useState } from "react";
import type { ProcedimentoOperacionalPadronizado } from "@/types";
import { avisoDeModeloJaCriado, buscarModelos, codigoEmUso, modeloPorId, proximoCodigoLivre, rotuloDoFormato, totalDePassos, type ModeloDePop, type ResultadoDaCriacao } from "@/lib/popModelos";
import { quantidade } from "@/lib/plural";

type Props = {
  pops: ProcedimentoOperacionalPadronizado[];
  /** Cria o POP e devolve o resultado; em caso de erro o painel mostra o aviso junto do campo. */
  onCriar: (modeloId: string, codigo: string, titulo: string) => ResultadoDaCriacao;
  onCancelar: () => void;
};

// "A partir de modelo": busca e lista dos modelos (rolagem por dentro), prévia curta do escolhido e o botão único "Criar POP".
export default function PcModelosPop({ pops, onCriar, onCancelar }: Props) {
  const [consulta, setConsulta] = useState("");
  const [escolhidoId, setEscolhidoId] = useState<string | null>(null);
  const [codigo, setCodigo] = useState(() => proximoCodigoLivre(pops));
  const [titulo, setTitulo] = useState("");
  const [erro, setErro] = useState<{ campo: "titulo" | "codigo"; aviso: string } | null>(null);
  const modelos = useMemo(() => buscarModelos(consulta), [consulta]);
  const escolhido: ModeloDePop | undefined = modeloPorId(escolhidoId || undefined);

  function escolher(modelo: ModeloDePop) {
    setEscolhidoId(modelo.id);
    setTitulo(modelo.titulo);
    setCodigo(proximoCodigoLivre(pops));
    setErro(null);
  }

  const erroDoCodigo = erro?.campo === "codigo" ? erro.aviso : codigoEmUso(pops, codigo) ? "Este código já está sendo utilizado em outro POP." : "";
  const erroDoTitulo = erro?.campo === "titulo" ? erro.aviso : "";
  const jaCriado = escolhido ? avisoDeModeloJaCriado(pops, escolhido.id) : "";

  function criar() {
    if (!escolhido) return;
    const resultado = onCriar(escolhido.id, codigo, titulo);
    if (!resultado.ok) setErro({ campo: resultado.campo, aviso: resultado.aviso });
  }

  return (
    <div className="mdl" role="group" aria-label="Criar POP a partir de modelo">
      <div className="mdl-lista-area">
        <div className="mdl-topo">
          <input className="ui-input" type="search" value={consulta} onChange={(evento) => setConsulta(evento.target.value)} placeholder="Buscar modelo" aria-label="Buscar modelo de POP" />
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onCancelar}>
            Cancelar
          </button>
        </div>
        <ul className="mdl-lista" aria-label="Modelos de POP">
          {modelos.map((modelo) => (
            <li key={modelo.id}>
              <button type="button" className={`mdl-item${escolhido?.id === modelo.id ? " is-ativo" : ""}`} aria-pressed={escolhido?.id === modelo.id} onClick={() => escolher(modelo)}>
                <span className="mdl-item-titulo">{modelo.titulo}</span>
                <span className="mdl-item-formato">{rotuloDoFormato(modelo)}</span>
              </button>
            </li>
          ))}
          {modelos.length === 0 && <li className="ui-empty">Nenhum modelo com essa busca.</li>}
        </ul>
      </div>

      <div className="mdl-detalhe">
        {!escolhido ? (
          <p className="ficha-vazio">Escolha um modelo na lista para ver a prévia.</p>
        ) : (
          <>
            <h3 className="ficha-sub">{escolhido.titulo}</h3>
            <p className="mdl-previa-rotulo">Objetivos</p>
            <ul className="mdl-previa">
              {escolhido.secoes.objetivos.map((objetivo) => (
                <li key={objetivo}>{objetivo}</li>
              ))}
            </ul>
            <p className="mdl-previa-rotulo">{quantidade(totalDePassos(escolhido), "passo", "passos")}</p>
            {jaCriado && (
              <p className="mdl-aviso" role="status">
                {jaCriado}
              </p>
            )}
            <div className="mdl-campos">
              <label className="pc-field">
                <span className="ui-eyebrow">Código</span>
                <input
                  className={`ui-input${erroDoCodigo ? " is-invalid" : ""}`}
                  value={codigo}
                  onChange={(evento) => {
                    setCodigo(evento.target.value);
                    if (erro?.campo === "codigo") setErro(null);
                  }}
                  aria-invalid={Boolean(erroDoCodigo)}
                />
                {erroDoCodigo && <span className="ui-field-error">{erroDoCodigo}</span>}
              </label>
              <label className="pc-field">
                <span className="ui-eyebrow">Título</span>
                <input
                  className={`ui-input${erroDoTitulo ? " is-invalid" : ""}`}
                  value={titulo}
                  onChange={(evento) => {
                    setTitulo(evento.target.value);
                    if (erro?.campo === "titulo") setErro(null);
                  }}
                  aria-invalid={Boolean(erroDoTitulo)}
                />
                {erroDoTitulo && <span className="ui-field-error">{erroDoTitulo}</span>}
              </label>
            </div>
            <div className="mdl-acao">
              <button type="button" className="ui-btn ui-btn--criar" disabled={Boolean(erroDoCodigo) || !titulo.trim()} onClick={criar}>
                Criar POP
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
