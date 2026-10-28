"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import FieldVoiceTools from "@/components/FieldVoiceTools";
import Select from "@/components/Select";
import VozEquipamentosConferencia, { type ItemParaConferir } from "@/components/VozEquipamentosConferencia";
import CopiarDeOutraEmpresa from "@/components/pc/CopiarDeOutraEmpresa";
import { StatusDeSalvamento, type EntradaDeEstrutura, type EstadoDoSalvamento } from "@/components/pc/CadastroAmbientes";
import { desfazerSoma, reinserirEquipamentoNaPosicao } from "@/lib/estruturaDelta";
import { copiarDeOutraEmpresa, type EquipamentoDeOrigem } from "@/lib/copiaEquipamentos";
import {
  adicionarEquipamentoNoSetor,
  adicionarSugestoesEmLote,
  avisoDeNomeCurto,
  MENSAGEM_DE_NOME_CURTO,
  avisoDeNomeRepetido,
  concordar,
  confirmarItensFalados,
  confirmarSugestao,
  contagemPorSetor,
  copiarEquipamentos,
  definirLimite,
  desfazerCopia,
  desfazerMover,
  equipamentoParecidoNoSetor,
  equipamentoRepetidoNoSetor,
  mesmoNomeOuSinonimo,
  moverSomandoSeRepetir,
  mudarNomeEQuantidade,
  nomeDeEquipamentoValido,
  podeAdicionarEquipamento,
  quantidadeValida,
  removerEquipamento,
  somarAoExistente,
} from "@/lib/equipamentosCadastro";
import { sugerirNomesDeEquipamento } from "@/lib/autocompletarEquipamento";
import { LIMITES_DE_TEMPERATURA, baseDoLimite, limiteDoTipo, textoDoLimite } from "@/lib/limitesDeTemperatura";
import { rotuloDoSetor } from "@/lib/nomesDeAmbiente";
import { SETORES_OFICIAIS_MANUAL, normalizarListaAmbientesReais, normalizarSetorManual } from "@/lib/manualBase";
import { quantidade } from "@/lib/plural";
import { limparVinculos } from "@/lib/ambientesVisita";
import { avisoQuandoNaoHaSugestao, equipamentosSugeridosParaSetor, sugestaoPorCnae } from "@/lib/sugestaoPorCnae";
import { limiteSugeridoParaEquipamento, nomeCurtoDoSetor } from "@/lib/tiposDeEstabelecimento";
import { fecharToastDe, mostrarToast } from "@/lib/toast";
import { nomeJaExistente } from "@/lib/ambientesVisita";
import { interpretarEquipamentos, podeConfirmar } from "@/lib/vozEquipamentos";
import type { Empresa, EquipamentoSetor } from "@/types";
import "../../app/cadastro-estrutura.css";

type Props = {
  empresa: Empresa;
  podeEditar: boolean;
  estado: EstadoDoSalvamento;
  onGravar: (entrada: EntradaDeEstrutura) => boolean;
  onIrParaAmbientes: () => void;
  onIrParaDados: () => void;
};

const DURACAO_DO_DESFAZER_MS = 8000;

// Quantidade com texto livre: dá para apagar tudo e digitar de novo; o número válido (mínimo 1) só é imposto ao sair do campo.
function Quantidade({ valor, onChange, rotulo }: { valor: number; onChange: (valor: number) => void; rotulo: string }) {
  const [texto, setTexto] = useState(String(valor));
  useEffect(() => {
    setTexto((atual) => (atual === "" || quantidadeValida(atual) === valor ? atual : String(valor)));
  }, [valor]);
  return (
    <span className="cadest-qtd" role="group" aria-label={rotulo}>
      <button type="button" className="cadest-qtd-botao" aria-label="Diminuir quantidade" disabled={valor <= 1} onClick={() => { setTexto(String(Math.max(1, valor - 1))); onChange(Math.max(1, valor - 1)); }}>−</button>
      <input
        className="cadest-qtd-campo"
        type="text"
        inputMode="numeric"
        value={texto}
        aria-label={rotulo}
        onChange={(evento) => {
          const digitado = evento.target.value.replace(/\D/g, "");
          setTexto(digitado);
          if (digitado !== "") onChange(quantidadeValida(digitado));
        }}
        onBlur={() => setTexto(String(valor))}
      />
      <button type="button" className="cadest-qtd-botao" aria-label="Aumentar quantidade" onClick={() => { setTexto(String(valor + 1)); onChange(valor + 1); }}>+</button>
    </span>
  );
}

/** Ids novos que se repetem se a função for chamada de novo (o atualizador pode recalcular): o aviso "Desfazer" e a gravação enxergam os mesmos ids. */
function geradorEstavel() {
  const guardados: string[] = [];
  return () => {
    let posicao = 0;
    return () => {
      if (!guardados[posicao]) guardados[posicao] = crypto.randomUUID();
      return guardados[posicao++];
    };
  };
}

export default function CadastroEquipamentos({ empresa, podeEditar, estado, onGravar, onIrParaAmbientes, onIrParaDados }: Props) {
  const setores = normalizarListaAmbientesReais(empresa.setoresManual);
  const equipamentos = empresa.equipamentosSetores || [];
  const contagem = contagemPorSetor(equipamentos, setores);
  const sugestao = sugestaoPorCnae(empresa);
  const dono = `estrutura:${empresa.id}`;

  const [escolhido, setEscolhido] = useState("");
  const selecionado = setores.includes(escolhido) ? escolhido : setores[0] || "";
  const [nome, setNome] = useState("");
  const [qtd, setQtd] = useState(1);
  const [escolha, setEscolha] = useState<"somar" | "outro" | null>(null);
  const [lote, setLote] = useState<{ setor: string; marcados: string[]; qtds: Record<string, number> }>({ setor: "", marcados: [], qtds: {} });
  const [edicao, setEdicao] = useState<{ id: string; nome: string; qtd: number; limite: string; obs: string } | null>(null);
  const [menu, setMenu] = useState<{ id: string; nivel: "principal" | "mover" } | null>(null);
  const [copiando, setCopiando] = useState(false);
  // Campo do nome: tentativa de adicionar (para a mensagem de nome curto) e lista de autocompletar (listbox).
  const [tentou, setTentou] = useState(false);
  const [listaAberta, setListaAberta] = useState(false);
  const [opcaoAtiva, setOpcaoAtiva] = useState(-1);
  // Itens falados esperando conferência (nada entra no quadro sem confirmar) e cópia deste setor para outros setores da própria empresa.
  const [falados, setFalados] = useState<ItemParaConferir[]>([]);
  const [copiandoSetor, setCopiandoSetor] = useState<string[] | null>(null);

  const campoRef = useRef<HTMLInputElement | null>(null);
  const tituloRef = useRef<HTMLHeadingElement | null>(null);
  const botoesMenu = useRef<Record<string, HTMLButtonElement | null>>({});
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Um "Desfazer" não sobrevive à tela nem à empresa que o criou.
  useEffect(() => () => fecharToastDe(dono), [dono]);

  // Cada setor guarda os seus equipamentos pelo nome COMPLETO do ambiente (único em setoresManual): "Cozinha" próprio e "Cozinha / Produção" nunca se misturam,
  // mesmo mostrando o mesmo nome curto na lista (o próprio ganha "(próprio)").
  const doSetor = equipamentos.filter((item) => item.setor === selecionado);
  const curto = rotuloDoSetor(selecionado, setores);
  const vinculos = limparVinculos(empresa.setorOficialDoAmbiente, setores);
  const repetido = equipamentoParecidoNoSetor(equipamentos, selecionado, nome);
  const aviso = avisoDeNomeRepetido(repetido, nome);
  const avisoCurto = avisoDeNomeCurto(nome, tentou);
  const podeAdicionar = podeEditar && podeAdicionarEquipamento(nome, repetido, escolha);
  const sugeridosDoSetor = equipamentosSugeridosParaSetor(sugestao, selecionado, doSetor.map((item) => item.nome), mesmoNomeOuSinonimo, vinculos);
  const proprioSemVinculo = !(SETORES_OFICIAIS_MANUAL as readonly string[]).includes(selecionado) && !vinculos[selecionado] && normalizarSetorManual(selecionado) === selecionado;
  const semSugestao = avisoQuandoNaoHaSugestao(sugestao, sugeridosDoSetor);
  const opcoesDeNome = sugerirNomesDeEquipamento(nome, equipamentos.map((item) => item.nome));
  const listaVisivel = listaAberta && opcoesDeNome.length > 0;
  const loteAtual = lote.setor === selecionado ? lote : { setor: selecionado, marcados: [], qtds: {} as Record<string, number> };
  const outrosSetores = setores.filter((setor) => setor !== selecionado);
  // Renomear para um nome que já existe no setor: avisa na hora e bloqueia (o item que está sendo editado não conta contra si mesmo).
  const repetidoNaEdicao = edicao ? equipamentoRepetidoNoSetor(equipamentos, equipamentos.find((item) => item.id === edicao.id)?.setor || selecionado, edicao.nome, edicao.id) : undefined;

  // Toda gravação parte da lista de AGORA (a empresa que a tela grava), nunca da que estava na tela quando o aviso apareceu.
  // `fazer` devolve a lista nova, ou nulo quando não há o que gravar.
  function alterar(fazer: (lista: EquipamentoSetor[], setoresAtuais: string[]) => EquipamentoSetor[] | null): boolean {
    return onGravar((atual) => {
      const nova = fazer(atual.equipamentosSetores || [], normalizarListaAmbientesReais(atual.setoresManual));
      return nova ? { equipamentos: nova } : null;
    });
  }

  function aviso8s(texto: string, desfazer: () => void) {
    // O ✓ do aviso verde vem do próprio aviso (ToastHost): o texto não repete.
    mostrarToast(`${texto.replace(/^✓\s*/, "")} · `, { duracaoMs: DURACAO_DO_DESFAZER_MS, dono, acao: { rotulo: "Desfazer", aoClicar: desfazer } });
  }

  function limparFormulario() {
    setNome("");
    setQtd(1);
    setEscolha(null);
    setTentou(false);
    setListaAberta(false);
    setOpcaoAtiva(-1);
  }

  function escolherOpcao(texto: string) {
    setNome(texto);
    setEscolha(null);
    setListaAberta(false);
    setOpcaoAtiva(-1);
    campoRef.current?.focus();
  }

  function aoTeclarNoNome(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown" && opcoesDeNome.length > 0) {
      evento.preventDefault();
      setListaAberta(true);
      setOpcaoAtiva((atual) => (listaVisivel ? (atual + 1) % opcoesDeNome.length : 0));
    } else if (evento.key === "ArrowUp" && listaVisivel) {
      evento.preventDefault();
      setOpcaoAtiva((atual) => (atual <= 0 ? opcoesDeNome.length - 1 : atual - 1));
    } else if (evento.key === "Escape" && listaVisivel) {
      evento.preventDefault();
      evento.stopPropagation();
      setListaAberta(false);
      setOpcaoAtiva(-1);
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      if (listaVisivel && opcaoAtiva >= 0 && opcoesDeNome[opcaoAtiva]) escolherOpcao(opcoesDeNome[opcaoAtiva]);
      else adicionar();
    }
  }

  function adicionar() {
    if (!podeEditar || !selecionado) return;
    if (!nomeDeEquipamentoValido(nome)) {
      setTentou(true);
      return;
    }
    if (!podeAdicionar) return;
    const quantidadeDigitada = quantidadeValida(qtd);
    const setorAlvo = selecionado;
    if (repetido && escolha === "somar") {
      const antes = quantidadeValida(repetido.quantidade);
      const id = repetido.id;
      if (!alterar((lista) => somarAoExistente(lista, id, quantidadeDigitada))) return;
      aviso8s(`✓ ${repetido.nome} ${concordar(repetido.nome, "somad")} em ${curto}: Qtd ${antes + quantidadeDigitada}`, () => void alterar((lista) => desfazerSoma(lista, id, quantidadeDigitada)));
    } else {
      const id = crypto.randomUUID();
      const limite = limiteSugeridoParaEquipamento(nome)?.id;
      const nomeDigitado = nome;
      if (!alterar((lista, atuais) => (atuais.includes(setorAlvo) ? adicionarEquipamentoNoSetor(lista, { id, setor: setorAlvo, nome: nomeDigitado, quantidade: quantidadeDigitada, limiteTemperaturaId: limite }).equipamentos : null))) return;
      const nomeGravado = nomeDigitado.trim().replace(/\s+/g, " ");
      aviso8s(`✓ ${nomeGravado} ${concordar(nomeGravado, "adicionad")} em ${curto}`, () => void alterar((lista) => removerEquipamento(lista, id)));
    }
    limparFormulario();
    campoRef.current?.focus();
  }

  // Sugestão de um toque: entra com Qtd 1 (e o limite sugerido, como no adicionar normal) e mostra "X adicionado em <setor> · Desfazer".
  function adicionarSugestaoRapida(nomeSugerido: string) {
    if (!podeEditar || !selecionado) return;
    const setorAlvo = selecionado;
    const id = crypto.randomUUID();
    const limite = limiteSugeridoParaEquipamento(nomeSugerido)?.id;
    const naoGravou = () => mostrarToast(`${nomeSugerido} não foi adicionado: já existe neste setor ou o setor não está mais marcado.`, { tipo: "aviso", duracaoMs: 5000, dono });
    if (equipamentoParecidoNoSetor(equipamentos, setorAlvo, nomeSugerido)) return naoGravou();
    if (!alterar((lista, atuais) => (atuais.includes(setorAlvo) && !equipamentoParecidoNoSetor(lista, setorAlvo, nomeSugerido) ? adicionarEquipamentoNoSetor(lista, { id, setor: setorAlvo, nome: nomeSugerido, quantidade: 1, limiteTemperaturaId: limite }).equipamentos : null))) return naoGravou();
    aviso8s(`${nomeSugerido} ${concordar(nomeSugerido, "adicionad")} em ${curto}`, () => void alterar((lista) => removerEquipamento(lista, id)));
  }

  function adicionarLote() {
    const itens = sugeridosDoSetor.filter((item) => loteAtual.marcados.includes(item.nome)).map((item) => ({ nome: item.nome, quantidade: loteAtual.qtds[item.nome] ?? item.quantidade, limiteTemperaturaId: limiteSugeridoParaEquipamento(item.nome)?.id }));
    if (itens.length === 0) return;
    const setorAlvo = selecionado;
    const novoId = geradorEstavel();
    const previa = adicionarSugestoesEmLote(equipamentos, setorAlvo, itens, novoId());
    if (previa.criados.length === 0) return;
    if (!alterar((lista, atuais) => (atuais.includes(setorAlvo) ? adicionarSugestoesEmLote(lista, setorAlvo, itens, novoId()).equipamentos : null))) return;
    setLote({ setor: setorAlvo, marcados: [], qtds: {} });
    aviso8s(`✓ ${quantidade(previa.criados.length, "item adicionado", "itens adicionados")} em ${curto}`, () => void alterar((lista) => desfazerCopia(lista, previa.criados)));
  }

  function fecharMenu(devolverFoco = true) {
    const aberto = menu;
    setMenu(null);
    if (devolverFoco && aberto) window.setTimeout(() => (botoesMenu.current[aberto.id] || tituloRef.current)?.focus(), 0);
  }

  function remover(item: EquipamentoSetor) {
    const posicao = equipamentos.findIndex((outro) => outro.id === item.id);
    if (!alterar((lista) => removerEquipamento(lista, item.id))) return;
    setMenu(null);
    window.setTimeout(() => tituloRef.current?.focus(), 0);
    aviso8s(`✓ ${item.nome} ${concordar(item.nome, "removid")}`, () => {
      // Delta: só devolve este item (se o setor dele ainda está marcado); o que mudou depois fica como está.
      if (!alterar((lista, atuais) => reinserirEquipamentoNaPosicao(lista, item, posicao, atuais))) mostrarToast("Não foi possível desfazer: o setor deste equipamento não está mais marcado.", { tipo: "aviso", duracaoMs: 5000, dono });
    });
  }

  function mover(item: EquipamentoSetor, destino: string) {
    const previa = moverSomandoSeRepetir(equipamentos, item.id, destino);
    if (!previa.movido) return;
    if (!alterar((lista) => {
      const feito = moverSomandoSeRepetir(lista, item.id, destino);
      return feito.movido ? feito.equipamentos : null;
    })) return;
    setMenu(null);
    window.setTimeout(() => tituloRef.current?.focus(), 0);
    const nomeDestino = rotuloDoSetor(destino, setores);
    const texto = previa.somouEm
      ? `✓ ${item.nome} já existia em ${nomeDestino}: somou, agora Qtd ${previa.somouEm.quantidade}`
      : `✓ ${item.nome} ${concordar(item.nome, "movid")} para ${nomeDestino}`;
    aviso8s(texto, () => void alterar((lista) => desfazerMover(lista, item, previa.somouEm?.id)));
  }

  function salvarEdicao() {
    if (!edicao || !nomeDeEquipamentoValido(edicao.nome) || repetidoNaEdicao) return;
    const { id, nome: novoNome, qtd: novaQtd, obs, limite } = edicao;
    const gravou = alterar((lista) => {
      const item = lista.find((outro) => outro.id === id);
      if (!item || equipamentoRepetidoNoSetor(lista, item.setor, novoNome, id)) return null;
      let proximos = mudarNomeEQuantidade(lista, id, novoNome, novaQtd).map((outro) => (outro.id === id ? { ...outro, observacao: obs } : outro));
      if (limite !== (item.limiteTemperaturaId || "")) proximos = definirLimite(proximos, id, limite);
      return proximos;
    });
    if (gravou) {
      setEdicao(null);
      window.setTimeout(() => botoesMenu.current[id]?.focus(), 0);
    }
  }

  function copiar(itens: EquipamentoDeOrigem[], setoresEscolhidos: string[]) {
    const novoId = geradorEstavel();
    const previa = copiarDeOutraEmpresa(equipamentos, itens, setoresEscolhidos, setores, novoId());
    if (previa.criados.length === 0) {
      mostrarToast(previa.jaExistiam > 0 ? "Nada copiado: esses itens já existem nos setores escolhidos." : "Nada para copiar nos setores escolhidos.", { tipo: "aviso", duracaoMs: 5000, dono });
      return;
    }
    if (!alterar((lista, atuais) => copiarDeOutraEmpresa(lista, itens, setoresEscolhidos, atuais, novoId()).equipamentos)) return;
    aviso8s(`Copiado: ${quantidade(previa.criados.length, "item", "itens")}${previa.jaExistiam ? ` (${previa.jaExistiam} já existia${previa.jaExistiam === 1 ? "" : "m"})` : ""}`, () => void alterar((lista) => desfazerCopia(lista, previa.criados)));
  }

  function tratarFala(texto: string) {
    const resultado = interpretarEquipamentos(texto, setores);
    if (!resultado.entendeu) {
      // Não entendeu: o texto fica no campo e o resto não é preenchido.
      setNome((atual) => [atual.trim(), texto.trim()].filter(Boolean).join(" "));
      setEscolha(null);
      return;
    }
    setFalados((atuais) => [...atuais, ...resultado.itens.map((item) => ({ ...item, id: crypto.randomUUID() }))]);
  }

  function atualizarFalado(id: string, mudanca: Partial<ItemParaConferir>) {
    setFalados((atuais) => atuais.map((item) => (item.id === id ? { ...item, ...mudanca } : item)));
  }

  function criarAmbienteFalado(id: string) {
    const item = falados.find((atual) => atual.id === id);
    const falado = (item?.falado || "").trim();
    if (!item || !falado) return;
    const nomeNovo = falado.charAt(0).toLocaleUpperCase("pt-BR") + falado.slice(1);
    const existente = nomeJaExistente(nomeNovo, setores);
    if (!existente && !setores.includes(nomeNovo) && !onGravar((atual) => ({ setores: [...normalizarListaAmbientesReais(atual.setoresManual), nomeNovo] }))) return;
    atualizarFalado(id, { ambiente: existente || nomeNovo, situacao: "ok" });
  }

  // O que é confirmado por voz passa pelas MESMAS regras da digitação: nome repetido no setor soma no item que já existe, o limite sugerido
  // entra como proposta, e há "Desfazer".
  function confirmarFalados(ids: string[]) {
    const escolhidos = falados.filter((item) => ids.includes(item.id));
    const prontos = escolhidos.filter((item) => podeConfirmar(item));
    if (escolhidos.some((item) => !nomeDeEquipamentoValido(item.nome))) mostrarToast(`${MENSAGEM_DE_NOME_CURTO}: item por voz com nome curto não foi adicionado.`, { tipo: "aviso", duracaoMs: 5000, dono });
    if (prontos.length === 0) return;
    const entrada = prontos.map((item) => ({ id: item.id, setor: item.ambiente, nome: item.nome, quantidade: item.quantidade, limiteTemperaturaId: limiteSugeridoParaEquipamento(item.nome)?.id }));
    const previa = confirmarItensFalados(equipamentos, entrada);
    if (!alterar((lista, atuais) => (entrada.every((item) => atuais.includes(item.setor)) ? confirmarItensFalados(lista, entrada).equipamentos : null))) return;
    setFalados((atuais) => atuais.filter((item) => !prontos.some((pronto) => pronto.id === item.id)));
    const partes = [previa.criados.length ? quantidade(previa.criados.length, "item adicionado", "itens adicionados") : "", previa.somados.length ? `${quantidade(previa.somados.length, "somado ao que já existia", "somados ao que já existia")}` : ""].filter(Boolean);
    aviso8s(`✓ Por voz: ${partes.join(" · ")}`, () =>
      void alterar((lista) => {
        let resultado = desfazerCopia(lista, previa.criados);
        for (const soma of previa.somados) resultado = desfazerSoma(resultado, soma.id, soma.quantidade);
        return resultado;
      })
    );
  }

  function corrigirFalado(id: string) {
    const item = falados.find((atual) => atual.id === id);
    if (!item) return;
    setNome(item.nome);
    setQtd(quantidadeValida(item.quantidade));
    setEscolha(null);
    if (item.ambiente && setores.includes(item.ambiente)) setEscolhido(item.ambiente);
    setFalados((atuais) => atuais.filter((atual) => atual.id !== id));
  }

  function confirmarCopiaDoSetor() {
    if (!copiandoSetor || copiandoSetor.length === 0) return;
    const destinos = copiandoSetor;
    const idsOrigem = doSetor.map((item) => item.id);
    const novoId = geradorEstavel();
    const previa = copiarEquipamentos(equipamentos, idsOrigem, destinos, novoId());
    setCopiandoSetor(null);
    if (previa.criados.length === 0) {
      mostrarToast("Nada a copiar: os destinos já têm esses equipamentos.", { tipo: "aviso", duracaoMs: 5000, dono });
      return;
    }
    if (!alterar((lista, atuais) => copiarEquipamentos(lista, idsOrigem, destinos.filter((destino) => atuais.includes(destino)), novoId()).equipamentos)) return;
    aviso8s(`${quantidade(previa.criados.length, "equipamento copiado", "equipamentos copiados")}${previa.ignorados ? ` · ${previa.ignorados} já existia${previa.ignorados === 1 ? "" : "m"}` : ""}`, () => void alterar((lista) => desfazerCopia(lista, previa.criados)));
  }

  // Menu ⋯: setas, Home/End, Enter, Esc (no submenu volta um nível); ArrowRight abre "Mover para…", ArrowLeft volta; Tab fecha e devolve o foco ao ⋯.
  useEffect(() => {
    if (!menu) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')?.focus();
  }, [menu?.id, menu?.nivel]);

  useEffect(() => {
    if (!menu) return;
    function aoClicarFora(evento: MouseEvent) {
      const alvo = evento.target as Node;
      if (menuRef.current?.contains(alvo)) return;
      if (Object.values(botoesMenu.current).some((botao) => botao?.contains(alvo))) return;
      setMenu(null);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [menu]);

  function aoTeclarNoMenu(evento: KeyboardEvent<HTMLDivElement>) {
    const itens = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') || []);
    const posicao = itens.indexOf(document.activeElement as HTMLElement);
    const ir = (indice: number) => {
      evento.preventDefault();
      itens[(indice + itens.length) % itens.length]?.focus();
    };
    if (evento.key === "ArrowDown") ir(posicao + 1);
    else if (evento.key === "ArrowUp") ir(posicao - 1);
    else if (evento.key === "Home") ir(0);
    else if (evento.key === "End") ir(itens.length - 1);
    else if (evento.key === "Escape") {
      evento.preventDefault();
      evento.stopPropagation();
      if (menu?.nivel === "mover") setMenu({ id: menu.id, nivel: "principal" });
      else fecharMenu(true);
    } else if (evento.key === "ArrowLeft" && menu?.nivel === "mover") {
      evento.preventDefault();
      setMenu({ id: menu.id, nivel: "principal" });
    } else if (evento.key === "ArrowRight" && menu?.nivel === "principal" && (document.activeElement as HTMLElement | null)?.dataset.acao === "mover" && outrosSetores.length > 0) {
      evento.preventDefault();
      setMenu({ id: menu.id, nivel: "mover" });
    } else if (evento.key === "Tab") {
      evento.preventDefault();
      fecharMenu(true);
    }
  }

  if (setores.length === 0) {
    return (
      <section className="cadest" aria-labelledby="cadest-eq-titulo-vazio">
        <h2 id="cadest-eq-titulo-vazio" className="cadest-titulo">Equipamentos por setor</h2>
        <p className="cadest-vazio">
          Marque os ambientes da empresa antes de cadastrar equipamentos.
          <button type="button" className="cadest-link" onClick={onIrParaAmbientes}>Ir para a aba Ambientes</button>
        </p>
      </section>
    );
  }

  return (
    <section className="cadest cadest-eq" aria-label="Equipamentos da empresa">
      <div className="cadest-eq-grade">
        <nav className="cadest-setores" aria-label="Setores da empresa">
          <p className="cadest-setores-titulo">Setor</p>
          <ul className="cadest-setores-lista">
            {setores.map((setor) => (
              <li key={setor}>
                <button type="button" className={`cadest-setor${setor === selecionado ? " is-sel" : ""}`} aria-current={setor === selecionado ? "true" : undefined} title={setor} onClick={() => { setEscolhido(setor); setMenu(null); setEdicao(null); limparFormulario(); }}>
                  <span className="cadest-setor-nome">{rotuloDoSetor(setor, setores)}</span>
                  <span className="cadest-setor-conta" aria-label={quantidade(contagem[setor] || 0, "item", "itens")}>{contagem[setor] || 0}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="cadest-setor-seletor">
            <Select value={selecionado} onChange={(evento) => { setEscolhido(evento.target.value); setMenu(null); setEdicao(null); limparFormulario(); }} aria-label="Setor">
              {setores.map((setor) => <option key={setor} value={setor}>{rotuloDoSetor(setor, setores)} ({contagem[setor] || 0})</option>)}
            </Select>
          </div>
        </nav>

        <div className="cadest-painel">
          <div className="cadest-painel-cabeca">
            <h2 className="cadest-titulo" ref={tituloRef} tabIndex={-1}>{podeEditar ? `Adicionar em ${curto}` : `Equipamentos de ${curto}`}</h2>
            {podeEditar && setores.length > 0 && (
              <div className="cadest-painel-botoes">
                {doSetor.length > 0 && outrosSetores.length > 0 && (
                  <button type="button" className="cadest-btn" aria-expanded={copiandoSetor !== null} onClick={() => setCopiandoSetor(copiandoSetor ? null : [])}>Copiar para outros ambientes</button>
                )}
                <button type="button" className="cadest-btn" aria-haspopup="dialog" onClick={() => setCopiando(true)}>Copiar de outra empresa</button>
              </div>
            )}
          </div>

          {podeEditar && (
            <div className="cadest-form">
              <label className="cadest-campo cadest-campo--nome">
                <span className="cadest-rotulo">Equipamento ou móvel</span>
                <span className="ui-field-wrap cad-campo-voz">
                  <input
                    ref={campoRef}
                    id="cadest-eq-nome"
                    value={nome}
                    onChange={(evento) => { setNome(evento.target.value); setEscolha(null); setListaAberta(true); setOpcaoAtiva(-1); }}
                    onKeyDown={aoTeclarNoNome}
                    onBlur={() => { setListaAberta(false); setOpcaoAtiva(-1); }}
                    placeholder="Ex.: Refrigerador"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={listaVisivel}
                    aria-controls="cadest-eq-opcoes"
                    aria-activedescendant={listaVisivel && opcaoAtiva >= 0 ? `cadest-eq-opcao-${opcaoAtiva}` : undefined}
                    autoComplete="off"
                    aria-invalid={Boolean(repetido || avisoCurto)}
                    aria-describedby="cadest-eq-repetido"
                    className={`ui-input cad-input cad-input--voz${repetido || avisoCurto ? " is-erro" : ""}`}
                  />
                  {listaVisivel && (
                    <ul id="cadest-eq-opcoes" className="cadest-opcoes" role="listbox" aria-label="Sugestões de nome">
                      {opcoesDeNome.map((opcao, indice) => (
                        <li
                          key={opcao}
                          id={`cadest-eq-opcao-${indice}`}
                          role="option"
                          aria-selected={indice === opcaoAtiva}
                          className={`cadest-opcao${indice === opcaoAtiva ? " is-sel" : ""}`}
                          onMouseDown={(evento) => { evento.preventDefault(); escolherOpcao(opcao); }}
                        >
                          {opcao}
                        </li>
                      ))}
                    </ul>
                  )}
                  <span className="ui-field-tools cad-mic">
                    <FieldVoiceTools fieldKey="novo-equipamento" value={nome} onChange={(texto) => { setNome(texto); setEscolha(null); setListaAberta(false); }} onTextoDitado={tratarFala} contexto="Nome curto de um equipamento ou móvel de estabelecimento de alimentos." somenteVoz soIcone />
                  </span>
                </span>
              </label>
              <div className="cadest-campo">
                <span className="cadest-rotulo">Qtd</span>
                <Quantidade valor={qtd} onChange={setQtd} rotulo="Quantidade a adicionar" />
              </div>
              <button type="button" className="cadest-btn cadest-btn--azul" disabled={!podeAdicionar} aria-describedby="cadest-eq-repetido" onClick={adicionar}>Adicionar</button>
              <div id="cadest-eq-repetido" className="cadest-repetido" aria-live="polite">
                {avisoCurto && <p className="cadest-erro">{avisoCurto}</p>}
                {!avisoCurto && repetido && (
                  <>
                    <p className="cadest-erro">{aviso}</p>
                    <div className="cadest-repetido-botoes">
                      <button type="button" className={`cadest-btn${escolha === "somar" ? " is-sel" : ""}`} aria-pressed={escolha === "somar"} onClick={() => setEscolha("somar")}>Somar {quantidadeValida(qtd)} ao existente</button>
                      <button type="button" className={`cadest-btn${escolha === "outro" ? " is-sel" : ""}`} aria-pressed={escolha === "outro"} onClick={() => setEscolha("outro")}>Cadastrar como outro item</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {podeEditar && (
            <VozEquipamentosConferencia
              itens={falados}
              ambientes={setores}
              onEscolherAmbiente={(id, ambiente) => atualizarFalado(id, { ambiente, situacao: ambiente ? "ok" : "faltando" })}
              onCriarAmbiente={criarAmbienteFalado}
              onConfirmar={(id) => confirmarFalados([id])}
              onConfirmarTodos={() => confirmarFalados(falados.map((item) => item.id))}
              onCorrigir={corrigirFalado}
            />
          )}

          {podeEditar && doSetor.length > 0 && outrosSetores.length > 0 && copiandoSetor && (
            <div className="cadest-copiar-setor">
              {copiandoSetor && (
                <div className="cadest-copiar-painel" role="group" aria-label="Copiar equipamentos para outros ambientes">
                  <p className="cadest-rotulo">Copiar os {doSetor.length} equipamentos de {curto} para:</p>
                  <div className="cadest-copiar-lista">
                    {outrosSetores.map((setor) => (
                      <label key={setor} className="cadest-copiar-opcao cad-copiar-destino">
                        <input type="checkbox" checked={copiandoSetor.includes(setor)} onChange={(evento) => setCopiandoSetor(evento.target.checked ? [...copiandoSetor, setor] : copiandoSetor.filter((outro) => outro !== setor))} />
                        <span>{rotuloDoSetor(setor, setores)}</span>
                      </label>
                    ))}
                  </div>
                  <div className="cadest-edicao-botoes">
                    <button type="button" className="cadest-btn cadest-btn--azul" disabled={copiandoSetor.length === 0} onClick={confirmarCopiaDoSetor}>Copiar</button>
                    <button type="button" className="cadest-link" onClick={() => setCopiandoSetor(null)}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {podeEditar && doSetor.length > 0 && sugeridosDoSetor.length > 0 && (
            <p className="cadest-sugestoes" title="Sugestão genérica pelo tipo de empresa; o RT confirma">
              Sugestões (genéricas, o RT confirma):{" "}
              {sugeridosDoSetor.slice(0, 6).map((item) => (
                <button key={item.nome} type="button" className="cadest-link" onClick={() => adicionarSugestaoRapida(item.nome)}>+ {item.nome}</button>
              ))}
            </p>
          )}

          {doSetor.length === 0 ? (
            <p className="cadest-vazio">Nenhum equipamento neste setor ainda.</p>
          ) : (
            <ul className="cadest-eq-lista">
              {doSetor.map((item) => {
                const limite = item.limiteTemperaturaId ? limiteDoTipo(item.limiteTemperaturaId) : undefined;
                const naoConfirmado = item.sugerido || (item.limiteTemperaturaId && !item.limiteConfirmado);
                const editando = edicao?.id === item.id;
                return (
                  <li key={item.id} className="cadest-eq-item">
                    <div className="cadest-eq-linha">
                      <span className="cadest-eq-nome">{item.nome}</span>
                      <span className="cadest-eq-qtd">Qtd {item.quantidade}</span>
                      {podeEditar && (
                        <span className="cadest-menuwrap">
                          <button
                            type="button"
                            ref={(botao) => { botoesMenu.current[item.id] = botao; }}
                            className="cadest-mais"
                            aria-haspopup="menu"
                            aria-expanded={menu?.id === item.id}
                            aria-label={`Mais ações de ${item.nome}`}
                            onClick={() => setMenu(menu?.id === item.id ? null : { id: item.id, nivel: "principal" })}
                            onKeyDown={(evento) => {
                              if (evento.key === "ArrowDown" && menu?.id !== item.id) {
                                evento.preventDefault();
                                setMenu({ id: item.id, nivel: "principal" });
                              }
                            }}
                          >
                            ⋯
                          </button>
                          {menu?.id === item.id && (
                            <div ref={menuRef} className="cadest-menu" role="menu" aria-orientation="vertical" aria-label={menu.nivel === "mover" ? `Mover ${item.nome} para` : `Ações de ${item.nome}`} onKeyDown={aoTeclarNoMenu}>
                              {menu.nivel === "principal" ? (
                                <>
                                  <button type="button" role="menuitem" className="cadest-menu-item" onClick={() => { setMenu(null); setEdicao({ id: item.id, nome: item.nome, qtd: quantidadeValida(item.quantidade), limite: item.limiteTemperaturaId || "", obs: item.observacao || "" }); }}>Editar nome e quantidade</button>
                                  <button type="button" role="menuitem" className="cadest-menu-item" data-acao="mover" aria-haspopup="menu" aria-disabled={outrosSetores.length === 0} title={outrosSetores.length === 0 ? "Marque outro setor em Ambientes para mover" : undefined} onClick={() => { if (outrosSetores.length > 0) setMenu({ id: item.id, nivel: "mover" }); }}>Mover para outro setor ›</button>
                                  <button type="button" role="menuitem" className="cadest-menu-item cadest-menu-item--perigo" onClick={() => remover(item)}>Remover</button>
                                  {limite && <p className="cadest-menu-base" title={limite.link}>{baseDoLimite(limite)}</p>}
                                </>
                              ) : (
                                <>
                                  <p className="cadest-menu-titulo" aria-hidden="true">Mover {item.nome} para</p>
                                  {outrosSetores.map((setor) => (
                                    <button key={setor} type="button" role="menuitem" className="cadest-menu-item" onClick={() => mover(item, setor)}>{rotuloDoSetor(setor, setores)}</button>
                                  ))}
                                </>
                              )}
                            </div>
                          )}
                        </span>
                      )}
                    </div>
                    {(limite || item.sugerido) && (
                      <p className="cadest-eq-nota">
                        {[item.sugerido ? "Sugerido pelo tipo de empresa" : "", limite ? `${item.limiteConfirmado ? "Limite confirmado" : "Limite sugerido"}: ${textoDoLimite(limite)}` : ""].filter(Boolean).join(" · ")}
                        {podeEditar && naoConfirmado && (
                          <>
                            {" · "}
                            <button type="button" className="cadest-link" onClick={() => void alterar((lista) => confirmarSugestao(lista, item.id))}>{item.sugerido ? "Confirmar equipamento" : "Confirmar limite"}</button>
                          </>
                        )}
                      </p>
                    )}
                    {!podeEditar && limite && <p className="cadest-eq-nota" title={limite.link}>{baseDoLimite(limite)}</p>}
                    {editando && edicao && (
                      <div className="cadest-edicao">
                        <label className="cadest-campo">
                          <span className="cadest-rotulo">Nome</span>
                          <input
                            className={`ui-input cad-input${nomeDeEquipamentoValido(edicao.nome) && !repetidoNaEdicao ? "" : " is-erro"}`}
                            value={edicao.nome}
                            autoFocus
                            aria-invalid={!nomeDeEquipamentoValido(edicao.nome) || Boolean(repetidoNaEdicao)}
                            aria-describedby={!nomeDeEquipamentoValido(edicao.nome) || repetidoNaEdicao ? "cadest-eq-edicao-erro" : undefined}
                            onChange={(evento) => setEdicao({ ...edicao, nome: evento.target.value })}
                            onKeyDown={(evento) => {
                              if (evento.key === "Escape") setEdicao(null);
                              else if (evento.key === "Enter") {
                                evento.preventDefault();
                                salvarEdicao();
                              }
                            }}
                          />
                        </label>
                        <div className="cadest-campo">
                          <span className="cadest-rotulo">Qtd</span>
                          <Quantidade valor={edicao.qtd} onChange={(valor) => setEdicao({ ...edicao, qtd: valor })} rotulo="Quantidade do item" />
                        </div>
                        <label className="cadest-campo">
                          <span className="cadest-rotulo">Limite de temperatura (opcional)</span>
                          <Select value={edicao.limite} onChange={(evento) => setEdicao({ ...edicao, limite: evento.target.value })} aria-label="Limite de temperatura">
                            <option value="">Sem limite</option>
                            {LIMITES_DE_TEMPERATURA.map((opcao) => <option key={opcao.id} value={opcao.id}>{opcao.rotulo} ({textoDoLimite(opcao)})</option>)}
                          </Select>
                        </label>
                        <label className="cadest-campo cadest-campo--largo">
                          <span className="cadest-rotulo">Observação do equipamento</span>
                          <textarea rows={2} className="ui-input cad-obs-texto" value={edicao.obs} onChange={(evento) => setEdicao({ ...edicao, obs: evento.target.value })} />
                        </label>
                        {(!nomeDeEquipamentoValido(edicao.nome) || repetidoNaEdicao) && <p id="cadest-eq-edicao-erro" className="cadest-erro" role="alert">{!nomeDeEquipamentoValido(edicao.nome) ? MENSAGEM_DE_NOME_CURTO : `${avisoDeNomeRepetido(repetidoNaEdicao)}. Use outro nome ou some as quantidades no item que já existe.`}</p>}
                        <div className="cadest-edicao-botoes">
                          <button type="button" className="cadest-btn cadest-btn--verde" disabled={!nomeDeEquipamentoValido(edicao.nome) || Boolean(repetidoNaEdicao)} onClick={salvarEdicao}>Salvar</button>
                          <button type="button" className="cadest-link" onClick={() => { setEdicao(null); botoesMenu.current[item.id]?.focus(); }}>Cancelar</button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {podeEditar && doSetor.length === 0 && semSugestao === "sem-cnae" && (
            <p className="cadest-semsugestao" role="status">
              Preencha o CNAE no cadastro para receber sugestões
              <button type="button" className="cadest-link" onClick={onIrParaDados}>Ir para a aba Empresa</button>
            </p>
          )}
          {podeEditar && doSetor.length === 0 && semSugestao === "sem-sugestao-do-setor" && (
            <p className="cadest-semsugestao" role="status">
              {proprioSemVinculo ? "Vincule este ambiente a um setor oficial para receber sugestões" : "Sem sugestões para este setor"}
              {proprioSemVinculo && <button type="button" className="cadest-link" onClick={onIrParaAmbientes}>Vincular</button>}
              <span aria-hidden="true">·</span>
              <button type="button" className="cadest-link" aria-haspopup="dialog" onClick={() => setCopiando(true)}>Copiar de outra empresa</button>
            </p>
          )}

          {podeEditar && doSetor.length === 0 && sugeridosDoSetor.length > 0 && sugestao.situacao === "ok" && (
            <div className="cadest-lote" role="region" aria-label={`Sugestões para ${sugestao.descricao || sugestao.tipoRotulo}`}>
              <p className="cadest-lote-titulo">
                Sugestões para {sugestao.descricao || sugestao.tipoRotulo} · CNAE {sugestao.codigo}{sugestao.origem === "secundario" ? " (secundário)" : ""}
              </p>
              <p className="cadest-lote-nota">Sugestão genérica — o RT confirma.</p>
              <ul className="cadest-lote-lista">
                {sugeridosDoSetor.map((item) => {
                  const marcado = loteAtual.marcados.includes(item.nome);
                  const valor = loteAtual.qtds[item.nome] ?? item.quantidade;
                  return (
                    <li key={item.nome} className="cadest-lote-item">
                      <label className="cadest-lote-marca">
                        <input type="checkbox" checked={marcado} onChange={() => setLote({ setor: selecionado, qtds: loteAtual.qtds, marcados: marcado ? loteAtual.marcados.filter((outro) => outro !== item.nome) : [...loteAtual.marcados, item.nome] })} />
                        <span>{item.nome}</span>
                      </label>
                      <Quantidade valor={quantidadeValida(valor)} onChange={(novo) => setLote({ setor: selecionado, marcados: loteAtual.marcados, qtds: { ...loteAtual.qtds, [item.nome]: novo } })} rotulo={`Quantidade de ${item.nome}`} />
                    </li>
                  );
                })}
              </ul>
              <div className="cadest-lote-acoes">
                <button type="button" className="cadest-btn cadest-btn--azul" disabled={loteAtual.marcados.length === 0} onClick={adicionarLote}>
                  Adicionar {loteAtual.marcados.length} {loteAtual.marcados.length === 1 ? "item" : "itens"}
                </button>
                <button type="button" className="cadest-link" onClick={() => setLote({ setor: selecionado, qtds: loteAtual.qtds, marcados: loteAtual.marcados.length === sugeridosDoSetor.length ? [] : sugeridosDoSetor.map((item) => item.nome) })}>
                  {loteAtual.marcados.length === sugeridosDoSetor.length ? "Desmarcar todos" : "Marcar todos"}
                </button>
                <button type="button" className="cadest-link" onClick={() => campoRef.current?.focus()}>+ Digitar outro equipamento</button>
              </div>
            </div>
          )}

          {podeEditar && (
            <footer className="cadest-rodape cadest-rodape--direita">
              <StatusDeSalvamento key={empresa.id} estado={estado} />
            </footer>
          )}
        </div>
      </div>

      {copiando && podeEditar && <CopiarDeOutraEmpresa destinoId={empresa.id} setoresDoDestino={setores} onCopiar={copiar} onFechar={() => setCopiando(false)} />}
    </section>
  );
}
