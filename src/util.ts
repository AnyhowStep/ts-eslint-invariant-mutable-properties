import * as ts from "typescript";
import {TSNode} from "@typescript-eslint/typescript-estree";
export type UnionType = (
    ts.UnionType &
    { __unionBrand? : unknown }
);
export type IntersectionType = (
    ts.IntersectionType &
    { __intersectionBrand? : unknown }
);
export function isObjectType (typeOrNode : ts.Type|TSNode) : typeOrNode is ts.ObjectType {
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
export function isUnionType (typeOrNode : ts.Type|TSNode) : typeOrNode is UnionType {
    return (
        ((typeOrNode as ts.UnionType).types != undefined) &&
        ((typeOrNode.flags & ts.TypeFlags.Union) !== 0)
    );
}
export function isIntersectionType (typeOrNode : ts.Type|TSNode) : typeOrNode is IntersectionType {
    return (
        ((typeOrNode as ts.IntersectionType).types != undefined) &&
        ((typeOrNode.flags & ts.TypeFlags.Intersection) !== 0)
    );
}
export function isObjectOrUnionOrIntersectionType (type : ts.Type) : type is (ts.ObjectType|UnionType|IntersectionType) {
    return isObjectType(type) || isUnionType(type) || isIntersectionType(type)
}
export function isObjectOrArrayLiteral (typeOrNode : ts.ObjectType|TSNode|UnionType|IntersectionType) : boolean {
    if (isObjectType(typeOrNode)) {
        return (typeOrNode.objectFlags & ts.ObjectFlags.ObjectLiteral) != 0;
    } if (isUnionType(typeOrNode)) {
        return false;
    } if (isIntersectionType(typeOrNode)) {
        return false;
    } else {
        return (
            (typeOrNode.kind == ts.SyntaxKind.ObjectLiteralExpression) ||
            (typeOrNode.kind == ts.SyntaxKind.ArrayLiteralExpression)
        );
    }
}

export function isMappedType (type : any) : type is { declaration : ts.MappedTypeNode } {
    return (
        ((type.objectFlags & ts.ObjectFlags.Mapped) != 0) &&
        type.declaration != undefined &&
        type.declaration.kind == ts.SyntaxKind.MappedType
    );
}

export function hasHeritageClauses (declaration : ts.Declaration) : declaration is ts.Declaration & { heritageClauses : ts.NodeArray<ts.HeritageClause> } {
    return (
        (declaration as any).heritageClauses != undefined
    )
}

export function isHeritageOfId (typeChecker : ts.TypeChecker, heritageType: ts.ExpressionWithTypeArguments, id : number) : boolean {
    //eslint-disable-next-line local/invariant-mutable-properties
    const type = typeChecker.getTypeAtLocation(heritageType);
    if (type == undefined) {
        return false;
    }

    if (
        (type as any).target != undefined &&
        (type as any).target.id == id
    ) {
        return true;
    }
    if (
        (type as any).symbol != undefined &&
        (type as any).symbol.declaredType != undefined &&
        (type as any).symbol.declaredType.id == id
    ) {
        return true;
    }
    return false;
}
