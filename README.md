### `invariant-mutable-properties`

A prototype of a [`typescript-eslint`](https://github.com/typescript-eslint/typescript-eslint) rule
that treats mutable properties as invariant.

This rule uses [`ts-simple-type`](https://github.com/runem/ts-simple-type) for type checking
because there is no public type checking API in TypeScript [yet](https://github.com/microsoft/TypeScript/issues/9879).

-----

### Configuration

```ts
interface Config {
    //Defaults to `true`
    //If ts-simple-type crashes, file an issue with ts-simple-type repo.
    //At the moment, it will crash for complex types and some generic functions.
    //You might want to set this to `false` if ts-simple-type crashes too often.
    "reportTsSimpleTypeCrash": boolean,
    //Defaults to `true`
    //If the rule crashes, file an issue
    "reportRuleCrash": boolean
}
```

See [`.eslintrc-base.json`](.eslintrc-base.json) for more details

-----

### Testing

1. Clone this repo
1. `npm install`
1. `npm run test`

+ You may build with `npm run build`.
+ You may lint with `npm run lint`

-----

### Examples

At the moment, TypeScript treats mutable properties as covariant,
```ts
const src : { x : number } = { x : 34 };
/**
 * Assignment allowed, `x` is covariant
 */
const dst : { x : number|string } = src;

console.log(src.x); //34
dst.x = "Oops!";
console.log(src.x); //Oops!
```
[Playground](http://www.typescriptlang.org/play/#code/MYewdgzgLgBBBOwYC4YG8YA8UzAVwFsAjAU3hgF8YBedLHAZgBZKBuAKAHoAqb9mbjACCECAEsA5mAIkwsAIYAbRSADuJACYAaGAANMumGIgxQAN3nwx8uf26d2oSLA3QcGbKnzEyAH2hWYBKUNHCIHI7gECCKJAB0KhIAFAjAcZgAlKwwnJzM7K5Q6aEARADyIAAOEACEJRxO0bEJIMmp6Vk5nBXVNUA)

-----

As you can see from the above example, this is not safe.

This rule treats mutable properties as invariant,
```ts
const src : { x : number } = { x : 34 };
/**
 * Lint Error: Mutable properties are invariant; x
 */
const dst : { x : number|string } = src;
```

-----

`readonly` properties are still covariant,
```ts
const src : { x : number } = { x : 34 };
/**
 * Assignment allowed, `readonly x` is covariant
 */
const dst : { readonly x : number|string } = src;
```

-----

See [tests](test/src/rules/invariant-mutable-properties.ts) for more examples.

-----

### TODO

+ Proper support for generics (and tests!)
+ Proper checking for object/array literals (and tests!)

  Right now, it always assumes object/array literals are safe but this is not true.

  Ctrl+F `@todo` for examples

+ More tests

+ Use more stable type-checking API

  `ts-simple-type` crashes with generic functions and complex types often, at the moment.

-----

The rule does not handle generics properly yet,
```ts
function foo<SrcT extends { x : number }> (src : SrcT) {
    //Right now, the rule thinks this is safe
    //but this is not true
    const dst : { x : number } = src;
    //Imagine SrcT is { x : 2 }
    //Boom, src.x now has 1 instead of 2
    dst.x = 1;
}
const src : { x : 2 } = { x : 2 };
console.log(src.x); //2
foo<{ x : 2 }>(src);
console.log(src.x); //1
```
[Playground](http://www.typescriptlang.org/play/#code/GYVwdgxgLglg9mABMOcA8BlAThAKogUwA8oCwATAZ0QG9EjEAuRMEAWwCMCtEBfAPkQAKSjiaJseAJS0AUIgWIA9EoBKMAOYALKCzgB3ADSIoWgoiwgANudMwwAa2p3qMapQCGwAvMUqOILouiG56QZY+iogQCJS6VLrMdAzMrJzcfIgAvIiiEADcvgoqAJJsHhr25pL4ocniAEx8RcpKAEKobMZ5AHQMYAaIWh7UAIwhYHEEHuSIcMCIDS0JfdmIo4W8sjGTunni9cxNvGuHi3yFO5RwNj1WcBoiOH1S+a1LKOhnx-xPEK-bWI3Ah3B5-F5vFSjWRAA)

-----

The rule does not handle object and array literals properly yet,
```ts
const src : {
    nested : {
        doNotMutateMePlease : string,
    }
} = {
    nested : {
        doNotMutateMePlease : "please?"
    }
};
//Right now, the rule thinks object literals are **ALWAYS** safe
//but this is not true
const dst : {
    nested : {
        doNotMutateMePlease : string|number,
    }
} = {
    ...src,
};
//Boom.
//src.nested.doNotMutateMePlease is now number and not string
console.log(src.nested.doNotMutateMePlease); //"please?"
dst.nested.doNotMutateMePlease = 34;
console.log(src.nested.doNotMutateMePlease); //34
```
[Playground](http://www.typescriptlang.org/play/#code/MYewdgzgLgBBBOwYC4YG8BQNszAU2jwBMV0scKiQA5EKAWQFcoBDKPevABQBs8WIeUtHgBLMAHMANOWwBfDHJgBeMhXyESqTBUo06TVu069+g0gCIADnwF4A-BdkwFcgNwYA9J4BKoiQAWsGAgAO5SMFABQvCMfJEB4gDWEDAgAEYAVnjAsDyi7PAsPKks8EIAVBUAggAyAOrVAJoAylVwLABmeF6e6cwJoqlDuHSRsT2gkLBE0KQ6OBrsWmq62FS0DMxsHNy25qgi4hIAPmCMALbpePAyFK4qq9gAdK8IwDLuvQBCICAXz1672eS2Izw2Bm2xj2ZiEIxCoVwl2u8BgLDAJBCsCOkgwUwgID4zx4IAkAApgaCiOD9FsjLtTHYAJRuGDeaz7BxOWZQEEEZY0zaGHYmTmPADMABYPPjCXhiaSKYg+ZpBZD6aLYSy2Z4pUA)


-----

I am not very familiar with TypeScript's API, or `typescript-eslint`'s API.

If someone out there is more familiar with them and
agrees making mutable properties invariant would be pretty cool,
please improve this rule and/or create a better version of it!
