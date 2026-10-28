"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { nomeCurtoDoSetor } from "@/lib/tiposDeEstabelecimento";
import { quantidade } from "@/lib/plural";
import type { EquipamentoDeOrigem } from "@/lib/copiaEquipamentos";

type Props = {
  destinoId: string;
  /** Setores marcados na empresa de destino: a cópia só entra nos MESMOS setores. */
  setoresDoDestino: string[];
  onCopiar: (itens: EquipamentoDeOrigem[], setoresEscolhidos: string[]) => void;
  onFechar: () => void;
};

type Origem = { id: string; nome: string };

async function mensagemDoErro(resposta: Response): Promise<string> {
  try {
    const corpo = (await resposta.json()) as { error?: string };
    if (corpo?.error) return corpo.error;
  } catch {
    /* sem corpo legível */
  }
  return "Não foi possível consultar as empresas agora. Confira a conexão e tente de novo.";
}

// A lista de empresas e os equipamentos vêm SEMPRE do servidor (rota /api/empresas/equipamentos-origem), que confere a sessão,
// a permissão no destino, o acesso à origem e a revisão de Ambientes e Equipamentos. A tela só mostra o que a rota devolve.
export default function CopiarDeOutraEmpresa({ destinoId, setoresDoDestino, onCopiar, onFechar }: Props) {
  const [montado, setMontado] = useState(false);
  const [origens, setOrigens] = useState<Origem[] | null>(null);
  const [erro, setErro] = useState("");
  const [origemId, setOrigemId] = useState("");
  const [itens, setItens] = useState<EquipamentoDeOrigem[] | null>(null);
  const [lendo, setLendo] = useState(false);
  const [escolhidos, setEscolhidos] = useState<string[]>([]);
  const janelaRef = useRef<HTMLElement | null>(null);
  const fecharRef = useRef(onFechar);
  fecharRef.current = onFechar;

  useEffect(() => {
    setMontado(true);
    const anterior = document.activeElement as HTMLElement | null;
    return () => anterior?.focus?.();
  }, []);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const resposta = await fetch(`/api/empresas/equipamentos-origem?destino=${encodeURIComponent(destinoId)}`, { cache: "no-store" });
        if (!resposta.ok) throw new Error(await mensagemDoErro(resposta));
        const corpo = (await resposta.json()) as { origens?: Origem[] };
        if (!cancelado) setOrigens(Array.isArray(corpo.origens) ? corpo.origens : []);
      } catch (falha) {
        if (!cancelado) {
          setErro(falha instanceof Error && falha.message ? falha.message : "Não foi possível consultar as empresas agora.");
          setOrigens([]);
        }
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [destinoId]);

  useEffect(() => {
    if (!montado) return;
    janelaRef.current?.querySelector<HTMLElement>("input, button")?.focus();
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        fecharRef.current();
      } else if (evento.key === "Tab" && janelaRef.current) {
        // O Tab cicla dentro da janela (aria-modal): nunca sai para a página de trás.
        const focaveis = Array.from(janelaRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'));
        if (focaveis.length === 0) {
          evento.preventDefault();
          return;
        }
        const primeiro = focaveis[0];
        const ultimo = focaveis[focaveis.length - 1];
        const ativo = document.activeElement as HTMLElement | null;
        const dentro = ativo ? janelaRef.current.contains(ativo) : false;
        if (!dentro || (evento.shiftKey && ativo === primeiro)) {
          evento.preventDefault();
          (evento.shiftKey ? ultimo : primeiro).focus();
        } else if (!evento.shiftKey && ativo === ultimo) {
          evento.preventDefault();
          primeiro.focus();
        }
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [montado]);

  async function escolherOrigem() {
    if (!origemId) return;
    setLendo(true);
    setErro("");
    try {
      const resposta = await fetch("/api/empresas/equipamentos-origem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ destino: destinoId, origem: origemId }),
      });
      if (!resposta.ok) throw new Error(await mensagemDoErro(resposta));
      const corpo = (await resposta.json()) as { equipamentos?: EquipamentoDeOrigem[] };
      const lista = Array.isArray(corpo.equipamentos) ? corpo.equipamentos : [];
      setItens(lista);
      setEscolhidos(setoresDoDestino.filter((setor) => lista.some((item) => item.setor === setor)));
    } catch (falha) {
      setErro(falha instanceof Error && falha.message ? falha.message : "Não foi possível ler os equipamentos agora.");
    } finally {
      setLendo(false);
    }
  }

  const porSetor = (itens || []).reduce<Record<string, number>>((mapa, item) => ({ ...mapa, [item.setor]: (mapa[item.setor] || 0) + 1 }), {});
  const setoresDaOrigem = Object.keys(porSetor);
  const copiaveis = setoresDaOrigem.filter((setor) => setoresDoDestino.includes(setor));
  const foraDoDestino = setoresDaOrigem.filter((setor) => !setoresDoDestino.includes(setor));
  const total = escolhidos.reduce((soma, setor) => soma + (porSetor[setor] || 0), 0);

  const janela = (
    <div className="esc-camada" role="presentation">
      <div className="esc-fundo" onClick={onFechar} />
      <section ref={janelaRef} className="esc-janela cadest-copiar" role="dialog" aria-modal="true" aria-labelledby="cadest-copiar-titulo">
        <header className="esc-cabeca">
          <h2 id="cadest-copiar-titulo" className="esc-titulo">Copiar de outra empresa</h2>
          <p className="esc-apoio">{itens ? "Escolha os setores a copiar. Os equipamentos entram nos mesmos setores desta empresa." : "Só aparecem empresas com Ambientes e Equipamentos revisados."}</p>
        </header>
        <div className="esc-corpo">
          {origens === null && <p className="cadest-dica" role="status">Consultando as empresas…</p>}
          {erro && <p className="cadest-erro" role="alert">{erro}</p>}
          {!itens && origens !== null && origens.length === 0 && !erro && <p className="cadest-vazio">Nenhuma empresa com Ambientes e Equipamentos revisados.</p>}
          {!itens && origens && origens.length > 0 && (
            <fieldset className="cadest-copiar-lista">
              <legend className="sr-only">Empresa de origem</legend>
              {origens.map((origem) => (
                <label key={origem.id} className={`cadest-copiar-opcao${origemId === origem.id ? " is-sel" : ""}`}>
                  <input type="radio" name="origem-da-copia" checked={origemId === origem.id} onChange={() => setOrigemId(origem.id)} />
                  <span>{origem.nome}</span>
                </label>
              ))}
            </fieldset>
          )}
          {itens && (
            <fieldset className="cadest-copiar-lista">
              <legend className="sr-only">Setores a copiar</legend>
              {copiaveis.length === 0 && <p className="cadest-vazio">Nenhum equipamento da origem está em setor marcado nesta empresa.</p>}
              {copiaveis.map((setor) => (
                <label key={setor} className="cadest-copiar-opcao">
                  <input type="checkbox" checked={escolhidos.includes(setor)} onChange={() => setEscolhidos((atuais) => (atuais.includes(setor) ? atuais.filter((item) => item !== setor) : [...atuais, setor]))} />
                  <span>{nomeCurtoDoSetor(setor)} · {quantidade(porSetor[setor], "item", "itens")}</span>
                </label>
              ))}
              {foraDoDestino.length > 0 && <p className="cadest-dica">Não marcados nesta empresa (não serão copiados): {foraDoDestino.map(nomeCurtoDoSetor).join(" · ")}</p>}
            </fieldset>
          )}
        </div>
        <footer className="esc-rodape">
          <span className="esc-contador" role="status">{itens ? quantidade(total, "item", "itens") : ""}</span>
          <div className="esc-rodape-botoes">
            <button type="button" className="cadest-btn" onClick={onFechar}>Cancelar</button>
            {!itens ? (
              <button type="button" className="cadest-btn cadest-btn--azul" disabled={!origemId || lendo} onClick={() => void escolherOrigem()}>{lendo ? "Lendo…" : "Continuar"}</button>
            ) : (
              <button type="button" className="cadest-btn cadest-btn--azul" disabled={total === 0} onClick={() => { onCopiar(itens, escolhidos); onFechar(); }}>
                Copiar {quantidade(total, "item", "itens")}
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
  return montado ? createPortal(janela, document.body) : null;
}
