import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const { discoverNotificationRoutes } = await import('../lib/notification-discovery');
const { pool } = await import('../lib/db');
try { console.log(`Discovered ${await discoverNotificationRoutes()} legacy recipient identities; new routes are disabled.`); }
finally { await pool.end(); }
