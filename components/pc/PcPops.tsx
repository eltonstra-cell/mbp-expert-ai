"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Empresa, ProcedimentoOperacionalPadronizado, UsuarioSistema } from "@/types";
import PcFichaPop, { type AbaFicha } from "@/components/pc/PcFichaPop";
import { destinoDoAprovar, type AlvoDaPendencia } from "@/lib/popPendencias";
import PcPopsLista from "@/components/pc/PcPopsLista";
import type { CabecalhoDeImpressao } from "@/lib/printFooter";
import { useRegistrosDaEmpresa } from "@/components/RegistrosEmpresaContext";
import { aprovarPop, criarPopDoTextoBase, criarPopsFaltantesDoConjunto, descartarRascunho, conjuntoDaEmpresa, enviarParaAprovacao, hojeISO, iniciarNovaVersao, podeAprovarPop } from "@/lib/popsNorma";
import { montarListaDePops } from "@/lib/popGestao";
import { criarPopDeModelo, modeloPorId, type ResultadoDaCriacao } from "@/lib/popModelos";
import { nomeDeExibicaoDaEmpresa } from "@/lib/nomeEmpresa";

type Props = {
  pops: ProcedimentoOperacionalPadronizado[];
  empresa: Empresa;
  usuario?: UsuarioSistema | null;
  /** Só Administrador e RT editam o texto; os demais leem, e quem é o responsável vinculado ainda aprova. */
  podeEditar?: boolean;
  /** Grava os POPs na hora. */
  onPersistir: (pops: ProcedimentoOperacionalPadronizado[]) => void;
  mensagem?: string;
  /** Cartão "Colocar a empresa em dia" e aviso de responsável, quando houver. */
  topo?: ReactNode;
  /** Abas da seção (Manual, POPs, Programas…), desenhadas na linha 2 da lista. */
  abas?: ReactNode;
  /** Leva a Empresa › Dados (só quem edita a empresa): link "Alterar em Dados" ao lado do responsável. */
  onAlterarEmDados?: () => void;
  /** Faixa própria quando o responsável do estabelecimento não tem pessoa de Acessos vinculada. */
  avisoSemVinculo?: ReactNode;
  /** Leva a Empresa › Norma aplicável (só quem edita a empresa). */
  onIrParaNorma?: () => void;
  /** Abre a ficha deste POP (vindo do painel, da Correção ou de outra tela). */
  abrirFicha?: { popId: string; aba?: AbaFicha; chave: number } | null;
  /** Avisa que o pedido de abrir a ficha já foi atendido (para não reabrir ao voltar à lista). */
  aoConsumirPedido?: () => void;
  /** Avisa quando a ficha abre ou fecha (rótulo do POP para o caminho do topo) para a tela esconder grupos e sub-abas. */
  aoMudarFicha?: (rotulo: string | null, info?: { id: string; rotuloCompleto: string } | null) => void;
  onImprimir?: (titulo: string, cabecalho: CabecalhoDeImpressao) => void;
  responsavelDoEstabelecimento?: { nome: string; cargo: string; usuarioId?: string };
  /** Muda a cada clique em "POPs" do caminho: fecha a ficha e volta à lista. */
  pedidoDeLista?: number;
};

// Documentos › POPs: a lista com situação e próxima ação e, ao abrir um POP, a ficha com as seis abas.
export default function PcPops({ pops, empresa, usuario = null, podeEditar = false, onPersistir, mensagem, topo, abas, onAlterarEmDados, avisoSemVinculo, onIrParaNorma, abrirFicha, aoConsumirPedido, aoMudarFicha, onImprimir, responsavelDoEstabelecimento, pedidoDeLista = 0 }: Props) {
  const contexto = useRegistrosDaEmpresa();
  const [fichaId, setFichaId] = useState<string | null>(null);
  const [abaInicial, setAbaInicial] = useState<AbaFicha>("resumo");
  const [alvoInicial, setAlvoInicial] = useState<AlvoDaPendencia | undefined>(undefined);
  const [mensagemFicha, setMensagemFicha] = useState("");
  const [verArquivados, setVerArquivados] = useState(false);
  const hoje = hojeISO();

  useEffect(() => {
    if (!abrirFicha) return;
    const destino = destinoAoAbrir(abrirFicha.popId, abrirFicha.aba);
    setFichaId(abrirFicha.popId);
    setAbaInicial(destino.aba);
    setAlvoInicial(destino.alvo);
    setMensagemFicha("");
    aoConsumirPedido?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirFicha]);

  useEffect(() => {
    if (!pedidoDeLista) return;
    setFichaId(null);
    setMensagemFicha("");
  }, [pedidoDeLista]);

  const podeAprovar = podeAprovarPop(usuario, empresa);
  const empresaDaLista = useMemo(() => ({ normasAplicadas: empresa.normasAplicadas, pops }), [empresa.normasAplicadas, pops]);
  const { conjunto, outros } = useMemo(
    () =>
      montarListaDePops({
        empresa: empresaDaLista,
        hoje,
        comprovantes: contexto?.comprovantes,
        ncs: contexto?.ncs,
        registros: contexto?.registros,
        colaboradores: contexto?.colaboradores,
        leituras: contexto?.leituras,
        podeAprovar,
        comArquivados: verArquivados,
      }),
    [empresaDaLista, hoje, contexto, podeAprovar, verArquivados]
  );
  const arquivados = pops.filter((pop) => pop.arquivado).length;
  const definicoes = conjuntoDaEmpresa(empresaDaLista);
  const faltamCriar = conjunto.filter((linha) => !linha.pop).length;
  const popEmFicha = fichaId ? pops.find((pop) => pop.id === fichaId) : undefined;

  const rotuloDaFicha = popEmFicha ? popEmFicha.codigo || popEmFicha.titulo || "POP" : null;
  // Rótulo da tela para "Continuar de onde parei": "POP-05 · Lavagem e higienização de mãos" (só código e título, nada de pessoa).
  const rotuloCompleto = popEmFicha ? [popEmFicha.codigo, popEmFicha.titulo].map((parte) => (parte || "").trim()).filter(Boolean).join(" · ") || "POP" : null;
  useEffect(() => {
    aoMudarFicha?.(rotuloDaFicha, popEmFicha ? { id: popEmFicha.id, rotuloCompleto: rotuloCompleto || "POP" } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotuloDaFicha, rotuloCompleto]);
  useEffect(() => () => aoMudarFicha?.(null, null), []); // eslint-disable-line react-hooks/exhaustive-deps

  // "Aprovar" (aba Documento) de um POP de modelo ainda não conferido abre o POP já na pendência (a conferência, no Resumo).
  function destinoAoAbrir(id: string, aba?: AbaFicha): { aba: AbaFicha; alvo?: AlvoDaPendencia } {
    const alvoPop = pops.find((pop) => pop.id === id);
    const aguardando = alvoPop?.status === "Aguardando aprovação" || alvoPop?.status === "Em revisão";
    if (aba === "documento" && alvoPop && aguardando) return destinoDoAprovar(alvoPop);
    return { aba: aba || "resumo" };
  }

  function abrir(id: string, aba?: AbaFicha) {
    const destino = destinoAoAbrir(id, aba);
    setMensagemFicha("");
    setAbaInicial(destino.aba);
    setAlvoInicial(destino.alvo);
    setFichaId(id);
  }

  function criarDoModelo(catalogoId: string) {
    const definicao = definicoes.find((item) => item.catalogoId === catalogoId);
    if (!definicao) return;
    const novo = criarPopDoTextoBase(definicao, empresaDaLista, crypto.randomUUID());
    onPersistir([...pops, novo]);
    setMensagemFicha("");
    setAbaInicial("documento");
    setAlvoInicial(undefined);
    setFichaId(novo.id);
  }

  // "A partir de modelo": rascunho não conferido, com {{empresa}} e {{responsavel}} já resolvidos; abre a ficha no Resumo (onde fica a conferência).
  function criarDeModelo(modeloId: string, codigo: string, titulo: string): ResultadoDaCriacao {
    const modelo = modeloPorId(modeloId);
    if (!modelo) return { ok: false, campo: "titulo", aviso: "Modelo não encontrado." };
    const resultado = criarPopDeModelo({
      modelo,
      pops,
      empresa: nomeDeExibicaoDaEmpresa(empresa),
      responsavel: { nome: responsavelDoEstabelecimento?.nome || "", cargo: responsavelDoEstabelecimento?.cargo || "" },
      id: crypto.randomUUID(),
      gerarId: () => crypto.randomUUID(),
      codigo,
      titulo,
    });
    if (resultado.ok) {
      onPersistir([...pops, resultado.pop]);
      setMensagemFicha("");
      setAbaInicial("resumo");
      setFichaId(resultado.pop.id);
    }
    return resultado;
  }

  function criarFaltantes() {
    const resultado = criarPopsFaltantesDoConjunto(empresaDaLista, () => crypto.randomUUID());
    if (resultado.criados > 0) onPersistir(resultado.pops);
  }

  function executar(atual: ProcedimentoOperacionalPadronizado, acao: () => ProcedimentoOperacionalPadronizado, aviso: string) {
    try {
      const novo = acao();
      onPersistir(pops.map((pop) => (pop.id === atual.id ? novo : pop)));
      setMensagemFicha(aviso);
    } catch (erro) {
      setMensagemFicha(erro instanceof Error ? erro.message : "Não foi possível concluir.");
    }
  }

  if (popEmFicha) {
    return (
      <PcFichaPop
        key={popEmFicha.id}
        pop={popEmFicha}
        empresa={empresa}
        usuario={usuario}
        podeEditar={podeEditar}
        onImprimir={onImprimir}
        responsavelDoEstabelecimento={responsavelDoEstabelecimento}
        popsDaEmpresa={pops}
        podeAprovar={podeAprovar}
        contexto={contexto}
        mensagem={mensagemFicha}
        abaInicial={abaInicial}
        alvoInicial={alvoInicial}
        onVoltar={() => {
          setFichaId(null);
          setMensagemFicha("");
        }}
        onSalvarRascunho={(novo) => executar(popEmFicha, () => novo, "Rascunho salvo.")}
        onEnviar={(novo) => executar(popEmFicha, () => enviarParaAprovacao(novo), "Enviado para aprovação do responsável do estabelecimento.")}
        onAprovar={(novo) => executar(popEmFicha, () => aprovarPop(novo, usuario!, empresa, new Date().toISOString()), "POP aprovado e assinado.")}
        onAtualizarConferencia={(novo) => onPersistir(pops.map((pop) => (pop.id === novo.id ? novo : pop)))}
        onDescartar={(atual) => executar(popEmFicha, () => descartarRascunho(atual), "Rascunho descartado. A versão aprovada continua vigente.")}
        onNovaVersao={(novo) => executar(popEmFicha, () => iniciarNovaVersao(novo), "Nova versão criada em rascunho. A versão aprovada continua guardada.")}
      />
    );
  }

  return (
    <PcPopsLista
      empresa={empresaDaLista}
      conjunto={conjunto}
      outros={outros}
      podeEditar={podeEditar}
      arquivados={arquivados}
      verArquivados={verArquivados}
      onVerArquivados={() => setVerArquivados((valor) => !valor)}
      faltamCriar={faltamCriar}
      avisoSemVinculo={avisoSemVinculo}
      onIrParaNorma={onIrParaNorma}
      onCriarFaltantes={criarFaltantes}
      onCriarDoModelo={criarDoModelo}
      onCriarDeModelo={criarDeModelo}
      onAbrirFicha={abrir}
      pops={pops}
      onPersistir={onPersistir}
      abas={abas}
      responsavel={responsavelDoEstabelecimento ? { nome: responsavelDoEstabelecimento.nome, cargo: responsavelDoEstabelecimento.cargo } : undefined}
      onAlterarEmDados={onAlterarEmDados}
      topo={topo}
      mensagem={mensagem}
    />
  );
}
