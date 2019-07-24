import rule from "../../../src/invariant-mutable-properties";
import {RuleTester} from "../RuleTester";
import {rootPath} from "../root-path";
import { tsSimpleTypeCrash } from "../../../src/message-ids";

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
declare const arr : number[];
arr.map(item => item);
            `),
            errors : [
                {
                    messageId : tsSimpleTypeCrash,
                    data : { message: "ts-simple-type does not think any call signatures are callable" },
                    line : 3,
                    column : 1,
                },
            ],
        },
    ],
});
