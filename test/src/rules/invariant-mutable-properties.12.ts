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
}[] = src.map(item => {
    return {
        ...item,
        nested : {
            ...item.nested,
        },
    };
});
console.log(src[0].nested.doNotMutateMePlease); //"please?"
dst[0].nested.doNotMutateMePlease = 34;
console.log(src[0].nested.doNotMutateMePlease); //"please?"
            `),
        },
    ],
    /**
     * Invalid code
     */
    invalid : [],
});
