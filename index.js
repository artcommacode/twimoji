'use strict';

require('babel-regenerator-runtime');

var _twitter = require('twitter');

var _twitter2 = _interopRequireDefault(_twitter);

var _redis = require('redis');

var _redis2 = _interopRequireDefault(_redis);

var _es6Promisify = require('es6-promisify');

var _es6Promisify2 = _interopRequireDefault(_es6Promisify);

var _emojiRegex = require('emoji-regex');

var _emojiRegex2 = _interopRequireDefault(_emojiRegex);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var logger = function logger(fn) {
  return function (foo) {
    console.log(foo);
    fn();
  };
};

var twitter = new _twitter2.default({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});
var post = (0, _es6Promisify2.default)(twitter.post, twitter);

var redis = _redis2.default.createClient(process.env.REDIS_URL || 'redis://localhost:6379');
var flushdb = (0, _es6Promisify2.default)(redis.flushdb, redis);
var zadd = (0, _es6Promisify2.default)(redis.zadd, redis);
var zscore = (0, _es6Promisify2.default)(redis.zscore, redis);
var zrevrange = (0, _es6Promisify2.default)(redis.zrevrange, redis);

var getEmoji = function getEmoji(string) {
  return string && string.match((0, _emojiRegex2.default)()) || [];
};
var skinTones = ['🏻', '🏼', '🏽', '🏾', '🏿'];
var doTone = function doTone(emoji, i, emojis) {
  return skinTones.includes(emojis[i + 1]) ? emoji + emojis[i + 1] : skinTones.includes(emoji) ? '' : emoji;
};

var save = function () {
  var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(emoji) {
    var score;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return zscore(['emoji', emoji]);

          case 2:
            _context.t0 = +_context.sent;

            if (_context.t0) {
              _context.next = 5;
              break;
            }

            _context.t0 = 0;

          case 5:
            score = _context.t0;
            _context.next = 8;
            return zadd(['emoji', score + 1, emoji]);

          case 8:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, undefined);
  }));

  return function save(_x) {
    return _ref.apply(this, arguments);
  };
}();

var getTweets = function getTweets() {
  var stream = twitter.stream('statuses/sample');
  stream.on('data', function (event) {
    var emoji = getEmoji(event && event.text);
    emoji.map(doTone).filter(function (emoji) {
      return emoji;
    }).forEach(save);
  });
  stream.on('error', logger(getTweets));
  stream.on('end', getTweets);
};

setInterval(_asyncToGenerator(regeneratorRuntime.mark(function _callee2() {
  var scores, tweet;
  return regeneratorRuntime.wrap(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.prev = 0;
          _context2.next = 3;
          return zrevrange(['emoji', 0, 9]);

        case 3:
          scores = _context2.sent;
          _context2.next = 6;
          return post('statuses/update', { status: scores.join(' ') });

        case 6:
          tweet = _context2.sent;
          _context2.next = 9;
          return flushdb();

        case 9:
          console.log(tweet && tweet.text);
          _context2.next = 15;
          break;

        case 12:
          _context2.prev = 12;
          _context2.t0 = _context2['catch'](0);

          console.log(_context2.t0);

        case 15:
        case 'end':
          return _context2.stop();
      }
    }
  }, _callee2, undefined, [[0, 12]]);
})), (+process.env.SECONDS || 60) * 1000);

var run = _asyncToGenerator(regeneratorRuntime.mark(function _callee3() {
  return regeneratorRuntime.wrap(function _callee3$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _context3.next = 2;
          return flushdb();

        case 2:
          getTweets();

        case 3:
        case 'end':
          return _context3.stop();
      }
    }
  }, _callee3, undefined);
}))();
