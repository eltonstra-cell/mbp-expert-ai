import type { ReactNode } from "react";
import { RowMenu, type ItemMenu } from "@/components/ui/RowMenu";
import type { Tom } from "@/components/ui/Pill";

type Props = {
  /** Faixa colorida de 6px à esquerda. */
  faixa?: Tom;
  /** Ícone, avatar ou iniciais. */
  icone?: ReactNode;
  titulo: ReactNode;
  /** Chip ao lado do título (ex.: "Empresa ativa"). */
  chip?: ReactNode;
  secundario?: ReactNode;
  /** Bloco do meio (ex.: barra de progresso). */
  meio?: ReactNode;
  pilulas?: ReactNode;
  /** Botão principal. */
  acao?: ReactNode;
  menu?: ItemMenu[];
  selecionada?: boolean;
  esmaecida?: boolean;
  onClick?: () => void;
  /** Conteúdo extra abaixo da linha. */
  filhos?: ReactNode;
  /** Linha com checkbox à esquerda. */
  seletor?: ReactNode;
};

// Padrão único "uma linha por item".
export function ListRow({
  faixa,
  icone,
  titulo,
  chip,
  secundario,
  meio,
  pilulas,
  acao,
  menu,
  selecionada,
  esmaecida,
  onClick,
  filhos,
  seletor,
}: Props) {
  const clicavel = Boolean(onClick);
  return (
    <div
      className={`ui-row${faixa ? ` has-strip ui-row--${faixa}` : ""}${selecionada ? " is-selected" : ""}${esmaecida ? " is-dim" : ""}${clicavel ? " is-clickable" : ""}`}
      onClick={onClick}
      onKeyDown={
        clicavel
          ? (evento) => {
              if (evento.target === evento.currentTarget && (evento.key === "Enter" || evento.key === " ")) {
                evento.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      tabIndex={clicavel ? 0 : undefined}
      role={clicavel ? "button" : undefined}
    >
      <div className="ui-row-main">
        {seletor && <div className="ui-row-select">{seletor}</div>}
        {icone && <div className="ui-row-icon">{icone}</div>}
        <div className="ui-row-text">
          <div className="ui-row-title">
            <span className="ui-row-title-text">{titulo}</span>
            {chip}
          </div>
          {secundario && <div className="ui-row-sub">{secundario}</div>}
        </div>
        {meio && <div className="ui-row-mid">{meio}</div>}
        {pilulas && <div className="ui-row-pills">{pilulas}</div>}
        {(acao || menu) && (
          <div className="ui-row-actions" onClick={(evento) => evento.stopPropagation()}>
            {acao}
            {menu && <RowMenu itens={menu} />}
          </div>
        )}
      </div>
      {filhos && <div className="ui-row-extra">{filhos}</div>}
    </div>
  );
}
