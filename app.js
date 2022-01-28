var createError = require("http-errors");
var express = require("express");
const fileUpload = require('express-fileupload');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require('body-parser');

const myCronModule = require(__dirname + '/public/javascripts/cronScripts.js');

var flash = require('express-flash');
var session = require('express-session');
var mysql = require('mysql2');
var connection  = require('./lib/db');

var assassinRouter = require('./routes/assassin');
var app = express();
// require('dotenv').config();

app.use(bodyParser.json({ limit: "10mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

// Global Confirm Code constants
global.STRING_LENGTH = 45;  // set 45 char length for strings in mysql

// Global Confirm Code constants
global.CONFIRM_GO_LIVE = 1;
global.CONFIRM_REBUY = 2;
global.CONFIRM_TAKE_BREAK = 3;
global.CONFIRM_RETURN_BREAK = 4;
global.CONFIRM_QUIT = 5;
global.CONFIRM_REMOVE_PHONE = 6;
global.CONFIRM_FORCE_SHIFT = 7;

// Global Event Code constants for Alerts
global.EVENT_ASSASSINATION = 1;
global.EVENT_WAITING_TO_LIVE = 2;
global.EVENT_ASSASSINATED = 3;
global.EVENT_NEW_GO_LIVE = 4;
global.EVENT_NEW_REBUY = 5;
global.EVENT_RETURN_FROM_BREAK_TO_WAITING = 6;
global.EVENT_REMOVED_FROM_TEAM = 7;
global.EVENT_TEAMMATE_REMOVED = 8;
global.EVENT_ADDED_TO_TEAM = 9;
global.EVENT_NEW_TEAMMATE = 10;
global.EVENT_TEAM_ON_BREAK = 11;
global.EVENT_SOMEONE_ON_TEAM_QUIT = 12;
global.EVENT_NEW_TARGET = 13;
global.EVENT_BOMB_DROPPED = 14;
global.EVENT_PHOTO_APPROVED = 15;
global.EVENT_PHOTO_REJECTED = 16;
global.EVENT_GAME_START = 17;
global.EVENT_GAME_END = 18;
global.EVENT_PAID_BOUNTY = 19;
global.EVENT_MOVED_TO_WAITING = 20;
global.EVENT_MARK_TEAM_PAID = 21;

// Global Return Code constants
global.CALL_SUCCESS = 1;
global.CALL_FAIL = 2;

// Global Error Code constants
global.ERROR_ALREADY_REGISTERED = 100;
global.ERROR_PLAYER_CODE_ALREADY_IN_USE = 101;
global.ERROR_INVALID_PLAYER_CODE = 102;
global.ERROR_INVALID_PLAYER_OR_TEAM_CODE_FORMAT = 103;
global.ERROR_TEAM_NOT_FOUND_OR_QUIT = 104;
global.ERROR_TEAM_FULL = 105;
global.ERROR_CANT_REMOVE_SELF = 106;
global.ERROR_PLAYER_NOT_FOUND_OR_NOT_ON_TEAM = 107;
global.ERROR_PLAYER_ALREADY_ON_A_TEAM = 108;
global.ERROR_NO_FILE_UPLOADED = 109;
global.ERROR_INVALID_PLAYER_NAME = 110;
global.ERROR_GO_LIVE = 111;
global.ERROR_NOT_CAPTAIN = 112;
global.ERROR_NOT_ON_BREAK = 113;
global.ERROR_TOO_EARLY_TO_RETURN_FROM_BREAK = 114;
global.ERROR_MUST_BE_INACTIVE_TO_REBUY = 115;
global.ERROR_INSUFFICIENT_BOUNTIES_TO_REBUY = 116;
global.ERROR_MUST_BE_LIVE_OR_WAITING_TO_BREAK = 117;
global.ERROR_MUST_BE_LIVE_TO_ATTEMPT_KILL = 118;
global.ERROR_CONFIRM_KILL_NAMES_DONT_MATCH = 119;
global.ERROR_MUST_BE_REGISTERED_STATUS_TO_CREATE_TEAM = 120;
global.ERROR_INVALID_EMAIL = 121;
global.ERROR_INVALID_TEAM_NAME = 122;
global.ERROR_INVALID_PHONE_NUMBER = 123;
global.ERROR_INVALID_BOUNTY_PAYOUT = 124;
global.ERROR_INVALID_HOURS_TO_GO = 125;


const { auth } = require('express-openid-connect');

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: 'kjgfkjwehrasrjbadjbjhsdfjbsdfgjakasdkdgf9kb2agkn',
  //baseURL: 'http://159.65.180.75',
  baseURL: 'http://localhost:3000',
  clientID: 'xILNWHiJzCD9MOOltuo391jUROB7Al0Q',
  issuerBaseURL: 'https://dev-ae79isjb.us.auth0.com'
};

// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));

app.use(
  fileUpload({
    createParentPath: true,
  })
);

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.oidc.isAuthenticated();
  next();
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(express.static('public'));
// app.use(express.static('upload'));

console.log(__dirname);

//app.use('/static', express.static(path.join(__dirname, 'public')))

app.use(session({
    cookie: { maxAge: 60000 },
    store: new session.MemoryStore,
    saveUninitialized: true,
    resave: 'true',
    secret: 'secret'
}))

app.use(flash());

app.use('/', assassinRouter);
// app.use('/assassin', assassinRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

// myCronModule.startCronScripts();
