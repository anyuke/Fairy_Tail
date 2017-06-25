/**
 * @Author:      Adolf
 * @DateTime:    2016-08-25 16:20:08
 * @Description: 锟斤拷时锟窖筹拷锟斤拷5锟斤拷小时未支锟斤拷锟斤拷未锟缴癸拷锟侥讹拷锟斤拷取锟斤拷
 */

var express = require('express');
var wxaccess = require("../lib/wx_access_token.js");

const config = require("../lib/config.js");

var preUpdateTime = null
var preGetTokenTime = null;
const GET_INTERVAL = 7000000;

var result = {};
var timerHandle = null;

function onUpdate()
{
    var now = Date.now();
    if(null == preGetTokenTime || now - preGetTokenTime > GET_INTERVAL || 1 != result.status)
    {
        if(0 == result.status)
        {
            return;
        }
        
        if(null != result.errorcount)
        {
            if(result.errorcount > 100)
            {
                if(timerHandle)
                {
                    clearInterval(timerHandle);
                    timerHandle = null;
                }
                return;
            }
        }
        
        if(result.status == 2)
        {
            if(null == result.errorcount)
            {
                result.errorcount = 1;
            }
            else{
                result.errorcount = result.errorcount + 1;
            }
        }
        
        preGetTokenTime = now;
        wxaccess.refresh_access_token(config, result);
    }
}

timerHandle = setInterval(onUpdate, 3000);
onUpdate();