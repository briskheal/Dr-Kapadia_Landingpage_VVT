const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(filePath, 'utf8');

// 1. Update loadLiveSettings to use project context and inject Clarity/GA
const oldLoadSettings = `        async function loadLiveSettings() {\r\n            try {\r\n                const res = await fetch('/api/settings');\r\n                const data = await res.json();\r\n                if (data.settings) {`;
const newLoadSettings = `        async function loadLiveSettings() {
            try {
                // Use 'hospital' context for the main landing page
                const res = await fetch('/api/settings?projectId=hospital');
                const data = await res.json();
                const s = data.settings;
                
                if (s) {
                    // Inject Microsoft Clarity if ID exists
                    if (s.clarity_id) {
                        (function(c,l,a,r,i,t,y){
                            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                        })(window, document, "clarity", "script", s.clarity_id);
                    }
                    
                    // Inject Google Analytics if ID exists
                    if (s.ga_id) {
                        const script = document.createElement('script');
                        script.async = true;
                        script.src = "https://www.googletagmanager.com/gtag/js?id=" + s.ga_id;
                        document.head.appendChild(script);
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', s.ga_id);
                    }
                    
                    // Update Texts
                    if (s.landing_page) document.querySelectorAll('h1')[0].innerText = s.landing_page;
                    if (s.phone) document.querySelectorAll('.footer-grid p')[2].innerHTML = \`<i class=\"fas fa-phone\" style=\"color: var(--primary);\"></i> \${s.phone}\`;
                    
                    // Update Logo
                    if (s.logo_url) {
                        const logo = document.querySelector('.logo img');
                        if (logo) logo.src = s.logo_url;
                    }
                    
                    // Update Hero Photo
                    if (s.photo_url) {
                        const hero = document.getElementById('heroDynamicImg');
                        if (hero) hero.src = s.photo_url;
                        // Also add to rotation if needed
                        if (!rotationConfig.heroImages.includes(s.photo_url)) {
                            rotationConfig.heroImages.unshift(s.photo_url);
                        }
                    }

                    // Update Social Links
                    const socialIcons = document.querySelectorAll('.footer-grid + div div a');
                    if (s.insta_url) socialIcons[0].href = s.insta_url;
                    if (s.fb_url) socialIcons[1].href = s.fb_url;
                    if (s.linkedin_url) socialIcons[2].href = s.linkedin_url;
                    if (s.youtube_url) socialIcons[3].href = s.youtube_url;

                    // Update Featured Videos
                    const v1 = getYouTubeID(s.video_1);
                    const v2 = getYouTubeID(s.video_2);
                    if (v1 || v2) {
                        rotationConfig.youtubeVideos = [];
                        if (v1) rotationConfig.youtubeVideos.push(v1);
                        if (v2) rotationConfig.youtubeVideos.push(v2);
                        rotationConfig.dbVideosLoaded = true;
                        applyRotation();
                    } else {
                        rotationConfig.dbVideosLoaded = false;
                    }
`;

// Apply replacement for loadLiveSettings (bulk)
const fullBlockOld = `        async function loadLiveSettings() {\r\n            try {\r\n                const res = await fetch('/api/settings');\r\n                const data = await res.json();\r\n                if (data.settings) {\r\n                    // Update Texts\r\n                    if (data.settings.landing_page) document.querySelectorAll('h1')[0].innerText = data.settings.landing_page;\r\n                    if (data.settings.phone) document.querySelectorAll('.footer-grid p')[2].innerHTML = \`<i class=\"fas fa-phone\" style=\"color: var(--primary);\"></i> \${data.settings.phone}\`;\r\n                    \r\n                    // Update Logo\r\n                    if (data.settings.logo_url) {\r\n                        const logo = document.querySelector('.logo img');\r\n                        if (logo) logo.src = data.settings.logo_url;\r\n                    }\r\n                    \r\n                    // Update Hero Photo\r\n                    if (data.settings.photo_url) {\r\n                        const hero = document.getElementById('heroDynamicImg');\r\n                        if (hero) hero.src = data.settings.photo_url;\r\n                        // Also add to rotation if needed\r\n                        if (!rotationConfig.heroImages.includes(data.settings.photo_url)) {\r\n                            rotationConfig.heroImages.unshift(data.settings.photo_url);\r\n                        }\r\n                    }\r\n\r\n                    // Update Social Links\r\n                    const socialIcons = document.querySelectorAll('.footer-grid + div div a');\r\n                    if (data.settings.insta_url) socialIcons[0].href = data.settings.insta_url;\r\n                    if (data.settings.fb_url) socialIcons[1].href = data.settings.fb_url;\r\n                    if (data.settings.linkedin_url) socialIcons[2].href = data.settings.linkedin_url;\r\n                    if (data.settings.youtube_url) socialIcons[3].href = data.settings.youtube_url;\r\n\r\n                    // Update Featured Videos — DB takes priority; clears rotation fallback only when a valid link exists\r\n                    const v1 = getYouTubeID(data.settings.video_1);\r\n                    const v2 = getYouTubeID(data.settings.video_2);\r\n                    if (v1 || v2) {\r\n                        rotationConfig.youtubeVideos = [];\r\n                        if (v1) rotationConfig.youtubeVideos.push(v1);\r\n                        if (v2) rotationConfig.youtubeVideos.push(v2);\r\n                        rotationConfig.dbVideosLoaded = true; // flag: DB has real videos\r\n                        applyRotation(); // Apply DB videos immediately\r\n                    } else {\r\n                        rotationConfig.dbVideosLoaded = false; // no DB video — use fallback rotation\r\n                    }\r\n                }`;

if (html.includes(fullBlockOld)) {
    html = html.replace(fullBlockOld, newLoadSettings);
} else {
    // Try without CRLF
    const fullBlockOldNoCR = fullBlockOld.replace(/\r\n/g, '\n');
    if (html.includes(fullBlockOldNoCR)) {
        html = html.replace(fullBlockOldNoCR, newLoadSettings);
    } else {
        console.log('LoadSettings block mismatch');
    }
}

fs.writeFileSync(filePath, html, 'utf8');
console.log('Index.html updated successfully.');
