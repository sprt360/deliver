const express = require('express');
const router = express.Router();
const axios = require('axios');
const request = require('request');
const zlib = require('zlib');
const uuidv4 = require('uuid/v4');
const crypto = require('crypto');
const utf8 = require('utf8');
const gaxios = require('gaxios');
const WebSocket = require('ws');
let httpsProxyAgent = require('https-proxy-agent');
const auth = require('../../middleware/auth');
const Stream = require('../../models/Stream');

const redis = require('redis');
const client = redis.createClient(null, null, { detect_buffers: true });
const redisWStream = require('redis-wstream');
const redisRStream = require('redis-rstream');

client.on('error', function (error) {
  console.error(error);
});

// @route    GET api/premium/schedule/:category
// @desc     Get schedule from specific category
// @access   Private
router.get('/sling/schedule/:category', async (req, res) => {
  try {
    if (req.params.category === 'Pay Per View') {
      const { data } = await axios.get(
        'https://cbd46b77.cdn.cms.movetv.com/cms/publish3/folder/guide/v3/1861.json'
      );
      res.json(data.assets);
    } else {
      const { data } = await axios.get(
        `https://p-mgcs.movetv.com/rubens-online/rest/v1/dma/528/offset/-0500/domain/1/product/sling/platform/browser/context/Sports/ribbons/${req.params.category}?legacy_sub_pack_ids=216+298+334+564+169+217+231+150+161&page=0&page_size=large`
      );
      res.json(data.tiles);
    }
  } catch (err) {
    console.log(err.response.data);
  }
});

// @route    GET api/premium/sling/channel/:channel.mpd
// @desc     Get MPEG Dash from specific channel
// @access   Private
router.get('/sling/channel/:channel.mpd', async (req, res) => {
  const { channel } = req.params;

  const getPlaybackInfoUrl = async () => {
    try {
      const { data } = await axios.get(
        `https://cbd46b77.cdn.cms.movetv.com/cms/publish3/channel/current_asset/${channel}.json`
      );
      const playbackInfoUrl = data.schedules[0].playback_info;
      return playbackInfoUrl;
    } catch (err) {
      console.log(err);
    }
  };

  const createDash = async () => {
    try {
      const playbackInfoUrl = await getPlaybackInfoUrl();
      const { data } = await axios.get(playbackInfoUrl);
      const dashUrl = data.playback_info.dash_manifest_url.replace(
        /-[a-z]-/g,
        '-a-'
      );

      const playlist = await axios.get(dashUrl, {
        headers: {
          'X-Forwarded-For': '69.64.52.22',
        },
      });
      res.setHeader('Content-Type', 'application/dash+xml');
      const dash = playlist.data
        .replace(/http:/g, 'https:')
        .replace(/-[a-z]-/g, '-a-')
        .replace(/https:\/\/.*.movetv.com/g, 'https://sling.dubsports.to');
      res.send(Buffer.from(dash));
    } catch (err) {
      console.log('err 2');
    }
  };

  createDash();
});

// @route    GET api/premium/sling/channels
// @desc     Get all Sling channels or sort by category
// @access   Private
router.get('/sling/channels/:category?', async (req, res) => {
  try {
    const { data } = await axios.get(
      'http://cbd46b77.cdn.cms.movetv.com/cms/api/channels'
    );
    const { channels } = data;
    const { category } = req.params;

    if (category) {
      const filteredChannels = await channels.filter(
        (channel) => channel.genre && channel.genre.includes(category)
      );
      res.json(filteredChannels);
    } else {
      res.json(channels.filter((channel) => channel.visible));
    }
  } catch (err) {
    console.log(err.response.data);
  }
});

router.post('/sling/key', express.text(), async (req, res) => {
  const { message } = JSON.parse(req.body);
  const msgString = message.toString();

  client.exists('slingCert', async function (err, exists) {
    if (exists && msgString.length < 20) {
      console.log('loaded from redis');
      return redisRStream(client, 'slingCert').pipe(res);
    } else {
      const postData = {
        env: 'production',
        user_id: '6035b948-863e-11e8-b6c4-12fbc3de3046',
        channel_id: '6f6788bea06243da873b8b3450b4aaa0',
        message: message,
      };
      try {
        const readableA = await gaxios.request({
          url: 'https://p-drmwv.movetv.com/widevine/proxy',
          method: 'POST',
          data: postData,
          responseType: 'stream',
        });
        if (msgString.length < 20) {
          readableA.data.pipe(redisWStream(client, 'slingCert'));
        }
        readableA.data.pipe(res);
      } catch (err) {
        console.log(err);
      }
    }
  });

  // readableA.data.pipe(client.writeThrough('slingCert'));
  // client.get('slingTest', (err, reply) => {
  //   console.log(reply);
  // });
  // client.readStream('slingCert').setEncoding('utf8').pipe(res);
});

// @route    GET api/premium/espn/schedule/:id
// @desc     Get schedule from specific category
// @access   Private
router.get('/espn_schedule/:id', async (req, res) => {
  try {
    const { data } = await axios.get(
      `https://watch.product.api.espn.com/api/product/v3/watchespn/web/bucket?authStates=mvpd_previous,mvpd_login&authNetworks=espn1,espn2,espnu,espnews,espndeportes,sec,longhorn,buzzerbeater,goalline,espn3,espnclassic&entitlements=ESPN_PLUS&bucketId=${req.params.id}&countryCode=US&deviceType=desktop&zipcode=20170&ignores=displayLimit&lang=en&tz=UTC+0200&features=openAuthz`
    );
    res.json(data.page.buckets[0].contents);
  } catch (err) {
    console.log(err);
  }
});

// @route    GET api/premium/espn/:id
// @desc     Get ESPN Stream url
// @access   Private
router.get('/espn/:id', async (req, res) => {
  const getVideoDataUrl = async () => {
    const { data } = await axios.get(
      `https://watch.product.api.espn.com/api/product/v3/watchespn/web/playback/event?id=${req.params.id}&tz=UTC+0200&lang=en&countryCode=US&entitlements=ESPN_PLUS&features=openAuthz`
    );
    const videoDataUrl = data.playbackState.videoHref.replace(
      `{scenario}`,
      'browser~ssai'
    );
    return videoDataUrl;
  };

  const getStreamUrl = async () => {
    const videoDataUrl = await getVideoDataUrl();
    try {
      const { data } = await axios.get(videoDataUrl, {
        headers: {
          Authorization:
            'eyJraWQiOiI1ODJjNjk1NC0zNDgzLTRhNTktOGQzOC04ZGU3MzUxOTJlMTEiLCJhbGciOiJFZERTQSJ9.eyJzdWIiOiJhYjVjYmE2YS0yYjhjLTQ4NjItYjk2Ny1lN2ZiZDQ4NDEwNjgiLCJuYmYiOjE1ODE3OTY3MzEsInBhcnRuZXJOYW1lIjoiZXNwbiIsImlzcyI6InVybjpiYW10ZWNoOnNlcnZpY2U6dG9rZW4iLCJjb250ZXh0Ijp7ImFjdGl2ZV9wcm9maWxlX2lkIjoiYWEyZGJkYjQtYWNmZC00YTg4LThhMDgtNTQxMzZjNGE3NzVhIiwidXBkYXRlZF9vbiI6IjIwMjAtMDItMTVUMTk6NTg6NTEuODc5KzAwMDAiLCJzdWJzY3JpcHRpb25zIjpbeyJlbnRpdGxlbWVudHMiOlsiRVNQTl9QTFVTIiwiRElTTkVZX1BMVVMiLCJESVNORVlfSFVMVV9BRFMiXSwicmVuZXdzX29uIjoiMjAyMC0wMy0xM1QwMjo0NDoyMS4wMDBaIiwiY2Fub25pY2FsU291cmNlIjp7InJlZiI6InVybjpkc3M6ZGlzbmV5Om9yZGVyczo2YTFkNGZlMC00OWEzLTQ0OGMtYmYwNS0wZDhkM2RhZDQzZTlfMTk5OTE5OTk5OTk5OTkxNzA1MTk5OTAwMF9kaXNuZXkiLCJwcm92aWRlciI6IkJBTVRFQ0giLCJzdWJUeXBlIjoiUkVDVVJSSU5HIiwidHlwZSI6IkQyQyJ9LCJleHBpcmVzX29uIjoiMjAyMC0wMy0xNVQwMjo0NDoxNS44MDJaIiwiaWQiOiJ1cm46YmFtdGVjaG1lZGlhOnN1YnNjcmlwdGlvbi1hcGk6c3Vic2NyaXB0aW9uOkQyQzpCQU1URUNIOnVybjpkc3M6ZGlzbmV5Om9yZGVyczo2YTFkNGZlMC00OWEzLTQ0OGMtYmYwNS0wZDhkM2RhZDQzZTlfMTk5OTE5OTk5OTk5OTkxNzA1MTk5OTAwMF9kaXNuZXkifV0sImxvZ2luX2NvbnRleHQiOnsiaWRwIjoiaHR0cHM6XC9cL2F1dGhvcml6YXRpb24uZ28uY29tIiwiYWlkIjoiezYxMDQ3QzY1LTBGRjItNDM2MS04NDdDLTY1MEZGMjYzNjFCMn0ifSwiZXhwaXJlc19vbiI6IjIwMjAtMDItMTVUMjM6NTg6NTEuODc5KzAwMDAiLCJleHBlcmltZW50cyI6e30sInByb2ZpbGVzIjpbeyJraWRzX21vZGVfZW5hYmxlZCI6ZmFsc2UsImFjdGl2ZSI6dHJ1ZSwiaWQiOiJhYTJkYmRiNC1hY2ZkLTRhODgtOGEwOC01NDEzNmM0YTc3NWEiLCJ0eXBlIjoidXJuOmJhbXRlY2g6cHJvZmlsZSJ9XSwiaXBfYWRkcmVzcyI6IjE1NC4xMy41NS42NSIsInR5cGUiOiJSRUdJU1RFUkVEIiwidmVyc2lvbiI6IlYyLjAuMCIsImJsYWNrb3V0cyI6eyJlbnRpdGxlbWVudHMiOltdLCJkYXRhIjp7fSwicnVsZXMiOnsidmlvbGF0ZWQiOltdfX0sInBhcnRuZXIiOnsibmFtZSI6ImVzcG4ifSwibG9jYXRpb24iOnsiY291bnRyeV9jb2RlIjoiVVMiLCJjaXR5X25hbWUiOiJuZXcgeW9yayIsInN0YXRlX25hbWUiOiJuZXcgeW9yayIsImRtYSI6NTAxLCJyZWdpb25fbmFtZSI6Im5vcnRoZWFzdCIsInR5cGUiOiJaSVBfQ09ERSIsImFzbiI6MTc0LCJ6aXBfY29kZSI6IjEwMDIwIn0sImdlbmVyYXRlZF9vbiI6IjIwMjAtMDItMTVUMTk6NTg6NTEuODc5KzAwMDAiLCJpZCI6Ijk2OWMyZjcwLTUwMmQtMTFlYS04MmJhLTAyNDJhYzExMDAwNiIsIm1lZGlhX3Blcm1pc3Npb25zIjp7ImVudGl0bGVtZW50cyI6WyJFU1BOX1BMVVMiLCJESVNORVlfUExVUyIsIkRJU05FWV9IVUxVX0FEUyJdLCJkYXRhIjp7fSwicnVsZXMiOnsicGFzc2VkIjpbXX19LCJkZXZpY2UiOnsiYXBwX3J1bnRpbWUiOiJjaHJvbWUiLCJwcm9maWxlIjoid2luZG93cyIsImlkIjoiYzc2MTYxNjgtMDgwMi00OGZiLTgxOWItMGU5NmQ5ZDkwMTUxIiwidHlwZSI6InVybjpkc3M6ZGV2aWNlOmludGVybmFsIiwiZmFtaWx5IjoiYnJvd3NlciIsInBsYXRmb3JtIjoiYnJvd3NlciJ9LCJhY2NvdW50Ijp7ImRhdGEiOnt9LCJpZCI6ImFiNWNiYTZhLTJiOGMtNDg2Mi1iOTY3LWU3ZmJkNDg0MTA2OCIsInR5cGUiOiJ1cm46YmFtdGVjaDphY2NvdW50In0sInN1cHBvcnRlZCI6dHJ1ZX0sImVudiI6InByb2QiLCJleHAiOjE1ODE4MTExMzEsImlhdCI6MTU4MTc5NjczMSwianRpIjoiZWE1NjNiYjEtZTY2Yy00MmYyLWEyNGMtN2QxMWI3N2M0NTUxIn0.As7J5LdsAsYUwY8ichIkZSrrF0wqV_wN1HxAunIPSD-0MyHr0Y4kCTXACNfT0peH0vt_pcKzedZbtp1S1DeHCw',
          Accept: 'application/vnd.media-service+json; version=2',
        },
      });
      res.json(data.stream.complete);
    } catch (err) {
      console.log(err);
    }
  };

  getStreamUrl();
});

router.get('/espn_key/:url', async (req, res) => {
  const { url } = req.params;
  const decoded = Buffer.from(url, 'base64').toString();

  console.log(decoded);

  const headers = {
    'Accept-Encoding': 'gzip, deflate, br',
    Cookie:
      '_mediaAuth=PHBrYW4+CiAgPGlzc3VlZEF0PjIwMjAtMDItMTUgMjM6MDQ6NTQuMjQ5IFVUQzwvaXNzdWVkQXQ+CiAgPHR0bE1zPjYwODAwMDwvdHRsTXM+CiAgPGNoYW5uZWw+ZXNwbjM8L2NoYW5uZWw+CiAgPGFpcmluZ0lkPmExMTI0NTQzNTM8L2FpcmluZ0lkPgogIDxTaWduYXR1cmU+cGtDQTd2SkJ6cXNQR3FENjJud1gvUFJRTGE3K24zbXc1REo0dHgwb0VnVXBFT0JPVHRvZDlOc0syQXNWMkhsZi9WbUpvMXcwalhTMTJibUErYzJvZ0E9PTwvU2lnbmF0dXJlPgogIDxhbGlhcz41YzA3ZDAwODJkYjNkNDJmMTRlNTdhZTBhZjAwMzcxODU0YzE3YmQwPC9hbGlhcz4KICA8c2lnbmF0dXJlVHlwZT5KQ0U8L3NpZ25hdHVyZVR5cGU+CiAgPGlzU2lnbmVkPmZhbHNlPC9pc1NpZ25lZD4KPC9wa2FuPg==',
  };

  const { data } = await axios.get(decoded, {
    headers: {
      'Accept-Encoding': 'gzip',
      Cookie:
        '_mediaAuth=PHBrYW4+CiAgPGlzc3VlZEF0PjIwMjAtMDItMTUgMjM6MDQ6NTQuMjQ5IFVUQzwvaXNzdWVkQXQ+CiAgPHR0bE1zPjYwODAwMDwvdHRsTXM+CiAgPGNoYW5uZWw+ZXNwbjM8L2NoYW5uZWw+CiAgPGFpcmluZ0lkPmExMTI0NTQzNTM8L2FpcmluZ0lkPgogIDxTaWduYXR1cmU+cGtDQTd2SkJ6cXNQR3FENjJud1gvUFJRTGE3K24zbXc1REo0dHgwb0VnVXBFT0JPVHRvZDlOc0syQXNWMkhsZi9WbUpvMXcwalhTMTJibUErYzJvZ0E9PTwvU2lnbmF0dXJlPgogIDxhbGlhcz41YzA3ZDAwODJkYjNkNDJmMTRlNTdhZTBhZjAwMzcxODU0YzE3YmQwPC9hbGlhcz4KICA8c2lnbmF0dXJlVHlwZT5KQ0U8L3NpZ25hdHVyZVR5cGU+CiAgPGlzU2lnbmVkPmZhbHNlPC9pc1NpZ25lZD4KPC9wa2FuPg==',
      Origin: 'https://www.espn.com',
      Referer: 'https://www.espn.com/',
    },
  });
  res.setHeader('Content-Type', 'text/html');
  res.send(data);

  // request({ url: decoded, headers: headers })
  //   .pipe(zlib.createGunzip()) // unzip
  //   .pipe(res);
});

router.get('/watchespn/schedule', async (req, res) => {
  try {
    const { data } = await axios.get(
      'https://watch.product.api.espn.com/api/product/v1/android/tv/home'
    );
    res.json(
      data.page.buckets[0].contents.filter(
        (feed) =>
          feed.sourceId !== 'SECPLUS' &&
          feed.sourceId !== 'ACCEXTRA' &&
          feed.sourceId !== 'ESPNDEPORTES' &&
          feed.sourceId !== 'LONGHORN'
      )
    );
  } catch (err) {
    console.log(err);
  }
});

router.post('/watchespn/play', async (req, res) => {
  const { resource, startSessionUrl } = req.body;

  const generateMessage = async (path) => {
    const nonce = uuidv4().toString();
    const today = Date.now().toString();
    const key = 'gB8HYdEPyezeYbR1';
    let message = `GET requestor_id=ESPN, nonce=${nonce}, signature_method=HMAC-SHA1, request_time=${today}, request_uri=${path}`;
    let signature = crypto
      .createHmac('sha1', key)
      .update(utf8.encode(message))
      .digest();
    let buff = Buffer.from(signature);
    signature = utf8.decode(buff.toString('base64'));
    message =
      message +
      `, public_key=yKpsHYd8TOITdTMJHmkJOVmgbb2DykNK, signature=${signature}`;
    return message;
  };

  const reAuthenticate = async () => {
    console.log('authenticating');
    try {
      const { data } = await axios.get(
        `https://api.auth.adobe.com/api/v1/tokens/authn?requestor=ESPN&deviceId=a8098c1a-f86e-11da-bd1a-00112444be1e`,
        {
          headers: {
            Authorization: await generateMessage('/tokens/authn'),
          },
        }
      );
      console.log(data);
    } catch (err) {
      // console.log(err.response.data);
      console.log('error during authenticating');
    }
  };

  const authorize = async (resource, startSessionUrl) => {
    console.log('authorizing', resource);
    try {
      const { data } = await axios.get(
        `https://api.auth.adobe.com/api/v1/authorize?resource=${encodeURIComponent(
          resource
        )}&requestor=ESPN&deviceId=a8098c1a-f86e-11da-bd1a-00112444be1e`,
        {
          headers: {
            Authorization: await generateMessage('/authorize'),
          },
        }
      );
      setTimeout(() => {
        getStreamUrl(data.resource, startSessionUrl);
      }, 2500);
    } catch (err) {
      // console.log(err.response.data);
      console.log(err.response, 'error during authorizing');
    }
  };

  const getMediaToken = async (resource, startSessionUrl) => {
    try {
      console.log('getting media token', resource);
      const { data } = await axios.get(
        `https://api.auth.adobe.com/api/v1/mediatoken?resource=${encodeURIComponent(
          resource
        )}&requestor=ESPN&deviceId=a8098c1a-f86e-11da-bd1a-00112444be1e`,
        {
          headers: {
            Authorization: await generateMessage('/mediatoken'),
          },
        }
      );
      return data.serializedToken;
    } catch (err) {
      if (err.response.data.status === 403) {
        console.log('authorizing error during fetching media token');
        authorize(resource, startSessionUrl);
      } else {
        console.log(err.response, 'other error during fetching media token');
      }
    }
  };

  const getStreamUrl = async (resource, startSessionUrl) => {
    try {
      const mediaToken = await getMediaToken(resource, startSessionUrl);
      // console.log(mediaToken);
      let buff = Buffer.from(resource);
      base64resource = buff.toString('base64');
      const { data } = await axios.get(
        `${startSessionUrl}&partner=watchespn&playbackScenario=HTTP_CLOUD_HIGH&platfrom=chromecast_uplynk&token=${mediaToken}&tokenType=ADOBEPASS&resource=${base64resource}&v=2.0.0`
      );
      res.json(data.session.playbackUrls.default);
    } catch (err) {
      console.log(err.response, 'error during fetching stream url');
    }
  };

  getStreamUrl(decodeURIComponent(resource), startSessionUrl);
});

// @route    GET api/premium/streams
// @desc     Get all custom streams
// @access   Private
router.get('/streams', async (req, res) => {
  try {
    const streams = await Stream.find();
    res.json(streams);
  } catch (err) {
    console.log(err.message);
    res.status(500).send('Server error');
  }
});

// @route    GET api/premium/motogp/play
// @desc     Get live MotoGP URL
// @access   Private
router.get('/motogp/play', async (req, res) => {
  const getStreamUrl = async () => {
    try {
      const agent = new httpsProxyAgent(
        `http://gomoap:E07HY7T3XIQL5UYL2T98GNHM@194.32.144.43:38354`
      );

      const { data, headers } = await axios.get(
        'https://secure.motogp.com/api/video/setup/live/web',
        {
          httpsAgent: agent,
          headers: {
            Cookie: `SESSffe36e69c64626f38fd8c3c5b6d03a4d=5e3dbabcf718337605c73f4c416d5f26`,
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.106 Safari/537.36',
          },
        }
      );
      // if (headers["set-cookie"] && headers["set-cookie"][1]) {
      //   const sessionCookie = headers["set-cookie"][1].split(";")[0];
      //   getStreamUrl(sessionCookie);
      // }
      res.json(data.cdns[0].feeds[0].protocols.hls.url);
    } catch (err) {
      console.log(err);
    }
  };

  getStreamUrl();
});

// @route    GET api/premium/motogp/schedule
// @desc     Get MotoGP Schedule
// @access   Private
router.get('/motogp/schedule', async (req, res) => {
  try {
    const { data } = await axios.get(
      'https://www.motogp.com/en/json/event_bar'
    );
    res.json([data]);
  } catch (err) {
    console.log(err);
  }
});

// @route    GET api/premium/nhl/schedule/:date
// @desc     Get NHL Schedule
// @access   Private
router.get('/nhl/schedule/:date', async (req, res) => {
  try {
    const { data } = await axios.get(
      `https://statsapi.web.nhl.com/api/v1/schedule?startDate=${req.params.date}&endDate=${req.params.date}&sportId=1&hydrate=team(leaders(categories=[points,goals,assists],gameTypes=[R])),linescore,broadcasts(all),tickets,game(content(media(epg),highlights(scoreboard)),seriesSummary),radioBroadcasts,metadata,decisions,scoringplays,seriesSummary(series)`
    );
    res.json(data);
  } catch (err) {
    console.log(err);
  }
});

// @route    GET api/premium/nhl/play/:id
// @desc     Get NHL Stream URL
// @access   Private
router.get('/nhl/play/:id', async (req, res) => {
  try {
    const { data } = await axios.get(
      `https://api.morningstreams.com/api/f1tv/nhl_hls/${req.params.id}`
    );
    res.json(data);
  } catch (err) {
    console.log(err);
  }
});

// @route    GET api/premium/nhl/key/:url
// @desc     Get NHL Key
// @access   Private
router.get('/nhl/key/:url', async (req, res) => {
  try {
    const { url } = req.params;
    const decoded = Buffer.from(url, 'base64').toString();

    var headers = {
      'Accept-Encoding': 'gzip',
      Cookie:
        'Authorization=eyJhbGciOiJIUzI1NiJ9.eyJpcGlkIjoidmlhc2F0OkJENDQ3NkZBQkM2ODVEOUIiLCJjbGllbnRJZCI6ImFjdGl2YXRpb25fbmhsLXYxLjAuMC1wcm9kIiwicGNfbWF4X3JhdGluZ19tb3ZpZSI6IiIsImNvbnRleHQiOnt9LCJ2ZXJpZmljYXRpb25MZXZlbCI6MiwiZXhwIjoxNjQyNjYyODgzLCJ0eXBlIjoiVXNlciIsImlhdCI6MTYxMTEyNjg4MywidXNlcmlkIjoiYWNiODNmMjAtNDdhMS00NzA3LTk0MGMtMDVhMmUzNGQ4ODZjLTcxLTlhYzdhOGYwYWE0NWM2Y2NhYWRiMWE3ZGQwYjUwMThkMjE2NmVhZGYiLCJ2ZXJzaW9uIjoidjEuMCIsInBjX21heF9yYXRpbmdfdHYiOiIifQ.V2aGOAi-zb5Rbi_E0xqgSCtFI-kr-gPewbX_2beUjTI; mediaAuth_v2=6455209108eaa22507b1b305ff7466270d11c4e1da95b073ba26d541692f1795ac30e1a03f8182e500d117790a7603a172cf5d7887b8697213b7f4ae54d6adfc1be5453a3e3cdaac8a654821741885b668af4f4abf2e50d349575a1bbd27e872f2effb81d7ca18a033e54ac6c09d9a2534f81f556c6488ad1c92aecd88800800dca23bff9ca0fe342619567d336deeaa753018ee8692892d9f11ff4a09decb45806ea1e37bd86fdd02abf1462bd82ad84df7dcece846165473c3b19952147f86563689254886255803736547b3e073397920d71f9c43e827fc6c7a3e4cd6e83d01efb3636c50708d09406e5d2f7f8757ae0e1f45812a7684b90c03dc85c2ab3ff1cba531a0a5308a4a8b9e15b55f7208287f41397445d337753df76306e933391a0c1c06aa461b9d5afb14bda77cab0bfebce1f3e168138c5c6ff6329396fa4e1c712ec75c45d678c03392c6aea8af9050d5d63ee18a2b74aaebb34b336707b757b5ed4077c46d8798b9477534ff85994459b229f828b442323f1d1567d04d7ab86c5b40725135a63325275d5183706adf84904e59cbd928b268d4361a8af43f698944ab79c6ed5cb090ded7f8dfd53aa0bf9e9999c7c53d005634cbddc95793d0924b708872d49372b87f58aed9ff415b2e67d62b137a483121505e7cf0d0fe788258119a77a878173119f65c0fe1f3',
    };

    request({ url: decoded, headers: headers })
      .pipe(zlib.createGunzip()) // unzip
      .pipe(res);
  } catch (err) {
    console.log(err);
  }
});

// @route    GET api/premium/mlb/schedule/:date
// @desc     Get mlb Schedule
// @access   Private
router.get('/mlb/schedule/:date', async (req, res) => {
  try {
    const { data } = await axios.get(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${req.params.date}&hydrate=team,linescore,flags,liveLookin,person,stats,probablePitcher,game(content(summary,media(epg)),tickets)&language=en`
    );
    res.json(data);
  } catch (err) {
    console.log(err);
  }
});

// @route    GET api/premium/mlb/play/:id
// @desc     Get mlb Stream URL
// @access   Private
router.get('/mlb/play/:id', async (req, res) => {
  try {
    const { data } = await axios.get(
      `https://api.morningstreams.com/api/f1tv/mlb_hls/${req.params.id}`
    );
    res.json(data);
  } catch (err) {
    console.log(err);
  }
});

module.exports = router;
