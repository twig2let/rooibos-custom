"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestSuiteBuilder = void 0;
const brighterscript_1 = require("brighterscript");
const TestGroup_1 = require("./TestGroup");
const Annotation_1 = require("./Annotation");
const TestCase_1 = require("./TestCase");
const TestSuite_1 = require("./TestSuite");
const Diagnostics_1 = require("../utils/Diagnostics");
class TestSuiteBuilder {
    constructor(session) {
        this.session = session;
    }
    processFile(file) {
        var _a;
        this.file = file;
        let suites = [];
        try {
            for (let cs of file.parser.references.classStatements) {
                //a test is comprised of a comment block; followed by a class
                let annotation = (_a = Annotation_1.RooibosAnnotation.getAnnotation(file, cs)) === null || _a === void 0 ? void 0 : _a.blockAnnotation;
                if (annotation) {
                    if (annotation.annotationType === Annotation_1.AnnotationType.TestSuite) {
                        this.addSuiteIfValid(file, annotation, cs, suites);
                    }
                    else {
                        Diagnostics_1.diagnosticWrongAnnotation(file, cs, 'Expected a TestSuite annotation, got: ' + annotation.annotationType);
                        throw new Error('bad test suite');
                    }
                }
            }
        }
        catch (e) {
            // console.log(e);
            Diagnostics_1.diagnosticErrorProcessingFile(file, e.message);
        }
        this.session.sessionInfo.updateTestSuites(suites);
        return suites;
    }
    addSuiteIfValid(file, annotation, s, suites) {
        let oldSuite = this.session.sessionInfo.testSuites.get(annotation.name);
        let suite = this.processClass(annotation, s);
        let isDuplicate = false;
        if ((oldSuite && oldSuite.file.pathAbsolute !==
            file.pathAbsolute)) {
            oldSuite.isValid = false;
            suite.isValid = false;
            Diagnostics_1.diagnosticDuplicateSuite(file, oldSuite.classStatement, oldSuite.annotation);
            isDuplicate = true;
        }
        let duplicateSuites = suites.filter((s) => s.name === suite.name);
        if (duplicateSuites.length > 0) {
            for (let duplicateSuite of duplicateSuites) {
                duplicateSuite.isValid = false;
                Diagnostics_1.diagnosticDuplicateSuite(file, duplicateSuite.classStatement, duplicateSuite.annotation);
            }
            suite.isValid = false;
            isDuplicate = true;
        }
        suites.push(suite);
        if (isDuplicate) {
            Diagnostics_1.diagnosticDuplicateSuite(file, suite.classStatement, suite.annotation);
        }
    }
    processClass(annotation, classStatement) {
        this.testSuite = new TestSuite_1.TestSuite(annotation, classStatement);
        this.currentGroup = null;
        this.annotation = null;
        for (let s of classStatement.body) {
            let { blockAnnotation, testAnnotation } = Annotation_1.RooibosAnnotation.getAnnotation(this.file, s);
            if (blockAnnotation) {
                if (this.annotation) {
                    Diagnostics_1.diagnosticNoGroup(this.file, s, this.annotation.annotationType);
                }
                if (this.currentGroup) {
                    this.testSuite.addGroup(this.currentGroup);
                    if (this.currentGroup.testCases.size === 0) {
                        Diagnostics_1.diagnosticEmptyGroup(this.file, this.currentGroup.annotation);
                    }
                }
                if (!this.createGroup(blockAnnotation)) {
                    this.currentGroup = null;
                    break;
                }
            }
            this.annotation = testAnnotation;
            if (brighterscript_1.isClassMethodStatement(s)) {
                this.processClassMethod(s);
            }
            this.annotation = null;
        }
        if (this.currentGroup) {
            this.testSuite.addGroup(this.currentGroup);
        }
        this.testSuite.isValid = this.testSuite.file.getDiagnostics().length === 0;
        return this.testSuite;
    }
    createGroup(blockAnnotation) {
        if (!this.testSuite.testGroups.has(blockAnnotation.name)) {
            this.currentGroup = new TestGroup_1.TestGroup(this.testSuite, blockAnnotation);
            return true;
        }
        else {
            Diagnostics_1.diagnosticGroupWithNameAlreadyDefined(this.file, blockAnnotation);
            Diagnostics_1.diagnosticGroupWithNameAlreadyDefined(this.file, this.testSuite.testGroups.get(blockAnnotation.name).annotation);
            return false;
        }
    }
    processClassMethod(statement) {
        if (this.annotation) {
            if (!this.currentGroup) {
                Diagnostics_1.diagnosticNoGroup(this.file, statement, this.annotation.annotationType);
            }
            switch (this.annotation.annotationType) {
                case Annotation_1.AnnotationType.It:
                    this.createTestCases(statement, this.annotation);
                    break;
                case Annotation_1.AnnotationType.Setup:
                    this.currentGroup.setupFunctionName = statement.name.text;
                    if (statement.func.parameters.length > 0) {
                        Diagnostics_1.diagnosticWrongParameterCount(this.file, statement, 0);
                    }
                    break;
                case Annotation_1.AnnotationType.TearDown:
                    this.currentGroup.tearDownFunctionName = statement.name.text;
                    if (statement.func.parameters.length > 0) {
                        Diagnostics_1.diagnosticWrongParameterCount(this.file, statement, 0);
                    }
                    break;
                case Annotation_1.AnnotationType.BeforeEach:
                    this.currentGroup.beforeEachFunctionName = statement.name.text;
                    if (statement.func.parameters.length > 0) {
                        Diagnostics_1.diagnosticWrongParameterCount(this.file, statement, 0);
                    }
                    break;
                case Annotation_1.AnnotationType.AfterEach:
                    this.currentGroup.afterEachFunctionName = statement.name.text;
                    if (statement.func.parameters.length > 0) {
                        Diagnostics_1.diagnosticWrongParameterCount(this.file, statement, 0);
                    }
                    break;
                default:
                    break;
            }
        }
    }
    sanitizeFunctionName(name) {
        return name.replace(/[^0-9_a-z]/ig, '_');
    }
    createTestCases(statement, annotation) {
        var _a;
        const lineNumber = statement.func.range.start.line;
        const numberOfArgs = statement.func.parameters.length;
        const numberOfParams = annotation.params.length;
        if (this.currentGroup.testCases.has(annotation.name) || ((_a = this.currentGroup.testCases.get(annotation.name + '0')) === null || _a === void 0 ? void 0 : _a.paramLineNumber)) {
            Diagnostics_1.diagnosticTestWithNameAlreadyDefined(annotation);
            return false;
        }
        let sanitizedTestName = this.sanitizeFunctionName(this.currentGroup.name) + '_' + this.sanitizeFunctionName(annotation.name);
        statement.name.text = sanitizedTestName;
        statement.func.functionStatement.name.text = sanitizedTestName;
        if (numberOfParams > 0) {
            let index = 0;
            for (const param of annotation.params) {
                if (param.params.length === numberOfArgs) {
                    let isSolo = annotation.hasSoloParams ? param.isSolo : annotation.isSolo;
                    let isIgnore = annotation.isIgnore ? true : param.isIgnore;
                    this.currentGroup.addTestCase(new TestCase_1.TestCase(annotation, annotation.name, statement.name.text, isSolo, isIgnore, lineNumber, param.params, index, param.lineNumber, numberOfArgs));
                }
                else {
                    Diagnostics_1.diagnosticWrongTestParameterCount(this.file, param.annotation, param.params.length, numberOfArgs);
                }
                index++;
            }
            return true;
        }
        else if (numberOfParams === 0) {
            if (numberOfArgs === 0) {
                this.currentGroup.addTestCase(new TestCase_1.TestCase(annotation, annotation.name, statement.name.text, annotation.isSolo, annotation.isIgnore, lineNumber));
            }
            else {
                Diagnostics_1.diagnosticTestWithArgsButNoParams(this.file, annotation.annotation, numberOfArgs);
            }
            return true;
        }
        else {
            Diagnostics_1.diagnosticWrongParameterCount(this.file, statement, 0);
        }
    }
}
exports.TestSuiteBuilder = TestSuiteBuilder;
//# sourceMappingURL=TestSuiteBuilder.js.map