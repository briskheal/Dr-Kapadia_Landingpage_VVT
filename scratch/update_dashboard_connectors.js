const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'dashboard.html');
let html = fs.readFileSync(filePath, 'utf8');

// 1. Update Connection Status Bar (add Clarity and Ads)
const oldStatusBar = `<span style=\"font-size: 0.85rem; color: var(--text-light);\"><i class=\"fab fa-linkedin\" style=\"color: #0077B5;\"></i> LinkedIn (Waiting for Key)</span>`;
const newStatusBar = `<span style=\"font-size: 0.85rem; color: var(--text-light);\"><i class=\"fab fa-linkedin\" style=\"color: #0077B5;\"></i> LinkedIn (Waiting for Key)</span>
                <span id=\"connClarity\" style=\"font-size: 0.85rem; color: var(--text-light);\"><i class=\"fas fa-search-plus\" style=\"color: #0078D4;\"></i> MS Clarity (Disconnected)</span>
                <span id=\"connAds\" style=\"font-size: 0.85rem; color: var(--text-light);\"><i class=\"fas fa-ad\" style=\"color: #1877F2;\"></i> Meta Ads (Inactive)</span>`;

html = html.replace(oldStatusBar, newStatusBar);

// 2. Populate Social Tab with Connector Panels
const oldSocialTab = `<div id=\"tab-social\" class=\"tab-content\" style=\"display: none;\">\r\n            <div class=\"header\">\r\n                <h1>Global Social Sync</h1>\r\n                <p>Connect your YouTube, Instagram, and LinkedIn accounts.</p>\r\n            </div>\r\n            <!-- Move existing Social Sync UI here -->\r\n        </div>`;
const newSocialTab = `        <div id=\"tab-social\" class=\"tab-content\" style=\"display: none;\">
            <div class=\"header\">
                <h1>Digital Brain Connectors</h1>
                <p>Sync live data from social platforms and advertising tools.</p>
            </div>
            
            <div style=\"display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;\">
                <div class=\"card\" style=\"padding: 20px; border-top: 4px solid #FF0000;\">
                    <div style=\"display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;\">
                        <i class=\"fab fa-youtube\" style=\"font-size: 2rem; color: #FF0000;\"></i>
                        <span class=\"tag\" style=\"background: #FEE2E2; color: #DC2626;\">OFFLINE</span>
                    </div>
                    <h4>YouTube Analytics</h4>
                    <p style=\"font-size: 0.8rem; opacity: 0.6; margin: 10px 0;\">Ingest video comments and patient education trends.</p>
                    <button class=\"btn\" style=\"width: 100%; margin-top: 10px; border: 1px solid #E2E8F0;\">Configure API</button>
                </div>
                <div class=\"card\" style=\"padding: 20px; border-top: 4px solid #E1306C;\">
                    <div style=\"display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;\">
                        <i class=\"fab fa-instagram\" style=\"font-size: 2rem; color: #E1306C;\"></i>
                        <span class=\"tag\" style=\"background: #FEE2E2; color: #DC2626;\">OFFLINE</span>
                    </div>
                    <h4>Instagram Insights</h4>
                    <p style=\"font-size: 0.8rem; opacity: 0.6; margin: 10px 0;\">Sync DM enquiries and brand engagement.</p>
                    <button class=\"btn\" style=\"width: 100%; margin-top: 10px; border: 1px solid #E2E8F0;\">Configure API</button>
                </div>
                <div class=\"card\" style=\"padding: 20px; border-top: 4px solid #0078D4;\">
                    <div style=\"display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;\">
                        <i class=\"fas fa-search-plus\" style=\"font-size: 2rem; color: #0078D4;\"></i>
                        <span class=\"tag\" style=\"background: #FEE2E2; color: #DC2626;\">OFFLINE</span>
                    </div>
                    <h4>Microsoft Clarity</h4>
                    <p style=\"font-size: 0.8rem; opacity: 0.6; margin: 10px 0;\">Heatmaps and session recordings for hospital site.</p>
                    <button class=\"btn\" style=\"width: 100%; margin-top: 10px; border: 1px solid #E2E8F0;\">View Live Feed</button>
                </div>
            </div>

            <div class=\"card\">
                <div style=\"display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;\">
                    <h2><i class=\"fas fa-brain\"></i> Digital Brain Knowledge Base</h2>
                    <button class=\"btn btn-primary\"><i class=\"fas fa-sync\"></i> Sync All Platforms</button>
                </div>
                <div style=\"padding: 40px; text-align: center; background: #F8FAFC; border-radius: 15px; border: 2px dashed #E2E8F0;\">
                    <i class=\"fas fa-cloud-download-alt\" style=\"font-size: 3rem; color: var(--text-light); margin-bottom: 20px;\"></i>
                    <h3>Knowledge Feed Empty</h3>
                    <p style=\"color: var(--text-light); max-width: 400px; margin: 10px auto;\">Connect your platforms above to start ingesting Dr. Kapadia's public advice into the AI Brain.</p>
                </div>
            </div>
        </div>`;

html = html.replace(oldSocialTab, newSocialTab);

// 3. Update loadLiveStats to show connector status in header
const oldStatsCheck = `// Auto-pilot\r\n                const apEl = document.getElementById('lsAutoPilot');`;
const newStatsCheck = `// Update Connector Status in Header
                const settingsRes = await fetch(\`/api/settings?projectId=\${currentProjectId}\`);
                const sData = await settingsRes.json();
                const s = sData.settings || {};
                
                if (s.clarity_id) {
                    document.getElementById('connClarity').innerHTML = '<i class=\"fas fa-check-circle\" style=\"color: var(--success);\"></i> MS Clarity (ACTIVE)';
                    document.getElementById('connClarity').style.color = 'var(--success)';
                    document.getElementById('connClarity').style.fontWeight = '700';
                }
                if (s.meta_ads_id) {
                    document.getElementById('connAds').innerHTML = '<i class=\"fas fa-check-circle\" style=\"color: var(--success);\"></i> Meta Ads (ACTIVE)';
                    document.getElementById('connAds').style.color = 'var(--success)';
                    document.getElementById('connAds').style.fontWeight = '700';
                }

                // Auto-pilot
                const apEl = document.getElementById('lsAutoPilot');`;

html = html.replace(oldStatsCheck, newStatsCheck);

fs.writeFileSync(filePath, html, 'utf8');
console.log('Dashboard social tab updated with connector status.');
