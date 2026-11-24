import React from 'react';
import {mealPlans} from './domain/mealPlans.js';

export function MealPlan({goal, label}) {
  return <section className="card"><h2>Menú del día</h2>
    <p>Ejemplo de alimentación para tu objetivo de {label.toLowerCase()}. Ajusta los ingredientes según tus preferencias y alergias.</p>
    <dl className="meals">{Object.entries(mealPlans[goal]).map(([meal,dish])=>
      <div key={meal} className={meal === 'Desayuno' ? 'breakfast' : undefined}>
        <dt>{meal}</dt><dd>{meal === 'Desayuno' &&
          <img src={'/identidad/'+goal+'.jpg'} alt="" loading="lazy" width="480" height="480"/>}
          {dish}</dd>
      </div>)}</dl>
    <a href="https://www.who.int/es/news-room/fact-sheets/detail/healthy-diet">Guía de alimentación saludable de la OMS</a>
  </section>;
}
