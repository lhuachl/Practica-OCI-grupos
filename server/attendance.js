import { equipment } from './catalog.js';

// El horario se evalúa en Bolivia, incluso si el servidor está en otra región.
export function gymClock(now = new Date()) {
  const day = now.toLocaleDateString('sv-SE', {timeZone:'America/La_Paz'});
  const time = now.toLocaleTimeString('en-GB', {timeZone:'America/La_Paz',hour:'2-digit',minute:'2-digit'});
  return {day,time,open:validTime(time)};
}
export function validTime(time) {
  return typeof time === 'string' && /^\d{2}:[0-5]\d$/.test(time) && time >= '07:00' && time < '20:00';
}

export function installAttendance(app, db, clock = gymClock) {
  db.exec('CREATE TABLE IF NOT EXISTS attendance (member INTEGER PRIMARY KEY REFERENCES members(id), day TEXT NOT NULL, machine TEXT)');
  app.use('/api/sala', (req,res,next) => {
    if (!req.member) return res.status(401).json({error:'Inicia sesión para consultar la sala.'});
    req.gym = clock();
    // Al cerrar se liberan también los equipos de quienes olvidaron marcar su salida.
    if (req.gym.open) db.prepare('DELETE FROM attendance WHERE day<>?').run(req.gym.day);
    else db.exec('DELETE FROM attendance');
    next();
  });
  function summary(req,res) {
    const rows = db.prepare('SELECT member,machine FROM attendance WHERE day=?').all(req.gym.day);
    const visit = rows.find(row=>row.member===req.member.id);
    res.json({open:req.gym.open, total:rows.length, inside:Boolean(visit), machine:visit?.machine ?? null,
      equipment:Object.entries(equipment).map(([name,units])=>({name,units,used:rows.filter(row=>row.machine===name).length}))});
  }
  app.get('/api/sala',summary);
  app.put('/api/sala/entrada',(req,res)=>{
    if (!req.gym.open) return res.status(409).json({error:'El gimnasio abre de 07:00 a 20:00.'});
    db.prepare('INSERT INTO attendance(member,day) VALUES(?,?) ON CONFLICT(member) DO NOTHING').run(req.member.id,req.gym.day);
    summary(req,res);
  });
  app.delete('/api/sala/entrada',(req,res)=>{
    db.prepare('DELETE FROM attendance WHERE member=?').run(req.member.id);
    summary(req,res);
  });
  app.put('/api/sala/equipo',(req,res)=>{
    const name=req.body?.machine;
    if (name !== null && !Object.hasOwn(equipment,name)) return res.status(400).json({error:'Selecciona un equipo válido.'});
    // Una sola escritura verifica la disponibilidad y libera el equipo anterior.
    const result=db.prepare('UPDATE attendance SET machine=? WHERE member=? AND (machine IS ? OR ? IS NULL OR (SELECT count(*) FROM attendance WHERE machine=?) < ?)').run(name,req.member.id,name,name,name,equipment[name] ?? 0);
    if (!result.changes) return res.status(409).json({error:'Registra tu entrada y comprueba que haya un equipo libre.'});
    summary(req,res);
  });
}
