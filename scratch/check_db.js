const { Pool } = require('pg');
const dbUrl = "postgresql://neondb_owner:npg_3rn1fipAUaOG@ep-plain-silence-aorbqtii-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        const res = await pool.query('SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 5');
        console.log('Recent Enquiries:', JSON.stringify(res.rows, null, 2));
        const stats = await pool.query('SELECT anxiety_score, count(*) FROM enquiries GROUP BY anxiety_score');
        console.log('Anxiety Stats:', stats.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
