import * as ts from "typescript";
import {TSNode} from "@typescript-eslint/typescript-estree";

export function isObjectType(typeOrNode: ts.Type|TSNode): typeOrNode is ts.ObjectType {
    return (
        ((typeOrNode as ts.Type).symbol != undefined) &&
        ((typeOrNode.flags & ts.TypeFlags.Object) !== 0)
    );
}
export function isAsExpression (node : ts.Node) : node is ts.AsExpression {
    return node.kind == ts.SyntaxKind.AsExpression;
}
export function isTypeReferenceNode (node : ts.Node) : node is ts.TypeReferenceNode {
    return node.kind == ts.SyntaxKind.TypeReference;
}
export function isIdentifier (entityName : ts.EntityName) : entityName is ts.Identifier {
    return entityName.kind == ts.SyntaxKind.Identifier;
}
export function isParameterDeclaration (declaration : ts.Declaration) : declaration is ts.ParameterDeclaration {
    return declaration.kind == ts.SyntaxKind.Parameter;
}
export function isUnionType(type: ts.Type): type is ts.UnionType {
    return (type.flags & ts.TypeFlags.Union) !== 0;
}
