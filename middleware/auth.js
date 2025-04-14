// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    // Attach user object to request
    req.user = req.session.user;
    
    return next();
  }

  // If not authenticated, redirect to login
  req.flash('error_msg', 'you have to login first');
  res.redirect("/user/login");
};

module.exports = {
  isAuthenticated,
};
