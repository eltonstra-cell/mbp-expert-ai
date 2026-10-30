"use client";

import Select from "@/components/Select";
import CampoDeFrequencia from "@/components/pc/CampoDeFrequencia";
import { conteudoComFrequencia, frequenciaDoPop, tipoReconhecidoNoTexto } from "@/lib/popFrequencia";
import { formatarCnpj } from "@/lib/cnpj";
import { formatarData, formatarHora, hojeLocalISO } from "@/lib/dataLocal";
import { limparTextoDePessoa, nomeECargo } from "@/lib/nomeCargo";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { avisoDeConferenciaObrigatoria } from "@/lib/popEnvio";
import { numerosDosPassos, semSubtitulosVazios } from "@/lib/popPassos";
import { popNaoConferido } from "@/lib/popConferencia";
import { conteudoComResponsavelEfetivo, diferencaComDados, marcaManualApos, responsavelDaExecucao } from "@/lib/responsavelDoPop";
import CaixaQueCresce from "@/components/CaixaQueCresce";
import { modeloPorId } from "@/lib/popModelos";
import ConfigCapaDoPop from "@/components/pc/ConfigCapaDoPop";
import ConfigCartazLavagem from "@/components/pc/ConfigCartazLavagem";
import { aguardarImagensParaImprimir } from "@/lib/aguardarImagens";
import CartazLavagem from "@/components/CartazLavagem";
import { createPortal } from "react-dom";
import { conteudoDoCartaz, eDeLavagemDeMaos, podeGerarOCartaz, popAprovadoParaOCartaz, rodapeDoCartaz, estiloDoCartaz as estiloValido, type DadosDoCartaz, type EstiloDoCartaz } from "@/lib/cartazLavagem";
import { capaInicialDoDialogo, comIconeDeCapa, eIconeConhecido, iconeDoPop, modeloDaCapa, type CapaCompleta, type ModeloDaCapa } from "@/lib/capaPop";
import { itensDasNotas, totalDePendencias, type AlvoDaPendencia, type ItemDasNotas } from "@/lib/popPendencias";
import AmbientesCortina from "@/components/AmbientesCortina";
import type { InfoAmbiente } from "@/lib/checklistEnvs";
import { CAMPOS_GUIADOS, campoGuiadoDaHigienizacao, textoDoCampoGuiado, type CampoGuiado } from "@/lib/popModelosGuiados";

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
  /** Cartaz de lavagem de mãos (só no POP do modelo de lavagem): tema guardado e como salvar tema e logotipo. */
  estiloDoCartaz?: EstiloDoCartaz;
  onSalvarCartaz?: (estilo: EstiloDoCartaz, logotipo: string | undefined) => void;
  /** Grava o POP com a escolha de ícone da capa (sem criar versão: é só apresentação). */
  onTrocarIconeDeCapa?: (pop: ProcedimentoOperacionalPadronizado) => void;
  /** Frase da próxima ação: fica na mesma linha dos botões, à esquerda. */
  proximaAcao?: string;
  /** Leva ao bloco "Para conferir antes de aprovar" (Resumo da ficha), em destaque. */
  onIrParaConferencia?: () => void;
  /** Documento (editor) ou Histórico (versões, aprovações e motivo). O cabeçalho e as abas ficam na ficha do POP. */
  parte?: "documento" | "historico";
  /** A ficha pediu a impressão (Imprimir cópia / Imprimir para assinar): abre a janela de impressão; `assinar` junta o campo de assinatura do responsável. */
  pedidoDeImpressao?: { n: number; assinar: boolean };
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

function Campo({ rotulo, valor, onChange, linhas, desabilitado, erro, tipo = "texto", dica, guia }: { rotulo: string; valor: string; onChange: (valor: string) => void; linhas?: number; desabilitado?: boolean; erro?: string; tipo?: "texto" | "data"; dica?: string; guia?: CampoGuiado | null }) {
  return (
    <label className="pc-field">
      <span className="ui-eyebrow">{rotulo}</span>
      {linhas ? (
        <CaixaQueCresce className={`ui-input pop-area${erro ? " is-invalid" : ""}`} linhasMinimas={linhas} value={valor} disabled={desabilitado} onChange={(evento) => onChange(evento.target.value)} aria-invalid={Boolean(erro)} />
      ) : (
        <input type={tipo === "data" ? "date" : "text"} className={`ui-input${erro ? " is-invalid" : ""}`} value={valor} disabled={desabilitado} onChange={(evento) => onChange(evento.target.value)} aria-invalid={Boolean(erro)} />
      )}
      {erro ? <span className="ui-field-error">{erro}</span> : guia ? <span className="ui-row-sub pop-guia">{textoDoCampoGuiado(guia)} <span className="pop-conferir">conferir</span></span> : dica ? <span className="ui-row-sub">{dica}</span> : null}
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
export default function PcPopEditor({ pop, empresa, usuario, podeEditar, responsavelDoEstabelecimento, onImprimir, onSalvarRascunho, onAprovar, onNovaVersao, onDescartar, mensagem, proximaAcao, onIrParaConferencia, capaDaEmpresa, onSalvarCapa, onTrocarIconeDeCapa, estiloDoCartaz, onSalvarCartaz, parte = "documento", pedidoDeImpressao }: Props) {
  // Mais de um passo em branco vira um só logo ao abrir.
  const [rascunho, setRascunho] = useState<ProcedimentoOperacionalPadronizado>(() => (pop.conteudo?.passos ? { ...pop, conteudo: { ...pop.conteudo, passos: juntarPassosEmBrancoRepetidos(pop.conteudo.passos) } } : pop));
  const [motivoDaNovaVersao, setMotivoDaNovaVersao] = useState("");
  const [secao, setSecao] = useState<Secao | null>("passos");
  const [tocado, setTocado] = useState(false);
  const [passoEmFoco, setPassoEmFoco] = useState<string | null>(null);
  /** Menu aberto numa linha de passo: "⋯" (subtítulo e remover) ou "↕" (subir e descer). Um por vez. */
  const [menuDoPasso, setMenuDoPasso] = useState<{ id: string; tipo: "mais" | "ordem" } | null>(null);
  const [passosTocados, setPassosTocados] = useState<Record<string, boolean>>({});
  const [salvoEm, setSalvoEm] = useState("");
  const [confirmandoAprovacao, setConfirmandoAprovacao] = useState(false);
  const [verFolha, setVerFolha] = useState(false);
  const [outraPessoa, setOutraPessoa] = useState(false);
  const [, setMedida] = useState(0);
  // A lista de passos é a única que rola: ocupa o que sobra da tela entre o que está acima dela e o que está abaixo (botão, rodapé e barra de baixo).
  const listaDePassos = useRef<HTMLOListElement>(null);
  useLayoutEffect(() => {
    const lista = listaDePassos.current;
    if (!lista) return;
    const rolagem = lista.scrollTop;
    lista.style.maxHeight = "";
    const retangulo = lista.getBoundingClientRect();
    const meio = lista.closest(".pdoc-meio");
    const abaixoNoMeio = meio ? Math.max(0, meio.getBoundingClientRect().bottom - retangulo.bottom) : 0;
    const rodape = document.querySelector(".pdoc-rodape")?.getBoundingClientRect().height ?? 0;
    const barra = document.querySelector(".campo-bar");
    const alturaDaBarra = barra && getComputedStyle(barra).display !== "none" ? barra.getBoundingClientRect().height : 0;
    const livre = window.innerHeight - retangulo.top - abaixoNoMeio - rodape - alturaDaBarra - 16;
    lista.style.maxHeight = `${Math.max(120, Math.floor(livre))}px`;
    lista.scrollTop = rolagem;
  });
  useEffect(() => {
    const reajustar = () => setMedida((n) => n + 1);
    window.addEventListener("resize", reajustar);
    return () => window.removeEventListener("resize", reajustar);
  }, []);
  const [versaoA, setVersaoA] = useState("");
  const [versaoB, setVersaoB] = useState("");
  const [escolhendoImpressao, setEscolhendoImpressao] = useState(false);
  // "Imprimir para assinar": a folha leva um campo de assinatura do responsável (só no papel desta impressão).
  const [paraAssinar, setParaAssinar] = useState(false);
  const ultimoPedidoDeImpressao = useRef(0);
  useEffect(() => {
    if (!pedidoDeImpressao || pedidoDeImpressao.n === ultimoPedidoDeImpressao.current) return;
    ultimoPedidoDeImpressao.current = pedidoDeImpressao.n;
    setParaAssinar(pedidoDeImpressao.assinar);
    setEscolhendoImpressao(true);
  }, [pedidoDeImpressao]);
  // Capa que sai no papel desta impressão (a página 1 do PDF); sem ela o PDF é o de sempre.
  const [capaNoPapel, setCapaNoPapel] = useState<ModeloDaCapa | null>(null);
  // Cartaz "Como lavar as mãos": janela de escolhas e a cópia que sai no papel (A4, uma página).
  const [cartazAberto, setCartazAberto] = useState(false);
  const [cartazNoPapel, setCartazNoPapel] = useState<DadosDoCartaz | null>(null);
  // Seções do modelo visíveis: as que já têm conteúdo e as que a pessoa adicionou por "+ Adicionar seção".
  const [secoesDoModeloAbertas, setSecoesDoModeloAbertas] = useState<IdDaSecaoDoModelo[]>(() => secoesDoModeloComConteudo(pop.conteudo || {}));

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
  const modoLeitura = parte === "documento" && !editavel;
  const secoesDaLista = secoesDoEditor(rascunho, definicao, dadosDoResponsavel);
  const avisoDeConferencia = avisoDeConferenciaObrigatoria(pop);
  const secoesFeitas = secoesDaLista.filter((item) => item.preenchida).length;
  const posicaoDaSecao = Math.max(0, secoesDaLista.findIndex((item) => item.id === secao));
  const secaoAtualNaLista = secoesDaLista[posicaoDaSecao];
  const secoesComoAmbientes: InfoAmbiente[] = secoesDaLista.map((item) => ({ nome: item.id, rotulo: item.titulo, total: 1, respondidos: item.preenchida ? 1 : 0, naoConformes: 0, situacao: item.preenchida ? "concluido" : "pendente", geral: false } as InfoAmbiente));
  const primeiraQueFalta = secoesDaLista.find((item) => !item.preenchida && item.falta);
  const textoDaFaltaNaLinha = primeiraQueFalta ? `Falta ${primeiraQueFalta.falta!.replace(/^falta (definir )?(a |o )?/, "a ")}` : "";
  // O documento (folha, PDF) leva a razão social em formato de título; o nome de exibição vale só para as telas.
  const dadosDaEmpresa = { nome: razaoSocialTitulo(nomeSemNumerosNoInicio(empresa.razaoSocial || empresa.nomeFantasia || "")), cnpj: (empresa.cnpj || "").trim() };
  const opcoesDaFolha = { responsavel: responsavelDoEstabelecimento, exigeAcaoCorretiva: exigeAcaoCorretivaSes };
  const folhaDeLeitura = folhaDoPop(comConferenciaAtual(rascunho), dadosDaEmpresa, opcoesDaFolha);
  const folhaDaPrevia = folhaDoPop(comConferenciaAtual(rascunho), dadosDaEmpresa, { ...opcoesDaFolha, marcarBranco: true });
  const dicaDaNorma = (conteudo.referencias || [])[0];
  const comCartaz = eDeLavagemDeMaos(pop);
  const aprovadoDoCartaz = comCartaz ? popAprovadoParaOCartaz(pop) : null;
  const conteudoDoCartazAtual = conteudoDoCartaz(aprovadoDoCartaz?.pop || pop);
  const rodapeDoCartazAtual = rodapeDoCartaz({ empresa: dadosDaEmpresa.nome, codigo: (aprovadoDoCartaz?.pop || pop).codigo || "", versao: (aprovadoDoCartaz?.pop || pop).versao, aprovadoEm: aprovadoDoCartaz?.aprovadoEm || "" });
  const bloqueioDoCartaz = podeGerarOCartaz(pop);
  function gerarCartaz(estilo: EstiloDoCartaz, logotipo: string | undefined) {
    if (!aprovadoDoCartaz) return;
    setCartazAberto(false);
    setCartazNoPapel({ estilo: estiloValido(estilo), conteudo: conteudoDoCartaz(aprovadoDoCartaz.pop), rodape: rodapeDoCartazAtual, logotipo });
    // Uma página A4 sem margens; o POP aberto não sai junto. Tudo some de novo quando a impressão termina.
    const regra = document.createElement("style");
    regra.id = "estilo-impressao-cartaz";
    regra.textContent = "@media print{@page{size:A4;margin:0}#pop-folha,#pop-folha *{display:none!important}}";
    document.head.appendChild(regra);
    // O PDF já sai com o nome "Cartaz – Como lavar as mãos – POP-XX"; o título da página volta depois.
    const tituloAntes = document.title;
    document.title = `Cartaz – Como lavar as mãos – ${aprovadoDoCartaz.pop.codigo || "POP"}`;
    const limpar = () => {
      document.title = tituloAntes;
      regra.remove();
      setCartazNoPapel(null);
      window.removeEventListener("afterprint", limpar);
    };
    window.addEventListener("afterprint", limpar);
    window.setTimeout(() => window.print(), 250);
  }
  const iconeAutomaticoDaCapa = iconeDoPop({ origemModelo: pop.origemModelo, catalogoId: pop.catalogoId });
  const iconeEscolhidoDaCapa = eIconeConhecido(pop.iconeCapa) ? pop.iconeCapa : "";
  async function imprimirFolha(capa: CapaCompleta | null, icone: string) {
    setEscolhendoImpressao(false);
    if (paraAssinar) window.addEventListener("afterprint", () => setParaAssinar(false), { once: true });
    // Vale o que está na janela (salvo ou não), nunca só o que está guardado na empresa.
    const modeloDaCapaImpressa = capa?.ativa ? modeloDaCapa(capa, { ...folhaDeLeitura.capa, iconeId: icone || iconeAutomaticoDaCapa }) : null;
    setCapaNoPapel(modeloDaCapaImpressa);
    // A capa só existe no papel: some de novo quando a impressão termina.
    if (capa?.ativa) window.addEventListener("afterprint", () => setCapaNoPapel(null), { once: true });
    // Espera a capa ser desenhada e o ícone e o logotipo carregarem: senão o PDF sai com o lugar vazio.
    if (modeloDaCapaImpressa) await aguardarImagensParaImprimir(document, modeloDaCapaImpressa.icone ? [modeloDaCapaImpressa.icone.url] : []);
    onImprimir?.(`${rascunho.codigo || "POP"} – ${rascunho.titulo}`, {
      esquerda: [dadosDaEmpresa.nome, dadosDaEmpresa.cnpj ? `CNPJ ${formatarCnpj(dadosDaEmpresa.cnpj)}` : ""],
      // O cabeçalho corrido tem só empresa, CNPJ e "POP-01 · versão 1.1"; "Aprovada por …" fica uma vez só, abaixo do título.
      direita: [`${rascunho.codigo ? `${rascunho.codigo} · ` : ""}versão ${rascunho.versao}`],
      rodape: rascunho.titulo,
      ocultarNoCorpo: ["#pop-folha .pfolha-topo"].concat(modeloDaCapaImpressa ? ["#pop-folha-papel .pfolha-topo"] : []),
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
            {comCartaz && (
              <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setCartazAberto(true)}>
                Gerar cartaz
              </button>
            )}
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
          <PopFolha folha={folhaDeLeitura} modo="leitura" id="pop-folha" assinatura={paraAssinar ? { nome: executorNaTela.nome, cargo: executorNaTela.cargo } : null} />
        </div>
      )}

      {parte === "documento" && !modoLeitura && (
        <div className="pdoc">
          <div className="pdoc-estreito">
            <div className="pdoc-estreito-linha">
              <AmbientesCortina
                ambientes={secoesComoAmbientes}
                atual={secao}
                onSelecionar={(nome) => alternar(nome as Secao)}
                semBusca
                semAbreviar
                nomeDaLista="Seções do POP"
                conta={(ambiente) => <span className="pdoc-lista-falta" aria-label="falta preencher">●</span>}
                renderBotao={({ aberto, alternar: abrir }) => (
                  <button type="button" className="chk-amb-botao pdoc-sel" aria-haspopup="listbox" aria-expanded={aberto} aria-label={`Seção: ${secaoAtualNaLista?.titulo}. Trocar de seção`} onClick={abrir}>
                    <span className="chk-amb-botao-nome">
                      <span className="pdoc-sel-tablet">Seção {posicaoDaSecao + 1} de {secoesDaLista.length} · {secaoAtualNaLista?.titulo}</span>
                      <span className="pdoc-sel-celular">{secaoAtualNaLista?.titulo} · {posicaoDaSecao + 1} de {secoesDaLista.length}</span>
                    </span>
                    <span className="chk-amb-botao-seta" aria-hidden="true">{aberto ? "▴" : "▾"}</span>
                  </button>
                )}
              />
              <button type="button" className="ui-btn ui-btn--secondary pdoc-ver-folha" onClick={() => setVerFolha(true)}>
                Ver folha
              </button>
              {comCartaz && (
                <button type="button" className="ui-btn ui-btn--secondary pdoc-so-tablet" onClick={() => setCartazAberto(true)}>
                  Gerar cartaz
                </button>
              )}
              {onImprimir && (
                <button type="button" className="ui-btn ui-btn--secondary pdoc-so-tablet" onClick={() => setEscolhendoImpressao(true)}>
                  Imprimir / PDF
                </button>
              )}
            </div>
            {textoDaFaltaNaLinha && (
              <p className="pdoc-falta-linha">
                <span className="pdoc-falta-ponto" aria-hidden="true" /> {textoDaFaltaNaLinha}
                {editavel && primeiraQueFalta && (
                  <>
                    {" · "}
                    <button type="button" className="pdoc-definir" onClick={() => alternar(primeiraQueFalta.id as Secao)}>Definir</button>
                  </>
                )}
              </p>
            )}
          </div>
          <aside className="pdoc-secoes" aria-label="Seções do POP">
            <h2 className="pdoc-lista-titulo">Seções · {secoesFeitas} de {secoesDaLista.length}</h2>
            <ul className="pdoc-lista">
              {secoesDaLista.map((item) => (
                <li key={`${item.id}-${item.titulo}`}>
                  <button type="button" className={`pdoc-item${secao === item.id ? " is-ativa" : ""}${item.preenchida ? "" : " is-falta"}`} aria-current={secao === item.id ? "true" : undefined} onClick={() => alternar(item.id)}>
                    <span className={`pdoc-marca${item.preenchida ? " is-ok" : " is-falta"}`} aria-hidden="true">{item.preenchida ? "✓" : ""}</span>
                    <span className="pdoc-item-textos">
                      <span className="pdoc-item-titulo">{item.titulo}</span>
                      {!item.preenchida && item.falta && <span className="pdoc-item-sub">{item.falta}</span>}
                    </span>
                    <span className="sr-only">{item.preenchida ? " (preenchida)" : " (falta preencher)"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <div className={`pdoc-meio${secao === "passos" ? " pdoc-meio--passos" : ""}`}>
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
                <label className="pc-field">
                  <span className="ui-eyebrow">Responsável pela execução</span>
                  <Select
                    className="ui-input ui-input--lista"
                    value={outraPessoa || (executorNaTela.nome && executorNaTela.nome !== (dadosDoResponsavel?.nome || "")) ? "__outra" : executorNaTela.nome}
                    disabled={!editavel}
                    onChange={(evento) => {
                      const valor = evento.target.value;
                      if (valor === "__outra") {
                        setOutraPessoa(true);
                        return;
                      }
                      setOutraPessoa(false);
                      mudarResponsavel({ nome: valor, cargo: valor && valor === dadosDoResponsavel?.nome ? dadosDoResponsavel?.cargo || executorNaTela.cargo : executorNaTela.cargo });
                    }}
                  >
                    <option value="">Escolha o responsável</option>
                    {dadosDoResponsavel?.nome ? <option value={dadosDoResponsavel.nome}>{dadosDoResponsavel.nome}</option> : null}
                    <option value="__outra">Outra pessoa…</option>
                  </Select>
                </label>
                {(outraPessoa || (executorNaTela.nome && executorNaTela.nome !== (dadosDoResponsavel?.nome || ""))) && (
                  <Campo rotulo="Nome da pessoa" valor={executorNaTela.nome} desabilitado={!editavel} erro={tocado && !executorNaTela.nome.trim() ? "Informe o nome." : ""} onChange={(valor) => mudarResponsavel({ nome: valor, cargo: executorNaTela.cargo })} />
                )}
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
              <Campo rotulo="Cargo ou função" valor={executorNaTela.cargo} desabilitado={!editavel} erro={editavel && !executorNaTela.cargo.trim() ? "Falta informar o cargo" : ""} onChange={(valor) => mudarResponsavel({ nome: executorNaTela.nome, cargo: semPontuacaoNoInicio(valor) })} />
              <div className="pc-field">
                <CampoDeFrequencia
                  frequencia={conteudo.frequencia}
                  estruturada={conteudo.frequenciaEstruturada}
                  desabilitado={!editavel}
                  erro={tocado && !frequenciaDoPop(conteudo) ? "Informe a frequência." : ""}
                  onChange={(nova) => {
                    const gravado = conteudoComFrequencia({ frequencia: conteudo.frequencia, frequenciaEstruturada: conteudo.frequenciaEstruturada }, nova);
                    mudar({ frequencia: gravado.frequencia, frequenciaEstruturada: gravado.frequenciaEstruturada });
                  }}
                />
                {editavel && sugestaoDaFrequencia && tipoReconhecidoNoTexto(sugestaoDaFrequencia) && sugestaoDaFrequencia !== (conteudo.frequencia || "").trim() && (
                  <span className="ui-row-sub pdoc-sugestao">
                    Sugestão: {sugestaoDaFrequencia}{" · "}
                    <button type="button" className="pc-link-btn" title="Usar esta sugestão" onClick={() => {
                      const gravado = conteudoComFrequencia({ frequencia: "", frequenciaEstruturada: undefined }, frequenciaDoPop({ frequencia: sugestaoDaFrequencia }));
                      mudar({ frequencia: gravado.frequencia, frequenciaEstruturada: gravado.frequenciaEstruturada });
                    }}>
                      Usar
                    </button>
                  </span>
                )}
              </div>
            </div>
          </SecaoRecolhivel>

          <SecaoRecolhivel id="passos" titulo="Passos" resumo={`${(conteudo.passos || []).filter((passo) => passo.texto.trim()).length === 1 ? "1 escrito" : `${(conteudo.passos || []).filter((passo) => passo.texto.trim()).length} escritos`}`} aberta={secao === "passos"} onAlternar={alternar}>
            {editavel && <p className="ui-row-sub pdoc-ajuda pdoc-ajuda-passos"><span className="pdoc-ajuda-clique">Clique</span><span className="pdoc-ajuda-toque">Toque</span> em um passo para editar. O microfone dita e a IA melhora o texto.</p>}
            {dicaDaNorma && (
              <div className="pdoc-dica pdoc-dica--creme" role="status">
                <span className="pdoc-dica-texto" title={dicaDaNorma.orientacao}>{dicaDaNorma.orientacao}</span>
                <span className="pdoc-dica-fonte">
                  {dicaDaNorma.norma}, {dicaDaNorma.item}
                  {dicaDaNorma.conferir && <span className="pop-conferir">conferir</span>}
                  {" · "}
                  <button type="button" className="pc-link-btn" onClick={() => alternar("referencias")}>Ver fontes</button>
                </span>
              </div>
            )}
            {editavel && temPassoEmBranco && <span className="ui-row-sub">Escreva o passo em branco antes de adicionar outro.</span>}
            {passos.length === 0 && <p className="ui-row-sub pdoc-vazio">Nenhum passo ainda. Os passos ficam em branco para o RT e a empresa preencherem.</p>}
            <ol ref={listaDePassos} className="pop-passos pop-passos--rolagem pdoc-passos scroll-fino">
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
                    {editavel && passo.id === passoEmFoco && (
                      <span className="pop-passo-acoes">
                        <FieldVoiceTools key={passo.id} fieldKey={`pop-passo-${passo.id}`} value={passo.texto} soIcone rotuloIa="IA" onChange={(texto) => mudarPasso(passo.id, texto)} contexto="Passo de um Procedimento Operacional Padronizado de segurança dos alimentos." />
                        {menuDoPasso?.id === passo.id && menuDoPasso.tipo === "mais" && (
                          <span className="pop-passo-menu" role="menu" aria-label={`Ações do passo ${indice + 1}`}>
                            {passo.subtitulo === undefined && (
                              <button type="button" role="menuitem" className="ui-btn ui-btn--soft ui-btn--small" onClick={() => { mudarSubtitulo(passo.id, ""); setMenuDoPasso(null); }}>
                                + Subtítulo
                              </button>
                            )}
                            <button type="button" role="menuitem" className="ui-btn ui-btn--soft ui-btn--small" onClick={() => { mudar({ passos: passos.filter((item) => item.id !== passo.id) }); setMenuDoPasso(null); }}>
                              Remover o passo
                            </button>
                          </span>
                        )}
                        {menuDoPasso?.id === passo.id && menuDoPasso.tipo === "ordem" && (
                          <span className="pop-passo-menu" role="menu" aria-label={`Ordem do passo ${indice + 1}`}>
                            <button type="button" role="menuitem" className="ui-btn ui-btn--soft ui-btn--small" disabled={indice === 0} onClick={() => moverPasso(indice, -1)}>↑ Subir</button>
                            <button type="button" role="menuitem" className="ui-btn ui-btn--soft ui-btn--small" disabled={indice === passos.length - 1} onClick={() => moverPasso(indice, 1)}>↓ Descer</button>
                          </span>
                        )}
                        <button type="button" className="ui-btn ui-btn--soft ui-btn--small" aria-haspopup="menu" aria-expanded={menuDoPasso?.id === passo.id && menuDoPasso.tipo === "ordem"} aria-label={`Reordenar o passo ${indice + 1}`} title="Reordenar" onClick={() => setMenuDoPasso((atual) => (atual?.id === passo.id && atual.tipo === "ordem" ? null : { id: passo.id, tipo: "ordem" }))}>↕</button>
                        <button type="button" className="ui-btn ui-btn--soft ui-btn--small" aria-haspopup="menu" aria-expanded={menuDoPasso?.id === passo.id && menuDoPasso.tipo === "mais"} aria-label={`Mais ações do passo ${indice + 1}`} title="Mais ações" onClick={() => setMenuDoPasso((atual) => (atual?.id === passo.id && atual.tipo === "mais" ? null : { id: passo.id, tipo: "mais" }))}>⋯</button>
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
                  <Campo key={chave} guia={campoGuiadoDaHigienizacao(chave, Boolean(definicao.eReservatorio))} rotulo={rotulo} valor={conteudo.higienizacao![chave]} desabilitado={!editavel} onChange={(valor) => mudar({ higienizacao: { ...conteudo.higienizacao!, [chave]: valor } })} />
                ))}
              </div>
            </SecaoRecolhivel>
          )}

          {definicao?.bloco === "pragas" && conteudo.pragas && (
            <SecaoRecolhivel id="extra" titulo="Controle de pragas" resumo="medidas e comprovante" aberta={secao === "extra"} onAlternar={alternar}>
              <Campo guia={CAMPOS_GUIADOS["pragas.preventivas"]} rotulo="Medidas preventivas" linhas={2} valor={conteudo.pragas.preventivas} desabilitado={!editavel} onChange={(valor) => mudar({ pragas: { ...conteudo.pragas!, preventivas: valor } })} />
              <Campo guia={CAMPOS_GUIADOS["pragas.corretivas"]} rotulo="Medidas corretivas" linhas={2} valor={conteudo.pragas.corretivas} desabilitado={!editavel} onChange={(valor) => mudar({ pragas: { ...conteudo.pragas!, corretivas: valor } })} />
              <Campo guia={CAMPOS_GUIADOS["pragas.comprovanteEmpresa"]} rotulo="Comprovante da empresa especializada (opcional)" valor={conteudo.pragas.comprovanteEmpresa} desabilitado={!editavel} onChange={(valor) => mudar({ pragas: { ...conteudo.pragas!, comprovanteEmpresa: valor } })} />
            </SecaoRecolhivel>
          )}

          {definicao?.bloco === "manipuladores" && conteudo.manipuladores && (
            <>
            <SecaoRecolhivel id="extra" titulo="Higiene e saúde" resumo="mãos e sintomas" aberta={secao === "extra"} onAlternar={alternar}>
              <Campo guia={CAMPOS_GUIADOS["manipuladores.lavagemMaosEtapas"]} rotulo="Lavagem e antissepsia das mãos: etapas" linhas={2} valor={conteudo.manipuladores.lavagemMaosEtapas} desabilitado={!editavel} onChange={(valor) => mudar({ manipuladores: { ...conteudo.manipuladores!, lavagemMaosEtapas: valor } })} />
              <Campo guia={CAMPOS_GUIADOS["manipuladores.lavagemMaosFrequencia"]} rotulo="Lavagem e antissepsia das mãos: frequência" valor={conteudo.manipuladores.lavagemMaosFrequencia} desabilitado={!editavel} onChange={(valor) => mudar({ manipuladores: { ...conteudo.manipuladores!, lavagemMaosFrequencia: valor } })} />
              <Campo guia={CAMPOS_GUIADOS["manipuladores.lesoesSintomas"]} rotulo="Medidas para lesões, sintomas ou suspeita de problema de saúde" linhas={2} valor={conteudo.manipuladores.lesoesSintomas} desabilitado={!editavel} onChange={(valor) => mudar({ manipuladores: { ...conteudo.manipuladores!, lesoesSintomas: valor } })} />
            </SecaoRecolhivel>
            <SecaoRecolhivel id="extra2" titulo="Exames e capacitação" resumo="exames e capacitação" aberta={secao === "extra2"} onAlternar={alternar}>
              <div className="pop-grade">
                <label className="pc-field">
                  <span className="ui-eyebrow">Exames: situação</span>
                  <Select className="ui-input" value={conteudo.manipuladores.examesApto} disabled={!editavel} onChange={(evento) => mudar({ manipuladores: { ...conteudo.manipuladores!, examesApto: evento.target.value as "" | "apto" | "nao-apto" } })}>
                    <option value="">Não informado</option>
                    <option value="apto">Apto</option>
                    <option value="nao-apto">Não apto</option>
                  </Select>
                </label>
                <Campo rotulo="Exames: válidos até" tipo="data" valor={conteudo.manipuladores.examesValidade} desabilitado={!editavel} onChange={(valor) => mudar({ manipuladores: { ...conteudo.manipuladores!, examesValidade: valor } })} />
                <Campo guia={CAMPOS_GUIADOS["manipuladores.examesPeriodicidade"]} rotulo="Exames: periodicidade" valor={conteudo.manipuladores.examesPeriodicidade} desabilitado={!editavel} onChange={(valor) => mudar({ manipuladores: { ...conteudo.manipuladores!, examesPeriodicidade: valor } })} />
              </div>
              <p className="ui-row-sub">Guarde só “apto” e a validade. Nunca o laudo: é dado de saúde sensível.</p>
              <div className="pop-grade">
                <Campo guia={CAMPOS_GUIADOS["manipuladores.capacitacaoCargaHoraria"]} rotulo="Capacitação: carga horária" valor={conteudo.manipuladores.capacitacaoCargaHoraria} desabilitado={!editavel} onChange={(valor) => mudar({ manipuladores: { ...conteudo.manipuladores!, capacitacaoCargaHoraria: valor } })} />
                <Campo guia={CAMPOS_GUIADOS["manipuladores.capacitacaoConteudo"]} rotulo="Capacitação: conteúdo" valor={conteudo.manipuladores.capacitacaoConteudo} desabilitado={!editavel} onChange={(valor) => mudar({ manipuladores: { ...conteudo.manipuladores!, capacitacaoConteudo: valor } })} />
                <Campo guia={CAMPOS_GUIADOS["manipuladores.capacitacaoFrequencia"]} rotulo="Capacitação: frequência" valor={conteudo.manipuladores.capacitacaoFrequencia} desabilitado={!editavel} onChange={(valor) => mudar({ manipuladores: { ...conteudo.manipuladores!, capacitacaoFrequencia: valor } })} />
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
            <div className="pdoc-previa-topo">
              <h2 className="pdoc-lista-titulo">Folha</h2>
              {notasNaBarra}
            </div>
            <div className="pdoc-previa-acoes">
              {comCartaz && (
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => setCartazAberto(true)}>
                  Gerar cartaz
                </button>
              )}
              {onImprimir && (
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => setEscolhendoImpressao(true)}>
                  Imprimir / PDF
                </button>
              )}
            </div>
            <PopFolha folha={folhaDaPrevia} modo="previa" />
          </aside>
          {onImprimir && (
            // Cópia da folha só para o papel (o rascunho sai marcado “Rascunho” na linha de situação).
            <div className="pdoc-so-papel" aria-hidden="true">
              <PopFolha folha={folhaDeLeitura} modo="leitura" id="pop-folha" />
            </div>
          )}
        </div>
      )}

      {parte === "historico" && (
        <div className="pop-versoes">
          {versoes.length >= 2 ? (
            <>
              <div className="pop-comparar-escolha">
                <label className="pc-field">
                  <span className="ui-eyebrow">Comparar</span>
                  <Select className="ui-input ui-input--lista pop-seletor-baixo" value={escolhidaA?.versao} onChange={(evento) => setVersaoA(evento.target.value)}>
                    {versoes.map((versao) => (
                      <option key={versao.versao} value={versao.versao}>v{versao.versao}</option>
                    ))}
                  </Select>
                </label>
                <label className="pc-field">
                  <span className="ui-eyebrow">com</span>
                  <Select className="ui-input ui-input--lista pop-seletor-baixo" value={escolhidaB?.versao} onChange={(evento) => setVersaoB(evento.target.value)}>
                    {versoes.map((versao) => (
                      <option key={versao.versao} value={versao.versao}>v{versao.versao}</option>
                    ))}
                  </Select>
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
            {avisoDeConferencia && (onIrParaConferencia ? (
              <button type="button" className="pdoc-chip-conferir pdoc-chip-conferir--link" title="Ir aos itens para conferir" onClick={onIrParaConferencia}>{avisoDeConferencia}</button>
            ) : (
              <span className="pdoc-chip-conferir" role="note">{avisoDeConferencia}</span>
            ))}
            {onIrParaConferencia && (
              <button type="button" className="ui-btn ui-btn--secondary pdoc-ir-conferir" onClick={onIrParaConferencia}>
                Ir para Conferir
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
          </div>
        </div>
      )}
      {verFolha && (
        <div className="pc-modal-layer pdoc-folha-camada" role="presentation">
          <div className="pc-modal-backdrop" onClick={() => setVerFolha(false)} />
          <section className="pdoc-folha-janela" role="dialog" aria-modal="true" aria-label="Folha do POP">
            <header className="pdoc-folha-janela-topo">
              <h2 className="pdoc-lista-titulo">Folha</h2>
              <button type="button" className="ui-btn ui-btn--secondary pdoc-folha-fechar" aria-label="Fechar a folha" onClick={() => setVerFolha(false)}>✕</button>
            </header>
            {notasNaBarra}
            <div className="pdoc-previa-acoes">
              {comCartaz && (
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => { setVerFolha(false); setCartazAberto(true); }}>
                  Gerar cartaz
                </button>
              )}
              {onImprimir && (
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => { setVerFolha(false); setEscolhendoImpressao(true); }}>
                  Imprimir / PDF
                </button>
              )}
            </div>
            <div className="pdoc-folha-janela-corpo">
              <PopFolha folha={folhaDaPrevia} modo="previa" />
            </div>
          </section>
        </div>
      )}
      {cartazAberto && comCartaz && (
        <ConfigCartazLavagem
          conteudo={conteudoDoCartazAtual}
          rodape={rodapeDoCartazAtual}
          guardado={{ estilo: estiloValido(estiloDoCartaz), logotipo: capaDaEmpresa?.logotipo }}
          podeSalvar={Boolean(onSalvarCartaz && podeEditar)}
          bloqueio={bloqueioDoCartaz.pode ? null : { mensagem: bloqueioDoCartaz.mensagem, explicacao: bloqueioDoCartaz.explicacao }}
          onCancelar={() => setCartazAberto(false)}
          onSalvar={(estilo, logotipo) => onSalvarCartaz?.(estilo, logotipo)}
          onGerar={gerarCartaz}
        />
      )}
      {capaNoPapel && createPortal(
        <div id="impressao-pop" aria-hidden="true">
          <PopFolha folha={folhaDeLeitura} modo="leitura" id="pop-folha-papel" capa={capaNoPapel} />
        </div>,
        document.body
      )}
      {cartazNoPapel && createPortal(<div id="cartaz-lavagem" className="cartaz-so-papel" aria-hidden="true"><CartazLavagem dados={cartazNoPapel} /></div>, document.body)}
      {escolhendoImpressao && (
        <ConfigCapaDoPop
          dados={folhaDeLeitura.capa}
          iconeAutomatico={iconeAutomaticoDaCapa}
          iconeEscolhido={iconeEscolhidoDaCapa}
          inicial={capaInicialDoDialogo(pop, (pop.versoes || []).find((versao) => versao.versao === pop.versao)?.capa, capaDaEmpresa)}
          guardada={capaDaEmpresa}
          podeSalvar={Boolean(onSalvarCapa && podeEditar)}
          avisoNaoConferido={popNaoConferido(comConferenciaAtual(rascunho))}
          onCancelar={() => {
            setEscolhendoImpressao(false);
            setParaAssinar(false);
          }}
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
