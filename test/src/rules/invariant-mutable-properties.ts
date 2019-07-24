import rule from "../../../src/invariant-mutable-properties";
import {mutablePropertiesAreInvariant} from "../../../src/message-ids";
import {RuleTester} from "../RuleTester";
import {rootPath} from "../root-path";
import {getDefaultOptions} from "../../../src/options";

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
//readonly properties are covariant
declare const src : { x : number };
let dst : { readonly x : number|string } = src;
dst = src;
dst = { x : 1 };
dst = { x : 1 } as const;

declare function foo (dst? : { readonly x : number|string }) : void;
foo(src);
foo({ x : 1 });
foo({ x : 1 } as const);
foo();
            `),
        },
        {
            code : (`
//Object literals are safe to mutate
let dst : { x : number|string } = { x : 1 };
dst = { x : 1 };
//Even if we mark them as const
dst = { x : 1 } as const;

declare function foo (dst? : { x : number|string }) : void;
foo({ x : 1 });
foo({ x : 1 } as const);
foo();
            `),
        },
        {
            code : (`
//Readonly arrays are covariant
let dst : readonly (string|number)[] = ["string-value-only"];
dst = ["string-value-only"];
dst = ["string-value-only"] as const;

declare function foo (dst? : readonly (string|number)[]) : void;
foo(["string-value-only"]);
foo(["string-value-only"] as const);
foo();
            `),
        },
        {
            code : (`
//Array literals are safe to mutate
let dst : (string|number)[] = ["string-value-only"];
dst = ["string-value-only"];
//Well, ts will not allow this assignment but if it did,
//we should not consider this an error
dst = ["string-value-only"] as const;

declare function foo (dst? : (string|number)[]) : void;
foo(["string-value-only"]);
foo(["string-value-only"] as const);
foo();
            `),
        },
        {
            code : (`
//Should check nested objects
declare const src : {
    x : {
        safe : number|string,
        unsafe : boolean,
        nested : {
            safe : number|string,
            unsafe : boolean
        }
    }
};
let dst : {
    x : {
        readonly safe : number|string,
        unsafe : boolean,
        nested : {
            readonly safe : number|string,
            unsafe : boolean
        }
    }
} = src;
dst = src;
dst = {
    x : {
        safe : 1,
        unsafe : true,
        nested : {
            safe : 2,
            unsafe : false,
        }
    }
};
dst = {
    x : {
        safe : 1,
        unsafe : true,
        nested : {
            safe : 2,
            unsafe : false,
        }
    }
} as const;

declare function foo (
    dst? : (
        {
            x : {
                readonly safe : number|string,
                unsafe : boolean,
                nested : {
                    readonly safe : number|string,
                    unsafe : boolean
                }
            }
        }
    )
) : void;
foo(src);
foo({
    x : {
        safe : 1,
        unsafe : true,
        nested : {
            safe : 2,
            unsafe : false,
        }
    }
});
foo({
    x : {
        safe : 1,
        unsafe : true,
        nested : {
            safe : 2,
            unsafe : false,
        }
    }
} as const);
foo();
            `),
        },
        {
            code : (`
declare const src : { "1" : number, "2" : number|string, 3 : number, 4 : number|string };
let dst : { readonly [index:number] : number|string } = src;
dst = { "1" : 1, "2" : "blah", 3 : 3, 4 : "boo" };
dst = { "1" : 1, "2" : "blah", 3 : 3, 4 : "boo" } as const;
declare function foo (arg? : typeof dst) : void;
foo(src);
foo({ "1" : 1, "2" : "blah", 3 : 3, 4 : "boo" });
foo({ "1" : 1, "2" : "blah", 3 : 3, 4 : "boo" } as const);
foo();
            `),
        },
        {
            code : (`
declare const src : { "1" : number|string, "2" : number|string, 3 : number|string, 4 : number|string };
let dst : { [index:number] : number|string } = src;
dst = { "1" : 1, "2" : "blah", 3 : 3, 4 : "boo" };
dst = { "1" : 1, "2" : "blah", 3 : 3, 4 : "boo" } as const;
declare function foo (arg? : typeof dst) : void;
foo(src);
foo({ "1" : 1, "2" : "blah", 3 : 3, 4 : "boo" });
foo({ "1" : 1, "2" : "blah", 3 : 3, 4 : "boo" } as const);
foo();
            `),
        },
        /**
         * Right now, this is considered valid but is not.
         * @todo Make this invalid
         */
        {
            code : (`
function foo<SrcT extends { x : number }> (src : SrcT) {
    const dst : { x : number } = src;
    //Imagine SrcT is { x : 2 }
    //Boom, src.x now has 1 instead of 2
    dst.x = 1;
}
            `),
        },
        {
            code : (`
declare const src : { [index:number] : number };
let dst : { readonly [index:number] : number|string } = src;
declare function foo (arg? : typeof dst) : void;
foo(src);
foo();
            `),
        },
        {
            code : (`
declare const src : { [index:number] : number };
let dst : { readonly [index:string] : number|string } = src;
declare function foo (arg? : typeof dst) : void;
foo(src);
foo();
            `),
        },
        {
            code : (`
declare const src : { [index:string] : number };
let dst : { readonly [index:string] : number|string } = src;
declare function foo (arg? : typeof dst) : void;
foo(src);
foo();
            `),
        },
    ],
    /**
     * Invalid code
     */
    invalid : [
        {
            code : (`
declare const src : { x : number };
const dst : { x : number|string } = src;
dst.x = "hi"; //Boom, src.x now has string instead of number
            `),
            errors : [
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "x" },
                    line : 3,
                    column : 11,
                },
            ],
        },
        {
            code : (`
declare const src : { x : number };

function foo (dst? : { x : number|string }) : void {
    if (dst != undefined) {
        //Boom, src.x is now string and not number
        dst.x = "hi";
    }
}
foo(src);
foo();
            `),
            options : [
                {
                    ...getDefaultOptions()[0],
                    reportTsSimpleTypeCrash : true,
                }
            ],
            errors : [
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "x" },
                    line : 10,
                    column : 5,
                },
            ],
        },
        {
            code : (`
declare const src : string[];

function foo (dst? : (string|number)[]) : void {
    if (dst != undefined) {
        //Boom, src[number] is now number and not string
        dst.push(9001);
    }
}
foo(src);
foo();
            `),
            options : [
                {
                    ...getDefaultOptions()[0],
                    reportTsSimpleTypeCrash : true,
                }
            ],
            errors : [
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "[number]" },
                    line : 10,
                    column : 5,
                },
            ],
        },
        {
            code : (`
declare const src : { x : { y : { z : number, w : boolean } } };
const dst : { x : { y : { z : number|string, w : boolean } } } = src;
dst.x.y.z = "hi"; //Boom, src.x.y.z now has string instead of number
            `),
            errors : [
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "x.y.z" },
                    line : 3,
                    column : 11,
                },
            ],
        },
        {
            code : (`
declare const src : { "1" : number, "2" : number|string, 3 : number, 4 : number|string };
const dst : { [index:number] : number|string } = src;
            `),
            errors : [
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "[number]/1, [number]/3" },
                    line : 3,
                    column : 11,
                },
            ],
        },
        {
            code : (`
declare const src : { "1" : number, "2" : number|string, 3 : number, 4 : number|string };
const dst : { [index:number] : number|string } = {};
declare function foo (arg? : typeof dst) : void;
foo(src);
            `),
            errors : [
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "[number]/1, [number]/3" },
                    line : 5,
                    column : 5,
                },
            ],
        },
        {
            code : (`
function foo<SrcT extends { x : number }> (src : SrcT) {
    const dst : { x : number|string } = src;
    dst.x = "hi"; //Boom, src.x now has string instead of number
}
            `),
            errors : [
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "x" },
                    line : 3,
                    column : 15,
                },
            ],
        },
        {
            code : (`
declare const src : { [index:number] : number };
let dst : { [index:number] : number|string } = src;
declare function foo (arg? : typeof dst) : void;
foo(src);
foo();
            `),
            options : [
                {
                    ...getDefaultOptions()[0],
                    reportTsSimpleTypeCrash : true,
                }
            ],
            errors : [
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "[number]" },
                    line : 3,
                    column : 9,
                },
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "[number]" },
                    line : 5,
                    column : 5,
                },
            ],
        },
        {
            code : (`
declare const src : { [index:number] : number };
let dst : { [index:string] : number|string } = src;
declare function foo (arg? : typeof dst) : void;
foo(src);
foo();
            `),
            options : [
                {
                    ...getDefaultOptions()[0],
                    reportTsSimpleTypeCrash : true,
                }
            ],
            errors : [
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "[string]/[number]" },
                    line : 3,
                    column : 9,
                },
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "[string]/[number]" },
                    line : 5,
                    column : 5,
                },
            ],
        },
        {
            code : (`
declare const src : { [index:string] : number };
let dst : { [index:string] : number|string } = src;
declare function foo (arg? : typeof dst) : void;
foo(src);
foo();
            `),
            options : [
                {
                    ...getDefaultOptions()[0],
                    reportTsSimpleTypeCrash : true,
                }
            ],
            errors : [
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "[string]" },
                    line : 3,
                    column : 9,
                },
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "[string]" },
                    line : 5,
                    column : 5,
                },
            ],
        },
        {
            code : (`
declare const src : { a : number, b : string, c : number|string };
let dst : { [index:string] : number|string } = src;
declare function foo (arg? : typeof dst) : void;
foo(src);
foo();
            `),
            options : [
                {
                    ...getDefaultOptions()[0],
                    reportTsSimpleTypeCrash : true,
                }
            ],
            errors : [
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "[string]/a, [string]/b" },
                    line : 3,
                    column : 9,
                },
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "[string]/a, [string]/b" },
                    line : 5,
                    column : 5,
                },
            ],
        },
        {
            code : (`
declare const src : { a : { nestedValue : number }, b : { nestedValue : string }, c : { nestedValue : number|string } };
let dst : { [index:string] : { nestedValue : number|string } } = src;
declare function foo (arg? : typeof dst) : void;
foo(src);
foo();
            `),
            options : [
                {
                    ...getDefaultOptions()[0],
                    reportTsSimpleTypeCrash : true,
                }
            ],
            errors : [
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "[string]/a.nestedValue, [string]/b.nestedValue" },
                    line : 3,
                    column : 9,
                },
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "[string]/a.nestedValue, [string]/b.nestedValue" },
                    line : 5,
                    column : 5,
                },
            ],
        },
    ],
});
