// Formula hesablayıcı (backend App\Support\FormulaEvaluator güzgüsü) — canlı önizləmə üçün.
// Dəstək: rəqəmlər, x (dəyişən), + − × ÷, mötərizə, unar −/+.

export interface Tier {
  from: number | null;
  to: number | null;
  expr: string;
}

type Tok = { t: 'num'; v: number } | { t: 'x' } | { t: 'op'; v: string };

function tokenize(expr: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (c === ' ' || c === '\t') { i++; continue; }
    if ((c >= '0' && c <= '9') || c === '.') {
      let num = '';
      while (i < expr.length && ((expr[i] >= '0' && expr[i] <= '9') || expr[i] === '.')) { num += expr[i]; i++; }
      const v = Number(num);
      if (Number.isNaN(v)) throw new Error(`Yanlış rəqəm: ${num}`);
      toks.push({ t: 'num', v });
      continue;
    }
    if (c === 'x' || c === 'X') { toks.push({ t: 'x' }); i++; continue; }
    if ('+-*/()'.includes(c)) { toks.push({ t: 'op', v: c }); i++; continue; }
    throw new Error(`Yanlış simvol: ${c}`);
  }
  return toks;
}

export function evaluate(expr: string, x: number): number {
  const toks = tokenize(expr);
  if (!toks.length) throw new Error('İfadə boşdur.');
  let pos = 0;
  const peek = () => toks[pos];
  const eat = () => toks[pos++];

  function parseExpr(): number {
    let v = parseTerm();
    let tok = peek();
    while (tok && tok.t === 'op' && (tok.v === '+' || tok.v === '-')) {
      eat();
      const r = parseTerm();
      v = tok.v === '+' ? v + r : v - r;
      tok = peek();
    }
    return v;
  }
  function parseTerm(): number {
    let v = parseFactor();
    let tok = peek();
    while (tok && tok.t === 'op' && (tok.v === '*' || tok.v === '/')) {
      eat();
      const r = parseFactor();
      if (tok.v === '/') { if (r === 0) throw new Error('Sıfıra bölmə.'); v /= r; } else v *= r;
      tok = peek();
    }
    return v;
  }
  function parseFactor(): number {
    const tok = peek();
    if (tok && tok.t === 'op' && (tok.v === '-' || tok.v === '+')) { eat(); const f = parseFactor(); return tok.v === '-' ? -f : f; }
    if (tok && tok.t === 'num') { eat(); return tok.v; }
    if (tok && tok.t === 'x') { eat(); return x; }
    if (tok && tok.t === 'op' && tok.v === '(') { eat(); const v = parseExpr(); const c = eat(); if (!c || (c.t !== 'op' || c.v !== ')')) throw new Error('Mötərizə bağlanmayıb.'); return v; }
    throw new Error('İfadə gözlənilir.');
  }

  const val = parseExpr();
  if (pos < toks.length) throw new Error('İfadə səhvdir.');
  return val;
}

/** Uyğun pilləni seç və hesabla (from<=x<to). */
export function applyFormula(tiers: Tier[], x: number): { tier: number; result: number } {
  for (let idx = 0; idx < tiers.length; idx++) {
    const { from, to, expr } = tiers[idx];
    const okFrom = from === null || x >= from;
    const okTo = to === null || x < to;
    if (okFrom && okTo) {
      return { tier: idx, result: Math.round(evaluate(expr, x) * 10000) / 10000 };
    }
  }
  throw new Error('Bu məbləğ üçün uyğun pillə yoxdur.');
}
