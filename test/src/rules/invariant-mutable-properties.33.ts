import rule from "../../../src/invariant-mutable-properties";
import {RuleTester} from "../RuleTester";
import {rootPath} from "../root-path";
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
        /**
         * This should pass because `Buffer` extends `Uint8Array`
         */
        {
            code : (`
declare const src : Buffer;
const dst : Uint8Array = src;
            `),
            options : [
                {
                    ...getDefaultOptions()[0],
                    unsoundExtendsAndImplementsCheck : true,
                }
            ],
        },
    ],
    /**
     * Invalid code
     */
    invalid : [
    ],
});
