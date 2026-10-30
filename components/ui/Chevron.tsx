// Seta de abrir e fechar (ícone de traço). Padrão: baixo quando aberto, direita quando fechado.
// Com `vertical`: ⌃ quando aberto e ⌄ quando fechado (linhas recolhíveis que se abrem para baixo).
export default function Chevron({ aberto, tamanho = 18, vertical = false }: { aberto?: boolean; tamanho?: number; vertical?: boolean }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {vertical ? (aberto ? <path d="M6 15l6-6 6 6" /> : <path d="M6 9l6 6 6-6" />) : aberto ? <path d="M6 9l6 6 6-6" /> : <path d="M9 6l6 6-6 6" />}
    </svg>
  );
}
