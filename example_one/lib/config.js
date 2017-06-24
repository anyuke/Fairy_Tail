/**
 * 配置信息
 */
module.exports = 
{
    mysql: null,
    redis:{
        ip : '127.0.0.1',
        port : 6379,
        db : 1,
        password : null
    },
    oracle:{
        db_user: 'dev_ydm',
        db_password: 'dev_ydm',
        db_connectString: '192.168.0.21:1521/orcl'
    }
}