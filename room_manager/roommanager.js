var gamemanager = require("../game_manager/gamemanager");
var database = null;
var io;

exports.initdatabase = function (db) {
  database = db;
};

exports.setsocketio = function (socketio) {
  io = socketio;
};

exports.Check_Rooms = function (socket, data) {
  let collection = database.collection("Room_Data");

  let collectionBots = database.collection("bots");
  var queryBots = {
    bet: data.stake_money,
    status: "true",
    is_available: "true",
  };
  var isBotsActive = 0;
  collectionBots.findOne(queryBots, function (err, result) {
    if (err) console.log(err);
    else {
      if (result == null) {
        isBotsActive = 0;
      } else {
        var queryBotsUpdate = {
          _id: result.result,
          bet: data.stake_money,
          status: "true",
          is_available: "true",
        };
        collection.updateOne(
          queryBotsUpdate,
          { $set: { is_available: "false" } },
          function (err) {
            if (err) throw err;
          }
        );
        isBotsActive = 1;
      }
    }
  });

  collection.find().toArray(function (err, docs) {
    if (err) {
      console.log(err);
      let mydata = "{" + '"result" : "failed"' + "}";
      socket.emit("REQ_CHECK_ROOMS_RESULT", JSON.parse(mydata));
    } else {
      if (docs.length > 0) {
        let rooms_wifi = docs.filter(function (object) {
          return (
            object.wifi_mode == data.wifi_mode &&
            object.game_mode == data.game_mode &&
            object.seat_limit == data.seat_limit &&
            object.stake_money == data.stake_money &&
            object.win_money == data.win_money
          );
        });

        if (rooms_wifi.length > 0) {
          let exitRoomId = -1;
          for (let index = 0; index < rooms_wifi.length; index++) {
            if (rooms_wifi[index].status != "full") {
              exitRoomId = index;
              break;
            }
          }
          if (exitRoomId != -1) {
            let mydata =
              "{" +
              '"result" : "success",' +
              '"isBotsActive" : "' +
              isBotsActive +
              '"' +
              '"roomID" : "' +
              rooms_wifi[0].roomID +
              '"' +
              "}";
            socket.emit("REQ_CHECK_ROOMS_RESULT", JSON.parse(mydata));
          } else {
            let mydata = "{" + '"result" : "failed"' + "}";
            socket.emit("REQ_CHECK_ROOMS_RESULT", JSON.parse(mydata));
          }
        } else {
          let mydata = "{" + '"result" : "failed"' + "}";
          socket.emit("REQ_CHECK_ROOMS_RESULT", JSON.parse(mydata));
        }
      } else {
        let mydata = "{" + '"result" : "failed"' + "}";
        socket.emit("REQ_CHECK_ROOMS_RESULT", JSON.parse(mydata));
      }
    }
  });
};

exports.CreateRoom = function (socket, userInfo) {
  let collection = database.collection("Room_Data");

  collection
    .find()
    .sort({ roomID: -1 })
    .limit(1)
    .toArray(function (err, docs) {
      if (err) throw err;
      else {
        let id = 1;
        if (docs[0]) id = docs[0].roomID + 1;

        let query = {
          roomID: id,
          title: userInfo.room_title,
          creator: userInfo.username,
          seat_limit: parseInt(userInfo.seat_limit),
          status: userInfo.status,
          game_mode: userInfo.game_mode,
          wifi_mode: userInfo.wifi_mode,
          stake_money: parseInt(userInfo.stake_money),
          win_money: parseInt(userInfo.win_money),
          create_time: new Date(),
        };

        collection.insertOne(query, function (err) {
          if (err) {
            console.log(err);
            throw err;
          } else {
            var mydata =
              "{" + '"result" : "success",' + '"roomID" : "' + id + '"' + "}";
            socket.emit("REQ_CREATE_ROOM_RESULT", JSON.parse(mydata));
            gamemanager.addroom(
              id,
              userInfo.room_title,
              userInfo.username,
              parseInt(userInfo.seat_limit),
              userInfo.status,
              userInfo.game_mode,
              userInfo.wifi_mode,
              userInfo.stake_money,
              userInfo.win_money,
              socket
            );
          }
        });
      }
    });
};

exports.JoinRoom = function (socket, data) {
  gamemanager.playerenterroom(
    parseInt(data.roomID),
    data.username,
    data.photo,
    socket
  );
};
exports.ReJoinRoom = function (socket, data) {
  gamemanager.reconnectRoom(
    parseInt(data.roomid),
    data.username,
    data.old_socketID,
    socket
  );
};
exports.GetRoomInfo = function (socket, data) {
  let roomid = data.roomID;
  let roomlist = gamemanager.getroomlist();
  let isThere = false;
  for (let index = 0; index < roomlist.length; index++) {
    if (roomlist[index].roomid == roomid) {
      let mydata = {
        seatlimit: roomlist[index].seatlimit,
        gamemode: roomlist[index].game_mode,
        stakemoney: roomlist[index].stake_money,
        winmoney: roomlist[index].win_money,
      };
      socket.emit("REQ_ROOM_INFO_RESULT", mydata);
      isThere = true;
      break;
    }
  }
  if (!isThere) {
    let mydata = {
      seatlimit: 0,
      stakemoney: "0",
      winmoney: "0",
    };
    socket.emit("REQ_ROOM_INFO_RESULT", mydata);
  }
};
exports.GetRoomList = function () {
  let roomlist = gamemanager.getroomlist();
  let mydata = "";

  for (let i = 0; i < roomlist.length; i++) {
    let currentPlayers = roomlist[i].playerlist.length;
    mydata =
      mydata +
      "{" +
      '"roomid":"' +
      roomlist[i].roomid +
      '",' +
      '"title":"' +
      roomlist[i].title +
      '",' +
      '"seatlimit":"' +
      roomlist[i].seatlimit +
      '",' +
      '"type":"' +
      roomlist[i].type +
      '",' +
      '"difficulty":"' +
      roomlist[i].difficulty +
      '",' +
      '"currentplayers":"' +
      currentPlayers +
      '"},';
  }
  mydata = mydata.substring(0, mydata.length - 1);
  mydata = "{" + '"result" : "success",' + '"rooms"  : [' + mydata;
  mydata = mydata + "]}";

  io.sockets.emit("REQ_ROOM_LIST_RESULT", JSON.parse(mydata));
};

exports.CheckRefferal = function (socket, data) {
  let requester = data.username;
  let code = data.referral;
  let collection = database.collection("User_Data");
  collection.find().toArray(function (err, docs) {
    if (!err) {
      if (docs.length > 0) {
        let users = docs.filter(function (object) {
          return object.referral_code == code;
        });

        if (users.length > 0) {
          let emitdata = { result: "success" };
          socket.emit("REQ_CHECK_REFFERAL_RESULT", emitdata);
          let referral_users = [];
          referral_users = users[0].referral_users;
          referral_users.push(requester);
          let query2 = { username: users[0].username };
          collection.updateOne(
            query2,
            {
              $set: {
                //points: users[existIndex].points + 200,
                referral_count: users[0].referral_count + 1,
                referral_users: referral_users,
              },
            },
            function (err) {
              if (err) throw err;
            }
          );
        } else {
          let emitdata = { result: "failed" };
          socket.emit("REQ_CHECK_REFFERAL_RESULT", emitdata);
        }
      }
    }
  });
};
exports.CheckRefferal_Bounce = function (socket, data) {
  let checker = data.username;

  let collection = database.collection("User_Data");
  collection.find().toArray(function (err, docs) {
    if (!err) {
      if (docs.length > 0) {
        let users = docs.filter(function (object) {
          return object.username == checker;
        });

        if (users.length > 0) {
          if (users[0].username == checker) {
            let add_points = 0;
            let ref_users = users[0].referral_users;
            let ref_users_removed = [];
            if (ref_users.length > 0) {
              for (let k = 0; k < ref_users.length; k++) {
                const element = ref_users[k];
                let player = docs.filter(function (object) {
                  return object.username == element;
                });
                if (player) {
                  let playingCount =
                    player[0].online_multiplayer.played +
                    player[0].friend_multiplayer.played;
                  if (playingCount >= 5) {
                    add_points += 200;
                    ref_users_removed.push(k);
                  }
                }
              }

              for (let j = ref_users_removed.length - 1; j >= 0; j--) {
                const element = ref_users_removed[j];
                ref_users.splice(element, 1);
              }

              let query2 = { username: checker };
              collection.updateOne(
                query2,
                {
                  $set: {
                    points: users[0].points + add_points,
                    referral_users: ref_users,
                  },
                },
                function (err) {
                  if (err) throw err;
                }
              );
            }

            setTimeout(() => {
              let emitdata = {
                result: "success",
                referCount: users[0].referral_count,
                bounce: add_points,
              };
              socket.emit("REQ_CHECK_REFFERAL_BOUNCE_RESULT", emitdata);
            }, 1000);
          }
        } else {
          let emitdata = { result: "failed" };
          socket.emit("REQ_CHECK_REFFERAL_BOUNCE_RESULT", emitdata);
        }
      }
    }
  });
};
