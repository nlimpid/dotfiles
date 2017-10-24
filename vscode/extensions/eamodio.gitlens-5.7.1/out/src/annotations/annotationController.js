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
const system_1 = require("../system");
const vscode_1 = require("vscode");
const annotationProvider_1 = require("./annotationProvider");
const keyboard_1 = require("../keyboard");
const comparers_1 = require("../comparers");
const configuration_1 = require("../configuration");
const constants_1 = require("../constants");
const gitService_1 = require("../gitService");
const gutterBlameAnnotationProvider_1 = require("./gutterBlameAnnotationProvider");
const hoverBlameAnnotationProvider_1 = require("./hoverBlameAnnotationProvider");
const logger_1 = require("../logger");
const recentChangesAnnotationProvider_1 = require("./recentChangesAnnotationProvider");
const path = require("path");
var FileAnnotationType;
(function (FileAnnotationType) {
    FileAnnotationType["Gutter"] = "gutter";
    FileAnnotationType["Hover"] = "hover";
    FileAnnotationType["RecentChanges"] = "recentChanges";
})(FileAnnotationType = exports.FileAnnotationType || (exports.FileAnnotationType = {}));
var AnnotationClearReason;
(function (AnnotationClearReason) {
    AnnotationClearReason["User"] = "User";
    AnnotationClearReason["BlameabilityChanged"] = "BlameabilityChanged";
    AnnotationClearReason["ColumnChanged"] = "ColumnChanged";
    AnnotationClearReason["Disposing"] = "Disposing";
    AnnotationClearReason["DocumentChanged"] = "DocumentChanged";
    AnnotationClearReason["DocumentClosed"] = "DocumentClosed";
})(AnnotationClearReason = exports.AnnotationClearReason || (exports.AnnotationClearReason = {}));
var AnnotationStatus;
(function (AnnotationStatus) {
    AnnotationStatus["Computing"] = "computing";
    AnnotationStatus["Computed"] = "computed";
})(AnnotationStatus || (AnnotationStatus = {}));
exports.Decorations = {
    blameAnnotation: vscode_1.window.createTextEditorDecorationType({
        isWholeLine: true,
        textDecoration: 'none'
    }),
    blameHighlight: undefined,
    recentChangesAnnotation: undefined,
    recentChangesHighlight: undefined
};
class AnnotationController extends vscode_1.Disposable {
    constructor(context, git, gitContextTracker) {
        super(() => this.dispose());
        this.context = context;
        this.git = git;
        this.gitContextTracker = gitContextTracker;
        this._onDidToggleAnnotations = new vscode_1.EventEmitter();
        this._annotationProviders = new Map();
        this._keyboardScope = undefined;
        this._onConfigurationChanged();
        const subscriptions = [
            vscode_1.workspace.onDidChangeConfiguration(this._onConfigurationChanged, this)
        ];
        this._disposable = vscode_1.Disposable.from(...subscriptions);
    }
    get onDidToggleAnnotations() {
        return this._onDidToggleAnnotations.event;
    }
    dispose() {
        this._annotationProviders.forEach((p, key) => __awaiter(this, void 0, void 0, function* () { return yield this.clearCore(key, AnnotationClearReason.Disposing); }));
        exports.Decorations.blameAnnotation && exports.Decorations.blameAnnotation.dispose();
        exports.Decorations.blameHighlight && exports.Decorations.blameHighlight.dispose();
        this._annotationsDisposable && this._annotationsDisposable.dispose();
        this._disposable && this._disposable.dispose();
    }
    _onConfigurationChanged() {
        let changed = false;
        const cfg = vscode_1.workspace.getConfiguration().get(configuration_1.ExtensionKey);
        const cfgBlameHighlight = cfg.blame.file.lineHighlight;
        const cfgChangesHighlight = cfg.recentChanges.file.lineHighlight;
        const cfgTheme = cfg.theme.lineHighlight;
        if (!system_1.Objects.areEquivalent(cfgBlameHighlight, this._config && this._config.blame.file.lineHighlight) ||
            !system_1.Objects.areEquivalent(cfgChangesHighlight, this._config && this._config.recentChanges.file.lineHighlight) ||
            !system_1.Objects.areEquivalent(cfgTheme, this._config && this._config.theme.lineHighlight)) {
            changed = true;
            exports.Decorations.blameHighlight && exports.Decorations.blameHighlight.dispose();
            if (cfgBlameHighlight.enabled) {
                exports.Decorations.blameHighlight = vscode_1.window.createTextEditorDecorationType({
                    gutterIconSize: 'contain',
                    isWholeLine: true,
                    overviewRulerLane: vscode_1.OverviewRulerLane.Right,
                    dark: {
                        backgroundColor: cfgBlameHighlight.locations.includes(configuration_1.LineHighlightLocations.Line)
                            ? cfgTheme.dark.backgroundColor || configuration_1.themeDefaults.lineHighlight.dark.backgroundColor
                            : undefined,
                        gutterIconPath: cfgBlameHighlight.locations.includes(configuration_1.LineHighlightLocations.Gutter)
                            ? this.context.asAbsolutePath('images/dark/highlight-gutter.svg')
                            : undefined,
                        overviewRulerColor: cfgBlameHighlight.locations.includes(configuration_1.LineHighlightLocations.OverviewRuler)
                            ? cfgTheme.dark.overviewRulerColor || configuration_1.themeDefaults.lineHighlight.dark.overviewRulerColor
                            : undefined
                    },
                    light: {
                        backgroundColor: cfgBlameHighlight.locations.includes(configuration_1.LineHighlightLocations.Line)
                            ? cfgTheme.light.backgroundColor || configuration_1.themeDefaults.lineHighlight.light.backgroundColor
                            : undefined,
                        gutterIconPath: cfgBlameHighlight.locations.includes(configuration_1.LineHighlightLocations.Gutter)
                            ? this.context.asAbsolutePath('images/light/highlight-gutter.svg')
                            : undefined,
                        overviewRulerColor: cfgBlameHighlight.locations.includes(configuration_1.LineHighlightLocations.OverviewRuler)
                            ? cfgTheme.light.overviewRulerColor || configuration_1.themeDefaults.lineHighlight.light.overviewRulerColor
                            : undefined
                    }
                });
            }
            else {
                exports.Decorations.blameHighlight = undefined;
            }
            exports.Decorations.recentChangesHighlight && exports.Decorations.recentChangesHighlight.dispose();
            exports.Decorations.recentChangesHighlight = vscode_1.window.createTextEditorDecorationType({
                gutterIconSize: 'contain',
                isWholeLine: true,
                overviewRulerLane: vscode_1.OverviewRulerLane.Right,
                dark: {
                    backgroundColor: cfgChangesHighlight.locations.includes(configuration_1.LineHighlightLocations.Line)
                        ? cfgTheme.dark.backgroundColor || configuration_1.themeDefaults.lineHighlight.dark.backgroundColor
                        : undefined,
                    gutterIconPath: cfgChangesHighlight.locations.includes(configuration_1.LineHighlightLocations.Gutter)
                        ? this.context.asAbsolutePath('images/dark/highlight-gutter.svg')
                        : undefined,
                    overviewRulerColor: cfgChangesHighlight.locations.includes(configuration_1.LineHighlightLocations.OverviewRuler)
                        ? cfgTheme.dark.overviewRulerColor || configuration_1.themeDefaults.lineHighlight.dark.overviewRulerColor
                        : undefined
                },
                light: {
                    backgroundColor: cfgChangesHighlight.locations.includes(configuration_1.LineHighlightLocations.Line)
                        ? cfgTheme.light.backgroundColor || configuration_1.themeDefaults.lineHighlight.light.backgroundColor
                        : undefined,
                    gutterIconPath: cfgChangesHighlight.locations.includes(configuration_1.LineHighlightLocations.Gutter)
                        ? this.context.asAbsolutePath('images/light/highlight-gutter.svg')
                        : undefined,
                    overviewRulerColor: cfgChangesHighlight.locations.includes(configuration_1.LineHighlightLocations.OverviewRuler)
                        ? cfgTheme.light.overviewRulerColor || configuration_1.themeDefaults.lineHighlight.light.overviewRulerColor
                        : undefined
                }
            });
        }
        if (!system_1.Objects.areEquivalent(cfg.blame.file, this._config && this._config.blame.file) ||
            !system_1.Objects.areEquivalent(cfg.recentChanges.file, this._config && this._config.recentChanges.file) ||
            !system_1.Objects.areEquivalent(cfg.annotations, this._config && this._config.annotations) ||
            !system_1.Objects.areEquivalent(cfg.theme.annotations, this._config && this._config.theme.annotations)) {
            changed = true;
        }
        this._config = cfg;
        if (changed) {
            for (const provider of this._annotationProviders.values()) {
                if (provider === undefined)
                    continue;
                if (provider.annotationType === FileAnnotationType.RecentChanges) {
                    provider.reset(exports.Decorations.recentChangesAnnotation, exports.Decorations.recentChangesHighlight);
                }
                else {
                    if (provider.annotationType === this._config.blame.file.annotationType) {
                        provider.reset(exports.Decorations.blameAnnotation, exports.Decorations.blameHighlight);
                    }
                    else {
                        this.showAnnotations(provider.editor, cfg.blame.file.annotationType);
                    }
                }
            }
        }
    }
    _onActiveTextEditorChanged(e) {
        return __awaiter(this, void 0, void 0, function* () {
            const provider = this.getProvider(e);
            if (provider === undefined) {
                yield constants_1.setCommandContext(constants_1.CommandContext.AnnotationStatus, undefined);
                yield this.detachKeyboardHook();
            }
            else {
                yield constants_1.setCommandContext(constants_1.CommandContext.AnnotationStatus, AnnotationStatus.Computed);
                yield this.attachKeyboardHook();
            }
        });
    }
    _onBlameabilityChanged(e) {
        if (e.blameable || e.editor === undefined)
            return;
        this.clear(e.editor, AnnotationClearReason.BlameabilityChanged);
    }
    _onTextDocumentChanged(e) {
        for (const [key, p] of this._annotationProviders) {
            if (!comparers_1.TextDocumentComparer.equals(p.document, e.document))
                continue;
            setTimeout(() => {
                if (e.document.isDirty)
                    return;
                this.clearCore(key, AnnotationClearReason.DocumentChanged);
            }, 1);
        }
    }
    _onTextDocumentClosed(e) {
        for (const [key, p] of this._annotationProviders) {
            if (!comparers_1.TextDocumentComparer.equals(p.document, e))
                continue;
            this.clearCore(key, AnnotationClearReason.DocumentClosed);
        }
    }
    _onTextEditorViewColumnChanged(e) {
        const provider = this.getProvider(e.textEditor);
        if (provider === undefined) {
            const fuzzyProvider = system_1.Iterables.find(this._annotationProviders.values(), p => p.editor.document === e.textEditor.document);
            if (fuzzyProvider == null)
                return;
            this.clearCore(fuzzyProvider.correlationKey, AnnotationClearReason.ColumnChanged);
            return;
        }
        provider.restore(e.textEditor);
    }
    _onVisibleTextEditorsChanged(editors) {
        return __awaiter(this, void 0, void 0, function* () {
            let provider;
            for (const e of editors) {
                provider = this.getProvider(e);
                if (provider === undefined)
                    continue;
                provider.restore(e);
            }
        });
    }
    attachKeyboardHook() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._keyboardScope === undefined) {
                this._keyboardScope = yield keyboard_1.Keyboard.instance.beginScope({
                    escape: {
                        onDidPressKey: (key) => __awaiter(this, void 0, void 0, function* () {
                            const e = vscode_1.window.activeTextEditor;
                            if (e === undefined)
                                return undefined;
                            yield this.clear(e, AnnotationClearReason.User);
                            return undefined;
                        })
                    }
                });
            }
        });
    }
    detachKeyboardHook() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._keyboardScope === undefined)
                return;
            yield this._keyboardScope.dispose();
            this._keyboardScope = undefined;
        });
    }
    clear(editor, reason = AnnotationClearReason.User) {
        return __awaiter(this, void 0, void 0, function* () {
            this.clearCore(annotationProvider_1.AnnotationProviderBase.getCorrelationKey(editor), reason);
        });
    }
    clearCore(key, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            const provider = this._annotationProviders.get(key);
            if (provider === undefined)
                return;
            logger_1.Logger.log(`${reason}:`, `Clear annotations for ${key}`);
            this._annotationProviders.delete(key);
            yield provider.dispose();
            if (key === annotationProvider_1.AnnotationProviderBase.getCorrelationKey(vscode_1.window.activeTextEditor)) {
                yield constants_1.setCommandContext(constants_1.CommandContext.AnnotationStatus, undefined);
                yield this.detachKeyboardHook();
            }
            if (this._annotationProviders.size === 0) {
                logger_1.Logger.log(`Remove all listener registrations for annotations`);
                this._annotationsDisposable && this._annotationsDisposable.dispose();
                this._annotationsDisposable = undefined;
            }
            this._onDidToggleAnnotations.fire();
        });
    }
    getAnnotationType(editor) {
        const provider = this.getProvider(editor);
        return provider !== undefined && this.git.isEditorBlameable(editor) ? provider.annotationType : undefined;
    }
    getProvider(editor) {
        if (editor === undefined || editor.document === undefined)
            return undefined;
        return this._annotationProviders.get(annotationProvider_1.AnnotationProviderBase.getCorrelationKey(editor));
    }
    showAnnotations(editor, type, shaOrLine) {
        return __awaiter(this, void 0, void 0, function* () {
            if (editor === undefined || editor.document === undefined || !this.git.isEditorBlameable(editor))
                return false;
            const currentProvider = this.getProvider(editor);
            if (currentProvider !== undefined && currentProvider.annotationType === type) {
                yield currentProvider.selection(shaOrLine);
                return true;
            }
            return vscode_1.window.withProgress({ location: vscode_1.ProgressLocation.Window }, (progress) => __awaiter(this, void 0, void 0, function* () {
                const active = editor === vscode_1.window.activeTextEditor;
                yield constants_1.setCommandContext(constants_1.CommandContext.AnnotationStatus, active ? AnnotationStatus.Computing : undefined);
                const computingAnnotations = this.showAnnotationsCore(currentProvider, editor, type, shaOrLine, progress);
                const result = yield computingAnnotations;
                if (active) {
                    yield constants_1.setCommandContext(constants_1.CommandContext.AnnotationStatus, result ? AnnotationStatus.Computed : undefined);
                }
                return computingAnnotations;
            }));
        });
    }
    showAnnotationsCore(currentProvider, editor, type, shaOrLine, progress) {
        return __awaiter(this, void 0, void 0, function* () {
            if (progress !== undefined) {
                let annotationsLabel = 'annotations';
                switch (type) {
                    case FileAnnotationType.Gutter:
                    case FileAnnotationType.Hover:
                        annotationsLabel = 'blame annotations';
                        break;
                    case FileAnnotationType.RecentChanges:
                        annotationsLabel = 'recent changes annotations';
                        break;
                }
                progress.report({ message: `Computing ${annotationsLabel} for ${path.basename(editor.document.fileName)}` });
            }
            this.attachKeyboardHook();
            const gitUri = yield gitService_1.GitUri.fromUri(editor.document.uri, this.git);
            let provider = undefined;
            switch (type) {
                case FileAnnotationType.Gutter:
                    provider = new gutterBlameAnnotationProvider_1.GutterBlameAnnotationProvider(this.context, editor, exports.Decorations.blameAnnotation, exports.Decorations.blameHighlight, this.git, gitUri);
                    break;
                case FileAnnotationType.Hover:
                    provider = new hoverBlameAnnotationProvider_1.HoverBlameAnnotationProvider(this.context, editor, exports.Decorations.blameAnnotation, exports.Decorations.blameHighlight, this.git, gitUri);
                    break;
                case FileAnnotationType.RecentChanges:
                    provider = new recentChangesAnnotationProvider_1.RecentChangesAnnotationProvider(this.context, editor, undefined, exports.Decorations.recentChangesHighlight, this.git, gitUri);
                    break;
            }
            if (provider === undefined || !(yield provider.validate()))
                return false;
            if (currentProvider !== undefined) {
                yield this.clearCore(currentProvider.correlationKey, AnnotationClearReason.User);
            }
            if (!this._annotationsDisposable && this._annotationProviders.size === 0) {
                logger_1.Logger.log(`Add listener registrations for annotations`);
                const subscriptions = [
                    vscode_1.window.onDidChangeActiveTextEditor(this._onActiveTextEditorChanged, this),
                    vscode_1.window.onDidChangeTextEditorViewColumn(this._onTextEditorViewColumnChanged, this),
                    vscode_1.window.onDidChangeVisibleTextEditors(this._onVisibleTextEditorsChanged, this),
                    vscode_1.workspace.onDidChangeTextDocument(this._onTextDocumentChanged, this),
                    vscode_1.workspace.onDidCloseTextDocument(this._onTextDocumentClosed, this),
                    this.gitContextTracker.onDidChangeBlameability(this._onBlameabilityChanged, this)
                ];
                this._annotationsDisposable = vscode_1.Disposable.from(...subscriptions);
            }
            this._annotationProviders.set(provider.correlationKey, provider);
            if (yield provider.provideAnnotation(shaOrLine)) {
                this._onDidToggleAnnotations.fire();
                return true;
            }
            return false;
        });
    }
    toggleAnnotations(editor, type, shaOrLine) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!editor || !editor.document || (type === FileAnnotationType.RecentChanges ? !this.git.isTrackable(editor.document.uri) : !this.git.isEditorBlameable(editor)))
                return false;
            const provider = this.getProvider(editor);
            if (provider === undefined)
                return this.showAnnotations(editor, type, shaOrLine);
            const reopen = provider.annotationType !== type;
            yield this.clearCore(provider.correlationKey, AnnotationClearReason.User);
            if (!reopen)
                return false;
            return this.showAnnotations(editor, type, shaOrLine);
        });
    }
}
exports.AnnotationController = AnnotationController;
//# sourceMappingURL=annotationController.js.map