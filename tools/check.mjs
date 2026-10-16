// 全問題の検査。問題を追加・変更したら実行する。
//   node tools/check.mjs
// - IDの重複、必要な項目のぬけ
// - 正解として登録した答えが、答え合わせで本当に正解になるか
// - 式の問題は、解説の式が正解になるか
// - 2年分の出題スケジュール
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = vm.createContext({ console });
for (const f of ['problems.js', 'generated.js', 'core.js']) vm.runInContext(readFileSync(new URL('../' + f, import.meta.url), 'utf8'), ctx, { filename: f });
const g = code => vm.runInContext(code, ctx);
const ALL = g('ALL_PROBLEMS'), GENRES = g('GENRES'), checkAnswer = g('checkAnswer');

const errors = [];
const err = (p, msg) => errors.push(`${p.id}: ${msg}`);
const ids = new Set();
for (const p of ALL) {
  if (ids.has(p.id)) err(p, 'IDが重複'); ids.add(p.id);
  if (!GENRES[p.genre]) err(p, 'genre が不正');
  if (!(p.level >= 1 && p.level <= 5)) err(p, 'level が不正');
  for (const k of ['title', 'q', 'explain']) if (!p[k]) err(p, k + ' がない');
  if (!Array.isArray(p.hints) || !p.hints.length) err(p, 'hints がない');
  for (const k of ['q', 'explain', ...p.hints.map((_, i) => i)]) {
    const s = typeof k === 'number' ? p.hints[k] : p[k];
    for (const t of ['b', 'p', 'li', 'ul', 'ol', 'table', 'svg'])
      if ((s.match(new RegExp(`<${t}[ >]`, 'g')) || []).length !== (s.match(new RegExp(`</${t}>`, 'g')) || []).length) err(p, `${k} の <${t}> が閉じていない`);
  }
  if (p.type === 'choice') {
    if (!(Number.isInteger(p.answer) && p.answer >= 0 && p.answer < p.choices.length)) err(p, '選択肢の正解番号が不正');
    if (new Set(p.choices).size !== p.choices.length) err(p, '選択肢が重複');
    if (!checkAnswer(p, String(p.answer)).ok) err(p, '正解の選択肢が正解にならない');
    if (p.choices.length > 1 && checkAnswer(p, String((p.answer + 1) % p.choices.length)).ok) err(p, 'ちがう選択肢が正解になる');
  } else if (p.type === 'expr') {
    const m = p.explain.match(/<b>(.+?) = (-?\d+)<\/b>/);
    if (!m) err(p, '解説に式の例がない');
    else if (!checkAnswer(p, m[1]).ok) err(p, `解説の式 ${m[1]} が正解にならない`);
  } else if (p.type === 'input') {
    if (!Array.isArray(p.answer) || !p.answer.length) err(p, 'answer がない');
    for (const a of p.answer) {
      if (!checkAnswer(p, a).ok) err(p, `答え「${a}」が正解にならない`);
      if (p.unit && !p.set && !checkAnswer(p, a + p.unit).ok) err(p, `答え「${a}${p.unit}」が正解にならない`);
    }
    if (checkAnswer(p, 'zzzz').ok) err(p, 'でたらめな答えが正解になる');
  } else err(p, 'type が不正');
}

// 出題スケジュール（きょうから2年分）
const sched = g(`(() => {
  const out = []; const t = new Date(2026, 9, 14);
  for (let i = 0; i < 730; i++) { const d = addDays(t, i); out.push([keyOf(d), normalFor(d).id, hardFor(d).id]); }
  return out;
})()`);
const used = new Set(); let prev = null;
for (const [day, a, b] of sched) {
  if (!a || !b) errors.push(`${day}: 問題が決まらない`);
  if (a === b) errors.push(`${day}: ふつうと難問が同じ`);
  if (prev && (prev[1] === a || prev[2] === b)) errors.push(`${day}: 前日と同じ問題`);
  used.add(a); used.add(b); prev = [day, a, b];
}
const pools = g('POOLS');
const sizes = Object.fromEntries(Object.entries(pools).map(([k, v]) => [k, v.length]));
const general = ALL.filter(p => !p.date && !p.month);
const unused = general.filter(p => !used.has(p.id)).length;

console.log(`問題数 ${ALL.length}（手作り ${g('PROBLEMS.length')} / 自動生成 ${g('GENERATED.length')}）`);
console.log('出題プール', JSON.stringify(sizes));
console.log(`2年間で一度も出ない問題 ${unused}問（プールが2年より長いものは正常）`);
if (errors.length) { console.log(`\nエラー ${errors.length}件`); errors.slice(0, 50).forEach(e => console.log(' - ' + e)); process.exit(1); }
console.log('エラーなし');
