"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const fs_1 = require("../../helpers/fs");
const vscode_1 = require("../../helpers/vscode");
const settings_1 = require("../../helpers/settings");
const files_1 = require("../../consts/files");
exports.THEME_ICONS = () => {
    let deferred = {};
    let promise = new Promise((resolve, reject) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
    });
    let themeIconsID = vscode_1.getCurrentThemeIconsID();
    if (settings_1.isMaterialThemeIcons(themeIconsID)) {
        let customSettings = settings_1.getCustomSettings();
        let defaults = fs_1.getDefaultValues();
        let accentName = customSettings.accent;
        let variantName = customSettings.themeColours === undefined ? '' : customSettings.themeColours;
        let themeContribute = fs_1.getThemeIconsContribute(themeIconsID);
        let theme = fs_1.getThemeIconsByContributeID(themeIconsID);
        let themepath = fs_1.getAbsolutePath(themeContribute.path);
        if (settings_1.isAccent(accentName, defaults)) {
            let _accentName = accentName.replace(/\s+/, '-');
            theme.iconDefinitions._folder_open.iconPath = defaults.icons.theme.iconDefinitions._folder_open.iconPath.replace('.svg', `.accent.${_accentName}.svg`);
            theme.iconDefinitions._folder_open_build.iconPath = defaults.icons.theme.iconDefinitions._folder_open_build.iconPath.replace('.svg', `.accent.${_accentName}.svg`);
        }
        else {
            theme.iconDefinitions._folder_open.iconPath = defaults.icons.theme.iconDefinitions._folder_open.iconPath;
            theme.iconDefinitions._folder_open_build.iconPath = defaults.icons.theme.iconDefinitions._folder_open_build.iconPath;
        }
        theme.iconDefinitions._folder_dark.iconPath = defaults.icons.theme.iconDefinitions._folder_dark.iconPath.replace('.svg', `${variantName}.svg`);
        theme.iconDefinitions._file_folder.iconPath = defaults.icons.theme.iconDefinitions._file_folder.iconPath.replace('.svg', `${variantName}.svg`);
        theme.iconDefinitions._folder_dark_build.iconPath = defaults.icons.theme.iconDefinitions._folder_dark_build.iconPath.replace('.svg', `${variantName}.svg`);
        theme.iconDefinitions["_file_folder-build"].iconPath = defaults.icons.theme.iconDefinitions["_file_folder-build"].iconPath.replace('.svg', `${variantName}.svg`);
        fs.writeFile(themepath, JSON.stringify(theme), { encoding: files_1.CHARSET }, (error) => {
            if (error) {
                deferred.reject(error);
                return;
            }
            deferred.resolve();
        });
    }
    else {
        deferred.resolve();
    }
    return promise;
};
//# sourceMappingURL=index.js.map