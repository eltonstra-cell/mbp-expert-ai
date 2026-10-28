"use client";

import Select from "@/components/Select";
import { useState } from "react";
import { ListRow } from "@/components/ui/ListRow";
import { Pill, type Tom } from "@/components/ui/Pill";
import { StatStrip } from "@/components/ui/StatStrip";
import type { LinhaPopVisita, SituacaoPopVisita } from "@/lib/pops";

type Props = {
  empresa: string;
  data: string;
  resumo: { totalNcs: number; ncsComPop: number; rascunho: number; aCriar: number; aprovados: number; semPop: number[] };
  linhas: LinhaPopVisita[];
  podeCriar: boolean;
  /** Empresa sem norma aplicada no cadastro: mensagem no lugar das sugestões. */
  semNorma?: string;
  /** NCs da visita e POPs do conjunto, para o "⋯ Trocar vínculo". */
  ncsDaVisita: { numero: number; titulo: string; ambiente: string; popCatalogoId: string }[];
  opcoesDeVinculo: { catalogoId: string; rotulo: string }[];
  /** catalogoId do POP, "nenhum" para sem POP ou "" para voltar ao padrão pela categoria. */
  onTrocarVinculo: (numero: number, catalogoId: string) => void;
  onCriar: (codigo: string) => void;
  onAbrir: () => void;
  onCriarTodos: () => void;
  onContinuar: () => void;
  onTodosPops: () => void;
};

const ROTULO: Record<SituacaoPopVisita, string> = {
  "a-criar": "A criar",
  rascunho: "Em rascunho",
  "em-revisao": "Em revisão",
  aprovado: "Aprovado",
  inativo: "Inativo",
};
const TOM: Record<SituacaoPopVisita, Tom> = { "a-criar": "nc", rascunho: "pend", "em-revisao": "info", aprovado: "ok", inativo: "na" };

const codigoNc = (n: number) => `NC${String(n).padStart(2, "0")}`;

// NC01 · título curto; com mais de duas, mostra as duas primeiras e quantas faltam.
function descricaoDasNcs(numeros: number[], titulos: Map<number, string>) {
  const nome = (n: number) => (titulos.get(n) ? `${codigoNc(n)} · ${titulos.get(n)}` : codigoNc(n));
  return numeros.length > 2 ? `${numeros.slice(0, 2).map(nome).join("; ")}; e mais ${numeros.length - 2}` : numeros.map(nome).join("; ");
}

export default function PcPopsVisita({ empresa, data, resumo, linhas, podeCriar, semNorma, ncsDaVisita, opcoesDeVinculo, onTrocarVinculo, onCriar, onAbrir, onCriarTodos, onContinuar, onTodosPops }: Props) {
  const [confirmando, setConfirmando] = useState(false);
  // Trocar vínculo abre direto a lista das NCs: as da linha escolhida ou, em "Sem POP sugerido", as sem POP.
  const [trocando, setTrocando] = useState<number[] | null>(null);
  const ncsParaTrocar = ncsDaVisita.filter((nc) => trocando?.includes(nc.numero));
  const faltantes = linhas.filter((linha) => linha.situacao === "a-criar");
  const titulosDasNcs = new Map(ncsDaVisita.map((nc) => [nc.numero, nc.titulo]));
  const motivoSemCriar = semNorma || (linhas.length === 0 ? "Nenhuma não conformidade com POP sugerido." : "Todos os POPs sugeridos já foram criados.");

  return (
    <section className="ui-screen" aria-label="POPs da visita">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">POPs da visita</h1>
          <p className="ui-subtitle">
            Procedimentos sugeridos para as não conformidades · {data}
          </p>
        </div>
        <div className="ui-head-actions">
          <button type="button" className="pc-link-btn" onClick={onTodosPops}>
            Ver todos os POPs da empresa →
          </button>
          {podeCriar && (
            <span className="pgl-criar">
              <button type="button" className="ui-btn ui-btn--criar" disabled={faltantes.length === 0} onClick={() => setConfirmando(true)}>
                {faltantes.length === 0 ? "Criar POPs de uma vez" : faltantes.length === 1 ? "Criar 1 POP de uma vez" : `Criar os ${faltantes.length} POPs de uma vez`}
              </button>
              {faltantes.length === 0 && <span className="pgl-motivo">{motivoSemCriar}</span>}
            </span>
          )}
        </div>
      </div>

      <StatStrip
        rotulo="Resumo dos POPs da visita"
        itens={[
          { rotulo: `NCs com POP sugerido ${resumo.ncsComPop} de ${resumo.totalNcs}`, valor: resumo.ncsComPop, tom: "info" },
          { rotulo: "Em rascunho", valor: resumo.rascunho, tom: "amber" },
          { rotulo: "A criar", valor: resumo.aCriar, tom: "nc" },
          { rotulo: "Aprovados", valor: resumo.aprovados, tom: "ok" },
        ]}
      />

      <div className="ui-scroll">
        {linhas.length === 0 ? (
          <div className="ui-empty">
            {semNorma
              ? semNorma
              : resumo.totalNcs === 0
                ? "Esta visita não tem não conformidades; não há POPs a sugerir."
                : "Nenhuma das não conformidades tem POP sugerido no conjunto da norma."}
          </div>
        ) : (
          <div className="ui-list">
            {linhas.map((linha) => (
              <ListRow
                key={linha.sugestao.codigo}
                faixa={TOM[linha.situacao]}
                icone={<span aria-hidden="true">≡</span>}
                titulo={linha.sugestao.titulo}
                secundario={`${linha.sugestao.codigo} · ${descricaoDasNcs(linha.ncs, titulosDasNcs)}`}
                pilulas={<Pill tom={TOM[linha.situacao]}>{ROTULO[linha.situacao]}</Pill>}
                menu={podeCriar ? [{ rotulo: "Trocar vínculo", onClick: () => setTrocando(linha.ncs) }] : undefined}
                acao={
                  linha.situacao === "a-criar" ? (
                    podeCriar ? (
                      <button type="button" className="ui-btn ui-btn--criar" onClick={() => onCriar(linha.sugestao.codigo)}>
                        Criar POP
                      </button>
                    ) : null
                  ) : (
                    <button type="button" className="ui-btn ui-btn--secondary" onClick={onAbrir}>
                      Abrir
                    </button>
                  )
                }
              />
            ))}
          </div>
        )}
        {resumo.semPop.length > 0 && (
          <p className="ui-row-sub pc-sem-pop">
            Sem POP sugerido: {resumo.semPop.map(codigoNc).join(", ")}. O conjunto da norma só relaciona POP a algumas categorias de não conformidade.
            {podeCriar && opcoesDeVinculo.length > 0 && (
              <>
                {" "}
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => setTrocando(resumo.semPop)}>
                  Vincular a um POP
                </button>
              </>
            )}
          </p>
        )}
      </div>

      <div className="ui-footer">
        <span className="ui-row-sub">Os POPs ficam na biblioteca da empresa e podem ser editados lá.</span>
        <div className="ui-footer-actions">
          <button type="button" className="ui-btn ui-btn--save" onClick={onContinuar}>
            Continuar para o Relatório →
          </button>
        </div>
      </div>

      {trocando && (
        <div className="pc-modal-layer" role="presentation">
          <div className="pc-modal-backdrop" onClick={() => setTrocando(null)} />
          <section className="pc-modal" role="dialog" aria-modal="true" aria-label="Trocar vínculo">
            <h2 className="pc-modal-title">Trocar vínculo</h2>
            <p className="ui-row-sub">Escolha o POP de cada não conformidade. A troca vale só para esta visita e é salva na hora.</p>
            <div className="pop-vinculo-lista">
              {ncsParaTrocar.map((nc) => (
                <label key={nc.numero} className="pc-field">
                  <span className="ui-eyebrow">
                    {codigoNc(nc.numero)} · {nc.titulo}
                    {nc.ambiente ? ` · ${nc.ambiente}` : ""}
                  </span>
                  <Select className="ui-input" value={nc.popCatalogoId} onChange={(evento) => onTrocarVinculo(nc.numero, evento.target.value)}>
                    <option value="">Padrão pela categoria</option>
                    {opcoesDeVinculo.map((opcao) => (
                      <option key={opcao.catalogoId} value={opcao.catalogoId}>
                        {opcao.rotulo}
                      </option>
                    ))}
                    <option value="nenhum">Sem POP</option>
                  </Select>
                </label>
              ))}
            </div>
            <div className="pc-modal-foot">
              <span />
              <div className="ui-footer-actions">
                <button type="button" className="ui-btn ui-btn--save" onClick={() => setTrocando(null)}>
                  Pronto
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {confirmando && (
        <div className="pc-modal-layer" role="presentation">
          <div className="pc-modal-backdrop" onClick={() => setConfirmando(false)} />
          <section className="pc-modal" role="dialog" aria-modal="true" aria-label="Criar os POPs de uma vez">
            <h2 className="pc-modal-title">Criar {faltantes.length} {faltantes.length === 1 ? "POP" : "POPs"} como rascunho?</h2>
            <p className="ui-row-sub">Só serão criados, do texto-base, os POPs do conjunto da norma que ainda não existem (estrutura e orientações, sem passos redigidos). Nenhum POP existente é alterado.</p>
            <ul className="pc-modal-ul">
              {faltantes.map((linha) => (
                <li key={linha.sugestao.codigo}>
                  {linha.sugestao.codigo} · {linha.sugestao.titulo}
                </li>
              ))}
            </ul>
            <div className="pc-modal-foot">
              <span />
              <div className="ui-footer-actions">
                <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setConfirmando(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn--criar"
                  onClick={() => {
                    onCriarTodos();
                    setConfirmando(false);
                  }}
                >
                  Criar rascunhos
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
