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

// --- Scheme Display Functions ---

/**
 * Creates the HTML for a single investment scheme card.
 * @param {object} scheme - The scheme data object from the API.
 * @returns {string} - The HTML string for the card.
 */
function createSchemeCard(scheme) {
    // FIX: Handle cases where min_investment can be null (e.g., for loans)
    const minInvestmentDisplay = scheme.min_investment 
        ? `₹${scheme.min_investment.toLocaleString()}` 
        : 'N/A';

    return `
        <div class="scheme-card">
            <h3>${scheme.plan_name}</h3>
            <div class="scheme-details">
                <div class="scheme-detail">
                    <span class="detail-label">Provider:</span>
                    <span class="detail-value">${scheme.provider_name}</span>
                </div>
                <div class="scheme-detail">
                    <span class="detail-label">Interest Rate:</span>
                    <span class="detail-value">${scheme.interest_rate}</span>
                </div>
                <div class="scheme-detail">
                    <span class="detail-label">Min Investment:</span>
                    <span class="detail-value">${minInvestmentDisplay}</span>
                </div>
                <div class="scheme-detail">
                    <span class="detail-label">Tenure:</span>
                    <span class="detail-value">${scheme.tenure}</span>
                </div>
                <div class="risk-level ${scheme.risk_level.toLowerCase().includes('low') ? 'risk-low' : 'risk-high'}">
                    ${scheme.risk_level}
                </div>
            </div>
        </div>
    `;
}

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
    
    // **CRITICAL FIX**: Check if schemesData itself is valid before destructuring
    if (!schemesData || typeof schemesData.lowRisk === 'undefined' || typeof schemesData.highRisk === 'undefined') {
        console.error("Invalid data received from API:", schemesData);
        alert("Sorry, an error occurred while fetching schemes. The server might have sent an invalid response.");
        return;
    }

    const { lowRisk, highRisk } = schemesData;

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
                <h2>Top Conservative Investment Options</h2>
                <div style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: center;">
                    ${lowRisk.map(createSchemeCard).join('')}
                </div>
            </div>` : ''}
            
            ${highRisk.length > 0 ? `
            <div class="risk-category">
                <h2>Top High-Return Investment Options</h2>
                <div style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: center;">
                    ${highRisk.map(createSchemeCard).join('')}
                </div>
            </div>` : ''}
        </div>
    `;
    
    schemesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// --- API Call and Event Handling ---

/**
 * Fetches and displays the best schemes based on user input.
 * @param {string} amount - The investment amount.
 * @param {string} tenure - The investment tenure in years.
 */
async function findAndDisplaySchemes(amount, tenure) {
    if (!amount || !tenure) {
        alert('Please enter both investment amount and tenure.');
        return;
    }

    try {
        const queryParams = new URLSearchParams({ minInvestment: amount, tenure: tenure });
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

// Event Listener for the main "Find Best Schemes" button in the hero section
if (predictBtn) {
    predictBtn.addEventListener('click', () => {
        const amount = document.getElementById('heroAmount').value;
        const tenure = document.getElementById('heroTenure').value;
        findAndDisplaySchemes(amount, tenure);
    });
}

// Event Listener for the "Calculate Returns" button in the calculator section
if (calculateBtn) {
    calculateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const amount = document.getElementById('amount').value;
        const tenure = document.getElementById('tenure').value;
        findAndDisplaySchemes(amount, tenure);
    });
}

// --- AI Chat Form Submission ---
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


// --- Dynamic Styles for Scheme Cards ---
const schemeCardStyles = `
<style>
.schemes-container {
    display: flex;
    flex-direction: column;
    gap: 40px;
    padding: 40px 20px;
    justify-content: center;
    background-color: #f8f9fa;
}

.risk-category {
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
}

.risk-category h2 {
    color: #333;
    text-align: center;
    margin-bottom: 30px;
    font-size: 2rem;
}

.scheme-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    padding: 20px;
    width: 320px;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    border: 1px solid #eee;
}

.scheme-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
}

.scheme-card h3 {
    color: #2c3e50;
    margin-bottom: 15px;
    font-size: 1.1rem;
    font-weight: 600;
    min-height: 40px; /* Ensures alignment */
}

.scheme-details {
    margin-top: 15px;
    border-top: 1px solid #f0f0f0;
    padding-top: 15px;
}

.scheme-detail {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    font-size: 0.9rem;
}

.detail-label {
    color: #777;
}

.detail-value {
    color: #333;
    font-weight: 500;
    text-align: right;
}

.risk-level {
    display: inline-block;
    padding: 5px 12px;
    border-radius: 15px;
    font-size: 0.8rem;
    font-weight: 500;
    margin-top: 10px;
}

.risk-low, .risk-very.low {
    background: #e8f5e9;
    color: #2e7d32;
}

.risk-high, .risk-very.high {
    background: #fbe9e7;
    color: #c62828;
}

.risk-medium {
    background: #fff3e0;
    color: #ef6c00;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', schemeCardStyles);

