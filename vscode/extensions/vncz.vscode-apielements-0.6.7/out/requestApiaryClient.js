"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const vscode_1 = require("vscode");
const apiaryClient_1 = require("./apiaryClient");
const showMessage_1 = require("./showMessage");
class TypedError extends Error {
    constructor(message, type) {
        super(message);
        this.message = message;
        this.type = type;
    }
}
let apiaryClient = undefined;
function requestApiaryClient(context) {
    const tokenFilePath = path.join(context.extensionPath, '.apiaryToken');
    if (apiaryClient === undefined) {
        if (process.env.APIARY_API_KEY !== undefined) {
            // According to apiary-client, this might be defined.
            apiaryClient = new apiaryClient_1.ApiaryClient(process.env.APIARY_API_KEY);
            return Promise.resolve(apiaryClient);
        }
        // Probably it's saved into our super fancy file?
        try {
            const token = fs.readFileSync(tokenFilePath, 'utf8');
            apiaryClient = new apiaryClient_1.ApiaryClient(token);
            return Promise.resolve(apiaryClient);
        }
        catch (e) {
            ;
        }
        return vscode_1.window.showWarningMessage('Unable to find an Apiary Token. It\'s required to operate with Apiary', 'Grab one!', 'Paste one!')
            .then(result => {
            if (result === 'Grab one!') {
                return vscode_1.commands.executeCommand('vscode.open', vscode_1.Uri.parse('https://login.apiary.io/tokens'));
            }
            else if (result === 'Paste one!') {
                return;
            }
            throw 0;
        })
            .then(() => vscode_1.window.showInputBox({ password: true, placeHolder: 'Paste Apiary token here' }))
            .then(token => {
            if (token === undefined) {
                throw new TypedError('No Apiary token provided', 'info');
            }
            apiaryClient = new apiaryClient_1.ApiaryClient(token);
            return Promise.all([apiaryClient, token, apiaryClient.getApiList()]);
        })
            .then(([client, token]) => {
            try {
                fs.writeFileSync(tokenFilePath, token, { encoding: 'utf8' });
            }
            catch (e) {
                showMessage_1.showMessage(e);
                throw 0;
            }
            return client;
        }, (err) => {
            apiaryClient = undefined;
            showMessage_1.showMessage('It seems like the token you provided is not valid. Please try again.');
            throw 0;
        });
    }
    return Promise.resolve(apiaryClient);
}
exports.requestApiaryClient = requestApiaryClient;
function killCurrentApiaryClient() {
    apiaryClient = undefined;
}
exports.killCurrentApiaryClient = killCurrentApiaryClient;
//# sourceMappingURL=requestApiaryClient.js.map