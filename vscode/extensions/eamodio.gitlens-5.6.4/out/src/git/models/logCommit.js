'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const commit_1 = require("./commit");
const git_1 = require("../git");
const path = require("path");
class GitLogCommit extends commit_1.GitCommit {
    constructor(type, repoPath, sha, fileName, author, date, message, status, fileStatuses, originalFileName, previousSha, previousFileName) {
        super(type, repoPath, sha, fileName, author, date, message, originalFileName, previousSha, previousFileName);
        this.fileNames = this.fileName;
        if (fileStatuses) {
            this.fileStatuses = fileStatuses.filter(_ => !!_.fileName);
            const fileStatus = this.fileStatuses[0];
            this.fileName = fileStatus.fileName;
            this.status = fileStatus.status;
        }
        else {
            if (fileName === undefined) {
                this.fileStatuses = [];
            }
            else {
                this.fileStatuses = [{ status: status, fileName: fileName, originalFileName: originalFileName }];
            }
            this.status = status;
        }
    }
    get isMerge() {
        return this.parentShas && this.parentShas.length > 1;
    }
    get nextShortSha() {
        return this.nextSha && git_1.Git.shortenSha(this.nextSha);
    }
    get nextUri() {
        return this.nextFileName ? vscode_1.Uri.file(path.resolve(this.repoPath, this.nextFileName)) : this.uri;
    }
    getDiffStatus() {
        const added = this.fileStatuses.filter(_ => _.status === 'A' || _.status === '?').length;
        const deleted = this.fileStatuses.filter(_ => _.status === 'D').length;
        const changed = this.fileStatuses.filter(_ => _.status !== 'A' && _.status !== '?' && _.status !== 'D').length;
        return `+${added} ~${changed} -${deleted}`;
    }
    toFileCommit(status) {
        return this.with({
            type: commit_1.GitCommitType.File,
            fileName: status.fileName,
            originalFileName: status.originalFileName,
            previousFileName: status.originalFileName || status.fileName,
            status: status.status,
            fileStatuses: null
        });
    }
    with(changes) {
        return new GitLogCommit(changes.type || this.type, this.repoPath, changes.sha || this.sha, changes.fileName || this.fileName, this.author, this.date, this.message, changes.status || this.status, this.getChangedValue(changes.fileStatuses, this.fileStatuses), this.getChangedValue(changes.originalFileName, this.originalFileName), this.getChangedValue(changes.previousSha, this.previousSha), this.getChangedValue(changes.previousFileName, this.previousFileName));
    }
}
exports.GitLogCommit = GitLogCommit;
//# sourceMappingURL=logCommit.js.map