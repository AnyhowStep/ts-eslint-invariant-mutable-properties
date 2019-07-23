import {TSESTree} from "@typescript-eslint/experimental-utils";
import * as util from "@typescript-eslint/experimental-utils/dist/eslint-utils";
import {getParserServices} from "./get-parser-services";
import {MessageId} from "./message-ids";
import {checkAssignment} from "./check-assignment";
import {isParameterDeclaration} from "./util";
import {isSubTypeOf} from "./is-sub-type-of";
import {Options} from "./options";
const createRule = util.RuleCreator(ruleName => ruleName);

const rule = createRule<Options, MessageId>({
    name : "invariant-mutable-properties",
    meta : {
        type : "problem",
        docs : {
            description : "Treats mutable properties as invariant (they are covariant in TS at the moment)",
            category : "Best Practices",
            recommended : "error",
        },
        messages : {
            mutablePropertiesAreInvariant : "Mutable properties are invariant; {{properties}}",
            tsSimpleTypeCrash : "ts-simple-type crashed; {{message}}",
            ruleCrash : "rule crashed; {{message}}",
            maxDepthReached : "max depth reached; {{maxDepth}}",
            maxPairwiseComparisonReached : "max pairwise comparison reached; {{maxPairwiseComparison}}",
        },
        schema : [
            {
                type : "object",
                properties : {
                    reportTsSimpleTypeCrash : {
                        type : "boolean",
                    },
                    reportRuleCrash : {
                        type : "boolean",
                    },
                    reportMaxDepth : {
                        type : "boolean",
                    },
                    reportMaxPairwiseComparison : {
                        type : "boolean",
                    },
                    maxDepth : {
                        type : "number",
                    },
                    maxPairwiseComparison : {
                        type : "number",
                    },
                },
                additionalProperties : false,
            },
        ],
    },
    defaultOptions : [
        {
            reportTsSimpleTypeCrash : true,
            reportRuleCrash : true,

            reportMaxDepth : true,
            reportMaxPairwiseComparison : true,

            maxDepth : 50,
            maxPairwiseComparison : 100000,
        }
    ],
    create (context, options) {
        //For some reason, `context.options` starts out as an empty array?
        const service = getParserServices(context);
        const typeChecker = service.program.getTypeChecker();

        const expanded : Map<string, string[]> = new Map<string, string[]>();
        const assignabilityCache : {
            [k:string] : boolean|undefined|Error
        } = {};

        function checkAssignmentPattern (node : TSESTree.AssignmentPattern) : void {
            if (node.right == undefined) {
                return;
            }
            const leftNode = service.esTreeNodeToTSNodeMap.get(node.left);
            const rightNode = service.esTreeNodeToTSNodeMap.get(node.right);
            checkAssignment(
                context,
                options,
                expanded,
                assignabilityCache,
                typeChecker,
                node.left,
                leftNode,
                rightNode
            );
        }
        function checkAssignmentExpression (node: TSESTree.AssignmentExpression) : void {
            const leftNode = service.esTreeNodeToTSNodeMap.get(node.left);
            const rightNode = service.esTreeNodeToTSNodeMap.get(node.right);

            checkAssignment(
                context,
                options,
                expanded,
                assignabilityCache,
                typeChecker,
                node.left,
                leftNode,
                rightNode
            );
        }
        function checkVariableDeclaration (node: TSESTree.VariableDeclaration) : void {
            for (const decl of node.declarations) {
                if (decl.id.typeAnnotation == undefined) {
                    continue;
                }
                if (decl.init == undefined) {
                    continue;
                }
                const initNode = service.esTreeNodeToTSNodeMap.get(decl.init);
                const idNode = service.esTreeNodeToTSNodeMap.get(decl.id);
                checkAssignment(
                    context,
                    options,
                    expanded,
                    assignabilityCache,
                    typeChecker,
                    decl.id.typeAnnotation,
                    idNode,
                    initNode
                );
            }
        }
        function checkCallExpression (node: TSESTree.CallExpression) : void {
            const calleeNode = service.esTreeNodeToTSNodeMap.get(node.callee);
            const calleeType = typeChecker.getTypeAtLocation(calleeNode);
            for (const callSignature of calleeType.getCallSignatures()) {
                const params = callSignature.getParameters();
                let useCallSignature = true;
                for (let paramIndex=0; paramIndex<params.length; ++paramIndex) {
                    const param = params[paramIndex];
                    if (!isParameterDeclaration(param.valueDeclaration)) {
                        //Why is this not a parameter declaration?
                        useCallSignature = false;
                        break;
                    }
                    const arg : TSESTree.Expression|undefined = node.arguments[paramIndex];
                    if (arg == undefined && param.valueDeclaration.questionToken == undefined) {
                        //Missing argument, not optional
                        useCallSignature = false;
                        break;
                    }
                    if (arg == undefined) {
                        break;
                    }
                    const isSubType = isSubTypeOf(
                        context,
                        options,
                        assignabilityCache,
                        arg,
                        typeChecker.getTypeAtLocation(service.esTreeNodeToTSNodeMap.get(arg)),
                        //This commented out line, if used, causes the invariant-mutable-properties error!
                        //typeChecker.getTypeAtLocation(param.valueDeclaration),
                        typeChecker.getTypeAtLocation({
                            ...param.valueDeclaration,
                        }),
                        typeChecker
                    );
                    if (isSubType == undefined) {
                        //ts-simple-type crashed
                        return;
                    }
                    if (!isSubType) {
                        //arg not assignable to param
                        useCallSignature = false;
                        break;
                    }
                }
                if (useCallSignature) {
                    for (let paramIndex=0; paramIndex<params.length; ++paramIndex) {
                        const param = params[paramIndex];
                        if (!isParameterDeclaration(param.valueDeclaration)) {
                            //This should not happen, we already checked it
                            break;
                        }
                        const arg : TSESTree.Expression|undefined = node.arguments[paramIndex];
                        if (arg == undefined) {
                            break;
                        }
                        checkAssignment(
                            context,
                            options,
                            expanded,
                            assignabilityCache,
                            typeChecker,
                            arg,
                            param.valueDeclaration,
                            service.esTreeNodeToTSNodeMap.get(arg)
                        );
                    }
                    break;
                }
            }
        }

        return {
            AssignmentPattern: checkAssignmentPattern,
            AssignmentExpression: checkAssignmentExpression,
            VariableDeclaration: checkVariableDeclaration,
            CallExpression: checkCallExpression,
        };
    },
});
export = rule;
