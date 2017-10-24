"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const Bookmark_1 = require("./Bookmark");
const Bookmarks_1 = require("./Bookmarks");
const BookmarkProvider_1 = require("./BookmarkProvider");
// this method is called when vs code is activated
function activate(context) {
    let bookmarks;
    let activeEditorCountLine;
    let timeout;
    // load pre-saved bookmarks
    let didLoadBookmarks = loadWorkspaceState();
    // tree-view
    const bookmarkProvider = new BookmarkProvider_1.BookmarkProvider(vscode.workspace.rootPath, bookmarks, context);
    vscode.window.registerTreeDataProvider("bookmarksExplorer", bookmarkProvider);
    // Define the Bookmark Decoration
    let pathIcon = vscode.workspace.getConfiguration("bookmarks").get("gutterIconPath", "");
    if (pathIcon !== "") {
        if (!fs.existsSync(pathIcon)) {
            vscode.window.showErrorMessage('The file "' + pathIcon + '" used for "bookmarks.gutterIconPath" does not exists.');
            pathIcon = context.asAbsolutePath("images/bookmark.svg");
        }
    }
    else {
        pathIcon = context.asAbsolutePath("images/bookmark.svg");
    }
    let bookmarkDecorationType = vscode.window.createTextEditorDecorationType({
        gutterIconPath: pathIcon,
        overviewRulerLane: vscode.OverviewRulerLane.Full,
        overviewRulerColor: "rgba(21, 126, 251, 0.7)"
    });
    // Connect it to the Editors Events
    let activeEditor = vscode.window.activeTextEditor;
    // let activeBookmark: Bookmark;
    if (activeEditor) {
        if (!didLoadBookmarks) {
            bookmarks.add(activeEditor.document.uri.fsPath);
        }
        activeEditorCountLine = activeEditor.document.lineCount;
        bookmarks.activeBookmark = bookmarks.fromUri(activeEditor.document.uri.fsPath);
        triggerUpdateDecorations();
    }
    // new docs
    vscode.workspace.onDidOpenTextDocument(doc => {
        // activeEditorCountLine = doc.lineCount;
        bookmarks.add(doc.uri.fsPath);
    });
    vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (editor) {
            activeEditorCountLine = editor.document.lineCount;
            bookmarks.activeBookmark = bookmarks.fromUri(editor.document.uri.fsPath);
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);
    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            //            triggerUpdateDecorations();
            let updatedBookmark = true;
            // call sticky function when the activeEditor is changed
            if (bookmarks.activeBookmark && bookmarks.activeBookmark.bookmarks.length > 0) {
                updatedBookmark = stickyBookmarks(event);
            }
            activeEditorCountLine = event.document.lineCount;
            updateDecorations();
            if (updatedBookmark) {
                saveWorkspaceState();
            }
        }
    }, null, context.subscriptions);
    // Timeout
    function triggerUpdateDecorations() {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(updateDecorations, 100);
        //        updateDecorations();
    }
    // Evaluate (prepare the list) and DRAW
    function updateDecorations() {
        if (!activeEditor) {
            return;
        }
        if (!bookmarks.activeBookmark) {
            return;
        }
        if (bookmarks.activeBookmark.bookmarks.length === 0) {
            let books = [];
            activeEditor.setDecorations(bookmarkDecorationType, books);
            return;
        }
        let books = [];
        // Remove all bookmarks if active file is empty
        if (activeEditor.document.lineCount === 1 && activeEditor.document.lineAt(0).text === "") {
            bookmarks.activeBookmark.bookmarks = [];
        }
        else {
            let invalids = [];
            // for (let index = 0; index < bookmarks.activeBookmark.bookmarks.length; index++) {
            for (let element of bookmarks.activeBookmark.bookmarks) {
                // let element = bookmarks.activeBookmark.bookmarks[index];
                if (element <= activeEditor.document.lineCount) {
                    let decoration = new vscode.Range(element, 0, element, 0);
                    books.push(decoration);
                }
                else {
                    invalids.push(element);
                }
            }
            if (invalids.length > 0) {
                let idxInvalid;
                // for (let indexI = 0; indexI < invalids.length; indexI++) {
                for (const element of invalids) {
                    idxInvalid = bookmarks.activeBookmark.bookmarks.indexOf(element); // invalids[indexI]);
                    bookmarks.activeBookmark.bookmarks.splice(idxInvalid, 1);
                }
            }
        }
        activeEditor.setDecorations(bookmarkDecorationType, books);
    }
    vscode.commands.registerCommand("bookmarks.jumpTo", (documentPath, line) => {
        let uriDocBookmark = vscode.Uri.file(documentPath);
        vscode.workspace.openTextDocument(uriDocBookmark).then(doc => {
            vscode.window.showTextDocument(doc).then(editor => {
                let lineInt = parseInt(line, 10);
                revealLine(lineInt - 1);
            });
        });
    });
    vscode.commands.registerCommand("bookmarks.refresh", node => {
        bookmarkProvider.refresh();
    });
    vscode.commands.registerCommand("bookmarks.clearFromFile", node => {
        // vscode.window.showInformationMessage("bookmarks.clearFromFile" + node.toString());
        bookmarks.clear(node.bookmark);
        saveWorkspaceState();
        updateDecorations();
    });
    vscode.commands.registerCommand("bookmarks.deleteBookmark", node => {
        // vscode.window.showInformationMessage("bookmarks.deleteBookmark" + node.toString());
        let book = bookmarks.fromUri(node.command.arguments[0]);
        let index = book.bookmarks.indexOf(node.command.arguments[1] - 1);
        bookmarks.removeBookmark(index, node.command.arguments[1] - 1, book);
        saveWorkspaceState();
        updateDecorations();
    });
    vscode.commands.registerCommand("bookmarks.clear", () => {
        if (!vscode.window.activeTextEditor) {
            vscode.window.showInformationMessage("Open a file first to clear bookmarks");
            return;
        }
        //        bookmarks.activeBookmark.clear();
        bookmarks.clear();
        saveWorkspaceState();
        updateDecorations();
    });
    vscode.commands.registerCommand("bookmarks.clearFromAllFiles", () => {
        // for (let index = 0; index < bookmarks.bookmarks.length; index++) {
        // for (let element of bookmarks.bookmarks) {
        //     // let element = bookmarks.bookmarks[index];
        //     element.clear();
        // }
        bookmarks.clearAll();
        saveWorkspaceState();
        updateDecorations();
    });
    function selectLines(editor, lines) {
        const doc = editor.document;
        editor.selections.shift();
        let sels = new Array();
        let newSe;
        lines.forEach(line => {
            newSe = new vscode.Selection(line, 0, line, doc.lineAt(line).text.length);
            sels.push(newSe);
        });
        editor.selections = sels;
    }
    vscode.commands.registerCommand("bookmarks.selectLines", () => {
        if (!vscode.window.activeTextEditor) {
            vscode.window.showInformationMessage("Open a file first to clear bookmarks");
            return;
        }
        if (bookmarks.activeBookmark.bookmarks.length === 0) {
            vscode.window.showInformationMessage("No Bookmark found");
            return;
        }
        selectLines(vscode.window.activeTextEditor, bookmarks.activeBookmark.bookmarks);
    });
    function expandLineRange(editor, toLine, direction) {
        const doc = editor.document;
        let newSe;
        let actualSelection = editor.selection;
        // no matter 'the previous selection'. going FORWARD will become 'isReversed = FALSE'
        if (direction === Bookmark_1.JUMP_FORWARD) {
            if (actualSelection.isEmpty || !actualSelection.isReversed) {
                newSe = new vscode.Selection(editor.selection.start.line, editor.selection.start.character, toLine, doc.lineAt(toLine).text.length);
            }
            else {
                newSe = new vscode.Selection(editor.selection.end.line, editor.selection.end.character, toLine, doc.lineAt(toLine).text.length);
            }
        }
        else {
            if (actualSelection.isEmpty || !actualSelection.isReversed) {
                newSe = new vscode.Selection(editor.selection.start.line, editor.selection.start.character, toLine, 0);
            }
            else {
                newSe = new vscode.Selection(editor.selection.end.line, editor.selection.end.character, toLine, 0);
            }
        }
        editor.selection = newSe;
    }
    function shrinkLineRange(editor, toLine, direction) {
        const doc = editor.document;
        let newSe;
        // no matter 'the previous selection'. going FORWARD will become 'isReversed = FALSE'
        if (direction === Bookmark_1.JUMP_FORWARD) {
            newSe = new vscode.Selection(editor.selection.end.line, editor.selection.end.character, toLine, 0);
        }
        else {
            newSe = new vscode.Selection(editor.selection.start.line, editor.selection.start.character, toLine, doc.lineAt(toLine).text.length);
        }
        editor.selection = newSe;
    }
    vscode.commands.registerCommand("bookmarks.expandSelectionToNext", () => expandSelectionToNextBookmark(Bookmark_1.JUMP_FORWARD));
    vscode.commands.registerCommand("bookmarks.expandSelectionToPrevious", () => expandSelectionToNextBookmark(Bookmark_1.JUMP_BACKWARD));
    vscode.commands.registerCommand("bookmarks.shrinkSelection", () => shrinkSelection());
    function shrinkSelection() {
        if (!vscode.window.activeTextEditor) {
            vscode.window.showInformationMessage("Open a file first to shrink bookmark selection");
            return;
        }
        if (vscode.window.activeTextEditor.selections.length > 1) {
            vscode.window.showInformationMessage("Command not supported with more than one selection");
            return;
        }
        if (vscode.window.activeTextEditor.selection.isEmpty) {
            vscode.window.showInformationMessage("No selection found");
            return;
        }
        if (bookmarks.activeBookmark.bookmarks.length === 0) {
            vscode.window.showInformationMessage("No Bookmark found");
            return;
        }
        // which direction?
        let direction = vscode.window.activeTextEditor.selection.isReversed ? Bookmark_1.JUMP_FORWARD : Bookmark_1.JUMP_BACKWARD;
        let activeSelectionStartLine = vscode.window.activeTextEditor.selection.isReversed ? vscode.window.activeTextEditor.selection.end.line : vscode.window.activeTextEditor.selection.start.line;
        let baseLine;
        if (direction === Bookmark_1.JUMP_FORWARD) {
            baseLine = vscode.window.activeTextEditor.selection.start.line;
        }
        else {
            baseLine = vscode.window.activeTextEditor.selection.end.line;
        }
        bookmarks.activeBookmark.nextBookmark(baseLine, direction)
            .then((nextLine) => {
            if ((nextLine === Bookmark_1.NO_MORE_BOOKMARKS) || (nextLine === Bookmark_1.NO_BOOKMARKS)) {
                vscode.window.setStatusBarMessage("No more bookmarks", 2000);
                return;
            }
            else {
                if ((direction === Bookmark_1.JUMP_BACKWARD && nextLine < activeSelectionStartLine) ||
                    (direction === Bookmark_1.JUMP_FORWARD && nextLine > activeSelectionStartLine)) {
                    // vscode.window.showInformationMessage('No more bookmarks to shrink...');
                    vscode.window.setStatusBarMessage("No more bookmarks to shrink", 2000);
                }
                else {
                    shrinkLineRange(vscode.window.activeTextEditor, parseInt(nextLine.toString(), 10), direction);
                }
            }
        })
            .catch((error) => {
            console.log("activeBookmark.nextBookmark REJECT" + error);
        });
    }
    function expandSelectionToNextBookmark(direction) {
        if (!vscode.window.activeTextEditor) {
            vscode.window.showInformationMessage("Open a file first to clear bookmarks");
            return;
        }
        if (bookmarks.activeBookmark.bookmarks.length === 0) {
            vscode.window.showInformationMessage("No Bookmark found");
            return;
        }
        if (bookmarks.activeBookmark.bookmarks.length === 1) {
            vscode.window.showInformationMessage("There is only one bookmark in this file");
            return;
        }
        let baseLine;
        if (vscode.window.activeTextEditor.selection.isEmpty) {
            baseLine = vscode.window.activeTextEditor.selection.active.line;
        }
        else {
            if (direction === Bookmark_1.JUMP_FORWARD) {
                baseLine = vscode.window.activeTextEditor.selection.end.line;
            }
            else {
                baseLine = vscode.window.activeTextEditor.selection.start.line;
            }
        }
        bookmarks.activeBookmark.nextBookmark(baseLine, direction)
            .then((nextLine) => {
            if ((nextLine === Bookmark_1.NO_MORE_BOOKMARKS) || (nextLine === Bookmark_1.NO_BOOKMARKS)) {
                // vscode.window.showInformationMessage('No more bookmarks...');
                vscode.window.setStatusBarMessage("No more bookmarks", 2000);
                return;
            }
            else {
                expandLineRange(vscode.window.activeTextEditor, parseInt(nextLine.toString(), 10), direction);
            }
        })
            .catch((error) => {
            console.log("activeBookmark.nextBookmark REJECT" + error);
        });
    }
    ;
    // other commands
    vscode.commands.registerCommand("bookmarks.toggle", () => {
        if (!vscode.window.activeTextEditor) {
            vscode.window.showInformationMessage("Open a file first to toggle bookmarks");
            return;
        }
        let line = vscode.window.activeTextEditor.selection.active.line;
        // fix issue emptyAtLaunch
        if (!bookmarks.activeBookmark) {
            bookmarks.add(vscode.window.activeTextEditor.document.uri.fsPath);
            bookmarks.activeBookmark = bookmarks.fromUri(vscode.window.activeTextEditor.document.uri.fsPath);
        }
        let index = bookmarks.activeBookmark.bookmarks.indexOf(line);
        if (index < 0) {
            // bookmarks.activeBookmark.bookmarks.push(line);
            bookmarks.addBookmark(line);
            // toggle editing mode
            // vscode.window.showTextDocument(vscode.window.activeTextEditor.document, {preview: false} );
            vscode.window.showTextDocument(vscode.window.activeTextEditor.document, vscode.window.activeTextEditor.viewColumn);
        }
        else {
            // bookmarks.activeBookmark.bookmarks.splice(index, 1);
            bookmarks.removeBookmark(index, line);
        }
        // sorted
        /* let itemsSorted = [] =*/
        bookmarks.activeBookmark.bookmarks.sort((n1, n2) => {
            if (n1 > n2) {
                return 1;
            }
            if (n1 < n2) {
                return -1;
            }
            return 0;
        });
        saveWorkspaceState();
        updateDecorations();
    });
    vscode.commands.registerCommand("bookmarks.jumpToNext", () => {
        if (!vscode.window.activeTextEditor) {
            vscode.window.showInformationMessage("Open a file first to jump to bookmarks");
            return;
        }
        if (!bookmarks.activeBookmark) {
            return;
        }
        // 
        bookmarks.activeBookmark.nextBookmark(vscode.window.activeTextEditor.selection.active.line)
            .then((nextLine) => {
            if ((nextLine === Bookmark_1.NO_MORE_BOOKMARKS) || (nextLine === Bookmark_1.NO_BOOKMARKS)) {
                bookmarks.nextDocumentWithBookmarks(bookmarks.activeBookmark)
                    .then((nextDocument) => {
                    if (nextDocument === Bookmark_1.NO_MORE_BOOKMARKS) {
                        return;
                    }
                    // same document?
                    let activeDocument = Bookmarks_1.Bookmarks.normalize(vscode.window.activeTextEditor.document.uri.fsPath);
                    if (nextDocument.toString() === activeDocument) {
                        revealLine(bookmarks.activeBookmark.bookmarks[0]);
                    }
                    else {
                        vscode.workspace.openTextDocument(nextDocument.toString()).then(doc => {
                            vscode.window.showTextDocument(doc).then(editor => {
                                revealLine(bookmarks.activeBookmark.bookmarks[0]);
                            });
                        });
                    }
                })
                    .catch((error) => {
                    vscode.window.showInformationMessage("No more bookmarks...");
                });
            }
            else {
                revealLine(parseInt(nextLine.toString(), 10));
            }
        })
            .catch((error) => {
            console.log("activeBookmark.nextBookmark REJECT" + error);
        });
    });
    vscode.commands.registerCommand("bookmarks.jumpToPrevious", () => {
        if (!vscode.window.activeTextEditor) {
            vscode.window.showInformationMessage("Open a file first to jump to bookmarks");
            return;
        }
        if (!bookmarks.activeBookmark) {
            return;
        }
        // 
        bookmarks.activeBookmark.nextBookmark(vscode.window.activeTextEditor.selection.active.line, Bookmark_1.JUMP_BACKWARD)
            .then((nextLine) => {
            if ((nextLine === Bookmark_1.NO_MORE_BOOKMARKS) || (nextLine === Bookmark_1.NO_BOOKMARKS)) {
                bookmarks.nextDocumentWithBookmarks(bookmarks.activeBookmark, Bookmark_1.JUMP_BACKWARD)
                    .then((nextDocument) => {
                    if (nextDocument === Bookmark_1.NO_MORE_BOOKMARKS) {
                        return;
                    }
                    // same document?
                    let activeDocument = Bookmarks_1.Bookmarks.normalize(vscode.window.activeTextEditor.document.uri.fsPath);
                    if (nextDocument.toString() === activeDocument) {
                        // revealLine(activeBookmark.bookmarks[0]);
                        revealLine(bookmarks.activeBookmark.bookmarks[bookmarks.activeBookmark.bookmarks.length - 1]);
                    }
                    else {
                        vscode.workspace.openTextDocument(nextDocument.toString()).then(doc => {
                            vscode.window.showTextDocument(doc).then(editor => {
                                // revealLine(activeBookmark.bookmarks[0]);
                                revealLine(bookmarks.activeBookmark.bookmarks[bookmarks.activeBookmark.bookmarks.length - 1]);
                            });
                        });
                    }
                })
                    .catch((error) => {
                    vscode.window.showInformationMessage("No more bookmarks...");
                });
            }
            else {
                revealLine(parseInt(nextLine.toString(), 10));
            }
        })
            .catch((error) => {
            console.log("activeBookmark.nextBookmark REJECT" + error);
        });
    });
    vscode.commands.registerCommand("bookmarks.list", () => {
        if (!vscode.window.activeTextEditor) {
            vscode.window.showInformationMessage("Open a file first to list bookmarks");
            return;
        }
        // no active bookmark
        if (!bookmarks.activeBookmark) {
            vscode.window.showInformationMessage("No Bookmark found");
            return;
        }
        // no bookmark
        if (bookmarks.activeBookmark.bookmarks.length === 0) {
            vscode.window.showInformationMessage("No Bookmark found");
            return;
        }
        // push the items
        let items = [];
        // tslint:disable-next-line:prefer-for-of
        for (let index = 0; index < bookmarks.activeBookmark.bookmarks.length; index++) {
            let element = bookmarks.activeBookmark.bookmarks[index] + 1;
            let lineText = vscode.window.activeTextEditor.document.lineAt(element - 1).text;
            items.push({ label: element.toString(), description: lineText });
        }
        // pick one
        let currentLine = vscode.window.activeTextEditor.selection.active.line + 1;
        let options = {
            placeHolder: "Type a line number or a piece of code to navigate to",
            matchOnDescription: true,
            onDidSelectItem: item => {
                let itemT = item;
                revealLine(parseInt(itemT.label, 10) - 1);
            }
        };
        vscode.window.showQuickPick(items, options).then(selection => {
            if (typeof selection === "undefined") {
                revealLine(currentLine - 1);
                return;
            }
            revealLine(parseInt(selection.label, 10) - 1);
        });
    });
    vscode.commands.registerCommand("bookmarks.listFromAllFiles", () => {
        // no bookmark
        let totalBookmarkCount = 0;
        // for (let index = 0; index < bookmarks.bookmarks.length; index++) {
        for (let element of bookmarks.bookmarks) {
            // totalBookmarkCount = totalBookmarkCount +  bookmarks.bookmarks[index].bookmarks.length;
            totalBookmarkCount = totalBookmarkCount + element.bookmarks.length;
        }
        if (totalBookmarkCount === 0) {
            vscode.window.showInformationMessage("No Bookmarks found");
            return;
        }
        // push the items
        let items = [];
        let activeTextEditorPath = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.uri.fsPath : "";
        let promisses = [];
        let currentLine = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.selection.active.line + 1 : -1;
        // for (let index = 0; index < bookmarks.bookmarks.length; index++) {
        for (let bookmark of bookmarks.bookmarks) {
            // let bookmark = bookmarks.bookmarks[index];
            let pp = bookmark.listBookmarks();
            promisses.push(pp);
        }
        Promise.all(promisses).then((values) => {
            // for (let index = 0; index < values.length; index++) {
            for (let element of values) {
                // let element = values[index];
                if (element) {
                    // for (let indexInside = 0; indexInside < element.length; indexInside++) {
                    for (let elementInside of element) {
                        // let elementInside = element[indexInside];
                        if (elementInside.detail.toString().toLowerCase() === activeTextEditorPath.toLowerCase()) {
                            items.push({
                                label: elementInside.label,
                                description: elementInside.description
                            });
                        }
                        else {
                            let itemPath = removeRootPathFrom(elementInside.detail);
                            items.push({
                                label: elementInside.label,
                                description: elementInside.description,
                                detail: itemPath
                            });
                        }
                    }
                }
            }
            // sort
            // - active document
            // - no octicon - document inside project
            // - with octicon - document outside project
            let itemsSorted;
            itemsSorted = items.sort(function (a, b) {
                if (!a.detail && !b.detail) {
                    return 0;
                }
                else {
                    if (!a.detail && b.detail) {
                        return -1;
                    }
                    else {
                        if (a.detail && !b.detail) {
                            return 1;
                        }
                        else {
                            if ((a.detail.toString().indexOf("$(file-directory) ") === 0) && (b.detail.toString().indexOf("$(file-directory) ") === -1)) {
                                return 1;
                            }
                            else {
                                if ((a.detail.toString().indexOf("$(file-directory) ") === -1) && (b.detail.toString().indexOf("$(file-directory) ") === 0)) {
                                    return -1;
                                }
                                else {
                                    return 0;
                                }
                            }
                        }
                    }
                }
            });
            let options = {
                placeHolder: "Type a line number or a piece of code to navigate to",
                matchOnDescription: true,
                onDidSelectItem: item => {
                    let itemT = item;
                    let filePath;
                    // no detail - previously active document
                    if (!itemT.detail) {
                        filePath = activeTextEditorPath;
                    }
                    else {
                        // with octicon - document outside project
                        if (itemT.detail.toString().indexOf("$(file-directory) ") === 0) {
                            filePath = itemT.detail.toString().split("$(file-directory) ").pop();
                        }
                        else {
                            filePath = vscode.workspace.rootPath + itemT.detail.toString();
                        }
                    }
                    if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.uri.fsPath.toLowerCase() === filePath.toLowerCase()) {
                        revealLine(parseInt(itemT.label, 10) - 1);
                    }
                    else {
                        let uriDocument = vscode.Uri.file(filePath);
                        vscode.workspace.openTextDocument(uriDocument).then(doc => {
                            // vscode.window.showTextDocument(doc, undefined, true).then(editor => {
                            vscode.window.showTextDocument(doc, { preserveFocus: true, preview: true }).then(editor => {
                                revealLine(parseInt(itemT.label, 10) - 1);
                            });
                        });
                    }
                }
            };
            vscode.window.showQuickPick(itemsSorted, options).then(selection => {
                if (typeof selection === "undefined") {
                    if (activeTextEditorPath === "") {
                        return;
                    }
                    else {
                        let uriDocument = vscode.Uri.file(activeTextEditorPath);
                        vscode.workspace.openTextDocument(uriDocument).then(doc => {
                            vscode.window.showTextDocument(doc).then(editor => {
                                revealLine(currentLine - 1);
                                return;
                            });
                        });
                    }
                }
                if (typeof selection === "undefined") {
                    return;
                }
                if (!selection.detail) {
                    revealLine(parseInt(selection.label, 10) - 1);
                }
                else {
                    let newPath;
                    // with octicon - document outside project
                    if (selection.detail.toString().indexOf("$(file-directory) ") === 0) {
                        newPath = selection.detail.toString().split("$(file-directory) ").pop();
                    }
                    else {
                        newPath = vscode.workspace.rootPath + selection.detail.toString();
                    }
                    // let newPath = vscode.workspace.rootPath + selection.detail.toString();
                    let uriDocument = vscode.Uri.file(newPath);
                    vscode.workspace.openTextDocument(uriDocument).then(doc => {
                        vscode.window.showTextDocument(doc).then(editor => {
                            revealLine(parseInt(selection.label, 10) - 1);
                        });
                    });
                }
            });
        });
    });
    function revealLine(line) {
        let reviewType = vscode.TextEditorRevealType.InCenter;
        if (line === vscode.window.activeTextEditor.selection.active.line) {
            reviewType = vscode.TextEditorRevealType.InCenterIfOutsideViewport;
        }
        let newSe = new vscode.Selection(line, 0, line, 0);
        vscode.window.activeTextEditor.selection = newSe;
        vscode.window.activeTextEditor.revealRange(newSe, reviewType);
    }
    function loadWorkspaceState() {
        let saveBookmarksInProject = vscode.workspace.getConfiguration("bookmarks").get("saveBookmarksInProject", false);
        bookmarks = new Bookmarks_1.Bookmarks("");
        if (vscode.workspace.rootPath && saveBookmarksInProject) {
            let bookmarksFileInProject = path.join(vscode.workspace.rootPath, ".vscode", "bookmarks.json");
            if (!fs.existsSync(bookmarksFileInProject)) {
                return false;
            }
            try {
                bookmarks.loadFrom(JSON.parse(fs.readFileSync(bookmarksFileInProject).toString()), true);
                return true;
            }
            catch (error) {
                vscode.window.showErrorMessage("Error loading Bookmarks: " + error.toString());
                return false;
            }
        }
        else {
            let savedBookmarks = context.workspaceState.get("bookmarks", "");
            if (savedBookmarks !== "") {
                bookmarks.loadFrom(JSON.parse(savedBookmarks));
            }
            return savedBookmarks !== "";
        }
    }
    function saveWorkspaceState() {
        let saveBookmarksInProject = vscode.workspace.getConfiguration("bookmarks").get("saveBookmarksInProject", false);
        if (vscode.workspace.rootPath && saveBookmarksInProject) {
            let bookmarksFileInProject = path.join(vscode.workspace.rootPath, ".vscode", "bookmarks.json");
            if (!fs.existsSync(path.dirname(bookmarksFileInProject))) {
                fs.mkdirSync(path.dirname(bookmarksFileInProject));
            }
            fs.writeFileSync(bookmarksFileInProject, JSON.stringify(bookmarks.zip(true), null, "\t"));
        }
        else {
            context.workspaceState.update("bookmarks", JSON.stringify(bookmarks.zip()));
        }
    }
    function HadOnlyOneValidContentChange(event) {
        // not valid
        if ((event.contentChanges.length > 2) || (event.contentChanges.length === 0)) {
            return false;
        }
        // normal behavior - only 1
        if (event.contentChanges.length === 1) {
            return true;
        }
        else {
            if (event.contentChanges.length === 2) {
                let trimAutoWhitespace = vscode.workspace.getConfiguration("editor").get("trimAutoWhitespace", true);
                if (!trimAutoWhitespace) {
                    return false;
                }
                // check if the first range is 'equal' and if the second is 'empty'
                let fistRangeEquals = (event.contentChanges[0].range.start.character === event.contentChanges[0].range.end.character) &&
                    (event.contentChanges[0].range.start.line === event.contentChanges[0].range.end.line);
                let secondRangeEmpty = (event.contentChanges[1].text === "") &&
                    (event.contentChanges[1].range.start.line === event.contentChanges[1].range.end.line) &&
                    (event.contentChanges[1].range.start.character === 0) &&
                    (event.contentChanges[1].range.end.character > 0);
                return fistRangeEquals && secondRangeEmpty;
            }
        }
    }
    // function used to attach bookmarks at the line
    function stickyBookmarks(event) {
        // sticky is now the default/only behavior
        // let useStickyBookmarks: boolean = vscode.workspace.getConfiguration("bookmarks").get("useStickyBookmarks", false);
        // if (!useStickyBookmarks) {
        //     return false;
        // }
        let diffLine;
        let updatedBookmark = false;
        // fix autoTrimWhitespace
        // if (event.contentChanges.length === 1) {
        if (HadOnlyOneValidContentChange(event)) {
            // add or delete line case
            if (event.document.lineCount !== activeEditorCountLine) {
                if (event.document.lineCount > activeEditorCountLine) {
                    diffLine = event.document.lineCount - activeEditorCountLine;
                }
                else if (event.document.lineCount < activeEditorCountLine) {
                    diffLine = activeEditorCountLine - event.document.lineCount;
                    diffLine = 0 - diffLine;
                    // one line up
                    if (event.contentChanges[0].range.end.line - event.contentChanges[0].range.start.line === 1) {
                        if ((event.contentChanges[0].range.end.character === 0) &&
                            (event.contentChanges[0].range.start.character === 0)) {
                            // the bookmarked one
                            let idxbk = bookmarks.activeBookmark.bookmarks.indexOf(event.contentChanges[0].range.start.line);
                            if (idxbk > -1) {
                                // bookmarks.activeBookmark.bookmarks.splice(idxbk, 1);
                                bookmarks.removeBookmark(idxbk, event.contentChanges[0].range.start.line);
                            }
                        }
                    }
                    if (event.contentChanges[0].range.end.line - event.contentChanges[0].range.start.line > 1) {
                        for (let i = event.contentChanges[0].range.start.line /* + 1*/; i <= event.contentChanges[0].range.end.line; i++) {
                            let index = bookmarks.activeBookmark.bookmarks.indexOf(i);
                            if (index > -1) {
                                // bookmarks.activeBookmark.bookmarks.splice(index, 1);
                                bookmarks.removeBookmark(index, i);
                                updatedBookmark = true;
                            }
                        }
                    }
                }
                // for (let index in bookmarks.activeBookmark.bookmarks) {
                for (let index = 0; index < bookmarks.activeBookmark.bookmarks.length; index++) {
                    let eventLine = event.contentChanges[0].range.start.line;
                    let eventcharacter = event.contentChanges[0].range.start.character;
                    // indent ?
                    if (eventcharacter > 0) {
                        let textInEventLine = activeEditor.document.lineAt(eventLine).text;
                        textInEventLine = textInEventLine.replace(/\t/g, "").replace(/\s/g, "");
                        if (textInEventLine === "") {
                            eventcharacter = 0;
                        }
                    }
                    // also =
                    if (((bookmarks.activeBookmark.bookmarks[index] > eventLine) && (eventcharacter > 0)) ||
                        ((bookmarks.activeBookmark.bookmarks[index] >= eventLine) && (eventcharacter === 0))) {
                        let newLine = bookmarks.activeBookmark.bookmarks[index] + diffLine;
                        if (newLine < 0) {
                            newLine = 0;
                        }
                        // bookmarks.activeBookmark.bookmarks[ index ] = newLine;
                        bookmarks.updateBookmark(index, bookmarks.activeBookmark.bookmarks[index], newLine);
                        updatedBookmark = true;
                    }
                }
            }
            // paste case
            if (!updatedBookmark && (event.contentChanges[0].text.length > 1)) {
                let selection = vscode.window.activeTextEditor.selection;
                let lineRange = [selection.start.line, selection.end.line];
                let lineMin = Math.min.apply(this, lineRange);
                let lineMax = Math.max.apply(this, lineRange);
                if (selection.start.character > 0) {
                    lineMin++;
                }
                if (selection.end.character < vscode.window.activeTextEditor.document.lineAt(selection.end).range.end.character) {
                    lineMax--;
                }
                if (lineMin <= lineMax) {
                    for (let i = lineMin; i <= lineMax; i++) {
                        let index = bookmarks.activeBookmark.bookmarks.indexOf(i);
                        if (index > -1) {
                            // bookmarks.activeBookmark.bookmarks.splice(index, 1);
                            bookmarks.removeBookmark(index, i);
                            updatedBookmark = true;
                        }
                    }
                }
            }
        }
        else if (event.contentChanges.length === 2) {
            // move line up and move line down case
            if (activeEditor.selections.length === 1) {
                if (event.contentChanges[0].text === "") {
                    updatedBookmark = moveStickyBookmarks("down");
                }
                else if (event.contentChanges[1].text === "") {
                    updatedBookmark = moveStickyBookmarks("up");
                }
            }
        }
        return updatedBookmark;
    }
    function moveStickyBookmarks(direction) {
        let diffChange = -1;
        let updatedBookmark = false;
        let diffLine;
        let selection = activeEditor.selection;
        let lineRange = [selection.start.line, selection.end.line];
        let lineMin = Math.min.apply(this, lineRange);
        let lineMax = Math.max.apply(this, lineRange);
        if (selection.end.character === 0 && !selection.isSingleLine) {
            let lineAt = activeEditor.document.lineAt(selection.end.line);
            let posMin = new vscode.Position(selection.start.line + 1, selection.start.character);
            let posMax = new vscode.Position(selection.end.line, lineAt.range.end.character);
            vscode.window.activeTextEditor.selection = new vscode.Selection(posMin, posMax);
            lineMax--;
        }
        if (direction === "up") {
            diffLine = 1;
            let index = bookmarks.activeBookmark.bookmarks.indexOf(lineMin - 1);
            if (index > -1) {
                diffChange = lineMax;
                // bookmarks.activeBookmark.bookmarks.splice(index, 1);
                bookmarks.removeBookmark(index, lineMin - 1);
                updatedBookmark = true;
            }
        }
        else if (direction === "down") {
            diffLine = -1;
            let index;
            index = bookmarks.activeBookmark.bookmarks.indexOf(lineMax + 1);
            if (index > -1) {
                diffChange = lineMin;
                // bookmarks.activeBookmark.bookmarks.splice(index, 1);
                bookmarks.removeBookmark(index, lineMax + 1);
                updatedBookmark = true;
            }
        }
        lineRange = [];
        for (let i = lineMin; i <= lineMax; i++) {
            lineRange.push(i);
        }
        lineRange = lineRange.sort();
        if (diffLine < 0) {
            lineRange = lineRange.reverse();
        }
        for (let i in lineRange) {
            let index = bookmarks.activeBookmark.bookmarks.indexOf(lineRange[i]);
            if (index > -1) {
                // bookmarks.activeBookmark.bookmarks[index] -= diffLine;
                bookmarks.updateBookmark(index, lineRange[i], bookmarks.activeBookmark.bookmarks[index] - diffLine);
                updatedBookmark = true;
            }
        }
        if (diffChange > -1) {
            // bookmarks.activeBookmark.bookmarks.push(diffChange);
            bookmarks.addBookmark(diffChange);
            updatedBookmark = true;
        }
        return updatedBookmark;
    }
    function removeRootPathFrom(path) {
        if (!vscode.workspace.rootPath) {
            return path;
        }
        if (path.indexOf(vscode.workspace.rootPath) === 0) {
            return path.split(vscode.workspace.rootPath).pop();
        }
        else {
            return "$(file-directory) " + path;
        }
    }
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map