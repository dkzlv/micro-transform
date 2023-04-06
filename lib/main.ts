type MaybePromise<T> = T extends Promise<infer R> ? R : T;
type Compute<T> = { [K in keyof T]: Compute<T[K]> } | never;
type ExcludeByValue<Obj, Condition> = FromEntries<
  Exclude<Entries<Obj>, [any, Condition]>
>;
type Entries<Obj> = {
  [K in keyof Obj]: [K, Obj[K]];
}[keyof Obj];
type FromEntries<Entries extends [any, any]> = {
  [Entry in Entries as Entry[0]]: Entry[1];
};
const transformerSymbol = Symbol();

type TransformerFn<Model, Context> = (model: Model, ctx: Context) => any;
type Asterisk = "*";
type IncludeAllBase = Record<Asterisk, boolean>;
type IncludeAll = Record<Asterisk, true>;

type ModelFields<Model, Context> =
  | {
      [Key in keyof Model]?:
        | boolean
        | TransformerFn<Model, Context>
        | Transformer<
            Model[Key] extends Array<infer Item> ? Item : Model[Key],
            Context
          >;
    }
  | Partial<IncludeAllBase>;
type CustomFields<Model, Context> = Record<
  string,
  TransformerFn<Model, Context> | false
>;
type ExtractNestedTransformerValue<
  ModelValue,
  PassedTransformer extends Transformer<any, any>
> = ModelValue extends Array<unknown>
  ? TransformerResult<PassedTransformer>[]
  : TransformerResult<PassedTransformer>;

type ExtractValues<Model, Config> = ExcludeByValue<
  {
    [K in keyof Model]: Config extends Record<K, boolean | unknown>
      ? Config[K] extends false
        ? never
        : Config[K] extends (...args: any[]) => any
        ? MaybePromise<ReturnType<Config[K]>>
        : Config[K] extends Transformer<any, any>
        ? ExtractNestedTransformerValue<Model[K], Config[K]>
        : Model[K]
      : Model[K];
  },
  never
>;

type ExtractForIncludeAll<Model, Config> = Config extends IncludeAll
  ? ExtractValues<Model, Config>
  : {};

type ExtractTruthyKeys<Config> = Exclude<Entries<Config>, [any, false]>[0];

type ExtractModelResults<Model, Config> = ExtractForIncludeAll<Model, Config> &
  ExtractValues<
    { [K in Extract<keyof Model, ExtractTruthyKeys<Config>>]: Model[K] },
    Config
  >;

type ExtractCustomResults<Config> = ExcludeByValue<
  {
    [Key in keyof Config]: Config[Key] extends (...args: any[]) => any
      ? MaybePromise<ReturnType<Config[Key]>>
      : never;
  },
  never
>;

type Transformer<
  Model,
  Context,
  Config extends ModelFields<Model, Context> = {},
  Custom extends CustomFields<Model, Context> = {}
> = {
  [transformerSymbol]: 0;
  setModelConfig: <T extends ModelFields<Model, Context>>(
    config: T
  ) => Transformer<Model, Context, Omit<Config, keyof T> & T, Custom>;
  setCustomConfig: <T extends CustomFields<Model, Context>>(
    custom: T
  ) => Transformer<Model, Context, Config, Omit<Custom, keyof T> & T>;

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
      [transformerSymbol]: 0,
      setModelConfig(config) {
        const newConf = { ...modelConfig, ...config };
        return makeTransformer(newConf, customConfig) as any;
      },
      setCustomConfig(custom) {
        const newConf = {
          ...customConfig,
          ...custom,
        };
        return makeTransformer(modelConfig, newConf) as any;
      },

      async transform(model, ctx) {
        let res = {} as Record<string, any>;
        if (_includeAll in modelConfig && modelConfig[_includeAll]) {
          res = model as Record<string, any>;
        }

        const promises: Promise<unknown>[] = [];
        const executePossiblyAsyncFunction = (
          fn: Function,
          key: string,
          index?: number
        ) => {
          const executed = fn(model, ctx);
          const setValue = (value: unknown) => {
            if (index === void 0) res[key] = value;
            else res[key][index] = value;
          };

          if (executed instanceof Promise) {
            executed.then((value) => {
              setValue(value);
              return value;
            });
            promises.push(executed);
          } else setValue(executed);
        };

        for (const [key, value] of Object.entries(modelConfig)) {
          if (isFunction(value)) executePossiblyAsyncFunction(value, key);
          else if (typeof value === "object" && transformerSymbol in value) {
            let valueToTransform = model[
              key as keyof typeof model
            ] as Model[keyof Model][];
            const isArr = Array.isArray(valueToTransform);
            if (isArr) res[key] = [];
            else valueToTransform = [valueToTransform] as Model[keyof Model][];

            for (let i = 0; i < valueToTransform.length; i++) {
              const singleValue = valueToTransform[i];
              executePossiblyAsyncFunction(
                () => value.transform(singleValue, ctx),
                key,
                isArr ? i : void 0
              );
            }
          } else if (value) res[key] = model[key as keyof typeof model];
          else if (!value) delete res[key];
        }

        for (const [key, value] of Object.entries(customConfig)) {
          if (isFunction(value)) executePossiblyAsyncFunction(value, key);
          else if (!value) delete res[key];
        }

        await Promise.all(promises);

        return res as any;
      },
    };

    return transformer;
  };

  return makeTransformer();
}

const _includeAll = "*";
function isFunction(fn: any): fn is Function {
  return typeof fn === "function";
}
