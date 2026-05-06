const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'admin.html');
let html = fs.readFileSync(filePath, 'utf8');

// 1. Add Brain Knowledge Card to UI
const insertionPoint = '<!-- Section: Medical Case Studies Gallery -->';
const knowledgeHTML = `
    <!-- Section: AI Brain Knowledge Base -->
    <div class=\"admin-card\">
        <h2><i class=\"fas fa-brain\"></i> AI Brain Knowledge Base</h2>
        <p style=\"font-size: 0.8rem; color: var(--text); opacity: 0.6; margin-bottom: 20px;\">Ingest Dr. Kapadia's professional history, YouTube transcripts, and social media advice to train his Digital Twin.</p>
        
        <div style=\"background: #F8FAFC; padding: 20px; border-radius: 15px; border: 1px solid #E2E8F0; margin-bottom: 25px;\">
            <div class=\"form-group\">
                <label>Source Title (e.g. YouTube: Varicose Vein Myths)</label>
                <input type=\"text\" id=\"brainTitle\" class=\"form-control\" placeholder=\"Enter a title for this knowledge source\">
            </div>
            <div class=\"form-group\">
                <label>Source Type</label>
                <select id=\"brainSourceType\" class=\"form-control\">
                    <option value=\"youtube\">YouTube Transcript</option>
                    <option value=\"instagram\">Instagram Post Text</option>
                    <option value=\"manual\">Professional Notes / Manual Ingestion</option>
                </select>
            </div>
            <div class=\"form-group\">
                <label>Content (Paste Text Here)</label>
                <textarea id=\"brainContent\" class=\"form-control\" style=\"height: 150px;\" placeholder=\"Paste the video transcript or social post content here...\"></textarea>
            </div>
            <button class=\"btn btn-primary\" onclick=\"ingestKnowledge()\" style=\"width: 100%;\"><i class=\"fas fa-download\"></i> INGEST INTO DIGITAL BRAIN</button>
        </div>

        <h3 style=\"font-size: 0.9rem; margin-bottom: 15px;\">Ingested Knowledge Feed</h3>
        <div id=\"brainKnowledgeFeed\" style=\"display: flex; flex-direction: column; gap: 10px;\">
            <!-- Dynamic Knowledge List -->
        </div>
    </div>
\n    `;

html = html.replace(insertionPoint, knowledgeHTML + insertionPoint);

// 2. Add JS logic for Knowledge Ingestion
const endOfScript = '</script>';
const knowledgeJS = `
        async function loadBrainKnowledge() {
            const container = document.getElementById('brainKnowledgeFeed');
            try {
                const res = await fetch(\`/api/brain/knowledge?projectId=\${currentProjectId}\`);
                const data = await res.json();
                container.innerHTML = '';
                if (data.knowledge.length === 0) {
                    container.innerHTML = '<p style=\"font-size:0.8rem; opacity:0.5; text-align:center;\">No knowledge ingested for this project yet.</p>';
                    return;
                }
                data.knowledge.forEach(item => {
                    const div = document.createElement('div');
                    div.style.cssText = 'padding: 12px; background: white; border-radius: 10px; border: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center;';
                    div.innerHTML = \`
                        <div>
                            <p style=\"font-size: 0.85rem; font-weight: 700; color: var(--secondary);\">\${item.title}</p>
                            <p style=\"font-size: 0.7rem; opacity: 0.6;\">\${item.source_type.toUpperCase()} • \${new Date(item.created_at).toLocaleDateString()}</p>
                        </div>
                        <button onclick=\"deleteKnowledge(\${item.id})\" style=\"background:none; border:none; color:#EF4444; cursor:pointer;\"><i class=\"fas fa-trash-alt\"></i></button>
                    \`;
                    container.appendChild(div);
                });
            } catch (err) { console.error('Failed to load brain knowledge'); }
        }

        async function ingestKnowledge() {
            const title = document.getElementById('brainTitle').value;
            const sourceType = document.getElementById('brainSourceType').value;
            const content = document.getElementById('brainContent').value;
            
            if (!content) return alert('Please paste some content first');

            try {
                const res = await fetch('/api/brain/ingest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectId: currentProjectId, sourceType, title, content })
                });
                if (res.ok) {
                    alert('Knowledge Ingested Successfully!');
                    document.getElementById('brainTitle').value = '';
                    document.getElementById('brainContent').value = '';
                    loadBrainKnowledge();
                }
            } catch (err) { alert('Ingestion failed'); }
        }

        async function deleteKnowledge(id) {
            if (!confirm('Remove this from the Digital Brain?')) return;
            try {
                const res = await fetch(\`/api/brain/knowledge/\${id}\`, { method: 'DELETE' });
                if (res.ok) loadBrainKnowledge();
            } catch (err) { alert('Delete failed'); }
        }

        // Initialize Brain Tab
        document.addEventListener('DOMContentLoaded', () => {
            loadBrainKnowledge();
        });

        // Update Project Change logic to refresh knowledge
        const originalHandleProjectChange = handleProjectChange;
        handleProjectChange = async function() {
            await originalHandleProjectChange();
            loadBrainKnowledge();
        };
`;

html = html.replace(endOfScript, knowledgeJS + endOfScript);

fs.writeFileSync(filePath, html, 'utf8');
console.log('Admin UI updated with Brain Knowledge Ingestion.');
