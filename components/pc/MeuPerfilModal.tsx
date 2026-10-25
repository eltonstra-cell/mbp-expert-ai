"use client";

import { useEffect, useState } from "react";
import { camposDoPerfilProprio, type DadosDoPerfilProprio } from "@/lib/userManagement";
import { avancarAoResponderLigado, cameraAutomaticaLigada, definirAvancarAoResponder, definirCameraAutomatica } from "@/lib/preferenciasDeCampo";

type Props = {
  nome: string;
  email: string;
  perfil: string;
  empresas: string[];
  versao: string;
  /** Consultor/RT: CRN, cargo na assinatura e telefone do próprio cadastro, editáveis aqui sem passar por Acessos. */
  editavel?: DadosDoPerfilProprio;
  onSalvar?: (dados: DadosDoPerfilProprio) => void;
  onFechar: () => void;
};

// Dados da própria pessoa conectada. Só o Consultor/RT edita algo (CRN, cargo na assinatura e telefone); o resto é conferência.
export default function MeuPerfilModal({ nome, email, perfil, empresas, versao, editavel, onSalvar, onFechar }: Props) {
  const [crn, setCrn] = useState(editavel?.crn || "");
  const [cargo, setCargo] = useState(editavel?.cargo || "");
  const [telefone, setTelefone] = useState(editavel?.telefone || "");
  const [cameraAutomatica, setCameraAutomatica] = useState(false);
  useEffect(() => setCameraAutomatica(cameraAutomaticaLigada()), []);
  const [avancarAoResponder, setAvancarAoResponder] = useState(true);
  useEffect(() => setAvancarAoResponder(avancarAoResponderLigado()), []);
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  return (
    <div className="voz-revisao-camada" role="dialog" aria-modal="true" aria-label="Meu perfil">
      <button type="button" className="voz-revisao-fundo" aria-label="Fechar" onClick={onFechar} />
      <div className="voz-revisao">
        <h2 className="ui-card-title">Meu perfil</h2>
        <dl className="perfil-lista">
          <div>
            <dt className="ui-eyebrow">Nome</dt>
            <dd>{nome}</dd>
          </div>
          <div>
            <dt className="ui-eyebrow">E-mail</dt>
            <dd>{email}</dd>
          </div>
          <div>
            <dt className="ui-eyebrow">Perfil</dt>
            <dd>{perfil}</dd>
          </div>
          <div>
            <dt className="ui-eyebrow">Empresas</dt>
            <dd>{empresas.length > 0 ? empresas.join(", ") : "Nenhuma empresa atribuída"}</dd>
          </div>
          <div>
            <dt className="ui-eyebrow">Versão do aplicativo</dt>
            <dd>{versao}</dd>
          </div>
        </dl>
        <label className="perfil-preferencia">
          <input
            type="checkbox"
            checked={cameraAutomatica}
            onChange={(evento) => {
              setCameraAutomatica(evento.target.checked);
              definirCameraAutomatica(evento.target.checked);
            }}
          />
          <span>Abrir a câmera automaticamente ao marcar Não conforme (só neste aparelho)</span>
        </label>
        <label className="perfil-preferencia">
          <input
            type="checkbox"
            checked={avancarAoResponder}
            onChange={(evento) => {
              setAvancarAoResponder(evento.target.checked);
              definirAvancarAoResponder(evento.target.checked);
            }}
          />
          <span>Avançar ao responder Conforme ou Não se aplica (só neste aparelho)</span>
        </label>
        {editavel && onSalvar && (
          <div className="perfil-edicao">
            <label className="pc-field">
              <span className="ui-eyebrow">CRN (assina os relatórios)</span>
              <input className="ui-input" value={crn} onChange={(evento) => setCrn(evento.target.value)} placeholder="Ex.: CRN-2 12345" />
            </label>
            <label className="pc-field">
              <span className="ui-eyebrow">Cargo na assinatura</span>
              <input className="ui-input" value={cargo} onChange={(evento) => setCargo(evento.target.value)} placeholder="Ex.: Nutricionista RT" />
            </label>
            <label className="pc-field">
              <span className="ui-eyebrow">Telefone</span>
              <input className="ui-input" inputMode="tel" value={telefone} onChange={(evento) => setTelefone(evento.target.value)} placeholder="Ex.: (51) 99999-0000" />
            </label>
          </div>
        )}
        <div className="voz-revisao-acoes">
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onFechar}>
            {editavel && onSalvar ? "Cancelar" : "Fechar"}
          </button>
          {editavel && onSalvar && (
            <button
              type="button"
              className="ui-btn ui-btn--save"
              onClick={() => {
                onSalvar(camposDoPerfilProprio({ crn, cargo, telefone }));
                onFechar();
              }}
            >
              Salvar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
