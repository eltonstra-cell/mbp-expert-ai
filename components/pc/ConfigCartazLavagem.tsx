"use client";

import { useEffect, useRef, useState } from "react";
import CartazLavagem from "@/components/CartazLavagem";
import { ESTILOS_DO_CARTAZ, type ConteudoDoCartaz, type EstiloDoCartaz } from "@/lib/cartazLavagem";
import { prepararLogotipo } from "@/lib/logotipoCapa";

type Props = {
  conteudo: Pick<ConteudoDoCartaz, "cartoes" | "sempreQue" | "passosSemFigura" | "fora">;
  rodape: string;
  /** Estilo e logotipo guardados na empresa. */
  guardado: { estilo: EstiloDoCartaz; logotipo?: string };
  podeSalvar: boolean;
  /** POP sem aprovação: mostra o aviso e bloqueia a geração. */
  bloqueio?: { mensagem: string; explicacao: string } | null;
  onSalvar: (estilo: EstiloDoCartaz, logotipo: string | undefined) => void;
  onGerar: (estilo: EstiloDoCartaz, logotipo: string | undefined) => void;
  onCancelar: () => void;
};

// Cartaz "Como lavar as mãos": escolha do estilo e do logotipo (o mesmo da capa dos POPs) com a pré-visualização ao vivo.
export default function ConfigCartazLavagem({ conteudo, rodape, guardado, podeSalvar, bloqueio, onSalvar, onGerar, onCancelar }: Props) {
  const [estilo, setEstilo] = useState<EstiloDoCartaz>(guardado.estilo);
  const [logotipo, setLogotipo] = useState<string | undefined>(guardado.logotipo);
  const [salvo, setSalvo] = useState<{ estilo: EstiloDoCartaz; logotipo?: string }>(guardado);
  const [erroLogo, setErroLogo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const entradaRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onCancelar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onCancelar]);

  const naoSalvo = podeSalvar && (estilo !== salvo.estilo || logotipo !== salvo.logotipo);

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
    setLogotipo(resultado.dataUrl);
  }

  return (
    <div className="pc-modal-layer" role="presentation">
      <div className="pc-modal-backdrop" onClick={onCancelar} />
      <section className="pc-modal ccp ccz" role="dialog" aria-modal="true" aria-label="Cartaz Como lavar as mãos">
        <h2 className="pc-modal-title">Cartaz “Como lavar as mãos”</h2>
        <div className="ccp-corpo">
          <div className="ccp-opcoes">
            {bloqueio && (
              <div className="ccz-bloqueio" role="alert">
                <strong>{bloqueio.mensagem}</strong>
                <span>{bloqueio.explicacao}</span>
              </div>
            )}
            <p className="ui-row-sub ccp-ajuda">
              {conteudo.cartoes.length} passos ilustrados, na ordem do POP, em uma página A4 vertical.
            </p>

            <fieldset className="ccp-grupo ccp-linha">
              <legend>Estilo</legend>
              {ESTILOS_DO_CARTAZ.map((opcao) => (
                <button key={opcao.id} type="button" className={`ccp-chip${estilo === opcao.id ? " is-ativo" : ""}`} title={opcao.descricao} aria-pressed={estilo === opcao.id} onClick={() => setEstilo(opcao.id)}>
                  {opcao.rotulo}
                </button>
              ))}
            </fieldset>

            <fieldset className="ccp-grupo ccp-linha">
              <legend>Logotipo (o mesmo da capa dos POPs)</legend>
              <input ref={entradaRef} type="file" accept="image/png,image/jpeg" className="sr-only" id="ccz-logotipo" onChange={(evento) => void enviarLogotipo(evento.target.files?.[0])} />
              <label htmlFor="ccz-logotipo" className={`ui-btn ui-btn--secondary ui-btn--small${enviando ? " is-disabled" : ""}`}>
                {enviando ? "Reduzindo…" : logotipo ? "Trocar logotipo" : "Enviar logotipo"}
              </label>
              {logotipo && (
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => setLogotipo(undefined)}>
                  Remover
                </button>
              )}
              <span className="ui-row-sub">Opcional · PNG ou JPG</span>
              {erroLogo && <span className="ui-field-error" role="alert">{erroLogo}</span>}
            </fieldset>

            {(conteudo.passosSemFigura.length > 0 || conteudo.fora.length > 0) && (
              <p className="ui-row-sub ccp-ajuda ccz-nota">
                {conteudo.passosSemFigura.length > 0 && `${conteudo.passosSemFigura.length} passo${conteudo.passosSemFigura.length === 1 ? "" : "s"} do POP não ${conteudo.passosSemFigura.length === 1 ? "tem" : "têm"} ilustração e ${conteudo.passosSemFigura.length === 1 ? "fica" : "ficam"} só no POP. `}
                {conteudo.fora.length > 0 && `${conteudo.fora.length} item${conteudo.fora.length === 1 ? "" : "s"} da lista “sempre que” ficou de fora (contexto hospitalar).`}
              </p>
            )}
          </div>

          <div className="ccp-previa ccz-previa" aria-label="Pré-visualização do cartaz">
            <div className="ccp-folha">
              <CartazLavagem dados={{ estilo, conteudo, rodape, logotipo }} previa />
            </div>
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
              <button
                type="button"
                className="ui-btn ui-btn--secondary"
                disabled={!naoSalvo}
                onClick={() => {
                  onSalvar(estilo, logotipo);
                  setSalvo({ estilo, logotipo });
                }}
              >
                Salvar escolhas
              </button>
            )}
            <button type="button" className="ui-btn ui-btn--save" disabled={Boolean(bloqueio)} title={bloqueio ? bloqueio.mensagem : undefined} onClick={() => onGerar(estilo, logotipo)}>
              Gerar cartaz (PDF)
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
