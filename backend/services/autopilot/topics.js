'use strict';
// The topics, launch plan and links come from config/business.json. Edit them there.
const { business, absolute } = require('../../config/business');

const SITE = business.siteUrl;
const LO = absolute(business, business.links.audience);
const withLink = (x) => ({ ...x, link: absolute(business, x.link) });

const TOPICS = business.topics.map(withLink);
const LAUNCH = business.launch.map((x) => ({ ...withLink(x), idea: x.idea.replace('{{RULES}}', business.rules) }));
const FORMATS = ['value', 'feature', 'article'];
const GOALS = business.goals;

module.exports = { LAUNCH, TOPICS, FORMATS, GOALS, SITE, LO };
