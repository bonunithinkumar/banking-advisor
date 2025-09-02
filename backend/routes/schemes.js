const express = require("express");
const router = express.Router();
const schemes = require("../data/schemes.json");

// --- Helper Functions for Intelligent Parsing ---

/**
 * Extracts a numerical interest rate from a string for sorting.
 * @param {string} rateStr - The interest rate string (e.g., "8.2% p.a.", "~33.66%")
 * @returns {number} - The parsed numerical rate, or 0 if not found.
 */
function parseInterestRate(rateStr) {
    if (!rateStr) return 0;
    // Find the last number in the string, which is usually the most relevant rate.
    const matches = rateStr.match(/(\d+(\.\d+)?)/g);
    if (matches) {
        return parseFloat(matches[matches.length - 1]);
    }
    return 0;
}

/**
 * Parses various tenure strings into a min/max year range.
 * @param {string} tenureStr - The tenure string (e.g., "5 Years", "7 Days to 10 Years", "115 Months")
 * @returns {{min: number, max: number}} - An object with min and max tenure in years.
 */
function parseTenure(tenureStr) {
    if (!tenureStr) return { min: 0, max: 100 }; // Default for unknown tenure

    const str = tenureStr.toLowerCase();
    let min = 0, max = 100; // Default max is high to include long-term plans

    // Case 1: Range like "5-10 years" or "7 days to 10 years"
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

    // Case 2: Single value like "5 years", "115 months", "7+ years"
    const singleMatch = str.match(/(\d+(\.\d+)?)/);
    if (singleMatch) {
        const num = parseFloat(singleMatch[0]);
        if (str.includes('month')) {
            min = max = num / 12;
        } else { // Assumes years
            min = num;
            // If it's a minimum like "7+ years" or "lock-in until...", keep max high
            max = str.includes('+') || str.includes('until') ? 100 : num;
        }
        return { min, max };
    }

    return { min: 0, max: 100 }; // Fallback
}

// --- API Routes ---

// Route 1: Get ALL schemes (remains the same)
router.get("/", (req, res) => {
    res.json(schemes);
});

// Route 2: The new "Best Schemes" filter
router.get("/filter", (req, res) => {
    const { minInvestment, tenure } = req.query;

    if (!minInvestment || !tenure) {
        return res.status(400).json({ error: "Investment amount and tenure are required." });
    }

    const investmentAmount = parseInt(minInvestment);
    const investmentTenure = parseInt(tenure);

    // 1. Filter schemes based on user's criteria
    const eligibleSchemes = schemes.filter(scheme => {
        // Amount check
        const isAmountOk = investmentAmount >= scheme.min_investment &&
                         (scheme.max_investment === null || investmentAmount <= scheme.max_investment);
        if (!isAmountOk) return false;

        // Tenure check
        const schemeTenureRange = parseTenure(scheme.tenure);
        const isTenureOk = investmentTenure >= schemeTenureRange.min && investmentTenure <= schemeTenureRange.max;
        
        return isAmountOk && isTenureOk;
    });

    // 2. Categorize and sort the filtered schemes
    const lowRiskSchemes = eligibleSchemes
        .filter(s => s.risk_level.toLowerCase().includes('low'))
        .sort((a, b) => parseInterestRate(b.interest_rate) - parseInterestRate(a.interest_rate));

    const highRiskSchemes = eligibleSchemes
        .filter(s => !s.risk_level.toLowerCase().includes('low'))
        .sort((a, b) => parseInterestRate(b.interest_rate) - parseInterestRate(a.interest_rate));

    // 3. Return the structured result
    res.json({
        lowRisk: lowRiskSchemes,
        highRisk: highRiskSchemes
    });
});

module.exports = router;

