// This was written by the wonderful Forrest Tait
// modified by Mark to be part of core for convenience
// twas not designed for production use
// only simple local development.

const Gun = require('gun/gun');
const json6 = require( 'json-6' );
const fs = require('fs');
const _debug = false;


Gun.on('opt', function(ctx){
	this.to.next(ctx);
	var opt = ctx.opt;
	if(ctx.once){ return }
	opt['file-name'] = String(opt['file-name'] || 'data.json');
	opt['file-mask'] = String(opt['file-mask'] || 0666);
	opt['file-pretty'] = String(opt['file-pretty'] || true);
	opt['file-delay'] = String(opt['file-delay'] || 100 );
	var graph = ctx.graph, acks = {}, count = 0, to;
	var disk = {};
	var reading = false;
	var pending = [];
	var pend = null;
	var wantFlush = false;
	preloadDisk(opt, disk);

	Gun.log.once(
		'file-warning',
		'WARNING! This `gun-file` pre-alpha module for gun for testing only!'
	);
	
	var skip_put;
	ctx.on('put', function(at){
		this.to.next(at);
		_debug && console.log( "So this should be updating db?", skip_put, pend );
		Gun.graph.is(at.put, null, map);

		if( skip_put && skip_put == at['@'] ) { 
			_debug && console.log( "skipping put in-get", skip_put, at['@'] ); 
			return; 
		}
		if(!at['@']){ acks[at['#']] = true; } // only ack non-acks.
		else if( pend && at['@'] == pend.at['#'] ) {
			_debug && console.log( "Prevent self flush", pend ); 
			return;
		}
		//console.log( "WILL FLUSH WITH at:", at );
		//console.log( "pend:", pend );
		//console.log( "skip:", skip_put );
		count += 1;
		if(count >= (opt.batch || 10000)){
			return flush();
		}
		_debug && console.log( "put happened?", to );
		if(to){ return }
		to = setTimeout(flush, opt['file-delay'] );
	});

	ctx.on('get', function(at){
		this.to.next(at);
		var gun = at.gun, lex = at.get, soul, data, opt, u;
		if(!lex || !(soul = lex[Gun._.soul])){ return }
		var field = lex['.'];

		if( reading )	
			pending.push( {gun:gun, soul:soul, at:at, u:u, field:field} );
		else {
			_debug && console.log( "getting data:", soul );
			data = disk[soul] || u;
			if(data && field){
				data = Gun.state.to(data, field);
			}
			skip_put = at['#'];
			gun.on('in', {'@': at['#'], put: Gun.graph.node(data)});
			skip_put = null;
		}
		//},11);
	});

	var map = function(val, key, node, soul){
		_debug && console.log( "mapping graph?", soul );
		disk[soul] = Gun.state.to(node, key, disk[soul]);
	}


	function preloadDisk( opt, disk ) {
		reading = true;
		//console.log( "preload happened." );
		const stream = fs.createReadStream( opt['file-name'], { flags:"r", encoding:"utf8"} );
		const parser = json6.begin( function(val) {
			//console.log( "Recover:", val );
			disk[val[0]] = val[1];
		} );
		stream.on('open', function() {
			//console.log( "Read stream opened.." );
		} );
		stream.on('error', function( err ){ 
			if( err.code !== 'ENOENT' )
				console.log( "READ STREAM ERROR:", err );
			reading = false;
		} );
 	 	stream.on('data', function(chunk) {
			//console.log( "got stream data" );
			parser.add( chunk );
		});
		stream.on( "close", function(){ 
			_debug && console.log( "reading done..." );
			reading = false;
			//console.log( "File done" );
			while( pend = pending.shift() ) {
				var data = disk[pend.soul] || pend.u;
				if(data && pend.field){
					data = Gun.state.to(data, pend.field);
				}
				//console.log( "Sending pending response..." );
				pend.gun.on('in', {'@': pend.at['#'], put: Gun.graph.node(data)});
			}
			if( wantFlush ) {
				_debug && console.log( "WANTED FLUSH during READ?", to );
				if(to){ return }
				to = setTimeout(flush, opt['file-delay'] );
			}
		} );

	}

	var wait;
	var flush = function(){
		_debug && console.log( "DOING FLUSH", reading, wait, count );
		if(reading) { wantFlush = true; return; }
		if(wait){ return }
		clearTimeout(to);
		to = false;
		var ack = acks;
		acks = {};
		wait = true;
		var pretty = opt['file-pretty']?3:null;
		var stream = fs.createWriteStream( opt['file-name'], {encoding:'utf8', mode:opt['file-mode'], flags:"w+"} );
		var waitDrain = false;
		stream.on('open', function () {
			var keys = Object.keys( disk );
			var n = 0;
			
			function writeOne() {
				if( n >= keys.length ) {
					_debug && console.log( "done; close stream." );
					stream.end();
					wait = false;
					//var tmp = count;
					count = 0;
					Gun.obj.map(ack, function(yes, id){
						ctx.on('in', {
							'@': id,
							err: false,
							ok: 1
						});
					});
					//if(1 < tmp){ flush() }
					return;				        
				}
				var key = keys[n++];
				var out = JSON.stringify( [key, disk[key]], null, pretty ) + (pretty?"\n":"");
				if( !stream.write( out, 'utf8', function() {
					if( !waitDrain ){ writeOne(); }
					else { _debug && console.log( "Skipped doing next?" ); }
				} ) ) {
					// wait for on_something before next write.
					waitDrain = true;
					_debug && console.log( "wait DRAIN" );
					stream.once('drain', function(){ 
						_debug && console.log( "Continue after drain happened." );
						waitDrain = false;
						writeOne()
					});
				}
			}
			writeOne();
		} );

	}
});