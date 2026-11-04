
const SB='https://qbikznnmzthhhdeghfzf.supabase.co/rest/v1', KEY='sb_publishable_cdJfL0LF064pNXyKaYvmHA_M6CApqJt';
const H={apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'};
const PERTH=[-31.9523,115.8613];
const map=L.map('map').setView(PERTH,12);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
const layer=L.layerGroup().addTo(map);
const icon=c=>L.divIcon({className:'',html:`<div style="font-size:26px;filter:drop-shadow(0 1px 2px #0008)">${c==='collected'?'&#9989;':'&#128722;'}</div>`,iconSize:[30,30],iconAnchor:[15,15]});
const esc=s=>(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function ago(t){const d=(Date.now()-new Date(t))/36e5;return d<1?Math.max(1,Math.round(d*60))+' min ago':d<48?Math.round(d)+' h ago':Math.round(d/24)+' days ago'}
let rows=[];
async function load(){
 const r=await fetch(SB+'/trolley_reports?select=id,created_at,lat,lng,brand,note,suburb,photo,status,collected_at,demo&order=created_at.desc&limit=500',{headers:H});
 rows=await r.json(); draw();
}
function draw(){
 layer.clearLayers();
 rows.forEach(x=>{
  const img=x.photo?`<img src="${x.photo.startsWith('data:')?x.photo:esc(x.photo)}" alt="trolley"><br>`:'';
  const btn=x.status==='reported'?`<button class="btn rep" style="padding:6px 10px;font-size:.9rem" data-collect="${x.id}">Mark collected</button>`:`<small>collected ${ago(x.collected_at)}</small>`;
  L.marker([x.lat,x.lng],{icon:icon(x.status)}).addTo(layer).bindPopup(`<div class="popup">${img}<span class="tag ${x.status}">${x.status}</span> ${x.demo?'<span class="tag" style="background:#eee">Demo</span>':''}<br><b>${esc(x.brand||'Unknown store')}</b> ${esc(x.suburb||'')}<br>${esc(x.note||'')}<br><small>reported ${ago(x.created_at)}</small><br>${btn}</div>`);
 });
 const real=rows.filter(x=>!x.demo), open=real.filter(x=>x.status==='reported').length, by={};
 real.forEach(x=>{const b=x.brand||'Unknown';by[b]=(by[b]||0)+1});
 const sub={};real.forEach(x=>{if(x.suburb)sub[x.suburb]=(sub[x.suburb]||0)+1});
 const top=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>esc(e[0])+' '+e[1]).join(', ')||'none yet';
 document.getElementById('stats').innerHTML=`<div class="stat"><b>${real.length}</b>real reports</div><div class="stat"><b>${open}</b>still out there</div><div class="stat"><b>${real.length-open}</b>collected</div><div class="stat"><b>${rows.length-real.length}</b>demo pins</div><div class="stat"><b>Top stores</b>${top(by)}</div><div class="stat"><b>Top suburbs</b>${top(sub)}</div>`;
}
async function collect(id){
 const r=await fetch(SB+'/rpc/trolley_mark_collected',{method:'POST',headers:H,body:JSON.stringify({report_id:id})});
 if(!r.ok){alert('Could not update, try again');return} map.closePopup(); load();
}
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
 const body={lat:ll.lat,lng:ll.lng,brand:document.getElementById('brand').value||null,note:document.getElementById('note').value||null,photo:photoData,suburb:await suburbOf(ll.lat,ll.lng)};
 const r=await fetch(SB+'/trolley_reports',{method:'POST',headers:{...H,Prefer:'return=minimal'},body:JSON.stringify(body)});
 b.disabled=false;b.textContent='Submit report';
 if(!r.ok){document.getElementById('err').textContent='Could not save: '+r.status;return}
 dlg.close();photoData=null;document.getElementById('f').reset();document.getElementById('preview').style.display='none';
 await load();map.setView(ll,16);
};
load();setInterval(load,30000);

document.addEventListener('click',e=>{const b=e.target.closest('[data-collect]');if(b){b.disabled=true;collect(+b.dataset.collect)}});
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{})}
