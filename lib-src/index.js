let hasRun = false
  , cache
  ;

module.exports = function init(mongoose, cacheOptions, debug) {
  if (mongoose.version < '3.7') throw new Error('Cachegoose is only compatible with mongoose 3.7+');
  if (hasRun) return;
  hasRun = true;

  init._cache = cache = require('./cache')(cacheOptions);

  require('./extend-query')(mongoose, cache, debug);
  require('./extend-aggregate')(mongoose, cache, debug);
};

module.exports.clearCache = function(key, cb = function() { }) {
  if (!key) return cb();
  cache.del(key, cb);
};
