'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
const system_1 = require("../system");
const gitLocator_1 = require("./gitLocator");
const logger_1 = require("../logger");
const spawn_rx_1 = require("spawn-rx");
const fs = require("fs");
const path = require("path");
const tmp = require("tmp");
const iconv = require("iconv-lite");
__export(require("./models/models"));
__export(require("./parsers/blameParser"));
__export(require("./parsers/branchParser"));
__export(require("./parsers/diffParser"));
__export(require("./parsers/logParser"));
__export(require("./parsers/remoteParser"));
__export(require("./parsers/stashParser"));
__export(require("./parsers/statusParser"));
__export(require("./remotes/provider"));
let git;
const defaultBlameParams = [`blame`, `--root`, `--incremental`];
const defaultLogParams = [`log`, `--name-status`, `--full-history`, `-M`, `--format=%H -%nauthor %an%nauthor-date %at%nparents %P%nsummary %B%nfilename ?`];
const defaultStashParams = [`stash`, `list`, `--name-status`, `--full-history`, `-M`, `--format=%H -%nauthor-date %at%nreflog-selector %gd%nsummary %B%nfilename ?`];
let defaultEncoding = 'utf8';
function setDefaultEncoding(encoding) {
    defaultEncoding = iconv.encodingExists(encoding) ? encoding : 'utf8';
}
exports.setDefaultEncoding = setDefaultEncoding;
const GitWarnings = [
    /Not a git repository/,
    /is outside repository/,
    /no such path/,
    /does not have any commits/,
    /Path \'.*?\' does not exist in/,
    /Path \'.*?\' exists on disk, but not in/,
    /no upstream configured for branch/
];
function gitCommand(options, ...args) {
    return __awaiter(this, void 0, void 0, function* () {
        if (options.overrideErrorHandling)
            return gitCommandCore(options, ...args);
        try {
            return yield gitCommandCore(options, ...args);
        }
        catch (ex) {
            return gitCommandDefaultErrorHandler(ex, options, ...args);
        }
    });
}
function gitCommandCore(options, ...args) {
    return __awaiter(this, void 0, void 0, function* () {
        args.splice(0, 0, '-c', 'core.quotepath=false', '-c', 'color.ui=false');
        logger_1.Logger.log('git', ...args, `  cwd='${options.cwd}'`);
        const opts = Object.assign({ encoding: 'utf8' }, options);
        const s = yield spawn_rx_1.spawnPromise(git.path, args, {
            cwd: options.cwd,
            env: options.env || process.env,
            encoding: (opts.encoding === 'utf8') ? 'utf8' : 'binary'
        });
        if (opts.encoding === 'utf8' || opts.encoding === 'binary')
            return s;
        return iconv.decode(Buffer.from(s, 'binary'), opts.encoding);
    });
}
function gitCommandDefaultErrorHandler(ex, options, ...args) {
    const msg = ex && ex.toString();
    if (msg) {
        for (const warning of GitWarnings) {
            if (warning.test(msg)) {
                logger_1.Logger.warn('git', ...args, `  cwd='${options.cwd}'`, msg && `\n  ${msg.replace(/\r?\n|\r/g, ' ')}`);
                return '';
            }
        }
    }
    logger_1.Logger.error(ex, 'git', ...args, `  cwd='${options.cwd}'`, msg && `\n  ${msg.replace(/\r?\n|\r/g, ' ')}`);
    throw ex;
}
class Git {
    static gitInfo() {
        return git;
    }
    static getGitPath(gitPath) {
        return __awaiter(this, void 0, void 0, function* () {
            git = yield gitLocator_1.findGitPath(gitPath);
            logger_1.Logger.log(`Git found: ${git.version} @ ${git.path === 'git' ? 'PATH' : git.path}`);
            return git;
        });
    }
    static getRepoPath(cwd) {
        return __awaiter(this, void 0, void 0, function* () {
            if (cwd === undefined)
                return '';
            const data = yield gitCommand({ cwd }, 'rev-parse', '--show-toplevel');
            if (!data)
                return '';
            return data.replace(/\r?\n|\r/g, '').replace(/\\/g, '/');
        });
    }
    static getVersionedFile(repoPath, fileName, branchOrSha) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield Git.show(repoPath, fileName, branchOrSha, 'binary');
            if (data === undefined)
                return undefined;
            const suffix = system_1.Strings.truncate(system_1.Strings.sanitizeForFS(Git.isSha(branchOrSha) ? Git.shortenSha(branchOrSha) : branchOrSha), 50, '');
            const ext = path.extname(fileName);
            return new Promise((resolve, reject) => {
                tmp.file({ prefix: `${path.basename(fileName, ext)}-${suffix}__`, postfix: ext }, (err, destination, fd, cleanupCallback) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    logger_1.Logger.log(`getVersionedFile('${repoPath}', '${fileName}', ${branchOrSha}); destination=${destination}`);
                    fs.appendFile(destination, data, { encoding: 'binary' }, err => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve(destination);
                    });
                });
            });
        });
    }
    static isSha(sha) {
        return Git.shaRegex.test(sha);
    }
    static isUncommitted(sha) {
        return Git.uncommittedRegex.test(sha);
    }
    static normalizePath(fileName, repoPath) {
        return fileName && fileName.replace(/\\/g, '/');
    }
    static shortenSha(sha) {
        const index = sha.indexOf('^');
        if (index > 6)
            return `${sha.substring(0, 6)}${sha.substring(index)}`;
        return sha.substring(0, 8);
    }
    static splitPath(fileName, repoPath, extract = true) {
        if (repoPath) {
            fileName = this.normalizePath(fileName);
            repoPath = this.normalizePath(repoPath);
            const normalizedRepoPath = (repoPath.endsWith('/') ? repoPath : `${repoPath}/`).toLowerCase();
            if (fileName.toLowerCase().startsWith(normalizedRepoPath)) {
                fileName = fileName.substring(normalizedRepoPath.length);
            }
        }
        else {
            repoPath = this.normalizePath(extract ? path.dirname(fileName) : repoPath);
            fileName = this.normalizePath(extract ? path.basename(fileName) : fileName);
        }
        return [fileName, repoPath];
    }
    static validateVersion(major, minor) {
        const [gitMajor, gitMinor] = git.version.split('.');
        return (parseInt(gitMajor, 10) >= major && parseInt(gitMinor, 10) >= minor);
    }
    static blame(repoPath, fileName, sha, options = {}) {
        const [file, root] = Git.splitPath(fileName, repoPath);
        const params = [...defaultBlameParams];
        if (options.ignoreWhitespace) {
            params.push('-w');
        }
        if (options.startLine != null && options.endLine != null) {
            params.push(`-L ${options.startLine},${options.endLine}`);
        }
        if (sha) {
            params.push(sha);
        }
        return gitCommand({ cwd: root }, ...params, `--`, file);
    }
    static branch(repoPath, options = { all: false }) {
        const params = [`branch`, `-vv`];
        if (options.all) {
            params.push(`-a`);
        }
        return gitCommand({ cwd: repoPath }, ...params);
    }
    static branch_current(repoPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = [`rev-parse`, `--abbrev-ref`, `--symbolic-full-name`, `@`, `@{u}`];
            const opts = { cwd: repoPath, overrideErrorHandling: true };
            try {
                return yield gitCommand(opts, ...params);
            }
            catch (ex) {
                if (/no upstream configured for branch/.test(ex && ex.toString())) {
                    return ex.message.split('\n')[0];
                }
                return gitCommandDefaultErrorHandler(ex, opts, ...params);
            }
        });
    }
    static checkout(repoPath, fileName, sha) {
        const [file, root] = Git.splitPath(fileName, repoPath);
        return gitCommand({ cwd: root }, `checkout`, sha, `--`, file);
    }
    static config_get(key, repoPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield gitCommand({ cwd: repoPath || '', overrideErrorHandling: true }, `config`, `--get`, key);
            }
            catch (_a) {
                return '';
            }
        });
    }
    static diff(repoPath, fileName, sha1, sha2, encoding) {
        const params = [`diff`, `--diff-filter=M`, `-M`, `--no-ext-diff`];
        if (sha1) {
            params.push(sha1);
        }
        if (sha2) {
            params.push(sha2);
        }
        return gitCommand({ cwd: repoPath, encoding: encoding || defaultEncoding }, ...params, '--', fileName);
    }
    static diff_nameStatus(repoPath, sha1, sha2) {
        const params = [`diff`, `--name-status`, `-M`, `--no-ext-diff`];
        if (sha1) {
            params.push(sha1);
        }
        if (sha2) {
            params.push(sha2);
        }
        return gitCommand({ cwd: repoPath }, ...params);
    }
    static diff_shortstat(repoPath, sha) {
        const params = [`diff`, `--shortstat`, `--no-ext-diff`];
        if (sha) {
            params.push(sha);
        }
        return gitCommand({ cwd: repoPath }, ...params);
    }
    static difftool_dirDiff(repoPath, sha1, sha2) {
        const params = [`difftool`, `--dir-diff`, sha1];
        if (sha2) {
            params.push(sha2);
        }
        return gitCommand({ cwd: repoPath }, ...params);
    }
    static difftool_fileDiff(repoPath, fileName, staged) {
        const params = [`difftool`, `--no-prompt`];
        if (staged) {
            params.push('--staged');
        }
        params.push('--');
        params.push(fileName);
        return gitCommand({ cwd: repoPath }, ...params);
    }
    static log(repoPath, sha, maxCount, reverse = false) {
        const params = [...defaultLogParams, `-m`];
        if (maxCount && !reverse) {
            params.push(`-n${maxCount}`);
        }
        if (sha) {
            if (reverse) {
                params.push(`--reverse`);
                params.push(`--ancestry-path`);
                params.push(`${sha}..HEAD`);
            }
            else {
                params.push(sha);
            }
        }
        return gitCommand({ cwd: repoPath }, ...params);
    }
    static log_file(repoPath, fileName, sha, options = { reverse: false, skipMerges: false }) {
        const [file, root] = Git.splitPath(fileName, repoPath);
        const params = [...defaultLogParams, `--follow`];
        if (options.maxCount && !options.reverse) {
            params.push(`-n${options.maxCount}`);
        }
        if (options.skipMerges || !sha || options.maxCount > 2) {
            params.push(`--no-merges`);
        }
        else {
            params.push(`-m`);
        }
        if (sha) {
            if (options.reverse) {
                params.push(`--reverse`);
                params.push(`--ancestry-path`);
                params.push(`${sha}..HEAD`);
            }
            else {
                params.push(sha);
            }
        }
        if (options.startLine != null && options.endLine != null) {
            params.push(`-L ${options.startLine},${options.endLine}:${file}`);
        }
        params.push(`--`);
        params.push(file);
        return gitCommand({ cwd: root }, ...params);
    }
    static log_search(repoPath, search = [], maxCount) {
        const params = [...defaultLogParams, `-m`, `-i`];
        if (maxCount) {
            params.push(`-n${maxCount}`);
        }
        return gitCommand({ cwd: repoPath }, ...params, ...search);
    }
    static log_shortstat(repoPath, sha) {
        const params = [`log`, `--shortstat`, `--oneline`];
        if (sha) {
            params.push(sha);
        }
        return gitCommand({ cwd: repoPath }, ...params);
    }
    static ls_files(repoPath, fileName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield gitCommand({ cwd: repoPath, overrideErrorHandling: true }, 'ls-files', fileName);
            }
            catch (_a) {
                return '';
            }
        });
    }
    static remote(repoPath) {
        return gitCommand({ cwd: repoPath }, 'remote', '-v');
    }
    static remote_url(repoPath, remote) {
        return gitCommand({ cwd: repoPath }, 'remote', 'get-url', remote);
    }
    static show(repoPath, fileName, branchOrSha, encoding) {
        return __awaiter(this, void 0, void 0, function* () {
            const [file, root] = Git.splitPath(fileName, repoPath);
            if (Git.isUncommitted(branchOrSha))
                throw new Error(`sha=${branchOrSha} is uncommitted`);
            const opts = { cwd: root, encoding: encoding || defaultEncoding, overrideErrorHandling: true };
            const args = `${branchOrSha}:./${file}`;
            try {
                return yield gitCommand(opts, 'show', args);
            }
            catch (ex) {
                const msg = ex && ex.toString();
                if (/Path \'.*?\' does not exist in/.test(msg) || /Path \'.*?\' exists on disk, but not in /.test(msg)) {
                    return undefined;
                }
                return gitCommandDefaultErrorHandler(ex, opts, args);
            }
        });
    }
    static stash_apply(repoPath, stashName, deleteAfter) {
        if (!stashName)
            return undefined;
        return gitCommand({ cwd: repoPath }, 'stash', deleteAfter ? 'pop' : 'apply', stashName);
    }
    static stash_delete(repoPath, stashName) {
        if (!stashName)
            return undefined;
        return gitCommand({ cwd: repoPath }, 'stash', 'drop', stashName);
    }
    static stash_list(repoPath) {
        return gitCommand({ cwd: repoPath }, ...defaultStashParams);
    }
    static stash_push(repoPath, pathspecs, message) {
        const params = [`stash`, `push`, `-u`];
        if (message) {
            params.push(`-m`);
            params.push(message);
        }
        params.splice(params.length, 0, `--`, ...pathspecs);
        return gitCommand({ cwd: repoPath }, ...params);
    }
    static stash_save(repoPath, message) {
        const params = [`stash`, `save`, `-u`];
        if (message) {
            params.push(message);
        }
        return gitCommand({ cwd: repoPath }, ...params);
    }
    static status(repoPath, porcelainVersion = 1) {
        const porcelain = porcelainVersion >= 2 ? `--porcelain=v${porcelainVersion}` : '--porcelain';
        return gitCommand({ cwd: repoPath, env: Object.assign({}, process.env, { GIT_OPTIONAL_LOCKS: '0' }) }, 'status', porcelain, '--branch', '-u');
    }
    static status_file(repoPath, fileName, porcelainVersion = 1) {
        const [file, root] = Git.splitPath(fileName, repoPath);
        const porcelain = porcelainVersion >= 2 ? `--porcelain=v${porcelainVersion}` : '--porcelain';
        return gitCommand({ cwd: root, env: Object.assign({}, process.env, { GIT_OPTIONAL_LOCKS: '0' }) }, 'status', porcelain, file);
    }
}
Git.shaRegex = /^[0-9a-f]{40}(\^[0-9]*?)??( -)?$/;
Git.uncommittedRegex = /^[0]{40}(\^[0-9]*?)??$/;
exports.Git = Git;
//# sourceMappingURL=git.js.map