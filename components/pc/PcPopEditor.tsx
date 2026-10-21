"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { ConteudoPop, Empresa, PassoPop, ProcedimentoOperacionalPadronizado, UsuarioSistema } from "@/types";
import FieldVoiceTools from "@/components/FieldVoiceTools";
import {
  CONJUNTO_DA_NORMA,
  MENSAGEM_NORMA_ALTERADA,
  compararVersoes,
  conteudoEmBranco,
  faltasParaEnviar,
  juntarPassosEmBrancoRepetidos,
  limparPassosEmBranco,
  motivoParaNaoAprovar,
  podeAprovarPop,
  popPrecisaRevisarPorNorma,
  textoDaFaixaDoTextoBase,
} from "@/lib/popsNorma";
import { normasDaEmpresa } from "@/lib/normas";

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
  mensagem?: string;
  /** Documento (editor) ou Histórico (versões, aprovações e motivo). O cabeçalho e as abas ficam na ficha do POP. */
  parte?: "documento" | "historico";
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

// Cargo sem vírgula, ponto ou espaço no começo (digitando).
const semPontuacaoNoInicio = (valor: string) => valor.replace(/^[\s,;:.\-–]+/, "");

function horaCerta(): string {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// Documento (editor em painéis) e Histórico (versões, aprovações e motivo) do POP. O cabeçalho e as abas ficam na ficha (PcFichaPop).
export default function PcPopEditor({ pop, empresa, usuario, podeEditar, onSalvarRascunho, onEnviar, onAprovar, onNovaVersao, mensagem, parte = "documento" }: Props) {
  // Mais de um passo em branco vira um só logo ao abrir.
  const [rascunho, setRascunho] = useState<ProcedimentoOperacionalPadronizado>(() => (pop.conteudo?.passos ? { ...pop, conteudo: { ...pop.conteudo, passos: juntarPassosEmBrancoRepetidos(pop.conteudo.passos) } } : pop));
  const [motivoDaNovaVersao, setMotivoDaNovaVersao] = useState("");
  const [secao, setSecao] = useState<Secao | null>("passos");
  const [tocado, setTocado] = useState(false);
  const [passoEmFoco, setPassoEmFoco] = useState<string | null>(null);
  const [passosTocados, setPassosTocados] = useState<Record<string, boolean>>({});
  const [salvoEm, setSalvoEm] = useState("");
  const [confirmandoAprovacao, setConfirmandoAprovacao] = useState(false);
  const [versaoA, setVersaoA] = useState("");
  const [versaoB, setVersaoB] = useState("");

  const definicao = CONJUNTO_DA_NORMA.find((item) => item.catalogoId === rascunho.catalogoId);
  const conteudo: ConteudoPop = rascunho.conteudo || conteudoEmBranco(definicao || CONJUNTO_DA_NORMA[0], []);
  const passos = conteudo.passos || [];
  const temPassoEmBranco = passos.some((passo) => !passo.texto.trim());
  const passoFocado = passos.find((passo) => passo.id === passoEmFoco);
  const editavel = podeEditar && (rascunho.status === "Rascunho");
  const faltas = faltasParaEnviar(rascunho);
  const normas = normasDaEmpresa(empresa);
  const exigeAcaoCorretivaSes = normas.some((norma) => norma.id === "ses-799-2023-rs");
  const podeAprovar = podeAprovarPop(usuario, empresa);
  const aguardando = rascunho.status === "Aguardando aprovação" || rascunho.status === "Em revisão";
  const alterou = JSON.stringify(rascunho) !== JSON.stringify(pop);

  function mudar(alteracao: Partial<ConteudoPop>) {
    setSalvoEm("");
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
  }
  const alternar = (id: Secao) => setSecao(id);

  const versoes = useMemo(() => {
    const guardadas = rascunho.versoes || [];
    const atual = { versao: rascunho.versao, status: rascunho.status, conteudo: rascunho.conteudo, aprovacao: rascunho.aprovacao, criadaEm: "", motivo: rascunho.motivoDaVersao };
    return guardadas.some((versao) => versao.versao === rascunho.versao) ? guardadas : [...guardadas, atual];
  }, [rascunho]);
  const escolhidaA = versoes.find((versao) => versao.versao === versaoA) || versoes[0];
  const escolhidaB = versoes.find((versao) => versao.versao === versaoB) || versoes[versoes.length - 1];
  const comparacao = escolhidaA && escolhidaB ? compararVersoes(escolhidaA.conteudo, escolhidaB.conteudo) : [];

  const erroTitulo = !rascunho.titulo.trim() ? "Informe o título do POP." : "";

  return (
    <section className="pop-editor pop-editor--ficha" aria-label={parte === "historico" ? "Histórico do POP" : "Documento do POP"}>
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

      {parte === "documento" && (
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
              <ul className="pop-refs pop-refs--rolagem">
                {(conteudo.referencias || []).map((ref, indice) => (
                  <li key={`${ref.norma}-${ref.item}-${indice}`}>
                    <span className="pop-ref-titulo">
                      {ref.norma} · {ref.item} <span className="em-breve">vem da norma</span>
                      {ref.conferir && <span className="em-breve pop-conferir">conferir</span>}
                    </span>
                    <span className="ui-row-sub pop-ref-texto" title={ref.orientacao}>{ref.orientacao}</span>
                  </li>
                ))}
              </ul>
            )}
          </SecaoRecolhivel>

          <SecaoRecolhivel id="responsavel" titulo="Responsável e frequência" resumo={conteudo.responsavelExecucao?.nome ? `${conteudo.responsavelExecucao.nome}${conteudo.frequencia ? ` · ${conteudo.frequencia}` : ""}` : "em branco"} aberta={secao === "responsavel"} onAlternar={alternar}>
            <div className="pop-grade">
              <Campo rotulo="Responsável pela execução (nome)" valor={conteudo.responsavelExecucao?.nome || ""} desabilitado={!editavel} erro={tocado && !(conteudo.responsavelExecucao?.nome || "").trim() ? "Informe o nome." : ""} onChange={(valor) => mudar({ responsavelExecucao: { nome: valor, cargo: conteudo.responsavelExecucao?.cargo || "" } })} />
              <Campo rotulo="Cargo ou função" valor={conteudo.responsavelExecucao?.cargo || ""} desabilitado={!editavel} erro={tocado && !(conteudo.responsavelExecucao?.cargo || "").trim() ? "Informe o cargo ou a função." : ""} onChange={(valor) => mudar({ responsavelExecucao: { nome: conteudo.responsavelExecucao?.nome || "", cargo: semPontuacaoNoInicio(valor) } })} />
              <Campo rotulo="Frequência" valor={conteudo.frequencia || ""} desabilitado={!editavel} erro={tocado && !(conteudo.frequencia || "").trim() ? "Informe a frequência." : ""} onChange={(valor) => mudar({ frequencia: valor })} />
            </div>
          </SecaoRecolhivel>

          <SecaoRecolhivel id="passos" titulo="Passos" resumo={`${(conteudo.passos || []).filter((passo) => passo.texto.trim()).length === 1 ? "1 escrito" : `${(conteudo.passos || []).filter((passo) => passo.texto.trim()).length} escritos`}`} aberta={secao === "passos"} onAlternar={alternar}>
            {editavel && (
              <div className="pop-passos-barra">
                <span className="ui-row-sub">{passoFocado ? `Passo ${passos.indexOf(passoFocado) + 1} em foco` : "Toque em um passo para ditar ou melhorar o texto"}</span>
                <span className="pop-passos-barra-acoes">
                  {passoFocado && (
                    <FieldVoiceTools key={passoFocado.id} fieldKey={`pop-passo-${passoFocado.id}`} value={passoFocado.texto} onChange={(texto) => mudarPasso(passoFocado.id, texto)} contexto="Passo de um Procedimento Operacional Padronizado de segurança dos alimentos." />
                  )}
                  <button
                    type="button"
                    className="ui-btn ui-btn--criar ui-btn--small"
                    disabled={temPassoEmBranco}
                    title={temPassoEmBranco ? "Escreva o passo em branco antes de adicionar outro" : undefined}
                    onClick={() => {
                      const novo = { id: crypto.randomUUID(), texto: "" };
                      mudar({ passos: [...passos, novo] });
                      setPassoEmFoco(novo.id);
                    }}
                  >
                    + Adicionar passo
                  </button>
                </span>
              </div>
            )}
            {editavel && temPassoEmBranco && <span className="ui-row-sub">Escreva o passo em branco antes de adicionar outro.</span>}
            <ol className="pop-passos pop-passos--rolagem">
              {passos.map((passo: PassoPop, indice) => {
                const vazio = !passo.texto.trim();
                const avisar = vazio && (tocado || passosTocados[passo.id]);
                return (
                  <li key={passo.id} className={`pop-passo${passo.id === passoEmFoco ? " is-foco" : ""}`}>
                    <span className="pop-passo-n">{indice + 1}</span>
                    <span className="pop-passo-campo">
                      <textarea
                        className={`ui-input pop-area${avisar ? " is-invalid" : ""}`}
                        rows={2}
                        value={passo.texto}
                        disabled={!editavel}
                        aria-label={`Passo ${indice + 1}`}
                        aria-invalid={Boolean(avisar)}
                        onFocus={() => setPassoEmFoco(passo.id)}
                        onBlur={() => setPassosTocados((atual) => ({ ...atual, [passo.id]: true }))}
                        onChange={(evento) => mudarPasso(passo.id, evento.target.value)}
                      />
                      {avisar && <span className="ui-field-error">Escreva este passo ou remova.</span>}
                    </span>
                    {editavel && (
                      <span className="pop-passo-acoes">
                        <button type="button" className="ui-btn ui-btn--soft ui-btn--small" aria-label={`Subir o passo ${indice + 1}`} disabled={indice === 0} onClick={() => moverPasso(indice, -1)}>↑</button>
                        <button type="button" className="ui-btn ui-btn--soft ui-btn--small" aria-label={`Descer o passo ${indice + 1}`} disabled={indice === passos.length - 1} onClick={() => moverPasso(indice, 1)}>↓</button>
                        <button type="button" className="ui-btn ui-btn--soft ui-btn--small" aria-label={`Remover o passo ${indice + 1}`} title="Remover o passo" onClick={() => mudar({ passos: passos.filter((item) => item.id !== passo.id) })}>✕</button>
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
            {passos.length === 0 && <p className="ui-row-sub">Nenhum passo ainda. Os passos ficam em branco para o RT e a empresa preencherem.</p>}
            {tocado && !passos.some((passo) => passo.texto.trim()) && <span className="ui-field-error">Escreva ao menos um passo.</span>}
            {tocado && temPassoEmBranco && passos.some((passo) => passo.texto.trim()) && (
              <span className="ui-field-error">
                Há passo em branco. <button type="button" className="pc-link-btn" onClick={() => mudar({ passos: limparPassosEmBranco(passos) })}>Remover os passos em branco</button>
              </span>
            )}
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

      {parte === "historico" && (
        <div className="pop-versoes">
          <div className="ui-list">
            {versoes.map((versao) => (
              <div key={versao.versao} className="ui-card pop-versao-linha">
                <span className="pop-versao-n">v{versao.versao}</span>
                <span className="pop-versao-textos">
                  <span className="pop-versao-linha1">
                    {versao.status}
                    {versao.aprovacao ? ` · aprovada por ${versao.aprovacao.nome}${versao.aprovacao.cargo ? `, ${versao.aprovacao.cargo}` : ""} em ${new Date(versao.aprovacao.em).toLocaleDateString("pt-BR")}` : ""}
                  </span>
                  <span className="pop-versao-motivo">Motivo: {versao.motivo?.trim() || (versao.versao === versoes[0]?.versao ? "primeira versão" : "não informado")}</span>
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

      {parte === "documento" && mensagem && <div className="ui-note">{mensagem}</div>}
      {parte === "documento" && aguardando && !podeAprovar && <p className="ui-row-sub pop-aviso-aprovacao">{motivoParaNaoAprovar(usuario, empresa) || "Aguardando a aprovação do responsável do estabelecimento."}</p>}

      {parte === "documento" && (
      <div className="ui-footer pop-rodape">
        <span className="ui-row-sub">{alterou ? "● Alterações ainda não salvas" : "✓ Tudo salvo"}</span>
        <div className="pop-rodape-acoes">
          {podeEditar && rascunho.status === "Rascunho" && (
            <>
              {salvoEm && <span className="pop-salvo-sinal" role="status">Rascunho salvo às {salvoEm}</span>}
              <button type="button" className="ui-btn ui-btn--secondary" onClick={() => { setTocado(true); if (faltas.length === 0 && !erroTitulo) onEnviar(rascunho); }}>
                Enviar para aprovação
              </button>
              <button
                type="button"
                className="ui-btn ui-btn--save"
                disabled={Boolean(erroTitulo)}
                onClick={() => {
                  // Salvar rascunho não guarda passo em branco: sobra só o que foi escrito.
                  const limpo = { ...rascunho, conteudo: { ...(rascunho.conteudo || conteudo), passos: limparPassosEmBranco(passos) } };
                  setRascunho(limpo);
                  onSalvarRascunho(limpo);
                  setSalvoEm(horaCerta());
                }}
              >
                Salvar rascunho
              </button>
            </>
          )}
          {aguardando && podeAprovar && (
            <button type="button" className="ui-btn ui-btn--criar" onClick={() => setConfirmandoAprovacao(true)}>
              Aprovar e assinar
            </button>
          )}
          {podeEditar && (rascunho.status === "Aprovado") && (
            <>
              <input className="ui-input pop-motivo-versao" value={motivoDaNovaVersao} onChange={(evento) => setMotivoDaNovaVersao(evento.target.value)} placeholder="Motivo da nova versão (opcional)" aria-label="Motivo da nova versão" />
              <button type="button" className="ui-btn ui-btn--criar" onClick={() => onNovaVersao({ ...rascunho, motivoDaVersao: motivoDaNovaVersao.trim() || undefined })}>
                Editar (cria nova versão)
              </button>
            </>
          )}
        </div>
      </div>
      )}
      {confirmandoAprovacao && (
        <div className="pc-modal-layer" role="presentation">
          <div className="pc-modal-backdrop" onClick={() => setConfirmandoAprovacao(false)} />
          <section className="pc-modal" role="dialog" aria-modal="true" aria-label="Aprovar e assinar o POP">
            <h2 className="pc-modal-title">Aprovar e assinar</h2>
            <p className="resumo-texto">
              Você está aprovando e assinando este POP como <b>{[usuario?.nome, empresa.responsavelEstabelecimento?.cargo].filter(Boolean).join(", ") || "responsável do estabelecimento"}</b>. Confirmar?
            </p>
            <p className="ui-row-sub">
              Fica gravado o seu nome, o cargo, a data e a versão {rascunho.versao}.
            </p>
            <div className="pc-modal-foot">
              <span />
              <div className="ui-footer-actions">
                <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setConfirmandoAprovacao(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn--criar"
                  onClick={() => {
                    setConfirmandoAprovacao(false);
                    onAprovar(rascunho);
                  }}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
