"use client";

import { useEffect } from "react";

type Props = {
  nome: string;
  email: string;
  perfil: string;
  empresas: string[];
  versao: string;
  onFechar: () => void;
};

// Dados da própria pessoa conectada, só para conferência (não edita nada).
export default function MeuPerfilModal({ nome, email, perfil, empresas, versao, onFechar }: Props) {
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  return (
    <div className="voz-revisao-camada" role="dialog" aria-modal="true" aria-label="Meu perfil">
      <button type="button" className="voz-revisao-fundo" aria-label="Fechar" onClick={onFechar} />
      <div className="voz-revisao">
        <h2 className="ui-card-title">Meu perfil</h2>
        <dl className="perfil-lista">
          <div>
            <dt className="ui-eyebrow">Nome</dt>
            <dd>{nome}</dd>
          </div>
          <div>
            <dt className="ui-eyebrow">E-mail</dt>
            <dd>{email}</dd>
          </div>
          <div>
            <dt className="ui-eyebrow">Perfil</dt>
            <dd>{perfil}</dd>
          </div>
          <div>
            <dt className="ui-eyebrow">Empresas</dt>
            <dd>{empresas.length > 0 ? empresas.join(", ") : "Nenhuma empresa atribuída"}</dd>
          </div>
          <div>
            <dt className="ui-eyebrow">Versão do aplicativo</dt>
            <dd>{versao}</dd>
          </div>
        </dl>
        <div className="voz-revisao-acoes">
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onFechar}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
