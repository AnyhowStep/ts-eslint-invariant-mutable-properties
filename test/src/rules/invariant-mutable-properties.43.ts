import rule from "../../../src/invariant-mutable-properties";
import {RuleTester} from "../RuleTester";
import {rootPath} from "../root-path";
//import {mutablePropertiesAreInvariant} from "../../../src/message-ids";

const ruleTester = new RuleTester({
    parser : "@typescript-eslint/parser",
    parserOptions : {
        tsconfigRootDir : rootPath,
        project : "./tsconfig.json",
    },
});

ruleTester.run("invariant-mutable-properties", rule, {
    valid : [
        /**
         * `ts-simple-type` thinks
         * `{ x : number|string, () : void }` is not assignable to `{ x : number|string }`
         * even though it is.
         *
         * https://github.com/runem/ts-simple-type/issues/31
         */
        {
            code : (`
declare const src : { y : { x : number|string, () : void } };
let dst : { y : { x : number|string } } = src;
//dst.y = { x : 1 };
//src.y(); //Error
            `),
        },
    ],
    /**
     * Invalid code
     */
    invalid : [
        /**
         * @todo When `ts-simple-type` is fixed,
         * update package and update this test
         */
        /*{
            code : (`
declare const src : { y : { x : number|string, () : void } };
let dst : { y : { x : number|string } } = src;
//dst.y = { x : 1 };
//src.y(); //Error
            `),
            errors : [
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "y" },
                    line : 3,
                    column : 9,
                },
            ],
        },*/
    ],
});
