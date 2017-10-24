'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var constants_1 = require("./constants");
exports.ExtensionKey = constants_1.ExtensionKey;
var CodeLensCommand;
(function (CodeLensCommand) {
    CodeLensCommand["DiffWithPrevious"] = "gitlens.diffWithPrevious";
    CodeLensCommand["ShowQuickCommitDetails"] = "gitlens.showQuickCommitDetails";
    CodeLensCommand["ShowQuickCommitFileDetails"] = "gitlens.showQuickCommitFileDetails";
    CodeLensCommand["ShowQuickCurrentBranchHistory"] = "gitlens.showQuickRepoHistory";
    CodeLensCommand["ShowQuickFileHistory"] = "gitlens.showQuickFileHistory";
    CodeLensCommand["ToggleFileBlame"] = "gitlens.toggleFileBlame";
})(CodeLensCommand = exports.CodeLensCommand || (exports.CodeLensCommand = {}));
var CodeLensLocations;
(function (CodeLensLocations) {
    CodeLensLocations["Document"] = "document";
    CodeLensLocations["Containers"] = "containers";
    CodeLensLocations["Blocks"] = "blocks";
})(CodeLensLocations = exports.CodeLensLocations || (exports.CodeLensLocations = {}));
var LineHighlightLocations;
(function (LineHighlightLocations) {
    LineHighlightLocations["Gutter"] = "gutter";
    LineHighlightLocations["Line"] = "line";
    LineHighlightLocations["OverviewRuler"] = "overviewRuler";
})(LineHighlightLocations = exports.LineHighlightLocations || (exports.LineHighlightLocations = {}));
var CustomRemoteType;
(function (CustomRemoteType) {
    CustomRemoteType["Bitbucket"] = "Bitbucket";
    CustomRemoteType["BitbucketServer"] = "BitbucketServer";
    CustomRemoteType["Custom"] = "Custom";
    CustomRemoteType["GitHub"] = "GitHub";
    CustomRemoteType["GitLab"] = "GitLab";
})(CustomRemoteType = exports.CustomRemoteType || (exports.CustomRemoteType = {}));
var GitExplorerFilesLayout;
(function (GitExplorerFilesLayout) {
    GitExplorerFilesLayout["Auto"] = "auto";
    GitExplorerFilesLayout["List"] = "list";
    GitExplorerFilesLayout["Tree"] = "tree";
})(GitExplorerFilesLayout = exports.GitExplorerFilesLayout || (exports.GitExplorerFilesLayout = {}));
var StatusBarCommand;
(function (StatusBarCommand) {
    StatusBarCommand["DiffWithPrevious"] = "gitlens.diffWithPrevious";
    StatusBarCommand["DiffWithWorking"] = "gitlens.diffWithWorking";
    StatusBarCommand["ShowQuickCommitDetails"] = "gitlens.showQuickCommitDetails";
    StatusBarCommand["ShowQuickCommitFileDetails"] = "gitlens.showQuickCommitFileDetails";
    StatusBarCommand["ShowQuickCurrentBranchHistory"] = "gitlens.showQuickRepoHistory";
    StatusBarCommand["ShowQuickFileHistory"] = "gitlens.showQuickFileHistory";
    StatusBarCommand["ToggleCodeLens"] = "gitlens.toggleCodeLens";
    StatusBarCommand["ToggleFileBlame"] = "gitlens.toggleFileBlame";
})(StatusBarCommand = exports.StatusBarCommand || (exports.StatusBarCommand = {}));
exports.themeDefaults = {
    annotations: {
        file: {
            gutter: {
                separateLines: true,
                dark: {
                    backgroundColor: null,
                    foregroundColor: 'rgb(190, 190, 190)',
                    uncommittedForegroundColor: null
                },
                light: {
                    backgroundColor: null,
                    foregroundColor: 'rgb(116, 116, 116)',
                    uncommittedForegroundColor: null
                }
            }
        },
        line: {
            trailing: {
                dark: {
                    backgroundColor: null,
                    foregroundColor: 'rgba(153, 153, 153, 0.35)'
                },
                light: {
                    backgroundColor: null,
                    foregroundColor: 'rgba(153, 153, 153, 0.35)'
                }
            }
        }
    },
    lineHighlight: {
        dark: {
            backgroundColor: 'rgba(0, 188, 242, 0.2)',
            overviewRulerColor: 'rgba(0, 188, 242, 0.6)'
        },
        light: {
            backgroundColor: 'rgba(0, 188, 242, 0.2)',
            overviewRulerColor: 'rgba(0, 188, 242, 0.6)'
        }
    }
};
//# sourceMappingURL=configuration.js.map