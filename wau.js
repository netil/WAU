/*
 * WebAudio Utility (WAU)
 * 
 * @author  : Jae Sung Park (alberto.park at gmail.com)
 * @version : 0.2
 * @date    : 2013-01-14
 * @update  : 2012-01-29
 * 
 * ---------------------------------------------------------------------------
 *  + Usage :
 * ---------------------------------------------------------------------------
 * var node = new WAU({
 *     path : "./source",
 *     source : ["gangnam_style2.mp3"[, ... ]]
 * });
 * 
 * node.src("gangnam_style2.mp3").play(true);  // for loop play
 * node.src("gangnam_style2.mp3").plug("biquad", { type:0, frequency:500, Q:10 }).play();
 * node.src("gangnam_style2.mp3").plug("biquad", { type:0, frequency:500, Q:10 }).plug("compressor").play();
 * 
 * // When attempt to get source which isn't in buffer yet, load it to the buffer and throw with error message for the next attempt.
 * node.src("gangnam_style.mp3")        // error in first attempt
 * node.src("gangnam_style.mp3").play() // ok for next attempt
 * 
 * ---------------------------------------------------------------------------
 *  + Methods :
 * ---------------------------------------------------------------------------
 * .src(string)     // Get(or load) the audio source.
 * .plug(string)    // Plug the source with the indicated AudioNode. (Check the available list of nodes below)
 * .volume(number)  // Set the volume.
 * .biquad({...})   // Set the biquadFilter value if the source was connected.
 * .play()          // Play audio source.
 * .stop()          // Stop playing source.
 * .getBufferList() // Get decoded audio source in buffer memory.
 * 
 * ---------------------------------------------------------------------------
 *  + List of Nodes :
 * ---------------------------------------------------------------------------
 *  compressor
 *  biquadFilter
 *  convolver
 *  delay
 *  javascript
 * 
 */

// Create WebAudio context instance
var audioContext = window.webkitAudioContext || window.audioContext || null;

// WebAudio Utility module
var WAU = function(oOption) {
    if(!audioContext) {
        throw "Sorry, this browser doesn't support WebAudio API.";
    }
    
    this.buffer = [];  // buffer for decoded audio datas
    this._currentSource = {};
    this._volume = 2;  // initial volume value

    for(var x in oOption) {
        this[x] = oOption[x];
    }

    // If the source option is present, then load into the buffer memory
    if(this.source) {
        for(var i=0, src; src = this.source[i++];) {
            this._load(src, true);
        }
    }
    
    arguments.callee.context = audioContext ? new audioContext() : null;
} 

// WebAudio Utility methods
WAU.prototype = {
    
    /**
     * It returns buffer list
     * 
     * @return {String} 
     */
    getBufferList : function() {
        var aList = [];

        for(var x in this.buffer) {
            aList.push(x);
        }
        
        return aList.join(", ");
    },    
    
    /**
     * Load data via XHR
     * 
     * @param {String} sUrl - loding URL
     * @param {Boolean} bSync - sync option
     */
    _load : function(sUrl) {
        var request = new XMLHttpRequest();
        request.open("GET", this.path +"/"+ sUrl, true);
        request.responseType = "arraybuffer";

        // XHR load callback
        request.onload = this._bind(function(res) {
            // Decode audio data. When it's ready, can be access PCM audio data
            WAU.context.decodeAudioData(request.response,
                // load callback
                this._bind(function(buffer) {
                    this._loadToBuffer(sUrl, buffer);                
                }),
                // error callback
                this._bind(function(e) {
                    console.log("Error on decoding :", e);
            }));
        });

        request.send();
    },

    /**
     * For context bind execution 
     */
    _bind : function(fn) {
        var that = this;

        return function() {
            fn.apply(that, arguments);
        }
    },

    /**
     * Save data on buffer
     * 
     * @param {String} sUrl - key url
     * @param {Object} buffer - audio data
     */
    _loadToBuffer : function(sUrl, buffer) {
        this.buffer[sUrl] = buffer;
    },

    /**
     * Create AudioBufferSource
     * 
     * @param {String} sUrl - key URL to play
     * @return {Object} Buffer source
     */
    _getSource : function(sUrl) {
        var source = WAU.context.createBufferSource();  // creates a sound source

        try {
            source.buffer = this.buffer[sUrl];  // tell the source which sound to play
        } catch(e) {
            this._load(sUrl);
            throw "The source '"+ sUrl +"' not found in buffer. Try again after buffer loading.";
        }

        return source;        
    },
    
    /**
     * Get the audio source from the buffer.
     * 
     * @param {Object} sUrl
     */
    src : function(sUrl) {
        if(!(sUrl in this._currentSource) || this._currentSource[sUrl].playbackState != this._currentSource[sUrl].PLAYING_STATE) {
        
            var source = this._currentSource[sUrl] = this._getSource(sUrl), 
                gainNode = this._currentSource[sUrl].gains = WAU.context.createGainNode();
    
            source.connect(gainNode);

            gainNode.gain.value = this._volume;
            this._lastNode = gainNode;
        }            

        this._currentSourceKey = sUrl;
        
        return this;
    },
    
    /**
     * Plug the source to AudioNode.
     * 
     * @param {String} sNode - AudioNode name
     * @param {Object} vParam
     */
    plug : function(sNode, vParam) {
        this["_"+ sNode +"Node"](vParam);
        return this;
    },
    
    /**
     * CompressorNode
     * 
     * @param {Object} oOption 
     */
    _compressorNode : function() {
        // DynamicsCompressorNode : Commonly used in musical production and game audio 
        // It lowers the volume of the loudest parts of the signal and raises the volume of the softest parts
        var compressor = WAU.context.createDynamicsCompressor();

        this._lastNode.connect(compressor);
        this._lastNode = compressor;
    },
    
    /**
     * BiquadFilterNode
     * 
     * @param {Object} oOption 
     */
    _biquadFilterNode : function(oOption) {
        var biquadFilter = this._currentSource[this._currentSourceKey].biquad = WAU.context.createBiquadFilter();

        this._lastNode.connect(biquadFilter);
        this._lastNode = biquadFilter;

        biquadFilter.type = 0;
        biquadFilter.frequency.value = 0;
        biquadFilter.Q.value = 0;

        this.setBiquad(oOption);
    },

    /**
     * Set biquadFilter value
     * 
     * @param {Option} oOption 
     */
    setBiquad : function(oOption) {
        var biquadFilter = this._currentSource[this._currentSourceKey].biquad;
        
        if(!biquadFilter) {
            throw "Plug biquadFilter node first!";
        }        
        
        for(var x in oOption) {
            biquadFilter[x][x != "type" ? "value" : ""] = oOption[x];
        }
    },

    /**
     * ConvolverNode
     * 
     * @param {String} sName - convolver buffer source name 
     */
    _convolverNode : function(sName) {  
        // Make a convolver node for the impulse response.
        var convolver = WAU.context.createConvolver();
        
        if(sName in this.buffer) {
            convolver.buffer = this.buffer[sName];

            this._lastNode.connect(convolver);
            this._lastNode = convolver;
        } else {
            this._load(sName);

            throw "Convolver buffer source '"+ sName +"' not loaded yet on memory. Try again after complete loading.'";
        }
    },

    /**
     * DelayNode
     * 
     * @param {Number} nDelay 
     */
    _delayNode : function(nDelay) {
        var oDelayNode = WAU.context.createDelayNode(),
            nNow = WAU.context.currentTime;           
        
        this._lastNode.connect(oDelayNode);
        this._lastNode = oDelayNode;

        oDelayNode.delayTime.setValueAtTime(0, nNow);
        oDelayNode.delayTime.linearRampToValueAtTime(1, nNow + nDelay);  
    },

    /**
     * JavaScriptNode 
     * 
     * @param {Object} fp - onaudioporcess callback function
     */
    _javascriptNode : function(fp) {
        // Create mix node (gain node to combine everything).
        var mix = WAU.context.createGainNode(),

            // Create meter using createJavaScriptNode
            // This value controls how frequently the onaudioprocess event handler is called
            // and how many sample-frames need to be processed each call
            // @param1 {Number} buffer size : one of 256, 512, 1024, 2048, 4096, 8192, 16384
            // @param2 {Number} number of input channel
            // @param3 {Number} number of output channel
            meter = WAU.context.createJavaScriptNode(2048, 1, 1);

        meter.onaudioprocess = fp;

        // Connect the whole sound to mix node.
        this._lastNode.connect(mix);
        mix.connect(meter);
        this._lastNode = meter;

        mix.connect(WAU.context.destination);
    },

    /**
     * Get the current selected sound resource from the buffer 
     */
    _getCurrentSource : function() {
        return this._currentSource[this._currentSourceKey] || null;
    },
    
    /**
     * Set the volume
     * 
     * @param {Number} - Volume 
     */
    volume : function(nVolume) {
        var source = this._getCurrentSource();
        source.gains.gain.value = nVolume;

        return this;
    },
    

    /**
     * Connect last node to speaker and play the source.
     *  
     * @param {Boolean} bLoop - Loop?
     */
    play : function(bLoop) {
        var source = this._getCurrentSource();
        this._lastNode.connect(WAU.context.destination);

        source.loop = !!bLoop;
        source.noteOn(0);
        
        return source;
    },
    
    /**
     * Stop playing 
     */
    stop : function() {
        var source = this._getCurrentSource();

        if(source.playbackState == source.PLAYING_STATE) {
            source.noteOff(0);  // Stop playing
            delete this._currentSource[this._currentSourceKey];
        }
    }
};
