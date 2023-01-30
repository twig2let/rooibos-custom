"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileFactory = void 0;
const brighterscript_1 = require("brighterscript");
const path = require("path");
const fs = require("fs");
class FileFactory {
    constructor(options) {
        var _a;
        this.options = options;
        this.frameworkFileNames = [
            'BaseTestSuite',
            'CommonUtils',
            'Coverage',
            'Matchers',
            'Rooibos',
            'RuntimeConfig',
            'Stats',
            'Test',
            'TestGroup',
            'BaseTestReporter',
            'ConsoleTestReporter',
            'TestResult',
            'TestRunner',
            'Utils'
        ];
        this.targetPath = 'source/rooibos/';
        this.targetCompsPath = 'components/rooibos/';
        this.addedFrameworkFiles = [];
        this.options = (_a = this.options) !== null && _a !== void 0 ? _a : {};
        if (!this.options.frameworkSourcePath) {
            if (__filename.endsWith('.ts')) {
                //load the files directly from their source location. (i.e. the plugin is running as a typescript file from within ts-node)
                this.options.frameworkSourcePath = brighterscript_1.standardizePath `${__dirname}/../../../../framework/src/source`;
            }
            else {
                //load the framework files from the dist folder (i.e. the plugin is running as a node_module)
                this.options.frameworkSourcePath = brighterscript_1.standardizePath `${__dirname}/../framework`;
            }
        }
    }
    addFrameworkFiles(program) {
        this.addedFrameworkFiles = [];
        for (let fileName of this.frameworkFileNames) {
            let sourcePath = path.resolve(path.join(this.options.frameworkSourcePath, `${fileName}.bs`));
            let fileContents = fs.readFileSync(sourcePath, 'utf8');
            let destPath = path.join(this.targetPath, `${fileName}.bs`);
            let entry = { src: sourcePath, dest: destPath };
            this.addedFrameworkFiles.push(program.setFile(entry, fileContents));
        }
        let entry = {
            src: brighterscript_1.standardizePath `${this.options.frameworkSourcePath}/RooibosScene.xml`,
            dest: brighterscript_1.standardizePath `${this.targetCompsPath}/RooibosScene.xml`
        };
        this.addedFrameworkFiles.push(program.setFile(entry, this.createTestXML('TestsScene', 'Scene')));
    }
    createTestXML(name, baseName, useBs = true) {
        let scriptImports = [];
        for (let fileName of this.frameworkFileNames) {
            scriptImports.push(`<script type="text/bright${useBs ? 'er' : ''}script" uri="pkg:/${this.targetPath}${fileName}.${useBs ? 'bs' : 'brs'}" />`);
        }
        let contents = `<?xml version="1.0" encoding="UTF-8" ?>
            <component name="${name}" extends="${baseName}">
                ${scriptImports.join('\n')}
                <interface>
                    <field id="rooibosTestResult" type="assocarray"/>
                    <field id="testText" type="string" alias="statusLabel.text" />
                    <field id="failedText" type="string" alias="failedLabel.text" />
                    <field id="statusColor" type="string" alias="statusBackground.color" />
                    <function name='Rooibos_CreateTestNode' />
                </interface>

                <children>
                    <Rectangle id="statusBackground" color="#444444" width="1920" height="1080" />
                    <Label id="statusLabel" text='Rooibos is running tests' />
                    <Label id="failedLabel" text="" translation="[0, 100]" width="1800" wrap="true" maxLines="15"/>
                </children>
            </component>
        `;
        return contents;
    }
    isIgnoredFile(file) {
        let name = file.pkgPath.toLowerCase();
        let result = this.frameworkFileNames.find((f) => {
            return name === path.join(this.targetPath, `${f}.bs`).toLowerCase();
        });
        return result !== undefined;
    }
    addFile(program, projectPath, contents) {
        try {
            const file = program.setFile({
                src: path.resolve(projectPath),
                dest: projectPath
            }, contents);
            this.addedFrameworkFiles.push(file);
            return file;
        }
        catch (error) {
            console.error(`Error adding framework file: ${projectPath} : ${error.message}`);
        }
    }
}
exports.FileFactory = FileFactory;
//# sourceMappingURL=FileFactory.js.map