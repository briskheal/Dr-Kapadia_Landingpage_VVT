const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'dashboard.html');
let html = fs.readFileSync(filePath, 'utf8');

// 1. Update loadAIDrafts to fetch from API
const oldLoadAIDrafts = `        function loadAIDrafts(enquiries) {\r\n            const container = document.getElementById('aiDraftsContainer');\r\n            container.innerHTML = '';\r\n            \r\n            enquiries.forEach(enq => {`;
const newLoadAIDrafts = `        async function loadAIDrafts(enquiries) {
            const container = document.getElementById('aiDraftsContainer');
            container.innerHTML = '';
            
            for (const enq of enquiries) {
                // Fetch dynamic draft from AI Brain
                let draftText = "...Generating AI Draft...";
                try {
                    const draftRes = await fetch(\`/api/ai/generate-draft/\${enq.id}\`);
                    const draftData = await draftRes.json();
                    draftText = draftData.draft;
                } catch(e) { draftText = "Error generating draft."; }
`;

// 2. Update the innerHTML part to use the dynamic draft
const oldDraftInner = `<p id=\"draft-text-\${enq.id}\" style=\"font-size: 0.9rem; line-height: 1.5; color: #475569;\">\"Hi \${enq.patient_name}, I've reviewed your query about \${enq.message.substring(0, 50)}... I understand this can be concerning. Based on our clinical protocols, I recommend \${enq.patient_type === 'emergency' ? 'immediate consultation' : 'following our chronic care guidelines'}. Would you like me to schedule a call?\"</p>`;
const newDraftInner = `<p id=\"draft-text-\${enq.id}\" style=\"font-size: 0.9rem; line-height: 1.5; color: #475569;\">\"\${draftText}\"</p>`;

// Apply replacements
if (html.includes(oldLoadAIDrafts)) {
    html = html.replace(oldLoadAIDrafts, newLoadAIDrafts);
} else {
    // Try without CRLF
    const oldLoadAIDraftsNoCR = oldLoadAIDrafts.replace(/\r\n/g, '\n');
    if (html.includes(oldLoadAIDraftsNoCR)) {
        html = html.replace(oldLoadAIDraftsNoCR, newLoadAIDrafts);
    } else {
        console.log('LoadAIDrafts mismatch');
    }
}

html = html.replace(oldDraftInner, newDraftInner);

fs.writeFileSync(filePath, html, 'utf8');
console.log('Dashboard UI updated to use dynamic AI drafts.');
