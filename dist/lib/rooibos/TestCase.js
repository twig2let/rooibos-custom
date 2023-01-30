"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestCase = void 0;
const Utils_1 = require("./Utils");
class TestCase {
    constructor(annotation, name, funcName, isSolo, isIgnored, lineNumber, params = null, paramTestIndex = 0, paramLineNumber = 0, expectedNumberOfParams = 0) {
        this.annotation = annotation;
        this.isSolo = isSolo;
        this.funcName = funcName;
        this.isIgnored = isIgnored;
        this.name = name;
        this.lineNumber = lineNumber;
        this.paramLineNumber = paramLineNumber;
        this.assertIndex = 0;
        this.assertLineNumberMap = {};
        this.rawParams = params;
        this.expectedNumberOfParams = expectedNumberOfParams;
        this.paramTestIndex = paramTestIndex;
        this.isParamTest = this.expectedNumberOfParams > 0;
    }
    asText() {
        let rawParamsText = this.fixBadJson(this.rawParams).replace(/null/g, 'invalid');
        return `
        {
          isSolo: ${this.isSolo}
          noCatch: ${this.annotation.noCatch}
          funcName: "${this.funcName || ''}"
          isIgnored: ${this.isIgnored}
          isParamTest: ${this.isParamTest}
          name: ${Utils_1.sanitizeBsJsonString(this.name)}
          lineNumber: ${this.lineNumber + 2}
          paramLineNumber: ${this.paramLineNumber}
          assertIndex: ${this.assertIndex}
          assertLineNumberMap: ${JSON.stringify(this.assertLineNumberMap)}
          rawParams: ${rawParamsText}
          paramTestIndex: ${this.paramTestIndex}
          expectedNumberOfParams: ${this.expectedNumberOfParams}
          isParamsValid: ${(this.rawParams || []).length === this.expectedNumberOfParams}
        }`;
    }
    addAssertLine(lineNumber) {
        this.assertLineNumberMap[this.assertIndex.toString().trim()] = lineNumber;
        this.assertIndex++;
    }
    fixBadJson(o) {
        // In case of an array we'll stringify all objects.
        if (Array.isArray(o)) {
            return `[${o
                .map(obj => `${this.fixBadJson(obj)}`)
                .join(',')}]`;
        }
        // not an object, stringify using native function
        if (typeof o !== 'object' || o === null) {
            return JSON.stringify(o);
        }
        return `{${Object
            .keys(o)
            .map(key => {
            return `"${key.replace(/"/g, '')}":${this.fixBadJson(o[key])}`;
        })
            .join(',')}}`;
    }
}
exports.TestCase = TestCase;
//# sourceMappingURL=TestCase.js.map