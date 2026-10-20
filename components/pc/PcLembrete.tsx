"use client";

import { useState } from "react";
import type { Lembrete } from "@/lib/painelHoje";

type Props = {
  lembrete: Lembrete;
  destinatarioNome?: string;
  onFechar: () => void;
};

// Prévia do lembrete. O app não envia e-mail sozinho (não há provedor de envio configurado): "Abrir no meu e-mail" usa o programa de e-mail da pessoa.
export default function PcLembrete({ lembrete, destinatarioNome, onFechar }: Props) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(lembrete.corpo);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }
  return (
    <div className="pc-modal-layer" role="presentation">
      <div className="pc-modal-backdrop" onClick={onFechar} />
      <section className="pc-modal lembrete" role="dialog" aria-modal="true" aria-label="Lembrete ao responsável do estabelecimento">
        <h2 className="pc-modal-title">Lembrete ao responsável</h2>
        <p className="ui-row-sub">
          Para: {lembrete.para ? `${destinatarioNome ? `${destinatarioNome} · ` : ""}${lembrete.para}` : "responsável sem e-mail cadastrado: escolha o destinatário no seu programa de e-mail"}
        </p>
        <p className="lembrete-assunto">{lembrete.assunto}</p>
        <pre className="lembrete-corpo" aria-label="Texto do lembrete">
          {lembrete.corpo}
        </pre>
        <p className="ui-row-sub">O texto lista só título e prazo. Não leva dado de saúde, foto, observação nem nome de colaborador.</p>
        <div className="pc-modal-foot">
          <button type="button" className="ui-btn ui-btn--secondary" onClick={() => void copiar()}>
            {copiado ? "Texto copiado" : "Copiar texto"}
          </button>
          <div className="ui-footer-actions">
            <button type="button" className="ui-btn ui-btn--secondary" onClick={onFechar}>
              Fechar
            </button>
            <a className="ui-btn ui-btn--primary" href={lembrete.mailto}>
              Abrir no meu e-mail
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
