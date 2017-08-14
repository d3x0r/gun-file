# gun-file

A streaming file extension for Gun.

## Controlling Options

```
	var gun = new Gun( { 'file-name' : 'yourData.json',
                             'file-mask' : 0666, // default
                             'file-pretty' : true, // default, if false, will write ugly/compressed json
                             'file-delay' : 100,  // control flush interval/delay
                           } );

```


