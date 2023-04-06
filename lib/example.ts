import { createTransformer } from "./main";

type User = {
  id: string;
  createdAt: number;

  username: string;
  password: string;

  friends: User[];
};
declare const user: User;
declare const formatDate: (ts: number, tz: string) => string;

declare const db: {
  fetchRole: (id: string) => Promise<"admin" | "moderator">;
};

const admin = createTransformer<User>()
  .setModelConfig({
    "*": true,
    friends: false,
  })
  // Add new fields. Promises will be executed in parallel!
  .setCustomConfig({ role: (user) => db.fetchRole(user.id) });
const forAdmin = await admin.transform(user);
/*
 * {
 *   id: string;
 *   createdAt: number;
 *   username: string;
 *   password: string;
 *   role: "admin" | "moderator";
 * }
 */

const moderator = admin.setModelConfig({
  password: false,
});
const forModerator = await moderator.transform(user);
/*
 * {
 *   id: string;
 *   createdAt: number;
 *   username: string;
 *   role: "admin" | "moderator";
 * }
 */

const basePublicUser = createTransformer<
  User,
  { timezone: string }
>().setModelConfig({
  "*": true,
  password: false,
  // pass on additional context that will be used for transformation
  createdAt: (user, ctx) => formatDate(user.createdAt, ctx.timezone),
});
const publicUser = basePublicUser.setModelConfig({
  // use nested transformers for single values or arrays
  friends: basePublicUser,
});

const forPublic = await publicUser.transform(user, {
  timezone: "Europe/Lisbon",
});
/**
 * {
 *  id: string;
 *  username: string;
 *  createdAt: string;
 *  friends: {
 *      id: string;
 *      username: string;
 *      createdAt: string;
 *      friends: ...[];
 *  }[];
 * }
 */
