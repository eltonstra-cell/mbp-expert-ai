// Seta de abrir e fechar (ícone de traço): baixo quando aberto, direita quando fechado.
export default function Chevron({ aberto, tamanho = 18 }: { aberto?: boolean; tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {aberto ? <path d="M6 9l6 6 6-6" /> : <path d="M9 6l6 6-6 6" />}
    </svg>
  );
}
