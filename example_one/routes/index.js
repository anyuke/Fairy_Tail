var express = require('express');
var router = express.Router();
var mydb = require("../lib/myoracle.js");
var db = require('oracledb');
var Log = require('../lib/log');
var log = Log.Create('INDEX');
var login_check = require('../lib/login_check');

/* GET home page. */
router.get('/', login_check, function (req, res, next) {
    var actor = {};
    mydb.getConnection(actor, function (actor, err, connection) {
        if (null != err || null == connection) {
            mydb.doRelease(connection);
            log.error("DB ERROR:"+err.message);
            res.json({
                status: 200,
                msg: '数据库错误'
            });
            return;
        }
        actor.sql =
            ' select * ' +
            '   from test_user ';
        log.info('sql:%s', actor.sql);
        connection.execute(actor.sql, [], function (err, result) {
            mydb.doRelease(connection);
            if (err) {
                log.error(err);
                res.json({
                    status: 200,
                    msg: '查询出错'
                });
            }
            log.info('reult.rows:', result.rows);
            res.render('index', { title: '首页', data: result.rows });
            return;
        })
    });
});

/* 登录 */
router.get('/login', function (req, res, next) {
    res.render('login', { title: '登录页' });
    return;
});

router.post('/login', function (req, res, next) {
    var actor = {};
    actor.account = req.body.account;
    actor.password = req.body.password;
    mydb.getConnection(actor, function (actor, err, connection) {
        if (null != err || null == connection) {
            mydb.doRelease(connection);
            log.error("DB ERROR:"+err.message);
            res.json({
                status: 200,
                msg: '数据库错误'
            });
            return;
        }
        actor.sql =
            " SELECT * " +
            "   FROM TEST_USER " +
            "   WHERE NAME = :NAME " +
            "       AND PASSWORD = :PASSWORD";
        actor.param = {
            NAME: {val: actor.account, type: db.STRING, dir: db.BIND_IN},
            PASSWORD: {val: actor.password, type: db.STRING, dir: db.BIND_IN}
        }
        log.info('sql:%s', actor.sql);
        log.info('param:%s', JSON.stringify(actor.param));
        connection.execute(actor.sql, actor.param, function (err, result) {
            mydb.doRelease(connection);
            if (err) {
                log.error(err);
                res.json({
                    status: 200,
                    msg: '查询出错'
                });
                return;
            }
            
            if (1 !== result.rows.length) {
                res.json({
                    status: 200,
                    userId: ''
                });
                return;
            }
            req.session.userId = result.rows[0].ID;
            res.json({
                status: 100,
                userId: result.rows[0].ID
            });
            return;
        })
    });
});

module.exports = router;
