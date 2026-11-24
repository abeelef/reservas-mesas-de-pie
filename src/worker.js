const json=(data,status=200,extra={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...extra}});
const session=request=>request.headers.get('Cookie')?.match(/(?:^|;\s*)office_session=([a-f0-9]{64})(?:;|$)/)?.[1];
function token(){return [...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('');}
export function validate(b,now=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
 const today=`${parts.year}-${parts.month}-${parts.day}`;
 if(!b||typeof b.name!=='string'||b.name.trim().length<2||b.name.trim().length>60)throw Error('Escribe un nombre de entre 2 y 60 caracteres');
 if(typeof b.day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.day))throw Error('Fecha no válida');
 const d=new Date(`${b.day}T00:00:00Z`),t=new Date(`${today}T00:00:00Z`);
 if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==b.day||d.getUTCDay()%6===0||d<t||d-t>14*86400000)throw Error('Elige un día laborable en los próximos 14 días');
 if(!Number.isInteger(b.desk)||b.desk<1||b.desk>4)throw Error('Mesa no válida');
 if(!Number.isInteger(b.start)||!Number.isInteger(b.end)||b.start<480||b.end>1080||b.start>=b.end||b.start%30||b.end%30)throw Error('Horario no válido');
 if(b.day===today&&b.start<=Number(parts.hour)*60+Number(parts.minute))throw Error('La hora de inicio ya ha pasado');
 return {...b,name:b.name.trim()};
}
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
 if(!env.DB)return json({error:'Falta configurar la base de datos D1'},503);
 if(!['GET','POST','DELETE'].includes(request.method))return json({error:'Método no permitido'},405);
 if(request.method!=='GET'&&request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)return json({error:'Origen no permitido'},403);
 try{
  const owner=session(request);
  if(url.pathname==='/api/bookings'&&request.method==='GET'){
   const day=url.searchParams.get('day');
   if(!/^\d{4}-\d{2}-\d{2}$/.test(day||''))return json({error:'Fecha no válida'},400);
   const identity=owner||token();
   const {results}=await env.DB.prepare('SELECT id,name,desk,start,end,owner FROM bookings WHERE day=? ORDER BY start,desk').bind(day).all();
   return json(results.map(({owner:who,...row})=>({...row,mine:who===identity})),200,{'Set-Cookie':`office_session=${identity}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000${url.protocol==='https:'?'; Secure':''}`});
  }
  if(url.pathname==='/api/bookings'&&request.method==='POST'){
   if(!owner)return json({error:'Recarga la página antes de reservar'},400);
   if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Se requiere JSON'},415);
   const raw=await request.text();if(raw.length>4096)return json({error:'Petición demasiado grande'},413);
   let b;try{b=validate(JSON.parse(raw));}catch(e){return json({error:e.message},400);}
   try{await env.DB.prepare('INSERT INTO bookings (id,owner,name,day,desk,start,end) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(),owner,b.name,b.day,b.desk,b.start,b.end).run();}
   catch(e){if(String(e).includes('booking_conflict'))return json({error:'La mesa o tú ya tenéis una reserva en esa franja'},409);if(String(e).includes('booking_quota'))return json({error:'Máximo 2 horas por persona y día'},400);throw e;}
   return json({ok:true},201);
  }
  if(/^\/api\/bookings\/[a-f0-9-]{36}$/.test(url.pathname)&&request.method==='DELETE'){
   if(!owner)return json({error:'Solo puedes cancelar tus reservas'},403);
   const result=await env.DB.prepare('DELETE FROM bookings WHERE id=? AND owner=?').bind(url.pathname.split('/').pop(),owner).run();
   return result.meta.changes?json({ok:true}):json({error:'Solo puedes cancelar tus reservas'},403);
  }
  return json({error:'Ruta no encontrada'},404);
 }catch(e){console.error('Booking API failure',e);return json({error:'No se ha podido acceder a las reservas. Inténtalo de nuevo.'},503);}
}};
