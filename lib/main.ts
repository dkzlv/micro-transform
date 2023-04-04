type MaybePromise<T> = T extends Promise<infer R> ? R : T;
type Compute<T> = { [K in keyof T]: Compute<T[K]> } | never;

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

type Transformer<
  Model,
  Context,
  Config extends ModelFields<Model, Context> = {},
  Custom extends CustomFields<Model, Context> = {}
> = {
  setModelConfig: <T extends ModelFields<Model, Context>>(
    config: T
  ) => Transformer<Model, Context, Config & T, Custom>;
  setCustomConfig: <T extends CustomFields<Model, Context>>(
    custom: T
  ) => Transformer<Model, Context, Config, Custom & T>;

  transform: (
    model: Model,
    ctx: Context
  ) => Promise<
    Compute<ExtractModelResults<Model, Config> & ExtractCustomResults<Custom>>
  >;
};

export type TransformerResult<T extends Transformer<any, any>> = MaybePromise<
  ReturnType<T["transform"]>
>;

export function createTransformer<
  Model,
  Context = void,
  Config extends ModelFields<Model, Context> = {},
  Custom extends CustomFields<Model, Context> = {}
>(): Transformer<Model, Context, Config, Custom> {
  const makeTransformer = (
    modelConfig: ModelFields<Model, Context> = {},
    customConfig: CustomFields<Model, Context> = {}
  ) => {
    const transformer: Transformer<Model, Context, Config, Custom> = {
      setModelConfig(config) {
        const newConf = { ...modelConfig, ...config };
        return makeTransformer(newConf, customConfig) as Transformer<
          Model,
          Context,
          typeof config & Config,
          Custom
        >;
      },
      setCustomConfig(custom) {
        const newConf = {
          ...customConfig,
          ...custom,
        };
        return makeTransformer(modelConfig, newConf) as Transformer<
          Model,
          Context,
          Config,
          typeof custom & Custom
        >;
      },

      async transform(model, ctx) {
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

    return transformer;
  };

  return makeTransformer();
}
