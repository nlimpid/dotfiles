"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const requestApiaryClient_1 = require("./requestApiaryClient");
const showMessage_1 = require("./showMessage");
const showUntitledWindow_1 = require("./showUntitledWindow");
const vscode_1 = require("vscode");
const axios_1 = require("axios");
const escape = require('lodash.escape');
function selectApi(context) {
    return requestApiaryClient_1.requestApiaryClient(context)
        .then(client => Promise.all([client.getApiList(), client]))
        .then(([res, client]) => {
        const elements = res.apis.map(element => ({
            description: element.apiName,
            detail: element.apiDocumentationUrl,
            label: element.apiSubdomain,
        }));
        return Promise.all([vscode_1.window.showQuickPick(elements, {
                matchOnDescription: true,
                matchOnDetail: false,
                placeHolder: 'Select your API',
            }), client]);
    });
}
function parseOutput(context, client, editor) {
    vscode_1.window.setStatusBarMessage('Parsing current document...', client.sendRequest('parserOutput', editor.document.getText())
        .then(result => showUntitledWindow_1.showUntitledWindow('parseResult.json', JSON.stringify(result, null, 2), context.extensionPath), (err) => {
        if (err.result !== undefined) {
            return showUntitledWindow_1.showUntitledWindow('parseResult.json', JSON.stringify(err.result, null, 2), context.extensionPath);
        }
        throw err;
    })
        .then(undefined, showMessage_1.showMessage));
}
exports.parseOutput = parseOutput;
function fetchApi(context) {
    vscode_1.window.setStatusBarMessage('Fetching API list from Apiary...', selectApi(context)
        .then(([selectedApi, client]) => {
        if (selectedApi === undefined) {
            throw 0;
        }
        return Promise.all([client.getApiCode(selectedApi.label), selectedApi.label]);
    })
        .then(([res, apiName]) => {
        if (vscode_1.window.activeTextEditor === undefined) {
            return showUntitledWindow_1.showUntitledWindow(`${apiName}`, res.code, context.extensionPath);
        }
        return vscode_1.window.activeTextEditor.edit((builder) => {
            const lastLine = vscode_1.window.activeTextEditor.document.lineCount;
            const lastChar = vscode_1.window.activeTextEditor.document.lineAt(lastLine - 1).range.end.character;
            builder.delete(new vscode_1.Range(0, 0, lastLine, lastChar));
            builder.replace(new vscode_1.Position(0, 0), res.code);
        });
    })
        .then(undefined, showMessage_1.showMessage));
}
exports.fetchApi = fetchApi;
function publishApi(context, textEditor) {
    vscode_1.window.setStatusBarMessage('Publishing API on Apiary...', selectApi(context)
        .then(([selectedApi, client]) => {
        return client.publishApi(selectedApi.label, textEditor.document.getText(), '');
    })
        .then(() => vscode_1.window.showInformationMessage('API successuflly published on Apiary!'))
        .then(undefined, showMessage_1.showMessage));
}
exports.publishApi = publishApi;
function previewApi(context, textEditor) {
    const code = escape(textEditor.document.getText());
    const preview = `<!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <title>API Preview</title>
    </head>
    <body>
    <script src="https://api.apiary.io/seeds/embed.js"></script>
    <script>
    var embed = new Apiary.Embed({
    apiBlueprint: \`${code}\`,
    });
    </script>
    </body>
    </html>`;
    const filePath = path.join(vscode_1.workspace.rootPath || context.extensionPath, 'preview.html');
    fs.writeFileSync(filePath, preview, 'utf8');
    return vscode_1.commands.executeCommand('vscode.previewHtml', vscode_1.Uri.parse(`file:${filePath}`), getViewColumn())
        .then(() => fs.unlinkSync(filePath));
}
exports.previewApi = previewApi;
function logout(context) {
    const tokenFilePath = path.join(context.extensionPath, '.apiaryToken');
    if (fs.existsSync(path.join(context.extensionPath, '.apiaryToken'))) {
        fs.unlinkSync(tokenFilePath);
        requestApiaryClient_1.killCurrentApiaryClient();
    }
}
exports.logout = logout;
function browse(context, textEditor) {
    const documentFilename = path.basename(textEditor.document.fileName, path.extname(textEditor.document.fileName));
    const url = `http://docs.${documentFilename}.apiary.io/`;
    return axios_1.default.get(url)
        .then(() => vscode_1.Uri.parse(url), () => {
        return selectApi(context)
            .then(([selectedApi]) => {
            if (selectedApi === undefined) {
                throw 0;
            }
            return vscode_1.Uri.parse(selectedApi.detail);
        });
    })
        .then(uri => vscode_1.commands.executeCommand('vscode.open', uri), showMessage_1.showMessage);
}
exports.browse = browse;
function getViewColumn(sideBySide = true) {
    const active = vscode_1.window.activeTextEditor;
    if (!active) {
        return vscode_1.ViewColumn.One;
    }
    if (!sideBySide) {
        return active.viewColumn;
    }
    switch (active.viewColumn) {
        case vscode_1.ViewColumn.One:
            return vscode_1.ViewColumn.Two;
        case vscode_1.ViewColumn.Two:
            return vscode_1.ViewColumn.Three;
        default:
            return active.viewColumn;
    }
}
//# sourceMappingURL=commands.js.map