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
const src : {
    nested : {
        doNotMutateMePlease : string,
    }
}[] = [
    {
        nested : {
            doNotMutateMePlease : "please?",
        }
    }
];
const dst : {
    nested : {
        doNotMutateMePlease : string|number,
    }
}[] = src.map(item => item);
console.log(src[0].nested.doNotMutateMePlease); //"please?"
dst[0].nested.doNotMutateMePlease = 34;
console.log(src[0].nested.doNotMutateMePlease); //34
            `),
            errors : [
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "[number].nested.doNotMutateMePlease" },
                    line : 13,
                    column : 11,
                },
            ],
        },
    ],
});
