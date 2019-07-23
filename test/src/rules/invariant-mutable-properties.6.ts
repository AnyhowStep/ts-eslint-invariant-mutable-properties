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
    nested : {
        ...src.nested,
    },
};
            `),
        },
    ],
    /**
     * Invalid code
     */
    invalid : [],
});
