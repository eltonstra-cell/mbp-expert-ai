"use client";

import { useMemo, useState } from "react";
import { Pill } from "@/components/ui/Pill";
import { useRegistrosDaEmpresa } from "@/components/RegistrosEmpresaContext";
import { hojeISO, popVigente } from "@/lib/popsNorma";
import { leituraDaVersao } from "@/lib/registrosEmpresa";
import type { ProcedimentoOperacionalPadronizado } from "@/types";

const POR_PAGINA = 5;

function dataBr(iso?: string) {
  if (!iso) return "";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

// Aba "Treinamento" do POP: quem já leu a versão vigente. Nova versão do POP começa com todos pendentes.
export default function PcTreinamentoDoPop({ pop }: { pop: ProcedimentoOperacionalPadronizado }) {
  const contexto = useRegistrosDaEmpresa();
  const [data, setData] = useState(hojeISO);
  const [pagina, setPagina] = useState(0);
  const vigente = popVigente(pop);
  const leitura = useMemo(
    () => (vigente && contexto ? leituraDaVersao(pop.id, vigente.versao, contexto.colaboradores, contexto.leituras) : null),
    [vigente, contexto, pop.id]
  );
  if (!contexto) return null;

  const hoje = hojeISO();
  const erroData = !data ? "Informe a data da leitura." : data > hoje ? "A leitura não pode ser no futuro." : "";

  if (!vigente) return <p className="ui-row-sub">O treinamento começa quando o POP tiver uma versão aprovada.</p>;
  if (!leitura || leitura.total === 0) {
    return <p className="ui-row-sub">Nenhum colaborador ativo. Cadastre a equipe em Pessoas (botão na tela de POPs e documentos).</p>;
  }

  const totalPaginas = Math.max(1, Math.ceil(leitura.linhas.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);

  return (
    <div className="pop-treino">
      <div className="pop-treino-topo">
        <span className="pop-registros-titulo">
          {leitura.lidos} de {leitura.total} leram a v{vigente.versao}
        </span>
        <label className="pc-field pop-treino-data">
          <span className="ui-eyebrow">Data da leitura</span>
          <input type="date" className={`ui-input${erroData ? " is-invalid" : ""}`} value={data} max={hoje} onChange={(evento) => setData(evento.target.value)} aria-invalid={Boolean(erroData)} />
          {erroData && <span className="ui-field-error">{erroData}</span>}
        </label>
      </div>
      <ul className="pop-registro-lista">
        {leitura.linhas.slice(paginaAtual * POR_PAGINA, (paginaAtual + 1) * POR_PAGINA).map((linha) => (
          <li key={linha.colaborador.id} className="pop-treino-linha">
            <span className="pop-treino-nome">
              {linha.colaborador.nome}
              <span className="ui-row-sub"> · {linha.colaborador.cargo}</span>
            </span>
            {linha.lido ? <Pill tom="ok">Lido em {dataBr(linha.data)}</Pill> : <Pill tom="pend">Pendente</Pill>}
            {!linha.lido && (
              <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" disabled={Boolean(erroData)} onClick={() => contexto.registrarLeitura(pop.id, vigente.versao, linha.colaborador.id, data)}>
                Registrar leitura
              </button>
            )}
          </li>
        ))}
      </ul>
      {totalPaginas > 1 && (
        <div className="pop-passos-pagina" role="group" aria-label="Páginas dos colaboradores">
          <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" disabled={paginaAtual === 0} onClick={() => setPagina(paginaAtual - 1)}>
            ‹ Anteriores
          </button>
          <span className="ui-row-sub">
            {paginaAtual + 1} de {totalPaginas}
          </span>
          <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" disabled={paginaAtual >= totalPaginas - 1} onClick={() => setPagina(paginaAtual + 1)}>
            Próximos ›
          </button>
        </div>
      )}
    </div>
  );
}
