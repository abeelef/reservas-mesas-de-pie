import os, sqlite3, secrets, json
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from http.cookies import SimpleCookie
from urllib.parse import urlparse, parse_qs

DB=os.environ.get('DATABASE_PATH','data/bookings.sqlite3')
os.makedirs(os.path.dirname(os.path.abspath(DB)),exist_ok=True)
def connect():
    c=sqlite3.connect(DB,timeout=15)
    c.row_factory=sqlite3.Row
    c.execute('CREATE TABLE IF NOT EXISTS bookings (id TEXT PRIMARY KEY, owner TEXT, name TEXT, day TEXT, desk INTEGER, start INTEGER, end INTEGER)')
    return c
connect().close()
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw): super().__init__(*a,directory='public',**kw)
    def reply(self,status,data,cookie=None):
        body=json.dumps(data).encode(); self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Cache-Control','no-store')
        if cookie:self.send_header('Set-Cookie',cookie)
        self.end_headers(); self.wfile.write(body)
    def identity(self):
        jar=SimpleCookie(); jar.load(self.headers.get('Cookie',''))
        return jar['office_session'].value if 'office_session' in jar else None
    def do_GET(self):
        url=urlparse(self.path)
        if url.path!='/api/bookings':return super().do_GET()
        day=parse_qs(url.query).get('day',[''])[0]
        owner=self.identity() or secrets.token_hex(32)
        with connect() as c: rows=c.execute('SELECT * FROM bookings WHERE day=? ORDER BY start',(day,)).fetchall()
        self.reply(200,[dict(id=r['id'],name=r['name'],desk=r['desk'],start=r['start'],end=r['end'],mine=r['owner']==owner) for r in rows],f'office_session={owner}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000'+('; Secure' if os.environ.get('COOKIE_SECURE')=='1' else ''))
    def do_POST(self):
        if self.path!='/api/bookings':return self.reply(404,{'error':'Ruta no encontrada'})
        try:
            if int(self.headers.get('Content-Length',0))>4096:raise ValueError('Petición demasiado grande')
            b=json.loads(self.rfile.read(int(self.headers.get('Content-Length',0))))
            owner=self.identity()
            if not owner:raise ValueError('Recarga la página antes de reservar')
            name=str(b['name']).strip(); day=b['day']; desk=b['desk']; start=b['start']; end=b['end']
            date=datetime.strptime(day,'%Y-%m-%d').date(); now=datetime.now(ZoneInfo('Europe/Madrid'))
            if not 2<=len(name)<=60:raise ValueError('Escribe un nombre de entre 2 y 60 caracteres')
            if type(desk)!=int or desk not in range(1,5):raise ValueError('Mesa no válida')
            if type(start)!=int or type(end)!=int or not (480<=start<end<=1080) or start%30 or end%30:raise ValueError('Horario no válido')
            if date.weekday()>4 or not now.date()<=date<=now.date()+timedelta(days=14):raise ValueError('Elige un día laborable en los próximos 14 días')
            if date==now.date() and start<=now.hour*60+now.minute:raise ValueError('La hora de inicio ya ha pasado')
            with connect() as c:
                c.execute('BEGIN IMMEDIATE')
                if c.execute('SELECT 1 FROM bookings WHERE day=? AND (desk=? OR owner=?) AND start<? AND end>?',(day,desk,owner,end,start)).fetchone():raise ValueError('La mesa o tú ya tenéis una reserva en esa franja')
                total=c.execute('SELECT COALESCE(SUM(end-start),0) FROM bookings WHERE day=? AND owner=?',(day,owner)).fetchone()[0]
                if total+end-start>120:raise ValueError('Máximo 2 horas por persona y día')
                c.execute('INSERT INTO bookings VALUES (?,?,?,?,?,?,?)',(secrets.token_hex(16),owner,name,day,desk,start,end))
            self.reply(201,{'ok':True})
        except (ValueError,KeyError,TypeError,json.JSONDecodeError) as e:self.reply(400,{'error':str(e)})
    def do_DELETE(self):
        if not self.path.startswith('/api/bookings/'):return self.reply(404,{'error':'Ruta no encontrada'})
        with connect() as c:
            changed=c.execute('DELETE FROM bookings WHERE id=? AND owner=?',(self.path.split('/')[-1],self.identity())).rowcount
        self.reply(200 if changed else 403,{'ok':bool(changed),'error':'Solo puedes cancelar tus reservas'})
if __name__=='__main__':
    ThreadingHTTPServer(('0.0.0.0',int(os.environ.get('PORT',8000))),Handler).serve_forever()
