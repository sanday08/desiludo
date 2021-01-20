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
        };
        collection.updateOne(query, { $set: dataSocket }, function (err) {
          if (err) throw err;
          else console.log("socketit added to login users");
        });

        var mydata = {
          result: "success",
          username: result.username,
          userid: result.userid,
          photo: result.photo,
          points: result.points,
          level: result.level,
          online_multiplayer: result.online_multiplayer,
          friend_multiplayer: result.friend_multiplayer,
          tokens_captured: result.tokens_captured,
          won_streaks: result.won_streaks,
          referral_count: result.referral_count,
          referral_code: result.referral_code,
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
          return object.emailid == data.name;
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
          userid: result.userid,
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
