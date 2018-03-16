# express-dry-lazy-handlers-dir

Automatically load and execute route handler modules based on filesystem location.

```js
var express = require('express');
var edlhd   = require('express-dry-lazy-handlers-dir');

var app     = express();

app.use(edlhd({
    viewsDir:   __dirname + '/webroot',
    extensions: ['js']
}));

app.listen(3000, () => console.log('Example app listening on port 3000!'))
```


## Design Goals

* Automatically call route handlers.
* Redirect to `/` if the requested resource is a folder (but request is missing trailing slash)
* Still provide access to object ID's via req.params.

## Usage with Templates

Automaticly pass context data to matching template files.

E.G.  Given the following setup

```js
var express = require('express');
var exphbs  = require('express-handlebars');
var edlhd   = require('express-dry-lazy-handlers-dir');
var app     = express();

// BEGIN -- standard express-handlebars initialisation --

app.engine('.hbs', exphbs({             // 4a Tell handlbars to treat .hbs files has handlbar files
    extname:       '.hbs'               // 4b Also required (must match extention including leading dot) 
    layoutsDir:    'views/layouts',     // 1. Primary (layout) templates under views/layouts
    partialsDir:   'views/partials',    // 3. Partials located under views/partials
    defaultLayout: 'main',              // 5. All pages rendered via res.render() will be embeded into views/layouts/main.hbs
}));
app.set('views',       'webroot');      // 2. Standard templates under webroot (with .js route handlers)
app.set('view engine', '.hbs');         // 4c  <same as 4b>
// END --


// BEGIN -- configure express to use express-dry-lazy-handlers-dir

app.use(edlhd({
    viewsDir:      __dirname + '/webroot',
    extensions:    ['js', 'hbs'],
    viewExtension: 'hbs'
}));

// END -- 

app.use((err, req, res, next) => {
    res.status(500).send(err.message);
});

app.listen(3000, () => console.log('Example app listening on port 3000!'))
```

### Example

Given the following files and folders

* `webroot/widgets/users/sports/index.hbs`
* `webroot/widgets/users/sports/index.js`

```js
// widgets/users/sports/index.js
'use strict';

module.exports.get = (req, res, next) => {
    const widgetId = req.params.widgets;
    const userId   = req.params.users;
    const sportId  = req.params.sports;

    if (!widgetId) return res.redirect('../../');       // back to /widgets/
    if (!userId)   return res.redirect('../');          // back to /widgets/users/

    const result = !sportId
        ? getSports({widgetId, userId})                 // get listing of all sports available
        : getSportData({widgetId, userId, sportId});    // else get selected item

    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
        return res.send(result); // send as JSON
    } else {
        return result; // pass data to sports.hbs for rendering
    }
};

module.exports.post = (req, res, next) => {
  assert(authenticated(req));
  doInsert(req.params);
}

module.exports.put = (req, res, next) => {
  assert(authenticated(req));
  doUpdatereq.params);
}

module.exports.delete = (req, res, next) => {
  assert(authenticated(req));
  doDelete(req.params);
}
```
All of the following incoming requests all map to the module `widgets/users/sports/index.js` (Note that req.params are optional, and that there can only ever be one param/value per step):

* `http://localhost:3000/widgets/users/sports/` (no params)
* `http://localhost:3000/widgets/users/sports/789` (only req.params.sports)
* `http://localhost:3000/widgets/123/users/sports/` (only req.params.widgets)
* `http://localhost:3000/widgets/123/users/456/sports/` (both req.params.widgets and users)
* etc

Because `sports` is a folder, a request for `http://localhost:3000/widgets/users/sports` will redirect the client to `http://localhost:3000/widgets/users/sports/`.

An alternative method would be to have a `widgets/users/sports.js` module however that means working harder when trying to use relative links (ie: `./`).


### Template only 

It is also possible to render the template directly without a module to feed it data.

Given the following template

* `webroot/login.hbs`

The following incoming requests all map to the template `webroot/login.hbs`.

* `http://localhost:3000/login` (no params)
* `http://localhost:3000/login/param1` (req.params.login = 'param1')

`req.query` and `req.params` are exposed to the template (only when no .js module was found).

```handlebars
{{#if (compare req.params.login '==' 'method1')}}
    .. show type 1 login ..
{{else}}
    .. show default login ..
{{/if}}
```


## Test Results
Output from the test: `$ node run test`

```

  middleware
    ✓ GET /dir1/dir2                           => redirect /dir1/dir2/
    ✓ GET /dir1/dir2/index                     => redirect /dir1/dir2/
    ✓ GET /index                               => redirect /
    ✓ GET no-match                             => send get:/index.js
    ✓ GET /no-match                            => send get:/index.js
    ✓ GET                                      => send get:/index.js
    ✓ GET /                                    => send get:/index.js
    ✓ GET /dir1/dir2/                          => send get:/dir1/dir2/index.js
    ✓ GET /dir1/dir2/file3                     => send get:/dir1/dir2/file3.js
    ✓ GET /dir1/dir2/file3/arg1                => send get:/dir1/dir2/file3.js
    ✓ GET /arg1                                => send get:/index.js
    ✓ GET /dir1/dir2/arg1                      => send get:/dir1/dir2/index.js
    ✓ GET /dir1/file4                          => render dir1/file4
    ✓ GET /dir1/arg1/dir2/arg2/file3/arg3      => send get:/dir1/dir2/file3.js
    ✓ GET /dir1/arg1/dir2/arg2/index/arg3      => redirect /dir1/arg1/dir2/arg2/arg3
    ✓ GET /dir1/arg1/dir2/arg2/arg3            => send get:/dir1/dir2/index.js
    ✓ GET /dir1/arg1/dir2/arg2                 => send get:/dir1/dir2/index.js
```
