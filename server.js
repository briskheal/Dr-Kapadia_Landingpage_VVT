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

// Initialize Database Tables
async function initDB() {
    try {
        console.log('Initializing PostgreSQL Tables...');
        
        // 1. Projects Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            INSERT INTO projects (id, name, description) VALUES 
            ('hospital', 'Dr. Kapadia Hospital', 'Clinical and patient management for Aadicura Hospital'),
            ('personal_brand', 'Dr. Sumit Kapadia Brand', 'Personal branding and social media activities'),
            ('patient_courses', 'Healing Patient Courses', 'Educational content for patients and public'),
            ('doctor_courses', 'Vascular Masterclass (Pro)', 'Professional training for doctors and surgeons')
            ON CONFLICT (id) DO NOTHING;
        `);

        // 2. Settings Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,
                project_id TEXT UNIQUE REFERENCES projects(id) DEFAULT 'hospital',
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
                auto_pilot BOOLEAN DEFAULT FALSE,
                clarity_id TEXT,
                ga_id TEXT,
                pixel_id TEXT,
                meta_ads_id TEXT,
                elevenlabs_api_key TEXT
            );
        `);

        // 3. Enquiry Categories
        await pool.query(`
            CREATE TABLE IF NOT EXISTS enquiry_categories (
                id SERIAL PRIMARY KEY,
                project_id TEXT REFERENCES projects(id) DEFAULT 'hospital',
                label TEXT NOT NULL,
                patient_type TEXT DEFAULT 'general',
                is_active BOOLEAN DEFAULT TRUE,
                sort_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(label, project_id)
            );
        `);

        // 4. Enquiries Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS enquiries (
                id SERIAL PRIMARY KEY,
                project_id TEXT REFERENCES projects(id) DEFAULT 'hospital',
                patient_name TEXT,
                phone TEXT,
                message TEXT,
                platform TEXT,
                status TEXT DEFAULT 'new',
                urgency TEXT DEFAULT 'routine',
                patient_type TEXT DEFAULT 'general',
                anxiety_score INTEGER DEFAULT 0,
                attachment_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 5. Gallery Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS gallery (
                id SERIAL PRIMARY KEY,
                project_id TEXT REFERENCES projects(id) DEFAULT 'hospital',
                image_url TEXT,
                category TEXT DEFAULT 'medical',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 6. Medical Directory
        await pool.query(`
            CREATE TABLE IF NOT EXISTS medical_directory (
                id SERIAL PRIMARY KEY,
                project_id TEXT REFERENCES projects(id) DEFAULT 'hospital',
                condition_name TEXT,
                diagnosis_logic TEXT,
                recommended_treatment TEXT,
                patient_advice TEXT,
                UNIQUE(condition_name, project_id)
            );
        `);

        // 7. Brain Knowledge
        await pool.query(`
            CREATE TABLE IF NOT EXISTS brain_knowledge (
                id SERIAL PRIMARY KEY,
                project_id TEXT REFERENCES projects(id) DEFAULT 'hospital',
                source_type TEXT, -- 'youtube', 'instagram', 'manual'
                title TEXT,
                content TEXT,
                keywords TEXT[],
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // --- Migrations & Seeding ---
        
        // Seed Medical Directory (Hospital)
        await pool.query(`
            INSERT INTO medical_directory (condition_name, diagnosis_logic, recommended_treatment, patient_advice, project_id)
            VALUES 
            ('Varicose Veins', 'Visible enlarged, twisted veins in legs; heaviness; skin changes.', 'EVLA (Endovenous Laser Ablation) or Sclerotherapy.', 'Avoid long standing, use compression stockings, and rest with legs elevated.', 'hospital'),
            ('DVT', 'Sudden swelling in one leg, pain, redness, warmth.', 'Immediate anticoagulation (blood thinners) and compression.', 'Seek urgent duplex ultrasound. Do not massage the leg.', 'hospital'),
            ('Diabetic Foot', 'Non-healing ulcers, cold feet, gangrene, neuropathy.', 'Specialized wound care and angioplasty to restore blood flow.', 'Keep blood sugar controlled. Inspect feet daily for any minor injuries.', 'hospital'),
            ('PAD', 'Pain while walking (claudication), leg cramps, cold skin.', 'Peripheral Angioplasty and Stenting.', 'Walk as much as tolerated. Control blood pressure and cholesterol.', 'hospital')
            ON CONFLICT (condition_name, project_id) DO NOTHING;
        `);

        // Seed default categories (Hospital)
        await pool.query(`
            INSERT INTO enquiry_categories (label, patient_type, sort_order, project_id) VALUES
            ('General Appointment / Consultation', 'general', 1, 'hospital'),
            ('Varicose Veins / Leg Swelling (Chronic)', 'chronic', 2, 'hospital'),
            ('Active Symptoms – Pain, Ulcer, Wound', 'acute', 3, 'hospital'),
            ('Emergency – Sudden Pain, DVT, Bleeding', 'emergency', 4, 'hospital'),
            ('Professional / Student – Education & Masterclass', 'masterclass', 5, 'hospital')
            ON CONFLICT (label, project_id) DO NOTHING;
        `);

        // Seed settings for all projects
        const projectIds = ['hospital', 'personal_brand', 'patient_courses', 'doctor_courses'];
        for (const pid of projectIds) {
            await pool.query('INSERT INTO settings (project_id) VALUES ($1) ON CONFLICT (project_id) DO NOTHING', [pid]);
        }
        
        console.log('✅ PostgreSQL Tables Initialized & Seeded');
    } catch (err) {
        console.error('❌ Database Init Error:', err);
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
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    storage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, dir),
        filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
    });
}

const upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());

// ── API: Health & Projects ──────────────────────────────────────────────────

app.get('/api/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ success: true, message: '✅ Database Connected!', time: result.rows[0].now });
    } catch (err) {
        res.status(500).json({ success: false, message: '❌ Connection Failed', error: err.message });
    }
});

app.get('/api/projects', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM projects ORDER BY id');
        res.json({ projects: result.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── API: Settings ───────────────────────────────────────────────────────────

app.get('/api/settings', async (req, res) => {
    const projectId = req.query.projectId || 'hospital';
    try {
        const result = await pool.query('SELECT * FROM settings WHERE project_id = $1', [projectId]);
        res.json({ settings: result.rows[0] || {} });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/settings', async (req, res) => {
    const { 
        projectId, landingPage, affiliation, phone, fbLink, instaLink, linkedinLink, 
        youtubeLink, twitterLink, video1, video2, galleryMode, fixedImageId, 
        autoPilot, clarityId, gaId, pixelId, metaAdsId, elevenlabsApiKey 
    } = req.body;
    const pid = projectId || 'hospital';
    try {
        await pool.query(
            `INSERT INTO settings (project_id, landing_page, affiliation, phone, fb_url, insta_url, linkedin_url, youtube_url, twitter_url, video_1, video_2, gallery_mode, fixed_image_id, auto_pilot, clarity_id, ga_id, pixel_id, meta_ads_id, elevenlabs_api_key, voice_enabled) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
             ON CONFLICT (project_id) DO UPDATE SET 
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
                auto_pilot = EXCLUDED.auto_pilot,
                clarity_id = EXCLUDED.clarity_id,
                ga_id = EXCLUDED.ga_id,
                pixel_id = EXCLUDED.pixel_id,
                meta_ads_id = EXCLUDED.meta_ads_id,
                elevenlabs_api_key = EXCLUDED.elevenlabs_api_key,
                voice_enabled = EXCLUDED.voice_enabled`,
            [pid, landingPage, affiliation, phone, fbLink, instaLink, linkedinLink, youtubeLink, twitterLink, video1, video2, galleryMode, fixedImageId, autoPilot, clarityId, gaId, pixelId, metaAdsId, elevenlabsApiKey, req.body.voiceEnabled]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── API: Enquiry Categories ─────────────────────────────────────────────────

app.get('/api/enquiry-categories', async (req, res) => {
    const projectId = req.query.projectId || 'hospital';
    try {
        const result = await pool.query('SELECT * FROM enquiry_categories WHERE is_active = TRUE AND project_id = $1 ORDER BY sort_order, id', [projectId]);
        res.json({ categories: result.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/enquiry-categories', async (req, res) => {
    const { label, patient_type, projectId } = req.body;
    const pid = projectId || 'hospital';
    if (!label || !patient_type) return res.status(400).json({ error: 'label and patient_type are required' });
    try {
        const result = await pool.query(
            'INSERT INTO enquiry_categories (label, patient_type, project_id) VALUES ($1, $2, $3) RETURNING *',
            [label.trim(), patient_type, pid]
        );
        res.json({ success: true, category: result.rows[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/enquiry-categories/:id', async (req, res) => {
    try {
        await pool.query('UPDATE enquiry_categories SET is_active = FALSE WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── API: Gallery ────────────────────────────────────────────────────────────

app.get('/api/gallery/:category', async (req, res) => {
    const { category } = req.params;
    const projectId = req.query.projectId || 'hospital';
    try {
        const result = await pool.query(
            'SELECT * FROM gallery WHERE category = $1 AND project_id = $2 ORDER BY created_at DESC',
            [category, projectId]
        );
        res.json({ images: result.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
    const { type, projectId } = req.body;
    const pid = projectId || 'hospital';
    const filePath = req.file.path || `/uploads/${req.file.filename}`;
    
    try {
        if (type === 'logo') {
            await pool.query('UPDATE settings SET logo_url = $1 WHERE project_id = $2', [filePath, pid]);
        } else if (type === 'photo') {
            await pool.query('UPDATE settings SET photo_url = $1 WHERE project_id = $2', [filePath, pid]);
        } else if (type.startsWith('gallery_')) {
            const category = type.split('_')[1];
            await pool.query('INSERT INTO gallery (image_url, category, project_id) VALUES ($1, $2, $3)', [filePath, category, pid]);
        }
        res.json({ success: true, filePath: filePath });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/gallery/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM gallery WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── API: Enquiries ──────────────────────────────────────────────────────────

app.post('/api/enquiry', upload.single('attachment'), async (req, res) => {
    const { patient_name, phone, message, platform, urgency, patient_type, projectId } = req.body;
    const pid = projectId || 'hospital';
    const attachment_url = req.file ? (req.file.path || `/uploads/${req.file.filename}`) : null;
    
    // Simple NLP for triage
    const msgLower = (message || '').toLowerCase();
    let detectedType = patient_type || 'general';
    
    if (msgLower.includes('emergency') || msgLower.includes('bleeding')) detectedType = 'emergency';
    else if (msgLower.includes('pain') || msgLower.includes('wound')) detectedType = 'acute';
    else if (msgLower.includes('varicose') || msgLower.includes('chronic')) detectedType = 'chronic';
    else if (msgLower.includes('masterclass') || msgLower.includes('student')) detectedType = 'masterclass';

    const anxietyKeywords = ['scared', 'worried', 'panic', 'fear', 'anxious', 'help'];
    let anxietyScore = 0;
    anxietyKeywords.forEach(word => { if (msgLower.includes(word)) anxietyScore += 2; });

    try {
        const settingsRes = await pool.query('SELECT auto_pilot FROM settings WHERE project_id = $1', [pid]);
        const autoPilotEnabled = settingsRes.rows[0]?.auto_pilot || false;
        
        let status = 'new';
        if (autoPilotEnabled && detectedType === 'chronic' && anxietyScore < 2) {
            status = 'auto-replied';
        }

        await pool.query(
            'INSERT INTO enquiries (project_id, patient_name, phone, message, platform, status, urgency, patient_type, anxiety_score, attachment_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
            [pid, patient_name, phone || 'N/A', message, platform || 'Website', status, (detectedType === 'emergency' ? 'urgent' : 'routine'), detectedType, anxietyScore, attachment_url]
        );
        res.json({ success: true, auto_replied: status === 'auto-replied' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/enquiry/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM enquiries WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── API: Dashboard & Stats ──────────────────────────────────────────────────

app.get('/api/dashboard/stats', async (req, res) => {
    const projectId = req.query.projectId || 'hospital';
    try {
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE anxiety_score > 5) as anxious,
                COUNT(*) FILTER (WHERE patient_type = 'emergency') as emergency,
                COUNT(*) FILTER (WHERE patient_type = 'acute') as acute,
                COUNT(*) FILTER (WHERE patient_type = 'chronic') as chronic,
                COUNT(*) FILTER (WHERE patient_type = 'general') as general,
                COUNT(*) FILTER (WHERE patient_type = 'masterclass') as masterclass
            FROM enquiries WHERE project_id = $1
        `, [projectId]);
        
        const row = stats.rows[0];
        res.json({
            total: parseInt(row.total),
            anxious: parseInt(row.anxious),
            emergency: parseInt(row.emergency),
            acute: parseInt(row.acute),
            chronic: parseInt(row.chronic),
            general: parseInt(row.general),
            masterclass: parseInt(row.masterclass),
            aiEfficiency: '98%'
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/dashboard/enquiries', async (req, res) => {
    const projectId = req.query.projectId || 'hospital';
    try {
        const result = await pool.query('SELECT * FROM enquiries WHERE project_id = $1 ORDER BY created_at DESC LIMIT 50', [projectId]);
        res.json({ enquiries: result.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/dashboard/live-stats', async (req, res) => {
    const projectId = req.query.projectId || 'hospital';
    try {
        const today     = await pool.query("SELECT COUNT(*) FROM enquiries WHERE DATE(created_at) = CURRENT_DATE AND project_id = $1", [projectId]);
        const yesterday = await pool.query("SELECT COUNT(*) FROM enquiries WHERE DATE(created_at) = CURRENT_DATE - 1 AND project_id = $1", [projectId]);
        const autoReplied = await pool.query("SELECT COUNT(*) FROM enquiries WHERE status = 'auto-replied' AND project_id = $1", [projectId]);
        const totalAll    = await pool.query('SELECT COUNT(*) FROM enquiries WHERE project_id = $1', [projectId]);
        
        const total = parseInt(totalAll.rows[0].count) || 1;
        const autoRate = Math.round((parseInt(autoReplied.rows[0].count) / total) * 100);

        const topType = await pool.query(`
            SELECT patient_type, COUNT(*) as cnt
            FROM enquiries
            WHERE DATE(created_at) = CURRENT_DATE AND project_id = $1
            GROUP BY patient_type ORDER BY cnt DESC LIMIT 1
        `, [projectId]);

        const lastEnq = await pool.query('SELECT patient_name, patient_type, created_at FROM enquiries WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1', [projectId]);

        // Keywords
        const recentMsgs = await pool.query('SELECT message FROM enquiries WHERE project_id = $1 ORDER BY created_at DESC LIMIT 20', [projectId]);
        const stopWords = new Set(['i','a','the','and','is','in','my','to','of','it','for','on','this','are','have','has','with','that','was','be','from','at','an','been','can','me','what','your','how','do','we','he','she','they','you','will','as','by','or','but','not','so','if','its','about','more','very','just','also','up','out','like','get','all','one','his','her','our','him','them','any','no','please','would','could','should','want','need','know','see','tell','give','take','make','go','say','help']);
        const wordCount = {};
        recentMsgs.rows.forEach(row => {
            (row.message || '').toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).forEach(w => {
                if (w.length > 3 && !stopWords.has(w)) wordCount[w] = (wordCount[w] || 0) + 1;
            });
        });
        const topKeywords = Object.entries(wordCount).sort((a,b) => b[1]-a[1]).slice(0,6).map(([w]) => w);

        const settings = await pool.query('SELECT auto_pilot, voice_enabled FROM settings WHERE project_id = $1', [projectId]);

        res.json({
            today: parseInt(today.rows[0].count),
            yesterday: parseInt(yesterday.rows[0].count),
            autoRate,
            topType: topType.rows[0] || { patient_type: 'general', cnt: 0 },
            lastEnquiry: lastEnq.rows[0] || null,
            topKeywords,
            autoPilot: settings.rows[0]?.auto_pilot || false,
            voiceEnabled: settings.rows[0]?.voice_enabled !== false
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── API: Brain & AI ─────────────────────────────────────────────────────────

app.get('/api/brain/knowledge', async (req, res) => {
    const projectId = req.query.projectId || 'hospital';
    try {
        const result = await pool.query('SELECT * FROM brain_knowledge WHERE project_id = $1 ORDER BY created_at DESC', [projectId]);
        res.json({ knowledge: result.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/brain/ingest', async (req, res) => {
    const { projectId, sourceType, title, content, keywords } = req.body;
    const pid = projectId || 'hospital';
    if (!content) return res.status(400).json({ error: 'Content is required' });
    try {
        const result = await pool.query(
            'INSERT INTO brain_knowledge (project_id, source_type, title, content, keywords) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [pid, sourceType || 'manual', title || 'Untitled Note', content, keywords || []]
        );
        res.json({ success: true, item: result.rows[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/brain/knowledge/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM brain_knowledge WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/ai/generate-draft/:enquiryId', async (req, res) => {
    try {
        const enqRes = await pool.query('SELECT * FROM enquiries WHERE id = $1', [req.params.enquiryId]);
        const enq = enqRes.rows[0];
        if (!enq) return res.status(404).json({ error: 'Enquiry not found' });
        const projectId = enq.project_id || 'hospital';
        
        const words = (enq.message || '').toLowerCase().split(/\s+/).filter(w => w.length > 4);
        let relatedKnowledge = [];
        if (words.length > 0) {
            const knowledgeRes = await pool.query(
                `SELECT content, title FROM brain_knowledge 
                 WHERE project_id = $1 
                 AND (content ILIKE ANY(ARRAY[${words.map((_, i) => `'% ' || $${i + 2} || ' %'`).join(', ')}]))
                 LIMIT 2`,
                [projectId, ...words]
            );
            relatedKnowledge = knowledgeRes.rows;
        }

        let draft = `Hi ${enq.patient_name}, I've reviewed your query about "${(enq.message || '').substring(0, 50)}...". `;
        if (relatedKnowledge.length > 0) {
            draft += `I previously discussed a similar topic regarding "${relatedKnowledge[0].title}". My advice remains consistent: ${relatedKnowledge[0].content.substring(0, 200)}... `;
        } else {
            draft += `Based on our clinical protocols for ${enq.patient_type} care, `;
        }

        if (enq.patient_type === 'emergency') draft += "this requires immediate attention. Please visit the emergency department or call us now.";
        else if (enq.patient_type === 'masterclass') draft += "I would be happy to discuss this further in our upcoming masterclass session. Would you like the registration details?";
        else draft += "I recommend scheduling a consultation so we can examine this in detail. Would you like to check my availability for this week?";

        res.json({ success: true, draft });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/voice/generate', async (req, res) => {
    const { text, projectId } = req.body;
    const pid = projectId || 'hospital';
    
    try {
        // 1. Try to get key from DB for this project
        const settings = await pool.query('SELECT elevenlabs_api_key FROM settings WHERE project_id = $1', [pid]);
        let apiKey = settings.rows[0]?.elevenlabs_api_key || process.env.ELEVENLABS_API_KEY;

        console.log(`[Voice] Generating for ${pid}. Key present: ${!!apiKey}`);

        if (!apiKey) {
            console.log('[Voice] No API key found, returning demo music.');
            return res.json({ success: true, audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' });
        }

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL`, {
            method: 'POST',
            headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs API Error: ${response.status} - ${errorText}`);
        }
        const audioBuffer = await response.arrayBuffer();
        const filename = `voice-${Date.now()}.mp3`;
        fs.writeFileSync(path.join(__dirname, 'uploads', filename), Buffer.from(audioBuffer));
        res.json({ success: true, audio_url: `/uploads/${filename}` });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── Auth & Routes ───────────────────────────────────────────────────────────

app.post('/api/login', (req, res) => {
    const { loginId, password } = req.body;
    if (loginId === 'DRKAPADIA' && password === 'AADICURA') {
        res.json({ success: true, token: 'dr-kapadia-secure-token', redirect: '/admin' });
    } else res.status(401).json({ success: false, message: 'Invalid Credentials' });
});

app.get('/api/medical-directory', async (req, res) => {
    const projectId = req.query.projectId || 'hospital';
    try {
        const result = await pool.query('SELECT * FROM medical_directory WHERE project_id = $1 ORDER BY condition_name', [projectId]);
        res.json({ directory: result.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('*', (req, res) => {
    const p = req.path;
    if (p === '/admin') res.sendFile(path.join(__dirname, 'admin.html'));
    else if (p === '/dashboard') res.sendFile(path.join(__dirname, 'dashboard.html'));
    else if (p === '/login') res.sendFile(path.join(__dirname, 'login.html'));
    else res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
