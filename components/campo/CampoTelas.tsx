"use client";

import { useEffect, useState } from "react";
import { LogoSymbol } from "@/components/BrandLogo";
import { NavIcon, type NavIconName } from "@/components/NavIcons";
import { RowMenu, type ItemMenu } from "@/components/ui/RowMenu";
import { prazoSugerido } from "@/lib/actionPlan";

export type TelaCampo = "inicio" | "checklist" | "correcoes" | "mais";

type Chrome = {
  tela: TelaCampo | null;
  empresa: string;
  sincronizacao: { estado: "ok" | "pendente" | "erro"; rotulo: string; onClick: () => void };
  menuModo: ItemMenu[];
  correcoesAbertas: number;
  podeRegistrar: boolean;
  onIr: (tela: TelaCampo) => void;
  onRegistrar: () => void;
};

// Cabeçalho e barra de baixo do modo Campo (celular): 4 telas + Registrar no centro.
export function CampoCabecalho({ empresa, sincronizacao, menuModo }: Pick<Chrome, "empresa" | "sincronizacao" | "menuModo">) {
  return (
    <header className="campo-head">
      <LogoSymbol size={34} />
      <div className="campo-head-text">
        <div className="campo-head-title">Ponto Certo</div>
        <div className="campo-head-sub">{empresa || "Nenhuma empresa ativa"}</div>
      </div>
      <button type="button" className={`campo-sync is-${sincronizacao.estado}`} aria-label={sincronizacao.rotulo} title={sincronizacao.rotulo} onClick={sincronizacao.onClick}>
        <span aria-hidden="true" />
      </button>
      {menuModo.length > 0 && <RowMenu itens={menuModo} rotulo="Modo de tela" />}
    </header>
  );
}

export function CampoBarra({ tela, correcoesAbertas, podeRegistrar, onIr, onRegistrar }: Pick<Chrome, "tela" | "correcoesAbertas" | "podeRegistrar" | "onIr" | "onRegistrar">) {
  const botao = (chave: TelaCampo, rotulo: string, icone: "inicio" | "checklist" | "ncs" | "mais", contador = 0) => (
    <button key={chave} type="button" className={`campo-tab${tela === chave ? " is-on" : ""}`} aria-current={tela === chave ? "page" : undefined} onClick={() => onIr(chave)}>
      <span className="campo-tab-icon">
        <NavIcon name={icone} size={22} strokeWidth={1.9} />
        {contador > 0 && <span className="campo-tab-count">{contador > 99 ? "99+" : contador}</span>}
      </span>
      <span className="campo-tab-label">{rotulo}</span>
    </button>
  );
  return (
    <nav className="campo-bar" aria-label="Navegação do modo Campo">
      {botao("inicio", "Início", "inicio")}
      {botao("checklist", "Checklist", "checklist")}
      {podeRegistrar ? (
        <button type="button" className="campo-register" onClick={onRegistrar}>
          <span className="campo-register-orb">
            <NavIcon name="registrar" size={26} strokeWidth={2.1} />
          </span>
          <span className="campo-tab-label">Registrar</span>
        </button>
      ) : (
        <span className="campo-register-gap" />
      )}
      {botao("correcoes", "Correções", "ncs", correcoesAbertas)}
      {botao("mais", "Mais", "mais")}
    </nav>
  );
}

type Visita = { id: string; rotulo: string };

export function CampoInicio({
  usuario,
  visitaAtiva,
  respondidos,
  total,
  naoConformes,
  correcoesAbertas,
  outras,
  podeRegistrar,
  onContinuar,
  onRegistrar,
  onCorrecoes,
  onAbrirVisita,
  onVisitas,
}: {
  usuario: string;
  visitaAtiva: { empresa: string; data: string } | null;
  respondidos: number;
  total: number;
  naoConformes: number;
  correcoesAbertas: number;
  outras: Visita[];
  podeRegistrar: boolean;
  onContinuar: () => void;
  onRegistrar: () => void;
  onCorrecoes: () => void;
  onAbrirVisita: (id: string) => void;
  onVisitas: () => void;
}) {
  const percentual = total > 0 ? Math.round((respondidos / total) * 100) : 0;
  return (
    <section className="campo-tela" aria-label="Início">
      <div>
        <h1 className="campo-h1">Olá{usuario ? `, ${usuario.split(" ")[0]}` : ""}</h1>
        <p className="campo-sub">{visitaAtiva ? "Sua visita em andamento" : "Nenhuma visita em andamento"}</p>
      </div>

      {visitaAtiva ? (
        <div className="campo-card campo-card--visita">
          <div className="campo-card-title">{visitaAtiva.empresa}</div>
          <div className="campo-sub">Visita de {visitaAtiva.data}</div>
          <div className="campo-progress" role="img" aria-label={`${percentual}% do checklist respondido`}>
            <span style={{ width: `${percentual}%` }} />
          </div>
          <div className="campo-sub">
            {respondidos} de {total} itens · {percentual}%
          </div>
          <button type="button" className="campo-btn campo-btn--brand" onClick={onContinuar}>
            Continuar checklist
          </button>
        </div>
      ) : (
        <div className="campo-card">
          <div className="campo-card-title">Comece por uma visita</div>
          <div className="campo-sub">Escolha uma visita para registrar e responder o checklist.</div>
          <button type="button" className="campo-btn campo-btn--brand" onClick={onVisitas}>
            Ver visitas
          </button>
        </div>
      )}

      <div className="campo-tiles">
        <button type="button" className="campo-tile campo-tile--nc" onClick={onCorrecoes}>
          <span className="campo-tile-n">{correcoesAbertas}</span>
          <span>Correções abertas</span>
        </button>
        <button type="button" className="campo-tile campo-tile--amber" onClick={onContinuar} disabled={!visitaAtiva}>
          <span className="campo-tile-n">{naoConformes}</span>
          <span>Não conformes</span>
        </button>
      </div>

      {podeRegistrar && visitaAtiva && (
        <button type="button" className="campo-btn campo-btn--orange" onClick={onRegistrar}>
          Registrar agora
        </button>
      )}

      {outras.length > 0 && (
        <div className="campo-lista">
          <div className="ui-eyebrow">Outras visitas em andamento</div>
          {outras.slice(0, 3).map((visita) => (
            <button key={visita.id} type="button" className="campo-linha" onClick={() => onAbrirVisita(visita.id)}>
              {visita.rotulo}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export type CorrecaoCampo = {
  id: string;
  numero: number;
  titulo: string;
  ambiente: string;
  gravidade: string;
  status: string;
  acaoCorretiva: string;
  responsavelAcao: string;
  prazo: string;
  /** Ação corretiva real do critério; ainda não existe nos dados, então fica vazio. */
  acaoSugerida?: string;
  marcadaFeita: boolean;
};

export function CampoCorrecoes({
  itens,
  hoje,
  podeEditar,
  podeMarcar,
  onSalvarPlano,
  onMarcarFeita,
  onDesfazerFeita,
}: {
  itens: CorrecaoCampo[];
  hoje: string;
  podeEditar: boolean;
  podeMarcar: boolean;
  onSalvarPlano: (id: string, dados: { acao: string; responsavel: string; prazo: string }) => void;
  onMarcarFeita: (id: string) => void;
  onDesfazerFeita: (id: string) => void;
}) {
  const [editando, setEditando] = useState<CorrecaoCampo | null>(null);
  const [acao, setAcao] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [prazo, setPrazo] = useState("");
  const [tocou, setTocou] = useState(false);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    if (!aviso) return;
    const tempo = window.setTimeout(() => setAviso(""), 2600);
    return () => window.clearTimeout(tempo);
  }, [aviso]);

  const abrir = (item: CorrecaoCampo) => {
    setEditando(item);
    setAcao(item.acaoCorretiva);
    setResponsavel(item.responsavelAcao);
    setPrazo(item.prazo);
    setTocou(false);
  };
  const erroAcao = tocou && !acao.trim() ? "Escreva o que será feito." : "";
  const erroPrazo = prazo && prazo < hoje ? "O prazo não pode ser anterior a hoje." : "";
  const podeSalvar = !!acao.trim() && !erroPrazo;
  const sugestaoPrazo = prazoSugerido(editando?.gravidade === "Crítica" || editando?.gravidade === "Importante" ? editando.gravidade : "Rotina", hoje);
  const abertas = itens.filter((item) => item.status !== "Resolvida");

  return (
    <section className="campo-tela" aria-label="Correções">
      <div>
        <h1 className="campo-h1">Correções</h1>
        <p className="campo-sub">{abertas.length} para fazer · toque para combinar o plano</p>
      </div>
      {itens.length === 0 && (
        <div className="campo-card">
          <div className="campo-card-title">Nenhuma correção nesta visita</div>
          <div className="campo-sub">As não conformes do checklist aparecem aqui.</div>
        </div>
      )}
      {itens.map((item) => (
        <article key={item.id} className={`campo-card campo-nc is-${item.gravidade === "Crítica" ? "nc" : item.gravidade === "Importante" ? "amber" : "na"}`}>
          <div className="campo-nc-top">
            <span className="campo-nc-n">{item.numero}</span>
            <span className="campo-chip">{item.status}</span>
            {item.marcadaFeita && <span className="campo-chip campo-chip--ok">Feita</span>}
          </div>
          <div className="campo-card-title">{item.titulo}</div>
          <div className="campo-sub">
            {item.ambiente}
            {item.prazo ? ` · prazo ${item.prazo.split("-").reverse().join("/")}` : ""}
          </div>
          <div className="campo-acoes">
            <button type="button" className="campo-btn campo-btn--soft" onClick={() => abrir(item)}>
              {item.acaoCorretiva ? "Ver plano" : "Combinar plano"}
            </button>
            {podeMarcar && item.status !== "Resolvida" && (
              <button type="button" className="campo-btn campo-btn--outline" onClick={() => (item.marcadaFeita ? onDesfazerFeita(item.id) : onMarcarFeita(item.id))}>
                {item.marcadaFeita ? "Desfazer feita" : "Marcar como feita"}
              </button>
            )}
          </div>
        </article>
      ))}

      {aviso && (
        <div className="pc-toast pc-toast--ok campo-toast" role="status">
          <span>{aviso}</span>
        </div>
      )}

      {editando && (
        <div className="campo-sheet-layer" role="dialog" aria-modal="true" aria-label="Plano de correção">
          <button type="button" className="campo-sheet-fundo" aria-label="Fechar" onClick={() => setEditando(null)} />
          <div className="campo-sheet">
            <div className="campo-sheet-body">
              <h2 className="campo-card-title">Plano da correção {editando.numero}</h2>
              <p className="campo-sub">{editando.titulo}</p>
              <label className="campo-field">
                <span className="ui-eyebrow">O que será feito (ação corretiva)</span>
                <textarea className={`ui-input${erroAcao ? " is-invalid" : ""}`} rows={3} value={acao} disabled={!podeEditar} aria-invalid={!!erroAcao} onChange={(e) => { setAcao(e.target.value); setTocou(true); }} onBlur={() => setTocou(true)} />
                {erroAcao ? <span className="campo-erro">{erroAcao}</span> : !acao.trim() && <span className="pc-field-hint" role="note">Obrigatório para salvar o plano.</span>}
                {podeEditar && editando.acaoSugerida && acao.trim() !== editando.acaoSugerida.trim() && (
                  <button type="button" className="campo-sugestao" onClick={() => setAcao(editando.acaoSugerida || "")}>
                    Ação sugerida: {editando.acaoSugerida} · toque para usar
                  </button>
                )}
              </label>
              <label className="campo-field">
                <span className="ui-eyebrow">Quem faz</span>
                <input className="ui-input" value={responsavel} disabled={!podeEditar} onChange={(e) => setResponsavel(e.target.value)} />
              </label>
              <label className="campo-field">
                <span className="ui-eyebrow">Prazo</span>
                <input className={`ui-input${erroPrazo ? " is-invalid" : ""}`} type="date" min={hoje} value={prazo} disabled={!podeEditar} aria-invalid={!!erroPrazo} onChange={(e) => setPrazo(e.target.value)} />
                {erroPrazo && <span className="campo-erro">{erroPrazo}</span>}
                {podeEditar && (
                  <button type="button" className="campo-sugestao" onClick={() => setPrazo(sugestaoPrazo.data)}>
                    Prazo sugerido: {sugestaoPrazo.dias} dias · {sugestaoPrazo.data.split("-").reverse().join("/")} · toque para usar
                  </button>
                )}
              </label>
            </div>
            <div className="campo-sheet-foot">
              <button type="button" className="campo-btn campo-btn--outline" onClick={() => setEditando(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="campo-btn campo-btn--save"
                disabled={!podeEditar || !podeSalvar}
                onClick={() => {
                  setTocou(true);
                  if (!podeSalvar) return;
                  onSalvarPlano(editando.id, { acao: acao.trim(), responsavel: responsavel.trim(), prazo });
                  setAviso("Plano salvo");
                  setEditando(null);
                }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export type CartaoMais = { id: string; rotulo: string; icone: NavIconName; tom: string; onClick: () => void };

export function CampoMais({ daVisita, gerais, onVersaoCompleta }: { daVisita: CartaoMais[]; gerais: CartaoMais[]; onVersaoCompleta: () => void }) {
  const cartao = (item: CartaoMais) => (
    <button key={item.id} type="button" className="campo-mais-card" onClick={item.onClick}>
      <span className="campo-mais-tile" style={{ background: `linear-gradient(160deg, var(--tile-${item.tom}-from), var(--tile-${item.tom}-to))` }}>
        <NavIcon name={item.icone} size={22} strokeWidth={1.9} />
      </span>
      <span className="campo-mais-label">{item.rotulo}</span>
    </button>
  );
  return (
    <section className="campo-tela campo-tela--mais" aria-label="Mais">
      <h1 className="campo-h1">Mais</h1>
      {daVisita.length > 0 && (
        <>
          <div className="ui-eyebrow">Desta visita</div>
          <div className="campo-mais-grid">{daVisita.map(cartao)}</div>
        </>
      )}
      <div className="ui-eyebrow">Geral</div>
      <div className="campo-mais-grid">{gerais.map(cartao)}</div>
      <button type="button" className="campo-btn campo-btn--brand" onClick={onVersaoCompleta}>
        Usar versão completa agora
      </button>
    </section>
  );
}
