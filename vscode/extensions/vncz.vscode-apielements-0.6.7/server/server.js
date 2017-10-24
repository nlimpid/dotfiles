'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const parser_1 = require("./parser");
const refractSymbolMap_1 = require("./refractSymbolMap");
const refractUtils = require("./refractUtils");
const utfUtils_1 = require("./utfUtils");
const lodash = require('lodash');
const apiDescriptionMixins = require('lodash-api-description');
const refractDocuments = new Map();
apiDescriptionMixins(lodash);
let debouncedValidateTextDocument = validateTextDocument;
const getHelpUrl = (section) => {
    return `https://github.com/XVincentX/vscode-apielements/blob/master/TROUBLESHOT.md${section}`;
};
const connection = vscode_languageserver_1.createConnection(new vscode_languageserver_1.IPCMessageReader(process), new vscode_languageserver_1.IPCMessageWriter(process));
const documents = new vscode_languageserver_1.TextDocuments();
documents.listen(connection);
let workspaceRoot;
connection.onInitialize((params) => {
    workspaceRoot = params.rootPath;
    const capabilities = {
        documentSymbolProvider: true,
        textDocumentSync: documents.syncKind,
    };
    return {
        capabilities,
    };
});
documents.onDidChangeContent((change) => {
    debouncedValidateTextDocument(change.document);
});
documents.onDidClose((event) => {
    connection.sendDiagnostics({ diagnostics: [], uri: event.document.uri });
});
let currentSettings;
let desideredSymbols = refractSymbolMap_1.defaultRefractSymbolsTree;
connection.onDidChangeConfiguration((change) => {
    const apiElementsSettings = change.settings.apiElements;
    currentSettings = lodash.cloneDeep(apiElementsSettings);
    debouncedValidateTextDocument = lodash.debounce(validateTextDocument, apiElementsSettings.validation.debounce);
    const desideredSymbolNames = Object.keys(apiElementsSettings.symbols).filter((sym) => apiElementsSettings.symbols[sym] === true);
    desideredSymbols =
        refractSymbolMap_1.defaultRefractSymbolsTree.filter((sym) => lodash.includes(desideredSymbolNames, sym.friendlyName));
    // Revalidate any open text documents
    documents.all().forEach(validateTextDocument);
});
function validateTextDocument(textDocument) {
    const diagnostics = [];
    const text = textDocument.getText();
    parser_1.parse(text, currentSettings.parser)
        .then((output) => output, (error) => error.result)
        .then((refractOutput) => {
        refractDocuments.set(textDocument.uri.toString(), refractOutput);
        const annotations = lodash.filterContent(refractOutput, { element: 'annotation' });
        const utf8Text = utfUtils_1.utf16to8(text);
        const documentLines = utf8Text.split(/\r?\n/g);
        lodash.forEach(annotations, (annotation) => {
            const lineReference = refractUtils.createLineReferenceFromSourceMap(annotation.attributes.sourceMap, text, documentLines);
            diagnostics.push({
                code: annotation.attributes.code,
                message: annotation.content,
                range: vscode_languageserver_1.Range.create(lineReference.startRow, lineReference.startIndex, lineReference.endRow, lineReference.endIndex),
                severity: ((lodash.head(annotation.meta.classes) === 'warning')
                    ? vscode_languageserver_1.DiagnosticSeverity.Warning : vscode_languageserver_1.DiagnosticSeverity.Error),
                source: 'fury',
            });
        });
        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    });
}
connection.onDocumentSymbol((symbolParam) => {
    try {
        if (currentSettings.parser.exportSourcemap === false) {
            connection.window.showWarningMessage('\
        The current parser options have source maps disabled.\
        Without those, it\'s not possible to generate document symbol.\
        ', { title: 'More Info' }).then(() => {
                connection.sendNotification('openUrl', getHelpUrl('#no-sourcemaps-enabled'));
            });
            return Promise.resolve([]); // I cannot let you navigate if I have no source map.
        }
        const documentObject = documents.get(symbolParam.textDocument.uri);
        let textDocument = documentObject.getText();
        if (documentObject.languageId === 'apiblueprint') {
            textDocument = utfUtils_1.utf16to8(textDocument);
            /*
              The reason why this is happening just for API Blueprint is that drafter.js
              is coming from C++ code (using es). Swagger parser is pure javascript thuos
              sourcemaps are char based and not byte based.
      
              See https://github.com/apiaryio/fury.js/issues/63 for more details.
            */
        }
        const documentLines = textDocument.split(/\r?\n/g);
        const refractOutput = refractDocuments.get(symbolParam.textDocument.uri.toString());
        if (typeof (refractOutput) === 'undefined') {
            return parser_1.parse(textDocument, currentSettings.parser)
                .then((output) => {
                refractDocuments.set(symbolParam.textDocument.uri.toString(), output);
                return refractUtils.extractSymbols(output, textDocument, documentLines, desideredSymbols);
            });
        }
        const symbolArray = refractUtils.extractSymbols(refractOutput, textDocument, documentLines, desideredSymbols);
        return Promise.resolve(symbolArray);
    }
    catch (err) {
        connection.window.showErrorMessage(err.message);
    }
});
connection.onRequest('parserOutput', (code) => {
    return parser_1.parse(code, currentSettings.parser);
});
connection.listen();
//# sourceMappingURL=server.js.map