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

                req.params$order = [];
                resolved.params.forEach(([k, v]) => {
                    req.params[k] = v;
                    req.params$order.push(k);
                });

                if (resolved.extensions[0] !== viewExtension) { // first match is a module (ie: not a template)

                    const method  = req.method.toLowerCase();
                    const module  = require(viewsDir + '/' + resolved.filePath);
                    const handler = module && (module[method] || module.use);

                    if (! handler) {
                        // module found but no handler for this method
                        return next(); // 404
                    }

                    const result = handler(req, res, next);

                    if (result && result.then) {
                        return result; // Pass the promise up the chain
                    
                    } else if (!result || result === res) {
                        return; // Assume the caller has called res.send()

                    } else if (resolved.extensions.includes(viewExtension)) {
                        // Handler returned an object for us to send to their matching template
                        return res.render(resolved.filePath, result);
                    } else {
                        // Just send the object/string directly to the browser
                        return res.send(result);
                    }

                } else { // just render the view without handler data
                    // There was no handler, and we're just rendering the template as is.
                    return res.render(resolved.filePath, result || {});
                }

                // else we didn't find a handler ... 404
            }

            return next(); // 404

        } catch (err) {
            return next(err); // Pass exception up to express
        }
    }
}
