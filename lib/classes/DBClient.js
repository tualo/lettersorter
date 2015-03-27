var util = require("util");
var events = require("events");
var mysql = require("mysql");
var soundex = require("soundex");




var DBClient = function(){

  events.EventEmitter.call(this);
}

util.inherits(DBClient, events.EventEmitter);

DBClient.prototype.start=function(){
  this.connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    database : 'sorter',
    password : ''
  });
}

DBClient.prototype.update=function(){
  var me=this;
  me.connection.query('SELECT group_concat(distinct strid separator \',\') ids,ort,ortsteil,plz,strasse from fast_access_tour group by ort,ortsteil,plz,strasse', function(err, rows, fields) {
    if (err) throw err;
    me.updateSoundex(rows);
  });
}
DBClient.prototype.soundexify=function(sentence){
  var i,words = sentence.replace(/[.,?!;()"'-]/g, " ")
          .replace(/\s+/g, " ")
          .toLowerCase()
          .split(" ");
  for(i=0;i<words.length;i++){
    if (isNaN(words[i])){
      words[i] = soundex(words[i]);
    }
  }
  return words.join(' ');
}
DBClient.prototype.updateSoundex=function(rows){
  var me=this,row, adr,txt,i,m,sql;

  sql='delete from ocrhash;';
  me.connection.query(sql,function(err,res){

    for (i=0,m= rows.length;i<m;i++){
      row = rows[i];
      adr = row.strasse;
      if (row.ort){
        adr+= ' ' + row.ort;
      }
      if (row.ortsteil){
        adr+= ' ' + row.ortsteil;
      }

      txt = adr +' '+row.plz;
      adr = me.soundexify(adr)+' '+row.plz;
      sql='insert into ocrhash (ids,adr,txt) values (?,?,?)';
      me.connection.query(sql,[row.ids,adr,txt],function(err,res){});

    }
  });

  log("info","dbclient","index is updated");
}
/*
DBClient.prototype.findBy=function(town,zipcode,street,housenumber){
  var me = this,sql,ids,i;

  sql = 'select * from  '
  me.connection.query(sql,[txt],function(err,rows){
  });
}
*/
DBClient.prototype.findText=function(txt){
  var me = this,sql,ids,i;
  console.time('dbfind');
  //txt = this.soundexify(txt);
  sql='SELECT ocrhash.ids,ocrhash.adr,match(adr) against(?) as rel  FROM ocrhash having rel > 0 order by rel desc limit 1';
  me.connection.query(sql,[txt],function(err,rows){
    ids = '';
    if (rows.length===1){
      sql = 'select * from fast_access_tour where strid in ('+rows[0].ids+') and regiogruppe=\'Zustellung\'';
      me.connection.query(sql,function(err,rows){
        console.log(err,rows);
        console.timeEnd('dbfind');
      });
    }
  });

  log("debug","dbclient","find "+txt);
}

DBClient.prototype.stop=function(){
  this.connection.end();
}

exports.DBClient = DBClient;