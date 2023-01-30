"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnnotationType = exports.RooibosAnnotation = exports.AnnotationParams = exports.AnnotationType = void 0;
const Diagnostics_1 = require("../utils/Diagnostics");
var AnnotationType;
(function (AnnotationType) {
    AnnotationType["None"] = "none";
    AnnotationType["TestSuite"] = "suite";
    AnnotationType["Describe"] = "describe";
    AnnotationType["It"] = "it";
    AnnotationType["Ignore"] = "ignore";
    AnnotationType["Solo"] = "only";
    AnnotationType["NodeTest"] = "sgnode";
    AnnotationType["Setup"] = "setup";
    AnnotationType["TearDown"] = "teardown";
    AnnotationType["BeforeEach"] = "beforeeach";
    AnnotationType["AfterEach"] = "aftereach";
    AnnotationType["Params"] = "params";
    AnnotationType["IgnoreParams"] = "ignoreparams";
    AnnotationType["SoloParams"] = "onlyparams";
    AnnotationType["Tags"] = "tags";
    AnnotationType["NoCatch"] = "nocatch";
    AnnotationType["NoEarlyExit"] = "noearlyexit";
})(AnnotationType = exports.AnnotationType || (exports.AnnotationType = {}));
let annotationLookup = {
    suite: AnnotationType.TestSuite,
    describe: AnnotationType.Describe,
    it: AnnotationType.It,
    ignore: AnnotationType.Ignore,
    only: AnnotationType.Solo,
    sgnode: AnnotationType.NodeTest,
    setup: AnnotationType.Setup,
    teardown: AnnotationType.TearDown,
    beforeeach: AnnotationType.BeforeEach,
    aftereach: AnnotationType.AfterEach,
    params: AnnotationType.Params,
    ignoreparams: AnnotationType.IgnoreParams,
    onlyparams: AnnotationType.SoloParams,
    tags: AnnotationType.Tags,
    nocatch: AnnotationType.NoCatch,
    noearlyexit: AnnotationType.NoEarlyExit
};
class AnnotationParams {
    constructor(annotation, text, lineNumber, params, isIgnore = false, isSolo = false, noCatch = false, noearlyexit = false) {
        this.annotation = annotation;
        this.text = text;
        this.lineNumber = lineNumber;
        this.params = params;
        this.isIgnore = isIgnore;
        this.isSolo = isSolo;
        this.noCatch = noCatch;
        this.noearlyexit = noearlyexit;
    }
}
exports.AnnotationParams = AnnotationParams;
class RooibosAnnotation {
    /**
     * Represents a group of comments which contain tags such as @only, @suite, @describe, @it etc
     * @param statement block of comments that contain annotations to apply to the next statement
     */
    constructor(file, annotation, annotationType, text, name, isIgnore = false, isSolo = false, params = [], nodeName, rawTags = [], noCatch = false, noEarlyExit = false) {
        this.file = file;
        this.annotation = annotation;
        this.annotationType = annotationType;
        this.text = text;
        this.name = name;
        this.isIgnore = isIgnore;
        this.isSolo = isSolo;
        this.params = params;
        this.nodeName = nodeName;
        this.noCatch = noCatch;
        this.noEarlyExit = noEarlyExit;
        this.hasSoloParams = false;
        this.tags = new Set(rawTags);
    }
    static getAnnotation(file, statement) {
        var _a;
        //split annotations in case they include an it group..
        let blockAnnotation;
        let testAnnotation;
        let isSolo = false;
        let isIgnore = false;
        let noCatch = false;
        let noEarlyExit = false;
        let nodeName = null;
        let tags = [];
        if ((_a = statement.annotations) === null || _a === void 0 ? void 0 : _a.length) {
            let describeAnnotations = statement.annotations.filter((a) => getAnnotationType(a.name) === AnnotationType.Describe);
            if (describeAnnotations.length > 1) {
                for (let a of describeAnnotations) {
                    Diagnostics_1.diagnosticMultipleDescribeAnnotations(file, a);
                }
            }
            for (let annotation of statement.annotations) {
                const annotationType = getAnnotationType(annotation.name);
                switch (annotationType) {
                    case AnnotationType.NoEarlyExit:
                        noEarlyExit = true;
                        break;
                    case AnnotationType.NoCatch:
                        noCatch = true;
                        break;
                    case AnnotationType.Solo:
                        isSolo = true;
                        break;
                    case AnnotationType.NodeTest:
                        nodeName = annotation.getArguments()[0];
                        break;
                    case AnnotationType.Tags:
                        tags = annotation.getArguments().map((a) => a.toString());
                        break;
                    case AnnotationType.Ignore:
                        isIgnore = true;
                        break;
                    case AnnotationType.BeforeEach:
                    case AnnotationType.AfterEach:
                    case AnnotationType.Setup:
                    case AnnotationType.TearDown:
                        testAnnotation = new RooibosAnnotation(file, annotation, annotationType, annotation.name, annotation.name);
                        break;
                    case AnnotationType.Describe:
                    case AnnotationType.TestSuite:
                        const groupName = annotation.getArguments()[0];
                        blockAnnotation = new RooibosAnnotation(file, annotation, annotationType, annotation.name, groupName, isIgnore, isSolo, null, nodeName, tags, noCatch, noEarlyExit);
                        nodeName = null;
                        isSolo = false;
                        isIgnore = false;
                        break;
                    case AnnotationType.It:
                        const testName = annotation.getArguments()[0];
                        if (!testName || testName.trim() === '') {
                            Diagnostics_1.diagnosticNoTestNameDefined(file, annotation);
                        }
                        let newAnnotation = new RooibosAnnotation(file, annotation, annotationType, annotation.name, testName, isIgnore, isSolo, undefined, undefined, tags, noCatch);
                        if (testAnnotation) {
                            Diagnostics_1.diagnosticMultipleTestOnFunctionDefined(file, newAnnotation.annotation);
                        }
                        else {
                            testAnnotation = newAnnotation;
                        }
                        isSolo = false;
                        isIgnore = false;
                        break;
                    case AnnotationType.Params:
                    case AnnotationType.SoloParams:
                    case AnnotationType.IgnoreParams:
                        if (testAnnotation) {
                            testAnnotation.parseParams(file, annotation, annotationType, noCatch);
                        }
                        else {
                            //error
                        }
                        break;
                    case AnnotationType.None:
                    default:
                        continue;
                }
            }
        }
        return { blockAnnotation: blockAnnotation, testAnnotation: testAnnotation };
    }
    parseParams(file, annotation, annotationType, noCatch) {
        let rawParams = JSON.stringify(annotation.getArguments());
        let isSolo = annotationType === AnnotationType.SoloParams;
        let isIgnore = annotationType === AnnotationType.IgnoreParams;
        if (isSolo) {
            this.hasSoloParams = true;
        }
        try {
            if (rawParams) {
                this.params.push(new AnnotationParams(annotation, rawParams, annotation.range.start.line, annotation.getArguments(), isIgnore, isSolo, noCatch));
            }
            else {
                Diagnostics_1.diagnosticIllegalParams(file, annotation);
            }
        }
        catch (e) {
            Diagnostics_1.diagnosticIllegalParams(file, annotation);
        }
    }
}
exports.RooibosAnnotation = RooibosAnnotation;
function getAnnotationType(text) {
    return annotationLookup[text.toLowerCase()] || AnnotationType.None;
}
exports.getAnnotationType = getAnnotationType;
//# sourceMappingURL=Annotation.js.map