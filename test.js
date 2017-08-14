

var Gun = require( "gun/gun" );
var gunNot = require('gun/lib/not')
var gunFile = require( "." );

var gun = new Gun( { 'file-name':'data.other.json' } );

var root = gun.get( "db" );

root.not( ()=>{
	console.log( "not happened." );
	root.put( { hello:"world" } );
	root.put( { other:"test" } );
	root.set( { field: "randomkey" } );
	root.set( { field: "randomkey" } );
	root.set( { field: "randomkey" } );
} );

root.map( (field,val)=>{ console.log( "Got:", val, field ) } )


