const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorResponse } = require('../utils/apiResponse');

const protect = async (req, res, next) => {
  let token;

  // JWT is sent in the Authorization header as: Bearer <token>
  const authHeader = req.headers.authorization || '';

  if (authHeader) {
    try {
      token = authHeader.replace(/^Bearer\s+/i, '').trim();

      // Handle accidental quotes or a pasted prefix in the token field.
      token = token.replace(/^"|"$/g, '');

      if (!token) {
        return errorResponse(res, 401, 'Not authorized, no token provided');
      }

      // Verify token and decode payload
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user to request object (exclude password)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return errorResponse(res, 401, 'User no longer exists');
      }

      if (!req.user.isActive) {
        return errorResponse(res, 401, 'Account has been deactivated');
      }

      next();
    } catch (error) {
      const detail =
        process.env.NODE_ENV === 'development' && error && error.name
          ? ` (${error.name}${error.message ? `: ${error.message}` : ''})`
          : '';

      return errorResponse(res, 401, `Not authorized, token failed${detail}`);
    }
  } else {
    return errorResponse(res, 401, 'Not authorized, no token provided');
  }
};

module.exports = { protect };