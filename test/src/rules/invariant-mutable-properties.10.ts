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
    nested : {
        doNotMutateMePlease : string,
    }
}[];
const dst : {
    nested : {
        doNotMutateMePlease : string|number,
    }
}[] = [
    {
        ...src[0],
        nested : {
            ...src[0].nested,
        },
    },
];
            `),
        },
    ],
    /**
     * Invalid code
     */
    invalid : [],
});
