var express = require('express');
const fileUpload = require('express-fileupload');
var router = express.Router();
var dbConn  = require('../lib/db');

// -----------------------------------------------------------

/* GET home page. */
router.get('/', function(req, res, next) {

  console.log("Root called");

  if (req.oidc.isAuthenticated())
  {
      console.log("Email in Root index is " + req.oidc.user.email);

      // Retrieve User info given email
      dbConn.query('CALL `assassin-demo1`.`get_player_info`(?)', req.oidc.user.email, function(err,rows)
      {
          if(err)
          {
              console.log("Error on get_player_info call.");
              req.flash('error', err);
          } else
          {
              console.log("Successful Get Info RPC call.");

              console.log(rows);

              // Check to see if Player exists, if not in db, redirect to landing2
              if (rows[0][0].playerCode == null)
              {
                  console.log("Player code does not exist");
                  res.render('assassin/landing2');
              }
              else
              {
                  if (rows[0][0].numTeammates > 0)
                  {
                      // get teammate info, could be multiple rows
                      dbConn.query('CALL `assassin-demo1`.`get_teammate_info`(?,?)', [rows[0][0].playerCode, rows[0][0].playerTeamCode], function(err,rows2)
                      {
                          if(err)
                          {
                              console.log("Error");
                              req.flash('error', err);
                          } else
                          {
                              console.log("Successful Get Teammate Info RPC call.");
                              console.log(rows2[0]);

                              res.render('assassin/home', {
                              playerCode: rows[0][0].playerCode,
                              playerName: rows[0][0].playerName,
                              playerStatus: rows[0][0].playerStatus,
                              playerEmail: req.oidc.user.email,
                              playerPhone: rows[0][0].playerPhone,
                              myLastShiftTimeStamp: rows[0][0].myLastShiftTimeStamp,
                              playerTeamName: rows[0][0].playerTeamName,
                              playerTeamCode: rows[0][0].playerTeamCode,
                              playerTeammates: rows2[0],
                              numTeammates: rows[0][0].numTeammates,
                              captainFlag: rows[0][0].captainFlag,
                              teamCaptainName: rows[0][0].teamCaptainName,
                              teamLivePlayerName: rows[0][0].teamLivePlayerName,
                              teamStatus: rows[0][0].teamStatus,
                              teamBountiesOwed: rows[0][0].teamBountiesOwed,
                              totalTeamBountiesEarned: rows[0][0].totalTeamBountiesEarned,
                              targetTeamName: rows[0][0].targetTeamName,
                              targetName: rows[0][0].targetName,
                              targetPic: rows[0][0].targetPic});

                          }
                      });
                  }
                  else
                  {
                      res.render('assassin/home', {
                      playerCode: rows[0][0].playerCode,
                      playerName: rows[0][0].playerName,
                      playerStatus: rows[0][0].playerStatus,
                      playerEmail: req.oidc.user.email,
                      playerPhone: rows[0][0].playerPhone,
                      myLastShiftTimeStamp: rows[0][0].myLastShiftTimeStamp,
                      playerTeamName: rows[0][0].playerTeamName,
                      playerTeamCode: rows[0][0].playerTeamCode,
                      numTeammates: rows[0][0].numTeammates,
                      captainFlag: rows[0][0].captainFlag,
                      // teamCaptainName: rows[0][0].teamCaptainName,
                      // teamLivePlayerName: rows[0][0].teamLivePlayerName,
                      teamStatus: rows[0][0].teamStatus,
                      teamBountiesOwed: rows[0][0].teamBountiesOwed,
                      totalTeamBountiesEarned: rows[0][0].totalTeamBountiesEarned,
                      targetTeamName: rows[0][0].targetTeamName,
                      targetName: rows[0][0].targetName,
                      targetPic: rows[0][0].targetPic});

                  } // end else, no teammates

              } // end else Player exists

          } // end else successful get info

      }); // end query

  } // end if authenticated
  else
  {
      console.log("Not authenticated");
      res.render('assassin/landing');
  }

});

// ----------------------------------------------------------

router.get('/register', function(req, res, next) {

  console.log("Before register");

  // res.oidc.logout();

  res.oidc.login({
    returnTo: '/callback',
    authorizationParams: {
      screen_hint: 'signup'
      // prompt: 'login'
    },
  });

  console.log("After register");

});

// -------------------------------------------------------------

// Get my target's target's name
router.post('/newAssassin', function(req, res, next)
{
  console.log("Got into new assassin call");
  //console.log(req.files);

  // helper vars for uploading photo file
  let playerPhotoFile;
  let uploadPath;

  // Check if photo file was passed in correctly
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  // name of the input is playerPhotoFile
  playerPhotoFile = req.files.playerPhotoFile;
  uploadPath = __dirname + '/upload/' + playerPhotoFile.name;

  console.log(req.body.playerTeamName);

  dbConn.query('CALL `assassin-demo1`.`create_player_from_email`(?,?,?,?,?)', [req.oidc.user.email, req.body.playerName, req.body.playerPhone, playerPhotoFile.name, req.body.playerTeamName], function(err,rows)
  {
      if(err)
      {
          console.log("Error");
          req.flash('error', err);
      } else
      {
          // Create Player worked, now upload photo
          console.log("Create Player worked, now upload photo.");

          console.log(uploadPath);

          // Use mv() to place file on the server
          playerPhotoFile.mv(uploadPath, function (err)
          {
              if (err)
              {
                console.log("Error on file upload");
                return res.status(500).send(err);
              }
              else {
                console.log("Successful file upload");
              }

          });

          console.log("Successful create player from email.");
          res.oidc.login();  // route Player back to Home
      } // end else
  }); // end query

}); // end router post validateKill

// -------------------------------------------------------------

//
router.post('/activateAssassin', function(req, res, next)
{
  console.log("Got into new assassin call");

  dbConn.query('CALL `assassin-demo1`.`activate_player`(?,?)', [req.body.playerCode, req.oidc.user.email], function(err,rows)
  {
      if(err)
      {
          console.log("Error");
          req.flash('error', err);
      } else
      {
          console.log("Successful activate player.");
          res.oidc.login();  // route Player back to Home
      } // end else
  }); // end query

}); // end router post validateKill

// ----------------------------------------------------------

// Get my target's target's name
router.post('/validateKill', function(req, res, next)
{
  console.log("Validate Kill called.");

  dbConn.query('CALL `assassin-demo1`.`validate_kill`(?,?)', [req.body.myTeamCode, req.body.myKillName], function(err,rows)
  {
      if(err) {
          console.log("Error");
          req.flash('error', err);
      } else {
          console.log("Successful RPC call.");

          console.log(rows);
          // console.log(rows[0]);
          // console.log("-----------------");
          // console.log(rows[1]);
          // console.log("-----------------");

          if (rows[0][0].phone == 1)
          {
            res.oidc.login(); // send back home to refresh page with new target
          }

      } // end else
  }); // end query

}); // end router post validateKill

// -------------------------------------------------------------
// Don't think I need this anymore - will wait to delete
//

// // display assassin new player page
// router.get('/enterNewPlayerInfo', function(req, res, next)
// {
//
//       // render to enterNewPlayerInfo.ejs
//       res.render('assassin/enterNewPlayerInfo', {
//           myName: ''
//       });
//
// });

// -----------------------------------------------------------
// Don't think I need this anymore - will wait to delete
//
// router.post('/enterNewPlayerInfo', function(req, res, next)
// {
//   dbConn.query('CALL `assassin-demo1`.`create_player`(?)', req.body.myName, function(err,rows)
//   {
//       if(err) {
//           console.log("Error");
//           req.flash('error', err);
//       } else {
//           console.log("Successful RPC call.");
//
//           // console.log(rows[0][0].phone);
//           console.log(rows[0]);
//           console.log("-----------------");
//           console.log(rows[1]);
//           console.log("-----------------");
//
//       } // end else
//   }); // end query
//
// }); // end router post

// -------------------------------------------------------------

// // display new player and team page
// router.get('/enterNewPlayerAndTeamInfo', function(req, res, next)
// {
//
//       // render to enterNewPlayerInfo.ejs
//       res.render('assassin/enterNewPlayerAndTeamInfo', {
//           myName: '',
//           myTeamName: ''
//       });
//
// });
//
// -----------------------------------------------------------

// router.post('/enterNewPlayerAndTeamInfo', function(req, res, next)
// {
//   dbConn.query('CALL `assassin-demo1`.`create_player_and_team`(?,?)', [req.body.myName,req.body.myTeamName ], function(err,rows)
//   {
//       if(err) {
//           console.log("Error");
//           req.flash('error', err);
//       } else {
//           console.log("Successful RPC call.");
//
//           // console.log(rows[0][0].phone);
//           console.log(rows[0]);
//           console.log("-----------------");
//           console.log(rows[1]);
//           console.log("-----------------");
//
//       } // end else
//   }); // end query
//
// }); // end router post validateKill

// -----------------------------------------------------------

router.post('/rebuy', function(req, res, next)
{
  console.log("Got into rebuy");

  dbConn.query('CALL `assassin-demo1`.`rebuy`(?,?)', [req.body.myPlayerCode,req.body.myTeamCode], function(err,rows)
  {
      if(err) {
          console.log("Error on rebuy");
          req.flash('error', err);
      } else {
          console.log("Successful rebuy RPC call.");

          console.log(rows);
          // console.log(rows[0]);
          // console.log("-----------------");
          // console.log(rows[1]);
          // console.log("-----------------");

          res.oidc.login(); // send back home to refresh page with new target

      } // end else
  }); // end query

}); // end router post

// -----------------------------------------------------------

router.post('/goLive', function(req, res, next)
{
  console.log("Got into Go Live");

  dbConn.query('CALL `assassin-demo1`.`go_live`(?,?)', [req.body.myPlayerCode,req.body.myTeamCode], function(err,rows)
  {
      if(err) {
          console.log("Error on Go Live");
          req.flash('error', err);
      } else {
          console.log("Successful Go Live RPC call.");

          // console.log(rows[0][0].phone);
          console.log(rows);

          res.oidc.login(); // send back home to refresh page with new target

      } // end else
  }); // end query

}); // end router post

// -----------------------------------------------------------

router.post('/joinTeam', function(req, res, next)
{
  console.log("Got into Join Team");

  dbConn.query('CALL `assassin-demo1`.`join_team`(?,?)', [req.body.myPlayerCode,req.body.joinTeamCode], function(err,rows)
  {
      if(err) {
          console.log("Error on Join Team");
          req.flash('error', err);
      } else {
          console.log("Successful Join Team RPC call.");

          // console.log(rows[0][0].phone);
          console.log(rows);

          res.oidc.login(); // send back home to refresh page with new target

      } // end else
  }); // end query

}); // end router post

// -----------------------------------------------------------

router.post('/createTeam', function(req, res, next)
{
  console.log("Got into Create Team");

  dbConn.query('CALL `assassin-demo1`.`create_team`(?,?)', [req.body.myPlayerCode,req.body.playerTeamName], function(err,rows)
  {
      if(err) {
          console.log("Error on Create Team");
          req.flash('error', err);
      } else {
          console.log("Successful Create Team RPC call.");

          // console.log(rows[0][0].phone);
          console.log(rows);

          res.oidc.login(); // send back home to refresh page with new target

      } // end else
  }); // end query

}); // end router post

// ---------------------------------------------------------

router.post('/takeBreak', function(req, res, next)
{
  console.log("Got into take break");

  dbConn.query('CALL `assassin-demo1`.`leave_game`(?,?,?)', [req.body.myPlayerCode, req.body.myTeamCode, "Break"], function(err,rows)
  {
      if(err) {
          console.log("Error on take break");
          req.flash('error', err);
      } else {
          console.log("Successful take break RPC call.");

          console.log(rows);
          // console.log("-----------------");
          // console.log(rows[1]);
          // console.log("-----------------");

          res.oidc.login(); // send back home to refresh page with new target

      } // end else
  }); // end query

}); // end router post

// ---------------------------------------------------------

router.post('/returnFromBreak', function(req, res, next)
{
  console.log("Got into return from break");

  dbConn.query('CALL `assassin-demo1`.`return_from_break`(?)', req.body.myTeamCode, function(err,rows)
  {
      if(err) {
          console.log("Error on return from break");
          req.flash('error', err);
      } else {
          console.log("Successful return from break RPC call.");

          console.log(rows);
          // console.log("-----------------");
          // console.log(rows[1]);
          // console.log("-----------------");

          res.oidc.login(); // send back home to refresh page with new target

      } // end else
  }); // end query

}); // end router post

// ---------------------------------------------------------

router.post('/addPlayer', function(req, res, next)
{
  console.log("Got into addPlayer");

  dbConn.query('CALL `assassin-demo1`.`add_player_to_team`(?,?,?)', [req.body.myPlayerCode,req.body.myTeamCode,req.body.addPlayerCode], function(err,rows)
  {
      if(err) {
          console.log("Error on add player");
          req.flash('error', err);
      } else {
          console.log("Successful add player RPC call.");

          console.log(rows);
          // console.log(rows[0]);
          // console.log("-----------------");
          // console.log(rows[1]);
          // console.log("-----------------");

          res.oidc.login(); // send back home to refresh page with new target

      } // end else
  }); // end query

}); // end router post


// ---------------------------------------------------------

router.post('/removePlayerFromTeam', function(req, res, next)
{
  console.log("Got into addPlayer");

  dbConn.query('CALL `assassin-demo1`.`remove_player_from_team`(?,?,?)', [req.body.myPlayerCode,req.body.myTeamCode,req.body.removePlayerCode], function(err,rows)
  {
      if(err) {
          console.log("Error on add player");
          req.flash('error', err);
      } else {
          console.log("Successful add player RPC call.");

          console.log(rows);
          // console.log(rows[0]);
          // console.log("-----------------");
          // console.log(rows[1]);
          // console.log("-----------------");

          res.oidc.login(); // send back home to refresh page with new target

      } // end else
  }); // end query

}); // end router post

// ---------------------------------------------------------

router.post('/quitGame', function(req, res, next)
{
  console.log("Got into quitGame");

  dbConn.query('CALL `assassin-demo1`.`leave_game`(?,?,?)', [req.body.myPlayerCode, req.body.myTeamCode, "Quit"], function(err,rows)
  {
      if(err) {
          console.log("Error on quitGame");
          req.flash('error', err);
      } else {
          console.log("Successful quitGame RPC call.");

          console.log(rows);
          // console.log(rows[0]);
          // console.log("-----------------");
          // console.log(rows[1]);
          // console.log("-----------------");

          res.oidc.login(); // send back home to refresh page with new target

      } // end else
  }); // end query

}); // end router post

// -------------------------------------------------------------

module.exports = router;
