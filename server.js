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
                landing_page TEXT,
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
                fixed_image_id INTEGER,
                auto_pilot BOOLEAN DEFAULT FALSE
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
                phone TEXT,
                message TEXT,
                platform TEXT,
                status TEXT,
                urgency TEXT,
                patient_type TEXT DEFAULT 'chronic',
                anxiety_score INTEGER DEFAULT 0,
                attachment_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Table: Medical Directory (Dr. Kapadia's expert protocols)
            CREATE TABLE IF NOT EXISTS medical_directory (
                id SERIAL PRIMARY KEY,
                condition_name TEXT UNIQUE,
                diagnosis_logic TEXT,
                recommended_treatment TEXT,
                patient_advice TEXT
            );

            -- Seed Medical Directory
            INSERT INTO medical_directory (condition_name, diagnosis_logic, recommended_treatment, patient_advice)
            VALUES 
            ('Varicose Veins', 'Visible enlarged, twisted veins in legs; heaviness; skin changes.', 'EVLA (Endovenous Laser Ablation) or Sclerotherapy.', 'Avoid long standing, use compression stockings, and rest with legs elevated.'),
            ('DVT', 'Sudden swelling in one leg, pain, redness, warmth.', 'Immediate anticoagulation (blood thinners) and compression.', 'Seek urgent duplex ultrasound. Do not massage the leg.'),
            ('Diabetic Foot', 'Non-healing ulcers, cold feet, gangrene, neuropathy.', 'Specialized wound care and angioplasty to restore blood flow.', 'Keep blood sugar controlled. Inspect feet daily for any minor injuries.'),
            ('PAD', 'Pain while walking (claudication), leg cramps, cold skin.', 'Peripheral Angioplasty and Stenting.', 'Walk as much as tolerated. Control blood pressure and cholesterol.')
            ON CONFLICT (condition_name) DO NOTHING;
            INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
        `);

        // Table: Enquiry Categories (admin-managed dropdown)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS enquiry_categories (
                id SERIAL PRIMARY KEY,
                label TEXT NOT NULL,
                patient_type TEXT DEFAULT 'general',
                is_active BOOLEAN DEFAULT TRUE,
                sort_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // Seed default categories (skip if already seeded)
        await pool.query(`
            INSERT INTO enquiry_categories (label, patient_type, sort_order) VALUES
            ('General Appointment / Consultation', 'general', 1),
            ('Varicose Veins / Leg Swelling (Chronic)', 'chronic', 2),
            ('Active Symptoms – Pain, Ulcer, Wound', 'acute', 3),
            ('Emergency – Sudden Pain, DVT, Bleeding', 'emergency', 4),
            ('Professional / Student – Education & Masterclass', 'masterclass', 5)
            ON CONFLICT DO NOTHING;
        `);

        // Migration: Add columns to existing tables
        try { await pool.query('ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_pilot BOOLEAN DEFAULT FALSE'); } catch (e) {}
        try { await pool.query('ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS phone TEXT'); } catch (e) {}
        try { await pool.query('ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS anxiety_score INTEGER DEFAULT 0'); } catch (e) {}
        // Migration: Rename clinic_name -> landing_page
        try { await pool.query('ALTER TABLE settings RENAME COLUMN clinic_name TO landing_page'); } catch (e) {}
        
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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());

// ── Enquiry Categories API ─────────────────────────────────────────────────

// GET all active categories
app.get('/api/enquiry-categories', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM enquiry_categories WHERE is_active = TRUE ORDER BY sort_order, id');
        res.json({ categories: result.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST add new category
app.post('/api/enquiry-categories', async (req, res) => {
    const { label, patient_type } = req.body;
    if (!label || !patient_type) return res.status(400).json({ error: 'label and patient_type are required' });
    try {
        const result = await pool.query(
            'INSERT INTO enquiry_categories (label, patient_type) VALUES ($1, $2) RETURNING *',
            [label.trim(), patient_type]
        );
        res.json({ success: true, category: result.rows[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update category (label / patient_type / sort_order)
app.put('/api/enquiry-categories/:id', async (req, res) => {
    const { label, patient_type, sort_order } = req.body;
    try {
        await pool.query(
            'UPDATE enquiry_categories SET label=$1, patient_type=$2, sort_order=$3 WHERE id=$4',
            [label, patient_type, sort_order || 0, req.params.id]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE (soft-delete: set is_active = false)
app.delete('/api/enquiry-categories/:id', async (req, res) => {
    try {
        await pool.query('UPDATE enquiry_categories SET is_active = FALSE WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ────────────────────────────────────────────────────────────────────────────

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
        const total      = await pool.query('SELECT COUNT(*) FROM enquiries');
        const emergency  = await pool.query("SELECT COUNT(*) FROM enquiries WHERE patient_type = 'emergency'");
        const acute      = await pool.query("SELECT COUNT(*) FROM enquiries WHERE patient_type = 'acute'");
        const chronic    = await pool.query("SELECT COUNT(*) FROM enquiries WHERE patient_type = 'chronic'");
        const general    = await pool.query("SELECT COUNT(*) FROM enquiries WHERE patient_type = 'general'");
        const masterclass= await pool.query("SELECT COUNT(*) FROM enquiries WHERE patient_type = 'masterclass'");
        const highAnxiety= await pool.query('SELECT COUNT(*) FROM enquiries WHERE anxiety_score > 5');
        
        res.json({
            total:       total.rows[0].count,
            emergency:   emergency.rows[0].count,
            acute:       acute.rows[0].count,
            chronic:     chronic.rows[0].count,
            general:     general.rows[0].count,
            masterclass: masterclass.rows[0].count,
            anxious:     highAnxiety.rows[0].count,
            aiEfficiency: '98%'
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

// API: Live Stats Sidebar
app.get('/api/dashboard/live-stats', async (req, res) => {
    try {
        // Today vs Yesterday
        const today     = await pool.query("SELECT COUNT(*) FROM enquiries WHERE DATE(created_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE");
        const yesterday = await pool.query("SELECT COUNT(*) FROM enquiries WHERE DATE(created_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE - 1");

        // Auto-reply rate
        const autoReplied = await pool.query("SELECT COUNT(*) FROM enquiries WHERE status = 'auto-replied'");
        const totalAll    = await pool.query('SELECT COUNT(*) FROM enquiries');
        const total = parseInt(totalAll.rows[0].count) || 1;
        const autoRate = Math.round((parseInt(autoReplied.rows[0].count) / total) * 100);

        // Top care category today
        const topType = await pool.query(`
            SELECT patient_type, COUNT(*) as cnt
            FROM enquiries
            WHERE DATE(created_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE
            GROUP BY patient_type ORDER BY cnt DESC LIMIT 1
        `);

        // Last patient contact
        const lastEnq = await pool.query('SELECT patient_name, patient_type, created_at FROM enquiries ORDER BY created_at DESC LIMIT 1');

        // Top keywords from last 20 messages
        const recentMsgs = await pool.query('SELECT message FROM enquiries ORDER BY created_at DESC LIMIT 20');
        const stopWords = new Set(['i','a','the','and','is','in','my','to','of','it','for','on','this','are','have','has','with','that','was','be','from','at','an','been','can','me','what','your','how','do','we','he','she','they','you','will','as','by','or','but','not','so','if','its','about','more','very','just','also','up','out','like','get','all','one','his','her','our','him','them','his','any','no','please','would','could','should','want','need','know','see','tell','give','take','make','go','say','help']);
        const wordCount = {};
        recentMsgs.rows.forEach(row => {
            (row.message || '').toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).forEach(w => {
                if (w.length > 3 && !stopWords.has(w)) wordCount[w] = (wordCount[w] || 0) + 1;
            });
        });
        const topKeywords = Object.entries(wordCount).sort((a,b) => b[1]-a[1]).slice(0,6).map(([w]) => w);

        // Auto-pilot status
        const settings = await pool.query('SELECT auto_pilot FROM settings WHERE id = 1');

        res.json({
            today:        parseInt(today.rows[0].count),
            yesterday:    parseInt(yesterday.rows[0].count),
            autoRate,
            topType:      topType.rows[0] || { patient_type: 'general', cnt: 0 },
            lastEnquiry:  lastEnq.rows[0] || null,
            topKeywords,
            autoPilot:    settings.rows[0]?.auto_pilot || false
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// API: Search Medical Directory
app.get('/api/directory/search', async (req, res) => {
    const { q } = req.query;
    try {
        const result = await pool.query(
            'SELECT * FROM medical_directory WHERE condition_name ILIKE $1 OR diagnosis_logic ILIKE $1',
            [`%${q}%`]
        );
        res.json({ matches: result.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// API: Generate AI Voice Message
app.post('/api/voice/generate', async (req, res) => {
    const { text, patient_name } = req.body;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    console.log(`Generating AI Voice for ${patient_name}: "${text}"`);

    if (!apiKey) {
        console.log('No ElevenLabs API Key found. Using simulation mode.');
        return setTimeout(() => {
            res.json({ 
                success: true, 
                audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                message: `[SIMULATION] Voice message for ${patient_name} generated successfully.`
            });
        }, 2000);
    }

    try {
        const voiceId = 'EXAVITQu4vr4xnSDxMaL'; // "Bella" - Pre-made, guaranteed for Free Tier API
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_multilingual_v2', // Upgraded model (works on Free Tier)
                voice_settings: { stability: 0.5, similarity_boost: 0.5 }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail?.message || 'ElevenLabs API Error');
        }

        const audioBuffer = await response.arrayBuffer();
        const filename = `voice-${Date.now()}.mp3`;
        const filePath = path.join(__dirname, 'uploads', filename);

        // Ensure uploads directory exists
        if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
            fs.mkdirSync(path.join(__dirname, 'uploads'));
        }

        fs.writeFileSync(filePath, Buffer.from(audioBuffer));

        res.json({ 
            success: true, 
            audio_url: `/uploads/${filename}`, 
            message: `Voice message for ${patient_name} generated successfully.`
        });

    } catch (err) {
        console.error('Voice generation failed:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// API: Save Settings (UPSERT Logic)
app.post('/api/settings', async (req, res) => {
    const { landingPage, affiliation, phone, fbLink, instaLink, linkedinLink, youtubeLink, twitterLink, video1, video2, galleryMode, fixedImageId, autoPilot } = req.body;
    try {
        await pool.query(
            `INSERT INTO settings (id, landing_page, affiliation, phone, fb_url, insta_url, linkedin_url, youtube_url, twitter_url, video_1, video_2, gallery_mode, fixed_image_id, auto_pilot) 
             VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             ON CONFLICT (id) DO UPDATE SET 
                landing_page = EXCLUDED.landing_page, 
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
                fixed_image_id = EXCLUDED.fixed_image_id,
                auto_pilot = EXCLUDED.auto_pilot`,
            [landingPage, affiliation, phone, fbLink, instaLink, linkedinLink, youtubeLink, twitterLink, video1, video2, galleryMode, fixedImageId, autoPilot]
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

// API: Submit Enquiry (with Attachment Support)
app.post('/api/enquiry', upload.single('attachment'), async (req, res) => {
    const { patient_name, phone, message, platform, urgency, patient_type } = req.body;
    const attachment_url = req.file ? (req.file.path || `/uploads/${req.file.filename}`) : null;
    
    // NLP: Detect Patient Type — 5 tiers: general, acute, chronic, emergency, masterclass
    const proKeywords       = ['student', 'doctor', 'surgeon', 'dr', 'fellow', 'resident', 'medical school', 'learn', 'teach', 'training', 'masterclass', 'cme', 'colleague'];
    const emergencyKeywords = ['emergency', 'bleeding', 'sudden', 'clot', 'urgent', 'dvt', 'gangrene', 'stroke', 'unconscious', 'collapse'];
    const acuteKeywords     = ['pain', 'ache', 'hurt', 'swelling', 'wound', 'ulcer', 'infection', 'fever', 'pus', 'redness', 'warmth', 'cramp', 'numb', 'tingling', 'burn', 'itching', 'blister'];
    const chronicKeywords   = ['varicose', 'vein', 'chronic', 'long-term', 'months', 'years', 'recurring', 'diabetes', 'diabetic', 'pad', 'arterial', 'peripheral', 'follow up', 'follow-up', 'review'];
    const generalKeywords   = ['appointment', 'consult', 'timing', 'schedule', 'cost', 'price', 'fees', 'available', 'how much', 'when', 'location', 'address', 'contact', 'inquiry', 'information', 'details', 'check', 'query'];
    
    let detectedType = 'general'; // default — routine info query
    const msgLower = message.toLowerCase();
    
    // Tier 1: General (info/appointment queries — weakest, set first)
    generalKeywords.forEach(word => { if (msgLower.includes(word)) detectedType = 'general'; });
    // Tier 2: Chronic (known long-term conditions)
    chronicKeywords.forEach(word => { if (msgLower.includes(word)) detectedType = 'chronic'; });
    // Tier 3: Acute (active symptoms, not immediate danger)
    acuteKeywords.forEach(word => { if (msgLower.includes(word)) detectedType = 'acute'; });
    // Tier 4: Masterclass (professional/student — overrides clinical)
    proKeywords.forEach(word => { if (msgLower.includes(word)) detectedType = 'masterclass'; });
    // Tier 5: Emergency (strongest override)
    emergencyKeywords.forEach(word => { if (msgLower.includes(word)) detectedType = 'emergency'; });
    // Honour explicit patient_type from form if set and not overridden
    if (patient_type && patient_type !== 'chronic' && detectedType === 'general') detectedType = patient_type;

    // NLP: Detect Medical Anxiety
    const anxietyKeywords = ['scared', 'worried', 'panic', 'fear', 'anxious', 'help', 'serious', 'frightened', 'nervous'];
    let anxietyScore = 0;
    anxietyKeywords.forEach(word => {
        if (msgLower.includes(word)) anxietyScore += 2;
    });

    try {
        // Fetch Auto-Pilot Setting
        const settingsRes = await pool.query('SELECT auto_pilot FROM settings WHERE id = 1');
        const autoPilotEnabled = settingsRes.rows[0]?.auto_pilot || false;
        
        let status = 'new';
        if (autoPilotEnabled && detectedType === 'chronic' && anxietyScore < 2) {
            status = 'auto-replied';
            console.log(`[AUTO-PILOT] Responding to ${patient_name} automatically...`);
        }

        await pool.query(
            'INSERT INTO enquiries (patient_name, phone, message, platform, status, urgency, patient_type, anxiety_score, attachment_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [patient_name, phone || 'N/A', message, platform || 'Website', status, (detectedType === 'emergency' ? 'urgent' : 'routine'), detectedType, anxietyScore, attachment_url]
        );
        res.json({ success: true, auto_replied: status === 'auto-replied' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// API: Delete Enquiry
app.delete('/api/enquiry/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM enquiries WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
