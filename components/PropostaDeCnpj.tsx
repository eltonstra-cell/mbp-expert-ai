"use client";

import type { PropostaDeCnpj } from "@/lib/cnpjConsulta";

type Props = {
  proposta: PropostaDeCnpj;
  /** Campos que já estão preenchidos no formulário e mudariam ao usar a proposta (para o RT saber o que será trocado). */
  vaiTrocar?: string[];
  onUsar: () => void;
  onIgnorar: () => void;
};

const linha = (rotulo: string, valor: string) =>
  valor ? (
    <div className="cnpj-prop-linha">
      <span className="cnpj-prop-rotulo">{rotulo}</span>
      <span className="cnpj-prop-valor">{valor}</span>
    </div>
  ) : null;

// A consulta de CNPJ chega como PROPOSTA: nada entra no cadastro até o RT tocar em "Usar estes dados".
export default function PropostaDeCnpjPainel({ proposta, vaiTrocar = [], onUsar, onIgnorar }: Props) {
  const endereco = [proposta.logradouro, proposta.numero, proposta.complemento, proposta.bairro].filter(Boolean).join(", ");
  const cidade = [proposta.municipio, proposta.uf].filter(Boolean).join(" / ");
  return (
    <section className="cnpj-proposta md:col-span-2" aria-label="Dados encontrados para este CNPJ">
      <div className="cnpj-prop-topo">
        <strong className="cnpj-prop-titulo">Dados encontrados para este CNPJ</strong>
        <span className="cnpj-prop-selo">sugerido · {proposta.fonte}</span>
      </div>
      {proposta.avisos.map((aviso) => (
        <p key={aviso} className="cnpj-prop-aviso" role="status">{aviso}</p>
      ))}
      <div className="cnpj-prop-grade">
        {linha("Razão social", proposta.razaoSocial)}
        {linha("Nome fantasia", proposta.nomeFantasia)}
        {linha("Situação", proposta.situacao)}
        {linha("Endereço", [endereco, proposta.cep, cidade].filter(Boolean).join(" · "))}
        {linha("CNAE principal", [proposta.cnaePrincipal.codigo, proposta.cnaePrincipal.descricao].filter(Boolean).join(" · "))}
        {proposta.cnaesSecundarios.length > 0 && linha("CNAEs secundários", `${proposta.cnaesSecundarios.length} · ${proposta.cnaesSecundarios.slice(0, 3).map((c) => c.codigo).join(", ")}${proposta.cnaesSecundarios.length > 3 ? "…" : ""}`)}
      </div>
      {vaiTrocar.length > 0 && <p className="cnpj-prop-troca">Vai trocar o que já está preenchido em: {vaiTrocar.join(", ")}.</p>}
      <div className="cnpj-prop-acoes">
        <button type="button" className="ui-btn ui-btn--primary" onClick={onUsar}>Usar estes dados</button>
        <button type="button" className="ui-btn ui-btn--secondary" onClick={onIgnorar}>Ignorar</button>
      </div>
    </section>
  );
}
