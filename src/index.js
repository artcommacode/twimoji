// @flow
import Twitter from 'twitter'
import redis from 'redis'

const twitterClient = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
})
const redisClient = redis.createClient(process.env.REDIS_URL || 'redis://localhost:6379')

// http://crocodillon.com/blog/parsing-emoji-unicode-in-javascript
const isEmoji = new RegExp(['\ud83c[\udf00-\udfff]','\ud83d[\udc00-\ude4f]','\ud83d[\ude80-\udeff]'].join('|'), 'g')
const getEmoji = (string) => string.match(isEmoji) || []

// https://github.com/sindresorhus/skin-tone/blob/master/index.js
const skinTones = ['🏻', '🏼', '🏽', '🏾', '🏿'] // yes there's skintones there
const doTone = (emoji, i, emojis) => {
  if (skinTones.includes(emojis[i + 1])) {
    return emoji + emojis[i + 1]
  } else if (skinTones.includes(emoji)) {
    return ''
  } else {
    return emoji
  }
}

const runTweets = () => {
  const stream = twitterClient.stream('statuses/sample')

  stream.on('data', (event) => {
    const emoji = getEmoji(event && event.text)
    const emojiWithTones = emoji && emoji.map(doTone).filter((emoji) => emoji)
    if (emojiWithTones && emojiWithTones.length) console.log(emojiWithTones)
  })

  stream.on('error', (error) => {
    console.log(error)
  })

  stream.on('end', runTweets)
}

runTweets()
