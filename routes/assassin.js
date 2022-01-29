// All Routes defined here.  Router exported at bottom.
//
// import { clone, cloneDeep } from "lodash"

// var _ = require('lodash'); // Load the full build - used for deep array copy - didn't work, uninstalled for now
var express = require('express');
const fileUpload = require('express-fileupload');
var router = express.Router();
var dbConn  = require('../lib/db');   // database object

// -------------------------------------------------------------
// Export the router
//
module.exports = router;

// --------------------------------------------------------------------------------------------------------
// Custom login function needed to use consistent buttons across site.
//
router.post('/assassinLogin', function(req, res, next)
{
  console.log("Got into assassinLogin");

  res.oidc.login();

}); // end router post assassinLogin

// ----------------------------------------------------------
// Players can Register themselves at any time
//
router.post('/assassinRegister', function(req, res, next) {

  console.log("Before assassinRegister");

  res.oidc.login(
  {
      authorizationParams:
      {
        screen_hint: 'signup'   // this will denote registration vs regular login
      }
  });

  console.log("After assassinRegister");

});  // end router post assassinRegister

// --------------------------------------------------------------------------------------------------------
// Custom logout function needed to use consistent buttons across site.
//
router.post('/assassinLogout', function(req, res, next)
{
  console.log("Got into assassinLogout");

  res.oidc.logout();

}); // end router post assassinLogout

// -----------------------------------------------------------
// GET root page.

router.get('/', function(req, res, next) {

  console.log("Root called");
  var tempMyLastShift;  // helper for null last shifts

  // Check authentication status
  if (!req.oidc.isAuthenticated())
  {
      console.log("Not authenticated");
      res.render('landing');
      return;
  }

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
              res.render('landing2');
              return;
          }
          else  // Player exists, continue logic checks
          {
              // Get and save game statistics
              console.log("Just before get stats call");

              dbConn.query('CALL `assassin-demo1`.`get_statistics`(?,?)', [rows[0][0].playerCode, rows[0][0].playerTeamCode], function(err,rowsStats)
              {
                  if(err)
                  {
                      console.log("Error with get_statistics");
                      req.flash('error', err);
                  } else
                  {
                      console.log("Successful get_statistics RPC call.");
                      console.log(rowsStats[0]);

                      if (rows[0][0].myLastShiftTimeStamp != null)
                      {
                        tempMyLastShift = formatDate(rows[0][0].myLastShiftTimeStamp);
                      }
                      else
                      {
                        tempMyLastShift = "";
                      }

                      console.log("Last shift is " + tempMyLastShift);
                      console.log("Numteammates is " + rows[0][0].numTeammates);

                      // Check if Player has any teammates
                      if (rows[0][0].numTeammates > 0)
                      {
                          console.log("At least 1 teammate");
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
                                  res.render('home', {
                                  playerCode: rows[0][0].playerCode,
                                  playerName: rows[0][0].playerName,
                                  playerStatus: rows[0][0].playerStatus,
                                  playerEmail: req.oidc.user.email,
                                  playerPhone: rows[0][0].playerPhone,
                                  playerPic: rows[0][0].playerPic,
                                  playerPicStatus: rows[0][0].playerPicStatus,
                                  myLastShiftTimeStamp: tempMyLastShift,
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
                                  targetPic: rows[0][0].targetPic,
                                  totalPlayers: rowsStats[0][0].totalPlayers,
                                  totalTeams: rowsStats[0][0].totalTeams,
                                  liveTeams: rowsStats[0][0].liveTeams,
                                  waitingTeams: rowsStats[0][0].waitingTeams,
                                  totalKills: rowsStats[0][0].totalKills,
                                  todaysKills: rowsStats[0][0].todaysKills,
                                  weekTeamLeader: rowsStats[0][0].weekTeamLeader,
                                  dayTeamLeader: rowsStats[0][0].dayTeamLeader,
                                  weekPlayerLeader: rowsStats[0][0].weekPlayerLeader,
                                  dayPlayerLeader: rowsStats[0][0].dayPlayerLeader,
                                  myTeamTotalKills: rowsStats[0][0].myTeamTotalKills,
                                  myTeamTodayKills: rowsStats[0][0].myTeamTodayKills,
                                  myPersonalKillsWeek: rowsStats[0][0].myPersonalKillsWeek,
                                  myPersonalKillsDay: rowsStats[0][0].myPersonalKillsDay});

                              }
                          }); // end get_teammate_info rpc call
                      }
                      else // Player has no teammates, don't need to send Captain Name or Live Player (must be single player)
                      {
                          res.render('home', {
                          playerCode: rows[0][0].playerCode,
                          playerName: rows[0][0].playerName,
                          playerStatus: rows[0][0].playerStatus,
                          playerEmail: req.oidc.user.email,
                          playerPhone: rows[0][0].playerPhone,
                          playerPic: rows[0][0].playerPic,
                          playerPicStatus: rows[0][0].playerPicStatus,
                          myLastShiftTimeStamp: tempMyLastShift,
                          playerTeamName: rows[0][0].playerTeamName,
                          playerTeamCode: rows[0][0].playerTeamCode,
                          // playerTeammates: rows2[0], // don't need this, no teammates
                          numTeammates: rows[0][0].numTeammates,
                          captainFlag: rows[0][0].captainFlag,
                          // teamCaptainName: rows[0][0].teamCaptainName, // don't need this, no teammates, player must be captain
                          // teamLivePlayerName: rows[0][0].teamLivePlayerName, // don't need this, no teammates, player must be live
                          teamStatus: rows[0][0].teamStatus,
                          teamBountiesOwed: rows[0][0].teamBountiesOwed,
                          totalTeamBountiesEarned: rows[0][0].totalTeamBountiesEarned,
                          targetTeamName: rows[0][0].targetTeamName,
                          targetName: rows[0][0].targetName,
                          targetPic: rows[0][0].targetPic,
                          totalPlayers: rowsStats[0][0].totalPlayers,
                          totalTeams: rowsStats[0][0].totalTeams,
                          liveTeams: rowsStats[0][0].liveTeams,
                          waitingTeams: rowsStats[0][0].waitingTeams,
                          totalKills: rowsStats[0][0].totalKills,
                          todaysKills: rowsStats[0][0].todaysKills,
                          weekTeamLeader: rowsStats[0][0].weekTeamLeader,
                          dayTeamLeader: rowsStats[0][0].dayTeamLeader,
                          weekPlayerLeader: rowsStats[0][0].weekPlayerLeader,
                          dayPlayerLeader: rowsStats[0][0].dayPlayerLeader,
                          myTeamTotalKills: rowsStats[0][0].myTeamTotalKills,
                          myTeamTodayKills: rowsStats[0][0].myTeamTodayKills,
                          myPersonalKillsWeek: rowsStats[0][0].myPersonalKillsWeek,
                          myPersonalKillsDay: rowsStats[0][0].myPersonalKillsDay});
                      } // end else, no teammates

                  }  // end else - Successful get_statistics RPC call

              });  // end get_statistics rpc call

          } // end else Player exists

      } // end else successful get info

  }); // end query get_player_info

});  // end router root GET

// -------------------------------------------------------------
// newAssassin called by a brand new, self-registering player
//
router.post('/newAssassin', function(req, res, next)
{
    console.log("Got into new assassin call");

    // Check authentication status
    if (!req.oidc.isAuthenticated())
    {
        console.log("Not authenticated");
        res.render('landing');
        return;
    }

    // helper vars for uploading photo file
    let playerPhotoFile;
    let uploadPath;

    // helper var to check and format phone number
    var tempPlayerPhone;

    // Check if photo file was passed in correctly
    if (!req.files || Object.keys(req.files).length === 0)
    {
        // Render error page, passing in error code
        res.render('errorMessagePage', {result: ERROR_NO_FILE_UPLOADED});
        return;
    }

    if (validateString(req.body.playerName) == false)
    {
        // Render error page, passing in error code
        res.render('errorMessagePage', {result: ERROR_INVALID_PLAYER_NAME});
        return;
    }

    // Only validate teamname if it was passed in, optional
    if ((req.body.playerTeamName != null) && (req.body.playerTeamName != ""))
    {
        if (validateString(req.body.playerTeamName) == false)
        {
            // Render error page, passing in error code
            res.render('errorMessagePage', {result: ERROR_INVALID_TEAM_NAME});
            return;
        }
    }

    // Only validate phone if passed in, optional
    if ((req.body.playerPhone != null) && (req.body.playerPhone != ""))
    {
        tempPlayerPhone = validatePhone(req.body.playerPhone); // comes back formatted

        if (tempPlayerPhone == null)
        {
            // Render error page, passing in error code
            res.render('errorMessagePage', {result: ERROR_INVALID_PHONE_NUMBER});
            return;
        }
    }

    // name of the input is playerPhotoFile
    playerPhotoFile = req.files.playerPhotoFile;
    uploadPath = __dirname + '/../public/photos/' + playerPhotoFile.name;  // might want to clean up this directory logic

    console.log("Upload path is: " + uploadPath);

    // Call stored procedure to create the player
    dbConn.query('CALL `assassin-demo1`.`create_player_from_email`(?,?,?,?,?)', [req.oidc.user.email, req.body.playerName, tempPlayerPhone, playerPhotoFile.name, req.body.playerTeamName], function(err,rows)
    {
        if(err)
        {
            console.log("Error on create_player_from_email call.");
            req.flash('error', err);
        } else
        {
            // Create Player worked, now upload photo
            console.log("Create Player RPC worked, now check return code.");

            // Check return code
            if (rows[0][0].phone == CALL_SUCCESS)
            {
                // Use mv() to place file on the server
                playerPhotoFile.mv(uploadPath, function (err)
                {
                    if (err)
                    {
                      console.log("Error on file upload");
                      return res.status(500).send(err);
                    }
                    else
                    {
                        console.log("Successful file upload");

                        // Update status of player picture to Uploaded, use email because we don't know playerCode here
                        dbConn.query('CALL `assassin-demo1`.`update_photo_status_to_uploaded`(?)', req.oidc.user.email, function(err,rows)
                        {
                            if(err)
                            {
                                console.log("Error on update_photo_status_to_uploaded call.");
                                req.flash('error', err);
                            } else
                            {
                                // Create Player worked, now upload photo
                                console.log("update_photo_status_to_uploaded rpc worked");

                                // need to check return code here zzz

                                res.oidc.login();  // route Player back to Home

                            }
                        });
                    } // end else file upload

                }); // end file .mv

            }   // end if call_success
            else
            {
              // Render error page, passing in error code
              res.render('errorMessagePage', {result: parseInt(rows[0][0].phone)});
              return;
            } // end else, call failed

        } // end else create_player_from_email ok

    }); // end query

}); // end post('/newAssassin')

// -------------------------------------------------------------
// This route used by Players that registered in person and were given an 8-digit code to "Activate"

router.post('/activateAssassin', function(req, res, next)
{
  console.log("Got into activateAssassin call");

  // Check authentication status
  if (!req.oidc.isAuthenticated())
  {
      console.log("Not authenticated");
      res.render('landing');
      return;
  }

  if (!validateCode(req.body.playerCode))
  {
      console.log("Bad playerCode data found, routing to error page");

      // Render error page, passing in error code
      res.render('errorMessagePage', {result: ERROR_INVALID_PLAYER_OR_TEAM_CODE_FORMAT});
      return;
  }

  // valid player code format
  // Activate the Player, essentially updating the Player table with the email
  dbConn.query('CALL `assassin-demo1`.`activate_player`(?,?)', [req.body.playerCode, req.oidc.user.email], function(err,rows)
  {
      if(err)
      {
          console.log("Error on activate_player rpc call");
          req.flash('error', err);
      } else
      {
          console.log("Successful activate player RPC call, now check return code.");
          console.log(rows);

          // No alerts, only check result
          if (rows[0][0].phone != CALL_SUCCESS)
          {
              // Render error page, passing in error code
              res.render('errorMessagePage', {result: rows[0][0].phone});
              return;
          }
          else // success
          {
            console.log("Full activate player RPC call success.");
            res.oidc.login();  // route Player back to Home
          }
      } // end else

  }); // end query

}); // end router post

// ----------------------------------------------------------
// Route used to attempt a kill.  Passing in the name of your target's target
//
router.post('/validateKill', function(req, res, next)
{
  console.log("Validate Kill called.");

  // Check authentication status
  if (!req.oidc.isAuthenticated())
  {
      console.log("Not authenticated");
      res.render('landing');
      return;
  }

  if (validateString(req.body.myKillName) == false)
  {
      // Render error page, passing in error code
      res.render('errorMessagePage', {result: ERROR_INVALID_PLAYER_NAME});
      return;
  }

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
          if (rows[0][0].phone == CALL_SUCCESS)
          {
              if (rows[0].length > 1)
              {
                  send_text_alerts(rows);
              }
              res.oidc.login(); // send back home to refresh page with new target
          }
          else
          {
            // Render error page, passing in error code
            res.render('errorMessagePage', {result: parseInt(rows[0][0].phone)});
            return;
          }

      } // end else

  }); // end query

}); // end router post validateKill


// -----------------------------------------------------------
// Captain only feature.
//
router.post('/rebuy', function(req, res, next)
{
  console.log("Got into rebuy");

  // Check authentication status
  if (!req.oidc.isAuthenticated())
  {
      console.log("Not authenticated");
      res.render('landing');
      return;
  }

  // call stored procedure
  dbConn.query('CALL `assassin-demo1`.`rebuy`(?,?)', [req.body.myPlayerCode,req.body.myTeamCode], function(err,rows)
  {
      if(err) {
          console.log("Error on rebuy");
          req.flash('error', err);
      }
      else
      {
          console.log("Successful rebuy RPC call.");
          console.log(rows);

          if (rows[0][0].phone == CALL_SUCCESS)
          {
                if (rows[0].length > 1)
                {
                    send_text_alerts(rows);
                }
                res.oidc.login(); // send back home to refresh page, may now be on a new Team
          }
          else
          {
            // Render error page, passing in error code
            res.render('errorMessagePage', {result: parseInt(rows[0][0].phone)});
            return;
          }

      } // end else

  }); // end query

}); // end router post rebuy

// -----------------------------------------------------------
//  Route used for a Bench Player to try to go live
//
router.post('/goLive', function(req, res, next)
{
  console.log("Got into Go Live");

  // Check authentication status
  if (!req.oidc.isAuthenticated())
  {
      console.log("Not authenticated");
      res.render('landing');
      return;
  }

  // Call stored procedure
  dbConn.query('CALL `assassin-demo1`.`go_live`(?,?)', [req.body.myPlayerCode,req.body.myTeamCode], function(err,rows)
  {
      if(err) {
          console.log("Error on Go Live");
          req.flash('error', err);
      } else {
          console.log("Successful Go Live RPC call.");
          console.log(rows);

          // Error checking here if Player couldn't go Live.
          if (rows[0][0].phone == CALL_SUCCESS)
          {
                if (rows[0].length > 1)
                {
                    send_text_alerts(rows);
                }
                res.oidc.login(); // send back home to refresh page, may now be on a new Team
          }
          else
          {
            // Render error page, passing in error code
            res.render('errorMessagePage', {result: parseInt(rows[0][0].phone)});
            return;
          }

      } // end else

  }); // end query

}); // end router post goLive

// -----------------------------------------------------------
// Route used by a Player to try to join a Team
//
router.post('/joinTeam', function(req, res, next)
{
  console.log("Got into Join Team");

  // Check authentication status
  if (!req.oidc.isAuthenticated())
  {
      console.log("Not authenticated");
      res.render('landing');
      return;
  }

  if (!validateCode(req.body.joinTeamCode))
  {
      console.log("Bad data found, routing to error page");

      // Render error page, passing in error code
      res.render('errorMessagePage', {result: ERROR_INVALID_PLAYER_OR_TEAM_CODE_FORMAT});
      return;
  }

   // valid player code format
  // Call stored procedure
  dbConn.query('CALL `assassin-demo1`.`join_team`(?,?)', [req.body.myPlayerCode, req.body.joinTeamCode], function(err,rows)
  {
      if(err) {
          console.log("Error on Join Team");
          req.flash('error', err);
      }
      else
      {
          console.log("Successful Join Team RPC call, now check return code.");
          console.log(rows);

          if (rows[0][0].phone == CALL_SUCCESS)
          {
                if (rows[0].length > 1)
                {
                    send_text_alerts(rows);
                }
                res.oidc.login(); // send back home to refresh page, may now be on a new Team
          }
          else
          {
            // Render error page, passing in error code
            res.render('errorMessagePage', {result: parseInt(rows[0][0].phone)});
            return;
          }

      } // end else

  }); // end query

}); // end router post joinTeam

// -----------------------------------------------------------
// Route used by a Player not currently on a Team.
//
router.post('/createTeam', function(req, res, next)
{
  console.log("Got into Create Team");

  // Check authentication status
  if (!req.oidc.isAuthenticated())
  {
      console.log("Not authenticated");
      res.render('landing');
      return;
  }

  if (validateString(req.body.playerTeamName) == false)
  {
      // Render error page, passing in error code
      res.render('errorMessagePage', {result: ERROR_INVALID_TEAM_NAME});
      return;
  }

  // Call stored procedure
  dbConn.query('CALL `assassin-demo1`.`create_team`(?,?)', [req.body.myPlayerCode, req.body.playerTeamName], function(err,rows)
  {
      if(err) {
          console.log("Error on Create Team");
          req.flash('error', err);
      } else {
          console.log("Successful Create Team RPC call.");

          console.log(rows);

          if (rows[0][0].phone == CALL_SUCCESS)
          {
                res.oidc.login(); // send back home to refresh page, may now be on a new Team
          }
          else
          {
            // Render error page, passing in error code
            res.render('errorMessagePage', {result: parseInt(rows[0][0].phone)});
            return;
          }

      } // end else

  }); // end query

}); // end router post createTeam

// ---------------------------------------------------------
// Route used by a Captain to put Team on Break
//
router.post('/takeBreak', function(req, res, next)
{
  console.log("Got into take break");

  // Check authentication status
  if (!req.oidc.isAuthenticated())
  {
      console.log("Not authenticated");
      res.render('landing');
      return;
  }

  // Call stored procedure, passing in "Break"
  dbConn.query('CALL `assassin-demo1`.`leave_game`(?,?,?)', [req.body.myPlayerCode, req.body.myTeamCode, "Break"], function(err,rows)
  {
      if(err) {
          console.log("Error on take break");
          req.flash('error', err);
      } else
      {
          console.log("Successful take break RPC call.");
          console.log(rows);

          if (rows[0][0].phone == CALL_SUCCESS)
          {
                if (rows[0].length > 1)
                {
                    send_text_alerts(rows);
                }
                res.oidc.login(); // send back home to refresh page, may now be on a new Team
          }
          else
          {
            // Render error page, passing in error code
            res.render('errorMessagePage', {result: parseInt(rows[0][0].phone)});
            return;
          }

      } // end else

  }); // end query

}); // end router post takeBreak

// ---------------------------------------------------------
// Route called by Captain to return from break, if they waited the minimum time
//
router.post('/returnFromBreak', function(req, res, next)
{
  console.log("Got into return from break");

  // Check authentication status
  if (!req.oidc.isAuthenticated())
  {
      console.log("Not authenticated");
      res.render('landing');
      return;
  }

  // Call stored proc
  dbConn.query('CALL `assassin-demo1`.`return_from_break`(?,?)', [req.body.playerCode, req.body.teamCode], function(err,rows)
  {
      if(err) {
          console.log("Error on return from break");
          req.flash('error', err);
      } else
      {
          console.log("Successful return from break RPC call.");
          console.log(rows);

          if (rows[0][0].phone == CALL_SUCCESS)
          {
                if (rows[0].length > 1)
                {
                    send_text_alerts(rows);
                }
                res.oidc.login(); // send back home to refresh page, may now be on a new Team
          }
          else
          {
            // Render error page, passing in error code
            res.render('errorMessagePage', {result: parseInt(rows[0][0].phone)});
            return;
          }

      } // end else, rpc call worked

  }); // end query

}); // end router post returnFromBreak

// ---------------------------------------------------------
// Route called by Captain to add a Player to their Team
//
router.post('/addPlayer', function(req, res, next)
{
  console.log("Got into addPlayer");

  // Check authentication status
  if (!req.oidc.isAuthenticated())
  {
      console.log("Not authenticated");
      res.render('landing');
      return;
  }

  // if (!validateCode(req.body.addPlayerCode))
  if (!validateCode(req.body.playerCode))
  {
      console.log("Bad data found, routing to error page");

      // Render error page, passing in error code
      res.render('errorMessagePage', {result: ERROR_INVALID_PLAYER_OR_TEAM_CODE_FORMAT});
      return;
  }

  // valid player code format
  // Call stored procedure
  dbConn.query('CALL `assassin-demo1`.`add_player_to_team`(?,?,?)', [req.body.myPlayerCode,req.body.myTeamCode,req.body.playerCode], function(err,rows)
  {
      if(err) {
          console.log("Error on add player");
          req.flash('error', err);
      } else {
          console.log("Successful add player RPC call.");
          console.log(rows);

          if (rows[0][0].phone == CALL_SUCCESS)
          {
                if (rows[0].length > 1)
                {
                    send_text_alerts(rows);
                }
                res.oidc.login(); // send back home to refresh page, may now be on a new Team
          }
          else
          {
            // Render error page, passing in error code
            res.render('errorMessagePage', {result: parseInt(rows[0][0].phone)});
            return;
          }

      } // end else

  }); // end query

}); // end router post addPlayer

// ---------------------------------------------------------
// Route called by a Captain to remove player from Team
//
router.post('/removePlayerFromTeam', function(req, res, next)
{
  console.log("Got into removePlayerFromTeam");

  // Check authentication status
  if (!req.oidc.isAuthenticated())
  {
      console.log("Not authenticated");
      res.render('landing');
      return;
  }

  //if (!validateCode(req.body.removePlayerCode))
  if (!validateCode(req.body.playerCode))
  {
      console.log("Bad data found, routing to error page");

      // Render error page, passing in error code
      res.render('errorMessagePage', {result: ERROR_INVALID_PLAYER_OR_TEAM_CODE_FORMAT});
      return;
  }

  // valid player code format
  // Call stored proc
  dbConn.query('CALL `assassin-demo1`.`remove_player_from_team`(?,?,?)', [req.body.myPlayerCode,req.body.myTeamCode,req.body.playerCode], function(err,rows)
  {
      if(err) {
          console.log("Error on removePlayerFromTeam");
          req.flash('error', err);
      }
      else
      {
          console.log("Successful removePlayerFromTeam RPC call, now check return code.");
          console.log(rows);

          if (rows[0][0].phone == CALL_SUCCESS)
          {
              if (rows[0].length > 1)
              {
                  send_text_alerts(rows);
              }
              res.oidc.login(); // send back home to refresh page, may now be on a new Team
          }
          else // Process error code
          {
            // Render error page, passing in error code
            res.render('errorMessagePage', {result: parseInt(rows[0][0].phone)});
            return;
          }

      } // end else successful rpc call

  }); // end query

}); // end router post removePlayerFromTeam

// -----------------------------------------------------------------------
// Route used by Player to Quit game.  Try to resolve Live, Captain gaps
//
router.post('/quitGame', function(req, res, next)
{
  console.log("Got into quitGame");

  // Check authentication status
  if (!req.oidc.isAuthenticated())
  {
      console.log("Not authenticated");
      res.render('landing');
      return;
  }

  // leave_game stored proc handles both Quit and Break, send in the right flag
  dbConn.query('CALL `assassin-demo1`.`leave_game`(?,?,?)', [req.body.myPlayerCode, req.body.myTeamCode, "Quit"], function(err,rows)
  {
      if(err) {
          console.log("Error on quitGame");
          req.flash('error', err);
      } else
      {
          console.log("Successful quitGame RPC call.");
          console.log(rows);

          if (rows[0][0].phone == CALL_SUCCESS)
          {
              if (rows[0].length > 1)
              {
                  send_text_alerts(rows);
              }
              res.oidc.login(); // send back home to refresh page, may now be on a new Team
          }
          else
          {
            // Render error page, passing in error code
            res.render('errorMessagePage', {result: parseInt(rows[0][0].phone)});
            return;
          }

        } // end else

  }); // end query

}); // end router post quitGame

// --------------------------------------------------------------------------------------------------------
// Route called by any Player to view their picture.  Currently no plan to allow editing, just a courtesy
router.post('/managePicture', function(req, res, next)
{
  console.log("Got into managePicture");

  // Check authentication status
  if (!req.oidc.isAuthenticated())
  {
      console.log("Not authenticated");
      res.render('landing');
      return;
  }

  console.log(req.body.playerPic);
  console.log(__dirname);

  var playerPicPath = "../../" + req.body.playerPic;
  console.log(playerPicPath);

  // No stored procedure needed, just load manage template
  res.render('managePicture', {playerCode: req.body.myPlayerCode, myPicture: playerPicPath, picFeature: req.body.picFeature});

}); // end router post managePicture

// -------------------------------------------------------------
// adminShowCreatePrepsPage called by admin to start prep process

router.post('/adminShowCreatePrepsPage', function(req, res, next)
{
    console.log("Got into adminShowCreatePrepsPage call");

    // Check authentication status
    if (!req.oidc.isAuthenticated())
    {
        console.log("Not authenticated");
        res.render('landing');
        return;
    }

    // No stored procedure needed, just display templates page
    res.render('adminCreatePrepTemplates');

});  // end router - adminShowCreatePrepsPage

// --------------------------------------------------------------------------------------------------------
// Route called by admin to create prep templates
//
router.post('/adminCreatePrepTemplateData', function(req, res, next)
{
  console.log("Got into adminCreatePrepTemplateData");

  var num1, num2, num3; // helper vars to make sure the inputs are ints

  // Check authentication status
  if (!req.oidc.isAuthenticated())
  {
      console.log("Not authenticated");
      res.render('landing');
      return;
  }

  // convert string to int
  num1 = parseInt(req.body.num1PlayerTeams);
  num2 = parseInt(req.body.num2PlayerTeams);
  num3 = parseInt(req.body.num3PlayerTeams);

  // Error checking on inputs
  if (!Number.isInteger(num1) || !Number.isInteger(num2) || !Number.isInteger(num3) || (num1 < 0) || (num2 < 0) || (num3 < 0))
  {
      // Render error page, passing in error code
      res.render('errorMessagePage', {result: ERROR_INVALID_PREP_INPUTS});
      return;
  }

  // Retrieve prepped player codes
  dbConn.query('CALL `assassin-demo1`.`admin_create_prepped_teams`(?,?,?)', [num1, num2, num3], function(err,rows)
  {
      if(err)
      {
          console.log("error in adminCreatePrepTemplateData");
          req.flash('error', err);
      } else
      {
          console.log("Successful adminCreatePrepTemplateData RPC call.");
          console.log(rows);
          res.oidc.login(); // route back to login - may need to check return code zzz
      } // end else successful call

  });  // end stored procedure call

}); // end router post adminCreatePrepTemplateData

// --------------------------------------------------------------------------------------------------------
// Route called to show Activate Team Template for admin
//
router.post('/adminActivateTeamPrep', function(req, res, next)
{
  var tempTeamCode; // store original team code passed in because multiple mysql calls made

  console.log("Got into adminActivateTeamPrep");

  // Check authentication status
  if (!req.oidc.isAuthenticated())
  {
      console.log("Not authenticated");
      res.render('landing');
      return;
  }

  console.log(req.body.teamCode);

  tempTeamCode = req.body.teamCode;

  // Retrieve prepped player codes
  dbConn.query('CALL `assassin-demo1`.`admin_get_prepped_team_player_codes`(?)', req.body.teamCode, function(err,rows)
  {
      if(err)
      {
          console.log("error in get_prepped_team_player_codes");
          req.flash('error', err);
      } else
      {
          console.log("Successful get_prepped_team_player_codes RPC call.");
          console.log(rows);

          if (rows[0].length == 3)
          {
              res.render('adminActivateTeamTemplate', {
                teamCode: tempTeamCode,
                p1Code: rows[0][0]['player-code'],
                p2Code: rows[0][1]['player-code'],
                p3Code: rows[0][2]['player-code']});
          }
          else
          {
              if (rows[0].length == 2)
              {
                res.render('adminActivateTeamTemplate', {
                  teamCode: tempTeamCode,
                  p1Code: rows[0][0]['player-code'],
                  p2Code: rows[0][1]['player-code'],
                  p3Code: ""});
              }
              else {
                res.render('adminActivateTeamTemplate', {
                  teamCode: tempTeamCode,
                  p1Code: rows[0][0]['player-code'],
                  p2Code: "",
                  p3Code: ""});

              } // end else team of 1

          } // end else team size is 1 or 2

      } // end else successful call

  });  // end stored procedure call

}); // end router post adminActivateTeamPrep

// -------------------------------------------------------------
// activateTeam called by admin after registering a Team in person

router.post('/adminActivateTeam', function(req, res, next)
{
    console.log("Got into new adminActivateTeam call");

    // Check authentication status
    if (!req.oidc.isAuthenticated())
    {
        console.log("Not authenticated");
        res.render('landing');
        return;
    }

    // Possibly check for valid inputs here, but already filtered at ui level

    // helper vars for uploading photo files
    let playerPhotoFile;
    let uploadPath;

    // var helper files to prevent trying to send blank data to Node
    var p2Code = 0;
    var p2Name = "";
    var p2Phone = "";
    var p2Photo = "";
    var p2Celeb = "";

    var p3Code = 0;
    var p3Name = "";
    var p3Phone = "";
    var p3Photo = "";
    var p3Celeb = "";

    // prep player 2
    if (Object.keys(req.files).length > 1)
    {
        p2Code = req.body.player2Code;
        p2Name = req.body.player2Name;
        p2Phone = req.body.player2Phone;
        p2Photo = req.files.player2PhotoFile.name;
        p2Celeb = req.body.player2Celeb;
    }

    // prep player 3
    if (Object.keys(req.files).length > 2)
    {
        p3Code = req.body.player3Code;
        p3Name = req.body.player3Name;
        p3Phone = req.body.player3Phone;
        p3Photo = req.files.player3PhotoFile.name;
        p3Celeb = req.body.player3Celeb;
    }

    // Check if photo file was passed in correctly
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
    }

    // Call stored procedure to activate the Team, if call succeeds, upload photos
    dbConn.query('CALL `assassin-demo1`.`admin_activate_team`(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [req.body.activatedTeamCode, req.body.teamName, req.body.captainCode, req.body.captainName, req.body.captainPhone, req.files.captainPhotoFile.name, req.body.captainCeleb, p2Code, p2Name, p2Phone, p2Photo, p2Celeb, p3Code, p3Name, p3Phone, p3Photo, p3Celeb], function(err,rows)
    {
        if(err)
        {
            console.log("Error on admin_activate_team call.");
            req.flash('error', err);
        } else
        {
            // admin_activate_team worked
            console.log("admin_activate_team rpc worked, check return code, upload photos.");
            console.log(rows);

            // check result, return if error
            if (rows[0][0].phone != CALL_SUCCESS)
            {
                // Render error page, passing in error code
                res.render('errorMessagePage', {result: parseInt(rows[0][0].phone)});
                return;
            }

            // Start processing  Captain
            playerPhotoFile = req.files.captainPhotoFile;
            uploadPath = __dirname + '/../public/photos/' + playerPhotoFile.name;  // might want to clean up this directory logic

            console.log(uploadPath);

            // Use mv() to place file on the server - captain first
            playerPhotoFile.mv(uploadPath, function (err)
            {
                if (err)
                {
                  console.log("Error on captain file upload");
                  return res.status(500).send(err);
                }
                else
                {
                    console.log("Successful Captain file upload");

                    if (Object.keys(req.files).length > 1 )
                    {
                        // Upload second file
                        playerPhotoFile = req.files.player2PhotoFile;
                        uploadPath = __dirname + '/../public/photos/' + playerPhotoFile.name;  // might want to clean up this directory logic

                        console.log(uploadPath);

                        // Use mv() to place file on the server
                        playerPhotoFile.mv(uploadPath, function (err)
                        {
                            if (err)
                            {
                              console.log("Error on player 2 file upload");
                              return res.status(500).send(err);
                            }
                            else
                            {
                                console.log("Successful player 2 file upload");

                                if (Object.keys(req.files).length > 2 )
                                {
                                    // Upload third file
                                    playerPhotoFile = req.files.player3PhotoFile;
                                    uploadPath = __dirname + '/../public/photos/' + playerPhotoFile.name;  // might want to clean up this directory logic

                                    console.log(uploadPath);

                                    // Use mv() to place file on the server
                                    playerPhotoFile.mv(uploadPath, function (err)
                                    {
                                        if (err)
                                        {
                                          console.log("Error on player 3 file upload");
                                          return res.status(500).send(err);
                                        }
                                        else
                                        {
                                          console.log("Successful player 3 file upload");
                                          res.oidc.login(); // route back to login
                                        }

                                    }); // end player 3 mv

                                } // end files len > 2
                                else {
                                  res.oidc.login(); // route back to login
                                }

                            }  // end else success player 2

                        });

                    } // end if file len > 1
                    else
                    {
                      res.oidc.login(); // route back to login
                    }

                } // else first upload

            });   // captain mv file end

        } // end first else create player worked, start uploads

    });  // end admin_activate_team stored procedure call

}); // end post('/activateTeam')

// -------------------------------------------------------------
// adminSearchForTeam called by admin to find a team based on code, name, or player name

router.post('/adminSearchForTeam', function(req, res, next)
{
    console.log("Got into adminSearchForTeam call");

    // Check authentication status
    if (!req.oidc.isAuthenticated())
    {
        console.log("Not authenticated");
        res.render('landing');
        return;
    }

    // var helper files to prevent trying to send blank data to Node
    var tempTeamCode = 0;
    var tempPlayerCode = 0;
    var tempTeamName = "";
    var tempPlayerName = "";

    if (req.body.teamCode != "")
    {
        tempTeamCode = req.body.teamCode;
    }

    if (req.body.playerCode != "")
    {
        tempPlayerCode = req.body.playerCode;
    }

    // Call stored procedure to search for the team
    dbConn.query('CALL `assassin-demo1`.`admin_search_for_team`(?,?,?,?)', [req.body.teamName, req.body.playerName, tempTeamCode, tempPlayerCode], function(err,rows)
    {
        if(err)
        {
            console.log("Error on search_for_team call.");
            req.flash('error', err);
        } else
        {
            // admin_search_for_team rpc worked
            console.log("search_for_team successful rpc call.");

            // Check results, if only 1 Team, go directly to that edit Team page, otherwise show list of matching teams and let Admin pick
            console.log(rows);

            if (rows[0].length == 1)
            {
                // Only 1 team found, go to Team Home
                res.render('adminTeamHome',
                {
                    teamCode: rows[0][0]['team-code'],
                    teamName: rows[0][0]['team-name'],
                    teamStatus: rows[0][0]['team-status'],
                    bountiesOwed: rows[0][0]['bounties-owed'],
                    captainCode: rows[0][0]['player-code'],
                    captainName: rows[0][0]['player-name']
                });

            }
            else
            {
                // more than 1 team found, show Team List
                if (rows[0].length > 1)
                {
                    console.log("-----------------------");
                    console.log(rows[0]);

                    res.render('adminTeamList',
                    {
                        teams: rows[0]
                    });

                }
                else
                {
                    // Render error page, passing in error code
                    res.render('errorMessagePage', {result: ERROR_TEAM_NOT_FOUND_OR_QUIT});
                    return;
                }

            } // end else either 0 or more than 1 team found

        } // end else successful rpc

    }); // end stored proc call

});  // end router post - adminSearchForTeam

// -------------------------------------------------------------
// adminSearchForPlayer called by admin to find a Player based on player code, team name, or player name

router.post('/adminSearchForPlayer', function(req, res, next)
{
    console.log("Got into adminSearchForPlayer call");

    // Check authentication status
    if (!req.oidc.isAuthenticated())
    {
        console.log("Not authenticated");
        res.render('landing');
        return;
    }

    // var helper files to prevent trying to send blank data to Node
    var tempTeamName = "";
    var tempPlayerName = "";
    var tempPlayerCode = 0;
    var tempTeamCode = 0;
    var playerPicPath;

    if (req.body.teamName != "")
    {
        tempTeamName = req.body.teamName;
    }

    if (req.body.playerName != "")
    {
        tempPlayerName = req.body.playerName;
    }

    if (req.body.playerCode != "")
    {
        tempPlayerCode = req.body.playerCode;
    }

    if (req.body.teamCode != "")
    {
        tempTeamCode = req.body.teamCode;
    }
    
    // Call stored procedure to search for the player
    dbConn.query('CALL `assassin-demo1`.`admin_search_for_player`(?,?,?,?)', [tempTeamName, tempPlayerName, tempPlayerCode, tempTeamCode], function(err,rows)
    {
        if(err)
        {
            console.log("Error on adminSearchForPlayer call.");
            req.flash('error', err);
        } else
        {
            // adminSearchForPlayer worked, now inspect data
            console.log("adminSearchForPlayer successful rpc call.");

            console.log(rows);

            // Check results, if only 1 player, go directly to that edit player page, otherwise show list of matching players and let Admin pick
            console.log(rows[0].length);

            if (rows[0].length == 1)
            {
                playerPicPath = "../../" + rows[0][0]['player-pic'];

                res.render('adminPlayerHome',
                {
                    teamCode: rows[0][0]['team-code'],
                    teamName: rows[0][0]['team-name'],
                    teamStatus: rows[0][0]['team-status'],
                    playerPhoto: playerPicPath,
                    playerCode: rows[0][0]['player-code'],
                    playerName: rows[0][0]['player-name'],
                    playerStatus: rows[0][0]['player-status'],
                    playerPhone: rows[0][0]['phone-number'],
                    photoStatus: rows[0][0]['picture-status'],
                    celebritarian: rows[0][0]['celeb']
                });

            }
            else
            {

                if (rows[0].length > 1)
                {
                    console.log("-----------------------");
                    console.log(rows[0]);

                    res.render('adminPlayerList',
                    {
                        players: rows[0]
                    });
                }
                else
                {
                    // Render error page, passing in error code
                    res.render('errorMessagePage', {result: ERROR_PLAYER_NOT_FOUND_OR_NOT_ON_TEAM});
                    return;
                }

            } // end else rows not = 1

        } // end else - adminSearchForPlayer call

    });  // end stored procedure call

});  // end route adminSearchForPlayer

// -------------------------------------------------------------
// adminApprovePicture called by admin to approve a players pic
//
router.post('/adminApprovePicture', function(req, res, next)
{
    console.log("Got into adminApprovePicture call");

    // Check authentication status
    if (!req.oidc.isAuthenticated())
    {
        console.log("Not authenticated");
        res.render('landing');
        return;
    }

    // Call stored procedure to approve picture
    dbConn.query('CALL `assassin-demo1`.`admin_approve_picture`(?)', req.body.playerCode, function(err,rows)
    {
        if(err)
        {
            console.log("Error on adminApprovePicture call.");
            req.flash('error', err);
        } else
        {
            // adminApprovePicture worked
            console.log("adminApprovePicture successful rpc call.");

            if (rows[0][0].phone == CALL_SUCCESS)
            {
                  if (rows[0].length > 1)
                  {
                      send_text_alerts(rows);
                  }

                  // If part of bulk approval, keep checking, otherwise route back home
                  if (req.body.oneOrMorePhotos == "One")
                    res.oidc.login();
                  else
                    checkForUploadedPhotos(res);
            }
            else
            {
              // Render error page, passing in error code
              res.render('errorMessagePage', {result: parseInt(rows[0][0].phone)});
              return;
            }

        } // end else

    }); // end stored procedure call

});  // end router post - adminApprovePicture

// -------------------------------------------------------------
// adminRejectPicture called by admin to approve a players pic

router.post('/adminRejectPicture', function(req, res, next)
{
    console.log("Got into adminRejectPicture call");

    // Check authentication status
    if (!req.oidc.isAuthenticated())
    {
        console.log("Not authenticated");
        res.render('landing');
        return;
    }

    // Call stored procedure to reject picture
    dbConn.query('CALL `assassin-demo1`.`admin_reject_picture`(?)', req.body.playerCode, function(err,rows)
    {
        if(err)
        {
            console.log("Error on adminRejectPicture call.");
            req.flash('error', err);
        } else
        {
            // adminRejectPicture worked
            console.log("adminRejectPicture successful rpc call.");
            console.log(rows);

            if (rows[0][0].phone == CALL_SUCCESS)
            {
                  if (rows[0].length > 1)
                  {
                      send_text_alerts(rows);
                  }

                  // If part of bulk approval, keep checking, otherwise route back home
                  if (req.body.oneOrMorePhotos == "One")
                    res.oidc.login();
                  else
                    checkForUploadedPhotos(res);
            }
            else
            {
              // Render error page, passing in error code
              res.render('errorMessagePage', {result: parseInt(rows[0][0].phone)});
              return;
            }

        } // end else

    });  // end stored procedure

});  // end router - adminRejectPicture

// -------------------------------------------------------------
// adminChoosePhoto called by admin ?

router.post('/adminChoosePhoto', function(req, res, next)
{
    console.log("Got into adminChoosePhoto call");

    // Check authentication status
    if (!req.oidc.isAuthenticated())
    {
        console.log("Not authenticated");
        res.render('landing');
        return;
    }

    // No stored procedure needed, just display my pic
    res.render('adminChoosePhoto', {playerCode: req.body.playerCode});

});  // end router - adminChoosePhoto

// -------------------------------------------------------------
// uploadPhoto called by admin or player to upload photo

router.post('/uploadPhoto', function(req, res, next)
{
    console.log("Got into uploadPhoto call");

    // Check authentication status
    if (!req.oidc.isAuthenticated())
    {
        console.log("Not authenticated");
        res.render('landing');
        return;
    }

    // helper vars for uploading photo files
    let playerPhotoFile;
    let uploadPath;

    // Check if photo file was passed in correctly
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
    }

    // Call stored procedure to upload photo data, if call succeeds, then upload photo
    dbConn.query('CALL `assassin-demo1`.`upload_photo_data`(?,?,?)', [req.body.playerCode, req.files.playerPhotoFile.name, req.body.userType], function(err,rows)
    {
        if(err)
        {
            console.log("Error on uploadPhoto data call.");
            req.flash('error', err);
        } else
        {
            //  upload photo data worked
            console.log("upload_photo_data rpc worked, now upload photo.");

            // need real error checking here zzz - check return code

            // name of the input is playerPhotoFile
            playerPhotoFile = req.files.playerPhotoFile;
            uploadPath = __dirname + '/../public/photos/' + playerPhotoFile.name;  // might want to clean up this directory logic

            console.log(uploadPath);

            // Use mv() to place file on the server
            playerPhotoFile.mv(uploadPath, function (err)
            {
                if (err)
                {
                  console.log("Error on photo file upload");
                  return res.status(500).send(err);
                }
                else
                {
                    console.log("Successful photo file upload");
                    res.oidc.login();

                } // else first upload

            });

        } // end else upload_photo_data worked

    });  // end stored procedure call

});  // end router - uploadPhoto

// -------------------------------------------------------------
// adminPayBounties called by admin to update team data including paying out bounties

router.post('/adminPayBounties', function(req, res, next)
{
  console.log("Got into new adminPayBounties call");

  var tempBounties = parseInt(req.body.numBounties);

  console.log(tempBounties);
  console.log(Number.isInteger(tempBounties));

  // Check authentication status
  if (!req.oidc.isAuthenticated())
  {
      console.log("Not authenticated");
      res.render('landing');
      return;
  }

  if (!Number.isInteger(tempBounties) || (tempBounties <=0))
  {
      // Render error page, passing in error code
      res.render('errorMessagePage', {result: ERROR_INVALID_BOUNTY_PAYOUT});
      return;
  }

  // Call stored procedure to pay bounties
  dbConn.query('CALL `assassin-demo1`.`admin_pay_bounties`(?,?)', [req.body.teamCode, req.body.numBounties], function(err,rows)
  {
      if(err)
      {
          console.log("Error on admin_pay_bounties call.");
          req.flash('error', err);
      } else
      {
          // Create Player worked, now upload photo
          console.log("admin_pay_bounties rpc worked.");

          if (rows[0][0].phone == CALL_SUCCESS)
          {
              res.oidc.login(); // send back home to refresh page
          }
          else
          {
              // Render error page, passing in error code
              res.render('errorMessagePage', {result: parseInt(rows[0][0].phone)});
              return;
          }

      } // end else

  }); // end query

}); // end post('/adminPayBounties')

// -------------------------------------------------------------
// adminMarkPaid called by admin to update team data including paying out bounties

router.post('/adminMarkPaid', function(req, res, next)
{
  console.log("Got into new adminMarkPaid call");

  // Check authentication status
  if (!req.oidc.isAuthenticated())
  {
      console.log("Not authenticated");
      res.render('landing');
      return;
  }

  // Call stored procedure to mark team paid
  dbConn.query('CALL `assassin-demo1`.`admin_mark_paid`(?)', req.body.teamCode, function(err,rows)
  {
      if(err)
      {
          console.log("Error on adminMarkPaid call.");
          req.flash('error', err);
      } else
      {
          // adminMarkPaid worked
          console.log("adminMarkPaid rpc worked.");
          console.log(rows);

          if (rows[0][0].phone == CALL_SUCCESS)
          {
                if (rows[0].length > 1)
                {
                    send_text_alerts(rows);
                }
                res.oidc.login(); // send back home to refresh page, may now be on a new Team
          }
          else
          {
            // Render error page, passing in error code
            res.render('errorMessagePage', {result: parseInt(rows[0][0].phone)});
            return;
          }

      } // end else

  }); // end query

}); // end router post adminMarkPaid


// -------------------------------------------------------------
// adminMarkPaidAndApprovePhoto is called by admin

router.post('/adminMarkPaidAndApprovePhoto', function(req, res, next)
{
  console.log("Got into new adminMarkPaidAndApprovePhoto call");

  // Check authentication status
  if (!req.oidc.isAuthenticated())
  {
      console.log("Not authenticated");
      res.render('landing');
      return;
  }

  // Call stored procedure to mark team paid
  dbConn.query('CALL `assassin-demo1`.`admin_mark_paid`(?)', req.body.teamCode, function(err,rows)
  {
      if(err)
      {
          console.log("Error on adminMarkPaid call.");
          req.flash('error', err);
      } else
      {
          // adminMarkPaid worked, now check return code and call approve pic
          console.log("adminMarkPaid rpc worked.");

          // check return code here, continue with approve photo if ok
          if (rows[0][0].phone == CALL_SUCCESS)
          {
              if (rows[0].length > 1)
              {
                  send_text_alerts(rows);
              }

              // Call stored procedure to approve picture
              dbConn.query('CALL `assassin-demo1`.`admin_approve_picture`(?)', req.body.playerCode, function(err,rows)
              {
                  if(err)
                  {
                      console.log("Error on adminApprovePicture call.");
                      req.flash('error', err);
                  } else
                  {
                      // adminApprovePicture worked, check return code
                      console.log("adminApprovePicture successful rpc call.");
                      console.log(rows);

                      if (rows[0][0].phone == CALL_SUCCESS)
                      {
                            if (rows[0].length > 1)
                            {
                                send_text_alerts(rows);
                            }
                            res.oidc.login(); // send back home to refresh page
                      }
                      else
                      {
                        // Render error page, passing in error code
                        res.render('errorMessagePage', {result: parseInt(rows[0][0].phone)});
                        return;
                      }
                  } // end else

              }); // end stored procedure call

          }
          else
          {
            // Render error page, passing in error code
            res.render('errorMessagePage', {result: parseInt(rows[0][0].phone)});
            return;
          }

      } // end else

  }); // end query

}); // end router post adminMarkPaidAndApprovePhoto

// --------------------------------------------------------------------------------------------------------
// Route called by admin to edit player data
router.post('/adminEditPlayerData', function(req, res, next)
{
    console.log("Got into adminEditPlayerData");

    // Check authentication status
    if (!req.oidc.isAuthenticated())
    {
        console.log("Not authenticated");
        res.render('landing');
        return;
    }

    res.render('adminEditPlayerData', {playerCode: req.body.playerCode, playerName: req.body.playerName, celebritarian: req.body.celebritarian, playerPhone: req.body.playerPhone });

}); // end router post editPlayerData

// ---------------------------------------------------------
// Route called by admin to update player data
//
router.post('/adminUpdatePlayerData', function(req, res, next)
{
  var tempCeleb = "off";  // req.body.celebritarian is being passed in as undefined when unchecked

  // helper var to check and format phone number
  var tempPlayerPhone;

  console.log("Got into updatePlayerData");

  // Check authentication status
  if (!req.oidc.isAuthenticated())
  {
      console.log("Not authenticated");
      res.render('landing');
      return;
  }

  if (req.body.celebritarian == "on")
    tempCeleb = "on";

  tempPlayerPhone = validatePhone(req.body.playerPhone); // comes back formatted

  if (tempPlayerPhone == null)
  {
      // Render error page, passing in error code
      res.render('errorMessagePage', {result: ERROR_INVALID_PHONE_NUMBER});
      return;
  }

  console.log(tempCeleb);

  // Call stored procedure
  dbConn.query('CALL `assassin-demo1`.`admin_update_player_data`(?,?,?,?)', [req.body.playerCode, req.body.playerName, tempPlayerPhone, tempCeleb], function(err,rows)
  {
      if(err) {
          console.log("Error on update_player_data");
          req.flash('error', err);
      } else {
          console.log("Successful update_player_data RPC call.");

          // should check return code here zzz

          console.log(rows);
          res.oidc.login(); // send back home to refresh page
      } // end else

  }); // end query

}); // end router post update_player_data

// ---------------------------------------------------------
// Route called by admin to update player team
//
router.post('/adminUpdateTeamName', function(req, res, next)
{

  console.log("Got into adminUpdateTeamName");

  // Check authentication status
  if (!req.oidc.isAuthenticated())
  {
      console.log("Not authenticated");
      res.render('landing');
      return;
  }

  // Call stored procedure
  dbConn.query('CALL `assassin-demo1`.`admin_update_team_name`(?,?)', [req.body.teamCode, req.body.teamName], function(err,rows)
  {
      if(err) {
          console.log("Error on admin_update_team_name");
          req.flash('error', err);
      } else {
          console.log("Successful admin_update_team_name RPC call.");
          console.log(rows);

          //  should check return code here

          res.oidc.login(); // send back home to refresh page
      } // end else

  }); // end query

}); // end router post update_player_data

// --------------------------------------------------------------------------------------------------------
// Route called by player to edit phone number
router.post('/addPlayerPhoneNumber', function(req, res, next)
{
    console.log("Got into addPlayerPhoneNumber");

    // Check authentication status
    if (!req.oidc.isAuthenticated())
    {
        console.log("Not authenticated");
        res.render('landing');
        return;
    }

    res.render('editPlayerPhone', {playerCode: req.body.myPlayerCode, playerPhone: ""});

}); // end router post addPlayerPhoneNumber

// --------------------------------------------------------------------------------------------------------
// Route called by player to edit phone number
router.post('/editPlayerPhoneNumber', function(req, res, next)
{
    console.log("Got into editPlayerPhoneNumber");

    // Check authentication status
    if (!req.oidc.isAuthenticated())
    {
        console.log("Not authenticated");
        res.render('landing');
        return;
    }

    res.render('editPlayerPhone', {playerCode: req.body.myPlayerCode, playerPhone: req.body.myPhoneNumber});

}); // end router post editPlayerPhoneNumber

// ---------------------------------------------------------
// Route called by player to update phone
//
router.post('/updatePlayerPhone', function(req, res, next)
{

  console.log("Got into updatePlayerPhone");

  // helper var to check and format phone number
  var tempPlayerPhone;

  // Check authentication status
  if (!req.oidc.isAuthenticated())
  {
      console.log("Not authenticated");
      res.render('landing');
      return;
  }

  tempPlayerPhone = validatePhone(req.body.playerPhone); // comes back formatted

  if (tempPlayerPhone == null)
  {
      // Render error page, passing in error code
      res.render('errorMessagePage', {result: ERROR_INVALID_PHONE_NUMBER});
      return;
  }

  console.log(req.body.playerCode);

  // Call stored procedure
  dbConn.query('CALL `assassin-demo1`.`update_player_phone`(?,?)', [req.body.playerCode, tempPlayerPhone], function(err,rows)
  {
      if(err) {
          console.log("Error on updatePlayerPhone");
          req.flash('error', err);
      } else
      {
          console.log("Successful updatePlayerPhone RPC call.");
          console.log(rows);

          if (rows[0][0].phone == CALL_SUCCESS)
          {
              res.oidc.login(); // send back home to refresh page
          }
          else
          {
              // Render error page, passing in error code
              res.render('errorMessagePage', {result: parseInt(rows[0][0].phone)});
              return;
          }
      } // end else

  }); // end query

}); // end router post updatePlayerPhone

// ---------------------------------------------------------
// Route called by player to remove phone
//
router.post('/removePlayerPhoneNumber', function(req, res, next)
{

  console.log("Got into removePlayerPhone");

  // Check authentication status
  if (!req.oidc.isAuthenticated())
  {
      console.log("Not authenticated");
      res.render('landing');
      return;
  }

  console.log(req.body.myPlayerCode);

  // Call stored procedure
  dbConn.query('CALL `assassin-demo1`.`remove_player_phone`(?)', req.body.myPlayerCode, function(err,rows)
  {
      if(err) {
          console.log("Error on removePlayerPhone");
          req.flash('error', err);
      } else
      {
          console.log("Successful removePlayerPhone RPC call.");
          console.log(rows);

          if (rows[0][0].phone == CALL_SUCCESS)
          {
              res.oidc.login(); // send back home to refresh page
          }
          else
          {
              // Render error page, passing in error code
              res.render('errorMessagePage', {result: parseInt(rows[0][0].phone)});
              return;
          }
      } // end else

  }); // end query

}); // end router post removePlayerPhone

// -------------------------------------------------------------
// adminBulkPictureApprove called by admin to review all uploaded pics

router.post('/adminBulkPictureApprove', function(req, res, next)
{
    console.log("Got into new adminBulkPictureApprove call");

    // Check authentication status
    if (!req.oidc.isAuthenticated())
    {
        console.log("Not authenticated");
        res.render('landing');
        return;
    }

    // simply call helper function to review 1 uploaded photo
    checkForUploadedPhotos(res);

}); // end post(bulk picture approve)

// -------------------------------------------------------------
// adminDropBomb called by admin to drop a bomb

router.post('/adminDropBomb', function(req, res, next)
{
  console.log("Got into new adminDropBomb call");

  // Check authentication status
  if (!req.oidc.isAuthenticated())
  {
      console.log("Not authenticated");
      res.render('landing');
      return;
  }

  // Call stored procedure to drop bomb
  dbConn.query('CALL `assassin-demo1`.`admin_drop_bomb`()', function(err,rows)
  {
      if(err)
      {
          console.log("Error on adminDropBomb call.");
          req.flash('error', err);
      } else
      {
          // adminDropBomb worked
          console.log("adminDropBomb rpc worked.");
          console.log(rows);

          // check return code here zzz

          if (rows[0].length > 1)
          {
              send_text_alerts(rows);
          }
          res.oidc.login();
      } // end else

  }); // end query

}); // end post(drop bomb)

// -------------------------------------------------------------
// systemCheckForceShiftChange called by "system" to force shift changes

router.post('/systemCheckForceShiftChange', function(req, res, next)
{
  console.log("Got into new systemCheckForceShiftChange call");

  // Check authentication status
  if (!req.oidc.isAuthenticated())
  {
      console.log("Not authenticated");
      res.render('landing');
      return;
  }

  if ((req.body.hoursToGo != 1) && (req.body.hoursToGo != 2))
  {
      // Render error page, passing in error code
      res.render('errorMessagePage', {result: ERROR_INVALID_HOURS_TO_GO});
      return;
  }

  // Call stored procedure check_for_forced_shift_changes
  dbConn.query('CALL `assassin-demo1`.`system_check_for_forced_shift_changes`(?)', req.body.hoursToGo, function(err,rows)
  {
      if(err)
      {
          console.log("Error on system_check_for_forced_shift_changes call.");
          req.flash('error', err);
      } else
      {
          // Create Player worked, now upload photo
          console.log("system_check_for_forced_shift_changes rpc worked.");
          console.log(rows);

          if (rows[0][0].phone == CALL_SUCCESS)
          {
              if (rows[0].length > 1)
              {
                  send_text_alerts(rows);
              }
              res.oidc.login(); // send back home to refresh page
          }
          else
          {
            // Render error page, passing in error code
            res.render('errorMessagePage', {result: parseInt(rows[0][0].phone)});
            return;
          }

      } // end else

  }); // end query

}); // end post('/systemCheckForceShiftChange')

// -------------------------------------------------------------
// resetdb called during development/testing

router.post('/resetDatabase', function(req, res, next)
{
  console.log("Got into resetDatabase call");

  // Check authentication status
  if (!req.oidc.isAuthenticated())
  {
      console.log("Not authenticated");
      res.render('landing');
      return;
  }

  // Call stored procedure to resetDatabase
  dbConn.query('CALL `assassin-demo1`.`reset_database`()', function(err,rows)
  {
      if(err)
      {
          console.log("Error on resetDatabase call.");
          req.flash('error', err);
      } else
      {
          // resetDatabase worked
          console.log("resetDatabase rpc worked.");
          res.oidc.login();
      } // end else

  }); // end query

}); // end post(resetDatabase)

// -------------------------------------------------------------
// Test route to test new code changes to ejs layer

router.post('/test', function(req, res, next)
{
  console.log("Got into new test call");

}); // end test

// -------------------------------------------------------------

function send_text_alerts(rows)
{
  console.log("Got into send text alerts -------------");

  const client = require('twilio')('AC6c336c0b5f8641ab2a38d3ef0e5d2c74', 'a16111cee23bdcd8ddaac3f349e0c5f4');

  var i;
  var decodedMessage;

  for (i=0; i<rows[0].length-1; i++)
  {
      switch(rows[0][i+1].eventCode)
      {

          case EVENT_ASSASSINATION:
            console.log("Your Team has made a successful assassination!");
            decodedMessage = "Your Team has made a successful assassination! Log into Assassin to view your new Target.";
            break;

          case EVENT_WAITING_TO_LIVE:
            console.log("Your Team has moved from Waiting Status to Live!");
            decodedMessage = "Your Team has moved from Waiting Status to Live! Log into Assassin to view your Target.";
            break;

          case EVENT_ASSASSINATED:
            console.log("Your Team has been assassinated!");
            decodedMessage = "Your Team has been assassinated. Log into Assassin to rebuy if you have available bounties.";
            break;

            case EVENT_NEW_GO_LIVE:
              console.log("Your Team has a new Live Player.");
              decodedMessage = "Your Team has a new Live Player. Log into Assassin to the change.";
              break;

            case EVENT_NEW_REBUY:
              console.log("Your Team did a Rebuy and has been moved to Waiting Status.");
              decodedMessage = "Your Team did a Rebuy and has been moved to Waiting Status!";
              break;

            case EVENT_RETURN_FROM_BREAK_TO_WAITING:
              console.log("Your Team has returned from Break and is in Waiting Status.");
              decodedMessage = "Your Team has returned from Break and is in Waiting Status.";
              break;

            case EVENT_REMOVED_FROM_TEAM:
              console.log("You have been removed from your Team.");
              decodedMessage = "You have been removed from your Team. You may join another Team or create a new Team.";
              break;

            case EVENT_TEAMMATE_REMOVED:
              console.log("One of your teammates has been removed from your Team.");
              decodedMessage = "One of your teammates has been removed from your Team. Log into Assassin to view the change.";
              break;

            case EVENT_ADDED_TO_TEAM:
              console.log("You have been added to a Team!");
              decodedMessage = "You have been added to a Team! Log into Assassin to view the change.";
              break;

            case EVENT_NEW_TEAMMATE:
              console.log("Your Team has a new Player!");
              decodedMessage = "Your Team has a new Player! Log into Assassin to view the change.";
              break;

            case EVENT_TEAM_ON_BREAK:
              console.log("Your Team is now on Break!");
              decodedMessage = "Your Team is now on Break. Log into Assassin to view the change.";
              break;

            case EVENT_SOMEONE_ON_TEAM_QUIT:
              console.log("A Player on your Team has quit!");
              decodedMessage = "A Player on your Team has quit. Log into Assassin to view the change.";
              break;

            case EVENT_NEW_TARGET:
              console.log("Your Team has a new Target!");
              decodedMessage = "Your Team has a new Target. Log into Assassin to view the change.";
              break;

            case EVENT_BOMB_DROPPED:
              console.log("A Bomb was dropped!");
              decodedMessage = "A Bomb was dropped. Log into Assassin to view your new Target.";
              break;

            case EVENT_PHOTO_REJECTED:
              console.log("Your photo was rejected!");
              decodedMessage = "Your photo was rejected. Please upload a new one.";
              break;

            case EVENT_GAME_START:
              console.log("The Assassin Game has started!");
              decodedMessage = "The Assassin Game has started!";
              break;

            case EVENT_GAME_END:
              console.log("The Assassin Game has ended!");
              decodedMessage = "The Assassin Game has ended!  Please see the Admin as soon as possible if you have a payout.";
              break;

            case EVENT_MOVED_TO_WAITING:
              console.log("Your Team has been moved to the Waiting Area!");
              decodedMessage = "Your Team has been moved to the Waiting Area!  You will enter the Game on the next major event.";
              break;

          default:
            console.log("Unkown event. Code = " + rows[0][i].eventCode);
            decodedMessage = "Assassin event, log in to view any changes.";
        }

      // client.messages
      // .create({
      //      body: decodedMessage,
      //      from: '+13204001605',
      //      to: rows[0][i+1].phone
      //  })
      // .then(message => console.log(message.sid));

    } // end for loop
}

// ------------------------------------------------------------

function checkForUploadedPhotos(res)
{
  // Call stored procedure to get uploaded photo info
  dbConn.query('CALL `assassin-demo1`.`admin_get_first_uploaded_photo_and_count`()', function(err,rows)
  {
      if(err)
      {
          console.log("Error on bulk picture approve call.");
          req.flash('error', err);
      } else
      {
          // bulk picture approve worked
          console.log("bulk picture approve rpc worked.");
          console.log(rows);
          console.log(rows[0][0].numUploadedPhotos);
          console.log(rows[0][0].playerCode);
          console.log(rows[0][0].photoFilename);

          if (rows[0][0].numUploadedPhotos > 0)
          {
            console.log("At least 1 photo to review.")
            res.render('adminBulkPictureApprove', {playerCode: rows[0][0].playerCode, photoFilename: rows[0][0].photoFilename});
          }
          else
          {
            res.oidc.login();
          }
      } // end else

  }); // end query

} // end function checkForUploadedPhotos

// -------------------------------------------------------------
// Called by Node layer to validate the format only of the code.  Must be an 8 digit integer.
//
function validateCode(code)
{
  var test1 = !isNaN(code);   // check if the string passed in is a number
  var num;

  console.log("Validating: " + code);

  if (test1)  // if it is a number, convert to
  {
    num = parseFloat(code); // convert string to a float number

    // now check if the float is really an int and within the size range
    return ((Number.isInteger(num)) && (num > 0) && (num < 100000000));
  }
  else {
    return false; // invalid format
  }

} // end function validateCode

// -------------------------------------------------------------
// Called by Node layer to validate the format only of a text string input

function validateString(inString)
{
    console.log("Length of string is " + inString.length);

    // only allow non-empty strings, right size, only letters and spaces
    return ((typeof inString === 'string') && (inString.length > 0) && (inString.length < STRING_LENGTH + 1) && (/^[A-Za-z\s]*$/.test(inString)))

} // end function validateString

// -------------------------------------------------------------
// Called by Node layer to validate the format only a phone number
//
function validatePhone(inString)
{
    let cleaned = ('' + inString).replace(/\D/g, '');

    //Check if the input is of correct length
    let match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);

    if (match)
    {
      return match[1] + '-' + match[2] + '-' + match[3]
    };

    return null;

} // end function validatePhone

// -------------------------------------------------------------

function formatDate(inDate)
{

  var dt = new Date(inDate);

  // ensure date comes as 01, 09 etc
  var DD = ("0" + dt.getDate()).slice(-2);

  // getMonth returns month from 0
  var MM = ("0" + (dt.getMonth() + 1)).slice(-2);

  var YYYY = dt.getFullYear();

  var hh = ("0" + dt.getHours()).slice(-2);

  var mm = ("0" + dt.getMinutes()).slice(-2);

  var ss = ("0" + dt.getSeconds()).slice(-2);

  var date_string = YYYY + "-" + MM + "-" + DD + " " + hh + ":" + mm + ":" + ss;

  // will output something like "2019-02-14 11:04:42"
  return date_string;

}
