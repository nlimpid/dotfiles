'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const constants_1 = require("./constants");
const telemetry_1 = require("./telemetry");
const ConsolePrefix = `[${constants_1.ExtensionOutputChannelName}]`;
var OutputLevel;
(function (OutputLevel) {
    OutputLevel["Silent"] = "silent";
    OutputLevel["Errors"] = "errors";
    OutputLevel["Verbose"] = "verbose";
})(OutputLevel = exports.OutputLevel || (exports.OutputLevel = {}));
let debug = false;
let level = OutputLevel.Silent;
let output;
function onConfigurationChanged() {
    const cfg = vscode_1.workspace.getConfiguration().get(constants_1.ExtensionKey);
    if (cfg === undefined)
        return;
    if (cfg.debug !== debug || cfg.outputLevel !== level) {
        debug = cfg.debug;
        level = cfg.outputLevel;
        if (level === OutputLevel.Silent) {
            output && output.dispose();
        }
        else {
            output = output || vscode_1.window.createOutputChannel(constants_1.ExtensionOutputChannelName);
        }
    }
}
class Logger {
    static configure(context) {
        context.subscriptions.push(vscode_1.workspace.onDidChangeConfiguration(onConfigurationChanged));
        onConfigurationChanged();
    }
    static log(message, ...params) {
        if (debug) {
            console.log(ConsolePrefix, message, ...params);
        }
        if (level === OutputLevel.Verbose) {
            output.appendLine([message, ...params].join(' '));
        }
    }
    static error(ex, classOrMethod, ...params) {
        if (debug) {
            console.error(ConsolePrefix, classOrMethod, ex, ...params);
        }
        if (level !== OutputLevel.Silent) {
            output.appendLine([classOrMethod, ex, ...params].join(' '));
        }
        telemetry_1.Telemetry.trackException(ex);
    }
    static warn(message, ...params) {
        if (debug) {
            console.warn(ConsolePrefix, message, ...params);
        }
        if (level !== OutputLevel.Silent) {
            output.appendLine([message, ...params].join(' '));
        }
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map