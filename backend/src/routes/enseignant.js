const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Route enseignants OK' });
});

module.exports = router;