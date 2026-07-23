/**
 * Marca Nel — componentes de logo inline.
 *
 * Por que inline (e não <img src>): a variação `currentColor` da marca só
 * flipa entre claro/escuro se o SVG herdar a cor do contexto da página. Um
 * <img> carrega o SVG num documento isolado, onde `currentColor` resolve pro
 * default do próprio arquivo — não pro tema. Inline, `fill="currentColor"`
 * pega o `color` do elemento pai, então basta `color: var(--ink)` pra marca
 * acompanhar o tema sem manter dois arquivos.
 *
 * Fonte dos paths: public/Logo/nel-currentcolor.svg (lockup) e
 * public/Logo/nel-simbolo.svg (curva isolada). Regra §4: lockup em tamanhos
 * ≥ TopNav/login; só a curva sobrevive a 16px (favicon/ícone).
 */

type MarcaProps = {
  /** Altura em px; a largura acompanha o aspecto do viewBox. */
  height?: number;
  title?: string;
  style?: React.CSSProperties;
  className?: string;
};

// Lockup completo (curva + wordmark NEL). viewBox apertado no conteúdo real
// do arquivo original (glifos vivem em x 323–1212, y 299–472) pra não carregar
// a moldura vazia de 1536×768 e poder dimensionar pela altura.
export function NelLockup({ height = 16, title = "Nel", style, className }: MarcaProps) {
  return (
    <svg
      height={height}
      viewBox="316 293 903 186"
      role="img"
      aria-label={title}
      fill="currentColor"
      className={className}
      style={{ display: "block", width: "auto", ...style }}
    >
      <path d="M734.263 299.225L765.626 299.211L825.32 377.825C834.849 390.335 845.285 403.193 854.388 415.855L854.98 299.218L888.697 299.266L888.74 472.469L857.025 472.351C836.736 446.191 816.662 419.866 796.804 393.378C788.358 382.295 777.47 367.177 768.503 356.907L768.474 472.391L734.255 472.335L734.263 299.225Z" />
      <path d="M323.944 458.793C325.803 416.099 348.534 369.054 380.205 340.487C414.373 309.666 453.603 294.94 499.41 297.046C543.468 299.221 584.839 318.883 614.348 351.672C645.571 386.032 659.718 429.023 659.258 475.014C630.717 447.843 597.02 418.732 567.438 392.086L534.843 362.705C523.948 352.869 513.397 342.521 500.687 335.123C488.524 328.046 474.662 324.416 460.592 324.625C404.477 325.979 354.834 395.059 334.551 442.667C330.779 451.521 328.507 460.62 325.106 469.385C324.908 470.192 324.617 472.565 323.718 472.914C322.508 472.243 323.552 460.778 323.944 458.793Z" />
      <path d="M928.516 299.212L1054.69 299.239L1054.68 328.456L962.853 328.406L962.868 370.298L1041.89 370.345L1041.84 397.588L962.704 397.521C962.83 412.95 962.86 428.38 962.794 443.809L1058.47 443.841L1058.38 472.395L928.564 472.517L928.516 299.212Z" />
      <path d="M1091.22 299.252L1124.96 299.252L1124.9 443.719C1153.89 444.059 1183.31 443.81 1212.33 443.815L1212.31 472.404L1091.23 472.4L1091.22 299.252Z" />
    </svg>
  );
}

// Símbolo isolado (a curva). Único ativo que sobrevive a 16px — usar em
// contextos pequenos onde o lockup ilegibiliza. Em currentColor pra flipar.
export function NelSimbolo({ height = 16, title = "Nel", style, className }: MarcaProps) {
  return (
    <svg
      height={height}
      viewBox="263.5 157.4 455.2 455.2"
      role="img"
      aria-label={title}
      fill="currentColor"
      className={className}
      style={{ display: "block", width: "auto", ...style }}
    >
      <path d="M323.944 458.793C325.803 416.099 348.534 369.054 380.205 340.487C414.373 309.666 453.603 294.94 499.41 297.046C543.468 299.221 584.839 318.883 614.348 351.672C645.571 386.032 659.718 429.023 659.258 475.014C630.717 447.843 597.02 418.732 567.438 392.086L534.843 362.705C523.948 352.869 513.397 342.521 500.687 335.123C488.524 328.046 474.662 324.416 460.592 324.625C404.477 325.979 354.834 395.059 334.551 442.667C330.779 451.521 328.507 460.62 325.106 469.385C324.908 470.192 324.617 472.565 323.718 472.914C322.508 472.243 323.552 460.778 323.944 458.793Z" />
    </svg>
  );
}
