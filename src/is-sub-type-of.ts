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
    node : TSESTree.Node | TSESTree.Comment | TSESTree.Token,
    a : ts.Type,
    b : ts.Type,
    checker : ts.TypeChecker
) : boolean|undefined {
    try {
        return isAssignableToType(
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
        if (context.options[0].reportTsSimpleTypeCrash === true) {
            context.report({
                node,
                messageId : tsSimpleTypeCrash,
                data : {
                    message : err.message,
                },
            });
        }
        return undefined;
    }
}
