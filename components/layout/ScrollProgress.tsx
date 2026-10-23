/**
 * Fio colorido no topo que cresce com a rolagem (animação ligada ao scroll, só
 * CSS: veja .scroll-progress em app/globals.css). Sem suporte ou com "reduzir
 * movimento" ele nem aparece.
 */
export function ScrollProgress() {
  return <div aria-hidden="true" className="scroll-progress" />;
}
