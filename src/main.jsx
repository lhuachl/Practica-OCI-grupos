import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import { MonthlyBoard } from './MonthlyBoard.jsx';
import { MealPlan } from './MealPlan.jsx';
import { Sala } from './Sala.jsx';

// La sesión viaja en una cookie y el servidor decide qué datos puede consultar cada socio.
async function api(path, method = 'GET', data) {
  const response = await fetch('/api/' + path, {
    method, headers: data ? {'Content-Type':'application/json'} : {},
    body: data ? JSON.stringify(data) : undefined
  });
  if (response.status === 204) return;
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}

const goals = {fuerza:'Ganar fuerza',movilidad:'Mejorar movilidad',peso:'Bajar de peso',resistencia:'Mejorar resistencia',general:'Mantenerme activo'};
function GoalOptions() {
  return Object.entries(goals).map(([id,label])=><option key={id} value={id}>{label}</option>);
}

function Access({onMember}) {
  const [register, setRegister] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true); setError('');
    try { onMember((await api(register ? 'register' : 'login', 'POST', data)).member); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <main className="access"><section><h1>Tu rutina,<br/>a tu hora.</h1>
    <p>Elige cuándo entrenar y consulta cuántas personas han registrado su entrada. Abierto de 07:00 a 20:00.</p></section>
    <form onSubmit={submit}><h2>{register ? 'Crear mi cuenta' : 'Ingresar al gimnasio'}</h2>
      {register && <label>Nombre<input name="name" autoComplete="given-name" maxLength="80" required/></label>}
      <label>Correo electrónico<input type="email" name="email" autoComplete="email" required/></label>
      <label>Contraseña<input type="password" name="password" autoComplete={register?'new-password':'current-password'} minLength={register?8:1} maxLength="128" required/></label>
      {register && <><small>Usa al menos 8 caracteres.</small><label>Objetivo<select name="goal"><GoalOptions/></select></label></>}
      {error && <p role="alert">{error}</p>}
      <button disabled={busy}>{register?'Crear cuenta':'Ingresar'}</button>
      <button type="button" className="link" disabled={busy} onClick={()=>{setRegister(!register);setError('');}}>{register?'Ya tengo una cuenta':'Crear una cuenta nueva'}</button>
    </form></main>;
}

// Al cambiar la fecha se carga otra agenda. Los datos de un día nunca se muestran en el siguiente.
function Agenda({day}) {
  const [agenda,setAgenda] = useState(null);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const [arrival,setArrival] = useState('');
  const [departure,setDeparture]=useState('');
  const [goal,setGoal]=useState('fuerza');
  const path = 'agenda?day='+encodeURIComponent(day);
  useEffect(()=>{
    let active=true;
    api(path).then(data=>{if(active){setAgenda(data);setArrival(data.booked || '');setDeparture(data.departure || '');setGoal(data.goal);}}).catch(err=>{if(active)setError(err.message);});
    return ()=>{active=false;};
  },[path]);
  async function reserve(slot) {
    setBusy(true); setError('');
    try {
      await api(path, slot?'PUT':'DELETE',slot?{slot,departure,goal}:undefined);
      setAgenda(await api(path));
      if(!slot){setArrival('');setDeparture('');}
    } catch(err) {setError(err.message);}
    finally {setBusy(false);}
  }
  return <>{error && <p role="alert">{error}</p>}{agenda ? <>
    <section className="card"><h2>Planificar mi entrenamiento</h2><p>Elige un objetivo para esta visita y el tiempo que tendrás disponible.</p>
    <form className="arrival" onSubmit={event=>{event.preventDefault();reserve(arrival);}}>
      <label>Objetivo<select value={goal} onChange={e=>setGoal(e.target.value)}><GoalOptions/></select></label>
      <label>Llegada<input type="time" min="07:00" max="19:59" required value={arrival} onChange={e=>setArrival(e.target.value)}/></label>
      <label>Salida<input type="time" min={arrival || '07:01'} max="20:00" required value={departure} onChange={e=>setDeparture(e.target.value)}/></label>
      <button disabled={busy}>{agenda.routine.length?'Actualizar rutina':'Generar mi rutina'}</button>
      {agenda.booked && <button type="button" className="link" disabled={busy} onClick={()=>reserve(null)}>Quitar horario</button>}
    </form>
    {arrival && <p>Para las {arrival}, hay {agenda.schedule.find(s=>s.slot===arrival)?.planned || 0} llegadas previstas.</p>}
    </section><section className="card"><h2>Mi rutina</h2>
    {agenda.routine.length ? <><p role="status"><b>{goals[agenda.goal]}</b> · {agenda.booked} – {agenda.departure} · {agenda.routine.reduce((sum,ex)=>sum+ex.length,0)} minutos disponibles</p>
    <p>Los bloques incluyen pausas y cambios de equipo.</p><div className="routine">{agenda.routine.map(ex=><figure key={ex.start}>
      {ex.photo && <img src={'/ejercicios/'+ex.photo+'.jpg'} alt={ex.name} loading="lazy"/>}
      <figcaption><small>{ex.start} – {ex.end}</small><strong>{ex.name}</strong><span>{ex.length} min{ex.machine && ' · '+ex.machine}</span></figcaption></figure>)}</div></> : <p>{agenda.booked?'Completa la hora de salida para generar tu rutina.':'Tu rutina aparecerá aquí cuando elijas el horario.'}</p>}
    </section><MealPlan goal={goal} label={goals[goal]}/></> : !error && <p>Cargando agenda…</p>}</>;
}

function App() {
  const [revision,setRevision]=useState(0);
  const [member,setMember] = useState(undefined);
  const [error,setError] = useState('');
  const today = new Date();
  const localDay = today.toLocaleDateString('sv-SE',{timeZone:'America/La_Paz'});
  const [day,setDay] = useState(localDay);
  useEffect(()=>{api('me').then(data=>setMember(data.member)).catch(err=>setError(err.message));},[]);
  async function logout(){
    try {await api('logout','POST'); setMember(null); setError('');}
    catch(err){setError(err.message);}
  }
  return <><header><div className="brand"><img src="/identidad/gymturno.png" alt="" width="52" height="52"/><strong>GymTurno</strong></div>{member && <button className="link" onClick={logout}>Cerrar sesión</button>}</header>
    {error && <p role="alert">{error}</p>}
    {member===undefined ? <main>Consultando sesión…</main> : member ? <main><h1>Hola, {member.name}</h1><MonthlyBoard api={api} today={localDay} revision={revision}/><Sala api={api} onCheckIn={()=>setRevision(value=>value+1)}/><label className="date">Día de entrenamiento<input type="date" min={localDay} value={day} onChange={e=>setDay(e.target.value)}/></label>
      {day>=localDay && <Agenda key={day} day={day}/>}</main> : <Access onMember={setMember}/>}</>;
}

createRoot(document.getElementById('root')).render(<App/>);
