type MaybePromise<T> = T extends Promise<infer R> ? R : T;
type TransformerFn<Model, Context> = (model: Model, ctx: Context) => any;
type ModelFields<Model, Context> = {
    [key in keyof Model]?: true | TransformerFn<Model, Context>;
};
type CustomFields<Model, Context> = Record<string, TransformerFn<Model, Context>>;
type ExtractModelResults<Model, Config> = {
    [Key in keyof Config]: Model extends {
        [key in Key]: any;
    } ? Config[Key] extends (...args: any[]) => any ? MaybePromise<ReturnType<Config[Key]>> : Model[Key] : never;
};
type ExtractCustomResults<Config> = {
    [Key in keyof Config]: Config[Key] extends (...args: any[]) => any ? MaybePromise<ReturnType<Config[Key]>> : never;
};
type Serializer<Model, Context, Config extends ModelFields<Model, Context> = {}, Custom extends CustomFields<Model, Context> = {}> = {
    setModelConfig: <T extends ModelFields<Model, Context>>(config: T) => Serializer<Model, Context, T, Custom>;
    setCustomConfig: <T extends CustomFields<Model, Context>>(custom: T) => Serializer<Model, Context, Config, T>;
    serialize: (model: Model, ctx: Context) => Promise<ExtractModelResults<Model, Config> & ExtractCustomResults<Custom>>;
};
export type SerializerResult<T extends Serializer<any, any>> = MaybePromise<ReturnType<T["serialize"]>>;
export declare function createSerializer<Model, Context = void, Config extends ModelFields<Model, Context> = {}, Custom extends CustomFields<Model, Context> = {}>(): Serializer<Model, Context, Config, Custom>;
export {};
