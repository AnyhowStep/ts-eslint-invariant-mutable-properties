import rule from "../../../src/invariant-mutable-properties";
import {RuleTester} from "../RuleTester";
import {rootPath} from "../root-path";

const ruleTester = new RuleTester({
    parser : "@typescript-eslint/parser",
    parserOptions : {
        tsconfigRootDir : rootPath,
        project : "./tsconfig.json",
    },
});

ruleTester.run("invariant-mutable-properties", rule, {
    valid : [
        {
            code : (`
const dst : {
    valid : ({code : string}|string)[]
} = {
    valid : [
        {
            code : "a"
        }
    ]
}
            `),
        },
    ],
    /**
     * Invalid code
     */
    invalid : [],
});
