var MongoClient = require("mongodb").MongoClient;
var URL = "mongodb://35.154.250.202:27017/desiludo";

var state = {
  db: null,
};

exports.connect = function (done) {
  if (state.db) return done();

  MongoClient.connect(
    URL,
    { useNewUrlParser: true, useUnifiedTopology: true },
    function (err, client) {
      if (err) return done(err);
      var db = client.db("desiludo");
      state.db = db;
      done();
    }
  );
};

exports.get = function () {
  return state.db;
};

exports.close = function (done) {
  if (state.db) {
    state.db.close(function (err, result) {
      state.db = null;
      state.mode = null;
      done(err);
    });
  }
};
