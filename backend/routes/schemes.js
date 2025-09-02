const express = require("express");
const router = express.Router();          // create a mini Express app just for schemes
const schemes = require("../data/schemes.json"); // import your dataset

// Route 1: Get ALL schemes
router.get("/", (req, res) => {
  res.json(schemes);                      // send entire JSON back
});

// Route 2: Filter schemes by query parameters
router.get("/filter", (req, res) => {
  const { category, minInvestment, tenure } = req.query;  // extract from URL
  let filtered = schemes;

  if (category) {
    filtered = filtered.filter(s => 
      s.category.toLowerCase() === category.toLowerCase()
    );
  }

  if (minInvestment) {
    filtered = filtered.filter(s => 
      s.min_investment <= parseInt(minInvestment)
    );
  }

  if (tenure) {
    filtered = filtered.filter(s => {
      if (!s.tenure) return false;
      return s.tenure.toString().includes(tenure);
    });
  }

  res.json(filtered);  // return results
});

module.exports = router;
