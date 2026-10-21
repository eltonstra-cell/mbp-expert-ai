"use client";

import { useState } from "react";
import { mostrarToast } from "@/lib/toast";
import { hojeISO } from "@/lib/popsNorma";
import { pendentesDeLeitura, type LinhaDeLeitura } from "@/lib/registrosEmpresa";

type Props = {
  popId: string;
  versao: string;
  linhas: LinhaDeLeitura[];
  /** Só quem pode registrar leitura (Administrador, RT, Gestor e Gerente) vê o botão. */
  podeRegistrar: boolean;
  onRegistrar: (popId: string, versao: string, colaboradorId: string, data: string) => void;
};

// Resumo da ficha: quem ainda não leu a versão vigente, com "Registrar leitura" na linha de cada pessoa (mesma lógica da aba Quem leu).
export default function QuemAindaNaoLeu({ popId, versao, linhas, podeRegistrar, onRegistrar }: Props) {
  const [registrando, setRegistrando] = useState<string | null>(null);
  const [data, setData] = useState(hojeISO);
  const pendentes = pendentesDeLeitura(linhas);
  const hoje = hojeISO();
  const erroData = !data ? "Informe a data da leitura." : data > hoje ? "A leitura não pode ser no futuro." : "";

  return (
    <div className="ficha-coluna ficha-leitura" id="ficha-quem-nao-leu" tabIndex={-1}>
      <div className="ficha-sub-linha">
        <h3 className="ficha-sub">Quem ainda não leu</h3>
      </div>
      {linhas.length === 0 ? (
        <p className="ficha-vazio">Nenhum colaborador ativo. Cadastre a equipe em Documentos › Pessoas.</p>
      ) : pendentes.length === 0 ? (
        <p className="ficha-vazio">Todos leram a v{versao}</p>
      ) : (
        <ul className="ficha-lista ficha-leitura-lista">
          {pendentes.map((linha) => (
            <li key={linha.colaborador.id} className="ficha-leitura-linha">
              <span>
                {linha.colaborador.nome}
                {linha.colaborador.cargo ? ` · ${linha.colaborador.cargo}` : ""}
              </span>
              {podeRegistrar && registrando !== linha.colaborador.id && (
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
              {podeRegistrar && registrando === linha.colaborador.id && (
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
                      onRegistrar(popId, versao, linha.colaborador.id, data);
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
      )}
    </div>
  );
}
