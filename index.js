'use strict';

const resolve = require('./resolve');

module.exports = middleware;

function middleware(options) {

    return function(req, res, next) {

        try {
            const {viewsDir, extensions, viewExtension, base = ''} = options;

            const resolved = resolve(viewsDir, req.path, extensions);

            if (resolved instanceof Error) {

                return next(resolved);

            } else if (resolved) {

                if ('redirect' in resolved) {
                    // TODO: redirect based on origUrl
                    return res.redirect(base + resolved.redirect);
                }

                req.paramsOrder = [];
                resolved.params.forEach(([k, v]) => {
                    req.params[k] = v;
                    req.paramsOrder.push(k);
                });

                let handler;

                if (resolved.extensions[0] !== viewExtension) {
                    const method  = req.method.toLowerCase();
                    const module  = require(viewsDir + '/' + resolved.filePath);
                    handler = module && module[method];
                }

                if (resolved.extensions.includes(viewExtension)) {
                    const context = handler ? handler(req, res, next) : {};

                    return res.render(resolved.filePath, context);

                } else if (handler) {
                    const result = handler(req, res, next);

                    if (result && !result.then)
                        res.send(result);
                }
            }

            return next(); // 404

        } catch (err) {
            next(err);
        }
    }
}
