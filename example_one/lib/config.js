/**
 * 配置信息
 */
module.exports = {
    mysql: null,
    redis: {
        ip: '127.0.0.1',
        port: 6379,
        db: 1,
        // password: 'LYF' 
        password: ''
    },
    oracle: {
        db_user: 'dev_ydm',
        db_password: 'dev_ydm',
        db_connectString: '192.168.0.21:1521/orcl'
    },
    weixin: {
        appID: 'wx3bb0aded1c8a247e',
        appsecret: 'd4624c36b6795d1d99dcf0547af5443d',
        token: 'weixin'
    },
    proxy_url: 'http://sug4mi.natappfree.cc'
}