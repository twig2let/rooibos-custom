"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RooibosPlugin = void 0;
const brighterscript_1 = require("brighterscript");
const RooibosSession_1 = require("./lib/rooibos/RooibosSession");
const CodeCoverageProcessor_1 = require("./lib/rooibos/CodeCoverageProcessor");
const FileFactory_1 = require("./lib/rooibos/FileFactory");
const minimatch = require("minimatch");
class RooibosPlugin {
    constructor() {
        this.name = 'rooibosPlugin';
    }
    beforeProgramCreate(builder) {
        this._builder = builder;
        this.config = this.getConfig(builder.options.rooibos || {});
        this.fileFactory = new FileFactory_1.FileFactory(this.config);
        if (!this.session) {
            this.session = new RooibosSession_1.RooibosSession(builder, this.fileFactory);
            this.codeCoverageProcessor = new CodeCoverageProcessor_1.CodeCoverageProcessor(builder);
        }
    }
    getConfig(options) {
        let config = options;
        if (config.printTestTimes === undefined) {
            config.printTestTimes = true;
        }
        if (config.catchCrashes === undefined) {
            config.catchCrashes = true;
        }
        if (config.sendHomeOnFinish === undefined) {
            config.sendHomeOnFinish = true;
        }
        if (config.failFast === undefined) {
            config.failFast = true;
        }
        if (config.showOnlyFailures === undefined) {
            config.showOnlyFailures = true;
        }
        if (config.isRecordingCodeCoverage === undefined) {
            config.isRecordingCodeCoverage = true;
        }
        //ignore roku modules by default
        if (config.includeFilters === undefined) {
            config.includeFilters = [
                '**/*.spec.bs',
                '!**/BaseTestSuite.spec.bs',
                '!**/roku_modules/**/*'
            ];
        }
        return config;
    }
    afterProgramCreate(program) {
        this.fileFactory.addFrameworkFiles(program);
    }
    afterFileParse(file) {
        // console.log('afp', file.pkgPath);
        if (file.pathAbsolute.includes('/rooibos/bsc-plugin/dist/framework')) {
            // eslint-disable-next-line @typescript-eslint/dot-notation
            file['diagnostics'] = [];
            return;
        }
        if (this.fileFactory.isIgnoredFile(file) || !this.shouldSearchInFileForTests(file)) {
            return;
        }
        console.log('processing ', file.pkgPath);
        if (brighterscript_1.isBrsFile(file)) {
            if (this.session.processFile(file)) {
                //
            }
            else {
                this.codeCoverageProcessor.addCodeCoverage(file);
            }
        }
    }
    beforeProgramTranspile(program, entries, editor) {
        this.session.addTestRunnerMetadata(editor);
        this.session.addLaunchHookToExistingMain(editor);
    }
    afterProgramTranspile(program, entries, editor) {
        this.session.addLaunchHookFileIfNotPresent();
    }
    beforeFileTranspile(event) {
        let testSuite = this.session.sessionInfo.testSuitesToRun.find((ts) => ts.file.pkgPath === event.file.pkgPath);
        if (testSuite) {
            let noEarlyExit = testSuite.annotation.noEarlyExit;
            if (noEarlyExit) {
                console.warn(`WARNING: testSuite "${testSuite.name}" is marked as noEarlyExit`);
            }
            testSuite.addDataFunctions(event.editor);
            for (let group of [...testSuite.testGroups.values()].filter((tg) => tg.isIncluded)) {
                for (let testCase of [...group.testCases.values()].filter((tc) => tc.isIncluded)) {
                    group.modifyAssertions(testCase, noEarlyExit, event.editor);
                }
            }
            if (testSuite.isNodeTest) {
                this.session.createNodeFile(event.program, testSuite);
            }
        }
    }
    afterProgramValidate(program) {
        // console.log('bpv');
        this.session.updateSessionStats();
        for (let testSuite of [...this.session.sessionInfo.testSuites.values()]) {
            testSuite.validate();
        }
        for (let file of this.fileFactory.addedFrameworkFiles) {
            // eslint-disable-next-line @typescript-eslint/dot-notation
            file['diagnostics'] = [];
        }
    }
    shouldSearchInFileForTests(file) {
        if (!this.config.includeFilters || this.config.includeFilters.length === 0) {
            return true;
        }
        else {
            for (let filter of this.config.includeFilters) {
                if (!minimatch(file.pathAbsolute, filter)) {
                    return false;
                }
            }
        }
        // console.log('including ', file.pkgPath);
        return true;
    }
}
exports.RooibosPlugin = RooibosPlugin;
exports.default = () => {
    return new RooibosPlugin();
};
//# sourceMappingURL=plugin.js.map