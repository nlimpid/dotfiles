"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const vscode_1 = require("vscode");
function showUntitledWindow(fileName, content, fallbackPath) {
    const filePath = path.join(vscode_1.workspace.rootPath || fallbackPath, fileName);
    const uri = vscode_1.Uri.parse(`untitled:${filePath}`);
    try {
        fs.accessSync(filePath, fs.constants.F_OK);
        fs.unlinkSync(filePath);
    }
    catch (err) {
        ;
    }
    return vscode_1.workspace.openTextDocument(uri)
        .then((textDocument) => {
        const edit = new vscode_1.WorkspaceEdit();
        edit.insert(uri, new vscode_1.Position(0, 0), content);
        return Promise.all([textDocument, vscode_1.workspace.applyEdit(edit)]);
    })
        .then(([textDocument]) => {
        return vscode_1.window.showTextDocument(textDocument, vscode_1.ViewColumn.One, false);
    });
}
exports.showUntitledWindow = showUntitledWindow;
//# sourceMappingURL=showUntitledWindow.js.map