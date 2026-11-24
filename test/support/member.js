// Conserva los datos del fixture y evita colisiones al repetir un spec en el visor.
export function newMember(template){
  return {...template,email:template.email.replace('@','+'+crypto.randomUUID()+'@')};
}
