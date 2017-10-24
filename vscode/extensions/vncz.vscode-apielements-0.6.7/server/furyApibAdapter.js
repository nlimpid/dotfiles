"use strict";
// API Blueprint parser for Fury.js
Object.defineProperty(exports, "__esModule", { value: true });
const drafter = require('drafter.js');
exports.name = 'api-blueprint';
exports.mediaTypes = [
    'text/vnd.apiblueprint',
];
function detect(source) {
    return true;
}
exports.detect = detect;
/*
 * Parse an API Blueprint into refract elements.
 */
function parse({ source, generateSourceMap }, done) {
    const options = { exportSourcemap: generateSourceMap };
    drafter.parse(source, options, done);
}
exports.parse = parse;
exports.default = { name: exports.name, mediaTypes: exports.mediaTypes, detect, parse };
//# sourceMappingURL=furyApibAdapter.js.map