# gun-file

A streaming file extension for Gun.

## Controlling Options

```
	var gun = new Gun( { 'file-name' : 'yourData.json',  // default is 'data.json6'
                             'file-mode' : 0666, // default is 0666
                             'file-pretty' : true, // default, if false, will write ugly/compressed json
                             'file-delay' : 100,  // default. control flush interval/delay default.
                           } );

```

## Important

To avoid conflict with Gun's builtin file driver, you will have to use ```require('gun/gun')``` plus any other modules you want to use.
The option ```file:null``` should work in gun to disable the builtin driver, but at this point does not.

```
var Gun = require( "gun/gun" );
require( 'gun-file' );
```



### Changelog
- 1.0.123 - update to gun latest API ( deleted internal value) 
- 1.0.121 - generate 'in' on ctx instead of gun.  (Issue #2)
- 1.0.120 - test file path dyanamically to use common gun instead of potential private path...
- 1.0.119 - update to gun 0.9
- 1.0.118 - 'in' events require posting the gun instance they are on in the message now.  Change default filename to data.json6.
- 1.0.117 - remove alpha warning message.
- 1.0.116 - add shared cache between instances using the same filename
- 1.0.115 - fix a couple more short timeout cross read/writes.
- 1.0.114 - handle short timeouts better; flushes during flushes would lose the event to flush.
- 1.0.113 - Handle multiple connections with same file better; prevent writing while another is reading.
- 1.0.112 - add acks on puts; add method to attach gun-file to a gun datbase should it fail to load correct gun base.
- 1.0.111 - fix getting file-pretty option.
- 1.0.11 - update gun revision in package.json; added .npmignore 
- 1.0.1 - update to JSON6 library rename of 'add' to 'write'
- 1.0.0 - Initial release



### Benchmark Results 

```
__ Small Nodes: 10 Properties Each __
Write 10000 nodes: : 2164ms; 2.164s; 0.216 ms/node; errors: 0.
Read 10000 nodes: : 3005ms; 3.005s; 0.300 ms/node; errors: 0.
Update 10000 nodes: : 2404ms; 2.404s; 0.240 ms/node; errors: 0.
Update single field on 10000 nodes: : 2593ms; 2.593s; 0.259 ms/node; errors: 0.
__ Medium Nodes: 1000 Properties Each __
Write 100 nodes: : 2302ms; 2.302s; 22.792 ms/node; errors: 0.
Read 100 nodes: : 2411ms; 2.411s; 23.871 ms/node; errors: 0.
Update 100 nodes: : 1636ms; 1.636s; 16.198 ms/node; errors: 0.
Update single field on 100 nodes: : 1667ms; 1.667s; 16.505 ms/node; errors: 0.
__ Large Nodes: 10000 Properties Each __
Write 10 nodes: : 2838ms; 2.838s; 258.000 ms/node; errors: 0.
Read 10 nodes: : 3444ms; 3.444s; 313.091 ms/node; errors: 0.
Update 10 nodes: : 2097ms; 2.097s; 190.636 ms/node; errors: 0.
Update single field on 10 nodes: : 2177ms; 2.177s; 197.909 ms/node; errors: 0.
```
