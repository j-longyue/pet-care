const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      req.user = null;
      return next();
    }

    try {
      const freshUser = await userRepository.findById(decoded.id);
      req.user = freshUser || null;
    } catch (dbError) {
      console.error('optionalAuth: error fetching user:', dbError.message);
      req.user = null;
    }

    next();
  });
};

const requireAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token is required.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }

    try {
      const freshUser = await userRepository.findById(decoded.id);

      if (!freshUser) {
        return res.status(401).json({ error: 'User no longer exists.' });
      }

      req.user = freshUser;
      next();
    } catch (dbError) {
      console.error('requireAuth: error fetching user:', dbError.message);
      return res.status(500).json({ error: 'Internal server error during authentication.' });
    }
  });
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'adm') {
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }
  next();
};

module.exports = { optionalAuth, requireAuth, requireAdmin }; 