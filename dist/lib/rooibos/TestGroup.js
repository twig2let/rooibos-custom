"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestGroup = void 0;
const brighterscript_1 = require("brighterscript");
const brighterscript = require("brighterscript");
const BrsTranspileState_1 = require("brighterscript/dist/parser/BrsTranspileState");
const Diagnostics_1 = require("../utils/Diagnostics");
const TestSuite_1 = require("./TestSuite");
const Utils_1 = require("./Utils");
const undent_1 = require("undent");
class TestGroup extends TestSuite_1.TestBlock {
    constructor(testSuite, annotation) {
        super(annotation);
        this.testCases = new Map();
        this.ignoredTestCases = [];
        this.soloTestCases = [];
        this.testSuite = testSuite;
        this.setupFunctionName = this.setupFunctionName || this.testSuite.setupFunctionName;
        this.tearDownFunctionName = this.tearDownFunctionName || this.testSuite.tearDownFunctionName;
        this.beforeEachFunctionName = this.beforeEachFunctionName || this.testSuite.beforeEachFunctionName;
        this.afterEachFunctionName = this.afterEachFunctionName || this.testSuite.afterEachFunctionName;
    }
    addTestCase(testCase) {
        this.testCases.set(testCase.name + (testCase.isParamTest ? testCase.paramTestIndex.toString() : ''), testCase);
        if (testCase.isIgnored) {
            this.ignoredTestCases.push(testCase);
            this.hasIgnoredTests = true;
        }
        else if (testCase.isSolo) {
            this.hasSoloTests = true;
            this.soloTestCases.push(testCase);
        }
    }
    getTestCases() {
        return [...this.testCases.values()];
    }
    modifyAssertions(testCase, noEarlyExit, editor) {
        //for each method
        //if assertion
        //wrap with if is not fail
        //add line number as last param
        const transpileState = new BrsTranspileState_1.BrsTranspileState(this.file);
        try {
            let func = this.testSuite.classStatement.methods.find((m) => m.name.text.toLowerCase() === testCase.funcName.toLowerCase());
            func.walk(brighterscript.createVisitor({
                ExpressionStatement: (expressionStatement) => {
                    let callExpression = expressionStatement.expression;
                    if (brighterscript.isCallExpression(callExpression) && brighterscript.isDottedGetExpression(callExpression.callee)) {
                        let dge = callExpression.callee;
                        let assertRegex = /(?:fail|assert(?:[a-z0-9]*)|expect(?:[a-z0-9]*)|stubCall)/i;
                        if (dge && assertRegex.test(dge.name.text)) {
                            if (dge.name.text === 'stubCall') {
                                this.modifyModernRooibosExpectCallExpression(callExpression, editor);
                                return expressionStatement;
                            }
                            else {
                                if (dge.name.text === 'expectCalled' || dge.name.text === 'expectNotCalled') {
                                    this.modifyModernRooibosExpectCallExpression(callExpression, editor);
                                }
                                //TODO change this to editor.setProperty(parentObj, parentKey, new SourceNode()) once bsc supports it
                                Utils_1.overrideAstTranspile(editor, expressionStatement, '\n' + undent_1.default `
                                    m.currentAssertLineNumber = ${callExpression.range.start.line}
                                    ${callExpression.transpile(transpileState).join('')}
                                    ${noEarlyExit ? '' : 'if m.currentResult.isFail then return invalid'}
                                ` + '\n');
                            }
                        }
                    }
                }
            }), {
                walkMode: brighterscript.WalkMode.visitStatementsRecursive
            });
        }
        catch (e) {
            // console.log(e);
            Diagnostics_1.diagnosticErrorProcessingFile(this.testSuite.file, e.message);
        }
    }
    modifyModernRooibosExpectCallExpression(callExpression, editor) {
        let isNotCalled = false;
        let isStubCall = false;
        if (brighterscript_1.isDottedGetExpression(callExpression.callee)) {
            const nameText = callExpression.callee.name.text;
            editor.setProperty(callExpression.callee.name, 'text', `_${nameText}`);
            isNotCalled = nameText === 'expectNotCalled';
            isStubCall = nameText === 'stubCall';
        }
        //modify args
        let arg0 = callExpression.args[0];
        if (brighterscript.isCallExpression(arg0) && brighterscript_1.isDottedGetExpression(arg0.callee)) {
            let functionName = arg0.callee.name.text;
            let fullPath = this.getStringPathFromDottedGet(arg0.callee.obj);
            editor.removeFromArray(callExpression.args, 0);
            if (!isNotCalled && !isStubCall) {
                const expectedArgs = new brighterscript_1.ArrayLiteralExpression(arg0.args, brighterscript_1.createToken(brighterscript_1.TokenKind.LeftSquareBracket), brighterscript_1.createToken(brighterscript_1.TokenKind.RightSquareBracket));
                editor.addToArray(callExpression.args, 0, expectedArgs);
            }
            editor.addToArray(callExpression.args, 0, fullPath !== null && fullPath !== void 0 ? fullPath : brighterscript_1.createInvalidLiteral());
            editor.addToArray(callExpression.args, 0, this.getRootObjectFromDottedGet(arg0.callee));
            editor.addToArray(callExpression.args, 0, brighterscript_1.createStringLiteral(functionName));
            editor.addToArray(callExpression.args, 0, arg0.callee.obj);
        }
        else if (brighterscript.isDottedGetExpression(arg0)) {
            let functionName = arg0.name.text;
            let fullPath = this.getStringPathFromDottedGet(arg0.obj);
            arg0 = callExpression.args[0];
            editor.removeFromArray(callExpression.args, 0);
            if (!isNotCalled && !isStubCall) {
                editor.addToArray(callExpression.args, 0, brighterscript_1.createInvalidLiteral());
            }
            editor.addToArray(callExpression.args, 0, fullPath !== null && fullPath !== void 0 ? fullPath : brighterscript_1.createInvalidLiteral());
            editor.addToArray(callExpression.args, 0, this.getRootObjectFromDottedGet(arg0));
            editor.addToArray(callExpression.args, 0, brighterscript_1.createStringLiteral(functionName));
            editor.addToArray(callExpression.args, 0, arg0.obj);
        }
        else if (brighterscript.isCallfuncExpression(arg0)) {
            let functionName = arg0.methodName.text;
            editor.removeFromArray(callExpression.args, 0);
            if (isNotCalled || isStubCall) {
                //TODO in future we can improve is notCalled to know which callFunc function it is
                // const expectedArgs = new ArrayLiteralExpression([createStringLiteral(functionName)], createToken(TokenKind.LeftSquareBracket), createToken(TokenKind.RightSquareBracket));
                // editor.addToArray(callExpression.args, 0, expectedArgs);
            }
            else {
                const expectedArgs = new brighterscript_1.ArrayLiteralExpression([brighterscript_1.createStringLiteral(functionName), ...arg0.args], brighterscript_1.createToken(brighterscript_1.TokenKind.LeftSquareBracket), brighterscript_1.createToken(brighterscript_1.TokenKind.RightSquareBracket));
                editor.addToArray(callExpression.args, 0, expectedArgs);
            }
            let fullPath = this.getStringPathFromDottedGet(arg0.callee);
            editor.addToArray(callExpression.args, 0, fullPath !== null && fullPath !== void 0 ? fullPath : brighterscript_1.createInvalidLiteral());
            editor.addToArray(callExpression.args, 0, this.getRootObjectFromDottedGet(arg0.callee));
            editor.addToArray(callExpression.args, 0, brighterscript_1.createStringLiteral('callFunc'));
            editor.addToArray(callExpression.args, 0, arg0.callee);
        }
    }
    asText() {
        let testCaseText = [...this.testCases.values()].filter((tc) => tc.isIncluded).map((tc) => tc.asText());
        return `
            {
                name: ${Utils_1.sanitizeBsJsonString(this.name)}
                isSolo: ${this.isSolo}
                isIgnored: ${this.isIgnored}
                filename: "${this.pkgPath}"
                lineNumber: "${this.annotation.annotation.range.start.line}"
                setupFunctionName: "${this.setupFunctionName || ''}"
                tearDownFunctionName: "${this.tearDownFunctionName || ''}"
                beforeEachFunctionName: "${this.beforeEachFunctionName || ''}"
                afterEachFunctionName: "${this.afterEachFunctionName || ''}"
                testCases: [${testCaseText.join(',\n')}]
            }`;
    }
    getStringPathFromDottedGet(value) {
        let parts = [this.getPathValuePartAsString(value)];
        let root;
        root = value.obj;
        while (root) {
            if (brighterscript_1.isCallExpression(root) || brighterscript_1.isCallfuncExpression(root)) {
                return undefined;
            }
            parts.push(`${this.getPathValuePartAsString(root)}`);
            root = root.obj;
        }
        let joinedParts = parts.reverse().join('.');
        return joinedParts === '' ? undefined : brighterscript_1.createStringLiteral(joinedParts);
    }
    getPathValuePartAsString(expr) {
        if (brighterscript_1.isCallExpression(expr) || brighterscript_1.isCallfuncExpression(expr)) {
            return undefined;
        }
        if (brighterscript_1.isVariableExpression(expr)) {
            return expr.name.text;
        }
        if (!expr) {
            return undefined;
        }
        if (brighterscript_1.isDottedGetExpression(expr)) {
            return expr.name.text;
        }
        else if (brighterscript_1.isIndexedGetExpression(expr)) {
            if (brighterscript_1.isLiteralExpression(expr.index)) {
                return `${expr.index.token.text.replace(/^"/, '').replace(/"$/, '')}`;
            }
            else if (brighterscript_1.isVariableExpression(expr.index)) {
                return `${expr.index.name.text}`;
            }
        }
    }
    getRootObjectFromDottedGet(value) {
        let root;
        if (brighterscript_1.isDottedGetExpression(value) || brighterscript_1.isIndexedGetExpression(value)) {
            root = value.obj;
            while (root.obj) {
                root = root.obj;
            }
        }
        else {
            root = value;
        }
        return root;
    }
}
exports.TestGroup = TestGroup;
//# sourceMappingURL=TestGroup.js.map