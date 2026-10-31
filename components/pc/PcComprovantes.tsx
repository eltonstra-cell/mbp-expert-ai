"use client";

import Select from "@/components/Select";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { mostrarToast } from "@/lib/toast";
import { ListRow } from "@/components/ui/ListRow";
import MenuMais from "@/components/pc/MenuMais";
import Janela from "@/components/ui/Janela";
import { ordenarPorAtencao } from "@/lib/documentosCentral";
import { Pill, type Tom } from "@/components/ui/Pill";
import {
  ROTULO_DA_VALIDADE,
  TIPOS_DE_COMPROVANTE,
  comprovantesVigentes,
  contarPorValidade,
  diasEntre,
  rotuloDoTipo,
  situacaoDaValidade,
  sugerirValidade,
  validarComprovante,
  type SituacaoDaValidade,
} from "@/lib/registrosEmpresa";
import { hojeISO } from "@/lib/popsNorma";
import { avisoDePopAusente, rotuloDoTipoNaFicha, sugestaoDePopParaTipo, tarjaDoComprovante, tiposDoPop } from "@/lib/comprovantePop";
import { confirmar } from "@/lib/dialogos";
import { quantidade } from "@/lib/plural";
import type { ComprovanteTerceiro, ProcedimentoOperacionalPadronizado, TipoComprovante } from "@/types";

export type DadosDoFormulario = Pick<ComprovanteTerceiro, "tipo" | "emissor" | "dataServico" | "validade" | "observacao"> & { id?: string; renovaId?: string; popId?: string };

type Props = {
  empresa: string;
  comprovantes: ComprovanteTerceiro[];
  /** Administrador, RT, Gestor e Gerente criam, editam e renovam; o Fiscal só lê. */
  podeGerenciar: boolean;
  online: boolean;
  /** Salva (e envia o arquivo, se houver). Devolve a mensagem de erro, ou vazio quando deu certo. */
  onSalvar: (dados: DadosDoFormulario, arquivo: File | null) => Promise<string>;
  onRemover: (comprovante: ComprovanteTerceiro) => void;
  urlDoArquivo: (comprovante: ComprovanteTerceiro) => string;
  onVoltar: () => void;
  /** Abre direto o formulário de renovação deste comprovante (vindo do painel "Hoje"). */
  renovarId?: string;
  /** Dentro da ficha do POP: sem título nem "Voltar" próprios. */
  embutido?: boolean;
  /** Dentro da ficha do POP o vínculo já está escolhido. */
  popFixo?: { id: string; rotulo: string; catalogoId?: string };
  /** Fora da ficha: os POPs que existem (campo opcional "POP vinculado" e selo na lista). */
  pops?: ProcedimentoOperacionalPadronizado[];
  /** Cria o POP do modelo que o tipo pede (devolve o id do POP novo). */
  onCriarPopDoModelo?: (catalogoId: string) => string | undefined;
  /** Troca o POP vinculado de um comprovante (sem apagá-lo); fora da ficha de um POP. */
  onAlterarPop?: (comprovante: ComprovanteTerceiro, popId: string | undefined) => void;
  /** O que dizer quando a lista está vazia (dentro da ficha, o que vale para aquele POP). */
  mensagemVazia?: string;
};

const TOM: Record<SituacaoDaValidade, Tom> = { vencido: "nc", "vence-em-breve": "amber", "em-dia": "ok", "sem-validade": "na" };

function dataBr(iso: string) {
  if (!iso) return "";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function vazio(tipo: TipoComprovante = "pragas"): DadosDoFormulario {
  return { tipo, emissor: "", dataServico: "", validade: "", observacao: "" };
}

const rotuloDoPop = (pop: Pick<ProcedimentoOperacionalPadronizado, "codigo" | "titulo">) => `${pop.codigo ? `${pop.codigo} · ` : ""}${pop.titulo}`;

// Erro de campo: borda vermelha firme (na caixa) e, logo abaixo, ícone de alerta com o texto.
function ErroDeCampo({ texto, id }: { texto: string; id?: string }) {
  return (
    <span className="ui-field-error ui-field-error--forte" role="alert" id={id}>
      {texto}
    </span>
  );
}

// "Comprovantes e documentos com validade": certificados de terceiros com semáforo por item.
export default function PcComprovantes({ empresa, comprovantes, podeGerenciar, online, onSalvar, onRemover, urlDoArquivo, onVoltar, renovarId, embutido = false, popFixo, pops, onCriarPopDoModelo, onAlterarPop, mensagemVazia }: Props) {
  const [alterandoPop, setAlterandoPop] = useState<{ id: string; popId: string } | null>(null);
  const hoje = hojeISO();
  // Dentro da ficha de um POP, o Tipo só oferece o que se liga àquele POP (mais "Outro documento deste POP").
  const tiposDisponiveis = popFixo ? tiposDoPop(popFixo.catalogoId) : TIPOS_DE_COMPROVANTE;
  const tipoPadrao: TipoComprovante = tiposDisponiveis[0].id;
  const [formAberto, setFormAberto] = useState(Boolean(renovarId && podeGerenciar));
  const [dados, setDados] = useState<DadosDoFormulario>(() => {
    const origem = renovarId ? comprovantes.find((item) => item.id === renovarId) : undefined;
    return origem && podeGerenciar ? { tipo: origem.tipo, emissor: origem.emissor, dataServico: "", validade: "", observacao: "", renovaId: origem.id, ...(origem.popId ? { popId: origem.popId } : {}) } : vazio(tipoPadrao);
  });
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [tocado, setTocado] = useState(false);
  // Campo já tocado (saiu dele): o aviso aparece na hora, não só ao salvar.
  const [campos, setCampos] = useState<Partial<Record<"emissor" | "dataServico" | "validade", boolean>>>({});
  const formularioRef = useRef<HTMLDivElement | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const entrada = useRef<HTMLInputElement | null>(null);

  // Na Central (Documentos › Comprovantes) a lista vem sem caixas e ordenada pelo que precisa de atenção primeiro; na ficha do POP segue como era.
  const central = embutido && !popFixo;
  const vigentes = central ? ordenarPorAtencao(comprovantesVigentes(comprovantes), hoje) : comprovantesVigentes(comprovantes).sort((a, b) => a.validade.localeCompare(b.validade));
  // Renovados de agora em diante ficam na lista com a etiqueta "Substituído" e fora das contagens (os antigos, sem o campo, seguem como estavam).
  const substituidos = comprovantes.filter((item) => Boolean(item.substituidoPor)).sort((a, b) => b.validade.localeCompare(a.validade));
  const contagem = contarPorValidade(vigentes, hoje);
  const erros = validarComprovante(dados);
  const editando = Boolean(dados.id);
  const exigeArquivo = !editando || !comprovantes.find((item) => item.id === dados.id)?.blobPathname;
  const erroArquivo = !arquivo && exigeArquivo ? "Anexe o PDF ou a foto do comprovante" : "";
  // A sugestão some depois de "Usar" (a validade passa a ser a sugerida) e volta se a pessoa mudar a data.
  const sugestaoBruta = sugerirValidade(dados.tipo, dados.dataServico);
  const sugestao = sugestaoBruta && dados.validade !== sugestaoBruta.validade ? sugestaoBruta : null;
  const mostrar = (nome: "emissor" | "dataServico" | "validade") => Boolean(tocado || campos[nome]);
  const tocar = (nome: "emissor" | "dataServico" | "validade") => setCampos((atual) => (atual[nome] ? atual : { ...atual, [nome]: true }));
  const listaDePops = pops || [];
  const codigoDoPop = new Map(listaDePops.map((pop) => [pop.id, pop.codigo]));
  const sugestaoDePop = popFixo ? null : sugestaoDePopParaTipo(dados.tipo, listaDePops);
  const popsParaEscolher = popFixo ? [{ id: popFixo.id, rotulo: popFixo.rotulo }] : listaDePops.filter((pop) => !pop.arquivado).map((pop) => ({ id: pop.id, rotulo: rotuloDoPop(pop) }));

  // O "POP vinculado" acompanha o "Tipo": só vem preenchido quando o tipo combina com um POP que existe.
  useEffect(() => {
    if (popFixo || !formAberto || editando || dados.renovaId) return;
    if (!sugestaoDePop) return;
    setDados((atual) => {
      const novo = sugestaoDePop.situacao === "existe" ? sugestaoDePop.popId : undefined;
      return atual.popId === novo ? atual : { ...atual, popId: novo };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados.tipo, formAberto, editando, sugestaoDePop?.situacao]);

  function abrir(inicial: DadosDoFormulario) {
    setDados(inicial);
    setArquivo(null);
    setTocado(false);
    setCampos({});
    setErro("");
    setFormAberto(true);
  }

  function escolher(lista: FileList | null | undefined) {
    const escolhido = lista?.[0];
    if (!escolhido) return;
    const tipoOk = escolhido.type === "application/pdf" || escolhido.type.startsWith("image/") || /\.(pdf|jpe?g|png|webp)$/i.test(escolhido.name);
    if (!tipoOk) {
      setErro("Escolha um PDF ou uma foto.");
      return;
    }
    setErro("");
    setArquivo(escolhido);
  }

  function soltar(evento: DragEvent<HTMLDivElement>) {
    evento.preventDefault();
    setArrastando(false);
    escolher(evento.dataTransfer.files);
  }

  async function salvar() {
    setTocado(true);
    if (Object.keys(erros).length || erroArquivo) {
      // Marca TODOS os campos que faltam de uma vez e leva a pessoa ao primeiro (o formulário pode estar fora da vista).
      window.setTimeout(() => {
        const primeiro = formularioRef.current?.querySelector<HTMLElement>(".is-invalid, .is-invalida");
        primeiro?.scrollIntoView({ block: "center", behavior: "smooth" });
        const campoDentro = primeiro?.matches("input, select, textarea") ? primeiro : primeiro?.querySelector<HTMLElement>("input, button");
        campoDentro?.focus({ preventScroll: true });
      }, 0);
      return;
    }
    if (arquivo && !online) return;
    setSalvando(true);
    const mensagem = await onSalvar(dados, arquivo);
    setSalvando(false);
    if (mensagem) {
      setErro(mensagem);
      return;
    }
    setDados(vazio(tipoPadrao));
    setArquivo(null);
    setTocado(false);
    setCampos({});
    setFormAberto(false);
    mostrarToast("Salvo");
  }

  const campo = (nome: keyof DadosDoFormulario, valor: string) => setDados((atual) => ({ ...atual, [nome]: valor }));

  return (
    <section className={`${embutido ? "ui-embed comp--embutido" : "ui-screen"} comp${central ? " comp--central" : ""}`} aria-label="Comprovantes e documentos com validade">
      {central && (
        <div className="cdoc-titulo">
          <div>
            <h2 className="cdoc-h">Comprovantes</h2>
            <p className="comp-resumo" role="group" aria-label="Situação dos comprovantes">
              <span className="comp-resumo--nc">{contagem.vencidos} {contagem.vencidos === 1 ? "vencido" : "vencidos"}</span>
              {" · "}
              <span className="comp-resumo--pend">{contagem.venceEmBreve} {contagem.venceEmBreve === 1 ? "vence" : "vencem"} em 30 dias</span>
              {" · "}
              <span className="comp-resumo--ok">{contagem.emDia} em dia</span>
            </p>
            <p className="cdoc-sub cdoc-sub--pequeno">Ordenados pelo que precisa de atenção primeiro.</p>
          </div>
          {podeGerenciar && !formAberto && (
            <button type="button" className="ui-btn ui-btn--laranja comp-anexar" onClick={() => abrir(vazio(tipoPadrao))}>
              + Anexar comprovante
            </button>
          )}
        </div>
      )}
      <div className={central ? "cdoc-lista" : "comp-corpo"}>
      <div className="ui-head" hidden={central}>
        {embutido && <h3 className="reg-bloco-titulo">Comprovantes</h3>}
        {!embutido && (
          <div>
            <h1 className="ui-title">Comprovantes e documentos com validade</h1>
            <p className="ui-subtitle">Certificados de terceiros</p>
          </div>
        )}
        <div className="ui-head-actions">
          {podeGerenciar && !formAberto && (
            <button type="button" className="ui-btn ui-btn--criar" onClick={() => abrir(vazio(tipoPadrao))}>
              + Anexar comprovante
            </button>
          )}
          {!embutido && (
            <button type="button" className="ui-btn ui-btn--secondary" onClick={onVoltar}>
              ← Voltar
            </button>
          )}
        </div>
      </div>

      <div className="comp-chips" role="group" aria-label="Situação dos comprovantes" hidden={central}>
        <span className="comp-chip comp-chip--nc"><b>{contagem.vencidos}</b> vencidos</span>
        <span className="comp-chip comp-chip--pend"><b>{contagem.venceEmBreve}</b> vencem em 30 dias</span>
        <span className="comp-chip comp-chip--ok"><b>{contagem.emDia}</b> em dia</span>
      </div>

      {podeGerenciar && formAberto && (
        <div ref={formularioRef} className="ui-card comp-form is-aberto">
          <h2 className="ui-card-title">{editando ? "Editar comprovante" : dados.renovaId ? "Renovar comprovante" : "Anexar comprovante"}</h2>
          <div className="comp-grade">
            <label className="pc-field">
              <span className="ui-eyebrow">Tipo</span>
              {popFixo && (tiposDisponiveis.length === 1 || Boolean(dados.renovaId)) ? (
                <span className="comp-tipo-fixo">{rotuloDoTipoNaFicha(dados.tipo)}</span>
              ) : (
              <Select className="ui-input ui-input--lista" value={dados.tipo} onChange={(evento) => campo("tipo", evento.target.value as TipoComprovante)}>
                {(tiposDisponiveis.some((tipo) => tipo.id === dados.tipo) ? tiposDisponiveis : [...tiposDisponiveis, { id: dados.tipo, rotulo: rotuloDoTipo(dados.tipo) }]).map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.rotulo}
                  </option>
                ))}
              </Select>
              )}
            </label>
            {popsParaEscolher.length > 0 && (
              <label className="pc-field">
                <span className="ui-eyebrow">{popFixo ? "POP vinculado" : "POP vinculado (opcional)"}</span>
                {popFixo ? (
                  <span className="comp-tipo-fixo" id="comp-pop-fixo">{(() => { const doPop = listaDePops.find((pop) => pop.id === popFixo.id); return doPop ? rotuloDoPop(doPop) : popFixo.rotulo; })()}</span>
                ) : (
                <Select className="ui-input ui-input--lista" value={dados.popId || ""} onChange={(evento) => setDados((atual) => ({ ...atual, popId: evento.target.value || undefined }))}>
                  <option value="">Nenhum (comprovante geral da empresa)</option>
                  {popsParaEscolher.map((pop) => (
                    <option key={pop.id} value={pop.id}>
                      {pop.rotulo}
                    </option>
                  ))}
                </Select>
                )}
                {sugestaoDePop?.situacao === "falta-criar" && (
                  <span className="comp-aviso-pop">
                    {avisoDePopAusente(sugestaoDePop.definicao)}
                    {onCriarPopDoModelo && (
                      <button
                        type="button"
                        className="pc-link-btn"
                        onClick={() => {
                          const id = onCriarPopDoModelo(sugestaoDePop.definicao.catalogoId);
                          if (id) setDados((atual) => ({ ...atual, popId: id }));
                        }}
                      >
                        Criar agora
                      </button>
                    )}
                  </span>
                )}
              </label>
            )}
            <label className="pc-field">
              <span className="ui-eyebrow">Emissor</span>
              <input className={`ui-input${mostrar("emissor") && erros.emissor ? " is-invalid" : ""}`} value={dados.emissor} onChange={(evento) => campo("emissor", evento.target.value)} onBlur={() => tocar("emissor")} aria-invalid={Boolean(mostrar("emissor") && erros.emissor)} />
              {mostrar("emissor") && erros.emissor && <ErroDeCampo texto={erros.emissor} />}
            </label>
            <label className="pc-field">
              <span className="ui-eyebrow">Observação (opcional)</span>
              <input className="ui-input" value={dados.observacao} onChange={(evento) => campo("observacao", evento.target.value)} />
            </label>
            <label className="pc-field">
              <span className="ui-eyebrow">Data do serviço</span>
              <input type="date" className={`ui-input${mostrar("dataServico") && erros.dataServico ? " is-invalid" : ""}`} value={dados.dataServico} max={hoje} onChange={(evento) => campo("dataServico", evento.target.value)} onBlur={() => tocar("dataServico")} aria-invalid={Boolean(mostrar("dataServico") && erros.dataServico)} />
              {mostrar("dataServico") && erros.dataServico && <ErroDeCampo texto={erros.dataServico} />}
            </label>
            <label className="pc-field">
              <span className="ui-eyebrow">Validade</span>
              <input type="date" className={`ui-input${(mostrar("validade") || dados.validade) && erros.validade ? " is-invalid" : ""}`} value={dados.validade} onChange={(evento) => campo("validade", evento.target.value)} onBlur={() => tocar("validade")} aria-invalid={Boolean((mostrar("validade") || dados.validade) && erros.validade)} />
              {(mostrar("validade") || dados.validade) && erros.validade && <ErroDeCampo texto={erros.validade} />}
            </label>
          </div>
          {sugestao && (
            <div className="comp-sugestao" role="status">
              <span>
                Sugestão: {dataBr(sugestao.validade)} · {sugestao.fonte}
                {sugestao.conferir ? <span className="pop-conferir comp-conferir">conferir</span> : null}
              </span>
              <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => campo("validade", sugestao.validade)}>
                Usar
              </button>
            </div>
          )}
          <div
            className={`comp-solta${arrastando ? " is-arrastando" : ""}${tocado && erroArquivo ? " is-invalida" : ""}`}
            onDragOver={(evento) => {
              evento.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={soltar}
          >
            <input ref={entrada} type="file" accept="application/pdf,image/*" hidden onChange={(evento) => escolher(evento.target.files)} />
            <span className="ui-row-sub">{arquivo ? `${arquivo.name}` : editando && !exigeArquivo ? "Arquivo já anexado. Escolha outro só para trocar." : "Arraste o PDF ou a foto aqui, ou"}</span>
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => entrada.current?.click()}>
              Escolher arquivo
            </button>
          </div>
          {tocado && erroArquivo && <ErroDeCampo texto={erroArquivo} />}
          {arquivo && !online && <ErroDeCampo texto="Precisa de internet para enviar o arquivo." />}
          {erro && <ErroDeCampo texto={erro} />}
          <div className="comp-form-acoes">
            <button
              type="button"
              className="ui-btn ui-btn--secondary"
              onClick={() => {
                setFormAberto(false);
                setTocado(false);
                setCampos({});
              }}
            >
              Cancelar
            </button>
            <button type="button" className="ui-btn ui-btn--save" onClick={() => void salvar()} disabled={salvando || Boolean(arquivo && !online)}>
              {arquivo && !online ? "Precisa de internet" : salvando ? "Enviando…" : "Salvar comprovante"}
            </button>
          </div>
        </div>
      )}

      <div className="comp-lista">
        {alterandoPop && onAlterarPop && (() => {
          const alvo = comprovantes.find((item) => item.id === alterandoPop.id);
          const tipoDoAlvo = rotuloDoTipo(alvo?.tipo || "outro");
          const titulo = popFixo ? "Mover para outro POP" : alvo && !alvo.popId ? "Vincular a um POP" : "Alterar POP vinculado";
          const sugestaoDoPainel = alvo ? tarjaDoComprovante(alvo, listaDePops) : null;
          return (
            <Janela
              titulo={titulo}
              onFechar={() => setAlterandoPop(null)}
              rodape={
                <>
                  <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setAlterandoPop(null)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="ui-btn ui-btn--save"
                    disabled={Boolean(popFixo) && !alterandoPop.popId}
                    onClick={async () => {
                      const destino = listaDePops.find((pop) => pop.id === alterandoPop.popId);
                      if (alvo && popFixo) {
                        const nome = destino?.codigo || destino?.titulo || "outro POP";
                        if (!(await confirmar(`O comprovante sai desta ficha e vai para o ${nome}. O histórico fica registrado.`, { titulo: "Mover comprovante", confirmarRotulo: "Mover", cancelarRotulo: "Cancelar" }))) return;
                      }
                      if (alvo) onAlterarPop(alvo, alterandoPop.popId || undefined);
                      setAlterandoPop(null);
                    }}
                  >
                    {popFixo ? "Mover" : "Salvar"}
                  </button>
                </>
              }
            >
              <label className="jan-campo">
                <span className="jan-rotulo">{popFixo ? "Mover" : "POP vinculado de"} {tipoDoAlvo}{popFixo ? " para o POP" : ""}</span>
                <Select className="ui-input ui-input--lista" value={alterandoPop.popId} onChange={(evento) => setAlterandoPop({ ...alterandoPop, popId: evento.target.value })}>
                  {popFixo ? <option value="">Escolha o POP…</option> : <option value="">Nenhum (comprovante geral da empresa)</option>}
                  {listaDePops.filter((pop) => !pop.arquivado && pop.id !== popFixo?.id).map((pop) => (
                    <option key={pop.id} value={pop.id}>
                      {rotuloDoPop(pop)}
                    </option>
                  ))}
                </Select>
              </label>
              {sugestaoDoPainel && sugestaoDoPainel.acao === "criar" && (
                <div className="comp-tarja" role="note">
                  <span>{sugestaoDoPainel.texto}</span>
                  {onCriarPopDoModelo && (
                    <button
                      type="button"
                      className="ui-btn ui-btn--secondary ui-btn--small"
                      onClick={() => {
                        const novoId = onCriarPopDoModelo(sugestaoDoPainel.catalogoId);
                        if (novoId) setAlterandoPop({ ...alterandoPop, popId: novoId });
                      }}
                    >
                      Criar agora
                    </button>
                  )}
                </div>
              )}
            </Janela>
          );
        })()}
        {vigentes.length + substituidos.length === 0 ? (
          <div className="ui-empty">{mensagemVazia || "Nenhum comprovante anexado. Anexe o certificado de controle de pragas, da limpeza do reservatório ou o contrato do RT."}</div>
        ) : (
          <div className="ui-list" role={central ? "list" : undefined}>
            {[...vigentes, ...substituidos].map((item) => {
              const substituido = Boolean(item.substituidoPor);
              const situacao = substituido ? "sem-validade" : situacaoDaValidade(item.validade, hoje);
              const popDoItem = item.popId ? listaDePops.find((pop) => pop.id === item.popId) : undefined;
              const tarja = substituido || item.popId ? null : tarjaDoComprovante(item, listaDePops);
              const nomeDoItem = `${rotuloDoTipo(item.tipo)}${item.validade ? ` (vence ${dataBr(item.validade)})` : ""}`;
              const textoDaTarja = tarja ? (tarja.acao === "criar" ? tarja.texto : `Sugestão: ${tarja.popSugeridoId && codigoDoPop.get(tarja.popSugeridoId) ? `${codigoDoPop.get(tarja.popSugeridoId)} · ` : ""}${tarja.titulo}`) : "";
              const criarPopDaTarja = () => {
                if (!tarja || !onCriarPopDoModelo) return;
                const novoId = onCriarPopDoModelo(tarja.catalogoId);
                if (novoId) setAlterandoPop({ id: item.id, popId: novoId });
              };
              const dias = diasEntre(hoje, item.validade);
              const detalhe = situacao === "vencido" ? `venceu há ${quantidade(Math.abs(dias), "dia", "dias")}` : dias === 0 ? "vence hoje" : `vence em ${quantidade(dias, "dia", "dias")}`;
              const codigo = item.popId ? codigoDoPop.get(item.popId) : undefined;
              if (central) {
                const estado = substituido ? "Substituído" : situacao === "vencido" ? `Vencido há ${quantidade(Math.abs(dias), "dia", "dias")}` : situacao === "vence-em-breve" ? (dias === 0 ? "Vence hoje" : `Vence em ${quantidade(dias, "dia", "dias")}`) : situacao === "sem-validade" ? "Sem validade" : "Em dia";
                const itensDoMenu = [
                  ...(item.blobPathname ? [{ rotulo: "Abrir arquivo", onClick: () => window.open(urlDoArquivo(item), "_blank", "noopener,noreferrer") }] : []),
                  ...(podeGerenciar && !substituido
                    ? [
                        { rotulo: "Renovar", assumeFoco: true, onClick: () => abrir({ tipo: item.tipo, emissor: item.emissor, dataServico: "", validade: "", observacao: "", renovaId: item.id, ...(item.popId ? { popId: item.popId } : {}) }) },
                        ...(onAlterarPop && listaDePops.some((pop) => !pop.arquivado) ? [{ rotulo: item.popId ? "Mover para outro POP" : "Vincular a um POP", assumeFoco: true, onClick: () => setAlterandoPop({ id: item.id, popId: item.popId || "" }) }] : []),
                        { rotulo: "Editar", assumeFoco: true, onClick: () => abrir({ id: item.id, tipo: item.tipo, emissor: item.emissor, dataServico: item.dataServico, validade: item.validade, observacao: item.observacao, ...(item.popId ? { popId: item.popId } : {}) }) },
                        { rotulo: "Remover comprovante", perigo: true, assumeFoco: true, onClick: () => void confirmar("Remover este comprovante? O arquivo anexado também será apagado.", { titulo: "Remover comprovante", confirmarRotulo: "Remover", cancelarRotulo: "Cancelar" }).then((ok) => ok && onRemover(item)) },
                      ]
                    : []),
                ];
                return (
                  <div key={item.id} className={`comp-linha${substituido ? " is-substituido" : ""}`} role="listitem">
                    <span className={`comp-bolinha comp-bolinha--${substituido ? "sem-validade" : situacao}`} aria-hidden="true" />
                    <span className="comp-l-textos">
                      <span className="comp-l-titulo">{rotuloDoTipo(item.tipo)}{item.validade ? <span className="comp-l-venc"> · {situacao === "vencido" ? "venceu" : "vence"} {dataBr(item.validade)}</span> : null}</span>
                      <span className="comp-l-sub">
                        {item.popId ? codigo || "POP" : "Sem POP vinculado"}
                        {item.emissor ? ` · ${item.emissor}` : ""}
                        {item.observacao ? ` · ${item.observacao}` : ""}
                      </span>
                      {tarja && (
                        <span className="comp-tarja" role="note">
                          <span>{textoDaTarja}</span>
                          {podeGerenciar && tarja.acao === "criar" && onCriarPopDoModelo && (
                            <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={criarPopDaTarja}>Criar agora</button>
                          )}
                          {podeGerenciar && tarja.acao !== "criar" && onAlterarPop && (
                            <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" aria-label={`Vincular comprovante ${nomeDoItem}`} onClick={() => setAlterandoPop({ id: item.id, popId: tarja.popSugeridoId || "" })}>Vincular</button>
                          )}
                        </span>
                      )}
                    </span>
                    <span className={`comp-l-estado comp-l-estado--${substituido ? "sem-validade" : situacao}`}>{estado}</span>
                    {itensDoMenu.length > 0 ? <MenuMais rotulo={`Mais ações de ${nomeDoItem}`} itens={itensDoMenu} /> : <span className="comp-l-semmenu" />}
                  </div>
                );
              }
              return (
                <ListRow
                  key={item.id}
                  faixa={TOM[situacao]}
                  icone={<span aria-hidden="true">▤</span>}
                  titulo={rotuloDoTipo(item.tipo)}
                  chip={!popFixo ? <span className="comp-selo-pop">{item.popId ? codigo || "POP" : "Sem POP vinculado"}</span> : undefined}
                  secundario={
                    <>
                      <span>
                        <span className="comp-emissor">{item.emissor}</span> · Serviço em {dataBr(item.dataServico)} · validade {dataBr(item.validade)}{substituido ? "" : ` (${detalhe})`}{item.observacao ? ` · ${item.observacao}` : ""}
                      </span>
                    </>
                  }
                  pilulas={<Pill tom={TOM[situacao]}>{substituido ? "Substituído" : ROTULO_DA_VALIDADE[situacao]}</Pill>}
                  acao={
                    <span className="comp-acoes">
                      {item.blobPathname && (
                        <a className="ui-btn ui-btn--secondary ui-btn--small" href={urlDoArquivo(item)} target="_blank" rel="noopener noreferrer">
                          Abrir
                        </a>
                      )}
                      {podeGerenciar && !substituido && (
                        <button
                          type="button"
                          className="ui-btn ui-btn--secondary ui-btn--small"
                          onClick={() => abrir({ tipo: item.tipo, emissor: item.emissor, dataServico: "", validade: "", observacao: "", renovaId: item.id, ...(item.popId ? { popId: item.popId } : {}) })}
                        >
                          Renovar
                        </button>
                      )}
                    </span>
                  }
                  menu={
                    podeGerenciar && !substituido
                      ? [
                          ...(onAlterarPop && listaDePops.some((pop) => !pop.arquivado && pop.id !== popFixo?.id)
                            ? [{ rotulo: popFixo ? "Mover para outro POP" : "Alterar POP vinculado", onClick: () => setAlterandoPop({ id: item.id, popId: popFixo ? "" : item.popId || "" }) }]
                            : []),
                          { rotulo: "Editar", onClick: () => abrir({ id: item.id, tipo: item.tipo, emissor: item.emissor, dataServico: item.dataServico, validade: item.validade, observacao: item.observacao, ...(item.popId ? { popId: item.popId } : {}) }) },
                          { rotulo: "Remover comprovante", perigo: true, confirmar: "Remover este comprovante? O arquivo anexado também será apagado.", onClick: () => onRemover(item) },
                        ]
                      : undefined
                  }
                  filhos={
                    // A tarja fica DENTRO do cartão, como faixa amarela no rodapé dele (fio de 1 px, sem folga nem borda própria).
                    tarja ? (
                      <div className="comp-tarja" role="note">
                        <span>{textoDaTarja}</span>
                        {podeGerenciar && tarja.acao === "criar" && onCriarPopDoModelo && (
                          <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={criarPopDaTarja}>
                            Criar agora
                          </button>
                        )}
                        {podeGerenciar && tarja.acao !== "criar" && onAlterarPop && (
                          <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" aria-label={`Vincular comprovante ${nomeDoItem}`} onClick={() => setAlterandoPop({ id: item.id, popId: tarja.popSugeridoId || "" })}>
                            Vincular
                          </button>
                        )}
                      </div>
                    ) : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </div>
      </div>
    </section>
  );
}
