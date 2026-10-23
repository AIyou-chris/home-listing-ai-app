'use strict';
// The marketing engine's front door. server.cjs needs only `mount`; the rest are here for scripts and tests.
module.exports = {
  mount: require('./routes.cjs').mount,
  business: require('./config/business').business,
  createAutopilot: require('./services/autopilot/engine').createAutopilot,
  createMarketingPoster: require('./services/marketingPoster').createMarketingPoster,
  createMediaService: require('./services/adminMarketingMedia').createMediaService,
  createStudioService: require('./services/adminMarketingStudio').createStudioService,
  explainerVideo: require('./services/explainerVideo'),
  directVideo: require('./services/explainerDirector').directVideo
};
