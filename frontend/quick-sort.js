'use strict';

(function(){
  const API_BASE_URL = 'https://banking-advisor.onrender.com/api';

  // Elements
  const qsForm = document.getElementById('qsForm');
  const qsInput = document.getElementById('qsInput');
  const qsStream = document.getElementById('qsStream');
  const qsFollowup = document.getElementById('qsFollowup');
  const qsFormFollow = document.getElementById('qsFormFollow');
  const qsInputFollow = document.getElementById('qsInputFollow');

  // Utilities
  function fmtMoney(v){ if(v==null) return 'N/A'; return '₹' + Number(v).toLocaleString(); }

  // --- Parsing helpers ---
  function parseAmountFromText(text){
    if (!text) return null;
    const cleaned = text.replace(/[,\s]/g,' ').toLowerCase();
    // Support crore/lakh/lac/k
    const unitMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(crore|cr|lakh|lac|k|thousand|million|m|b|bn|rs|inr|₹)?/i);
    let amount = null;
    if (unitMatch){
      const num = parseFloat(unitMatch[1]);
      const unit = unitMatch[2] || '';
      const map = {
        'crore': 10000000, 'cr': 10000000,
        'lakh': 100000, 'lac': 100000,
        'k': 1000, 'thousand': 1000,
        'million': 1000000, 'm': 1000000,
        'b': 1000000000, 'bn': 1000000000,
        'rs': 1, 'inr': 1, '₹': 1
      };
      const mul = map[unit] || 1;
      amount = Math.round(num * mul);
    }
    // If contains explicit currency with commas like ₹2,00,000
    const moneyMatch = text.replace(/,/g,'').match(/₹?\s*(\d{4,9})/);
    if (moneyMatch) amount = Math.max(amount || 0, parseInt(moneyMatch[1],10));
    return amount || null;
  }

  function parseTenureYearsFromText(text){
    if (!text) return null;
    const lower = text.toLowerCase();
    const mYears = lower.match(/(\d+(?:\.\d+)?)\s*(years|year|yrs|yr|y)/);
    if (mYears) return parseFloat(mYears[1]);
    const mMonths = lower.match(/(\d+(?:\.\d+)?)\s*(months|month|mo|mth)/);
    if (mMonths) return parseFloat(mMonths[1]) / 12;
    return null;
  }

  function extractPreferredPayout(text){
    const t = (text||'').toLowerCase();
    if (t.includes('monthly')) return 'monthly';
    if (t.includes('quarter')) return 'quarter';
    if (t.includes('yearly') || t.includes('annual') || t.includes('annually')) return 'year';
    return null;
  }

  function extractRiskIntent(text){
    const t = (text||'').toLowerCase();
    if (t.includes('low risk') || t.includes('safe') || t.includes('secure')) return 'low';
    if (t.includes('high risk') || t.includes('growth') || t.includes('aggressive')) return 'high';
    return null;
  }

  function chooseCategoryFromText(text){
    const t = (text||'').toLowerCase();
    if (t.includes('sip') || t.includes('mutual') || t.includes('equity')) return 'smart-investment';
    if (t.includes('retire') || t.includes('senior')) return 'retirement-plans';
    if (t.includes('education') || t.includes('child')) return 'education-funds';
    if (t.includes('business') || t.includes('corporate')) return 'business-growth';
    if (t.includes('real estate') || t.includes('reit')) return 'real-estate';
    if (t.includes('fd') || t.includes('fixed deposit') || t.includes('government') || t.includes('rd') || t.includes('mis')) return 'financial-planning';
    return null;
  }

  function createSchemeCard(scheme) {
    const minInvestmentDisplay = scheme.min_investment
      ? `₹${Number(scheme.min_investment).toLocaleString()}`
      : 'N/A';
    const logoPath = scheme.provider_logo ? (scheme.provider_logo.startsWith('/') ? scheme.provider_logo.substring(1) : scheme.provider_logo) : '';
    const logo = logoPath ? `<img class="scheme-logo" src="${logoPath}" alt="${scheme.provider_name}">` : '';
    return `
      <div class="scheme-card glass-card" data-plan-id="${encodeURIComponent(scheme.plan_id)}" role="button" tabindex="0">
        <div class="scheme-header">
          <h3>${scheme.plan_name || 'Plan'}</h3>
          ${logo}
        </div>
        <div class="scheme-details">
          <div class="scheme-detail">
            <span class="detail-label">Provider</span>
            <span class="detail-value">${scheme.provider_name || '-'}</span>
          </div>
          <div class="scheme-detail">
            <span class="detail-label">Interest</span>
            <span class="detail-value">${scheme.interest_rate || '-'}</span>
          </div>
          <div class="scheme-detail">
            <span class="detail-label">Min Invest</span>
            <span class="detail-value">${minInvestmentDisplay}</span>
          </div>
          <div class="scheme-detail">
            <span class="detail-label">Tenure</span>
            <span class="detail-value">${scheme.tenure || '-'}</span>
          </div>
          ${scheme.risk_level ? `<div class="risk-level badge ${(String(scheme.risk_level).toLowerCase().includes('low') ? 'risk-low badge-success' : 'risk-high badge-warning')}">${scheme.risk_level}</div>` : ''}
        </div>
      </div>
    `;
  }

  // Modal (inline minimal implementation)
  let modalOverlay;
  function ensureModal(){
    if (modalOverlay) return;
    const styles = `
    .plan-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;z-index:1000;padding:20px;}
    .plan-modal{width:min(1000px,95vw);max-height:90vh;overflow:auto;background:rgba(255,255,255,0.95);border-radius:24px;box-shadow:0 25px 80px rgba(0,0,0,0.3);position:relative;border:1px solid rgba(255,255,255,0.2)}
    .plan-modal .close-btn{position:absolute;top:20px;right:20px;width:44px;height:44px;border-radius:12px;border:none;background:rgba(255,255,255,0.9);cursor:pointer;font-size:20px;color:#666;box-shadow:0 4px 12px rgba(0,0,0,0.1);z-index:10}
    .plan-modal .close-btn:hover{background:#fff;color:#333}
    .plan-banner{width:100%;height:200px;border-radius:24px 24px 0 0;overflow:hidden;position:relative;background:linear-gradient(135deg,#667eea,#764ba2)}
    .plan-banner img{width:100%;height:100%;object-fit:cover;opacity:.8}
    .plan-banner .overlay{position:absolute;inset:0;background:linear-gradient(135deg,rgba(102,126,234,.8),rgba(118,75,162,.8))}
    .plan-content{padding:32px}
    .plan-header{display:flex;gap:16px;align-items:center;margin-bottom:24px;margin-top:-60px;position:relative;z-index:5}
    .plan-header img{width:60px;height:60px;border-radius:16px;object-fit:cover;border:4px solid #fff;box-shadow:0 8px 24px rgba(0,0,0,0.15)}
    .plan-title{font-size:1.8rem;font-weight:700;color:#1a1a1a;margin:0;line-height:1.2}
    .plan-provider{color:#666;font-size:1rem;margin-top:4px}
    .plan-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin:24px 0}
    .plan-info{background:rgba(248,250,252,.8);border:1px solid #e2e8f0;border-radius:16px;padding:16px;text-align:center}
    .plan-info .label{color:#64748b;font-size:.85rem;font-weight:500;margin-bottom:8px}
    .plan-info .value{color:#1e293b;font-weight:700;font-size:1.1rem}
    .plan-section{margin:24px 0;padding:20px;background:rgba(248,250,252,.5);border-radius:16px;border:1px solid #e2e8f0}
    .plan-section h3{margin:0 0 12px;font-size:1.2rem;color:#1e293b;font-weight:600}
    .plan-cta{margin-top:32px;text-align:center}
    .plan-cta a{display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border-radius:12px;text-decoration:none;font-weight:600;font-size:1rem;box-shadow:0 8px 24px rgba(102,126,234,.3)}
    .badge{display:inline-block;padding:8px 16px;border-radius:999px;font-size:.85rem;font-weight:600;margin-left:auto}
    .badge-success { background: #e8f5e8; color: #2d5a2d; border: 1px solid #c8e6c9; }
    .badge-warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
    `;
    document.head.insertAdjacentHTML('beforeend', `<style>${styles}</style>`);
    modalOverlay = document.createElement('div');
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
      </div>`;
    document.body.appendChild(modalOverlay);
    modalOverlay.addEventListener('click', (e)=>{ if(e.target === modalOverlay) closePlanModal(); });
    modalOverlay.querySelector('.close-btn').addEventListener('click', closePlanModal);
    document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closePlanModal(); });
  }
  function openPlanModal(){ ensureModal(); modalOverlay.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
  function closePlanModal(){ if(!modalOverlay) return; modalOverlay.style.display = 'none'; document.body.style.overflow = ''; }

  async function showPlanDetails(planId){
    ensureModal();
    try{
      const res = await fetch(`${API_BASE_URL}/schemes/${encodeURIComponent(planId)}`);
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const s = await res.json();
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
        // Remove leading slash if present and ensure correct path
        const logoPath = s.provider_logo.startsWith('/') ? s.provider_logo.substring(1) : s.provider_logo;
        document.getElementById('pm-logo').src = logoPath;
      } else {
        document.getElementById('pm-logo').src = 'bank-logos/axis.png'; // fallback
      }

      if(s.provider_banner) {
        // Remove leading slash if present and ensure correct path
        const bannerPath = s.provider_banner.startsWith('/') ? s.provider_banner.substring(1) : s.provider_banner;
        document.getElementById('pm-banner').src = bannerPath;
      }
      document.getElementById('pm-link').href = s.official_url || '#';

      // Bank metadata should already be included from backend
      openPlanModal();
    }catch(err){
      alert('Unable to load plan details');
    }
  }

  function attachCardHandlers(container){
    container.querySelectorAll('[data-plan-id]').forEach(card => {
      const pid = card.getAttribute('data-plan-id');
      card.addEventListener('click', ()=> showPlanDetails(pid));
      card.addEventListener('keypress', (e)=>{ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); showPlanDetails(pid); }});
    });
  }

  function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

  async function renderCardsStreaming(items){
    // Clear previous
    qsStream.innerHTML = '';

    for (let i=0; i<items.length; i++){
      const placeholder = document.createElement('div');
      placeholder.className = 'typing-placeholder';
      placeholder.textContent = 'Finding plan ' + (i+1) + '...';
      qsStream.appendChild(placeholder);
      await sleep(350 + Math.random()*300);

      const cardWrap = document.createElement('div');
      cardWrap.innerHTML = createSchemeCard(items[i]);
      const cardEl = cardWrap.firstElementChild;
      qsStream.replaceChild(cardEl, placeholder);
      attachCardHandlers(qsStream);
      await sleep(120);
    }

    if (qsFollowup) qsFollowup.style.display = 'block';
  }

  function dedupeByPlanId(arr){
    const seen = new Set();
    const out = [];
    for (const s of arr){
      const id = s.plan_id || (s.scheme && s.scheme.plan_id) || JSON.stringify([s.plan_name, s.provider_name]);
      if (!seen.has(id)) { seen.add(id); out.push(s.scheme || s); }
    }
    return out;
  }

  async function queryAllSources(prompt){
    const amount = parseAmountFromText(prompt);
    const tenure = parseTenureYearsFromText(prompt);
    const payout = extractPreferredPayout(prompt);
    const risk = extractRiskIntent(prompt);
    const categorySlug = chooseCategoryFromText(prompt);

    let items = [];

    // 1) If we have amount+tenure, prefer the scoring endpoint, optionally with payout
    if (amount != null && tenure != null){
      try{
        const params = new URLSearchParams({ minInvestment: String(amount), tenure: String(tenure) });
        if (payout) params.set('preferredPayout', payout);
        const r = await fetch(`${API_BASE_URL}/schemes/filter?${params.toString()}`);
        if (r.ok){
          const d = await r.json();
          let scored = [...(d.lowRisk||[]), ...(d.highRisk||[])];
          if (risk === 'low') scored = scored.filter(s => (s.risk_level||'').toLowerCase().includes('low'));
          if (risk === 'high') scored = scored.filter(s => !(s.risk_level||'').toLowerCase().includes('low'));
          items = scored;
        }
      }catch(e){ /* continue to fallbacks */ }
    }

    // 2) If nothing yet and we have a category intent, use category endpoint
    if (!items.length && categorySlug){
      try{
        const r = await fetch(`${API_BASE_URL}/schemes/category/${encodeURIComponent(categorySlug)}`);
        if (r.ok){
          const d = await r.json();
          items = Array.isArray(d.items) ? d.items : [];
        }
      }catch(e){ /* continue */ }
    }

    // 3) Always try local semantic-like search and merge
    try{
      const q = await fetch(`${API_BASE_URL}/ai-data/query-data`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ query: prompt, queryType: 'search' }) });
      if (q.ok){
        const data = await q.json();
        const localItems = Array.isArray(data.results) ? data.results : [];
        items = dedupeByPlanId([...(items||[]), ...localItems]);
      }
    }catch(e){ /* ignore */ }

    return { items };
  }

  async function handleSubmit(e, source){
    e.preventDefault();
    const input = source === 'follow' ? qsInputFollow : qsInput;
    const btn = source === 'follow' ? document.getElementById('qsSubmitFollow') : document.getElementById('qsSubmit');
    const text = (input.value || '').trim();
    if (!text) return;

    btn.disabled = true;

    // Show a short typing block
    qsStream.innerHTML = '<div class="typing-placeholder">Understanding your needs...</div>';

    try{
      const { items } = await queryAllSources(text);
      await renderCardsStreaming(items.slice(0, 12));
    }catch(err){
      qsStream.innerHTML = '<div class="typing-placeholder">I couldn\'t understand that fully. Try including your goal (FD/MIS/MF), any preferred risk, and optionally amount and tenure. Example: “safe FD for 2 years, ₹150000, monthly payout”.</div>';
    }finally{
      btn.disabled = false;
      input.value = '';
      input.focus();
    }
  }

  if (qsForm){ qsForm.addEventListener('submit', (e)=> handleSubmit(e, 'main')); }
  if (qsFormFollow){ qsFormFollow.addEventListener('submit', (e)=> handleSubmit(e, 'follow')); }
})();
