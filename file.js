// This was written by the wonderful Forrest Tait
// modified by Mark to be part of core for convenience
// twas not designed for production use
// only simple local development.

const Gun = require('../gun');
const json6 = require( 'json-6' );
const fs = require('fs');
const async = require('async');


function preloadDisk( opt, disk ) {
	fs.open( opt['file-name'], "r", opt['file-mode'], function(err,fd) {
		if( err ) { if( err.code !== "ENOENT" ) Gun.log( 'file-error', err ) }
		else {
			var parser = json6.begin( function(val) {
				disk[val[0]] = val[1];
			} );
			var buf = new Buffer( 4096 );
			function loop() {
				fs.read( fd, buf, 0, 4096, null/*read from curpos*/, function( err, bytesRead, buffer ) {
					if( !bytesRead ) {
						fs.close(fd);
						Gun.obj.ify( disk );
					} else {
						parser.add( buf.toString('utf8',0,bytesRead) );
						loop();
					}
				} );
			}
			loop();
		}
	} );
}

Gun.on('opt', function(ctx){
	this.to.next(ctx);
	var opt = ctx.opt;
	if(ctx.once){ return }
	opt['file-name'] = String(opt['file-name'] || 'data.json');
	opt['file-mask'] = String(opt['file-mask'] || 0666);
	opt['file-pretty'] = String(opt['file-pretty'] || true);
	var graph = ctx.graph, acks = {}, count = 0, to;
	var disk = {};
	preloadDisk(opt, disk);

	Gun.log.once(
		'file-warning',
		'WARNING! This `gun-file` pre-alpha module for gun for development testing only!'
	);
	
	ctx.on('put', function(at){
		this.to.next(at);
		Gun.graph.is(at.put, null, map);
		if(!at['@']){ acks[at['#']] = true; } // only ack non-acks.
		count += 1;
		if(count >= (opt.batch || 10000)){
			return flush();
		}
		if(to){ return }
		to = setTimeout(flush, opt.wait || 1);
	});

	ctx.on('get', function(at){
		this.to.next(at);
		var gun = at.gun, lex = at.get, soul, data, opt, u;
		//setTimeout(function(){
		if(!lex || !(soul = lex[Gun._.soul])){ return }
		//if(0 >= at.cap){ return }
		var field = lex['.'];
		data = disk[soul] || u;
		if(data && field){
			data = Gun.state.to(data, field);
		}
		gun.on('in', {'@': at['#'], put: Gun.graph.node(data)});
		//},11);
	});

	var map = function(val, key, node, soul){
		disk[soul] = Gun.state.to(node, key, disk[soul]);
	}

	var wait;
	var flush = function(){
		if(wait){ return }
		clearTimeout(to);
		to = false;
		var ack = acks;
		acks = {};
		wait = true;
		var pretty = opt['file-pretty']?3:null;
		var stream = fs.createWriteStream( opt['file-name'], {encoding:'utf8', mode:opt['file-mode'], flags:"w"} );
		stream.on('open', function () {
			async.forEachOf( disk, function(item,key,next) {
				if( !stream.write( JSON.stringify( [key, disk[key]], pretty ), 'utf8', function() {
					next();
				} ) ) {
					// wait for on_something before next write.
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