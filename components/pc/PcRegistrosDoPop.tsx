"use client";

import { useMemo, useState } from "react";
import { Pill } from "@/components/ui/Pill";
import { agoraParaCampoLocal, formatarDataHora, localParaISO } from "@/lib/dataLocal";
import { useRegistrosDaEmpresa } from "@/components/RegistrosEmpresaContext";
import { popVigente } from "@/lib/popsNorma";
import { guardaDosRegistros, separarRegistros } from "@/lib/registrosEmpresa";
import type { ProcedimentoOperacionalPadronizado, RegistroPop } from "@/types";

function agoraParaCampo(): string {
  return agoraParaCampoLocal();
}

function quando(iso: string) {
  return formatarDataHora(iso);
}

// Aba "Registros" do POP aprovado: o que foi feito, quando e por quem. Registro nunca é editado; correção vira outro registro.
export default function PcRegistrosDoPop({ pop }: { pop: ProcedimentoOperacionalPadronizado }) {
  const contexto = useRegistrosDaEmpresa();
  const [dataHora, setDataHora] = useState(agoraParaCampo);
  const [descricao, setDescricao] = useState("");
  const [ambiente, setAmbiente] = useState("");
  const [corrigindo, setCorrigindo] = useState<RegistroPop | null>(null);
  const [tocado, setTocado] = useState(false);
  const [erroGeral, setErroGeral] = useState("");
  const [mostrarRevisar, setMostrarRevisar] = useState(false);
  const [guardaTexto, setGuardaTexto] = useState("");

  const vigente = popVigente(pop);
  const guarda = useMemo(() => (contexto?.empresa ? guardaDosRegistros(contexto.empresa) : null), [contexto?.empresa]);
  const { recentes, revisar } = useMemo(
    () => separarRegistros(contexto?.registros || [], pop.id, guarda?.dias ?? null),
    [contexto?.registros, pop.id, guarda?.dias]
  );
  if (!contexto) return null;

  const provaId = contexto.empresa?.registroProvaPorPop?.[pop.id] || "";
  const erroDescricao = !descricao.trim() ? "Descreva o que foi feito." : "";
  const erroData = !dataHora ? "Informe a data e a hora." : Date.parse(localParaISO(dataHora)) > Date.now() + 5 * 60 * 1000 ? "A data e a hora não podem estar no futuro." : "";

  function salvar() {
    setTocado(true);
    setErroGeral("");
    if (erroDescricao || erroData || !vigente) return;
    const resultado = contexto!.novoRegistro({
      popId: pop.id,
      popVersao: vigente.versao,
      dataHora: localParaISO(dataHora),
      descricao,
      ambiente,
      corrigeRegistroId: corrigindo?.id,
    });
    if (!resultado.ok) {
      setErroGeral(resultado.erro);
      return;
    }
    setDescricao("");
    setAmbiente("");
    setCorrigindo(null);
    setTocado(false);
    setDataHora(agoraParaCampo());
  }

  const diasDefinidos = Number(guardaTexto);
  const erroGuarda = guardaTexto && (!Number.isInteger(diasDefinidos) || diasDefinidos < 1 || diasDefinidos > 3650) ? "Informe de 1 a 3650 dias." : "";

  return (
    <div className="pop-registros">
      <div className="pop-registros-col">
        <div className="priv-faixa pop-guarda" role="status">
          {guarda?.dias ? (
            <span>
              Guarda dos registros: {guarda.dias} dias · {guarda.citacao}
              {guarda.conferir ? <span className="pop-conferir pop-conferir--colado">conferir</span> : null}
            </span>
          ) : (
            <span>{guarda?.aviso}</span>
          )}
        </div>
        {contexto.podeEditarEmpresa && guarda && guarda.origem !== "norma" && (
          <div className="pop-guarda-rt">
            <label className="pc-field">
              <span className="ui-eyebrow">Guarda definida pelo RT (dias)</span>
              <input
                className={`ui-input${erroGuarda ? " is-invalid" : ""}`}
                inputMode="numeric"
                value={guardaTexto}
                placeholder={guarda.dias ? String(guarda.dias) : guarda.sugestaoDias ? `sugestão ${guarda.sugestaoDias}` : "dias"}
                onChange={(evento) => setGuardaTexto(evento.target.value.replace(/\D/g, ""))}
                aria-invalid={Boolean(erroGuarda)}
              />
              {erroGuarda && <span className="ui-field-error">{erroGuarda}</span>}
            </label>
            <button
              type="button"
              className="ui-btn ui-btn--secondary ui-btn--small"
              disabled={!guardaTexto || Boolean(erroGuarda)}
              onClick={() => {
                contexto.definirGuarda(diasDefinidos);
                setGuardaTexto("");
              }}
            >
              Definir
            </button>
          </div>
        )}

        {!vigente ? (
          <p className="ui-row-sub">Os registros começam quando o POP tiver uma versão aprovada.</p>
        ) : contexto.podeCriarRegistro ? (
          <div className="pop-registro-form">
            {corrigindo && (
              <div className="priv-faixa" role="status">
                <span>Corrige o registro de {quando(corrigindo.dataHora)}. O original continua guardado.</span>
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => setCorrigindo(null)}>
                  Cancelar
                </button>
              </div>
            )}
            <div className="pop-registro-linha">
              <label className="pc-field">
                <span className="ui-eyebrow">Data e hora</span>
                <input type="datetime-local" className={`ui-input${tocado && erroData ? " is-invalid" : ""}`} value={dataHora} max={agoraParaCampo()} onChange={(evento) => setDataHora(evento.target.value)} aria-invalid={Boolean(tocado && erroData)} />
                {tocado && erroData && <span className="ui-field-error">{erroData}</span>}
              </label>
              <label className="pc-field">
                <span className="ui-eyebrow">Ambiente (opcional)</span>
                <select className="ui-input ui-input--lista" value={ambiente} onChange={(evento) => setAmbiente(evento.target.value)}>
                  <option value="">Sem ambiente</option>
                  {contexto.ambientes.map((nome) => (
                    <option key={nome} value={nome}>
                      {nome}
                    </option>
                  ))}
                </select>
                {contexto.ambientes.length === 0 && <span className="ui-row-sub">Cadastre os ambientes em Estrutura › Ambientes e equipamentos.</span>}
              </label>
            </div>
            <label className="pc-field">
              <span className="ui-eyebrow">O que foi feito</span>
              <textarea className={`ui-input pop-area${tocado && erroDescricao ? " is-invalid" : ""}`} rows={2} value={descricao} onChange={(evento) => setDescricao(evento.target.value)} aria-invalid={Boolean(tocado && erroDescricao)} />
              {tocado && erroDescricao && <span className="ui-field-error">{erroDescricao}</span>}
            </label>
            <div className="pop-registro-acoes">
              <span className="ui-row-sub">Responsável: {contexto.usuario?.nome || "quem está no app"} · versão {vigente.versao} do POP</span>
              <button type="button" className="ui-btn ui-btn--save ui-btn--small" onClick={salvar}>
                Salvar registro
              </button>
            </div>
            {erroGeral && <span className="ui-field-error">{erroGeral}</span>}
          </div>
        ) : (
          <p className="ui-row-sub">Seu perfil só lê os registros deste POP.</p>
        )}
      </div>

      <div className="pop-registros-col">
        <div className="pc-card-head">
          <h3 className="pop-registros-titulo">Últimos registros</h3>
          <Pill tom="na">{recentes.length}</Pill>
        </div>
        {recentes.length === 0 ? (
          <p className="ui-row-sub">Nenhum registro dentro do prazo de guarda.</p>
        ) : (
          <ul className="pop-registro-lista pop-registro-lista--rolagem">
            {recentes.map((registro) => (
              <li key={registro.id} className="pop-registro-item">
                <span className="pop-registro-quando">
                  {quando(registro.dataHora)} · {registro.responsavel}
                  {registro.ambiente ? ` · ${registro.ambiente}` : ""} · v{registro.popVersao}
                </span>
                <span className="pop-registro-texto" title={registro.descricao}>
                  {registro.corrigeRegistroId ? "Corrige registro anterior. " : ""}
                  {registro.descricao}
                </span>
                <span className="pop-registro-botoes">
                  {provaId === registro.id && <span className="pop-revisar">Prova da execução</span>}
                  {contexto.podeEditarEmpresa && provaId !== registro.id && (
                    <button type="button" className="ui-btn ui-btn--soft ui-btn--small" onClick={() => contexto.definirProva(pop.id, registro.id)}>
                      Usar como prova
                    </button>
                  )}
                  {contexto.podeCriarRegistro && vigente && (
                    <button type="button" className="ui-btn ui-btn--soft ui-btn--small" onClick={() => setCorrigindo(registro)}>
                      Corrigir
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="pop-passos-pagina" role="group" aria-label="Registros fora do prazo">
          {revisar.length > 0 && (
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => setMostrarRevisar((valor) => !valor)}>
              Revisar ({revisar.length}) fora do prazo
            </button>
          )}
        </div>
        {mostrarRevisar && revisar.length > 0 && (
          <div className="pop-registro-revisar" role="region" aria-label="Registros fora do prazo de guarda">
            <p className="ui-row-sub">Fora do prazo de guarda. Nada foi apagado; ficam só para leitura.</p>
            <ul className="pop-registro-lista">
              {revisar.slice(0, 3).map((registro) => (
                <li key={registro.id} className="pop-registro-item">
                  <span className="pop-registro-quando">
                    {quando(registro.dataHora)} · {registro.responsavel}
                  </span>
                  <span className="pop-registro-texto" title={registro.descricao}>
                    {registro.descricao}
                  </span>
                </li>
              ))}
            </ul>
            {revisar.length > 3 && <span className="ui-row-sub">e mais {revisar.length - 3}.</span>}
          </div>
        )}
      </div>
    </div>
  );
}
