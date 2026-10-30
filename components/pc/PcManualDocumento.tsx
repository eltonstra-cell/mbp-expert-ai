"use client";

import { useState } from "react";
import Chevron from "@/components/ui/Chevron";
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
import { CAMPOS_DA_IDENTIFICACAO, ativosDoPapel, contarPreenchidos, type CampoDaIdentificacao } from "@/lib/manualIdentificacao";
import type { PapelResponsabilidadeManual, ResponsabilidadeManual } from "@/types";

type Props = {
  valores: Record<CampoDaIdentificacao, string>;
  rotulos: Record<string, string>;
  /** Campos que vieram do perfil do RT e ainda não foram editados (selo "do perfil do RT"). */
  doPerfil: CampoDaIdentificacao[];
  onChange: (campo: CampoDaIdentificacao, valor: string) => void;
  /** Botão "Preencher com dados do RT": completa os campos vazios e devolve a frase do resultado. */
  onPreencher?: () => string;
  responsabilidades: ResponsabilidadeManual[];
  onResponsabilidadesChange: (responsabilidades: ResponsabilidadeManual[]) => void;
};

type Secao = "identificacao" | PapelResponsabilidadeManual;

const PAPEIS: PapelResponsabilidadeManual[] = ["Proprietário", "Consultor/RT"];

const erroDoCampo = (campo: CampoDaIdentificacao, valor: string) => (campo === "consultorCpfCnpj" ? erroDoCpfCnpj(valor) : campo === "consultorTelefone" ? erroDoTelefone(valor) : "");

// Manual da empresa: três linhas recolhíveis no mesmo nível (uma aberta por vez): Identificação complementar e as Responsabilidades de cada papel.
export default function PcManualDocumento({ valores, rotulos, doPerfil, onChange, onPreencher, responsabilidades, onResponsabilidadesChange }: Props) {
  const [aberta, setAberta] = useState<Secao>("identificacao");
  const [resultado, setResultado] = useState("");
  const [tocados, setTocados] = useState<Partial<Record<CampoDaIdentificacao, boolean>>>({});
  const [emEdicao, setEmEdicao] = useState<string | null>(null);
  const { preenchidos, total } = contarPreenchidos(valores);

  const alternar = (secao: Secao) => setAberta((atual) => (atual === secao ? atual : secao));

  function escrever(campo: CampoDaIdentificacao, bruto: string) {
    const valor = campo === "consultorCpfCnpj" ? mascararCpfCnpj(bruto) : campo === "consultorTelefone" ? mascararTelefone(bruto) : bruto.slice(0, LIMITE_DA_IDENTIFICACAO[campo] ?? 200);
    onChange(campo, valor);
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

  return (
    <section className="man" aria-label="Manual de Boas Práticas">
      <div className="cdoc-titulo">
        <div>
          <h2 className="cdoc-h">Manual</h2>
          <p className="cdoc-sub">Identificação e responsabilidades da empresa</p>
        </div>
      </div>

      <div className={`man-sec${aberta === "identificacao" ? " is-aberta" : ""}`}>
        <button type="button" className="man-cab" aria-expanded={aberta === "identificacao"} aria-controls="man-id" onClick={() => alternar("identificacao")}>
          <span className="man-cab-textos">
            <span className="man-titulo">Identificação complementar</span>
            <span className="man-apoio">Dados técnicos, elaboração, revisão e aprovação.</span>
          </span>
          <span className={`man-resumo man-resumo--${tomDoResumo(preenchidos, total, "completo")}`}>
            <span className="man-bolinha" aria-hidden="true" />
            {preenchidos} de {total}
          </span>
          <Chevron aberto={aberta === "identificacao"} vertical />
        </button>
        {aberta === "identificacao" && (
          <div id="man-id" className="man-corpo">
            {onPreencher && (
              <div className="man-preencher">
                <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setResultado(onPreencher())}>
                  Preencher com dados do RT
                </button>
                <span className="man-preencher-apoio" role="status">{resultado || "Completa só os campos vazios. O que você digitou não muda."}</span>
              </div>
            )}
            <div className="man-grade">
              {CAMPOS_DA_IDENTIFICACAO.map((campo, posicao) => {
                const erro = tocados[campo] || mascaraCompleta(campo, valores[campo]) ? erroDoCampo(campo, valores[campo]) : "";
                const idErro = `man-erro-${campo}`;
                return (
                  <label key={campo} className={`man-campo${posicao === 0 ? " man-campo--duplo" : ""}`}>
                    <span className="man-rotulo">
                      {rotulos[campo] || campo}
                      {doPerfil.includes(campo) && <span className="idc-selo">do perfil do RT</span>}
                    </span>
                    <input
                      type={campo === "dataElaboracaoManual" ? "date" : "text"}
                      className={`ui-input${erro ? " is-invalid" : ""}`}
                      value={valores[campo]}
                      inputMode={campo === "consultorCpfCnpj" ? "numeric" : campo === "consultorTelefone" ? "tel" : undefined}
                      maxLength={campo === "dataElaboracaoManual" ? undefined : LIMITE_DA_IDENTIFICACAO[campo]}
                      aria-invalid={Boolean(erro)}
                      aria-describedby={erro ? idErro : undefined}
                      onChange={(evento) => escrever(campo, evento.target.value)}
                      onBlur={() => setTocados((atuais) => (atuais[campo] ? atuais : { ...atuais, [campo]: true }))}
                    />
                    {erro && <span id={idErro} className="ui-field-error" role="alert">{erro}</span>}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {PAPEIS.map((papel) => {
        const { ativos, total: totalDoPapel } = ativosDoPapel(responsabilidades, papel);
        const ehAberta = aberta === papel;
        const idCorpo = `man-resp-${papel === "Proprietário" ? "p" : "c"}`;
        return (
          <div key={papel} className={`man-sec${ehAberta ? " is-aberta" : ""}`}>
            <button type="button" className="man-cab" aria-expanded={ehAberta} aria-controls={idCorpo} onClick={() => alternar(papel)}>
              <span className="man-cab-textos">
                <span className="man-titulo">Responsabilidades · {papel}</span>
                <span className="man-apoio">Textos-base. Marque as que valem para este cliente.</span>
              </span>
              <span className={`man-resumo man-resumo--${tomDoResumo(ativos, totalDoPapel, "algum")}`}>
                <span className="man-bolinha" aria-hidden="true" />
                {ativos} de {totalDoPapel} ativas
              </span>
              <Chevron aberto={ehAberta} vertical />
            </button>
            {ehAberta && (
              <div id={idCorpo} className="man-corpo man-corpo--resp">
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
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

/** CPF/CNPJ e telefone já no tamanho final (ou com texto a mais): o erro aparece na hora, sem esperar sair do campo. */
function mascaraCompleta(campo: CampoDaIdentificacao, valor: string): boolean {
  const digitos = valor.replace(/\D/g, "").length;
  return campo === "consultorCpfCnpj" ? digitos === 11 || digitos === 14 : campo === "consultorTelefone" ? digitos >= 10 : false;
}
