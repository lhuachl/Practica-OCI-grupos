import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';

// Cada recorrido crea su socio en la interfaz y usa el contexto aislado de Playwright.
async function register(page) {
  const email = randomUUID()+'@example.test';
  await page.goto('/');
  await page.getByLabel('Nombre',{exact:true}).fill('Ana');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill('Prueba-gym-123');
  await page.getByRole('button',{name:'Crear cuenta',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Hola, Ana'})).toBeVisible();
  return email;
}
test('El alta conserva la sesión al recargar',async({page})=>{
  await register(page);
  await page.reload();
  await expect(page.getByRole('button',{name:'Cerrar sesión'})).toBeVisible();
});
test('El socio puede salir y volver a ingresar',async({page})=>{
  const email=await register(page);
  await page.getByRole('button',{name:'Cerrar sesión'}).click();
  await page.getByRole('button',{name:'Ya tengo una cuenta'}).click();
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill('Prueba-gym-123');
  await page.getByRole('button',{name:'Ingresar',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Hola, Ana'})).toBeVisible();
});
test('Cambiar el objetivo actualiza el desayuno y su imagen',async({page})=>{
  await register(page);
  await page.getByLabel('Objetivo').selectOption('resistencia');
  await expect(page.getByText('Avena con leche y plátano')).toBeVisible();
  const photo=page.locator('.breakfast img');
  await photo.scrollIntoViewIfNeeded();
  await expect(photo).toHaveAttribute('src','/identidad/resistencia.jpg');
  await expect.poll(()=>photo.evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);
});
async function planVisit(page){
  await page.getByLabel('Día de entrenamiento').fill('2099-03-15');
  await page.getByLabel('Llegada',{exact:true}).fill('16:00');
  await page.getByLabel('Salida',{exact:true}).fill('16:45');
  await page.getByRole('button',{name:'Generar mi rutina'}).click();
  await expect(page.getByText(/45 minutos disponibles/)).toBeVisible();
}
test('Generar una rutina distribuye la visita y muestra ejercicios',async({page})=>{
  await register(page);
  await planVisit(page);
  await expect(page.getByText('Vuelta a la calma',{exact:true})).toBeVisible();
  await expect(page.locator('.routine figure').first()).toContainText('16:00');
  await expect(page.locator('.routine figure').last()).toContainText('16:45');
});
test('Quitar el horario cancela la rutina guardada',async({page})=>{
  await register(page);
  await planVisit(page);
  await page.getByRole('button',{name:'Quitar horario'}).click();
  await expect(page.getByText('Tu rutina aparecerá aquí cuando elijas el horario.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Quitar horario'})).toHaveCount(0);
});
test('La entrada marca el calendario y la salida conserva el progreso',async({page})=>{
  await register(page);
  await page.getByRole('button',{name:'Registrar mi entrada'}).click();
  await expect(page.locator('.calendar .attended')).toHaveCount(1);
  await expect(page.getByRole('progressbar')).toHaveAttribute('value','8');
  await page.getByRole('button',{name:'Registrar mi salida'}).click();
  await page.reload();
  await expect(page.getByRole('button',{name:'Registrar mi entrada'})).toBeVisible();
  await expect(page.locator('.calendar .attended')).toHaveCount(1);
});
