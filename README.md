# Micro Transform

Tiny library to transform objects between different states.

Suitable cases: serializing, deserializing, transforming into different shapes.

- **Micro in size**. No deps. ~300B.
- **TS-first**. All results of transformations are strictly typed.
- **Versatile**. Uses plain functions under the hood, can be composed in any way.

<a href="https://evilmartians.com/?utm_source=micro-transform">
  <img src="https://evilmartians.com/badges/sponsored-by-evil-martians.svg"
       alt="Sponsored by Evil Martians" width="236" height="54">
</a>

## Install

`npm install micro-transform`

## Usage

Use `.setModelConfig` to cherry-pick fields from a passed model.

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

With `.setCustomConfig` you can use enchance models with **new** fields and
even use async functions to resolve their values:

```ts
const userRoleSerializer = createTransformer<User>().setCustomConfig({
  role: async (user) => {
    return db.fetchRole(user.id);
  },
});

const result = await userRoleSerializer.transform(userExample);
// -> { role: "admin" }
```

And sometimes you just need a bit of extra context to serialize data. Define its
structure as the second type argument, read the value in the transform function,
and pass in the `transform` function:

```ts
const userCreationSerializer = createTransformer<
  User,
  { timezone: string }
>().setModelConfig({
  createdAt: (user, { timezone }) => formatDate(user.createdAt, timezone),
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

## Validations

Validations are **out of the scope** for this library. There's no validation of
the shape of the incoming data. If you pass in garbage, the library will crash,
and it's intended.

If you have untrusted/unexpected input, use any of the schema validation libraries
out there, like [zod](https://github.com/colinhacks/zod),
[yup](https://github.com/jquense/yup), [valita](https://github.com/badrap/valita)
and numerous others.
