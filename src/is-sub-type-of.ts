import * as ts from "typescript";
import {isAssignableToType} from "ts-simple-type";
import {RuleContext} from "@typescript-eslint/experimental-utils/dist/ts-eslint";
import {TSESTree} from "@typescript-eslint/experimental-utils";
import {tsSimpleTypeCrash} from "./message-ids";
import {Options} from "./options";

/**
 * Checks if `a` a sub type of `b`.
 *
 * + Reports an error if `ts-simple-type` crashes.
 * + Returns `undefined` if `ts-simple-type` crashes.
 */
export function isSubTypeOf (
    context : RuleContext<typeof tsSimpleTypeCrash, Options>,
    options : Options,
    assignabilityCache : {
        [k:string] : boolean|undefined|Error
    },
    //Commented out to get around lint error
    //node : TSESTree.Node | TSESTree.Comment | TSESTree.Token,
    //*
    node : (
        TSESTree.Node | TSESTree.Comment | TSESTree.Token extends infer I ?
        Readonly<I> :
        never
    ),
    //*/
    a : ts.Type,
    b : ts.Type,
    checker : ts.TypeChecker
) : boolean|undefined {
    const key = (a as any).id + "-" + (b as any).id;
    let cached = assignabilityCache[key];
    if (cached == undefined) {
        try {
            cached = isAssignableToType(
                /**
                 * This is intentional. `ts-simple-type` switches `a` and `b`
                 */
                b,
                a,
                checker,
                {
                    strict : true,
                    strictNullChecks : true,
                    strictFunctionTypes : true,
                    noStrictGenericChecks : false,
                }
            );
        } catch (err) {
            cached = err;
        }
        assignabilityCache[key] = cached;
    }
    if (cached == undefined) {
        return undefined;
    }

    if (typeof cached == "boolean") {
        return cached;
    } else {
        if (options[0].reportTsSimpleTypeCrash === true) {
            context.report({
                node : {...node},
                messageId : tsSimpleTypeCrash,
                data : {
                    message : cached.message + "; stack: " + cached.stack,
                },
            });
        }
        return undefined;
    }
}
