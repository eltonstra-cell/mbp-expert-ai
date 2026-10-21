"use client";

import { useMemo, useState } from "react";
import { Pill } from "@/components/ui/Pill";
import { useRegistrosDaEmpresa } from "@/components/RegistrosEmpresaContext";
import { mostrarToast } from "@/lib/toast";
import { hojeISO, popVigente } from "@/lib/popsNorma";
import { leituraDaVersao } from "@/lib/registrosEmpresa";
import type { ProcedimentoOperacionalPadronizado } from "@/types";

function dataBr(iso?: string) {
  if (!iso) return "";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

// Aba "Quem leu" da ficha do POP: quem já leu a versão vigente. Nova versão do POP começa com todos pendentes.
// A data da leitura faz parte do formulário de "Registrar leitura" (aberto na própria linha da pessoa), não fica solta.
export default function PcTreinamentoDoPop({ pop }: { pop: ProcedimentoOperacionalPadronizado }) {
  const contexto = useRegistrosDaEmpresa();
  const [registrando, setRegistrando] = useState<string | null>(null);
  const [data, setData] = useState(hojeISO);
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
    return <p className="ui-row-sub">Nenhum colaborador ativo. Cadastre a equipe em Documentos › Pessoas.</p>;
  }

  return (
    <div className="pop-treino">
      <div className="pop-treino-topo">
        <span className="pop-registros-titulo">
          {leitura.lidos} de {leitura.total} leram a v{vigente.versao}
        </span>
      </div>
      <ul className="pop-registro-lista pop-treino-rolagem">
        {leitura.linhas.map((linha) => (
          <li key={linha.colaborador.id} className="pop-treino-linha">
            <span className="pop-treino-nome">
              {linha.colaborador.nome}
              <span className="ui-row-sub"> · {linha.colaborador.cargo}</span>
            </span>
            {linha.lido ? <Pill tom="ok">Lido em {dataBr(linha.data)}</Pill> : <Pill tom="pend">Pendente</Pill>}
            {!linha.lido && registrando !== linha.colaborador.id && (
              <button
                type="button"
                className="ui-btn ui-btn--secondary ui-btn--small"
                onClick={() => {
                  setData(hoje);
                  setRegistrando(linha.colaborador.id);
                }}
              >
                Registrar leitura
              </button>
            )}
            {!linha.lido && registrando === linha.colaborador.id && (
              <span className="pop-treino-form">
                <label className="pc-field pop-treino-data">
                  <span className="ui-eyebrow">Data da leitura</span>
                  <input type="date" className={`ui-input${erroData ? " is-invalid" : ""}`} value={data} max={hoje} onChange={(evento) => setData(evento.target.value)} aria-invalid={Boolean(erroData)} />
                  {erroData && <span className="ui-field-error">{erroData}</span>}
                </label>
                <button
                  type="button"
                  className="ui-btn ui-btn--save ui-btn--small"
                  disabled={Boolean(erroData)}
                  onClick={() => {
                    contexto.registrarLeitura(pop.id, vigente.versao, linha.colaborador.id, data);
                    setRegistrando(null);
                    mostrarToast("Salvo");
                  }}
                >
                  Salvar leitura
                </button>
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => setRegistrando(null)}>
                  Cancelar
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
