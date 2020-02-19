const https = require('https');
const tutils = require('./tutils');
const path = require('path');


exports = module.exports = class Config {
    constructor(app_name, env, clabConfig, logger) {
        this.app_name = app_name;
        this.env = env;
        this.backup = clabConfig.backup || path.join(__dirname, '../test/config.backup');

        let options = clabConfig.options;
        this.options = options;

        if (options) {
            this.expire_interval = options.expire_interval || 5 * 60 * 1000;
        }

        this.logger = logger || console;
    }


    request() {
        if (this.expires && (Date.now() < new Date(this.expires).getTime())) {
            return this._getData()
        }

        let url = `https://www.fastmock.site/mock/f8ae790430dc591c963dbc210426388e/api/open/app/config`;
        
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                this.expires = Date.now() + this.expire_interval;
                let allChunk = '';
                res.setEncoding('utf-8');
                if (res.statusCode != 200) {
                    this.logger.error(`Config request failed statusCode: ${res.statusCode} statusMessage: ${res.statusMessage}`);
                    resolve(this._getData())
                    return;
                }
                res.on('data', (chunk) => {
                    allChunk += chunk;
                });
                res.on('end', ()=> {
                    try{
                        this.data = JSON.parse(allChunk);
                        resolve(this.data)
                        tutils.backup(this.backup, this.data, this.logger);
                    }catch(e) {
                        this.logger.error(`JSON parse failed, e: %s`, e.toString());
                        resolve(this._getData(true))
                    }
                })
            }).on('error', (e) => {
                this.logger.error(`config request failed, e: ${e}`);
                reject(this._getData())
            })
        })        
    }

    _getData(backup) {
        if (backup) {
            this.logger.warn('use data from local file backup');
            return this.data = tutils.syncRequire(this.backup, this.logger);
        }
        if (this.data) {
            this.logger.info('use data from memory');
            return this.data;
        }
    
        this.logger.warn('use data from local file backup');
        return this.data = tutils.syncRequire(this.backup, this.logger);
    }

    findScenarioByEntrance(entrance) {
        if (!this.data) return;
        if (!this.data.scenarios) return;
        for (let scenario of this.data.scenarios) {
            let entrances = scenario.entrance.split('@@');
            if (entrances.indexOf(entrance) != -1) {
                return scenario;
            }
        }
    }

    findDomainById(domain_id) {
        if (!this.data) return;
        if (!this.data.domains) return;
        for (let domain of this.data.domains) {
            if(domain.id == domain_id) {
                return domain;
            }
         }
    }

    findLayersByDomainId(domain_id) {
        const layers = [];
    if (!this.data) return layers;
    if (!this.data.layers) return layers;
    for (let layer of this.data.layers) {
        if (layer.domain_id == domain_id) {
            layers.push(layer);
        }
    }
    return layers;
    }

    findDivisionById(division_id) {
        if (!this.data) return;
    if (!this.data.divisions) return;
    for (let division of this.data.divisions) {
        if(division.id == division_id) {
            return division;
        }
    }
    }


findExperimentById(experiment_id) {
    if (!this.data) return;
    if (!this.data.experiments) return;
    for (let experiment of this.data.experiments) {
        if(experiment.id == experiment_id) {
            return experiment;
        }
    }
}

findDomainByBucket(layer_id, bucket) {
    const domains = this._findDomainsByLayerId(layer_id);
    for (let domain of domains) {
        if (this._checkBucketRange(domain.bucket_range, bucket)) {
            return domain;
        }
    }
}

findExperimentByBucket(layer_id, bucket) {
    const experiments = this._findExperimentsByLayerId(layer_id);
    for (let experiment of experiments) {
        if (this._checkBucketRange(experiment.bucket_range, bucket)) {
            return experiment;
        }
    }
}

_findDomainsByLayerId(layer_id) {
    const domains = [];
    if (!this.data) return domains;
    if (!this.data.domains) return domains;
    for (let domain of this.data.domains) {
        if (domain.layer_id == layer_id) {
            domains.push(domain);
        }
    }
    return domains;
}

    _findExperimentsByLayerId(layer_id) {
    const experiments = [];
    if (!this.data) return experiments;
    if (!this.data.experiments) return experiments;
    for (let experiment of this.data.experiments) {
        if (experiment.layer_id == layer_id) {
            experiments.push(experiment)
        }
    }
    return experiments;
}

    _checkBucketRange(bucket_ranges, bucket) {
    for (let bucket_range of bucket_ranges) {
        if (bucket >= bucket_range.start && bucket <= bucket_range.end) {
            return true;
        }
    }
    return false;
}
}