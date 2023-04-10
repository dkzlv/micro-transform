# Micro Transform

Tiny library to transform objects between different states.

Suitable cases: serializing, deserializing, transforming into different shapes.

- **Micro in size**. No deps. ~500B.
- **TS-first**. All results of transformations are strictly typed and easily
inspectable on hover.
- **Versatile**. Uses plain functions under the hood, can be composed in any way.

<a href="https://evilmartians.com/?utm_source=micro-transform">
  <img src="https://evilmartians.com/badges/sponsored-by-evil-martians.svg"
       alt="Sponsored by Evil Martians" width="236" height="54">
</a>

## Install

`npm install micro-transform`

# Usage

## `.setModelConfig`

You can use this method to cherry-pick fields from a passed model. Possible values:

1. `true` — this will include the field as is, without any transformations.
2. `false` — this will exclude the field, that could be previously added by
[asterisk operator](#asterisk-operator) or previously in the [chain](#immutability-and-chaining).
3. function — we will execute it and pass both the model and the [context](#context) 
into this function. If it'll return `Promise`, we'll await for it (those are executed
in parallel).
1. nested transformers! Read more about it in the [Nested Transformers](#nested-transformers)
section.

```ts
import { createTransformer } from "micro-transform";

const userExample = {
  id: "id",
  createdAt: 1602201600000,
  email: "olivia@EXAMPLE.COM",
  password: "secret",
};
type User = typeof userExample;

const userSerializer = createTransformer<User>().setModelConfig({
  id: true,
  email: (user) => user.email.toLowerCase(),
});

const result = await userSerializer.transform(userExample);
// -> { id: "id", email: "olivia@example.com" }
```

### Asterisk operator

There's a special case for the `setModelConfig`: you can pass a key `"*"` to include
all fields instead of listing them one by one.

```ts
const userSerializer = createTransformer<User>().setModelConfig({
  "*": true,
  password: false,
});
const result = await userSerializer.transform(userExample);
// -> { id: "id", createdAt: 1602201600000, email: "olivia@EXAMPLE.COM" }
```

### Infer the result type

The library ships with a small importable helper that can help you work with the
resulting data on the type level:

```ts
import type { TransformerResult } from 'micro-transform';

const dateSerializer = createTransformer<User>().setModelConfig({
  createdAt: (user) => formatDate(user.createdAt),
});

type SerializedDate = TransformerResult<typeof dateSerializer>;
// { createdAt: string }
```

## `.setCustomConfig`

With this you can enchance models with **new** fields. The key would be the new field
name. As of values, it pretty much repeats the model config:

1. function — that is the primary case, basically a computed property.
2. `false` — that will exclude the custom field previously added in the chain.

```ts
const userRoleSerializer = createTransformer<User>().setCustomConfig({
  role: async (user) => {
    return db.fetchRole(user.id);
  },
});

const result = await userRoleSerializer.transform(userExample);
// -> { role: "admin" }
```

## Context

Sometimes you need a bit of extra context to transform data. Say, you need user's
locale to pick the correct translation, or user's timezone to localize time fields.

In this case you can define context's structure its structure as the second type
argument. You'll then need to pass it to `transform` function. If you do this right,
you will be able to read the value in field-level transformer functions:

```ts
const userCreationSerializer = createTransformer<
  User,
  { timezone: string }
>().setModelConfig({
  createdAt: (user, ctx) => formatDate(user.createdAt, ctx.timezone),
});

const result = await userCreationSerializer.transform(userExample, {
  timezone: "Europe/Lisbon",
}); // -> { createdAt: "..." }
```

## Nested Transformers

Since we accept functions on the field-level transformers, you *could have* made your
own solution for nested transformers, but instead we added a built-in solution for that!

You can pass a transformer as field value, and it will:

1. correctly transform both arrays and single entities
2. pass on the context from the root transformer to nested transformers
3. evaluate all promises in parallel

```ts
type UserWithFriends = User & { friends: User[], bestFriend: User };

declare const user: UserWithFriends;

const friendSerializer = createTransformer<User>().setModelConfig({
  email: true,
});
const userSerializer = createTransformer<UserWithFriends>().setModelConfig({
  id: true,
  friends: friendSerializer,
  bestFriend: friendSerializer,
});

const serializedUser = await userSerializer.transform(user);
// { id: string, friends: { email: string }[], bestFriend: { email: string } }
```

## Immutability and Chaining

As you might have noticed, the basic API involves chaining model configs and
custom configs. And, as you might have guessed by the header, all the configs
are merged (not replaced), and all the intermediate transformers are immutable.

You can you this to generate configs that are overall very similar, but differ in
small details. For example, if you add or remove fields between different API versions,
or user groups (admin, public, etc.).

```ts
const adminUserSerializer = createTransformer<User>()
  .setModelConfig({
    "*": true,
  })
  .setCustomConfig({ role: (user) => db.fetchRole(user.id) });

// Hiding password
const moderatorUserSerializer = adminUserSerializer.setModelConfig({
  password: false,
});

// Hiding role
const publicUserSerializer = moderatorUserSerializer.setCustomConfig({
  role: false,
});
```

## Validations

Validations are **out of the scope** for this library. There's no validation of
the shape of the incoming data. If you pass in garbage, the library will crash,
and it's intended.

If you have untrusted/unexpected input, use any of the schema validation libraries
out there, like [zod](https://github.com/colinhacks/zod),
[yup](https://github.com/jquense/yup), [valita](https://github.com/badrap/valita)
and numerous others.
