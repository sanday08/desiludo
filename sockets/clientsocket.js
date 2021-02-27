var events = require("events");
var eventemitter = new events.EventEmitter();
var db = require("../database/mongodatabase");
var roommanager = require("../room_manager/roommanager");
var gamemanager = require("../game_manager/gamemanager");
var loginmanager = require("../room_manager/loginmanager");
var database = null;

exports.initdatabase = function () {
  db.connect(function (err) {
    if (err) {
      console.log("Unable to connect to Mongo.");
      process.exit(1);
    }
    database = db.get();
    loginmanager.initdatabase(database);
    roommanager.initdatabase(database);
    gamemanager.initdatabase(database);
  });

  eventemitter.on("roomdelete", function (mydata) {
    roommanager.deleteroom(mydata);
  });
};

exports.initsocket = function (socket, io) {
  console.log("Ala re alaa");
  roommanager.setsocketio(io);
  gamemanager.setsocketio(io);
  gamemanager.addsocket(socket.id);

  socket.on("REQ_LOGIN", function (data) {
    console.log("Piyush is gOOD bOY....");
    loginmanager.LogIn(socket, data);
  });

  socket.on("REQ_REGISTER", function (data) {
    console.log("sandu ke chacha ne..");
    loginmanager.SignUp(socket, data);
  });
  socket.on("REQ_VALID_NAME", function (data) {
    console.log("Chandu ki chahchi ko..");
    loginmanager.Valid_Name(socket, data);
  });

  socket.on("REQ_CHECK_ROOMS", function (data) {
    roommanager.Check_Rooms(socket, data);
  });

  socket.on("REQ_CREATE_ROOM", function (data) {
    roommanager.CreateRoom(socket, data);
  });

  socket.on("REQ_JOIN_ROOM", function (data) {
    roommanager.JoinRoom(socket, data);
  });
  socket.on("Game_Fore_End", function (data) {
    gamemanager.RemoveRoom(socket, data);
  });
  socket.on("PASS_TIME_RESULT", function (data) {
    gamemanager.GetRoomPassedTime(socket, data);
  });

  socket.on("REQ_USERLIST_ROOM", function (data) {
    gamemanager.GetUserListInRoom(data.roomid);
  });

  socket.on("REQ_TURNUSER", function (data) {
    gamemanager.GetTurnUser(socket, data);
  });
  socket.on("REQ_GUESS_SUCCESS", function (data) {
    gamemanager.GuessWordSuccess(data);
  });

  socket.on("REQ_ROOM_LIST", function () {
    roommanager.GetRoomList();
  });

  socket.on("REQ_CHAT", function (data) {
    gamemanager.ChatMessage(socket, data);
  });

  socket.on("REQ_LEAVE_ROOM", function (data) {
    gamemanager.LeaveRoom(socket, data);
  });

  socket.on("disconnect", function () {
    gamemanager.OnDisconnect(socket);
  });
  socket.on("reconnect", (attemptNumber) => {
    console.log(attemptNumber);
  });
  socket.on("RECONNECTED", function (data) {
    console.log("- Reconnect", data.roomid, data.username, data.old_socketID);
    roommanager.ReJoinRoom(socket, data);
  });
  socket.on("REQ_ROLL_DICE", function (data) {
    gamemanager.Roll_Dice(socket, data);
  });
  socket.on("REQ_MOVE_TOKEN", function (data) {
    gamemanager.Move_Token(socket, data);
  });

  socket.on("REQ_AUTO", function (data) {
    gamemanager.Set_Auto(socket, data);
  });

  socket.on("REQ_USER_INFO", function (data) {
    loginmanager.GetUserInfo(socket, data);
  });

  socket.on("REQ_UPDATE_USERINFO", function (data) {
    console.log("REQ_UPDATE_USERINFO....",data);
    loginmanager.UpdateUserInfo(socket, data);
  });

  socket.on("UPLOAD_USER_PHOTO", function (data) {
    loginmanager.Get_User_Photo(data, socket);
  });

  socket.on("REQ_ROOM_INFO", function (data) {
    roommanager.GetRoomInfo(socket, data);
  });
  socket.on("REQ_RANK_LIST", function (data) {
    gamemanager.GetRankList(socket, data);
  });
  socket.on("REQ_GAME_HIST", function (data) {
    gamemanager.AddHistory(data);
  });
  socket.on("REQ_SPIN", function (data) {
    gamemanager.CheckSpin(socket, data);
  });
  socket.on("REQ_CHECK_REFFERAL", function (data) {
    roommanager.CheckRefferal(socket, data);
  });
  socket.on("REQ_CHECK_REFFERAL_BOUNCE", function (data) {
    roommanager.CheckRefferal_Bounce(socket, data);
  });
  socket.on("REQ_PAUSE", function (data) {
    gamemanager.Pause_Game(socket, data);
  });
  socket.on("REQ_RESUME", function (data) {
    gamemanager.Resume_Game(socket, data);
  });

  //tournament

  socket.on("REQ_TOURNAMENTS", function () {
    console.log("REQ_TOURNAMENTS....");
    loginmanager.TournamentList(socket);
  });

  //withdrawal

  socket.on("REQ_WITHDRAWAL", function (data) {
    console.log("REQ_WITHDRAWAL....", data);
    loginmanager.WidrawalRequest(socket, data);
  });

  //accountHistory

  socket.on("REQ_ACCOUNT_HISTORY", function (data) {
    console.log("REQ_ACCOUNT_HISTORY....", data);
    loginmanager.AccountHistoryRequest(socket, data);
  });

  //REQ_WHATSAPP

  socket.on("REQ_WHATSAPP", function () {
    console.log("REQ_WHATSAPP....");
    loginmanager.WhatsappRequest(socket);
  });
};
