// This was written by the wonderful d3x0r
console.log( "module:",module, module.filename.includes( "node_modules/gun-file" ));

const Gun = require(module.filename.includes( "node_modules/gun-file" )?'../gun/gun':'gun/gun');
const json6 = require( 'json-6' );
const fs = require('fs');
const _debug = false;
const _json_debug = false;
const _debug_write_time = false;

const rel_ = Gun.val.rel._;  // '#'
const val_ = Gun.obj.has._;  // '.'
const node_ = Gun.node._;  // '_'
const state_ = Gun.state._;// '>';
const soul_ = Gun.node.soul._;
const ACK_ = '@';
const SEQ_ = '#';

const fileStates = {};

exports.attach = function( Gun ) {

Gun.on('opt', function(ctx){
	this.to.next(ctx);
	var opt = ctx.opt;
	if(ctx.once){ return }
	var fileName = String(opt['file-name'] || 'data.json6');
	var fileMode = opt['file-mode'] || 0666;
	var filePretty = ('file-pretty' in opt)?opt['file-pretty']:true;
	var fileDelay = opt['file-delay'] || 100;
	var gun = ctx.gun;
	var graph = ctx.graph, acks = {}, count = 0, to;
	
	//var reading = false;
	var pending = [];
	var pendingPut = [];
	var pend = null;
	var pendPut = null;
	var wantFlush = false;
	var loaded = false;
	var fileState = fileStates[fileName] || ( fileStates[fileName] = { reading:false, writing:false, flushPending : false, disk : {} } );
	
	preloadDisk(opt, fileState.disk);

	//Gun.log.once(
	//	'file-warning',
	//	'WARNING! This `gun-file` pre-alpha module for gun for testing only!'
	//);
	
	var skip_put;
	function doPut( at ) {
		//_debug && console.log( "So this should be updating db?", skip_put, pend );
		Gun.graph.is(at.put, null, map);
		if( !loaded ) {
			pendingPut.push( at );
			return;	
		}
		if( skip_put && skip_put == at['@'] ) { 
			//_debug && console.log( "skipping put in-get", skip_put, at['@'] ); 
			return; 
		}
		if(!at['@']){ acks[at[SEQ_]] = true; } // only ack non-acks.
		else if( pend && at['@'] == pend.at[SEQ_] ) {
			_debug && console.log( "Prevent self flush", pend ); 
			return;
		}
		//console.log( "WILL FLUSH WITH at:", at );
		//console.log( "pend:", pend );
		//console.log( "skip:", skip_put );
		count += 1;
		if(count >= (opt.batch || 10000)){
			clearTimeout( to );
			to = null;
			return flush();
		}
		if( !to )
			_debug && console.log( "put happened?", to !== null );
		if(to) clearTimeout( to );
		to = setTimeout(flush, fileDelay );
		fileState.flushPending = true;
		ctx.on('in', {[ACK_]: at[rel_], gun:gun, ok: 1});
	}

	ctx.on('put', function(at) {
		this.to.next(at);
		doPut(at) 
	});

	ctx.on('get', function(at){
		this.to.next(at);
		var gun = at.gun, lex = at.get, soul, data, opt, u;
		if(!lex || !(soul = lex[soul_])){ return }
		var field = lex[val_];
		if( fileState.reading || fileState.flushPending || !loaded ) {
			_debug && console.log( "Still reading... pushing request." );
			pending.push( {gun:gun, ctx:ctx, soul:soul, at:at, field:field} );
		} else {
			
			data = fileState.disk[soul] || u;
			if(data && field){
				_debug && console.log( "get field?", field, data );
				data = Gun.state.to(data, field);
			}
			//else console.log( "not data or not field?", field );
			if( data ) {
				skip_put = at[SEQ_];
				ctx.on('in', {[ACK_]: at[SEQ_], gun:gun, put: Gun.graph.node(data)});
				//_debug && console.log( "getting data:", data );
				skip_put = null;
			}
			else {
				_debug && console.log( "didn't get dat for", soul );
				ctx.on('in', {[ACK_]: at[SEQ_], gun:gun, err: "no data"});
			}
		}
		//},11);
	});

	var map = function(val, key, node, soul){
		//_debug && console.log( "mapping graph?", soul );
		fileState.disk[soul] = Gun.state.to(node, key, fileState.disk[soul]);
	}


	function preloadDisk( opt, disk ) {
		if( fileState.loaded )
			return; // already have the disk image in memory
		if( fileState.flushPending || fileState.writing ) {
			_debug && console.log( "wait for pending flush on another connection?" );
			setTimeout( ()=>preloadDisk( opt, disk ), fileDelay/3 );
			return;
		}
		fileState.reading = true;
		_debug && console.log( new Date(), "preload happened." );
		const stream = fs.createReadStream( fileName, { flags:"r", encoding:"utf8"} );
		const parser = json6.begin( function(val) {
			//_json_debug && console.log( "Recover:", val[0] );
			disk[val[0]] = val[1];
		} );
		stream.on('open', function() {
			_debug && console.log( new Date(), "Read stream opened.." );
		} );
		stream.on('error', function( err ){ 
			if( err.code !== 'ENOENT' )
				console.log( "READ STREAM ERROR:", err );
			loaded = true;
			fileState.reading = false;
			handlePending();
		} );
 	 	stream.on('data', function(chunk) {
			//_json_debug && console.log( "got stream data",chunk );
			parser.write( chunk );
		});
		stream.on( "close", function(){ 
			_debug && console.log( new Date(), "reading done..." );
			loaded = true;
			fileState.reading = false;
			//console.log( "File done" );
                        _debug && console.log( "Handle ", pending.length, "pending reads" );
			handlePending();
		} );
		function handlePending() {
			while( pendPut = pendingPut.shift() ) {
				doPut( pendPut );
			}
			while( pend = pending.shift() ) {
				var data = disk[pend.soul] || pend.u;
				if(data && pend.field){
					data = Gun.state.to(data, pend.field);
				}
				_debug && console.log( "Sending pending response...", pend.at[SEQ_] );
				pend.ctx.on('in', {[ACK_]: pend.at[SEQ_], put: Gun.graph.node(data)});
				_debug && console.log( "Sent pending response...", pend.at[SEQ_] );
			}
			if( wantFlush ) {
				_debug && console.log( "WANTED FLUSH during READ?", to );
				if(to) clearTimeout( to );
				to = setTimeout(flush, fileDelay );
			}
		}
	}

	var startWrite;
	var flush = function(){
		//_debug && console.log( Date.now(), "DOING FLUSH", reading, writing, count );
		if( to )
			clearTimeout(to);
		to = null;
		count = 0;
		if(fileState.reading) {
			_debug && console.log( "Still reading, don't write", fileState.flushPending ); 
			to = setTimeout( flush, fileDelay/3 ); 
			fileState.flushPending = true;
			wantFlush = true; 
			return; 
		}
		if(fileState.writing){ 
			to = setTimeout( flush, fileDelay );
			_debug && console.log( "Still flushing, don't flush", fileState.flushPending ); 
			fileState.flushPending = true;
			return;
		}
		_debug && console.log( Date.now(), "DOING FLUSH", fileState.reading, fileState.writing, count );
		
		var ack = acks;
		acks = {};
		fileState.writing = true;
		fileState.flushPending = false;
		var pretty = filePretty?3:null;
		var stream = fs.createWriteStream( fileName, {encoding:'utf8', mode:fileMode, flags:"w+"} );
		var waitDrain = false;
		stream.on('open', function () {
			var keys = Object.keys( fileState.disk );
			var n = 0;
			if( _debug_write_time ) startWrite = Date.now();
			_debug && console.log( new Date(), "stream write opened..." );
			function writeOne() {
				if( n >= keys.length ) {
					fileState.writing = false;
					_debug_write_time && console.log( "Write to file:", Date.now() - startWrite );
					_debug && console.log( "done; closing stream." );
					stream.end();
					//var tmp = count;
					count = 0;
					Gun.obj.map(ack, function(yes, id){
						ctx.on('in', {
							[ACK_]: id,
							gun: gun,
							err: false,
							ok: 1
						});
					});
					//if(1 < tmp){ flush() }
					return;				        
				}
				var key = keys[n++];
				var out = JSON.stringify( [key, fileState.disk[key]], null, pretty ) + (pretty?"\n":"");
				if( !stream.write( out, 'utf8', function() {
					if( !waitDrain ){ 
						if( fileState.writing ) writeOne();  // otherwise already completed writing everything.
					}
					else { 
						//_debug && console.log( "Skipped doing next?" ); 
					}
				} ) ) {
					// writing for on_something before next write.
					waitDrain = true;
					//_debug && console.log( "wait DRAIN" );
					stream.once('drain', function(){ 
						//_debug && console.log( "Continue after drain happened." );
						if( waitDrain ) {
							waitDrain = false;
							writeOne();
						} else {
							// just the last write finishing don't retrigger.
						}
					});
				}
			}
			writeOne();
		} );

	}
});
}

exports.attach( Gun );