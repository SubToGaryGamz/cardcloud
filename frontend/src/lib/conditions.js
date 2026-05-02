export const CONDITIONS = ["Raw", "PSA", "BGS", "SGC", "CGC", "Other"];

export const CONDITION_IS_GRADED = (c) => ["PSA", "BGS", "SGC", "CGC"].includes(c);

export function conditionLabel(card) {
  if (!card) return "";
  const c = card.condition;
  if (!c) return "";
  if (CONDITION_IS_GRADED(c) && card.grade != null) {
    const g = Number(card.grade);
    return `${c} ${Number.isInteger(g) ? g : g.toFixed(1)}`;
  }
  return c;
}
