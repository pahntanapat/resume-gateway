'use strict';
const express = require('express');
const pino = require('pino');
const app = express();
app.set('trust proxy', 1) // trust first proxy



var server,
    port = process.env.PORT,
    HTTP = ((process.env.HTTP) && (process.env.HTTP != 0)),
    NODE_ENV = (process.env.NODE_ENV || 'production'),
    PUBLIC_DEMO = (process.env.PUBLIC_DEMO && (process.env.PUBLIC_DEMO != 0)),

    RUN_ON_CLUSTER = (process.env.RUN_ON_CLUSTER && (process.env.RUN_ON_CLUSTER != 0))
    ;

let logger = pino(pino.destination({ sync: false }));
app.use(require('pino-http')());

logger.info({
    port: port,
    NODE_ENV: NODE_ENV,
    productionMode: (NODE_ENV == 'production'),
    HTTP: HTTP,
    RUN_ON_CLUSTER: RUN_ON_CLUSTER,
    CORS_OPTION_JSON: process.env.CORS_OPTION_JSON
}, 'Start Node.JS');

if (HTTP) {
    server = require('http').createServer(app);
    port = port || 80;
} else {
    const fs = require('fs');
    const https_options = {
        key: fs.readFileSync(fs.existsSync('cerbot/privkey.pem') ? 'cerbot/privkey.pem' : "key.pem"),
        cert: fs.readFileSync(fs.existsSync('cerbot/cert.pem') ? 'cerbot/cert.pem' : "cert.pem")
    };

    server = require('https').createServer(https_options, app);
    port = port || 443;
}

let sioOption = {};
if (process.env.CORS_OPTION_JSON) {
    try {
        sioOption.cors = JSON.parse(process.env.CORS_OPTION_JSON)
    } catch (e) {
        logger.error({ module: 'app.js' }, e);
    }
} else if (process.env.CORS_ORIGIN) {
    if (!sioOption.cors) {
        sioOption.cors = {
            origin: process.env.CORS_ORIGIN,
            methods: ["GET", "POST"]
        }
    }
}

const io = new (require("socket.io").Server)(server, sioOption);
if (RUN_ON_CLUSTER) {
    let redisOption = {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379
    };
    if (process.env.REDIS_PASSWORD) {
        redisOption.password = process.env.REDIS_PASSWORD;
        redisOption.auth_pass = process.env.REDIS_PASSWORD;
    }
    if (process.env.REDIS_USER) {
        redisOption.user = process.env.REDIS_USER;
    }
    if (process.env.REDIS_TLS && (process.env.REDIS_TLS != '0')) {
        redisOption.tls = { checkServerIdentity: () => undefined };
    }

    const pubClient = require('redis').createClient(redisOption);
    pubClient.on('error', function (err) {
        logger.error(err, 'Could not establish a connection with Redis for Socket.IO session.');
        throw err;
    });
    pubClient.on('connect', function () {
        logger.info('Connected to redis successfully');
    });
    const subClient = pubClient.duplicate();

    // sio.adapter(require("@socket.io/cluster-adapter").createAdapter());
    io.adapter(require('@socket.io/redis-adapter').createAdapter(pubClient, subClient));

    require("@socket.io/sticky").setupWorker(io);
}




/* Routing */
app.get('/favicon.ico', (req, res) => res.sendFile('public/favicon.ico', { root: __dirname }))
app.use('/css', express.static('public/css'));
app.use('/js', express.static('public/js'));
app.use('/components', express.static('public/components'));


var loginRoute = express.Router()

const { SIOOnConnection, StaticJSDir } = require('resume-client-socket.io');
loginRoute.use('/resume', express.static(StaticJSDir()));

let optionSIO;

if (PUBLIC_DEMO) {
    logger.info('Use Public demo: ' + PUBLIC_DEMO);
    var { router, appUseSession, ioUseSession, sessionMiddleware, sioStartCountDown, sioStopCountDown, sioCheckTime } = require('./login');
    app.use(appUseSession);
    io.use(ioUseSession);
    app.use(router);
    loginRoute.use(sessionMiddleware);

    optionSIO = new (require('resume-client-socket.io').OptionSIO)();
    optionSIO.onConnectionCallback = sioCheckTime;
    optionSIO.onNewTranscriptSessionSyncCheck = function (ParamSessionID) { return sioStartCountDown(ParamSessionID.socket); };
    optionSIO.onEndTranscriptSessionCallback = optionSIO.onDisconnectCallback = sioStopCountDown;
}
loginRoute.use(express.static('public'));

app.use(loginRoute);

/* Socket.io handling */
io.on('connection', SIOOnConnection(optionSIO));



// CLI stuffs


// Fail-proof server uncaught exception

process.on('uncaughtException', (error) => {
    logger.error(error, 'Node panic => ' + error.stack);
    logger.info('Attempting to restart...');
    process.exit(0);
});
process.on('SIGINT', () => {
    logger.info('SIGINT: exiting…');
    process.exit();
});

process.on('exit', () => {
    logger.info('exiting…');
    process.exit();
});


/////////////////////////////////////


server.listen(port, () => {
    logger.info(`Server listening ${port}`);
});