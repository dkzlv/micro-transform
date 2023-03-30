import { createTransformer } from "./main";

type User = {
  id: string;
  username: string;

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
