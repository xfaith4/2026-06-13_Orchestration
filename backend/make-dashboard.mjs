/**
 * Generates a standalone HTML/JS dashboard from the roadmap bake-off results.json.
 * Self-contained: data inlined, charts hand-rendered in vanilla JS (no CDN).
 * Usage: node make-dashboard.mjs [resultsPath] [outPath]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS = process.argv[2] || path.join(__dirname, '.bakeoff-roadmap', 'results.json');
const OUT = process.argv[3] || path.join(__dirname, '.bakeoff-roadmap', 'dashboard.html');

const data = JSON.parse(fs.readFileSync(RESULTS, 'utf8'));
const stampedAt = new Date().toISOString();

// Augment each arm with quality-DEPTH metrics by scanning its produced files,
// so the dashboard shows test coverage & error density — not just a binary gate
// that rewards the arm which attempted the least.
const resultsDir = path.dirname(RESULTS);
function scanQuality(arm) {
  const root = path.join(resultsDir, arm, 'src');
  let testFiles = 0, assertions = 0, srcLines = 0;
  const walk = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.ts')) {
        const c = fs.readFileSync(p, 'utf8');
        srcLines += c.split('\n').length;
        if (e.name.endsWith('.test.ts')) { testFiles++; assertions += (c.match(/expect\(/g) || []).length; }
      }
    }
  };
  walk(root);
  return { testFiles, assertions, srcLines };
}
for (const name of Object.keys(data.arms)) {
  const a = data.arms[name];
  // Prefer quality-depth written by the harness; fall back to scanning the dir if absent.
  if (a.assertions == null || a.testFiles == null) Object.assign(a, scanQuality(name));
}

const HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Model-Routing Bake-off — ${data.goal}</title>
<style>
  :root{
    --bg:#0d1117; --panel:#161b22; --panel2:#1c2330; --line:#30363d;
    --txt:#e6edf3; --muted:#8b949e;
    --haiku:#2dd4bf; --sonnet:#60a5fa; --opus:#c084fc; --repair:#f0a868;
    --pass:#3fb950; --fail:#f85149; --accent:#58a6ff;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--txt);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
  .wrap{max-width:1200px;margin:0 auto;padding:32px 24px 80px}
  h1{font-size:24px;margin:0 0 4px} h2{font-size:16px;margin:36px 0 14px;color:var(--accent);border-bottom:1px solid var(--line);padding-bottom:6px}
  .sub{color:var(--muted);margin:0 0 8px}
  .caveat{background:#1f2937;border-left:3px solid var(--repair);padding:10px 14px;border-radius:4px;color:#cbd5e1;font-size:13px;margin:14px 0}
  .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:18px}
  .card h3{margin:0 0 12px;font-size:15px;display:flex;align-items:center;gap:8px}
  .dot{width:10px;height:10px;border-radius:50%;display:inline-block}
  .metric{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed #222b36}
  .metric:last-child{border-bottom:0}
  .metric .k{color:var(--muted)} .metric .v{font-variant-numeric:tabular-nums;font-weight:600}
  .pill{padding:1px 8px;border-radius:999px;font-size:12px;font-weight:700}
  .pass{background:rgba(63,185,80,.15);color:var(--pass)} .fail{background:rgba(248,81,73,.15);color:var(--fail)}
  .panel{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:18px;margin-bottom:18px}
  .bar-row{display:flex;align-items:center;gap:10px;margin:7px 0}
  .bar-row .lbl{width:130px;color:var(--muted);font-size:13px;text-align:right;flex:none}
  .track{flex:1;background:#0b0f14;border-radius:5px;overflow:hidden;display:flex;height:22px}
  .seg{height:100%}
  .bar-row .val{width:120px;font-variant-numeric:tabular-nums;font-size:13px;flex:none}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--line)}
  th{color:var(--muted);font-weight:600} td.num{text-align:right;font-variant-numeric:tabular-nums}
  .legend{display:flex;gap:16px;flex-wrap:wrap;margin:6px 0 14px;color:var(--muted);font-size:12px}
  .legend span{display:inline-flex;align-items:center;gap:6px}
  .agentbar{display:inline-flex;height:14px;border-radius:3px;margin-right:2px}
  .winner{outline:2px solid var(--pass)}
  details{margin-top:8px} summary{cursor:pointer;color:var(--accent)}
  .mini{color:var(--muted);font-size:12px}
</style>
</head>
<body>
<div class="wrap">
  <h1>Model-Routing Bake-off</h1>
  <p class="sub">${data.goal} · generated ${stampedAt}</p>
  <div class="caveat" id="caveat"></div>

  <div class="cards" id="cards"></div>

  <h2>Quality depth <span class="mini">(test assertions vs. unresolved errors — the real story behind pass/fail)</span></h2>
  <div class="panel">
    <div class="legend"><span><span class="dot" style="background:#3fb950"></span>test assertions (coverage attempted)</span><span><span class="dot" style="background:#f85149"></span>final tsc errors (unresolved)</span></div>
    <div id="qualChart"></div>
    <table id="qualTable" style="margin-top:14px"><thead><tr><th>Arm</th><th class="num">Files</th><th class="num">Src lines</th><th class="num">Test files</th><th class="num">Assertions</th><th class="num">Final errors</th><th>tsc</th><th>vitest</th></tr></thead><tbody></tbody></table>
  </div>

  <h2>Total cost by arm <span class="mini">(stacked by model)</span></h2>
  <div class="panel"><div class="legend" id="legend1"></div><div id="costChart"></div></div>

  <h2>Duration per phase</h2>
  <div class="panel" id="phaseChart"></div>

  <h2>Output tokens by arm <span class="mini">(stacked by model)</span></h2>
  <div class="panel"><div id="tokChart"></div></div>

  <h2>Agent cast (multi-agent arms)</h2>
  <div class="panel" id="agentChart"></div>

  <h2>Cost breakdown by model</h2>
  <div class="panel"><table id="costTable"><thead><tr><th>Arm</th><th>Model</th><th class="num">Calls</th><th class="num">In tok</th><th class="num">Out tok</th><th class="num">Cost</th></tr></thead><tbody></tbody></table></div>

  <h2>Per-phase detail</h2>
  <div id="phaseTables"></div>
</div>

<script>
const DATA = ${JSON.stringify(data)};
const STAMP = ${JSON.stringify(stampedAt)};
const MODEL_COLOR = {};
const COLORS = { haiku:'#2dd4bf', sonnet:'#60a5fa', opus:'#c084fc' };
const armNames = Object.keys(DATA.arms);
const ARM_DOT = { 'uniform-haiku':'#2dd4bf', 'tiered':'#60a5fa', 'single-opus':'#c084fc' };
const shortModel = m => m.split('-')[1];
const colorFor = m => COLORS[shortModel(m)] || '#888';
const fmt$ = n => '$'+n.toFixed(3);
const fmtN = n => n.toLocaleString();
const el = (t,c,h)=>{const e=document.createElement(t); if(c)e.className=c; if(h!=null)e.innerHTML=h; return e;};

function tokTotals(arm){let i=0,o=0;for(const m in arm.byModel){i+=arm.byModel[m].in;o+=arm.byModel[m].out;}return{i,o};}

// caveat
document.getElementById('caveat').innerHTML =
  '<b>Scope & method:</b> n='+DATA.generatedFromSamples+' sample per arm (directional, not statistical). '+
  'Bounded to the roadmap\\'s own "First Build Slice" (8-item skeleton) as a strict-TS + vitest library; '+
  'the full roadmap was given to every arm\\'s planner. tsc/vitest run by the production validator; repair is tsc-only, capped at 2 attempts/phase. '+
  '<br><b>Read pass/fail with care:</b> the binary gate rewards the arm that attempts the least. Weigh it against '+
  '<i>test depth</i> (assertions) and <i>error density</i> below — an arm can "pass" with very shallow tests while another "fails" by a few trivial errors despite far deeper coverage.';

// summary cards
const cards = document.getElementById('cards');
let bestCost=Infinity, bestArm=null;
for(const name of armNames){const a=DATA.arms[name]; if(a.tscPassedFinal && a.vitestPassedFinal && a.totalCost<bestCost){bestCost=a.totalCost;bestArm=name;}}
for(const name of armNames){
  const a=DATA.arms[name]; const t=tokTotals(a);
  const card=el('div','card'+(name===bestArm?' winner':''));
  card.appendChild(el('h3',null,'<span class="dot" style="background:'+(ARM_DOT[name]||'#888')+'"></span>'+name+(name===bestArm?' &#127942;':'')));
  const rows=[
    ['Total cost', fmt$(a.totalCost)],
    ['Duration', (a.durationMs/1000).toFixed(0)+'s'],
    ['Tokens (in / out)', fmtN(t.i)+' / '+fmtN(t.o)],
    ['Phases / tasks', a.phaseCount+' / '+a.taskCount],
    ['Files / source lines', a.filesWritten+' / '+fmtN(a.srcLines||0)],
    ['Test files / assertions', (a.testFiles||0)+' / '+(a.assertions||0)],
    ['Final tsc errors', a.totalErrorsFinal],
    ['tsc', '<span class="pill '+(a.tscPassedFinal?'pass':'fail')+'">'+(a.tscPassedFinal?'PASS':'FAIL')+'</span>'],
    ['vitest', '<span class="pill '+(a.vitestPassedFinal?'pass':'fail')+'">'+(a.vitestPassedFinal?'PASS':'FAIL')+'</span>'],
  ];
  for(const [k,v] of rows){const m=el('div','metric'); m.appendChild(el('span','k',k)); m.appendChild(el('span','v',v)); card.appendChild(m);}
  cards.appendChild(card);
}

// quality depth: assertions (green) vs final errors (red), two bars per arm
const qualChart=document.getElementById('qualChart');
const maxAssert=Math.max(1,...armNames.map(n=>DATA.arms[n].assertions||0));
const maxErr=Math.max(1,...armNames.map(n=>DATA.arms[n].totalErrorsFinal||0));
for(const name of armNames){const a=DATA.arms[name];
  const r1=el('div','bar-row'); r1.appendChild(el('div','lbl',name));
  const tr=el('div','track'); const s=el('div','seg'); s.style.background='#3fb950'; s.style.width=(100*(a.assertions||0)/maxAssert)+'%'; s.title=(a.assertions||0)+' assertions'; tr.appendChild(s);
  r1.appendChild(tr); r1.appendChild(el('div','val',(a.assertions||0)+' assert · '+(a.totalErrorsFinal||0)+' err'));
  qualChart.appendChild(r1);
  const r2=el('div','bar-row'); r2.appendChild(el('div','lbl',''));
  const tr2=el('div','track'); tr2.style.height='10px'; const s2=el('div','seg'); s2.style.background='#f85149'; s2.style.width=(100*(a.totalErrorsFinal||0)/maxErr)+'%'; s2.title=(a.totalErrorsFinal||0)+' final tsc errors'; tr2.appendChild(s2);
  r2.appendChild(tr2); r2.appendChild(el('div','val',''));
  qualChart.appendChild(r2);
}
const qtb=document.querySelector('#qualTable tbody');
for(const name of armNames){const a=DATA.arms[name]; const tr=el('tr');
  tr.appendChild(el('td',null,'<b>'+name+'</b>'));
  tr.appendChild(el('td','num',a.filesWritten));
  tr.appendChild(el('td','num',fmtN(a.srcLines||0)));
  tr.appendChild(el('td','num',a.testFiles||0));
  tr.appendChild(el('td','num',a.assertions||0));
  tr.appendChild(el('td','num',a.totalErrorsFinal));
  tr.appendChild(el('td',null,a.tscPassedFinal?'<span class="pill pass">PASS</span>':'<span class="pill fail">FAIL</span>'));
  tr.appendChild(el('td',null,a.vitestPassedFinal?'<span class="pill pass">PASS</span>':'<span class="pill fail">FAIL</span>'));
  qtb.appendChild(tr);
}

// legend
const legend=document.getElementById('legend1');
for(const m of ['haiku','sonnet','opus']) legend.appendChild(el('span',null,'<span class="dot" style="background:'+COLORS[m]+'"></span>'+m));

// stacked bar helper
function stackedRow(label, segments, valText, maxTotal){
  const row=el('div','bar-row'); row.appendChild(el('div','lbl',label));
  const track=el('div','track');
  for(const s of segments){ if(s.value<=0) continue; const seg=el('div','seg'); seg.style.background=s.color; seg.style.width=(100*s.value/maxTotal)+'%'; seg.title=s.title; track.appendChild(seg);}
  row.appendChild(track); row.appendChild(el('div','val',valText)); return row;
}

// cost chart
const costChart=document.getElementById('costChart');
const maxCost=Math.max(...armNames.map(n=>DATA.arms[n].totalCost));
for(const name of armNames){const a=DATA.arms[name];
  const segs=Object.entries(a.byModel).map(([m,e])=>({value:e.cost,color:colorFor(m),title:shortModel(m)+' '+fmt$(e.cost)}));
  costChart.appendChild(stackedRow(name, segs, fmt$(a.totalCost), maxCost));
}

// token chart (output tokens stacked by model)
const tokChart=document.getElementById('tokChart');
const maxOut=Math.max(...armNames.map(n=>tokTotals(DATA.arms[n]).o));
for(const name of armNames){const a=DATA.arms[name];
  const segs=Object.entries(a.byModel).map(([m,e])=>({value:e.out,color:colorFor(m),title:shortModel(m)+' '+fmtN(e.out)+' out'}));
  tokChart.appendChild(stackedRow(name, segs, fmtN(tokTotals(a).o)+' out', maxOut));
}

// duration per phase (grouped: a sub-section per arm)
const phaseChart=document.getElementById('phaseChart');
const allPhaseDur=[]; for(const n of armNames) for(const p of DATA.arms[n].phases) allPhaseDur.push(p.durationMs);
const maxPhase=Math.max(1,...allPhaseDur);
for(const name of armNames){const a=DATA.arms[name];
  phaseChart.appendChild(el('div',null,'<b style="color:'+(ARM_DOT[name]||'#888')+'">'+name+'</b> <span class="mini">'+(a.durationMs/1000).toFixed(0)+'s total</span>'));
  for(const p of a.phases){
    const row=el('div','bar-row'); row.appendChild(el('div','lbl',p.name.slice(0,22)));
    const track=el('div','track'); const seg=el('div','seg');
    seg.style.background=ARM_DOT[name]||'#888'; seg.style.width=(100*p.durationMs/maxPhase)+'%';
    seg.title=p.name+' '+(p.durationMs/1000).toFixed(1)+'s'; track.appendChild(seg); row.appendChild(track);
    const rep=p.repairAttempts?(' &#128295;'+p.repairAttempts):''; const tsc=p.tscPassed?'<span style="color:var(--pass)">&#10003;</span>':'<span style="color:var(--fail)">&#10007;</span>';
    row.appendChild(el('div','val',(p.durationMs/1000).toFixed(1)+'s '+tsc+rep));
    phaseChart.appendChild(row);
  }
}

// agent cast histogram
const agentChart=document.getElementById('agentChart');
const AG_COLOR={architect:'#f0a868',engineer:'#60a5fa',test:'#3fb950',critic:'#c084fc','opus-solo':'#c084fc',repair:'#f85149',planner:'#8b949e'};
for(const name of armNames){const a=DATA.arms[name];
  const hist=a.agentHistogram||{}; const total=Object.values(hist).reduce((s,v)=>s+v,0);
  if(total===0){continue;}
  const row=el('div','bar-row'); row.appendChild(el('div','lbl',name));
  const track=el('div','track');
  for(const [ag,n] of Object.entries(hist)){const seg=el('div','seg');seg.style.background=AG_COLOR[ag]||'#888';seg.style.width=(100*n/total)+'%';seg.title=ag+' ×'+n;track.appendChild(seg);}
  row.appendChild(track); row.appendChild(el('div','val',Object.entries(hist).map(([a,n])=>a+'×'+n).join(', ')));
  agentChart.appendChild(row);
}
if(!agentChart.children.length) agentChart.appendChild(el('p','mini','single-opus runs one agent with shared context — no agent cast to chart.'));

// cost table
const ctb=document.querySelector('#costTable tbody');
for(const name of armNames){const a=DATA.arms[name]; const ms=Object.keys(a.byModel);
  ms.forEach((m,i)=>{const e=a.byModel[m]; const tr=el('tr');
    tr.appendChild(el('td',null,i===0?('<b>'+name+'</b>'):''));
    tr.appendChild(el('td',null,'<span class="dot" style="background:'+colorFor(m)+'"></span> '+shortModel(m)));
    tr.appendChild(el('td','num',e.calls)); tr.appendChild(el('td','num',fmtN(e.in)));
    tr.appendChild(el('td','num',fmtN(e.out))); tr.appendChild(el('td','num',fmt$(e.cost)));
    ctb.appendChild(tr);});
}

// per-phase tables
const pt=document.getElementById('phaseTables');
for(const name of armNames){const a=DATA.arms[name];
  const det=el('details'); det.appendChild(el('summary',null,name+' — '+a.phaseCount+' phases, '+a.taskCount+' tasks'));
  const tbl=el('table'); tbl.innerHTML='<thead><tr><th>Phase</th><th>Tasks (agent)</th><th class="num">Dur</th><th class="num">Repairs</th><th>tsc</th></tr></thead>';
  const tb=el('tbody');
  for(const p of a.phases){const tr=el('tr');
    tr.appendChild(el('td',null,p.name));
    tr.appendChild(el('td',null,p.tasks.map(t=>t.name+' <span class="mini">('+t.agent+')</span>').join('<br>')));
    tr.appendChild(el('td','num',(p.durationMs/1000).toFixed(1)+'s'));
    tr.appendChild(el('td','num',p.repairAttempts));
    tr.appendChild(el('td',null,p.tscPassed?'<span class="pill pass">PASS</span>':'<span class="pill fail">FAIL</span>'));
    tb.appendChild(tr);}
  tbl.appendChild(tb); det.appendChild(tbl); pt.appendChild(det);
}
</script>
</body>
</html>`;

fs.writeFileSync(OUT, HTML);
console.log('Wrote dashboard:', OUT);
