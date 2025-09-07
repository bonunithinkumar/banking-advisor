const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const router = express.Router();

// Helper function to query schemes data
function querySchemesData(query) {
    try {
        const schemesPath = path.join(__dirname, '../data/schemes.json');
        const schemesData = JSON.parse(fs.readFileSync(schemesPath, 'utf8'));
        
        const searchTerm = query.toLowerCase();
        
        // Search for relevant schemes
        const relevantSchemes = schemesData.filter(scheme => 
            scheme.plan_name.toLowerCase().includes(searchTerm) ||
            scheme.category.toLowerCase().includes(searchTerm) ||
            scheme.sub_category.toLowerCase().includes(searchTerm) ||
            scheme.provider_name.toLowerCase().includes(searchTerm) ||
            scheme.description.toLowerCase().includes(searchTerm)
        );
        
        return relevantSchemes.slice(0, 5); // Return top 5 matches
    } catch (error) {
        console.error('Error querying schemes data:', error);
        return [];
    }
}

// Helper function to detect if user is asking about specific plans
function isSpecificPlanQuery(query) {
    const planKeywords = [
        'fd', 'fixed deposit', 'rd', 'recurring deposit', 'mis', 'monthly income',
        'scss', 'senior citizen', 'ppf', 'sukanya', 'tax saving', 'section 80c',
        'sbi', 'hdfc', 'axis', 'icici', 'kotak', 'bank', 'scheme', 'plan'
    ];
    
    const queryLower = query.toLowerCase();
    return planKeywords.some(keyword => queryLower.includes(keyword));
}

router.post('/get-advice', async (req, res) => {
  try {
    const userQuery = (req.body && req.body.prompt) || '';
    if (!userQuery.trim()) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const systemPrompt = `
🎯 Role: You are the AI assistant for "Banking Advisor" - a comprehensive Indian banking and investment platform.

🏦 ABOUT THIS WEBSITE:
"Banking Advisor" is a modern web application that helps users discover, compare, and understand various banking and investment products available in India. The platform features:

• **Investment Plans**: Fixed Deposits (FDs), Recurring Deposits (RDs), Monthly Income Schemes (MIS)
• **Senior Citizen Schemes**: Specialized products with higher interest rates for seniors
• **Tax-Saving Options**: Section 80C eligible investments
• **Bank Comparison**: Compare rates and features across major Indian banks
• **AI-Powered Chat**: Interactive assistance for investment decisions
• **Calculator Tools**: Investment calculators and planning tools
• **Category Filtering**: Browse by investment type, tenure, risk level

📊 AVAILABLE DATA & FEATURES:
The platform has comprehensive data on:
• **1000+ Investment Schemes** from major Indian banks (SBI, HDFC, Axis, ICICI, Kotak, etc.)
• **Government Schemes** (SCSS, PPF, Sukanya Samriddhi, etc.)
• **Interest Rates** (current rates for different tenures)
• **Risk Levels** (Very Low, Low, Medium, High)
• **Tax Benefits** (Section 80C, tax-free interest, etc.)
• **Eligibility Criteria** (age, income, residency requirements)
• **Key Features** (premature withdrawal, loan against deposit, etc.)

🎨 RESPONSE STYLE:
• Use emojis, bullet points, and clear headings
• Be confident and helpful, never apologetic
• Reference specific plans, banks, and rates when relevant
• Use INR (₹) and Indian financial terminology
• Keep responses actionable and easy to scan

📋 WHEN USERS ASK ABOUT SPECIFIC PLANS:
• Reference the actual data from the platform
• Mention specific banks, interest rates, and features
• Compare similar options available on the platform
• Explain eligibility, tax benefits, and key features
• Suggest alternatives based on user's criteria

🚀 WEBSITE CAPABILITIES TO EXPLAIN:
• **Plan Discovery**: "Browse our 1000+ investment options"
• **Comparison Tools**: "Compare rates across banks"
• **AI Assistance**: "Get personalized recommendations"
• **Calculator**: "Calculate returns and plan investments"
• **Category Filtering**: "Find plans by type, tenure, or risk"

🛡️ IMPORTANT NOTES:
• Always mention this is educational guidance, not financial advice
• Encourage users to consult qualified advisors for major decisions
• Reference the platform's data and features when relevant
• Be specific about Indian banking products and regulations

📝 Signature disclaimer: Note: For education only, not financial advice.
    `.trim();

    // Check if user is asking about specific plans and get relevant data
    let dataContext = '';
    if (isSpecificPlanQuery(userQuery)) {
        const relevantSchemes = querySchemesData(userQuery);
        if (relevantSchemes.length > 0) {
            dataContext = `\n\n📊 RELEVANT PLANS FROM OUR DATABASE:\n`;
            relevantSchemes.forEach((scheme, index) => {
                dataContext += `${index + 1}. **${scheme.plan_name}** (${scheme.provider_name})\n`;
                dataContext += `   • Interest Rate: ${scheme.interest_rate}\n`;
                dataContext += `   • Tenure: ${scheme.tenure}\n`;
                dataContext += `   • Min Investment: ₹${scheme.min_investment?.toLocaleString() || 'N/A'}\n`;
                dataContext += `   • Risk Level: ${scheme.risk_level}\n`;
                dataContext += `   • Tax Benefits: ${scheme.tax_benefits || 'None'}\n\n`;
            });
        }
    }

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `${systemPrompt}\n\nUser Question: ${userQuery}${dataContext}`,
            },
          ],
        },
      ],
    };

    const response = await axios.post(apiUrl, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000,
    });

    const aiResponse =
      response?.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Sorry, I could not generate a response.';

    res.json({ message: aiResponse });
  } catch (error) {
    const errPayload = error?.response?.data || { message: error.message };
    console.error('Error calling Gemini API:', errPayload);
    res.status(500).json({ error: 'Failed to get a response from the AI advisor.' });
  }
});

module.exports = router;


