"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
function showMessage(err) {
    if (typeof err === 'number') {
        return;
    }
    const message = err.message || err;
    if (err.type === 'info') {
        return vscode_1.window.showInformationMessage(message);
    }
    else if (err.type === 'warn') {
        return vscode_1.window.showWarningMessage(message);
    }
    return vscode_1.window.showErrorMessage(message);
}
exports.showMessage = showMessage;
//# sourceMappingURL=showMessage.js.map