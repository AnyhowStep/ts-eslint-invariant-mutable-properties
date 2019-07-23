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
    valid : [

    ],
    /**
     * Invalid code
     */
    invalid : [
        {
            code : (`
type Locals = {
    [k : string] : unknown;
};
export interface ValueNextFunction<NextLocalsT extends Locals> {
    readonly success : (nextLocals : NextLocalsT) => void,
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
            errors : [
                {
                    messageId : mutablePropertiesAreInvariant,
                    data : { properties: "[string]/appKey, [string]/app" },
                    line : 51,
                    column : 14,
                },
            ],
        },
    ],
});
