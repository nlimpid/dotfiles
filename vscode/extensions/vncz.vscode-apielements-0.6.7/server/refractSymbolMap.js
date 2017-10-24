"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
;
/*
  The following structure is based on
  http://api-elements.readthedocs.io/en/latest/overview/#relationship-of-elements.
  This might not be the complete three, but just the elements we care about.
*/
const defaultRefractSymbolsTree = [{
        friendlyName: 'api',
        query: {
            element: "category",
            meta: {
                classes: [
                    "api",
                ],
            },
        },
        symbolKind: vscode_languageserver_1.SymbolKind.Namespace,
    }, {
        friendlyName: 'resourceGroup',
        query: {
            element: "category",
            meta: {
                classes: [
                    "resourceGroup",
                ],
                title: {},
            },
        },
        symbolKind: vscode_languageserver_1.SymbolKind.Module,
    }, {
        friendlyName: 'resource',
        query: {
            element: "resource",
        },
        symbolKind: vscode_languageserver_1.SymbolKind.Class,
    }, {
        friendlyName: 'transition',
        query: {
            content: [{
                    element: "httpTransaction",
                }],
            element: "transition",
        },
        symbolKind: vscode_languageserver_1.SymbolKind.Method,
    }];
exports.defaultRefractSymbolsTree = defaultRefractSymbolsTree;
//# sourceMappingURL=refractSymbolMap.js.map