const Clab = require('./lib/clab');

const clab = new Clab('union_merger_test', 0, {
    options: {
        expire_interval: 5 * 60 *1000,
        thinbucket: true
    }
    });


clab.getResultByEntrance({
    acookie: '',
    nickname: '',
    ip: '',
    pid: '',
    },
    'union'
).then(result => {
    console.log('result',result)
    clab.getResultByBucket(result.bucket).then(data => {
        console.log("data", data)
    })
})