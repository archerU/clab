const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

module.exports = {
    backup: function(filePath, data, logger) {
        try {
            let dirPath = path.dirname(filePath);
            let dirStat = fs.lstatSync(dirPath);
            if (!dirStat.isDirectory()) {
                mkdirp.sync(dirPath);
                return;
            }
            let fd = fs.openSync(filePath, 'w');
            fs.ftruncateSync(fd);
            fs.writeSync(fd, JSON.stringify(data, null, 2));
            fs.closeSync(fd);
        }catch(e) {
            logger.error(e)
        }
    },
    syncRequire: function(filePath, logger) {
        let str;
        try {
            str = fs.readFileSync(filePath, {
                encoding: 'utf-8'
            })
            str = str.trim();
            str = str.replace(/(?:\n|\r)+/g, '')
        }catch(e) {
            logger.warn(e.message)
        }

        if (!str) {
            return null;
        }

        try{
            let rst = JSON.parse(str);
            return rst;
        }catch(e) {
            logger.error(e)
        }
    }
}