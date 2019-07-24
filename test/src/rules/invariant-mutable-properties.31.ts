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
declare const src : { x : string };
//This should be OK!
const dst : { [k:string]:unknown, x : string } = src;
//dst.x = 1; //TS Error: Cannot assign number to string
            `),
        },
    ],
    /**
     * Invalid code
     */
    invalid : [
    ],
});
