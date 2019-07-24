import rule from "../../../src/invariant-mutable-properties";
import {RuleTester} from "../RuleTester";
import {rootPath} from "../root-path";
import {tsSimpleTypeCrash} from "../../../src/message-ids";

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
         * @todo When `ts-simple-type` is fixed,
         * update package and update this test
         *
         * https://github.com/runem/ts-simple-type/issues/32
         *
         * `ts-simple-type` does not think
         * `number[]` is assignable to `ConcatArray<number>` even though it is
         */
        {
            code : (`
declare const src : number[];
declare function foo (dst : ConcatArray<number>) : void;
foo(src);
            `),
            errors : [
                {
                    messageId : tsSimpleTypeCrash,
                    data : { message: "ts-simple-type does not think any call signatures are callable" },
                    line : 4,
                    column : 1,
                },
            ],
        },
    ],
});
