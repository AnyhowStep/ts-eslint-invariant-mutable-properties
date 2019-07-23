import rule from "../../../src/invariant-mutable-properties";
import {RuleTester} from "../RuleTester";
import {rootPath} from "../root-path";

const ruleTester = new RuleTester({
    parser : "@typescript-eslint/parser",
    parserOptions : {
        tsconfigRootDir : rootPath,
        project : "./tsconfig.json",
    },
});

ruleTester.run("invariant-mutable-properties", rule, {
    valid : [
        {
            code : (`
function foo<SrcT extends { x : number }> () {
    return (src : Readonly<SrcT>) => {
        src.x = 999;
    }
}
const src : { x : 1 } = { x : 1 };
console.log(src.x); //1
foo<{x:1}>()(src);
console.log(src.x); //999
            `),
        },
    ],
    /**
     * Invalid code
     */
    invalid : [
    ],
});
