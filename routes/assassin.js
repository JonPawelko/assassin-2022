// All Routes defined here.  Router exported at bottom.
//

var express = require('express');
const fileUpload = require('express-fileupload');
var router = express.Router();
var dbConn  = require('../lib/db');   // database object

// --------------------------------------------------------------------------------------------------------
// Custom login function needed to use consistent buttons across site.
//
router.post('/assassinLogin', function(req, res, next)
{
  console.log("Got into assassinLogin");

  res.oidc.login();

}); // end router post

// ----------------------------------------------------------
// Players can Register themselves at any time
//
router.post('/assassinRegister', function(req, res, next) {

  console.log("Before assassinRegister");

  // Call Auth0 with signup flag to route to Register instead of Login
  res.oidc.login({
    returnTo: '/callback',
    authorizationParams: {
      screen_hint: 'signup'
      // prompt: 'login'
    },
  });

  console.log("After assassinRegister");

});

// --------------------------------------------------------------------------------------------------------
// Custom logout function needed to use consistent buttons across site.
//
router.post('/assassinLogout', function(req, res, next)
{
  console.log("Got into assassinLogout");

  // window.location.href = "../logout";

  res.oidc.logout();

}); // end router post

// --------------------------------------------------------------------------------------------------------
// Custom Register function needed to use consistent buttons across site.
//
router.post('/assassinLogin', function(req, res, next)
{
  console.log("Got into assassinLogin");

  res.oidc.login();

}); // end router post

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
                              playerPicStatus: rows[0][0].playerPicStatus,
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
                      playerPicStatus: rows[0][0].playerPicStatus,
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

                          res.oidc.login();  // route Player back to Home

                      }
                  });
                } // end else file upload

            }); // end file .mv

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
  dbConn.query('CALL `assassin-demo1`.`join_team`(?,?)', [req.body.myPlayerCode, req.body.joinTeamCode], function(err,rows)
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

// --------------------------------------------------------------------------------------------------------
// Route called to show Activate Team Template for admin
//
router.post('/adminActivateTeamPrep', function(req, res, next)
{
  console.log("Got into adminActivateTeamPrep");

  console.log(req.body.teamCode);

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
              res.render('assassin/adminActivateTeamTemplate', {
                teamCode: req.body.teamCode,
                p1Code: rows[0][0]['player-code'],
                p2Code: rows[0][1]['player-code'],
                p3Code: rows[0][2]['player-code']});
          }
          else
          {
              if (rows[0].length == 2)
              {
                res.render('assassin/adminActivateTeamTemplate', {
                  teamCode: req.body.activatedTeamCode,
                  p1Code: rows[0][0]['player-code'],
                  p2Code: rows[0][1]['player-code'],
                  p3Code: ""});
              }
              else {
                res.render('assassin/adminActivateTeamTemplate', {
                  teamCode: req.body.activatedTeamCode,
                  p1Code: rows[0][0]['player-code'],
                  p2Code: "",
                  p3Code: ""});

              }

          }

      }

  });

}); // end router post


// -------------------------------------------------------------
// activateTeam called by admin after registering a Team in person

router.post('/adminActivateTeam', function(req, res, next)
{
    console.log("Got into new adminActivateTeam call");

    // console.log(req.body.captainCeleb);

    // helper vars for uploading photo files
    let playerPhotoFile;
    let uploadPath;

    // var helper files to prevent trying to send blank data to Node
    var p2Code = "";
    var p2Name = "";
    var p2Phone = "";
    var p2Photo = "";
    var p2Celeb = "";

    var p3Code = "";
    var p3Name = "";
    var p3Phone = "";
    var p3Photo = "";
    var p3Celeb = "";

    if (Object.keys(req.files).length > 1)
    {
        p2Code = req.body.player2Code;
        p2Name = req.body.player2Name;
        p2Phone = req.body.player2Phone;
        p2Photo = req.files.player2PhotoFile.name;
        p2Celeb = req.body.player2Celeb;
    }

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
            console.log("Error on activate_team call.");
            req.flash('error', err);
        } else
        {
            // Create Player worked, now upload photos
            console.log("Create Player worked, now upload photos.");

            // Start with Captain
            playerPhotoFile = req.files.captainPhotoFile;
            uploadPath = __dirname + '/../public/photos/' + playerPhotoFile.name;  // might want to clean up this directory logic

            console.log(uploadPath);

            // Use mv() to place file on the server
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
                    else {
                      res.oidc.login(); // route back to login
                    }

                } // else first upload

            });

        } // end first else create player worked, start uploads

      });

}); // end post('/activateTeam')

// -------------------------------------------------------------
// adminSearchForTeam called by admin to find a team based on code, name, or player name

router.post('/adminSearchForTeam', function(req, res, next)
{
    console.log("Got into adminSearchForTeam call");
    console.log(req.body.teamCode);
    console.log(req.body.teamName);
    console.log(req.body.playerName);

    // var helper files to prevent trying to send blank data to Node
    var tempTeamCode = 0;
    var tempTeamName = "";
    var tempPlayerName = "";

    if (req.body.teamCode != "")
    {
        tempTeamCode = req.body.teamCode;
    }

    // Call stored procedure to search for the team
    dbConn.query('CALL `assassin-demo1`.`admin_search_for_team`(?,?,?)', [req.body.teamName, req.body.playerName, tempTeamCode], function(err,rows)
    {
        if(err)
        {
            console.log("Error on search_for_team call.");
            req.flash('error', err);
        } else
        {
            // Create Player worked, now upload photos
            console.log("search_for_team successful rpc call.");

            // Check results, if only 1 Team, go directly to that edit Team page, otherwise show list of matching teams and let Admin pick
            console.log(rows[0].length);

            if (rows[0].length == 1)
            {
                res.render('assassin/adminTeamHome',
                {
                    teamCode: rows[0][0]['team-code'],
                    teamName: rows[0][0]['team-name'],
                    teamStatus: rows[0][0]['team-status'],
                    bountiesOwed: rows[0][0]['bounties-owed'],
                    captainName: rows[0][0]['player-name']
                });

            }

        } // end else

    });

});

// -------------------------------------------------------------
// adminSearchForPlayer called by admin to find a Player based on player code, team name, or player name

router.post('/adminSearchForPlayer', function(req, res, next)
{
    console.log("Got into adminSearchForPlayer call");

    // var helper files to prevent trying to send blank data to Node
    var tempTeamName = "";
    var tempPlayerName = "";
    var tempPlayerCode = 0;
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

    console.log(tempTeamName);
    console.log(tempPlayerName);
    console.log(tempPlayerCode);

    // Call stored procedure to search for the team
    dbConn.query('CALL `assassin-demo1`.`admin_search_for_player`(?,?,?)', [tempTeamName, tempPlayerName, tempPlayerCode], function(err,rows)
    {
        if(err)
        {
            console.log("Error on adminSearchForPlayer call.");
            req.flash('error', err);
        } else
        {
            // Create Player worked, now upload photos
            console.log("adminSearchForPlayer successful rpc call.");

            console.log(rows);

            // Check results, if only 1 Team, go directly to that edit Team page, otherwise show list of matching teams and let Admin pick
            console.log(rows[0].length);

            if (rows[0].length == 1)
            {
                playerPicPath = "../../" + rows[0][0]['player-pic'];

                res.render('assassin/adminPlayerHome',
                {
                    teamCode: rows[0][0]['team-code'],
                    teamName: rows[0][0]['team-name'],
                    teamStatus: rows[0][0]['team-status'],
                    playerPhoto: playerPicPath,
                    playerCode: rows[0][0]['player-code'],
                    playerName: rows[0][0]['player-name'],
                    playerStatus: rows[0][0]['player-status'],
                    personalBountiesOwed: rows[0][0]['personal-bounties'],
                    celebritarian: rows[0][0]['celeb']
                });

            }

        } // end else

    });

});

// -------------------------------------------------------------
// adminApprovePicture called by admin to approve a players pic

router.post('/adminApprovePicture', function(req, res, next)
{
    console.log("Got into adminApprovePicture call");

    // Call stored procedure to search for the team
    dbConn.query('CALL `assassin-demo1`.`admin_approve_picture`(?,?,?)', [req.body.teamCode, req.body.teamStatus, req.body.playerCode], function(err,rows)
    {
        if(err)
        {
            console.log("Error on adminApprovePicture call.");
            req.flash('error', err);
        } else
        {
            // Create Player worked, now upload photos
            console.log("adminApprovePicture successful rpc call.");

            res.oidc.login();

        } // end else

    });

});

// -------------------------------------------------------------
// adminRejectPicture called by admin to approve a players pic

router.post('/adminRejectPicture', function(req, res, next)
{
    console.log("Got into adminRejectPicture call");

    // Call stored procedure to search for the team
    dbConn.query('CALL `assassin-demo1`.`admin_reject_picture`(?)', req.body.playerCode, function(err,rows)
    {
        if(err)
        {
            console.log("Error on adminRejectPicture call.");
            req.flash('error', err);
        } else
        {
            // Create Player worked, now upload photos
            console.log("adminRejectPicture successful rpc call.");

            res.oidc.login();

        } // end else

    });

});

// -------------------------------------------------------------
// adminPayBounties called by admin to update team data including paying out bounties

router.post('/adminPayBounties', function(req, res, next)
{
  console.log("Got into new adminPayBounties call");

  // Call stored procedure to create the player
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

          res.oidc.login();

          // console.log(uploadPath);
      } // end else

  }); // end query

}); // end post('/adminPayBounties')


// -------------------------------------------------------------
// adminMarkPaid called by admin to update team data including paying out bounties

router.post('/adminMarkPaid', function(req, res, next)
{
  console.log("Got into new adminMarkPaid call");

  // Call stored procedure to create the player
  dbConn.query('CALL `assassin-demo1`.`admin_mark_paid`(?)', req.body.teamCode, function(err,rows)
  {
      if(err)
      {
          console.log("Error on adminMarkPaid call.");
          req.flash('error', err);
      } else
      {
          // Create Player worked, now upload photo
          console.log("adminMarkPaid rpc worked.");

          res.oidc.login();

          // console.log(uploadPath);
      } // end else

  }); // end query

}); // end post('/adminPayBounties')

// -------------------------------------------------------------
// Export the router
//
module.exports = router;
