module.exports = function (req, res, next) {
    if (!req.session || !req.session.userId) {
        res.redirect('login');
        return;
    }
    next();
}