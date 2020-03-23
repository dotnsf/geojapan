//. prefCheck.js
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

setTimeout( main, 3000 );


function main(){
  var check_points = [
    [  //. 千葉
      139.92721582306365,
      35.72382884730813
    ],
    [  //. 埼玉
      139.30927403582547,
      35.94216635315184
    ],
    [  //. 外
      139.738, //139.740,
      35.3115 //35.311466217040994
    ],
    [  //. 内（千葉？）
      139.740493774414,
      35.311798095703054
    ]
  ];

  var pref_id = ( process.argv.length > 2 ? process.argv[2] : '12' );
  db.get( 'pref-' + pref_id, function( err, result ){
    if( err ){
      console.log( err );
    }else{
      var type = result.geometry.type;  //. 'Polygon' or 'MultiPolygon'
      var coordinates = result.geometry.coordinates;

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

      for( var idx = 0; idx < check_points.length; idx ++ ){
        var cp = check_points[idx];
        var point = new Point( cp[0], cp[1] );

        console.log( 'idx = ' + idx );
        console.log( JSON.stringify( cp ) );
        var b = false;
        for( var i = 0; i < Polygons.length && !b; i ++ ){
          var Polygon = Polygons[i];
          var PolygonHole = PolygonHoles[i];

          var polygon_points = JSON.parse( JSON.stringify( Polygon ) );
          var n = polygon_points.length - 1;

          b = isInside( polygon_points, n, point );
          if( b && PolygonHole && PolygonHole.length > 0 ){
            PolygonHole.forEach( function( p_hole ){
              var hole_points = JSON.parse( JSON.stringify( p_hole ) );
              var n = hole_points.length - 1;
              var b_hole = isInside( hole_points, n, point );
              if( b_hole ){
                b = false;
              }
            });
          }
        }
        console.log( '-> idx = ' + idx + ' : isInside = ' + b );
      }
    }
  });

  /*
  //. Polygon の場合
  var polygon = [
    [
      139.743499755859,
      35.311267852783175
    ],
    [  //. 左上
      139.740493774414,
      35.311466217040994
    ],
    [  //. 左上
      139.739395141602,
      35.311798095703054
    ],
    [  //. 右上
      139.743499755859,
      35.3127326965332
    ],
    [  //. 下
      139.743499755859,
      35.311267852783175
    ]
  ];

  //. ポリゴンの生成
  var polygon_points = [];
  polygon.forEach( function( p ){
    var point = new Point( p[0], p[1] );
    polygon_points.push( point );
  });
  var n = polygon_points.length - 1;

  //. 調査対象ポイントを１つずつ調査
  for( var i = 0; i < check_points.length; i ++ ){
    var p = check_points[i];
    var point = new Point( p[0], p[1] );
    var b = isInside( polygon_points, n, point );
  }

  //. MultiPolygon の場合は？  論理和？
  */
}


//. https://www.geeksforgeeks.org/how-to-check-if-a-given-point-lies-inside-a-polygon/#disqus_thread

//. Point クラス
class Point{
  constructor( x, y ){
    this.x = x;
    this.y = y;
  }
}

function onSegment( p, q, r ){
  if( q.x <= Math.max( p.x, r.x ) && q.x >= Math.min( p.x, r.x )
    && q.y <= Math.max( p.y, r.y ) && q.y >= Math.min( p.y, r.y ) ){
    return true;
  }else{
    return false;
  }
}

function orientation( p, q, r ){
  //. 常に返り値が 2 ？
  var v = ( q.y - p.y ) * ( r.x - q.x ) - ( q.x - p.x ) * ( r.y - q.y );
  if( v == 0 ){
    return 0; //. coliner
  }else{
    return ( v > 0 ? 1 : 2 ); //. clockwise or counterclockwise
  }
}

function doIntersect( p1, q1, p2, q2 ){
  var o1 = orientation( p1, q1, p2 );
  var o2 = orientation( p1, q1, q2 );
  var o3 = orientation( p2, q2, p1 );
  var o4 = orientation( p2, q2, q1 );

  if( o1 != o2 && o3 != o4 ){
    return true;
  }else if( o1 == 0 && onSegment( p1, p2, q1 ) ){
    return true;
  }else if( o2 == 0 && onSegment( p1, q2, q1 ) ){
    return true;
  }else if( o3 == 0 && onSegment( p2, p1, q2 ) ){
    return true;
  }else if( o4 == 0 && onSegment( p2, q1, q2 ) ){
    return true;
  }else{
    return false;
  }
}

function isInside( points, n, p ){
  if( n < 3 ){
    return false;
  }else{
    var extreme = new Point( 200, p.y );
    var count = 0;
    var i = 0;
    do{
      var next = ( i + 1 ) % n;
      if( doIntersect( points[i], points[next], p, extreme ) ){
        if( orientation( points[i], p, points[next] ) == 0 ){
          return onSegment( points[i], p, points[next] );
        }
        count ++;
      }
      i = next;
    }while( i != 0 );

    return ( count % 2 == 1 );
  }
}
