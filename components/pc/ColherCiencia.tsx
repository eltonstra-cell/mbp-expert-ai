"use client";

import { useEffect, useState } from "react";
import type { LeituraPop } from "@/types";
import type { LinhaDaEquipe } from "@/lib/cienciaPop";
import { AVISO_DA_CIENCIA } from "@/lib/cienciaPop";

type Props = {
  empresaId: string;
  popId: string;
  versao: string;
  pendentes: LinhaDaEquipe[];
  onRegistrada: (leitura: LeituraPop) => void;
  onFechar: () => void;
};

type Passo = "escolher" | "definir" | "confirmar";

// "Colher ciência": a PRÓPRIA pessoa digita o PIN no aparelho do gestor. O PIN vai ao servidor, que guarda só o hash (scrypt) e limita as tentativas.
// A tela nunca vê nem guarda o PIN depois de enviar. Finalidade e base legal: ver lib/pinCiencia.ts. Boa prática do app, não exigência da norma.
export default function ColherCiencia({ empresaId, popId, versao, pendentes, onRegistrada, onFechar }: Props) {
  const [passo, setPasso] = useState<Passo>("escolher");
  const [pessoaId, setPessoaId] = useState("");
  const [comPin, setComPin] = useState<string[] | null>(null);
  const [pin, setPin] = useState("");
  const [repetir, setRepetir] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ativo = true;
    fetch(`/api/pops/ciencia?empresaId=${encodeURIComponent(empresaId)}`, { cache: "no-store" })
      .then((resposta) => (resposta.ok ? resposta.json() : Promise.reject(new Error("falha"))))
      .then((dados: { comPin: string[] }) => ativo && setComPin(dados.comPin))
      .catch(() => ativo && setErro("Sem conexão: a ciência por PIN precisa de internet."));
    const fechar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", fechar);
    return () => {
      ativo = false;
      window.removeEventListener("keydown", fechar);
    };
  }, [empresaId, onFechar]);

  const pessoa = pendentes.find((linha) => linha.colaborador.id === pessoaId)?.colaborador;

  function escolher(id: string) {
    setPessoaId(id);
    setPin("");
    setRepetir("");
    setErro("");
    setPasso(comPin?.includes(id) ? "confirmar" : "definir");
  }

  async function enviar(acao: "definir-pin" | "confirmar") {
    setEnviando(true);
    setErro("");
    try {
      if (acao === "definir-pin") {
        if (!/^\d{4,6}$/.test(pin)) throw new Error("O PIN tem de 4 a 6 números.");
        if (pin !== repetir) throw new Error("Os dois PINs não são iguais.");
        const definido = await fetch("/api/pops/ciencia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao, empresaId, colaboradorId: pessoaId, pin }) });
        const dados = await definido.json().catch(() => ({}));
        if (!definido.ok) throw new Error(dados.error || "Não foi possível definir o PIN.");
        setComPin((atual) => [...(atual || []), pessoaId]);
        setPin("");
        setRepetir("");
        setPasso("confirmar");
        return;
      }
      const resposta = await fetch("/api/pops/ciencia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao, empresaId, colaboradorId: pessoaId, popId, pin }) });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(dados.error || "Não foi possível registrar a ciência.");
      setPin("");
      onRegistrada(dados.leitura as LeituraPop);
      onFechar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível concluir.");
      setPin("");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pc-modal-layer" role="presentation">
      <div className="pc-modal-backdrop" onClick={onFechar} />
      <section className="pc-modal" role="dialog" aria-modal="true" aria-label="Colher ciência">
        <h2 className="pc-modal-title">Colher ciência · v{versao}</h2>
        <p className="ui-row-sub">{AVISO_DA_CIENCIA}</p>
        {passo === "escolher" && (
          <>
            {pendentes.length === 0 ? (
              <p className="ui-row-sub">Todos já confirmaram esta versão.</p>
            ) : (
              <ul className="rz-ciencia-escolha">
                {pendentes.map((linha) => (
                  <li key={linha.colaborador.id}>
                    <button type="button" className="rz-btn rz-btn--sec rz-btn--larga" disabled={comPin === null && !erro} onClick={() => escolher(linha.colaborador.id)}>
                      {linha.colaborador.nome}
                      {linha.colaborador.cargo ? ` · ${linha.colaborador.cargo}` : ""}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {passo === "definir" && pessoa && (
          <div className="rz-ciencia-form">
            <p>
              <strong>{pessoa.nome}</strong>, crie o seu PIN (4 a 6 números). Só você deve saber.
            </p>
            <label className="pc-field">
              <span className="ui-eyebrow">PIN</span>
              <input className="ui-input" type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pin} onChange={(evento) => setPin(evento.target.value.replace(/\D/g, ""))} />
            </label>
            <label className="pc-field">
              <span className="ui-eyebrow">Repita o PIN</span>
              <input className="ui-input" type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={repetir} onChange={(evento) => setRepetir(evento.target.value.replace(/\D/g, ""))} />
            </label>
            <button type="button" className="rz-btn rz-btn--pri" disabled={enviando || pin.length < 4 || repetir.length < 4} onClick={() => enviar("definir-pin")}>
              Salvar PIN
            </button>
          </div>
        )}
        {passo === "confirmar" && pessoa && (
          <div className="rz-ciencia-form">
            <p>
              <strong>{pessoa.nome}</strong>, digite o seu PIN para confirmar que leu o POP.
            </p>
            <label className="pc-field">
              <span className="ui-eyebrow">PIN</span>
              <input className="ui-input" type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pin} onChange={(evento) => setPin(evento.target.value.replace(/\D/g, ""))} autoFocus />
            </label>
            <button type="button" className="rz-btn rz-btn--pri" disabled={enviando || pin.length < 4} onClick={() => enviar("confirmar")}>
              Confirmar ciência
            </button>
          </div>
        )}
        {erro && (
          <p className="ui-field-error" role="alert">
            {erro}
          </p>
        )}
        <div className="pc-modal-actions">
          {passo !== "escolher" && (
            <button type="button" className="rz-btn rz-btn--sec" onClick={() => setPasso("escolher")}>
              Voltar
            </button>
          )}
          <button type="button" className="rz-btn rz-btn--sec" onClick={onFechar}>
            Fechar
          </button>
        </div>
      </section>
    </div>
  );
}
