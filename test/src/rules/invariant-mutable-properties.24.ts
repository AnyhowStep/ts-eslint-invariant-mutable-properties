import rule from "../../../src/invariant-mutable-properties";
import {RuleTester} from "../RuleTester";
import {rootPath} from "../root-path";
import {mutablePropertiesAreInvariant} from "../../../src/message-ids";

const ruleTester = new RuleTester({
    parser : "@typescript-eslint/parser",
    parserOptions : {
        tsconfigRootDir : rootPath,
        project : "./tsconfig.json",
    },
});

ruleTester.run("invariant-mutable-properties", rule, {
    valid : [],
    /**
     * Invalid code
     */
    invalid : [
        {
            code : (`
declare const src : { [index:number] : number };
let dst : { [index:number] : number|string } = src;
declare function foo (arg? : typeof dst) : void;
foo(src);
foo();
            `),
            errors : [
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "[number]" },
                    line : 3,
                    column : 9,
                },
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "[number]" },
                    line : 5,
                    column : 5,
                },
            ],
        },
    ],
});
