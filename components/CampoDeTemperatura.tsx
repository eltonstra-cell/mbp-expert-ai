"use client";

import { useEffect, useState } from "react";
import Select from "@/components/Select";
import { LIMITES_DE_TEMPERATURA, classificarTemperatura, lerTemperatura, limiteDoTipo, limiteSugerido, textoDoLimite, type ResultadoDaTemperatura } from "@/lib/limitesDeTemperatura";

type Props = {
  itemId: string;
  titulo: string;
  equipamentos: string[];
  /** Limites que o RT confirmou nos equipamentos deste ambiente (o primeiro vale como tipo inicial). */
  limitesConfirmados?: string[];
  atual?: { valor: number; limiteId: string };
  /** `medida` é null quando o campo foi esvaziado. `resultado` é o que o limite indica (o RT ainda pode trocar a resposta). */
  onTemperatura: (medida: { valor: number; limiteId: string } | null, resultado: ResultadoDaTemperatura | null) => void;
};

/** Só para itens que falam de temperatura. */
export const ehItemDeTemperatura = (titulo: string) => /temperatura|refriger|congel|resfri|fritur|reaquec/i.test(titulo);

// Digitou a temperatura: marca Conforme ou Não conforme pelo limite da norma, na hora, e mostra qual limite usou. Sem limite, avisa e não classifica.
export default function CampoDeTemperatura({ itemId, titulo, equipamentos, limitesConfirmados = [], atual, onTemperatura }: Props) {
  const sugerido = (limitesConfirmados[0] ? limiteDoTipo(limitesConfirmados[0]) : undefined) || limiteSugerido([...equipamentos, titulo]);
  const [texto, setTexto] = useState(atual ? String(atual.valor).replace(".", ",") : "");
  const [limiteId, setLimiteId] = useState(atual?.limiteId || sugerido?.id || "");
  useEffect(() => {
    setTexto(atual ? String(atual.valor).replace(".", ",") : "");
    setLimiteId(atual?.limiteId || (limitesConfirmados[0] ? limitesConfirmados[0] : limiteSugerido([...equipamentos, titulo])?.id) || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  const limite = limiteDoTipo(limiteId);
  const valor = lerTemperatura(texto);
  const resultado = classificarTemperatura(valor, limite);

  function mudar(novoTexto: string, novoLimiteId: string) {
    setTexto(novoTexto);
    setLimiteId(novoLimiteId);
    const v = lerTemperatura(novoTexto);
    const l = limiteDoTipo(novoLimiteId);
    if (v === null) {
      if (!novoTexto.trim()) onTemperatura(null, null);
      return;
    }
    onTemperatura({ valor: v, limiteId: novoLimiteId }, classificarTemperatura(v, l));
  }

  return (
    <div className="chk-temp" role="group" aria-label="Temperatura medida">
      <label className="chk-temp-campo">
        <span className="ui-eyebrow">Temperatura medida (°C)</span>
        <input className="ui-input" inputMode="decimal" value={texto} onChange={(evento) => mudar(evento.target.value, limiteId)} placeholder="Ex.: 4,5" aria-invalid={texto.trim() !== "" && valor === null} />
      </label>
      <label className="chk-temp-campo">
        <span className="ui-eyebrow">Tipo</span>
        <Select value={limiteId} onChange={(evento) => mudar(texto, evento.target.value)} aria-label="Tipo de limite de temperatura">
          <option value="">Escolher</option>
          {LIMITES_DE_TEMPERATURA.map((opcao) => (
            <option key={opcao.id} value={opcao.id}>
              {opcao.rotulo} ({textoDoLimite(opcao)})
            </option>
          ))}
        </Select>
      </label>
      <p className={`chk-temp-msg${resultado === "Não Conforme" ? " is-nc" : resultado === "Conforme" ? " is-ok" : ""}`} role="status">
        {texto.trim() !== "" && valor === null
          ? "Digite só o número, por exemplo 4,5."
          : !limite
          ? "Sem limite para este tipo: escolha o tipo ou responda manualmente. Nada foi classificado."
          : resultado
          ? `${resultado === "Conforme" ? "Conforme" : "Não conforme"}: ${String(valor).replace(".", ",")} °C, limite ${textoDoLimite(limite)} (${limite.norma}, item ${limite.itens}). Você pode corrigir a resposta.`
          : `Limite: ${textoDoLimite(limite)} (${limite.norma}, item ${limite.itens}).`}
      </p>
      {limite?.observacaoDaFonte && <p className="chk-temp-msg">{limite.observacaoDaFonte}</p>}
    </div>
  );
}
