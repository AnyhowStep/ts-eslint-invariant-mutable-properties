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
declare const src : {b:string}&{a:number};
const dst : {a:string|number}&{b:string|number} = src;
            `),
            errors : [
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "b, a" },
                    line : 3,
                    column : 11,
                },
            ],
        },
    ],
});
