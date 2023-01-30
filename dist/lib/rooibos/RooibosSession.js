"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RooibosSession = void 0;
const path = require("path");
const brighterscript_1 = require("brighterscript");
const RooibosSessionInfo_1 = require("./RooibosSessionInfo");
const TestSuiteBuilder_1 = require("./TestSuiteBuilder");
const RawCodeStatement_1 = require("./RawCodeStatement");
const Diagnostics_1 = require("../utils/Diagnostics");
const undent_1 = require("undent");
const fsExtra = require("fs-extra");
// eslint-disable-next-line
const pkg = require('../../../package.json');
class RooibosSession {
    constructor(builder, fileFactory) {
        this.fileFactory = fileFactory;
        this.config = builder.options ? builder.options.rooibos || {} : {};
        this._builder = builder;
        this._suiteBuilder = new TestSuiteBuilder_1.TestSuiteBuilder(this);
        this.reset();
    }
    reset() {
        this.sessionInfo = new RooibosSessionInfo_1.SessionInfo(this.config);
    }
    updateSessionStats() {
        this.sessionInfo.updateInfo();
    }
    processFile(file) {
        let testSuites = this._suiteBuilder.processFile(file);
        return testSuites.length > 0;
    }
    addLaunchHookToExistingMain(editor) {
        let mainFunction;
        const files = this._builder.program.getScopeByName('source').getOwnFiles();
        for (let file of files) {
            if (brighterscript_1.isBrsFile(file)) {
                const mainFunc = file.parser.references.functionStatements.find((f) => f.name.text.toLowerCase() === 'main');
                if (mainFunc) {
                    mainFunction = mainFunc;
                    break;
                }
            }
        }
        if (mainFunction) {
            editor.addToArray(mainFunction.func.body.statements, 0, new RawCodeStatement_1.RawCodeStatement(`Rooibos_init()`));
        }
    }
    addLaunchHookFileIfNotPresent() {
        let mainFunction;
        const files = this._builder.program.getScopeByName('source').getOwnFiles();
        for (let file of files) {
            if (brighterscript_1.isBrsFile(file)) {
                const mainFunc = file.parser.references.functionStatements.find((f) => f.name.text.toLowerCase() === 'main');
                if (mainFunc) {
                    mainFunction = mainFunc;
                    break;
                }
            }
        }
        if (!mainFunction) {
            Diagnostics_1.diagnosticErrorNoMainFound(files[0]);
            const filePath = path.join(this._builder.options.stagingDir, 'source/rooibosMain.brs');
            fsExtra.writeFileSync(filePath, `function main()\n    Rooibos_init()\nend function`);
        }
    }
    addTestRunnerMetadata(editor) {
        let runtimeConfig = this._builder.program.getFile('source/rooibos/RuntimeConfig.bs');
        if (runtimeConfig) {
            let classStatement = runtimeConfig.ast.statements[0].body.statements[0];
            this.updateRunTimeConfigFunction(classStatement, editor);
            this.updateVersionTextFunction(classStatement, editor);
            this.updateClassLookupFunction(classStatement, editor);
            this.updateGetAllTestSuitesNames(classStatement, editor);
            this.createIgnoredTestsInfoFunction(classStatement, editor);
        }
    }
    updateRunTimeConfigFunction(classStatement, editor) {
        var _a;
        let method = classStatement.methods.find((m) => m.name.text === 'getRuntimeConfig');
        if (method) {
            editor.addToArray(method.func.body.statements, method.func.body.statements.length, new RawCodeStatement_1.RawCodeStatement(undent_1.default `
                    return {
                        "failFast": ${this.config.failFast ? 'true' : 'false'}
                        "sendHomeOnFinish": ${this.config.sendHomeOnFinish ? 'true' : 'false'}
                        "logLevel": ${(_a = this.config.logLevel) !== null && _a !== void 0 ? _a : 0}
                        "showOnlyFailures": ${this.config.showOnlyFailures ? 'true' : 'false'}
                        "printTestTimes": ${this.config.printTestTimes ? 'true' : 'false'}
                        "lineWidth": ${this.config.lineWidth || 60}
                        "printLcov": ${this.config.printLcov ? 'true' : 'false'}
                        "port": "${this.config.port || 'invalid'}"
                        "catchCrashes": ${this.config.catchCrashes ? 'true' : 'false'}
                    }`));
        }
    }
    updateVersionTextFunction(classStatement, editor) {
        let method = classStatement.methods.find((m) => m.name.text === 'getVersionText');
        if (method) {
            editor.addToArray(method.func.body.statements, method.func.body.statements.length, new RawCodeStatement_1.RawCodeStatement(`return "${pkg.version}"`));
        }
    }
    updateClassLookupFunction(classStatement, editor) {
        let method = classStatement.methods.find((m) => m.name.text === 'getTestSuiteClassWithName');
        if (method) {
            editor.arrayPush(method.func.body.statements, new RawCodeStatement_1.RawCodeStatement(undent_1.default `
                if false
                    ? "noop" ${this.sessionInfo.testSuitesToRun.map(suite => `
                else if name = "${suite.name}"
                    return ${suite.classStatement.getName(brighterscript_1.ParseMode.BrightScript)}`).join('')}
                end if
            `));
        }
    }
    updateGetAllTestSuitesNames(classStatement, editor) {
        let method = classStatement.methods.find((m) => m.name.text === 'getAllTestSuitesNames');
        if (method) {
            editor.arrayPush(method.func.body.statements, new RawCodeStatement_1.RawCodeStatement([
                'return [',
                ...this.sessionInfo.testSuitesToRun.map((s) => `    "${s.name}"`),
                ']'
            ].join('\n')));
        }
    }
    createNodeFiles(program) {
        for (let suite of this.sessionInfo.testSuitesToRun.filter((s) => s.isNodeTest)) {
            this.createNodeFile(program, suite);
        }
    }
    createNodeFile(program, suite) {
        let p = path.join('components', 'rooibos', 'generated');
        let xmlText = this.getNodeTestXmlText(suite);
        let bsPath = path.join(p, `${suite.generatedNodeName}.bs`);
        this.fileFactory.addFile(program, path.join(p, `${suite.generatedNodeName}.xml`), xmlText);
        let bsFile = program.getFile(bsPath);
        if (bsFile) {
            bsFile.parser.statements.push();
            bsFile.needsTranspiled = true;
        }
        let brsFile = this.fileFactory.addFile(program, bsPath, undent_1.default `
        import "pkg:/${suite.file.pkgPath}"
        function init()
        nodeRunner = Rooibos_TestRunner(m.top.getScene(), m)
        m.top.rooibosTestResult = nodeRunner.runInNodeMode("${suite.name}")
            end function
        `);
        brsFile.parser.invalidateReferences();
    }
    getNodeTestXmlText(suite) {
        return this.fileFactory.createTestXML(suite.generatedNodeName, suite.nodeName);
    }
    createIgnoredTestsInfoFunction(cs, editor) {
        let method = cs.methods.find((m) => m.name.text === 'getIgnoredTestInfo');
        if (method) {
            editor.arrayPush(method.func.body.statements, new RawCodeStatement_1.RawCodeStatement([
                'return {',
                `    "count": ${this.sessionInfo.ignoredCount}`,
                `    "items": [`,
                ...this.sessionInfo.ignoredTestNames.map((name) => `        "${name}"`),
                `    ]`,
                `}`
            ].join('\n')));
        }
    }
}
exports.RooibosSession = RooibosSession;
//# sourceMappingURL=RooibosSession.js.map