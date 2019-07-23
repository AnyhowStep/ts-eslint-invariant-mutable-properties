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
    valid : [],
    /**
     * Invalid code
     */
    invalid : [
        {
            code : (`
function foo<SrcT extends { x : number }> () {
    return (src : SrcT) => {
        src.x = 999;
    }
}
const src : { x : 1 } = { x : 1 };
console.log(src.x); //1
foo<{x:1}>()(src);
console.log(src.x); //999
            `),
            errors : [
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "x" },
                    line : 9,
                    column : 14,
                },
            ],
        },
    ],
});
