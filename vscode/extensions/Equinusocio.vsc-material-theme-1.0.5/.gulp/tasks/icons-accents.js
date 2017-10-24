"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const gulp = require("gulp");
const gutil = require("gulp-util");
const path = require("path");
const log_1 = require("../consts/log");
const files_1 = require("../../extensions/consts/files");
const paths_1 = require("../../extensions/consts/paths");
// import { IPackageJSON } from "../../extensions/interfaces/ipackage.json";
// import { writePackageJSON } from "../helpers/contribute-icon-theme";
const BASE_ICON_THEME_PATH = path.join(process.cwd(), paths_1.default.THEMES, './Material-Theme-Icons.json');
const DEFAULTS = require('../../extensions/defaults.json');
// const PACKAGE_JSON: IPackageJSON = require('../../package.json');
// const PACKAGE_JSON_ICON_THEME: IPackageJSONThemeIcons = {
//   id: "material-theme-icons",
//   label: "Material Theme Icons",
//   path: "./themes/Material-Theme-Icons.json"
// }
/**
 * Normalizes icon path
 * @param {string} iconPath
 * @returns {string}
 */
function normalizeIconPath(iconPath) {
    return path.join(process.cwd(), paths_1.default.ICONS, iconPath);
}
/**
 * Replaces a file name with the accented filename
 * @param {string} name
 * @param {string} accentName
 * @returns {string}
 */
function replaceNameWithAccent(name, accentName) {
    return name.replace('.svg', `.accent.${accentName}.svg`);
}
/**
 * Replaces a SVG colour
 *
 * @param {string} filecontent
 * @param {string} colour
 * @returns {string}
 */
function replaceSVGColour(filecontent, colour) {
    return filecontent.replace(new RegExp('.st0\{fill:#([a-zA-Z0-9]{6})\}|path fill="#([a-zA-Z0-9]{6})"'), ($0, $1, $2) => {
        colour = colour.replace('#', '');
        if (!$2) {
            return $0.replace($1, colour);
        }
        else {
            return $0.replace($2, colour);
        }
    });
}
exports.replaceSVGColour = replaceSVGColour;
/**
 * Replaces white spaces in accents' names
 * @param {string} input
 * @returns {string}
 */
function replaceWhiteSpaces(input) {
    return input.replace(/\s+/g, '-');
}
/**
 * Writes a new svg file
 * @param {string} fromFile
 * @param {string} toFile
 * @param {string} accentColour
 */
function writeSVGIcon(fromFile, toFile, accent) {
    let fileContent = fs.readFileSync(normalizeIconPath(fromFile), files_1.CHARSET);
    let content = replaceSVGColour(fileContent, DEFAULTS.accents[accent]);
    toFile = normalizeIconPath(toFile);
    fs.writeFileSync(toFile, content);
}
// Exports task to index.ts
exports.default = gulp.task('build:icons.accents', cb => {
    let basetheme;
    // PACKAGE_JSON.contributes.iconThemes = [ PACKAGE_JSON_ICON_THEME ];
    try {
        basetheme = require(BASE_ICON_THEME_PATH);
        Object.keys(DEFAULTS.accents).forEach(key => {
            let iconName = replaceWhiteSpaces(key);
            let themecopy = JSON.parse(JSON.stringify(basetheme));
            let themePath = path.join(paths_1.default.THEMES, `./Material-Theme-Icons-${key}.json`);
            // let id: string = `${ PACKAGE_JSON_ICON_THEME.id }-${ key.replace(/\s+/g, '-').toLowerCase() }`;
            // let label: string = `${ PACKAGE_JSON_ICON_THEME.label } - ${ key } accent`;
            // let themepathJSON: string = `./${ themePath }`;
            themecopy.iconDefinitions._folder_open.iconPath = replaceNameWithAccent(basetheme.iconDefinitions._folder_open.iconPath, iconName);
            themecopy.iconDefinitions._folder_open_build.iconPath = replaceNameWithAccent(basetheme.iconDefinitions._folder_open_build.iconPath, iconName);
            writeSVGIcon(basetheme.iconDefinitions._folder_open.iconPath, themecopy.iconDefinitions._folder_open.iconPath, key);
            writeSVGIcon(basetheme.iconDefinitions._folder_open_build.iconPath, themecopy.iconDefinitions._folder_open_build.iconPath, key);
            // fs.writeFileSync(themePath, JSON.stringify(themecopy));
            // addContributeIconTheme(id, label, themepathJSON, PACKAGE_JSON);
            gutil.log(gutil.colors.green(log_1.MESSAGE_GENERATED, themePath));
        });
        // writePackageJSON(PACKAGE_JSON);
    }
    catch (error) {
        // http://ragefaces.memesoftware.com/faces/large/misc-le-fu-l.png
        gutil.log(gutil.colors.red(log_1.MESSAGE_ICON_ACCENTS_ERROR));
        cb(error);
        return;
    }
    cb();
});
//# sourceMappingURL=icons-accents.js.map