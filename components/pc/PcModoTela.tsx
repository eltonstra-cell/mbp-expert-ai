"use client";

import { useState } from "react";
import { ROTULO_DE_USO, ROTULO_DO_MODO, descreverAparelho, type ModoTela, type PreferenciaDeTela } from "@/lib/screenMode";

type Props = {
  preferencia: PreferenciaDeTela;
  modoEmUso: ModoTela;
  modoRecomendado: ModoTela;
  larguraDoAparelho: number;
  onSalvar: (preferencia: PreferenciaDeTela) => void;
  onCancelar: () => void;
};

const CARTOES: { modo: ModoTela; subtitulo: string; itens: string[] }[] = [
  { modo: "campo", subtitulo: "Para o celular durante a visita", itens: ["5 abas: Início, Checklist, Registrar, Correções, Mais", "Um item do checklist por vez", "Câmera e microfone em destaque"] },
  { modo: "equilibrado", subtitulo: "Para o tablet em visita ou demonstração", itens: ["Menu de ícones de 108 px", "Lista e detalhe lado a lado", "Relatório com conferência"] },
  { modo: "completo", subtitulo: "Para o PC e para demonstrar tudo", itens: ["Menu lateral completo", "Cadastros, Acessos e Administração", "Painéis com todos os indicadores"] },
];

function Miniatura({ modo }: { modo: ModoTela }) {
  return (
    <span className={`pc-modo-mini pc-modo-mini--${modo}`} aria-hidden="true">
      {modo === "campo" && (
        <span className="mini-celular">
          <i className="mini-topo" />
          <i className="mini-bloco" />
          <i className="mini-bloco mini-bloco--claro" />
          <i className="mini-botao" />
        </span>
      )}
      {modo === "equilibrado" && (
        <span className="mini-tablet">
          <i className="mini-trilho" />
          <i className="mini-coluna" />
          <i className="mini-coluna" />
        </span>
      )}
      {modo === "completo" && (
        <span className="mini-pc">
          <i className="mini-menu" />
          <span className="mini-grade">
            <i />
            <i />
            <i />
          </span>
        </span>
      )}
    </span>
  );
}

export default function PcModoTela({ preferencia, modoEmUso, modoRecomendado, larguraDoAparelho, onSalvar, onCancelar }: Props) {
  const [rascunho, setRascunho] = useState<PreferenciaDeTela>(preferencia);
  const modoSelecionado: ModoTela = rascunho.automatico ? modoRecomendado : rascunho.modo;

  return (
    <section className="ui-screen" aria-label="Modo de tela">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">Modo de tela</h1>
          <p className="ui-subtitle">Escolha como o Ponto Certo aparece neste aparelho</p>
        </div>
      </div>

      <div className="ui-card pc-modo-auto">
        <button
          type="button"
          role="switch"
          aria-checked={rascunho.automatico}
          aria-label="Escolher automaticamente pelo aparelho"
          className={`pc-switch${rascunho.automatico ? " is-on" : ""}`}
          onClick={() => setRascunho((atual) => ({ ...atual, automatico: !atual.automatico }))}
        >
          <i />
        </button>
        <div className="pc-modo-auto-text">
          <div className="pc-modo-auto-title">Escolher automaticamente pelo aparelho</div>
          <div className="ui-row-sub">
            {rascunho.automatico
              ? "Ligado: o celular usa Campo, o tablet Equilibrado e o PC Completo."
              : "Desligado: você definiu o modo manualmente. Ligue para voltar a celular em Campo, tablet em Equilibrado e PC em Completo."}
          </div>
        </div>
        <span className="pc-modo-device">
          Este aparelho: {descreverAparelho(larguraDoAparelho)} {larguraDoAparelho}px
        </span>
      </div>

      <div className="pc-modo-body">
      <div className="pc-modo-cards" role="radiogroup" aria-label="Modo de tela">
        {CARTOES.map((cartao) => {
          const selecionado = modoSelecionado === cartao.modo;
          return (
            <button
              key={cartao.modo}
              type="button"
              role="radio"
              aria-checked={selecionado}
              className={`pc-modo-card${selecionado ? " is-on" : ""}`}
              onClick={() => setRascunho((atual) => ({ ...atual, automatico: false, modo: cartao.modo }))}
            >
              <span className={`pc-modo-radio${selecionado ? " is-on" : ""}`} aria-hidden="true">
                {selecionado ? "✓" : ""}
              </span>
              <Miniatura modo={cartao.modo} />
              <span className="pc-modo-card-title">{ROTULO_DO_MODO[cartao.modo]}</span>
              <span className="pc-modo-card-sub">{cartao.subtitulo}</span>
              <ul className="pc-modo-list">
                {cartao.itens.map((item) => (
                  <li key={item}>✓ {item}</li>
                ))}
              </ul>
              <span className="pc-modo-tags">
                {modoRecomendado === cartao.modo && <span className="pc-pill-mini">Recomendado para este aparelho</span>}
                {modoEmUso === cartao.modo && (
                  <span className="pc-pill-mini pc-pill-mini--ok">{preferencia.automatico ? "Em uso" : "Em uso, escolhido por você"}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="pc-modo-bottom">
        <div className="ui-card pc-modo-name">
          <h2 className="ui-card-title">Este aparelho</h2>
          <label className="pc-plan-block">
            <span className="ui-eyebrow">Nome do aparelho</span>
            <input
              className="ui-input"
              value={rascunho.nome}
              maxLength={40}
              placeholder="Ex.: Tablet do Élton"
              onChange={(evento) => setRascunho((atual) => ({ ...atual, nome: evento.target.value }))}
            />
          </label>
          <p className="ui-row-sub">
            A escolha vale só para este aparelho e fica salva nele. O celular e o PC continuam no modo deles. Dados da visita não mudam entre os modos.
          </p>
        </div>
        <div className="ui-card pc-modo-quick">
          <h2 className="ui-card-title">Troca rápida</h2>
          <p className="ui-row-sub">No menu ⋯ do topo, em qualquer tela:</p>
          <ul className="pc-modo-quick-list">
            {(Object.keys(ROTULO_DO_MODO) as ModoTela[]).map((modo) => (
              <li key={modo} className={modoSelecionado === modo ? "is-on" : ""}>
                <span className={`pc-modo-radio${modoSelecionado === modo ? " is-on" : ""}`} aria-hidden="true" />
                {ROTULO_DE_USO[modo]}
              </li>
            ))}
          </ul>
          <span className="pc-link-btn">Voltar ao automático</span>
        </div>
      </div>

      </div>

      <div className="ui-footer">
        <span className="ui-row-sub">A mudança vale na hora e não perde nada do que está aberto.</span>
        <div className="ui-footer-actions">
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="button" className="ui-btn ui-btn--save" onClick={() => onSalvar(rascunho)}>
            Salvar
          </button>
        </div>
      </div>
    </section>
  );
}
