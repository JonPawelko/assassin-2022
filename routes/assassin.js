// All Routes defined here.  Router exported at bottom.
//

var express = require('express');
const fileUpload = require('express-fileupload');
var router = express.Router();
var dbConn  = require('../lib/db');   // database object

// -----------------------------------------------------------

/* GET home page. */
router.get('/', function(req, res, next) {

  console.log("Root called");

  // Check authentication status
  if (req.oidc.isAuthenticated())
  {
      console.log("User Authenticated - Email in Root index is " + req.oidc.user.email);

      // Retrieve User info passing in email
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

              // Check to see if Player exists in the database already, if not, redirect to landing2
              if (rows[0][0].playerCode == null)
              {
                  console.log("Player code does not exist");
                  res.render('assassin/landing2');
              }
              else  // Player exists, continue logic checks
              {
                  // Check if Player has any teammates
                  if (rows[0][0].numTeammates > 0)
                  {
                      // get teammate info, could be multiple rows returned
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

                              // route to home page passing Player info and teammate info
                              res.render('assassin/home', {
                              playerCode: rows[0][0].playerCode,
                              playerName: rows[0][0].playerName,
                              playerStatus: rows[0][0].playerStatus,
                              playerEmail: req.oidc.user.email,
                              playerPhone: rows[0][0].playerPhone,
                              playerPic: rows[0][0].playerPic,
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
                  else // Player has no teammates, don't need to send Captain Name or Live Player (must be single player)
                  {
                      res.render('assassin/home', {
                      playerCode: rows[0][0].playerCode,
                      playerName: rows[0][0].playerName,
                      playerStatus: rows[0][0].playerStatus,
                      playerEmail: req.oidc.user.email,
                      playerPhone: rows[0][0].playerPhone,
                      playerPic: rows[0][0].playerPic,
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
  {   // user not authenticated, send to main landing page
      console.log("Not authenticated");
      res.render('assassin/landing');
  }

});

// ----------------------------------------------------------
// Players can Register themselves at any time
//
router.get('/register', function(req, res, next) {

  console.log("Before register");

  // Call Auth0 with signup flag to route to Register instead of Login
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
// newAssassin called by a brand new, self-registering player

router.post('/newAssassin', function(req, res, next)
{
  console.log("Got into new assassin call");

  // helper vars for uploading photo file
  let playerPhotoFile;
  let uploadPath;

  // Check if photo file was passed in correctly
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  // name of the input is playerPhotoFile
  playerPhotoFile = req.files.playerPhotoFile;
  uploadPath = __dirname + '/../public/photos/' + playerPhotoFile.name;  // might want to clean up this directory logic

  // Call stored procedure to create the player
  dbConn.query('CALL `assassin-demo1`.`create_player_from_email`(?,?,?,?,?)', [req.oidc.user.email, req.body.playerName, req.body.playerPhone, playerPhotoFile.name, req.body.playerTeamName], function(err,rows)
  {
      if(err)
      {
          console.log("Error on create_player_from_email call.");
          req.flash('error', err);
      } else
      {
          // Create Player worked, now upload photo
          console.log("Create Player worked, now upload photo.");

          // console.log(uploadPath);

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

}); // end post('/newAssassin')

// -------------------------------------------------------------
// This route used by Players that registered in person and were given an 8-digit code to "Activate"

router.post('/activateAssassin', function(req, res, next)
{
  console.log("Got into activateAssassin call");

  // Activate the Player, essentially updating the Player table with the email
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
// Route used to attempt a kill.  Passing in the name of your target's target
//
router.post('/validateKill', function(req, res, next)
{
  console.log("Validate Kill called.");

  // Call stored proc
  dbConn.query('CALL `assassin-demo1`.`validate_kill`(?,?)', [req.body.myTeamCode, req.body.myKillName], function(err,rows)
  {
      if(err) {
          console.log("Error on validate_kill call.");
          req.flash('error', err);
      } else {
          console.log("Successful RPC validate_kill call.");

          console.log(rows);

          // Check return code.  1 = successful kill.
          if (rows[0][0].phone == 1)
          {
            res.oidc.login(); // send back home to refresh page with new target
          }
          else
          {
              // Need error logic here
          }

      } // end else

  }); // end query

}); // end router post validateKill


// -----------------------------------------------------------
// Captain only feature.  Needs lots more condition checking.
//
router.post('/rebuy', function(req, res, next)
{
  console.log("Got into rebuy");

  // call stored procedure
  dbConn.query('CALL `assassin-demo1`.`rebuy`(?,?)', [req.body.myPlayerCode,req.body.myTeamCode], function(err,rows)
  {
      if(err) {
          console.log("Error on rebuy");
          req.flash('error', err);
      } else {
          console.log("Successful rebuy RPC call.");
          console.log(rows);

          res.oidc.login(); // send back home to refresh page with new target

      } // end else
  }); // end query

}); // end router post

// -----------------------------------------------------------
//  Route used for a Bench Player to try to go live
//
router.post('/goLive', function(req, res, next)
{
  console.log("Got into Go Live");

  // Call stored procedure
  dbConn.query('CALL `assassin-demo1`.`go_live`(?,?)', [req.body.myPlayerCode,req.body.myTeamCode], function(err,rows)
  {
      if(err) {
          console.log("Error on Go Live");
          req.flash('error', err);
      } else {
          console.log("Successful Go Live RPC call.");

          // Need error checking here if Player couldn't go Live.

          console.log(rows);

          res.oidc.login(); // send back home to refresh page, Player may now be Live

      } // end else

  }); // end query

}); // end router post

// -----------------------------------------------------------
// Route used by a Player to try to join a Team
//
router.post('/joinTeam', function(req, res, next)
{
  console.log("Got into Join Team");

  // Call stored procedure
  dbConn.query('CALL `assassin-demo1`.`join_team`(?,?)', [req.body.myPlayerCode,req.body.joinTeamCode], function(err,rows)
  {
      if(err) {
          console.log("Error on Join Team");
          req.flash('error', err);
      } else {
          console.log("Successful Join Team RPC call.");
          console.log(rows);

          // Need condition checking here, currently just routing back home

          res.oidc.login(); // send back home to refresh page, may now be on a new Team

      } // end else

  }); // end query

}); // end router post

// -----------------------------------------------------------
// Route used by a Player not currently on a Team.
//
router.post('/createTeam', function(req, res, next)
{
  console.log("Got into Create Team");

  // Call stored procedure
  dbConn.query('CALL `assassin-demo1`.`create_team`(?,?)', [req.body.myPlayerCode,req.body.playerTeamName], function(err,rows)
  {
      if(err) {
          console.log("Error on Create Team");
          req.flash('error', err);
      } else {
          console.log("Successful Create Team RPC call.");

          // console.log(rows[0][0].phone);
          console.log(rows);

          res.oidc.login(); // send back home to refresh page

      } // end else

  }); // end query

}); // end router post

// ---------------------------------------------------------
// Route used by a Captain to put Team on Break
//
router.post('/takeBreak', function(req, res, next)
{
  console.log("Got into take break");

  // Call stored procedure
  dbConn.query('CALL `assassin-demo1`.`leave_game`(?,?,?)', [req.body.myPlayerCode, req.body.myTeamCode, "Break"], function(err,rows)
  {
      if(err) {
          console.log("Error on take break");
          req.flash('error', err);
      } else {
          console.log("Successful take break RPC call.");
          console.log(rows);

          res.oidc.login(); // send back home to refresh page with new target

      } // end else

  }); // end query

}); // end router post

// ---------------------------------------------------------
// Route called by Captain to return from break, if they waited the minimum time
//
router.post('/returnFromBreak', function(req, res, next)
{
  console.log("Got into return from break");

  // Call stored proc
  dbConn.query('CALL `assassin-demo1`.`return_from_break`(?)', req.body.myTeamCode, function(err,rows)
  {
      if(err) {
          console.log("Error on return from break");
          req.flash('error', err);
      } else {
          console.log("Successful return from break RPC call.");
          console.log(rows);

          res.oidc.login(); // send back home to refresh page with new target

      } // end else

  }); // end query

}); // end router post

// ---------------------------------------------------------
// Route called by Captain to add a Player to their Team
//
router.post('/addPlayer', function(req, res, next)
{
  console.log("Got into addPlayer");

  // Call stored procedure
  dbConn.query('CALL `assassin-demo1`.`add_player_to_team`(?,?,?)', [req.body.myPlayerCode,req.body.myTeamCode,req.body.addPlayerCode], function(err,rows)
  {
      if(err) {
          console.log("Error on add player");
          req.flash('error', err);
      } else {
          console.log("Successful add player RPC call.");
          console.log(rows);

          res.oidc.login(); // send back home to refresh page with new target

      } // end else

  }); // end query

}); // end router post

// ---------------------------------------------------------
// Route called by a Captain to remove player from Team
//
router.post('/removePlayerFromTeam', function(req, res, next)
{
  console.log("Got intoremovePlayerFromTeam");

  // Call stored proc
  dbConn.query('CALL `assassin-demo1`.`remove_player_from_team`(?,?,?)', [req.body.myPlayerCode,req.body.myTeamCode,req.body.removePlayerCode], function(err,rows)
  {
      if(err) {
          console.log("Error on removePlayerFromTeam");
          req.flash('error', err);
      } else {
          console.log("Successful removePlayerFromTeam RPC call.");
          console.log(rows);

          res.oidc.login(); // send back home to refresh page with new target

      } // end else

  }); // end query

}); // end router post

// -----------------------------------------------------------------------
// Route used by Player to Quit game.  Try to resolve Live, Captain gaps
//
router.post('/quitGame', function(req, res, next)
{
  console.log("Got into quitGame");

  // leave_game stored proc handles both Quit and Break, send in the right flag
  dbConn.query('CALL `assassin-demo1`.`leave_game`(?,?,?)', [req.body.myPlayerCode, req.body.myTeamCode, "Quit"], function(err,rows)
  {
      if(err) {
          console.log("Error on quitGame");
          req.flash('error', err);
      } else {
          console.log("Successful quitGame RPC call.");
          console.log(rows);

          res.oidc.login(); // send back home to refresh page with new target

      } // end else

  }); // end query

}); // end router post

// --------------------------------------------------------------------------------------------------------
// Route called by any Player to view their picture.  Currently no plan to allow editing, just a courtesy
router.post('/viewMyPicture', function(req, res, next)
{
  console.log("Got into viewMyPicture");

  console.log(req.body.playerPic);

  console.log(__dirname);

  var playerPicPath = "../../" + req.body.playerPic;

  console.log(playerPicPath);

  // No stored procedure needed, just display my pic
  res.render('assassin/viewMyPicture', {playerCode: req.body.myPlayerCode, myPicture: playerPicPath});

}); // end router post

// -------------------------------------------------------------
// Export the router
//

module.exports = router;
