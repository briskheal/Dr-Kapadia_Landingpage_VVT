require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 3000;

// Deep Purge of conflicting Env Vars
delete process.env.PGHOST;
delete process.env.PGUSER;
delete process.env.PGPASSWORD;
delete process.env.PGDATABASE;
delete process.env.PGPORT;

// PostgreSQL Connection (EXACT NEON STRING)
const dbUrl = "postgresql://neondb_owner:npg_3rn1fipAUaOG@ep-plain-silence-aorbqtii-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000 // 10s timeout for cold starts
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
                photo_url TEXT,
                fb_url TEXT,
                insta_url TEXT,
                linkedin_url TEXT,
                youtube_url TEXT,
                twitter_url TEXT,
                video_1 TEXT,
                video_2 TEXT,
                gallery_mode TEXT DEFAULT 'scrolling',
                fixed_image_id INTEGER
            );
            CREATE TABLE IF NOT EXISTS gallery (
                id SERIAL PRIMARY KEY,
                image_url TEXT,
                category TEXT DEFAULT 'medical',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS enquiries (
                id SERIAL PRIMARY KEY,
                patient_name TEXT,
                message TEXT,
                platform TEXT,
                status TEXT,
                urgency TEXT,
                patient_type TEXT DEFAULT 'chronic',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
        `);
        console.log('PostgreSQL Tables Initialized');
    } catch (err) {
        console.error('Database Init Error:', err);
    }
}
initDB();

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Storage Strategy
let storage;
if (process.env.CLOUDINARY_CLOUD_NAME) {
    console.log('Using Cloudinary Storage');
    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'dr-kapadia-portal',
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
        }
    });
} else {
    console.log('Using Local Disk Storage');
    storage = multer.diskStorage({
        destination: (req, file, cb) => {
            const dir = './uploads';
            if (!fs.existsSync(dir)) fs.mkdirSync(dir);
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            cb(null, Date.now() + '-' + file.originalname);
        }
    });
}

const upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static('uploads'));
app.use(express.json());

// API: Get Settings
app.get('/api/settings', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM settings WHERE id = 1');
        console.log('Sending Settings to Client:', result.rows[0]);
        res.json({ settings: result.rows[0] || {} });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// API: Get Gallery by Category
app.get('/api/gallery/:category', async (req, res) => {
    const { category } = req.params;
    try {
        const result = await pool.query('SELECT * FROM gallery WHERE category = $1 ORDER BY created_at DESC', [category]);
        res.json({ images: result.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// API: Dashboard Stats
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const total = await pool.query('SELECT COUNT(*) FROM enquiries');
        const emergency = await pool.query('SELECT COUNT(*) FROM enquiries WHERE patient_type = $1', ['emergency']);
        const chronic = await pool.query('SELECT COUNT(*) FROM enquiries WHERE patient_type = $1', ['chronic']);
        const masterclass = await pool.query('SELECT COUNT(*) FROM enquiries WHERE patient_type = $1', ['masterclass']);
        
        res.json({
            total: total.rows[0].count,
            emergency: emergency.rows[0].count,
            chronic: chronic.rows[0].count,
            masterclass: masterclass.rows[0].count,
            aiEfficiency: '96%'
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// API: Dashboard Enquiries
app.get('/api/dashboard/enquiries', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 10');
        res.json({ enquiries: result.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// API: Save Settings (UPSERT Logic)
app.post('/api/settings', async (req, res) => {
    const { clinicName, affiliation, phone, fbLink, instaLink, linkedinLink, youtubeLink, twitterLink, video1, video2, galleryMode, fixedImageId } = req.body;
    try {
        await pool.query(
            `INSERT INTO settings (id, clinic_name, affiliation, phone, fb_url, insta_url, linkedin_url, youtube_url, twitter_url, video_1, video_2, gallery_mode, fixed_image_id) 
             VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT (id) DO UPDATE SET 
                clinic_name = EXCLUDED.clinic_name, 
                affiliation = EXCLUDED.affiliation, 
                phone = EXCLUDED.phone,
                fb_url = EXCLUDED.fb_url,
                insta_url = EXCLUDED.insta_url,
                linkedin_url = EXCLUDED.linkedin_url,
                youtube_url = EXCLUDED.youtube_url,
                twitter_url = EXCLUDED.twitter_url,
                video_1 = EXCLUDED.video_1,
                video_2 = EXCLUDED.video_2,
                gallery_mode = EXCLUDED.gallery_mode,
                fixed_image_id = EXCLUDED.fixed_image_id`,
            [clinicName, affiliation, phone, fbLink, instaLink, linkedinLink, youtubeLink, twitterLink, video1, video2, galleryMode, fixedImageId]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// API: Upload Media
app.post('/api/upload', upload.single('file'), async (req, res) => {
    const { type } = req.body;
    // In Cloudinary, the path is in req.file.path (the full URL)
    // In Local, the path is /uploads/filename
    const filePath = req.file.path || `/uploads/${req.file.filename}`;
    console.log(`Uploading file type: ${type} to path: ${filePath}`);
    
    try {
        // Ensure at least one record exists to update
        await pool.query('INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING');

        if (type === 'logo') {
            await pool.query('UPDATE settings SET logo_url = $1 WHERE id = 1', [filePath]);
        } else if (type === 'photo') {
            await pool.query('UPDATE settings SET photo_url = $1 WHERE id = 1', [filePath]);
        } else if (type.startsWith('gallery_')) {
            const category = type.split('_')[1];
            await pool.query('INSERT INTO gallery (image_url, category) VALUES ($1, $2)', [filePath, category]);
        }
        res.json({ success: true, filePath: filePath });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Delete Gallery Item
app.delete('/api/gallery/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM gallery WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/api/login', (req, res) => {
    const { loginId, password } = req.body;
    if (loginId === 'DRKAPADIA' && password === 'AADICURA') {
        res.json({ success: true, token: 'dr-kapadia-secure-token', redirect: '/admin' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid Credentials' });
    }
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

// API: Submit Enquiry
app.post('/api/enquiry', async (req, res) => {
    const { patient_name, message, platform, urgency, patient_type } = req.body;
    try {
        await pool.query(
            'INSERT INTO enquiries (patient_name, message, platform, status, urgency, patient_type) VALUES ($1, $2, $3, $4, $5, $6)',
            [patient_name, message, platform || 'Website', 'new', urgency || 'routine', patient_type || 'chronic']
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
