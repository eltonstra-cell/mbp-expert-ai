"use client";

import { popAtivado } from "@/lib/popGestao";
import Select from "@/components/Select";
import { useMemo, useState, type ReactNode } from "react";
import { resumoDosRegistros } from "@/lib/popRegistrosResumo";
import { hojeISO } from "@/lib/popsNorma";
import { agoraParaCampoLocal, formatarDataHora, localParaISO } from "@/lib/dataLocal";
import { useRegistrosDaEmpresa } from "@/components/RegistrosEmpresaContext";
import { popVigente } from "@/lib/popsNorma";
import { modeloPorId } from "@/lib/popModelos";
import { LIMITE_DO_TEXTO_LIVRE } from "@/lib/documentosCentral";
import { guardaDosRegistros, separarRegistros } from "@/lib/registrosEmpresa";
import type { ProcedimentoOperacionalPadronizado, RegistroPop } from "@/types";

function agoraParaCampo(): string {
  return agoraParaCampoLocal();
}

function quando(iso: string) {
  return formatarDataHora(iso);
}

// Aba "Registros" do POP aprovado: o que foi feito, quando e por quem. Registro nunca é editado; correção vira outro registro.
export default function PcRegistrosDoPop({ pop, comprovantes, mensagemDoComprovante }: { pop: ProcedimentoOperacionalPadronizado; comprovantes?: ReactNode; mensagemDoComprovante?: string }) {
  const contexto = useRegistrosDaEmpresa();
  const [dataHora, setDataHora] = useState(agoraParaCampo);
  const [descricao, setDescricao] = useState("");
  const [ambiente, setAmbiente] = useState("");
  const [verificacao, setVerificacao] = useState("");
  const [desvio, setDesvio] = useState(false);
  const [acaoCorretiva, setAcaoCorretiva] = useState("");
  const [corrigindo, setCorrigindo] = useState<RegistroPop | null>(null);
  const [tocado, setTocado] = useState(false);
  // Campo já tocado (digitou ou saiu dele): o aviso aparece na hora, não só ao salvar.
  const [campos, setCampos] = useState<Partial<Record<"data" | "descricao" | "acao", boolean>>>({});
  const tocar = (nome: "data" | "descricao" | "acao") => setCampos((atual) => (atual[nome] ? atual : { ...atual, [nome]: true }));
  const mostrar = (nome: "data" | "descricao" | "acao") => tocado || Boolean(campos[nome]);
  const [erroGeral, setErroGeral] = useState("");
  const [mostrarRevisar, setMostrarRevisar] = useState(false);
  const [novo, setNovo] = useState(false);
  const [guardaTexto, setGuardaTexto] = useState("");

  const vigente = popVigente(pop);
  // Só apoio: o app ainda não tem a planilha própria; a descrição vem do modelo de origem.
  const registrosSugeridos = modeloPorId(pop.origemModelo?.id)?.registrosSugeridos || [];
  const guarda = useMemo(() => (contexto?.empresa ? guardaDosRegistros(contexto.empresa) : null), [contexto?.empresa]);
  const { recentes, revisar } = useMemo(
    () => separarRegistros(contexto?.registros || [], pop.id, guarda?.dias ?? null),
    [contexto?.registros, pop.id, guarda?.dias]
  );
  if (!contexto) return null;
  const resumo = resumoDosRegistros(pop.id, vigente?.conteudo, contexto.registros, hojeISO(), vigente?.aprovacao?.em, popAtivado(pop));

  const provaId = contexto.empresa?.registroProvaPorPop?.[pop.id] || "";
  const erroDescricao = !descricao.trim() ? "Descreva o que foi feito." : "";
  const erroAcao = desvio && !acaoCorretiva.trim() ? "Houve desvio: informe a ação corretiva." : "";
  const erroData = !dataHora ? "Informe a data e a hora." : Date.parse(localParaISO(dataHora)) > Date.now() + 5 * 60 * 1000 ? "A data e a hora não podem estar no futuro." : "";

  function salvar() {
    setTocado(true);
    setErroGeral("");
    if (erroDescricao || erroData || erroAcao || !vigente) return;
    const resultado = contexto!.novoRegistro({
      popId: pop.id,
      popVersao: vigente.versao,
      dataHora: localParaISO(dataHora),
      descricao,
      ambiente,
      corrigeRegistroId: corrigindo?.id,
      verificacao,
      desvio,
      acaoCorretiva,
    });
    if (!resultado.ok) {
      setErroGeral(resultado.erro);
      return;
    }
    setDescricao("");
    setAmbiente("");
    setVerificacao("");
    setDesvio(false);
    setAcaoCorretiva("");
    setCorrigindo(null);
    setNovo(false);
    setTocado(false);
    setDataHora(agoraParaCampo());
  }

  const diasDefinidos = Number(guardaTexto);
  const erroGuarda = guardaTexto && (!Number.isInteger(diasDefinidos) || diasDefinidos < 1 || diasDefinidos > 3650) ? "Informe de 1 a 3650 dias." : "";

  return (
    <div className="reg">
      <dl className="reg-dados">
        <div>
          <dt>Frequência</dt>
          <dd>{resumo.frequencia || "Não definida"}</dd>
        </div>
        <div>
          <dt>Próximo registro</dt>
          <dd>{vigente && resumo.proximo ? <span className={resumo.proximo.urgente ? "rz-terra" : undefined}>{resumo.proximo.texto}</span> : "—"}</dd>
        </div>
        <div>
          <dt>Guarda dos registros</dt>
          <dd>
            {guarda?.dias ? (
              <>
                {guarda.dias} dias
                <span className="reg-fonte"> · {guarda.citacao}</span>
                {guarda.conferir ? <span className="pop-conferir pop-conferir--colado">conferir</span> : null}
              </>
            ) : (
              <span className="reg-fonte">{guarda?.aviso}</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="reg-blocos">
        <section className="reg-bloco" aria-label="Registros">
          <header className="reg-bloco-topo">
            <h3 className="reg-bloco-titulo">
              Registros<span className="reg-bloco-conta">{recentes.length > 0 ? ` · últimos ${recentes.length}` : ""}</span>
            </h3>
            {vigente && contexto.podeCriarRegistro && (
              <button type="button" className="rz-btn rz-btn--terra" aria-expanded={novo || Boolean(corrigindo)} onClick={() => setNovo((valor) => !valor)}>
                + Novo registro
              </button>
            )}
          </header>
          {registrosSugeridos.map((descricao) => (
            <p key={descricao} className="ui-row-sub pop-registro-sugerido">
              Registro sugerido: {descricao}
            </p>
          ))}
        {!vigente ? (
          <p className="ui-row-sub">Os registros começam quando o POP tiver uma versão aprovada.</p>
        ) : contexto.podeCriarRegistro ? (
          novo || corrigindo ? <div className="pop-registro-form">
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
                <input type="datetime-local" className={`ui-input${mostrar("data") && erroData ? " is-invalid" : ""}`} value={dataHora} max={agoraParaCampo()} onBlur={() => tocar("data")} onChange={(evento) => { tocar("data"); setDataHora(evento.target.value); }} aria-invalid={Boolean(mostrar("data") && erroData)} />
                {mostrar("data") && erroData && <span className="ui-field-error" role="alert">{erroData}</span>}
              </label>
              <label className="pc-field">
                <span className="ui-eyebrow">Ambiente (opcional)</span>
                <Select className="ui-input ui-input--lista" value={ambiente} onChange={(evento) => setAmbiente(evento.target.value)}>
                  <option value="">Sem ambiente</option>
                  {contexto.ambientes.map((nome) => (
                    <option key={nome} value={nome}>
                      {nome}
                    </option>
                  ))}
                </Select>
                {contexto.ambientes.length === 0 && <span className="ui-row-sub">Cadastre os ambientes em Cadastros › Ambientes.</span>}
              </label>
            </div>
            <label className="pc-field">
              <span className="ui-eyebrow">O que foi feito</span>
              <textarea className={`ui-input pop-area${mostrar("descricao") && erroDescricao ? " is-invalid" : ""}`} rows={2} maxLength={LIMITE_DO_TEXTO_LIVRE} value={descricao} onBlur={() => tocar("descricao")} onChange={(evento) => { tocar("descricao"); setDescricao(evento.target.value); }} aria-invalid={Boolean(mostrar("descricao") && erroDescricao)} />
              {mostrar("descricao") && erroDescricao && <span className="ui-field-error" role="alert">{erroDescricao}</span>}
            </label>
            <label className="pc-field">
              <span className="ui-eyebrow">Verificação (opcional)</span>
              <input className="ui-input" maxLength={LIMITE_DO_TEXTO_LIVRE} value={verificacao} onChange={(evento) => setVerificacao(evento.target.value)} />
            </label>
            <label className="ui-row-sub">
              <input type="checkbox" checked={desvio} onChange={(evento) => setDesvio(evento.target.checked)} /> Houve desvio
            </label>
            {desvio && (
              <label className="pc-field">
                <span className="ui-eyebrow">Ação corretiva (obrigatória)</span>
                <textarea className={`ui-input pop-area${mostrar("acao") && erroAcao ? " is-invalid" : ""}`} rows={2} maxLength={LIMITE_DO_TEXTO_LIVRE} value={acaoCorretiva} onBlur={() => tocar("acao")} onChange={(evento) => { tocar("acao"); setAcaoCorretiva(evento.target.value); }} aria-invalid={Boolean(mostrar("acao") && erroAcao)} />
                {mostrar("acao") && erroAcao && <span className="ui-field-error" role="alert">{erroAcao}</span>}
              </label>
            )}
            <p className="ui-row-sub reg-aviso-saude">Não registre dados de saúde de pessoas.</p>
            <div className="pop-registro-acoes">
              <span className="ui-row-sub">Responsável: {contexto.usuario?.nome || "quem está no app"} · versão {vigente.versao} do POP</span>
              <button type="button" className="ui-btn ui-btn--save ui-btn--small" onClick={salvar}>
                Salvar registro
              </button>
            </div>
            {erroGeral && <span className="ui-field-error">{erroGeral}</span>}
          </div> : null
        ) : (
          <p className="ui-row-sub">Seu perfil só lê os registros deste POP.</p>
        )}

          {vigente && (recentes.length === 0 ? (
            <p className="ui-row-sub">Nenhum registro dentro do prazo de guarda.</p>
          ) : (
            <ul className="reg-lista scroll-fino">
              {recentes.map((registro) => (
                <li key={registro.id} className="reg-linha">
                  <span className="reg-linha-texto">
                    <span className="reg-linha-quando">
                      {quando(registro.dataHora)} · {registro.responsavel}
                      {registro.ambiente ? ` · ${registro.ambiente}` : ""} · v{registro.popVersao}
                    </span>
                    <span className="reg-linha-desc" title={registro.descricao}>
                      {registro.corrigeRegistroId ? "Corrige registro anterior. " : ""}
                      {registro.descricao}
                    </span>
                  </span>
                  <span className={registro.desvio ? "rz-ambar" : "rz-verde"}>{registro.desvio ? "Ação corretiva" : "Conforme"}</span>
                  <span className="pop-registro-botoes">
                    {provaId === registro.id && <span className="pop-revisar">Prova da execução</span>}
                    {contexto.podeEditarEmpresa && provaId !== registro.id && (
                      <button type="button" className="ui-btn ui-btn--soft ui-btn--small" onClick={() => contexto.definirProva(pop.id, registro.id)}>
                        Usar como prova
                      </button>
                    )}
                    {contexto.podeCriarRegistro && (
                      <button type="button" className="ui-btn ui-btn--soft ui-btn--small" onClick={() => setCorrigindo(registro)}>
                        Corrigir
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ))}
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

        </section>

        <section className="reg-bloco" aria-label="Comprovantes">
          {comprovantes ?? <p className="ui-row-sub">{mensagemDoComprovante || "Este POP não usa comprovante de terceiros."}</p>}
        </section>
      </div>
    </div>
  );
}
