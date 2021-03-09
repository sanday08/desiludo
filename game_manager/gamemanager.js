var roomlist = [];
var database = null;
var io;
var socketlist = [];

exports.initdatabase = function (db) {
  database = db;
};
exports.addsocket = function (id) {
  socketlist.push(id);
};
exports.setsocketio = function (socketio) {
  io = socketio;
};

exports.getroomlist = function () {
  return roomlist;
};

exports.addroom = function (
  r_roomID,
  r_title,
  r_creator,
  r_seatlimit,
  r_status,
  r_game_mode,
  r_wifi_mode,
  r_stake_money,
  r_win_money,
  socket
) {
  let inputplayerlist = [];
  let playerphotos = [];
  let earnScore = [];
  let diceHistory = [];
  let gameobject = {
    roomid: r_roomID,
    title: r_title,
    creator: r_creator,
    seatlimit: parseInt(r_seatlimit),
    status: r_status,
    game_mode: r_game_mode,
    wifi_mode: r_wifi_mode,
    stake_money: r_stake_money,
    win_money: r_win_money,
    playerlist: inputplayerlist,
    playerphotos: playerphotos,
    earnScores: earnScore,
    dice: 1,
    turnuser: "",
    diceHistory: diceHistory,
    turncount: [],
    move_history: {
      status: "",
      mover: "",
      path: "",
    },
  };
  roomlist.push(gameobject);
};

exports.GetRoomPassedTime = function (socket, data) {
  for (let index = 0; index < roomlist.length; index++) {
    if (roomlist[index].roomid == data.roomid) {
      roomlist[index].passedtime = parseFloat(data.passedtime);
    }
  }
};
exports.playerenterroom = function (roomid, username, photo, socket) {
  socket.room = "r" + roomid;
  socket.username = username;

  console.log("playerenterroom " + roomid);

  socket.join("r" + roomid);

  console.log("roomlist.length 111111111 " + roomlist.length);
  var gamePlayHistoryID=0;
  if (roomlist.length > 0) {
    for (let index = 0; index < roomlist.length; index++) {
      if (roomlist[index].roomid == roomid) {
        for (let i = 0; i < roomlist[index].playerlist.length; i++) {
          let user = roomlist[index].playerlist[i];
          if (user == username) {
            let mydata = {
              result: "failed",
              gamePlayHistoryID :  gamePlayHistoryID 
            };
            socket.emit("REQ_ENTER_ROOM_RESULT", mydata);
            return;
          }
        }
        roomlist[index].playerlist.push(username);
        roomlist[index].playerphotos.push(photo);
        roomlist[index].earnScores.push(0);
        console.log("roomlist roomid 22222 " + roomid);

        exports.GetUserListInRoom(roomid);

        console.log(
          "roomlist roomid 33333 " + roomlist[index].playerlist.length
        );

        if (roomlist[index].playerlist.length == roomlist[index].seatlimit) {

          let collectionGamePlayHistory = database.collection("Game_Play_History");
          let queryGamePlayHistory = {
            bet: roomlist[index].stake_money,
            game_status:"play",
            game_mode: roomlist[index].game_mode,
            wifi_mode: roomlist[index].wifi_mode,
            seat_limit: parseInt(roomlist[index].seatlimit),
            date: new Date(),
          };
          
          collectionGamePlayHistory.insertOne(queryGamePlayHistory, function (err,result) {
            if (!err) {
              console.log("queryGamePlayHistory info added",result);
              gamePlayHistoryID=result.insertedId;
            }
          });
          console.log("gamePlayHistoryID||||",gamePlayHistoryID);


          roomlist[index].turnuser = username;
          console.log("~ Match Successed ~");
          let mydata = {
            result: "success",
            gamePlayHistoryID :  gamePlayHistoryID 
              
          };
          io.sockets.in("r" + roomid).emit("REQ_ENTER_ROOM_RESULT", mydata);
          //sockets.in("r" + roomid).emit("REQ_ENTER_ROOM_RESULT", mydata);
          roomlist[index].status = "full";
          UpdateRoomStatus(roomid);
        }
      }
    }
  }
};
exports.reconnectRoom = function (roomid, username, old_socketID, socket) {
  let roomindex = 0;
  for (let index = 0; index < roomlist.length; index++) {
    if (roomlist[index].roomid == roomid) {
      roomindex = index;
    }
  }
  console.log("roomindex ||||||||||||||||" + roomindex);
  console.log("roomlist[roomindex] ||||||||||||||||" + roomlist[roomindex]);
  let ischeck = roomlist[roomindex].playerlist.filter(function (object) {
    return object == username;
  });

  if (ischeck.length == 0) {
    let emitdata = {
      message: "exitUser",
    };
    socket.emit("EXIT_GAME", emitdata);
    console.log("You already got disconnection");
  } else {
    socketlist.splice(socketlist.indexOf(old_socketID), 1);
    socket.room = "r" + roomid;
    socket.username = username;
    socket.join("r" + roomid);
    let emit_data = {
      roomid: roomid,
      reconnecter: username,
      status: roomlist[roomindex].move_history.status,
      mover: roomlist[roomindex].move_history.mover,
      path: roomlist[roomindex].move_history.path,
    };
    io.sockets.in("r" + roomid).emit("RECONNECT_RESULT", emit_data);
  }
};
exports.GetUserListInRoom = function (roomid) {
  console.log("GetUserListInRoom  " + roomlist.length);
  let roomindex = 0;
  let mydata = "";
  for (let index = 0; index < roomlist.length; index++) {
    if (roomlist[index].roomid == roomid) {
      roomindex = index;
    }
  }
  for (let i = 0; i < roomlist[roomindex].playerlist.length; i++) {
    mydata =
      mydata +
      "{" +
      '"username":"' +
      roomlist[roomindex].playerlist[i] +
      '",' +
      '"photo":"' +
      roomlist[roomindex].playerphotos[i] +
      '",' +
      '"points":"' +
      0 +
      '",' +
      '"level":"' +
      0 +
      '"},';
  }
  mydata = mydata.substring(0, mydata.length - 1);
  mydata =
    "{" +
    '"result":"success",' +
    '"roomid":"' +
    roomid +
    '",' +
    '"userlist": [' +
    mydata;
  mydata = mydata + "]}";
  io.sockets
    .in("r" + roomid)
    .emit("REQ_USERLIST_ROOM_RESULT", JSON.parse(mydata));
};
exports.AddHistory = function (data) {
  let collection = database.collection("Game_History");
  let query = {
    username: data.username,
    date: new Date(),
    points: parseInt(data.points),
  };
  collection.insertOne(query, function (err) {
    if (!err) {
      console.log("history info added");
    }
  });
};

function GetThisWeek() {
  let curr = new Date();
  let week = [];

  for (let i = 1; i <= 7; i++) {
    let first = curr.getDate() - curr.getDay() + i;
    let day = new Date(curr.setDate(first)).toISOString().slice(0, 10);
    week.push(day);
  }
  return week;
}
exports.GetRankList = function (socket, info) {
  let userInfo = "";
  let nowMonth = new Date().getMonth();
  let nowToday = new Date().getDate();
  let nowWeek = GetThisWeek();
  let collection = database.collection("User_Data");
  let collection_GameHist = database.collection("Game_History");
  collection.find().toArray(function (err, docs) {
    docs.forEach((doc) => {
      let points = 0;
      collection_GameHist
        .find({
          username: doc.username,
        })
        .toArray(function (err, items) {
          if (err) console.log("error _ GameHistory Collection");
          else {
            for (let index = 0; index < items.length; index++) {
              if (info.rank_type == "month") {
                if (items[index].date.getMonth() == nowMonth) {
                  points += parseFloat(items[index].points);
                }
              } else if (info.rank_type == "daily") {
                if (items[index].date.getMonth() == nowMonth) {
                  if (items[index].date.getDate() == nowToday) {
                    points += parseFloat(items[index].points);
                  }
                }
              } else if (info.rank_type == "week") {
                let day = new Date(
                  items[index].date.setDate(items[index].date.getDate())
                )
                  .toISOString()
                  .slice(0, 10);
                //console.log(day);
                if (nowWeek.includes(day)) {
                  points += parseFloat(items[index].points);
                }
              }
            }
            userInfo =
              userInfo +
              "{" +
              '"username":"' +
              doc.username +
              '",' +
              '"level":"' +
              doc.level +
              '",' +
              '"points":"' +
              points +
              '"},';
          }
        });
    });
    setTimeout(function () {
      userInfo = userInfo.substring(0, userInfo.length - 1);
      userInfo = "{" + '"result" : "success",' + '"users"  : [' + userInfo;
      userInfo = userInfo + "]}";
      socket.emit("REQ_RANK_LIST_RESULT", JSON.parse(userInfo));
    }, 1000);
  });
};
exports.CheckSpin = function (socket, data) {
  let collection = database.collection("User_Data");
  let query = {
    username: data.username,
  };

  collection.findOne(query, function (err, result) {
    if (err) console.log(err);
    else {
      if (result.spin_date.getTime() == result.created_date.getTime()) {
        //console.log("allow spin");
        collection.updateOne(
          query,
          {
            $set: {
              spin_date: new Date(),
            },
          },
          function (err) {
            if (err) throw err;
          }
        );
        let message = {
          result: "success",
        };
        socket.emit("REQ_SPIN_RESULT", message);
      } else {
        let now = new Date();
        let diffTime = now.getTime() - result.spin_date.getTime(); // milliseconds

        if (diffTime >= 14400000) {
          collection.updateOne(
            query,
            {
              $set: {
                spin_date: new Date(),
              },
            },
            function (err) {
              if (err) throw err;
            }
          );
          let message = {
            result: "success",
          };
          socket.emit("REQ_SPIN_RESULT", message);
        } else {
          let allowTime = result.spin_date.getTime() + 14400000;
          let gap = allowTime - now.getTime();

          socket.emit("REQ_SPIN_RESULT", msToTime(gap));
        }
      }
    }
  });
};

function msToTime(duration) {
  let milliseconds = parseInt((duration % 1000) / 100),
    seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  _hours = hours < 10 ? "0" + hours : hours;
  _minutes = minutes < 10 ? "0" + minutes : minutes;
  _seconds = seconds < 10 ? "0" + seconds : seconds;
  console.log(
    "Spin Remaining: ",
    _hours + ":" + _minutes + ":" + _seconds + "." + milliseconds
  );
  let datajson = {
    result: "remaining",
    hours: hours,
    minutes: minutes,
    seconds: seconds,
  };
  return datajson;
}

exports.GetTurnUser = function (socket, data) {
  console.log("111111111111111111....TurnUser",roomlist.length);
  for (let index = 0; index < roomlist.length; index++) {
    if (roomlist[index].roomid == data.roomid) {
      let username = data.username;

      let ischeck = roomlist[index].turncount.filter(function (object) {
        return object == username;
      });

      if (ischeck.length == 0) roomlist[index].turncount.push(username);
      if (roomlist[index].turncount.length == roomlist[index].seatlimit) {
        roomlist[index].dice = parseInt(data.dice);
        SetTurn(index, data.roomid);
      }
      break;
    }
  }
};

function SetTurn(index, roomid) {
  if (roomlist[index].dice < 6) {
    let turnuser = roomlist[index].turnuser;
    for (let i = 0; i < roomlist[index].playerlist.length; i++) {
      const element = roomlist[index].playerlist[i];
      if (element == turnuser) {
        if (i == roomlist[index].playerlist.length - 1) {
          i = 0;
        } else {
          i++;
        }
        turnuser = roomlist[index].playerlist[i];
        roomlist[index].turnuser = turnuser;
      }
    }
  }
  setTimeout(() => {
    if (roomlist[index].playerlist.length > 0) {
      let value = randomNum(1, 6);
      // let value2 = randomNum(1, 3);
      // if(value == 6)
      // {
      //     if(value2 == 1)
      //     {
      //         value = randomNum(1, 5);
      //     }
      // }
      roomlist[index].dice = value;
      let turndata = {
        turnuser: roomlist[index].turnuser,
        dice: roomlist[index].dice,
      };
      roomlist[index].turncount = [];
      //io.sockets.in('r' + roomid).emit('REQ_TURNUSER_RESULT', turndata);
      setTimeout(() => {
        io.sockets.in("r" + roomid).emit("REQ_TURNUSER_RESULT", turndata);
      }, 400);
    }
  }, 100);
}

function UpdateRoomStatus(roomid) {
  var collection = database.collection("Room_Data");
  var query = {
    roomID: roomid,
  };

  collection.findOne(query, function (err, result) {
    if (err) {
      console.log(err);
    } else {
      collection.updateOne(
        query,
        {
          $set: {
            status: "full",
          },
        },
        function (err) {
          if (err) throw err;
        }
      );
    }
  });
}

function randomNum(min, max) {
  var random = Math.floor(Math.random() * (max - min + 1) + min);
  return random;
}

exports.ChatMessage = function (socket, data) {
  var mydata = {
    result: "success",
    username: data.username,
    message: data.message,
  };
  //socket.in('r' + data.roomid).emit('REQ_CHAT_RESULT', mydata);
  io.sockets.in("r" + data.roomid).emit("REQ_CHAT_RESULT", mydata);
};

exports.Roll_Dice = function (socket, data) {
  var roomid = data.roomid;
  for (let index = 0; index < roomlist.length; index++) {
    if (roomlist[index].roomid == roomid) {
      if (roomlist[index].dice == data.dice) {
        var mydata = {
          roller: data.roller,
          dice: data.dice,
        };

        socket.in("r" + roomid).emit("REQ_ROLL_DICE_RESULT", mydata);
        break;
      } else {
        console.log(data.roller, "is Hacker");
      }
    }
  }
};
exports.Move_Token = function (socket, data) {
  var roomid = data.roomid;
  for (let index = 0; index < roomlist.length; index++) {
    if (roomlist[index].roomid == roomid) {
      var mydata = {
        status: data.status,
        mover: data.mover,
        path: data.path,
      };
      roomlist[index].move_history.status = data.status;
      roomlist[index].move_history.mover = data.mover;
      roomlist[index].move_history.path = data.path;
      socket.in("r" + roomid).emit("REQ_MOVE_TOKEN_RESULT", mydata);

      break;
    }
  }
};

exports.Set_Auto = function (socket, data) {
  let roomid = data.roomid;
  for (let index = 0; index < roomlist.length; index++) {
    if (roomlist[index].roomid == roomid) {
      var mydata = {
        user: data.user,
        auto: data.auto,
      };
      socket.in("r" + roomid).emit("REQ_AUTO_RESULT", mydata);
      break;
    }
  }
};
exports.LeaveRoom = function (socket, data) {
  let mydata = {
    result: "success",
    username: data.username,
    message: "user has left the room",
  };

  socket.in("r" + data.roomid).emit("REQ_LEAVE_ROOM_RESULT", mydata);
  socket.leave("r" + data.roomid);
  console.log(data.username, "has ", data.roomid, "room exit");

  if (roomlist.length > 0) {
    let removeindex = null;
    for (let index = 0; index < roomlist.length; index++) {
      if (roomlist[index].roomid == data.roomid) {
        let num;
        let isExist = false;
        for (let i = 0; i < roomlist[index].playerlist.length; i++) {
          if (roomlist[index].playerlist[i] == data.username) {
            isExist = true;
            num = i;
            break;
          }
        }
        if (isExist == true) {
          if (roomlist[index].turnuser == data.username) {
            SetTurn(index, data.roomid);
          }
          setTimeout(() => {
            if (roomlist[index] != undefined) {
              roomlist[index].playerlist.splice(num, 1);
              roomlist[index].playerphotos.splice(num, 1);
              roomlist[index].earnScores.splice(num, 1);

              if (roomlist[index].playerlist.length == 0) {
                removeindex = index;
                if (removeindex != null) {
                  roomlist.splice(removeindex, 1);
                  let query = {
                    roomID: parseInt(data.roomid),
                  };
                  let collection = database.collection("Room_Data");
                  collection.deleteOne(query, function (err, removed) {
                    if (err) {
                      console.log(err);
                    } else {
                      console.log(
                        data.roomid,
                        "room has removed successfully!"
                      );
                    }
                  });
                }
              } else if (roomlist[index].playerlist.length == 1) {
                console.log("STOP! Everyone not me outsided~");
                io.sockets.in("r" + data.roomid).emit("GAME_END", {});
              }
            }
          }, 200);
        }
      }
    }
  }
};
exports.RemoveRoom = function (socket, data) {
  console.log("Remove Force Room", data.roomid);
  let removeindex;
  for (let index = 0; index < roomlist.length; index++) {
    if (roomlist[index].roomid == data.roomid) {
      removeindex = index;
      roomlist.splice(removeindex, 1);
      let query = {
        roomID: parseInt(data.roomid),
      };
      let collection = database.collection("Room_Data");
      collection.deleteOne(query, function (err, removed) {
        if (err) {
          console.log(err);
        } else {
          console.log(data.roomid, "room has removed successfully!");
        }
      });
    }
  }
};
exports.OnDisconnect = function (socket) {
  //console.log("-Disconnect", socket.room, socket.username, socket.id);

  let ischeck = socketlist.filter(function (object) {
    return object == socket.id;
  });

  if (ischeck.length == 0) {
    console.log("re-connected user");
  } else {
    socketlist.splice(socketlist.indexOf(socket.id), 1);
    let nickname = socket.username;
    console.log("leaving user : ", nickname);

    if (socket.room == undefined || nickname == undefined) return;

    let roomid_arr = socket.room.split("");
    roomid_arr.splice(0, 1);
    let roomid = "";
    for (let i = 0; i < roomid_arr.length; i++) {
      roomid += roomid_arr[i];
    }
    console.log("roomid : ", roomid);

    if (roomlist.length > 0) {
      let removeindex = null;
      for (let index = 0; index < roomlist.length; index++) {
        if (roomlist[index].roomid == roomid) {
          let num;
          let isExist = false;
          for (let i = 0; i < roomlist[index].playerlist.length; i++) {
            if (roomlist[index].playerlist[i] == nickname) {
              isExist = true;

              num = i;
              break;
            }
          }
          if (isExist == true) {
            setTimeout(() => {
              roomlist[index].playerlist.splice(num, 1);
              roomlist[index].playerphotos.splice(num, 1);
              roomlist[index].earnScores.splice(num, 1);

              if (roomlist[index].playerlist.length == 0) {
                removeindex = index;
                if (removeindex != null) {
                  roomlist.splice(removeindex, 1);
                  let query = {
                    roomID: parseInt(roomid),
                  };
                  let collection = database.collection("Room_Data");
                  collection.deleteOne(query, function (err, removed) {
                    if (err) {
                      console.log(err);
                    } else {
                      console.log(roomid, "room has removed successfully!");
                    }
                  });
                }
              } else if (roomlist[index].playerlist.length == 1) {
                console.log("STOP", roomlist[index].roomid);

                io.sockets
                  .in("r" + roomlist[index].roomid)
                  .emit("GAME_END", {});
              }
            }, 100);
          }
        }
      }
    }
  }
};
function getConnectedList() {
  let list = [];

  for (let client in io.sockets.connected) {
    list.push(client);
  }

  return list;
}
exports.Pause_Game = function (socket, data) {
  let roomid = data.roomid;
  let emitdata = {
    roomid: roomid,
  };
  socket.in("r" + roomid).emit("REQ_PAUSE_RESULT", emitdata);
};
exports.Resume_Game = function (socket, data) {
  let roomid = data.roomid;
  let emitdata = {
    roomid: roomid,
  };
  socket.in("r" + roomid).emit("REQ_RESUME_RESULT", emitdata);
};
