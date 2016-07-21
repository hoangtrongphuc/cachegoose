let generateKey     = require('./generate-key')
  , hasBeenExtended = false
  ;

module.exports = function(mongoose, cache, debug) {
  let aggregate = mongoose.Model.aggregate;

  mongoose.Model.aggregate = function() {
    let res = aggregate.apply(this, arguments);

    if (!hasBeenExtended && res.constructor && res.constructor.name === 'Aggregate') {
      extend(res.constructor);
      hasBeenExtended = true;
    }

    return res;
  };

  function extend(Aggregate) {
    let exec = Aggregate.prototype.exec;

    Aggregate.prototype.exec = function(callback) {
      if (!this.hasOwnProperty('_ttl')) return exec.apply(this, arguments);

      let key
        , ttl     = this._ttl
        , promise = new mongoose.Promise()
        ;

      if (typeof this._prefix == 'string') {
        if (this._prefix.endsWith(':')) {
          key = `${this._prefix}${this.getCacheKey()}`;
        } else {
          key = this._prefix;
        }
      }

      promise.onResolve(callback);

      cache.get(key, (err, cachedResults) => {
        if (cachedResults) {
          if (debug) cachedResults._fromCache = true;
          promise.resolve(null, cachedResults);
        } else {
          exec.call(this).onResolve((err, results) => {
            if (err) return promise.resolve(err);
            cache.set(key, results, ttl, () => {
              promise.resolve(null, results);
            });
          });
        }
      });

      return promise;
    };

    Aggregate.prototype.cache = function(ttl = 60, prefix) {
      if (typeof ttl === 'string') {
        prefix = ttl;
        ttl = 60;
      }

      this._ttl    = ttl;
      this._prefix = prefix;
      return this;
    };

    Aggregate.prototype.getCacheKey = function() {
      return generateKey(this._pipeline);
    };
  }
};
