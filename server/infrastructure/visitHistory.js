export function createVisitHistory(db) {
  // La entrada y su huella histórica se guardan en la misma operación de SQLite.
  // También se recuperan las presencias que seguían registradas al actualizar.
  db.exec(`
    CREATE TABLE IF NOT EXISTS visit_days (
      member INTEGER NOT NULL REFERENCES members(id), day TEXT NOT NULL,
      PRIMARY KEY (member, day)
    );
    INSERT OR IGNORE INTO visit_days SELECT member, day FROM attendance;
    CREATE TRIGGER IF NOT EXISTS record_visit_day AFTER INSERT ON attendance BEGIN
      INSERT OR IGNORE INTO visit_days(member,day) VALUES(NEW.member,NEW.day);
    END;
  `);
  const query = db.prepare('SELECT day FROM visit_days WHERE member=? AND day BETWEEN ? AND ? ORDER BY day');
  return { daysInMonth(member, month) {
    return query.all(member, month+'-01', month+'-31').map(row => row.day);
  }};
}
