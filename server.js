require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Deep Purge of conflicting Env Vars
delete process.env.PGHOST;
delete process.env.PGUSER;
delete process.env.PGPASSWORD;
delete process.env.PGDATABASE;
delete process.env.PGPORT;

// PostgreSQL Connection (HARDCODED PROOF)
const dbUrl = "postgres://npg_6xEnXaGFM5CN:npg_6xEnXaGFM5CN@ep-plain-silence-aorbqtii-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

// API: Test Connection
app.get('/api/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ success: true, message: '✅ Database Connected!', time: result.rows[0].now });
    } catch (err) {
        res.status(500).json({ success: false, message: '❌ Connection Failed', error: err.message });
    }
});

// Initialize Database Tables
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,
                clinic_name TEXT,
                affiliation TEXT,
                phone TEXT,
                logo_url TEXT,
                photo_url TEXT
            );
            CREATE TABLE IF NOT EXISTS gallery (
                id SERIAL PRIMARY KEY,
                image_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS enquiries (
                id SERIAL PRIMARY KEY,
                patient_name TEXT,
                message TEXT,
                platform TEXT,
                status TEXT,
                urgency TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('PostgreSQL Tables Initialized');
    } catch (err) {
        console.error('Database Init Error:', err);
    }
}
initDB();

// Configure File Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static('uploads'));
app.use(express.json());

// API: Get Settings
app.get('/api/settings', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
        res.json({ settings: result.rows[0] || {} });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// API: Save Settings
app.post('/api/settings', async (req, res) => {
    const { clinicName, affiliation, phone } = req.body;
    try {
        await pool.query(
            'INSERT INTO settings (clinic_name, affiliation, phone) VALUES ($1, $2, $3)',
            [clinicName, affiliation, phone]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// API: Upload Media
app.post('/api/upload', upload.single('file'), async (req, res) => {
    const { type } = req.body;
    const filePath = `/uploads/${req.file.filename}`;
    
    try {
        if (type === 'logo') {
            await pool.query('UPDATE settings SET logo_url = $1 WHERE id = (SELECT id FROM settings ORDER BY id DESC LIMIT 1)', [filePath]);
        } else if (type === 'photo') {
            await pool.query('UPDATE settings SET photo_url = $1 WHERE id = (SELECT id FROM settings ORDER BY id DESC LIMIT 1)', [filePath]);
        } else if (type === 'gallery') {
            await pool.query('INSERT INTO gallery (image_url) VALUES ($1)', [filePath]);
        }
        res.json({ success: true, filePath: filePath });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// AiSensy WhatsApp Webhook Endpoint
app.post('/api/webhooks/aisensy', express.json(), (req, res) => {
    const incomingMessage = req.body;
    console.log('Incoming WhatsApp Message from AiSensy:', incomingMessage);
    
    // LOGIC: 
    // 1. Send to OpenAI (Digital Brain)
    // 2. Classify (Urgent/Lead/Query)
    // 3. Send response back via AiSensy API
    // 4. Update Dashboard
    
    res.status(200).send('Webhook Received');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
