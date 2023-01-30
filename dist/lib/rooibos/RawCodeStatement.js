"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RawCodeStatement = void 0;
const brighterscript_1 = require("brighterscript");
const source_map_1 = require("source-map");
class RawCodeStatement extends brighterscript_1.Statement {
    constructor(source, sourceFile, range = brighterscript_1.Range.create(1, 1, 1, 99999)) {
        super();
        this.source = source;
        this.sourceFile = sourceFile;
        this.range = range;
    }
    transpile(state) {
        //indent every line with the current transpile indent level (except the first line, because that's pre-indented by bsc)
        let source = this.source.replace(/\r?\n/g, (match, newline) => {
            return state.newline + state.indent();
        });
        return [new source_map_1.SourceNode(this.range.start.line + 1, this.range.start.character, this.sourceFile ? this.sourceFile.pathAbsolute : state.srcPath, source)];
    }
    walk(visitor, options) {
        //nothing to walk
    }
}
exports.RawCodeStatement = RawCodeStatement;
//# sourceMappingURL=RawCodeStatement.js.map