
//Fork from alphacharlie's node-ads1x15 library.
//https://github.com/ekinakyurek/node-ads1x15

//Tom Alexander regression.js library.
//https://github.com/Tom-Alexander/regression-js
var ads0x14 = require('./node_modules/node-ads1x15');
var regression = require('./regression')

function gesture(chip, channel, pga, sps, channels) {

        this.chip = chip;
        this.channel = channel
        this.pga = pga;
        this.sps = sps;
        this.gestureArray = [];
        this.channels = channels;
        this.current_channel_index = 0;
        this.adc = new ads0x14(chip);
       
        this.waiting_for_click = false;
        this.waiting_for_click_multiple = [];
        this.click_point = 0.0;
        this.click_point_multiple = [];
        this.input_length = 10;
        this.last_average = [];
        this.interval = null;
};

gesture.prototype.quit = function (){
    self = this;
    if (self.interval != null){
	clearInterval(self.interval);
    }
    self.event = null

}

gesture.prototype.startReading = function(event){

    this.event = event
    self = this
    

    if(!this.adc.busy){
	

        this.adc.startContinuousConversion(this.channel, this.pga, this.sps, function(err,data) {
            if(err)
            {
                //logging / troubleshooting code goes here...
                throw err;
            }
            delay = 1000 / self.sps;
	    //console.log(delay)
            //

	    setInterval(self.readinglopp.bind(self), delay)
            // if you made it here, then the data object contains your reading!

            // any other data processing code goes here...
        })
    }
}


gesture.prototype.startMultiChannelReading = function(event,channels){

    self = this
    self.event = event

    if(event.send != null){
		self.event.emit = event.send
    }

    self.channels = channels;
   
    for (var i=0; i<self.channels.length; i++ ){
	self.gestureArray.push([]);
	self.waiting_for_click_multiple.push(false);
	self.click_point_multiple.push(0.0);
	self.last_average.push(0.0);
    }

    delay = 1000 / self.sps;
    delay = 0.01
    self.interval = setInterval(self.readinglopp2.bind(self),delay);
}


gesture.prototype.readinglopp2 = function(){

	self = this

    if(!self.adc.busy){

		self.current_channel_index = self.current_channel_index+1;
		self.current_channel_index = self.current_channel_index % self.channels.length;
		var current = self.current_channel_index;

		self.adc.readADCSingleEnded(self.channels[self.current_channel_index], self.pga, self.sps, function(err, data) {
			if(err) {
				//logging / troubleshooting code goes here...
				throw err;
			}
			//console.log(data)
			data = data / 3264
	    	data = data<0 ? 0:data
	    	//data = data>1 ? 1:data

	 		//if(current == 0) console.log("device:" + current + ":" + data);
	    	self.gestureArray[current].push([self.gestureArray[current].length, data])
	    	var gesture_array = self.gestureArray[current]
     
			if(gesture_array.length%self.input_length==0){

			var result = regression('linear', gesture_array)
			//console.log("slope: " + result.equation[0]);
			//console.log("correlation: " + result.equation[2]);
			var average = 0;
			for(var i=0, n=gesture_array.length; i < n; i++) average += gesture_array[i][1];
			average = average/gesture_array.length;

			self.last_average[current] = average;
//if(current == 2) console.log("device:" + current + ":" +  result.equation[2]);
 //if(current == 2) console.log("device:" + current + ":" + average);
			if (!self.waiting_for_click_multiple[current]){

				if((current == 2 || current == 1) && result.equation[0] > 0.00068 && result.equation[2] > 0.992  && average < 0.96) {
					self.event.emit("swipe-up,"+ current.toString(), result.equation[0]);
					//console.log("swipe up")
					//console.log("slope: " + result.equation[0]);
					//console.log("correlation: " + result.equation[2]);
				}else if((current == 2 || current == 1) && result.equation[0] < -0.00068 && result.equation[2] < -0.992 && average < 0.96){
					self.event.emit("swipe-down,"+current.toString(), result.equation[0]);
					//console.log("swipe down")
					//console.log("slope: " + result.equation[0]);
					//console.log("correlation: " + result.equation[2]
					// );
 				}else if(current==0 && result.equation[0] > 0.00055 && result.equation[2] > 0.975 && average < 0.97){
					 self.event.emit("swipe-up,"+ current.toString(), result.equation[0]);
                                        //console.log("swipe up")
                                        //console.log("slope: " + result.equation[0]);
                                        //console.log("correlation: " + result.equation[2]);
				}else if(current==0 && result.equation[0] < -0.00055 && result.equation[2] < -0.975 && average < 0.97){
				 	self.event.emit("swipe-down,"+current.toString(), result.equation[0]);
                                        //console.log("swipe down")
                                        //console.log("slope: " + result.equation[0]);
                                        //console.log("correlation: " + result.equation[2]
				}else if((current == 2) && (result.equation[2] > 0.70 || result.equation[2]<-0.70) && (average > 0.98)){
					self.click_point_multiple[current]  = average;
					self.waiting_for_click_multiple[current] = true;
					setTimeout(function(){
									//console.log(current + " :first average: " + average + ": last average" +  self.last_average[current]);
									self.waiting_for_click_multiple[current] = false;
									self.event.emit("click-event," + current.toString() , average);
					}.bind(self,average, current), 300)
				}
			}
			self.gestureArray[current].length = 0;
	   	 }
	});
    }
}


gesture.prototype.readinglopp = function(){
	self = this
	self.adc.getLastConversionResults(self.pga,function(err,data){
		data /= 3200
		data = data<0 ? 0:data
		self.gestureArray.push([self.gestureArray.length,data])
		// console.log(data)
		if(self.gestureArray.length%20==0){
			var test_data = [[0,1],[1,2], [2,3], [3,4]]
			//var result = regression('linear',test_data);
			var result = regression('linear', self.gestureArray)
			//console.log("slope: " + result.equation[0]);
			//console.log("correlation: " + result.equation[2]);

			if(self.waiting_for_click){
				var average  = 0;

				for(var i=0, n=self.gestureArray.length; i < n; i++)
				{
					average += self.gestureArray[i][1];
				}
				average = average/20
				//console.log("average: " +  average)
				if ( average< 1.0) {
					self.event.emit("click-detection", self.click_point)
				}
				self.waiting_for_click = false;
			}else if(result.equation[0] > 0.00049 && result.equation[2] > 0.93) {
				self.event.emit("swipe-up", result.equation[0]);
				//console.log("swipe up")
				//console.log("slope: " + result.equation[0]);
				//console.log("correlation: " + result.equation[2]);
			}else if(result.equation[0] < -0.00049 && result.equation[2] < -0.93){
				self.event.emit("swipe-down", result.equation[0]);
				//console.log("swipe down")
				//console.log("slope: " + result.equation[0]);
				//console.log("correlation: " + result.equation[2]);
			}else if(result.equation[2] > 0.90 || result.equation[2]<-0.90){
				var average  = 0;
				for(var i=0, n=self.gestureArray.length; i < n; i++)
				{
					average += self.gestureArray[i][1];
				}
				self.click_point = average/20;
				self.waiting_for_click = true;
				//self.event.emit("point-detection", average/20)
			}
			self.gestureArray.length = 0;
		}
	});
}

module.exports = gesture;
