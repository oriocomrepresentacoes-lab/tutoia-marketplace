const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');

try {
    const database = new DatabaseSync(dbPath);
    
    // Check for users
    console.log('--- USERS IN dev.db ---');
    try {
        const users = database.prepare('SELECT id, name, email, role FROM users').all();
        console.log(JSON.stringify(users, null, 2));
    } catch (e) {
        console.log('Error reading users (maybe table does not exist):', e.message);
    }

    // Check for banners
    console.log('\n--- BANNERS IN dev.db ---');
    try {
        const banners = database.prepare('SELECT id, title, image, position FROM banners').all();
        console.log(JSON.stringify(banners, null, 2));
    } catch (e) {
        console.log('Error reading banners (maybe table does not exist):', e.message);
    }

} catch (err) {
    console.error('CRITICAL ERROR reading dev.db:', err.message);
}
