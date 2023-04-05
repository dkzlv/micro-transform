import { createTransformer, TransformerResult } from "../main";

type User = { id: string; email: string; password: string };
type Post = { id: string; content: string; author: User };

const user: User = { id: "id", email: "email@email", password: "qweqwe" };

beforeAll(() => {
  vi.useFakeTimers();
});

describe("main", () => {
  test("works!", async () => {
    const a = createTransformer<User, { locale: string }>()
      .setModelConfig({
        id: true,
        email: () => 123,
      })
      .setCustomConfig({
        bla: async (user, ctx) =>
          ctx.locale === "ru" ? user.password : "no-pass",
      });

    expect(
      await a.transform(
        { id: "id", email: "email", password: "pass" },
        { locale: "ru" }
      )
    ).toEqual({ id: "id", email: 123, bla: "pass" });

    expect(
      await a.transform(
        { id: "id", email: "email", password: "pass" },
        { locale: "en" }
      )
    ).toEqual({ id: "id", email: 123, bla: "no-pass" });
  });

  test("nested fields", async () => {
    const authorSerializer = createTransformer<User>().setModelConfig({
      email: true,
    });

    const postSerializer = createTransformer<Post>().setModelConfig({
      content: true,
      author: (model) => authorSerializer.transform(model.author),
    });

    expect(
      await postSerializer.transform({
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
    const baseSerializer = createTransformer<User>().setModelConfig({
      email: true,
    });
    const withBla = baseSerializer.setCustomConfig({ bla: () => 123 });
    const withBlaBla = baseSerializer.setCustomConfig({ blabla: () => 123 });

    expect(
      await withBla.transform({ id: "id", email: "email", password: "pass" })
    ).toEqual({ email: "email", bla: 123 });
    expect(
      await withBlaBla.transform({ id: "id", email: "email", password: "pass" })
    ).toEqual({ email: "email", blabla: 123 });
  });

  test("merging configs", async () => {
    const transformer = createTransformer<User>()
      .setModelConfig({
        email: true,
      })
      .setModelConfig({ password: () => 123 })
      .setCustomConfig({ bla: () => 123 })
      .setCustomConfig({ blabla: () => 123 });

    expect(
      await transformer.transform({
        id: "id",
        email: "email",
        password: "pass",
      })
    ).toEqual({ email: "email", password: 123, bla: 123, blabla: 123 });
  });

  test("nested transformers example", async () => {
    type UserWithFriends = User & { friends: User[] };

    const user: UserWithFriends = {
      id: "123",
      email: "123",
      password: "123",
      friends: [{ id: "321", email: "321", password: "321" }],
    };

    const friendSerializer = createTransformer<User>().setModelConfig({
      email: true,
    });
    const userSerializer = createTransformer<UserWithFriends>().setModelConfig({
      id: true,
      friends: (user) =>
        Promise.all(user.friends.map((u) => friendSerializer.transform(u))),
    });

    const serializedUser = await userSerializer.transform(user);
    expect(serializedUser).toEqual({
      id: "123",
      friends: [{ email: "321" }],
    });
  });

  test("asterisk operator", async () => {
    const userSerializer = createTransformer<User>()
      .setModelConfig({
        "*": true,
        password: false,
      })
      .setCustomConfig({ bla: () => 1 });

    const serializedUser = await userSerializer.transform(user);
    expect(serializedUser).toEqual({ id: user.id, email: user.email, bla: 1 });
  });

  test("parallel promise execution", async () => {
    const userSerializer = createTransformer<{}>().setCustomConfig({
      bla1: async () => {
        await delay(1000);
        return 1;
      },
      bla2: async () => {
        await delay(1000);
        return 2;
      },
      blaString: async () => {
        await delay(1500);
        return "hey";
      },
    });

    let data: TransformerResult<typeof userSerializer>;
    const pr = userSerializer.transform(user).then((res) => (data = res));
    vi.advanceTimersByTime(1500);
    await pr;

    expect(data!).toEqual({ bla1: 1, bla2: 2, blaString: "hey" });
  });
});

const delay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));
