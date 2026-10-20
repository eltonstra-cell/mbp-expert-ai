"use client";

import { useRef, useState, type CSSProperties } from "react";
import FieldVoiceTools from "@/components/FieldVoiceTools";
import { LoteJanela, type CorrecaoItem } from "@/components/pc/PcCorrecoes";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { NavIcon, type NavIconName } from "@/components/NavIcons";
import { RowMenu, type ItemMenu } from "@/components/ui/RowMenu";
import { contarEtapas, etapaDaCorrecao, ordenarCorrecoes, prazoSugerido, validarPlano, type EtapaCorrecao, type GravidadeNc } from "@/lib/actionPlan";
import { NOME_DA_GRAVIDADE, linhaDaCorrecao, mensagemDeFaltas, primeiroCampoComProblema, type CampoDoPlano } from "@/lib/correcaoRotulos";

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
export function CampoCabecalho({
  empresa,
  empresaCor = "#4A5D73",
  empresaIniciais = "",
  sincronizacao,
  menuModo,
  onTrocarEmpresa,
}: Pick<Chrome, "empresa" | "sincronizacao" | "menuModo"> & { empresaCor?: string; empresaIniciais?: string; onTrocarEmpresa?: () => void }) {
  return (
    <header className="campo-head">
      <div className="emp-ativa" style={{ "--emp-cor": empresaCor } as CSSProperties}>
        <span className="emp-ativa-avatar" aria-hidden="true">
          {empresaIniciais}
        </span>
        <button type="button" className="emp-ativa-caixa" aria-label={`Trocar empresa. Empresa ativa: ${empresa || "nenhuma"}`} onClick={onTrocarEmpresa} disabled={!onTrocarEmpresa}>
          <span className="emp-ativa-selo">Empresa ativa</span>
          <span className="emp-ativa-nome">{empresa || "Nenhuma empresa ativa"}</span>
          <span className="emp-ativa-seta" aria-hidden="true">▾</span>
        </button>
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
  empresa,
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
  onIniciar,
  proxima,
  onProxima,
  continuarDetalhe,
}: {
  usuario: string;
  empresa?: string;
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
  onIniciar?: () => void;
  /** Próxima pendência da visita (uma por vez): checklist, correções ou relatório. */
  proxima?: { titulo: string; detalhe: string } | null;
  onProxima?: () => void;
  /** Texto pequeno do "Continuar checklist", ex.: "48 itens sem resposta". */
  continuarDetalhe?: string;
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
        </div>
      ) : (
        <div className="campo-card">
          <div className="campo-card-title">{empresa || "Nenhuma empresa ativa"}</div>
          <div className="campo-sub">Esta empresa não tem visita aberta. Inicie uma ou veja as visitas anteriores.</div>
          {onIniciar && (
            <button type="button" className="campo-btn campo-btn--brand" onClick={onIniciar}>
              Iniciar visita
            </button>
          )}
          <button type="button" className="campo-btn campo-btn--outline" onClick={onVisitas}>
            Ver visitas
          </button>
        </div>
      )}

      {visitaAtiva && (
        <div className="campo-acoes-inicio">
          <button type="button" className="campo-btn campo-btn--brand" onClick={onContinuar}>
            Continuar checklist
            {continuarDetalhe && <span className="campo-btn-detalhe">{continuarDetalhe}</span>}
          </button>
          {podeRegistrar && (
            <button type="button" className="campo-btn campo-btn--outline" onClick={onRegistrar}>
              Registrar agora
            </button>
          )}
        </div>
      )}

      {visitaAtiva && proxima && onProxima && (
        <button type="button" className="campo-proxima" onClick={onProxima} aria-label={`Próxima etapa: ${proxima.titulo}. ${proxima.detalhe}`}>
          <span className="campo-proxima-corpo">
            <span className="ui-eyebrow">Próxima etapa</span>
            <span className="campo-proxima-titulo">
              <span className="campo-proxima-amb">{proxima.titulo}</span>
            </span>
            <span className="campo-proxima-texto">{proxima.detalhe}</span>
          </span>
          <span className="campo-proxima-seta" aria-hidden="true">›</span>
        </button>
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

type EtapaChave = "identificadas" | "plano" | "acompanhamento" | "resolvidas";
const ETAPAS_CAMPO: { chave: EtapaChave; curto: string; tom: string }[] = [
  { chave: "identificadas", curto: "Identificadas", tom: "nc" },
  { chave: "plano", curto: "Com plano", tom: "pend" },
  { chave: "acompanhamento", curto: "Acomp.", tom: "info" },
  { chave: "resolvidas", curto: "Resolvidas", tom: "ok" },
];
const COR_DA_GRAVIDADE_CAMPO: Record<GravidadeNc, string> = { Crítica: "#D93A3A", Importante: "#F5A623", Rotina: "#3AA6D9" };
const GRUPOS_CAMPO: { gravidade: GravidadeNc; rotulo: string }[] = [
  { gravidade: "Crítica", rotulo: "CRÍTICAS" },
  { gravidade: "Importante", rotulo: "IMPORTANTES" },
  { gravidade: "Rotina", rotulo: "LEVES" },
];

function PinoCampo() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-6-5.2-6-10a6 6 0 0 1 12 0c0 4.8-6 10-6 10z" />
      <circle cx="12" cy="11" r="2.2" />
    </svg>
  );
}

export function CampoCorrecoes({
  itens,
  hoje,
  podeEditar,
  podeMarcar,
  pessoas,
  onSalvarPlano,
  onMarcarFeita,
  onDesfazerFeita,
  onLote,
  onVerNoChecklist,
  responsavelPadrao = "",
  onAbrirPop,
}: {
  responsavelPadrao?: string;
  onAbrirPop?: () => void;
  itens: CorrecaoItem[];
  hoje: string;
  podeEditar: boolean;
  podeMarcar: boolean;
  pessoas: string[];
  subtituloDaLista?: string;
  onSalvarPlano: (id: string, dados: { acao: string; responsavel: string; prazo: string; etapa: EtapaCorrecao }) => void;
  onMarcarFeita: (id: string) => void;
  onDesfazerFeita: (id: string) => void;
  onLote: (ids: string[], valores: { responsavel: string; prazo: string }) => void;
  onVerNoChecklist: (checklistItemId: string, ambiente: string) => void;
}) {
  const [agrupar, setAgrupar] = useState<"gravidade" | "ambiente">("gravidade");
  const [etapa, setEtapa] = useState<EtapaChave | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);
  const [lote, setLote] = useState(false);
  const [salvoAgora, setSalvoAgora] = useState<{ proximaId: string | null; proximaTitulo: string } | null>(null);

  const contagem = contarEtapas(itens);
  const abertas = itens.filter((item) => item.status !== "Resolvida").length;
  const filtrados = ordenarCorrecoes(itens.filter((item) => !etapa || etapaDaCorrecao(item) === etapa));
  const grupos =
    agrupar === "gravidade"
      ? GRUPOS_CAMPO.map((grupo) => ({ rotulo: grupo.rotulo, itens: filtrados.filter((item) => item.gravidade === grupo.gravidade) }))
      : Array.from(new Set(filtrados.map((item) => linhaDaCorrecao(item).ambiente))).map((ambiente) => ({
          rotulo: ambiente.toLocaleUpperCase("pt-BR"),
          itens: filtrados.filter((item) => linhaDaCorrecao(item).ambiente === ambiente),
        }));
  const atual = itens.find((item) => item.id === aberta) || null;

  const proximaSemPlano = (depoisDe: string) => {
    const ordem = ordenarCorrecoes(itens);
    const posicao = ordem.findIndex((item) => item.id === depoisDe);
    const seguintes = [...ordem.slice(posicao + 1), ...ordem.slice(0, Math.max(0, posicao))];
    return seguintes.find((item) => etapaDaCorrecao(item) === "identificadas") || null;
  };

  if (atual) {
    return (
      <DetalheCampo
        key={atual.id}
        nc={atual}
        hoje={hoje}
        podeEditar={podeEditar}
        podeMarcar={podeMarcar}
        pessoas={pessoas}
        onVoltar={() => setAberta(null)}
        onPular={() => {
          const proxima = proximaSemPlano(atual.id) || ordenarCorrecoes(itens).find((item) => item.id !== atual.id) || null;
          setAberta(proxima ? proxima.id : null);
        }}
        onSalvar={(dados) => {
          onSalvarPlano(atual.id, dados);
          const proxima = proximaSemPlano(atual.id);
          setSalvoAgora({ proximaId: proxima?.id || null, proximaTitulo: proxima ? linhaDaCorrecao(proxima).titulo : "" });
          setAberta(null);
        }}
        onMarcarFeita={() => onMarcarFeita(atual.id)}
        onDesfazerFeita={() => onDesfazerFeita(atual.id)}
        onVerNoChecklist={onVerNoChecklist}
        responsavelPadrao={responsavelPadrao}
        onAbrirPop={onAbrirPop}
      />
    );
  }

  return (
    <section className="campo-tela campo-tela--lista" aria-label="Correções">
      <div>
        <h1 className="campo-h1">Correções</h1>
        <p className="campo-sub">
          {abertas} não conformidade{abertas === 1 ? "" : "s"} aberta{abertas === 1 ? "" : "s"} ·{" "}
          {abertas === 0 ? "nada pendente" : contagem.plano === 0 ? "nenhuma com plano ainda" : `${contagem.plano} com plano`}
        </p>
      </div>

      {salvoAgora && (
        <div className="campo-salvo" role="status">
          <span aria-hidden="true">✓</span>
          <span className="campo-salvo-texto">
            Plano salvo.{salvoAgora.proximaId ? ` Próxima sem plano: ${salvoAgora.proximaTitulo}` : " Não há mais correções sem plano."}
          </span>
          {salvoAgora.proximaId && (
            <button
              type="button"
              className="pc-chip-btn pc-chip-btn--soft"
              onClick={() => {
                setAberta(salvoAgora.proximaId);
                setSalvoAgora(null);
              }}
            >
              Abrir
            </button>
          )}
          <button type="button" className="campo-salvo-fechar" aria-label="Fechar aviso" onClick={() => setSalvoAgora(null)}>
            ×
          </button>
        </div>
      )}

      <div className="campo-fluxo" role="group" aria-label="Etapas das correções">
        {ETAPAS_CAMPO.map((passo) => {
          const ativa = (etapa ?? "identificadas") === passo.chave && contagem[passo.chave] > 0;
          return (
            <button
              key={passo.chave}
              type="button"
              className={`campo-fluxo-item campo-fluxo-item--${passo.tom}${ativa ? " is-ativa" : ""}${contagem[passo.chave] === 0 ? " is-zero" : ""}`}
              aria-pressed={etapa === passo.chave}
              onClick={() => setEtapa((valor) => (valor === passo.chave ? null : passo.chave))}
            >
              <span className="campo-fluxo-num">{contagem[passo.chave]}</span>
              <span className="campo-fluxo-rotulo">{passo.curto}</span>
            </button>
          );
        })}
      </div>

      <div className="campo-lista-barra">
        <span className="campo-sub">Agrupar</span>
        <SegmentedTabs<"gravidade" | "ambiente">
          rotulo="Agrupar correções"
          valor={agrupar}
          onChange={setAgrupar}
          abas={[
            { id: "gravidade", rotulo: "Gravidade" },
            { id: "ambiente", rotulo: "Ambiente" },
          ]}
        />
        {podeEditar && (
          <button type="button" className="pc-chip-btn pc-chip-btn--soft campo-lote" onClick={() => setLote(true)} disabled={abertas === 0}>
            Definir em lote
          </button>
        )}
      </div>

      <div className="campo-grupos">
        {itens.length === 0 && (
          <div className="campo-card">
            <div className="campo-card-title">Nenhuma correção nesta visita</div>
            <div className="campo-sub">As não conformes do checklist aparecem aqui.</div>
          </div>
        )}
        {grupos
          .filter((grupo) => grupo.itens.length > 0)
          .map((grupo) => (
            <div key={grupo.rotulo} className="campo-grupo">
              <div className="ui-group-title">
                {grupo.rotulo} · {grupo.itens.length}
              </div>
              {grupo.itens.map((item) => {
                const linha = linhaDaCorrecao(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="pc-cor-card"
                    style={{ "--grav": COR_DA_GRAVIDADE_CAMPO[item.gravidade] } as CSSProperties}
                    onClick={() => {
                      setSalvoAgora(null);
                      setAberta(item.id);
                    }}
                  >
                    <span className="pc-cor-topo">
                      <span className="pc-cor-pino">
                        <PinoCampo />
                        {linha.ambiente}
                      </span>
                      {item.reincidente && <span className="pc-cor-aviso">Reincidente</span>}
                      {item.marcadaFeita && item.status !== "Resolvida" && <span className="pc-cor-aviso">Feita, aguardando confirmação</span>}
                    </span>
                    <span className="pc-cor-titulo">{linha.titulo}</span>
                    <span className="pc-cor-grav">{NOME_DA_GRAVIDADE[item.gravidade]}</span>
                  </button>
                );
              })}
            </div>
          ))}
      </div>

      {lote && (
        <LoteJanela
          itens={itens.filter((item) => item.status !== "Resolvida")}
          hoje={hoje}
          onFechar={() => setLote(false)}
          onAplicar={(ids, valores) => {
            onLote(ids, valores);
            setLote(false);
          }}
        />
      )}
    </section>
  );
}

// Plano numa tela só (sem rolagem), com a barra de baixo "Pular | Salvar plano".
function DetalheCampo({
  nc,
  hoje,
  podeEditar,
  podeMarcar,
  pessoas,
  onVoltar,
  onPular,
  onSalvar,
  onMarcarFeita,
  onDesfazerFeita,
  onVerNoChecklist,
  responsavelPadrao,
  onAbrirPop,
}: {
  responsavelPadrao: string;
  onAbrirPop?: () => void;
  nc: CorrecaoItem;
  hoje: string;
  podeEditar: boolean;
  podeMarcar: boolean;
  pessoas: string[];
  onVoltar: () => void;
  onPular: () => void;
  onSalvar: (dados: { acao: string; responsavel: string; prazo: string; etapa: EtapaCorrecao }) => void;
  onMarcarFeita: () => void;
  onDesfazerFeita: () => void;
  onVerNoChecklist: (checklistItemId: string, ambiente: string) => void;
}) {
  const [acao, setAcao] = useState(nc.acaoCorretiva);
  const [responsavel, setResponsavel] = useState(nc.responsavelAcao || responsavelPadrao);
  const [prazo, setPrazo] = useState(nc.prazo);
  const [tentou, setTentou] = useState(false);
  const [tocado, setTocado] = useState<Record<CampoDoPlano, boolean>>({ acao: false, responsavel: false, prazo: false });
  const [faltas, setFaltas] = useState("");
  const acaoRef = useRef<HTMLTextAreaElement | null>(null);
  const responsavelRef = useRef<HTMLInputElement | null>(null);
  const prazoRef = useRef<HTMLInputElement | null>(null);
  const resolvida = nc.status === "Resolvida";
  const bloqueado = resolvida || !podeEditar;
  const sugestao = prazoSugerido(nc.gravidade, hoje);
  const erros = validarPlano({ acaoCorretiva: acao, responsavelAcao: responsavel, prazo }, hoje, true);
  const mostrar = (campo: CampoDoPlano) => (tentou || tocado[campo] || Boolean(prazo && campo === "prazo")) && erros[campo];
  const marcarTocado = (campo: CampoDoPlano) => setTocado((atual) => ({ ...atual, [campo]: true }));
  const linha = linhaDaCorrecao(nc);
  const etapaAlvo: EtapaCorrecao = etapaDaCorrecao(nc) === "acompanhamento" ? "acompanhamento" : "plano";

  const salvar = () => {
    setTentou(true);
    const vazios: Record<CampoDoPlano, boolean> = { acao: !acao.trim(), responsavel: !responsavel.trim(), prazo: !prazo };
    const faltando = (Object.keys(vazios) as CampoDoPlano[]).filter((campo) => vazios[campo]);
    const invalidos = (Object.keys(erros) as CampoDoPlano[]).filter((campo) => !vazios[campo]);
    if (faltando.length > 0 || invalidos.length > 0) {
      setFaltas(mensagemDeFaltas(faltando, invalidos));
      const primeiro = primeiroCampoComProblema(faltando, invalidos);
      (primeiro === "acao" ? acaoRef.current : primeiro === "responsavel" ? responsavelRef.current : prazoRef.current)?.focus();
      return;
    }
    setFaltas("");
    onSalvar({ acao: acao.trim(), responsavel: responsavel.trim(), prazo, etapa: etapaAlvo });
  };

  return (
    <section className="campo-detalhe" aria-label={`Correção ${linha.codigo}`}>
      <header className="campo-detalhe-topo">
        <button type="button" className="campo-voltar" aria-label="Voltar para a lista de correções" onClick={onVoltar}>
          ‹
        </button>
        <div className="campo-detalhe-topo-texto">
          <span className="campo-sub">{linha.ambiente}</span>
          <span className="campo-detalhe-titulo">Correção {linha.codigo}</span>
        </div>
      </header>

      <div className="campo-detalhe-corpo">
        <div className="campo-detalhe-chips">
          <span className="pc-grav-chip" style={{ "--grav": COR_DA_GRAVIDADE_CAMPO[nc.gravidade] } as CSSProperties}>
            <i aria-hidden="true" />
            {NOME_DA_GRAVIDADE[nc.gravidade]}
          </span>
          <span className="pc-codigo-chip">{linha.codigo}</span>
          {nc.referencia && <span className="campo-norma">{nc.referencia}</span>}
        </div>
        <h2 className="campo-detalhe-h2">{linha.titulo}</h2>
        <div className="campo-detalhe-chips">
          <span className="pc-cor-pino">
            <PinoCampo />
            {linha.ambiente}
          </span>
          {nc.itemNumero > 0 && <span className="campo-sub">item {nc.itemNumero}</span>}
          {nc.pop?.existe && onAbrirPop && (
            <button type="button" className="pc-chip-btn" title={`${nc.pop.codigo ? nc.pop.codigo + " · " : ""}${nc.pop.titulo}`} onClick={onAbrirPop}>
              POP
            </button>
          )}
          {nc.checklistItemId && (
            <button type="button" className="pc-chip-btn pc-chip-btn--soft" onClick={() => onVerNoChecklist(nc.checklistItemId, nc.ambiente)}>
              Ver no checklist ›
            </button>
          )}
        </div>

        {nc.observacao.trim() && (
          <div className="pc-registrado">
            <span className="ui-eyebrow">Registrado no checklist · {quandoCurtoCampo(nc.registradoEm)}</span>
            <p className="pc-registrado-texto">“{nc.observacao.trim()}”</p>
          </div>
        )}

        {nc.ultimaOcorrencia && (
          <div className="pc-ultima">
            <span className="ui-eyebrow">Como foi nesse critério na última visita</span>
            <p className="pc-registrado-texto">
              {nc.ultimaOcorrencia.data} · {nc.ultimaOcorrencia.situacao}
              {nc.ultimaOcorrencia.acao ? ` · ${nc.ultimaOcorrencia.acao}` : ""}
            </p>
          </div>
        )}

        {nc.acaoSugerida && !bloqueado && acao.trim() !== nc.acaoSugerida.trim() && (
          <div className="pc-acao-padrao">
            <span className="ui-row-sub">Ação padrão do critério: “{nc.acaoSugerida}”</span>
            <button type="button" className="pc-chip-btn pc-chip-btn--soft" onClick={() => setAcao(nc.acaoSugerida || "")}>
              Usar
            </button>
          </div>
        )}

        <label className="campo-field campo-field--acao">
          <span className="ui-eyebrow">
            O que será feito <span className="pc-obrig">· obrigatório</span>
          </span>
          <textarea
            ref={acaoRef}
            className={`ui-input campo-acao-area${mostrar("acao") ? " is-invalid" : ""}`}
            value={acao}
            disabled={bloqueado}
            placeholder="Descreva a ação corretiva"
            aria-invalid={Boolean(mostrar("acao"))}
            onChange={(evento) => setAcao(evento.target.value)}
            onBlur={() => marcarTocado("acao")}
          />
          {mostrar("acao") && <span className="campo-erro">{erros.acao}</span>}
        </label>
        {!bloqueado && (
          <div className="campo-voz-tools">
            <FieldVoiceTools fieldKey={`acao-${nc.id}`} value={acao} onChange={setAcao} rotuloIa="Sugerir com IA" rotuloVoz="Ditar ação" contexto="Ação corretiva para uma não conformidade em segurança dos alimentos." />
          </div>
        )}

        <div className="campo-duplo">
          <label className="campo-field">
            <span className="ui-eyebrow">Responsável</span>
            <input
              ref={responsavelRef}
              className={`ui-input ui-input--lista${mostrar("responsavel") ? " is-invalid" : ""}`}
              value={responsavel}
              list={`campo-pessoas-${nc.id}`}
              disabled={bloqueado}
              onChange={(evento) => setResponsavel(evento.target.value)}
              onBlur={() => marcarTocado("responsavel")}
              aria-invalid={Boolean(mostrar("responsavel"))}
            />
            <datalist id={`campo-pessoas-${nc.id}`}>
              {pessoas.map((pessoa) => (
                <option key={pessoa} value={pessoa} />
              ))}
            </datalist>
            {mostrar("responsavel") && <span className="campo-erro">{erros.responsavel}</span>}
          </label>
          <label className="campo-field">
            <span className="ui-eyebrow">Prazo</span>
            <span className="pc-prazo-campo">
              <input
                ref={prazoRef}
                type="date"
                className={`ui-input${mostrar("prazo") ? " is-invalid" : ""}`}
                value={prazo}
                min={hoje}
                disabled={bloqueado}
                aria-invalid={Boolean(mostrar("prazo"))}
                onChange={(evento) => setPrazo(evento.target.value)}
                onBlur={() => marcarTocado("prazo")}
              />
              {!bloqueado && (
                <button type="button" className="pc-prazo-sugerido" onClick={() => setPrazo(sugestao.data)}>
                  {sugestao.dias} dias · {nc.gravidade === "Rotina" ? "leve" : nc.gravidade.toLocaleLowerCase("pt-BR")}
                </button>
              )}
            </span>
            {mostrar("prazo") && <span className="campo-erro">{erros.prazo}</span>}
          </label>
        </div>
      </div>

      {faltas && (
        <div className="campo-falta" role="alert">
          {faltas}
        </div>
      )}
      <footer className="campo-detalhe-rodape">
        {podeEditar && !resolvida ? (
          <>
            <button type="button" className="campo-btn campo-btn--outline" onClick={onPular}>
              Pular
            </button>
            <button type="button" className="campo-btn campo-btn--save" onClick={salvar}>
              Salvar plano
            </button>
          </>
        ) : podeMarcar && !resolvida ? (
          <button type="button" className="campo-btn campo-btn--save" onClick={nc.marcadaFeita ? onDesfazerFeita : onMarcarFeita}>
            {nc.marcadaFeita ? "Desfazer \"feita\"" : "Marcar como feita"}
          </button>
        ) : (
          <button type="button" className="campo-btn campo-btn--outline" onClick={onVoltar}>
            Voltar
          </button>
        )}
      </footer>
    </section>
  );
}

function quandoCurtoCampo(iso: string) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  const mesmoDia = data.toDateString() === new Date().toDateString();
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return mesmoDia ? `hoje ${hora}` : `${data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${hora}`;
}

export type CartaoMais = { id: string; rotulo: string; icone: NavIconName; tom: string; onClick: () => void };

/** Linha de destaque do Mais (ex.: Empresas), com etiqueta "novo". */
export type LinhaMais = { rotulo: string; detalhe: string; icone: NavIconName; tom: string; etiqueta?: string; onClick: () => void };

export function CampoMais({ daVisita, gerais, destaque, onVersaoCompleta }: { daVisita: CartaoMais[]; gerais: CartaoMais[]; destaque?: LinhaMais; onVersaoCompleta: () => void }) {
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
      {destaque && (
        <button type="button" className="campo-mais-destaque" onClick={destaque.onClick}>
          <span className="campo-mais-tile" style={{ background: `linear-gradient(160deg, var(--tile-${destaque.tom}-from), var(--tile-${destaque.tom}-to))` }}>
            <NavIcon name={destaque.icone} size={22} strokeWidth={1.9} />
          </span>
          <span className="campo-mais-destaque-textos">
            <span className="campo-mais-destaque-titulo">
              {destaque.rotulo}
              {destaque.etiqueta && <span className="campo-mais-etiqueta">{destaque.etiqueta}</span>}
            </span>
            <span className="campo-mais-destaque-sub">{destaque.detalhe}</span>
          </span>
          <span aria-hidden="true">›</span>
        </button>
      )}
      <div className="ui-eyebrow">Geral</div>
      <div className="campo-mais-grid">{gerais.map(cartao)}</div>
      <button type="button" className="campo-btn campo-btn--brand" onClick={onVersaoCompleta}>
        Usar versão completa agora
      </button>
    </section>
  );
}
