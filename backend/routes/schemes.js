const express = require("express");
const router = express.Router();
const schemes = require("../data/schemes.json");

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

// Calculate scheme score based on various factors
function calculateSchemeScore(scheme, investmentAmount, investmentTenure) {
    let score = 0;

    // Interest rate score (0-40 points)
    const interestRate = parseInterestRate(scheme.interest_rate);
    score += (interestRate / 40) * 40; // Normalize to 40 points max

    // Investment amount match score (0-20 points)
    const minInvestmentRatio = scheme.min_investment / investmentAmount;
    if (minInvestmentRatio <= 1) {
        score += 20 * (1 - minInvestmentRatio); // Better score for amounts well above minimum
    }

    // Tenure match score (0-20 points)
    const tenureRange = parseTenure(scheme.tenure);
    if (investmentTenure >= tenureRange.min && investmentTenure <= tenureRange.max) {
        const tenureMatchRatio = 1 - Math.abs(((tenureRange.min + tenureRange.max) / 2) - investmentTenure) / investmentTenure;
        score += 20 * tenureMatchRatio;
    }

    // Provider type score (0-10 points)
    if (scheme.provider_type === 'Government') score += 10;
    else if (scheme.provider_type === 'Public Sector Bank') score += 8;
    else if (scheme.provider_type === 'Private Sector Bank') score += 6;
    else score += 5;

    // Investment frequency score (0-10 points)
    if (scheme.investment_frequency === 'Lump Sum') score += 10;
    else if (scheme.investment_frequency === 'Monthly (SIP)') score += 8;
    else score += 5;

    return score;
}

// Route for filtered and scored schemes
router.get("/filter", (req, res) => {
    const { minInvestment, tenure } = req.query;

    if (!minInvestment || !tenure) {
        return res.status(400).json({ error: "Investment amount and tenure are required." });
    }

    const investmentAmount = parseFloat(minInvestment);
    const investmentTenure = parseFloat(tenure);

    // Filter and score schemes
    const eligibleSchemes = schemes
        .filter(scheme => {
            const isAmountOk = investmentAmount >= scheme.min_investment &&
                             (scheme.max_investment === null || investmentAmount <= scheme.max_investment);
            const tenureRange = parseTenure(scheme.tenure);
            const isTenureOk = investmentTenure >= tenureRange.min && investmentTenure <= tenureRange.max;
            return isAmountOk && isTenureOk;
        })
        .map(scheme => ({
            ...scheme,
            score: calculateSchemeScore(scheme, investmentAmount, investmentTenure)
        }));

    // Separate and sort by risk level and score
    const lowRiskSchemes = eligibleSchemes
        .filter(s => s.risk_level.toLowerCase().includes('low'))
        .sort((a, b) => b.score - a.score);

    const highRiskSchemes = eligibleSchemes
        .filter(s => !s.risk_level.toLowerCase().includes('low'))
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

module.exports = router;

