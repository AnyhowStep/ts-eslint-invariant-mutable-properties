import rule from "../../../src/invariant-mutable-properties";
import {RuleTester} from "../RuleTester";
import {rootPath} from "../root-path";
import {mutablePropertiesAreInvariant} from "../../../src/message-ids";
import {getDefaultOptions} from "../../../src/options";

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
declare const src : Buffer;
const dst : Uint8Array = src;
            `),
            options : [
                {
                    ...getDefaultOptions()[0],
                    unsoundExtendsAndImplementsCheck : false,
                }
            ],
            errors : [
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "fill, indexOf, lastIndexOf, subarray, includes" },
                    line : 3,
                    column : 11,
                },
            ],
        },
    ],
});
