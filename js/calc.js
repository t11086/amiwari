// あみわり 計算ロジック(純粋関数のみ)
// UIから独立させ、tests/calc.test.mjs で検証する
// ゲージはすべて「10cm角あたりの目数/段数」で受け取る

export function cmToSts(cm, gauge) {
  return Math.max(1, Math.round(cm * gauge / 10));
}

export function stsToCm(count, gauge) {
  return count * 10 / gauge;
}

// レシピのゲージで書かれた目数/段数を、自分のゲージでの数に換算する
export function convertCount(count, patternGauge, myGauge) {
  return Math.max(1, Math.round(count * myGauge / patternGauge));
}

export function lcm(a, b) {
  const gcd = (x, y) => (y ? gcd(y, x % y) : x);
  return a / gcd(a, b) * b;
}

export function nearestMultiple(n, m) {
  return Math.max(m, Math.round(n / m) * m);
}

// 平均計算: rows段のあいだに times回、1目ずつ増減する配分
// 戻り値 [{every, times}] =「every段ごとに1目 × times回」。everyの合計は必ず rows に一致
// 1段1目では収まらない(times > rows)場合は null
export function averagePlan(rows, times) {
  if (!Number.isInteger(rows) || !Number.isInteger(times) || rows < 1 || times < 1) return null;
  if (times > rows) return null;
  const q = Math.floor(rows / times);
  const r = rows % times;
  const plan = [];
  if (r > 0) plan.push({ every: q + 1, times: r });
  if (times - r > 0) plan.push({ every: q, times: times - r });
  return plan;
}

// 1段(1周)の中で均等に減らす(2目一度)。fromSts → toSts
// 戻り値 [{knit, times}] =「knit目編んで2目一度」× times のくり返し
// 2目一度だけでは1段で半分までしか減らせないため、それを超える場合は null
export function spreadDecrease(fromSts, toSts) {
  const dec = fromSts - toSts;
  if (!Number.isInteger(fromSts) || !Number.isInteger(toSts)) return null;
  if (dec <= 0 || fromSts < dec * 2) return null;
  const base = Math.floor(fromSts / dec);
  const r = fromSts % dec;
  const groups = [];
  if (r > 0) groups.push({ knit: base - 1, times: r });
  if (dec - r > 0) groups.push({ knit: base - 2, times: dec - r });
  return groups;
}

// 1段(1周)の中で均等に増やす(ねじり増し目)。fromSts → toSts
// 増し目は目と目の間に作るので、増やせるのは元の目数まで
export function spreadIncrease(fromSts, toSts) {
  const inc = toSts - fromSts;
  if (!Number.isInteger(fromSts) || !Number.isInteger(toSts)) return null;
  if (inc <= 0 || inc > fromSts) return null;
  const base = Math.floor(fromSts / inc);
  const r = fromSts % inc;
  const groups = [];
  if (r > 0) groups.push({ knit: base + 1, times: r });
  if (inc - r > 0) groups.push({ knit: base, times: inc - r });
  return groups;
}

// 帽子(ビーニー)の割り出し
// 入力: headCm 頭囲 / easeCm ゆとり(マイナス=きつめが標準) / depthCm かぶり深さ /
//       ribCm ゴム編み丈 / ribType 1|2(1目/2目ゴム編み) / stsG,rowsG ゲージ / sections 減目の分割数
// クラウンは各セクション残り2目まで減らし(前半2段ごと・後半毎段)、残った目に糸を通して絞る定番構成
export function hatPlan({ headCm, easeCm, depthCm, ribCm, ribType, stsG, rowsG, sections }) {
  for (const v of [headCm, depthCm, ribCm, stsG, rowsG, sections]) {
    if (!(v > 0) && v !== 0) return { error: '入力値をすべて埋めてください' };
  }
  const targetCm = headCm + easeCm;
  if (targetCm <= 0) return { error: '頭囲とゆとりの組み合わせが不正です' };
  const ribMul = ribType === 1 ? 2 : 4;
  const mul = lcm(ribMul, sections);
  const castOn = nearestMultiple(targetCm * stsG / 10, mul);
  const perSection = castOn / sections;
  const decPerSection = perSection - 2;
  if (decPerSection < 2) return { error: 'ゲージまたは分割数に対して目数が少なすぎます。分割数を減らしてください' };

  const d1 = Math.ceil(decPerSection / 2); // 2段ごとに減らす回数(前半)
  const d2 = decPerSection - d1;           // 毎段減らす回数(後半)
  const crownRows = d1 * 2 + d2;
  const crownCm = stsToCm(crownRows, rowsG);
  const ribRows = Math.max(2, Math.round(ribCm * rowsG / 10));
  const bodyRows = Math.round((depthCm - stsToCm(ribRows, rowsG) - crownCm) * rowsG / 10);
  if (bodyRows < 0) {
    return { error: '減目部分だけで深さを超えてしまいます。深さを増やすか、分割数を大きくしてください' };
  }
  const afterD1 = castOn - d1 * sections;
  const finalSts = castOn - decPerSection * sections; // = sections * 2
  const totalRows = ribRows + bodyRows + crownRows;
  return {
    castOn, perSection, sections, ribType, ribRows, bodyRows,
    d1, d2, crownRows, afterD1, finalSts, totalRows,
    finishCircCm: stsToCm(castOn, stsG),
    finishDepthCm: stsToCm(totalRows, rowsG),
    ribCmActual: stsToCm(ribRows, rowsG),
    bodyCmActual: stsToCm(bodyRows, rowsG),
    crownCmActual: crownCm,
  };
}
