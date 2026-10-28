"use client";

import { ROTULO_DA_PAGINA, assinaturaDaPagina, situacaoDaRevisao, textoDaRevisao, type PaginaDeCadastro } from "@/lib/revisaoDeCadastros";
import { formatarData } from "@/lib/dataLocal";
import type { Empresa } from "@/types";

type Props = {
  pagina: PaginaDeCadastro;
  /** A empresa como está SALVA (a revisão vale para o que foi gravado). */
  empresa: Empresa;
  /** Quem edita a empresa marca; os demais só leem o estado. */
  podeMarcar: boolean;
  /** Há alterações na tela que ainda não foram salvas (Ambientes e Equipamentos gravam na hora, então quase nunca). */
  naoSalvo: boolean;
  onMarcar: () => void;
  /** Alteração não salva mora em Dados (Ambientes e Equipamentos já gravam na hora): o aviso leva até lá. */
  onIrParaDados?: () => void;
};

// Estado de revisão da aba atual, em texto compacto, à direita da linha das sub-abas:
// "● Ambientes ainda não revisados · Marcar como revisado"  ou  "✓ Revisado". Mesma regra de lib/revisaoDeCadastros.ts.
export default function RevisaoCompacta({ pagina, empresa, podeMarcar, naoSalvo, onMarcar, onIrParaDados }: Props) {
  const revisao = empresa.cadastrosRevisados?.[pagina];
  const situacao = situacaoDaRevisao(revisao, assinaturaDaPagina(empresa, pagina));
  const detalhe = textoDaRevisao(revisao, situacao, formatarData);
  const rotulo = ROTULO_DA_PAGINA[pagina];
  const bloqueio = naoSalvo ? "Há alterações não salvas em Dados. Salve lá antes de marcar como revisado." : "";
  if (situacao === "em-dia") {
    return (
      <div className="cadrev cadrev--em-dia" role="status" aria-label={`Revisão de ${rotulo}: revisado. ${detalhe}`} title={detalhe}>
        <span aria-hidden="true">✓</span> Revisado
      </div>
    );
  }
  const texto = situacao === "desatualizada" ? `${rotulo} alterados depois da revisão` : `${rotulo} ainda não revisados`;
  return (
    <div className="cadrev" role="status" aria-label={`Revisão de ${rotulo}`} title={detalhe}>
      <span className="cadrev-ponto" aria-hidden="true">●</span>
      <span>{texto}</span>
      {podeMarcar && (
        <>
          <span aria-hidden="true">·</span>
          <button type="button" className="cadrev-link" aria-disabled={Boolean(bloqueio)} aria-describedby={bloqueio ? `cadrev-bloqueio-${pagina}` : undefined} onClick={bloqueio ? undefined : onMarcar}>
            Marcar como revisado
          </button>
        </>
      )}
      {bloqueio && (
        <span id={`cadrev-bloqueio-${pagina}`} className="cadrev-erro">
          {bloqueio}
          {onIrParaDados && <button type="button" className="cadrev-link" onClick={onIrParaDados}>Salvar em Dados</button>}
        </span>
      )}
    </div>
  );
}
