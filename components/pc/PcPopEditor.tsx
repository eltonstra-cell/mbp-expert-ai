"use client";

import { formatarCnpj } from "@/lib/cnpj";
import { formatarData, formatarHora, hojeLocalISO } from "@/lib/dataLocal";
import { limparTextoDePessoa, nomeECargo } from "@/lib/nomeCargo";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { CapaDosPops, ConteudoPop, Empresa, GrupoDeModeloPop, ItemDeModeloPop, PassoPop, ProcedimentoOperacionalPadronizado, UsuarioSistema } from "@/types";
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
  podeDescartarRascunho,
  podeAprovarPop,
  popPrecisaRevisarPorNorma,
  textoDaFaixaDoTextoBase,
} from "@/lib/popsNorma";
import { normasDaEmpresa } from "@/lib/normas";
import { confirmar } from "@/lib/dialogos";
import PopFolha from "@/components/pc/PopFolha";
import { razaoSocialTitulo } from "@/lib/nomeCargo";
import { nomeSemNumerosNoInicio } from "@/lib/navigation";
import { AVISO_SECAO_VAZIA, folhaDoPop, secoesDoEditor, textoDasSecoes } from "@/lib/popDocumento";
import type { CabecalhoDeImpressao } from "@/lib/printFooter";
import { MENSAGEM_APROVAR_NAO_CONFERIDO, bloqueioDeAprovacao, exigenciaDeAprovacao } from "@/lib/popConferencia";
import { SECOES_DO_MODELO, itensParaTexto, limparConteudoDoModelo, secoesDoModeloComConteudo, sugestaoDeFrequencia, textoParaItens, type IdDaSecaoDoModelo } from "@/lib/popConteudoModelo";
import { avisoDeConferenciaObrigatoria, secoesQueFaltamParaEnviar, textoDaFalta } from "@/lib/popEnvio";
import { numerosDosPassos, semSubtitulosVazios } from "@/lib/popPassos";
import { popNaoConferido } from "@/lib/popConferencia";
import { conteudoComResponsavelEfetivo, diferencaComDados, marcaManualApos, responsavelDaExecucao } from "@/lib/responsavelDoPop";
import CaixaQueCresce from "@/components/CaixaQueCresce";
import { modeloPorId } from "@/lib/popModelos";
import ConfigCapaDoPop from "@/components/pc/ConfigCapaDoPop";
import { capaInicialDoDialogo, comIconeDeCapa, eIconeConhecido, iconeDoPop, modeloDaCapa, type CapaCompleta, type ModeloDaCapa } from "@/lib/capaPop";
import { itensDasNotas, totalDePendencias, type AlvoDaPendencia, type ItemDasNotas } from "@/lib/popPendencias";

type Secao = "identificacao" | "objetivo" | "referencias" | "responsavel" | "passos" | "acao" | "registro" | "extra" | "extra2" | "modelo";

type Props = {
  pop: ProcedimentoOperacionalPadronizado;
  empresa: Pick<Empresa, "normasAplicadas" | "responsavelEstabelecimento"> & Partial<Pick<Empresa, "nomeFantasia" | "razaoSocial" | "cnpj">>;
  usuario: UsuarioSistema | null;
  podeEditar: boolean;
  /** Responsável do estabelecimento (usuário vinculado): nome e cargo da folha. */
  responsavelDoEstabelecimento?: { nome: string; cargo: string; usuarioId?: string };
  /** Imprimir ou salvar em PDF a folha do POP (leitura). */
  onImprimir?: (titulo: string, cabecalho: CabecalhoDeImpressao) => void;
  onSalvarRascunho: (pop: ProcedimentoOperacionalPadronizado) => void;
  onEnviar: (pop: ProcedimentoOperacionalPadronizado) => void;
  onAprovar: (pop: ProcedimentoOperacionalPadronizado) => void;
  onNovaVersao: (pop: ProcedimentoOperacionalPadronizado) => void;
  /** Descarta o rascunho de uma nova versão; a última versão aprovada continua vigente. */
  onDescartar?: (pop: ProcedimentoOperacionalPadronizado) => void;
  mensagem?: string;
  /** Capa dos POPs guardada na empresa (desligada por padrão) e como salvá-la; sem salvar, a capa vale só para esta impressão. */
  capaDaEmpresa?: CapaDosPops;
  onSalvarCapa?: (capa: CapaDosPops) => void;
  /** Grava o POP com a escolha de ícone da capa (sem criar versão: é só apresentação). */
  onTrocarIconeDeCapa?: (pop: ProcedimentoOperacionalPadronizado) => void;
  /** Frase da próxima ação: fica na mesma linha dos botões, à esquerda. */
  proximaAcao?: string;
  /** Leva ao bloco "Para conferir antes de aprovar" (Resumo da ficha), em destaque. */
  onIrParaConferencia?: () => void;
  /** Documento (editor) ou Histórico (versões, aprovações e motivo). O cabeçalho e as abas ficam na ficha do POP. */
  parte?: "documento" | "historico";
};

function SecaoRecolhivel({ titulo, aberta, children }: { id: Secao; titulo: string; resumo?: string; aberta: boolean; onAlternar?: (id: Secao) => void; children: ReactNode }) {
  if (!aberta) return null;
  return (
    <section className="pdoc-secao">
      <h2 className="pdoc-secao-titulo">{titulo}</h2>
      {children}
    </section>
  );
}

function Campo({ rotulo, valor, onChange, linhas, desabilitado, erro, tipo = "texto", dica }: { rotulo: string; valor: string; onChange: (valor: string) => void; linhas?: number; desabilitado?: boolean; erro?: string; tipo?: "texto" | "data"; dica?: string }) {
  return (
    <label className="pc-field">
      <span className="ui-eyebrow">{rotulo}</span>
      {linhas ? (
        <CaixaQueCresce className={`ui-input pop-area${erro ? " is-invalid" : ""}`} linhasMinimas={linhas} value={valor} disabled={desabilitado} onChange={(evento) => onChange(evento.target.value)} aria-invalid={Boolean(erro)} />
      ) : (
        <input type={tipo === "data" ? "date" : "text"} className={`ui-input${erro ? " is-invalid" : ""}`} value={valor} disabled={desabilitado} onChange={(evento) => onChange(evento.target.value)} aria-invalid={Boolean(erro)} />
      )}
      {erro ? <span className="ui-field-error">{erro}</span> : dica ? <span className="ui-row-sub">{dica}</span> : null}
    </label>
  );
}

// Lista de itens em texto: um item por linha; “- ” no começo da linha vira subitem. Guarda o texto digitado (as linhas em branco só somem ao salvar).
function CampoDeItens({ rotulo, itens, onChange, desabilitado, dica = "Para subitem, comece a linha com -" }: { rotulo: string; itens: ItemDeModeloPop[] | undefined; onChange: (itens: ItemDeModeloPop[]) => void; desabilitado?: boolean; dica?: string }) {
  const [texto, setTexto] = useState(() => itensParaTexto(itens));
  useEffect(() => {
    if (itensParaTexto(textoParaItens(texto, itens)) !== itensParaTexto(itens)) setTexto(itensParaTexto(itens));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itens]);
  return (
    <label className="pc-field">
      <span className="ui-eyebrow">{rotulo}</span>
      <CaixaQueCresce
        className="ui-input pop-area"
        linhasMinimas={2}
        value={texto}
        disabled={desabilitado}
        onChange={(evento) => {
          setTexto(evento.target.value);
          onChange(textoParaItens(evento.target.value, itens));
        }}
      />
      {dica && <span className="ui-row-sub pdoc-ajuda">{dica}</span>}
    </label>
  );
}

// Definições: uma linha por definição, com dois campos (Termo e Texto).
function EditorDeDefinicoes({ definicoes, onChange, desabilitado }: { definicoes: NonNullable<ConteudoPop["definicoes"]>; onChange: (definicoes: NonNullable<ConteudoPop["definicoes"]>) => void; desabilitado?: boolean }) {
  return (
    <div className="pdoc-guiado">
      {definicoes.map((definicao, indice) => (
        <div key={indice} className="pdoc-def-linha">
          <label className="pc-field">
            <span className="ui-eyebrow">Termo</span>
            <input className="ui-input" value={definicao.termo} disabled={desabilitado} onChange={(evento) => onChange(definicoes.map((item, posicao) => (posicao === indice ? { ...item, termo: evento.target.value } : item)))} />
          </label>
          <label className="pc-field">
            <span className="ui-eyebrow">Texto</span>
            <CaixaQueCresce className="ui-input pop-area" linhasMinimas={1} value={definicao.texto} disabled={desabilitado} onChange={(evento) => onChange(definicoes.map((item, posicao) => (posicao === indice ? { ...item, texto: evento.target.value } : item)))} />
          </label>
          {!desabilitado && (
            <button type="button" className="ui-btn ui-btn--soft ui-btn--small" aria-label={`Remover a definição ${indice + 1}`} title="Remover a definição" onClick={() => onChange(definicoes.filter((_, posicao) => posicao !== indice))}>
              ✕
            </button>
          )}
        </div>
      ))}
      {!desabilitado && (
        <button type="button" className="ui-btn ui-btn--secondary ui-btn--small pdoc-add-linha" onClick={() => onChange([...definicoes, { termo: "", texto: "" }])}>
          + Adicionar definição
        </button>
      )}
    </div>
  );
}

// Responsabilidades: grupos com Título e uma caixa de itens (um por linha).
function EditorDeResponsabilidades({ grupos, onChange, desabilitado }: { grupos: GrupoDeModeloPop[]; onChange: (grupos: GrupoDeModeloPop[]) => void; desabilitado?: boolean }) {
  return (
    <div className="pdoc-guiado">
      {grupos.map((grupo, indice) => (
        <div key={indice} className="pdoc-grupo">
          <label className="pc-field">
            <span className="ui-eyebrow">Título</span>
            <input className="ui-input" value={grupo.titulo || ""} disabled={desabilitado} onChange={(evento) => onChange(grupos.map((item, posicao) => (posicao === indice ? { ...item, titulo: evento.target.value } : item)))} />
          </label>
          <CampoDeItens rotulo="Itens" itens={grupo.itens} desabilitado={desabilitado} onChange={(itens) => onChange(grupos.map((item, posicao) => (posicao === indice ? { ...item, itens } : item)))} />
          {!desabilitado && (
            <button type="button" className="ui-btn ui-btn--soft ui-btn--small pdoc-grupo-remover" aria-label={`Remover o grupo ${indice + 1}`} title="Remover o grupo" onClick={() => onChange(grupos.filter((_, posicao) => posicao !== indice))}>
              ✕
            </button>
          )}
        </div>
      ))}
      {!desabilitado && (
        <button type="button" className="ui-btn ui-btn--secondary ui-btn--small pdoc-add-linha" onClick={() => onChange([...grupos, { titulo: "", itens: [] }])}>
          + Adicionar grupo
        </button>
      )}
    </div>
  );
}

function umAnoDepois(): string {
  const [ano, mes, dia] = hojeLocalISO().split("-");
  return `${Number(ano) + 1}-${mes}-${dia}`;
}

// Instruções do modelo ao consultor: só para quem edita, nunca vão para a folha nem para o PDF. O selo abre um painel neutro
// que separa PENDÊNCIA (âmbar, com ação) de INFORMAÇÃO (cinza, sem ação).
function SeloDasNotas({ itens, aberto, onAlternar }: { itens: ItemDasNotas[]; aberto: boolean; onAlternar: () => void }) {
  const pendentes = totalDePendencias(itens);
  return (
    <button type="button" className={`pop-notas-selo no-print${aberto ? " is-aberto" : ""}`} aria-expanded={aberto} aria-controls="pop-notas-painel" onClick={onAlternar}>
      Notas do modelo
      {pendentes > 0 && <span className="pop-notas-conta" title={`${pendentes} pendente(s)`}>{pendentes}</span>}
      <span aria-hidden="true">{aberto ? " ▴" : " ▾"}</span>
    </button>
  );
}

function PainelDasNotas({ itens, onAcao }: { itens: ItemDasNotas[]; onAcao: (alvo: AlvoDaPendencia) => void }) {
  const pendencias = itens.filter((item) => item.tipo === "pendencia");
  const informacoes = itens.filter((item) => item.tipo === "informacao");
  return (
    <div id="pop-notas-painel" className="pop-notas-painel no-print" role="region" aria-label="Notas do modelo (só para o RT)">
      {pendencias.length > 0 && (
        <div className="pop-notas-grupo">
          <h3 className="pop-notas-titulo">Pendências</h3>
          <ul className="pop-notas-lista">
            {pendencias.map((item) => (
              <li key={item.texto} className="pop-nota pop-nota--pendencia">
                <span>{item.texto}</span>
                {item.acao && (
                  <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => onAcao(item.acao!.alvo)}>
                    {item.acao.rotulo}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {informacoes.length > 0 && (
        <div className="pop-notas-grupo">
          <h3 className="pop-notas-titulo">Informações (só para o RT, não saem no PDF)</h3>
          <ul className="pop-notas-lista">
            {informacoes.map((item) => (
              <li key={item.texto} className="pop-nota pop-nota--informacao">{item.texto}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Cargo sem vírgula, ponto ou espaço no começo (digitando).
const semPontuacaoNoInicio = (valor: string) => valor.replace(/^[\s,;:.\-–]+/, "");

function horaCerta(): string {
  return formatarHora(new Date());
}

// Documento (editor em painéis) e Histórico (versões, aprovações e motivo) do POP. O cabeçalho e as abas ficam na ficha (PcFichaPop).
export default function PcPopEditor({ pop, empresa, usuario, podeEditar, responsavelDoEstabelecimento, onImprimir, onSalvarRascunho, onEnviar, onAprovar, onNovaVersao, onDescartar, mensagem, proximaAcao, onIrParaConferencia, capaDaEmpresa, onSalvarCapa, onTrocarIconeDeCapa, parte = "documento" }: Props) {
  // Mais de um passo em branco vira um só logo ao abrir.
  const [rascunho, setRascunho] = useState<ProcedimentoOperacionalPadronizado>(() => (pop.conteudo?.passos ? { ...pop, conteudo: { ...pop.conteudo, passos: juntarPassosEmBrancoRepetidos(pop.conteudo.passos) } } : pop));
  const [motivoDaNovaVersao, setMotivoDaNovaVersao] = useState("");
  const [secao, setSecao] = useState<Secao | null>("passos");
  const [tocado, setTocado] = useState(false);
  const [passoEmFoco, setPassoEmFoco] = useState<string | null>(null);
  const [passosTocados, setPassosTocados] = useState<Record<string, boolean>>({});
  const [salvoEm, setSalvoEm] = useState("");
  const [confirmandoAprovacao, setConfirmandoAprovacao] = useState(false);
  const [lado, setLado] = useState<"editar" | "previa">("editar");
  const [versaoA, setVersaoA] = useState("");
  const [versaoB, setVersaoB] = useState("");
  const [escolhendoImpressao, setEscolhendoImpressao] = useState(false);
  // Capa que sai no papel desta impressão (a página 1 do PDF); sem ela o PDF é o de sempre.
  const [capaNoPapel, setCapaNoPapel] = useState<ModeloDaCapa | null>(null);
  // Seções do modelo visíveis: as que já têm conteúdo e as que a pessoa adicionou por "+ Adicionar seção".
  const [secoesDoModeloAbertas, setSecoesDoModeloAbertas] = useState<IdDaSecaoDoModelo[]>(() => secoesDoModeloComConteudo(pop.conteudo || {}));
  // Depois de tocar em "Enviar para aprovação" sem estar pronto: mostra "Falta: …" ao lado do botão e marca a seção na lista.
  const [tentouEnviar, setTentouEnviar] = useState(false);

  const definicao = CONJUNTO_DA_NORMA.find((item) => item.catalogoId === rascunho.catalogoId);
  const conteudo: ConteudoPop = rascunho.conteudo || conteudoEmBranco(definicao || CONJUNTO_DA_NORMA[0], []);
  const passos = conteudo.passos || [];
  const temPassoEmBranco = passos.some((passo) => !passo.texto.trim());
  const passoFocado = passos.find((passo) => passo.id === passoEmFoco);
  const editavel = podeEditar && (rascunho.status === "Rascunho");
  const dadosDoResponsavel = responsavelDoEstabelecimento;
  const executorNaTela = responsavelDaExecucao(conteudo, dadosDoResponsavel);
  const diferencaDeDados = diferencaComDados(conteudo, dadosDoResponsavel);
  const faltas = faltasParaEnviar({ ...rascunho, conteudo: conteudoComResponsavelEfetivo(conteudo, dadosDoResponsavel) });
  const normas = normasDaEmpresa(empresa);
  const exigeAcaoCorretivaSes = normas.some((norma) => norma.id === "ses-799-2023-rs");
  const podeAprovar = podeAprovarPop(usuario, empresa);
  const aguardando = rascunho.status === "Aguardando aprovação" || rascunho.status === "Em revisão";
  // A conferência do modelo é gravada na hora pela ficha (Resumo): o editor sempre leva a versão mais nova dela, nunca a de quando abriu.
  const comConferenciaAtual = (atual: ProcedimentoOperacionalPadronizado): ProcedimentoOperacionalPadronizado => ({
    ...atual,
    ...(pop.origemModelo ? { origemModelo: pop.origemModelo } : {}),
    ...(pop.conferencia ? { conferencia: pop.conferencia } : {}),
    ...(pop.itensAConferir ? { itensAConferir: pop.itensAConferir } : {}),
  });
  const alterou = JSON.stringify(comConferenciaAtual(rascunho)) !== JSON.stringify(pop);
  const exigencia = exigenciaDeAprovacao(pop);
  const modeloDeOrigem = modeloPorId(pop.origemModelo?.id);
  const notasDoModelo = podeEditar ? modeloDeOrigem?.notasParaOConsultor || [] : [];
  const editavelAqui = podeEditar && rascunho.status === "Rascunho";
  const itensDasNotasNaTela = podeEditar ? itensDasNotas(notasDoModelo, comConferenciaAtual(rascunho), editavelAqui, Boolean(onIrParaConferencia)) : [];
  const [notasAbertas, setNotasAbertas] = useState(false);
  const [destaqueDoModelo, setDestaqueDoModelo] = useState<IdDaSecaoDoModelo | null>(null);
  function resolverPendencia(alvo: AlvoDaPendencia) {
    if (alvo === "conferencia") {
      onIrParaConferencia?.();
      return;
    }
    setSecao("modelo");
    setLado("editar");
    setSecoesDoModeloAbertas((atuais) => (atuais.includes("quemRealiza") ? atuais : [...atuais, "quemRealiza"]));
    setDestaqueDoModelo("quemRealiza");
    setTimeout(() => {
      const bloco = document.getElementById("pdoc-bloco-quemRealiza");
      bloco?.scrollIntoView({ behavior: "smooth", block: "center" });
      bloco?.querySelector<HTMLElement>("textarea, input")?.focus({ preventScroll: true });
    }, 60);
  }
  const notasNaBarra = itensDasNotasNaTela.length > 0 ? (
    <SeloDasNotas itens={itensDasNotasNaTela} aberto={notasAbertas} onAlternar={() => setNotasAbertas((aberto) => !aberto)} />
  ) : null;
  const proximaAcaoNaBarra = proximaAcao ? (
    <span className="pdoc-proxima"><span className="pdoc-proxima-rotulo">Próxima ação:</span> {proximaAcao}</span>
  ) : null;
  const sugestaoDaFrequencia = sugestaoDeFrequencia(conteudo.frequenciaDetalhe);
  const secoesQueFaltam = secoesQueFaltamParaEnviar(rascunho, dadosDoResponsavel);
  const textoFalta = textoDaFalta(secoesQueFaltam);
  const avisoDeConferencia = avisoDeConferenciaObrigatoria(pop);
  const numerosDosPassosNaTela = numerosDosPassos(passos);

  function mudar(alteracao: Partial<ConteudoPop>) {
    setSalvoEm("");
    setRascunho((atual) => ({ ...atual, conteudo: { ...(atual.conteudo || conteudo), ...alteracao } }));
  }
  // Digitar outro nome (ou cargo) à mão trava o POP nesse texto; voltar a ser igual a Dados volta a acompanhar Dados.
  function mudarResponsavel(novo: { nome: string; cargo: string }) {
    mudar({ responsavelExecucao: novo, responsavelManual: marcaManualApos(novo, dadosDoResponsavel, conteudo.responsavelManual) });
  }
  function usarOResponsavelDeDados() {
    mudar({ responsavelExecucao: { nome: dadosDoResponsavel?.nome || "", cargo: dadosDoResponsavel?.cargo || "" }, responsavelManual: false });
  }
  function mudarPasso(id: string, texto: string) {
    mudar({ passos: (conteudo.passos || []).map((passo) => (passo.id === id ? { ...passo, texto } : passo)) });
  }
  function mudarSubtitulo(id: string, subtitulo: string | undefined) {
    mudar({
      passos: (conteudo.passos || []).map((passo) => {
        if (passo.id !== id) return passo;
        const { subtitulo: _antigo, ...resto } = passo;
        void _antigo;
        return subtitulo === undefined ? resto : { ...resto, subtitulo };
      }),
    });
  }
  function moverPasso(indice: number, delta: -1 | 1) {
    const lista = [...(conteudo.passos || [])];
    const alvo = indice + delta;
    if (alvo < 0 || alvo >= lista.length) return;
    [lista[indice], lista[alvo]] = [lista[alvo], lista[indice]];
    mudar({ passos: lista });
  }
  // O que sobra em branco na edição (passos, subtítulos, definições, grupos) não é gravado.
  const limpoParaGravar = (atual: ProcedimentoOperacionalPadronizado): ProcedimentoOperacionalPadronizado => {
    const base = atual.conteudo || conteudo;
    // Quem acompanha Dados grava o responsável de Dados de hoje (a leitura e a impressão continuam lendo de Dados na hora).
    const limpoDoModelo = limparConteudoDoModelo({ ...conteudoComResponsavelEfetivo(base, dadosDoResponsavel), passos: semSubtitulosVazios(base.passos || []) });
    return { ...atual, conteudo: { ...limpoDoModelo, passos: limparPassosEmBranco(limpoDoModelo.passos) } };
  };
  const alternar = (id: Secao) => setSecao(id);
  // Nunca fica sem resposta: se falta algo, o botão mostra “Falta: …” (âmbar), marca a seção na lista e abre a primeira incompleta.
  function enviarParaAprovar() {
    setTocado(true);
    if (secoesQueFaltam.length > 0 || faltas.length > 0 || erroTitulo) {
      setTentouEnviar(true);
      const primeira = secoesQueFaltam[0];
      if (primeira) setSecao(primeira.id);
      return;
    }
    setTentouEnviar(false);
    onEnviar(comConferenciaAtual(limpoParaGravar(rascunho)));
  }
  const modoLeitura = parte === "documento" && !editavel;
  const secoesDaLista = secoesDoEditor(rascunho, definicao, dadosDoResponsavel);
  // O documento (folha, PDF) leva a razão social em formato de título; o nome de exibição vale só para as telas.
  const dadosDaEmpresa = { nome: razaoSocialTitulo(nomeSemNumerosNoInicio(empresa.razaoSocial || empresa.nomeFantasia || "")), cnpj: (empresa.cnpj || "").trim() };
  const opcoesDaFolha = { responsavel: responsavelDoEstabelecimento, exigeAcaoCorretiva: exigeAcaoCorretivaSes };
  const folhaDeLeitura = folhaDoPop(comConferenciaAtual(rascunho), dadosDaEmpresa, opcoesDaFolha);
  const folhaDaPrevia = folhaDoPop(comConferenciaAtual(rascunho), dadosDaEmpresa, { ...opcoesDaFolha, marcarBranco: true });
  const dicaDaNorma = (conteudo.referencias || [])[0];
  const iconeAutomaticoDaCapa = iconeDoPop({ origemModelo: pop.origemModelo, catalogoId: pop.catalogoId });
  const iconeEscolhidoDaCapa = eIconeConhecido(pop.iconeCapa) ? pop.iconeCapa : "";
  function imprimirFolha(capa: CapaCompleta | null, icone: string) {
    setEscolhendoImpressao(false);
    setCapaNoPapel(capa?.ativa ? modeloDaCapa(capa, { ...folhaDeLeitura.capa, iconeId: icone || iconeAutomaticoDaCapa }) : null);
    // A capa só existe no papel: some de novo quando a impressão termina.
    if (capa?.ativa) window.addEventListener("afterprint", () => setCapaNoPapel(null), { once: true });
    onImprimir?.(`${rascunho.codigo || "POP"} - ${rascunho.titulo}`, {
      esquerda: [dadosDaEmpresa.nome, dadosDaEmpresa.cnpj ? `CNPJ ${formatarCnpj(dadosDaEmpresa.cnpj)}` : ""],
      // O cabeçalho corrido tem só empresa, CNPJ e "POP-01 · versão 1.1"; "Aprovada por …" fica uma vez só, abaixo do título.
      direita: [`${rascunho.codigo ? `${rascunho.codigo} · ` : ""}versão ${rascunho.versao}`],
      rodape: rascunho.titulo,
      ocultarNoCorpo: ["#pop-folha .pfolha-topo"],
    });
  }

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

      {modoLeitura && (
        <div className="pdoc-leitura">
          {/* Na leitura não há o campo Responsável: o aviso fica aqui, sem o link (uma versão aprovada só muda numa nova versão). */}
          {diferencaDeDados && (
            <p className="ui-row-sub pdoc-sugestao">
              Responsável neste POP: {executorNaTela.nome}. Os Dados trazem “{diferencaDeDados}”.
            </p>
          )}
          <div className="pdoc-barra">
            {proximaAcaoNaBarra}
            {notasNaBarra}
            {onImprimir && (
              <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setEscolhendoImpressao(true)}>
                Imprimir / PDF
              </button>
            )}
            {aguardando && podeAprovar && exigencia === "bloqueada" && (
              <>
                {onIrParaConferencia ? (
                  <button type="button" className="pdoc-bloqueio pdoc-bloqueio--link" title="Ir aos itens para conferir" onClick={onIrParaConferencia}>{bloqueioDeAprovacao(pop)}</button>
                ) : (
                  <span className="pdoc-bloqueio" role="status">{bloqueioDeAprovacao(pop)}</span>
                )}
                <button type="button" className="ui-btn ui-btn--criar" disabled title={bloqueioDeAprovacao(pop)}>
                  Aprovar e assinar
                </button>
              </>
            )}
            {aguardando && podeAprovar && exigencia !== "bloqueada" && (
              <button type="button" className="ui-btn ui-btn--criar" onClick={() => setConfirmandoAprovacao(true)}>
                Aprovar e assinar
              </button>
            )}
            {podeEditar && rascunho.status === "Aprovado" && (
              <button type="button" className="ui-btn ui-btn--criar" onClick={() => onNovaVersao({ ...rascunho, motivoDaVersao: undefined })}>
                Editar (cria nova versão)
              </button>
            )}
          </div>
          {notasAbertas && itensDasNotasNaTela.length > 0 && <PainelDasNotas itens={itensDasNotasNaTela} onAcao={resolverPendencia} />}
          <PopFolha folha={folhaDeLeitura} modo="leitura" id="pop-folha" capa={capaNoPapel} />
        </div>
      )}

      {parte === "documento" && !modoLeitura && (proximaAcaoNaBarra || notasNaBarra) && (
        <div className="pdoc-barra pdoc-barra--edicao">
          {proximaAcaoNaBarra}
          {notasNaBarra}
        </div>
      )}
      {parte === "documento" && !modoLeitura && (
        <div className={`pdoc pdoc--${lado}`}>
          <div className="pdoc-lados" role="tablist" aria-label="Editar ou ver a folha">
            <button type="button" role="tab" aria-selected={lado === "editar"} className={`rel-aba${lado === "editar" ? " is-ativa" : ""}`} onClick={() => setLado("editar")}>
              Editar
            </button>
            <button type="button" role="tab" aria-selected={lado === "previa"} className={`rel-aba${lado === "previa" ? " is-ativa" : ""}`} onClick={() => setLado("previa")}>
              Pré-visualização
            </button>
          </div>
          <aside className="pdoc-secoes" aria-label="Seções do POP">
            <h2 className="pdoc-lista-titulo">Seções · {textoDasSecoes(secoesDaLista)}</h2>
            <ul className="pdoc-lista">
              {secoesDaLista.map((item) => (
                <li key={`${item.id}-${item.titulo}`}>
                  <button type="button" className={`pdoc-item${secao === item.id ? " is-ativa" : ""}${tentouEnviar && secoesQueFaltam.some((falta) => falta.id === item.id) ? " is-falta" : ""}`} aria-current={secao === item.id ? "true" : undefined} onClick={() => alternar(item.id)}>
                    <span className={`pdoc-marca${item.preenchida ? " is-ok" : ""}`} aria-hidden="true">{item.preenchida ? "✓" : ""}</span>
                    <span>{item.titulo}</span>
                    <span className="sr-only">{item.preenchida ? " (preenchida)" : " (falta preencher)"}</span>
                    {tentouEnviar && secoesQueFaltam.some((falta) => falta.id === item.id) && <span className="pdoc-item-falta">falta</span>}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <div className="pdoc-meio">
          {notasAbertas && itensDasNotasNaTela.length > 0 && <PainelDasNotas itens={itensDasNotasNaTela} onAcao={resolverPendencia} />}
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

          <SecaoRecolhivel id="responsavel" titulo="Responsável e frequência" resumo={executorNaTela.nome ? `${executorNaTela.nome}${conteudo.frequencia ? ` · ${conteudo.frequencia}` : ""}` : "em branco"} aberta={secao === "responsavel"} onAlternar={alternar}>
            <div className="pop-grade">
              <div className="pc-field">
                <Campo rotulo="Responsável pela execução (nome)" valor={executorNaTela.nome} desabilitado={!editavel} erro={tocado && !executorNaTela.nome.trim() ? "Informe o nome." : ""} onChange={(valor) => mudarResponsavel({ nome: valor, cargo: executorNaTela.cargo })} />
                {diferencaDeDados && (
                  <span className="ui-row-sub pdoc-sugestao">
                    Os Dados trazem “{diferencaDeDados}”
                    {editavel && (
                      <>
                        {" · "}
                        <button type="button" className="pc-link-btn" title="Voltar a acompanhar o responsável de Empresa › Dados" onClick={usarOResponsavelDeDados}>
                          Usar o de Dados
                        </button>
                      </>
                    )}
                  </span>
                )}
              </div>
              <Campo rotulo="Cargo ou função" valor={executorNaTela.cargo} desabilitado={!editavel} erro={tocado && !executorNaTela.cargo.trim() ? "Informe o cargo ou a função." : ""} onChange={(valor) => mudarResponsavel({ nome: executorNaTela.nome, cargo: semPontuacaoNoInicio(valor) })} />
              <div className="pc-field">
                <Campo rotulo="Frequência" valor={conteudo.frequencia || ""} desabilitado={!editavel} erro={tocado && !(conteudo.frequencia || "").trim() ? "Informe a frequência." : ""} onChange={(valor) => mudar({ frequencia: valor })} />
                {editavel && sugestaoDaFrequencia && sugestaoDaFrequencia !== (conteudo.frequencia || "").trim() && (
                  <span className="ui-row-sub pdoc-sugestao">
                    Sugestão do modelo:{" "}
                    <button type="button" className="pc-link-btn" title="Usar esta sugestão" onClick={() => mudar({ frequencia: sugestaoDaFrequencia })}>
                      {sugestaoDaFrequencia}
                    </button>
                  </span>
                )}
              </div>
            </div>
          </SecaoRecolhivel>

          <SecaoRecolhivel id="passos" titulo="Passos" resumo={`${(conteudo.passos || []).filter((passo) => passo.texto.trim()).length === 1 ? "1 escrito" : `${(conteudo.passos || []).filter((passo) => passo.texto.trim()).length} escritos`}`} aberta={secao === "passos"} onAlternar={alternar}>
            {editavel && (
              <div className="pdoc-barra-ia">
                <span className="ui-row-sub">{passoFocado ? `Passo ${passos.indexOf(passoFocado) + 1} em foco` : "Toque em um passo para ditar ou melhorar o texto"}</span>
                {passoFocado && (
                  <FieldVoiceTools key={passoFocado.id} fieldKey={`pop-passo-${passoFocado.id}`} value={passoFocado.texto} onChange={(texto) => mudarPasso(passoFocado.id, texto)} contexto="Passo de um Procedimento Operacional Padronizado de segurança dos alimentos." />
                )}
              </div>
            )}
            {dicaDaNorma && (
              <div className="priv-faixa pdoc-dica" role="status">
                <span title={dicaDaNorma.orientacao}>
                  {dicaDaNorma.orientacao} ({dicaDaNorma.norma}, {dicaDaNorma.item})
                </span>
                {dicaDaNorma.conferir && <span className="pop-conferir">conferir</span>}
              </div>
            )}
            {editavel && temPassoEmBranco && <span className="ui-row-sub">Escreva o passo em branco antes de adicionar outro.</span>}
            <ol className="pop-passos pop-passos--rolagem pdoc-passos">
              {passos.map((passo: PassoPop, indice) => {
                const vazio = !passo.texto.trim();
                const avisar = vazio && (tocado || passosTocados[passo.id]);
                return (
                  <li key={passo.id} className={`pop-passo${passo.id === passoEmFoco ? " is-foco" : ""}`}>
                    <span className="pop-passo-n">{numerosDosPassosNaTela[indice]}</span>
                    <span className="pop-passo-campo">
                      {passo.subtitulo !== undefined && (
                        <span className="pop-subtitulo-linha">
                          <input
                            type="text"
                            className="ui-input pop-subtitulo"
                            value={passo.subtitulo}
                            placeholder="Subtítulo do grupo (a numeração recomeça aqui)"
                            disabled={!editavel}
                            aria-label={`Subtítulo do passo ${indice + 1}`}
                            onChange={(evento) => mudarSubtitulo(passo.id, evento.target.value)}
                          />
                          {editavel && (
                            <button type="button" className="ui-btn ui-btn--soft ui-btn--small" aria-label={`Remover o subtítulo do passo ${indice + 1}`} title="Remover o subtítulo" onClick={() => mudarSubtitulo(passo.id, undefined)}>
                              ✕
                            </button>
                          )}
                        </span>
                      )}
                      <CaixaQueCresce
                        className={`ui-input pop-passo-texto${avisar ? " is-invalid" : ""}`}
                        value={passo.texto}
                        placeholder={vazio ? "Descreva o passo" : undefined}
                        disabled={!editavel}
                        aria-label={`Passo ${indice + 1}`}
                        aria-invalid={Boolean(avisar)}
                        onFocus={() => setPassoEmFoco(passo.id)}
                        onBlur={() => setPassosTocados((atual) => ({ ...atual, [passo.id]: true }))}
                        onKeyDown={(evento) => {
                          if (evento.key === "Enter") evento.preventDefault();
                        }}
                        onChange={(evento) => mudarPasso(passo.id, evento.target.value.replace(/\s*\n+\s*/g, " "))}
                      />
                      {avisar && <span className="ui-field-error ui-field-error--forte">Escreva este passo ou remova.</span>}
                    </span>
                    {editavel && (
                      <span className="pop-passo-acoes">
                        {passo.subtitulo === undefined && (
                          <button type="button" className="ui-btn ui-btn--soft ui-btn--small" aria-label={`Acrescentar subtítulo ao passo ${indice + 1}`} onClick={() => mudarSubtitulo(passo.id, "")}>
                            + Subtítulo
                          </button>
                        )}
                        <button type="button" className="ui-btn ui-btn--soft ui-btn--small" aria-label={`Subir o passo ${indice + 1}`} disabled={indice === 0} onClick={() => moverPasso(indice, -1)}>↑</button>
                        <button type="button" className="ui-btn ui-btn--soft ui-btn--small" aria-label={`Descer o passo ${indice + 1}`} disabled={indice === passos.length - 1} onClick={() => moverPasso(indice, 1)}>↓</button>
                        <button type="button" className="ui-btn ui-btn--soft ui-btn--small" aria-label={`Remover o passo ${indice + 1}`} title="Remover o passo" onClick={() => mudar({ passos: passos.filter((item) => item.id !== passo.id) })}>✕</button>
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
            {editavel && (
              <button
                type="button"
                className="ui-btn ui-btn--secondary pdoc-add"
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
            )}
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
            {exigeAcaoCorretivaSes && !(conteudo.acaoCorretiva || "").trim() && (
              <div className="priv-faixa pdoc-dica" role="status">
                <span>{AVISO_SECAO_VAZIA}</span>
              </div>
            )}
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

          {rascunho.origemModelo && (
            <SecaoRecolhivel id="modelo" titulo="Conteúdo do modelo" resumo="listas do modelo" aberta={secao === "modelo"} onAlternar={alternar}>
              <p className="ui-row-sub pdoc-ajuda">Só as seções com conteúdo aparecem aqui; para escrever em outra, use “+ Adicionar seção”. Seção em branco não sai na folha.</p>
              {SECOES_DO_MODELO.filter((item) => secoesDoModeloAbertas.includes(item.id)).map((item) => (
                <div key={item.id} id={`pdoc-bloco-${item.id}`} className={`pdoc-bloco-modelo${destaqueDoModelo === item.id ? " is-destaque" : ""}`}>
                  <h3 className="pdoc-bloco-titulo">{item.titulo}</h3>
                  {item.id === "alcance" ? (
                    <label className="pc-field">
                      <span className="ui-eyebrow">Alcance</span>
                      <CaixaQueCresce className="ui-input pop-area" linhasMinimas={2} value={conteudo.alcance || ""} disabled={!editavel} onChange={(evento) => mudar({ alcance: evento.target.value })} />
                    </label>
                  ) : item.id === "definicoes" ? (
                    <EditorDeDefinicoes definicoes={conteudo.definicoes || []} desabilitado={!editavel} onChange={(definicoes) => mudar({ definicoes })} />
                  ) : item.id === "responsabilidades" ? (
                    <EditorDeResponsabilidades grupos={conteudo.responsabilidades || []} desabilitado={!editavel} onChange={(responsabilidades) => mudar({ responsabilidades })} />
                  ) : (
                    <CampoDeItens rotulo={item.titulo} itens={conteudo[item.id]} desabilitado={!editavel} onChange={(itens) => mudar({ [item.id]: itens })} />
                  )}
                </div>
              ))}
              {editavel && SECOES_DO_MODELO.some((item) => !secoesDoModeloAbertas.includes(item.id)) && (
                <div className="pdoc-add-secao" role="group" aria-label="Adicionar seção">
                  <span className="pdoc-add-secao-rotulo">+ Adicionar seção</span>
                  {SECOES_DO_MODELO.filter((item) => !secoesDoModeloAbertas.includes(item.id)).map((item) => (
                    <button key={item.id} type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => setSecoesDoModeloAbertas((atuais) => [...atuais, item.id])}>
                      {item.titulo}
                    </button>
                  ))}
                </div>
              )}
              {(conteudo.tabelas || []).length > 0 && <p className="ui-row-sub pdoc-ajuda">As tabelas do modelo ({(conteudo.tabelas || []).map((tabela) => tabela.titulo).join("; ")}) saem na folha logo depois do passo que as cita. Valores a conferir com a norma aplicada.</p>}
            </SecaoRecolhivel>
          )}
          </div>
          <aside className="pdoc-previa" aria-label="Pré-visualização da folha">
            <div className="pdoc-previa-cabeca">
              <h2 className="pdoc-lista-titulo">Pré-visualização da folha</h2>
              {onImprimir && (
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => setEscolhendoImpressao(true)}>
                  Imprimir / PDF
                </button>
              )}
            </div>
            <PopFolha folha={folhaDaPrevia} modo="previa" />
            <p className="ui-row-sub pdoc-ajuda">Atualiza enquanto você escreve.</p>
          </aside>
          {onImprimir && (
            // Cópia da folha só para o papel (o rascunho sai marcado “Rascunho” na linha de situação).
            <div className="pdoc-so-papel" aria-hidden="true">
              <PopFolha folha={folhaDeLeitura} modo="leitura" id="pop-folha" capa={capaNoPapel} />
            </div>
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
                    {!versao.aprovacao ? versao.status : ""}
                    {versao.aprovacao ? `Aprovada por ${nomeECargo(versao.aprovacao.nome, versao.aprovacao.cargo)} em ${formatarData(versao.aprovacao.em)}` : ""}
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
                  <select className="ui-input ui-input--lista pop-seletor-baixo" value={escolhidaA?.versao} onChange={(evento) => setVersaoA(evento.target.value)}>
                    {versoes.map((versao) => (
                      <option key={versao.versao} value={versao.versao}>v{versao.versao}</option>
                    ))}
                  </select>
                </label>
                <label className="pc-field">
                  <span className="ui-eyebrow">com</span>
                  <select className="ui-input ui-input--lista pop-seletor-baixo" value={escolhidaB?.versao} onChange={(evento) => setVersaoB(evento.target.value)}>
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
                    <span role="cell">
                    {linha.campo}
                    {!linha.igual && <span className="pop-alterado">alterado</span>}
                  </span>
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

      {parte === "documento" && !modoLeitura && (
        <div className="ui-footer pop-rodape pdoc-rodape">
          <span className="pop-salvo-sinal" role="status">
            {alterou ? "● Alterações ainda não salvas" : salvoEm ? `✓ Rascunho salvo às ${salvoEm}` : "✓ Tudo salvo"}
          </span>
          <div className="pop-rodape-acoes">
            {(rascunho.versoes || []).length > 0 && (
              <input className="ui-input pop-motivo-versao" value={rascunho.motivoDaVersao || ""} onChange={(evento) => { setSalvoEm(""); setRascunho({ ...rascunho, motivoDaVersao: evento.target.value }); }} placeholder="Motivo da nova versão (opcional)" aria-label="Motivo da nova versão" />
            )}
            {onDescartar && podeDescartarRascunho(pop) && (
              <button
                type="button"
                className="ui-btn ui-btn--secondary"
                onClick={async () => {
                  if (!(await confirmar(`Descartar este rascunho? A versão ${(rascunho.versoes || []).filter((versao) => versao.status === "Aprovado").slice(-1)[0]?.versao} aprovada continua vigente e o que foi escrito no rascunho se perde.`, { titulo: "Descartar rascunho", confirmarRotulo: "Descartar rascunho", cancelarRotulo: "Continuar editando", perigoso: true }))) return;
                  onDescartar(pop);
                }}
              >
                Descartar rascunho
              </button>
            )}
            <button
              type="button"
              className="ui-btn ui-btn--save"
              disabled={Boolean(erroTitulo)}
              onClick={() => {
                // Salvar rascunho não guarda passo em branco: sobra só o que foi escrito.
                const exec = (rascunho.conteudo || conteudo).responsavelExecucao;
                const gravavel = limpoParaGravar(rascunho);
                const limpo = comConferenciaAtual({
                  ...gravavel,
                  conteudo: {
                    ...(gravavel.conteudo || conteudo),
                    ...(exec ? { responsavelExecucao: { nome: limparTextoDePessoa(exec.nome), cargo: limparTextoDePessoa(exec.cargo) } } : {}),
                  },
                });
                setRascunho(limpo);
                onSalvarRascunho(limpo);
                setSalvoEm(horaCerta());
              }}
            >
              Salvar rascunho
            </button>
            {(tentouEnviar ? textoFalta : erroTitulo ? "Falta: Identificação" : "") && (
              <span className="pdoc-falta" role="alert">
                {tentouEnviar ? textoFalta : "Falta: Identificação"}
              </span>
            )}
            {avisoDeConferencia && (onIrParaConferencia ? (
              <button type="button" className="pdoc-chip-conferir pdoc-chip-conferir--link" title="Ir aos itens para conferir" onClick={onIrParaConferencia}>{avisoDeConferencia}</button>
            ) : (
              <span className="pdoc-chip-conferir" role="note">{avisoDeConferencia}</span>
            ))}
            <button type="button" className="ui-btn ui-btn--criar" onClick={enviarParaAprovar}>
              Enviar para aprovação
            </button>
          </div>
        </div>
      )}
      {escolhendoImpressao && (
        <ConfigCapaDoPop
          dados={folhaDeLeitura.capa}
          iconeAutomatico={iconeAutomaticoDaCapa}
          iconeEscolhido={iconeEscolhidoDaCapa}
          inicial={capaInicialDoDialogo(pop, (pop.versoes || []).find((versao) => versao.versao === pop.versao)?.capa, capaDaEmpresa)}
          guardada={capaDaEmpresa}
          podeSalvar={Boolean(onSalvarCapa && podeEditar)}
          avisoNaoConferido={popNaoConferido(comConferenciaAtual(rascunho))}
          onCancelar={() => setEscolhendoImpressao(false)}
          onSalvar={(capa, icone) => {
            onSalvarCapa?.({ ativa: capa.ativa, estilo: capa.estilo, cor: capa.cor, icone: capa.icone, ...(capa.logotipo ? { logotipo: capa.logotipo } : {}) });
            if (icone !== iconeEscolhidoDaCapa) onTrocarIconeDeCapa?.(comIconeDeCapa(pop, icone));
          }}
          onImprimir={imprimirFolha}
        />
      )}
      {confirmandoAprovacao && (
        <div className="pc-modal-layer" role="presentation">
          <div className="pc-modal-backdrop" onClick={() => setConfirmandoAprovacao(false)} />
          <section className="pc-modal" role="dialog" aria-modal="true" aria-label="Aprovar e assinar o POP">
            <h2 className="pc-modal-title">Aprovar e assinar</h2>
            {exigencia === "confirmar" && (
              <p className="resumo-texto pdoc-nao-conferido" role="alert">
                {MENSAGEM_APROVAR_NAO_CONFERIDO}
              </p>
            )}
            <p className="resumo-texto">
              Você está aprovando e assinando este POP como <b>{nomeECargo(usuario?.nome, usuario?.cargo || empresa.responsavelEstabelecimento?.cargo) || "responsável do estabelecimento"}</b>. {exigencia === "confirmar" ? "" : "Confirmar?"}
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
                    onAprovar(comConferenciaAtual(rascunho));
                  }}
                >
                  {exigencia === "confirmar" ? "Aprovar mesmo assim" : "Confirmar"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
