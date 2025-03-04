const oasTelemetry = require('@oas-tools/oas-telemetry');
const YAML = require('yaml');
const fs = require('fs');
let oasDoc = fs.readFileSync('./api/oas-doc.yaml', 'utf8');
oasDoc = YAML.parse(oasDoc);

const oasTelemetryMiddleware = oasTelemetry({ spec: JSON.stringify(oasDoc) });

const governify = require('governify-commons');
const logger = governify.getLogger().tag('index');

const server = require('./server');

const env = process.env.NODE_ENV ? process.env.NODE_ENV : 'production';

if (env === 'e2e') {
  governify.init().then((commonsMiddleware) => {
    require('./tests/nockController').instantiateMockups(env).then(() => {
      server.deploy(env, [commonsMiddleware]).catch(logger.error);
    }).catch(logger.error);
  });
} else {
  governify.init().then((commonsMiddleware) => {
    server.deploy(env, [commonsMiddleware, oasTelemetryMiddleware]).catch(logger.error);
  });
}

// quit on ctrl-c when running docker in terminal
process.on('SIGINT', function onSigint () {
  logger.info('Got SIGINT (aka ctrl-c in docker). Graceful shutdown ', new Date().toISOString());
  shutdown();
});

// quit properly on docker stop
process.on('SIGTERM', function onSigterm () {
  logger.info('Got SIGTERM (docker container stop). Graceful shutdown ', new Date().toISOString());
  shutdown();
});

const shutdown = () => {
  server.undeploy();
};
