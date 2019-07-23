export const mutablePropertiesAreInvariant = "mutablePropertiesAreInvariant";
export const tsSimpleTypeCrash = "tsSimpleTypeCrash";
export const ruleCrash = "ruleCrash";
export const maxDepthReached = "maxDepthReached";
export const maxPairwiseComparisonReached = "maxPairwiseComparisonReached";

export type MessageId = (
    | typeof mutablePropertiesAreInvariant
    | typeof tsSimpleTypeCrash
    | typeof ruleCrash
    | typeof maxDepthReached
    | typeof maxPairwiseComparisonReached
);
