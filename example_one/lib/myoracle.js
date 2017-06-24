var oracledb = require('oracledb');
var config = require("./config.js");
oracledb.outFormat = oracledb.OBJECT;
oracledb.autoCommit = true;

console.log("Oracle client library version number is " + oracledb.oracleClientVersion);

var obj = {};

obj.UN_CONNECT = 0;
obj.SYSTEM_ERROR = -1;
obj.OK = 1;
obj.state = obj.UN_CONNECT;
obj.POOL = null;

obj.db = oracledb;

var usingdbconnectcount = 0;

obj.init = function()
{
    oracledb.createPool (
    {
        user          : config.oracle.db_user,
        password      : config.oracle.db_password,
        connectString : config.oracle.db_connectString
    },
    function(err, pool)
    {
        if(err){
            console.log("db error !!! info:%s", err.message);
            obj.state = obj.SYSTEM_ERROR;
            return;
        }
        obj.POOL = pool;
        console.log("db pool init success!!!");
    });
}
// connection.execute(sql, param, callback);
// connection.execute(sql, param, callback);

function createcb(obj)
{
    return function(err, result)
    {
        if(err){
            obj.callbackOld(err, result);
            return;
        }
        if(null != result.rows && result.rows.length >0){
            
        }
    }
}

function createConObj(connection)
{
    var obj = {};
    obj.connection = connection;

    obj.createcb = function()
    {
        var objHere = this;
        
    }
    
    obj.execute = function(sql, param1, param2, param3)
    {
        if(null == param3){
            obj.callbackOld = param3;
            this.connection.execute(sql, param1, createcb(this));
        }
        else{
            obj.callbackOld = param2;
            this.connection.execute(sql, param1, param2, createcb(this));
        }
    }
    
    obj.release = function(cb)
    {
        this.connection.release(cb);
    }
    
    return obj;
}

obj.getConnection = function(actor, callback)
{
    if(obj.POOL == null)
    {
        callback(actor, {message:"pool not ready1"}, null);
        return;
    }
    obj.POOL.getConnection(function(err, connection){
        if(!err){
            usingdbconnectcount++;
            console.log("--------------------get one db connect count :" + usingdbconnectcount);
        }
        callback(actor, err, connection);
    });
}

obj.doRelease = function(connection)
{
    function callback(err){
        if (err) {
          console.error(err.message);
         // setTimeout(function(){
         //   connection.release(callback);
         // }, 1000);
        }
        else{
            usingdbconnectcount--;
            console.log("--------------------release one db connect count :" + usingdbconnectcount);
        }
    }
    connection.release(  callback   );
}

obj.close = function()
{
    if(null == obj.POOL)
    {
        return;
    }
    obj.POOL.close();
}

obj.init();

module.exports = obj;