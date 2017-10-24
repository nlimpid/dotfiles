"use strict";
var vscode_1 = require('vscode');
var ChildProcess = require('child_process');
var lineDecoder_1 = require('./lineDecoder');
var fs = require('fs');
var path = require('path');
var pgsqlCommandProvider = (function () {
    function pgsqlCommandProvider() {
        this.executable = 'psql';
    }
    pgsqlCommandProvider.prototype.activate = function (subscriptions) {
        var cp = this;
        cp.outChannel = vscode_1.window.createOutputChannel("pgsql");
        vscode_1.workspace.onDidChangeConfiguration(cp.loadConfiguration, cp, subscriptions);
        cp.loadConfiguration();
    };
    pgsqlCommandProvider.prototype.loadConfiguration = function () {
        var section = vscode_1.workspace.getConfiguration('pgsql');
        if (section) {
            this.connection = section.get('connection', null);
        }
    };
    pgsqlCommandProvider.prototype.run = function () {
        var editor = vscode_1.window.activeTextEditor;
        if (!editor)
            return; // No any open text editor
        var doc = editor.document;
        var seltext = doc.getText(editor.selection);
        var text = seltext ? seltext : doc.getText();
        var pgsql = this;
        // file already have real filename, just run it via psql
        if (!doc.isDirty)
            return pgsql.runFile(doc.fileName);
        // in any others cases, for example if ( doc.isUntitled ) 
        pgsql.runText(text);
    };
    // Create temporary file with given text and execute it via psql
    pgsqlCommandProvider.prototype.runText = function (text) {
        var pgsql = this;
        var rootPath = vscode_1.workspace.rootPath ? vscode_1.workspace.rootPath : __dirname;
        var uniqName = path.join(rootPath, (Date.now() - 0) + '.pgsql');
        fs.writeFile(uniqName, text, function (err) {
            if (err) {
                return pgsql.outChannel.appendLine('Can\'t create temporary file: ' + uniqName);
            }
            var cb = function () { return fs.unlink(uniqName, function (err) {
                if (err) {
                    pgsql.outChannel.appendLine('Can\'t delete temporary file: ' + uniqName);
                }
            }); };
            pgsql.runFile(uniqName, cb);
        });
    };
    pgsqlCommandProvider.prototype.runFile = function (fileName, cb) {
        var pgsql = this, args = [
            "-d", pgsql.connection,
            "-f", fileName
        ];
        pgsql.outChannel.show(vscode_1.ViewColumn.Two);
        var cp = ChildProcess.spawn(pgsql.executable, args);
        if (!cp.pid) {
            return pgsql.outChannel.appendLine('pgsql: can\'t spawn child proceess');
        }
        //args.unshift( pgsql.executable )
        //console.log( args.join(" ") )
        cp.on('error', function (err) {
            var ecode = err.code;
            var defmsg = "Failed to run: " + pgsql.executable + " " + args.join(' ') + ". " + ecode + ".";
            var message = err.message || defmsg;
            if (err.code === 'ENOENT') {
                message = "The 'psql' program was not found. Please ensure the 'psql' is in your Path";
            }
            vscode_1.window.showInformationMessage(message);
            if (cb)
                cb();
        });
        var decoder = new lineDecoder_1.default();
        pgsql.outChannel.show(vscode_1.ViewColumn.Two);
        cp.stdout.on('data', function (data) {
            decoder.write(data).forEach(function (line) {
                pgsql.outChannel.appendLine(line);
            });
        });
        cp.stderr.on('data', function (data) {
            decoder.write(data).forEach(function (line) {
                pgsql.outChannel.appendLine(line);
            });
        });
        cp.stdout.on('end', function () {
            pgsql.outChannel.appendLine('pgsql end.');
            if (cb)
                cb();
        });
    };
    return pgsqlCommandProvider;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = pgsqlCommandProvider;
//# sourceMappingURL=commandProvider.js.map