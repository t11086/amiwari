// あみわり UI。計算はすべて calc.js の純粋関数に委譲する
import {
  cmToSts, stsToCm, convertCount,
  averagePlan, spreadDecrease, spreadIncrease, hatPlan,
} from './calc.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* ---------- 画面遷移 ---------- */
const TITLES = {
  home: 'あみわり', gauge: 'ゲージ計算', avg: '増減目の平均計算',
  counter: '段数カウンター', hat: '帽子の割り出し',
};
const LOGO_SVG = document.querySelector('#title svg').outerHTML;
function show(name) {
  $$('.screen').forEach(s => s.classList.toggle('hidden', s.id !== 'scr-' + name));
  $('#backBtn').classList.toggle('hidden', name === 'home');
  // ホームは毛糸玉ロゴ付き、各画面はタイトルのみ
  $('#title').innerHTML = (name === 'home' ? LOGO_SVG : '') + TITLES[name];
  window.scrollTo(0, 0);
}
$('#backBtn').onclick = () => show('home');
$$('.card').forEach(c => { c.onclick = () => show(c.dataset.go); });

/* モード切替(タブ) */
$$('.modes').forEach(m => {
  $$('.mode', m).forEach(b => {
    b.onclick = () => {
      $$('.mode', m).forEach(x => x.classList.toggle('active', x === b));
      const scr = m.closest('.screen');
      $$('.mode-pane', scr).forEach(p => p.classList.toggle('hidden', p.dataset.pane !== b.dataset.mode));
    };
  });
});

/* 入力ヘルパー */
const num = id => { const v = parseFloat($('#' + id).value); return Number.isFinite(v) && v > 0 ? v : null; };
const int = id => { const v = num(id); return v !== null && Number.isInteger(v) ? v : (v !== null ? Math.round(v) : null); };
const bind = (ids, fn) => { ids.forEach(id => $('#' + id).addEventListener('input', fn)); fn(); };
const cm1 = v => (Math.round(v * 10) / 10).toLocaleString('ja-JP'); // 小数1桁

/* ---------- ゲージ計算 ---------- */
function renderGaugeSize() {
  const g = num('g1-sts'), gr = num('g1-rows'), w = num('g1-w'), h = num('g1-h');
  const lines = [];
  if (g && w) lines.push(`幅 ${w}cm → <b>${cmToSts(w, g)}目</b>`);
  if (gr && h) lines.push(`丈 ${h}cm → <b>${cmToSts(h, gr)}段</b>`);
  $('#g1-out').innerHTML = lines.length
    ? lines.join('<br>')
    : '<small>ゲージと寸法を入れると、ここに目数・段数が出ます</small>';
}
bind(['g1-sts', 'g1-rows', 'g1-w', 'g1-h'], renderGaugeSize);

function renderGaugeConv() {
  const ps = num('g2-psts'), pr = num('g2-prows');
  const ms = num('g2-msts'), mr = num('g2-mrows');
  const cs = int('g2-csts'), cr = int('g2-crows');
  const lines = [];
  if (ps && ms && cs) {
    const v = convertCount(cs, ps, ms);
    lines.push(`${cs}目 → <b>${v}目</b> <small style="display:inline">(約${cm1(stsToCm(v, ms))}cm)</small>`);
  }
  if (pr && mr && cr) {
    const v = convertCount(cr, pr, mr);
    lines.push(`${cr}段 → <b>${v}段</b> <small style="display:inline">(約${cm1(stsToCm(v, mr))}cm)</small>`);
  }
  $('#g2-out').innerHTML = lines.length
    ? lines.join('<br>')
    : '<small>両方のゲージと、レシピの目数(または段数)を入れてください</small>';
}
bind(['g2-psts', 'g2-prows', 'g2-msts', 'g2-mrows', 'g2-csts', 'g2-crows'], renderGaugeConv);

/* ---------- 平均計算 ---------- */
function renderAvgRows() {
  const rows = int('a1-rows'), times = int('a1-times');
  const dir = $('#a1-dir').value; // 増 | 減
  const out = $('#a1-out');
  if (!rows || !times) {
    out.innerHTML = '<small>段数と回数を入れると、配分がここに出ます</small>';
    return;
  }
  const plan = averagePlan(rows, times);
  if (!plan) {
    out.innerHTML = `<span class="err">段数(${rows})より回数(${times})が多く、1段1目では収まりません。2目ずつの増減にするか、段数を見直してください。</span>`;
    return;
  }
  const word = dir === '増' ? '増やす' : '減らす';
  const lines = plan.map(p => `<b>${p.every}段ごと</b>に1目${word} × <b>${p.times}回</b>`);
  const notation = plan.map(p => `${p.every}-1-${p.times}`).join(' , ');
  out.innerHTML = lines.join('<br>')
    + `<small>編み図表記: ${notation}(段-目-回)/ 合計 ${rows}段で ${times}目${dir}</small>`;
}
bind(['a1-rows', 'a1-times', 'a1-dir'], renderAvgRows);

function renderAvgSpread() {
  const from = int('a2-from'), to = int('a2-to');
  const out = $('#a2-out');
  if (!from || !to) {
    out.innerHTML = '<small>前後の目数を入れると、「◯目編んで2目一度」の形でここに出ます</small>';
    return;
  }
  if (from === to) { out.innerHTML = '<span class="err">目数が同じです</span>'; return; }
  if (from > to) {
    const g = spreadDecrease(from, to);
    if (!g) {
      out.innerHTML = '<span class="err">2目一度では1段で半分までしか減らせません。2段に分けるか、3目一度を検討してください。</span>';
      return;
    }
    const lines = g.map(x => x.knit > 0
      ? `「<b>${x.knit}目</b>編んで <b>2目一度</b>」× ${x.times}回`
      : `「<b>2目一度</b>」× ${x.times}回`);
    out.innerHTML = lines.join('<br>')
      + `<small>1段(1周)で ${from}目 → ${to}目(${from - to}目減)。順番は入れ替えてもOK</small>`;
  } else {
    const g = spreadIncrease(from, to);
    if (!g) {
      out.innerHTML = '<span class="err">ねじり増し目では1段で2倍までしか増やせません。2段に分けてください。</span>';
      return;
    }
    const lines = g.map(x => `「<b>${x.knit}目</b>編んで <b>ねじり増し目</b>」× ${x.times}回`);
    out.innerHTML = lines.join('<br>')
      + `<small>1段(1周)で ${from}目 → ${to}目(${to - from}目増)。順番は入れ替えてもOK</small>`;
  }
}
bind(['a2-from', 'a2-to'], renderAvgSpread);

/* ---------- 段数カウンター(編みかけ > パーツの2階層で保存) ---------- */
const CKEY = 'amiwari-counter-v3';
const CKEY_V2 = 'amiwari-counter-v2'; // 旧: 編みかけごと(パーツなし)
const CKEY_V1 = 'amiwari-counter';    // 旧: 1件分だけ
const newPart = name => ({ name, main: 0, sub: 0, target: 0 });
const newProj = name => ({ name, curPart: 0, parts: [newPart('')] });
let cst = null;
try { cst = JSON.parse(localStorage.getItem(CKEY) || 'null'); } catch { }
if (!cst || !Array.isArray(cst.list) || !cst.list.length) {
  // v2 → 各編みかけを「パーツ1つ」として引き継ぐ。v2もなければ v1 を1件目に
  let old = null;
  try { old = JSON.parse(localStorage.getItem(CKEY_V2) || 'null'); } catch { }
  if (old && Array.isArray(old.list) && old.list.length) {
    cst = {
      cur: old.cur | 0,
      list: old.list.map(q => ({ name: q.name || '', curPart: 0, parts: [{ ...newPart(''), main: q.main | 0, sub: q.sub | 0, target: q.target | 0 }] })),
    };
  } else {
    let p1 = null;
    try { p1 = JSON.parse(localStorage.getItem(CKEY_V1) || 'null'); } catch { }
    const first = newProj('編みかけ1');
    if (p1) first.parts[0] = { ...first.parts[0], main: p1.main | 0, sub: p1.sub | 0, target: p1.target | 0 };
    cst = { cur: 0, list: [first] };
  }
  localStorage.removeItem(CKEY_V2);
  localStorage.removeItem(CKEY_V1);
}
cst.cur = Math.min(Math.max(cst.cur | 0, 0), cst.list.length - 1);
cst.list.forEach(q => {
  if (!Array.isArray(q.parts) || !q.parts.length) q.parts = [newPart('')];
  q.curPart = Math.min(Math.max(q.curPart | 0, 0), q.parts.length - 1);
});
const proj = () => cst.list[cst.cur];
const part = () => proj().parts[proj().curPart];

function renderChips(wrap, label, items, curIdx, fallback, onPick, onAdd) {
  wrap.innerHTML = '';
  const lb = document.createElement('span');
  lb.className = 'chiplabel';
  lb.textContent = label;
  wrap.appendChild(lb);
  items.forEach((q, i) => {
    const b = document.createElement('button');
    b.className = 'chip' + (i === curIdx ? ' active' : '');
    b.textContent = q.name || `${fallback}${i + 1}`;
    b.onclick = () => onPick(i);
    wrap.appendChild(b);
  });
  const add = document.createElement('button');
  add.className = 'chip add';
  add.textContent = '＋ふやす';
  add.onclick = onAdd;
  wrap.appendChild(add);
}

function renderCnt() {
  const p = proj(), pt = part();
  renderChips($('#c-chips'), '編みかけ', cst.list, cst.cur, '編みかけ',
    i => { cst.cur = i; saveCnt(); },
    () => { cst.list.push(newProj(`編みかけ${cst.list.length + 1}`)); cst.cur = cst.list.length - 1; saveCnt(); });
  renderChips($('#p-chips'), 'パーツ', p.parts, p.curPart, 'パーツ',
    i => { p.curPart = i; saveCnt(); },
    () => { p.parts.push(newPart(`パーツ${p.parts.length + 1}`)); p.curPart = p.parts.length - 1; saveCnt(); });

  $('#c-main').textContent = pt.main;
  $('#c-sub').textContent = pt.sub;
  // 入力中に値を書き戻すとカーソルが飛ぶので、フォーカス外のときだけ同期する
  if (document.activeElement !== $('#c-name')) $('#c-name').value = p.name;
  if (document.activeElement !== $('#p-name')) $('#p-name').value = pt.name;
  if (document.activeElement !== $('#c-target')) $('#c-target').value = pt.target || '';
  if (pt.target > 0) {
    const left = pt.target - pt.main;
    $('#c-prog').textContent = left > 0 ? `目標まで あと${left}段` : '目標の段数に届きました!';
  } else {
    $('#c-prog').textContent = '';
  }
}
function saveCnt() { localStorage.setItem(CKEY, JSON.stringify(cst)); renderCnt(); }
$('#c-plus').onclick = () => { part().main++; saveCnt(); };
$('#c-minus').onclick = () => { if (part().main > 0) part().main--; saveCnt(); };
$('#c-reset').onclick = () => { if (confirm('段数を0に戻しますか?')) { part().main = 0; saveCnt(); } };
$('#s-plus').onclick = () => { part().sub++; saveCnt(); };
$('#s-minus').onclick = () => { if (part().sub > 0) part().sub--; saveCnt(); };
$('#s-reset').onclick = () => { part().sub = 0; saveCnt(); };
$('#c-target').addEventListener('input', () => { part().target = int('c-target') || 0; saveCnt(); });
$('#c-name').addEventListener('input', () => { proj().name = $('#c-name').value; saveCnt(); });
$('#c-name').addEventListener('blur', () => { proj().name = $('#c-name').value.trim(); saveCnt(); });
$('#p-name').addEventListener('input', () => { part().name = $('#p-name').value; saveCnt(); });
$('#p-name').addEventListener('blur', () => { part().name = $('#p-name').value.trim(); saveCnt(); });
$('#p-del').onclick = () => {
  const p = proj();
  const label = part().name || `パーツ${p.curPart + 1}`;
  if (!confirm(`パーツ「${label}」を削除しますか?\n数えた段数も消えます`)) return;
  p.parts.splice(p.curPart, 1);
  if (!p.parts.length) p.parts.push(newPart(''));
  p.curPart = Math.min(p.curPart, p.parts.length - 1);
  saveCnt();
};
$('#c-del').onclick = () => {
  const label = proj().name || `編みかけ${cst.cur + 1}`;
  if (!confirm(`「${label}」を削除しますか?\nパーツと数えた段数も消えます`)) return;
  cst.list.splice(cst.cur, 1);
  if (!cst.list.length) cst.list.push(newProj('編みかけ1'));
  cst.cur = Math.min(cst.cur, cst.list.length - 1);
  saveCnt();
};
renderCnt();

/* ---------- 帽子の割り出し(本来は買い切り。いまは無料β公開中) ---------- */
// β終了時: HAT_BETA を false に戻し、解除コードを新しいものに差し替えること(現コードはCLAUDE.md参照)
const HAT_BETA = true;
// 試し編みの感想募集フォーム(Googleフォーム)。空のあいだはリンク自体を出さない
const FEEDBACK_URL = '';
const UNLOCK_HASH = '4f1e16a70558241ecd1cd61da79d3d2c4e2dfbe9fe2f7fef6dc42ea7ab3a7d69';
const UKEY = 'amiwari-unlocked';
let unlocked = HAT_BETA || localStorage.getItem(UKEY) === '1';
$('#hat-beta').classList.toggle('hidden', !HAT_BETA);
$('#home-beta').classList.toggle('hidden', !HAT_BETA);
$('#home-lock').classList.toggle('hidden', HAT_BETA);
if (FEEDBACK_URL) {
  $('#feedback-link').href = FEEDBACK_URL;
  $('#feedback-link').classList.remove('hidden');
}

async function sha256hex(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
$('#unlock-btn').onclick = async () => {
  const code = $('#unlock-code').value.trim().toUpperCase();
  if (!code) return;
  if (await sha256hex(code) === UNLOCK_HASH) {
    unlocked = true;
    localStorage.setItem(UKEY, '1');
    renderHat();
  } else {
    $('#unlock-msg').textContent = 'コードが違います';
  }
};

function renderHat() {
  $('#hat-lock').classList.toggle('hidden', unlocked);
  $('#hat-result').classList.toggle('hidden', !unlocked);
  if (!unlocked) return;
  const p = hatPlan({
    headCm: num('h-head'), easeCm: parseFloat($('#h-ease').value),
    depthCm: num('h-depth'), ribCm: num('h-ribcm'),
    ribType: parseInt($('#h-rib').value, 10),
    stsG: num('h-sts'), rowsG: num('h-rows'),
    sections: parseInt($('#h-sec').value, 10),
  });
  const out = $('#hat-result');
  if (!num('h-head') || !num('h-depth') || !num('h-ribcm') || !num('h-sts') || !num('h-rows')) {
    out.innerHTML = '<small>サイズとゲージをすべて入れてください</small>';
    return;
  }
  if (p.error) { out.innerHTML = `<span class="err">${p.error}</span>`; return; }
  const rib = p.ribType === 1 ? '1目ゴム編み' : '2目ゴム編み';
  const steps = [
    `作り目 <b>${p.castOn}目</b>。ねじれないように輪にする`,
    `${rib}を <b>${p.ribRows}段</b>(約${cm1(p.ribCmActual)}cm)`,
    p.bodyRows > 0
      ? `メリヤス編みを <b>${p.bodyRows}段</b>(約${cm1(p.bodyCmActual)}cm)`
      : `メリヤス編みはなし(そのまま減目へ)`,
    `<b>${p.perSection}目ごと</b>に${p.sections}か所マーカーを入れる`,
    `減目段:「各マーカーの手前2目を2目一度」(1段で${p.sections}目減)。<br>これを<b>2段ごとに ${p.d1}回</b> → ${p.afterD1}目`,
    p.d2 > 0 ? `続けて<b>毎段 ${p.d2}回</b> → ${p.finalSts}目` : null,
    `糸を30cmほど残して切り、残った<b>${p.finalSts}目</b>に通してしっかり絞る`,
  ].filter(Boolean);
  out.innerHTML =
    `<ol class="recipe">${steps.map(s => `<li>${s}</li>`).join('')}</ol>` +
    `<small>できあがり: 周囲 約${cm1(p.finishCircCm)}cm(かぶると伸びます)・深さ 約${cm1(p.finishDepthCm)}cm/` +
    `合計 ${p.totalRows}段<br>※ ゲージ次第で仕上がりは変わります。作品の前に必ず試し編みを。</small>`;
}
bind(['h-head', 'h-depth', 'h-ribcm', 'h-sts', 'h-rows'], renderHat);
['h-ease', 'h-rib', 'h-sec'].forEach(id => $('#' + id).addEventListener('change', renderHat));

/* ---------- PWA ---------- */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => { });
}

/* ホーム画面に追加(A2HS)
   - Android/Chrome系: beforeinstallprompt を捕まえて本物のインストールを出す
   - iOS Safari: APIがないので共有メニューの手順ガイドを開く
   - すでにホーム画面から起動している場合(standalone)はカードごと出さない
   - ?install=demo でカード+ガイドを強制表示(スクショ検証用) */
const isStandalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOSはMac名乗り
let installPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installPrompt = e;
  if (!isStandalone) $('#install-card').classList.remove('hidden');
});
if (!isStandalone && isIOS) $('#install-card').classList.remove('hidden');
window.addEventListener('appinstalled', () => $('#install-card').classList.add('hidden'));

$('#install-btn').onclick = async () => {
  if (installPrompt) {
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
  } else {
    $('#ios-guide').classList.toggle('hidden'); // iOS等: 手順ガイドを開閉
  }
};

if (new URLSearchParams(location.search).get('install') === 'demo') {
  $('#install-card').classList.remove('hidden');
  $('#ios-guide').classList.remove('hidden');
}

// ?scr=gauge などで直接その画面を開ける(開発・検証用のディープリンク)
const initScr = new URLSearchParams(location.search).get('scr');
show(TITLES[initScr] ? initScr : 'home');
