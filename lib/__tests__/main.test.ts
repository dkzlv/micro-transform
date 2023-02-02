import { createSerializer } from "../main";

type User = { id: string; email: string; password: string };
type Post = { id: string; content: string; author: User };

describe("main", () => {
  test("works!", async () => {
    const a = createSerializer<User, { locale: string }>()
      .setModelConfig({
        id: true,
        email: () => 123,
      })
      .setCustomConfig({
        bla: async (user, ctx) =>
          ctx.locale === "ru" ? user.password : "no-pass",
      });

    expect(
      await a.serialize(
        { id: "id", email: "email", password: "pass" },
        { locale: "ru" }
      )
    ).toEqual({ id: "id", email: 123, bla: "pass" });

    expect(
      await a.serialize(
        { id: "id", email: "email", password: "pass" },
        { locale: "en" }
      )
    ).toEqual({ id: "id", email: 123, bla: "no-pass" });
  });

  test("nested fields", async () => {
    const authorSerializer = createSerializer<User>().setModelConfig({
      email: true,
    });

    const postSerializer = createSerializer<Post>().setModelConfig({
      content: true,
      author: (model) => authorSerializer.serialize(model.author),
    });

    expect(
      await postSerializer.serialize({
        id: "id",
        content: "content",
        author: { id: "id", email: "email", password: "pass" },
      })
    ).toEqual({
      content: "content",
      author: { email: "email" },
    });
  });

  test("immutable copy of serializers", async () => {
    const baseSerializer = createSerializer<User>().setModelConfig({
      email: true,
    });
    const withBla = baseSerializer.setCustomConfig({ bla: () => 123 });
    const withBlaBla = baseSerializer.setCustomConfig({ blabla: () => 123 });

    expect(
      await withBla.serialize({ id: "id", email: "email", password: "pass" })
    ).toEqual({ email: "email", bla: 123 });
    expect(
      await withBlaBla.serialize({ id: "id", email: "email", password: "pass" })
    ).toEqual({ email: "email", blabla: 123 });
  });
});
