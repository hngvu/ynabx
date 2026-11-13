window.EmberENV = {
  ...(window.EmberENV || {}),
  ...{
    FEATURES: {},
    EXTEND_PROTOTYPES: {
      Date: false,
      Array: false,
    },
    _APPLICATION_TEMPLATE_WRAPPER: false,
    _DEFAULT_ASYNC_OBSERVERS: true,
    _JQUERY_INTEGRATION: false,
    _TEMPLATE_ONLY_GLIMMER_COMPONENTS: true,
  },
};
var runningTests = false;
