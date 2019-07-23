export type Options = [
    {
        reportTsSimpleTypeCrash : boolean;
        reportRuleCrash : boolean;

        reportMaxDepth : boolean;
        reportMaxPairwiseComparison : boolean;

        maxDepth : number;
        maxPairwiseComparison : number;

        unsoundExtendsAndImplementsCheck : boolean;
    }
];

export function getDefaultOptions () : Options {
    return [
        {
            reportTsSimpleTypeCrash : true,
            reportRuleCrash : true,

            reportMaxDepth : true,
            reportMaxPairwiseComparison : true,

            maxDepth : 50,
            maxPairwiseComparison : 100000,

            unsoundExtendsAndImplementsCheck : true,
        }
    ];
}
