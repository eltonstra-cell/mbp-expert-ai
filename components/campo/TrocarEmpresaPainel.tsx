"use client";

import { useEffect } from "react";
import type { OpcaoDeEmpresa } from "@/lib/trocarEmpresa";

// Painel inferior do Campo para escolher a empresa ativa. Não faz cadastro nem edição de empresas.
export default function TrocarEmpresaPainel({
  opcoes,
  onEscolher,
  onFechar,
}: {
  opcoes: OpcaoDeEmpresa[];
  onEscolher: (id: string) => void;
  onFechar: () => void;
}) {
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  return (
    <div className="campo-sheet-layer" role="dialog" aria-modal="true" aria-label="Trocar empresa">
      <button type="button" className="campo-sheet-fundo" aria-label="Fechar" onClick={onFechar} />
      <div className="campo-sheet">
        <div className="campo-sheet-body">
          <h2 className="campo-h1">Trocar empresa</h2>
          {opcoes.length === 0 ? (
            <p className="campo-sub">Nenhuma empresa liberada para o seu acesso.</p>
          ) : (
            <ul className="campo-lista" role="listbox" aria-label="Empresas">
              {opcoes.map((opcao) => (
                <li key={opcao.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={opcao.ativa}
                    className={`campo-linha campo-empresa-opcao${opcao.ativa ? " is-ativa" : ""}`}
                    onClick={() => onEscolher(opcao.id)}
                  >
                    <span>{opcao.nome}</span>
                    {opcao.ativa && <span className="campo-empresa-ativa">Empresa ativa</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="campo-sheet-foot">
          <button type="button" className="campo-btn campo-btn--outline" onClick={onFechar}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
