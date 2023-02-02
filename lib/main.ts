type MaybePromise<T> = T extends Promise<infer R> ? R : T;

type TransformerFn<Model, Context> = (model: Model, ctx: Context) => any;

type ModelFields<Model, Context> = {
  [key in keyof Model]?: true | TransformerFn<Model, Context>;
};
type CustomFields<Model, Context> = Record<
  string,
  TransformerFn<Model, Context>
>;

type ExtractModelResults<Model, Config> = {
  [Key in keyof Config]: Model extends { [key in Key]: any }
    ? Config[Key] extends (...args: any[]) => any
      ? MaybePromise<ReturnType<Config[Key]>>
      : Model[Key]
    : never;
};
type ExtractCustomResults<Config> = {
  [Key in keyof Config]: Config[Key] extends (...args: any[]) => any
    ? MaybePromise<ReturnType<Config[Key]>>
    : never;
};

type Serializer<
  Model,
  Context,
  Config extends ModelFields<Model, Context> = {},
  Custom extends CustomFields<Model, Context> = {}
> = {
  setModelConfig: <T extends ModelFields<Model, Context>>(
    config: T
  ) => Serializer<Model, Context, T, Custom>;
  setCustomConfig: <T extends CustomFields<Model, Context>>(
    custom: T
  ) => Serializer<Model, Context, Config, T>;

  serialize: (
    model: Model,
    ctx: Context
  ) => Promise<
    ExtractModelResults<Model, Config> & ExtractCustomResults<Custom>
  >;
};

export type SerializerResult<T extends Serializer<any, any>> = MaybePromise<
  ReturnType<T["serialize"]>
>;

export function createSerializer<
  Model,
  Context = void,
  Config extends ModelFields<Model, Context> = {},
  Custom extends CustomFields<Model, Context> = {}
>(): Serializer<Model, Context, Config, Custom> {
  const makeSerializer = (
    modelConfig: ModelFields<Model, Context> = {},
    customConfig: CustomFields<Model, Context> = {}
  ) => {
    const serializer: Serializer<Model, Context, Config, Custom> = {
      setModelConfig(config) {
        return makeSerializer(config, customConfig) as Serializer<
          Model,
          Context,
          typeof config,
          Custom
        >;
      },
      setCustomConfig(custom) {
        return makeSerializer(modelConfig, custom) as Serializer<
          Model,
          Context,
          Config,
          typeof custom
        >;
      },

      async serialize(model, ctx) {
        const res = {} as Record<string, any>;

        for (const [key, value] of Object.entries(modelConfig)) {
          if (value === true) res[key] = model[key as keyof typeof model];
          else if (typeof value === "function")
            res[key] = await value(model, ctx);
        }

        for (const [key, value] of Object.entries(customConfig)) {
          if (typeof value === "function") res[key] = await value(model, ctx);
        }

        return res as ExtractModelResults<Model, Config> &
          ExtractCustomResults<Custom>;
      },
    };

    return serializer;
  };

  return makeSerializer();
}
