const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Load schemes data
const schemesPath = path.join(__dirname, '../data/schemes.json');
const banksPath = path.join(__dirname, '../data/banks.json');

// Helper function to search schemes
function searchSchemes(query, schemes) {
    const searchTerm = query.toLowerCase();
    
    return schemes.filter(scheme => 
        scheme.plan_name.toLowerCase().includes(searchTerm) ||
        scheme.category.toLowerCase().includes(searchTerm) ||
        scheme.sub_category.toLowerCase().includes(searchTerm) ||
        scheme.provider_name.toLowerCase().includes(searchTerm) ||
        scheme.description.toLowerCase().includes(searchTerm) ||
        scheme.key_features.some(feature => feature.toLowerCase().includes(searchTerm))
    );
}

// Helper function to get schemes by category
function getSchemesByCategory(category, schemes) {
    return schemes.filter(scheme => 
        scheme.category.toLowerCase() === category.toLowerCase() ||
        scheme.sub_category.toLowerCase() === category.toLowerCase()
    );
}

// Helper function to get schemes by bank
function getSchemesByBank(bankName, schemes) {
    return schemes.filter(scheme => 
        scheme.provider_name.toLowerCase().includes(bankName.toLowerCase())
    );
}

// Helper function to get schemes by risk level
function getSchemesByRisk(riskLevel, schemes) {
    return schemes.filter(scheme => 
        scheme.risk_level.toLowerCase() === riskLevel.toLowerCase()
    );
}

// Helper function to get schemes by tenure range
function getSchemesByTenure(tenureQuery, schemes) {
    return schemes.filter(scheme => {
        const tenure = scheme.tenure.toLowerCase();
        if (tenureQuery.includes('short') || tenureQuery.includes('1 year') || tenureQuery.includes('1-2')) {
            return tenure.includes('1 year') || tenure.includes('2 year') || tenure.includes('short');
        }
        if (tenureQuery.includes('medium') || tenureQuery.includes('3-5')) {
            return tenure.includes('3 year') || tenure.includes('4 year') || tenure.includes('5 year');
        }
        if (tenureQuery.includes('long') || tenureQuery.includes('5+')) {
            return tenure.includes('5 year') || tenure.includes('10 year') || tenure.includes('long');
        }
        return false;
    });
}

// Main query endpoint
router.post('/query-data', async (req, res) => {
    try {
        const { query, queryType } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        // Load schemes data
        const schemesData = JSON.parse(fs.readFileSync(schemesPath, 'utf8'));
        const banksData = JSON.parse(fs.readFileSync(banksPath, 'utf8'));

        let results = [];

        switch (queryType) {
            case 'search':
                results = searchSchemes(query, schemesData);
                break;
            case 'category':
                results = getSchemesByCategory(query, schemesData);
                break;
            case 'bank':
                results = getSchemesByBank(query, schemesData);
                break;
            case 'risk':
                results = getSchemesByRisk(query, schemesData);
                break;
            case 'tenure':
                results = getSchemesByTenure(query, schemesData);
                break;
            case 'all':
            default:
                // Return overview of all data
                results = {
                    totalSchemes: schemesData.length,
                    categories: [...new Set(schemesData.map(s => s.category))],
                    banks: [...new Set(schemesData.map(s => s.provider_name))],
                    riskLevels: [...new Set(schemesData.map(s => s.risk_level))],
                    sampleSchemes: schemesData.slice(0, 5)
                };
                break;
        }

        // Limit results to prevent overwhelming responses
        if (Array.isArray(results) && results.length > 10) {
            results = results.slice(0, 10);
        }

        res.json({ 
            success: true, 
            query, 
            queryType, 
            results,
            totalFound: Array.isArray(results) ? results.length : 'overview'
        });

    } catch (error) {
        console.error('Error querying data:', error);
        res.status(500).json({ error: 'Failed to query data' });
    }
});

// Get specific scheme details
router.get('/scheme/:planId', async (req, res) => {
    try {
        const { planId } = req.params;
        
        const schemesData = JSON.parse(fs.readFileSync(schemesPath, 'utf8'));
        const scheme = schemesData.find(s => s.plan_id === planId);
        
        if (!scheme) {
            return res.status(404).json({ error: 'Scheme not found' });
        }
        
        res.json({ success: true, scheme });
        
    } catch (error) {
        console.error('Error getting scheme details:', error);
        res.status(500).json({ error: 'Failed to get scheme details' });
    }
});

// Get bank information
router.get('/bank/:bankName', async (req, res) => {
    try {
        const { bankName } = req.params;
        
        const banksData = JSON.parse(fs.readFileSync(banksPath, 'utf8'));
        const bank = banksData[bankName];
        
        if (!bank) {
            return res.status(404).json({ error: 'Bank not found' });
        }
        
        res.json({ success: true, bank: { name: bankName, ...bank } });
        
    } catch (error) {
        console.error('Error getting bank details:', error);
        res.status(500).json({ error: 'Failed to get bank details' });
    }
});

module.exports = router;
