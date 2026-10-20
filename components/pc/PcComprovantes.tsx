"use client";

import { useRef, useState, type DragEvent } from "react";
import { ListRow } from "@/components/ui/ListRow";
import { Pill, type Tom } from "@/components/ui/Pill";
import { StatStrip } from "@/components/ui/StatStrip";
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
import type { ComprovanteTerceiro, TipoComprovante } from "@/types";

export type DadosDoFormulario = Pick<ComprovanteTerceiro, "tipo" | "emissor" | "dataServico" | "validade" | "observacao"> & { id?: string; renovaId?: string };

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
};

const TOM: Record<SituacaoDaValidade, Tom> = { vencido: "nc", "vence-em-breve": "amber", "em-dia": "ok", "sem-validade": "na" };

function dataBr(iso: string) {
  if (!iso) return "";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function vazio(): DadosDoFormulario {
  return { tipo: "pragas", emissor: "", dataServico: "", validade: "", observacao: "" };
}

// "Comprovantes e documentos com validade": certificados de terceiros com semáforo por item.
export default function PcComprovantes({ empresa, comprovantes, podeGerenciar, online, onSalvar, onRemover, urlDoArquivo, onVoltar, renovarId }: Props) {
  const hoje = hojeISO();
  const [formAberto, setFormAberto] = useState(Boolean(renovarId && podeGerenciar));
  const [dados, setDados] = useState<DadosDoFormulario>(() => {
    const origem = renovarId ? comprovantes.find((item) => item.id === renovarId) : undefined;
    return origem && podeGerenciar ? { tipo: origem.tipo, emissor: origem.emissor, dataServico: "", validade: "", observacao: "", renovaId: origem.id } : vazio();
  });
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [tocado, setTocado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const entrada = useRef<HTMLInputElement | null>(null);

  const vigentes = comprovantesVigentes(comprovantes).sort((a, b) => a.validade.localeCompare(b.validade));
  const contagem = contarPorValidade(vigentes, hoje);
  const erros = validarComprovante(dados);
  const editando = Boolean(dados.id);
  const exigeArquivo = !editando || !comprovantes.find((item) => item.id === dados.id)?.blobPathname;
  const erroArquivo = !arquivo && exigeArquivo ? "Anexe o PDF ou a foto do comprovante." : "";
  const sugestao = sugerirValidade(dados.tipo, dados.dataServico);

  function abrir(inicial: DadosDoFormulario) {
    setDados(inicial);
    setArquivo(null);
    setTocado(false);
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
    if (Object.keys(erros).length || erroArquivo) return;
    if (arquivo && !online) return;
    setSalvando(true);
    const mensagem = await onSalvar(dados, arquivo);
    setSalvando(false);
    if (mensagem) {
      setErro(mensagem);
      return;
    }
    setDados(vazio());
    setArquivo(null);
    setTocado(false);
    setFormAberto(false);
  }

  const campo = (nome: keyof DadosDoFormulario, valor: string) => setDados((atual) => ({ ...atual, [nome]: valor }));

  return (
    <section className="ui-screen comp" aria-label="Comprovantes e documentos com validade">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">Comprovantes e documentos com validade</h1>
          <p className="ui-subtitle">Certificados de terceiros · {empresa}</p>
        </div>
        <div className="ui-head-actions">
          {podeGerenciar && (
            <button type="button" className="ui-btn ui-btn--criar" onClick={() => abrir(vazio())}>
              + Anexar comprovante
            </button>
          )}
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onVoltar}>
            ← Voltar
          </button>
        </div>
      </div>

      <StatStrip
        rotulo="Situação dos comprovantes"
        itens={[
          { rotulo: "Vencidos", valor: contagem.vencidos, tom: "nc" },
          { rotulo: "Vencem em 30 dias", valor: contagem.venceEmBreve, tom: "amber" },
          { rotulo: "Em dia", valor: contagem.emDia, tom: "ok" },
        ]}
      />

      <div className={`comp-cols${podeGerenciar ? "" : " is-single"}`}>
        <div className="comp-lista">
          {vigentes.length === 0 ? (
            <div className="ui-empty">Nenhum comprovante anexado. Anexe o certificado de controle de pragas, da limpeza do reservatório ou o contrato do RT.</div>
          ) : (
            <div className="ui-list">
              {vigentes.map((item) => {
                const situacao = situacaoDaValidade(item.validade, hoje);
                const dias = diasEntre(hoje, item.validade);
                const detalhe = situacao === "vencido" ? `venceu há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"}` : dias === 0 ? "vence hoje" : `vence em ${dias} ${dias === 1 ? "dia" : "dias"}`;
                return (
                  <ListRow
                    key={item.id}
                    faixa={TOM[situacao]}
                    icone={<span aria-hidden="true">▤</span>}
                    titulo={`${rotuloDoTipo(item.tipo)} · ${item.emissor}`}
                    secundario={`Serviço em ${dataBr(item.dataServico)} · validade ${dataBr(item.validade)} (${detalhe})${item.observacao ? ` · ${item.observacao}` : ""}`}
                    pilulas={<Pill tom={TOM[situacao]}>{ROTULO_DA_VALIDADE[situacao]}</Pill>}
                    acao={
                      <span className="comp-acoes">
                        {item.blobPathname && (
                          <a className="ui-btn ui-btn--secondary ui-btn--small" href={urlDoArquivo(item)} target="_blank" rel="noopener noreferrer">
                            Abrir
                          </a>
                        )}
                        {podeGerenciar && (
                          <button
                            type="button"
                            className="ui-btn ui-btn--primary ui-btn--small"
                            onClick={() => abrir({ tipo: item.tipo, emissor: item.emissor, dataServico: "", validade: "", observacao: "", renovaId: item.id })}
                          >
                            Renovar
                          </button>
                        )}
                      </span>
                    }
                    menu={
                      podeGerenciar
                        ? [
                            { rotulo: "Editar", onClick: () => abrir({ id: item.id, tipo: item.tipo, emissor: item.emissor, dataServico: item.dataServico, validade: item.validade, observacao: item.observacao }) },
                            { rotulo: "Remover comprovante", perigo: true, confirmar: "Remover este comprovante? O arquivo anexado também será apagado.", onClick: () => onRemover(item) },
                          ]
                        : undefined
                    }
                  />
                );
              })}
            </div>
          )}
        </div>

        {podeGerenciar && (
          <div className={`ui-card comp-form${formAberto ? " is-aberto" : ""}`}>
            <h2 className="ui-card-title">{editando ? "Editar comprovante" : dados.renovaId ? "Renovar comprovante" : "Anexar comprovante"}</h2>
            <label className="pc-field">
              <span className="ui-eyebrow">Tipo</span>
              <select className="ui-input" value={dados.tipo} onChange={(evento) => campo("tipo", evento.target.value as TipoComprovante)}>
                {TIPOS_DE_COMPROVANTE.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.rotulo}
                  </option>
                ))}
              </select>
            </label>
            <label className="pc-field">
              <span className="ui-eyebrow">Emissor</span>
              <input className={`ui-input${tocado && erros.emissor ? " is-invalid" : ""}`} value={dados.emissor} onChange={(evento) => campo("emissor", evento.target.value)} aria-invalid={Boolean(tocado && erros.emissor)} />
              {tocado && erros.emissor && <span className="ui-field-error">{erros.emissor}</span>}
            </label>
            <div className="comp-duplo">
              <label className="pc-field">
                <span className="ui-eyebrow">Data do serviço</span>
                <input type="date" className={`ui-input${tocado && erros.dataServico ? " is-invalid" : ""}`} value={dados.dataServico} max={hoje} onChange={(evento) => campo("dataServico", evento.target.value)} aria-invalid={Boolean(tocado && erros.dataServico)} />
                {tocado && erros.dataServico && <span className="ui-field-error">{erros.dataServico}</span>}
              </label>
              <label className="pc-field">
                <span className="ui-eyebrow">Validade</span>
                <input type="date" className={`ui-input${(tocado || dados.validade) && erros.validade ? " is-invalid" : ""}`} value={dados.validade} onChange={(evento) => campo("validade", evento.target.value)} aria-invalid={Boolean((tocado || dados.validade) && erros.validade)} />
                {(tocado || dados.validade) && erros.validade && <span className="ui-field-error">{erros.validade}</span>}
              </label>
            </div>
            {sugestao && (
              <div className="priv-faixa comp-sugestao" role="status">
                <span>
                  {sugestao.texto} Validade sugerida: {dataBr(sugestao.validade)}. Fonte: {sugestao.fonte}
                  {sugestao.conferir ? <span className="em-breve pop-conferir"> conferir</span> : null}. Confira no texto oficial.
                </span>
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => campo("validade", sugestao.validade)}>
                  Usar
                </button>
              </div>
            )}
            <label className="pc-field">
              <span className="ui-eyebrow">Observação (opcional)</span>
              <input className="ui-input" value={dados.observacao} onChange={(evento) => campo("observacao", evento.target.value)} />
            </label>
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
            {tocado && erroArquivo && <span className="ui-field-error">{erroArquivo}</span>}
            {arquivo && !online && <span className="ui-field-error">Precisa de internet para enviar o arquivo.</span>}
            {erro && <span className="ui-field-error">{erro}</span>}
            <div className="comp-form-acoes">
              <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setFormAberto(false)}>
                Cancelar
              </button>
              <button type="button" className="ui-btn ui-btn--save" onClick={() => void salvar()} disabled={salvando || Boolean(arquivo && !online)}>
                {arquivo && !online ? "Precisa de internet" : salvando ? "Enviando…" : "Salvar comprovante"}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
