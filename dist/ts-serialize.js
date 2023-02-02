function createSerializer() {
  const makeSerializer = (modelConfig = {}, customConfig = {}) => {
    const serializer = {
      setModelConfig(config) {
        return makeSerializer(config, customConfig);
      },
      setCustomConfig(custom) {
        return makeSerializer(modelConfig, custom);
      },
      async serialize(model, ctx) {
        const res = {};
        for (const [key, value] of Object.entries(modelConfig)) {
          if (value === true)
            res[key] = model[key];
          else if (typeof value === "function")
            res[key] = await value(model, ctx);
        }
        for (const [key, value] of Object.entries(customConfig)) {
          if (typeof value === "function")
            res[key] = await value(model, ctx);
        }
        return res;
      }
    };
    return serializer;
  };
  return makeSerializer();
}
export {
  createSerializer
};
