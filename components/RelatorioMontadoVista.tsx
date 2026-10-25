import type { ReactNode } from "react";
import { formatarData } from "@/lib/dataLocal";
import { ROTULO_DA_COR, REGRA_DA_COR, TITULO_DA_REGRA, type CartaoDeRiscoResumido, type CorDoMapa } from "@/lib/mapaDeRisco";
import { diferencaEmTexto, type PontuacaoDoSetor, type RelatorioMontado } from "@/lib/relatorioDaVisita";
import { quantidade } from "@/lib/plural";

const dataBr = (iso: string) => (iso ? formatarData(iso) || iso : "—");
const pct = (valor: number | null) => (valor === null ? "sem itens avaliados" : `${valor}%`);

/** Cartão de um ambiente do mapa de risco (a cor é informação do app; o texto é sempre preto). */
export function CartaoDeRiscoVista({ cartao, aoTocar, aberto = false }: { cartao: CartaoDeRiscoResumido; aoTocar?: () => void; aberto?: boolean }) {
  const corpo = (
    <>
      <span className="mr-topo">
        <span className="mr-nome">{cartao.ambiente}</span>
        <span className="mr-cor">{ROTULO_DA_COR[cartao.cor]}</span>
      </span>
      <span className="mr-motivo">{cartao.motivo}</span>
      <span className="mr-linha">
        {cartao.pontuacao ? `Pontuação ${pct(cartao.pontuacao.percentual)} · visita de ${dataBr(cartao.pontuacao.data)}` : "Sem pontuação"}
      </span>
      <span className="mr-linha mr-tendencia">
        {cartao.tendencia.sentido === "subiu" ? "↑ " : cartao.tendencia.sentido === "caiu" ? "↓ " : cartao.tendencia.sentido === "igual" ? "→ " : ""}
        {cartao.tendencia.texto}
        {cartao.tendencia.serie.length >= 2 && <span className="mr-serie"> ({cartao.tendencia.serie.map((ponto) => `${ponto.percentual}%`).join(" · ")})</span>}
      </span>
    </>
  );
  return aoTocar ? (
    <button type="button" className={`mr-cartao mr-cartao--${cartao.cor}${aberto ? " is-aberto" : ""}`} aria-expanded={aberto} onClick={aoTocar}>
      {corpo}
    </button>
  ) : (
    <div className={`mr-cartao mr-cartao--${cartao.cor}`}>{corpo}</div>
  );
}

export function RegraDoMapa({ cores }: { cores?: CorDoMapa[] }) {
  return (
    <div className="mr-regra">
      <p className="resumo-texto">{TITULO_DA_REGRA}</p>
      <ul className="resumo-lista doc-lista">
        {REGRA_DA_COR.filter((regra) => !cores || cores.includes(regra.cor)).map((regra) => (
          <li key={regra.cor}>
            <span className={`mr-amostra mr-amostra--${regra.cor}`} aria-hidden="true" /> {regra.texto}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TabelaDePontuacao({ linhas }: { linhas: PontuacaoDoSetor[] }) {
  return (
    <table className="doc-tabela">
      <thead>
        <tr>
          <th>Setor</th>
          <th>Pontuação</th>
          <th>Conformes</th>
          <th>Não conformes</th>
          <th>Não se aplica</th>
          <th>Sem resposta</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((linha) => (
          <tr key={linha.ambiente}>
            <td>{linha.ambiente}</td>
            <td>{linha.percentual === null ? "sem itens avaliados" : `${linha.percentual}% (${linha.conformes} de ${linha.avaliados})`}</td>
            <td>{linha.conformes}</td>
            <td>{linha.naoConformes}</td>
            <td>{linha.naoSeAplica}</td>
            <td>{linha.semResposta}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type Props = {
  dados: RelatorioMontado;
  /** Linhas de temperatura medida (norma, item e data de conferência). */
  temperaturas?: string[];
  /** O parecer do RT: texto escrito, campo para escrever ou caixa vazia para a mão. Sempre do RT, nunca do app. */
  parecer: ReactNode;
};

// Relatório montado só com dados registrados. As contas e as cores são "critério do app, não exigência de norma"; o parecer é do RT.
export default function RelatorioMontadoVista({ dados, temperaturas, parecer }: Props) {
  const { resumo, marcas, fontes } = dados;
  const linhasDeTemperatura = temperaturas && temperaturas.length > 0 ? temperaturas : dados.temperaturas || [];
  const mapa = dados.mapa || [];
  return (
    <div className="rm-doc">
      <section className="doc-secao" aria-label="Resumo da visita">
        <h3 className="resumo-sub">Resumo da visita (calculado pelo app)</h3>
        <p className="resumo-texto">
          Visita de {dataBr(resumo.data)} · {quantidade(resumo.ambientes.length, "ambiente visitado", "ambientes visitados")}: {resumo.ambientes.join(", ") || "nenhum"}.
        </p>
        <p className="resumo-texto">
          {resumo.respondidos} de {resumo.total} itens respondidos · {quantidade(resumo.conformes, "conforme", "conformes")} · {quantidade(resumo.naoConformes, "não conforme", "não conformes")} · {resumo.naoSeAplica} não se aplica · {resumo.semResposta} sem resposta.
        </p>
        {resumo.correcoesAbertas.length === 0 ? (
          <p className="resumo-texto">Nenhuma correção aberta.</p>
        ) : (
          <>
            <p className="resumo-texto">{quantidade(resumo.correcoesAbertas.length, "correção aberta", "correções abertas")}:</p>
            <ul className="resumo-lista doc-lista">
              {resumo.correcoesAbertas.map((correcao, indice) => (
                <li key={`${correcao.titulo}-${indice}`}>
                  <span className="doc-nc-titulo">{correcao.titulo}</span>
                  <span className="doc-linha">
                    {correcao.ambiente} · {correcao.criticidade} · Prazo: {correcao.prazo ? dataBr(correcao.prazo) : "sem prazo"}
                    {correcao.vencida ? " (vencido)" : ""} · Responsável: {correcao.responsavel || "não definido"}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="doc-secao" aria-label="Pontuação por setor">
        <h3 className="resumo-sub">Pontuação por setor</h3>
        {dados.pontuacao.length === 0 ? <p className="resumo-texto">Nenhum setor avaliado.</p> : <TabelaDePontuacao linhas={dados.pontuacao} />}
        <p className="resumo-texto mr-formula">
          <strong>Como se calcula:</strong> {dados.formulaDaPontuacao} <em>({dados.criterio})</em>
        </p>
        <p className="resumo-texto">Visita toda: {dados.geral.percentual === null ? "sem itens avaliados" : `${dados.geral.percentual}% (${dados.geral.conformes} de ${dados.geral.avaliados})`}; {dados.geral.semResposta} sem resposta, mostrados à parte.</p>
      </section>

      <section className="doc-secao" aria-label="Comparação com a visita anterior">
        <h3 className="resumo-sub">Comparação com a visita anterior</h3>
        {dados.comparacao.length === 0 ? (
          <p className="resumo-texto">Sem setores para comparar.</p>
        ) : (
          <ul className="resumo-lista doc-lista">
            {dados.comparacao.map((linha) => (
              <li key={linha.ambiente}>
                <span className="doc-nc-titulo">{linha.ambiente}</span>
                {linha.comparavel ? (
                  <span className="doc-linha">
                    {linha.anterior}% → {linha.atual}% ({diferencaEmTexto(linha.diferenca)}), contra a visita de {dataBr(linha.visitaDaComparacao)} · {quantidade(linha.resolvidas, "resolvida", "resolvidas")}, {quantidade(linha.mantidas, "mantida", "mantidas")}, {quantidade(linha.novas, "nova", "novas")}
                  </span>
                ) : (
                  <span className="doc-linha">{linha.texto} ({linha.motivo})</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="resumo-texto mr-formula">
          <strong>Como se compara:</strong> {dados.formulaDaComparacao} <em>({dados.criterio})</em>
        </p>
      </section>

      <section className="doc-secao" aria-label="Reincidências">
        <h3 className="resumo-sub">Reincidências</h3>
        {dados.reincidencias.length === 0 ? (
          <p className="resumo-texto">Nenhuma reincidência registrada nesta visita.</p>
        ) : (
          <ul className="resumo-lista doc-lista">
            {dados.reincidencias.map((r, indice) => (
              <li key={`${r.titulo}-${indice}`}>
                <span className="doc-nc-titulo">Pela {r.vezes}ª vez · {r.titulo}</span>
                <span className="doc-linha">
                  {r.ambiente}
                  {r.acaoQueFuncionou ? ` · ação que funcionou antes: ${r.acaoQueFuncionou}` : " · sem ação anterior resolvida registrada"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="doc-secao" aria-label="Como as respostas foram registradas">
        <h3 className="resumo-sub">Como as respostas foram registradas</h3>
        <ul className="resumo-lista doc-lista">
          <li>{marcas.lote === 0 ? "Nenhum item marcado em lote." : `${quantidade(marcas.lote, "item marcado", "itens marcados")} como Conforme em lote (resposta em bloco, não individual).`}</li>
          <li>{marcas.porVoz === 0 ? "Nenhuma resposta por voz." : `${quantidade(marcas.porVoz, "resposta registrada", "respostas registradas")} por voz (conferidas pelo RT antes de gravar).`}</li>
          <li>{marcas.avancoAutomatico === 0 ? "Nenhuma resposta seguida do avanço automático." : `${quantidade(marcas.avancoAutomatico, "resposta seguida", "respostas seguidas")} do avanço automático (a resposta foi individual do RT; só a tela avançou sozinha).`}</li>
          <li>{marcas.gravidadeSugeridaMantida === 0 ? "Nenhuma gravidade sugerida pelo app foi mantida sem troca." : `Gravidade sugerida pelo app e mantida pelo RT em ${marcas.gravidadeSugeridaMantida} de ${quantidade(marcas.naoConformes, "não conformidade", "não conformidades")}.`}</li>
          <li>Fonte das perguntas: {quantidade(fontes.derivadas, "derivada do Manual", "derivadas do Manual")}, {quantidade(fontes.parciais, "parcial", "parciais")} e {quantidade(fontes.semFonte, "com “Fonte não registrada”", "com “Fonte não registrada”")}.</li>
        </ul>
        {linhasDeTemperatura.length > 0 && (
          <>
            <p className="resumo-texto"><strong>Temperaturas medidas e classificadas pelo app</strong> (limite da norma, item e data de conferência):</p>
            <ul className="resumo-lista doc-lista">
              {linhasDeTemperatura.map((linha) => (
                <li key={linha}>{linha}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      {mapa.length > 0 && (
        <section className="doc-secao" aria-label="Mapa de risco por ambiente">
          <h3 className="resumo-sub">Mapa de risco por ambiente ({dados.criterio})</h3>
          <div className="mr-grade">
            {mapa.map((cartao) => (
              <CartaoDeRiscoVista key={cartao.ambiente} cartao={cartao} />
            ))}
          </div>
          <RegraDoMapa />
        </section>
      )}

      <section className="doc-secao mr-parecer" aria-label="Parecer do RT">
        <h3 className="resumo-sub">Parecer do RT</h3>
        {parecer}
      </section>
    </div>
  );
}
