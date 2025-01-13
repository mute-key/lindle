
import * as vscode from "vscode";
import { 
    Line, 
    LineType 
} from "./Line";

import { LineUtil } from "../common/LineUtil";

export interface Edithandler {
    removeTrailingWhiteSpace: (range: vscode.Range) => LineType.LineEditInfo | undefined
    removeMultipleWhitespace: (range: vscode.Range) => LineType.LineEditInfo | undefined
    removeMulitpleEmptyLine: (range: vscode.Range) => LineType.LineEditInfo | undefined
    removeCommentedLine: (range: vscode.Range) => LineType.LineEditInfo | undefined
    removeEmptyLine: (range: vscode.Range) => LineType.LineEditInfo | undefined
    removeDuplicateLine: (range: vscode.Range) => LineType.LineEditInfo | undefined
    cleanUpBlockCommentLine: (range: vscode.Range) => LineType.LineEditInfo | undefined
    setNowDateTimeOnLine: (range: vscode.Range) => LineType.LineEditInfo | undefined
}

export class LineHandler extends Line implements Edithandler {
    constructor(range? : vscode.Range) {
        super();
    }

    /**
     * remove trailing whitespace lines from range if there is non-whitespace-character present. 
     * 
     * @param range target range
     * @returns object descripting where/how to edit the line or undefined if no condition is met.
     */

    public removeTrailingWhiteSpace = (range: vscode.Range): LineType.LineEditInfo | undefined => {
        const textString = this.getText(range);
        const whitespacePos: number = LineUtil.findTrailingWhiteSpaceString(textString);
        if (whitespacePos >= 0) {
            const textLineLength = (textString.length);
            return {
                range: this.newRangeZeroBased(range.start.line, whitespacePos, textLineLength)
            };
        } 
        return;
    };

    /**
     * remove continous whitespaces that are longer than 1 from line when there is non-whitespace
     * -character present in line. this will ignore indentation and edtiing range will start from 
     * fisrt non whitespace character in the line. this funciton will keep the pre-edit range 
     * to overwrite with whitespaces otherwise pre-edit characters will be left in the line 
     * otherwise this callback would need to perform 2 edit to achieve removing the whitespaces in
     * delta bigger than 1. resizing range will only affact to target range but not out or range.
     *  
     * 
     * @param range target range
     * @returns object descripting where/how to edit the line or undefined if no condition is met.
     */
    public removeMultipleWhitespace = (range: vscode.Range): LineType.LineEditInfo | undefined => {
        const lineText = this.getText(range);
        if (LineUtil.findMultipleWhiteSpaceString(lineText) && !this.getTextLineFromRange(range).isEmptyOrWhitespace) {
            const newLineText = LineUtil.removeMultipleWhiteSpaceString(lineText);
            // also need to check if the line has indent
            const startPos = this.getTextLineFromRange(range).firstNonWhitespaceCharacterIndex;
            const endPos = LineUtil.findReverseNonWhitespaceIndex(lineText);
            return {
                range: this.newRangeZeroBased(range.start.line, startPos, endPos),
                string: newLineText.padEnd(endPos, " ").trim()
            };
        }
        return;
    };

    /**
     * check if the current cursor or selected range is empty line and next. 
     * if both current and next is emtpy, remove current line. 
     * 
     * @param range target range
     * @returns object descripting where/how to edit the line or undefined if no condition is met.
     */
    public removeMulitpleEmptyLine = (range: vscode.Range): LineType.LineEditInfo | undefined => {
        const currentLine = this.getTextLineFromRange(range).isEmptyOrWhitespace;
        const nextLine = this.getTextLineFromRange(range, 1).isEmptyOrWhitespace;
        if (currentLine && nextLine) {
            return {
                range: this.lineFullRangeWithEOL(range)
            };
        }
        return;
    };

    /**
     * remove line if the line is commented
     * 
     * @param range target range
     * @returns object descripting where/how to edit the line or undefined if no condition is met.
     */
    public removeCommentedLine = (range: vscode.Range) : LineType.LineEditInfo | undefined => {
        const lineText = this.getText(range);
        if (LineUtil.isLineCommented(lineText)) {
            return {
                range: this.lineFullRangeWithEOL(range)
            };
        }
        return;
    };

    /**
     * remove line if the line is empty without characters.
     * 
     * @param range target range
     * @returns object descripting where/how to edit the line or undefined if no condition is met.
     * 
     */

    public removeEmptyLine = (range: vscode.Range) : LineType.LineEditInfo | undefined => {
        const currentLine = this.getTextLineFromRange(range).isEmptyOrWhitespace;
        if (currentLine) {
            return {
                range: this.lineFullRangeWithEOL(range)
            };
        }
        return; 
    };

    
    /**
     * check if the current cursor or selected range is empty line and next. 
     * if both current and next is emtpy, remove current line. 
     * 
     * @param range target range
     * @returns object descripting where/how to edit the line or undefined if no condition is met.
     * 
     */
    public removeDuplicateLine = (range: vscode.Range): LineType.LineEditInfo | undefined => {
        const currentLine = this.getTextLineFromRange(range);
        const nextLine = this.getTextLineFromRange(range, 1);
        if (currentLine.text === nextLine.text) {
            return {
                range: this.lineFullRangeWithEOL(range)
            };
        }
        return;
    };

    public cleanUpBlockCommentLine = (range : vscode.Range) : LineType.LineEditInfo | undefined => {
        const EOL = this.getEndofLine();
        const currentLine : vscode.TextLine = this.getTextLineFromRange(range);
        const beforeLine : vscode.TextLine = this.getTextLineFromRange(range, -1);
        const blockCommentStart : boolean  = LineUtil.isBlockCommentStartingLine(beforeLine.text);
        const nextLine : vscode.TextLine  = this.getTextLineFromRange(range, 1);
        const nextLineIsBlockCommend  : boolean  = LineUtil.isEmptyBlockComment(nextLine.text);
        const NextLineblockCommentEnd : boolean = LineUtil.isBlockCommentEndingLine(nextLine.text);
        const LineIsBlockCommend : boolean = LineUtil.isEmptyBlockComment(currentLine.text);

        if (blockCommentStart && LineUtil.isEmptyBlockComment(currentLine.text)) {
            let ln : number = range.start.line;
            let rg : vscode.Range | undefined = undefined;
            let tl : vscode.TextLine;
            const lineSkip : number[] = [];
            while(ln) {
                tl = this.getTextLineFromRange(ln);
                if (LineUtil.isEmptyBlockComment(tl.text)) {
                    rg = tl.range;
                    lineSkip.push(ln);
                } else {
                    break;
                }
                ln++;
            }
            if (rg) {
                return {
                    range: new vscode.Range(
                        new vscode.Position(range.start.line, 0),
                        new vscode.Position(rg.start.line + 1, 0)
                    ),
                    lineSkip: lineSkip
                };
            }
        } 
        else if (NextLineblockCommentEnd && LineUtil.isBlockComment(currentLine.text)) {
            return {
                range: this.newRangeZeroBased(range.start.line, currentLine.text.length, currentLine.text.length),
                string: EOL + LineUtil.cleanBlockComment(currentLine.text) + " ",
                type: LineType.LineEditType.APPEND
            };
        } else if ((LineIsBlockCommend && nextLineIsBlockCommend)) {
            return {
                range: this.lineFullRangeWithEOL(range)
            };
        }
        return;
    };

    /**
     * funciton to print current datetime where the cursor is. 
     * - locale 
     * - iso 
     * - custom
     * 
     * @param range target range, whichi will be the very starting of line.
     * @returns object descripting where/how to edit the line or undefined if no condition is met.
     */
    public setNowDateTimeOnLine = (range : vscode.Range) : LineType.LineEditInfo | undefined => {
        return {
            range: range,
            string: LineUtil.getNowDateTimeStamp.custom()
        };;
    };    
}