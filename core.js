'use strict';
// 画面に関係しないしくみ：日付、出題スケジュール、答え合わせ。
// index.html と tools/check.mjs の両方から読みこむ（problems.js・generated.js の後に読むこと）。

// ---------------------------------------------------------------------------
// 日付（端末の現地時刻で日付を区切る）
// ---------------------------------------------------------------------------
const LAUNCH = [2026, 10, 14]; // 第1問の日
const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
const pad = n => String(n).padStart(2, '0');
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayNum = d => Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(LAUNCH[0], LAUNCH[1] - 1, LAUNCH[2])) / 86400000);
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const today = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };

// ---------------------------------------------------------------------------
// 日曜日の特別問題：その日の日付（MMDD）の4つの数字で10を作る
// ---------------------------------------------------------------------------
function solve10(nums) {
  // nums: [{v, e}] 値と式。全組み合わせを試し、10になる式を1つ返す
  if (nums.length === 1) return Math.abs(nums[0].v - 10) < 1e-9 ? nums[0].e : null;
  for (let i = 0; i < nums.length; i++) for (let j = 0; j < nums.length; j++) {
    if (i === j) continue;
    const a = nums[i], b = nums[j];
    const rest = nums.filter((_, k) => k !== i && k !== j);
    const cand = [{ v: a.v + b.v, e: `(${a.e}+${b.e})` }, { v: a.v - b.v, e: `(${a.e}−${b.e})` }, { v: a.v * b.v, e: `(${a.e}×${b.e})` }];
    if (Math.abs(b.v) > 1e-12) cand.push({ v: a.v / b.v, e: `(${a.e}÷${b.e})` });
    for (const c of cand) { const r = solve10([...rest, c]); if (r) return r; }
  }
  return null;
}

function make10Problem(d) {
  const ds = `${pad(d.getMonth() + 1)}${pad(d.getDate())}`.split('').map(Number);
  const sol = solve10(ds.map(v => ({ v, e: String(v) })));
  if (!sol) return null;
  const clean = sol.replace(/^\((.*)\)$/, '$1');
  return {
    id: 'make10-' + ds.join(''), genre: 'season', level: 3, title: 'きょうの日付で10を作れ',
    q: `<p>きょうは ${d.getMonth() + 1}月${d.getDate()}日。日付を4けたで書くと</p><p class="big">${ds.join('　')}</p><p>この4つの数字を <b>1回ずつ全部</b> 使い、＋ − × ÷ と（ ）で <b>10</b> を作ってください。</p>`,
    type: 'expr', digits: ds, target: 10, help: '例：(1+4)×(1+1)　数字はつなげて2けたにはできません',
    hints: [ds.includes(0) ? '0 は「足しても引いても変わらない」「かけると0になる」数。うまく使おう。' : '先に2つの数で小さな数を作り、残りと組み合わせてみよう。', `最初の一手：${firstStep(sol)}`],
    explain: `<p>答えの一例：<b>${clean} = 10</b></p><p>ほかの式で作れていても、もちろん正解です。</p>`,
  };
}
function firstStep(sol) {
  const m = sol.match(/\(?(\d)([+−×÷])(\d)\)?/);
  return m ? `${m[1]} と ${m[3]} を ${m[2]} で組み合わせる式がある` : '大きい数どうしを先に組み合わせてみよう';
}

// ---------------------------------------------------------------------------
// 出題スケジュール
//   毎日「ふつう」と「難問」の2問。どちらも、手作りの問題と自動生成の問題を1日おきに出す。
//   特別な日・季節の問題・日曜日の日付パズルは「ふつう」のほうに出る。
// ---------------------------------------------------------------------------
function seededOrder(list, seed) {
  const a = list.slice(); let x = seed >>> 0;
  const rnd = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const ALL_PROBLEMS = [...PROBLEMS, ...GENERATED];
const BY_ID = new Map(ALL_PROBLEMS.map(p => [p.id, p]));
const isGeneral = p => !p.date && !p.month;
const POOLS = {
  normalHand: PROBLEMS.filter(p => isGeneral(p) && p.level <= 3),
  normalGen: GENERATED.filter(p => p.level <= 3),
  hardHand: PROBLEMS.filter(p => isGeneral(p) && p.level >= 4),
  hardGen: GENERATED.filter(p => p.level >= 4),
};
const orderCache = new Map();
function fromPool(name, idx, seed) {
  const pool = POOLS[name], n = pool.length, cycle = Math.floor(idx / n);
  const key = name + cycle;
  if (!orderCache.has(key)) orderCache.set(key, seededOrder(pool, seed + cycle * 7919));
  return orderCache.get(key)[((idx % n) + n) % n];
}

function normalFor(d) {
  const mmdd = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const special = PROBLEMS.find(p => p.date === mmdd);
  if (special) return special;
  const pool = PROBLEMS.filter(p => p.month === d.getMonth() + 1);
  const slot = [15, 5, 25].indexOf(d.getDate()); // 季節の問題が1つなら15日、2つなら5日にも、3つなら25日にも
  if (slot >= 0 && slot < pool.length) return pool[slot];
  if (d.getDay() === 0) { const p = make10Problem(d); if (p) return p; }
  const n = dayNum(d);
  return n % 2 === 0 ? fromPool('normalHand', Math.floor(n / 2), 20261016) : fromPool('normalGen', Math.floor(n / 2), 1016);
}
function hardFor(d) {
  const n = dayNum(d);
  return n % 2 !== 0 ? fromPool('hardHand', Math.floor(n / 2), 5552026) : fromPool('hardGen', Math.floor(n / 2), 2026);
}

// 最初の版（56問・1日1問）のスケジュール。問題を記録していない古い記録のためだけに使う
function legacyFor(d) {
  const list = PROBLEMS.slice(0, 56);
  const GENERAL = list.filter(isGeneral);
  const mmdd = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const special = list.find(p => p.date === mmdd);
  if (special) return special;
  const pool = list.filter(p => p.month === d.getMonth() + 1);
  const slot = [15, 5, 25].indexOf(d.getDate());
  if (slot >= 0 && slot < pool.length) return pool[slot];
  if (d.getDay() === 0) { const p = make10Problem(d); if (p) return p; }
  const n = dayNum(d), cycle = Math.floor(n / GENERAL.length);
  const order = seededOrder(GENERAL, 20261014 + cycle * 7919);
  return order[((n % GENERAL.length) + GENERAL.length) % GENERAL.length];
}

// 記録に残っている問題IDから問題をとり出す
function problemById(id, d) {
  if (id.startsWith('make10-')) return make10Problem(d);
  return BY_ID.get(id) || null;
}

// ---------------------------------------------------------------------------
// 答え合わせ
// ---------------------------------------------------------------------------
function norm(s) {
  return String(s).normalize('NFKC').trim().toLowerCase().replace(/[\s,、]/g, '').replace(/(円|個|回転|回|日目|日|度|歳|通り|本|年|マス|分|秒|か月|月|ページ|種類|ピース|組|匹|人|番|面|色|試合|時間|か所|枚|段|手|km|m2|g|m|%)$/, '');
}
function toNum(s) {
  const t = norm(s);
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  const f = t.match(/^(-?\d+)\/(\d+)$/);
  if (f && Number(f[2]) !== 0) return Number(f[1]) / Number(f[2]);
  return null;
}
function hira(s) { return s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)); }
function matches(input, ans) {
  const a = toNum(input), b = toNum(ans);
  if (a !== null && b !== null) return Math.abs(a - b) < 1e-9;
  return hira(norm(input)) === hira(norm(ans));
}

// 安全な式の評価（数字1けた・+−×÷・かっこのみ）
function evalExpr(src, noParen) {
  const s = String(src).normalize('NFKC').replace(/\s+/g, '').replace(/[x*]/gi, '×').replace(/[\/]/g, '÷').replace(/[-ー－−]/g, '−').replace(/=.*$/, '');
  let i = 0; const digits = [];
  const peek = () => s[i];
  function expr() { let v = term(); while (peek() === '+' || peek() === '−') { const op = s[i++]; const r = term(); v = op === '+' ? v + r : v - r; } return v; }
  function term() { let v = factor(); while (peek() === '×' || peek() === '÷') { const op = s[i++]; const r = factor(); if (op === '÷' && r === 0) throw new Error('0で割っています'); v = op === '×' ? v * r : v / r; } return v; }
  function factor() {
    if (peek() === '(') { if (noParen) throw new Error('この問題ではかっこは使えません'); i++; const v = expr(); if (peek() !== ')') throw new Error('かっこが閉じていません'); i++; return v; }
    if (/[0-9]/.test(peek() || '')) { const d = s[i++]; if (/[0-9]/.test(peek() || '')) throw new Error('数字はつなげずに1つずつ使います'); digits.push(Number(d)); return Number(d); }
    throw new Error('式が読めません');
  }
  const v = expr();
  if (i !== s.length) throw new Error('式が読めません');
  return { v, digits };
}

// 答えを調べる。{ ok, invalid(回数に数えない書きまちがい), msg }
function checkAnswer(p, value) {
  if (p.type === 'choice') return { ok: Number(value) === p.answer };
  if (p.type === 'expr') {
    let r;
    try { r = evalExpr(value, p.noParen); } catch (e) { return { ok: false, invalid: true, msg: e.message }; }
    const target = p.target == null ? 10 : p.target;
    if (p.ordered) {
      if (r.digits.join(',') !== p.digits.join(',')) return { ok: false, invalid: true, msg: `${p.digits.join('・')} をこの順番のまま全部使ってね` };
    } else if (r.digits.slice().sort().join('') !== p.digits.slice().sort().join('')) {
      return { ok: false, invalid: true, msg: `${p.digits.join('・')} を1回ずつ全部使ってね` };
    }
    if (Math.abs(r.v - target) < 1e-9) return { ok: true };
    return { ok: false, invalid: true, msg: `その式は ${Math.round(r.v * 1000) / 1000} になります` };
  }
  let hit;
  if (p.set) {
    const letters = x => [...norm(x).replace(/[^a-z]/g, '')].sort().join('');
    hit = p.answer.find(a => letters(a) === letters(value));
  } else if (p.exact) {
    hit = p.answer.find(a => norm(a) === norm(value));
  } else {
    hit = p.answer.find(a => matches(value, a));
  }
  return { ok: !!hit, msg: hit && p.accept && p.accept[hit] };
}

function answerText(p) {
  if (p.type === 'choice') return p.choices[p.answer];
  if (p.type === 'expr') return '';
  return p.answer[0] + (p.unit || '');
}
