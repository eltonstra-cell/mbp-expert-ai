"use client";

import { useEffect, useState } from "react";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import type { CorrecaoDoInicio } from "@/lib/inicio";

export type CartaoDoInicio = {
  /** "Visita 3" */
  rotulo: string;
  data: string;
  percentual: number;
  /** "Próxima etapa: Recebimento" */
  proxima: string;
  onContinuar: () => void;
};

type Props = {
  nome: string;
  /** Aviso para o RT (norma alterada nos POPs aprovados): uma linha, só quando existe. Não faz parte do desenho; foi mantido por ser aviso regulatório. */
  avisoPops?: string | null;
  /** A visita em andamento mais recente (menos de 100%). Nula: sem cartão de visita. */
  cartao: CartaoDoInicio | null;
  /** Quantas visitas existem além do cartão (link "Outras visitas (N)"). */
  outrasVisitas: number;
  onOutrasVisitas: () => void;
  /** "Nova visita" do cartão sem visita em andamento; ausente = quem não cria visita não vê o botão. */
  onNovaVisita?: (() => void) | null;
  /** "Configuração da empresa: X de Y · faltam …": só enquanto estiver incompleta. */
  configuracao: { feitos: number; total: number; faltam: { id: string; titulo: string; onAbrir: () => void }[]; onGuia: () => void } | null;
  /** Links do rodapé (só gestor): Resumo de uma página, Evolução, Relatórios emitidos, Dossiê. */
  atalhos?: { onResumo?: () => void; onEvolucao?: () => void; onEmitidos?: () => void; onDossie?: () => void } | null;
  /** Só gestor (quem vê o painel Hoje); sem ele, só o cartão. Todas as correções abertas da empresa, vencidas primeiro. */
  correcoes: {
    itens: CorrecaoDoInicio[];
    onAbrirItem: (id: string) => void;
    onAbrirCorrecoes: () => void;
    vencimentos: number;
    onTodosVencimentos: () => void;
    onLembrete?: () => void;
  } | null;
};

/** Quantas correções o Início mostra antes do link "Ver todas as correções". */
export const LINHAS_DE_CORRECAO = 3;

type FiltroDaGaveta = "Todas" | "Vencidas" | "Abertas";

function LinhasDeCorrecao({ itens, onAbrir }: { itens: CorrecaoDoInicio[]; onAbrir: (id: string) => void }) {
  return (
    <>
      {itens.map((item) => (
        <button key={item.id} type="button" className={`ini3-linha ini3-linha--${item.vencida ? "vencida" : "aberta"}`} onClick={() => onAbrir(item.id)}>
          <span className="ini3-faixa" aria-hidden="true" />
          <span className="ini3-linha-textos">
            <span className="ini3-linha-titulo">{item.titulo}</span>
            <span className="ini3-linha-sub">{item.linhaDeBaixo}</span>
          </span>
        </button>
      ))}
    </>
  );
}

/** "Hoje precisa de você" completo: painel à direita no PC, folha de baixo no tablet e no celular. A lista rola por dentro; título, abas e botão ficam fixos. */
function GavetaDeCorrecoes({ itens, onAbrirItem, onAbrirCorrecoes, onFechar }: { itens: CorrecaoDoInicio[]; onAbrirItem: (id: string) => void; onAbrirCorrecoes: () => void; onFechar: () => void }) {
  const [filtro, setFiltro] = useState<FiltroDaGaveta>("Todas");
  const vencidas = itens.filter((item) => item.vencida);
  const abertas = itens.filter((item) => !item.vencida);
  const lista = filtro === "Vencidas" ? vencidas : filtro === "Abertas" ? abertas : itens;

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  return (
    <div className="ini-gaveta-camada" role="dialog" aria-modal="true" aria-label="Todas as correções abertas">
      <button type="button" className="ini-gaveta-fundo" aria-label="Fechar" onClick={onFechar} />
      <div className="ini-gaveta">
        <header className="ini-gaveta-topo">
          <h2 className="ini-gaveta-titulo">Hoje precisa de você</h2>
          <button type="button" className="ini-gaveta-fechar" aria-label="Fechar" onClick={onFechar}>×</button>
        </header>
        <SegmentedTabs<FiltroDaGaveta>
          rotulo="Situação das correções"
          valor={filtro}
          onChange={setFiltro}
          abas={[
            { id: "Todas", rotulo: "Todas", contagem: itens.length, tom: "todas" },
            { id: "Vencidas", rotulo: "Vencidas", contagem: vencidas.length, tom: "vencidas" },
            { id: "Abertas", rotulo: "Abertas", contagem: abertas.length, tom: "andamento" },
          ]}
        />
        <div className="ini-gaveta-lista">
          {lista.length === 0 ? <p className="ini-gaveta-vazio">Nenhuma correção nesta aba.</p> : <LinhasDeCorrecao itens={lista} onAbrir={onAbrirItem} />}
        </div>
        <footer className="ini-gaveta-rodape">
          <button type="button" className="ini3-botao ini-gaveta-abrir" onClick={onAbrirCorrecoes}>Abrir Correções →</button>
        </footer>
      </div>
    </div>
  );
}

/** Anel de progresso de 60 px (traço 6): laranja sobre trilho claro. */
function Anel({ percentual }: { percentual: number }) {
  const raio = 27;
  const volta = 2 * Math.PI * raio;
  const valor = Math.max(0, Math.min(100, percentual));
  return (
    <span className="ini3-anel" role="img" aria-label={`${valor}% do checklist respondido`}>
      <svg width="60" height="60" viewBox="0 0 60 60" aria-hidden="true">
        <circle cx="30" cy="30" r={raio} fill="none" stroke="var(--rd-trilho)" strokeWidth="6" />
        <circle cx="30" cy="30" r={raio} fill="none" stroke="var(--rd-ambar)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(valor / 100) * volta} ${volta}`} transform="rotate(-90 30 30)" />
      </svg>
      <span className="ini3-anel-centro">{`${valor}%`}</span>
    </span>
  );
}

// Início (desenho 27–35): "Olá", UM cartão "Continuar de onde parei" com a visita em andamento mais recente e "Hoje precisa de você" com até 3 correções.
export default function PcInicio({ nome, avisoPops = null, cartao, outrasVisitas, onOutrasVisitas, onNovaVisita = null, configuracao, atalhos = null, correcoes }: Props) {
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const itens = correcoes ? correcoes.itens : [];
  const mostrar = itens.slice(0, LINHAS_DE_CORRECAO);
  const vencidas = itens.filter((item) => item.vencida).length;
  const abertas = itens.length - vencidas;
  const semVencimentos = correcoes ? correcoes.vencimentos === 0 : true;
  const mostrarCartao = Boolean(cartao) || Boolean(onNovaVisita) || outrasVisitas > 0;

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
    ...(correcoes && !semVencimentos ? [{ rotulo: `Vencimentos em 30 dias (${correcoes.vencimentos})`, onClick: correcoes.onTodosVencimentos }] : []),
    ...(correcoes?.onLembrete ? [{ rotulo: "Lembrete ao responsável", onClick: correcoes.onLembrete }] : []),
    ...(configuracao ? [{ rotulo: "Guia de uso em Ajuda e guias", onClick: configuracao.onGuia }] : []),
  ];

  const outras = outrasVisitas > 0 && (
    <button type="button" className="ini2-link ini4-outras" onClick={onOutrasVisitas}>{`Outras visitas (${outrasVisitas})`}</button>
  );

  return (
    <section className="ui-screen ini2 ini3 ini4" aria-label="Início">
      <h1 className="ini3-ola">Olá, {nome}</h1>

      {avisoPops && (
        <p className="ini2-aviso" role="status">
          <span className="ini2-aviso-marca">Revisar</span> {avisoPops}
        </p>
      )}

      {mostrarCartao && (
        <section className="ini4-cartao" aria-label="Continuar de onde parei">
          <h2 className="ini4-cartao-titulo">Continuar de onde parei</h2>
          {cartao ? (
            <div className="ini4-cartao-corpo">
              <div className="ini4-cartao-visita">
                <Anel percentual={cartao.percentual} />
                <div className="ini3-cartao-textos">
                  <h3 className="ini3-cartao-titulo">{`${cartao.rotulo} · ${cartao.data}`}</h3>
                  <span className="ini3-cartao-sub">{cartao.proxima}</span>
                </div>
              </div>
              <div className="ini4-cartao-acoes">
                <button type="button" className="ini3-botao ini4-continuar" onClick={cartao.onContinuar}>Continuar →</button>
                {outras}
              </div>
            </div>
          ) : (
            <div className="ini2-sem-visita">
              <p className="ini2-sem-visita-texto">Nenhuma visita para continuar.</p>
              {onNovaVisita && <button type="button" className="ini3-botao" onClick={onNovaVisita}>Nova visita</button>}
              {outras}
            </div>
          )}
        </section>
      )}

      {correcoes && itens.length === 0 && (
        <section className="ini2-tudo-em-dia" aria-label="Tudo em dia">
          <h2 className="ini2-tudo-titulo">Tudo em dia</h2>
          <p className="ini2-tudo-sub">{semVencimentos ? "Nenhuma correção aberta e nada vencendo nos próximos 30 dias." : "Nenhuma correção aberta."}</p>
        </section>
      )}

      {correcoes && itens.length > 0 && (
        <section className="ini3-secao ini3-correcoes ini4-hoje" aria-labelledby="ini3-pendencias-titulo">
          <div className="ini4-hoje-topo">
            <h2 id="ini3-pendencias-titulo" className="ini3-titulo">Hoje precisa de você</h2>
            <span className="ini3-partes">
              {vencidas > 0 && <span className="ini3-parte ini3-parte--urgente">{`${vencidas} ${vencidas === 1 ? "vencida" : "vencidas"}`}</span>}
              {abertas > 0 && <span className="ini3-parte ini4-parte-aberta">{`${abertas} ${abertas === 1 ? "aberta" : "abertas"}`}</span>}
            </span>
          </div>
          <div className="ini3-lista">
            <LinhasDeCorrecao itens={mostrar} onAbrir={correcoes.onAbrirItem} />
          </div>
          <div className="ini3-rodape-lista">
            <button type="button" className="ini2-link" onClick={() => setGavetaAberta(true)}>{`Ver todas as correções (${itens.length})`}</button>
          </div>
        </section>
      )}

      {correcoes && gavetaAberta && (
        <GavetaDeCorrecoes
          itens={itens}
          onAbrirItem={(id) => {
            setGavetaAberta(false);
            correcoes.onAbrirItem(id);
          }}
          onAbrirCorrecoes={() => {
            setGavetaAberta(false);
            correcoes.onAbrirCorrecoes();
          }}
          onFechar={() => setGavetaAberta(false)}
        />
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
