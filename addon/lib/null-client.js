export default {
  initialize() {},
  identify(_user, _hash, cb) {
    cb();
  },
  allFlags() {
    return {};
  },
  variation(_, defaultValue) {
    if (defaultValue !== undefined) {
      return defaultValue
    }

    return false;
  }
}
