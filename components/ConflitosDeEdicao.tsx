"use client";

import type { Conflito } from "@/lib/mesclaTresVias";

type Props = {
  conflitos: Conflito[];
  /** "meu" mantém o que foi feito neste aparelho; "nuvem" troca pela versão do outro aparelho. */
  onEscolher: (conflito: Conflito, escolha: "meu" | "nuvem") => void;
};

function textoDoValor(valor: unknown, conflito: Conflito): string {
  if (valor === undefined || valor === null) return "apagado";
  if (conflito.itemId && typeof valor === "object") {
    const item = valor as { status?: string; observacao?: string };
    return [item.status, item.observacao].filter(Boolean).join(" · ") || "sem resposta";
  }
  if (typeof valor === "object") return "alterado";
  const texto = String(valor).trim();
  return texto ? (texto.length > 80 ? `${texto.slice(0, 80)}…` : texto) : "vazio";
}

// Dois aparelhos mexeram no mesmo item. Nada é sobrescrito em silêncio: o RT escolhe, e o envio fica parado até todos serem resolvidos.
export default function ConflitosDeEdicao({ conflitos, onEscolher }: Props) {
  if (conflitos.length === 0) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true" aria-label="Alterações em conflito">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="text-xl font-medium">Dois aparelhos mudaram o mesmo item</h2>
        <p className="mt-1 text-sm text-[#3D5160]">
          {conflitos.length === 1 ? "Escolha qual versão vale." : `Escolha qual versão vale em cada um dos ${conflitos.length} itens.`} O envio fica parado até você decidir; nada foi apagado.
        </p>
        <ul className="mt-4 flex-1 space-y-3 overflow-y-auto">
          {conflitos.map((conflito) => (
            <li key={conflito.id} className="rounded-xl border border-[#D5DDE5] p-3">
              <div className="text-sm font-medium">{conflito.rotulo}</div>
              <div className="mt-1 grid gap-1 text-sm sm:grid-cols-2">
                <div><span className="text-[#51606c]">Neste aparelho: </span>{textoDoValor(conflito.meu, conflito)}</div>
                <div><span className="text-[#51606c]">No outro aparelho: </span>{textoDoValor(conflito.nuvem, conflito)}</div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="ui-btn ui-btn--secondary" style={{ height: 40 }} onClick={() => onEscolher(conflito, "meu")}>Manter o meu</button>
                <button type="button" className="ui-btn ui-btn--secondary" style={{ height: 40 }} onClick={() => onEscolher(conflito, "nuvem")}>Usar o do outro aparelho</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
