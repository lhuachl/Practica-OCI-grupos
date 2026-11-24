import { monthlyProgress } from './domain/monthlyProgress.js';
import { createVisitHistory } from './infrastructure/visitHistory.js';
import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { menus, buildPlan } from './catalog.js';

import { installAttendance, gymClock, validTime } from './attendance.js';

const hashPassword = promisify(scrypt);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const path = process.env.DB_PATH || resolve(root, 'data/gymturno.sqlite');
mkdirSync(dirname(path), { recursive: true });
const db = new DatabaseSync(path);
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
    salt TEXT NOT NULL, password TEXT NOT NULL, goal TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY, member INTEGER NOT NULL REFERENCES members(id), expires INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS bookings (
    member INTEGER NOT NULL REFERENCES members(id), day TEXT NOT NULL, slot TEXT NOT NULL,
    PRIMARY KEY(member, day)
  );
  CREATE INDEX IF NOT EXISTS bookings_day ON bookings(day, slot);
`);
// Las visitas anteriores conservan la hora elegida hasta que el socio complete su salida.
const columns = db.prepare('PRAGMA table_info(bookings)').all().map(column=>column.name);
for (const column of ['departure','goal','plan']) {
  if (!columns.includes(column)) db.exec('ALTER TABLE bookings ADD COLUMN '+column+' TEXT');
}
const app = express();
app.use(express.json({limit: '12kb'}));
const digest = value => createHash('sha256').update(value).digest('hex');
const cookieOptions = { httpOnly: true, sameSite: 'strict', path: '/', secure: process.env.COOKIE_SECURE === 'true' };
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  const token = req.headers.cookie?.match(/(?:^|;\s*)session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (token) {
    req.sessionKey = digest(token);
    req.member = db.prepare('SELECT m.id,m.name,m.goal FROM members m JOIN sessions s ON m.id=s.member WHERE s.token=? AND s.expires>?').get(req.sessionKey, Date.now());
  }
  next();
});
function startSession(res, member) {
  const token = randomBytes(32).toString('hex');
  const maxAge = 7 * 24 * 3600 * 1000;
  db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());
  db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(token), member, Date.now()+maxAge);
  res.cookie('session', token, {...cookieOptions, maxAge});
}
app.get('/api/health', (_, res) => res.json({status:'ok'}));
app.get('/api/me', (req,res) => res.json({member:req.member || null}));
app.post('/api/register', async (req,res) => {
  const {name,email,password,goal} = req.body || {};
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 80 ||
      typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254 ||
      typeof password !== 'string' || password.length < 8 || password.length > 128 || !Object.hasOwn(menus, goal))
    return res.status(400).json({error:'Revisa los datos. La contraseña debe tener entre 8 y 128 caracteres.'});
  const salt = randomBytes(16).toString('hex');
  const hash = await hashPassword(password,salt,64);
  const result = db.prepare('INSERT INTO members(name,email,salt,password,goal) VALUES(?,?,?,?,?) ON CONFLICT(email) DO NOTHING')
    .run(name.trim(),email.trim().toLowerCase(),salt,hash.toString('hex'),goal);
  if (!result.changes) return res.status(409).json({error:'Ese correo ya tiene una cuenta.'});
  startSession(res,Number(result.lastInsertRowid));
  res.status(201).json({member:{id:Number(result.lastInsertRowid),name:name.trim(),goal}});
});
app.post('/api/login', async (req,res) => {
  const {email,password} = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || password.length > 128)
    return res.status(400).json({error:'Revisa el correo y la contraseña.'});
  const member = db.prepare('SELECT * FROM members WHERE email=?').get(email.trim().toLowerCase());
  const hash = await hashPassword(password,member?.salt || 'gymturno',64);
  if (!member || !timingSafeEqual(hash,Buffer.from(member.password,'hex')))
    return res.status(401).json({error:'Correo o contraseña incorrectos.'});
  startSession(res,member.id);
  res.json({member:{id:member.id,name:member.name,goal:member.goal}});
});
app.post('/api/logout',(req,res) => {
  if (req.sessionKey) db.prepare('DELETE FROM sessions WHERE token=?').run(req.sessionKey);
  res.clearCookie('session',cookieOptions).sendStatus(204);
});
installAttendance(app, db);
const visits = createVisitHistory(db);
app.get('/api/progreso', (req,res) => {
  if (!req.member) return res.status(401).json({error:'Inicia sesión para ver tu progreso.'});
  const month = req.query.month;
  if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    return res.status(400).json({error:'Selecciona un mes válido.'});
  res.json(monthlyProgress(visits.daysInMonth(req.member.id, month)));
});
app.use('/api/agenda',(req,res,next) => {
  if (!req.member) return res.status(401).json({error:'Inicia sesión para ver tu agenda.'});
  const day = req.query.day;
  const time = typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) ? Date.parse(day+'T00:00:00Z') : NaN;
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0,10)!==day)
    return res.status(400).json({error:'Selecciona una fecha válida.'});
  next();
});
app.get('/api/agenda',(req,res) => {
  const booking=db.prepare('SELECT * FROM bookings WHERE member=? AND day=?').get(req.member.id,req.query.day);
  const schedule=db.prepare('SELECT slot,count(*) AS planned FROM bookings WHERE day=? GROUP BY slot').all(req.query.day);
  res.json({schedule,booked:booking?.slot || null,departure:booking?.departure || null,
    goal:booking?.goal || req.member.goal,routine:booking?.plan ? JSON.parse(booking.plan) : []});
});
app.put('/api/agenda',(req,res) => {
  const {slot,departure,goal=req.member.goal}=req.body || {};
  const now=gymClock();
  const existing=db.prepare('SELECT slot FROM bookings WHERE member=? AND day=?').get(req.member.id,req.query.day);
  if (!validTime(slot) || !(validTime(departure) || departure==='20:00') || departure<=slot ||
      !Object.hasOwn(menus,goal) || req.query.day<now.day ||
      (req.query.day===now.day && (departure<=now.time || (slot<now.time && existing?.slot!==slot)))) {
    return res.status(400).json({error:'Revisa el objetivo y el horario. La salida debe ser posterior a la llegada y como máximo a las 20:00.'});
  }
  const occupied={};
  // Solo una visita en curso usa el conteo actual. Los planes futuros usan el inventario.
  if(req.query.day===now.day && now.open && slot<=now.time && now.time<departure){
    const rows=db.prepare('SELECT machine,count(*) AS used FROM attendance WHERE day=? AND member<>? AND machine IS NOT NULL GROUP BY machine').all(now.day,req.member.id);
    for(const row of rows) occupied[row.machine]=row.used;
  }
  const plan=buildPlan(goal,slot,departure,occupied);
  db.prepare('INSERT INTO bookings(member,day,slot,departure,goal,plan) VALUES(?,?,?,?,?,?) ON CONFLICT(member,day) DO UPDATE SET slot=excluded.slot,departure=excluded.departure,goal=excluded.goal,plan=excluded.plan')
    .run(req.member.id,req.query.day,slot,departure,goal,JSON.stringify(plan));
  res.sendStatus(204);
});
app.delete('/api/agenda',(req,res) => {
  db.prepare('DELETE FROM bookings WHERE member=? AND day=?').run(req.member.id,req.query.day);
  res.sendStatus(204);
});
app.use('/api',(_,res)=>res.status(404).json({error:'Ruta desconocida.'}));
if (process.argv.includes('--dev')) {
  const {createServer} = await import('vite');
  const vite = await createServer({root, server:{middlewareMode:true},appType:'spa'});
  app.use(vite.middlewares);
} else {
  app.use(express.static(resolve(root,'dist')));
}
app.use((err,req,res,next)=>{
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({error:err.status===400?'Solicitud inválida.':'No se pudo completar la solicitud.'});
});
const port=Number(process.env.PORT || 3000);
const server=app.listen(port,()=>console.log('GymTurno en http://localhost:'+server.address().port));
