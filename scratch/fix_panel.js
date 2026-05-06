const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'dashboard.html');
let html = fs.readFileSync(filePath, 'utf8');

// Find the panel by unique markers and replace the block
const startMarker = '            <div class="ai-brain-status">';
const endMarker   = '            </div>\r\n            </div>\r\n        </div>';

const startIdx = html.indexOf(startMarker);
const endIdx   = html.indexOf(endMarker, startIdx) + endMarker.length;

if (startIdx === -1 || endIdx === -1) {
    console.error('Markers not found. startIdx:', startIdx, 'endIdx:', endIdx);
    process.exit(1);
}

const newPanel = `            <!-- Live Operations Sidebar -->
            <div class="ai-brain-status" style="display:flex; flex-direction:column; gap:0; overflow-y:auto;">

                <!-- Header -->
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
                    <h2 style="font-size:1rem; font-weight:800;"><span class="pulse"></span>LIVE OPERATIONS</h2>
                    <span id="liveStatsTime" style="font-size:0.7rem; opacity:0.5;">Loading...</span>
                </div>
                <p style="font-size:0.75rem; opacity:0.5; margin-bottom:20px;">Real-time data from your patient intake system.</p>

                <!-- Today's Enquiries -->
                <div style="background:rgba(255,255,255,0.06); border-radius:14px; padding:16px; margin-bottom:10px;">
                    <p style="font-size:0.7rem; opacity:0.6; font-weight:700; text-transform:uppercase; margin-bottom:6px;">Today's Enquiries</p>
                    <div style="display:flex; align-items:baseline; gap:10px;">
                        <span id="lsTodayCount" style="font-size:2.4rem; font-weight:800;">—</span>
                        <span id="lsTodayDelta" style="font-size:0.8rem; opacity:0.7;"></span>
                    </div>
                </div>

                <!-- Auto-Reply Rate -->
                <div style="background:rgba(255,255,255,0.06); border-radius:14px; padding:16px; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <p style="font-size:0.7rem; opacity:0.6; font-weight:700; text-transform:uppercase;">AI Auto-Reply Rate</p>
                        <span id="lsAutoRate" style="font-size:1rem; font-weight:800; color:var(--success);">—%</span>
                    </div>
                    <div style="height:6px; background:rgba(255,255,255,0.1); border-radius:10px; overflow:hidden;">
                        <div id="lsAutoBar" style="height:100%; background:var(--success); border-radius:10px; width:0%; transition:width 0.8s ease;"></div>
                    </div>
                </div>

                <!-- Top Category Today -->
                <div style="background:rgba(255,255,255,0.06); border-radius:14px; padding:16px; margin-bottom:10px;">
                    <p style="font-size:0.7rem; opacity:0.6; font-weight:700; text-transform:uppercase; margin-bottom:8px;">Top Category Today</p>
                    <div id="lsTopType" style="font-size:0.95rem; font-weight:700;">—</div>
                </div>

                <!-- Trending Keywords -->
                <div style="background:rgba(255,255,255,0.06); border-radius:14px; padding:16px; margin-bottom:10px;">
                    <p style="font-size:0.7rem; opacity:0.6; font-weight:700; text-transform:uppercase; margin-bottom:10px;"><i class="fas fa-fire" style="color:#FF8C00;"></i> Trending Keywords</p>
                    <div id="lsKeywords" style="display:flex; flex-wrap:wrap; gap:8px;"></div>
                </div>

                <!-- Last Patient Contact -->
                <div style="background:rgba(255,255,255,0.06); border-radius:14px; padding:16px; margin-bottom:10px;">
                    <p style="font-size:0.7rem; opacity:0.6; font-weight:700; text-transform:uppercase; margin-bottom:8px;">Last Patient Contact</p>
                    <div id="lsLastEnq" style="font-size:0.88rem;">—</div>
                </div>

                <!-- Auto-Pilot Status -->
                <div style="background:rgba(255,255,255,0.06); border-radius:14px; padding:14px 16px; margin-bottom:18px; display:flex; align-items:center; justify-content:space-between;">
                    <p style="font-size:0.7rem; opacity:0.6; font-weight:700; text-transform:uppercase;">AI Auto-Pilot</p>
                    <span id="lsAutoPilot" style="font-size:0.85rem; font-weight:800;">—</span>
                </div>

                <!-- Quick Log -->
                <div style="background:rgba(255,255,255,0.05); padding:16px; border-radius:14px; border:1px solid rgba(255,255,255,0.08);">
                    <h4 style="font-size:0.8rem; margin-bottom:8px;"><i class="fas fa-plus-circle" style="color:var(--accent);"></i> QUICK LOG — Social Comment</h4>
                    <p style="font-size:0.72rem; opacity:0.6; margin-bottom:10px;">Manually add a YouTube / Instagram comment to the triage queue.</p>
                    <textarea id="manualEnquiryMsg" placeholder="Paste comment here..." style="width:100%; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); color:white; padding:10px; border-radius:8px; font-size:0.8rem; min-height:70px; resize:vertical;"></textarea>
                    <select id="manualPlatform" style="width:100%; margin-top:8px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); color:white; padding:8px; border-radius:8px; font-size:0.8rem;">
                        <option value="YouTube">Source: YouTube</option>
                        <option value="Instagram">Source: Instagram</option>
                        <option value="LinkedIn">Source: LinkedIn</option>
                    </select>
                    <button onclick="submitManualEnquiry()" style="width:100%; margin-top:10px; padding:11px; background:var(--success); border:none; border-radius:10px; color:white; font-weight:700; cursor:pointer; font-size:0.85rem;">ANALYZE &amp; SYNC</button>
                </div>

            </div>
            </div>
        </div>`;

html = html.slice(0, startIdx) + newPanel + html.slice(endIdx);
fs.writeFileSync(filePath, html, 'utf8');
console.log('Panel replaced successfully. startIdx:', startIdx, 'endIdx:', endIdx);
