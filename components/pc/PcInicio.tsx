"use client";

import type { ItemDoPainel } from "@/lib/painelHoje";
import { contadorDoPainel, subDaLinhaDoPainel, LIMITE_DE_LINHAS_DO_PAINEL, quadradoDoVencimento, textoDoPrazoEm, type ItemDaEsquerda, type ItemDeVencimento, type VencidosPorOrigem } from "@/lib/inicio";

export type CaixaDoInicio = {
  chave: string;
  titulo: string;
  subtitulo: string;
  tipo: "visita" | "pop" | "comprovantes";
  onAbrir: () => void;
  /** Só visita: título curto ("Visita 3"), data e % do checklist (anel de progresso). */
  rotulo?: string;
  data?: string;
  percentual?: number;
};

type Props = {
  nome: string;
  /** Aviso para o RT (norma alterada nos POPs aprovados): uma linha, só quando existe. Não faz parte do desenho; foi mantido por ser aviso regulatório. */
  avisoPops?: string | null;
  /** Até 3 caixas do "Continuar de onde parei". Sem visita em andamento o cartão vira "Comece por aqui" (com o botão Nova visita); as caixas de outras telas continuam. */
  caixas: CaixaDoInicio[];
  /** "Nova visita" do cartão sem visita em andamento; ausente = quem não cria visita não vê o botão. */
  onNovaVisita?: (() => void) | null;
  /** "Configuração da empresa: X de Y · faltam …": só enquanto estiver incompleta. */
  configuracao: { feitos: number; total: number; faltam: { id: string; titulo: string; onAbrir: () => void }[]; onGuia: () => void } | null;
  /** Links do rodapé (só gestor): Resumo de uma página, Evolução, Relatórios emitidos, Dossiê. */
  atalhos?: { onResumo?: () => void; onEvolucao?: () => void; onEmitidos?: () => void; onDossie?: () => void } | null;
  /** Só gestor (quem vê o painel Hoje); sem ele, só o cartão. */
  colunas: {
    precisa: ItemDaEsquerda[];
    vencidos: number;
    vencidosPorOrigem: VencidosPorOrigem;
    aguardando: number;
    semPrazo: number;
    semResponsavel: number;
    vencendo: ItemDeVencimento[];
    onAbrirPendencia: (item: ItemDaEsquerda) => void;
    onAbrirVencimento: (item: ItemDeVencimento) => void;
    onLembrete?: () => void;
    onTodosVencimentos: () => void;
    /** Abre a lista completa de correções abertas (vencidas, aguardando aprovação e sem prazo, nessa ordem). */
    onVerTodasCorrecoes: () => void;
  } | null;
};

const TIPO: Record<ItemDoPainel["origem"], string> = { correcao: "Correção", comprovante: "Comprovante", capacitacao: "Capacitação", pop: "Aprovação" };

const LINHAS_DE_CORRECAO = 5;
const maiuscula = (texto: string) => texto.charAt(0).toLocaleUpperCase("pt-BR") + texto.slice(1);

const IconeVisita = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z" /><rect x="5" y="6" width="14" height="15" rx="2" /><path d="M9 12l2 2 4-4" />
  </svg>
);
const IconePop = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 3h9l4 4v14H6z" /><path d="M15 3v5h4M9 13h6M9 17h6" />
  </svg>
);
const IconeComprovante = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" /><path d="M9 12l2 2 4-4" />
  </svg>
);

/** Anel de progresso de 60 px (traço 6): laranja sobre trilho claro; sem porcentagem (outras telas) mostra o ícone da tela. */
function Anel({ percentual, tipo }: { percentual?: number; tipo: CaixaDoInicio["tipo"] }) {
  const raio = 27;
  const volta = 2 * Math.PI * raio;
  const valor = Math.max(0, Math.min(100, percentual ?? 0));
  return (
    <span className="ini3-anel" role={percentual === undefined ? undefined : "img"} aria-label={percentual === undefined ? undefined : `${valor}% do checklist respondido`}>
      <svg width="60" height="60" viewBox="0 0 60 60" aria-hidden="true">
        <circle cx="30" cy="30" r={raio} fill="none" stroke="var(--rd-trilho)" strokeWidth="6" />
        {percentual !== undefined && <circle cx="30" cy="30" r={raio} fill="none" stroke="var(--rd-ambar)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(valor / 100) * volta} ${volta}`} transform="rotate(-90 30 30)" />}
      </svg>
      <span className="ini3-anel-centro">{percentual !== undefined ? `${valor}%` : tipo === "pop" ? <IconePop /> : tipo === "comprovantes" ? <IconeComprovante /> : <IconeVisita />}</span>
    </span>
  );
}

// Início (PC): "Olá", cartões do "Continuar de onde parei" com anel de progresso, correções que pedem ação e os links de sempre.
// Visual do redesign (azul de ação, laranja só no anel); conteúdo e lógica são os de antes. A barra do topo é a do app (AppTopbar).
export default function PcInicio({ nome, avisoPops = null, caixas, onNovaVisita = null, configuracao, atalhos = null, colunas }: Props) {
  const linhas = colunas ? colunas.precisa : [];
  const mostrar = linhas.slice(0, LINHAS_DE_CORRECAO);
  const faltaMostrar = linhas.length > mostrar.length;
  const temVisita = caixas.some((caixa) => caixa.tipo === "visita");
  const mostrarCartao = temVisita || caixas.length > 0 || Boolean(onNovaVisita);
  const semPendencias = linhas.length === 0;
  const contador = colunas ? contadorDoPainel(colunas) : "";
  const semVencimentos = colunas ? colunas.vencendo.length === 0 : true;

  const linhaDeConfiguracao = configuracao && (
    <p className="ini3-config" role="status">
      Configuração da empresa: {configuracao.feitos} de {configuracao.total} · faltam{" "}
      {configuracao.faltam.map((item, indice) => (
        <span key={item.id}>
          {indice > 0 ? (indice === configuracao.faltam.length - 1 ? " e " : ", ") : ""}
          <button type="button" className="ini2-link" onClick={item.onAbrir}>{item.titulo}</button>
        </span>
      ))}
    </p>
  );

  const links: { rotulo: string; onClick: () => void }[] = [
    ...(atalhos?.onResumo ? [{ rotulo: "Resumo de uma página", onClick: atalhos.onResumo }] : []),
    ...(atalhos?.onEvolucao ? [{ rotulo: "Evolução", onClick: atalhos.onEvolucao }] : []),
    ...(atalhos?.onEmitidos ? [{ rotulo: "Relatórios emitidos", onClick: atalhos.onEmitidos }] : []),
    ...(atalhos?.onDossie ? [{ rotulo: "Dossiê", onClick: atalhos.onDossie }] : []),
    ...(colunas && !semVencimentos ? [{ rotulo: `Vencimentos em 30 dias (${colunas.vencendo.length})`, onClick: colunas.onTodosVencimentos }] : []),
    ...(colunas?.onLembrete ? [{ rotulo: "Lembrete ao responsável", onClick: colunas.onLembrete }] : []),
    ...(configuracao ? [{ rotulo: "Guia de uso em Ajuda e guias", onClick: configuracao.onGuia }] : []),
  ];

  return (
    <section className="ui-screen ini2 ini3" aria-label="Início">
      <h1 className="ini3-ola">Olá, {nome}</h1>

      {avisoPops && (
        <p className="ini2-aviso" role="status">
          <span className="ini2-aviso-marca">Revisar</span> {avisoPops}
        </p>
      )}

      {mostrarCartao && (
        <section className="ini3-secao" aria-label="Continuar de onde parei">
          <h2 className="ini3-rotulo">{temVisita ? "CONTINUAR DE ONDE PARAREI" : "COMECE POR AQUI"}</h2>
          {!temVisita && (
            <div className="ini2-sem-visita">
              <p className="ini2-sem-visita-texto">Nenhuma visita em andamento.</p>
              {onNovaVisita && (
                <button type="button" className="ini3-botao" onClick={onNovaVisita}>
                  Nova visita
                </button>
              )}
            </div>
          )}
          {caixas.length > 0 && (
            <div className="ini3-cartoes">
              {caixas.map((caixa, indice) => (
                <article key={caixa.chave} className={`ini3-cartao${indice === 0 ? " is-primeiro" : ""}`}>
                  <div className="ini3-cartao-topo">
                    <Anel percentual={caixa.tipo === "visita" ? caixa.percentual : undefined} tipo={caixa.tipo} />
                    <div className="ini3-cartao-textos">
                      <h3 className="ini3-cartao-titulo" title={caixa.titulo}>{caixa.rotulo || caixa.titulo}</h3>
                      {caixa.data && <span className="ini3-cartao-data">{caixa.data}</span>}
                      {caixa.subtitulo && <span className="ini3-cartao-sub">{caixa.subtitulo}</span>}
                    </div>
                  </div>
                  <button type="button" className="ini3-botao ini3-botao--cheio" onClick={caixa.onAbrir}>
                    Continuar →
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {colunas && semPendencias && (
        <section className="ini2-tudo-em-dia" aria-label="Tudo em dia">
          <h2 className="ini2-tudo-titulo">Tudo em dia</h2>
          <p className="ini2-tudo-sub">{semVencimentos ? "Nada vencido e nada vencendo nos próximos 30 dias." : "Nada vencido."}</p>
        </section>
      )}

      {colunas && !semPendencias && (
        <div className="ini3-colunas is-uma">
          {!semPendencias && (
            <section className="ini3-secao ini3-correcoes" aria-label="Hoje precisa de você">
              <h2 className="ini3-rotulo">CORREÇÕES</h2>
              <h3 className="ini3-titulo">Hoje precisa de você</h3>
              <div className="ini3-resumo">
                <span className="ini3-partes">{contador.split(" · ").filter(Boolean).map((parte) => <span key={parte} className="ini3-parte">{parte}</span>)}</span>
                {colunas.semResponsavel > 0 && <span className="ini3-semresp">{colunas.semResponsavel} sem responsável</span>}
              </div>
              <div className="ini3-lista">
                {mostrar.map((item) => (
                  <button key={item.id} type="button" className={`ini3-linha ini3-linha--${item.situacao === "vencido" ? "vencida" : "aberta"}`} onClick={() => colunas.onAbrirPendencia(item)}>
                    <span className="ini3-faixa" aria-hidden="true" />
                    <span className="ini3-linha-textos">
                      <span className="ini3-linha-titulo">{item.titulo}</span>
                      <span className="ini3-linha-sub">{subDaLinhaDoPainel(item, TIPO[item.origem])}</span>
                    </span>
                    <span className={`ini3-tag ini3-tag--${item.situacao === "vencido" ? "venceu" : item.situacao === "aguardando" ? "aguardando" : "aberta"}`}>
                      {item.situacao === "vencido" ? maiuscula(item.prazo) : item.situacao === "aguardando" ? "Aguardando" : "Aberta"}
                    </span>
                  </button>
                ))}
              </div>
              {faltaMostrar && (
                <div className="ini3-rodape-lista">
                  <button type="button" className="ini2-link" onClick={colunas.onVerTodasCorrecoes}>Ver todas ({linhas.length})</button>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {(links.length > 0 || linhaDeConfiguracao) && (
        <footer className="ini3-rodape">
          {links.length > 0 && (
            <nav className="ini3-links" aria-label="Atalhos">
              {links.map((link) => (
                <button key={link.rotulo} type="button" className="ini2-link" onClick={link.onClick}>{link.rotulo}</button>
              ))}
            </nav>
          )}
          {linhaDeConfiguracao}
        </footer>
      )}
    </section>
  );
}
