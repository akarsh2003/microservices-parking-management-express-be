module.exports = (requiredRole) => {
    return (req, res, next) => {
      if (req.user && req.user.role === requiredRole) {
        next();
      } else {
        return res.status(403).json({ message: 'Access denied: insufficient role' });
      }
    };
  };
  