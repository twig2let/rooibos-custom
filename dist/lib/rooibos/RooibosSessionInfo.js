"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionInfo = exports.SessionInfo = void 0;
class SessionInfo {
    constructor(config) {
        this.config = config;
        this.ignoredCount = 0;
        this.ignoredTestNames = [];
        this.allTestSuites = new Set();
        this.testSuites = new Map();
        this.testSuitesByPath = new Map();
        this.testSuitesToRun = [];
        this.hasSoloSuites = false;
        this.hasSoloGroups = false;
        this.hasSoloTests = false;
        this.testsCount = 0;
        this.suitesCount = 0;
        this.groupsCount = 0;
        this.includeTags = [];
        this.excludeTags = [];
        for (let tag of config.tags || []) {
            if (tag.startsWith('!')) {
                this.excludeTags.push(tag.substr(1));
            }
            else {
                this.includeTags.push(tag);
            }
        }
    }
    updateTestSuites(testSuites) {
        //we can assume at this point that all suites coming in belong to same file
        //incase that is useful in future
        for (let testSuite of testSuites) {
            if (testSuite.isValid && !this.isExcludedByTag(testSuite, false)) {
                this.testSuites.set(testSuite.name, testSuite);
                this.addTestSuiteToPath(testSuite);
                if (testSuite.isSolo) {
                    this.hasSoloSuites = !this.hasSoloGroups && !this.hasSoloTests;
                }
                if (testSuite.hasSoloGroups) {
                    this.hasSoloGroups = !this.hasSoloTests;
                }
                if (testSuite.hasSoloTests) {
                    this.hasSoloTests = true;
                    this.hasSoloGroups = false;
                    this.hasSoloSuites = false;
                }
            }
            else {
                this.allTestSuites.add(testSuite);
            }
        }
        this.suitesCount = this.testSuites.size;
    }
    addTestSuiteToPath(testSuite) {
        let suites = this.testSuitesByPath.get(testSuite.file.pkgPath) || [];
        //TODO - I think we could end up with duplicate suites in this case..
        suites.push(testSuite);
        this.testSuitesByPath.set(testSuite.file.pkgPath, suites);
    }
    /**
     * Once we know what's ignored/solo/etc, we can ascertain if we're going
     * to include it in the final json payload
     */
    updateInfo() {
        this.resetCounts();
        for (let testSuite of [...this.testSuites.values()]) {
            if (this.isExcludedByTag(testSuite, false)) {
                testSuite.isIncluded = false;
            }
            else if (this.hasSoloTests && !testSuite.hasSoloTests) {
                testSuite.isIncluded = false;
            }
            else if (this.hasSoloSuites && !testSuite.isSolo) {
                testSuite.isIncluded = false;
            }
            else if (testSuite.isIgnored) {
                testSuite.isIncluded = false;
                this.ignoredTestNames.push(testSuite.name + ' [WHOLE SUITE]');
                this.ignoredCount++;
            }
            else {
                testSuite.isIncluded = true;
            }
            if (!testSuite.isIncluded) {
                continue;
            }
            //'testSuite  ' + testSuite.name);
            for (let testGroup of testSuite.getTestGroups()) {
                //'GROUP  ' + testGroup.name);
                if (testGroup.isIgnored) {
                    this.ignoredCount += testGroup.ignoredTestCases.length;
                    this.ignoredTestNames.push(testGroup.name + ' [WHOLE GROUP]');
                    testGroup.isIncluded = false;
                }
                else {
                    if (testGroup.ignoredTestCases.length > 0) {
                        this.ignoredTestNames.push(testGroup.name);
                        this.ignoredCount += testGroup.ignoredTestCases.length;
                        for (let ignoredTestCase of testGroup.ignoredTestCases) {
                            if (!ignoredTestCase.isParamTest) {
                                this.ignoredTestNames.push(ignoredTestCase.name);
                            }
                            else if (ignoredTestCase.paramTestIndex === 0) {
                                let testCaseName = ignoredTestCase.name;
                                if (testCaseName.length > 1 && testCaseName.substr(testCaseName.length - 1) === '0') {
                                    testCaseName = testCaseName.substr(0, testCaseName.length - 1);
                                }
                                this.ignoredTestNames.push(testCaseName);
                            }
                        }
                    }
                    if (this.isExcludedByTag(testGroup, true)) {
                        testGroup.isIncluded = false;
                    }
                    else if (this.hasSoloTests && !testGroup.hasSoloTests) {
                        testGroup.isIncluded = false;
                    }
                    else if (this.hasSoloGroups && !testGroup.isSolo) {
                        testGroup.isIncluded = false;
                    }
                    else {
                        testGroup.isIncluded = true;
                    }
                    if (testGroup.isIncluded) {
                        this.groupsCount++;
                        let testCases = [...testGroup.testCases.values()];
                        for (let testCase of testCases) {
                            if (this.isExcludedByTag(testCase, true)) {
                                testCase.isIncluded = false;
                            }
                            else if (testCase.isIgnored) {
                                testCase.isIncluded = false;
                            }
                            else if (this.hasSoloTests && !testCase.isSolo) {
                                testCase.isIncluded = false;
                            }
                            else {
                                testCase.isIncluded = testGroup.isIncluded || testCase.isSolo;
                                this.testsCount++;
                            }
                        }
                        for (let testCase of testGroup.soloTestCases) {
                            if (this.isExcludedByTag(testCase, true)) {
                                testCase.isIncluded = false;
                            }
                            else {
                                testCase.isIncluded = true;
                                this.testsCount++;
                            }
                        }
                    }
                }
            }
        }
        this.testSuitesToRun = [...this.testSuites.values()].filter((s) => s.isIncluded);
    }
    isExcludedByTag(item, isParentIncluded) {
        if (this.excludeTags.length > 0) {
            for (let tag of this.excludeTags) {
                if (item.annotation.tags.has(tag)) {
                    return true;
                }
            }
        }
        if (this.includeTags.length > 0 && (item.annotation.tags.size > 0 || !isParentIncluded)) {
            for (let tag of this.includeTags) {
                if (!item.annotation.tags.has(tag)) {
                    return true;
                }
            }
        }
        return false;
    }
    resetCounts() {
        this.hasSoloTests = false;
        this.hasSoloGroups = false;
        this.hasSoloSuites = false;
        for (let testSuite of [...this.testSuites.values()]) {
            if (testSuite.isValid && !this.isExcludedByTag(testSuite, false)) {
                if (testSuite.isSolo) {
                    this.hasSoloSuites = !this.hasSoloGroups && !this.hasSoloTests;
                }
                if (testSuite.hasSoloGroups) {
                    this.hasSoloGroups = !this.hasSoloTests;
                }
                if (testSuite.hasSoloTests) {
                    this.hasSoloTests = true;
                    this.hasSoloGroups = false;
                    this.hasSoloSuites = false;
                }
            }
        }
        this.suitesCount = this.testSuites.size;
    }
}
exports.SessionInfo = SessionInfo;
let _sessionInfo;
function getSessionInfo() {
    return _sessionInfo;
}
exports.getSessionInfo = getSessionInfo;
//# sourceMappingURL=RooibosSessionInfo.js.map