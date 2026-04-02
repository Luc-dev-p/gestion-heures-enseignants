const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Route dashboard OK' });
});

module.exports = router;