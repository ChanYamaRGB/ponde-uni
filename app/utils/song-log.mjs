import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, './DB/song-log.sqlite');

let dbPromise = null;

async function getDB() {
  if (!dbPromise) {
    dbPromise = open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    const db = await dbPromise;
    await db.exec(`
      CREATE TABLE IF NOT EXISTS song_update_log (
        id INTEGER PRIMARY KEY,
        date TEXT NOT NULL
      )
    `);
  }

  return dbPromise;
}

export async function readLastUpdateDate() {
  const db = await getDB();
  const row = await db.get(`SELECT date FROM song_update_log WHERE id = 1`);
  return row?.date || null;
}

export async function writeLastUpdateDate(dateStr) {
  const db = await getDB();
  await db.run(`
    INSERT INTO song_update_log (id, date)
    VALUES (1, ?)
    ON CONFLICT(id) DO UPDATE SET date = excluded.date
  `, dateStr);
}
