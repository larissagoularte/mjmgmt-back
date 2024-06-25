const express = require('express');
const { isAuthenticated } = require('../middlewares/auth');
const router = express.Router();

router.get('/protected-route', isAuthenticated, (req, res) => {
    res.status(200).send('Access granted to protected route');
});

module.exports = router;
