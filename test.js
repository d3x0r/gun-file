

var Gun = require( "../gun" );
var gunFile = require( "." );

var gun = new Gun( { 'file-name':'data.other.json' } );

var root = gun.get( "db" );
root.put( { hello:"world" } );
root.put( { other:"test" } );

root.map( (field,val)=>{ console.log( "Got:", val, field ) } )


