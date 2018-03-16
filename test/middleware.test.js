'use strict';

const should       = require('should');
const routeHandler = require('../');

const scenarios = [
    { ins: ['GET', '/dir1/dir2'],               exp: ['redirect', ['/dir1/dir2/'], []] },
    { ins: ['GET', '/dir1/dir2/index'],         exp: ['redirect', ['/dir1/dir2/'], []] },
    { ins: ['GET', '/index'],                   exp: ['redirect', ['/'], []] },
    { ins: ['GET', 'no-match'],                 exp: ['send', ['get:/index.js'], [['index', 'no-match']]], },
    { ins: ['GET', '/no-match'],                exp: ['send', ['get:/index.js'], [['index', 'no-match']]], },
    { ins: ['GET', ''],                         exp: ['send', ['get:/index.js'], []], },
    { ins: ['GET', '/'],                        exp: ['send', ['get:/index.js'], []], },
    { ins: ['GET', '/dir1/dir2/'],              exp: ['send', ['get:/dir1/dir2/index.js'], []], },
    { ins: ['GET', '/dir1/dir2/file3'],         exp: ['send', ['get:/dir1/dir2/file3.js'], []], },
    { ins: ['GET', '/dir1/dir2/file3/arg1'],    exp: ['send', ['get:/dir1/dir2/file3.js'], [['file3', 'arg1']]], },
    { ins: ['GET', '/arg1'],                    exp: ['send', ['get:/index.js'],           [['index', 'arg1']]], },
    { ins: ['GET', '/dir1/dir2/arg1'],          exp: ['send', ['get:/dir1/dir2/index.js'], [['dir2', 'arg1']]] },
    { ins: ['GET', '/dir1/file4'],              exp: ['render', ['dir1/file4', {from: 'get:/dir1/file4.js'}], []] },
    {
        ins: ['GET', '/dir1/arg1/dir2/arg2/file3/arg3'],
        exp: [
            'send', ['get:/dir1/dir2/file3.js'], [
                ['dir1', 'arg1'],
                ['dir2', 'arg2'],
                ['file3', 'arg3'],
            ],
        ],
    },
    {
        ins: ['GET',       '/dir1/arg1/dir2/arg2/index/arg3'],
        exp: ['redirect', ['/dir1/arg1/dir2/arg2/arg3'], []],
    },
    {
        ins: ['GET', '/dir1/arg1/dir2/arg2/arg3'],
        exp: [
            'send', ['get:/dir1/dir2/index.js'], [
                ['dir1', 'arg1'],
                ['dir2', 'arg2'],
                ['index', 'arg3'],
            ]],
    },
    {
        ins: ['GET', '/dir1/arg1/dir2/arg2'],
        exp: [
            'send', ['get:/dir1/dir2/index.js'], [
                ['dir1', 'arg1'],
                ['dir2', 'arg2'],
            ],
        ],
    },
];


describe('middleware', () => {

    const middleware = routeHandler({
        viewsDir:   __dirname + '/../test_fixtures/webroot',
        extensions: ['js', 'hbs'],
        viewExtension: 'hbs'
    });

    scenarios.forEach(({ins, exp}) => {
        const [method, path]                   = ins;
        const [via, calledWith, orderedParams] = exp;

        // const keyList = orderedParams.map(([k]) => k);
        const params  = {};
        orderedParams.forEach(([k, v]) => (params[k] = v));

        const titleCall = `${method} ${path}`.padEnd(40, ' ');
        const titleExpect = `${via} ${calledWith[0]}`;


        it(`${titleCall} => ${titleExpect}`, () => {

            const req = {method, path, params: {}};

            return new Promise((resolve) => {
                const rv = (v) => (...args) => {
                    return resolve({via: v, args});
                };

                try {
                    const res = {
                        send:     rv('send'),
                        render:   rv('render'),
                        redirect: rv('redirect'),
                    };

                    middleware(req, res, rv('next'));
                } catch (err) {
                    rv('throw')(err);
                }
            })
                .catch(err => ({via: 'catch', args: [err]}))
                .then(result => {
                    if (result.via === 'next' && result.args.length) {
                        console.log(result.args[0]); // display the exception/error
                    }
                    should(result).deepEqual({via, args: calledWith});
                    should(req.params).deepEqual(params);
                    // should(req.keyList).deepEqual(keyList);
                });
        });
    });
});
