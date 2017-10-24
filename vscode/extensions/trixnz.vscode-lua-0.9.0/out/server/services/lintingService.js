"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const child_process_1 = require("child_process");
const path_1 = require("path");
const vscode_uri_1 = require("vscode-uri");
function parseDiagnostics(data) {
    const diagnostics = [];
    const errorRegex = /^.*:(\d+):(\d+)-(\d+): \(([EW]?)(\d+)\) (.*)$/mg;
    const matches = data.match(errorRegex);
    if (!matches) {
        return [];
    }
    while (true) {
        const m = errorRegex.exec(data);
        if (!m) {
            break;
        }
        const [, lineStr, columnStr, endColumnStr, type, codeStr, message] = m;
        const line = Number(lineStr) - 1;
        const column = Number(columnStr) - 1;
        const columnEnd = Number(endColumnStr);
        const code = Number(codeStr);
        const mapSeverity = () => {
            switch (type) {
                case 'E':
                    return vscode_languageserver_1.DiagnosticSeverity.Error;
                case 'W':
                    return vscode_languageserver_1.DiagnosticSeverity.Warning;
                default:
                    return vscode_languageserver_1.DiagnosticSeverity.Information;
            }
        };
        diagnostics.push({
            range: vscode_languageserver_1.Range.create(line, column, line, columnEnd),
            severity: mapSeverity(),
            code,
            source: 'luacheck',
            message
        });
    }
    return diagnostics;
}
function buildLintingErrors(settings, documentUri, documentText) {
    if (!settings.luacheckPath) {
        return Promise.resolve([]);
    }
    return new Promise((resolve, reject) => {
        const uri = vscode_uri_1.default.parse(documentUri);
        const dir = path_1.dirname(uri.fsPath);
        const process = child_process_1.spawn(settings.luacheckPath, [
            '-', '--no-color', '--ranges', '--codes', '--filename=' + uri.fsPath
        ], { cwd: dir });
        try {
            process.stdin.write(documentText);
            process.stdin.end();
        }
        catch (err) { }
        process.stdout.on('data', (data) => {
            return resolve(parseDiagnostics(data.toString()));
        });
        process.stderr.on('data', (data) => {
            return reject(data.toString());
        });
        process.on('error', (err) => {
            if (err.code === 'ENOENT') {
                return reject('Path to luacheck is invalid.');
            }
            return reject(err);
        });
    });
}
exports.buildLintingErrors = buildLintingErrors;
//# sourceMappingURL=lintingService.js.map