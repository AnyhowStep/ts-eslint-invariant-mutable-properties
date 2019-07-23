export const mutablePropertiesAreInvariant = "mutablePropertiesAreInvariant";
export const tsSimpleTypeCrash = "tsSimpleTypeCrash";
export const ruleCrash = "ruleCrash";

export type MessageId = (
    | typeof mutablePropertiesAreInvariant
    | typeof tsSimpleTypeCrash
    | typeof ruleCrash
);
