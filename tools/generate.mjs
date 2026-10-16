// 自動生成の問題を作って generated.js に書き出す。
//   node tools/generate.mjs
// 乱数の種は固定なので、何度実行しても同じ問題ができる。答えはすべてここで計算する。
import { writeFileSync } from 'node:fs';

// ---------------------------------------------------------------------------
// 共通の道具
// ---------------------------------------------------------------------------
function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const R = mulberry(20261016);
const ri = (lo, hi) => lo + Math.floor(R() * (hi - lo + 1));
const pick = a => a[Math.floor(R() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
const lcm = (a, b) => a / gcd(a, b) * b;
const fr = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; return { n: n / g, d: d / g }; };
const frStr = f => f.d === 1 ? String(f.n) : `${f.n}/${f.d}`;
const LETTERS = 'ABCDE';
const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
const SUP = n => String(n).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]).join('');

const out = [];
const seen = new Set();
function add(kind, key, p) {
  const id = `g-${kind}-${key}`;
  if (seen.has(id)) return false;
  seen.add(id);
  out.push({ id, kind, ...p });
  return true;
}
function loop(n, maxTry, fn) { let made = 0; for (let t = 0; t < maxTry && made < n; t++) if (fn()) made++; return made; }

// ---------------------------------------------------------------------------
// 1. 4つの数で10や24を作る（分数が必要なものは難問）
// ---------------------------------------------------------------------------
function solveAll(nums, target) {
  const sols = new Map(); // 式 → 途中が全部0以上の整数か
  (function rec(list) {
    if (list.length === 1) { const x = list[0]; if (x.v.d === 1 && x.v.n === target) sols.set(x.e, x.int); return; }
    for (let i = 0; i < list.length; i++) for (let j = 0; j < list.length; j++) {
      if (i === j) continue;
      const a = list[i], b = list[j], rest = list.filter((_, k) => k !== i && k !== j);
      const c = [];
      if (i < j) { c.push({ v: fr(a.v.n * b.v.d + b.v.n * a.v.d, a.v.d * b.v.d), op: '+' }); c.push({ v: fr(a.v.n * b.v.n, a.v.d * b.v.d), op: '×' }); }
      c.push({ v: fr(a.v.n * b.v.d - b.v.n * a.v.d, a.v.d * b.v.d), op: '−' });
      if (b.v.n !== 0) c.push({ v: fr(a.v.n * b.v.d, a.v.d * b.v.n), op: '÷' });
      for (const x of c) rec([...rest, { v: x.v, e: `(${a.e}${x.op}${b.e})`, int: a.int && b.int && x.v.d === 1 && x.v.n >= 0 }]);
    }
  })(nums.map(n => ({ v: fr(n), e: String(n), int: true })));
  return sols;
}
const strip = e => e.replace(/^\((.*)\)$/, '$1');
function makeN() {
  const cands = { 10: [], 24: [] };
  for (const target of [10, 24]) {
    const lo = target === 10 ? 0 : 1;
    for (let a = lo; a <= 9; a++) for (let b = a; b <= 9; b++) for (let c = b; c <= 9; c++) for (let d = c; d <= 9; d++) {
      const sols = solveAll([a, b, c, d], target);
      if (!sols.size) continue;
      const ints = [...sols].filter(([, i]) => i).map(([e]) => e);
      cands[target].push({ ds: [a, b, c, d], n: sols.size, ints, all: [...sols.keys()] });
    }
  }
  let hard = 0, normal = 0;
  for (const target of [10, 24]) {
    // 分数を通らないと作れないもの → 難問
    for (const c of cands[target].filter(c => !c.ints.length)) {
      const ex = c.all.sort((x, y) => x.length - y.length)[0];
      if (addMake(c.ds, target, ex, 5, true)) hard++;
    }
    // 答えの式が少ない（＝見つけにくい）ものから選ぶ → ふつう
    const pool = shuffle(cands[target].filter(c => c.ints.length && c.n <= (target === 10 ? 24 : 16)));
    for (const c of pool.slice(0, target === 10 ? 40 : 30)) {
      const ex = c.ints.sort((x, y) => x.length - y.length)[0];
      if (addMake(shuffle(c.ds), target, ex, c.n <= 8 ? 4 : 3, false)) normal++;
    }
  }
  return { hard, normal };
}
function addMake(ds, target, ex, level, fraction) {
  const first = ex.match(/\((\d)([+−×÷])(\d)\)/);
  return add('make' + target, ds.slice().sort().join(''), {
    genre: 'math', level, title: `${ds.join('・')} で${target}を作れ`,
    q: `<p class="big">${ds.join('　')}</p><p>この4つの数字を <b>1回ずつ全部</b> 使い、＋ − × ÷ と（ ）で <b>${target}</b> を作ってください。</p>`,
    type: 'expr', digits: ds, target, help: '例：(1+4)×(1+1)　数字はつなげて2けたにはできません',
    hints: [
      fraction ? '整数の計算だけでは作れません。途中でわり切れない（分数になる）計算をしてみよう。' : (ds.includes(0) ? '0 は「足しても引いても変わらない」「かけると0になる」数。うまく使おう。' : `${target} = ${target === 10 ? '2×5、5+5、20÷2' : '3×8、4×6、2×12'} など、${target}になる組み合わせから逆に考えよう。`),
      first ? `最初の一手：${first[1]} と ${first[3]} を ${first[2]} で組み合わせる式がある。` : '大きい数どうしを先に組み合わせてみよう。',
    ],
    explain: `<p>答えの一例：<b>${strip(ex)} = ${target}</b></p>` + (fraction ? '<p>途中で分数が出てくるのがこの問題の難しいところ。整数だけで考えていると、なかなか見つかりません。</p>' : '<p>ほかの式で作れていても、もちろん正解です。</p>'),
  });
}

// ---------------------------------------------------------------------------
// 2. □に＋−×÷を入れる（かっこなし）
// ---------------------------------------------------------------------------
function evalNoParen(ds, ops) {
  // × ÷ を先に計算
  const terms = [fr(ds[0])], signs = [];
  for (let i = 0; i < ops.length; i++) {
    const o = ops[i], x = fr(ds[i + 1]);
    if (o === '×') { const t = terms.pop(); terms.push(fr(t.n * x.n, t.d * x.d)); }
    else if (o === '÷') { const t = terms.pop(); terms.push(fr(t.n * x.d, t.d * x.n)); }
    else { signs.push(o); terms.push(x); }
  }
  let v = terms[0];
  signs.forEach((s, i) => { const t = terms[i + 1]; v = fr(v.n * t.d + (s === '+' ? 1 : -1) * t.n * v.d, v.d * t.d); });
  return v;
}
function opsPuzzle(n) {
  return loop(n, 5000, () => {
    const len = pick([4, 5, 5]);
    const ds = Array.from({ length: len }, () => ri(1, 9));
    const byTarget = new Map();
    const OPS = ['+', '−', '×', '÷'];
    for (let m = 0; m < 4 ** (len - 1); m++) {
      const ops = []; let x = m; for (let i = 0; i < len - 1; i++) { ops.push(OPS[x % 4]); x = Math.floor(x / 4); }
      const v = evalNoParen(ds, ops);
      if (v.d !== 1 || v.n < 0) continue;
      const k = v.n; if (!byTarget.has(k)) byTarget.set(k, []); byTarget.get(k).push(ops);
    }
    const uniq = [...byTarget].filter(([t, l]) => l.length === 1 && new Set(l[0]).size >= 3 && t >= 2);
    if (!uniq.length) return false;
    const [target, [ops]] = pick(uniq);
    const expr = ds.map((d, i) => d + (ops[i] || '')).join('');
    return add('ops', ds.join('') + '-' + target, {
      genre: 'math', level: len === 5 ? 4 : 3, title: '□に記号を入れて',
      q: `<p class="big">${ds.join(' □ ')} = ${target}</p><p>□に ＋ − × ÷ のどれかを1つずつ入れて、式を正しくしてください（同じ記号を何回使ってもよい。かっこは使わない）。</p><p>× ÷ は ＋ − より先に計算します。</p>`,
      type: 'expr', digits: ds, target, ordered: true, noParen: true, help: `例：${ds.join('+')}　（× は * や x、÷ は / でも入力できます）`,
      hints: ['× と ÷ のかたまりを先に計算することを忘れずに。', `いちばん左の□には「${ops[0]}」が入る。`],
      explain: `<p>答え：<b>${expr} = ${target}</b></p><p>この問題は、記号の入れ方がこの1通りしかありません。</p>`,
    });
  });
}

// 筆算の形。1文字ずつ同じ幅のマスに入れるので、□と数字がずれない
function calcHTML(top, op, mid, bottom) {
  const W = Math.max(top.length, mid.length + 1, bottom.length);
  const row = (s, cls, lead) => {
    const cells = Array(W).fill(''), ch = [...s];
    ch.forEach((c, i) => (cells[W - ch.length + i] = c));
    if (lead) cells[0] = lead;
    return cells.map(c => `<span${cls ? ` class="${cls}"` : ''}>${c}</span>`).join('');
  };
  return `<div class="calc" style="--w:${W}" role="img" aria-label="${top} ${op} ${mid} = ${bottom}">${row(top)}${row(mid, '', op)}${row(bottom, 'sum')}</div>`;
}

// ---------------------------------------------------------------------------
// 3. 覆面算（たし算）
// ---------------------------------------------------------------------------
function cryptSolutions(words, sum, limit = 2) {
  const letters = [...new Set([...words.join(''), ...sum])];
  const coef = Object.fromEntries(letters.map(l => [l, 0]));
  for (const w of words) [...w].reverse().forEach((l, i) => (coef[l] += 10 ** i));
  [...sum].reverse().forEach((l, i) => (coef[l] -= 10 ** i));
  const lead = new Set([...words, sum].map(w => w[0]));
  const cs = letters.map(l => coef[l]), lz = letters.map(l => lead.has(l));
  const used = Array(10).fill(false), val = Array(letters.length).fill(0), sols = [];
  (function rec(i, acc) {
    if (sols.length >= limit) return;
    if (i === letters.length) { if (acc === 0) sols.push(val.slice()); return; }
    for (let d = lz[i] ? 1 : 0; d <= 9; d++) { if (used[d]) continue; used[d] = true; val[i] = d; rec(i + 1, acc + cs[i] * d); used[d] = false; }
  })(0, 0);
  return { letters, sols };
}
function cryptarithm(n) {
  return loop(n, 16000, () => {
    const len = pick([3, 3, 4]);
    const x = ri(10 ** (len - 1), 10 ** len - 1), y = ri(10 ** (len - 1), 10 ** len - 1), z = x + y;
    const digits = [...new Set(String(x) + y + z)];
    if (digits.length < 5 || digits.length > 8) return false;
    const map = Object.fromEntries(shuffle(digits).map((d, i) => [d, 'ABCDEFGHJK'[i]]));
    const enc = v => [...String(v)].map(d => map[d]).join('');
    const W = [enc(x), enc(y)], S = enc(z);
    const { letters, sols } = cryptSolutions(W, S);
    if (sols.length !== 1) return false;
    const pairs = letters.map((l, i) => `${l}=${sols[0][i]}`).sort();
    const carry = S.length > len;
    return add('crypt', `${W[0]}+${W[1]}=${S}`, {
      genre: 'math', level: digits.length >= 7 ? 5 : 4, title: `覆面算 ${W[0]}＋${W[1]}`,
      q: `${calcHTML(W[0], '+', W[1], S)}<p>同じ文字には同じ数字、ちがう文字にはちがう数字（0〜9）が入ります。いちばん上のけたは0ではありません。</p><p><b>${S}</b> はいくつ？</p>`,
      type: 'input', answer: [String(z)],
      hints: [carry ? `答えが1けた増えているので、いちばん上の ${S[0]} はくり上がりの1。` : '一の位から順に、くり上がりがあるかないかで場合分けしよう。', `${pairs.slice(0, 2).join('、')}。`],
      explain: `<p>${pairs.join('、')}</p><p><b>${x} + ${y} = ${z}</b></p>`,
    });
  });
}

// ---------------------------------------------------------------------------
// 4. 虫食い算（たし算・かけ算）
// ---------------------------------------------------------------------------
function holes(n, mode) {
  return loop(n, 6000, () => {
    let a, b, c, op;
    if (mode === 'add') { a = ri(100, 999); b = ri(100, 999); c = a + b; op = '+'; }
    else { a = ri(12, 999); b = ri(3, 9); c = a * b; op = '×'; }
    const rows = [String(a), String(b), String(c)];
    const cells = []; rows.forEach((r, ri_) => [...r].forEach((_, ci) => cells.push([ri_, ci])));
    const k = mode === 'add' ? ri(4, 5) : ri(3, 4);
    const hide = shuffle(cells).slice(0, k).sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    if (mode === 'mul' && hide.some(([r]) => r === 1)) return false; // かける1けたの数は見せる
    const show = rows.map((r, i) => [...r].map((ch, j) => (hide.some(([x, y]) => x === i && y === j) ? '□' : ch)).join(''));
    // 解が1つか調べる
    let count = 0, ans = '';
    for (let m = 0; m < 10 ** k && count < 2; m++) {
      const ds = String(m).padStart(k, '0');
      const t = rows.map(r => [...r]);
      hide.forEach(([i, j], h) => (t[i][j] = ds[h]));
      if (t.some(r => r[0] === '0')) continue;
      const [p, q, s] = t.map(r => Number(r.join('')));
      if ((mode === 'add' ? p + q : p * q) === s) { count++; ans = ds; }
    }
    if (count !== 1) return false;
    return add('holes' + mode, show.join(op), {
      genre: 'math', level: mode === 'add' ? 3 : 4, title: mode === 'add' ? '虫食い算（たし算）' : '虫食い算（かけ算）',
      q: `${calcHTML(show[0], op, show[1], show[2])}<p>□には0〜9の数字が1つずつ入ります（同じ数字が入ってもよい。いちばん上のけたは0ではありません）。</p><p>□に入る数字を、<b>上の段から、左から順に</b> 続けて入力してください。</p>`,
      type: 'input', answer: [ans], exact: true, help: `例：${'1234567'.slice(0, k)}（${k}けた）`,
      hints: [mode === 'add' ? '一の位から、くり上がりに気をつけて決めていこう。' : '一の位から決めていこう。かけ算の一の位は、かけられる数の一の位だけで決まる。', `最初の□は ${ans[0]}。`],
      explain: `<p>答え：<b>${ans}</b></p><p><b>${a} ${op} ${b} = ${c}</b></p>`,
    });
  });
}

// ---------------------------------------------------------------------------
// 5. 魔方陣のあなうめ
// ---------------------------------------------------------------------------
function magic(n) {
  const POS = [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]];
  const sq = (c, a, b) => [c + a, c - a - b, c + b, c - a + b, c, c + a - b, c - b, c + a + b, c - a];
  return loop(n, 4000, () => {
    const c = ri(5, 40), a = ri(-c + 1, c - 1), b = ri(-c + 1, c - 1);
    const s = sq(c, a, b);
    if (s.some(v => v <= 0) || new Set(s).size !== 9) return false;
    const k = pick([3, 3, 4]);
    const given = shuffle([...Array(9).keys()]).slice(0, k).sort((x, y) => x - y);
    // 与えた数から1通りに決まるか（中心・a・b を総当たり）
    let cnt = 0;
    for (let cc = 1; cc <= 60 && cnt < 2; cc++) for (let aa = -60; aa <= 60 && cnt < 2; aa++) for (let bb = -60; bb <= 60; bb++) {
      const t = sq(cc, aa, bb); if (given.every(i => t[i] === s[i])) { cnt++; if (cnt > 1) break; }
    }
    if (cnt !== 1) return false;
    const ask = pick([...Array(9).keys()].filter(i => !given.includes(i)));
    const cell = i => given.includes(i) ? String(s[i]) : (i === ask ? '<b>?</b>' : '');
    const table = '<table class="grid">' + [0, 1, 2].map(r => '<tr>' + [0, 1, 2].map(col => `<td>${cell(r * 3 + col)}</td>`).join('') + '</tr>').join('') + '</table>';
    return add('magic', `${s.join('.')}-${given.join('')}-${ask}`, {
      genre: 'math', level: k === 3 ? 4 : 3, title: '魔方陣のあなうめ',
      q: `${table}<p>たて・よこ・ななめ、どの3つの数を足しても同じ和になる「魔方陣」です。</p><p><b>?</b> に入る数は？</p>`,
      type: 'input', answer: [String(s[ask])],
      hints: ['3×3 の魔方陣では、1列の和はまん中の数のちょうど3倍になる。', `まん中の数は ${s[4]}、1列の和は ${s[4] * 3}。`],
      explain: '<table class="grid">' + [0, 1, 2].map(r => '<tr>' + [0, 1, 2].map(col => `<td>${r * 3 + col === ask ? `<b>${s[ask]}</b>` : s[r * 3 + col]}</td>`).join('') + '</tr>').join('') + `</table><p>まん中は ${s[4]}、1列の和は ${s[4] * 3}。</p><p>3×3の魔方陣では「まん中 × 3 = 1列の和」で、まん中をはさんで向かい合う2つの数の和は、どれもまん中の2倍（${s[4] * 2}）になります。</p>`,
    });
  });
}

// ---------------------------------------------------------------------------
// 6. 数列
// ---------------------------------------------------------------------------
function sequences(n) {
  const fams = [
    () => { // 階差が等差
      const a = ri(1, 20), d = ri(1, 6), k = ri(1, 4); const s = [a]; for (let i = 0; i < 6; i++) s.push(s[i] + d + k * i);
      return { s, level: 3, rule: `となりとの差が ${d}, ${d + k}, ${d + 2 * k}, … と ${k} ずつ増えています。`, hint: 'となり合う数の差を書き出してみよう。' };
    },
    () => { // フィボナッチ型
      const a = ri(1, 9), b = ri(a, 15); const s = [a, b]; for (let i = 0; i < 5; i++) s.push(s[i] + s[i + 1]);
      return { s, level: 3, rule: '前の2つの数を足すと次の数になります。', hint: '差ではなく、となり合う2つの数の関係を見よう。' };
    },
    () => { // ×m +c
      const m = ri(2, 3), c = pick([-3, -2, -1, 1, 2, 3]), a = ri(1, 6); const s = [a]; for (let i = 0; i < 6; i++) s.push(s[i] * m + c);
      if (s.some(v => v <= 0)) return null;
      return { s, level: 3, rule: `前の数を ${m} 倍して ${c > 0 ? c + ' を足す' : -c + ' を引く'}と次の数になります。`, hint: `差がだいたい ${m} 倍ずつになっている。` };
    },
    () => { // +a, ×b を交互
      const p = ri(1, 5), m = ri(2, 3), a = ri(1, 5); const s = [a]; for (let i = 0; i < 6; i++) s.push(i % 2 ? s[i] * m : s[i] + p);
      return { s, level: 4, rule: `「${p} を足す」「${m} 倍する」を交互にくり返しています。`, hint: '2種類の操作が交互に行われている。' };
    },
    () => { // n² + c
      const st = ri(1, 6), c = ri(-5, 9); const s = []; for (let i = 0; i < 7; i++) s.push((st + i) ** 2 + c);
      if (s[0] <= 0 || c === 0) return null;
      return { s, level: 4, rule: `${st}², ${st + 1}², ${st + 2}², … に ${c > 0 ? c + ' を足した' : -c + ' を引いた'}数です。`, hint: '差は 3, 5, 7, … のような奇数の並び。何かの2乗に近い数では？' };
    },
    () => { // 2つの数列が交互
      const a = ri(1, 20), d = ri(2, 7), b = ri(20, 60), e = -ri(1, 5); const s = []; for (let i = 0; i < 4; i++) { s.push(a + d * i); s.push(b + e * i); }
      return { s: s.slice(0, 8), level: 4, rule: `1つおきに見ると、${a}, ${a + d}, … は ${d} ずつ増え、${b}, ${b + e}, … は ${-e} ずつ減っています。`, hint: '1つおきに見てみよう。' };
    },
    () => { // トリボナッチ
      const a = ri(1, 3), b = ri(1, 4), c = ri(2, 6); const s = [a, b, c]; for (let i = 0; i < 4; i++) s.push(s[i] + s[i + 1] + s[i + 2]);
      return { s, level: 4, rule: '前の3つの数を足すと次の数になります。', hint: '前の2つではなく…' };
    },
    () => { // n³ ± c
      const st = ri(1, 4), c = ri(-3, 3); const s = []; for (let i = 0; i < 6; i++) s.push((st + i) ** 3 + c);
      if (s[0] <= 0) return null;
      return { s, level: 4, rule: `${st}³, ${st + 1}³, … ${c ? `に ${c > 0 ? c + ' を足した' : -c + ' を引いた'}` : 'そのもの'}です。`, hint: 'どんどん大きくなる。何かの3乗に近い数では？' };
    },
    () => { // 差が倍々
      const a = ri(1, 10), d = ri(1, 3), m = ri(2, 3); const s = [a]; let x = d; for (let i = 0; i < 6; i++) { s.push(s[i] + x); x *= m; }
      return { s, level: 3, rule: `差が ${d}, ${d * m}, ${d * m * m}, … と ${m} 倍ずつになっています。`, hint: 'となり合う数の差を書き出してみよう。' };
    },
  ];
  return loop(n, 3000, () => {
    const r = pick(fams)(); if (!r || r.s.some(v => Math.abs(v) > 99999)) return false;
    const shown = r.s.slice(0, -1), ans = r.s[r.s.length - 1];
    return add('seq', shown.join('.'), {
      genre: 'math', level: r.level, title: '次に来る数は？',
      q: `<p class="big">${shown.join(', ')}, ?</p><p>ある規則で数が並んでいます。「?」に入る数は？</p>`,
      type: 'input', answer: [String(ans)],
      hints: [r.hint, r.rule],
      explain: `<p>${r.rule}</p><p>答えは <b>${ans}</b>。</p>`,
    });
  });
}

// ---------------------------------------------------------------------------
// 7. 累乗の一の位・下2けた
// ---------------------------------------------------------------------------
function powers(n) {
  return loop(n, 3000, () => {
    const two = R() < 0.45;
    const mod = two ? 100 : 10;
    const a = two ? pick([3, 7, 9, 11, 13, 17, 19, 21, 23, 29, 31, 33, 39, 41, 43, 49, 51, 57, 99]) : ri(2, 29);
    if (!two && [0, 1, 5, 6].includes(a % 10)) return false; // 一の位がすぐわかる数はのぞく
    const nn = ri(50, 2100);
    // 周期を求める（a^1 から）
    const vals = []; let v = 1, start = -1;
    for (let i = 1; i <= 40; i++) { v = (v * a) % mod; const j = vals.indexOf(v); if (j >= 0) { start = j; break; } vals.push(v); }
    const period = vals.length - start;
    const idx = nn <= vals.length ? nn - 1 : start + ((nn - 1 - start) % period);
    const ans = vals[idx];
    if (two && period > 20) return false;
    const fmt = x => (two ? String(x).padStart(2, '0') : String(x));
    return add('pow' + mod, `${a}^${nn}`, {
      genre: 'math', level: two ? (period > 10 ? 5 : period > 2 ? 4 : 3) : 3, title: two ? `${a}の${nn}乗の下2けた` : `${a}の${nn}乗の一の位`,
      q: `<p class="big">${a}${SUP(nn)}</p><p>この数の <b>${two ? '下2けた（十の位と一の位）' : '一の位'}</b> は？</p>`,
      type: 'input', answer: two ? [fmt(ans), String(ans)] : [String(ans)], exact: two, help: two ? '2けたで入力（例：07）' : '',
      hints: [`${a}¹, ${a}², ${a}³, … の${two ? '下2けた' : '一の位'}だけを計算して、くり返しを見つけよう。`, `${two ? '下2けた' : '一の位'}は ${vals.slice(start).map(fmt).join(' → ')} の ${period}個でくり返す${start ? `（最初の${start}個のあと）` : ''}。`],
      explain: `<p>${two ? '下2けた' : '一の位'}だけを追うと ${vals.map(fmt).join(', ')}, … と ${period}個でくり返します${start ? `（${start + 1}乗目から）` : ''}。</p><p>${nn}乗はそのくり返しの中で ${((nn - 1 - start) % period) + 1}番目なので <b>${fmt(ans)}</b>。</p>`,
    });
  });
}

// ---------------------------------------------------------------------------
// 8. 約数の個数・和 / 9. 階乗の末尾の0 / 10. 割り切れない数
// ---------------------------------------------------------------------------
function factorize(x) { const f = []; for (let p = 2; p * p <= x; p++) { let e = 0; while (x % p === 0) { x /= p; e++; } if (e) f.push([p, e]); } if (x > 1) f.push([x, 1]); return f; }
const fStr = f => f.map(([p, e]) => (e > 1 ? `${p}${SUP(e)}` : `${p}`)).join(' × ');
function divisors(n) {
  return loop(n, 3000, () => {
    const x = ri(60, 9999); const f = factorize(x);
    if (f.reduce((s, [, e]) => s + e, 0) < 4 || f.length < 2) return false;
    const cnt = f.reduce((s, [, e]) => s * (e + 1), 1);
    const sum = f.reduce((s, [p, e]) => s * ((p ** (e + 1) - 1) / (p - 1)), 1);
    const askSum = R() < 0.35;
    return add(askSum ? 'divsum' : 'divcnt', x, {
      genre: 'math', level: askSum ? 4 : 3, title: askSum ? `${x}の約数の和` : `${x}の約数はいくつ？`,
      q: `<p class="big">${x}</p><p>この数の約数（割り切れる正の整数。1と${x}自身もふくむ）${askSum ? 'を <b>全部足すと</b> いくつ？' : 'は <b>いくつ</b> ある？'}</p>`,
      type: 'input', answer: [String(askSum ? sum : cnt)], unit: askSum ? '' : '個',
      hints: ['まず素因数分解しよう。', `${x} = ${fStr(f)}`],
      explain: `<p>${x} = ${fStr(f)}</p>` + (askSum
        ? `<p>約数の和は、素因数ごとに (1 + p + p² + …) を作ってかけ合わせます：${f.map(([p, e]) => `(${Array.from({ length: e + 1 }, (_, i) => (i ? (i > 1 ? p + SUP(i) : p) : 1)).join('+')})`).join(' × ')} = <b>${sum}</b></p>`
        : `<p>約数の個数は、各素因数の「指数 + 1」をかけ合わせます：${f.map(([, e]) => e + 1).join(' × ')} = <b>${cnt}個</b></p>`),
    });
  });
}
function factorialZeros(n) {
  return loop(n, 3000, () => {
    const x = R() < 0.5 ? ri(30, 200) : ri(200, 3000);
    let z = 0, parts = []; for (let p = 5; p <= x; p *= 5) { const q = Math.floor(x / p); z += q; parts.push(`${x}÷${p} → ${q}`); }
    return add('zeros', x, {
      genre: 'math', level: x >= 625 ? 4 : 3, title: `${x}! の末尾の0`,
      q: `<p>${x}! = ${x} × ${x - 1} × … × 2 × 1</p><p>この数の <b>末尾に0</b> はいくつ並ぶ？</p>`,
      type: 'input', answer: [String(z)], unit: '個',
      hints: ['末尾の0は 2 × 5 から生まれる。5 が何回かかっているかを数えればよい。', '25 = 5², 125 = 5³ の倍数は、5を2個・3個ふくむ。'],
      explain: `<p>5の倍数・25の倍数・125の倍数…の個数を足します。</p><p>${parts.join('、')}</p><p>合計 <b>${z}個</b>。</p>`,
    });
  });
}
function notDivisible(n) {
  return loop(n, 3000, () => {
    const three = R() < 0.4;
    const N = pick([100, 200, 300, 500, 1000, 1200, 2000, 2026, 3000]);
    const ds = shuffle([2, 3, 4, 5, 6, 7, 9, 10, 11, 12]).slice(0, three ? 3 : 2).sort((a, b) => a - b);
    if (ds.some((d, i) => ds.some((e, j) => i !== j && e % d === 0))) return false; // 片方が片方の倍数はさける
    let cnt = 0; for (let i = 1; i <= N; i++) if (ds.every(d => i % d)) cnt++;
    const fl = d => Math.floor(N / d);
    const L = (...a) => a.reduce(lcm);
    const steps = three
      ? `${ds.map(d => `${d}の倍数 ${fl(d)}個`).join('、')}。2つの公倍数：${[[0, 1], [0, 2], [1, 2]].map(([i, j]) => `${L(ds[i], ds[j])}の倍数 ${fl(L(ds[i], ds[j]))}個`).join('、')}。3つの公倍数：${L(...ds)}の倍数 ${fl(L(...ds))}個。`
      : `${ds[0]}の倍数 ${fl(ds[0])}個、${ds[1]}の倍数 ${fl(ds[1])}個、両方（${L(...ds)}の倍数）${fl(L(...ds))}個。`;
    return add('notdiv', `${N}-${ds.join('.')}`, {
      genre: 'math', level: three ? 4 : 3, title: '割り切れない数',
      q: `<p>1 から ${N} までの整数のうち、<b>${ds.join('・')} のどれでも割り切れない</b> 数はいくつ？</p>`,
      type: 'input', answer: [String(cnt)], unit: '個',
      hints: ['「どれかで割り切れる数」を数えて、全体から引こう。', `${ds.join('と')}の公倍数は、${L(ds[0], ds[1])} の倍数${three ? ' など' : ''}。重なりを引きすぎ・足しすぎないように。`],
      explain: `<p>${steps}</p><p>どれかで割り切れる数は ${N - cnt}個なので、${N} − ${N - cnt} = <b>${cnt}個</b>。</p>`,
    });
  });
}

// ---------------------------------------------------------------------------
// 11. 時計
// ---------------------------------------------------------------------------
const mixed = f => { const w = Math.floor(f.n / f.d), r = f.n - w * f.d; return r ? (w ? `${w}と${r}/${f.d}` : `${r}/${f.d}`) : String(w); };
function clockAngle(n) {
  return loop(n, 2000, () => {
    const h = ri(1, 12), m = ri(1, 59);
    let a = Math.abs(30 * (h % 12) - 5.5 * m); if (a > 180) a = 360 - a;
    if (m % 5 === 0 && R() < 0.7) return false;
    return add('clock', `${h}:${m}`, {
      genre: 'shape', level: 3, title: `${h}時${m}分の角度`,
      q: `<p>時計が <b>${h}時${m}分</b> を指しています。</p><p>長針と短針がつくる <b>小さいほうの角度</b> は何度？</p>`,
      type: 'input', answer: [String(a)], unit: '度', help: '小数でもOK',
      hints: ['長針は1分で6度、短針は1分で0.5度動く。', `長針は12から ${6 * m}度、短針は12から ${30 * (h % 12) + 0.5 * m}度。`],
      explain: `<p>長針：6 × ${m} = ${6 * m}度、短針：30 × ${h % 12} + 0.5 × ${m} = ${30 * (h % 12) + 0.5 * m}度（どちらも12の位置から右回り）。</p><p>差は ${Math.abs(30 * (h % 12) + 0.5 * m - 6 * m) > 180 ? `${Math.abs(30 * (h % 12) + 0.5 * m - 6 * m)}度。小さいほうは 360 − ${Math.abs(30 * (h % 12) + 0.5 * m - 6 * m)} = ` : ''}<b>${a}度</b>。</p>`,
    });
  });
}
function clockEvents() {
  let made = 0;
  const kinds = [['重なる', [0]], ['一直線になる（反対向きにぴったり重なる）', [180]], ['直角になる', [90, 270]]];
  for (let h = 1; h <= 11; h++) for (const [name, angles] of kinds) {
    // 5.5m − 30h ≡ angle (mod 360) となる最初の 0 < m < 60
    let best = null;
    for (const ang of angles) for (let k = -2; k <= 3; k++) {
      const num = 2 * (30 * h + ang + 360 * k); const f = fr(num, 11); const v = f.n / f.d;
      if (v > 0 && v < 60 && (!best || v < best.n / best.d)) best = f;
    }
    if (!best) continue;
    const ans = `${h}時${mixed(best)}分`;
    const naiveAng = angles.map(a => fr(2 * (30 * h + a), 12)).find(f => f.n / f.d > 0 && f.n / f.d < 60) || fr(5 * h);
    const choices = [...new Set([ans, `${h}時${mixed(naiveAng)}分`, `${h}時${mixed(fr(best.n + best.d, best.d))}分`, `${h}時${mixed(fr(Math.max(1, best.n - best.d), best.d))}分`])];
    if (choices.length < 4) continue;
    const order = shuffle(choices);
    if (add('clockev', `${h}-${angles[0]}`, {
      genre: 'shape', level: 4, title: `${h}時のあと、針が${name.replace(/（.*）/, '')}のは？`,
      q: `<p>時計がちょうど <b>${h}時</b> を指しています。</p><p>このあと、長針と短針が初めて <b>${name}</b> のは何時何分？</p>`,
      type: 'choice', choices: order, answer: order.indexOf(ans),
      hints: ['長針は1分で6度、短針は1分で0.5度。長針は1分ごとに 5.5度ずつ短針に近づく（追いこす）。', `${h}時ちょうどのとき、長針は短針の ${30 * h}度うしろにいる。`],
      explain: `<p>${h}時ちょうど、長針は短針より ${30 * h}度うしろ。長針は1分に5.5度ずつ追いつきます。</p><p>必要な差を 5.5 でわると ${mixed(best)}分。答えは <b>${ans}</b>。</p><p>分が11分の1きざみになるのが、この種類の問題の特徴です。</p>`,
    })) made++;
  }
  return made;
}

// ---------------------------------------------------------------------------
// 12. 曜日
// ---------------------------------------------------------------------------
function weekdays(n) {
  return loop(n, 3000, () => {
    const cross = R() < 0.5;
    if (!cross) {
      const leap = R() < 0.4, w0 = ri(0, 6), mo = ri(2, 12), dd = ri(1, [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1]);
      const mdays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      const passed = mdays.slice(0, mo - 1).reduce((a, b) => a + b, 0) + dd - 1;
      const w = (w0 + passed) % 7;
      return add('week', `${leap ? 'L' : 'N'}${w0}-${mo}-${dd}`, {
        genre: 'logic', level: 3, title: `${mo}月${dd}日は何曜日？`,
        q: `<p>${leap ? 'うるう年' : 'うるう年ではない年'}の1月1日は <b>${WEEK[w0]}曜日</b> でした。</p><p>同じ年の <b>${mo}月${dd}日</b> は何曜日？</p>`,
        type: 'choice', choices: WEEK.map(x => x + '曜日'), answer: w,
        hints: ['1月1日から何日後かを計算して、7で割ったあまりを見よう。', `${mo}月${dd}日は1月1日の ${passed}日後。`],
        explain: `<p>1月1日から ${passed}日後。${passed} ÷ 7 = ${Math.floor(passed / 7)} あまり ${passed % 7} なので、${WEEK[w0]}曜日から ${passed % 7}つ進んで <b>${WEEK[w]}曜日</b>。</p>`,
      });
    }
    const y = ri(2027, 2130), mo = ri(1, 12), dd = ri(1, 28);
    const w = new Date(Date.UTC(y, mo - 1, dd)).getUTCDay();
    const over = y > 2100 || (y === 2100 && mo > 2);
    const days = Math.round((Date.UTC(y, mo - 1, dd) - Date.UTC(2026, 0, 1)) / 86400000);
    return add('weekx', `${y}-${mo}-${dd}`, {
      genre: 'logic', level: over ? 5 : 4, title: `${y}年${mo}月${dd}日は何曜日？`,
      q: `<p>2026年1月1日は <b>木曜日</b> です。</p><p><b>${y}年${mo}月${dd}日</b> は何曜日？</p>`,
      type: 'choice', choices: WEEK.map(x => x + '曜日'), answer: w,
      hints: ['1年（365日）たつと曜日は1つ進み、うるう年をまたぐと2つ進む。', over ? '2100年はうるう年ではないことに注意（100で割り切れて400で割り切れない）。' : '4で割り切れる年がうるう年（この範囲では例外なし）。'],
      explain: `<p>2026年1月1日から ${days}日後。${days} ÷ 7 のあまりは ${days % 7} なので、木曜日から ${days % 7}つ進んで <b>${WEEK[w]}曜日</b>。</p><p>年ごとに数えると「平年は1つ、うるう年をまたぐと2つ」ずつ曜日が進みます。</p>`,
    });
  });
}

// ---------------------------------------------------------------------------
// 13. n進数
// ---------------------------------------------------------------------------
function bases(n) {
  return loop(n, 3000, () => {
    const b = pick([2, 2, 3, 5, 8]);
    const toDec = R() < 0.5;
    const x = b === 2 ? ri(20, 255) : ri(20, 999);
    const s = x.toString(b);
    return add('base', `${b}-${toDec ? 'd' : 'b'}-${x}`, {
      genre: 'math', level: toDec ? 3 : (b === 2 ? 3 : 4), title: toDec ? `${b}進数を10進数に` : `${x}を${b}進数で`,
      q: toDec
        ? `<p>${b}進数で書かれた数</p><p class="big">${s}<sub>(${b})</sub></p><p>を、ふつうの10進数で表すと？</p>`
        : `<p>10進数の <b>${x}</b> を <b>${b}進数</b> で書くと？</p><p>（${b}進数では 0〜${b - 1} の数字だけを使い、${b}になったら1けた上がります）</p>`,
      type: 'input', answer: [toDec ? String(x) : s], exact: !toDec,
      hints: toDec ? [`${b}進数の各けたは、右から 1, ${b}, ${b * b}, ${b ** 3}, … の重みを持つ。`, `いちばん左のけたの重みは ${b ** (s.length - 1)}。`]
        : [`${b} で割ったあまりを、くり返し記録していこう（あまりを下から読む）。`, `いちばん上のけたの重みは ${b ** (s.length - 1)}。`],
      explain: `<p>${[...s].map((d, i) => `${d}×${b ** (s.length - 1 - i)}`).join(' + ')} = ${x}</p><p>答えは <b>${toDec ? x : s}</b>。</p>`,
    });
  });
}

// ---------------------------------------------------------------------------
// 14. 正直者とうそつき
// ---------------------------------------------------------------------------
function liars(n) {
  return loop(n, 20000, () => {
    const N = pick([4, 4, 5]);
    const P = LETTERS.slice(0, N);
    const others = s => [...Array(N).keys()].filter(i => i !== s);
    const st = [];
    for (let s = 0; s < N; s++) {
      const t = ri(0, 5), o = others(s);
      if (t === 0) { const x = pick(o); st.push({ txt: `${P[x]}はうそつきだ。`, f: A => !A[x] }); }
      else if (t === 1) { const x = pick(o); st.push({ txt: `${P[x]}は正直者だ。`, f: A => A[x] }); }
      else if (t === 2) { const [x, y] = shuffle(o).slice(0, 2).sort(); st.push({ txt: `${P[x]}と${P[y]}は同じ種類（2人とも正直者か、2人ともうそつき）だ。`, f: A => A[x] === A[y] }); }
      else if (t === 3) { const [x, y] = shuffle(o).slice(0, 2).sort(); st.push({ txt: `${P[x]}と${P[y]}のうち、ちょうど1人がうそつきだ。`, f: A => A[x] !== A[y] }); }
      else if (t === 4) { const k = ri(1, N - 1); st.push({ txt: `この${N}人の中に、正直者はちょうど${k}人いる。`, f: A => A.filter(Boolean).length === k }); }
      else { const k = ri(2, N - 1); st.push({ txt: `この${N}人の中に、うそつきは${k}人以上いる。`, f: A => A.filter(v => !v).length >= k }); }
    }
    const solsA = [];
    for (let m = 0; m < 1 << N; m++) { const A = [...Array(N).keys()].map(i => !!(m >> i & 1)); if (st.every((s, i) => s.f(A) === A[i])) solsA.push(A); }
    if (solsA.length !== 1) return false;
    const A = solsA[0]; const hon = P.split('').filter((_, i) => A[i]).join('');
    if (!hon.length || hon.length === N) return false;
    const kinds = new Set(st.map(s => s.txt.replace(/[A-E]|\d/g, '')));
    if (kinds.size < 3) return false;
    return add('liar', st.map(s => s.txt).join('|'), {
      genre: 'logic', level: N === 5 ? 5 : 4, title: `${N}人の正直者とうそつき`,
      q: `<p>${P.split('').join('・')} の${N}人は、それぞれ「いつも本当のことを言う正直者」か「いつもうそを言ううそつき」のどちらかです。</p><ul>${st.map((s, i) => `<li>${P[i]}「${s.txt}」</li>`).join('')}</ul><p><b>正直者を全員</b> 答えてください。</p>`,
      type: 'input', answer: [hon], set: true, help: `アルファベットで入力（例：${P.slice(0, 2)}）。順番は自由`,
      hints: ['だれか1人を「正直者」と仮定して、ほかの人がどうなるか追っていこう。矛盾したら、その人はうそつき。', `${P[A.indexOf(true)]}は正直者。`],
      explain: `<p>正直者は <b>${hon.split('').join('・')}</b>、うそつきは ${P.split('').filter((_, i) => !A[i]).join('・')}。</p><ul>${st.map((s, i) => `<li>${P[i]}（${A[i] ? '正直者' : 'うそつき'}）：「${s.txt}」は${s.f(A) ? '本当' : 'うそ'}</li>`).join('')}</ul><p>すべての発言が、話した人の種類と合っています。ほかの組み合わせでは必ずどこかで矛盾します。</p>`,
    });
  });
}

// ---------------------------------------------------------------------------
// 15. 順位当て
// ---------------------------------------------------------------------------
function perms(a) { if (a.length <= 1) return [a]; return a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p])); }
const ALLP = perms([0, 1, 2, 3, 4]); // ALLP[k][順位-1] = 人
function ranking(n) {
  return loop(n, 5000, () => {
    const sol = pick(ALLP); const pos = p => sol.indexOf(p); // 0始まり
    const P = LETTERS;
    const mk = () => {
      const t = ri(0, 4), x = ri(0, 4); let y = ri(0, 4); while (y === x) y = ri(0, 4);
      if (t === 0) return pos(x) < pos(y) ? { txt: `${P[x]}は${P[y]}より先にゴールした。`, f: s => s.indexOf(x) < s.indexOf(y) } : null;
      if (t === 1) { const k = ri(0, 4); return pos(x) !== k ? { txt: `${P[x]}は${k + 1}位ではなかった。`, f: s => s.indexOf(x) !== k } : null; }
      if (t === 2) return Math.abs(pos(x) - pos(y)) === 1 ? { txt: `${P[x]}と${P[y]}は順位がとなり合っていた。`, f: s => Math.abs(s.indexOf(x) - s.indexOf(y)) === 1 } : null;
      if (t === 3) { const g = Math.abs(pos(x) - pos(y)) - 1; return g >= 1 ? { txt: `${P[x]}と${P[y]}の間には、ちょうど${g}人いた。`, f: s => Math.abs(s.indexOf(x) - s.indexOf(y)) - 1 === g } : null; }
      return pos(x) === pos(y) + 1 ? { txt: `${P[x]}は${P[y]}のすぐ次にゴールした。`, f: s => s.indexOf(x) === s.indexOf(y) + 1 } : null;
    };
    let clues = [], tries = 0;
    const cnt = cs => ALLP.filter(s => cs.every(c => c.f(s))).length;
    while (cnt(clues) > 1 && tries++ < 200) { const c = mk(); if (c && !clues.some(d => d.txt === c.txt)) clues.push(c); }
    if (cnt(clues) !== 1) return false;
    for (const c of shuffle(clues)) { const rest = clues.filter(d => d !== c); if (cnt(rest) === 1) clues = rest; }
    if (clues.length < 4 || clues.length > 7) return false;
    const ask = ri(0, 4);
    return add('rank', clues.map(c => c.txt).sort().join('|'), {
      genre: 'logic', level: clues.length >= 6 ? 5 : 4, title: '5人のかけっこ',
      q: `<p>A・B・C・D・Eの5人がかけっこをしました（同着はありません）。</p><ul>${clues.map(c => `<li>${c.txt}</li>`).join('')}</ul><p><b>${ask + 1}位</b> はだれ？</p>`,
      type: 'choice', choices: ['A', 'B', 'C', 'D', 'E'], answer: sol[ask],
      hints: ['順位が強く決まる手がかり（「すぐ次」「間に◯人」など）から、5つのわくに当てはめてみよう。', `1位は${P[sol[0]]}。`],
      explain: `<p>順位は <b>${sol.map((p, i) => `${i + 1}位 ${P[p]}`).join('、')}</b>。</p><p>この並び方だけが、すべての手がかりに合います。</p>`,
    });
  });
}

// ---------------------------------------------------------------------------
// 16. サイコロの確率
// ---------------------------------------------------------------------------
function dice(n) {
  const all = k => { let r = [[]]; for (let i = 0; i < k; i++) r = r.flatMap(a => [1, 2, 3, 4, 5, 6].map(d => [...a, d])); return r; };
  const vars = [];
  for (let s = 3; s <= 11; s++) vars.push({ k: 2, key: `sum2-${s}`, txt: `2つの目の和が <b>${s}</b> になる`, f: a => a[0] + a[1] === s, lv: 3 });
  for (let s = 5; s <= 16; s++) vars.push({ k: 3, key: `sum3-${s}`, txt: `3つの目の和が <b>${s}</b> になる`, f: a => a[0] + a[1] + a[2] === s, lv: 4 });
  for (let k = 2; k <= 4; k++) vars.push({ k, key: `six-${k}`, txt: `少なくとも1つは <b>6</b> が出る`, f: a => a.includes(6), lv: k === 2 ? 3 : 4 });
  for (let d = 1; d <= 4; d++) vars.push({ k: 2, key: `diff-${d}`, txt: `2つの目の差が <b>${d}</b> になる`, f: a => Math.abs(a[0] - a[1]) === d, lv: 3 });
  vars.push({ k: 3, key: 'all-diff', txt: '3つとも <b>ちがう目</b> が出る', f: a => new Set(a).size === 3, lv: 3 });
  vars.push({ k: 3, key: 'prod-even', txt: '3つの目の積が <b>偶数</b> になる', f: a => a.some(x => x % 2 === 0), lv: 3 });
  vars.push({ k: 2, key: 'prod-mul4', txt: '2つの目の積が <b>4の倍数</b> になる', f: a => (a[0] * a[1]) % 4 === 0, lv: 4 });
  vars.push({ k: 3, key: 'sorted', txt: '出た目が <b>A &lt; B &lt; C</b>（Aの目よりBの目、Bの目よりCの目が大きい）になる', f: a => a[0] < a[1] && a[1] < a[2], lv: 4 });
  vars.push({ k: 4, key: 'all-diff4', txt: '4つとも <b>ちがう目</b> が出る', f: a => new Set(a).size === 4, lv: 4 });
  let made = 0;
  for (const v of shuffle(vars).slice(0, n)) {
    const A = all(v.k), hit = A.filter(v.f).length, f = fr(hit, A.length);
    const names = ['A', 'B', 'C', 'D'].slice(0, v.k).join('・');
    if (add('dice', v.key, {
      genre: 'math', level: v.lv, title: `サイコロ${v.k}つの確率`,
      q: `<p>サイコロを${v.k}つ（${names}）同時にふります。</p><p>${v.txt}確率は？</p>`,
      type: 'input', answer: [frStr(f)], help: '分数で入力（例：1/6）',
      hints: [`目の出方は全部で 6${SUP(v.k)} = ${A.length}通り。`, v.key.startsWith('six') || v.key === 'prod-even' ? '「そうならない」場合を数えて、全体から引くと楽。' : '条件に合う目の組み合わせを、もれなく数えよう。'],
      explain: `<p>全部で ${A.length}通りのうち、条件に合うのは ${hit}通り。</p><p>${hit}/${A.length} = <b>${frStr(f)}</b></p>`,
    })) made++;
  }
  return made;
}

// ---------------------------------------------------------------------------
// 17. 図形の数え上げ（正方形・長方形）と最短経路
// ---------------------------------------------------------------------------
function gridCount(n) {
  return loop(n, 2000, () => {
    const m = ri(3, 10), k = ri(m, 12), rect = R() < 0.45;
    let sq = 0; for (let s = 1; s <= m; s++) sq += (m - s + 1) * (k - s + 1);
    const re = (m * (m + 1) / 2) * (k * (k + 1) / 2);
    return add(rect ? 'rects' : 'squares', `${m}x${k}`, {
      genre: 'shape', level: rect ? 4 : 3, title: rect ? `${m}×${k}の長方形` : `${m}×${k}の正方形`,
      q: `<p>たて <b>${m}マス</b>、よこ <b>${k}マス</b> の方眼があります。</p><p>方眼の線でかこまれた <b>${rect ? '長方形（正方形もふくむ）' : '正方形'}</b> は、大きさをすべて合わせていくつある？</p>`,
      type: 'input', answer: [String(rect ? re : sq)], unit: '個',
      hints: rect ? ['長方形は「たての線を2本」「よこの線を2本」選ぶと1つ決まる。', `たての線は ${k + 1}本、よこの線は ${m + 1}本。`] : ['1×1, 2×2, 3×3, … の大きさごとに数えて足そう。', `s×s の正方形は (${m + 1} − s) × (${k + 1} − s) 個ある。`],
      explain: rect ? `<p>よこの線 ${m + 1}本から2本、たての線 ${k + 1}本から2本選ぶので、${m * (m + 1) / 2} × ${k * (k + 1) / 2} = <b>${re}個</b>。</p>`
        : `<p>${Array.from({ length: m }, (_, i) => `${(m - i) * (k - i)}`).join(' + ')} = <b>${sq}個</b>。</p>`,
    });
  });
}
function paths(n) {
  return loop(n, 3000, () => {
    const w = ri(3, 6), h = ri(2, 5), mode = pick(['block', 'block', 'via', 'block2']);
    const pts = []; for (let x = 0; x <= w; x++) for (let y = 0; y <= h; y++) if (!(x === 0 && y === 0) && !(x === w && y === h)) pts.push([x, y]);
    const sp = shuffle(pts).slice(0, mode === 'block2' ? 2 : 1);
    const count = (blocked, via) => {
      const f = (fx, fy, tx, ty) => { const dp = {}; for (let x = fx; x <= tx; x++) for (let y = fy; y <= ty; y++) { const k = `${x},${y}`; if (blocked.some(([a, b]) => a === x && b === y)) { dp[k] = 0; continue; } dp[k] = x === fx && y === fy ? 1 : (dp[`${x - 1},${y}`] || 0) + (dp[`${x},${y - 1}`] || 0); } return dp[`${tx},${ty}`] || 0; };
      return via ? f(0, 0, via[0], via[1]) * f(via[0], via[1], w, h) : f(0, 0, w, h);
    };
    const ans = mode === 'via' ? count([], sp[0]) : count(sp, null);
    const total = count([], null);
    if (ans <= 1 || ans === total) return false;
    const S = 34, ox = 20, oy = 16, W = w * S + ox * 2, H = h * S + oy * 2 + 8;
    const X = x => ox + x * S, Y = y => oy + (h - y) * S;
    let svg = `<svg viewBox="0 0 ${W} ${H}" width="${Math.min(W, 300)}" aria-label="たて${h}よこ${w}の道"><g stroke="currentColor" stroke-width="2" stroke-linecap="round">`;
    for (let x = 0; x <= w; x++) svg += `<line x1="${X(x)}" y1="${Y(0)}" x2="${X(x)}" y2="${Y(h)}"/>`;
    for (let y = 0; y <= h; y++) svg += `<line x1="${X(0)}" y1="${Y(y)}" x2="${X(w)}" y2="${Y(y)}"/>`;
    svg += '</g>';
    for (const [x, y] of sp) svg += mode === 'via'
      ? `<circle cx="${X(x)}" cy="${Y(y)}" r="7" fill="var(--accent)"/>`
      : `<g stroke="var(--accent)" stroke-width="4" stroke-linecap="round"><line x1="${X(x) - 7}" y1="${Y(y) - 7}" x2="${X(x) + 7}" y2="${Y(y) + 7}"/><line x1="${X(x) + 7}" y1="${Y(y) - 7}" x2="${X(x) - 7}" y2="${Y(y) + 7}"/></g>`;
    svg += `<circle cx="${X(0)}" cy="${Y(0)}" r="6" fill="currentColor"/><circle cx="${X(w)}" cy="${Y(h)}" r="6" fill="currentColor"/>`;
    svg += `<text x="${X(0)}" y="${Y(0) + 20}" font-size="13" text-anchor="middle" fill="currentColor">S</text><text x="${X(w)}" y="${Y(h) - 9}" font-size="13" text-anchor="middle" fill="currentColor">G</text></svg>`;
    return add('path', `${w}x${h}-${mode}-${sp.map(p => p.join('.')).join('_')}`, {
      genre: 'shape', level: 4, title: '最短の道は何通り？',
      q: `${svg}<p>左下の <b>S</b> から右上の <b>G</b> まで、道にそって <b>右か上にだけ</b> 進んで行きます。</p><p>${mode === 'via' ? '<b>●の交差点を必ず通る</b>' : `<b>×の交差点${sp.length > 1 ? '（2か所）' : ''}は通れない</b>`}とき、行き方は何通り？</p>`,
      type: 'input', answer: [String(ans)], unit: '通り',
      hints: ['各交差点に「そこまでの行き方の数」を書きこんでいこう。左の数と下の数を足すと、その交差点の数になる。', mode === 'via' ? '「Sから●まで」と「●からGまで」に分けて、かけ算する。' : `×がなければ全部で ${total}通り。×の交差点は 0 と書く。`],
      explain: `<p>交差点ごとに「左から来る数 + 下から来る数」を書きこんでいくと、Gには <b>${ans}</b> が入ります。</p>` + (mode === 'via' ? `<p>（S→● の行き方 × ●→G の行き方 でも計算できます）</p>` : `<p>（×がなければ ${total}通り）</p>`),
    });
  });
}

// ---------------------------------------------------------------------------
// 18. 数字の数え上げ
// ---------------------------------------------------------------------------
function digitCount(n) {
  return loop(n, 3000, () => {
    const rev = R() < 0.5;
    if (rev) {
      const N = ri(120, 3000); let T = 0; for (let i = 1; i <= N; i++) T += String(i).length;
      return add('pages', N, {
        genre: 'math', level: N >= 1000 ? 4 : 3, title: 'ページ番号の数字',
        q: `<p>本のページに1から順に番号をふったところ、使った数字は全部で <b>${T}個</b> でした。（「12」なら数字2個と数える）</p><p>この本は何ページ？</p>`,
        type: 'input', answer: [String(N)], unit: 'ページ',
        hints: ['1けた・2けた・3けたのページで、それぞれ何個の数字を使うか考えよう。', '1〜9で9個、10〜99で180個、100〜999で2700個。'],
        explain: N < 1000 ? `<p>1〜99で 9 + 180 = 189個。残り ${T - 189}個 ÷ 3 = ${(T - 189) / 3}ページが3けた。</p><p>99 + ${(T - 189) / 3} = <b>${N}ページ</b>。</p>` : `<p>1〜999で 9 + 180 + 2700 = 2889個。残り ${T - 2889}個 ÷ 4 = ${(T - 2889) / 4}ページが4けた。</p><p>999 + ${(T - 2889) / 4} = <b>${N}ページ</b>。</p>`,
      });
    }
    const N = ri(100, 2500), d = ri(1, 9);
    let c = 0; for (let i = 1; i <= N; i++) for (const ch of String(i)) if (ch === String(d)) c++;
    return add('digitcnt', `${N}-${d}`, {
      genre: 'math', level: 4, title: `数字「${d}」は何回？`,
      q: `<p>1 から ${N} までの整数をすべて書き並べます。</p><p>数字の <b>「${d}」</b> は全部で何回出てくる？</p>`,
      type: 'input', answer: [String(c)], unit: '回',
      hints: ['一の位・十の位・百の位…と、位ごとに別々に数えよう。', `0〜999 なら、どの位にも「${d}」は100回ずつ出てくる。`],
      explain: `<p>位ごとに数えると合計 <b>${c}回</b>。</p><p>コツ：0〜999 の1000個を3けたで書くと、各位に0〜9が100回ずつ出るので、どの数字も300回。そこから ${N} までの部分を調整します。</p>`,
    });
  });
}

// ---------------------------------------------------------------------------
// 実行
// ---------------------------------------------------------------------------
const report = {};
report.make = makeN();
report.ops = opsPuzzle(60);
report.crypt = cryptarithm(55);
report.holesAdd = holes(40, 'add');
report.holesMul = holes(35, 'mul');
report.magic = magic(45);
report.seq = sequences(80);
report.pow = powers(60);
report.div = divisors(50);
report.zeros = factorialZeros(30);
report.notdiv = notDivisible(40);
report.clock = clockAngle(35);
report.clockev = clockEvents();
report.week = weekdays(50);
report.base = bases(40);
report.liar = liars(70);
report.rank = ranking(70);
report.dice = dice(40);
report.grid = gridCount(40);
report.path = paths(55);
report.digit = digitCount(45);

const header = '// このファイルは tools/generate.mjs が自動で作ります。手で書きかえないでください。\n';
writeFileSync(new URL('../generated.js', import.meta.url), header + 'const GENERATED = ' + JSON.stringify(out) + ';\n');
const lv = {}; out.forEach(p => (lv[p.level] = (lv[p.level] || 0) + 1));
console.log(JSON.stringify(report), 'total', out.length, 'levels', JSON.stringify(lv));
