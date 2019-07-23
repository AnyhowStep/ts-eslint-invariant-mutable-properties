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
    shallow : string|number,
    nested : {
        doNotMutateMePlease : string,
    }
};
const dst : {
    shallow : string|number,
    nested : {
        doNotMutateMePlease : string|number,
    }
} = {
    ...src,
    nested : src.nested,
};
            `),
            errors : [
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "nested.doNotMutateMePlease" },
                    line : 8,
                    column : 11,
                },
            ],
        },
    ],
});
