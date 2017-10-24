"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const gulp = require("gulp");
const gutil = require("gulp-util");
const mustache = require("mustache");
const path = require("path");
const log_1 = require("./../consts/log");
const files_1 = require("../../extensions/consts/files");
const paths_1 = require("../../extensions/consts/paths");
/**
 * Returns an object implementing the IIcon interface
 * @param {string} fileName
 * @returns {IIcon}
 */
function iconFactory(fileName) {
    let name = path.basename(fileName, path.extname(fileName));
    let last = false;
    return { name, last };
}
/**
 * > Build Icons
 * @returns {gulp.Gulp}
 */
exports.default = gulp.task('build:icons', cb => {
    let contents;
    let fileNames = fs.readdirSync(path.join(paths_1.default.SRC, `./icons/svgs`));
    let icons = fileNames.map(fileName => iconFactory(fileName));
    let partials = fs.readdirSync(path.join(paths_1.default.SRC, `./icons/partials`));
    let partialsData = {};
    let pathTemp = './themes/.material-theme-icons.tmp';
    icons[icons.length - 1].last = true;
    partials.forEach(partial => {
        partialsData[path.basename(partial, path.extname(partial))] = fs.readFileSync(path.join(paths_1.default.SRC, `./icons/partials`, `./${partial}`), files_1.CHARSET);
    });
    contents = mustache.render(fs.readFileSync(path.join(paths_1.default.SRC, `./icons/icons-theme.json`), files_1.CHARSET), { icons }, partialsData);
    try {
        contents = JSON.stringify(JSON.parse(contents), null, 2);
    }
    catch (error) {
        gutil.log(gutil.colors.red(log_1.MESSAGE_ICON_ERROR), error);
        cb(error);
        return;
    }
    fs.writeFileSync(pathTemp, contents, { encoding: files_1.CHARSET });
    gutil.log(gutil.colors.gray(log_1.HR));
    gutil.log(log_1.MESSAGE_GENERATED, gutil.colors.green(pathTemp));
    gutil.log(gutil.colors.gray(log_1.HR));
    cb();
});
//# sourceMappingURL=icons.js.map