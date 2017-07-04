/*
* @Author: Liyunfei
* @Date:   2017-07-4 10:47:16
* @Describe: 网易云短信服务
*/
'use strict';

var obj = {};
var needle = require('needle');
var crypto = require("crypto");
var http = require('http');

const APPKEY = "00649a2764264d0655e9d02a784563f5";
const APPSECRET = "42d20377ec4a";
const url = 'https://api.netease.im/sms/sendtemplate.action';

function generateNonceString(length){
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var maxPos = chars.length;
    var noceStr = "";
    for (var i = 0; i < (length || 32); i++) {
        noceStr += chars.charAt(Math.floor(Math.random() * maxPos));
    }
    return noceStr;
};
function getCheckSum(AppSecret ,Nonce ,CurTime){
    var stringA = AppSecret + Nonce + CurTime;
    var shasum = crypto.createHash('sha1');
    shasum.update(stringA);
    return shasum.digest('hex');
};

function send(templateid, phoneArray, params, callback){//第一个参数是所有电话列表
    var phones = [];
    if(typeof(phoneArray)==='object'){
        phones = phoneArray;
    }
    if(typeof(phoneArray)==='string'){
        phones = [phoneArray];
    }
    var CurTime = Date.now().toString();
    var Nonce = generateNonceString(32);
    var CheckSum = getCheckSum(APPSECRET ,Nonce ,CurTime);
    var formData = {
        // templateid: templateid,
        mobiles: JSON.stringify(phones)
        // params: JSON.stringify(params)
    };
    var headers = {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'AppKey':APPKEY,
        'CurTime':CurTime,
        'CheckSum':CheckSum,
        'Nonce':Nonce       
    }
    console.log('formData:', formData);
    console.log('headers:', headers);
    needle.post(url, formData, {headers: headers}, function(err, response, body){
        if(err){
            callback(err, body);
            return;
        }
        if(body.code !== 200){
            console.error('body:',body);
            callback({message: body.msg}, body);
            return;
        }
        callback(err, JSON.stringify(body));
    });
}

http.createServer(function (req, res) {
    send(3051583, '13712907379', ['12345'], function (err, result) {
        if (err) {
            console.error(err);
            res.end(err);
            return;
        }
        res.end(result);
        return;
    });
}).listen(5000);