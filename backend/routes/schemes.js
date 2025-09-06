const express = require("express");
const router = express.Router();
const schemes = require("../data/schemes.json");
let bankMeta = {};
try {
    bankMeta = require("../data/banks.json");
} catch (e) {
    bankMeta = {};
}

// --- Helper Functions for Intelligent Parsing ---

function parseInterestRate(rateStr) {
    if (!rateStr) return 0;
    // Handle range of rates (e.g., "3.50% - 7.75% p.a.")
    const matches = rateStr.match(/\d+(\.\d+)?/g);
    if (matches) {
        // If range exists, take the higher rate for comparison
        return Math.max(...matches.map(rate => parseFloat(rate)));
    }
    return 0;
}

function parseTenure(tenureStr) {
    if (!tenureStr) return { min: 0, max: 100 };

    const str = tenureStr.toLowerCase();
    let min = 0, max = 100;

    if (str.includes('-') || str.includes('to')) {
        const parts = str.match(/(\d+)\s*(days|months|years)?\s*(to|-)\s*(\d+)\s*(months|years)/);
        if (parts) {
            let minVal = parseFloat(parts[1]);
            let maxVal = parseFloat(parts[4]);

            if (parts[2] === 'days') min = minVal / 365;
            else if (parts[2] === 'months') min = minVal / 12;
            else min = minVal;

            if (parts[5] === 'months') max = maxVal / 12;
            else max = maxVal;

            return { min, max };
        }
    }

    const singleMatch = str.match(/(\d+(\.\d+)?)/);
    if (singleMatch) {
        const num = parseFloat(singleMatch[0]);
        if (str.includes('month')) {
            min = max = num / 12;
        } else {
            min = num;
            max = str.includes('+') || str.includes('until') ? 100 : num;
        }
        return { min, max };
    }

    return { min: 0, max: 100 };
}

// Pre-normalize dataset for faster filtering and consistent comparisons
const normalizedSchemes = schemes.map((s) => {
    const interestRateMax = parseInterestRate(s.interest_rate);
    const tenureRangeYears = parseTenure(s.tenure);
    const minInvestment = Number(s.min_investment || 0);
    const maxInvestment = s.max_investment === null || typeof s.max_investment === 'undefined'
        ? null
        : Number(s.max_investment);

    return {
        ...s,
        _interestRateMax: isNaN(interestRateMax) ? 0 : interestRateMax,
        _tenureRangeYears: tenureRangeYears,
        _minInvestment: isNaN(minInvestment) ? 0 : minInvestment,
        _maxInvestment: maxInvestment,
        _riskIsLow: (s.risk_level || '').toLowerCase().includes('low')
    };
});

// Calculate scheme score based on various factors
function calculateSchemeScore(scheme, investmentAmount, investmentTenure, preferences = {}) {
    let score = 0;

    // Interest rate score (0-45 points)
    const interestRate = scheme._interestRateMax || 0;
    // Cap at 15% for normalization; 15% => full 45 points
    const interestNormalized = Math.min(interestRate, 15) / 15;
    score += interestNormalized * 45;

    // Investment amount match score (0-20 points)
    const minInvestment = scheme._minInvestment || 0;
    if (investmentAmount >= minInvestment) {
        // The more headroom above minimum, the better, up to 5x the minimum
        const headroom = Math.min(investmentAmount / Math.max(minInvestment, 1), 5) - 1; // 0..4
        const ratio = Math.max(0, Math.min(headroom / 4, 1));
        score += ratio * 20;
    }

    // Tenure match score (0-20 points)
    const { min: minY, max: maxY } = scheme._tenureRangeYears || { min: 0, max: 100 };
    if (investmentTenure >= minY && investmentTenure <= maxY) {
        // Closer to center of scheme range yields higher score
        const center = (minY + maxY) / 2;
        const spread = Math.max(maxY - minY, 0.01);
        const distance = Math.abs(investmentTenure - center);
        const match = Math.max(0, 1 - (distance / (spread / 2)));
        score += match * 20;
    }

    // Provider trust factor (0-10 points)
    const providerType = scheme.provider_type || '';
    if (providerType === 'Government') score += 10;
    else if (providerType === 'Public Sector Bank') score += 8;
    else if (providerType === 'Private Sector Bank') score += 6;
    else score += 5;

    // Preference nudges (0-5 points)
    if (preferences.preferredPayout) {
        const desired = String(preferences.preferredPayout).toLowerCase();
        const payout = String(scheme.payout_frequency || '').toLowerCase();
        if (desired && payout.includes(desired)) score += 5;
    }

    // Clamp to 0..100
    return Math.max(0, Math.min(100, Math.round(score)));
}

// Route for filtered and scored schemes
router.get("/filter", (req, res) => {
    const { minInvestment, tenure, preferredPayout } = req.query;

    if (!minInvestment || !tenure) {
        return res.status(400).json({ error: "Investment amount and tenure are required." });
    }

    const investmentAmount = parseFloat(minInvestment);
    const investmentTenure = parseFloat(tenure);

    // Filter and score schemes
    const prefs = { preferredPayout };

    const eligibleSchemes = normalizedSchemes
        .filter((scheme) => {
            const amountOk = investmentAmount >= (scheme._minInvestment || 0) &&
                (scheme._maxInvestment === null || typeof scheme._maxInvestment === 'undefined' || investmentAmount <= scheme._maxInvestment);
            const { min: minY, max: maxY } = scheme._tenureRangeYears || { min: 0, max: 100 };
            const tenureOk = investmentTenure >= minY && investmentTenure <= maxY;
            return amountOk && tenureOk;
        })
        .map((scheme) => {
            const meta = bankMeta[scheme.provider_name] || {};
            return {
                ...scheme,
                provider_logo: meta.logo || null,
                provider_banner: meta.banner || null,
                official_url: meta.official_url || null,
                score: calculateSchemeScore(scheme, investmentAmount, investmentTenure, prefs)
            };
        });

    // Separate and sort by risk level and score
    const lowRiskSchemes = eligibleSchemes
        .filter((s) => s._riskIsLow)
        .sort((a, b) => b.score - a.score);

    const highRiskSchemes = eligibleSchemes
        .filter((s) => !s._riskIsLow)
        .sort((a, b) => b.score - a.score);

    // Randomly shuffle top schemes if they have similar scores
    function shuffleTopSchemes(schemes) {
        if (schemes.length <= 1) return schemes;
        
        const topScore = schemes[0].score;
        const similarScores = schemes.filter(s => Math.abs(s.score - topScore) <= 5);
        const remainingSchemes = schemes.filter(s => Math.abs(s.score - topScore) > 5);
        
        // Fisher-Yates shuffle for similar scored schemes
        for (let i = similarScores.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [similarScores[i], similarScores[j]] = [similarScores[j], similarScores[i]];
        }
        
        return [...similarScores, ...remainingSchemes];
    }

    // Return shuffled top schemes
    res.json({
        lowRisk: shuffleTopSchemes(lowRiskSchemes),
        highRisk: shuffleTopSchemes(highRiskSchemes)
    });
});

// Category-based listing
// Supported slugs and how they map to scheme fields:
// smart-investment -> sub_category includes 'Mutual', 'Equity', 'SIP' or category 'Monthly Investment'
// financial-planning -> broad: FDs, RDs, Govt schemes
// real-estate -> provider_name contains 'REIT' or sub_category includes 'REIT'
// retirement-plans -> category includes 'Senior' or plan_name/desc includes 'retire'
// education-funds -> plan_name/desc includes 'education' or 'child'
// business-growth -> plan_name/desc includes 'business' or 'corporate' or 'NPS Corporate'
router.get('/category/:slug', (req, res) => {
    const { slug } = req.params;

    function matchesSlug(s) {
        const name = (s.plan_name || '').toLowerCase();
        const desc = (s.description || '').toLowerCase();
        const cat = (s.category || '').toLowerCase();
        const sub = (s.sub_category || '').toLowerCase();
        const provider = (s.provider_name || '').toLowerCase();

        switch (slug) {
            case 'smart-investment':
                return sub.includes('mutual') || sub.includes('equity') || desc.includes('sip') || cat.includes('monthly investment');
            case 'financial-planning':
                return sub.includes('fixed deposit') || sub.includes('recurring') || cat.includes('government') || provider.includes('bank');
            case 'real-estate':
                return sub.includes('reit') || name.includes('reit') || desc.includes('real estate');
            case 'retirement-plans':
                return cat.includes('senior') || name.includes('retire') || desc.includes('retire');
            case 'education-funds':
                return name.includes('education') || desc.includes('education') || name.includes('child') || desc.includes('child');
            case 'business-growth':
                return name.includes('business') || desc.includes('business') || name.includes('corporate') || desc.includes('corporate');
            default:
                return false;
        }
    }

    function categoryScore(s) {
        const name = (s.plan_name || '').toLowerCase();
        const desc = (s.description || '').toLowerCase();
        const cat = (s.category || '').toLowerCase();
        const sub = (s.sub_category || '').toLowerCase();
        const providerType = s.provider_type || '';
        const risk = (s.risk_level || '').toLowerCase();
        const tenure = s._tenureRangeYears || { min: 0, max: 100 };
        const interest = s._interestRateMax || 0;

        let score = 0;

        if (slug === 'retirement-plans') {
            // Favor safety, steady payout, 5+ years
            if (providerType === 'Government') score += 25; else if (providerType.includes('Public')) score += 18;
            if (risk.includes('low')) score += 20; else if (risk.includes('very')) score += 22;
            const long = tenure.max >= 5 ? 1 : 0;
            score += long * 15;
            const payout = String(s.payout_frequency || '').toLowerCase();
            if (payout.includes('monthly') || payout.includes('quarter')) score += 15;
            score += Math.min(interest, 10); // cap interest influence
        } else if (slug === 'financial-planning') {
            // Balanced: FDs, RDs, Govt
            if (sub.includes('fixed') || sub.includes('recurring') || providerType === 'Government') score += 25;
            if (risk.includes('low')) score += 15;
            score += Math.min(interest, 12);
            const payout = String(s.payout_frequency || '').toLowerCase();
            if (payout.includes('quarter') || payout.includes('monthly')) score += 8;
        } else if (slug === 'smart-investment') {
            // Growth oriented: equity/MF/SIP, longer horizon, higher rates
            if (sub.includes('equity') || sub.includes('mutual')) score += 25;
            if (desc.includes('sip')) score += 10;
            if (tenure.max >= 3) score += 10; if (tenure.max >= 5) score += 15;
            score += Math.min(interest * 2, 30);
        } else if (slug === 'real-estate') {
            if (sub.includes('reit') || name.includes('reit')) score += 30;
            if (tenure.max >= 3) score += 10;
            score += Math.min(interest, 10);
        } else if (slug === 'education-funds') {
            if (name.includes('education') || desc.includes('education') || name.includes('child') || desc.includes('child')) score += 25;
            if (tenure.max >= 3) score += 10; if (tenure.max >= 5) score += 15;
            if (risk.includes('low')) score += 10;
        } else if (slug === 'business-growth') {
            if (name.includes('business') || desc.includes('business') || name.includes('corporate') || desc.includes('corporate')) score += 25;
            score += Math.min(interest * 1.5, 20);
        }

        // General preference: reasonable min investment
        const minInv = s._minInvestment || 0;
        if (minInv <= 5000) score += 8; else if (minInv <= 25000) score += 4;

        return Math.round(score);
    }

    const results = normalizedSchemes
        .filter(matchesSlug)
        .map((scheme) => {
            const meta = bankMeta[scheme.provider_name] || {};
            return {
                ...scheme,
                provider_logo: meta.logo || null,
                provider_banner: meta.banner || null,
                official_url: meta.official_url || null,
                category_score: categoryScore(scheme)
            };
        })
        .sort((a, b) => b.category_score - a.category_score);

    return res.json({ items: results, slug });
});

// Get a single scheme by plan_id, enriched with bank metadata
router.get('/:id', (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Missing scheme id' });

    // Find in normalized to reuse parsed helpers
    const found = normalizedSchemes.find(s => String(s.plan_id) === String(id));
    if (!found) return res.status(404).json({ error: 'Scheme not found' });

    const meta = bankMeta[found.provider_name] || {};
    return res.json({
        ...found,
        provider_logo: meta.logo || null,
        provider_banner: meta.banner || null,
        official_url: meta.official_url || null
    });
});

module.exports = router;

