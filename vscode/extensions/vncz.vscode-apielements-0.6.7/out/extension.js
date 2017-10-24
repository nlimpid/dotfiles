/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const Commands = require("./commands");
const path = require("path");
const vscode_1 = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
function registerCommands(client, context) {
    context.subscriptions.push(vscode_1.commands.registerTextEditorCommand('apiElements.parserOutput', Commands.parseOutput.bind(this, context, client)), vscode_1.commands.registerCommand('apiElements.apiary.fetchApi', Commands.fetchApi.bind(this, context)), vscode_1.commands.registerCommand('apiElements.apiary.logout', Commands.logout.bind(this, context)), vscode_1.commands.registerTextEditorCommand('apiElements.apiary.publishApi', Commands.publishApi.bind(this, context)), vscode_1.commands.registerTextEditorCommand('apiElements.apiary.browse', Commands.browse.bind(this, context)), vscode_1.commands.registerTextEditorCommand('apiElements.apiary.preview', Commands.previewApi.bind(this, context)));
}
function registerNotifications(client) {
    client.onNotification("openUrl", url => vscode_1.commands.executeCommand("vscode.open", vscode_1.Uri.parse(url)));
}
function registerWindowEvents() {
    vscode_1.window.onDidChangeActiveTextEditor(textEditor => {
        if (textEditor.document.languageId === 'apiblueprint') {
            const adjustEditor = vscode_1.workspace.getConfiguration('apiElements').get('editor.adjustOptions');
            if (adjustEditor === true) {
                textEditor.options = {
                    insertSpaces: true,
                    tabSize: 4,
                };
                textEditor.edit(editBuilder => editBuilder.setEndOfLine(vscode_1.EndOfLine.LF));
            }
        }
    });
}
function activate(context) {
    const serverModule = context.asAbsolutePath(path.join('server', 'server.js'));
    const debugOptions = { execArgv: ["--nolazy", "--debug=6004"] };
    const serverOptions = {
        debug: { module: serverModule, options: debugOptions, transport: vscode_languageclient_1.TransportKind.ipc },
        run: { module: serverModule, transport: vscode_languageclient_1.TransportKind.ipc },
    };
    const clientOptions = {
        documentSelector: ['apiblueprint', 'swagger'],
        synchronize: {
            configurationSection: 'apiElements',
            fileEvents: vscode_1.workspace.createFileSystemWatcher('**/.clientrc'),
        },
    };
    const client = new vscode_languageclient_1.LanguageClient('apiElements', 'Api Elements', serverOptions, clientOptions);
    client.onReady().then(() => {
        registerCommands(client, context);
        registerNotifications(client);
        registerWindowEvents();
    });
    context.subscriptions.push(client.start());
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map