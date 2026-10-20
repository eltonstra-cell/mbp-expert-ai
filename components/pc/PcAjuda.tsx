"use client";

import { useMemo, useState } from "react";

type Categoria = { id: string; titulo: string; texto: string; cor: string; palavras: string };

const CATEGORIAS: Categoria[] = [
  { id: "primeiros", titulo: "Primeiros passos", texto: "Empresa, menu e navegação", cor: "azul", palavras: "empresa cadastro menu começar início" },
  { id: "visita", titulo: "Fazer uma visita", texto: "Nova visita e ambientes", cor: "verde", palavras: "visita ambientes nova iniciar" },
  { id: "checklist", titulo: "Checklist e evidências", texto: "Responder, fotos e IA", cor: "ceu", palavras: "checklist evidência foto áudio ia registrar" },
  { id: "correcoes", titulo: "Correções e POPs", texto: "Plano, prazos e acompanhamento", cor: "ambar", palavras: "correção não conformidade plano prazo pop acompanhamento" },
  { id: "relatorio", titulo: "Relatório", texto: "Conferir, prévia e emitir", cor: "violeta", palavras: "relatório pdf emitir parcial oficial" },
  { id: "conta", titulo: "Conta e acessos", texto: "Perfis, login e sincronização", cor: "rosa", palavras: "conta acesso perfil login sincronização usuário" },
];

type Guia = { arquivo: string; titulo: string; texto: string; categoria: string; tela: "guiaRapido" | "manualCompleto" };

// PDFs que existem em public/guias.
const GUIAS: Guia[] = [
  { arquivo: "/api/guias/guia-rapido", titulo: "Guia rápido", texto: "O essencial para a primeira visita.", categoria: "primeiros", tela: "guiaRapido" },
  { arquivo: "/api/guias/manual-completo", titulo: "Manual completo", texto: "Todas as telas e regras em detalhe.", categoria: "visita", tela: "manualCompleto" },
];

type Pergunta = { categoria: string; pergunta: string; resposta: string };

const PERGUNTAS: Pergunta[] = [
  {
    categoria: "visita",
    pergunta: "Como começo uma visita?",
    resposta:
      "Em Visitas, use “+ Nova visita”, informe o responsável e crie. O app abre a escolha de ambientes (passo 1); depois de salvar, o checklist é montado só com os ambientes escolhidos. Você pode voltar a “Editar ambientes” pelo Checklist ou pela Central.",
  },
  {
    categoria: "checklist",
    pergunta: "Como funciona o checklist?",
    resposta:
      "Cada item recebe Conforme, Não Conforme ou Não se aplica. Um item Não Conforme gera uma correção automaticamente. Os filtros Todos, Pendentes e Não conformes só mudam o que aparece na tela; nada é apagado.",
  },
  {
    categoria: "checklist",
    pergunta: "Como usar fotos, áudios e a análise por IA?",
    resposta:
      "Registre fotos e áudios em Evidências ou pelo botão “Registrar agora”. A análise por IA é opcional: ela envia a foto a um serviço externo, por isso evite rostos, crachás e documentos pessoais. A sugestão sempre fica “Aguardando revisão” até um profissional confirmar, editar ou descartar, e nunca cria nem resolve uma não conformidade sozinha.",
  },
  {
    categoria: "correcoes",
    pergunta: "O que posso fazer em Correções?",
    resposta:
      "Cada não conformidade segue quatro etapas: identificada, com plano, em acompanhamento e resolvida. Defina ação, responsável e prazo, registre atualizações e vincule evidências. Para marcar como resolvida é preciso um texto e pelo menos uma evidência vinculada.",
  },
  {
    categoria: "correcoes",
    pergunta: "Para que servem os POPs da visita?",
    resposta:
      "Eles sugerem POPs para as não conformidades que o Manual relaciona a um programa de controle. “Criar os POPs de uma vez” cria apenas rascunhos dos que ainda não existem e nunca altera um POP já cadastrado. NCs sem relação no Manual aparecem como “Sem POP sugerido”.",
  },
  {
    categoria: "conta",
    pergunta: "Posso trabalhar sem internet?",
    resposta:
      "Em parte. Depois que você abriu o app com internet e entrou na sua conta, ele volta a abrir sem conexão neste aparelho (se tocar em Sair, será preciso internet para entrar de novo). Sem internet você pode responder o checklist, escrever observações e trabalhar nas correções: tudo fica salvo neste aparelho e é enviado para a nuvem quando a conexão voltar; o ícone no topo mostra Sem conexão, Pendente ou Sincronizado, e em Mais, Sincronizar tenta de novo. Precisam de internet: salvar foto ou áudio como evidência (o arquivo é enviado na hora; sem conexão a evidência não é salva, então tire de novo quando a conexão voltar), os recursos de IA (analisar foto, melhorar texto e transcrever voz) e o primeiro acesso. Não limpe os dados do navegador antes de a sincronização terminar.",
  },
  {
    categoria: "relatorio",
    pergunta: "Posso emitir o relatório com pendências?",
    resposta:
      "Pode, como relatório parcial, que sai com a marca RELATÓRIO PARCIAL. A versão oficial só está disponível para Administrador e Consultor/RT. A conferência antes de emitir mostra o que ainda falta e leva direto à tela do problema.",
  },
];

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR");
}

export default function PcAjuda({ onVoltar, onModoDeTela, guiasLiberados = { guiaRapido: true, manualCompleto: true } }: { onVoltar: () => void; onModoDeTela?: () => void; guiasLiberados?: { guiaRapido: boolean; manualCompleto: boolean } }) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [aberta, setAberta] = useState<number | null>(null);

  const termo = normalizar(busca.trim());
  const categoriasVisiveis = CATEGORIAS.filter((c) => !termo || normalizar(`${c.titulo} ${c.texto} ${c.palavras}`).includes(termo));
  const guias = GUIAS.filter((g) => guiasLiberados[g.tela] && (!categoria || g.categoria === categoria) && (!termo || normalizar(`${g.titulo} ${g.texto}`).includes(termo)));
  const perguntas = useMemo(
    () => PERGUNTAS.filter((p) => (!categoria || p.categoria === categoria) && (!termo || normalizar(`${p.pergunta} ${p.resposta}`).includes(termo))),
    [categoria, termo]
  );

  return (
    <section className="ui-screen" aria-label="Ajuda e guias">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">Ajuda e guias</h1>
          <p className="ui-subtitle">Respostas rápidas para o trabalho em campo.</p>
        </div>
        <div className="ui-head-actions">
          {onModoDeTela && (
            <button type="button" className="ui-btn ui-btn--secondary" onClick={onModoDeTela}>
              Modo de tela
            </button>
          )}
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onVoltar}>
            ← Início
          </button>
        </div>
      </div>

      <input
        type="search"
        className="ui-input pc-search"
        value={busca}
        onChange={(evento) => setBusca(evento.target.value)}
        placeholder="Buscar em categorias, guias e perguntas"
        aria-label="Buscar na ajuda"
      />

      <div className="ui-scroll pc-help-scroll">
        <div className="pc-help-cats" role="group" aria-label="Categorias">
          {categoriasVisiveis.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`pc-help-cat pc-help-cat--${c.cor}${categoria === c.id ? " is-on" : ""}`}
              aria-pressed={categoria === c.id}
              onClick={() => setCategoria((atual) => (atual === c.id ? null : c.id))}
            >
              <span className="pc-help-cat-title">{c.titulo}</span>
              <span className="pc-help-cat-text">{c.texto}</span>
            </button>
          ))}
          {categoriasVisiveis.length === 0 && <div className="ui-empty">Nenhuma categoria encontrada.</div>}
        </div>

        <h2 className="ui-card-title">Guias em PDF</h2>
        {guias.length === 0 ? (
          <p className="ui-row-sub">Nenhum guia neste filtro.</p>
        ) : (
          <div className="ui-list">
            {guias.map((g) => (
              <div key={g.arquivo} className="ui-row">
                <div className="ui-row-main">
                  <div className="ui-row-text">
                    <div className="ui-row-title">
                      <span className="ui-row-title-text">{g.titulo}</span>
                    </div>
                    <div className="ui-row-sub">{g.texto}</div>
                  </div>
                  <div className="ui-row-actions">
                    <a className="ui-btn ui-btn--primary" href={g.arquivo} target="_blank" rel="noreferrer">
                      Abrir PDF
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className="ui-card-title">Perguntas frequentes</h2>
        {perguntas.length === 0 ? (
          <p className="ui-row-sub">Nenhuma pergunta neste filtro.</p>
        ) : (
          <div className="pc-faq">
            {perguntas.map((p, indice) => (
              <div key={p.pergunta} className="pc-faq-item">
                <button type="button" className="pc-faq-q" aria-expanded={aberta === indice} onClick={() => setAberta((atual) => (atual === indice ? null : indice))}>
                  <span>{p.pergunta}</span>
                  <span aria-hidden="true">{aberta === indice ? "⌄" : "›"}</span>
                </button>
                {aberta === indice && <p className="pc-faq-a">{p.resposta}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
