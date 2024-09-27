
import * as lebab from 'lebab';
import * as vscode from 'vscode';

/**
 * @typedef {Object} IProblem
 * @property {string} type
 * @property {string} msg
 * @property {number} line
 */

/**
 * @typedef {Object} ITask
 * @property {string} code
 * @property {vscode.Range} range
 */

/**
 * @typedef {Object} IOptions
 * @property {string[]} transforms
 * @property {boolean} skipWarnings
 */

/**
 * @typedef {Object} IResult
 * @property {string} code
 * @property {IProblem[]} warnings
 */

function getRange(sl, sc, el, ec) {
    const start = new vscode.Position(sl, sc);
    const end = new vscode.Position(el, ec);
    return new vscode.Range(start, end);
}

function makeDiagnostic(problem, stringLength) {
    const line = problem.line - 1;

    return {
        code: problem.type,
        severity: vscode.DiagnosticSeverity.Warning,
        range: getRange(line, 0, line, stringLength),
        source: 'lebab',
        message: `${problem.msg} [${problem.type}]`
    };
}

function transformRange(document, range, options, collection, selection = false) {
    const text = document.getText(range);

    let result = {
        code: text,
        warnings: []
    };

    try {
        result = lebab.transform(text, options.transforms);
    } catch (err) {
        console.error(err);
    }

    if (!options.skipWarnings && !selection) {
        collection.set(document.uri, result.warnings.map((problem) => {
            const problemLine = document.lineAt(problem.line - 1);
            return makeDiagnostic(problem, problemLine.text.length);
        }));
    }

    return {
        range,
        code: result.code
    };
}

function isEmptyPrimarySelection(selections) {
    return selections.length === 0 || (selections.length === 1 && selections[0].isEmpty);
}

export function activate(context) {
    const command = vscode.commands.registerTextEditorCommand('lebab.convert', (textEditor) => {
        const options = vscode.workspace.getConfiguration().get('lebab');
        const document = textEditor.document;
        const selections = textEditor.selections;

        const transforms = [];
        const collection = vscode.languages.createDiagnosticCollection();

        // If the primary selection is empty, then transform full document
        if (isEmptyPrimarySelection(selections)) {
            const lastLine = document.lineAt(document.lineCount - 1);
            const range = getRange(0, 0, document.lineCount - 1, lastLine.text.length);
            transforms.push(transformRange(document, range, options, collection));
        } else {
            selections.forEach((selection) => {
                const range = new vscode.Range(selection.start, selection.end);
                transforms.push(transformRange(document, range, options, collection, true));
            });
        }

        if (!options.skipWarnings) {
            vscode.window.onDidChangeActiveTextEditor(() => collection.delete(document.uri));
        }

        textEditor.edit((editBuilder) => {
            transforms.forEach((task) => {
                editBuilder.replace(task.range, task.code);
            });
        });
    });

    // Subscriptions
    context.subscriptions.push(command);
}
