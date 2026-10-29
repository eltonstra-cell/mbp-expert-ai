"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Select from "@/components/Select";
import { nomeExibidoDoSetor, pacoteDoTipo, publicoDoSetor, rotuloDoTipo } from "@/lib/tiposDeEstabelecimento";
import { DEFINICOES_FLUXOS_OPERACIONAIS, PERGUNTAS_POR_FLUXO } from "@/lib/operationalFlows";
import {
  ESTADO_INICIAL_DO_PACOTE,
  agruparAmbientesPorPublico,
  agruparPorAmbiente,
  alternarAmbiente,
  alternarItem,
  avisoDaCascata,
  chaveDeAmbiente,
  chaveDeEquipamento,
  chaveDeFluxo,
  equipamentoBloqueado,
  estaMarcado,
  linhaDoResumoDeFluxos,
  marcarTodosOsAmbientes,
  marcarTodosOsItens,
  quantosMarcados,
  resumoDeFluxosPorSetor,
  type EstadoDoPacote,
} from "@/lib/escolhaDoPacote";
import type { TipoFluxoOperacional } from "@/types";

export type EscolhaDoPacote = {
  ambientes: string[];
  equipamentos: { nome: string; ambiente: string; quantidade: number }[];
  fluxos: TipoFluxoOperacional[];
  /** Setor escolhido para cada fluxo marcado ("" = sem setor: o fluxo não soma perguntas até o RT escolher). */
  setorDosFluxos?: Partial<Record<TipoFluxoOperacional, string>>;
};

type Props = {
  tipo: string;
  /** Ambientes que já estão marcados na empresa (não são propostos de novo). */
  ambientesDaEmpresa: string[];
  /** "Ambiente|nome" dos equipamentos que já existem. */
  equipamentosDaEmpresa: string[];
  fluxosAplicaveis: TipoFluxoOperacional[];
  onAplicar: (escolha: EscolhaDoPacote) => void;
  onDesfazer: () => void;
  aplicadoAgora: boolean;
};

type Aba = "ambientes" | "equipamentos" | "fluxos";

const contar = (n: number, singular: string, plural: string) => `${n} ${n === 1 ? singular : plural}`;
const SEGUNDOS_DO_AVISO = 6;

// "Para este tipo, o app propõe": ambientes, equipamentos e fluxos já marcados; o RT desmarca o que não existe e confirma. As perguntas não mudam.
export default function PacoteDoTipoPainel({ tipo, ambientesDaEmpresa, equipamentosDaEmpresa, fluxosAplicaveis, onAplicar, onDesfazer, aplicadoAgora }: Props) {
  const pacote = pacoteDoTipo(tipo);
  const ambientesNovos = pacote.ambientes.filter((ambiente) => !ambientesDaEmpresa.includes(ambiente));
  const equipamentosNovos = pacote.equipamentos.filter((item) => !equipamentosDaEmpresa.includes(`${item.ambiente}|${item.nome.toLocaleLowerCase("pt-BR")}`));
  const fluxosNovos = pacote.fluxos.filter((fluxo) => !fluxosAplicaveis.includes(fluxo));
  const [aberta, setAberta] = useState(false);
  const [aplicado, setAplicado] = useState("");
  const total = ambientesNovos.length + equipamentosNovos.length + fluxosNovos.length;
  const resumo = `${contar(ambientesNovos.length, "ambiente", "ambientes")}, ${contar(equipamentosNovos.length, "equipamento", "equipamentos")} e ${contar(fluxosNovos.length, "fluxo", "fluxos")}`;

  if (aplicadoAgora) {
    return (
      <section className="pacote-tipo pacote-tipo--feito md:col-span-2" role="status">
        <span>
          <strong>Pacote de {rotuloDoTipo(tipo)} aplicado ao rascunho{aplicado ? `: ${aplicado} adicionados` : ""}.</strong> Depois de salvar a empresa, confira em Cadastros. O que veio do pacote fica marcado “sugerido”.
        </span>
        <button type="button" className="ui-btn ui-btn--secondary pacote-desfazer" onClick={onDesfazer}>Desfazer</button>
      </section>
    );
  }
  if (total === 0) return null;

  return (
    <section className="pacote-tipo md:col-span-2" aria-label="Sugestão para o tipo de estabelecimento">
      <div className="pacote-tipo-topo">
        <span><strong>{rotuloDoTipo(tipo)}</strong>: o app propõe {resumo}. Nada é criado sem a sua confirmação.</span>
        <button type="button" className="ui-btn ui-btn--secondary pacote-tipo-ver" aria-haspopup="dialog" onClick={() => setAberta(true)}>Ver e escolher</button>
      </div>
      {aberta && (
        <JanelaDoPacote
          tipo={tipo}
          ambientesDaEmpresa={ambientesDaEmpresa}
          ambientes={ambientesNovos}
          equipamentos={equipamentosNovos}
          fluxos={fluxosNovos}
          onAgoraNao={() => setAberta(false)}
          onAplicar={(escolha) => {
            setAberta(false);
            setAplicado(`${contar(escolha.ambientes.length, "ambiente", "ambientes")}, ${contar(escolha.equipamentos.length, "equipamento", "equipamentos")}, ${contar(escolha.fluxos.length, "fluxo", "fluxos")}`);
            onAplicar(escolha);
          }}
        />
      )}
    </section>
  );
}

type PropsJanela = {
  tipo: string;
  ambientesDaEmpresa: string[];
  ambientes: string[];
  equipamentos: { nome: string; ambiente: string; quantidade: number }[];
  fluxos: TipoFluxoOperacional[];
  onAgoraNao: () => void;
  onAplicar: (escolha: EscolhaDoPacote) => void;
};

// Mesma janela da escolha de setores (classes esc-*): portal, rolagem da página travada, Esc = "Agora não", Tab preso dentro; só a lista rola.
function JanelaDoPacote({ tipo, ambientesDaEmpresa, ambientes, equipamentos, fluxos, onAgoraNao, onAplicar }: PropsJanela) {
  const [estado, setEstado] = useState<EstadoDoPacote>(ESTADO_INICIAL_DO_PACOTE);
  const [aba, setAba] = useState<Aba>("ambientes");
  const [aviso, setAviso] = useState("");
  const [setorEscolhido, setSetorEscolhido] = useState<Partial<Record<TipoFluxoOperacional, string>>>(
    () => Object.fromEntries(DEFINICOES_FLUXOS_OPERACIONAIS.map((definicao) => [definicao.tipo, definicao.setorPadrao]))
  );
  const [montado, setMontado] = useState(false);
  const janelaRef = useRef<HTMLElement | null>(null);
  const fecharRef = useRef(onAgoraNao);
  fecharRef.current = onAgoraNao;

  useEffect(() => {
    setMontado(true);
    const html = document.documentElement;
    const antesBody = document.body.style.overflow;
    const antesHtml = html.style.overflow;
    document.body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    const anterior = document.activeElement as HTMLElement | null;
    return () => {
      document.body.style.overflow = antesBody;
      html.style.overflow = antesHtml;
      anterior?.focus?.();
    };
  }, []);

  useEffect(() => {
    if (montado) janelaRef.current?.querySelector<HTMLElement>("input[type='checkbox']")?.focus();
  }, [montado]);

  // O aviso da cascata some sozinho depois de alguns segundos.
  useEffect(() => {
    if (!aviso) return;
    const espera = window.setTimeout(() => setAviso(""), SEGUNDOS_DO_AVISO * 1000);
    return () => window.clearTimeout(espera);
  }, [aviso]);

  useEffect(() => {
    if (!montado) return;
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        fecharRef.current();
        return;
      }
      if (evento.key !== "Tab") return;
      const focaveis = Array.from(janelaRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), [href]") || []).filter((el) => el.offsetParent !== null);
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [montado]);

  const chavesAmbientes = ambientes.map(chaveDeAmbiente);
  const chavesEquipamentos = equipamentos.map(chaveDeEquipamento);
  const chavesFluxos = fluxos.map(chaveDeFluxo);
  const marcadosAmbientes = quantosMarcados(estado, chavesAmbientes);
  const marcadosEquipamentos = quantosMarcados(estado, chavesEquipamentos);
  const marcadosFluxos = quantosMarcados(estado, chavesFluxos);

  // Setores onde um fluxo pode ocorrer: os da empresa e os ambientes novos que continuam marcados.
  const opcoesDeSetor = [...ambientesDaEmpresa, ...ambientes.filter((ambiente) => estaMarcado(estado, chaveDeAmbiente(ambiente)))];
  const setorDoFluxo = (fluxo: TipoFluxoOperacional) => {
    const escolhido = setorEscolhido[fluxo] || "";
    return opcoesDeSetor.includes(escolhido) ? escolhido : "";
  };
  const fluxosMarcados = fluxos.filter((fluxo) => estaMarcado(estado, chaveDeFluxo(fluxo)));
  const resumoDosFluxos = resumoDeFluxosPorSetor(fluxosMarcados.map((fluxo) => ({ setor: setorDoFluxo(fluxo) })), PERGUNTAS_POR_FLUXO);
  const fluxosSemSetor = fluxosMarcados.filter((fluxo) => !setorDoFluxo(fluxo)).length;

  function mudarAmbiente(ambiente: string) {
    const r = alternarAmbiente(estado, ambiente, equipamentos);
    setEstado(r.estado);
    setAviso(avisoDaCascata(r.saiuJuntos, r.voltaramJuntos));
  }

  function marcarTodos(grupo: Aba, marcar: boolean) {
    if (grupo === "ambientes") {
      const r = marcarTodosOsAmbientes(estado, ambientes, equipamentos, marcar);
      setEstado(r.estado);
      setAviso(avisoDaCascata(r.saiuJuntos, r.voltaramJuntos));
      return;
    }
    setAviso("");
    if (grupo === "equipamentos") {
      const bloqueadas = equipamentos.filter((item) => equipamentoBloqueado(estado, item, ambientes)).map(chaveDeEquipamento);
      setEstado(marcarTodosOsItens(estado, chavesEquipamentos, marcar, bloqueadas));
    } else {
      setEstado(marcarTodosOsItens(estado, chavesFluxos, marcar));
    }
  }

  function aplicar() {
    const marcados = fluxos.filter((f) => estaMarcado(estado, chaveDeFluxo(f)));
    onAplicar({
      ambientes: ambientes.filter((a) => estaMarcado(estado, chaveDeAmbiente(a))),
      equipamentos: equipamentos.filter((e) => estaMarcado(estado, chaveDeEquipamento(e))),
      fluxos: marcados,
      setorDosFluxos: Object.fromEntries(marcados.map((fluxo) => [fluxo, setorDoFluxo(fluxo)])),
    });
  }

  const abas: { id: Aba; titulo: string; marcados: number; total: number }[] = [
    { id: "ambientes", titulo: "Ambientes", marcados: marcadosAmbientes, total: ambientes.length },
    { id: "equipamentos", titulo: "Equipamentos", marcados: marcadosEquipamentos, total: equipamentos.length },
    { id: "fluxos", titulo: "Fluxos", marcados: marcadosFluxos, total: fluxos.length },
  ];
  const atual = abas.find((item) => item.id === aba) || abas[0];
  const tudoMarcado = atual.marcados === atual.total;

  const opcao = (chave: string, texto: string, completo: string | undefined, marcado: boolean, aoMudar: () => void) => (
    <li key={chave}>
      <label className={`esc-opcao${marcado ? " is-on" : ""}`} title={completo}>
        <input type="checkbox" className="esc-caixa" checked={marcado} onChange={aoMudar} />
        <span className="esc-opcao-textos">
          <span className="esc-opcao-titulo">{texto}</span>
        </span>
      </label>
    </li>
  );

  const janela = (
    <div className="esc-camada" role="presentation">
      <div className="esc-fundo" onClick={onAgoraNao} />
      <section ref={janelaRef} className="esc-janela pacote-janela" role="dialog" aria-modal="true" aria-labelledby="pacote-titulo">
        <header className="esc-cabeca">
          <div className="pacote-titulo-linha">
            <h2 id="pacote-titulo" className="esc-titulo">
              Pacote de {rotuloDoTipo(tipo)}
            </h2>
            {aviso && <p className="pacote-aviso" role="status">{aviso}</p>}
          </div>
          <p className="esc-apoio">Tudo vem marcado. Desmarque o que este estabelecimento não tem; nada é criado antes de “Aplicar”.</p>
          <div className="pacote-abas" role="tablist" aria-label="Grupos do pacote">
            {abas.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={aba === item.id} className={`pacote-aba${aba === item.id ? " is-on" : ""}`} onClick={() => setAba(item.id)}>
                {item.titulo} <span className="pacote-aba-conta">{item.marcados}/{item.total}</span>
              </button>
            ))}
          </div>
        </header>
        <div className="esc-corpo" role="tabpanel">
          <div className="pacote-grupo-topo">
            <h3 className="pacote-grupo-titulo">{atual.titulo}</h3>
            {atual.total > 0 && (
              <button type="button" className="ui-btn ui-btn--secondary pacote-marcar-todos" onClick={() => marcarTodos(aba, !tudoMarcado)}>
                {tudoMarcado ? "Desmarcar todos" : "Marcar todos"}
              </button>
            )}
          </div>
          {atual.total === 0 && <p className="esc-vazio">Nada novo a propor.</p>}

          {aba === "ambientes" &&
            agruparAmbientesPorPublico(ambientes, publicoDoSetor).map((grupo) => (
              <div key={grupo.grupo} className="pacote-sub-grupo">
                <h4 className="pacote-subtitulo">{grupo.grupo}</h4>
                <ul className="esc-opcoes">
                  {grupo.ambientes.map((ambiente) => opcao(chaveDeAmbiente(ambiente), nomeExibidoDoSetor(ambiente), ambiente, estaMarcado(estado, chaveDeAmbiente(ambiente)), () => mudarAmbiente(ambiente)))}
                </ul>
              </div>
            ))}

          {aba === "equipamentos" &&
            agruparPorAmbiente(equipamentos).map((grupo) => {
              const recolhido = ambientes.includes(grupo.ambiente) && !estaMarcado(estado, chaveDeAmbiente(grupo.ambiente));
              return (
                <div key={grupo.ambiente} className="pacote-eq-grupo">
                  {recolhido ? (
                    <div className="pacote-eq-recolhido">
                      <span title={grupo.ambiente}>{nomeExibidoDoSetor(grupo.ambiente)} · ambiente desmarcado</span>
                      <button type="button" className="ui-btn ui-btn--secondary" onClick={() => mudarAmbiente(grupo.ambiente)}>Marcar {nomeExibidoDoSetor(grupo.ambiente)}</button>
                    </div>
                  ) : (
                    <>
                      <h4 className="pacote-eq-ambiente" title={grupo.ambiente}>{nomeExibidoDoSetor(grupo.ambiente)}</h4>
                      <ul className="esc-opcoes">
                        {grupo.itens.map((item) => opcao(chaveDeEquipamento(item), item.nome, undefined, estaMarcado(estado, chaveDeEquipamento(item)), () => setEstado(alternarItem(estado, chaveDeEquipamento(item)))))}
                      </ul>
                    </>
                  )}
                </div>
              );
            })}

          {aba === "fluxos" && (
            <>
              <p className="pacote-fluxo-regra">Cada fluxo marcado adiciona {PERGUNTAS_POR_FLUXO} perguntas ao setor dele. Escolha o setor de cada fluxo.</p>
              {(resumoDosFluxos.length > 0 || fluxosSemSetor > 0) && (
                <ul className="pacote-fluxo-resumo" aria-label="Perguntas que os fluxos acrescentam">
                  {resumoDosFluxos.map((item) => <li key={item.setor}>{linhaDoResumoDeFluxos(item)}</li>)}
                  {fluxosSemSetor > 0 && <li className="is-sem-setor">{contar(fluxosSemSetor, "fluxo sem setor não soma", "fluxos sem setor não somam")} perguntas até você escolher o setor.</li>}
                </ul>
              )}
              <ul className="pacote-fluxos">
                {fluxos.map((fluxo) => {
                  const marcado = estaMarcado(estado, chaveDeFluxo(fluxo));
                  const setor = setorDoFluxo(fluxo);
                  return (
                    <li key={fluxo} className="pacote-fluxo-linha">
                      <label className={`esc-opcao${marcado ? " is-on" : ""}`}>
                        <input type="checkbox" className="esc-caixa" checked={marcado} onChange={() => setEstado(alternarItem(estado, chaveDeFluxo(fluxo)))} />
                        <span className="esc-opcao-textos"><span className="esc-opcao-titulo">{fluxo}</span></span>
                      </label>
                      <Select
                        className="pacote-fluxo-setor"
                        value={setor}
                        disabled={!marcado}
                        aria-label={`Setor do fluxo ${fluxo}`}
                        aria-invalid={marcado && !setor}
                        onChange={(evento) => setSetorEscolhido((atualEscolha) => ({ ...atualEscolha, [fluxo]: evento.target.value }))}
                      >
                        <option value="">Escolha o setor deste fluxo</option>
                        {opcoesDeSetor.map((opcaoDeSetor) => <option key={opcaoDeSetor} value={opcaoDeSetor}>{nomeExibidoDoSetor(opcaoDeSetor)}</option>)}
                      </Select>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
        <footer className="esc-rodape">
          <span className="esc-contador" role="status">
            Vai entrar: {contar(marcadosAmbientes, "ambiente", "ambientes")}, {contar(marcadosEquipamentos, "equipamento", "equipamentos")}, {contar(marcadosFluxos, "fluxo", "fluxos")}
          </span>
          <div className="esc-rodape-botoes">
            <button type="button" className="ui-btn ui-btn--secondary pacote-agora-nao" onClick={onAgoraNao}>Agora não</button>
            <button type="button" className="ui-btn ui-btn--primary" onClick={aplicar}>Aplicar o que está marcado</button>
          </div>
        </footer>
      </section>
    </div>
  );
  return montado ? createPortal(janela, document.body) : null;
}
