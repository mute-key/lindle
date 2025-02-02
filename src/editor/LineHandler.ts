import * as vscode from "vscode";
import {
    Line,
    LineType
} from "./Line";
import { LineUtil } from "../common/LineUtil";
import config from "../common/config";

export interface Edithandler {
    removeTrailingWhiteSpace: (range: vscode.Range) => LineType.LineEditInfo | undefined,
    removeMultipleWhitespace: (range: vscode.Range) => LineType.LineEditInfo | undefined,
    removeMulitpleEmptyLine: (range: vscode.Range) => LineType.LineEditInfo | undefined,
    removeCommentedLine: (range: vscode.Range) => LineType.LineEditInfo | undefined,
    removeEmptyLine: (range: vscode.Range) => LineType.LineEditInfo | undefined,
    removeDuplicateLine: (range: vscode.Range) => LineType.LineEditInfo | undefined,
    setNowDateTimeOnLine: (range: vscode.Range) => LineType.LineEditInfo | undefined
}

export class LineHandler extends Line {
    constructor() {
        super();
    }

    /**
     * check if the document is starting with empty line and removes them.
     * 
     * @param range
     * @returns
     * 
     */
    public removeDocumentStartingEmptyLine = (range : vscode.Range) : LineType.LineEditInfo | undefined => {
        let lineNumber: number = range.start.line;
        if (lineNumber === 0) {
            const lineIteration = this.iterateNextLine(range, "isEmptyOrWhitespace");
            if (lineIteration) {
                return {
                    range: new vscode.Range(
                        new vscode.Position(0, 0),
                        new vscode.Position(lineIteration.lineNumber, 0)
                    ),
                    block: {
                        lineSkip: lineIteration.lineSkip,
                        priority: LineType.LineEditBlockPriority.HIGH
                    }
                };
            }
        }
        return;
    };

    /**
     * remove trailing whitespace lines from range if there is non-whitespace-character 
     * present. 
     * 
     * @param range target range
     * @returns object descripting where/how to edit the line or undefined if no condition is met.
     * 
     */
    public removeTrailingWhiteSpace = (range: vscode.Range): LineType.LineEditInfo | undefined => {
        const textline = this.getTextLineFromRange(range);
        let whitespacePos: number = LineUtil.findTrailingWhiteSpaceString(textline.text);
        if (LineUtil.isEmptyBlockComment(textline.text)) {
            whitespacePos += 1;
        }

        if (whitespacePos > 0) {
            const textLineLength = (textline.text.length);
            return {
                range: this.newRangeZeroBased(range.start.line, whitespacePos, textLineLength)
            };
        }

        return;
    };

    /**
     * remove continous whitespaces that are longer than 1 from line when
     * there is non-whitespace -character present in line. this will ignore 
     * indentation and edtiing range will start from fisrt non whitespace 
     * character in the line. this funciton will keep the pre-edit range 
     * to overwrite with whitespaces otherwise pre-edit characters will 
     * be left in the line otherwise this callback would need to perform 
     * two edit to achieve removing the whitespaces in delta bigger than 
     * 1. resizing range will only affact to target range but not out or 
     * range. 
     * 
     * @param range target range
     * @returns object descripting where/how to edit the line or undefined if no condition is met.
     * 
     */
    public removeMultipleWhitespace = (range: vscode.Range): LineType.LineEditInfo | undefined => {
        const textLine = this.getTextLineFromRange(range);

        if (LineUtil.findMultipleWhiteSpaceString(textLine.text) && !textLine.isEmptyOrWhitespace) {
            if (LineUtil.isLineInlineComment(textLine.text)) {
                return;
                // const w = LineUtil.getInlineCommentFirstWhitespaces(textLine.text);
                // if (w) {
                //     const tabSize = this.editor?.options.tabSize;
                //     const insertSpaces = this.editor?.options.insertSpaces;
                //     console.log("insertSpaces", insertSpaces)
                //     if ((w[0].length % <number>tabSize) === 1 || !insertSpaces) {
                //     }
                // }
            }
            // console.log(LineUtil.getInlineCommentFirstWhitespaces(textLine.text)[0])
            const newLineText = LineUtil.removeMultipleWhiteSpaceString(textLine.text);
            const startPos = this.getTextLineFromRange(range).firstNonWhitespaceCharacterIndex;
            const endPos = LineUtil.findReverseNonWhitespaceIndex(textLine.text);
            return {
                range: this.newRangeZeroBased(range.start.line, startPos, endPos + 1),
                string: newLineText.padEnd(endPos, " ").trim()
            };
        }
        return;
    };

    /**
     * check if the current cursor or selected range is empty line and
     * next. if both current and next is emtpy, remove current line. 
     * 
     * @param range target range
     * @returns object descripting where/how to edit the line or undefined if no condition is met.
     * 
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
     * 
     */
    public removeCommentedLine = (range: vscode.Range) : LineType.LineEditInfo | undefined => {
        const lineText = this.getText(range);
        const commentIndex = LineUtil.getlineCommentIndex(lineText);

        // if (deleteCommentAlsoDeleteBlockComment) {
        // if (LineUtil.isBlockCommentStartingLine(lineText)) {
                
        // }

        // if (LineUtil.isBlockComment(lineText)) {

        // }

        // if (LineUtil.isBlockCommentEndingLine(lineText)) {

        // }
        // }

        if (LineUtil.isLineCommented(lineText)) {
            return {
                range: this.lineFullRangeWithEOL(range)
            };
        } else if (commentIndex !== -1) {
            return {
                range: this.newRangeZeroBased(range.start.line, commentIndex-1, lineText.length)
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
     * check if the current cursor or selected range is empty line and
     * next. if both current and next is emtpy, remove current line. 
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

    /**
     * remove empty block comment line if the previous line is block comment 
     * start 
     * 
     * @param range
     * @returns
     * 
     */
    public removeEmptyBlockCommentLineOnStart = (range : vscode.Range) : LineType.LineEditInfo | undefined => {
        const currentLine : vscode.TextLine = this.getTextLineFromRange(range);
        const beforeLine : vscode.TextLine = this.getTextLineFromRange(range, -1);
        const blockCommentStart : boolean = LineUtil.isBlockCommentStartingLine(beforeLine.text);

        if (blockCommentStart && LineUtil.isEmptyBlockComment(currentLine.text)) {
            const lineIteration = this.iterateNextLine(range, LineUtil.isEmptyBlockComment);
            if (lineIteration) {
                return {
                    range: new vscode.Range(
                        new vscode.Position(range.start.line, 0),
                        new vscode.Position(lineIteration.lineNumber, 0)
                    ),
                    block : {
                        priority: LineType.LineEditBlockPriority.MID,
                        lineSkip: lineIteration.lineSkip
                    }
                };
            }
        }
        return;
    };

    /**
     * remove current empty block comment line if next line is also empty
     * block comment line. 
     * 
     * @param range
     * @returns
     * 
     */
    public removeMultipleEmptyBlockCommentLine = (range : vscode.Range) : LineType.LineEditInfo | undefined => {
        const currentLine : vscode.TextLine = this.getTextLineFromRange(range);
        const nextLine : vscode.TextLine = this.getTextLineFromRange(range, 1);
        const nextLineIsBlockCommend : boolean = LineUtil.isEmptyBlockComment(nextLine.text);
        const LineIsBlockCommend : boolean = LineUtil.isEmptyBlockComment(currentLine.text);
        const beforeLine : vscode.TextLine = this.getTextLineFromRange(range, -1);
        const blockCommentStart : boolean = LineUtil.isBlockCommentStartingLine(beforeLine.text);

        if (LineIsBlockCommend && nextLineIsBlockCommend && !blockCommentStart) {
            return {
                range: this.lineFullRangeWithEOL(range)
            };
        }
        return;
    };

    /**
     * insert empty block comment line if next line is block comment end
     * 
     * @param range
     * @returns
     * 
     */
    public insertEmptyBlockCommentLineOnEnd = (range : vscode.Range) : LineType.LineEditInfo | undefined => {
        const EOL = this.getEndofLine();
        const currentLine : vscode.TextLine = this.getTextLineFromRange(range);
        const nextLine : vscode.TextLine = this.getTextLineFromRange(range, 1);
        const NextLineblockCommentEnd : boolean = LineUtil.isBlockCommentEndingLine(nextLine.text);

        if (NextLineblockCommentEnd && LineUtil.isBlockComment(currentLine.text)) {
            return {
                range: this.newRangeZeroBased(range.start.line, currentLine.text.length, currentLine.text.length),
                string: EOL + LineUtil.cleanBlockComment(currentLine.text) + " "
            };
        }
        return;
    };

    /**
     * funciton removes empty-lines next block-comment lines. 
     * 
     * @param range range of the line.
     * @returns LineEditInfo or undefined
     * 
     */
    public removeEmptyLinesBetweenBlockCommantAndCode = (range : vscode.Range) : LineType.LineEditInfo | undefined => {
        const currentTextLine = this.getTextLineFromRange(range);
        const previousTextLine = this.getTextLineFromRange(range, -1);
        if (currentTextLine.isEmptyOrWhitespace && LineUtil.isBlockCommentEndingLine(previousTextLine.text)) {
            const lineIteration = this.iterateNextLine(range, "isEmptyOrWhitespace");
            if (lineIteration) {
                return {
                    range: new vscode.Range(
                        new vscode.Position(range.start.line, 0),
                        new vscode.Position(lineIteration.lineNumber, 0)
                    ),
                    block: {
                        lineSkip: lineIteration.lineSkip,
                        priority: LineType.LineEditBlockPriority.HIGH
                    }
                };
            }
        }
        return;
    };

    /**
     * this function needs to do 2 edit, 1 is to add new string at position 
     * 0,0 and delete rest of the un-justified strings. 
     * 
     * @param range
     * @returns
     * 
     */
    public blockCommentWordCountJustifyAlign = (range : vscode.Range) : LineType.LineEditInfo | undefined => {
        const currentTextLine : vscode.TextLine = this.getTextLineFromRange(range);
        const lineTextInArray : string[] = [];
        if (LineUtil.isBlockComment(currentTextLine.text) && !LineUtil.isJSdocTag(currentTextLine.text)) {
            const indentIndex = currentTextLine.text.indexOf("*");
            const indentString = currentTextLine.text.substring(0, indentIndex + 1);
            if (currentTextLine.text.length < (config.BaseLength) || currentTextLine.text.length > (config.BaseLength + config.ToleanceLength)) {
                const trueConditionCallback = (line: vscode.TextLine) => {
                    lineTextInArray.push(...line.text.replaceAll("*", "").trim().split(/\s+/));
                };

                const lineIteration = this.iterateNextLine(range,
                                                            LineUtil.isBlockComment,
                                                            LineUtil.isJSdocTag,
                                                            trueConditionCallback);

                let newString : string = "";
                let newLine = indentString + " ";
                for (const [index, str] of lineTextInArray.entries()) {
                    if (str.length > 0) {
                        newLine += str + " ";
                        if (newLine.length > config.BaseLength) {
                            newString += newLine + this.getEndofLine();
                            newLine = indentString + " ";
                        }
                    }
                    if (index === lineTextInArray.length - 1) {
                        newString += newLine + this.getEndofLine();
                    }
                }
                
                if (lineIteration) {
                    return {
                        range: new vscode.Range(
                            new vscode.Position(range.start.line, 0),
                            new vscode.Position(lineIteration.lineNumber, 0)
                        ),
                        type: LineType.LineEditType.DELETE + LineType.LineEditType.APPEND,
                        string: newString,
                        block: {
                            lineSkip: lineIteration.lineSkip,
                            priority: LineType.LineEditBlockPriority.HIGH
                        }
                    };
                }
            }
        }
        return;
    };

    /**
     * funciton to print current datetime where the cursor is. - locale
     * - iso - custom 
     * 
     * @param range target range, whichi will be the very starting of line.
     * @returns object descripting where/how to edit the line or undefined if no condition is met.
     * 
     */
    public setNowDateTimeOnLine = (range : vscode.Range) : LineType.LineEditInfo | undefined => {
        return {
            range: range,
            string: LineUtil.getNowDateTimeStamp.custom()
        };
    };
}