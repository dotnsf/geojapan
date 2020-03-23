//.  app.js
var express = require( 'express' ),
    fs = require( 'fs' ),
    request = require( 'request' ),
    app = express();
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

app.use( express.Router() );
app.use( express.static( __dirname + '/public' ) );

//. '/geojson/:pref_id' にアクセスがあった場合の処理
app.get( '/geojson/:pref_id', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var pref_id = req.params.pref_id;
  if( db ){
    if( pref_id ){
      db.get( 'pref-' + pref_id, function( err, result ){
        if( err ){
          console.log( err );
          res.status( 400 );
          res.write( JSON.stringify( { status: false, error: err } ) );
          res.end();
        }else{
          var type = result.geometry.type;  //. 'Polygon' or 'MultiPolygon'
          var coordinates = result.geometry.coordinates;

          res.write( JSON.stringify( { status: true, geojson: { type: type, coordinates: coordinates } } ) );
          res.end();

          /*
          var Polygons = [];
          var PolygonHoles = [];
          switch( type ){
          case 'Polygon':
            //. 一番外側をチェック
            var coordinate = coordinates[0];
            var Polygon = [];
            coordinate.forEach( function( p ){
              var point = new Point( p[0], p[1] );
              Polygon.push( point );
            });
            Polygons.push( Polygon );

            //. 穴、飛び地？
            if( coordinates.length > 1 ){
              var Holes = [];
              for( var i = 1; i < coordinates.length; i ++ ){
                var coordinate = coordinates[i];
                var Hole = [];
                coordinate.forEach( function( p ){
                  var point = new Point( p[0], p[1] );
                  Hole.push( point );
                });
                Holes.push( Hole );
              }
              PolygonHoles.push( Holes );
            }else{
              PolygonHoles.push( null );
            }
            break;
          case 'MultiPolygon':
            coordinates.forEach( function( p_coordinates ){
              //. 一番外側のみチェック
              var coordinate = p_coordinates[0];
              var Polygon = [];
              coordinate.forEach( function( p ){
                var point = new Point( p[0], p[1] );
                Polygon.push( point );
              });
              Polygons.push( Polygon );

              //. 穴、飛び地？
              if( p_coordinates.length > 1 ){
                var Holes = [];
                for( var i = 1; i < p_coordinates.length; i ++ ){
                  var coordinate = p_coordinates[i];
                  var Hole = [];
                  coordinate.forEach( function( p ){
                    var point = new Point( p[0], p[1] );
                    Hole.push( point );
                  });
                  Holes.push( Hole );
                }
                PolygonHoles.push( Holes );
              }else{
                PolygonHoles.push( null );
              }
            });
            break;
          }
        */
        }
      });
    }else{
      res.status( 400 );
      res.write( JSON.stringify( { status: false, error: 'parameter pref_id requied.' } ) );
      res.end();
    }
  }else{
    res.status( 400 );
    res.write( JSON.stringify( { status: false, error: 'db not ready.' } ) );
    res.end();
  }
});

app.get( '/get', function( req, res ){
  var id = null;
  if( req.query.id ){
    id = req.query.id;
  }

  if( id ){
    //console.log( 'GET /get?id=' + id );
    var option = {
      url: settings.api_url + 'get?id=' + id,
      method: 'GET',
      encoding: null, //. 'binary'
      headers: {
        "Content-type": "image/png"
      }
    };
    request( option, ( err0, res0, body0 ) => {
      if( err0 ){
        res.contentType( 'application/json; charset=utf-8' );
        res.status( 400 );
        res.write( JSON.stringify( { status: false, error: err0 } ) );
        res.end();
      }else{
        if( res0 && res0.headers && res0.headers["content-type"] ){
          res.contentType( res0.headers["content-type"] );
        }else{
          res.contentType( 'image/png' );
        }
        res.write( body0, 'binary' );
        res.end();
      }
    });
  }else{
    res.contentType( 'application/json; charset=utf-8' );
    res.status( 400 );
    res.write( JSON.stringify( { status: false, error: 'parameter id required.' } ) );
    res.end();
  }
});


var port = process.env.PORT || 8080;
app.listen( port );
console.log( "server starting on " + port + " ..." );
