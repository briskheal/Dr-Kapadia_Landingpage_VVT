const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'admin.html');
let html = fs.readFileSync(filePath, 'utf8');

// 1. Add Switcher to Header (top of container)
const startOfContainer = '<div class=\"container\">';
const projectSwitcherHTML = `
    <div class=\"admin-card\" style=\"background: linear-gradient(135deg, var(--secondary) 0%, #1e293b 100%); color: white; border: none; margin-bottom: 25px; display: flex; align-items: center; justify-content: space-between;\">
        <div>
            <h2 style=\"color: white; margin-bottom: 5px;\"><i class=\"fas fa-sliders-h\"></i> PROJECT CONFIGURATION</h2>
            <p style=\"font-size: 0.8rem; opacity: 0.8;\">Switch between Hospital, Personal Brand, and Courses to manage independent settings.</p>
        </div>
        <div style=\"background: rgba(255,255,255,0.1); padding: 10px 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; gap: 12px;\">
            <i class=\"fas fa-layer-group\" style=\"color: #38bdf8;\"></i>
            <select id=\"projectSwitcher\" onchange=\"handleProjectChange()\" style=\"border: none; outline: none; font-weight: 700; color: white; background: transparent; cursor: pointer; font-size: 1rem;\">
                <option value=\"hospital\" style=\"color: black;\">🏥 Dr. Kapadia Hospital</option>
                <option value=\"personal_brand\" style=\"color: black;\">👤 Personal Brand Hub</option>
                <option value=\"patient_courses\" style=\"color: black;\">🎓 Healing Patient Courses</option>
                <option value=\"doctor_courses\" style=\"color: black;\">🩺 Vascular Masterclass</option>
            </select>
        </div>
    </div>`;

if (html.includes(startOfContainer)) {
    html = html.replace(startOfContainer, startOfContainer + projectSwitcherHTML);
} else {
    console.log('Container mismatch');
}

// Ensure the JS parts are also present (re-applying in case they were missed)
// 2. Update loadSettings to be project-aware
const oldLoadSettings = `async function loadSettings() {\r\n            try {\r\n                const res = await fetch('/api/settings');`;
const newLoadSettings = `let currentProjectId = localStorage.getItem('currentProjectId') || 'hospital';

        async function handleProjectChange() {
            currentProjectId = document.getElementById('projectSwitcher').value;
            localStorage.setItem('currentProjectId', currentProjectId);
            loadSettings();
            loadEnquiryCategories();
        }

        async function loadSettings() {
            try {
                document.getElementById('projectSwitcher').value = currentProjectId;
                const res = await fetch(\`/api/settings?projectId=\${currentProjectId}\`);`;

const oldLoadSettingsNoCR = oldLoadSettings.replace(/\r\n/g, '\n');
if (html.includes(oldLoadSettings)) {
    html = html.replace(oldLoadSettings, newLoadSettings);
} else if (html.includes(oldLoadSettingsNoCR)) {
    html = html.replace(oldLoadSettingsNoCR, newLoadSettings);
}

// 3. Update loadEnquiryCategories
const oldLoadCategories = `const res = await fetch('/api/enquiry-categories');`;
const newLoadCategories = `const res = await fetch(\`/api/enquiry-categories?projectId=\${currentProjectId}\`);`;
html = html.replace(oldLoadCategories, newLoadCategories);

fs.writeFileSync(filePath, html, 'utf8');
console.log('Admin UI updated successfully.');
