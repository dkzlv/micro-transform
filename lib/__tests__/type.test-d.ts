import { createTransformer, TransformerResult } from "../main";

type User = { id: string; password: string; email: string };
type Ctx = { locale: string };

describe("types", () => {
  test("from readme", async () => {
    const userExample = {
      id: "id",
      createdAt: 1602201600000,
      email: "olivia@EXAMPLE.COM",
      password: "secret",
    };
    type User = typeof userExample;

    // FIRST EXAMPLE
    {
      const userSerializer = createTransformer<User>().setModelConfig({
        // Use `true` if you just want this field to be copied
        id: true,
        // Use function to transform the
        email: (user) => user.email.toLowerCase(),
      });

      const result = await userSerializer.transform(userExample);
      // -> { id: "id", email: "olivia@example.com" }
    }

    // SECOND EXAMPLE
    {
      // @ts-expect-error
      declare const db: { fetchRole: (id: string) => Promise<string> };

      const userRoleSerializer = createTransformer<User>().setCustomConfig({
        role: async (user) => {
          return db.fetchRole(user.id);
        },
      });

      const result = await userRoleSerializer.transform(userExample);
      // -> { role: "admin" }
    }

    // THIRD EXAMPLE
    {
      // @ts-expect-error
      declare function formatDate(dt: number, tz: string): string;

      const userCreationSerializer = createTransformer<
        User,
        { timezone: string }
      >().setModelConfig({
        createdAt: (user, { timezone }) => formatDate(user.createdAt, timezone),
      });

      const result = await userCreationSerializer.transform(userExample, {
        timezone: "Europe/Lisbon",
      }); // -> { createdAt: "..." }
    }
  });

  test(`works fully`, async () => {
    const a = createTransformer<User, Ctx>()
      .setModelConfig({
        id: true,
        email: () => 123,
      })
      .setCustomConfig({
        bla: async (user, ctx) => {
          expectTypeOf(user).toEqualTypeOf<User>();
          expectTypeOf(ctx).toEqualTypeOf<Ctx>();
          return ctx.locale === "ru" ? user.password : 123;
        },
      });

    const res = await a.transform({} as unknown as User, {} as unknown as Ctx);

    type Serialized = {
      id: string;
      email: number;
      bla: string | 123;
    };

    // @ts-expect-error
    declare const b: TransformerResult<typeof a>;

    expectTypeOf(b).toEqualTypeOf<Serialized>();
    expectTypeOf(res).toEqualTypeOf<Serialized>();
  });

  test('errors when adding non-existant "model" keys', () => {
    createTransformer<User, Ctx>().setModelConfig({
      // @ts-expect-error
      bla: true,
    });
  });

  test("works only with model", async () => {
    const a = createTransformer<User>().setModelConfig({
      // Use `true` if you just want this field to be copied
      id: true,
      // Use function to transform the
      email: (user) => user.email.toLowerCase(),
    });

    const res = await a.transform({} as unknown as User);

    expectTypeOf(res).toEqualTypeOf<{
      id: string;
      email: string;
    }>();
  });

  test("model is merged", async () => {
    const a = createTransformer<User>()
      .setModelConfig({
        // Use `true` if you just want this field to be copied
        id: true,
        // Use function to transform the
        email: (user) => user.email.toLowerCase(),
      })
      .setModelConfig({ password: () => false });

    const res = await a.transform({} as unknown as User);

    expectTypeOf(res).toEqualTypeOf<{
      id: string;
      email: string;
      password: boolean;
    }>();
  });

  test("works only with custom", async () => {
    const a = createTransformer<User>().setCustomConfig({
      // Use function to transform the
      hey: (user) => user.email.toLowerCase(),
    });

    const res = await a.transform({} as unknown as User);

    expectTypeOf(res).toEqualTypeOf<{
      hey: string;
    }>();
  });

  test("custom is merged", async () => {
    const a = createTransformer<User>()
      .setCustomConfig({
        // Use function to transform the
        hey: (user) => user.email.toLowerCase(),
      })
      .setCustomConfig({
        hey2: () => false,
      });

    const res = await a.transform({} as unknown as User);

    expectTypeOf(res).toEqualTypeOf<{
      hey: string;
      hey2: boolean;
    }>();
  });

  test("asterisk operator works", async () => {
    const a = createTransformer<User>().setModelConfig({
      "*": true,
      email: false,
    });

    const res = await a.transform({} as unknown as User);

    expectTypeOf(res).toEqualTypeOf<Pick<User, "id" | "password">>();
  });
});
