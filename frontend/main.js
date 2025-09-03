// Add this at the beginning of main.js for scroll effect
document.addEventListener('DOMContentLoaded', function() {
    const nav = document.querySelector('nav');
    
    function handleScroll() {
        if (window.scrollY > 10) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    }
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state
});

// --- Configuration ---
const API_BASE_URL = 'http://localhost:4000/api';

// --- DOM Element Selection ---
const aiAssistantBtns = document.querySelectorAll('.ai-assistant, #aiAssistantBtn');
const aiChatSidebar = document.getElementById('aiChatSidebar');
const aiChatCloseBtn = document.getElementById('aiChatCloseBtn');
const aiChatForm = document.getElementById('aiChatForm');
const aiChatInput = document.getElementById('aiChatInput');
const aiChatMessages = document.getElementById('aiChatMessages');
const predictBtn = document.querySelector('.predict-btn');
const calculateBtn = document.querySelector('.calculate-btn');

// --- AI Chat Sidebar Logic ---
aiAssistantBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        aiChatSidebar.classList.add('open');
    });
});

aiChatCloseBtn.addEventListener('click', () => {
    aiChatSidebar.classList.remove('open');
});

// --- Plan Detail Modal ---
const modalStyles = `
.plan-modal-overlay { 
    position: fixed; 
    inset: 0; 
    background: rgba(0,0,0,0.6); 
    backdrop-filter: blur(8px); 
    -webkit-backdrop-filter: blur(8px); 
    display: none; 
    align-items: center; 
    justify-content: center; 
    z-index: 1000; 
    padding: 20px;
}
.plan-modal { 
    width: min(1000px, 95vw); 
    max-height: 90vh; 
    overflow: auto; 
    background: rgba(255,255,255,0.95); 
    border-radius: 24px; 
    box-shadow: 0 25px 80px rgba(0,0,0,0.3); 
    position: relative;
    border: 1px solid rgba(255,255,255,0.2);
}
.plan-modal .close-btn { 
    position: absolute; 
    top: 20px; 
    right: 20px; 
    width: 44px; 
    height: 44px; 
    border-radius: 12px; 
    border: none; 
    background: rgba(255,255,255,0.9); 
    cursor: pointer; 
    font-size: 20px; 
    color: #666;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    z-index: 10;
}
.plan-modal .close-btn:hover { background: #fff; color: #333; }
.plan-banner { 
    width: 100%; 
    height: 200px; 
    border-radius: 24px 24px 0 0; 
    overflow: hidden; 
    position: relative; 
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.plan-banner img { 
    width: 100%; 
    height: 100%; 
    object-fit: cover; 
    opacity: 0.8; 
}
.plan-banner .overlay { 
    position: absolute; 
    inset: 0; 
    background: linear-gradient(135deg, rgba(102,126,234,0.8), rgba(118,75,162,0.8)); 
}
.plan-content { padding: 32px; }
.plan-header { 
    display: flex; 
    gap: 16px; 
    align-items: center; 
    margin-bottom: 24px; 
    margin-top: -60px;
    position: relative;
    z-index: 5;
}
.plan-header img { 
    width: 60px; 
    height: 60px; 
    border-radius: 16px; 
    object-fit: cover; 
    border: 4px solid #fff;
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}
.plan-title { 
    font-size: 1.8rem; 
    font-weight: 700; 
    color: #1a1a1a; 
    margin: 0;
    line-height: 1.2;
}
.plan-provider { 
    color: #666; 
    font-size: 1rem; 
    margin-top: 4px;
}
.badge { 
    display: inline-block; 
    padding: 8px 16px; 
    border-radius: 999px; 
    font-size: 0.85rem; 
    font-weight: 600; 
    margin-left: auto;
}
.badge-success { background: #e8f5e8; color: #2d5a2d; border: 1px solid #c8e6c9; }
.badge-warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
.plan-grid { 
    display: grid; 
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
    gap: 16px; 
    margin: 24px 0; 
}
.plan-info { 
    background: rgba(248,250,252,0.8); 
    border: 1px solid #e2e8f0; 
    border-radius: 16px; 
    padding: 16px; 
    text-align: center;
}
.plan-info .label { 
    color: #64748b; 
    font-size: 0.85rem; 
    font-weight: 500;
    margin-bottom: 8px;
}
.plan-info .value { 
    color: #1e293b; 
    font-weight: 700; 
    font-size: 1.1rem;
}
.plan-section { 
    margin: 24px 0; 
    padding: 20px;
    background: rgba(248,250,252,0.5);
    border-radius: 16px;
    border: 1px solid #e2e8f0;
}
.plan-section h3 { 
    margin: 0 0 12px; 
    font-size: 1.2rem; 
    color: #1e293b; 
    font-weight: 600;
}
.plan-section p { 
    margin: 0; 
    color: #475569; 
    line-height: 1.6;
}
.plan-cta { 
    margin-top: 32px; 
    text-align: center;
}
.plan-cta a { 
    display: inline-block; 
    padding: 14px 28px; 
    background: linear-gradient(135deg, #667eea, #764ba2); 
    color: #fff; 
    border-radius: 12px; 
    text-decoration: none; 
    font-weight: 600; 
    font-size: 1rem;
    box-shadow: 0 8px 24px rgba(102,126,234,0.3);
    transition: all 0.2s ease;
}
.plan-cta a:hover { 
    transform: translateY(-2px); 
    box-shadow: 0 12px 32px rgba(102,126,234,0.4);
}
`;
document.head.insertAdjacentHTML('beforeend', `<style>${modalStyles}</style>`);

const modalOverlay = document.createElement('div');
modalOverlay.className = 'plan-modal-overlay';
modalOverlay.innerHTML = `
  <div class="plan-modal" role="dialog" aria-modal="true" aria-label="Plan details">
    <button class="close-btn" aria-label="Close">✕</button>
    <div class="plan-banner">
      <img id="pm-banner" src="images/Hero-bg.avif" alt="Banner">
      <div class="overlay"></div>
    </div>
    <div class="plan-content">
      <div class="plan-header">
        <img id="pm-logo" src="" alt="Provider logo">
        <div>
          <div class="plan-title" id="pm-title">Loading...</div>
          <div class="plan-provider" id="pm-provider">Provider</div>
        </div>
        <span id="pm-risk" class="badge">Risk</span>
      </div>
      <div class="plan-grid">
        <div class="plan-info"><div class="label">Interest Rate</div><div class="value" id="pm-interest"></div></div>
        <div class="plan-info"><div class="label">Investment Tenure</div><div class="value" id="pm-tenure"></div></div>
        <div class="plan-info"><div class="label">Min Investment</div><div class="value" id="pm-minInv"></div></div>
        <div class="plan-info"><div class="label">Payout Frequency</div><div class="value" id="pm-payout"></div></div>
      </div>
      <div class="plan-section">
        <h3>About this plan</h3>
        <p id="pm-desc"></p>
      </div>
      <div class="plan-section" id="pm-feats-sec" style="display:none;">
        <h3>Key features</h3>
        <ul id="pm-feats" style="margin: 0; padding-left: 20px; color: #475569;"></ul>
      </div>
      <div class="plan-section">
        <h3>Tax benefits</h3>
        <p id="pm-tax"></p>
      </div>
      <div class="plan-section">
        <h3>Lock-in period & Eligibility</h3>
        <p id="pm-lock"></p>
        <p id="pm-elig"></p>
      </div>
      <div class="plan-cta">
        <a id="pm-link" target="_blank" rel="noopener">Visit Official Page</a>
      </div>
    </div>
  </div>
`;
document.body.appendChild(modalOverlay);

function openPlanModal() { 
    modalOverlay.style.display = 'flex'; 
    document.body.style.overflow = 'hidden'; 
}
function closePlanModal() { 
    modalOverlay.style.display = 'none'; 
    document.body.style.overflow = ''; 
}
modalOverlay.addEventListener('click', (e)=>{ if(e.target === modalOverlay) closePlanModal(); });
modalOverlay.querySelector('.close-btn').addEventListener('click', closePlanModal);
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closePlanModal(); });

function fmtMoney(v){ if(v==null) return 'N/A'; return '₹' + Number(v).toLocaleString(); }

async function showPlanDetails(planId){
    try{
        console.log('Fetching plan:', planId);
        const res = await fetch(`${API_BASE_URL}/schemes/${encodeURIComponent(planId)}`);
        console.log('Response status:', res.status);
        
        if(!res.ok) {
            const errorText = await res.text();
            console.error('API Error:', errorText);
            throw new Error(`API returned ${res.status}: ${errorText}`);
        }
        
        const s = await res.json();
        console.log('Plan data:', s);
        
        document.getElementById('pm-title').textContent = s.plan_name || 'Plan';
        document.getElementById('pm-provider').textContent = s.provider_name || '';
        document.getElementById('pm-interest').textContent = s.interest_rate || '—';
        document.getElementById('pm-tenure').textContent = s.tenure || '—';
        document.getElementById('pm-minInv').textContent = fmtMoney(s.min_investment);
        document.getElementById('pm-payout').textContent = s.payout_frequency || '—';
        document.getElementById('pm-desc').textContent = s.description || '';
        document.getElementById('pm-tax').textContent = s.tax_benefits || '—';
        document.getElementById('pm-lock').textContent = s.lock_in_period || '—';
        document.getElementById('pm-elig').textContent = s.eligibility || '';
        
        const risk = document.getElementById('pm-risk');
        risk.textContent = s.risk_level || '—';
        risk.className = 'badge ' + (((s.risk_level||'').toLowerCase().includes('low')) ? 'badge-success' : 'badge-warning');
        
        if(s.provider_logo) {
            document.getElementById('pm-logo').src = s.provider_logo;
        } else {
            document.getElementById('pm-logo').src = 'bank-logos/axis.png'; // fallback
        }
        
        if(s.provider_banner) {
            document.getElementById('pm-banner').src = s.provider_banner;
        }
        
        const link = s.official_url || '#';
        document.getElementById('pm-link').href = link;
        
        // Handle features
        const feats = Array.isArray(s.key_features) ? s.key_features : [];
        if(feats.length > 0){
            document.getElementById('pm-feats-sec').style.display = 'block';
            document.getElementById('pm-feats').innerHTML = feats.map(f=>`<li>${f}</li>`).join('');
        } else {
            document.getElementById('pm-feats-sec').style.display = 'none';
        }
        
        openPlanModal();
    }catch(err){
        console.error('Error loading plan:', err);
        alert(`Unable to load plan details: ${err.message}`);
    }
}

// --- Scheme Display Functions ---

/**
 * Creates the HTML for a single investment scheme card.
 * @param {object} scheme - The scheme data object from the API.
 * @returns {string} - The HTML string for the card.
 */
function createSchemeCard(scheme) {
    const minInvestmentDisplay = scheme.min_investment 
        ? `₹${scheme.min_investment.toLocaleString()}` 
        : 'N/A';
    const logo = scheme.provider_logo ? `<img class="scheme-logo" src="${scheme.provider_logo}" alt="${scheme.provider_name}">` : '';
    return `
        <div class="scheme-card glass-card" data-plan-id="${encodeURIComponent(scheme.plan_id)}" role="button" tabindex="0">
            <div class="scheme-header">
                <h3>${scheme.plan_name}</h3>
                ${logo}
            </div>
            <div class="scheme-details">
                <div class="scheme-detail">
                    <span class="detail-label">Provider</span>
                    <span class="detail-value">${scheme.provider_name}</span>
                </div>
                <div class="scheme-detail">
                    <span class="detail-label">Interest</span>
                    <span class="detail-value">${scheme.interest_rate}</span>
                </div>
                <div class="scheme-detail">
                    <span class="detail-label">Min Invest</span>
                    <span class="detail-value">${minInvestmentDisplay}</span>
                </div>
                <div class="scheme-detail">
                    <span class="detail-label">Tenure</span>
                    <span class="detail-value">${scheme.tenure}</span>
                </div>
                <div class="risk-level badge ${scheme.risk_level.toLowerCase().includes('low') ? 'risk-low badge-success' : 'risk-high badge-warning'}">
                    ${scheme.risk_level}
                </div>
            </div>
        </div>
    `;
}

// Add these styles to schemeCardStyles
const additionalStyles = `
.scheme-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 15px;
}

.scheme-logo {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    object-fit: cover;
}

/* glassmorphism + hover */
.glass-card {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 18px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.08);
    transition: all 0.3s ease;
    border: 1px solid rgba(255,255,255,0.2);
}
.glass-card:hover {
    transform: translateY(-4px) scale(1.02);
    background: rgba(255, 255, 255, 0.85);
    box-shadow: 0 20px 48px rgba(0,0,0,0.15);
}

/* pill badges */
.badge {
    display: inline-block;
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 600;
}
.badge-success { background: #e8f5e8; color: #2d5a2d; border: 1px solid #c8e6c9; }
.badge-warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }

/* pastel gradient sections */
.filtered-schemes {
    background: linear-gradient(135deg, #f8fbff, #f6f7ff);
    padding: 60px 0;
}
`;

document.head.insertAdjacentHTML('beforeend', `<style>${additionalStyles}</style>`);

/**
 * Renders the categorized schemes data into the DOM.
 * @param {{lowRisk: Array, highRisk: Array}} schemesData - The object from the backend.
 */
function displayFilteredSchemes(schemesData) {
    let schemesSection = document.querySelector('.filtered-schemes');
    if (!schemesSection) {
        schemesSection = document.createElement('section');
        schemesSection.className = 'filtered-schemes';
        document.querySelector('.hero').insertAdjacentElement('afterend', schemesSection);
    }
    
    if (!schemesData || typeof schemesData.lowRisk === 'undefined' || typeof schemesData.highRisk === 'undefined') {
        console.error("Invalid data received from API:", schemesData);
        alert("Sorry, an error occurred while fetching schemes. The server might have sent an invalid response.");
        return;
    }

    const lowRisk = schemesData.lowRisk.slice(0, 10);
    const highRisk = schemesData.highRisk.slice(0, 10);

    if (lowRisk.length === 0 && highRisk.length === 0) {
        schemesSection.innerHTML = `
            <div class="schemes-container">
                <div class="risk-category">
                    <h2>No matching schemes found</h2>
                    <p style="text-align: center; color: #666;">Please try adjusting your investment amount or tenure.</p>
                </div>
            </div>
        `;
        schemesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
    }

    schemesSection.innerHTML = `
        <div class="schemes-container">
            ${lowRisk.length > 0 ? `
            <div class="risk-category">
                <h2>Stable & Secure Choices</h2>
                <p class="category-subtitle">Low-risk investment options with guaranteed returns</p>
                <div class="scheme-grid">
                    ${lowRisk.map(createSchemeCard).join('')}
                </div>
            </div>` : ''}
            ${highRisk.length > 0 ? `
            <div class="risk-category">
                <h2>Growth & Opportunity Picks</h2>
                <p class="category-subtitle">Higher potential returns with moderate to high risk</p>
                <div class="scheme-grid">
                    ${highRisk.map(createSchemeCard).join('')}
                </div>
            </div>` : ''}
        </div>
    `;
    
    // Attach click handlers for modal open
    schemesSection.querySelectorAll('[data-plan-id]').forEach(card => {
        const pid = card.getAttribute('data-plan-id');
        card.addEventListener('click', () => showPlanDetails(pid));
        card.addEventListener('keypress', (e) => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showPlanDetails(pid); }});
    });

    schemesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// --- API Call and Event Handling ---
async function findAndDisplaySchemes(amount, tenure) {
    if (!amount || !tenure) {
        alert('Please enter both investment amount and tenure.');
        return;
    }

    try {
        const numAmount = parseFloat(amount);
        const numTenure = parseFloat(tenure);
        
        if (isNaN(numAmount) || isNaN(numTenure)) {
            alert('Please enter valid numbers for amount and tenure.');
            return;
        }

        const queryParams = new URLSearchParams({
            minInvestment: numAmount,
            tenure: numTenure
        });
        
        const existingSection = document.querySelector('.filtered-schemes');
        if (existingSection) {
            existingSection.innerHTML = '<div class="loading">Fetching best schemes...</div>';
        }

        const response = await fetch(`${API_BASE_URL}/schemes/filter?${queryParams}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch schemes');
        }
        
        const bestSchemes = await response.json();
        displayFilteredSchemes(bestSchemes);
    } catch (error) {
        console.error('Error fetching best schemes:', error);
        alert(`Failed to fetch investment schemes: ${error.message}`);
    }
}

if (predictBtn) {
    predictBtn.addEventListener('click', () => {
        const amount = document.getElementById('heroAmount').value;
        const tenure = document.getElementById('heroTenure').value;
        findAndDisplaySchemes(amount, tenure);
    });
}

if (calculateBtn) {
    calculateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const amount = document.getElementById('amount').value;
        const tenure = document.getElementById('tenure').value;
        findAndDisplaySchemes(amount, tenure);
    });
}

if (aiChatForm) {
    aiChatForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const msg = aiChatInput.value.trim();
        if (!msg) return;

        const userMsg = document.createElement('div');
        userMsg.className = 'ai-chat-message ai-chat-message-user';
        userMsg.innerHTML = `<div class="ai-chat-bubble">${msg}</div>`;
        aiChatMessages.appendChild(userMsg);
        
        aiChatInput.value = '';
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
        
        setTimeout(() => {
            const botMsg = document.createElement('div');
            botMsg.className = 'ai-chat-message ai-chat-message-bot';
            botMsg.innerHTML = `
                <div class="ai-chat-avatar"><img src="images/siri-logo.png" alt="AI" /></div>
                <div class="ai-chat-bubble">Thank you for your message. My AI capabilities are currently being upgraded. Please use the main search for now!</div>
            `;
            aiChatMessages.appendChild(botMsg);
            aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
        }, 1000);
    });
}

const schemeCardStyles = `
<style>
.schemes-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 20px;
}
.risk-category {
    margin-bottom: 60px;
}
.risk-category h2 {
    color: #1a1a1a;
    text-align: center;
    margin-bottom: 8px;
    font-size: 2.2rem;
    font-weight: 700;
    letter-spacing: -0.02em;
}
.category-subtitle {
    text-align: center;
    color: #666;
    font-size: 1.1rem;
    margin-bottom: 40px;
    font-weight: 400;
}
.scheme-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 24px;
    justify-content: center;
}
@media (min-width: 1200px) {
    .scheme-grid {
        grid-template-columns: repeat(5, 1fr);
    }
}
@media (max-width: 1199px) and (min-width: 768px) {
    .scheme-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}
@media (max-width: 767px) {
    .scheme-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}
@media (max-width: 480px) {
    .scheme-grid {
        grid-template-columns: 1fr;
    }
}
.scheme-card {
    background: rgba(255,255,255,0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 18px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.08);
    padding: 24px;
    transition: all 0.3s ease;
    border: 1px solid rgba(255,255,255,0.2);
    cursor: pointer;
    min-height: 200px;
    display: flex;
    flex-direction: column;
}
.scheme-card:hover {
    transform: translateY(-4px) scale(1.02);
    background: rgba(255,255,255,0.85);
    box-shadow: 0 20px 48px rgba(0,0,0,0.15);
}
.scheme-header h3 {
    color: #1a1a1a;
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 12px 0;
    line-height: 1.3;
    flex: 1;
}
.scheme-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.scheme-detail {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    align-items: center;
}
.detail-label { 
    color: #666; 
    font-weight: 500; 
}
.detail-value { 
    color: #1a1a1a; 
    font-weight: 600; 
    text-align: right;
}
.risk-level {
    margin-top: 12px;
    align-self: flex-start;
}
</style>
`;
document.head.insertAdjacentHTML('beforeend', schemeCardStyles);

