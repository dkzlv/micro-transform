// @ts-nocheck

import { createTransformer } from "./main";

type User = {
  id: string;
  username: string;
  password: string;

  friends: User[];
};
declare const user: User;

const friendSerializer = createTransformer<User>().setModelConfig({
  username: true,
});
const userSerializer = createTransformer<User>().setModelConfig({
  id: true,
  friends: friendSerializer.transform,
});

const serializedUser = await userSerializer.transform(user);
// { id: string, friends: { username: string }[] }

{
  const adminUserSerializer = createTransformer<User>()
    .setModelConfig({
      "*": true,
    })
    .setCustomConfig({ role: (user) => db.fetchRole(user.id) });

  const moderatorUserSerializer = adminUserSerializer.setModelConfig({
    password: false,
  });

  const publicUserSerializer = moderatorUserSerializer.setCustomConfig({
    role: false,
  });
}
