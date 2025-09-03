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

