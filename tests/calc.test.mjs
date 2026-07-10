// 計算ロジックの検証。実行: node tests/calc.test.mjs
import assert from 'node:assert/strict';
import {
  cmToSts, stsToCm, convertCount, lcm, nearestMultiple,
  averagePlan, spreadDecrease, spreadIncrease, hatPlan,
} from '../js/calc.js';

// --- ゲージ換算 ---
assert.equal(cmToSts(48, 20), 96);          // 20目/10cm で 48cm → 96目
assert.equal(cmToSts(10, 21.5), 22);        // 小数ゲージ
assert.equal(convertCount(100, 20, 24), 120); // レシピ20目→自分24目なら 100目→120目
assert.equal(convertCount(60, 30, 28), 56);
assert.equal(nearestMultiple(106, 12), 108);
assert.equal(nearestMultiple(3, 12), 12);   // 最低でも1倍
assert.equal(lcm(4, 6), 12);

// --- 平均計算(数段にわたる増減) ---
assert.deepEqual(averagePlan(40, 8), [{ every: 5, times: 8 }]);
assert.deepEqual(averagePlan(50, 8), [{ every: 7, times: 2 }, { every: 6, times: 6 }]);
assert.equal(averagePlan(5, 8), null); // 段数より回数が多い
// 性質: どんな入力でも「every×times の合計 = 段数」「回数の合計 = 指定回数」
for (let rows = 1; rows <= 120; rows++) {
  for (let times = 1; times <= rows; times++) {
    const plan = averagePlan(rows, times);
    const sumRows = plan.reduce((s, p) => s + p.every * p.times, 0);
    const sumTimes = plan.reduce((s, p) => s + p.times, 0);
    assert.equal(sumRows, rows, `rows=${rows} times=${times}`);
    assert.equal(sumTimes, times, `rows=${rows} times=${times}`);
    for (const p of plan) assert.ok(p.every >= 1);
  }
}

// --- 1段内の分散減目 ---
// ブログ等で知られる作例: 135目→120目 = 7目編んで2目一度 ×15回
assert.deepEqual(spreadDecrease(135, 120), [{ knit: 7, times: 15 }]);
// 作例: 114目→88目(26目減)
assert.deepEqual(spreadDecrease(114, 88), [{ knit: 3, times: 10 }, { knit: 2, times: 16 }]);
assert.equal(spreadDecrease(30, 10), null); // 半分以下には減らせない
// 性質: 消費目数 = 元の目数、編み上がり目数 = 目標目数
for (let from = 4; from <= 200; from += 3) {
  for (let to = Math.ceil(from / 2); to < from; to += 2) {
    const g = spreadDecrease(from, to);
    const consumed = g.reduce((s, x) => s + (x.knit + 2) * x.times, 0);
    const produced = g.reduce((s, x) => s + (x.knit + 1) * x.times, 0);
    assert.equal(consumed, from, `from=${from} to=${to}`);
    assert.equal(produced, to, `from=${from} to=${to}`);
    for (const x of g) assert.ok(x.knit >= 0);
  }
}

// --- 1段内の分散増し目 ---
assert.deepEqual(spreadIncrease(88, 114), [{ knit: 4, times: 10 }, { knit: 3, times: 16 }]);
assert.equal(spreadIncrease(10, 25), null); // 元の目数より多くは増やせない
for (let from = 4; from <= 200; from += 3) {
  for (let to = from + 1; to <= from * 2; to += 3) {
    const g = spreadIncrease(from, to);
    const consumed = g.reduce((s, x) => s + x.knit * x.times, 0);
    const produced = g.reduce((s, x) => s + (x.knit + 1) * x.times, 0);
    assert.equal(consumed, from, `from=${from} to=${to}`);
    assert.equal(produced, to, `from=${from} to=${to}`);
  }
}

// --- 帽子の割り出し ---
// 標準ケース: 頭囲56cm・ゆとり-3・深さ21cm・2目ゴム編み5cm・ゲージ20目28段・6分割
const hat = hatPlan({ headCm: 56, easeCm: -3, depthCm: 21, ribCm: 5, ribType: 2, stsG: 20, rowsG: 28, sections: 6 });
assert.ok(!hat.error);
assert.equal(hat.castOn, 108);            // 53cm×2目/cm=106 → 12の倍数に丸めて108
assert.equal(hat.castOn % 4, 0);          // 2目ゴム編みで割り切れる
assert.equal(hat.castOn % 6, 0);          // 分割数で割り切れる
assert.equal(hat.perSection, 18);
assert.equal(hat.finalSts, 12);           // 各セクション2目残し
assert.equal(hat.castOn - (hat.d1 + hat.d2) * 6, hat.finalSts);
assert.ok(Math.abs(hat.finishDepthCm - 21) < 1.5, `depth=${hat.finishDepthCm}`); // 指定深さ±1.5cm
assert.ok(Math.abs(hat.finishCircCm - 53) < 2);

// 性質チェック: いろいろなゲージ・サイズで矛盾がないこと
for (const stsG of [14, 18, 20, 24, 30]) {
  for (const rowsG of [20, 26, 28, 34, 40]) {
    for (const sections of [6, 8]) {
      for (const ribType of [1, 2]) {
        const p = hatPlan({ headCm: 56, easeCm: -3, depthCm: 22, ribCm: 5, ribType, stsG, rowsG, sections });
        if (p.error) continue; // 成立しない組み合わせはエラーを返せばよい
        const label = `stsG=${stsG} rowsG=${rowsG} sec=${sections} rib=${ribType}`;
        assert.equal(p.castOn % sections, 0, label);
        assert.equal(p.castOn % (ribType === 1 ? 2 : 4), 0, label);
        assert.equal(p.finalSts, sections * 2, label);
        assert.equal(p.ribRows + p.bodyRows + p.crownRows, p.totalRows, label);
        assert.ok(p.bodyRows >= 0, label);
        assert.ok(Math.abs(p.finishDepthCm - 22) < 2, `${label} depth=${p.finishDepthCm}`);
        assert.ok(Math.abs(p.finishCircCm - 53) < 10 / stsG * (sections === 6 ? 12 : 8) / 2 + 0.01, label);
      }
    }
  }
}

// エラーケース
assert.ok(hatPlan({ headCm: 56, easeCm: -3, depthCm: 10, ribCm: 5, ribType: 2, stsG: 20, rowsG: 28, sections: 6 }).error); // 浅すぎる
assert.ok(hatPlan({ headCm: 56, easeCm: -60, depthCm: 21, ribCm: 5, ribType: 2, stsG: 20, rowsG: 28, sections: 6 }).error);

console.log('all tests passed ✓');
