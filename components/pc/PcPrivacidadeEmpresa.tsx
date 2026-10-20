"use client";

import { useState } from "react";
import { Pill } from "@/components/ui/Pill";
import {
  GUARDA_PADRAO_DIAS,
  erroDaGuarda,
  textoDaFaixaDeGuarda,
  type VisitaComGuardaVencendo,
} from "@/lib/privacidadeEmpresa";

export type LinhaDeGuarda = VisitaComGuardaVencendo & { rotulo: string; concluidaTexto: string; venceTexto: string };

type Props = {
  empresaNome: string;
  iaLiberada: boolean;
  /** "Liberado por <nome> em dd/mm/aaaa" ou vazio. */
  textoLiberacao: string;
  jaFoiLiberada: boolean;
  podeLiberarIa: boolean;
  podeEditarGuarda: boolean;
  /** Celular (Campo): só leitura, com "Alterar no computador". */
  somenteLeitura: boolean;
  guardaDias: number;
  vencendo: LinhaDeGuarda[];
  onLiberarIa: (aceite: boolean) => void;
  onDesligarIa: () => void;
  onSalvarGuarda: (dias: number) => void;
};

// Privacidade e guarda de uma empresa. A IA nas fotos nasce desligada; a guarda só avisa, nunca apaga.
export default function PcPrivacidadeEmpresa({
  empresaNome,
  iaLiberada,
  textoLiberacao,
  jaFoiLiberada,
  podeLiberarIa,
  podeEditarGuarda,
  somenteLeitura,
  guardaDias,
  vencendo,
  onLiberarIa,
  onDesligarIa,
  onSalvarGuarda,
}: Props) {
  const [janelaAberta, setJanelaAberta] = useState(false);
  const [aceite, setAceite] = useState(false);
  const ehOutro = guardaDias !== 90 && guardaDias !== 180;
  const [escolha, setEscolha] = useState<"90" | "180" | "outro">(ehOutro ? "outro" : (String(guardaDias) as "90" | "180"));
  const [outro, setOutro] = useState(ehOutro ? String(guardaDias) : "");
  const [revisando, setRevisando] = useState(false);

  const diasEscolhidos = escolha === "outro" ? (outro.trim() === "" ? null : Number(outro)) : Number(escolha);
  const erroOutro = escolha === "outro" ? erroDaGuarda(diasEscolhidos) : "";
  const guardaMudou = diasEscolhidos !== guardaDias;
  const editavel = podeEditarGuarda && !somenteLeitura;

  return (
    <div className="priv-painel">
      <article className="ui-card priv-cartao">
        <div className="pc-card-head">
          <h2 className="ui-card-title">IA nas fotos</h2>
          <Pill tom={iaLiberada ? "ok" : "na"}>{iaLiberada ? "Ligada" : "Desligada"}</Pill>
        </div>
        <p className="ui-row-sub priv-texto">
          Com a IA ligada, a foto sai do aparelho e vai para um provedor externo, que devolve uma sugestão de texto. A IA só sugere: nada vira não conformidade sem a sua confirmação.
        </p>
        {iaLiberada && textoLiberacao && <p className="ui-row-sub priv-texto">{textoLiberacao}</p>}
        {somenteLeitura ? (
          <p className="ui-row-sub priv-texto">Alterar no computador.</p>
        ) : podeLiberarIa ? (
          iaLiberada ? (
            <div className="priv-acoes">
              <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={onDesligarIa}>
                Desligar a IA
              </button>
            </div>
          ) : (
            <div className="priv-acoes">
              <button
                type="button"
                className="ui-btn ui-btn--criar ui-btn--small"
                onClick={() => {
                  if (jaFoiLiberada) onLiberarIa(true);
                  else {
                    setAceite(false);
                    setJanelaAberta(true);
                  }
                }}
              >
                Liberar a IA
              </button>
            </div>
          )
        ) : (
          <p className="ui-row-sub priv-texto">Só Administrador e Consultor/RT liberam a IA.</p>
        )}
      </article>

      <article className="ui-card priv-cartao">
        <div className="pc-card-head">
          <h2 className="ui-card-title">Guarda de fotos e áudios</h2>
          <Pill tom="info">{guardaDias} dias</Pill>
        </div>
        <p className="ui-row-sub priv-texto">O prazo conta a partir da conclusão da visita. Nada é apagado nem some sozinho.</p>
        <div className="priv-opcoes" role="radiogroup" aria-label="Prazo de guarda">
          {(
            [
              ["90", "90 dias"],
              ["180", `180 dias (padrão sugerido)`],
              ["outro", "Outro"],
            ] as const
          ).map(([valor, rotulo]) => (
            <label key={valor} className={`priv-opcao${escolha === valor ? " is-on" : ""}`}>
              <input type="radio" name="guarda" value={valor} checked={escolha === valor} disabled={!editavel} onChange={() => setEscolha(valor)} />
              <span>{rotulo}</span>
            </label>
          ))}
          {escolha === "outro" && (
            <label className="priv-outro">
              <input
                type="number"
                min={30}
                max={730}
                className={`ui-input${erroOutro ? " is-invalid" : ""}`}
                value={outro}
                disabled={!editavel}
                aria-label="Dias de guarda"
                aria-invalid={Boolean(erroOutro)}
                onChange={(evento) => setOutro(evento.target.value)}
              />
              <span className="ui-row-sub">dias</span>
            </label>
          )}
        </div>
        {erroOutro && <span className="ui-field-error">{erroOutro}</span>}
        {somenteLeitura ? (
          <p className="ui-row-sub priv-texto">Alterar no computador.</p>
        ) : editavel ? (
          <div className="priv-acoes">
            <button
              type="button"
              className="ui-btn ui-btn--save ui-btn--small"
              disabled={Boolean(erroOutro) || diasEscolhidos === null || !guardaMudou}
              onClick={() => diasEscolhidos !== null && onSalvarGuarda(diasEscolhidos)}
            >
              Salvar prazo
            </button>
          </div>
        ) : null}
        <p className="ui-row-sub priv-nota">
          Prazos de guarda citados nas normas pesquisadas: 30, 90 e 180 dias para registros. O padrão sugerido é o maior ({GUARDA_PADRAO_DIAS} dias), a confirmar com o RT da empresa.
        </p>

        {vencendo.length > 0 && (
          <div className="priv-faixa" role="status">
            <span>{textoDaFaixaDeGuarda(vencendo.length)}</span>
            <button type="button" className="priv-revisar" onClick={() => setRevisando((valor) => !valor)} aria-expanded={revisando}>
              {revisando ? "Fechar ←" : "Revisar →"}
            </button>
          </div>
        )}
        {revisando && vencendo.length > 0 && (
          <div className="priv-lista" role="list" aria-label="Visitas com fotos perto do prazo (somente leitura)">
            {vencendo.map((linha) => (
              <div key={linha.visitaId} className="priv-linha" role="listitem">
                <span className="priv-linha-titulo">{linha.rotulo}</span>
                <span className="ui-row-sub">
                  Concluída em {linha.concluidaTexto} · {linha.vencida ? "venceu" : "vence"} em {linha.venceTexto} · {linha.fotos} {linha.fotos === 1 ? "foto" : "fotos"} · {linha.audios} {linha.audios === 1 ? "áudio" : "áudios"}
                </span>
              </div>
            ))}
            <p className="ui-row-sub priv-nota">Lista somente para consulta. O app não apaga nada nesta etapa.</p>
          </div>
        )}
      </article>

      <article className="ui-card priv-cartao">
        <div className="pc-card-head">
          <h2 className="ui-card-title">Orientação antes de fotografar</h2>
          <Pill tom="ok">Sempre ligada</Pill>
        </div>
        <p className="ui-row-sub priv-texto">Antes de abrir a câmera, o app lembra de mostrar o ambiente, o equipamento ou o produto e de evitar rostos, crachás e documentos pessoais. Não há opção de desligar.</p>
        <p className="ui-row-sub priv-texto">O áudio do Falar não é guardado, só o texto. A transcrição passa por um provedor externo.</p>
      </article>

      {janelaAberta && (
        <div className="pc-modal-layer" role="presentation">
          <div className="pc-modal-backdrop" onClick={() => setJanelaAberta(false)} />
          <section className="pc-modal priv-janela" role="dialog" aria-modal="true" aria-label="Liberar a IA, primeira vez nesta empresa">
            <h2 className="pc-modal-title">Liberar a IA, primeira vez nesta empresa</h2>
            <p className="ui-subtitle">{empresaNome}</p>
            <p className="priv-texto-janela">
              A foto sai do aparelho e vai para um provedor externo de IA, que devolve uma sugestão de texto. Evite rostos, crachás e documentos. Você pode desligar quando quiser.
            </p>
            <label className="pc-check priv-aceite">
              <input type="checkbox" checked={aceite} onChange={(evento) => setAceite(evento.target.checked)} />
              <span>Li e concordo, em nome da empresa</span>
            </label>
            {!aceite && <span className="ui-field-error">Marque o aceite para liberar.</span>}
            <div className="ui-footer-actions">
              <button
                type="button"
                className="ui-btn ui-btn--criar"
                disabled={!aceite}
                onClick={() => {
                  onLiberarIa(true);
                  setJanelaAberta(false);
                }}
              >
                Liberar a IA
              </button>
              <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setJanelaAberta(false)}>
                Cancelar
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
