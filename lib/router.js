const crypto = require('crypto');

exports = module.exports = class Router {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger || console;
    }

    async asyncRouteByEntrance(reqCtx, entrance) {
        try {
            const data = await this.config.request()
            return this._routeByEntrance(reqCtx, entrance);
        } catch (error) {
            
        }
        
    }

    _routeByEntrance(reqCtx, entrance) {
        const ret = this._walkApp(reqCtx, entrance);
        if (!this.config.options.hasOwnProperty('thinbucket') || this.config.options.thinbucket !== false) {
            ret.bucket = this._thinBucket(ret.bucket);
        }
        this.logger.info(`route by entrance, bucket: %s ${ret.bucket}`);
        return ret;
    }
    
    async asyncRouteByBucket(bucket) {
        if (!this._isBucketValid(bucket)) {
            return new Error(`invaild bucket：${bucket}`)
        }
        await this.config.request();
        return this._routeByBucket(bucket);
    };
    
    _isBucketValid(bucket) {
        if (!bucket || bucket.length == 0) {
            this.logger.error('invalid bucket, bucket can not be empty.');
            return false;
        }
        if (!bucket.startsWith('_Mi')) {
            this.logger.error('invalid bucket, bucket must start with _Mi.');
            return false;
        }
        let splitedArray = bucket.split('-');
        if (splitedArray.length == 1) {
            this.logger.info('invalid bucket, bucket must have experiment id or request path has no experiment.');
            return false;
        }
        for (let i=1; i<splitedArray.length; i++) {
            if (!(/^[DLE]?[0-9]+$/g.test(splitedArray[i]))) {
                this.logger.error(`invalid bucket, %s, ${splitedArray[i]}`);
                return false;
            }
        }
        return true;
    }
    
    _routeByBucket(bucket) {
        const ret = {};
        ret.bucket = bucket;
        const experiments = this._extractExperiments(bucket);
        for (let experiment of experiments) {
            const exp = this.config.findExperimentById(experiment.id);
            if (!exp) continue;
            this._addExperimentParams(ret, exp);
        } 
        this.logger.info(`route bu bucket, bucket: %s`, ret.bucket);
        return ret;
    }
    
    _extractExperiments(bucket){
        const experiments = [];
        if (!this._isBucketValid(bucket)) return experiments;
        const experimentRegExp = /-E?(\d+)/g;
        let regRets;
        while((regRets = experimentRegExp.exec(bucket)) !== null) {
            experiments.push({
                id: regRets[1]
            });
        }
        return experiments;
    }
    
    
    
    _walkApp(reqCtx, entrance) {
        const scenario = this.config.findScenarioByEntrance(entrance);
        return this._walkScenario(reqCtx, scenario);
    }
    
    _walkScenario(reqCtx, scenario) {
        let outRet = {};
        outRet.bucket = '_Mi';
        if (!reqCtx || !scenario) return outRet;
        const rootDomain = this.config.findDomainById(scenario.root_domain_id);
        outRet = this._walkDomain(outRet, reqCtx, rootDomain);
        return outRet;
    }
    
    _walkDomain(outRet, reqCtx, domain) {
        if (!outRet.bucket) outRet.bucket = '';
        outRet.bucket = `${outRet.bucket}-D${domain.id}`;
        const layersInDomain = this.config.findLayersByDomainId(domain.id);
        for (let layer of layersInDomain) {
            if (!this._meetFiltrationConditions(reqCtx, layer.filter)) continue;
            this._walkLayer(outRet, reqCtx, layer);
        }
        return outRet;
    }
    
    _walkLayer(outRet, reqCtx, layer) {
        if (!outRet.bucket) outRet.bucket = '';
        outRet.bucket = `${outRet.bucket}-L${layer.id}`;
        let divisionOfLayer = this.config.findDivisionById(layer.division_id);

        let bucket = this._divideRoute(divisionOfLayer, layer.id, reqCtx);
        const domain = this.config.findDomainByBucket(layer.id, bucket);
        if (domain !== undefined) {
            this._walkDomain(outRet, reqCtx, domain);
            return;
        }
        const experiment = this.config.findExperimentByBucket(layer.id, bucket);
        
        if (experiment !== undefined) {
            this._walkExperiment(outRet, reqCtx, experiment);
        }
    }
    
    _walkExperiment(outRet, reqCtx, experiment) {
        if (!outRet.bucket) outRet.bucket = '';
        outRet.bucket = `${outRet.bucket}-E${experiment.id}`;
        this._addExperimentParams(outRet, experiment);
    }
    
    _meetFiltrationConditions(reqCtx, filter) {
        filter = (filter ||'').trim();
        if (!filter) return true;
        filter = filter.replace(/={1,3}/gi, '==').replace(/!={1,3}/gi, '!=')
    
        const script = `with(${JSON.stringify(reqCtx)}){${filter};}`;
    
        let ret = true;
        try{
            ret = eval.call(null, script);
        }catch(e) {
            ret = false;
        }
    
        return !!ret;
    }
    
    _addExperimentParams(outRet, experiment) {
        for(let param of experiment.params) {
            outRet[param.name] = param.value;
        }
    }
    
    // 分桶算法
    _divideRoute(division, discreateFactor, reqCtx) {
        if (!reqCtx[division.name]) {
            this.logger.error(`missing %s in %j, use ip instend, ${division.name}, ${reqCtx}`)
        }
        const routeParam = reqCtx[division.name] || reqCtx.ip || '';
        let rsasum = crypto.createHash('RSA-MD5'); 
        rsasum.update(routeParam + discreateFactor);
        const numberForHash = this._JSHash(rsasum.digest('hex'));
        return 1 + Math.abs(numberForHash) % division.num_buckets;
    }
    
    // 分桶算法
    _JSHash(input) {
        let hash = 1315423911;
        for (let i =0,length = input.length;i<length;i++) {
            let c = input.charCodeAt(i);
            hash ^= ((hash << 5 ) + c + (hash >> 2));
        }
        return (hash & 0x7FFFFFFF);
    }
    
    _thinBucket(bucket) {
        let thinBucket = '_Mi';
        let experiments = this._extractExperiments(bucket);
        for (let experiment of experiments) {
            thinBucket += '-' + experiment.id;
        }
        return thinBucket;
    }
}