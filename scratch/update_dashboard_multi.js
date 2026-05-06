const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'dashboard.html');
let html = fs.readFileSync(filePath, 'utf8');

// 1. Add Switcher to Header
const oldHeader = `            <div>\r\n                <h1>Global Operations Hub</h1>\r\n                <p style=\"color: var(--text-light);\">Centralized monitoring of all patient touchpoints.</p>\r\n            </div>`;
const newHeader = `            <div style=\"display: flex; align-items: center; gap: 20px;\">
                <div>
                    <h1>Global Operations Hub</h1>
                    <p style=\"color: var(--text-light);\">Centralized monitoring of all patient touchpoints.</p>
                </div>
                <!-- Project Context Switcher -->
                <div style=\"margin-left: 20px; background: white; padding: 10px 20px; border-radius: 12px; border: 1px solid #E2E8F0; display: flex; align-items: center; gap: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);\">
                    <i class=\"fas fa-layer-group\" style=\"color: var(--primary);\"></i>
                    <select id=\"projectSwitcher\" onchange=\"handleProjectChange()\" style=\"border: none; outline: none; font-weight: 700; color: var(--secondary); background: transparent; cursor: pointer; font-size: 0.95rem;\">
                        <option value=\"hospital\">🏥 Dr. Kapadia Hospital</option>
                        <option value=\"personal_brand\">👤 Personal Brand Hub</option>
                        <option value=\"patient_courses\">🎓 Healing Patient Courses</option>
                        <option value=\"doctor_courses\">🩺 Vascular Masterclass</option>
                    </select>
                </div>
            </div>`;

// 2. Update loadDashboard to be project-aware
const oldLoadDashboard = `        async function loadDashboard() {\r\n            try {\r\n                // Load Stats\r\n                const statsRes = await fetch('/api/dashboard/stats');`;
const newLoadDashboard = `        let currentProjectId = localStorage.getItem('currentProjectId') || 'hospital';

        async function handleProjectChange() {
            currentProjectId = document.getElementById('projectSwitcher').value;
            localStorage.setItem('currentProjectId', currentProjectId);
            loadDashboard();
            loadLiveStats();
        }

        async function loadDashboard() {
            try {
                document.getElementById('projectSwitcher').value = currentProjectId;
                // Load Stats
                const statsRes = await fetch(\`/api/dashboard/stats?projectId=\${currentProjectId}\`);`;

// 3. Update loadDashboard enquiries call
const oldEnqCall = `const enqRes = await fetch('/api/dashboard/enquiries');`;
const newEnqCall = `const enqRes = await fetch(\`/api/dashboard/enquiries?projectId=\${currentProjectId}\`);`;

// 4. Update loadLiveStats
const oldLiveStats = `const res  = await fetch('/api/dashboard/live-stats');`;
const newLiveStats = `const res  = await fetch(\`/api/dashboard/live-stats?projectId=\${currentProjectId}\`);`;

// Apply replacements
if (html.includes(oldHeader)) {
    html = html.replace(oldHeader, newHeader);
} else {
    console.log('Header mismatch');
}

if (html.includes(oldLoadDashboard)) {
    html = html.replace(oldLoadDashboard, newLoadDashboard);
} else {
    console.log('LoadDashboard mismatch');
}

html = html.replace(oldEnqCall, newEnqCall);
html = html.replace(oldLiveStats, newLiveStats);

fs.writeFileSync(filePath, html, 'utf8');
console.log('Dashboard UI updated for multi-project support.');
