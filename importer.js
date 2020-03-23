//. importer.js
//. japan.geojson.txt を MultiPolygon に分割してバルクインサート
var fs = require( 'fs' );
var cloudantlib = require( '@cloudant/cloudant' );
var settings = require( './settings' );

//. Cloudant データベースに接続
var db = null;
var cloudant = cloudantlib( { account: settings.db_username, password: settings.db_password } );
if( cloudant ){
  cloudant.db.get( settings.db_name, function( err, body ){
    if( err ){
      if( err.statusCode == 404 ){
        cloudant.db.create( settings.db_name, function( err, body ){
          if( err ){
            db = null;
          }else{
            db = cloudant.db.use( settings.db_name );
          }
        });
      }else{
        db = cloudant.db.use( settings.db_name );
      }
    }else{
      db = cloudant.db.use( settings.db_name );
    }
  });
}

var geojson_filename = 'japan.geojson.txt';
setTimeout( main, 3000 );


function main(){
  var txt = fs.readFileSync( geojson_filename, 'utf-8' );
  var json = JSON.parse( txt );

  //. features を取り出す
  var features = json.features;
  features.forEach( function( feature ){
    feature._id = 'pref-' + feature.properties.id;
  });

  saveFeature( features, 0 );
}

function saveFeature( prefs, idx ){
  db.insert( prefs[idx], function( err, result ){
    if( err ){
      console.log( err );
    }else{
      console.log( result );
    }
  });

  idx ++;
  if( idx < prefs.length ){
    setTimeout( function(){
      saveFeature( prefs, idx );
    }, 1000 );
  }
}
