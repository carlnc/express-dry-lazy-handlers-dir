'use strict';

const fs   = require('fs');
const path = require('path');
const URI  = require('urijs');

module.exports = resolve;

/**
 * Map an incoming request to a file in the filesystem.
 *
 * @param {string} baseFolder
 *
 *      Folder path (either absolute, or relative to process.CWD) to search in.
 *
 * @param {Array<string>|string} url
 *
 *      Either the string/URL, as seen by express, or the URL broken into pieces.
 *
 * @param {Array<string>} extensions
 *
 *      File extensions of the files to search for.  Defaults to ['js']
 *
 * @param {object} options
 *
 *      @param {Array<string>} options.defaultPages
 *
 *          Default: ['index.js']
 *
 *      @param {boolean} options.squashDefaultPage
 *
 *          Default: true
 *
 * @returns {*}
 *      {string} filepath
 *          The path to file, including filename excluding file extension.
 *
 *      {string} file
 *          The filename excluding file extension.
 *
 *      {string} filename
 *          The filename including file extension.
 *
 *      {Array<[k,v]>} params
 *          An array of key/value pairs (to be merged into req.params).
 *
 *      {Array<string>} extensions
 *          The file's extensions that matched (not including the dot).
 *
 *      {string} redirect
 *
 *          If the found resource is a folder, but the request is missing a trialing slash,
 *          then tell the caller to try again with a trailing slash; or
 *
 *          If the found resource is a file, but the filename is index,
 *          then tell the caller to try again without "index", ie: just a trailing slash.
 */
function resolve(baseFolder, url, extensions, options) {
    options = options || {};
    const squashDefaultPage = options.squashDefaultPage || true;

    const pathList = url instanceof Array
        ? url
        : urlToPathList(url);

    // /                                => ['']
    // /folder1/folder2/                => [ 'folder1', 'folder2', '' ]
    // /folder1/folder2/file            => [ 'folder1', 'folder2', 'file' ]
    // /folder1/:key1/folder2/file      => [ 'folder1', ':key1', 'folder2', 'file' ]
    // /folder1/:key1/folder2/:key2/    => [ 'folder1', ':key1', 'folder2', ':key2', '' ]

    const params      = [];
    const foundResult = {};
    let workingPath   = [];
    let parent        = null;

    let [head, ...rest] = pathList;

    // console.log({baseFolder, url, extensions, options, pathList});

    while (head !== undefined) {

        // console.log({workingPath, parent, head, rest});

        // Order:
        // if head is a folder, then descend.
        // if rest[0] is a folder, then descend and apply param
        // if head is a file, and rest is [] then load module
        // if head is a file, and rest is [':id'] then load module and apply param

        if (head && isDir(baseFolder, workingPath, head)) {
            workingPath.push(head);
            parent = head;
            head   = rest.shift();

            if (head === undefined) {
                return { redirect: `/${pathList.join('/')}/` };
            }
            continue;
        }

        // /dir1/key1/dir2... --- parent='dir1'  head='key1'  rest=['dir2']
        if (parent && rest[0] && isDir(baseFolder, workingPath, rest[0])) {
            params.push([parent, head]);
            parent      = null;
            head        = rest.shift();
            continue;
        }

        // parent='dir1'  head='key1'  rest=['file2']
        if (parent && rest.length <= 2 && isFile(baseFolder, workingPath, rest[0], extensions, foundResult)) {
            params.push([parent, head]);
            parent      = null;
            head        = rest.shift();
            // now try again with --- parent=null  head='file2'  rest=[]
            continue;
        }

        // /dir1/dir2/file3 --- parent=dir2  head='file3'  rest=[]
        if (rest.length === 0 && isFile(baseFolder, workingPath, head, extensions, foundResult)) {
            // /dir1/dir2/index --- parent=dir2  head='index'  rest=[]
            if (head === 'index' && squashDefaultPage) {
                const redirect = [''].concat(pathList);
                redirect[redirect.length - 1] = ''; // remove 'index' from [dir1, dir2, index]
                return { redirect: redirect.join('/') };
            }
            return found(foundResult, params);
        }

        // /file/arg1 --- parent=null  head='file'  rest=['arg1']
        if (rest.length === 1 && isFile(baseFolder, workingPath, head, extensions, foundResult)) {
            // /index/arg1 --- parent=null  head='index'  rest=['arg1']
            if (head === 'index' && squashDefaultPage) {
                const redirect = [''].concat(pathList);

                redirect.splice(-2, 1); // remove 'index' from [dir1, dir2, index, arg1]
                return { redirect: redirect.join('/') };
            }

            params.push([head, rest[0]]);
            return found(foundResult, params);
        }

        // /arg1 --- parent=null  head='arg1'  rest=[]
        if (rest.length === 0 && isFile(baseFolder, workingPath, 'index', extensions, foundResult)) {
            params.push([parent || 'index', head]);
            return found(foundResult, params);
        }

        // /dir1/arg1(/index)/arg2  --- parent='dir1'  head='arg1'  rest=['arg2']
        if (parent && rest.length === 1 && isFile(baseFolder, workingPath, 'index', extensions, foundResult)) {
            params.push([parent, head]);
            params.push(['index', rest[0]]);
            return found(foundResult, params);
        }

        return;
        // head = rest.shift();
    }
}



// ['', '/', 'asdf', '/asdf', '/asdf/'].forEach(
//     x => console.log({x, y: urlToPathList(x)})
// );

function urlToPathList(url) {
    const path = URI(url).normalize().toString().split('/');

    if (url.charAt(0) === '/') path.shift(); // Remove empty before the first slash

    if (path.length === 0) path.push(''); // assume index.<ext>

    return path;
}

function isDir(bp, wf, h) {
    const dir = [bp].concat(wf, h).join(path.sep);
    const stat  = fs.existsSync(dir) && fs.statSync(dir);
    return stat && stat.isDirectory();
}

function isFile(bp, wf, h, extensions, foundResult) {
    if (h === '') h = 'index';
    Object.keys(foundResult).forEach(k => delete foundResult[k]);

    const found    = [];
    const filePath = [bp].concat(wf, h).join(path.sep);

    let file;
    let stat;

    extensions.forEach(extension => {
        file = `${filePath}.${extension}`;
        stat = fs.existsSync(file) && fs.statSync(file);

        if (stat && stat.isFile()) {
            found.push(extension)
        }
    });

    if (found.length) {
        foundResult.filePath   = wf.concat(h).join(path.sep);
        foundResult.file       = h;
        foundResult.extensions = found;

        return true;
    }

    return false;
}

function found(foundResult, params) {
    const filePath   = foundResult.filePath;
    const file       = foundResult.file;
    const extensions = foundResult.extensions;
    const filename   = `${file}.${extensions[0]}`;

    return {filePath, file, filename, params, extensions};
}
