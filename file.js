// This was written by the wonderful Forrest Tait
// modified by Mark to be part of core for convenience
// twas not designed for production use
// only simple local development.

const Gun = require('gun/gun');
const json6 = require( 'json-6' );
const fs = require('fs');
const async = require('async');



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
		Gun.graph.is(at.put, null, map);
		if( skip_put == at['@'] ) { 
			//console.log( "skipping put in-get", at ); 
			return; 
		}
		if(!at['@']){ acks[at['#']] = true; } // only ack non-acks.
		else if( pend && at['@'] == pend.at['#'] ) {
			//console.log( "Prevent self flush" ); 
			return;
		}
		//console.log( "WILL FLUSH WITH at:", at );
		//console.log( "pend:", pend );
		//console.log( "skip:", skip_put );
		count += 1;
		if(count >= (opt.batch || 10000)){
			return flush();
		}
		//console.log( "put happened?" );
		if(to){ return }
		to = setTimeout(flush, opt['file-delay'] );
	});

	ctx.on('get', function(at){
		this.to.next(at);
		var gun = at.gun, lex = at.get, soul, data, opt, u;
		//setTimeout(function(){
		if(!lex || !(soul = lex[Gun._.soul])){ return }
		//if(0 >= at.cap){ return }
		var field = lex['.'];

		if( reading )	
			pending.push( {gun:gun, soul:soul, at:at, u:u, field:field} );
		else {
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
			//console.log( "READ STREAM ERROR:", err );
		} );
 	 	stream.on('data', function(chunk) {
			//console.log( "got stream data" );
			parser.add( chunk );
		});
		stream.on( "close", function(){ 
			//console.log( "reading done..." );
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
				console.log( "WANTED FLUSH during READ?" );
				if(to){ return }
				to = setTimeout(flush, opt['file-delay'] );
			}
		} );

	}

	var wait;
	var flush = function(){
		if(reading) { wantFlush = true; return }
		if(wait){ return }
		clearTimeout(to);
		to = false;
		var ack = acks;
		acks = {};
		wait = true;
		var pretty = opt['file-pretty']?3:null;
		var stream = fs.createWriteStream( opt['file-name'], {encoding:'utf8', mode:opt['file-mode'], flags:"w+"} );
		var waitDrain = false;
		//console.log( "DOING FLUSH" );
		stream.on('open', function () {
			async.forEachOf( disk, function(item,key,next) {
				//console.log( "output : ", key );
				var out = JSON.stringify( [key, disk[key]], null, pretty ) + (pretty?"\n":"");
				if( !stream.write( out, 'utf8', function() {
					if( !waitDrain ) next();
				} ) ) {
					// wait for on_something before next write.
					waitDrain = true;
					stream.once('drain', next );
				}
			}, function(err){
				stream.end();
				if( err ) throw new Error( err );
				wait = false;
				var tmp = count;
				count = 0;
				Gun.obj.map(ack, function(yes, id){
					ctx.on('in', {
						'@': id,
						err: err,
						ok: 1
					});
				});
				if(1 < tmp){ flush() }
			} );
		} );

	}
});