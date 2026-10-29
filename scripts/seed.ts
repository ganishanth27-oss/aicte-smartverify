import { getDb } from '../src/lib/db';
import { seedIfEmpty } from '../src/lib/seed-data';

const seeded = seedIfEmpty();
console.log(seeded ? 'Seeded synthetic SmartVerify demo data.' : 'Demo data already present; no changes made.');
getDb().close();
