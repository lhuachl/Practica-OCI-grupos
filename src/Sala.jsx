import React, {useEffect,useRef,useState} from 'react';

export function Sala({api}) {
  const [room,setRoom]=useState(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const version=useRef(0);
  const writing=useRef(false);
  useEffect(()=>{
    let active=true;
    // Otros socios pueden entrar o cambiar de equipo mientras esta página está abierta.
    async function refresh(){
      if(writing.current) return;
      const request=++version.current;
      try {
        const latest=await api('sala');
        if(active && request===version.current) setRoom(latest);
      } catch(err){if(active && request===version.current)setError(err.message);}
    }
    refresh();
    const timer=setInterval(refresh,10000);
    return ()=>{active=false;clearInterval(timer);};
  },[api]);
  async function change(path,method,data){
    writing.current=true;version.current++;setBusy(true);setError('');
    try {setRoom(await api('sala/'+path,method,data));}
    catch(err){setError(err.message);}
    finally{writing.current=false;setBusy(false);}
  }
  return <section className="room"><h2>Ahora en el gimnasio</h2>
    {error && <p role="alert">{error}</p>}
    {room ? <><div className="room-head"><div><strong className="total">{room.total}</strong> {room.total===1?'persona presente':'personas presentes'}<small>{room.open?'Abierto':'Cerrado'} · 07:00 – 20:00</small></div>
    <button disabled={busy || !room.open} onClick={()=>change('entrada',room.inside?'DELETE':'PUT')}>{room.inside?'Registrar mi salida':'Registrar mi entrada'}</button></div>
    <h3>Equipos en uso</h3><p>Se actualiza cada 10 segundos según el equipo que marca cada socio.</p>
    <div className="equipment">{room.equipment.map(e=><div key={e.name}><b>{e.name}</b><small>{e.used} de {e.units} en uso</small>
      {room.inside && <button disabled={busy || (e.used>=e.units && room.machine!==e.name)} onClick={()=>change('equipo','PUT',{machine:room.machine===e.name?null:e.name})}>{room.machine===e.name?'Liberar equipo':'Usar '+e.name}</button>}</div>)}</div></>:<p>Consultando asistencia…</p>}</section>;
}
