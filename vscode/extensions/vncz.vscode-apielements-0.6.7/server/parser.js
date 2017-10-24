"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fury = require('fury');
const apibParser = require('./furyApibAdapter');
const swaggerParser = require('fury-adapter-swagger');
fury.use(swaggerParser);
fury.use(apibParser); // Everything is APIB if something fails
function parse(source, options) {
    return new Promise((resolve, reject) => {
        fury.parse({ source, generateSourceMap: true, options }, (err, result) => {
            // Yet callbacks in 2016? Yes.
            if (result !== undefined) {
                return resolve(result.toRefract());
            }
            return reject(err);
        });
    });
}
exports.parse = parse;
//# sourceMappingURL=parser.js.map