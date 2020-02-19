const Config = require('./config');
const Router = require("./router");
const log4js = require('log4js');

exports = module.exports = class Clb {
    constructor(app_name, env, clbConfig) {
        let logger = this.getLogger(clbConfig.options);
        let config = new Config(app_name, env, clbConfig, logger);
        this.router = new Router(config, logger);
        this.logger = logger;
        this.config = config;
    }

    getLogger(options) {
        if (this.logger) {
            return this.logger;
        }
        let logger;
        if (options && options.logfile) {
            log4js.configure({});
            log4js.loadAppender('dateFile');
            log4js.addAppender(log4js.appenders.deteFile(options.logfile), 'clb');
            logger = log4js.getLogger('clb');
            logger.level = 'debug';
        } else {
            logger = log4js.getLogger();
        }
    
        if (options && options.loglevel) {
            logger.setLevel(options.loglevel);
        }
    
        this.logger = logger || console;
        return this.logger;
    }

    getResultByEntrance(reqCtx, entrance) {
        return this.router.asyncRouteByEntrance(reqCtx, entrance);
    }

    getResultByBucket = function(bucket) {
        return this.router.asyncRouteByBucket(bucket);
    }
}