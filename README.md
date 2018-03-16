# express-dry-lazy-handlers-dir

Use the filesystem to automatically register a folder of route handlers.

1. DRY - Don't repeat yourself.  
   Rather than typing `app.get('/path/to/some/file', authChecker, myHandler)`, just stick a file in a folder.
2. Lazy - Modules are not inspected when started.  Instead, modules are loaded on demand.

## Design Goals

* Automatically call route handlers.
* Redirect to `/` if the requested resource is a folder (but request is missing trailing slash)


## Usage

```js
var express = require('express');
var exphbs  = require('express-handlebars');
var edlhd   = require('express-dry-lazy-handlers-dir');

var app     = express();

app.engine('.hbs', exphbs({
    defaultLayout: 'main',
    layoutsDir:    'views/layouts',
    partialsDir:   'views/partials',
    extname:       '.hbs'
}));
app.set('views',       'webroot');
app.set('view engine', '.hbs');    

app.use(edlhd({
    viewsDir:   __dirname + '/webroot',
    extensions: ['js', 'hbs'],
    viewExtension: 'hbs'
}));

app.use((err, req, res, next) => {
    res.status(500).send(err.message);
});

app.listen(3000, () => console.log('Example app listening on port 3000!'))
```



## Example
Given a folder of js and template files ...

```
index.js
dir1/dir2/file3.js
dir1/dir2/index.js
dir1/file4.hbs
dir1/file4.js
```

... Where a JS file exports get/post/put/delete methods

```js
// dir1/dir2/file3.js
'use strict';

this.get = (req, res, next) => {
    res.send('__my_custom_response__');
    // Returning falsy (null|undefined|etc) tells edlhd that we've handled the request.
};
```

```js
// dir1/file4.js
'use strict';

this.get = (req, res, next) => {
    // Return render data for template file with same name.
    // If there is no actual template file then edlhd will `res.send()` it to the browser.
    return { "//" : 'render this object via matching template or send JSON browser' };
};
```

... automatically execute the handlers.

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
