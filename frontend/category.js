(function(){
  const API_BASE_URL = 'https://banking-advisor.onrender.com/api';
  const params = new URLSearchParams(location.search);
  const slug = (params.get('slug') || '').trim();

  // header scroll effect
  document.addEventListener('DOMContentLoaded', function(){
    const nav = document.querySelector('nav');
    function handleScroll(){ if(window.scrollY > 10) nav.classList.add('scrolled'); else nav.classList.remove('scrolled'); }
    window.addEventListener('scroll', handleScroll); handleScroll();
  });

  const titles = {
    'smart-investment': { title: 'Smart Investment', sub: 'Higher growth options like SIPs and Equity funds' },
    'financial-planning': { title: 'Financial Planning', sub: 'Conservative options for stability and savings' },
    'real-estate': { title: 'Real Estate', sub: 'REITs and property-linked products' },
    'retirement-plans': { title: 'Retirement Plans', sub: 'Secure your golden years with steady income' },
    'education-funds': { title: 'Education Funds', sub: 'Build a corpus for education and children' },
    'business-growth': { title: 'Business Growth', sub: 'Solutions tailored for business and corporate goals' },
  };

  function setHero() {
    const t = titles[slug] || { title: 'Plans', sub: 'Explore investment options' };
    document.getElementById('catTitle').textContent = t.title;
    document.getElementById('catSub').textContent = t.sub;
  }

  function fmtMoney(v){ if(v==null) return 'N/A'; return '₹' + Number(v).toLocaleString(); }

  function createCard(s){
    const logoPath = s.provider_logo ? (s.provider_logo.startsWith('/') ? s.provider_logo.substring(1) : s.provider_logo) : '';
    const logo = logoPath ? `<img class="scheme-logo" src="${logoPath}" alt="${s.provider_name}">` : '';
    const riskBadge = (s.risk_level||'').toLowerCase().includes('low') ? '<span style="background:#e8f5e8;border:1px solid #c8e6c9;color:#2d5a2d;padding:4px 10px;border-radius:999px;font-weight:600;font-size:.75rem;">Low Risk</span>' : '<span style="background:#fff3cd;border:1px solid #ffeaa7;color:#856404;padding:4px 10px;border-radius:999px;font-weight:600;font-size:.75rem;">Market Linked</span>';
    return `
      <div class="scheme-card" data-plan-id="${encodeURIComponent(s.plan_id)}">
        <div class="scheme-header">
          <h3>${s.plan_name}</h3>
          ${logo}
        </div>
        <div class="scheme-detail"><span class="detail-label">Provider</span><span class="detail-value">${s.provider_name}</span></div>
        <div class="scheme-detail"><span class="detail-label">Interest</span><span class="detail-value">${s.interest_rate || '—'}</span></div>
        <div class="scheme-detail"><span class="detail-label">Min Invest</span><span class="detail-value">${fmtMoney(s.min_investment)}</span></div>
        <div class="scheme-detail"><span class="detail-label">Tenure</span><span class="detail-value">${s.tenure || '—'}</span></div>
        <div style="margin-top:10px;">${riskBadge}</div>
      </div>
    `;
  }

  // Modal styles (same as main.js)
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

  async function load(){
    setHero();
    const topGrid = document.getElementById('topGrid');
    const moreGrid = document.getElementById('moreGrid');
    const moreTitle = document.getElementById('moreTitle');
    topGrid.innerHTML = '<div style="text-align:center;width:100%;color:#666;">Loading...</div>';
    try{
      const res = await fetch(`${API_BASE_URL}/schemes/category/${encodeURIComponent(slug)}`);
      if(!res.ok) throw new Error('Failed');
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      if(!items.length){
        topGrid.innerHTML = '<div style="text-align:center;width:100%;color:#666;">No matching plans found.</div>';
        return;
      }
      const top = items.slice(0, 6);
      const more = items.slice(6);
      topGrid.innerHTML = top.map(createCard).join('');
      if(more.length){
        moreTitle.style.display = '';
        moreGrid.innerHTML = more.map(createCard).join('');
      } else {
        moreTitle.style.display = 'none';
      }
      document.querySelectorAll('[data-plan-id]').forEach(el => {
        el.addEventListener('click', ()=> showPlanDetails(el.getAttribute('data-plan-id')));
      });
    }catch(e){
      topGrid.innerHTML = '<div style="text-align:center;width:100%;color:#666;">Unable to load plans.</div>';
    }
  }

  load();
})();