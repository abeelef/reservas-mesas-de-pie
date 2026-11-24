import sqlite3, unittest
from pathlib import Path
class SchemaTests(unittest.TestCase):
 def setUp(self):
  self.db=sqlite3.connect(':memory:');self.db.executescript(Path('migrations/0001_bookings.sql').read_text())
 def tearDown(self):self.db.close()
 def add(self,id='a',owner='one',desk=1,start=540,end=600):
  self.db.execute('INSERT INTO bookings VALUES (?,?,?,?,?,?,?)',(id,owner,'Ana','2026-11-25',desk,start,end))
 def test_overlaps(self):
  self.add()
  for params in [dict(id='b',owner='two'),dict(id='b',desk=2)]:
   with self.assertRaisesRegex(sqlite3.IntegrityError,'booking_conflict'):self.add(**params)
  self.add(id='c',owner='two',desk=2)
  self.add(id='d',start=600,end=660)
 def test_quota(self):
  self.add(end=660)
  with self.assertRaisesRegex(sqlite3.IntegrityError,'booking_quota'):self.add(id='b',start=660,end=690)
 def test_cancel_releases_capacity(self):
  self.add(end=660);self.db.execute('DELETE FROM bookings WHERE id=? AND owner=?',('a','other'))
  self.assertEqual(self.db.execute('SELECT COUNT(*) FROM bookings').fetchone()[0],1)
  self.db.execute('DELETE FROM bookings WHERE id=? AND owner=?',('a','one'))
  self.add(id='b',end=660)
