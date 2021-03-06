/**
 * Copy-pasted from,
 * https://github.com/typescript-eslint/typescript-eslint/blob/370ac729689905384adb20f92240264660fcc9bc/packages/eslint-plugin/src/util/getParserServices.ts#L13
 */
import {
    ParserServices,
    TSESLint,
} from "@typescript-eslint/experimental-utils";

type RequiredParserServices = {
    [k in keyof ParserServices]: Exclude<ParserServices[k], undefined>
};

/**
 * Try to retrieve typescript parser service from context
 */
export function getParserServices<
    TMessageIds extends string,
    TOptions extends any[]
>(
    context: TSESLint.RuleContext<TMessageIds, TOptions>,
): RequiredParserServices {
    if (
        //eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        !context.parserServices ||
        //eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        !context.parserServices.program ||
        //eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        !context.parserServices.esTreeNodeToTSNodeMap
    ) {
    /**
     * The user needs to have configured "project" in their parserOptions
     * for @typescript-eslint/parser
     */
    throw new Error(
        "You have used a rule which requires parserServices to be generated. You must therefore provide a value for the 'parserOptions.project' property for @typescript-eslint/parser.",
    );
    }
    return context.parserServices as RequiredParserServices;
}
