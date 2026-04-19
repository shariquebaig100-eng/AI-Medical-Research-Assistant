const express = require('express');
const router = express.Router();
const { retrieveResearch } = require('../services/researchService');

// Direct research endpoint (for testing)
router.post('/search', async (req, res) => {
  try {
    const { query, disease, intent, location } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    const results = await retrieveResearch({ query, disease, intent, location });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;