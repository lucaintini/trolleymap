
const SB='https://qbikznnmzthhhdeghfzf.supabase.co/rest/v1', KEY='sb_publishable_cdJfL0LF064pNXyKaYvmHA_M6CApqJt';
const H={apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'};
const PERTH=[-31.9523,115.8613];
const map=L.map('map').setView(PERTH,12);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
const layer=L.layerGroup().addTo(map);
// state comes from trolley_feed(): active, doubted (one Gone since last Still there), stale (no confirmation for a week), gone
const STYLE={active:['#ff6a00',1,'&#128722;'],reported:['#ff6a00',1,'&#128722;'],doubted:['#ff6a00',.55,'&#10067;'],stale:['#b07a50',.45,'&#128722;'],gone:['#8a9590',.6,'&#9989;']};
const icon=c=>{const [bg,op,em]=STYLE[c]||STYLE.active;return L.divIcon({className:'',html:`<div style="width:34px;height:34px;line-height:30px;font-size:19px;text-align:center;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px #000a;opacity:${op};background:${bg}">${em}</div>`,iconSize:[34,34],iconAnchor:[17,17]})};
const LABEL={active:'still there',doubted:'maybe gone',stale:'not confirmed lately',gone:'gone'};
// your own votes live only on this device; the server keeps a weekly salted hash per pin, never your IP
const myVotes=(()=>{try{return JSON.parse(localStorage.getItem('tm_votes')||'{}')}catch(e){return {}}})();
const saveVotes=()=>{try{localStorage.setItem('tm_votes',JSON.stringify(myVotes))}catch(e){}};
let showGone=false;
const esc=s=>(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Live CSP img-src is 'self' data: blob: and OSM tiles. connect-src allows Supabase,
// so Storage photos are fetched and shown as blob: URLs. Same-origin paths and
// data:image/* are used directly. Anything else is ignored (no empty img src).
const SB_ORIGIN='https://qbikznnmzthhhdeghfzf.supabase.co';
const photoUrlCache=new Map();
function classifyPhoto(photo){
 if(!photo||typeof photo!=='string')return null;
 const p=photo.trim();
 if(/^data:image\/(jpeg|png|webp|gif);base64,[a-z0-9+/=]+$/i.test(p))return {kind:'direct',url:p};
 if(p.startsWith('/trolley/')&&!p.includes('..')&&!/[\s"'<>]/.test(p))return {kind:'direct',url:p};
 if(/^[a-z0-9][a-z0-9._-]*\.(jpe?g|png|webp|gif)$/i.test(p))return {kind:'direct',url:p};
 let u;try{u=new URL(p)}catch(e){u=null}
 if(u&&u.protocol==='https:'&&u.host==='qbikznnmzthhhdeghfzf.supabase.co'&&u.pathname.startsWith('/storage/v1/object/'))return {kind:'remote',url:u.toString()};
 const key=/^(public-photos)\/([a-z0-9][a-z0-9._/-]*)$/i.exec(p);
 if(key&&!key[2].includes('..'))return {kind:'sign',bucket:key[1],path:key[2]};
 return null;
}
async function resolvePhoto(photo){
 const spec=classifyPhoto(photo);
 if(!spec)return null;
 if(spec.kind==='direct')return spec.url;
 if(photoUrlCache.has(photo))return photoUrlCache.get(photo);
 const pending=(async()=>{
  let url=spec.url;
  if(spec.kind==='sign'){
   const path=spec.path.split('/').map(encodeURIComponent).join('/');
   const r=await fetch(SB_ORIGIN+'/storage/v1/object/sign/'+spec.bucket+'/'+path,{method:'POST',headers:H,body:JSON.stringify({expiresIn:3600})});
   if(!r.ok)return null;
   const j=await r.json();
   const signed=j.signedURL||j.signedUrl;
   if(!signed||typeof signed!=='string')return null;
   url=signed.startsWith('http')?signed:SB_ORIGIN+'/storage/v1'+(signed.startsWith('/')?signed:'/'+signed);
  }
  const r=await fetch(url);
  if(!r.ok)return null;
  const blob=await r.blob();
  if(blob.type&&!blob.type.startsWith('image/'))return null;
  return URL.createObjectURL(blob);
 })().catch(()=>null);
 photoUrlCache.set(photo,pending);
 const url=await pending;
 if(!url)photoUrlCache.delete(photo);
 return url;
}
function openLightbox(url,alt){
 let root=document.getElementById('lightbox');
 if(!root){
  root=document.createElement('div');
  root.id='lightbox';
  root.innerHTML='<button type="button" class="lb-close" aria-label="Close the photo">Close</button><img alt=""><p>Scroll to zoom. Double click to reset. Tap outside the photo to close.</p>';
  document.body.appendChild(root);
  const img=root.querySelector('img');
  let scale=1;
  const apply=()=>{img.style.transform='scale('+scale+')';root.style.cursor=scale>1?'grab':'zoom-out'};
  root.addEventListener('click',e=>{if(e.target===root||e.target.classList.contains('lb-close'))closeLightbox()});
  root.addEventListener('wheel',e=>{e.preventDefault();const next=Math.min(8,Math.max(1,scale*(e.deltaY<0?1.15:1/1.15)));scale=next;if(scale===1)img.style.transform='';apply()}, {passive:false});
  img.addEventListener('dblclick',e=>{e.stopPropagation();scale=1;img.style.transform='';root.style.cursor='zoom-out'});
  root._reset=()=>{scale=1;img.style.transform='';root.style.cursor='zoom-out'};
 }
 const img=root.querySelector('img');
 if(root._reset)root._reset();
 img.alt=alt||'Trolley photo';
 img.src=url;
 root.classList.add('open');
 document.body.style.overflow='hidden';
}
function closeLightbox(){
 const root=document.getElementById('lightbox');
 if(!root||!root.classList.contains('open'))return;
 root.classList.remove('open');
 root.querySelector('img').removeAttribute('src');
 document.body.style.overflow='';
}
function photoHtml(x){
 const spec=classifyPhoto(x.photo);
 if(!spec)return x.photo?'<small class="photohint">This photo could not be shown.</small>':'';
 const src=spec.kind==='direct'?' src="'+esc(spec.url)+'"':'';
 return `<button type="button" class="photo" data-id="${x.id}" aria-label="View the trolley photo"><img${src} alt="Trolley photo"></button><small class="photohint">Tap the photo to view it</small>`;
}
function ago(t){const d=(Date.now()-new Date(t))/36e5;return d<1?Math.max(1,Math.round(d*60))+' min ago':d<48?Math.round(d)+' h ago':Math.round(d/24)+' days ago'}
let rows=[];
async function load(){
 const r=await fetch(SB+'/rpc/trolley_feed',{headers:H});
 if(!r.ok)return; rows=await r.json(); draw();
}
function popup(x){
 const img=photoHtml(x);
 const mine=myVotes[x.id];
 const seen=x.state==='gone'?(x.collected_at?`gone ${ago(x.collected_at)}`:'no one has confirmed it for a month'):`last seen ${ago(x.last_seen_at)}`;
 const vb=(v,t)=>`<button class="btn ${v==='there'?'rep':'sec'} vote" data-vote="${v}" data-id="${x.id}" ${mine===v&&v==='gone'?'disabled':''}>${t}</button>`;
 return `<div class="popup">${img}<span class="tag ${x.state}">${LABEL[x.state]||x.state}</span> ${x.demo?'<span class="tag" style="background:#eee">Demo</span>':''}<br><b>${esc(x.brand||'Unknown store')}</b> ${esc(x.suburb||'')}<br>${esc(x.note||'')}<br><small>reported ${ago(x.created_at)} &middot; ${seen}</small><br><small>&#128077; ${x.there_count} still there &middot; &#128075; ${x.gone_count} gone</small>${mine?`<br><small>You said: ${mine==='there'?'still there':'gone'}</small>`:''}<div class="vrow">${vb('there','Still there')}${vb('gone','Gone')}</div><small class="vmsg" id="vmsg${x.id}"></small></div>`;
}
function draw(){
 layer.clearLayers();
 rows.forEach(x=>{
  if(x.state==='gone'&&!showGone)return;
  L.marker([x.lat,x.lng],{icon:icon(x.state)}).addTo(layer).bindPopup(()=>popup(x),{maxWidth:260,minWidth:220});
 });
 const real=rows.filter(x=>!x.demo), open=real.filter(x=>x.state!=='gone').length, by={};
 real.forEach(x=>{const b=x.brand||'Unknown';by[b]=(by[b]||0)+1});
 const sub={};real.forEach(x=>{if(x.suburb)sub[x.suburb]=(sub[x.suburb]||0)+1});
 const top=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>esc(e[0])+' '+e[1]).join(', ')||'none yet';
 const gone=rows.filter(x=>x.state==='gone').length;
 document.getElementById('stats').innerHTML=`<div class="stat"><b>${real.length}</b>real reports</div><div class="stat"><b>${open}</b>still out there</div><div class="stat"><b>${real.length-open}</b>gone or collected</div><div class="stat"><b>${rows.length-real.length}</b>demo pins</div><div class="stat"><b>Top stores</b>${top(by)}</div><div class="stat"><b>Top suburbs</b>${top(sub)}</div><label class="stat" style="margin:0;font-weight:400;cursor:pointer"><input type="checkbox" id="showGone" ${showGone?'checked':''}> show ${gone} gone</label>`;
}
document.addEventListener('change',e=>{if(e.target.id==='showGone'){showGone=e.target.checked;draw()}});
async function vote(id,v,btn){
 const m=document.getElementById('vmsg'+id);
 const r=await fetch(SB+'/rpc/trolley_vote',{method:'POST',headers:H,body:JSON.stringify({p_report_id:id,p_vote:v})});
 const j=r.ok?await r.json():{ok:false};
 if(!j.ok){if(m)m.textContent=j.reason==='slow_down'?'Too many taps from here, try again in an hour.':'Could not save, try again.';btn.disabled=false;return}
 myVotes[id]=v;saveVotes();
 const x=rows.find(r=>r.id===id);if(x&&!j.already)Object.assign(x,{state:j.state,there_count:j.there_count,gone_count:j.gone_count,gone_since_confirm:j.gone_since_confirm,last_seen_at:j.last_seen_at,collected_at:j.state==='gone'?(x.collected_at||new Date().toISOString()):null});
 map.closePopup();draw();
 const t=j.already?'You already said it is gone. Thanks!':v==='there'?'Thanks! Marked as still there.':j.state==='gone'?'Thanks! Two people say it is gone, so it is off the map.':'Thanks! One more Gone takes it off the map.';
 toast(t);
}
function toast(t){let d=document.getElementById('toast');if(!d){d=document.createElement('div');d.id='toast';document.body.appendChild(d)}d.textContent=t;d.className='show';clearTimeout(d._t);d._t=setTimeout(()=>d.className='',3500)}
// report dialog
const dlg=document.getElementById('dlg');let pick,pin,photoData=null;
document.getElementById('openReport').onclick=()=>{
 dlg.showModal(); document.getElementById('err').textContent='';
 if(!pick){pick=L.map('pickmap').setView(map.getCenter(),15);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(pick);
  pin=L.marker(map.getCenter(),{draggable:true,icon:icon('reported')}).addTo(pick);pick.on('click',e=>pin.setLatLng(e.latlng));}
 setTimeout(()=>pick.invalidateSize(),100);
 const m=document.getElementById('gpsmsg');
 if(navigator.geolocation){navigator.geolocation.getCurrentPosition(p=>{const ll=[p.coords.latitude,p.coords.longitude];pin.setLatLng(ll);pick.setView(ll,17);m.textContent='from your GPS';},()=>{m.textContent='GPS off: tap the map';},{enableHighAccuracy:true,timeout:8000});}
};
document.getElementById('cancel').onclick=()=>dlg.close();
document.getElementById('photo').onchange=e=>{
 const f=e.target.files[0];if(!f)return;const img=new Image();
 img.onload=()=>{const s=Math.min(1,800/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=img.width*s;c.height=img.height*s;c.getContext('2d').drawImage(img,0,0,c.width,c.height);photoData=c.toDataURL('image/jpeg',0.6);const p=document.getElementById('preview');p.src=photoData;p.style.display='block';};
 img.src=URL.createObjectURL(f);
};
async function suburbOf(lat,lng){try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&lat=${lat}&lon=${lng}`);const j=await r.json();const a=j.address||{};return a.suburb||a.neighbourhood||a.town||a.city_district||a.city||null}catch(e){return null}}
document.getElementById('f').onsubmit=async e=>{
 e.preventDefault();const b=document.getElementById('send');b.disabled=true;b.textContent='Sending...';
 const ll=pin.getLatLng();
 const body={p_lat:ll.lat,p_lng:ll.lng,p_brand:document.getElementById('brand').value||null,p_note:document.getElementById('note').value||null,p_photo:photoData,p_suburb:await suburbOf(ll.lat,ll.lng)};
 const r=await fetch(SB+'/rpc/trolley_report',{method:'POST',headers:H,body:JSON.stringify(body)});
 const j=r.ok?await r.json():{ok:false,reason:'http '+r.status};
 b.disabled=false;b.textContent='Submit report';
 const why={slow_down:'Too many reports from here in the last hour, try again later.',bad_photo:'That photo could not be used, please take it again.',photo_metadata:'That photo still carries camera data, please take it again.',bad_location:'Pick a spot on the map first.',photo_required:'Please add a photo of the trolley. Every report needs one.'};
 if(!j.ok){document.getElementById('err').textContent='Could not save: '+(why[j.reason]||j.reason);return}
 dlg.close();photoData=null;document.getElementById('f').reset();document.getElementById('preview').style.display='none';
 await load();map.setView(ll,16);
 if(j.pending){toast('Thanks! Your photo is being checked. It will appear on the map in a minute or two.');watchReport(j.id)}
};
// Moderation (5 Nov 2026, same checker as googlymaps): photo reports wait for the check, then
// show up, get rejected with a reason, or wait for a person to look.
async function watchReport(id){
 for(let i=0;i<24;i++){
  await new Promise(r=>setTimeout(r,15000));
  try{const r=await fetch(SB+'/rpc/trolley_report_status',{method:'POST',headers:H,body:JSON.stringify({p_report_id:id})});if(!r.ok)return;const s=await r.json();
   if(s.moderation==='approved'){toast('Your trolley is on the map. Thank you!');load();return}
   if(s.moderation==='rejected'){toast('Sorry, your photo was not accepted. '+(s.public_reason||'It did not pass the photo check.'));return}
   if(s.moderation==='review'){toast('Thanks! Your photo needs a quick look by a person before it goes on the map.');return}
  }catch(e){return}
 }
}
load();setInterval(load,30000);

map.on('popupopen',e=>{
 const el=e.popup.getElement();if(!el)return;
 const btn=el.querySelector('.photo');if(!btn)return;
 const x=rows.find(r=>String(r.id)===btn.dataset.id);if(!x)return;
 btn.addEventListener('click',ev=>{
  ev.preventDefault();ev.stopPropagation();
  const img=btn.querySelector('img');
  if(img&&img.naturalWidth)openLightbox(img.currentSrc||img.src,img.alt||'Trolley photo');
 });
 const spec=classifyPhoto(x.photo);
 if(!spec||spec.kind==='direct')return;
 const img=btn.querySelector('img'), hint=el.querySelector('.photohint');
 resolvePhoto(x.photo).then(url=>{
  if(!btn.isConnected)return;
  if(!url){if(hint)hint.textContent='The photo could not be loaded.';return}
  img.src=url;
 });
});
document.addEventListener('keydown',e=>{const lb=document.getElementById('lightbox');if(e.key==='Escape'&&lb&&lb.classList.contains('open')){e.preventDefault();e.stopPropagation();closeLightbox()}},true);
document.addEventListener('click',e=>{const b=e.target.closest('[data-vote]');if(b){b.disabled=true;vote(+b.dataset.id,b.dataset.vote,b)}});
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{})}
