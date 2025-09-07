const express = require('express');
const OpenAI = require('openai');
require('dotenv').config();

const router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Banking-specific system prompt
const BANKING_SYSTEM_PROMPT = `You are a professional banking and investment advisor AI assistant. Your role is to:

1. Provide accurate, helpful advice about banking products, investment schemes, and financial planning
2. Help users understand complex financial concepts in simple terms
3. Suggest appropriate investment options based on user's risk profile and goals
4. Explain banking products like fixed deposits, mutual funds, SIPs, etc.
5. Provide general financial guidance while always recommending users consult with qualified financial advisors for major decisions

Guidelines:
- Always be helpful, accurate, and professional
- If you don't know something, say so rather than guessing
- Encourage users to do their own research and consult professionals
- Focus on educational content rather than giving specific investment advice
- Be encouraging and supportive of users' financial goals

Current context: This is a banking advisor website that helps users find investment schemes and banking products.`;

// Chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: BANKING_SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // or 'gpt-4' for better results
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0].message.content;

    res.json({
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('OpenAI Chat Error:', error);
    
    if (error.code === 'insufficient_quota') {
      return res.status(402).json({ 
        error: 'API quota exceeded. Please check your OpenAI account.' 
      });
    }
    
    if (error.code === 'invalid_api_key') {
      return res.status(401).json({ 
        error: 'Invalid API key. Please check your OpenAI API key.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Sorry, I encountered an error. Please try again.' 
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'OpenAI Chat',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;