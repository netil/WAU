WAU
===

Simple WebAudio API Utility

## Description
* WAU is a WebAudio API library, which facilitate control sound sources and connect WebAudio API's AudioNodes easily.


### Examples
```javascript
var node = new WAU({
     path : "./source",
     source : ["sound1.mp3"[, ... ]]
 });
 
 node.src("sound1.mp3").play(true);  // for loop play
 node.src("sound1.mp3").plug("biquad", { type:0, frequency:500, Q:10 }).play();
 node.src("sound1.mp3").plug("biquad", { type:0, frequency:500, Q:10 }).plug("compressor").play();
 
 // When attempt to get source which isn't in buffer yet, load it to the buffer and throw with error message for the next attempt.
 node.src("sound2.mp3")        // error in first attempt
 node.src("sound2.mp3").play() // ok for next attempt
 
 node.src("sound2.mp3").stop() // stop playing
 ```

### Methods
 * .src(string)     // Get(or load) the audio source.
 * .plug(string)    // Plug the source with the indicated AudioNode. (Check the available list of nodes below)
 * .volume(number)  // Set the volume.
 * .biquad({...})   // Set the biquadFilter value if the source was connected.
 * .play()          // Play audio source.
 * .stop()          // Stop playing source.
 * .getBufferList() // Get decoded audio source in buffer memory.

### List of nodes
*  compressor
```javascript
node.src("sound.mp3").plug("compressor").play();
```

* biquadFilter
```javascript
node.src("sound.mp3").plug("biquad", {
  type : 0,
  frequency : 1000,
  Q : 10
}).play();
```

* convolver
```javascript
node.src("sound.mp3").plug("convolver", "convolver_sound.mp3").play();
```

* delay
```javascript
node.src("sound.mp3").plug("delay", 5).play();
```

* javascript
```javascript
node.src("sound.mp3").plug("javascript", function(e) {
  var nChannel = e.inputBuffer.numberOfChannels;
    
  for(var i=0, aBuffer; i < nChannel;i++) {
    console.log(e.inputBuffer.getChannelData(i));
  }
}).play();
```
