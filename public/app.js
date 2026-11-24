const $=s=>document.querySelector(s);
const now=new Date();
const dateString=d=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
const today=dateString(now), limit=new Date(now);limit.setDate(limit.getDate()+14);
$('#day').min=today;$('#day').max=dateString(limit);$('#day').value=today;
let desk=1,bookings=[],request=0,ready=false;
const time=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
for(let n=480;n<1080;n+=30)$('#start').add(new Option(time(n),n));
$('#start').value='540';
function ends(){const start=+$('#start').value;const previous=+$('#end').value;$('#end').replaceChildren();for(let n=start+30;n<=Math.min(start+120,1080);n+=30)$('#end').add(new Option(time(n),n));if(previous>start&&previous<=start+120)$('#end').value=previous;render();}
function render(){
 $('#selection').textContent=`Mesa ${String(desk).padStart(2,'0')}`;
 $('#desks').replaceChildren();
 for(let id=1;id<=4;id++){const busy=bookings.some(b=>b.desk===id&&b.start<+$('#end').value&&b.end>+$('#start').value);const b=document.createElement('button');b.className=`desk ${id===desk?'selected':''} ${busy?'busy':''}`;b.setAttribute('aria-pressed',id===desk);b.innerHTML=`Mesa ${String(id).padStart(2,'0')}<small>${busy?'Ocupada':'Disponible'}</small>`;b.onclick=()=>{desk=id;render()};$('#desks').append(b);}
 $('#reservations').replaceChildren();$('#count').textContent=`${bookings.length} reserva${bookings.length!==1?'s':''}`;
 if(!bookings.length){const p=document.createElement('p');p.className='empty';p.textContent=ready?'Todo por estrenar. Elige tu mesa y reserva un rato.':'Cargando reservas…';$('#reservations').append(p);}
 for(const b of bookings){const row=document.createElement('div');row.className='reservation';const title=document.createElement('strong');title.textContent=`Mesa 0${b.desk}`;const t=document.createElement('span');t.textContent=`${time(b.start)} – ${time(b.end)}`;const person=document.createElement('span');person.className='person';person.textContent=b.name+(b.mine?' · Tú':'');row.append(title,t,person);if(b.mine){const button=document.createElement('button');button.className='cancel';button.textContent='Cancelar';button.onclick=async()=>{button.disabled=true;try{const r=await fetch(`/api/bookings/${b.id}`,{method:'DELETE'});if(!r.ok)throw Error('No se ha podido cancelar');await load();$('#message').textContent='Reserva cancelada.';}catch(e){$('#message').textContent=e.message;button.disabled=false;}};row.append(button)}$('#reservations').append(row);}
}
async function load(){const seq=++request;ready=false;$('#submit').disabled=true;try{const r=await fetch(`/api/bookings?day=${$('#day').value}`);if(!r.ok)throw Error();const data=await r.json();if(seq!==request)return;bookings=data;ready=true;render();$('#submit').disabled=false;}catch{if(seq!==request)return;bookings=[];render();$('#reservations').textContent='No se pueden cargar las reservas. Comprueba la conexión y recarga la página.';$('#message').textContent='Las reservas necesitan el servidor de la oficina activo.';}}
$('#booking').onsubmit=async e=>{e.preventDefault();if(!ready)return;$('#submit').disabled=true;$('#message').textContent='Guardando tu reserva…';try{const r=await fetch('/api/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:$('#name').value,day:$('#day').value,desk,start:+$('#start').value,end:+$('#end').value})});const result=await r.json();if(!r.ok)throw Error(result.error);$('#message').textContent='¡Tu mesa está reservada! Cancela si al final no la necesitas.';await load();}catch(e){$('#message').textContent=e.message;}finally{$('#submit').disabled=!ready;}};
$('#day').onchange=()=>{bookings=[];render();load()};$('#start').onchange=ends;$('#end').onchange=render;ends();load();setInterval(load,30000);
