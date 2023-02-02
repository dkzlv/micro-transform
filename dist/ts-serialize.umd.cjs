(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global["ts-serialize"] = {}));
})(this, function(exports2) {
  "use strict";
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
  exports2.createSerializer = createSerializer;
  Object.defineProperties(exports2, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
});
