# express-dry-lazy-handlers-dir

Use the filesystem to Automatically register a folder of route handlers.

## Design Goals

* Automatically call route handlers.
* Redirect to `/` if the requested resource is a folder (but request is missing trailing slash)


## Usage

```js
var express        = require('express')
var dryHandlers    = require('express-dry-lazy-handlers-dir')
var app            = express()

app.use(dryHandlers({
    viewsDir:   __dirname + '/webroot',
    extensions: ['js', 'hbs'],
    viewExtension: 'hbs'
}));

app.listen(3000)
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
    res.send('get:/dir1/dir2/file3.js');
};
```

```js
// dir1/file4.js
'use strict';

this.get = (req, res, next) => {
    // return render data for template file with same name
    return { from: 'get:/dir1/file4.js' };
};
```

... automatically execute the handlers.

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
    ✓ GET /dir1/arg1/dir2/arg2                 => send get:/dir1/dir2/index.js```

```
