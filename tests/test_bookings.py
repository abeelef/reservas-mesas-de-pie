import unittest, tempfile, os, threading, json, urllib.request, urllib.error, http.cookiejar
from datetime import datetime,timedelta
from zoneinfo import ZoneInfo
import server
class BookingTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.temp=tempfile.TemporaryDirectory();server.DB=os.path.join(cls.temp.name,'test.sqlite');server.connect().close()
  cls.http=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler);threading.Thread(target=cls.http.serve_forever,daemon=True).start();cls.url=f'http://127.0.0.1:{cls.http.server_port}'
  d=datetime.now(ZoneInfo('Europe/Madrid')).date()+timedelta(days=1)
  while d.weekday()>4:d+=timedelta(days=1)
  cls.day=d.isoformat()
 @classmethod
 def tearDownClass(cls):cls.http.shutdown();cls.http.server_close();cls.temp.cleanup()
 def client(self):
  c=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()));c.open(self.url+'/api/bookings?day='+self.day).read();return c
 def call(self,c,method,path,b=None):
  r=urllib.request.Request(self.url+path,data=json.dumps(b).encode() if b else None,method=method,headers={'Content-Type':'application/json'})
  try:
   with c.open(r) as response:return response.status,json.load(response)
  except urllib.error.HTTPError as e:return e.code,json.load(e)
 def test_conflict_quota_and_ownership(self):
  a,b=self.client(),self.client();payload=dict(name='Prueba',day=self.day,desk=1,start=540,end=660)
  self.assertEqual(self.call(a,'POST','/api/bookings',payload)[0],201)
  self.assertEqual(self.call(b,'POST','/api/bookings',payload)[0],400)
  later={**payload,'desk':2,'start':660,'end':690}
  self.assertEqual(self.call(a,'POST','/api/bookings',later)[0],400)
  rows=json.load(a.open(self.url+'/api/bookings?day='+self.day));id=rows[0]['id'];self.assertTrue(rows[0]['mine'])
  self.assertEqual(self.call(b,'DELETE','/api/bookings/'+id)[0],403)
  self.assertEqual(self.call(a,'DELETE','/api/bookings/'+id)[0],200)
  self.assertEqual(self.call(b,'POST','/api/bookings',payload)[0],201)
 def test_invalid_intervals(self):
  a=self.client()
  for start,end in [(540,540),(481,510),(1020,1110)]:
   self.assertEqual(self.call(a,'POST','/api/bookings',dict(name='Prueba',day=self.day,desk=3,start=start,end=end))[0],400)
