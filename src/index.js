// @flow
import 'babel-regenerator-runtime'
import Twitter from 'twitter'
import Redis from 'redis'
import promisify from 'es6-promisify'
import isEmoji from 'emoji-regex'

const twitter = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
})
const post = promisify(twitter.post, twitter)

const redis = Redis.createClient(process.env.REDIS_URL || 'redis://localhost:6379')
const flushdb = promisify(redis.flushdb, redis)
const zadd = promisify(redis.zadd, redis)
const zscore = promisify(redis.zscore, redis)
const zrevrange = promisify(redis.zrevrange, redis)

const getEmoji = (string) => string && string.match(isEmoji()) || []

// https://github.com/sindresorhus/skin-tone/blob/master/index.js
const skinTones = ['🏻', '🏼', '🏽', '🏾', '🏿'] // yes there's skintones there
const doTone = (emoji, i, emojis) => {
  return skinTones.includes(emojis[i + 1]) ? emoji + emojis[i + 1]
       : skinTones.includes(emoji)         ? ''
       :                                     emoji
}

const save = async (emoji) => {
  const score = +(await zscore(['emoji', emoji])) || 0
  await zadd(['emoji', score + 1, emoji])
}

const getTweets = () => {
  const stream = twitter.stream('statuses/sample')

  stream.on('data', (event) => {
    const emoji = getEmoji(event && event.text)
    emoji.map(doTone).filter((emoji) => emoji).forEach(save)
  })

  stream.on('error', (error) => {
    console.log(error)
    getTweets()
  })

  stream.on('end', getTweets)
}

setInterval(async () => {
  try {
    const scores = await zrevrange(['emoji', 0, 9])
    const res = await post('statuses/update', {status: scores.join(' ')})
    console.log(res)
  } catch (error) {
    console.log(error)
  }
}, (+process.env.SECONDS || 60)*1000)

const run = (async () => {
  await flushdb()
  getTweets()
})()
