import * as ts from "typescript";
import {
    TSESTree,
    //TSESLint,
    //AST_NODE_TYPES,
} from "@typescript-eslint/experimental-utils";
import {TSNode} from "@typescript-eslint/typescript-estree";
import {RuleContext} from "@typescript-eslint/experimental-utils/dist/ts-eslint";
import {MessageId, mutablePropertiesAreInvariant, ruleCrash} from "./message-ids";
import {
    isObjectType,
    isUnionType,
    isAsExpression,
    isTypeReferenceNode,
    isIdentifier,
    isObjectOrArrayLiteral
} from "./util";
import {isSubTypeOf} from "./is-sub-type-of";
import {Options} from "./options";

export function checkAssignment (
    context : RuleContext<MessageId, Options>,
    typeChecker : ts.TypeChecker,
    node : TSESTree.Node | TSESTree.Comment | TSESTree.Token,
    dst : TSNode|ts.ObjectType,
    src : TSNode|ts.ObjectType
) {
    const offendingProperties : string[] = [];
    try {
        checkAssignmentImpl(context, typeChecker, node, dst, src, [], offendingProperties);
    } catch (err) {
        if (context.options[0].reportRuleCrash === true) {
            context.report({
                node,
                messageId: ruleCrash,
                data: {
                    message : err.message,
                },
            });
        }
    }

    if (offendingProperties.length > 0) {
        context.report({
            node,
            messageId: mutablePropertiesAreInvariant,
            data: {
                properties : offendingProperties.join(", "),
            },
        });
    }
}
function checkAssignmentImpl (
    context : RuleContext<MessageId, Options>,
    typeChecker : ts.TypeChecker,
    node : TSESTree.Node | TSESTree.Comment | TSESTree.Token,
    dst : TSNode|ts.ObjectType|ts.UnionType,
    src : TSNode|ts.ObjectType,
    prefix : string[] = [],
    offendingProperties : string[] = [],
    expanded : Set<string> = new Set<string>()
) {
    let srcType = isObjectType(src) ?
        src :
        typeChecker.getTypeAtLocation(src);
    const srcTypeConstraint = srcType.getConstraint();
    if (srcTypeConstraint != undefined) {
        srcType = srcTypeConstraint;
    }
    srcType = srcType.getNonNullableType();
    if (!isObjectType(srcType)) {
        //Only check object types
        return;
    }
    let shallowSafe = false;

    if (isObjectOrArrayLiteral(src)) {
        shallowSafe = true;
    }
    if (srcType.symbol.valueDeclaration != undefined) {
        const srcParent = srcType.symbol.valueDeclaration.parent;
        if (
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

    let dstType = (
        isObjectType(dst) ?
        dst :
        isUnionType(dst) ?
        dst :
        typeChecker.getTypeAtLocation(dst)
    );
    const dstTypeConstraint = dstType.getConstraint();
    if (dstTypeConstraint != undefined) {
        dstType = dstTypeConstraint;
    }
    dstType = dstType.getNonNullableType();

    //Special case for union dst type
    if (isUnionType(dstType)) {
        for (const dstTypeEle of dstType.types) {
            if (!isObjectType(dstTypeEle)) {
                //Only check object types
                continue;
            }
            const isSubType = isSubTypeOf(
                context,
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
                    typeChecker,
                    node,
                    dstTypeEle,
                    src,
                    prefix,
                    offendingProperties,
                    expanded
                )
                return;
            }
        }
    }

    if (!isObjectType(dstType)) {
        //Only check object types
        return;
    }

    if (expanded.has((srcType as any).id + "-" + (dstType as any).id)) {
        return;
    }
    expanded.add((srcType as any).id + "-" + (dstType as any).id);

    const dstNumberIndexInfo = typeChecker.getIndexInfoOfType(dstType, ts.IndexKind.Number);
    const dstNumberIndexType = dstType.getNumberIndexType();
    if (
        dstNumberIndexInfo != undefined &&
        dstNumberIndexType != undefined &&
        !dstNumberIndexInfo.isReadonly
    ) {
        const srcNumberIndexType = srcType.getNumberIndexType();
        if (srcNumberIndexType != undefined) {
            if (
                (isUnionType(dstNumberIndexType) || isObjectType(dstNumberIndexType)) &&
                isObjectType(srcNumberIndexType)
            ) {
                checkAssignmentImpl(
                    context,
                    typeChecker,
                    node,
                    dstNumberIndexType,
                    srcNumberIndexType,
                    [...prefix, "[number]"],
                    offendingProperties,
                    expanded
                );
            } else if (!shallowSafe) {
                const srcSubTypeOfDst = isSubTypeOf(
                    context,
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
                    offendingProperties.push([...prefix].join(".")+"[number]");
                }
            }
        }

        for (const srcProp of srcType.getProperties()) {
            if (parseFloat(srcProp.name).toString() != srcProp.name) {
                //Only check numeric properties
                continue;
            }
            const srcPropType = typeChecker.getTypeAtLocation(srcProp.valueDeclaration);
            if (
                (isUnionType(dstNumberIndexType) || isObjectType(dstNumberIndexType)) &&
                isObjectType(srcPropType)
            ) {
                checkAssignmentImpl(
                    context,
                    typeChecker,
                    node,
                    dstNumberIndexType,
                    srcPropType,
                    [...prefix, "[number]/"+srcProp.name],
                    offendingProperties,
                    expanded
                );
            } else if (!shallowSafe) {
                const srcSubTypeOfDst = isSubTypeOf(
                    context,
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
                    offendingProperties.push([...prefix].join(".")+"[number]/"+srcProp.name);
                }
            }
        }
    }

    const dstStringIndexInfo = typeChecker.getIndexInfoOfType(dstType, ts.IndexKind.String);
    const dstStringIndexType = dstType.getStringIndexType();
    if (
        dstStringIndexInfo != undefined &&
        dstStringIndexType != undefined &&
        !dstStringIndexInfo.isReadonly
    ) {
        const srcNumberIndexType = srcType.getNumberIndexType();

        if (srcNumberIndexType != undefined) {
            if (
                (isUnionType(dstStringIndexType) || isObjectType(dstStringIndexType)) &&
                isObjectType(srcNumberIndexType)
            ) {
                checkAssignmentImpl(
                    context,
                    typeChecker,
                    node,
                    dstStringIndexType,
                    srcNumberIndexType,
                    [...prefix, "[string]/[number]"],
                    offendingProperties,
                    expanded
                );
            } else if (!shallowSafe) {
                const srcSubTypeOfDst = isSubTypeOf(
                    context,
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
                    offendingProperties.push([...prefix].join(".")+"[string]/[number]");
                }
            }
        }

        const srcStringIndexType = srcType.getStringIndexType();

        if (srcStringIndexType != undefined) {
            if (
                (isUnionType(dstStringIndexType) || isObjectType(dstStringIndexType)) &&
                isObjectType(srcStringIndexType)
            ) {
                checkAssignmentImpl(
                    context,
                    typeChecker,
                    node,
                    dstStringIndexType,
                    srcStringIndexType,
                    [...prefix, "[string]"],
                    offendingProperties,
                    expanded
                );
            } else if (!shallowSafe) {
                const srcSubTypeOfDst = isSubTypeOf(
                    context,
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
                    offendingProperties.push([...prefix].join(".")+"[string]");
                }
            }
        }

        for (const srcProp of srcType.getProperties()) {
            const srcPropType = typeChecker.getTypeAtLocation(srcProp.valueDeclaration);
            if (
                (isUnionType(dstStringIndexType) || isObjectType(dstStringIndexType)) &&
                isObjectType(srcPropType)
            ) {
                checkAssignmentImpl(
                    context,
                    typeChecker,
                    node,
                    dstStringIndexType,
                    srcPropType,
                    [...prefix, "[string]/"+srcProp.name],
                    offendingProperties,
                    expanded
                );
            } else if (!shallowSafe) {
                const srcSubTypeOfDst = isSubTypeOf(
                    context,
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
                    offendingProperties.push([...prefix].join(".")+"[string]/"+srcProp.name);
                }
            }
        }
    }

    for (const dstProp of dstType.getProperties()) {
        const srcProp = srcType.getProperty(dstProp.name);
        if (srcProp == undefined) {
            //src does not have prop
            continue;
        }
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
        if (dstPropValueDeclaration == undefined) {
            if (context.options[0].reportRuleCrash === true) {
                context.report({
                    node,
                    messageId : ruleCrash,
                    data : {
                        message : "Cannot get valueDeclaration of dst",
                    },
                });
            }
            continue;
        }

        const srcPropType = typeChecker.getTypeAtLocation(srcProp.valueDeclaration);
        const dstPropType = typeChecker.getTypeAtLocation(dstPropValueDeclaration);
        if (
            (isUnionType(dstPropType) || isObjectType(dstPropType)) &&
            isObjectType(srcPropType)
        ) {
            checkAssignmentImpl(
                context,
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
                [...prefix, dstProp.name],
                offendingProperties,
                expanded
            );
            if (srcPropType.getCallSignatures().length == 0) {
                continue;
            }
        }

        if (
            dstPropValueDeclaration.modifiers != undefined &&
            dstPropValueDeclaration.modifiers.some(m => m.kind == ts.SyntaxKind.ReadonlyKeyword)
        ) {
            continue;
        }

        if (shallowSafe) {
            continue;
        }

        const srcSubTypeOfDst = isSubTypeOf(
            context,
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
            offendingProperties.push([...prefix, dstProp.name].join("."));
        }
    }
}
