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
const system_1 = require("./system");
const vscode_1 = require("vscode");
const annotationController_1 = require("./annotations/annotationController");
const annotations_1 = require("./annotations/annotations");
const commands_1 = require("./commands");
const comparers_1 = require("./comparers");
const configuration_1 = require("./configuration");
const constants_1 = require("./constants");
const gitService_1 = require("./gitService");
const logger_1 = require("./logger");
const annotationDecoration = vscode_1.window.createTextEditorDecorationType({
    after: {
        margin: '0 0 0 3em',
        textDecoration: 'none'
    }
});
var LineAnnotationType;
(function (LineAnnotationType) {
    LineAnnotationType["Trailing"] = "trailing";
    LineAnnotationType["Hover"] = "hover";
})(LineAnnotationType = exports.LineAnnotationType || (exports.LineAnnotationType = {}));
class CurrentLineController extends vscode_1.Disposable {
    constructor(context, git, gitContextTracker, annotationController) {
        super(() => this.dispose());
        this.git = git;
        this.gitContextTracker = gitContextTracker;
        this.annotationController = annotationController;
        this._blameLineAnnotationState = undefined;
        this._currentLine = -1;
        this._isAnnotating = false;
        this._updateBlameDebounced = system_1.Functions.debounce(this._updateBlame, 250);
        this._onConfigurationChanged();
        const subscriptions = [
            vscode_1.workspace.onDidChangeConfiguration(this._onConfigurationChanged, this),
            git.onDidChangeGitCache(this._onGitCacheChanged, this),
            annotationController.onDidToggleAnnotations(this._onFileAnnotationsToggled, this),
            vscode_1.debug.onDidStartDebugSession(this._onDebugSessionStarted, this)
        ];
        this._disposable = vscode_1.Disposable.from(...subscriptions);
    }
    dispose() {
        this._clearAnnotations(this._editor, true);
        this._trackCurrentLineDisposable && this._trackCurrentLineDisposable.dispose();
        this._statusBarItem && this._statusBarItem.dispose();
        this._debugSessionEndDisposable && this._debugSessionEndDisposable.dispose();
        this._disposable && this._disposable.dispose();
    }
    _onConfigurationChanged() {
        const cfg = vscode_1.workspace.getConfiguration().get(constants_1.ExtensionKey);
        let changed = false;
        if (!system_1.Objects.areEquivalent(cfg.blame.line, this._config && this._config.blame.line)) {
            changed = true;
            this._blameLineAnnotationState = undefined;
            this._clearAnnotations(this._editor);
        }
        if (!system_1.Objects.areEquivalent(cfg.annotations.line.trailing, this._config && this._config.annotations.line.trailing) ||
            !system_1.Objects.areEquivalent(cfg.annotations.line.hover, this._config && this._config.annotations.line.hover) ||
            !system_1.Objects.areEquivalent(cfg.theme.annotations.line.trailing, this._config && this._config.theme.annotations.line.trailing)) {
            changed = true;
            this._clearAnnotations(this._editor);
        }
        if (!system_1.Objects.areEquivalent(cfg.statusBar, this._config && this._config.statusBar)) {
            changed = true;
            if (cfg.statusBar.enabled) {
                const alignment = cfg.statusBar.alignment !== 'left' ? vscode_1.StatusBarAlignment.Right : vscode_1.StatusBarAlignment.Left;
                if (this._statusBarItem !== undefined && this._statusBarItem.alignment !== alignment) {
                    this._statusBarItem.dispose();
                    this._statusBarItem = undefined;
                }
                this._statusBarItem = this._statusBarItem || vscode_1.window.createStatusBarItem(alignment, alignment === vscode_1.StatusBarAlignment.Right ? 1000 : 0);
                this._statusBarItem.command = cfg.statusBar.command;
            }
            else if (!cfg.statusBar.enabled && this._statusBarItem) {
                this._statusBarItem.dispose();
                this._statusBarItem = undefined;
            }
        }
        this._config = cfg;
        if (!changed)
            return;
        const trackCurrentLine = cfg.statusBar.enabled || cfg.blame.line.enabled || (this._blameLineAnnotationState && this._blameLineAnnotationState.enabled);
        if (trackCurrentLine && !this._trackCurrentLineDisposable) {
            const subscriptions = [
                vscode_1.window.onDidChangeActiveTextEditor(this._onActiveTextEditorChanged, this),
                vscode_1.window.onDidChangeTextEditorSelection(this._onTextEditorSelectionChanged, this),
                this.gitContextTracker.onDidChangeBlameability(this._onBlameabilityChanged, this)
            ];
            this._trackCurrentLineDisposable = vscode_1.Disposable.from(...subscriptions);
        }
        else if (!trackCurrentLine && this._trackCurrentLineDisposable) {
            this._trackCurrentLineDisposable.dispose();
            this._trackCurrentLineDisposable = undefined;
        }
        this.refresh(vscode_1.window.activeTextEditor);
    }
    _onActiveTextEditorChanged(editor) {
        this.refresh(editor);
    }
    _onBlameabilityChanged(e) {
        this._blameable = e.blameable;
        if (!e.blameable || !this._editor) {
            this.clear(e.editor);
            return;
        }
        if (!comparers_1.TextEditorComparer.equals(this._editor, e.editor))
            return;
        this._updateBlameDebounced(this._editor.selection.active.line, this._editor);
    }
    _onDebugSessionStarted() {
        const state = this._blameLineAnnotationState !== undefined ? this._blameLineAnnotationState : this._config.blame.line;
        if (!state.enabled)
            return;
        this._debugSessionEndDisposable = vscode_1.debug.onDidTerminateDebugSession(this._onDebugSessionEnded, this);
        this.toggleAnnotations(vscode_1.window.activeTextEditor, state.annotationType, 'debugging');
    }
    _onDebugSessionEnded() {
        this._debugSessionEndDisposable && this._debugSessionEndDisposable.dispose();
        this._debugSessionEndDisposable = undefined;
        if (this._blameLineAnnotationState === undefined || this._blameLineAnnotationState.enabled || this._blameLineAnnotationState.reason !== 'debugging')
            return;
        this.toggleAnnotations(vscode_1.window.activeTextEditor, this._blameLineAnnotationState.annotationType);
    }
    _onFileAnnotationsToggled() {
        this.refresh(vscode_1.window.activeTextEditor);
    }
    _onGitCacheChanged() {
        logger_1.Logger.log('Git cache changed; resetting current line annotations');
        this.refresh(vscode_1.window.activeTextEditor);
    }
    _onTextEditorSelectionChanged(e) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._blameable || !comparers_1.TextEditorComparer.equals(this._editor, e.textEditor))
                return;
            const line = e.selections[0].active.line;
            if (line === this._currentLine)
                return;
            this._currentLine = line;
            if (!this._uri && e.textEditor !== undefined) {
                this._uri = yield gitService_1.GitUri.fromUri(e.textEditor.document.uri, this.git);
            }
            this._clearAnnotations(e.textEditor);
            this._updateBlameDebounced(line, e.textEditor);
        });
    }
    _isEditorBlameable(editor) {
        if (editor === undefined || editor.document === undefined)
            return false;
        if (!this.git.isTrackable(editor.document.uri))
            return false;
        if (editor.document.isUntitled && editor.document.uri.scheme === constants_1.DocumentSchemes.File)
            return false;
        return this.git.isEditorBlameable(editor);
    }
    _updateBlame(line, editor) {
        return __awaiter(this, void 0, void 0, function* () {
            let commit = undefined;
            let commitLine = undefined;
            if (this._blameable && line >= 0) {
                const blameLine = yield this.git.getBlameForLine(this._uri, line);
                commitLine = blameLine === undefined ? undefined : blameLine.line;
                commit = blameLine === undefined ? undefined : blameLine.commit;
            }
            if (commit !== undefined && commitLine !== undefined) {
                this.show(commit, commitLine, editor, line);
            }
            else {
                this.clear(editor);
            }
        });
    }
    clear(editor) {
        return __awaiter(this, void 0, void 0, function* () {
            this._clearAnnotations(editor, true);
            this._statusBarItem && this._statusBarItem.hide();
        });
    }
    _clearAnnotations(editor, force = false) {
        return __awaiter(this, void 0, void 0, function* () {
            if (editor === undefined || (!this._isAnnotating && !force))
                return;
            editor.setDecorations(annotationDecoration, []);
            this._isAnnotating = false;
            if (!force)
                return;
            yield system_1.Functions.wait(1);
            editor.setDecorations(annotationDecoration, []);
        });
    }
    refresh(editor) {
        return __awaiter(this, void 0, void 0, function* () {
            this._currentLine = -1;
            this._clearAnnotations(this._editor);
            if (editor === undefined || !this._isEditorBlameable(editor)) {
                this.clear(editor);
                this._editor = undefined;
                return;
            }
            this._blameable = editor !== undefined && editor.document !== undefined && !editor.document.isDirty;
            this._editor = editor;
            this._uri = yield gitService_1.GitUri.fromUri(editor.document.uri, this.git);
            const maxLines = this._config.advanced.caching.maxLines;
            if (this._config.advanced.caching.enabled && (maxLines <= 0 || editor.document.lineCount <= maxLines)) {
                this.git.getBlameForFile(this._uri);
            }
            this._updateBlameDebounced(editor.selection.active.line, editor);
        });
    }
    show(commit, blameLine, editor, line) {
        return __awaiter(this, void 0, void 0, function* () {
            if (editor.document === undefined)
                return;
            this._updateStatusBar(commit);
            yield this._updateAnnotations(commit, blameLine, editor, line);
        });
    }
    showAnnotations(editor, type, reason = 'user') {
        return __awaiter(this, void 0, void 0, function* () {
            if (editor === undefined)
                return;
            const state = this._blameLineAnnotationState !== undefined ? this._blameLineAnnotationState : this._config.blame.line;
            if (!state.enabled || state.annotationType !== type) {
                this._blameLineAnnotationState = { enabled: true, annotationType: type, reason: reason };
                yield this._clearAnnotations(editor);
                yield this._updateBlame(editor.selection.active.line, editor);
            }
        });
    }
    toggleAnnotations(editor, type, reason = 'user') {
        return __awaiter(this, void 0, void 0, function* () {
            if (editor === undefined)
                return;
            const state = this._blameLineAnnotationState !== undefined ? this._blameLineAnnotationState : this._config.blame.line;
            this._blameLineAnnotationState = { enabled: !state.enabled, annotationType: type, reason: reason };
            yield this._clearAnnotations(editor);
            yield this._updateBlame(editor.selection.active.line, editor);
        });
    }
    _updateAnnotations(commit, blameLine, editor, line) {
        return __awaiter(this, void 0, void 0, function* () {
            const cfg = this._config.blame.line;
            const state = this._blameLineAnnotationState !== undefined ? this._blameLineAnnotationState : cfg;
            if (!state.enabled)
                return;
            line = line === undefined ? blameLine.line : line;
            const decorationOptions = [];
            let showChanges = false;
            let showDetails = false;
            let showAtStart = false;
            let showStartIndex = 0;
            switch (state.annotationType) {
                case LineAnnotationType.Trailing: {
                    const cfgAnnotations = this._config.annotations.line.trailing;
                    showChanges = cfgAnnotations.hover.changes;
                    showDetails = cfgAnnotations.hover.details;
                    showStartIndex = cfgAnnotations.hover.wholeLine ? 0 : annotations_1.endOfLineIndex;
                    const decoration = annotations_1.Annotations.trailing(commit, cfgAnnotations.format, cfgAnnotations.dateFormat === null ? this._config.defaultDateFormat : cfgAnnotations.dateFormat, this._config.theme);
                    decoration.range = editor.document.validateRange(new vscode_1.Range(line, annotations_1.endOfLineIndex, line, annotations_1.endOfLineIndex));
                    decorationOptions.push(decoration);
                    break;
                }
                case LineAnnotationType.Hover: {
                    const cfgAnnotations = this._config.annotations.line.hover;
                    showChanges = cfgAnnotations.changes;
                    showDetails = cfgAnnotations.details;
                    showStartIndex = 0;
                    break;
                }
            }
            if (showDetails || showChanges) {
                const annotationType = this.annotationController.getAnnotationType(editor);
                switch (annotationType) {
                    case annotationController_1.FileAnnotationType.Gutter: {
                        const cfgHover = this._config.annotations.file.gutter.hover;
                        if (cfgHover.details) {
                            if (cfgHover.wholeLine) {
                                showStartIndex = 0;
                            }
                            else if (showStartIndex !== 0) {
                                showAtStart = true;
                            }
                        }
                        break;
                    }
                    case annotationController_1.FileAnnotationType.Hover: {
                        showStartIndex = 0;
                        break;
                    }
                    case annotationController_1.FileAnnotationType.RecentChanges: {
                        const cfgChanges = this._config.annotations.file.recentChanges.hover;
                        if (cfgChanges.details) {
                            showDetails = false;
                        }
                        if (cfgChanges.changes) {
                            showChanges = false;
                        }
                        break;
                    }
                }
                const range = editor.document.validateRange(new vscode_1.Range(line, showStartIndex, line, annotations_1.endOfLineIndex));
                if (showDetails) {
                    let logCommit = undefined;
                    if (!commit.isUncommitted) {
                        logCommit = yield this.git.getLogCommit(this._uri.repoPath, this._uri.fsPath, commit.sha);
                        if (logCommit !== undefined) {
                            logCommit.previousFileName = commit.previousFileName;
                            logCommit.previousSha = commit.previousSha;
                        }
                    }
                    const decoration = annotations_1.Annotations.detailsHover(logCommit || commit, this._config.defaultDateFormat, this.git.hasRemotes((logCommit || commit).repoPath), this._config.blame.file.annotationType);
                    decoration.range = range;
                    decorationOptions.push(decoration);
                    if (showAtStart) {
                        decorationOptions.push(annotations_1.Annotations.withRange(decoration, 0, 0));
                    }
                }
                if (showChanges) {
                    const decoration = yield annotations_1.Annotations.changesHover(commit, line, this._uri, this.git);
                    decoration.range = range;
                    decorationOptions.push(decoration);
                    if (showAtStart) {
                        decorationOptions.push(annotations_1.Annotations.withRange(decoration, 0, 0));
                    }
                }
            }
            if (decorationOptions.length) {
                editor.setDecorations(annotationDecoration, decorationOptions);
                this._isAnnotating = true;
            }
        });
    }
    _updateStatusBar(commit) {
        const cfg = this._config.statusBar;
        if (!cfg.enabled || this._statusBarItem === undefined)
            return;
        this._statusBarItem.text = `$(git-commit) ${gitService_1.CommitFormatter.fromTemplate(cfg.format, commit, {
            truncateMessageAtNewLine: true,
            dateFormat: cfg.dateFormat === null ? this._config.defaultDateFormat : cfg.dateFormat
        })}`;
        switch (cfg.command) {
            case configuration_1.StatusBarCommand.ToggleFileBlame:
                this._statusBarItem.tooltip = 'Toggle Blame Annotations';
                break;
            case configuration_1.StatusBarCommand.DiffWithPrevious:
                this._statusBarItem.command = commands_1.Commands.DiffLineWithPrevious;
                this._statusBarItem.tooltip = 'Compare Line Revision with Previous';
                break;
            case configuration_1.StatusBarCommand.DiffWithWorking:
                this._statusBarItem.command = commands_1.Commands.DiffLineWithWorking;
                this._statusBarItem.tooltip = 'Compare Line Revision with Working';
                break;
            case configuration_1.StatusBarCommand.ToggleCodeLens:
                this._statusBarItem.tooltip = 'Toggle Git CodeLens';
                break;
            case configuration_1.StatusBarCommand.ShowQuickCommitDetails:
                this._statusBarItem.tooltip = 'Show Commit Details';
                break;
            case configuration_1.StatusBarCommand.ShowQuickCommitFileDetails:
                this._statusBarItem.tooltip = 'Show Line Commit Details';
                break;
            case configuration_1.StatusBarCommand.ShowQuickFileHistory:
                this._statusBarItem.tooltip = 'Show File History';
                break;
            case configuration_1.StatusBarCommand.ShowQuickCurrentBranchHistory:
                this._statusBarItem.tooltip = 'Show Branch History';
                break;
        }
        this._statusBarItem.show();
    }
}
exports.CurrentLineController = CurrentLineController;
//# sourceMappingURL=currentLineController.js.map