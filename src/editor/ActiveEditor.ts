import * as vscode from "vscode";

import {
    LineEditType,
    LineEditDefintion,
    LineEditInfo,
    Line,
    IterateLineType
} from "./Line";

export class ActiveEditor extends Line {

    #documentSnapshot: string | undefined;
    #editor: vscode.TextEditor | undefined;

    constructor() {
        super();        
    }

    #getActiveEditor = () => {
        this.#editor = vscode.window.activeTextEditor;
        if (this.#editor) {
            this.#documentSnapshot = this.#editor.document.getText();
        } else {
            return;
        }
    };

    #editSwitch = (edit: LineEditInfo, editBuilder : vscode.TextEditorEdit) : void => {
        if (edit) {
            switch (edit.type) {
                case LineEditType.APPEND:
                    editBuilder.insert(edit.range.start, edit.string ?? "");
                    break;
                case LineEditType.CLEAR:
                    editBuilder.delete(this.lineFullRange(edit.range));
                    break;
                case LineEditType.DELETE:
                    editBuilder.delete(edit.range);
                    break;
                case LineEditType.REPLACE:
                    editBuilder.replace(edit.range, edit.string ?? "");
                    break;
                case LineEditType.PREPEND:
                    break;
                default:
            }
        };
    };
    
    // =============================================================================
    // > RPOTECED FUNCTIONS: 
    // =============================================================================

    protected snapshotDocument = () => {
        this.#documentSnapshot = vscode.window.activeTextEditor?.document.getText();
    };

    // protected addEmptyLine = () => {
    //     if (this.#editor?.document.lineCount)
    // };

    // =============================================================================
    // > PUBLIC FUNCTIONS: 
    // =============================================================================

    public prepareEdit = (callback: LineEditDefintion[], includeCursorLine: boolean): void => {
        this.#getActiveEditor();
        const editSchedule: IterateLineType[] = [];
        const selections = this.#editor?.selections;

        selections?.forEach((range : vscode.Range) => {
            editSchedule.push(...this.prepareLines(range, callback));
        });

        this.editInRange(editSchedule);
    };

    public editInRange = async (lineCallback: any[]) : Promise<void> => {
        try {
            const success = await this.#editor?.edit((editBuilder: vscode.TextEditorEdit) => {
                lineCallback.forEach((edit: LineEditInfo) => this.#editSwitch(edit ,editBuilder));
            }).then();

            if (success) {
                console.log('Edit applied successfully!');
            } else {
                console.log('Failed to apply edit.');
            }
        } catch (err) {
            console.log('Error applying edit:', err);
        }
    };
}
