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
        /**
         * @todo Fix this. It should be OK!
         * Lint rule currently thinks it is invalid.
         */
        {
            code : (`
declare const src : { x : string };
//This should be OK!
const dst : { [k:string]:unknown } & { x : string } = src;
//dst.x = 1; //TS Error: Cannot assign number to string
            `),
            errors : [
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "[string]/x" },
                    line : 4,
                    column : 11,
                },
            ],
        },
    ],
});
