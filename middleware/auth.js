// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }

  // If not authenticated, redirect to login
  res.redirect("/user/login");
};

module.exports = {
  isAuthenticated,
};
