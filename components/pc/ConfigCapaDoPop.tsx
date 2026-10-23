"use client";

import Select from "@/components/Select";
import { useEffect, useRef, useState } from "react";
import CapaDoPop from "@/components/CapaDoPop";
import { prepararLogotipo } from "@/lib/logotipoCapa";
import {
  CORES_DE_CAPA,
  ESTILOS_DE_CAPA,
  ICONES_DE_CAPA,
  capaMudou,
  modeloDaCapa,
  sugerirTracoEmPretoEBranco,
  type CapaCompleta,
  type CapaDosPops,
  type DadosDaCapa,
} from "@/lib/capaPop";

type Props = {
  /** Dados do POP aberto (a pré-visualização é ao vivo, com este POP). */
  dados: Omit<DadosDaCapa, "iconeId">;
  /** Ícone do mapa para este POP e o que foi escolhido à mão (vazio = automático). */
  iconeAutomatico: string;
  iconeEscolhido: string;
  /** Como a capa começa nesta janela. */
  inicial: CapaCompleta;
  /** O que está guardado na empresa (para o "não salvo"). Sem isso, não há botão Salvar. */
  guardada?: CapaDosPops;
  podeSalvar: boolean;
  avisoNaoConferido?: boolean;
  onSalvar: (capa: CapaCompleta, icone: string) => void;
  onImprimir: (capa: CapaCompleta, icone: string) => void;
  onCancelar: () => void;
};

// Capa e impressão do POP: interruptor "Incluir capa" (desligado por padrão), estilo, cor, tipo de ícone e logotipo,
// com a pré-visualização ao lado. Salvar guarda como padrão da empresa para as próximas versões; Imprimir usa o que está na tela.
export default function ConfigCapaDoPop({ dados, iconeAutomatico, iconeEscolhido, inicial, guardada, podeSalvar, avisoNaoConferido, onSalvar, onImprimir, onCancelar }: Props) {
  const [capa, setCapa] = useState<CapaCompleta>(inicial);
  const [icone, setIcone] = useState(iconeEscolhido);
  const [erroLogo, setErroLogo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const entradaRef = useRef<HTMLInputElement | null>(null);
  // O que está guardado: começa com a empresa e passa a ser o que a pessoa acabou de salvar.
  const [guardadaAgora, setGuardadaAgora] = useState<{ capa: CapaDosPops | undefined; icone: string }>({ capa: guardada, icone: iconeEscolhido });

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onCancelar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onCancelar]);

  const iconeId = icone || iconeAutomatico;
  const modelo = modeloDaCapa(capa, { ...dados, iconeId }, true);
  const naoSalvo = podeSalvar && (capaMudou(guardadaAgora.capa, capa) || icone !== guardadaAgora.icone);
  const mudar = (parcial: Partial<CapaCompleta>) => setCapa((atual) => ({ ...atual, ...parcial }));

  async function enviarLogotipo(arquivo: File | undefined) {
    if (!arquivo) return;
    setErroLogo("");
    setEnviando(true);
    const resultado = await prepararLogotipo(arquivo);
    setEnviando(false);
    if (entradaRef.current) entradaRef.current.value = "";
    if (!resultado.ok) {
      setErroLogo(resultado.erro);
      return;
    }
    mudar({ logotipo: resultado.dataUrl });
  }

  return (
    <div className="pc-modal-layer" role="presentation">
      <div className="pc-modal-backdrop" onClick={onCancelar} />
      <section className="pc-modal ccp" role="dialog" aria-modal="true" aria-label="Capa e impressão do POP">
        <h2 className="pc-modal-title">Capa e impressão</h2>
        <div className="ccp-corpo">
          <div className="ccp-opcoes">
            <label className="ccp-interruptor">
              <input type="checkbox" role="switch" checked={capa.ativa} onChange={(evento) => mudar({ ativa: evento.target.checked })} />
              <span className="ccp-interruptor-trilho" aria-hidden="true" />
              <span>Incluir capa</span>
            </label>
            {!capa.ativa && <p className="ui-row-sub ccp-ajuda">A capa é opcional. Desligada, o PDF começa direto pelo conteúdo do POP.</p>}
            {capa.ativa && <p className="ui-row-sub ccp-ajuda">A capa é a página 1 do PDF, sem cabeçalho nem número de página; o conteúdo começa na página 2.</p>}

            {capa.ativa && (
              <>
                <fieldset className="ccp-grupo">
                  <legend>Estilo · {ESTILOS_DE_CAPA.find((item) => item.id === capa.estilo)?.rotulo}</legend>
                  <div className="ccp-estilos">
                    {ESTILOS_DE_CAPA.map((estilo) => (
                      <button key={estilo.id} type="button" className={`ccp-estilo${capa.estilo === estilo.id ? " is-ativo" : ""}`} aria-pressed={capa.estilo === estilo.id} title={estilo.descricao} onClick={() => mudar({ estilo: estilo.id })}>
                        <span className="ccp-mini">
                          <CapaDoPop modelo={modeloDaCapa({ ...capa, estilo: estilo.id }, { ...dados, iconeId }, true)} />
                        </span>
                        <span className="ccp-estilo-nome">{estilo.id}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="ccp-grupo ccp-linha">
                  <legend>Cor</legend>
                  {CORES_DE_CAPA.map((cor) => (
                    <button key={cor.id} type="button" className={`ccp-chip${capa.cor === cor.id ? " is-ativo" : ""}`} aria-pressed={capa.cor === cor.id} onClick={() => mudar({ cor: cor.id })}>
                      <i style={{ background: cor.id === "pb" ? "#fff" : cor.hex, borderColor: cor.id === "pb" ? "#12202B" : "rgba(18,32,43,.25)" }} aria-hidden="true" />
                      {cor.rotulo}
                    </button>
                  ))}
                </fieldset>

                <fieldset className="ccp-grupo ccp-linha">
                  <legend>Ícone</legend>
                  <button type="button" className={`ccp-chip${capa.icone === "colorido" ? " is-ativo" : ""}`} aria-pressed={capa.icone === "colorido"} onClick={() => mudar({ icone: "colorido" })}>
                    Colorido
                  </button>
                  <button type="button" className={`ccp-chip${capa.icone === "traco" ? " is-ativo" : ""}`} aria-pressed={capa.icone === "traco"} onClick={() => mudar({ icone: "traco" })}>
                    Traço (uma cor)
                  </button>
                  <Select className="ccp-select" value={icone} onChange={(evento) => setIcone(evento.target.value)} aria-label="Ícone deste POP">
                    <option value="">Ícone automático do tema</option>
                    {ICONES_DE_CAPA.map((item) => (
                      <option key={item.id} value={item.id}>{item.rotulo}</option>
                    ))}
                  </Select>
                </fieldset>

                <fieldset className="ccp-grupo ccp-linha">
                  <legend>Logotipo</legend>
                  <input ref={entradaRef} type="file" accept="image/png,image/jpeg" className="sr-only" id="ccp-logotipo" onChange={(evento) => void enviarLogotipo(evento.target.files?.[0])} />
                  <label htmlFor="ccp-logotipo" className={`ui-btn ui-btn--secondary ui-btn--small${enviando ? " is-disabled" : ""}`}>
                    {enviando ? "Reduzindo…" : capa.logotipo ? "Trocar logotipo" : "Enviar logotipo"}
                  </label>
                  {capa.logotipo && (
                    <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => mudar({ logotipo: undefined })}>
                      Remover
                    </button>
                  )}
                  <span className="ui-row-sub">Opcional · PNG ou JPG · aparece no estilo C</span>
                  {erroLogo && <span className="ui-field-error" role="alert">{erroLogo}</span>}
                </fieldset>
              </>
            )}
            {capa.ativa && sugerirTracoEmPretoEBranco(capa, iconeId) && (
              <p className="ui-row-sub ccp-ajuda" role="status">Em impressão preto e branco este ícone colorido fica claro. Prefira o ícone de traço.</p>
            )}
            {avisoNaoConferido && (
              <p className="pdoc-nao-conferido" role="status">
                Conteúdo de modelo ainda não conferido
              </p>
            )}
          </div>

          <div className="ccp-previa" aria-label="Pré-visualização da capa">
            {capa.ativa ? (
              <div className="ccp-folha">
                <CapaDoPop modelo={modelo} />
              </div>
            ) : (
              <div className="ccp-sem-capa">Sem capa: a primeira página já é o conteúdo.</div>
            )}
          </div>
        </div>

        <div className="pc-modal-foot ccp-rodape">
          <span className={`ccp-estado${naoSalvo ? " is-pendente" : ""}`} role="status">
            {podeSalvar ? (naoSalvo ? "● Alterações ainda não salvas" : "✓ Tudo salvo") : ""}
          </span>
          <div className="ui-footer-actions">
            <button type="button" className="ui-btn ui-btn--secondary" onClick={onCancelar}>
              Cancelar
            </button>
            {podeSalvar && (
              <button type="button" className={`ui-btn ui-btn--save${naoSalvo ? "" : " is-apagado"}`} onClick={() => {
                  onSalvar(capa, icone);
                  setGuardadaAgora({ capa, icone });
                }}>
                Salvar
              </button>
            )}
            <button type="button" className="ui-btn ui-btn--criar" onClick={() => onImprimir(capa, icone)}>
              Imprimir ou salvar PDF
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
