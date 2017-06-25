var express = require('express');
var router = express.Router();
var mydb = require("../lib/myoracle.js");
var db = require('oracledb');
var Log = require('../lib/log');
var log = Log.Create('INDEX');
var login_check = require('../lib/login_check');
var request = require("request");
var async = require('async');
var redis = require("redis");
var sha1 = require('sha1');
const config = require('../lib/config');

/* GET home page. */
router.get('/', login_check, function(req, res, next) {
    // 第一步：用户同意授权，获取code
    var appid = config.weixin.appID;
    var secret = config.weixin.appsecret;
    var redirect_url = "http://b927ev.natappfree.cc/auth";
    redirect_url = encodeURIComponent(redirect_url);
    var authurl =
        "https://open.weixin.qq.com/connect/oauth2/authorize?appid=" + appid + "&redirect_uri=" + redirect_url + "&response_type=" +
        "code&scope=snsapi_userinfo&state=STATE#wechat_redirect";
    res.redirect(authurl);
});

router.get('/auth', function(req, res, next) {
    // 第二步：通过code换取网页授权access_token
    var code = req.query.code;
    var state = req.query.state;

    if (null == code || code.length == 0) {
        // 用户不同意授权
        res.end("授权失败");
        return;
    }

    async.auto({
        'get_web_access_token': function(callback) {
            var url = "https://api.weixin.qq.com/sns/oauth2/access_token?appid=" + config.weixin.appID + "&secret=" + config.weixin.appsecret + "&code=" + code + "&grant_type=authorization_code";
            request.get({
                url: url
            }, function(err, response, body) {
                if (err) {
                    callback("weixin get web access_token error : " + err.message);
                    return;
                }
                var ret = JSON.parse(body);
                // log.info('get_web_access_token: \n', ret);
                if (ret.errcode) {
                    callback(ret.errmsg);
                    return;
                }
                callback(null, ret);
                return;
            });
        },
        'refresh_web_access_token': ['get_web_access_token', function(data, callback) {
            var url = "https://api.weixin.qq.com/sns/oauth2/refresh_token?appid=" + config.weixin.appID + "&grant_type=refresh_token&refresh_token=" + data['get_web_access_token'].refresh_token + "";
            request.get({
                url: url
            }, function(err, response, body) {
                if (err) {
                    callback("refresh_web_access_token error : " + err.message);
                    return;
                }
                var ret = JSON.parse(body);
                // log.info('refresh_web_access_token: \n', ret);
                if (ret.errcode) {
                    callback(ret.errmsg);
                    return;
                }
                callback(null, ret);
                return;
            });
        }],
        'get_user_info': ['refresh_web_access_token', function(data, callback) {
            // 第四步：拉取用户信息(需scope为 snsapi_userinfo)
            var url = "https://api.weixin.qq.com/sns/userinfo?access_token=" + data['refresh_web_access_token'].access_token + "&openid=" + data['refresh_web_access_token'].openid + "&lang=zh_CN";
            request.get({
                url: url
            }, function(err, response, body) {
                if (err) {
                    log.error("get user info error : %s", err.message);
                    return;
                }
                var user_info = JSON.parse(body);
                callback(null, user_info);
                return;
            });
        }]
    }, function(err, result) {
        if (err) {
            log.error(err);
            return;
        }
        var actor = {};
        actor.user_info = result['get_user_info'];

        mydb.getConnection(actor, function(actor, err, connection) {
            if (null != err || null == connection) {
                mydb.doRelease(connection);
                log.error("DB ERROR:" + err.message);
                res.json({
                    status: 200,
                    msg: '数据库错误'
                });
                return;
            }
            actor.sql =
                "INSERT INTO \"user\" VALUES " +
                "   (USER_SEQ.NEXTVAL, :OPENID, :NICKNAME, :SEX, " +
                "   :LANGUAGE, :CITY, :PROVINCE, :COUNTRY, :HEADIMGURL, :PRIVILEGE)";
            if (0 === actor.user_info.privilege.length) {
                actor.user_info.privilege = '';
            }
            actor.param = {
                OPENID: {
                    val: actor.user_info.openid,
                    type: db.STRING,
                    dir: db.BIND_IN
                },
                NICKNAME: {
                    val: actor.user_info.nickname,
                    type: db.STRING,
                    dir: db.BIND_IN
                },
                SEX: {
                    val: actor.user_info.sex,
                    type: db.NUMBER,
                    dir: db.BIND_IN
                },
                LANGUAGE: {
                    val: actor.user_info.language,
                    type: db.STRING,
                    dir: db.BIND_IN
                },
                CITY: {
                    val: actor.user_info.city,
                    type: db.STRING,
                    dir: db.BIND_IN
                },
                PROVINCE: {
                    val: actor.user_info.province,
                    type: db.STRING,
                    dir: db.BIND_IN
                },
                COUNTRY: {
                    val: actor.user_info.country,
                    type: db.STRING,
                    dir: db.BIND_IN
                },
                HEADIMGURL: {
                    val: actor.user_info.headimgurl,
                    type: db.STRING,
                    dir: db.BIND_IN
                },
                PRIVILEGE: {
                    val: actor.user_info.privilege,
                    type: db.STRING,
                    dir: db.BIND_IN
                }
            }
            log.info('sql:%s', actor.sql);
            log.info('param:%s', JSON.stringify(actor.param));
            connection.execute(actor.sql, actor.param, function(err, result) {
                mydb.doRelease(connection);
                if (err) {
                    log.error(err);
                    res.json({
                        status: 200,
                        msg: '查询出错'
                    });
                    return;
                }
                // 计算签名方法
                var calcSignature = function(ticket, noncestr, ts, url) {
                    var str = 'jsapi_ticket=' + ticket + '&noncestr=' + noncestr + '&timestamp=' + ts + '&url=' + url;
                    var sha = sha1(str);
                    return sha;
                }
                var noncestr = 'Wm3WZYTPz0wzccnW';
                var timestamp = 1414587457;
                var ticket = jsapi_ticket;
                var url = 'http://b927ev.natappfree.cc' + req.originalUrl;
                var signature = calcSignature(ticket, noncestr, timestamp, url);

                res.render('home', {
                    title: '首页', signature: signature, appId: config.weixin.appID
                });
                return;
            })
        });
    });
});

/* 登录 */
router.get('/login', function(req, res, next) {
    if (req.session && req.session.userId) {
        res.redirect('/');
        return;
    }
    res.render('login', {
        title: '登录页'
    });
    return;
});

router.post('/login', function(req, res, next) {
    var actor = {};
    actor.account = req.body.account;
    actor.password = req.body.password;
    mydb.getConnection(actor, function(actor, err, connection) {
        if (null != err || null == connection) {
            mydb.doRelease(connection);
            log.error("DB ERROR:" + err.message);
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
            NAME: {
                val: actor.account,
                type: db.STRING,
                dir: db.BIND_IN
            },
            PASSWORD: {
                val: actor.password,
                type: db.STRING,
                dir: db.BIND_IN
            }
        }
        log.info('sql:%s', actor.sql);
        log.info('param:%s', JSON.stringify(actor.param));
        connection.execute(actor.sql, actor.param, function(err, result) {
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

// 获取分享所需的参数
router.get('/share', function(req, res, next) {
    // noncestr
    var createNonceStr = function() {
        return Math.random().toString(36).substr(2, 15);
    };

    // timestamp
    var createTimeStamp = function() {
        return parseInt(new Date().getTime() / 1000) + '';
    };

    // 计算签名方法
    var calcSignature = function(ticket, noncestr, ts, url) {
        var str = 'jsapi_ticket=' + ticket + '&noncestr=' + noncestr + '&timestamp=' + ts + '&url=' + url;
        log.info('str:\n', str);
        var sha = sha1(str);
        return sha;
    }
    var noncestr = 'Wm3WZYTPz0wzccnW';
    var timestamp = 1414587457;
    var ticket = jsapi_ticket;
    var url = 'http://b927ev.natappfree.cc' + req.originalUrl;
    var signature = calcSignature(ticket, noncestr, timestamp, url);

    return;
});

module.exports = router;