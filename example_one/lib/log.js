/**
 * @Author:      Liyunfei
 * @DateTime:    2017-06-24 11:02:59
 * @Api_Name:    logger 
 * @Description: 日志基础类 
 *               级别梯度 TRACE DEBUG INFO WARN ERROR FATAL
 */
 var Log = {
    log4js : require('log4js'),
    Create: function(name){
        var log = Log.log4js.getLogger(name);
        log.setLevel('DEBUG');
        return log
    }
 }

 module.exports = Log;