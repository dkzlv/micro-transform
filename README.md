# TS Serialize

Super simple thing to serialize objects into other objects.

**No deps**.
**Very good TS**.
**Less than 500B.**

Simple and no bullshit.

Use `.setModelConfig` to cherry-pick fields from passed model.

```ts
import { createSerializer } from "ts-serialize";

const userExample = {
  id: "id",
  createdAt: 1602201600000,
  email: "olivia@EXAMPLE.COM",
  password: "secret",
};
type User = typeof userExample;

const userSerializer = createSerializer<User>().setModelConfig({
  // Use `true` if you just want this field to be copied
  id: true,
  // Use function to transform the value
  email: (user) => user.email.toLowerCase(),
});

const result = await userSerializer.serialize(userExample);
// -> { id: "id", email: "olivia@example.com" }
```

With `.setCustomConfig` you can use enchance models with **custom** fields and
even use async functions to resolve their values:

```ts
const userRoleSerializer = createSerializer<User>().setCustomConfig({
  role: async (user) => {
    return db.fetchRole(user.id);
  },
});

const result = await userRoleSerializer.serialize(userExample);
// -> { role: "admin" }
```

And sometimes you just need a bit of extra context to serialize data. Define its
structure as the second type argument, read the value in the transform function,
and pass in the `serialize` function:

```ts
const userCreationSerializer = createSerializer<
  User,
  { timezone: string }
>().setModelConfig({
  createdAt: (user, { timezone }) => formatDate(user.createdAt, timezone),
});

const result = await userCreationSerializer.serialize(userExample, {
  timezone: "Europe/Lisbon",
}); // -> { createdAt: "..." }
```

## Nested fields

Nothing special is needed. Transformers can be other serializers under the hood,
so to nest fields you just need to call the appropriate serializer in the transformer.

Same goes for arrays of values. I'll leave the code for your imagination.
