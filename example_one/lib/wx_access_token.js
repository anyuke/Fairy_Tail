/**
 * @Author:      liyunfei
 * @DateTime:    2017-06-25 10:58:54
 * @Api_Name:    wx_access_token
 * @Api_Params:
 * @Description: 获取微信access_token 注：需要全局保存
 */
var request = require("request");
var Log = require('./log.js');
var log = Log.Create('WX_ACCESS_TOKEN');
var redis = require("redis");
const config = require('./config');
global.access_token = '';
global.jsapi_ticket = '';
global.expires_in = 7000000;//预留一点时间微信侧老化时间为7200s
global.WX_ACCESS_TOKEN_KEY = "WX_ACCESS_TOKEN";
global.WX_JSAPI_TICKET_KEY = "WX_JSAPI_TICKET";
var REDIS_OPT = {};

REDIS_OPT.host = config.redis.ip;
REDIS_OPT.port = config.redis.port;
REDIS_OPT.db = config.redis.db;

if (null != config.redis.password) {
    REDIS_OPT.password = config.redis.password;
}

var redis_client = redis.createClient(REDIS_OPT);
redis_client.on("error", function (err) {
    log.error("Error: "+err.stack);
});

exports.refresh_access_token = function(config, actor){
    var appid = config.weixin.appID;
    var secret = config.weixin.appsecret;
    log.info("appid:" + appid);
    log.info("secret:" + secret);
    actor.status = 0;   // 0 正在获取 1 获取成功 2 获取失败
    var URL = "https://api.weixin.qq.com/cgi-bin/token";
    request.post({
        url: URL,
        form: {
            grant_type : 'client_credential',
            appid : appid,
            secret : secret
        }
    }, function (err, response, body) {
        if(err) {
            actor.status = 2;
            log.error("weixin request error : %s", err.message);
            return;
        }
        var ret = JSON.parse(body);
        if(ret.errcode != null){
            actor.status = 2;
            log.error("weixin api error : %s", ret.errmsg);
            return;
        }
        access_token = ret.access_token;
        log.info("Weixin access_token refreshed, new access_token:"+access_token);
        //expires_in = ret.expires_in*1000;
        log.info("expires time:"+expires_in);
        //同时更新所有使用到改token的ticket
        exports.refresh_jsapi_ticket(actor);
    });
}

exports.get_access_token = function (cb) {
    redis_client.get(WX_ACCESS_TOKEN_KEY, cb);
}

exports.get_jsapi_ticket = function (cb) {
    redis_client.get(WX_JSAPI_TICKET_KEY, cb);
}

exports.refresh_jsapi_ticket = function(actor){
    var URL = "https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=ACCESS_TOKEN&type=jsapi";
    request.post({
        url: URL,
        form: {
            access_token : access_token,
            type : 'jsapi'
        }
    }, function (err, response, body) {
        var ret = JSON.parse(body);
        if(err) {
            actor.status = 2;
            log.error("weixin request error : %s", err.message);
            return;
        }
        if(ret.errcode != 0){
            actor.status = 2;
            log.error("weixin api error : %s", ret.errmsg);
            return;
        }
        jsapi_ticket = ret.ticket;
        actor.status = 1;
        log.info("JSPAI refresh ticket success,new ticket:"+jsapi_ticket);
        //expires_in = ret.expires_in*1000;
        log.info("expires time:" + expires_in);

        redis_client.set(WX_ACCESS_TOKEN_KEY, access_token,function(err,reply){
            redis_client.expire(WX_ACCESS_TOKEN_KEY, 36000);
        });
        redis_client.set(WX_JSAPI_TICKET_KEY, jsapi_ticket,function(err, reply){
            redis_client.expire(WX_JSAPI_TICKET_KEY, 36000);
        });
    });
}
// exports.testrefresh = function(){
//  test++;
//  expires_in = ((expires_in/1000)+1)*1000;
//  console.log("refresh success test:"+test+"\n interval:"+expires_in);

// }
// exports.expires_in = expires_in;
// //exports.test = test;
// exports.access_token = access_token;
// exports.jsapi_ticket = jsapi_ticket;