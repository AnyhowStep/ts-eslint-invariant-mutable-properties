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
declare const src : {
    nested : {
        doNotMutateMePlease : string,
    }
}[];
//Right now, the rule thinks object literals are **ALWAYS** safe
//but this is not true
const dst : {
    nested : {
        doNotMutateMePlease : string|number,
    }
}[] = [
    ...src,
];
//Boom.
//src[0].nested.doNotMutateMePlease is now number and not string
dst[0].nested.doNotMutateMePlease = 34;
            `),
            errors : [
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "[number].nested.doNotMutateMePlease" },
                    line : 9,
                    column : 11,
                },
            ],
        },
    ],
});
