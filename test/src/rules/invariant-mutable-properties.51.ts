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
declare const src : string[];
const dst : (string|number)[] = src;
dst.push(9001); //Boom, src[number] now has number instead of string
            `),
            options : [
                {
                    ...getDefaultOptions()[0],
                    reportTsSimpleTypeCrash : true,
                }
            ],
            errors : [
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "[number]" },
                    line : 3,
                    column : 11,
                },
            ],
        },
    ],
});
