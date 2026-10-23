"use client";

import { ROTULO_DA_PAGINA, assinaturaDaPagina, situacaoDaRevisao, textoDaRevisao, type PaginaDeCadastro } from "@/lib/revisaoDeCadastros";
import { formatarData } from "@/lib/dataLocal";
import type { Empresa } from "@/types";

type Props = {
  pagina: PaginaDeCadastro;
  /** A empresa como está SALVA (a revisão vale para o que foi gravado, não para o que está na tela). */
  empresa: Empresa;
  /** Administrador e RT: os mesmos que enxergam a página. */
  podeMarcar: boolean;
  /** Há alterações na tela que ainda não foram salvas. */
  naoSalvo: boolean;
  onMarcar: () => void;
};

// Selo "Revisado por …" de uma página de Cadastros, com o botão para marcar. Alterou depois, volta a pedir revisão.
export default function RevisaoDaPagina({ pagina, empresa, podeMarcar, naoSalvo, onMarcar }: Props) {
  const revisao = empresa.cadastrosRevisados?.[pagina];
  const situacao = situacaoDaRevisao(revisao, assinaturaDaPagina(empresa, pagina));
  const texto = textoDaRevisao(revisao, situacao, formatarData);
  const motivoDoBloqueio = naoSalvo ? "Salve as alterações antes de marcar como revisado." : "";
  return (
    <div className={`rev-pagina rev-pagina--${situacao}`} role="status" aria-label={`Revisão de ${ROTULO_DA_PAGINA[pagina]}`}>
      <span className="rev-texto">{situacao === "em-dia" ? "✓ " : ""}{texto}</span>
      {podeMarcar && situacao !== "em-dia" && (
        <span className="rev-acao">
          <button type="button" className="ui-btn ui-btn--secondary" aria-disabled={Boolean(motivoDoBloqueio)} onClick={motivoDoBloqueio ? undefined : onMarcar}>
            Marcar como revisado
          </button>
          {motivoDoBloqueio && <span className="ui-field-error">{motivoDoBloqueio}</span>}
        </span>
      )}
    </div>
  );
}
