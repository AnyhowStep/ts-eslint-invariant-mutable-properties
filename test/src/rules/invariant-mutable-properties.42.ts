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
declare const src : { x : number|string };
let dst : { [index : string] : number|string|boolean } = src;
            `),
            errors : [
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "[string]/x" },
                    line : 3,
                    column : 9,
                },
            ],
        },
    ],
});
