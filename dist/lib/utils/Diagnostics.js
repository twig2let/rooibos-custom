"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diagnosticCorruptTestProduced = exports.diagnosticMultipleTestOnFunctionDefined = exports.diagnosticMultipleDescribeAnnotations = exports.diagnosticNoTestNameDefined = exports.diagnosticTestWithArgsButNoParams = exports.diagnosticNoTestFunctionDefined = exports.diagnosticEmptyGroup = exports.diagnosticErrorNoMainFound = exports.diagnosticErrorProcessingFile = exports.diagnosticIncompatibleAnnotation = exports.diagnosticTestWithNameAlreadyDefined = exports.diagnosticGroupWithNameAlreadyDefined = exports.diagnosticNodeTestIllegalNode = exports.diagnosticNodeTestRequiresNode = exports.diagnosticWrongTestParameterCount = exports.diagnosticIllegalParams = exports.diagnosticTestAnnotationOutsideOfGroup = exports.diagnosticDuplicateSuite = exports.diagnosticWrongParameterCount = exports.diagnosticNoGroup = exports.diagnosticWrongAnnotation = void 0;
const brighterscript_1 = require("brighterscript");
function addDiagnostic(file, code, message, startLine = 0, startCol = 0, endLine = -1, endCol = 99999, severity = brighterscript_1.DiagnosticSeverity.Error) {
    endLine = endLine === -1 ? startLine : endLine;
    file.addDiagnostics([createDiagnostic(file, code, message, startLine, startCol, endLine, endCol, severity)]);
}
function addDiagnosticForStatement(file, code, message, statement, severity = brighterscript_1.DiagnosticSeverity.Error) {
    let line = statement.range.start.line;
    let col = statement.range.start.character;
    file.addDiagnostics([createDiagnostic(file, code, message, line, col, line, 999999, severity)]);
}
function addDiagnosticForAnnotation(file, code, message, annotation, severity = brighterscript_1.DiagnosticSeverity.Error, endChar) {
    let line = annotation.range.start.line;
    let col = annotation.range.start.character;
    file.addDiagnostics([createDiagnostic(file, code, message, line, col, annotation.range.end.line, annotation.range.end.character + 9999, severity)]);
}
function createDiagnostic(bscFile, code, message, startLine = 0, startCol = 99999, endLine = 0, endCol = 99999, severity = brighterscript_1.DiagnosticSeverity.Error) {
    const diagnostic = {
        code: `RBS${code}`,
        message: message,
        range: brighterscript_1.Range.create(startLine, startCol, endLine, endCol),
        file: bscFile,
        severity: severity
    };
    return diagnostic;
}
/**
 * Public methods
 */
function diagnosticWrongAnnotation(file, statement, message) {
    addDiagnosticForStatement(file, 2200, 'Wrong kind of annotation.' + message, statement);
}
exports.diagnosticWrongAnnotation = diagnosticWrongAnnotation;
function diagnosticNoGroup(file, statement, annotationType) {
    addDiagnosticForStatement(file, 2201, `Cannot process ${annotationType} of a test group`, statement);
}
exports.diagnosticNoGroup = diagnosticNoGroup;
function diagnosticWrongParameterCount(file, statement, expectedParamCount = 0) {
    addDiagnosticForStatement(file, 2202, `Function ${statement.name} defined with wrong number of params: expected ${expectedParamCount}`, statement);
}
exports.diagnosticWrongParameterCount = diagnosticWrongParameterCount;
function diagnosticDuplicateSuite(file, statement, annotation) {
    addDiagnosticForStatement(file, 2203, `Test suite already declared with name: ${annotation.name}. This test suite will be skipped.`, statement);
}
exports.diagnosticDuplicateSuite = diagnosticDuplicateSuite;
function diagnosticTestAnnotationOutsideOfGroup(file, statement, annotation) {
    addDiagnosticForStatement(file, 2204, `Found Group, when a test function was expected`, statement);
}
exports.diagnosticTestAnnotationOutsideOfGroup = diagnosticTestAnnotationOutsideOfGroup;
function diagnosticIllegalParams(file, annotation) {
    addDiagnosticForAnnotation(file, 2205, `Could not parse params for test.`, annotation);
}
exports.diagnosticIllegalParams = diagnosticIllegalParams;
function diagnosticWrongTestParameterCount(file, annotation, gotCount = 0, expectedParamCount = 0) {
    addDiagnosticForAnnotation(file, 2206, `Params for test do not match arg count on method. Got ${gotCount} expected ${expectedParamCount}`, annotation);
}
exports.diagnosticWrongTestParameterCount = diagnosticWrongTestParameterCount;
function diagnosticNodeTestRequiresNode(file, annotation) {
    addDiagnosticForAnnotation(file, 2207, `Node name must be declared for a node test. This is the component that the generated test will extend.`, annotation);
}
exports.diagnosticNodeTestRequiresNode = diagnosticNodeTestRequiresNode;
function diagnosticNodeTestIllegalNode(file, annotation, nodeName) {
    addDiagnosticForAnnotation(file, 2208, `Component ${nodeName}, is not found in this project. Node tests generate a new component that extends the component you wish to test. Please make sure that component exists and compiles.`, annotation);
}
exports.diagnosticNodeTestIllegalNode = diagnosticNodeTestIllegalNode;
function diagnosticGroupWithNameAlreadyDefined(file, annotation) {
    addDiagnosticForAnnotation(file, 2209, `Test group with name ${annotation.name}, is already declared in this suite. Ignoring`, annotation.annotation);
}
exports.diagnosticGroupWithNameAlreadyDefined = diagnosticGroupWithNameAlreadyDefined;
function diagnosticTestWithNameAlreadyDefined(annotation) {
    addDiagnosticForAnnotation(annotation.file, 2210, `Test with name ${annotation.name}, is already declared in this group. Ignoring`, annotation.annotation);
}
exports.diagnosticTestWithNameAlreadyDefined = diagnosticTestWithNameAlreadyDefined;
function diagnosticIncompatibleAnnotation(annotation) {
    addDiagnosticForAnnotation(annotation.file, 2211, `Was expecting a function, got a test annotation`, annotation.annotation);
}
exports.diagnosticIncompatibleAnnotation = diagnosticIncompatibleAnnotation;
function diagnosticErrorProcessingFile(file, message) {
    addDiagnostic(file, 2212, `General error : ` + message);
}
exports.diagnosticErrorProcessingFile = diagnosticErrorProcessingFile;
function diagnosticErrorNoMainFound(file) {
    addDiagnostic(file, 2213, `Could not find main function to inject rooibos launch code. Rooibos has added one for you`, 1, 1, 1, 1, brighterscript_1.DiagnosticSeverity.Warning);
}
exports.diagnosticErrorNoMainFound = diagnosticErrorNoMainFound;
function diagnosticEmptyGroup(file, annotation) {
    addDiagnosticForAnnotation(file, 2214, `Test group with name ${annotation.name}, empty.`, annotation.annotation);
}
exports.diagnosticEmptyGroup = diagnosticEmptyGroup;
function diagnosticNoTestFunctionDefined(file, annotation) {
    addDiagnosticForAnnotation(file, 2215, `Multiple test annotations per function are not allowed. ${annotation.name || ''}`, annotation.annotation);
}
exports.diagnosticNoTestFunctionDefined = diagnosticNoTestFunctionDefined;
function diagnosticTestWithArgsButNoParams(file, annotation, gotCount = 0) {
    addDiagnosticForAnnotation(file, 2216, `Test method signature has arguments; but test has no paremeters. Got ${gotCount} args: expected 0. Did you forget your @params annotations?`, annotation);
}
exports.diagnosticTestWithArgsButNoParams = diagnosticTestWithArgsButNoParams;
function diagnosticNoTestNameDefined(file, annotation) {
    addDiagnosticForAnnotation(file, 2217, `It annotation requires a name  `, annotation);
}
exports.diagnosticNoTestNameDefined = diagnosticNoTestNameDefined;
function diagnosticMultipleDescribeAnnotations(file, annotation) {
    addDiagnosticForAnnotation(file, 2218, `Found multiple @describe annotations. Did you forget to write some tests?`, annotation);
}
exports.diagnosticMultipleDescribeAnnotations = diagnosticMultipleDescribeAnnotations;
function diagnosticMultipleTestOnFunctionDefined(file, annotation) {
    addDiagnosticForAnnotation(file, 2219, `Found multiple @it annotations. Did you forget to write some tests?`, annotation);
}
exports.diagnosticMultipleTestOnFunctionDefined = diagnosticMultipleTestOnFunctionDefined;
function diagnosticCorruptTestProduced(file, annotation, error, source) {
    addDiagnosticForAnnotation(file, 2220, `The test resulted in a corrupt data file. This is typically because one of the param tests resulted in a failed transpilation. Please raise an issue with as much of your test file as possible to reproduce the issue.\n ${error} \n ${source} `, annotation);
}
exports.diagnosticCorruptTestProduced = diagnosticCorruptTestProduced;
//# sourceMappingURL=Diagnostics.js.map