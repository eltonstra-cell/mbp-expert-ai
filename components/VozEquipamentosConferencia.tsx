"use client";

import Select from "@/components/Select";
import { linhaDeConferencia, podeConfirmar, type ItemInterpretado } from "@/lib/vozEquipamentos";

export type ItemParaConferir = ItemInterpretado & { id: string };

type Props = {
  itens: ItemParaConferir[];
  /** Ambientes do cadastro (lista para escolher). */
  ambientes: string[];
  onEscolherAmbiente: (id: string, ambiente: string) => void;
  /** Cria o ambiente que foi falado e não existe: só quando a pessoa pede. */
  onCriarAmbiente: (id: string) => void;
  onConfirmar: (id: string) => void;
  onConfirmarTodos: () => void;
  onCorrigir: (id: string) => void;
};

// Linha de conferência por item falado ("Geladeira · Cozinha · 1"), com ✓ confirmar e ✕ corrigir.
// Nada é adicionado sem confirmação e nenhum ambiente é criado em silêncio.
export default function VozEquipamentosConferencia({ itens, ambientes, onEscolherAmbiente, onCriarAmbiente, onConfirmar, onConfirmarTodos, onCorrigir }: Props) {
  if (itens.length === 0) return null;
  const todosProntos = itens.every(podeConfirmar);
  return (
    <section className="vz" aria-label="Conferir o que foi falado">
      <div className="vz-topo">
        <span className="vz-titulo">Conferir o que foi falado</span>
        {itens.length > 1 && (
          <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" disabled={!todosProntos} onClick={onConfirmarTodos}>
            ✓ Confirmar todos
          </button>
        )}
      </div>
      <ul className="vz-lista">
        {itens.map((item) => {
          const opcoes = item.candidatos && item.candidatos.length > 0 ? item.candidatos : ambientes;
          return (
            <li key={item.id} className={`vz-linha${podeConfirmar(item) ? "" : " is-pendente"}`}>
              <span className="vz-texto">{linhaDeConferencia(item)}</span>
              {item.situacao === "inexistente" && (
                <span className="vz-pergunta" role="status">
                  O ambiente “{item.falado}” não existe no cadastro.
                  <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => onCriarAmbiente(item.id)}>
                    Criar “{item.falado}”
                  </button>
                </span>
              )}
              {item.situacao !== "ok" && (
                <label className="vz-escolha">
                  <span className="sr-only">Ambiente de {item.nome}</span>
                  <Select className="cad-input" value={item.ambiente} onChange={(evento) => onEscolherAmbiente(item.id, evento.target.value)} aria-label={`Ambiente de ${item.nome}`}>
                    <option value="">{item.situacao === "inexistente" ? "ou escolher na lista…" : "Escolher o ambiente…"}</option>
                    {opcoes.map((ambiente) => <option key={ambiente} value={ambiente}>{ambiente}</option>)}
                  </Select>
                </label>
              )}
              <span className="vz-acoes">
                <button type="button" className="vz-ok" aria-label={`Confirmar ${item.nome}`} title="Confirmar" disabled={!podeConfirmar(item)} onClick={() => onConfirmar(item.id)}>✓</button>
                <button type="button" className="vz-corrigir" aria-label={`Corrigir ${item.nome}`} title="Corrigir" onClick={() => onCorrigir(item.id)}>✕</button>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
