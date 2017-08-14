

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

var count = 0;

function showItems() {
	console.log( "Got", count, "items" );
}
var timeout;
root.map( (field,val)=>{ 
	count++;
	if( timeout )
		clearTimeout( timeout );
	timeout = setTimeout( showItems, 100 );
	//console.log( "Got:", val, field ) 
	if( val == "hello" ) {
		for( var n = 0; n < 500; n++ )
			root.set( { field: "randomkey" } );
	}
} )


