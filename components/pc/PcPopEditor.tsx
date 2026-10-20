"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ConteudoPop, Empresa, PassoPop, ProcedimentoOperacionalPadronizado, UsuarioSistema } from "@/types";
import FieldVoiceTools from "@/components/FieldVoiceTools";
import { Pill } from "@/components/ui/Pill";
import PcRegistrosDoPop from "@/components/pc/PcRegistrosDoPop";
import { useRegistrosDaEmpresa } from "@/components/RegistrosEmpresaContext";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import {
  CONJUNTO_DA_NORMA,
  MENSAGEM_NORMA_ALTERADA,
  compararVersoes,
  conteudoEmBranco,
  faltasParaEnviar,
  motivoParaNaoAprovar,
  podeAprovarPop,
  popPrecisaRevisarPorNorma,
  situacaoDoPop,
  textoDaFaixaDoTextoBase,
} from "@/lib/popsNorma";
import { normasDaEmpresa } from "@/lib/normas";

type Aba = "procedimento" | "versoes" | "registros";
type Secao = "identificacao" | "objetivo" | "referencias" | "responsavel" | "passos" | "acao" | "registro" | "extra" | "extra2";

type Props = {
  pop: ProcedimentoOperacionalPadronizado;
  empresa: Pick<Empresa, "normasAplicadas" | "responsavelEstabelecimento">;
  usuario: UsuarioSistema | null;
  podeEditar: boolean;
  onSalvarRascunho: (pop: ProcedimentoOperacionalPadronizado) => void;
  onEnviar: (pop: ProcedimentoOperacionalPadronizado) => void;
  onAprovar: (pop: ProcedimentoOperacionalPadronizado) => void;
  onNovaVersao: (pop: ProcedimentoOperacionalPadronizado) => void;
  onVoltar: () => void;
  mensagem?: string;
};

function SecaoRecolhivel({ id, titulo, resumo, aberta, onAlternar, children }: { id: Secao; titulo: string; resumo?: string; aberta: boolean; onAlternar: (id: Secao) => void; children: ReactNode }) {
  return (
    <section className={`pop-secao${aberta ? " is-aberta" : ""}`}>
      <button type="button" className="pop-secao-topo" aria-expanded={aberta} onClick={() => onAlternar(id)}>
        <span className="pop-secao-titulo">{titulo}</span>
        {resumo && <span className="ui-row-sub pop-secao-resumo">{resumo}</span>}
        <span aria-hidden="true">{aberta ? "▴" : "▾"}</span>
      </button>
      {aberta && <div className="pop-secao-corpo">{children}</div>}
    </section>
  );
}

function Campo({ rotulo, valor, onChange, linhas, desabilitado, erro, tipo = "texto", dica }: { rotulo: string; valor: string; onChange: (valor: string) => void; linhas?: number; desabilitado?: boolean; erro?: string; tipo?: "texto" | "data"; dica?: string }) {
  return (
    <label className="pc-field">
      <span className="ui-eyebrow">{rotulo}</span>
      {linhas ? (
        <textarea className={`ui-input pop-area${erro ? " is-invalid" : ""}`} rows={linhas} value={valor} disabled={desabilitado} onChange={(evento) => onChange(evento.target.value)} aria-invalid={Boolean(erro)} />
      ) : (
        <input type={tipo === "data" ? "date" : "text"} className={`ui-input${erro ? " is-invalid" : ""}`} value={valor} disabled={desabilitado} onChange={(evento) => onChange(evento.target.value)} aria-invalid={Boolean(erro)} />
      )}
      {erro ? <span className="ui-field-error">{erro}</span> : dica ? <span className="ui-row-sub">{dica}</span> : null}
    </label>
  );
}

function umAnoDepois(): string {
  const data = new Date();
  data.setFullYear(data.getFullYear() + 1);
  return data.toISOString().slice(0, 10);
}

// Passos em páginas: 4 (duas colunas) no computador, 2 em telas estreitas.
const passosPorPagina = (largo: boolean) => (largo ? 4 : 2);

// POP em campos: Procedimento e Versões. Registros e Treinamento aparecem como "em breve".
export default function PcPopEditor({ pop, empresa, usuario, podeEditar, onSalvarRascunho, onEnviar, onAprovar, onNovaVersao, onVoltar, mensagem }: Props) {
  const [rascunho, setRascunho] = useState<ProcedimentoOperacionalPadronizado>(pop);
  const temRegistros = Boolean(useRegistrosDaEmpresa());
  const [aba, setAba] = useState<Aba>("procedimento");
  const [secao, setSecao] = useState<Secao | null>("passos");
  const [emBreve, setEmBreve] = useState("");
  const [tocado, setTocado] = useState(false);
  // Com muitos passos a lista não rola por dentro do editor: eles ficam em páginas.
  const [paginaPassos, setPaginaPassos] = useState(0);
  const [paginaRefs, setPaginaRefs] = useState(0);
  const [largo, setLargo] = useState(true);
  useEffect(() => {
    const consulta = window.matchMedia("(min-width: 900px)");
    const aplicar = () => setLargo(consulta.matches);
    aplicar();
    consulta.addEventListener("change", aplicar);
    return () => consulta.removeEventListener("change", aplicar);
  }, []);
  const PASSOS_POR_PAGINA = passosPorPagina(largo);
  const REFS_POR_PAGINA = passosPorPagina(largo);
  const [versaoA, setVersaoA] = useState("");
  const [versaoB, setVersaoB] = useState("");

  const definicao = CONJUNTO_DA_NORMA.find((item) => item.catalogoId === rascunho.catalogoId);
  const conteudo: ConteudoPop = rascunho.conteudo || conteudoEmBranco(definicao || CONJUNTO_DA_NORMA[0], []);
  const totalDePaginasDosPassos = Math.max(1, Math.ceil((conteudo.passos || []).length / PASSOS_POR_PAGINA));
  const paginaDosPassos = Math.min(paginaPassos, totalDePaginasDosPassos - 1);
  const totalDePaginasDasRefs = Math.max(1, Math.ceil((conteudo.referencias || []).length / REFS_POR_PAGINA));
  const paginaDasRefs = Math.min(paginaRefs, totalDePaginasDasRefs - 1);
  const situacao = situacaoDoPop(rascunho);
  const editavel = podeEditar && (rascunho.status === "Rascunho");
  const faltas = faltasParaEnviar(rascunho);
  const normas = normasDaEmpresa(empresa);
  const exigeAcaoCorretivaSes = normas.some((norma) => norma.id === "ses-799-2023-rs");
  const podeAprovar = podeAprovarPop(usuario, empresa);
  const aguardando = rascunho.status === "Aguardando aprovação" || rascunho.status === "Em revisão";
  const alterou = JSON.stringify(rascunho) !== JSON.stringify(pop);

  function mudar(alteracao: Partial<ConteudoPop>) {
    setRascunho((atual) => ({ ...atual, conteudo: { ...(atual.conteudo || conteudo), ...alteracao } }));
  }
  function mudarPasso(id: string, texto: string) {
    mudar({ passos: (conteudo.passos || []).map((passo) => (passo.id === id ? { ...passo, texto } : passo)) });
  }
  function moverPasso(indice: number, delta: -1 | 1) {
    const lista = [...(conteudo.passos || [])];
    const alvo = indice + delta;
    if (alvo < 0 || alvo >= lista.length) return;
    [lista[indice], lista[alvo]] = [lista[alvo], lista[indice]];
    mudar({ passos: lista });
    setPaginaPassos(Math.floor(alvo / PASSOS_POR_PAGINA));
  }
  const alternar = (id: Secao) => setSecao(id);

  const versoes = useMemo(() => {
    const guardadas = rascunho.versoes || [];
    const atual = { versao: rascunho.versao, status: rascunho.status, conteudo: rascunho.conteudo, aprovacao: rascunho.aprovacao, criadaEm: "" };
    return guardadas.some((versao) => versao.versao === rascunho.versao) ? guardadas : [...guardadas, atual];
  }, [rascunho]);
  const escolhidaA = versoes.find((versao) => versao.versao === versaoA) || versoes[0];
  const escolhidaB = versoes.find((versao) => versao.versao === versaoB) || versoes[versoes.length - 1];
  const comparacao = escolhidaA && escolhidaB ? compararVersoes(escolhidaA.conteudo, escolhidaB.conteudo) : [];

  const erroTitulo = !rascunho.titulo.trim() ? "Informe o título do POP." : "";

  return (
    <section className="ui-screen pop-editor" aria-label="POP em campos">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">{`${rascunho.codigo ? `${rascunho.codigo} · ` : ""}${rascunho.titulo || "POP"}`}</h1>
          <div className="pc-badges">
            <Pill tom={situacao === "Aprovado" ? "ok" : situacao === "Vencido" ? "nc" : situacao === "Aguardando aprovação" ? "info" : "pend"}>{situacao}</Pill>
            <Pill tom="na">versão {rascunho.versao}</Pill>
            {popPrecisaRevisarPorNorma(rascunho) && <span className="pop-revisar">Revisar</span>}
          </div>
        </div>
        <button type="button" className="ui-btn ui-btn--secondary" onClick={onVoltar}>
          ← Voltar
        </button>
      </div>

      {rascunho.origemTextoBase && rascunho.status === "Rascunho" && (
        <div className="priv-faixa" role="status">
          <span>{textoDaFaixaDoTextoBase(rascunho)}</span>
        </div>
      )}
      {popPrecisaRevisarPorNorma(rascunho) && (
        <div className="priv-faixa" role="status">
          <span>{MENSAGEM_NORMA_ALTERADA}</span>
        </div>
      )}

      <div className="pop-abas">
        <SegmentedTabs<Aba>
          rotulo="Partes do POP"
          valor={aba}
          onChange={setAba}
          abas={[
            { id: "procedimento", rotulo: "Procedimento" },
            { id: "versoes", rotulo: "Versões", contagem: versoes.length },
            ...(temRegistros ? [{ id: "registros" as const, rotulo: "Registros" }] : []),
          ]}
        />
        <button type="button" className="pop-aba-breve" onClick={() => setEmBreve("Treinamento")}>
          Treinamento <span className="em-breve">em breve</span>
        </button>
      </div>
      {emBreve && <p className="ui-row-sub pop-breve-nota">{emBreve} ainda não está disponível: fica para um próximo pacote.</p>}

      {aba === "procedimento" && (
        <div className="pop-secoes">
          <SecaoRecolhivel id="identificacao" titulo="Identificação" resumo={rascunho.proximaRevisao ? `revisar até ${rascunho.proximaRevisao.split("-").reverse().join("/")}` : "revisar até: não definido"} aberta={secao === "identificacao"} onAlternar={alternar}>
            <div className="pop-grade">
              <Campo rotulo="Código" valor={rascunho.codigo} desabilitado={!editavel} onChange={(valor) => setRascunho({ ...rascunho, codigo: valor })} />
              <Campo rotulo="Título" valor={rascunho.titulo} desabilitado={!editavel} erro={tocado ? erroTitulo : ""} onChange={(valor) => setRascunho({ ...rascunho, titulo: valor })} />
              <div className="pc-field">
                <Campo rotulo="Revisar até" tipo="data" valor={rascunho.proximaRevisao} desabilitado={!podeEditar} onChange={(valor) => setRascunho({ ...rascunho, proximaRevisao: valor })} dica="Passou da data, o POP aprovado vira Vencido. A norma da empresa define os prazos mínimos." />
                {podeEditar && (
                  <button type="button" className="ui-btn ui-btn--soft ui-btn--small" onClick={() => setRascunho({ ...rascunho, proximaRevisao: umAnoDepois() })}>
                    Sugerir revisão anual
                  </button>
                )}
              </div>
            </div>
          </SecaoRecolhivel>

          <SecaoRecolhivel id="objetivo" titulo="Objetivo e aplicação" resumo={conteudo.objetivo ? "preenchido" : "em branco"} aberta={secao === "objetivo"} onAlternar={alternar}>
            <Campo rotulo="Objetivo" linhas={2} valor={conteudo.objetivo || ""} desabilitado={!editavel} onChange={(valor) => mudar({ objetivo: valor })} />
            <Campo rotulo="Campo de aplicação" linhas={2} valor={conteudo.campoAplicacao || ""} desabilitado={!editavel} onChange={(valor) => mudar({ campoAplicacao: valor })} />
          </SecaoRecolhivel>

          <SecaoRecolhivel id="referencias" titulo="Referências" resumo={`${(conteudo.referencias || []).length} da norma`} aberta={secao === "referencias"} onAlternar={alternar}>
            {(conteudo.referencias || []).length === 0 ? (
              <p className="ui-row-sub">Este POP não veio de uma norma do catálogo.</p>
            ) : (
              <>
              <ul className="pop-refs">
                {(conteudo.referencias || []).map((ref, indice) => ({ ref, indice })).slice(paginaDasRefs * REFS_POR_PAGINA, (paginaDasRefs + 1) * REFS_POR_PAGINA).map(({ ref, indice }) => (
                  <li key={`${ref.norma}-${ref.item}-${indice}`}>
                    <span className="pop-ref-titulo">
                      {ref.norma} · {ref.item} <span className="em-breve">vem da norma</span>
                      {ref.conferir && <span className="em-breve pop-conferir">conferir</span>}
                    </span>
                    <span className="ui-row-sub pop-ref-texto" title={ref.orientacao}>{ref.orientacao}</span>
                  </li>
                ))}
              </ul>
              {totalDePaginasDasRefs > 1 && (
                <div className="pop-passos-pagina" role="group" aria-label="Páginas das referências">
                  <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" disabled={paginaDasRefs === 0} onClick={() => setPaginaRefs(paginaDasRefs - 1)}>
                    ‹ Anteriores
                  </button>
                  <span className="ui-row-sub">
                    Referências {paginaDasRefs * REFS_POR_PAGINA + 1} a {Math.min((paginaDasRefs + 1) * REFS_POR_PAGINA, (conteudo.referencias || []).length)} de {(conteudo.referencias || []).length}
                  </span>
                  <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" disabled={paginaDasRefs >= totalDePaginasDasRefs - 1} onClick={() => setPaginaRefs(paginaDasRefs + 1)}>
                    Próximas ›
                  </button>
                </div>
              )}
              </>
            )}
          </SecaoRecolhivel>

          <SecaoRecolhivel id="responsavel" titulo="Responsável e frequência" resumo={conteudo.responsavelExecucao?.nome ? `${conteudo.responsavelExecucao.nome}${conteudo.frequencia ? ` · ${conteudo.frequencia}` : ""}` : "em branco"} aberta={secao === "responsavel"} onAlternar={alternar}>
            <div className="pop-grade">
              <Campo rotulo="Responsável pela execução (nome)" valor={conteudo.responsavelExecucao?.nome || ""} desabilitado={!editavel} erro={tocado && !(conteudo.responsavelExecucao?.nome || "").trim() ? "Informe o nome." : ""} onChange={(valor) => mudar({ responsavelExecucao: { nome: valor, cargo: conteudo.responsavelExecucao?.cargo || "" } })} />
              <Campo rotulo="Cargo ou função" valor={conteudo.responsavelExecucao?.cargo || ""} desabilitado={!editavel} erro={tocado && !(conteudo.responsavelExecucao?.cargo || "").trim() ? "Informe o cargo ou a função." : ""} onChange={(valor) => mudar({ responsavelExecucao: { nome: conteudo.responsavelExecucao?.nome || "", cargo: valor } })} />
              <Campo rotulo="Frequência" valor={conteudo.frequencia || ""} desabilitado={!editavel} erro={tocado && !(conteudo.frequencia || "").trim() ? "Informe a frequência." : ""} onChange={(valor) => mudar({ frequencia: valor })} />
            </div>
          </SecaoRecolhivel>

          <SecaoRecolhivel id="passos" titulo="Passos" resumo={`${(conteudo.passos || []).filter((passo) => passo.texto.trim()).length} escrito(s)`} aberta={secao === "passos"} onAlternar={alternar}>
            <ol className="pop-passos">
              {(conteudo.passos || []).map((passo: PassoPop, indice) => ({ passo, indice })).slice(paginaDosPassos * PASSOS_POR_PAGINA, (paginaDosPassos + 1) * PASSOS_POR_PAGINA).map(({ passo, indice }) => (
                <li key={passo.id} className="pop-passo">
                  <span className="pop-passo-n">{indice + 1}</span>
                  <span className="ui-field-wrap pop-passo-campo">
                    <textarea className="ui-input pop-area pc-input-tools" rows={2} value={passo.texto} disabled={!editavel} aria-label={`Passo ${indice + 1}`} onChange={(evento) => mudarPasso(passo.id, evento.target.value)} />
                    {editavel && (
                      <span className="ui-field-tools">
                        <FieldVoiceTools fieldKey={`pop-passo-${passo.id}`} value={passo.texto} onChange={(texto) => mudarPasso(passo.id, texto)} contexto="Passo de um Procedimento Operacional Padronizado de segurança dos alimentos." />
                      </span>
                    )}
                  </span>
                  {editavel && (
                    <span className="pop-passo-acoes">
                      <button type="button" className="ui-btn ui-btn--soft ui-btn--small" aria-label={`Subir o passo ${indice + 1}`} disabled={indice === 0} onClick={() => moverPasso(indice, -1)}>↑</button>
                      <button type="button" className="ui-btn ui-btn--soft ui-btn--small" aria-label={`Descer o passo ${indice + 1}`} disabled={indice === (conteudo.passos || []).length - 1} onClick={() => moverPasso(indice, 1)}>↓</button>
                      <button type="button" className="ui-btn ui-btn--soft ui-btn--small" aria-label={`Remover o passo ${indice + 1}`} title="Remover o passo" onClick={() => mudar({ passos: (conteudo.passos || []).filter((item) => item.id !== passo.id) })}>✕</button>
                    </span>
                  )}
                </li>
              ))}
            </ol>
            {(conteudo.passos || []).length === 0 && <p className="ui-row-sub">Nenhum passo ainda. Os passos ficam em branco para o RT e a empresa preencherem.</p>}
            {tocado && !(conteudo.passos || []).some((passo) => passo.texto.trim()) && <span className="ui-field-error">Escreva ao menos um passo.</span>}
            <div className="pop-passos-pagina" role="group" aria-label="Páginas dos passos">
              {totalDePaginasDosPassos > 1 && (
                <>
                  <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" disabled={paginaDosPassos === 0} onClick={() => setPaginaPassos(paginaDosPassos - 1)}>
                    ‹ Anteriores
                  </button>
                  <span className="ui-row-sub">
                    Passos {paginaDosPassos * PASSOS_POR_PAGINA + 1} a {Math.min((paginaDosPassos + 1) * PASSOS_POR_PAGINA, (conteudo.passos || []).length)} de {(conteudo.passos || []).length}
                  </span>
                  <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" disabled={paginaDosPassos >= totalDePaginasDosPassos - 1} onClick={() => setPaginaPassos(paginaDosPassos + 1)}>
                    Próximos ›
                  </button>
                </>
              )}
              {editavel && (
                <button
                  type="button"
                  className="ui-btn ui-btn--criar ui-btn--small"
                  onClick={() => {
                    const novos = [...(conteudo.passos || []), { id: crypto.randomUUID(), texto: "" }];
                    mudar({ passos: novos });
                    setPaginaPassos(Math.ceil(novos.length / PASSOS_POR_PAGINA) - 1);
                  }}
                >
                  + Adicionar passo
                </button>
              )}
            </div>
          </SecaoRecolhivel>

          <SecaoRecolhivel id="acao" titulo="Ação corretiva e registro" resumo={conteudo.acaoCorretiva ? "preenchida" : exigeAcaoCorretivaSes ? "exigida na SES 799/2023" : "em branco"} aberta={secao === "acao"} onAlternar={alternar}>
            {exigeAcaoCorretivaSes && <p className="ui-row-sub">Exigido na SES 799/2023, Anexo II, 13.2.</p>}
            <Campo rotulo="Ação corretiva" linhas={3} valor={conteudo.acaoCorretiva || ""} desabilitado={!editavel} onChange={(valor) => mudar({ acaoCorretiva: valor })} />
            <Campo rotulo="Registro que prova a execução (opcional)" valor={conteudo.registroProva || ""} desabilitado={!editavel} onChange={(valor) => mudar({ registroProva: valor })} dica="A lista de registros por POP fica para um próximo pacote." />
          </SecaoRecolhivel>

          {definicao?.bloco === "higienizacao" && conteudo.higienizacao && (
            <SecaoRecolhivel id="extra" titulo={definicao.eReservatorio ? "Higienização do reservatório" : "Higienização das instalações"} resumo="superfície, método, produto" aberta={secao === "extra"} onAlternar={alternar}>
              <div className="pop-grade">
                {(
                  [
                    ["superficie", "Superfície"],
                    ["metodo", "Método"],
                    ["produto", "Produto"],
                    ["principioAtivo", "Princípio ativo"],
                    ["concentracao", "Concentração"],
                    ["tempoContato", "Tempo de contato"],
                    ["temperatura", "Temperatura"],
                  ] as const
                ).map(([chave, rotulo]) => (
                  <Campo key={chave} rotulo={rotulo} valor={conteudo.higienizacao![chave]} desabilitado={!editavel} onChange={(valor) => mudar({ higienizacao: { ...conteudo.higienizacao!, [chave]: valor } })} />
                ))}
              </div>
            </SecaoRecolhivel>
          )}

          {definicao?.bloco === "pragas" && conteudo.pragas && (
            <SecaoRecolhivel id="extra" titulo="Controle de pragas" resumo="medidas e comprovante" aberta={secao === "extra"} onAlternar={alternar}>
              <Campo rotulo="Medidas preventivas" linhas={2} valor={conteudo.pragas.preventivas} desabilitado={!editavel} onChange={(valor) => mudar({ pragas: { ...conteudo.pragas!, preventivas: valor } })} />
              <Campo rotulo="Medidas corretivas" linhas={2} valor={conteudo.pragas.corretivas} desabilitado={!editavel} onChange={(valor) => mudar({ pragas: { ...conteudo.pragas!, corretivas: valor } })} />
              <Campo rotulo="Comprovante da empresa especializada (opcional)" valor={conteudo.pragas.comprovanteEmpresa} desabilitado={!editavel} onChange={(valor) => mudar({ pragas: { ...conteudo.pragas!, comprovanteEmpresa: valor } })} dica="Com controle químico, a norma pede o comprovante de execução." />
            </SecaoRecolhivel>
          )}

          {definicao?.bloco === "manipuladores" && conteudo.manipuladores && (
            <>
            <SecaoRecolhivel id="extra" titulo="Higiene e saúde" resumo="mãos e sintomas" aberta={secao === "extra"} onAlternar={alternar}>
              <Campo rotulo="Lavagem e antissepsia das mãos: etapas" linhas={2} valor={conteudo.manipuladores.lavagemMaosEtapas} desabilitado={!editavel} onChange={(valor) => mudar({ manipuladores: { ...conteudo.manipuladores!, lavagemMaosEtapas: valor } })} />
              <Campo rotulo="Lavagem e antissepsia das mãos: frequência" valor={conteudo.manipuladores.lavagemMaosFrequencia} desabilitado={!editavel} onChange={(valor) => mudar({ manipuladores: { ...conteudo.manipuladores!, lavagemMaosFrequencia: valor } })} />
              <Campo rotulo="Medidas para lesões, sintomas ou suspeita de problema de saúde" linhas={2} valor={conteudo.manipuladores.lesoesSintomas} desabilitado={!editavel} onChange={(valor) => mudar({ manipuladores: { ...conteudo.manipuladores!, lesoesSintomas: valor } })} />
            </SecaoRecolhivel>
            <SecaoRecolhivel id="extra2" titulo="Exames e capacitação" resumo="exames e capacitação" aberta={secao === "extra2"} onAlternar={alternar}>
              <div className="pop-grade">
                <label className="pc-field">
                  <span className="ui-eyebrow">Exames: situação</span>
                  <select className="ui-input" value={conteudo.manipuladores.examesApto} disabled={!editavel} onChange={(evento) => mudar({ manipuladores: { ...conteudo.manipuladores!, examesApto: evento.target.value as "" | "apto" | "nao-apto" } })}>
                    <option value="">Não informado</option>
                    <option value="apto">Apto</option>
                    <option value="nao-apto">Não apto</option>
                  </select>
                </label>
                <Campo rotulo="Exames: válidos até" tipo="data" valor={conteudo.manipuladores.examesValidade} desabilitado={!editavel} onChange={(valor) => mudar({ manipuladores: { ...conteudo.manipuladores!, examesValidade: valor } })} />
                <Campo rotulo="Exames: periodicidade" valor={conteudo.manipuladores.examesPeriodicidade} desabilitado={!editavel} onChange={(valor) => mudar({ manipuladores: { ...conteudo.manipuladores!, examesPeriodicidade: valor } })} />
              </div>
              <p className="ui-row-sub">Guarde só “apto” e a validade. Nunca o laudo: é dado de saúde sensível.</p>
              <div className="pop-grade">
                <Campo rotulo="Capacitação: carga horária" valor={conteudo.manipuladores.capacitacaoCargaHoraria} desabilitado={!editavel} onChange={(valor) => mudar({ manipuladores: { ...conteudo.manipuladores!, capacitacaoCargaHoraria: valor } })} />
                <Campo rotulo="Capacitação: conteúdo" valor={conteudo.manipuladores.capacitacaoConteudo} desabilitado={!editavel} onChange={(valor) => mudar({ manipuladores: { ...conteudo.manipuladores!, capacitacaoConteudo: valor } })} />
                <Campo rotulo="Capacitação: frequência" valor={conteudo.manipuladores.capacitacaoFrequencia} desabilitado={!editavel} onChange={(valor) => mudar({ manipuladores: { ...conteudo.manipuladores!, capacitacaoFrequencia: valor } })} dica="O registro nominal fica para um próximo pacote." />
              </div>
            </SecaoRecolhivel>
            </>
          )}
        </div>
      )}

      {aba === "registros" && temRegistros && (
        <div className="pop-registros-area">
          <PcRegistrosDoPop pop={rascunho} />
        </div>
      )}

      {aba === "versoes" && (
        <div className="pop-versoes">
          <div className="ui-list">
            {versoes.map((versao) => (
              <div key={versao.versao} className="ui-card pop-versao-linha">
                <span className="pop-versao-n">v{versao.versao}</span>
                <span className="ui-row-sub">
                  {versao.status}
                  {versao.aprovacao ? ` · aprovada por ${versao.aprovacao.nome}${versao.aprovacao.cargo ? `, ${versao.aprovacao.cargo}` : ""} em ${new Date(versao.aprovacao.em).toLocaleDateString("pt-BR")}` : ""}
                </span>
              </div>
            ))}
          </div>
          {versoes.length >= 2 ? (
            <>
              <div className="pop-comparar-escolha">
                <label className="pc-field">
                  <span className="ui-eyebrow">Comparar</span>
                  <select className="ui-input" value={escolhidaA?.versao} onChange={(evento) => setVersaoA(evento.target.value)}>
                    {versoes.map((versao) => (
                      <option key={versao.versao} value={versao.versao}>v{versao.versao}</option>
                    ))}
                  </select>
                </label>
                <label className="pc-field">
                  <span className="ui-eyebrow">com</span>
                  <select className="ui-input" value={escolhidaB?.versao} onChange={(evento) => setVersaoB(evento.target.value)}>
                    {versoes.map((versao) => (
                      <option key={versao.versao} value={versao.versao}>v{versao.versao}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="pop-comparacao" role="table" aria-label="Comparação de versões">
                <div className="pop-comparacao-linha pop-comparacao-topo" role="row">
                  <span role="columnheader">Campo</span>
                  <span role="columnheader">v{escolhidaA?.versao}</span>
                  <span role="columnheader">v{escolhidaB?.versao}</span>
                </div>
                {comparacao.map((linha) => (
                  <div key={linha.campo} className={`pop-comparacao-linha${linha.igual ? "" : " is-diferente"}`} role="row">
                    <span role="cell">{linha.campo}</span>
                    <span role="cell">{linha.a || "—"}</span>
                    <span role="cell">{linha.b || "—"}</span>
                  </div>
                ))}
                {comparacao.length === 0 && <p className="ui-row-sub">As duas versões estão em branco.</p>}
              </div>
            </>
          ) : (
            <p className="ui-row-sub">Quando houver duas versões, dá para compará-las lado a lado.</p>
          )}
        </div>
      )}

      {mensagem && <div className="ui-note">{mensagem}</div>}
      {aguardando && !podeAprovar && <p className="ui-row-sub pop-aviso-aprovacao">{motivoParaNaoAprovar(usuario, empresa) || "Aguardando a aprovação do responsável do estabelecimento."}</p>}

      <div className="ui-footer pop-rodape">
        <span className="ui-row-sub">{alterou ? "● Alterações ainda não salvas" : "✓ Tudo salvo"}</span>
        <div className="pop-rodape-acoes">
          {podeEditar && rascunho.status === "Rascunho" && (
            <>
              <button type="button" className="ui-btn ui-btn--secondary" onClick={() => { setTocado(true); if (faltas.length === 0 && !erroTitulo) onEnviar(rascunho); }}>
                Enviar para aprovação
              </button>
              <button type="button" className="ui-btn ui-btn--save" disabled={Boolean(erroTitulo)} onClick={() => onSalvarRascunho(rascunho)}>
                Salvar rascunho
              </button>
            </>
          )}
          {aguardando && podeAprovar && (
            <button type="button" className="ui-btn ui-btn--save" onClick={() => onAprovar(rascunho)}>
              Aprovar e assinar
            </button>
          )}
          {podeEditar && (rascunho.status === "Aprovado") && (
            <button type="button" className="ui-btn ui-btn--criar" onClick={() => onNovaVersao(rascunho)}>
              Editar (cria nova versão)
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
