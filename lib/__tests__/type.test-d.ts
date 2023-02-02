import { createSerializer } from "../main";

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
      const userSerializer = createSerializer<User>().setModelConfig({
        // Use `true` if you just want this field to be copied
        id: true,
        // Use function to transform the
        email: (user) => user.email.toLowerCase(),
      });

      const result = await userSerializer.serialize(userExample);
      // -> { id: "id", email: "olivia@example.com" }
    }

    // SECOND EXAMPLE
    {
      // @ts-expect-error
      declare const db: { fetchRole: (id: string) => Promise<string> };

      const userRoleSerializer = createSerializer<User>().setCustomConfig({
        role: async (user) => {
          return db.fetchRole(user.id);
        },
      });

      const result = await userRoleSerializer.serialize(userExample);
      // -> { role: "admin" }
    }

    // THIRD EXAMPLE
    {
      // @ts-expect-error
      declare function formatDate(dt: number, tz: string): string;

      const userCreationSerializer = createSerializer<
        User,
        { timezone: string }
      >().setModelConfig({
        createdAt: (user, { timezone }) => formatDate(user.createdAt, timezone),
      });

      const result = await userCreationSerializer.serialize(userExample, {
        timezone: "Europe/Lisbon",
      }); // -> { createdAt: "..." }
    }
  });

  test(`works fully`, async () => {
    const a = createSerializer<User, Ctx>()
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

    const res = await a.serialize({} as unknown as User, {} as unknown as Ctx);

    expectTypeOf(res).toEqualTypeOf<{
      id: string;
      email: number;
      bla: string | 123;
    }>();
  });

  test("works only with model", async () => {
    const a = createSerializer<User>().setModelConfig({
      // Use `true` if you just want this field to be copied
      id: true,
      // Use function to transform the
      email: (user) => user.email.toLowerCase(),
    });

    const res = await a.serialize({} as unknown as User);

    expectTypeOf(res).toEqualTypeOf<{
      id: string;
      email: string;
    }>();
  });

  test("works only with custom", async () => {
    const a = createSerializer<User>().setCustomConfig({
      // Use function to transform the
      hey: (user) => user.email.toLowerCase(),
    });

    const res = await a.serialize({} as unknown as User);

    expectTypeOf(res).toEqualTypeOf<{
      hey: string;
    }>();
  });
});
