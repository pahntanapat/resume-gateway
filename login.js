'use strict';
const EMAIL_REGEX = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const PHONE_REGEX = /^[+]?[0-9]+.*/;

var HTTP = ((process.env.HTTP) && (process.env.HTTP != 0)),
    NODE_ENV = (process.env.NODE_ENV || 'production'),

    REDIS_HOST = process.env.REDIS_HOST || 'localhost',
    REDIS_PW = process.env.REDIS_PASSWORD || null,
    REDIS_PORT = process.env.REDIS_PORT || 6379,

    MARIADB_HOST = process.env.MARIADB_HOST || 'localhost',
    MARIADB_USER = process.env.MARIADB_USER || 'root',
    MARIADB_PW = process.env.MARIADB_PW || 'secret',
    MARIA_DB = process.env.MARIA_DB || 'demo',

    SESSION_SECRET = process.env.NODE_SESSION_SECRET || 'Session_Secret',

    LIMIT_S = 3600,
    RENEW_S = 24 * 3600;
;

const SOCKET_LIMIT_T = 'limit_s', SOCKET_MSG = 'limit_msg', SOCKET_REDIRECT = 'redirect';

const express = require('express');
const router = express.Router();
const session = require('express-session');
const RegDB = require('./regdb');
const pino = require('pino');

let logger = pino(pino.destination({ sync: false }));

/// Connect ot Mariadb
/* const con = require('mysql').createPool({
    host: MARIADB_HOST,
    user: MARIADB_USER,
    password: MARIADB_PW,
    database: MARIA_DB,
    supportBigNumbers: true,
    connectionLimit: 100
}); */
/*con.connect(function (err) {
    if (err) { console.error(err); throw err; }
    logger.info("Maria DB Connected!");
});*/



const regDB = new RegDB(
    require('mysql').createPool,
    {
        host: MARIADB_HOST,
        user: MARIADB_USER,
        password: MARIADB_PW,
        database: MARIA_DB,
        supportBigNumbers: true,
        connectionLimit: 100
    },
    RENEW_S);

/// Connect to Redis
const redisClient = require('redis').createClient({
    ...{
        host: REDIS_HOST,
        port: REDIS_PORT
    },
    ...(REDIS_PW ? { password: REDIS_PW } : {})
});
redisClient.on('error', function (err) {
    console.error('Could not establish a connection with Redis for login session ' + err);
    throw err;
});
redisClient.on('connect', function () {
    logger.info('Connected to redis successfully');
});
const RedisStore = require('connect-redis')(session);




var sess = {
    store: new RedisStore({ client: redisClient }),
    secret: SESSION_SECRET,
    cookie: {
        maxAge: 48 * 3600 * 1000 //1000 * 60 * 10 // session max age in miliseconds
    },
    resave: true
};
if (NODE_ENV == 'production') {
    if (HTTP)
        logger.warn('Warning! production mode should run on HTTPS, otherwise, via HTTPS load balancer.', { NODE_ENV: NODE_ENV })

    sess.cookie.secure = true // serve secure cookies
}

sess = session(sess);
var ioSession = require("express-socket.io-session")(sess, {
    autoSave: true
});

router.use(sess);
router.use(express.json());       // to support JSON-encoded bodies
router.use(express.urlencoded({ extended: true })); // to support URL-encoded bodies


function checkSession(sess) {
    return sess && sess.email && sess.phone && sess.user_id
}


router.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return logger.error(err);
        }
        res.redirect("/login");
    });
});

router.get('/login(|.htm|.html)', function (req, res) {
    if (checkSession(req.session))
        res.redirect('/');
    else
        res.sendFile('public/login.html', { root: __dirname });
});

function login(result, req, res) {
    if (result) {
        if (result.status & RegDB.STATUS_ACTIVATED) {
            req.session.email = req.body.email;
            req.session.phone = req.body.phone;
            req.session.user_id = result.user_id;
            req.session.time = result.time || 0;
            req.session.limit = !(result.status & RegDB.STATUS_UNLIMITED);
            req.session.ip = req.header('x-forwarded-for') || req.socket.remoteAddress;
            req.session.save();

            res.json({ 'login': true, 'msg': 'Email and Phone number are in system. Continue log in process...' });
        } else {
            res.json({ 'login': false, 'msg': 'Email and Phone number are suspended. Please contact admin.' });
        }
        return true;
    }
    return false;
}

router.post('/login(|.htm|.html)', function (req, res) {
    if (checkSession(req.session)) {
        res.json({ 'login': true, 'msg': 'You are already log in. Please log out before log in to new user.' });
        return;
    }
    regDB.getData(req.body.email, req.body.phone).then(result => {
        if (!login(result, req, res)) {
            res.json({ 'login': false, 'msg': 'Email or Phone number is/are not found. Please register.', 'reg': true });
        }
    }).catch(e => {
        res.json({ 'login': false, 'msg': 'Demo page is temporary unavailable. Please try again.' });
        console.error(e);
    });
});

router.post('/register', async (req, res) => {
    //const { organization, postition, email, phone } = req.body
    try {
        if (checkSession(req.session)) {
            res.json({ 'login': true, 'msg': 'You are already log in. Please log out before regist new user.' });
            return;
        }
        let result = await regDB.getData(req.body.email, req.body.phone);
        if (login(result, req, res))
            return;

        let name = req.body.name;
        if (name) {
            name = String(name).trim()
            if (!name || name.length <= 0) {
                res.json({ 'login': false, 'reg': true, 'msg': 'Name must not be blank.' });
                return;
            }
        } else {
            res.json({ 'login': false, 'reg': true, 'msg': 'Please fill in name!' });
            return;
        }

        let email = req.body.email;
        if (email) {
            email = String(email).trim().toLowerCase();
            if (!EMAIL_REGEX.test(email)) {
                res.json({ 'login': false, 'reg': true, 'msg': 'Email format is invalid!' });
                return;
            }
        } else {
            res.json({ 'login': false, 'reg': true, 'msg': 'Please fill in email!' });
            return;
        }

        let phone = req.body.phone;
        if (phone) {
            phone = String(phone).trim();
            if (!PHONE_REGEX.test(phone)) {
                res.json({ 'login': false, 'reg': true, 'msg': 'Phone format is invalid!' });
                return;
            }
        } else {
            res.json({ 'login': false, 'reg': true, 'msg': 'Please fill Phone number!' });
            return;
        }

        let status = req.body.status;
        if (!status) {
            status = (req.body.subscription ? RegDB.STATUS_SUBSCRIPTION : 0) | RegDB.STATUS_ACTIVATED;
        }
        try {
            status = parseInt(status);
        } catch (e) {
            status = null;
        }
        result = await regDB.register(
            name,
            req.body.organization ? String(req.body.organization).trim() : null,
            req.body.postition ? String(req.body.postition).trim() : null,
            email,
            phone,
            status
        );
        if (result) {
            req.session.email = req.body.email;
            req.session.phone = req.body.phone;
            req.session.user_id = result.insertId;
            req.session.time = result.time || 0;
            req.session.limit = !(result.status & RegDB.STATUS_UNLIMITED);
            req.session.ip = req.header('x-forwarded-for') || req.socket.remoteAddress;
            req.session.save();


            res.json({ 'login': true, 'msg': 'Registration complete' });
            return;
        }
    } catch (e) {
        res.json({ 'login': false, 'msg': 'Demo page is temporary unavailable. Please try again.', 'reg': true });
        console.error(e);
        return;
    }

});

router.get('/limit(|.html|.htm)', (req, res) => {
    if (!checkSession(req.session)) {
        res.redirect('/login');
        return;
    }
    res.sendFile('/public/limit.html', { root: __dirname });
});

function sessionMiddleware(req, res, next) {
    if (!checkSession(req.session)) {
        res.redirect('/login');
        return;
    }
    if (req.session.limit && (req.session.time > LIMIT_S)) {
        res.redirect('/limit.html');
        return;
    }
    //res.redirect('/login?msg=Please+log+in');

    next();
}
// Function getRemainTime
// function socketGetUseTime(socket) { return socket.handshake.session.time; }

var intCount = {};
function sioCheckTime(socket) {
    if (!socket.handshake.session || !socket.handshake.session.user_id) {
        //console.log('No Session');
        socket.emit(SOCKET_REDIRECT, '/login');
        socket.disconnect(true);
        return false;
    }

    if (socket.handshake.session.limit && (socket.handshake.session.time > LIMIT_S)) {
        //console.log('Reach limit', socket.id, ' session ', JSON.stringify(socket.handshake.session));
        sioStopCountDown(socket);
        socket.emit(SOCKET_REDIRECT, '/limit');
        socket.disconnect(true);
        return false;
    } else {
        socket.emit(SOCKET_LIMIT_T, socket.handshake.session.time, socket.handshake.session.limit ? LIMIT_S : 0);
        return true;
    }
}
function sioLoadCheckTime(socket) {
    socket.handshake.session.reload(err => {
        if (err) {
            socket.emit(SOCKET_MSG, 'ERROR occurred! Please contact admin.')
            console.error(err);
        }
        sioCheckTime(socket);
    });
}
function sioStartCountDown(socket) {
    if (!sioCheckTime(socket)) return false;
    socket.handshake.session.reload(err => {
        if (err) {
            socket.emit(SOCKET_MSG, 'ERROR occurred! Please contact admin.')
            console.error(err);
        }
        if (!(socket.id in intCount)) {
            intCount[socket.id] = setInterval(sioSocketCountdown, 1000, socket);
        }
        socket.s_time = 0;
        socket.emit(SOCKET_LIMIT_T, socket.handshake.session.time, socket.handshake.session.limit ? LIMIT_S : 0);
    });
    return true;
}

function sioStopCountDown(socket) {
    if (!(socket.id in intCount)) return;
    clearInterval(intCount[socket.id]);
    delete (intCount[socket.id])
    socket.handshake.session.reload(err => {
        if (err) {
            socket.emit(SOCKET_MSG, 'ERROR occurred! Please contact admin.')
            console.error(err);
        }

        socket.emit(SOCKET_LIMIT_T, socket.handshake.session.time, socket.handshake.session.limit ? LIMIT_S : 0);
        regDB.updateTime(
            socket.handshake.session.user_id,
            socket.handshake.session.ip,
            socket.s_time,
            socket.handshake.session.time
        ).then(res => {
            return res;
        }).catch(err => {
            console.error(err);
            socket.emit(SOCKET_MSG, 'ERROR occurred! Please contact admin.')
        });
    });
}

function sioSocketCountdown(socket) {
    socket.handshake.session.reload(err => {
        if (err) {
            socket.emit(SOCKET_MSG, 'ERROR occurred! Please contact admin.')
            console.error(err);
        }
        socket.s_time = 1 + (socket.s_time || 0);
        socket.handshake.session.time++;
        socket.handshake.session.save();
        sioCheckTime(socket);
    });
}

// UpdateTime

module.exports = {
    'router': router,
    'appUseSession': sess,
    'ioUseSession': ioSession,
    'sessionMiddleware': sessionMiddleware,
    'sioStartCountDown': sioStartCountDown,
    'sioStopCountDown': sioStopCountDown,
    'sioCheckTime': sioLoadCheckTime
};