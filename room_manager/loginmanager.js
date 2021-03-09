const publicIp = require("public-ip");
var fs = require("fs");

var database = "LudoDB";
var serverip = "35.154.250.202";
var port = "5000";

exports.initdatabase = function (db) {
  database = db;
  (async () => {
    // console.log(await publicIp.v4());
    //serverip = await publicIp.v4();
    console.log(serverip);
    //=> '46.5.21.123'

    //console.log(await publicIp.v6());
    //=> 'fe80::200:f8ff:fe21:67cf'
  })();
};

exports.LogIn = function (socket, userInfo) {
  var collection = database.collection("User_Data");
  var query = { emailid: userInfo.username, password: userInfo.password };
  collection.findOne(query, function (err, result) {
    if (err) console.log(err);
    else {
      var mydata;
      if (result == null) {
        mydata = "{" + '"result" : "failed"' + "}";
      } else {
        collection.updateOne(
          query,
          { $set: { connect: socket.id } },
          function (err) {
            if (err) throw err;
          }
        );
        var dataSocket = {
          connect: socket.id,
          isLogin: 1,
        };
        collection.updateOne(query, { $set: dataSocket }, function (err) {
          if (err) throw err;
          else console.log("socketit added to login users");
        });

        var mydata = {
          result: "success",
          username: result.username,
          userid: result._id,
          photo: result.photo,
          points: result.points.toString(),
          level: result.level,
          online_multiplayer: result.online_multiplayer,
          friend_multiplayer: result.friend_multiplayer,
          tokens_captured: result.tokens_captured,
          won_streaks: result.won_streaks,
          referral_count: result.referral_count,
          referral_code: result.referral_code.toString(),
          connect: socket.id,
        };
        console.log("- User: ", result.username, " has logged in");
      }
      socket.emit("GET_LOGIN_RESULT", mydata);
    }
  });
};

exports.SignUp = function (socket, data) {
  var collection = database.collection("User_Data");
  var randomnum1 = "" + Math.floor(100000 + Math.random() * 900000);
  var randomnum2 = "" + Math.floor(100000 + Math.random() * 900000);
  var randomnum = randomnum1 + randomnum2;
  var referralCode = "" + Math.floor(100000 + Math.random() * 900000);
  var name = "Guest" + randomnum2;
  if (
    data.signtype == "google" ||
    data.signtype == "facebook" ||
    data.signtype == "phone"
  ) {
    name = data.username;
  }

  var online_multiplayer = { played: 0, won: 0 };
  var friend_multiplayer = { played: 0, won: 0 };
  var tokens_captured = { mine: 0, opponents: 0 };
  var won_streaks = { current: 0, best: 0 };

  var user_data = {
    username: name,
    userid: randomnum,
    photo: "",
    points: 5000,
    level: 0,
    online_multiplayer: online_multiplayer,
    friend_multiplayer: friend_multiplayer,
    tokens_captured: tokens_captured,
    won_streaks: won_streaks,
    referral_count: 0,
    referral_users: [],
    created_date: new Date(),
    spin_date: new Date(),
    dailyReward_date: new Date(),
    referral_code: referralCode,
    connect: socket.id,
  };

  collection.insertOne(user_data);
  var mydata = {
    result: "success",
    username: name,
    userid: randomnum,
    points: 5000,
    referral_code: referralCode,
  };
  socket.emit("GET_REGISTER_RESULT", mydata);
};
exports.Valid_Name = function (socket, data) {
  var collection = database.collection("User_Data");
  collection.find().toArray(function (err, docs) {
    if (err) {
      throw err;
    } else {
      if (docs.length > 0) {
        var rooms_wifi = docs.filter(function (object) {
          return (
            object.emailid == data.name && object.password == data.password
          );
        });
        if (rooms_wifi.length > 0) {
          console.log("already exist user");
          var mydata = "{" + '"result" : "failed"' + "}";
          socket.emit("REQ_VALID_NAME_RESULT", JSON.parse(mydata));
        } else {
          console.log("success");
          var mydata = "{" + '"result" : "success"' + "}";
          socket.emit("REQ_VALID_NAME_RESULT", JSON.parse(mydata));
        }
      } else {
        console.log("success");
        var mydata = "{" + '"result" : "success"' + "}";
        socket.emit("REQ_VALID_NAME_RESULT", JSON.parse(mydata));
      }
    }
  });
};
exports.GetUserInfo = function (socket, userInfo) {
  var collection = database.collection("User_Data");
  var query = { username: userInfo.username };
  collection.findOne(query, function (err, result) {
    if (err) {
      console.log(err);
    } else {
      var mydata;
      if (result == null) {
        mydata = {
          result: "failed",
        };
      } else {
        mydata = {
          result: "success",
          username: result.username,
          userid: result._id,
          photo: result.photo,
          points: result.points,
          level: result.level,
          online_multiplayer: result.online_multiplayer,
          friend_multiplayer: result.friend_multiplayer,
          tokens_captured: result.tokens_captured,
          won_streaks: result.won_streaks,
          referral_code: result.referral_code,
          referral_count: result.referral_count,
        };
      }
      socket.emit("GET_USERINFO_RESULT", mydata);
    }
  });
};
exports.UpdateUserInfo = function (socket, userInfo) {
  var collection = database.collection("User_Data");
  var query = { username: userInfo.username };
  var online_multiplayer = {
    played: parseInt(userInfo.online_played),
    won: parseInt(userInfo.online_won),
  };
  var friend_multiplayer = {
    played: parseInt(userInfo.friend_played),
    won: parseInt(userInfo.friend_won),
  };
  var tokens_captured = {
    mine: parseInt(userInfo.tokenscaptured_mine),
    opponents: parseInt(userInfo.tokenscaptured_opponents),
  };
  var won_streaks = {
    current: parseInt(userInfo.wonstreaks_current),
    best: parseInt(userInfo.wonstreaks_best),
  };

  if (userInfo["gamePlayHistoryID"] != undefined) {
    let collectionGamePlayHistory = database.collection("Game_Play_History");
    var queryGamePlayUpdate = {
      _id: userInfo.gamePlayHistoryID,
    };
    collectionGamePlayHistory.updateOne(
      queryGamePlayUpdate,
      { $set: { game_status: "done" } },
      function (err) {
        if (err) throw err;
      }
    );

  }
  if (userInfo["roomID"] != undefined) {
    var playerid = userInfo.userID;
    var roomAmount = userInfo.roomAmount;
    var numPlayer = userInfo.numPlayer;
    var commission = (roomAmount * numPlayer * 5) / 100;
    let commissionCollection = database.collection("Commission");
    let queryCommsion = {
      winneruser: playerid,
      commission: commission,
      roomPrice: roomAmount,
      numberOfPlayers: numPlayer,
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0,
    };
    commissionCollection.insertOne(queryCommsion, function (err) {
      if (!err) {
        console.log("commission info added");
      }
    });

    let account_history = database.collection("account_history");

    collection.findOne(query, function (err, result) {
      if (err) {
        console.log(err);
      } else {
        var mydata;
        if (result == null) {
          mydata = {
            result: "failed",
          };
        } else {
          var oldBalance=result.points;
          var currentBalance=parseInt(result.points)+parseInt(roomAmount);
          var winningAmount = (roomAmount * numPlayer * 5) -commission;
          let queryAccoutnHistoy = {
            username: result.username,
            userid: playerid,
            oldbalace: oldBalance,
            creditDebit: winningAmount,
            type: 1,
            currentbalance: currentBalance,
            remark: "Game Won",
            date: new Date(),
          };
          account_history.insertOne(queryAccoutnHistoy, function (err) {
            if (!err) {
              console.log("accoutn history info added");
            }
          });
        }
      }
    });
  }else{
    var playerid = userInfo.userID;
    var roomAmount = userInfo.roomAmount;
    let account_history = database.collection("account_history");
    collection.findOne(query, function (err, result) {
      if (err) {
        console.log(err);
      } else {
        var mydata;
        if (result == null) {
          mydata = {
            result: "failed",
          };
        } else {
          var oldBalance=result.points;
          var currentBalance=parseInt(result.points)-parseInt(roomAmount);
     
          let queryAccoutnHistoy = {
            username: result.username,
            userid: playerid,
            oldbalace: oldBalance,
            creditDebit: roomAmount,
            type: 2,
            currentbalance: currentBalance,
            remark: "Game Loss",
            date: new Date(),
          };
          account_history.insertOne(queryAccoutnHistoy, function (err) {
            if (!err) {
              console.log("accoutn history info added");
            }
          });
        }
      }
    });
  }

  console.log(
    "BOT ID||||||||||",
    userInfo.userID + "====" + userInfo["userID"]
  );
  if (userInfo.botId != undefined) {
    let collectionBots = database.collection("bots");
    var queryBotsUpdate = {
      _id: userInfo.botId,
    };
    collectionBots.updateOne(
      queryBotsUpdate,
      { $set: { is_available: "true" } },
      function (err) {
        if (err) throw err;
      }
    );
  }

  var data = {
    points: parseInt(userInfo.points),
    level: parseInt(userInfo.level),
    online_multiplayer: online_multiplayer,
    friend_multiplayer: friend_multiplayer,
    tokens_captured: tokens_captured,
    won_streaks: won_streaks,
  };
  collection.findOne(query, function (err, result) {
    if (err) console.log(err);
    else {
      collection.updateOne(query, { $set: data }, function (err) {
        if (err) throw err;
        else socket.emit("REQ_UPDATE_USERINFO_RESULT", { result: "success" });
      });
    }
  });
};
exports.Get_User_Photo = function (info, socket) {
  var buf = Buffer.from(info.photo_data, "base64");
  fs.writeFile(
    "./delux/userphotos/" + info.userid + ".png",
    buf,
    function (err) {
      if (err) throw err;
      console.log("Photo Saved!");
      var collection = database.collection("User_Data");
      var url =
        "http://" +
        serverip +
        ":" +
        port +
        "/userphotos/" +
        info.userid +
        ".png";
      collection.updateOne(
        { userid: info.userid },
        { $set: { photo: url } },
        function (err) {
          if (err) throw err;
          else socket.emit("UPLOAD_USER_PHOTO_RESULT");
        }
      );
    }
  );
};
exports.TournamentList = function (socket) {
  var collection = database.collection("tournaments");
  var query = { isActive: "true" };
  collection.find(query).toArray(function (err, result) {
    if (err) {
      console.log(err);
    } else {
      var mydata;
      if (result == null) {
        mydata = {
          result: "failed",
        };
      } else {
        console.log("TTTTTTTTTTTTTTTTTTTT", result.length);
        var tCount = result.length;
        for (var i = 0; i < result.length; i++) {
          mydata = {
            result: "success",
            count: result.length,
            data: result,
          };
        }
      }
      socket.emit("GET_TOURNAMENTS_RESULT", mydata);
    }
  });
};

exports.WhatsappRequest = function (socket) {
  //var collection = database.collection("whatsapp_group");
  var collection = database.collection("appstop");
  var query = { name: "whtsappGroup" };
  collection.find(query).toArray(function (err, result) {
    if (err) {
      console.log(err);
    } else {
      var mydata;
      if (result == null) {
        mydata = {
          result: "failed",
        };
      } else {
        console.log("TTTTTTTTTTTTTTTTTTTT", result.length);
        for (var i = 0; i < result.length; i++) {
          
          mydata = {
            result: "success",
            count: result.length,
            data: result,
          };
        }
      }
      socket.emit("GET_WHATSAPP_RESULT", mydata);
    }
  });
};
exports.AppStopRequest = function (socket) {
  var collection = database.collection("appstop");

  var query = { name: "appstop" }; 
  collection.find(query).toArray(function (err, result) {
    if (err) {
      console.log(err);
    } else {
      var mydata;
      if (result == null) {
        mydata = {
          result: "failed",
        };
      } else {
        console.log("TTTTTTTTTTTTTTTTTTTT", result.length);
        for (var i = 0; i < result.length; i++) {
          
          mydata = {
            result: "success",
            count: result.length,
            data: result,
          };
        }
      }
      socket.emit("GET_APP_STOP_RESULT", mydata);
    }
  });
};

exports.AccountHistoryRequest = function (socket, data) {
  var collection = database.collection("account_history");
  let query = {
    userid: data.userid,
  };
  collection.find(query).toArray(function (err, result) {
    if (err) {
      console.log(err);
    } else {
      var mydata;
      if (result == null) {
        mydata = {
          result: "failed",
        };
      } else {
        console.log("TTTTTTTTTTTTTTTTTTTT", result.length);
        for (var i = 0; i < result.length; i++) {
          mydata = {
            result: "success",
            count: result.length,
            data: result,
          };
        }
      }
      socket.emit("GET_ACCOUNT_HISTORY_RESULT", mydata);
    }
  });
};
exports.WidrawalRequest = function (socket, data) {
  var collection = database.collection("Withdraws");
  var query = {
    userid: data.userid,
    username: data.username,
    amount: data.amount,
    phonnumber: data.phonumber,
    accountnum: data.accountnumber,
    ifsc: data.ifsc,
    type: data.withdrwalType,
    date: new Date(),
    status: "pending",
  };
  collection.insertOne(query, function (err) {
    if (!err) {
      console.log("WidrawalRequest added");
      mydata = {
        result: "success",
        userid: data.userid,
        amount: data.amount,
      };
      var collectionUser = database.collection("User_Data");
      console.log("||||||||||||||||", data.userid);
      var queryUser = {
        username: data.username,
      };
      var points = 0;
      collectionUser.findOne(queryUser, function (err, result) {
        if (err) console.log(err);
        else {
          console.log("||||||||||||||||", result);
          points = parseInt(result.points) - parseInt(data.amount);
          var dataUser = {
            points: points,
          };

          collectionUser.updateOne(
            queryUser,
            { $set: dataUser },
            function (err) {
              if (err) throw err;
              else console.log("user coin updated.......");
            }
          );
          //add history entry
          let account_history = database.collection("account_history");

          var oldBalance=result.points;
          var currentBalance=points;
    
          let queryAccoutnHistoy = {
            username: result.username,
            userid: data.userid,
            oldbalace: oldBalance,
            creditDebit: data.amount,
            type: 2,
            currentbalance: currentBalance,
            remark: "Withdrwal amount",
            date: new Date(),
          };
          account_history.insertOne(queryAccoutnHistoy, function (err) {
            if (!err) {
              console.log("accoutn history info added");
            }
          });



        }
      });

      socket.emit("GET_WITHDRAWAL_RESULT", mydata);
    }
  });
};
