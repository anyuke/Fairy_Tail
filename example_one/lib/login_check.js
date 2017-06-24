module.exports = function (req, res, next) {
    if (!req.session || !req.session.userId) {
        // res.json({
        //     status: 200,
        //     msg: '请先登录'
        // });
        res.redirect('login');
        return;
    }
    next();
}