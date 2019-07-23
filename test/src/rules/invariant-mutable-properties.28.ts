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
type Locals = {
    [k : string] : unknown;
};
export interface ValueNextFunction<NextLocalsT extends Locals> {
    readonly success : (nextLocals : Readonly<NextLocalsT>) => void,
    readonly failure : (err : any) => void,
}
declare const next : ValueNextFunction<{
    appKey: {
        custom: string;
        appKeyId: bigint;
        appKeyTypeId: "BLAH";
        ipAddress: string | null;
        trustProxy: boolean;
        appId: bigint;
        createdAt: Date;
        key: string;
        disabledAt: Date | null;
    };
    app: {
        readonly name: string;
        readonly appId: bigint;
        readonly createdAt: Date;
        readonly ssoClientId: bigint;
        readonly ssoApiKey: string | null;
        readonly webhookKey: string | null;
    };
}>;
declare const data : {
    appKey: {
        custom: string;
        appKeyId: bigint;
        appKeyTypeId: "BLAH";
        ipAddress: string | null;
        trustProxy: boolean;
        appId: bigint;
        createdAt: Date;
        key: string;
        disabledAt: Date | null;
    };
    app: {
        readonly name: string;
        readonly appId: bigint;
        readonly createdAt: Date;
        readonly ssoClientId: bigint;
        readonly ssoApiKey: string | null;
        readonly webhookKey: string | null;
    };
};
next.success(data);
            `),
        },
    ],
    /**
     * Invalid code
     */
    invalid : [
    ],
});
