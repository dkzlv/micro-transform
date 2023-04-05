# Micro Transform

Tiny library to transform objects between different states.

Suitable cases: serializing, deserializing, transforming into different shapes.

- **Micro in size**. No deps. ~400B.
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
  // Use `true` if you just want this field to be copied
  id: true,
  // Use function to transform the value. Async functions works as well!
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

## Nested fields and Arrays

Nothing special is needed. Model config transformers or Custom transformers can
can use other transformers. It's quite simple under the hood.

Keep in mind, though, that transforms are _always_ async function, so if you run them
against an array of values, you need to wrap them with `Promise.all`.

```ts
type UserWithFriends = User & { friends: User[] };

declare const user: UserWithFriends;

const friendSerializer = createTransformer<User>().setModelConfig({
  email: true,
});
const userSerializer = createTransformer<UserWithFriends>().setModelConfig({
  id: true,
  friends: (user) =>
    Promise.all(user.friends.map((u) => friendSerializer.transform(u))),
});

const serializedUser = await userSerializer.transform(user);
// { id: string, friends: { email: string }[] }
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
