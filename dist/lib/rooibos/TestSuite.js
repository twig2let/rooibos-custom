"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestSuite = exports.TestBlock = void 0;
const Diagnostics_1 = require("../utils/Diagnostics");
const Utils_1 = require("./Utils");
/**
 * base of test suites and blocks..
 */
class TestBlock {
    constructor(annotation) {
        this.annotation = annotation;
        this.isValid = false;
        this.isIncluded = false;
        this.hasFailures = false;
        this.hasSoloTests = false;
        this.hasIgnoredTests = false;
    }
    get file() {
        return this.annotation.file;
    }
    get pkgPath() {
        return this.file.pkgPath;
    }
    get filePath() {
        return this.file.pathAbsolute;
    }
    get name() {
        return this.annotation.name;
    }
    get isSolo() {
        return this.annotation.isSolo;
    }
    get isIgnored() {
        return this.annotation.isIgnore;
    }
}
exports.TestBlock = TestBlock;
class TestSuite extends TestBlock {
    constructor(annotation, classStatement) {
        var _a;
        super(annotation);
        this.testGroups = new Map();
        this.hasSoloGroups = false;
        this.isNodeTest = false;
        this.classStatement = classStatement;
        this.isNodeTest = annotation.nodeName && annotation.nodeName.trim() !== '';
        this.nodeName = (_a = annotation.nodeName) === null || _a === void 0 ? void 0 : _a.trim();
        if (!this.name) {
            this.annotation.name = classStatement.name.text;
        }
        this.generatedNodeName = (this.name || 'ERROR').replace(/[^a-zA-Z0-9]/g, '_');
    }
    addGroup(group) {
        this.testGroups.set(group.name, group);
        if (group.ignoredTestCases.length > 0) {
            this.hasIgnoredTests = true;
        }
        if (group.hasSoloTests) {
            this.hasSoloTests = true;
        }
        if (group.isSolo) {
            this.hasSoloGroups = true;
        }
        this.isValid = true;
    }
    addDataFunctions(editor) {
        if (this.isIncluded) {
            Utils_1.addOverriddenMethod(this.file, this.annotation.annotation, this.classStatement, 'getTestSuiteData', `return ${this.asText()}`, editor);
        }
    }
    getTestGroups() {
        return [...this.testGroups.values()];
    }
    validate() {
        if (this.isNodeTest) {
            if (!this.nodeName) {
                Diagnostics_1.diagnosticNodeTestRequiresNode(this.file, this.annotation.annotation);
            }
            else if (!this.file.program.getComponent(this.nodeName)) {
                Diagnostics_1.diagnosticNodeTestIllegalNode(this.file, this.annotation.annotation, this.nodeName);
            }
        }
    }
    asText() {
        let testGroups = this.isIncluded ? [...this.testGroups.values()].filter((testGroup) => testGroup.isIncluded)
            .map((testGroup) => testGroup.asText()) : '';
        return `{
      name: ${Utils_1.sanitizeBsJsonString(this.name)}
      isSolo: ${this.isSolo}
      noCatch: ${this.annotation.noCatch}
      isIgnored: ${this.isIgnored}
      pkgPath: "${this.pkgPath}"
      filePath: "${this.filePath}"
      lineNumber: ${this.classStatement.range.start.line + 1}
      valid: ${this.isValid}
      hasFailures: ${this.hasFailures}
      hasSoloTests: ${this.hasSoloTests}
      hasIgnoredTests: ${this.hasIgnoredTests}
      hasSoloGroups: ${this.hasSoloGroups}
      setupFunctionName: "${this.setupFunctionName || ''}"
      tearDownFunctionName: "${this.tearDownFunctionName || ''}"
      beforeEachFunctionName: "${this.beforeEachFunctionName || ''}"
      afterEachFunctionName: "${this.afterEachFunctionName || ''}"
      isNodeTest: ${this.isNodeTest || false}
      nodeName: "${this.nodeName || ''}"
      generatedNodeName: "${this.generatedNodeName || ''}"
      testGroups: [${testGroups}]
    }`;
    }
}
exports.TestSuite = TestSuite;
//# sourceMappingURL=TestSuite.js.map