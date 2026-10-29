import type { AcaoPermissao, AppDB, RegistroPop, UsuarioSistema } from "@/types";
import { podeCriarRegistroPop, podeGerenciarComprovantes, podeGerenciarPessoas, podeVerComprovantes } from "./registrosEmpresa.ts";
import { protegerCarimboDasEvidencias } from "./fotosDoItem.ts";
import { preservarEvidenciasEmRelatorio } from "./relatorioEmitido.ts";
import { podeEditarQuestionario } from "./questionarioAmbiente.ts";
import { popComoVigente } from "./popsNorma.ts";
import { comPerfilProprio } from "./userManagement.ts";
import { permissoesEfetivas } from "./screenAccess.ts";
import { acessoVigente } from "./validadeDeAcesso.ts";

function possuiPermissao(usuario: UsuarioSistema, acao: AcaoPermissao): boolean {
  return usuario.status === "Ativo" && acessoVigente(usuario) && permissoesEfetivas(usuario).includes(acao);
}

function podeAcessarEmpresa(usuario: UsuarioSistema, empresaId: string): boolean {
  return (
    usuario.status === "Ativo" &&
    acessoVigente(usuario) &&
    (usuario.perfil === "Administrador" || usuario.empresaIds.includes(empresaId))
  );
}

function normalizarEmail(email: string): string {
  return email.trim().toLocaleLowerCase("pt-BR");
}

export function localizarUsuarioAutenticado(
  data: AppDB,
  authId: string,
  email: string
): UsuarioSistema | null {
  const emailNormalizado = normalizarEmail(email);
  return (
    data.usuarios.find((usuario) => usuario.authId === authId) ||
    data.usuarios.find(
      (usuario) => normalizarEmail(usuario.email) === emailNormalizado
    ) ||
    null
  );
}

function usuarioEfetivo(usuario: UsuarioSistema): UsuarioSistema {
  return usuario.status === "Convidado"
    ? { ...usuario, status: "Ativo" }
    : usuario;
}

export function filtrarEstadoPorUsuario(
  data: AppDB,
  usuario: UsuarioSistema
): AppDB {
  if (usuario.perfil === "Administrador") return data;

  const efetivo = usuarioEfetivo(usuario);
  const empresas = Object.fromEntries(
    Object.entries(data.empresas).filter(([empresaId]) =>
      podeAcessarEmpresa(efetivo, empresaId)
    )
  );
  const empresaIds = new Set(Object.keys(empresas));
  const visitas = data.visitas.filter((visita) => empresaIds.has(visita.empresaId));
  const visitaIds = new Set(visitas.map((visita) => visita.id));
  const ncs = data.ncs.filter(
    (nc) => empresaIds.has(nc.empresaId) && visitaIds.has(nc.visitaId)
  );
  const evidencias = data.evidencias.filter(
    (evidencia) =>
      empresaIds.has(evidencia.empresaId) && visitaIds.has(evidencia.visitaId)
  );
  // Registros por POP: quem vê o POP vê os registros. Comprovantes: não vão para o Executor de campo.
  const registrosPop = (data.registrosPop || []).filter((registro) => empresaIds.has(registro.empresaId));
  const comprovantes = podeVerComprovantes(efetivo) ? (data.comprovantes || []).filter((item) => empresaIds.has(item.empresaId)) : [];
  // Pessoas, capacitações e leituras de POP: só para Administrador, RT, Gestor e Gerente (nem Fiscal nem Executor).
  const verPessoas = podeGerenciarPessoas(efetivo);
  const doEscopo = <T extends { empresaId: string }>(lista: T[] | undefined) => (verPessoas ? (lista || []).filter((item) => empresaIds.has(item.empresaId)) : []);
  const colaboradores = doEscopo(data.colaboradores);
  const capacitacoes = doEscopo(data.capacitacoes);
  const leiturasPop = doEscopo(data.leiturasPop);
  const relatoriosEmitidos = (data.relatoriosEmitidos || []).filter((relatorio) => empresaIds.has(relatorio.empresaId));
  // Fiscal: só empresas e POPs aprovados; nada de visitas, correções, evidências ou rascunhos.
  if (usuario.perfil === "Fiscal") {
    const somenteAprovados = Object.fromEntries(
      Object.entries(empresas).map(([id, empresa]) => [
        id,
        { ...empresa, pops: (empresa.pops || []).flatMap((pop) => popComoVigente(pop) ?? []) },
      ])
    );
    return {
      ...data,
      empresas: somenteAprovados,
      empresaAtualId: data.empresaAtualId && empresaIds.has(data.empresaAtualId) ? data.empresaAtualId : Object.keys(empresas)[0] || null,
      visitas: [],
      ncs: [],
      evidencias: [],
      usuarios: [usuario],
      registrosAuditoria: [],
      registrosPop,
      comprovantes,
      colaboradores,
      capacitacoes,
      leiturasPop,
      relatoriosEmitidos,
    };
  }
  // Executor de campo: não recebe correções; dos POPs recebe só os aprovados, para ler no checklist ("Ver POP").
  const semPops = usuario.perfil === "Executor de campo";
  const registrosAuditoria = possuiPermissao(efetivo, "auditoria.ver")
    ? data.registrosAuditoria.filter(
        (registro) =>
          registro.usuarioId === usuario.id ||
          (!!registro.empresaId && empresaIds.has(registro.empresaId))
      )
    : [];

  return {
    ...data,
    empresas: semPops
      ? Object.fromEntries(Object.entries(empresas).map(([id, empresa]) => [id, { ...empresa, pops: (empresa.pops || []).flatMap((pop) => popComoVigente(pop) ?? []) }]))
      : empresas,
    empresaAtualId:
      data.empresaAtualId && empresaIds.has(data.empresaAtualId)
        ? data.empresaAtualId
        : Object.keys(empresas)[0] || null,
    visitas,
    ncs: semPops ? [] : ncs,
    evidencias,
    usuarios: [usuario],
    registrosAuditoria,
    registrosPop,
    comprovantes,
    colaboradores,
    capacitacoes,
    leiturasPop,
    relatoriosEmitidos: usuario.perfil === "Executor de campo" ? [] : relatoriosEmitidos,
  };
}

const CAMPOS_DA_NC_QUE_VEM_DO_CHECKLIST = [
  "ambiente",
  "titulo",
  "categoria",
  "criticidade",
  "referencia",
  "orientacao",
  "observacao",
  "prioridade",
  "inativaNoChecklist",
  "canceladaPeloUsuarioEm",
] as const;

/**
 * Executor de campo: a NC nasce da resposta "Não conforme" no checklist, então ele pode criar a NC e
 * atualizar o que vem do checklist. Plano, status, prazo e acompanhamento ficam como estão.
 */
function mesclarNcsDoChecklist(
  atual: AppDB["ncs"],
  recebidas: AppDB["ncs"],
  empresaIds: Set<string>,
  agora: string
): AppDB["ncs"] {
  const porId = new Map(atual.map((nc) => [nc.id, nc]));
  recebidas
    .filter((nc) => empresaIds.has(nc.empresaId))
    .forEach((nova) => {
      const existente = porId.get(nova.id);
      if (!existente) {
        porId.set(nova.id, { ...nova, status: "Aberta", acaoCorretiva: undefined, responsavelAcao: undefined, prazo: undefined, acompanhamento: undefined, historicoAcompanhamento: undefined, resolvidaEm: undefined, marcadaFeita: undefined });
        return;
      }
      if (!empresaIds.has(existente.empresaId)) return;
      const atualizada = { ...existente } as Record<string, unknown>;
      CAMPOS_DA_NC_QUE_VEM_DO_CHECKLIST.forEach((campo) => {
        atualizada[campo] = (nova as Record<string, unknown>)[campo];
      });
      if (existente.inativaNoChecklist && !nova.inativaNoChecklist) {
        atualizada.status = "Aberta";
        atualizada.resolvidaEm = undefined;
        atualizada.historicoAcompanhamento = [
          ...(existente.historicoAcompanhamento || []),
          { id: `${existente.id}:reaberta:${agora}`, criadoEm: agora, observacao: "Reaberta: item voltou a Não conforme", status: "Aberta" },
        ];
      }
      porId.set(existente.id, atualizada as unknown as AppDB["ncs"][number]);
    });
  return [...porId.values()];
}

/** Executor de campo: só o checklist e o progresso das visitas que já existem nas empresas dele. */
function mesclarVisitasDoExecutor(atuais: AppDB["visitas"], recebidas: AppDB["visitas"], empresaIds: Set<string>): AppDB["visitas"] {
  const porId = new Map(recebidas.map((visita) => [visita.id, visita]));
  return atuais.map((visita) => {
    const nova = porId.get(visita.id);
    if (!nova || !empresaIds.has(visita.empresaId) || visita.status === "Concluída") return visita;
    return { ...visita, checklist: nova.checklist, progresso: nova.progresso };
  });
}

// Responsável do estabelecimento sem permissão de editar empresas: leva do que chegou só a aprovação de POPs
// que já estavam aguardando aprovação na versão gravada.
function aplicarSomenteAprovacoes(
  atuais: AppDB["empresas"],
  recebidas: AppDB["empresas"],
  usuario: UsuarioSistema,
  empresaIds: Set<string>
): AppDB["empresas"] | null {
  let resultado: AppDB["empresas"] | null = null;
  empresaIds.forEach((empresaId) => {
    const gravada = atuais[empresaId];
    const nova = recebidas[empresaId];
    if (!gravada || !nova || gravada.responsavelEstabelecimento?.usuarioId !== usuario.id) return;
    let mudou = false;
    const pops = (gravada.pops || []).map((pop) => {
      const recebido = (nova.pops || []).find((item) => item.id === pop.id);
      const aguardava = pop.status === "Aguardando aprovação" || pop.status === "Em revisão";
      if (!recebido || !aguardava || recebido.status !== "Aprovado" || recebido.versao !== pop.versao) return pop;
      mudou = true;
      return { ...pop, status: recebido.status, aprovacao: recebido.aprovacao, versoes: recebido.versoes, versaoCatalogoAprovada: recebido.versaoCatalogoAprovada };
    });
    if (mudou) resultado = { ...(resultado || atuais), [empresaId]: { ...gravada, pops } };
  });
  return resultado;
}

/**
 * Registros por POP: só acrescentam. Registro que já existe nunca muda nem some; o novo precisa ser de uma empresa
 * do usuário e de um POP que existe nela; o servidor grava o responsável que está logado.
 */
export function mesclarRegistrosPop(
  atuais: RegistroPop[],
  recebidos: RegistroPop[],
  empresas: AppDB["empresas"],
  empresaIds: Set<string>,
  usuarioId: string
): RegistroPop[] {
  const existentes = new Set(atuais.map((registro) => registro.id));
  const novos: RegistroPop[] = [];
  for (const registro of recebidos) {
    if (existentes.has(registro.id) || !empresaIds.has(registro.empresaId)) continue;
    if (!(empresas[registro.empresaId]?.pops || []).some((pop) => pop.id === registro.popId)) continue;
    if (typeof registro.descricao !== "string" || !registro.descricao.trim()) continue;
    existentes.add(registro.id);
    novos.push({ ...registro, descricao: registro.descricao.slice(0, 2000), responsavelId: usuarioId });
  }
  return novos.length ? [...atuais, ...novos] : atuais;
}

function mesclarPorEscopo<T extends { id: string; empresaId: string }>(
  colecao: string,
  atuais: T[],
  recebidos: T[],
  empresaIds: Set<string>,
  permitirExclusao: boolean
): T[] {
  const foraDoEscopo = atuais.filter((item) => !empresaIds.has(item.empresaId));
  const dentroAtual = permitirExclusao
    ? []
    : atuais.filter((item) => empresaIds.has(item.empresaId));
  const mapa = new Map(
    [...foraDoEscopo, ...dentroAtual].map((item) => [item.id, item])
  );

  // Um registro recebido não pode tomar o lugar (mesmo id) de um registro
  // existente de outra empresa fora do escopo: o existente é mantido.
  const empresaPorIdForaDoEscopo = new Map(
    foraDoEscopo.map((item) => [item.id, item.empresaId])
  );
  recebidos
    .filter((item) => empresaIds.has(item.empresaId))
    .filter((item) => {
      if (!empresaPorIdForaDoEscopo.has(item.id)) return true;
      console.warn(
        `Colisão de id ignorada em ${colecao}: id=${item.id} empresaExistente=${empresaPorIdForaDoEscopo.get(item.id)} empresaRecebida=${item.empresaId}`
      );
      return false;
    })
    .forEach((item) => mapa.set(item.id, item));

  return [...mapa.values()];
}

/** Concluir, reabrir e arquivar visita exigem `visitas.concluir`: sem ela, o que já estava gravado vale. */
export function preservarConclusaoDeVisitas(mescladas: AppDB["visitas"], atuais: AppDB["visitas"], podeConcluir: boolean): AppDB["visitas"] {
  if (podeConcluir) return mescladas;
  const gravadas = new Map(atuais.map((visita) => [visita.id, visita]));
  return mescladas.map((visita) => {
    const gravada = gravadas.get(visita.id);
    if (!gravada) return visita;
    return { ...visita, status: gravada.status, arquivada: gravada.arquivada, arquivadaEm: gravada.arquivadaEm, encerradaEm: gravada.encerradaEm, conclusao: gravada.conclusao, historicoStatus: gravada.historicoStatus };
  });
}

export function mesclarEstadoPorUsuario(
  atual: AppDB,
  recebido: AppDB,
  usuario: UsuarioSistema,
  authId: string,
  agora = new Date().toISOString()
): AppDB {
  if (usuario.perfil === "Administrador") return recebido;

  const efetivo = usuarioEfetivo(usuario);
  const empresaIds = new Set(usuario.empresaIds);
  let usuarioVinculado: UsuarioSistema = {
    ...usuario,
    authId: usuario.authId || authId,
    status: usuario.status === "Convidado" ? "Ativo" : usuario.status,
    ultimoAcessoEm: agora,
    atualizadoEm: agora,
  };
  // Consultor/RT altera do PRÓPRIO registro só CRN, cargo na assinatura e telefone. O registro é o do usuário autenticado
  // (já resolvido acima), nunca um id vindo do navegador; perfil, e-mail, status e os dados de outras pessoas não passam.
  if (usuario.perfil === "Consultor/RT") {
    const proprio = (recebido.usuarios || []).find((item) => item.id === usuario.id);
    if (proprio) usuarioVinculado = comPerfilProprio(usuarioVinculado, proprio);
  }

  let empresas = atual.empresas;
  let visitas = atual.visitas;
  let ncs = atual.ncs;
  let evidencias = atual.evidencias;
  let registrosPop = atual.registrosPop;
  let comprovantes = atual.comprovantes;
  let colaboradores = atual.colaboradores;
  let capacitacoes = atual.capacitacoes;
  let leiturasPop = atual.leiturasPop;

  if (podeCriarRegistroPop(efetivo)) {
    registrosPop = mesclarRegistrosPop(atual.registrosPop || [], recebido.registrosPop || [], atual.empresas, empresaIds, usuario.id);
  }
  if (podeGerenciarComprovantes(efetivo)) {
    comprovantes = mesclarPorEscopo("comprovantes", atual.comprovantes || [], recebido.comprovantes || [], empresaIds, true).map((item) => {
      // POP vinculado só vale se o POP existe na empresa do comprovante (no que já estava gravado ou no que chegou agora).
      const existe = [...(atual.empresas[item.empresaId]?.pops || []), ...(recebido.empresas[item.empresaId]?.pops || [])].some((pop) => pop.id === item.popId);
      const { popId: _popId, ...semPop } = item;
      return { ...semPop, ...(item.popId && existe ? { popId: item.popId } : {}), criadoPorId: item.criadoPorId || usuario.id };
    });
  }

  if (podeGerenciarPessoas(efetivo)) {
    colaboradores = mesclarPorEscopo("colaboradores", atual.colaboradores || [], recebido.colaboradores || [], empresaIds, true);
    capacitacoes = mesclarPorEscopo("capacitacoes", atual.capacitacoes || [], recebido.capacitacoes || [], empresaIds, true);
    leiturasPop = mesclarPorEscopo("leiturasPop", atual.leiturasPop || [], recebido.leiturasPop || [], empresaIds, true);
  }

  if (possuiPermissao(efetivo, "empresas.editar")) {
    empresas = { ...atual.empresas };
    const podeMexerNaIa = possuiPermissao(efetivo, "ia.analisar");
    empresaIds.forEach((empresaId) => {
      if (recebido.empresas[empresaId]) {
        const nova = recebido.empresas[empresaId];
        const gravada = atual.empresas[empresaId];
        // Só quem pode usar a IA (Administrador e Consultor/RT) liberar ou desligar a IA da empresa.
        const comIa = podeMexerNaIa
          ? nova
          : { ...nova, privacidade: { ...nova.privacidade, iaFotos: gravada?.privacidade?.iaFotos, audioIa: gravada?.privacidade?.audioIa } };
        // Só o Administrador escolhe a pessoa de Acessos que é o responsável do estabelecimento (quem aprova os POPs).
        // Só Administrador e RT mudam o questionário por ambiente.
        empresas[empresaId] = {
          ...comIa,
          questionarios: podeEditarQuestionario(efetivo) ? comIa.questionarios : gravada?.questionarios,
          // Os passos de "Colocar a empresa em dia" só nascem com a empresa (Administrador): quem edita não liga nem desliga.
          implantacao: gravada?.implantacao,
          responsavelEstabelecimento: comIa.responsavelEstabelecimento
            ? { ...comIa.responsavelEstabelecimento, usuarioId: gravada?.responsavelEstabelecimento?.usuarioId }
            : gravada?.responsavelEstabelecimento,
        };
      }
    });
  } else {
    // Quem não edita empresas mas é o responsável do estabelecimento só pode aprovar POP que aguarda aprovação.
    const comAprovacao = aplicarSomenteAprovacoes(atual.empresas, recebido.empresas, usuario, empresaIds);
    if (comAprovacao) empresas = comAprovacao;
  }

  if (possuiPermissao(efetivo, "visitas.executar")) {
    visitas =
      usuario.perfil === "Executor de campo"
        ? mesclarVisitasDoExecutor(atual.visitas, recebido.visitas, empresaIds)
        : preservarConclusaoDeVisitas(mesclarPorEscopo("visitas", atual.visitas, recebido.visitas, empresaIds, false), atual.visitas, possuiPermissao(efetivo, "visitas.concluir"));
    if (usuario.perfil === "Executor de campo") ncs = mesclarNcsDoChecklist(atual.ncs, recebido.ncs, empresaIds, agora);
  }

  if (possuiPermissao(efetivo, "ncs.acompanhar")) {
    if (usuario.perfil === "Cliente Gestor") {
      const recebidas = new Map(recebido.ncs.map((nc) => [nc.id, nc]));
      ncs = atual.ncs.map((nc) => {
        const nova = recebidas.get(nc.id);
        if (!nova || !empresaIds.has(nc.empresaId)) return nc;
        return {
          ...nc,
          acaoCorretiva: nova.acaoCorretiva,
          responsavelAcao: nova.responsavelAcao,
          prazo: nova.prazo,
          acompanhamento: nova.acompanhamento,
          status: nova.status,
          historicoAcompanhamento: nova.historicoAcompanhamento,
          resolvidaEm: nova.resolvidaEm,
        };
      });
    } else {
      ncs = mesclarPorEscopo("ncs", atual.ncs, recebido.ncs, empresaIds, false);
    }
  } else if (possuiPermissao(efetivo, "ncs.marcar_feita")) {
    // Marcar como feita: só o campo marcadaFeita muda; o Consultor/RT confirma e resolve.
    const recebidas = new Map(recebido.ncs.map((nc) => [nc.id, nc]));
    ncs = atual.ncs.map((nc) => {
      const nova = recebidas.get(nc.id);
      if (!nova || !empresaIds.has(nc.empresaId) || nc.status === "Resolvida") return nc;
      return { ...nc, marcadaFeita: nova.marcadaFeita };
    });
  }

  if (possuiPermissao(efetivo, "evidencias.adicionar")) {
    // Carimbo (data e hora, ambiente, quem registrou) não muda depois de gravado; no máximo 5 fotos por item.
    evidencias = protegerCarimboDasEvidencias(
      atual.evidencias,
      mesclarPorEscopo("evidencias", atual.evidencias, recebido.evidencias, empresaIds, true),
      usuario,
      empresaIds
    );
    // Foto citada em relatório emitido não some por uma mesclagem.
    evidencias = preservarEvidenciasEmRelatorio(atual.evidencias, evidencias, atual.relatoriosEmitidos);
  }

  return {
    ...atual,
    empresas,
    empresaAtualId:
      recebido.empresaAtualId && empresaIds.has(recebido.empresaAtualId)
        ? recebido.empresaAtualId
        : atual.empresaAtualId,
    visitas,
    ncs,
    evidencias,
    registrosPop,
    comprovantes,
    colaboradores,
    capacitacoes,
    leiturasPop,
    usuarios: atual.usuarios.map((item) =>
      item.id === usuario.id ? usuarioVinculado : item
    ),
  };
}
