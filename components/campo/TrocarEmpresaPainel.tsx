"use client";

import { useEffect } from "react";
import type { CSSProperties } from "react";
import { iniciaisDaEmpresa } from "@/lib/navigation";
import type { OpcaoDeEmpresa } from "@/lib/trocarEmpresa";

// Painel inferior do Campo para escolher a empresa ativa. Não faz cadastro nem edição de empresas.
export default function TrocarEmpresaPainel({
  opcoes,
  corDe,
  onEscolher,
  onFechar,
}: {
  opcoes: OpcaoDeEmpresa[];
  /** Cor da empresa (a mesma do avatar da lista de Empresas). */
  corDe?: (id: string) => string;
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
                    <span className="campo-empresa-nome">
                      <span className="emp-avatar-mini" style={{ "--emp-cor": corDe ? corDe(opcao.id) : "#4A5D73" } as CSSProperties} aria-hidden="true">
                        {iniciaisDaEmpresa(opcao.nome)}
                      </span>
                      <span>{opcao.nome}</span>
                    </span>
                    {opcao.ativa && <span className="campo-empresa-ativa">Empresa ativa</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="campo-sheet-foot">
          <button type="button" className="campo-btn campo-btn--cinza" onClick={onFechar}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
