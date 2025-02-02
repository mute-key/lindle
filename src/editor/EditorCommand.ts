/**
 * this is kind of generic command class but for editor. it might need
 * to be refactored if to be used other than just editor edit. probably
 * will need to revise to make it either even more generic or even more
 * to specific use-case. 
 * 
 */
import { ActiveEditor } from "./ActiveEditor";
import { LineType as LT } from "./Line";
import {
    LineHandler
} from "./LineHandler";

import config from "../common/config";

export type EditorCommandParameterType = {
    includeEveryLine: boolean,
    autoSaveAfterEdit : boolean
}

/**
 * thsese command ids should match the commands names in package.json.
 * the values of these enums are to see if they allow or block certain
 * conditions when the callbacks collide when they try to edit the overlapping 
 * range which i will lead to runtime error when that happes. 
 * 
 */
export enum EditorCommandId {
    removeDocumentStartingEmptyLine,
    removeTrailingWhitespaceFromSelection,
    removeMulitpleEmptyLinesFromSelection,
    removeMultipleWhitespaceFromSelection,
    removeEmptyLinesFromSelection,
    removeCommentedTextFromSelection,
    removeDuplicateLineFromSelection,
    removeEmptyBlockCommentLineOnStart,
    removeMultipleEmptyBlockCommentLine,
    insertEmptyBlockCommentLineOnEnd,
    removeEmptyLinesBetweenBlockCommantAndCode,
    printNowDateTimeOnSelection,
    blockCommentWordCountJustifyAlign
};

/**
 * implementations of the functions with same name as key. this is to keep
 * the integrity and simplify if the commands have implementaion and does
 * exist and prevent mismatch of the funciton names. and becuase the command 
 * id is enum. 
 * 
 */
type CommandInterface = {
    [K in Exclude<keyof typeof EditorCommandId, number>]: (...args: any[]) => void;
};

/**
 * this class handles information about the editor comamnds to be bound.
 * because this class might be used to other than just editor comnand,
 * i wanted to explicitily control the editor related command so it is
 * probably the best not to inherit from other classes and use them as
 * composition. 
 * 
 */
export class EditorCommand implements CommandInterface {
    #activeEditor: InstanceType<typeof ActiveEditor>;
    #lineHandler : InstanceType<typeof LineHandler>;

    constructor() {
        this.#lineHandler = new LineHandler();
        this.#activeEditor = new ActiveEditor();
        this.#activeEditor.setLineHandler(this.#lineHandler);
    }

    // =============================================================================
    // > PUBLIC FUNCTIONS:
    // =============================================================================

    public execute = (command : LT.LineEditDefintion[], commandOption: EditorCommandParameterType) : void => {
        this.#activeEditor.prepareEdit(command, commandOption);
    };

    /**
     * @returns
     * 
     */
    public removeDocumentStartingEmptyLine = () : LT.LineEditDefintion => {
        return {
            func: this.#lineHandler.removeDocumentStartingEmptyLine,
            type: LT.LineEditType.DELETE
        };
    };

    /**
     * removes trailing whitespace from the line. 
     *
     * @param editor unused, future reference
     * @param edit unused, future reference
     * @param args unused, future reference
     * 
     */
    public removeTrailingWhitespaceFromSelection = (editor?, edit?, args?) : LT.LineEditDefintion => {
        return {
            func: this.#lineHandler.removeTrailingWhiteSpace,
            type: LT.LineEditType.DELETE
        };
    };

    /**
     * removes multiple empty lines with EOL. this function will check
     * if the currnt range and next range are both whitespace lines and
     * if true, delete current range with EOL. function type is; line.delete. 
     * 
     * 
     */
    public removeMulitpleEmptyLinesFromSelection = () : LT.LineEditDefintion => {
        return {
            func: this.#lineHandler.removeMulitpleEmptyLine,
            type: LT.LineEditType.DELETE,
            block: {
                priority: LT.LineEditBlockPriority.MID
            }
        };
    };
    
    /**
     * removes whitespaces that are longer than 1. this function will ignore 
     * indentation and keep the indent. 
     * 
     */
    public removeMultipleWhitespaceFromSelection = () : LT.LineEditDefintion => {
        return {
            func: this.#lineHandler.removeMultipleWhitespace,
            type: LT.LineEditType.REPLACE,
        };
    };

    /**
     * remove all empty whitespace lines from selection function type is
     * line.delete. 
     * 
     */
    public removeEmptyLinesFromSelection = (): LT.LineEditDefintion => {
        return {
            func: this.#lineHandler.removeEmptyLine,
            type: LT.LineEditType.DELETE,
            block: {
                priority: LT.LineEditBlockPriority.LOW
            }
        };
    };

    /**
     * remove all commented lines from selection function type is line.delete 
     * with EOL. 
     * 
     */
    public removeCommentedTextFromSelection = (): LT.LineEditDefintion => {
        return {
            func: this.#lineHandler.removeCommentedLine,
            type: LT.LineEditType.DELETE,
        };
    };

    /**
     * remove the current line if next line is identical as the current
     * one. 
     * 
     */
    public removeDuplicateLineFromSelection = (): LT.LineEditDefintion => {
        return {
            func: this.#lineHandler.removeDuplicateLine,
            type: LT.LineEditType.DELETE,
            block: {
                priority: LT.LineEditBlockPriority.LOW
            }
        };
    };

    public removeEmptyBlockCommentLineOnStart = (): LT.LineEditDefintion => {
        return {
            func: this.#lineHandler.removeEmptyBlockCommentLineOnStart,
            type: LT.LineEditType.DELETE,
            block: {
                priority: LT.LineEditBlockPriority.VERYHIGH
            }
        };
    };

    public removeMultipleEmptyBlockCommentLine = (): LT.LineEditDefintion => {
        return {
            func: this.#lineHandler.removeMultipleEmptyBlockCommentLine,
            type: LT.LineEditType.DELETE,
            block: {
                priority: LT.LineEditBlockPriority.HIGH
            }
        };
    };

    public insertEmptyBlockCommentLineOnEnd = (): LT.LineEditDefintion | undefined => {
        return config.addExtraLineAtEndOnBlockComment ? {
            func: this.#lineHandler.insertEmptyBlockCommentLineOnEnd,
            type: LT.LineEditType.APPEND,
            block: {
                priority: LT.LineEditBlockPriority.LOW
            }
        } : undefined;
    };

    public blockCommentWordCountJustifyAlign = (): LT.LineEditDefintion | undefined => {
        return config.blockCommentWordCountAutoLengthAlign ? {
            func: this.#lineHandler.blockCommentWordCountJustifyAlign,
            type: LT.LineEditType.REPLACE,
            block: {
                priority: LT.LineEditBlockPriority.HIGH
            }
        } : undefined;
    };

    public removeEmptyLinesBetweenBlockCommantAndCode = () : LT.LineEditDefintion => {
        return {
            func: this.#lineHandler.removeEmptyLinesBetweenBlockCommantAndCode,
            type: LT.LineEditType.DELETE,
            block: {
                priority: LT.LineEditBlockPriority.HIGH
            }
        };
    };

    public printNowDateTimeOnSelection = (): LT.LineEditDefintion => {
        return {
            func: this.#lineHandler.setNowDateTimeOnLine,
            type: LT.LineEditType.APPEND,
        };
    };
}
