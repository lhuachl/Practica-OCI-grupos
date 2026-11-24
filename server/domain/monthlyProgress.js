// La meta expresa días de asistencia, independientemente del número de entradas.
export function monthlyProgress(days, target = 12) {
  return { days, target, percent: Math.min(100, Math.round(days.length * 100 / target)) };
}
