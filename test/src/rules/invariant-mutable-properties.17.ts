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
declare function foo (x : Readonly<{type:1|3}>|Readonly<{type:2}>) : void
const n : {type:1} = {type:1};
foo(n);
            `),
        },
    ],
    /**
     * Invalid code
     */
    invalid : [
    ],
});
