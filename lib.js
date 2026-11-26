// Secret Santa core logic: runs in the browser, nothing is sent anywhere.
const W_REG=[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const W_BOLD=[278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];

// ---------- text helpers ----------
const clean=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'').replace(/\s+/g,' ').trim();
const normName=s=>String(s||'').toUpperCase().replace(/[.,]/g,'').replace(/\s+/g,' ').trim();
const normCode=s=>String(s||'').trim().toUpperCase().replace(/\s+/g,'');
const width=(s,bold,size)=>{const t=bold?W_BOLD:W_REG;let w=0;for(const ch of s)w+=t[ch.charCodeAt(0)-32]||600;return w*size/1000};
const fit=(s,bold,size,max)=>{const w=width(s,bold,size);return w>max?size*max/w:size};
const esc=s=>s.replace(/[\\()]/g,m=>'\\'+m);
const needsAscii=s=>clean(s)!==String(s).replace(/\s+/g,' ').trim();

// ---------- parsing ----------
function splitLine(line,d){
  const out=[];let cur='',q=false;
  for(let i=0;i<line.length;i++){const ch=line[i];
    if(q){if(ch==='"'){if(line[i+1]==='"'){cur+='"';i++}else q=false}else cur+=ch}
    else if(ch==='"')q=true; else if(ch===d){out.push(cur);cur=''} else cur+=ch}
  out.push(cur);return out.map(x=>x.trim());
}
function parseTable(text){
  const lines=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/).filter(l=>l.trim());
  if(!lines.length)return [];
  const d=lines[0].includes('\t')?'\t':(lines[0].includes(';')&&!lines[0].includes(',')?';':',');
  let rows=lines.map(l=>splitLine(l,d));
  if(/^(name|names|participant|participants|full name)$/i.test(rows[0][0]))rows=rows.slice(1);
  return rows.filter(r=>r[0]).map(r=>({name:r[0].replace(/\s+/g,' '),code:normCode(r[1]||'')}));
}
const WORDS=['SNOW','HOLLY','TINSEL','COCOA','SLEIGH','JINGLE','FROST','MERRY','CANDY','ANGEL','STAR','BELLS','COMET','GLOW','MIST','NOEL','ELF','WREATH','CANDLE','GINGER','ICICLE','RIBBON','CEDAR','TUNDRA','SPARKLE','TWINKLE','REINDEER','CHIMNEY','MIDNIGHT','CRYSTAL','BLIZZARD','STOCKING','ORNAMENT','EVERGREEN','NORTH','YULE','SILVER','MYSTIC','POLAR','RUDOLPH'];
function randInt(n){const a=new Uint32Array(1),lim=Math.floor(4294967296/n)*n;let x;do{crypto.getRandomValues(a);x=a[0]}while(x>=lim);return x%n}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=randInt(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}

// Returns {people, errors}. Generates codes for blanks when generate=true.
function preparePeople(rows,generate){
  const errors=[],seen=new Set(),codes=new Set();
  if(rows.length<2)errors.push('Add at least 2 participants.');
  rows.forEach(r=>{const k=normName(r.name);if(seen.has(k))errors.push(`Duplicate name: ${r.name}`);seen.add(k);if(r.code){if(codes.has(r.code))errors.push(`Duplicate code: ${r.code}`);codes.add(r.code)}});
  const missing=rows.filter(r=>!r.code);
  if(missing.length&&!generate)errors.push(`${missing.length} participant(s) have no code (e.g. ${missing[0].name}). Add codes or tick "Generate codes".`);
  if(errors.length)return{people:null,errors};
  const people=rows.map(r=>({name:r.name,code:r.code}));
  for(const p of people)if(!p.code){let c,t=0;do{c=WORDS[randInt(WORDS.length)]+'-'+String(10+randInt(90));if(++t>200)c=WORDS[randInt(WORDS.length)]+'-'+String(100+randInt(900))}while(codes.has(c));codes.add(c);p.code=c}
  return{people,errors:[]};
}
function parseFixed(text,people){
  const idx=new Map(people.map((p,i)=>[normName(p.name),i])),pairs=[],errors=[],gs=new Set(),rs=new Set();
  String(text||'').split(/\r?\n/).map(l=>l.trim()).filter(Boolean).forEach(line=>{
    const m=line.split(/\s*(?:->|→|=>|>)\s*/);
    if(m.length!==2||!m[0]||!m[1]){errors.push(`Could not read: "${line}" (use Santa -> Recipient)`);return}
    const a=idx.get(normName(m[0])),b=idx.get(normName(m[1]));
    if(a===undefined)return errors.push(`Not in the participant list: ${m[0]}`);
    if(b===undefined)return errors.push(`Not in the participant list: ${m[1]}`);
    if(a===b)return errors.push(`${m[0]} cannot be their own Santa`);
    if(gs.has(a))return errors.push(`${people[a].name} is given more than one recipient`);
    if(rs.has(b))return errors.push(`${people[b].name} is the recipient of more than one fixed pair`);
    gs.add(a);rs.add(b);pairs.push([a,b]);
  });
  return{pairs,errors};
}
// Random assignment: map giverIndex -> recipientIndex.
function assign(n,pairs){
  const m=new Array(n).fill(-1),fg=new Set(pairs.map(p=>p[0])),fr=new Set(pairs.map(p=>p[1]));
  pairs.forEach(([a,b])=>m[a]=b);
  const gv=[],rc=[];for(let i=0;i<n;i++){if(!fg.has(i))gv.push(i);if(!fr.has(i))rc.push(i)}
  if(gv.length===1&&gv[0]===rc[0])throw new Error('The fixed pairs leave one person who could only be assigned to themselves. Remove or change a fixed pair.');
  for(let t=0;t<20000;t++){shuffle(rc);if(gv.every((g,i)=>g!==rc[i])){gv.forEach((g,i)=>m[g]=rc[i]);return m}}
  throw new Error('Could not find a valid assignment. Check your fixed pairs.');
}
function validate(people,m,pairs){
  const n=people.length,ok=[];
  const chk=(label,pass)=>ok.push({label,pass});
  chk(`Exactly ${n} Santas`,m.length===n&&m.every(x=>x>=0&&x<n));
  chk(`Exactly ${n} unique recipients`,new Set(m).size===n);
  chk(`All ${pairs.length} fixed assignments preserved`,pairs.every(([a,b])=>m[a]===b));
  chk('Zero self-assignments',m.every((r,i)=>r!==i));
  chk('Zero duplicate recipients',new Set(m).size===m.length);
  chk('No missing participants',new Set(m).size===n&&new Set(people.map(p=>normName(p.name))).size===n);
  chk('Every code matches the correct recipient',m.every(r=>people[r].code===normCode(people[r].code))&&new Set(people.map(p=>p.code)).size===n);
  return ok;
}

// ---------- PDF (one card per page, no libraries) ----------
function cardOps(name,code){
  name=clean(name);code=normCode(clean(code));
  const PW=595,PH=420,f=n=>(+n).toFixed(2),ops=[];
  const rect=(x,y,w,h,mode)=>ops.push(`${f(x)} ${f(y)} ${f(w)} ${f(h)} re ${mode}`);
  const text=(s,font,size,y,rgb)=>{const x=PW/2-width(s,font==='F2',size)/2;ops.push(`${rgb} rg BT /${font} ${f(size)} Tf ${f(x)} ${f(y)} Td (${esc(s)}) Tj ET`)};
  const green='0.063 0.169 0.137',gold='0.902 0.788 0.529',cream='1 0.973 0.914',red='0.608 0.239 0.212';
  ops.push(`${green} rg`);rect(0,0,PW,PH,'f');
  ops.push(`${gold} RG 2 w`);rect(20,20,PW-40,PH-40,'S');ops.push('0.6 w');rect(29,29,PW-58,PH-58,'S');
  text('Secret Santa','F1',15,338,gold);
  const hi=`Hi ${name}!!`;text(hi,'F2',fit(hi,true,56,440),246,cream);
  text('Your Secret Santa code is:','F1',21,196,gold);
  const cs=fit(code,true,42,360),bw=width(code,true,cs)+64;
  ops.push(`${cream} rg`);rect((PW-bw)/2,96,bw,70,'f');
  ops.push(`${gold} RG 1 w`);rect((PW-bw)/2-5,91,bw+10,80,'S');
  text(code,'F2',cs,119,red);
  text('Keep it a secret until the big reveal.','F1',12,58,'0.847 0.816 0.741');
  return ops.join('\n');
}
function buildCardsPdf(cards){
  const PW=595,PH=420,objs=[];
  const kids=cards.map((_,i)=>`${5+2*i} 0 R`).join(' ');
  objs.push('<< /Type /Catalog /Pages 2 0 R >>',`<< /Type /Pages /Kids [${kids}] /Count ${cards.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  cards.forEach((c,i)=>{const s=cardOps(c.name,c.code);
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Contents ${6+2*i} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`,
      `<< /Length ${s.length} >>\nstream\n${s}\nendstream`)});
  let pdf='%PDF-1.4\n';const offs=[];
  objs.forEach((o,i)=>{offs.push(pdf.length);pdf+=`${i+1} 0 obj\n${o}\nendobj\n`});
  const x=pdf.length;
  pdf+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`+offs.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('');
  pdf+=`trailer\n<< /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
  const b=new Uint8Array(pdf.length);for(let i=0;i<pdf.length;i++)b[i]=pdf.charCodeAt(i);return b;
}
const message=(name,code)=>`Hi ${name}!! Your Secret Santa code is: ${code}`;
const csvCell=s=>/[",\n]/.test(s)?'"'+String(s).replace(/"/g,'""')+'"':String(s);

const SantaLib={parseTable,preparePeople,parseFixed,assign,validate,buildCardsPdf,message,csvCell,needsAscii,normName,normCode};
if(typeof module!=='undefined')module.exports=SantaLib;else window.SantaLib=SantaLib;
