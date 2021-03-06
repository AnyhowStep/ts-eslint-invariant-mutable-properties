import * as ts from "typescript";
import {
    TSESTree,
    //TSESLint,
    //AST_NODE_TYPES,
} from "@typescript-eslint/experimental-utils";
import {TSNode} from "@typescript-eslint/typescript-estree";
import {RuleContext} from "@typescript-eslint/experimental-utils/dist/ts-eslint";
import {MessageId, mutablePropertiesAreInvariant, ruleCrash, maxDepthReached, maxPairwiseComparisonReached} from "./message-ids";
import {
    isObjectType,
    isUnionType,
    isAsExpression,
    isTypeReferenceNode,
    isIdentifier,
    isObjectOrArrayLiteral,
    isMappedType,
    UnionType,
    IntersectionType,
    isIntersectionType,
    isObjectOrUnionOrIntersectionType,
    hasHeritageClauses,
    isHeritageOfId,
    isParameterDeclaration,
    unwrapArrayType
} from "./util";
import {isSubTypeOf} from "./is-sub-type-of";
import {Options} from "./options";

export function checkAssignment (
    context : RuleContext<MessageId, Options>,
    options : Options,
    expanded : Map<string, string[]>,
    assignabilityCache : {
        [k:string] : boolean|undefined|Error
    },
    typeChecker : ts.TypeChecker,
    node : TSESTree.Node | TSESTree.Comment | TSESTree.Token,
    dst : TSNode|ts.ObjectType,
    src : TSNode|ts.ObjectType
) {
    const offendingProperties : string[] = [];
    const sharedState = {
        earlyExit : false,
        deepestDepth : 0,
    };
    try {
        checkAssignmentImpl(
            context,
            options,
            expanded,
            assignabilityCache,
            typeChecker,
            node,
            dst,
            src,
            [],
            offendingProperties,
            [],
            [],
            sharedState
        );
    } catch (err) {
        if (options[0].reportRuleCrash === true) {
            context.report({
                node : {...node},
                messageId : ruleCrash,
                data : {
                    message : err.message + "; stack: " + err.stack,
                },
            });
        }
    }

    //console.log("Expanded size/deepest depth", expanded.size, sharedState.deepestDepth);
    if (offendingProperties.length > 0) {
        context.report({
            node : {...node},
            messageId : mutablePropertiesAreInvariant,
            data : {
                properties : offendingProperties.join(", "),
            },
        });
    }
}
function addOffendingProperty (
    offendingProperties : string[],
    property : string
) {
    if (!offendingProperties.includes(property)) {
        offendingProperties.push(property);
    }
}
function addOffendingProperties(
    offendingProperties : string[],
    prefix : readonly string[],
    expandedValue : readonly string[]
) {
    for (const expandedProp of expandedValue) {
        addOffendingProperty(offendingProperties, [...prefix, expandedProp].join("."));
    }
}
function checkAssignmentImpl (
    context : RuleContext<MessageId, Options>,
    options : Options,
    expanded : Map<string, string[]>,
    assignabilityCache : {
        [k:string] : boolean|undefined|Error
    },
    typeChecker : ts.TypeChecker,
    node : TSESTree.Node | TSESTree.Comment | TSESTree.Token,
    dst : TSNode|ts.ObjectType|UnionType|IntersectionType,
    src : TSNode|ts.ObjectType|UnionType|IntersectionType,
    prefix : readonly string[],
    offendingProperties : string[],
    dstPath : readonly number[],
    srcPath : readonly number[],
    sharedState : {
        earlyExit : boolean,
        deepestDepth : number,
    },
) {
    if (sharedState.earlyExit) {
        return;
    }
    if (prefix.length > sharedState.deepestDepth) {
        sharedState.deepestDepth = prefix.length;
    }
    if (prefix.length > options[0].maxDepth) {
        if (options[0].reportMaxDepth === true) {
            context.report({
                node : {...node},
                messageId : maxDepthReached,
                data : {
                    maxDepth : options[0].maxDepth,
                },
            });
        }
        sharedState.earlyExit = true;
        return;
    }
    if (expanded.size > options[0].maxPairwiseComparison) {
        if (options[0].reportMaxPairwiseComparison === true) {
            context.report({
                node : {...node},
                messageId : maxPairwiseComparisonReached,
                data : {
                    maxPairwiseComparison : options[0].maxPairwiseComparison,
                },
            });
        }
        sharedState.earlyExit = true;
        return;
    }
    let srcType = (
        isObjectType(src) ?
        src :
        isUnionType(src) ?
        src :
        isIntersectionType(src) ?
        src :
        typeChecker.getTypeAtLocation(src)
    );
    const srcTypeConstraint = srcType.getConstraint();
    if (srcTypeConstraint != undefined) {
        srcType = srcTypeConstraint;
    }
    srcType = srcType.getNonNullableType();

    let dstType = (
        isObjectType(dst) ?
        dst :
        isUnionType(dst) ?
        dst :
        isIntersectionType(dst) ?
        dst :
        isParameterDeclaration(dst) ?
        (
            dst.dotDotDotToken == undefined ?
            typeChecker.getTypeAtLocation({...dst}) :
            //Should give us the `T` of `Array<T>`
            unwrapArrayType(typeChecker.getTypeAtLocation({
                ...dst,
            }))
        ) :
        typeChecker.getTypeAtLocation(dst)
    );
    const dstTypeConstraint = dstType.getConstraint();
    if (dstTypeConstraint != undefined) {
        dstType = dstTypeConstraint;
    }
    dstType = dstType.getNonNullableType();

    if ((srcType as any).id == (dstType as any).id) {
        //Should always be safe to assign the same type to itself
        return;
    }

    /**
     * @todo use `Set<>()` instead?
     */
    if (srcPath.includes((srcType as any).id)) {
        //console.log("circular src", srcPath, (srcType as any).id);
        //Circular path
        return;
    }
    srcPath = [...srcPath, (srcType as any).id];

    //Special case for union src type
    if (isUnionType(srcType)) {
        const expandedKey = (srcType as any).id + "-" + (dstType as any).id;
        let expandedValue = expanded.get(expandedKey);
        if (expandedValue != undefined) {
            //console.log("Already seen " + expandedKey, expandedValue);
            addOffendingProperties(
                offendingProperties,
                prefix,
                expandedValue
            );
            return;
        }
        expandedValue = [];
        expanded.set(expandedKey, expandedValue);

        //console.log("srcUnion", srcType.types.length);
        for (const srcTypeEle of srcType.types) {
            if (!isObjectOrUnionOrIntersectionType(srcTypeEle)) {
                continue;
            }
            const isSubType = isSubTypeOf(
                context,
                options,
                assignabilityCache,
                node,
                srcTypeEle,
                dstType,
                typeChecker
            );
            if (isSubType == undefined) {
                //ts-simple-type crashed
                return;
            }
            if (isSubType) {
                const subExpandedValue : string[] = [];
                checkAssignmentImpl(
                    context,
                    options,
                    expanded,
                    assignabilityCache,
                    typeChecker,
                    node,
                    dst,
                    srcTypeEle,
                    [],
                    subExpandedValue,
                    dstPath,
                    srcPath,
                    sharedState
                );
                addOffendingProperties(
                    offendingProperties,
                    prefix,
                    subExpandedValue
                );
                addOffendingProperties(
                    expandedValue,
                    [],
                    subExpandedValue
                );
            }
        }
        return;
    }

    //Special case for intersection src type
    if (isIntersectionType(srcType)) {
        for (const srcTypeEle of srcType.types) {
            if (!isObjectOrUnionOrIntersectionType(srcTypeEle)) {
                continue;
            }
            checkAssignmentImpl(
                context,
                options,
                expanded,
                assignabilityCache,
                typeChecker,
                node,
                dst,
                srcTypeEle,
                prefix,
                offendingProperties,
                dstPath,
                srcPath,
                sharedState
            );
        }
        return;
    }

    if (!isObjectType(srcType)) {
        //Only check object types
        return;
    }

    let shallowSafe = false;

    if (isObjectOrArrayLiteral(src)) {
        shallowSafe = true;
    }
    if (srcType.symbol.valueDeclaration != undefined) {
        const srcParent : ts.Node|undefined = srcType.symbol.valueDeclaration.parent;
        if (
            srcParent != undefined &&
            isAsExpression(srcParent) &&
            isTypeReferenceNode(srcParent.type) &&
            isIdentifier(srcParent.type.typeName) &&
            srcParent.type.typeName.escapedText == "const"
        ) {
            //No need to check.
            //Same reason as object literal.
            //const dst : someType = { someObjLiteral : "someValue" } as const;
            return;
        }
    }

    /**
     * @todo use `Set<>()` instead?
     */
    if (dstPath.includes((dstType as any).id)) {
        //console.log("circular dst", path, (dstType as any).id);
        //Circular path
        return;
    }
    dstPath = [...dstPath, (dstType as any).id];

    //Special case for union dst type
    if (isUnionType(dstType)) {
        //console.log("dstUnion", dstType.types.length);
        const prvSrcPath = srcPath.slice(0, srcPath.length-1);
        for (const dstTypeEle of dstType.types) {
            if (!isObjectOrUnionOrIntersectionType(dstTypeEle)) {
                continue;
            }
            const isSubType = isSubTypeOf(
                context,
                options,
                assignabilityCache,
                node,
                srcType,
                dstTypeEle,
                typeChecker
            );
            if (isSubType == undefined) {
                //ts-simple-type crashed
                return;
            }
            if (isSubType) {
                checkAssignmentImpl(
                    context,
                    options,
                    expanded,
                    assignabilityCache,
                    typeChecker,
                    node,
                    dstTypeEle,
                    src,
                    prefix,
                    offendingProperties,
                    dstPath,
                    prvSrcPath,
                    sharedState
                );
            }
        }
        return;
    }

    //Special case for intersection dst type
    if (isIntersectionType(dstType)) {
        const prvSrcPath = srcPath.slice(0, srcPath.length-1);
        for (const dstTypeEle of dstType.types) {
            if (!isObjectOrUnionOrIntersectionType(dstTypeEle)) {
                continue;
            }
            checkAssignmentImpl(
                context,
                options,
                expanded,
                assignabilityCache,
                typeChecker,
                node,
                dstTypeEle,
                src,
                prefix,
                offendingProperties,
                dstPath,
                prvSrcPath,
                sharedState
            );
        }
        return;
    }

    if (!isObjectType(dstType)) {
        //Only check object types
        return;
    }

    const expandedKey = (srcType as any).id + "-" + (dstType as any).id;
    let expandedValue = expanded.get(expandedKey);
    if (expandedValue != undefined) {
        //console.log("Already seen " + expandedKey, expandedValue);
        addOffendingProperties(
            offendingProperties,
            prefix,
            expandedValue
        );
        return;
    }
    expandedValue = [];
    expanded.set(expandedKey, expandedValue);

    /**
     * This is intended to check the `extends/implements` keywords
     *
     * I have no idea why this **FAILS** sometimes.
     */
    if (
        options[0].unsoundExtendsAndImplementsCheck &&
        srcType.symbol != undefined &&
        srcType.symbol.valueDeclaration != undefined &&
        hasHeritageClauses(srcType.symbol.valueDeclaration)
    ) {
        for (const heritageClause of srcType.symbol.valueDeclaration.heritageClauses) {
            for (const heritageType of heritageClause.types) {
                if (isHeritageOfId(typeChecker, heritageType, (dstType as any).id)) {
                    //src extends/implements dst
                    //Assignment is safe
                    return;
                }
            }
        }
    }

    /**
     * This is **ALSO** intended to check the `extends/implements` keywords
     *
     * I have no idea why this **SUCCEEDS** sometimes.
     */
    if (
        options[0].unsoundExtendsAndImplementsCheck &&
        srcType.symbol != undefined
    ) {
        const t = typeChecker.getDeclaredTypeOfSymbol(srcType.symbol);
        if (
            t.symbol != undefined &&
            t.symbol.valueDeclaration != undefined &&
            (t.symbol.valueDeclaration as any).symbol != undefined &&
            (t.symbol.valueDeclaration as any).symbol.declarations != undefined
        ) {
            for (const declaration of (t.symbol.valueDeclaration as any).symbol.declarations) {
                if (hasHeritageClauses(declaration)) {
                    for (const heritageClause of declaration.heritageClauses) {
                        for (const heritageType of heritageClause.types) {
                            if (isHeritageOfId(typeChecker, heritageType, (dstType as any).id)) {
                                //src extends/implements dst
                                //Assignment is safe
                                return;
                            }
                        }
                    }
                }
            }
        }
    }

    const checkedPropertyNames = new Set<string>();

    for (const dstProp of dstType.getProperties()) {
        const srcProp = srcType.getProperty(dstProp.name);
        if (srcProp == undefined) {
            //src does not have prop
            continue;
        }
        checkedPropertyNames.add(dstProp.name);
        /**
         * The `.d.ts` says `dstProp.valueDeclaration` is never `undefined`.
         * It is wrong.
         */
        let dstPropValueDeclaration : ts.Declaration|undefined = dstProp.valueDeclaration;
        if (dstPropValueDeclaration == undefined) {
            if ((dstProp as any).syntheticOrigin != undefined) {
                dstPropValueDeclaration = (dstProp as any).syntheticOrigin.valueDeclaration;
            }
        }

        const srcPropType = typeChecker.getTypeAtLocation(srcProp.valueDeclaration);
        const dstPropType : ts.Type = (
            dstPropValueDeclaration == undefined ?
            typeChecker.getDeclaredTypeOfSymbol(dstProp) :
            typeChecker.getTypeAtLocation(dstPropValueDeclaration)
        );
        if (
            isObjectOrUnionOrIntersectionType(dstPropType) &&
            isObjectOrUnionOrIntersectionType(srcPropType)
        ) {
            const subExpandedValue : string[] = [];
            checkAssignmentImpl(
                context,
                options,
                expanded,
                assignabilityCache,
                typeChecker,
                node,
                dstPropType,
                (
                    ((srcProp.valueDeclaration as any).initializer == undefined) ?
                    srcPropType :
                    /**
                     * This is undocumented but exists.
                     *
                     * If `srcProp.valueDeclaration` if of `kind`
                     * `SyntaxKind.PropertyAssignment`,
                     *
                     * then it has the undocumented property `initializer`.
                     * This `initializer` can possibly be of `kind`
                     * `SyntaxKind.ArrayLiteralExpression` or
                     * `SyntaxKind.ObjectLiteralExpression`
                     */
                    (srcProp.valueDeclaration as any).initializer
                ),
                [dstProp.name],
                subExpandedValue,
                dstPath,
                srcPath,
                sharedState
            );
            addOffendingProperties(
                offendingProperties,
                prefix,
                subExpandedValue
            );
            addOffendingProperties(
                expandedValue,
                [],
                subExpandedValue
            );

            if (
                isObjectType(srcPropType) &&
                srcPropType.getCallSignatures().length == 0 &&
                isObjectType(dstPropType)
            ) {
                continue;
            }
        }

        if (
            dstPropValueDeclaration != undefined &&
            dstPropValueDeclaration.modifiers != undefined &&
            dstPropValueDeclaration.modifiers.some(m => m.kind == ts.SyntaxKind.ReadonlyKeyword)
        ) {
            continue;
        }

        if (shallowSafe) {
            continue;
        }

        /**
         * @todo This needs to be tested more
         */
        if (isMappedType(dstType) && dstType.declaration.readonlyToken != undefined) {
            continue;
        }

        const srcSubTypeOfDst = isSubTypeOf(
            context,
            options,
            assignabilityCache,
            node,
            srcPropType,
            dstPropType,
            typeChecker
        );
        if (srcSubTypeOfDst == undefined) {
            //ts-simple-type crashed
            return;
        }
        const dstSubTypeOfSrc = isSubTypeOf(
            context,
            options,
            assignabilityCache,
            node,
            dstPropType,
            srcPropType,
            typeChecker
        );
        if (dstSubTypeOfSrc == undefined) {
            //ts-simple-type crashed
            return;
        }

        if (srcSubTypeOfDst && !dstSubTypeOfSrc) {
            addOffendingProperty(offendingProperties, [...prefix, dstProp.name].join("."));
            addOffendingProperty(expandedValue, [dstProp.name].join("."));
        }
    }

    const dstNumberIndexInfo = typeChecker.getIndexInfoOfType(dstType, ts.IndexKind.Number);
    const dstNumberIndexType = dstType.getNumberIndexType();
    if (
        dstNumberIndexInfo != undefined &&
        dstNumberIndexType != undefined &&
        !dstNumberIndexInfo.isReadonly &&
        //Is rest parameter of a function?
        (
            !isParameterDeclaration(dst) ||
            dst.dotDotDotToken == undefined
        )
    ) {
        const srcNumberIndexType = srcType.getNumberIndexType();
        if (srcNumberIndexType != undefined) {
            if (
                isObjectOrUnionOrIntersectionType(dstNumberIndexType) &&
                isObjectOrUnionOrIntersectionType(srcNumberIndexType)
            ) {
                const subExpandedValue : string[] = [];
                checkAssignmentImpl(
                    context,
                    options,
                    expanded,
                    assignabilityCache,
                    typeChecker,
                    node,
                    dstNumberIndexType,
                    srcNumberIndexType,
                    ["[number]"],
                    subExpandedValue,
                    dstPath,
                    srcPath,
                    sharedState
                );
                addOffendingProperties(
                    offendingProperties,
                    prefix,
                    subExpandedValue
                );
                addOffendingProperties(
                    expandedValue,
                    [],
                    subExpandedValue
                );
            }

            if (
                !shallowSafe &&
                (
                    !(
                        isObjectType(srcNumberIndexType) &&
                        srcNumberIndexType.getCallSignatures().length == 0
                    ) ||
                    (
                        !isObjectType(dstNumberIndexType)
                    )
                )
            ) {
                const srcSubTypeOfDst = isSubTypeOf(
                    context,
                    options,
                    assignabilityCache,
                    node,
                    srcNumberIndexType,
                    dstNumberIndexType,
                    typeChecker
                );
                if (srcSubTypeOfDst == undefined) {
                    //ts-simple-type crashed
                    return;
                }
                const dstSubTypeOfSrc = isSubTypeOf(
                    context,
                    options,
                    assignabilityCache,
                    node,
                    dstNumberIndexType,
                    srcNumberIndexType,
                    typeChecker
                );
                if (dstSubTypeOfSrc == undefined) {
                    //ts-simple-type crashed
                    return;
                }

                if (srcSubTypeOfDst && !dstSubTypeOfSrc) {
                    addOffendingProperty(offendingProperties, [...prefix].join(".")+"[number]");
                    addOffendingProperty(expandedValue, "[number]");
                }
            }
        }

        for (const srcProp of srcType.getProperties()) {
            if (parseFloat(srcProp.name).toString() != srcProp.name) {
                //Only check numeric properties
                continue;
            }
            if (checkedPropertyNames.has(srcProp.name)) {
                continue;
            }
            checkedPropertyNames.add(srcProp.name);

            const srcPropType = typeChecker.getTypeAtLocation(srcProp.valueDeclaration);
            if (
                isObjectOrUnionOrIntersectionType(dstNumberIndexType) &&
                isObjectOrUnionOrIntersectionType(srcPropType)
            ) {
                const subExpandedValue : string[] = [];
                checkAssignmentImpl(
                    context,
                    options,
                    expanded,
                    assignabilityCache,
                    typeChecker,
                    node,
                    dstNumberIndexType,
                    srcPropType,
                    ["[number]/"+srcProp.name],
                    subExpandedValue,
                    dstPath,
                    srcPath,
                    sharedState
                );
                addOffendingProperties(
                    offendingProperties,
                    prefix,
                    subExpandedValue
                );
                addOffendingProperties(
                    expandedValue,
                    [],
                    subExpandedValue
                );
            }

            if (
                !shallowSafe &&
                (
                    !(
                        isObjectType(srcPropType) &&
                        srcPropType.getCallSignatures().length == 0
                    ) ||
                    (
                        !isObjectType(dstNumberIndexType)
                    )
                )
            ) {
                const srcSubTypeOfDst = isSubTypeOf(
                    context,
                    options,
                    assignabilityCache,
                    node,
                    srcPropType,
                    dstNumberIndexType,
                    typeChecker
                );
                if (srcSubTypeOfDst == undefined) {
                    //ts-simple-type crashed
                    return;
                }
                const dstSubTypeOfSrc = isSubTypeOf(
                    context,
                    options,
                    assignabilityCache,
                    node,
                    dstNumberIndexType,
                    srcPropType,
                    typeChecker
                );
                if (dstSubTypeOfSrc == undefined) {
                    //ts-simple-type crashed
                    return;
                }

                if (srcSubTypeOfDst && !dstSubTypeOfSrc) {
                    addOffendingProperty(offendingProperties, [...prefix].join(".")+"[number]/"+srcProp.name);
                    addOffendingProperty(expandedValue, "[string]/"+srcProp.name);
                }
            }
        }
    }

    const dstStringIndexInfo = typeChecker.getIndexInfoOfType(dstType, ts.IndexKind.String);
    const dstStringIndexType = dstType.getStringIndexType();
    if (
        dstStringIndexInfo != undefined &&
        dstStringIndexType != undefined &&
        !dstStringIndexInfo.isReadonly &&
        //Is rest parameter of a function?
        (
            !isParameterDeclaration(dst) ||
            dst.dotDotDotToken == undefined
        )
    ) {
        const srcNumberIndexType = srcType.getNumberIndexType();

        if (srcNumberIndexType != undefined) {
            if (
                isObjectOrUnionOrIntersectionType(dstStringIndexType) &&
                isObjectOrUnionOrIntersectionType(srcNumberIndexType)
            ) {
                const subExpandedValue : string[] = [];
                checkAssignmentImpl(
                    context,
                    options,
                    expanded,
                    assignabilityCache,
                    typeChecker,
                    node,
                    dstStringIndexType,
                    srcNumberIndexType,
                    ["[string]/[number]"],
                    subExpandedValue,
                    dstPath,
                    srcPath,
                    sharedState
                );
                addOffendingProperties(
                    offendingProperties,
                    prefix,
                    subExpandedValue
                );
                addOffendingProperties(
                    expandedValue,
                    [],
                    subExpandedValue
                );
            }

            if (
                !shallowSafe &&
                (
                    !(
                        isObjectType(srcNumberIndexType) &&
                        srcNumberIndexType.getCallSignatures().length == 0
                    ) ||
                    (
                        !isObjectType(dstStringIndexType)
                    )
                )
            ) {
                const srcSubTypeOfDst = isSubTypeOf(
                    context,
                    options,
                    assignabilityCache,
                    node,
                    srcNumberIndexType,
                    dstStringIndexType,
                    typeChecker
                );
                if (srcSubTypeOfDst == undefined) {
                    //ts-simple-type crashed
                    return;
                }
                const dstSubTypeOfSrc = isSubTypeOf(
                    context,
                    options,
                    assignabilityCache,
                    node,
                    dstStringIndexType,
                    srcNumberIndexType,
                    typeChecker
                );
                if (dstSubTypeOfSrc == undefined) {
                    //ts-simple-type crashed
                    return;
                }

                if (srcSubTypeOfDst && !dstSubTypeOfSrc) {
                    addOffendingProperty(offendingProperties, [...prefix].join(".")+"[string]/[number]");
                    addOffendingProperty(expandedValue, "[string]/[number]");
                }
            }
        }

        const srcStringIndexType = srcType.getStringIndexType();

        if (srcStringIndexType != undefined) {
            if (
                isObjectOrUnionOrIntersectionType(dstStringIndexType) &&
                isObjectOrUnionOrIntersectionType(srcStringIndexType)
            ) {
                const subExpandedValue : string[] = [];
                checkAssignmentImpl(
                    context,
                    options,
                    expanded,
                    assignabilityCache,
                    typeChecker,
                    node,
                    dstStringIndexType,
                    srcStringIndexType,
                    ["[string]"],
                    subExpandedValue,
                    dstPath,
                    srcPath,
                    sharedState
                );
                addOffendingProperties(
                    offendingProperties,
                    prefix,
                    subExpandedValue
                );
                addOffendingProperties(
                    expandedValue,
                    [],
                    subExpandedValue
                );
            }

            if (
                !shallowSafe &&
                (
                    !(
                        isObjectType(srcStringIndexType) &&
                        srcStringIndexType.getCallSignatures().length == 0
                    ) ||
                    (
                        !isObjectType(dstStringIndexType)
                    )
                )
            ) {
                const srcSubTypeOfDst = isSubTypeOf(
                    context,
                    options,
                    assignabilityCache,
                    node,
                    srcStringIndexType,
                    dstStringIndexType,
                    typeChecker
                );
                if (srcSubTypeOfDst == undefined) {
                    //ts-simple-type crashed
                    return;
                }
                const dstSubTypeOfSrc = isSubTypeOf(
                    context,
                    options,
                    assignabilityCache,
                    node,
                    dstStringIndexType,
                    srcStringIndexType,
                    typeChecker
                );
                if (dstSubTypeOfSrc == undefined) {
                    //ts-simple-type crashed
                    return;
                }

                if (srcSubTypeOfDst && !dstSubTypeOfSrc) {
                    addOffendingProperty(offendingProperties, [...prefix].join(".")+"[string]");
                    addOffendingProperty(expandedValue, "[string]");
                }
            }
        }

        for (const srcProp of srcType.getProperties()) {
            if (checkedPropertyNames.has(srcProp.name)) {
                continue;
            }
            checkedPropertyNames.add(srcProp.name);

            const srcPropType = typeChecker.getTypeAtLocation(srcProp.valueDeclaration);
            if (
                isObjectOrUnionOrIntersectionType(dstStringIndexType) &&
                isObjectOrUnionOrIntersectionType(srcPropType)
            ) {
                const subExpandedValue : string[] = [];
                checkAssignmentImpl(
                    context,
                    options,
                    expanded,
                    assignabilityCache,
                    typeChecker,
                    node,
                    dstStringIndexType,
                    srcPropType,
                    ["[string]/"+srcProp.name],
                    subExpandedValue,
                    dstPath,
                    srcPath,
                    sharedState
                );
                addOffendingProperties(
                    offendingProperties,
                    prefix,
                    subExpandedValue
                );
                addOffendingProperties(
                    expandedValue,
                    [],
                    subExpandedValue
                );
            }

            if (
                !shallowSafe &&
                (
                    !(
                        isObjectType(srcPropType) &&
                        srcPropType.getCallSignatures().length == 0
                    ) ||
                    (
                        !isObjectType(dstStringIndexType)
                    )
                )
            ) {
                const srcSubTypeOfDst = isSubTypeOf(
                    context,
                    options,
                    assignabilityCache,
                    node,
                    srcPropType,
                    dstStringIndexType,
                    typeChecker
                );
                if (srcSubTypeOfDst == undefined) {
                    //ts-simple-type crashed
                    return;
                }
                const dstSubTypeOfSrc = isSubTypeOf(
                    context,
                    options,
                    assignabilityCache,
                    node,
                    dstStringIndexType,
                    srcPropType,
                    typeChecker
                );
                if (dstSubTypeOfSrc == undefined) {
                    //ts-simple-type crashed
                    return;
                }

                if (srcSubTypeOfDst && !dstSubTypeOfSrc) {
                    addOffendingProperty(offendingProperties, [...prefix].join(".")+"[string]/"+srcProp.name);
                    addOffendingProperty(expandedValue, "[string]/"+srcProp.name);
                }
            }
        }
    }
}
