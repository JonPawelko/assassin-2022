var createError = require("http-errors");
var express = require("express");
const fileUpload = require('express-fileupload');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var flash = require('express-flash');
var session = require('express-session');
var mysql = require('mysql2');
var connection  = require('./lib/db');

var assassinRouter = require('./routes/assassin');

var app = express();
// require('dotenv').config();

const { auth } = require('express-openid-connect');

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: 'kjgfkjwehrasrjbadjbjhsdfjbsdfgjakasdkdgf9kb2agkn',
  // baseURL: 'http://159.65.180.75',
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
