"use client";

import { useEffect, useState } from "react";
import EscolhaEmJanela from "@/components/EscolhaEmJanela";
import FieldVoiceTools from "@/components/FieldVoiceTools";
import Select from "@/components/Select";
import { OPCOES_MODELO_QUESTIONARIO, SETORES_OFICIAIS_MANUAL, criarModelosQuestionarioAmbientes, normalizarListaAmbientesReais } from "@/lib/manualBase";
import { MODELO_GENERICO, ambientesSemQuestionario, bloqueioDeExcluirAmbiente, vincularQuestionarioEmLote } from "@/lib/regrasDoPacote3";
import { sugerirSetorOficial } from "@/lib/setorOficialSugerido";
import { erroDoNovoNome } from "@/lib/renomearAmbiente";
import { aplicarEscolhaDeSetores, linhaDeContagem } from "@/lib/escolhaEmJanela";
import { limparVinculos, nomeJaExistente } from "@/lib/ambientesVisita";
import { perguntasDoAmbiente, perguntasDoSetor } from "@/lib/perguntasDoAmbiente";
import { bloqueiosDaRetirada, fluxosLigadosAoSetor, reinserirSetor } from "@/lib/estruturaDelta";
import { nomeCurtoDoSetor } from "@/lib/tiposDeEstabelecimento";
import { sugestaoPorCnae, tituloDaSugestao } from "@/lib/sugestaoPorCnae";
import { fecharToastDe, mostrarToast } from "@/lib/toast";
import { quantidade } from "@/lib/plural";
import type { Empresa, EquipamentoSetor } from "@/types";
import "../../app/cadastro-estrutura.css";

export type EstadoDoSalvamento = "salvo" | "salvando" | "erro";

/** O que uma gravação muda. Tudo o que não aparece aqui fica como estava na empresa de AGORA. */
export type MudancaDeEstrutura = {
  setores?: string[];
  equipamentos?: EquipamentoSetor[];
  vinculos?: Record<string, string>;
  modelos?: Record<string, string>;
  /** Fluxos que voltam a ficar ligados a um setor (Desfazer de remover ambiente). */
  restaurarFluxos?: { id: string; setorVinculado: string }[];
};

/**
 * Uma mudança pronta, ou uma função que calcula a mudança a partir da empresa de AGORA (nulo = nada a gravar).
 * O Desfazer usa sempre a função: é um delta sobre o estado de agora, nunca o retrato de quando o aviso apareceu.
 */
export type EntradaDeEstrutura = MudancaDeEstrutura | ((atual: Empresa) => MudancaDeEstrutura | null);

type Props = {
  /** A empresa como está salva (a lista não guarda cópia: tudo grava na hora e volta por aqui). */
  empresa: Empresa;
  podeEditar: boolean;
  estado: EstadoDoSalvamento;
  /** Grava direto na empresa (mesmo caminho de salvar). Devolve false se não gravou. */
  onGravar: (entrada: EntradaDeEstrutura) => boolean;
  /** Renomeia um ambiente próprio com cascata (quem chama confirma e grava). */
  onRenomear: (de: string, para: string) => Promise<boolean>;
  onIrParaDados: () => void;
};

const eOficial = (setor: string) => (SETORES_OFICIAIS_MANUAL as readonly string[]).includes(setor);

type FotoDoSetor = { setor: string; posicao: number; vinculo?: string; modelo?: string; fluxos: { id: string; setorVinculado: string }[] };

export function StatusDeSalvamento({ estado }: { estado: EstadoDoSalvamento }) {
  if (estado === "erro") return <span className="cadest-status cadest-status--erro" role="alert">Não foi possível enviar agora. A alteração ficou neste aparelho e será reenviada.</span>;
  return (
    <span className="cadest-status" role="status" aria-live="polite">
      {estado === "salvando" ? "Salvando…" : "✓ Alterações salvas"}
    </span>
  );
}

export default function CadastroAmbientes({ empresa, podeEditar, estado, onGravar, onRenomear, onIrParaDados }: Props) {
  const setores = normalizarListaAmbientesReais(empresa.setoresManual);
  const equipamentos = empresa.equipamentosSetores || [];
  const vinculos = limparVinculos(empresa.setorOficialDoAmbiente, setores);
  const modelos = empresa.modelosQuestionarioAmbientes || {};
  const oficiaisMarcados = setores.filter(eOficial);
  const proprios = setores.filter((setor) => !eOficial(setor));
  const naoMarcados = SETORES_OFICIAIS_MANUAL.filter((setor) => !setores.includes(setor));
  const dono = `estrutura:${empresa.id}`;

  const [novoAberto, setNovoAberto] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [renomeando, setRenomeando] = useState<{ de: string; texto: string } | null>(null);
  const [vinculando, setVinculando] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  // Cada setor retirado que ainda tem equipamento ganha o seu bloqueio (com o seu destino).
  const [bloqueios, setBloqueios] = useState<{ ambiente: string; mensagem: string }[]>([]);
  const [destinos, setDestinos] = useState<Record<string, string>>({});
  const [loteAberto, setLoteAberto] = useState(false);
  const [loteSelecionados, setLoteSelecionados] = useState<string[]>([]);
  const [loteModelo, setLoteModelo] = useState("");
  const [foco, setFoco] = useState<string | null>(null);
  const semQuestionario = ambientesSemQuestionario(setores, SETORES_OFICIAIS_MANUAL, modelos, vinculos);

  // Um "Desfazer" não sobrevive à tela nem à empresa que o criou.
  useEffect(() => () => fecharToastDe(dono), [dono]);

  // Devolve o foco depois de uma ação que troca o botão (renomear, vincular, remover).
  useEffect(() => {
    if (!foco) return;
    const alvo = document.querySelector<HTMLElement>(`[data-foco="${foco.replace(/"/g, '\\"')}"]`);
    if (alvo) {
      alvo.focus();
      setFoco(null);
    }
  });

  function abrirLote(preselecionados: string[]) {
    setLoteSelecionados(preselecionados);
    setLoteModelo("");
    setLoteAberto(true);
  }

  function aplicarLote() {
    if (!loteModelo || loteSelecionados.length === 0) return;
    if (onGravar((atual) => ({ modelos: vincularQuestionarioEmLote(atual.modelosQuestionarioAmbientes, loteSelecionados, loteModelo) }))) setLoteAberto(false);
  }

  // "Salão" -> setor oficial do Manual (mesma regra e mesma fonte de antes: lib/setorOficialSugerido). Um toque vincula e marca o setor.
  function sugestaoDeSetorOficial(nome: string, jaCadastrado: boolean) {
    if (!podeEditar || eOficial(nome) || (jaCadastrado && vinculos[nome])) return null;
    const sugerida = sugerirSetorOficial(nome);
    if (!sugerida) return null;
    const marcado = oficiaisMarcados.includes(sugerida.oficial);
    const textoFonte = sugerida.fonte ? `${sugerida.fonte.norma}, item ${sugerida.fonte.item} · conferido em ${sugerida.fonte.conferidoEm.split("-").reverse().join("/")}` : "sem texto da norma encontrado para este setor";
    return (
      <span className="cadest-sugestao" role="status" title={sugerida.fonte ? `“${sugerida.fonte.trecho}” ${sugerida.fonte.link}` : textoFonte}>
        <span className="cadest-sugestao-marca">sugerido</span>
        <span>Setor oficial: {sugerida.oficial}</span>
        {jaCadastrado && (
          <button
            type="button"
            className="cadest-link"
            onClick={() =>
              void onGravar((atual) => {
                const atuais = normalizarListaAmbientesReais(atual.setoresManual);
                return { setores: atuais.includes(sugerida.oficial) ? atuais : [...atuais, sugerida.oficial], vinculos: { ...limparVinculos(atual.setorOficialDoAmbiente, atuais), [nome]: sugerida.oficial } };
              })
            }
          >
            {marcado ? "Vincular" : "Vincular e marcar o setor"}
          </button>
        )}
        <span className="cadest-sugestao-fonte">{textoFonte}</span>
      </span>
    );
  }

  const sugestao = sugestaoPorCnae(empresa);
  const contaDe = (nome: string) => perguntasDoAmbiente(nome, { modelosQuestionario: criarModelosQuestionarioAmbientes([nome], modelos, vinculos), questionarios: empresa.questionarios, fluxos: empresa.fluxosOperacionais });
  const textoDaConta = (nome: string) => { const n = contaDe(nome); return `${n} ${n === 1 ? "pergunta" : "perguntas"}`; };

  const erroDoNovo = (() => {
    const nome = novoNome.trim();
    if (!nome) return "";
    if (setores.includes(nome)) return "Esse ambiente já está na lista.";
    const existente = nomeJaExistente(nome, setores);
    return existente ? `Já existe: ${existente}.` : "";
  })();

  const fotografar = (setor: string): FotoDoSetor => ({ setor, posicao: setores.indexOf(setor), vinculo: vinculos[setor], modelo: modelos[setor], fluxos: fluxosLigadosAoSetor(empresa.fluxosOperacionais, setor) });

  // Delta do Desfazer: o ambiente volta com o vínculo, o questionário e os fluxos que tinha; o resto da empresa de agora não muda.
  function devolverSetor(atual: Empresa, foto: FotoDoSetor): MudancaDeEstrutura {
    const atuais = normalizarListaAmbientesReais(atual.setoresManual);
    return {
      setores: reinserirSetor(atuais, foto.setor, foto.posicao),
      ...(foto.vinculo ? { vinculos: { ...limparVinculos(atual.setorOficialDoAmbiente, atuais), [foto.setor]: foto.vinculo } } : {}),
      ...(foto.modelo ? { modelos: { ...(atual.modelosQuestionarioAmbientes || {}), [foto.setor]: foto.modelo } } : {}),
      restaurarFluxos: foto.fluxos,
    };
  }

  function avisoComDesfazer(texto: string, desfazer: () => void) {
    mostrarToast(`${texto} · `, { duracaoMs: 8000, dono, acao: { rotulo: "Desfazer", aoClicar: desfazer } });
  }

  // Escolher setores (modal existente) e Aceitar: a mesma função; grava ao concluir, sem botão Salvar.
  function aplicarSetores(escolhidos: string[]) {
    const retirados = oficiaisMarcados.filter((setor) => !escolhidos.includes(setor));
    const vinculadosAosRetirados = Object.entries(vinculos).filter(([nome, oficial]) => retirados.includes(oficial) && setores.includes(nome));
    setAviso(
      vinculadosAosRetirados
        .map(([nome, oficial]) => `“${nome}” está vinculado a “${nomeCurtoDoSetor(oficial)}” e mantém as ${perguntasDoSetor(oficial)} perguntas desse setor; o setor oficial sai da lista. Para o ambiente passar ao questionário básico, tire o vínculo.`)
        .join(" ")
    );
    // TODO setor retirado que tem equipamento fica protegido, cada um com o seu bloqueio.
    const novosBloqueios = bloqueiosDaRetirada(retirados, equipamentos);
    setBloqueios((atuais) => [...atuais.filter((item) => !novosBloqueios.some((novo) => novo.ambiente === item.ambiente) && setores.includes(item.ambiente)), ...novosBloqueios]);
    const protegidos = novosBloqueios.map((item) => item.ambiente);
    onGravar((atual) => {
      const atuais = normalizarListaAmbientesReais(atual.setoresManual);
      const proximos = aplicarEscolhaDeSetores(atuais, SETORES_OFICIAIS_MANUAL, [...escolhidos, ...protegidos]);
      return proximos === atuais ? null : { setores: proximos };
    });
  }

  function pedirRemover(setor: string) {
    const resultado = bloqueioDeExcluirAmbiente(setor, equipamentos);
    if (resultado.bloqueado) {
      setBloqueios((atuais) => [...atuais.filter((item) => item.ambiente !== setor), { ambiente: setor, mensagem: resultado.mensagem }]);
      return;
    }
    const foto = fotografar(setor);
    if (onGravar((atual) => ({ setores: normalizarListaAmbientesReais(atual.setoresManual).filter((item) => item !== setor) }))) {
      setFoco("titulo");
      avisoComDesfazer(`“${setor}” removido`, () => void onGravar((atual) => (normalizarListaAmbientesReais(atual.setoresManual).includes(setor) ? null : devolverSetor(atual, foto))));
    }
  }

  function moverEExcluir(ambiente: string) {
    const destino = destinos[ambiente];
    if (!destino) return;
    const foto = fotografar(ambiente);
    const movidos = equipamentos.filter((item) => item.setor === ambiente).map((item) => item.id);
    const feito = onGravar((atual) => ({
      setores: normalizarListaAmbientesReais(atual.setoresManual).filter((item) => item !== ambiente),
      equipamentos: (atual.equipamentosSetores || []).map((item) => (item.setor === ambiente ? { ...item, setor: destino } : item)),
    }));
    if (!feito) return;
    setBloqueios((atuais) => atuais.filter((item) => item.ambiente !== ambiente));
    setFoco("titulo");
    avisoComDesfazer(`“${ambiente}” removido, equipamentos movidos`, () =>
      void onGravar((atual) => {
        if (normalizarListaAmbientesReais(atual.setoresManual).includes(ambiente)) return null;
        return { ...devolverSetor(atual, foto), equipamentos: (atual.equipamentosSetores || []).map((item) => (movidos.includes(item.id) && item.setor === destino ? { ...item, setor: ambiente } : item)) };
      })
    );
  }

  function excluirTudo(ambiente: string) {
    const foto = fotografar(ambiente);
    const apagados = equipamentos.filter((item) => item.setor === ambiente);
    const feito = onGravar((atual) => ({
      setores: normalizarListaAmbientesReais(atual.setoresManual).filter((item) => item !== ambiente),
      equipamentos: (atual.equipamentosSetores || []).filter((item) => item.setor !== ambiente),
    }));
    if (!feito) return;
    setBloqueios((atuais) => atuais.filter((item) => item.ambiente !== ambiente));
    setFoco("titulo");
    avisoComDesfazer(`“${ambiente}” e ${quantidade(apagados.length, "equipamento", "equipamentos")} removidos`, () =>
      void onGravar((atual) => {
        if (normalizarListaAmbientesReais(atual.setoresManual).includes(ambiente)) return null;
        const existentes = atual.equipamentosSetores || [];
        return { ...devolverSetor(atual, foto), equipamentos: [...existentes, ...apagados.filter((item) => !existentes.some((outro) => outro.id === item.id))] };
      })
    );
  }

  function adicionarProprio() {
    const nome = novoNome.trim().replace(/\s+/g, " ");
    if (!nome || erroDoNovo) return;
    if (onGravar((atual) => ({ setores: [...normalizarListaAmbientesReais(atual.setoresManual), nome] }))) {
      setNovoNome("");
      setNovoAberto(false);
      setFoco("novo");
    }
  }

  async function confirmarRenomear() {
    if (!renomeando || erroDoNovoNome(renomeando.de, renomeando.texto, setores)) return;
    const novo = renomeando.texto.trim();
    if (await onRenomear(renomeando.de, novo)) {
      setRenomeando(null);
      setFoco(`renomear:${novo}`);
    }
  }

  function mudarVinculo(setor: string, oficial: string) {
    const anterior = vinculos[setor];
    if (anterior && !oficial) setAviso(`“${setor}” sem vínculo: perde as ${perguntasDoSetor(anterior)} perguntas de “${nomeCurtoDoSetor(anterior)}” e fica com o questionário básico (${textoDaConta(setor)}).`);
    else setAviso("");
    onGravar((atual) => {
      const { [setor]: _removido, ...resto } = limparVinculos(atual.setorOficialDoAmbiente, normalizarListaAmbientesReais(atual.setoresManual));
      return { vinculos: oficial ? { ...resto, [setor]: oficial } : resto };
    });
    setVinculando(null);
    setFoco(`vinculo:${setor}`);
  }

  const opcoesDoModal = SETORES_OFICIAIS_MANUAL.map((setor) => ({ id: setor, titulo: nomeCurtoDoSetor(setor), descricao: nomeCurtoDoSetor(setor) === setor ? undefined : setor }));
  const modal = (rotulo: string) => (
    <EscolhaEmJanela
      modo="botao"
      titulo="Setores do estabelecimento"
      apoio="Marque somente os setores que realmente existem nesta empresa."
      opcoes={opcoesDoModal}
      marcadas={oficiaisMarcados}
      palavra="setores marcados"
      rotuloDoBotao={rotulo}
      vazio="Nenhum setor marcado"
      onAplicar={aplicarSetores}
    />
  );
  const mostrarFaixa = podeEditar && oficiaisMarcados.length === 0;

  return (
    <section className="cadest" aria-labelledby="cadest-amb-titulo">
      <header className="cadest-cabeca">
        <div className="cadest-cabeca-textos">
          <h2 id="cadest-amb-titulo" className="cadest-titulo" tabIndex={-1} data-foco="titulo">Ambientes da empresa</h2>
          <p className="cadest-apoio">
            {linhaDeContagem(oficiaisMarcados.length, SETORES_OFICIAIS_MANUAL.length, "setores marcados")} · {quantidade(proprios.length, "ambiente próprio", "ambientes próprios")} · as perguntas de cada setor são as padrão do Manual
          </p>
        </div>
        {podeEditar && (
          <div className="cadest-acoes">
            <button type="button" className="cadest-btn" data-foco="novo" aria-expanded={novoAberto} aria-controls="cadest-novo" onClick={() => setNovoAberto((aberto) => !aberto)}>
              + Ambiente próprio
            </button>
            <span className="cadest-azul">{modal("Escolher setores")}</span>
          </div>
        )}
      </header>

      {mostrarFaixa && sugestao.situacao === "ok" && (
        <div className="cadest-faixa" role="region" aria-label="Sugestão pelo CNAE">
          <p className="cadest-faixa-titulo">{tituloDaSugestao(sugestao)}</p>
          <p className="cadest-faixa-texto">
            Para esse tipo de empresa, os setores mais comuns são: {sugestao.ambientes.map(nomeCurtoDoSetor).join(", ")}. Você ajusta depois em Escolher setores.
          </p>
          <p className="cadest-faixa-nota">Sugestão genérica pelo tipo de empresa; o RT confirma. Os equipamentos sugeridos aparecem na aba Equipamentos.</p>
          <div className="cadest-faixa-botoes">
            <button type="button" className="cadest-btn cadest-btn--azul" onClick={() => aplicarSetores([...oficiaisMarcados, ...sugestao.ambientes])}>
              Aceitar {sugestao.ambientes.length} {sugestao.ambientes.length === 1 ? "setor" : "setores"}
            </button>
            {modal("Escolher outros")}
          </div>
        </div>
      )}
      {mostrarFaixa && sugestao.situacao === "sem-cnae" && (
        <p className="cadest-faixa cadest-faixa--linha">
          Preencha o CNAE no cadastro para receber sugestões
          <button type="button" className="cadest-link" onClick={onIrParaDados}>Ir para a aba Empresa</button>
        </p>
      )}
      {mostrarFaixa && sugestao.situacao === "sem-sugestao" && (
        <p className="cadest-faixa cadest-faixa--linha">
          O CNAE {sugestao.codigo}{sugestao.descricao ? ` · ${sugestao.descricao}` : ""} ainda não tem sugestão pronta. Use Escolher setores.
        </p>
      )}

      {novoAberto && podeEditar && (
        <div id="cadest-novo" className="cadest-novo">
          <label className="cadest-campo">
            <span className="cadest-rotulo">Nome do ambiente próprio</span>
            <span className="ui-field-wrap cad-campo-voz">
              <input
                value={novoNome}
                autoFocus
                onChange={(event) => setNovoNome(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    adicionarProprio();
                  } else if (event.key === "Escape") {
                    setNovoAberto(false);
                    setFoco("novo");
                  }
                }}
                placeholder="Ex.: Churrasqueira"
                aria-invalid={Boolean(erroDoNovo)}
                aria-describedby={erroDoNovo ? "cadest-novo-erro" : undefined}
                className={`ui-input cad-input cad-input--voz${erroDoNovo ? " is-erro" : ""}`}
              />
              <span className="ui-field-tools cad-mic">
                <FieldVoiceTools fieldKey="novo-ambiente" value={novoNome} onChange={setNovoNome} contexto="Nome curto e objetivo de um ambiente ou setor de um estabelecimento de alimentos." somenteVoz soIcone />
              </span>
            </span>
          </label>
          <button type="button" className="cadest-btn cadest-btn--azul" disabled={!novoNome.trim() || Boolean(erroDoNovo)} onClick={adicionarProprio}>Adicionar</button>
          <button type="button" className="cadest-link" onClick={() => { setNovoAberto(false); setNovoNome(""); setFoco("novo"); }}>Cancelar</button>
          {erroDoNovo && <p id="cadest-novo-erro" className="cadest-erro" role="alert">{erroDoNovo}</p>}
          {novoNome.trim() && !erroDoNovo && sugestaoDeSetorOficial(novoNome.trim(), false)}
          {novoNome.trim() && !erroDoNovo && (
            <p className="cadest-dica" role="status">Nome próprio começa com o questionário básico ({textoDaConta(novoNome.trim())}). Depois, vincule a um setor oficial para ter as perguntas dele.</p>
          )}
        </div>
      )}

      {podeEditar && semQuestionario.length > 0 && (
        <p className="cadest-aviso cadest-aviso--linha" role="status">
          {quantidade(semQuestionario.length, "ambiente próprio está", "ambientes próprios estão")} com o questionário básico.
          <button type="button" className="cadest-link" aria-expanded={loteAberto} onClick={() => abrirLote(semQuestionario)}>Vincular a um setor oficial</button>
        </p>
      )}

      {loteAberto && podeEditar && (
        <div className="cadest-bloqueio cadest-lote-quest" role="group" aria-label="Vincular questionário em lote">
          <p className="cadest-rotulo">Vincular questionário a vários ambientes</p>
          <ul className="cadest-lote-quest-lista">
            {proprios.map((setor) => (
              <li key={setor}>
                <label className="cadest-lote-quest-item">
                  <input type="checkbox" checked={loteSelecionados.includes(setor)} onChange={() => setLoteSelecionados((atual) => (atual.includes(setor) ? atual.filter((item) => item !== setor) : [...atual, setor]))} />
                  <span>{setor}</span>
                  {semQuestionario.includes(setor) && <span className="cadest-oficial">Questionário básico · {textoDaConta(setor)}</span>}
                </label>
              </li>
            ))}
          </ul>
          <label className="cadest-campo">
            <span className="cadest-rotulo">Questionário</span>
            <Select value={loteModelo} onChange={(event) => setLoteModelo(event.target.value)} aria-label="Questionário a vincular">
              <option value="">Escolher o questionário…</option>
              {OPCOES_MODELO_QUESTIONARIO.filter((modelo) => modelo !== MODELO_GENERICO).map((modelo) => <option key={modelo} value={modelo}>{modelo}</option>)}
            </Select>
          </label>
          <div className="cadest-bloqueio-acoes">
            <button type="button" className="cadest-btn cadest-btn--azul" disabled={!loteModelo || loteSelecionados.length === 0} onClick={aplicarLote}>
              Vincular a {loteSelecionados.length === 1 ? "1 ambiente" : `${loteSelecionados.length} ambientes`}
            </button>
            <button type="button" className="cadest-link" onClick={() => setLoteAberto(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {aviso && <p className="cadest-aviso" role="status">{aviso}</p>}

      {bloqueios
        .filter((bloqueio) => setores.includes(bloqueio.ambiente))
        .map((bloqueio) => {
          const destinosParaMover = setores.filter((setor) => setor !== bloqueio.ambiente);
          return (
            <div key={bloqueio.ambiente} className="cadest-bloqueio" role="alert">
              <p>{bloqueio.mensagem}</p>
              <div className="cadest-bloqueio-acoes">
                {destinosParaMover.length > 0 && (
                  <label className="cadest-campo">
                    <span className="cadest-rotulo">Mover para</span>
                    <Select value={destinos[bloqueio.ambiente] || ""} onChange={(event) => setDestinos((atuais) => ({ ...atuais, [bloqueio.ambiente]: event.target.value }))} aria-label={`Ambiente de destino dos equipamentos de ${bloqueio.ambiente}`}>
                      <option value="">Escolher o ambiente…</option>
                      {destinosParaMover.map((destino) => <option key={destino} value={destino}>{destino}</option>)}
                    </Select>
                  </label>
                )}
                <button type="button" className="cadest-btn cadest-btn--azul" disabled={!destinos[bloqueio.ambiente]} onClick={() => moverEExcluir(bloqueio.ambiente)}>Mover e remover o ambiente</button>
                <button type="button" className="cadest-btn cadest-btn--perigo" onClick={() => excluirTudo(bloqueio.ambiente)}>Excluir equipamentos e o ambiente</button>
                <button type="button" className="cadest-link" onClick={() => setBloqueios((atuais) => atuais.filter((item) => item.ambiente !== bloqueio.ambiente))}>Cancelar</button>
              </div>
            </div>
          );
        })}

      {setores.length === 0 ? (
        <p className="cadest-vazio">{podeEditar ? "Nenhum ambiente ainda. Escolha os setores ou crie um ambiente próprio." : "Nenhum ambiente marcado."}</p>
      ) : (
        <ul className="cadest-lista">
          {setores.map((setor) => {
            const proprio = !eOficial(setor);
            const curto = nomeCurtoDoSetor(setor);
            const editandoNome = renomeando?.de === setor;
            const erroNome = editandoNome ? erroDoNovoNome(setor, renomeando.texto, setores) : "";
            const oficialVinculado = vinculos[setor];
            const subtexto = proprio ? (oficialVinculado ? `Ambiente próprio · vinculado a ${nomeCurtoDoSetor(oficialVinculado)}` : "Ambiente próprio · questionário básico") : curto === setor ? "Setor oficial do Manual" : setor;
            return (
              <li key={setor} className="cadest-item">
                <div className="cadest-item-topo">
                  <div className="cadest-nomes">
                    {editandoNome ? (
                      <span className="cadest-renomear">
                        <input
                          className={`ui-input cad-input${erroNome && renomeando.texto !== setor ? " is-erro" : ""}`}
                          value={renomeando.texto}
                          autoFocus
                          aria-label={`Novo nome de ${setor}`}
                          aria-invalid={Boolean(erroNome)}
                          onChange={(event) => setRenomeando({ de: setor, texto: event.target.value })}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void confirmarRenomear();
                            } else if (event.key === "Escape") {
                              setRenomeando(null);
                              setFoco(`renomear:${setor}`);
                            }
                          }}
                        />
                        <button type="button" className="cadest-btn cadest-btn--azul" disabled={Boolean(erroNome)} onClick={() => void confirmarRenomear()}>Renomear</button>
                        <button type="button" className="cadest-link" onClick={() => { setRenomeando(null); setFoco(`renomear:${setor}`); }}>Cancelar</button>
                        {erroNome && renomeando.texto !== setor && <span className="cadest-erro" role="alert">{erroNome}</span>}
                      </span>
                    ) : (
                      <>
                        <span className="cadest-nome" title={setor}>{curto}</span>
                        <span className="cadest-oficial">{subtexto}</span>
                      </>
                    )}
                  </div>
                  <span className="cadest-perguntas" title="Perguntas que a visita traz para este ambiente">{textoDaConta(setor)}</span>
                </div>
                {proprio && !editandoNome && sugestaoDeSetorOficial(setor, true)}
                {podeEditar && proprio && !editandoNome && (
                  <div className="cadest-item-acoes">
                    <button type="button" className="cadest-link" data-foco={`renomear:${setor}`} aria-label={`Renomear ${setor}`} onClick={() => setRenomeando({ de: setor, texto: setor })}>Renomear</button>
                    {oficiaisMarcados.length > 0 && (
                      <button type="button" className="cadest-link" data-foco={`vinculo:${setor}`} aria-expanded={vinculando === setor} aria-label={`Setor oficial de ${setor}`} onClick={() => setVinculando(vinculando === setor ? null : setor)}>Setor oficial</button>
                    )}
                    <button type="button" className="cadest-link cadest-link--perigo" aria-label={`Remover ${setor}`} onClick={() => pedirRemover(setor)}>Remover</button>
                  </div>
                )}
                {podeEditar && proprio && vinculando === setor && (
                  <Select value={oficialVinculado || ""} onChange={(event) => mudarVinculo(setor, event.target.value)} aria-label={`Setor oficial de ${setor}`} className="cadest-select">
                    <option value="">Nenhum (opcional)</option>
                    {oficiaisMarcados.map((oficial) => <option key={oficial} value={oficial}>{oficial}</option>)}
                  </Select>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <footer className="cadest-rodape">
        {naoMarcados.length > 0 ? <p className="cadest-naomarcados">Não marcados nesta empresa: {naoMarcados.map(nomeCurtoDoSetor).join(" · ")}</p> : <span />}
        {podeEditar && <StatusDeSalvamento estado={estado} />}
      </footer>
    </section>
  );
}
