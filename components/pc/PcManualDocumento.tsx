"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import FieldVoiceTools from "@/components/FieldVoiceTools";
import MenuMais from "@/components/pc/MenuMais";
import { confirmar } from "@/lib/dialogos";
import {
  LIMITE_DA_IDENTIFICACAO,
  LIMITE_DA_RESPONSABILIDADE,
  erroDoCpfCnpj,
  erroDoTelefone,
  mascararCpfCnpj,
  mascararTelefone,
  tomDoResumo,
} from "@/lib/documentosCentral";
import { usePilhaDeJanelas } from "../usePilhaDeJanelas";
import { CAMPOS_DA_IDENTIFICACAO, fraseDoPreencher, type OfertaDeOutroManual, ativosDoPapel, contarPreenchidos, mascaraCompletaParaAvancar, proximoCampoDaIdentificacao, sugestoesQueFaltam, type CampoDaIdentificacao } from "@/lib/manualIdentificacao";
import type { PapelResponsabilidadeManual, ResponsabilidadeManual } from "@/types";

type Props = {
  valores: Record<CampoDaIdentificacao, string>;
  rotulos: Record<string, string>;
  /** Campos que vieram do perfil do RT e ainda não foram editados (selo "do perfil do RT"). */
  doPerfil: CampoDaIdentificacao[];
  onChange: (campo: CampoDaIdentificacao, valor: string) => void;
  /** Botão "Preencher com dados do RT": completa os campos vazios e devolve a frase do resultado (uma linha) e o primeiro campo ainda vazio. */
  onPreencher?: () => RetornoDoPreencher;
  /** Não há Consultor/RT vinculado à empresa: os dados pessoais ficam só neste Manual (linha pequena de aviso). */
  semRtVinculado?: boolean;
  /** Sugestões de atividade a partir do CNAE principal e dos secundários. */
  sugestoesDeAtividade?: string[];
  /** Campos que o servidor recusou (limite de texto): aviso dentro do próprio campo. */
  errosDoServidor?: Record<string, string>;
  responsabilidades: ResponsabilidadeManual[];
  onResponsabilidadesChange: (responsabilidades: ResponsabilidadeManual[]) => void;
  /** Há alterações do Manual ainda não salvas (a barra de baixo da Central não existe mais nesta tela). */
  temAlteracoes: boolean;
  salvando?: boolean;
  erroDoSalvar?: string;
  /** Empresa cujo Manual está na tela; o Salvar devolve o id capturado quando a janela abriu. */
  empresaId: string;
  onSalvar: (empresaId: string) => void;
  /** "Fechar sem salvar": a tela volta aos valores do último salvo (o digitado não fica no formulário). */
  onDescartar?: () => void;
  /** CPF/endereço do mesmo RT em outro Manual (só Administrador e RT): oferta de uma linha, aplicada só depois do "Usar". */
  oferta?: OfertaDeOutroManual | null;
  onUsarOferta?: (oferta: OfertaDeOutroManual) => void;
};

/** Resultado do Preencher: quantos campos entraram, o primeiro ainda vazio e, se há valor salvo diferente do RT, a pergunta "Substituir?". */
export type RetornoDoPreencher = {
  preenchidos: number;
  primeiroVazio: CampoDaIdentificacao | null;
  conflito?: { texto: string; substituir: () => { preenchidos: number; primeiroVazio: CampoDaIdentificacao | null } };
};

type Secao = "identificacao" | PapelResponsabilidadeManual;

type Posicao = { top: number; left: number; width: number };

const PAPEIS: PapelResponsabilidadeManual[] = ["Proprietário", "Consultor/RT"];

const erroDoCampo = (campo: CampoDaIdentificacao, valor: string) => (campo === "consultorCpfCnpj" ? erroDoCpfCnpj(valor) : campo === "consultorTelefone" ? erroDoTelefone(valor) : "");

const FOCAVEIS = 'button:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Manual da empresa: três linhas (sem caixas). Clicar abre uma janela que desce colada na linha, por cima das seguintes (no celular, uma folha que sobe de baixo). Uma aberta por vez; o rodapé com o estado e o Salvar fica dentro da janela.
export default function PcManualDocumento({ valores, rotulos, doPerfil, onChange, onPreencher, semRtVinculado = false, sugestoesDeAtividade = [], errosDoServidor, responsabilidades, onResponsabilidadesChange, temAlteracoes, salvando = false, erroDoSalvar = "", empresaId, onSalvar, onDescartar, oferta = null, onUsarOferta }: Props) {
  const [aberta, setAberta] = useState<Secao | null>(null);
  const [celular, setCelular] = useState(false);
  const { ehTopo, coberta } = usePilhaDeJanelas(Boolean(aberta));
  const empresaAoAbrir = useRef(empresaId);
  useEffect(() => { if (aberta) empresaAoAbrir.current = empresaId; // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberta]);
  const [posicao, setPosicao] = useState<Posicao | null>(null);
  const [resultado, setResultado] = useState<{ colocados: number } | null>(null);
  const [conflito, setConflito] = useState<RetornoDoPreencher["conflito"] | null>(null);
  const campos = useRef<Partial<Record<CampoDaIdentificacao, HTMLInputElement | HTMLTextAreaElement | null>>>({});
  const linhas = useRef<Partial<Record<Secao, HTMLButtonElement | null>>>({});
  const janela = useRef<HTMLDivElement | null>(null);
  const espacador = useRef<HTMLDivElement | null>(null);
  const espera = useRef<number | null>(null);
  const [tocados, setTocados] = useState<Partial<Record<CampoDaIdentificacao, boolean>>>({});
  const [emEdicao, setEmEdicao] = useState<string | null>(null);
  const [sugestoesAbertas, setSugestoesAbertas] = useState(false);
  const [sugestaoAtiva, setSugestaoAtiva] = useState(-1);
  const { preenchidos, total } = contarPreenchidos(valores);

  useEffect(() => {
    const consulta = window.matchMedia("(max-width: 767px)");
    const ler = () => setCelular(consulta.matches);
    ler();
    consulta.addEventListener("change", ler);
    return () => consulta.removeEventListener("change", ler);
  }, []);

  // Atividades cresce com o texto (sem barra de rolagem interna e sem texto cortado) até um limite generoso.
  useLayoutEffect(() => {
    const caixa = campos.current.atividadeDescricao;
    if (!caixa) return;
    caixa.style.height = "auto";
    caixa.style.height = `${Math.min(caixa.scrollHeight + (caixa.offsetHeight - caixa.clientHeight), 240)}px`;
  }, [valores.atividadeDescricao, aberta, celular]);

  // A janela do PC e do tablet nasce colada embaixo da linha aberta, com a largura dela. Tem altura mínima utilizável (ALTURA_MINIMA_DA_JANELA): se não couber abaixo da linha, a página ganha espaço embaixo (espaçador) e rola para trazer a linha ao topo; se ainda assim não couber, só a área dos campos rola por dentro (título e rodapé ficam fixos).
  useLayoutEffect(() => {
    const espaco = espacador.current;
    if (!aberta || celular) { setPosicao(null); if (espaco) espaco.style.height = "0px"; return; }
    const medir = () => {
      const linha = linhas.current[aberta];
      const caixa = janela.current;
      if (!linha) return;
      if (espaco) espaco.style.height = "0px";
      let r = linha.getBoundingClientRect();
      if (caixa) {
        caixa.classList.remove("is-rola");
        caixa.style.maxHeight = "";
        caixa.style.height = "";
        const natural = caixa.scrollHeight;
        const minimo = Math.min(natural, ALTURA_MINIMA_DA_JANELA, window.innerHeight - 24);
        const livre = () => window.innerHeight - r.bottom - 12;
        if (livre() < minimo && espaco) {
          // A rolagem é do primeiro ancestral com overflow próprio (ou da página); o espaçador cobre o que falta + o vão até a borda dele.
          let pai: HTMLElement | null = linha.parentElement;
          while (pai && pai !== document.body && getComputedStyle(pai).overflowY === "visible") pai = pai.parentElement;
          const rolagem = pai && pai !== document.body && pai !== document.documentElement ? pai : (document.scrollingElement as HTMLElement | null);
          if (rolagem) {
            const borda = rolagem === document.scrollingElement ? window.innerHeight : rolagem.getBoundingClientRect().bottom;
            espaco.style.height = `${Math.ceil(minimo - livre()) + 12 + Math.max(0, borda - espaco.getBoundingClientRect().top)}px`;
            const topo = rolagem === document.scrollingElement ? 0 : rolagem.getBoundingClientRect().top;
            rolagem.scrollTop += Math.max(0, Math.min(r.top - topo - 8, minimo - livre() + 12));
            r = linha.getBoundingClientRect();
          }
        }
        if (natural > livre()) {
          caixa.classList.add("is-rola");
          // Altura explícita: com a área dos campos em "flex: 1 1 0" a altura automática colapsaria (corpo vazio, rodapé colado no título).
          caixa.style.height = `${Math.max(minimo, livre())}px`;
        }
      }
      const top = topoDaJanela(r.bottom, caixa?.offsetHeight ?? 0);
      setPosicao((antes) => (antes && antes.top === top && antes.left === r.left && antes.width === r.width ? antes : { top, left: r.left, width: r.width }));
    };
    const acompanhar = () => {
      const linha = linhas.current[aberta];
      if (!linha) return;
      const r = linha.getBoundingClientRect();
      const top = topoDaJanela(r.bottom, janela.current?.offsetHeight ?? 0);
      setPosicao((antes) => (antes && antes.top === top && antes.left === r.left && antes.width === r.width ? antes : { top, left: r.left, width: r.width }));
    };
    medir();
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", acompanhar, true);
    return () => { window.removeEventListener("resize", medir); window.removeEventListener("scroll", acompanhar, true); };
  }, [aberta, celular, responsabilidades.length, emEdicao, valores.atividadeDescricao]);

  useEffect(() => {
    if (!aberta) return;
    const alvo = janela.current?.querySelector<HTMLElement>("[data-foco-inicial]") || janela.current?.querySelector<HTMLElement>(FOCAVEIS);
    alvo?.focus({ preventScroll: true });
    if (celular) {
      const rolagem = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = rolagem; };
    }
  }, [aberta, celular]);

  function escrever(campo: CampoDaIdentificacao, bruto: string) {
    const valor = campo === "consultorCpfCnpj" ? mascararCpfCnpj(bruto) : campo === "consultorTelefone" ? mascararTelefone(bruto) : bruto.slice(0, LIMITE_DA_IDENTIFICACAO[campo] ?? 200);
    onChange(campo, valor);
  }

  async function fechar() {
    if (temAlteracoes) {
      const ok = await confirmar("Há alterações ainda não salvas. Fechar mesmo assim?", { titulo: "Alterações não salvas", confirmarRotulo: "Fechar sem salvar", cancelarRotulo: "Continuar editando" });
      if (!ok) return;
      onDescartar?.();
    }
    const linha = aberta ? linhas.current[aberta] : null;
    setAberta(null);
    setEmEdicao(null);
    setSugestoesAbertas(false);
    window.setTimeout(() => linha?.focus(), 0);
  }

  async function clicarNaLinha(secao: Secao) {
    if (aberta === secao) { await fechar(); return; }
    if (aberta && temAlteracoes) {
      const ok = await confirmar("Há alterações ainda não salvas. Abrir outra seção mesmo assim?", { titulo: "Alterações não salvas", confirmarRotulo: "Abrir sem salvar", cancelarRotulo: "Continuar editando" });
      if (!ok) return;
    }
    setEmEdicao(null);
    setSugestoesAbertas(false);
    setAberta(secao);
  }

  // Vai ao próximo campo e o traz para a vista dentro da área interna (a página não rola).
  function irPara(campo: CampoDaIdentificacao | null) {
    if (!campo) return;
    const alvo = campos.current[campo];
    if (!alvo) return;
    alvo.focus({ preventScroll: true });
    alvo.scrollIntoView({ block: "nearest" });
  }

  // Máscara completa (CNPJ, celular, data) avança sozinha; CPF de 11 dígitos e telefone fixo esperam um instante, para não cortar quem ainda digita um CNPJ ou um celular.
  function aposDigitar(campo: CampoDaIdentificacao, valor: string) {
    if (espera.current !== null) window.clearTimeout(espera.current);
    espera.current = null;
    const quando = mascaraCompletaParaAvancar(campo, valor);
    if (quando === "agora") irPara(proximoCampoDaIdentificacao(campo));
    else if (quando === "depois") espera.current = window.setTimeout(() => { if (campos.current[campo] && document.activeElement === campos.current[campo]) irPara(proximoCampoDaIdentificacao(campo)); }, 900);
  }

  const faltantes = sugestoesQueFaltam(sugestoesDeAtividade, valores.atividadeDescricao || "");

  function escolherSugestao(texto: string) {
    const atual = (valores.atividadeDescricao || "").trim();
    escrever("atividadeDescricao", atual ? `${atual}; ${texto}` : texto);
    setSugestoesAbertas(false);
    setSugestaoAtiva(-1);
    window.setTimeout(() => irPara(proximoCampoDaIdentificacao("atividadeDescricao")), 0);
  }

  function aoTeclar(campo: CampoDaIdentificacao, evento: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (campo === "atividadeDescricao" && sugestoesAbertas && faltantes.length > 0) {
      if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
        evento.preventDefault();
        const passo = evento.key === "ArrowDown" ? 1 : -1;
        setSugestaoAtiva((atual) => (atual + passo + faltantes.length) % faltantes.length);
        return;
      }
      if (evento.key === "Escape") { evento.preventDefault(); evento.stopPropagation(); setSugestoesAbertas(false); setSugestaoAtiva(-1); return; }
      if (evento.key === "Enter" && sugestaoAtiva >= 0 && faltantes[sugestaoAtiva]) { evento.preventDefault(); escolherSugestao(faltantes[sugestaoAtiva]); return; }
    }
    if (evento.key !== "Enter" || evento.shiftKey || evento.nativeEvent.isComposing) return;
    evento.preventDefault();
    irPara(proximoCampoDaIdentificacao(campo));
  }

  function adicionar(papel: PapelResponsabilidadeManual) {
    const id = crypto.randomUUID();
    onResponsabilidadesChange([...responsabilidades, { id, papel, descricao: "", ativa: true }]);
    setEmEdicao(id);
  }

  async function excluir(item: ResponsabilidadeManual) {
    const ok = await confirmar("Excluir esta responsabilidade? O texto some do Manual desta empresa.", { titulo: "Excluir responsabilidade", confirmarRotulo: "Excluir", cancelarRotulo: "Cancelar" });
    if (!ok) return;
    onResponsabilidadesChange(responsabilidades.filter((outro) => outro.id !== item.id));
    if (emEdicao === item.id) setEmEdicao(null);
  }

  const mudar = (id: string, alteracao: Partial<ResponsabilidadeManual>) => onResponsabilidadesChange(responsabilidades.map((item) => (item.id === id ? { ...item, ...alteracao } : item)));

  const blocoPreencher = onPreencher && (
    <div className="man-preencher">
      <button
        type="button"
        data-foco-inicial
        className="ui-btn ui-btn--secondary"
        onClick={() => {
          const feito = onPreencher();
          setResultado({ colocados: feito.preenchidos });
          setConflito(feito.conflito || null);
          window.setTimeout(() => irPara(feito.primeiroVazio), 0);
        }}
      >
        Preencher com dados do RT
      </button>
      {resultado && !conflito && (
        <span className="man-preencher-apoio" role="status">
          {/* Recalculado a cada alteração: o "Faltam N" some assim que o Manual fica completo (sem recarregar). */}
          {resultado.colocados === 0 && total - preenchidos === 0 ? "Tudo já está preenchido." : fraseDoPreencher(resultado.colocados, total - preenchidos)}
        </span>
      )}
      {conflito && (
        <span className="man-substituir" role="alert">
          <span>{conflito.texto}</span>
          <button
            type="button"
            className="ui-btn ui-btn--secondary ui-btn--small"
            onClick={() => {
              const feito = conflito.substituir();
              setConflito(null);
              setResultado({ colocados: feito.preenchidos });
              window.setTimeout(() => irPara(feito.primeiroVazio), 0);
            }}
          >
            Substituir
          </button>
          <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => { setConflito(null); setResultado({ colocados: 0 }); }}>Manter</button>
        </span>
      )}
      {oferta && onUsarOferta && (
        <span className="man-oferta">
          Encontrado no Manual de {oferta.empresaNome}: {[oferta.cpfFinal ? `CPF/CNPJ final ${oferta.cpfFinal}` : "", oferta.endereco ? "endereço" : ""].filter(Boolean).join(" e ")}.
          <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => onUsarOferta(oferta)}>Usar</button>
        </span>
      )}
    </div>
  );

  const camposDaIdentificacao = (
    <div className="man-grade">
      {CAMPOS_DA_IDENTIFICACAO.map((campo, posicaoDoCampo) => {
        const erro = (tocados[campo] || mascaraCompleta(campo, valores[campo]) ? erroDoCampo(campo, valores[campo]) : "") || errosDoServidor?.[campo] || "";
        const idErro = `man-erro-${campo}`;
        const ehAtividade = campo === "atividadeDescricao";
        const aoMudar = (valorBruto: string) => {
          escrever(campo, valorBruto);
          aposDigitar(campo, valorBruto);
          if (ehAtividade) { setSugestoesAbertas(true); setSugestaoAtiva(-1); }
        };
        const aoSair = () => {
          setTocados((atuais) => (atuais[campo] ? atuais : { ...atuais, [campo]: true }));
          if (ehAtividade) window.setTimeout(() => setSugestoesAbertas(false), 120);
        };
        return (
          <label key={campo} className={`man-campo${posicaoDoCampo === 0 ? " man-campo--duplo" : ""}`}>
            <span className="man-rotulo">
              {rotulos[campo] || campo}
            </span>
            {ehAtividade ? (
              <span className="man-atividade-caixa">
                <textarea
                  ref={(el) => { campos.current[campo] = el; }}
                  rows={1}
                  className={`ui-input man-atividade${erro ? " is-invalid" : ""}`}
                  value={valores[campo]}
                  maxLength={LIMITE_DA_IDENTIFICACAO[campo]}
                  role="combobox"
                  aria-expanded={sugestoesAbertas && faltantes.length > 0}
                  aria-controls="man-sugestoes-lista"
                  aria-autocomplete="list"
                  onFocus={() => setSugestoesAbertas(true)}
                  onChange={(evento) => aoMudar(evento.target.value)}
                  onKeyDown={(evento) => aoTeclar(campo, evento)}
                  onBlur={aoSair}
                />
                {sugestoesAbertas && faltantes.length > 0 && (
                  <span id="man-sugestoes-lista" className="man-sug-lista" role="listbox" aria-label="Sugestões do CNAE">
                    <span className="man-sug-cab">Sugestões do CNAE</span>
                    {faltantes.map((texto, posicaoDaSugestao) => (
                      <span
                        key={texto}
                        role="option"
                        aria-selected={sugestaoAtiva === posicaoDaSugestao}
                        className={`man-sug-item${sugestaoAtiva === posicaoDaSugestao ? " is-ativa" : ""}`}
                        onMouseDown={(evento) => { evento.preventDefault(); escolherSugestao(texto); }}
                        onMouseEnter={() => setSugestaoAtiva(posicaoDaSugestao)}
                      >
                        {texto}
                      </span>
                    ))}
                  </span>
                )}
              </span>
            ) : (
              <input
                ref={(el) => { campos.current[campo] = el; }}
                type={campo === "dataElaboracaoManual" ? "date" : "text"}
                className={`ui-input${erro ? " is-invalid" : ""}${campo === "dataElaboracaoManual" && !valores[campo] ? " is-data-vazia" : ""}`}
                value={valores[campo]}
                inputMode={campo === "consultorCpfCnpj" ? "numeric" : campo === "consultorTelefone" ? "tel" : undefined}
                maxLength={campo === "dataElaboracaoManual" ? undefined : LIMITE_DA_IDENTIFICACAO[campo]}
                aria-invalid={Boolean(erro)}
                aria-describedby={erro ? idErro : undefined}
                onChange={(evento) => aoMudar(evento.target.value)}
                onKeyDown={(evento) => aoTeclar(campo, evento)}
                onBlur={aoSair}
              />
            )}
            {erro && <span id={idErro} className="ui-field-error" role="alert">{erro}</span>}
          </label>
        );
      })}
      {semRtVinculado && <p className="man-sem-rt">Sem RT vinculado: dados salvos só neste Manual</p>}
    </div>
  );

  const listaDeResponsabilidades = (papel: PapelResponsabilidadeManual) => (
    <>
      <ul className="man-lista">
        {responsabilidades.filter((item) => item.papel === papel).map((item) => {
          const editando = emEdicao === item.id;
          return (
            <li key={item.id} className={`man-resp${item.ativa ? "" : " is-desligada"}`}>
              <div className="man-resp-linha">
                <button type="button" role="switch" aria-checked={item.ativa} aria-label={item.ativa ? "Desligar esta responsabilidade" : "Ligar esta responsabilidade"} className={`man-liga${item.ativa ? " is-ligada" : ""}`} onClick={() => mudar(item.id, { ativa: !item.ativa })}>
                  {item.ativa && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                  )}
                </button>
                <span className="man-resp-texto">{item.descricao.trim() || "Sem texto: use ⋯ › Editar para escrever"}</span>
                <MenuMais
                  rotulo="Mais ações da responsabilidade"
                  itens={[
                    { rotulo: "Editar", assumeFoco: true, onClick: () => setEmEdicao(item.id) },
                    { rotulo: "Excluir", perigo: true, assumeFoco: true, onClick: () => void excluir(item) },
                  ]}
                />
              </div>
              {editando && (
                <div className="man-resp-edicao">
                  <textarea rows={3} value={item.descricao} maxLength={LIMITE_DA_RESPONSABILIDADE} onChange={(evento) => mudar(item.id, { descricao: evento.target.value })} className="ui-input" aria-label="Texto da responsabilidade" autoFocus />
                  <span className="man-resp-conta">{item.descricao.length} de {LIMITE_DA_RESPONSABILIDADE}</span>
                  <FieldVoiceTools
                    fieldKey={`responsabilidade-${item.id}`}
                    value={item.descricao}
                    onChange={(texto) => mudar(item.id, { descricao: texto.slice(0, LIMITE_DA_RESPONSABILIDADE) })}
                    contexto={`Responsabilidade do papel ${papel} em um Manual de Boas Práticas. Preserve obrigações e fatos informados.`}
                  />
                  <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => setEmEdicao(null)}>Pronto</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <button type="button" className="man-adicionar" onClick={() => adicionar(papel)}>
        + Adicionar responsabilidade
      </button>
    </>
  );

  const estadoDoRodape = erroDoSalvar && !salvando
    ? <span className="man-estado man-estado--erro" role="alert">{erroDoSalvar}</span>
    : salvando
      ? <span className="man-estado" role="status">Salvando…</span>
      : temAlteracoes
        ? <span className="man-estado man-estado--sujo" role="status"><span className="man-ponto" aria-hidden="true" />{celular ? "Não salvo" : "Alterações ainda não salvas"}</span>
        : <span className="man-estado man-estado--ok" role="status">✓ Tudo salvo</span>;

  const rodape = (
    <div className="man-rodape">
      {estadoDoRodape}
      <span className="man-rodape-botoes">
        {!celular && <button type="button" className="ui-btn ui-btn--secondary" onClick={() => void fechar()}>Fechar</button>}
        <button type="button" disabled={salvando} className={`ui-btn ui-btn--save${!temAlteracoes && !salvando ? " is-apagado" : ""}`} onClick={() => onSalvar(empresaAoAbrir.current)}>{salvando ? "Salvando…" : "Salvar"}</button>
      </span>
    </div>
  );

  function conteudoDe(secao: Secao, titulo: string, resumo: string) {
    const identificacao = secao === "identificacao";
    const papel = secao as PapelResponsabilidadeManual;
    return (
      <>
        {celular && (
          <div className="man-folha-topo">
            <div className="man-folha-titulos">
              <span className="man-folha-titulo">{titulo}</span>
              <span className="man-folha-estado">{resumo}</span>
            </div>
            <button type="button" className="man-folha-fechar" aria-label="Fechar" onClick={() => void fechar()}>✕</button>
          </div>
        )}
        {identificacao && blocoPreencher}
        <div className="man-jan-corpo">{identificacao ? camposDaIdentificacao : listaDeResponsabilidades(papel)}</div>
        {rodape}
      </>
    );
  }

  const linhasDaLista: { secao: Secao; titulo: string; apoio: string; resumo: string; tom: "ok" | "pendente" }[] = [
    { secao: "identificacao", titulo: "Identificação complementar", apoio: "Dados técnicos, elaboração, revisão e aprovação.", resumo: `${preenchidos} de ${total}`, tom: tomDoResumo(preenchidos, total, "completo") },
    ...PAPEIS.map((papel) => {
      const { ativos, total: totalDoPapel } = ativosDoPapel(responsabilidades, papel);
      return { secao: papel as Secao, titulo: `Responsabilidades · ${papel}`, apoio: "Textos-base. Marque as que valem para este cliente.", resumo: `${ativos} de ${totalDoPapel} ativas`, tom: tomDoResumo(ativos, totalDoPapel, "algum") };
    }),
  ];
  const aberto = linhasDaLista.find((linha) => linha.secao === aberta);

  return (
    <section className="man" aria-label="Manual de Boas Práticas" onKeyDown={(evento) => { if (evento.key === "Escape" && aberta && !evento.defaultPrevented && ehTopo()) { evento.stopPropagation(); void fechar(); } }}>
      <div className="cdoc-titulo">
        <div>
          <h2 className="cdoc-h">Manual</h2>
          <p className="cdoc-sub">Identificação e responsabilidades da empresa</p>
        </div>
      </div>

      <ul className="man-linhas">
        {linhasDaLista.map((linha) => {
          const ehAberta = aberta === linha.secao;
          return (
            <li key={linha.secao} className={`man-lin${ehAberta ? " is-aberta" : ""}`}>
              <button
                type="button"
                ref={(el) => { linhas.current[linha.secao] = el; }}
                className="man-cab"
                aria-expanded={ehAberta}
                aria-haspopup="dialog"
                onClick={() => void clicarNaLinha(linha.secao)}
              >
                <span className="man-cab-textos">
                  <span className="man-titulo">{linha.titulo}</span>
                  <span className="man-apoio">{linha.apoio}</span>
                </span>
                <span className={`man-resumo man-resumo--${linha.tom}`}>
                  <span className="man-bolinha" aria-hidden="true" />
                  {linha.resumo}
                </span>
                <span className="man-seta" aria-hidden="true">{ehAberta ? "▴" : "›"}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div ref={espacador} aria-hidden="true" style={{ height: 0, flex: "none" }} />

      {aberto && typeof document !== "undefined" && createPortal(
        celular ? (
          <div className="man-folha-camada" {...(coberta ? { inert: true } : {})}>
            <div className="man-folha-fundo" onClick={() => void fechar()} />
            <div ref={janela} className="man-folha" role="dialog" aria-modal="true" aria-label={aberto.titulo}>
              {conteudoDe(aberto.secao, aberto.titulo, aberto.resumo)}
            </div>
          </div>
        ) : (
          <div ref={janela} className="man-jan" {...(coberta ? { inert: true } : {})} role="dialog" aria-label={aberto.titulo} style={posicao ? { top: posicao.top, left: posicao.left, width: posicao.width } : { visibility: "hidden" }}>
            {conteudoDe(aberto.secao, aberto.titulo, aberto.resumo)}
          </div>
        ),
        document.body
      )}
    </section>
  );
}

/** Colada na linha; só quando nem a rolagem dá a altura mínima (tela muito baixa) ela sobe e cobre a linha, para nunca ficar espremida nem cortada embaixo. */
function topoDaJanela(baseDaLinha: number, altura: number): number {
  return Math.min(baseDaLinha, Math.max(8, window.innerHeight - 12 - altura));
}

/** Altura mínima da janela que desce da linha (PC e tablet): cabe título, cerca de 6 itens da lista e o rodapé. */
const ALTURA_MINIMA_DA_JANELA = 420;

/** CPF/CNPJ e telefone já no tamanho final (ou com texto a mais): o erro aparece na hora, sem esperar sair do campo. */
function mascaraCompleta(campo: CampoDaIdentificacao, valor: string): boolean {
  const digitos = valor.replace(/\D/g, "").length;
  return campo === "consultorCpfCnpj" ? digitos === 11 || digitos === 14 : campo === "consultorTelefone" ? digitos >= 10 : false;
}
