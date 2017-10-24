'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const comparers_1 = require("../comparers");
const constants_1 = require("../constants");
const gitService_1 = require("../gitService");
const logger_1 = require("../logger");
class GitContextTracker extends vscode_1.Disposable {
    constructor(git) {
        super(() => this.dispose());
        this.git = git;
        this._onDidChangeBlameability = new vscode_1.EventEmitter();
        const subscriptions = [
            vscode_1.window.onDidChangeActiveTextEditor(this._onActiveTextEditorChanged, this),
            vscode_1.workspace.onDidChangeConfiguration(this._onConfigurationChanged, this),
            vscode_1.workspace.onDidSaveTextDocument(this._onTextDocumentSaved, this),
            this.git.onDidBlameFail(this._onBlameFailed, this),
            this.git.onDidChangeRepo(this._onRepoChanged, this)
        ];
        this._disposable = vscode_1.Disposable.from(...subscriptions);
        constants_1.setCommandContext(constants_1.CommandContext.IsRepository, !!this.git.repoPath);
        this._onConfigurationChanged();
    }
    get onDidChangeBlameability() {
        return this._onDidChangeBlameability.event;
    }
    dispose() {
        this._disposable && this._disposable.dispose();
        this._documentChangeDisposable && this._documentChangeDisposable.dispose();
    }
    _onConfigurationChanged() {
        const gitEnabled = vscode_1.workspace.getConfiguration('git').get('enabled', true);
        if (this._gitEnabled !== gitEnabled) {
            this._gitEnabled = gitEnabled;
            constants_1.setCommandContext(constants_1.CommandContext.Enabled, gitEnabled);
            this._onActiveTextEditorChanged(vscode_1.window.activeTextEditor);
        }
    }
    _onRepoChanged(reasons) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!reasons.includes(gitService_1.RepoChangedReasons.Remotes))
                return;
            const gitUri = this._editor === undefined ? undefined : yield gitService_1.GitUri.fromUri(this._editor.document.uri, this.git);
            this._updateContextHasRemotes(gitUri);
        });
    }
    _onActiveTextEditorChanged(editor) {
        this._editor = editor;
        this._updateContext(this._gitEnabled ? editor : undefined);
        this._subscribeToDocumentChanges();
    }
    _onBlameFailed(key) {
        if (this._editor === undefined || this._editor.document === undefined || this._editor.document.uri === undefined)
            return;
        if (key !== this.git.getCacheEntryKey(this._editor.document.uri))
            return;
        this._updateBlameability(false);
    }
    _onTextDocumentChanged(e) {
        if (!comparers_1.TextDocumentComparer.equals(this._editor && this._editor.document, e && e.document))
            return;
        setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            let blameable = !e.document.isDirty;
            if (blameable) {
                blameable = yield this.git.getBlameability(yield gitService_1.GitUri.fromUri(e.document.uri, this.git));
            }
            this._updateBlameability(blameable);
        }), 1);
    }
    _onTextDocumentSaved(e) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!comparers_1.TextDocumentComparer.equals(this._editor && this._editor.document, e))
                return;
            let blameable = !e.isDirty;
            if (blameable) {
                blameable = yield this.git.getBlameability(yield gitService_1.GitUri.fromUri(e.uri, this.git));
            }
            this._updateBlameability(blameable);
        });
    }
    _subscribeToDocumentChanges() {
        this._unsubscribeToDocumentChanges();
        this._documentChangeDisposable = vscode_1.workspace.onDidChangeTextDocument(this._onTextDocumentChanged, this);
    }
    _unsubscribeToDocumentChanges() {
        this._documentChangeDisposable && this._documentChangeDisposable.dispose();
        this._documentChangeDisposable = undefined;
    }
    _updateContext(editor) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const gitUri = editor === undefined ? undefined : yield gitService_1.GitUri.fromUri(editor.document.uri, this.git);
                yield Promise.all([
                    this._updateEditorContext(gitUri, editor),
                    this._updateContextHasRemotes(gitUri)
                ]);
            }
            catch (ex) {
                logger_1.Logger.error(ex, 'GitEditorTracker._updateContext');
            }
        });
    }
    _updateContextHasRemotes(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let repoPath = this.git.repoPath;
                if (uri !== undefined && this.git.isTrackable(uri)) {
                    repoPath = uri.repoPath || this.git.repoPath;
                }
                let hasRemotes = false;
                if (repoPath) {
                    const remotes = yield this.git.getRemotes(repoPath);
                    hasRemotes = remotes.length !== 0;
                }
                constants_1.setCommandContext(constants_1.CommandContext.HasRemotes, hasRemotes);
            }
            catch (ex) {
                logger_1.Logger.error(ex, 'GitEditorTracker._updateContextHasRemotes');
            }
        });
    }
    _updateEditorContext(uri, editor) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const tracked = uri === undefined ? false : yield this.git.isTracked(uri);
                constants_1.setCommandContext(constants_1.CommandContext.IsTracked, tracked);
                let blameable = tracked && (editor !== undefined && editor.document !== undefined && !editor.document.isDirty);
                if (blameable) {
                    blameable = uri === undefined ? false : yield this.git.getBlameability(uri);
                }
                this._updateBlameability(blameable, true);
            }
            catch (ex) {
                logger_1.Logger.error(ex, 'GitEditorTracker._updateEditorContext');
            }
        });
    }
    _updateBlameability(blameable, force = false) {
        if (!force && this._isBlameable === blameable)
            return;
        try {
            constants_1.setCommandContext(constants_1.CommandContext.IsBlameable, blameable);
            this._onDidChangeBlameability.fire({
                blameable: blameable,
                editor: this._editor
            });
        }
        catch (ex) {
            logger_1.Logger.error(ex, 'GitEditorTracker._updateBlameability');
        }
    }
}
exports.GitContextTracker = GitContextTracker;
//# sourceMappingURL=gitContextTracker.js.map