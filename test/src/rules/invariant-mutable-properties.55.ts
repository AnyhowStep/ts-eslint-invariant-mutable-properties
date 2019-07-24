import rule from "../../../src/invariant-mutable-properties";
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
interface Mapper<HandledInputT, OutputT> {
    (name : string, mixed : HandledInputT) : OutputT,
}
type SafeMapper<OutputT> = (
    Mapper<unknown, OutputT>
);
type AnySafeMapper = (
    SafeMapper<any>
);
interface ObjectMapperCreator {
    <ArrT extends (AnySafeMapper)[]> (...arr : ArrT) : (
        void
    );
}
declare const object : ObjectMapperCreator;
object(
    () => 1
);
            `),
            /**
             * More crashes to fix
             */
            options : [
                {
                    ...getDefaultOptions()[0],
                    reportTsSimpleTypeCrash : false,
                }
            ],
        },
    ],
    /**
     * Invalid code
     */
    invalid : [
    ],
});
