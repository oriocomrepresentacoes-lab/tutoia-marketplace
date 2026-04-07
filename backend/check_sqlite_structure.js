const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');

try {
    const database = new DatabaseSync(dbPath);
    
    console.log('--- TABLE STRUCTURE ---');
    const tables = database.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    for (const table of tables) {
        console.log(`\nTable: ${table.name}`);
        const columns = database.prepare(`PRAGMA table_info(${table.name})`).all();
        console.log(JSON.stringify(columns, null, 2));
    }

} catch (err) {
    console.error('CRITICAL ERROR reading dev.db:', err.message);
}
