export const equipment = { bicicleta:2, polea:1, banco:2, colchoneta:4, caminadora:2, elíptica:1, prensa:1, extensora:1, remo:1 };

// El orden de cada lista prioriza los movimientos que corresponden al objetivo.
export const menus = {
  fuerza:['polea','prensa','banco','extensora'],
  movilidad:['hombros','rodillas','bici'],
  peso:['caminata','eliptica','banco','remo','bici'],
  resistencia:['remo','bici','eliptica','caminata'],
  general:['banco','bici','polea','hombros','prensa']
};
const exercises = {
  bici:['Pedaleo suave','bicicleta','Bicycling_Stationary'],
  hombros:['Círculos de hombros','colchoneta','Shoulder_Circles'],
  rodillas:['Círculos de rodillas','colchoneta','Knee_Circles'],
  polea:['Remo en polea','polea','Seated_Cable_Rows'],
  banco:['Sentadilla con banco','banco','Chair_Squat'],
  caminata:['Caminata en cinta','caminadora','Walking_Treadmill'],
  eliptica:['Trabajo en elíptica','elíptica','Elliptical_Trainer'],
  prensa:['Prensa de piernas','prensa','Leg_Press'],
  extensora:['Extensión de piernas','extensora','Leg_Extensions'],
  remo:['Remo en ergómetro','remo','Rowing_Stationary']
};
export function minutes(time) {
  const [h,m] = time.split(':').map(Number);
  return h*60+m;
}
function clock(minute) {
  return [Math.floor(minute/60),minute%60].map(n=>String(n).padStart(2,'0')).join(':');
}

// Cada bloque incluye sus pausas y transiciones. Una estancia larga deja tiempo libre.
export function buildPlan(goal,arrival,departure,occupied={}) {
  let cursor=minutes(arrival);
  const end=minutes(departure);
  const duration=end-cursor;
  const blocks=[];
  function add(name,length,machine=null,photo=null) {
    if(length<=0) return;
    blocks.push({name,machine,photo,length,start:clock(cursor),end:clock(cursor+length)});
    cursor+=length;
  }
  const budget=Math.min(60,duration);
  const prep=Math.min(5,Math.floor(budget/5));
  const finish=Math.min(4,Math.floor(budget/6));
  const available=menus[goal].filter(id=>{
    const machine=exercises[id][1];
    return (occupied[machine] || 0)<equipment[machine];
  });
  const work=budget-prep-finish;
  const count=Math.min(available.length,Math.max(1,Math.floor(work/6)));
  add('Activación suave sin equipo',prep);
  if(count===0) add('Caminata suave sin máquina, con pausas',Math.min(work,10));
  for(let i=0;i<count;i++){
    const [name,machine,photo]=exercises[available[i]];
    add(name,Math.floor(work/count)+(i<work%count?1:0),machine,photo);
  }
  add('Vuelta a la calma',finish);
  add('Tiempo libre',end-cursor);
  return blocks;
}
