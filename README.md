# gun-file

A streaming file extension for Gun.

## Controlling Options

```
	var gun = new Gun( { 'file-name' : 'yourData.json',  // default is 'data.json'
                             'file-mask' : 0666, // default is 0666
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

1.0.2 - update gun revision in package.json; added .npmignore 
1.0.1 - update to JSON6 library rename of 'add' to 'write'
1.0.0 - Initial release