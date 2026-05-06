const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'admin.html');
let html = fs.readFileSync(filePath, 'utf8');

// 1. Add Connectors Card to UI
const insertionPoint = '<!-- Section: Medical Case Studies Gallery -->';
const connectorsHTML = `
    <!-- Section: AI & Data Connectors -->
    <div class=\"admin-card\">
        <h2><i class=\"fas fa-plug\"></i> AI & Data Connectors</h2>
        <p style=\"font-size: 0.8rem; color: var(--text); opacity: 0.6; margin-bottom: 20px;\">Integrate external platforms to sync your Digital Brain with live analytics and brand data.</p>
        
        <div style=\"display: grid; grid-template-columns: 1fr 1fr; gap: 20px;\">
            <div class=\"form-group\">
                <label><i class=\"fas fa-chart-line\"></i> Microsoft Clarity ID</label>
                <input type=\"text\" id=\"clarityId\" placeholder=\"e.g. m3h7j9k2\">
            </div>
            <div class=\"form-group\">
                <label><i class=\"fab fa-google\"></i> Google Analytics (GA4) ID</label>
                <input type=\"text\" id=\"gaId\" placeholder=\"e.g. G-XXXXXXXXXX\">
            </div>
            <div class=\"form-group\">
                <label><i class=\"fab fa-facebook\"></i> Meta Pixel ID</label>
                <input type=\"text\" id=\"pixelId\" placeholder=\"e.g. 1234567890\">
            </div>
            <div class=\"form-group\">
                <label><i class=\"fas fa-ad\"></i> Meta Ads Manager ID</label>
                <input type=\"text\" id=\"metaAdsId\" placeholder=\"e.g. act_XXXXXXXXXX\">
            </div>
            <div class=\"form-group\" style=\"grid-column: span 2;\">
                <label><i class=\"fas fa-microphone\"></i> ElevenLabs API Key (Voice Cloning)</label>
                <input type=\"password\" id=\"elevenlabsApiKey\" placeholder=\"Enter your ElevenLabs API Key\">
            </div>
        </div>

        <div style=\"margin-top: 25px; padding: 15px; background: #F8FAFC; border-radius: 12px; border: 1px solid #E2E8F0; display: flex; align-items: center; justify-content: space-between;\">
            <div style=\"display: flex; align-items: center; gap: 15px;\">
                <img src=\"https://static.canva.com/web/images/843999e1957268d067645d1d6a8b75f8.png\" style=\"width: 30px; height: 30px;\">
                <div>
                    <p style=\"font-weight: 700; font-size: 0.9rem; color: var(--secondary);\">Canva Visual Design Connector</p>
                    <p style=\"font-size: 0.75rem; opacity: 0.6;\">Produce visual design outputs according to brand guidelines.</p>
                </div>
            </div>
            <button class=\"btn\" style=\"padding: 8px 15px; background: #7d2ae8; color: white; border: none; border-radius: 8px; font-weight: 600;\">Connect Canva</button>
        </div>
    </div>
\n    `;

html = html.replace(insertionPoint, connectorsHTML + insertionPoint);

// 2. Update loadSettings to populate new fields
const oldPopulate = `document.getElementById('video2').value = s.video_2 || '';`;
const newPopulate = `document.getElementById('video2').value = s.video_2 || '';
                document.getElementById('clarityId').value = s.clarity_id || '';
                document.getElementById('gaId').value = s.ga_id || '';
                document.getElementById('pixelId').value = s.pixel_id || '';
                document.getElementById('metaAdsId').value = s.meta_ads_id || '';
                document.getElementById('elevenlabsApiKey').value = s.elevenlabs_api_key || '';`;

// 3. Update saveSettings to gather new fields
const oldGather = `video2: document.getElementById('video2').value,`;
const newGather = `video2: document.getElementById('video2').value,
                clarityId: document.getElementById('clarityId').value,
                gaId: document.getElementById('gaId').value,
                pixelId: document.getElementById('pixelId').value,
                metaAdsId: document.getElementById('metaAdsId').value,
                elevenlabsApiKey: document.getElementById('elevenlabsApiKey').value,`;

html = html.replace(oldPopulate, newPopulate);
html = html.replace(oldGather, newGather);

fs.writeFileSync(filePath, html, 'utf8');
console.log('Admin UI updated with connectors section.');
