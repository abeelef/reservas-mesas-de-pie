const $=s=>document.querySelector(s);
const now=new Date();
const dateString=d=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
const today=dateString(now), limit=new Date(now);limit.setDate(limit.getDate()+14);
$('#day').min=today;$('#day').max=dateString(limit);$('#day').value=today;
let desk=1,bookings=[],ready=false;
const key="aqaia-local-bookings-v1";
function read(){const value=JSON.parse(localStorage.getItem(key)||"[]");if(!Array.isArray(value))throw Error("Datos locales no válidos");return value;}
function save(rows){localStorage.setItem(key,JSON.stringify(rows));}
const positions={1:'Interior · izquierda',2:'Interior · derecha',3:'Salida · izquierda',4:'Salida · derecha'};
const locations={1:'Lado interior · izquierda en el plano',2:'Lado interior · derecha en el plano',3:'Lado salida · puerta justo detrás',4:'Lado salida · a la derecha de la mesa 03'};
const time=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
for(let n=480;n<1080;n+=30)$('#start').add(new Option(time(n),n));
$('#start').value='540';
function ends(){const start=+$('#start').value;const previous=+$('#end').value;$('#end').replaceChildren();for(let n=start+30;n<=Math.min(start+120,1080);n+=30)$('#end').add(new Option(time(n),n));if(previous>start&&previous<=start+120)$('#end').value=previous;render();}
function render(){
 $('#selection').textContent=`Mesa ${String(desk).padStart(2,'0')}`;
 $('#desk-location').textContent=locations[desk];
 $('#selected-time').textContent=`${time(+$('#start').value)} – ${time(+$('#end').value)}`;
 $('#duration').textContent=`${+$('#end').value - +$('#start').value} min`;
 $('#desks').replaceChildren();
 for(let id=1;id<=4;id++){const busy=bookings.some(b=>b.desk===id&&b.start<+$('#end').value&&b.end>+$('#start').value);const b=document.createElement('button');b.className=`desk ${id===desk?'selected':''} ${busy?'busy':''}`;b.setAttribute('aria-pressed',id===desk);b.setAttribute('aria-label',`Mesa ${id}, ${locations[id]}. ${busy?'Con reserva local':'Libre en tu agenda'}`);b.innerHTML=`<span class="desk-monitor" aria-hidden="true"></span><span class="desk-number">${String(id).padStart(2,'0')}</span><span class="desk-position">${positions[id]}</span><small>${busy?'Con reserva local':'Libre en tu agenda'}</small>`;b.onclick=()=>{desk=id;render()};$('#desks').append(b);}
 $('#reservations').replaceChildren();$('#count').textContent=`${bookings.length} reserva${bookings.length!==1?'s':''}`;
 if(!bookings.length){const p=document.createElement('p');p.className='empty';p.textContent=ready?'Tu agenda está libre. Elige una mesa para empezar.':'Cargando reservas…';$('#reservations').append(p);}
 for(const b of bookings){const row=document.createElement('div');row.className='reservation';const title=document.createElement('strong');title.textContent=`Mesa 0${b.desk}`;title.title=locations[b.desk];const t=document.createElement('span');t.textContent=`${time(b.start)} – ${time(b.end)}`;const person=document.createElement('span');person.className='person';person.textContent=b.name;row.append(title,t,person);if(b.mine){const button=document.createElement('button');button.className='cancel';button.textContent='Cancelar';button.onclick=()=>{try{save(read().filter(r=>r.id!==b.id));load();$('#message').textContent='Reserva local cancelada.';}catch{$('#message').textContent='No se ha podido guardar el cambio en este navegador.';}};row.append(button)}$('#reservations').append(row);}
}
function load(){try{bookings=read().filter(b=>b.day===$('#day').value).map(b=>({...b,mine:true})).sort((a,b)=>a.start-b.start);ready=true;$('#submit').disabled=false;render();}catch{ready=false;$('#submit').disabled=true;$('#message').textContent='El almacenamiento local no está disponible. Habilítalo para usar la agenda.';}}
$('#booking').onsubmit=e=>{e.preventDefault();if(!ready)return;try{
 const rows=read(),day=$('#day').value,start=+$('#start').value,end=+$('#end').value,name=$('#name').value.trim();
 const date=new Date(day+'T12:00:00Z');
 if(name.length<2||name.length>60)throw Error('Escribe un nombre válido.');
 if(day<dateString(new Date())||day>dateString(limit)||[0,6].includes(date.getUTCDay()))throw Error('Elige un día laborable en los próximos 14 días.');
 const parts=Object.fromEntries(new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
 if(day===dateString(new Date())&&start<=+parts.hour*60 + +parts.minute)throw Error('La hora de inicio ya ha pasado.');
 const person=name.toLocaleLowerCase('es');const same=b=>b.name.toLocaleLowerCase('es')===person;
 const daily=rows.filter(b=>b.day===day);
 if(daily.some(b=>(b.desk===desk||same(b))&&b.start<end&&b.end>start))throw Error('Hay una reserva local incompatible con esa franja.');
 if(daily.filter(same).reduce((n,b)=>n+b.end-b.start,0)+end-start>120)throw Error('Máximo 2 horas por nombre y día en esta agenda local.');
 save([...rows,{id:crypto.randomUUID(),name,day,desk,start,end}]);load();$('#message').textContent='Guardado solo en este navegador. No se ha reservado la mesa para el resto de la oficina.';
 }catch(e){$('#message').textContent=e.message;}};
$('#day').onchange=load;$('#start').onchange=ends;$('#end').onchange=render;window.addEventListener('storage',load);ends();load();
