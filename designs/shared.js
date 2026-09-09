(() => {
const $=s=>document.querySelector(s), data=window.SAMPLE;
const fields=[['contractDate','Data zawarcia',150],['contractSubject','Przedmiot umowy',360],['contractCost','Poniesione wydatki',170],['contractorName','Kontrahent',265],['departmentOffice','Wydział urzędu',280],['contractNumber','Numer umowy',250],['contractProcedure','Tryb zawarcia',220],['contractType','Rodzaj umowy',220],['contractStartDate','Obowiązuje od',180],['contractEndDate','Obowiązuje do',180]];
const fuzzy=new Set(['contractSubject','contractorName','contractProcedure','contractType']);
const norm=s=>String(s??'').toLowerCase().replaceAll('ł','l').normalize('NFD').replace(/\p{M}/gu,'');
const tokens=s=>norm(s).match(/[\p{L}\p{N}]+/gu)||[];
function one(a,b){if(Math.abs(a.length-b.length)>1)return false;let i=0,j=0,n=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++n>1)return false;if(a.length>=b.length)i++;if(b.length>=a.length)j++;}return n+(i<a.length||j<b.length?1:0)<=1;}
function match(q,s){const words=tokens(s);return tokens(q).every(t=>words.some(w=>w===t||(!/^\d+$/.test(t)&&((t.length>=3&&w.startsWith(t))||(t.length>=4&&one(t,w))))));}
const money=new Intl.NumberFormat('pl-PL',{style:'currency',currency:'PLN'});
const date=s=>s?String(s).slice(0,10).split('-').reverse().join('.'):'—';
const value=(r,k)=>k==='contractCost'?money.format(r[k]):k.includes('Date')?date(r[k]):r[k]??'Brak danych';
let sort='contractDate',direction=-1,limit=100,result=[],selected=new Set();
const controls={};
for(const [key,label,width] of fields){
 const th=document.createElement('th');th.style.width=width+'px';th.scope='col';th.dataset.key=key;const button=document.createElement('button');button.textContent=label;const arrow=document.createElement('span');arrow.textContent='↕';button.append(arrow);button.onclick=()=>{direction=sort===key?-direction:1;sort=key;update();};th.append(button);$('#head').append(th);
 const filter=document.createElement('th');
 if(key==='departmentOffice'){
  filter.innerHTML='<details><summary>Wszystkie wydziały</summary><div class="options"><input id="dept-search" type="search" aria-label="Szukaj wydziału" placeholder="Fragment nazwy wydziału"><div class="option-list"></div></div></details>';
 }else if(key.includes('Date')){
  const box=document.createElement('div');box.className='date-range';controls[key]=['od','do'].map(part=>{const input=document.createElement('input');input.type='date';input.setAttribute('aria-label',label+' — '+part);input.addEventListener('input',update);box.append(input);return input;});filter.append(box);
 }else if(key==='contractCost'){
  filter.innerHTML='<div class="date-range"><select id="cost-op" aria-label="Porównanie kwoty"><option value="gt">Więcej niż</option><option value="lt">Mniej niż</option></select><input id="cost" type="number" step="0.01" aria-label="Kwota w złotych" placeholder="zł"></div>';
 }else{const input=document.createElement('input');input.type='search';input.placeholder=key==='contractNumber'?'Fragment numeru…':'Szukaj w kolumnie…';input.setAttribute('aria-label',label+' — filtr');input.addEventListener('input',update);controls[key]=input;filter.append(input);}
 $('#filters').append(filter);
}
function accepts(r,withDepartments=true){
 const q=$('#global').value.trim();
 if(q&&!tokens(q).every(t=>[...fuzzy].some(k=>match(t,r[k]))||['contractNumber','departmentOffice'].some(k=>norm(r[k]).includes(t))))return false;
 for(const [key,control]of Object.entries(controls)){
  if(Array.isArray(control)){const d=(r[key]||'').slice(0,10);if(control[0].value&&d<control[0].value||control[1].value&&(!d||d>control[1].value))return false;}
  else if(control.value.trim()&&!(fuzzy.has(key)?match(control.value,r[key]):norm(r[key]).includes(norm(control.value.trim()))))return false;
 }
 const c=$('#cost').value;if(c!==''&& !($('#cost-op').value==='gt'?r.contractCost>Number(c):r.contractCost<Number(c)))return false;
 return !withDepartments||!selected.size||selected.has(r.departmentOffice);
}
function facets(){const counts=new Map();for(const r of data.filter(r=>accepts(r,false)))counts.set(r.departmentOffice,(counts.get(r.departmentOffice)||0)+1);const container=$('.option-list');container.replaceChildren();const names=[...new Set(data.map(r=>r.departmentOffice))].sort((a,b)=>String(a).localeCompare(String(b),'pl'));for(const name of names){if(!norm(name??'Brak danych').includes(norm($('#dept-search').value)))continue;const label=document.createElement('label'),input=document.createElement('input'),text=document.createElement('span'),count=document.createElement('b');input.type='checkbox';input.checked=selected.has(name);input.onchange=()=>{input.checked?selected.add(name):selected.delete(name);update();};text.textContent=name??'Brak danych';count.textContent=counts.get(name)||0;label.append(input,text,count);container.append(label);} $('summary').textContent=selected.size?'Wybrane wydziały: '+selected.size:'Wszystkie wydziały';}
function openRecord(r){$('#detail').replaceChildren();for(const[k,label]of fields){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value(r,k);$('#detail').append(dt,dd);}$('#detail-title').textContent='Umowa · '+r.sourceYear;$('dialog').showModal();}
function render(){const body=$('#rows');body.replaceChildren();for(const r of result.slice(0,limit)){const tr=document.createElement('tr');for(const[k]of fields){const td=document.createElement('td');if(k==='contractSubject'){const span=document.createElement('span');span.className='subject';span.textContent=value(r,k);const b=document.createElement('button');b.className='detail-open';b.textContent='Pełna treść ↗';b.onclick=()=>openRecord(r);td.append(span,b);}else{td.textContent=value(r,k);if(k==='contractCost')td.className='amount';if(k.includes('Date'))td.className='date';}tr.append(td);}body.append(tr);}$('#count').textContent=result.length.toLocaleString('pl-PL');$('#shown').textContent='Wyświetlono '+Math.min(limit,result.length)+' z '+result.length+' wpisów';$('#more').hidden=limit>=result.length;$('.empty').hidden=!!result.length;}
function update(){limit=100;result=data.filter(r=>accepts(r));result.sort((a,b)=>direction*(typeof a[sort]==='number'?a[sort]-b[sort]:String(a[sort]??'').localeCompare(String(b[sort]??''),'pl'))||b.sourceYear-a.sourceYear||a.sourcePosition-b.sourcePosition);for(const th of $('#head').children){const active=th.dataset.key===sort;th.setAttribute('aria-sort',active?(direction===1?'ascending':'descending'):'none');th.querySelector('span').textContent=active?(direction===1?'↑':'↓'):'↕';}$('#sort-label').textContent=sort==='contractDate'?(direction===-1?'Najnowsze najpierw':'Najstarsze najpierw'):fields.find(f=>f[0]===sort)[1]+(direction===1?' ↑':' ↓');$('.table-scroll').scrollTop=0;render();facets();chips();}
function chips(){const box=$('#chips');box.replaceChildren();function chip(label,clear){const b=document.createElement('button');b.textContent=label+' ×';b.setAttribute('aria-label','Usuń filtr: '+label);b.onclick=()=>{clear();update();};box.append(b);}if($('#global').value)chip('Szukaj: '+$('#global').value,()=>$('#global').value='');for(const[k,c]of Object.entries(controls)){const label=fields.find(f=>f[0]===k)[1];if(Array.isArray(c)){if(c.some(i=>i.value))chip(label+': '+(c[0].value||'…')+' — '+(c[1].value||'…'),()=>c.forEach(i=>i.value=''));}else if(c.value)chip(label+': '+c.value,()=>c.value='');}if($('#cost').value)chip(($('#cost-op').value==='gt'?'> ':'< ')+$('#cost').value+' zł',()=>$('#cost').value='');for(const name of selected)chip(name??'Brak danych',()=>selected.delete(name));}
for(const id of ['global','cost','cost-op'])$('#'+id).addEventListener('input',update);
$('#dept-search').addEventListener('input',facets);
$('#reset').onclick=()=>{$('#global').value='';$('#cost').value='';$('#dept-search').value='';for(const c of Object.values(controls))Array.isArray(c)?c.forEach(i=>i.value=''):c.value='';selected.clear();update();};
for(const button of document.querySelectorAll('[data-query]'))button.onclick=()=>{$('#global').value=button.dataset.query;update();};
$('#close').onclick=()=>$('dialog').close();
$('#more').onclick=()=>{limit+=100;render();};
$('.table-scroll').addEventListener('scroll',()=>{const s=$('.table-scroll');if(s.scrollTop+s.clientHeight>=s.scrollHeight-80&&limit<result.length){limit+=100;render();}});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!$('dialog').open){e.preventDefault();$('#global').focus();}});
update();
})();
