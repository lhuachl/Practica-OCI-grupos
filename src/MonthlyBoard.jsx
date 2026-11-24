import React, {useEffect,useState} from 'react';

export function MonthlyBoard({api,today,revision}) {
  const [month,setMonth]=useState(today.slice(0,7));
  const [report,setReport]=useState(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    let active=true;
    setReport(null);
    setError('');
    api('progreso?month='+month).then(data=>{if(active)setReport(data);})
      .catch(err=>{if(active)setError(err.message);});
    return ()=>{active=false;};
  },[month,revision,api]);
  const [year,number]=month.split('-').map(Number);
  const first=new Date(year,number-1,1);
  const count=new Date(year,number,0).getDate();
  // El calendario empieza en lunes, con la fecha local de cada ingreso en Bolivia.
  const offset=(first.getDay()+6)%7;
  return <section className="card board"><h2>Mi asistencia</h2>
    <label>Mes<input type="month" value={month} max={today.slice(0,7)}
      onChange={event=>{if(event.target.validity.valid && event.target.value)setMonth(event.target.value);}}/></label>
    {error && <p role="alert">{error}</p>}
    {report ? <><div className="board-summary"><div><strong>{report.percent}%</strong><p>{report.days.length} días de asistencia · Meta mensual de {report.target} días</p></div>
      <progress aria-label="Progreso de asistencia mensual" max="100" value={report.percent}/></div>
      <div className="calendar">{['Lu','Ma','Mi','Ju','Vi','Sá','Do'].map(d=><b key={d}>{d}</b>)}
      {Array.from({length:count},(_,i)=>{
        const date=month+'-'+String(i+1).padStart(2,'0');
        const attended=report.days.includes(date);
        return <span key={date} className={attended?'attended':''} style={i===0?{gridColumnStart:offset+1}:undefined}
          aria-label={date+(attended?', asististe':'')} aria-current={date===today?'date':undefined}>{i+1}{attended?' ✓':''}</span>;
      })}</div><small>✓ Día con entrada registrada</small></> : !error && <p>Cargando asistencia…</p>}
  </section>;
}
