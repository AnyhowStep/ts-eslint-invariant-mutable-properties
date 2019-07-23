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
    valid : [
    ],
    /**
     * Invalid code
     */
    invalid : [
        {
            code : (`
declare const src : {a:number};
const dst : {a:number}|{a:number|string} = src;
dst.a = "test";
            `),
            errors : [
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "a" },
                    line : 3,
                    column : 11,
                },
            ],
        },
    ],
});
