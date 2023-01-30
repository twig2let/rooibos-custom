"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeBsJsonString = exports.addOverriddenMethod = exports.overrideAstTranspile = void 0;
const brighterscript = require("brighterscript");
const Diagnostics_1 = require("../utils/Diagnostics");
const source_map_1 = require("source-map");
function overrideAstTranspile(editor, node, value) {
    editor.setProperty(node, 'transpile', function transpile(state) {
        //indent every line with the current transpile indent level (except the first line, because that's pre-indented by bsc)
        let source = value.replace(/\r?\n/g, (match, newline) => {
            return state.newline + state.indent();
        });
        return [new source_map_1.SourceNode(this.range.start.line + 1, this.range.start.character, state.srcPath, source)];
    });
}
exports.overrideAstTranspile = overrideAstTranspile;
function addOverriddenMethod(file, annotation, target, name, source, editor) {
    var _a;
    let functionSource = `
        function ${name}()
            ${source}
        end function
    `;
    let { statements, diagnostics } = brighterscript.Parser.parse(functionSource, { mode: brighterscript.ParseMode.BrighterScript });
    let error = '';
    if (statements && statements.length > 0) {
        let statement = statements[0];
        if (statement.func.body.statements.length > 0) {
            let p = brighterscript.createToken(brighterscript.TokenKind.Public, 'public', target.range);
            let o = brighterscript.createToken(brighterscript.TokenKind.Override, 'override', target.range);
            let n = brighterscript.createIdentifier(name, target.range);
            let method = new brighterscript.ClassMethodStatement(p, n, statement.func, o);
            //bsc has a quirk where it auto-adds a `new` method if missing. That messes with our AST editing, so
            //trigger that functionality BEFORE performing AstEditor operations. TODO remove this whenever bsc stops doing this.
            // eslint-disable-next-line @typescript-eslint/dot-notation
            (_a = target['ensureConstructorFunctionExists']) === null || _a === void 0 ? void 0 : _a.call(target);
            editor.addToArray(target.body, target.body.length, method);
            return true;
        }
    }
    error = (diagnostics === null || diagnostics === void 0 ? void 0 : diagnostics.length) > 0 ? diagnostics[0].message : 'unknown error';
    Diagnostics_1.diagnosticCorruptTestProduced(file, annotation, error, functionSource);
    return false;
}
exports.addOverriddenMethod = addOverriddenMethod;
function sanitizeBsJsonString(text) {
    return `"${text ? text.replace(/"/g, '\'') : ''}"`;
}
exports.sanitizeBsJsonString = sanitizeBsJsonString;
//# sourceMappingURL=Utils.js.map