dataStream = new Meteor.Stream('data');

sendData = function(data) {//to be called when we want to send data
    dataStream.emit('message', data);
    console.log("Sent data to computer");
};

dataStream.on('message', function(data) {
    console.log(data);
    if(typeof data == "object"){//we got a json
        console.log(data);
        sendData("OK");//send a message to the phone telling it the computer got the data correctly
    }
    else{//confirmation - received on mobile end
        if(data == "OK")//shit didn't go down
            console.log("Computer successfully received",data);
    }
    
});


var ave = function(list, b) {
    var min = 10000;
    var max = 0;

    for (var i=0; i<list.length; i++) {
        
            if (b == 'x') {
                if (list[i].firstPoint.x > max){
                    max = list[i].firstPoint.x;
                }
                if (list[i].firstPoint.x < min){
                    min = list[i].firstPoint.x;
                }
                if (list[i].lastPoint.x > max){
                    max = list[i].lastPoint.x;
                }
                if (list[i].lastPoint.x < min){
                    min = list[i].lastPoint.x;
                }
            }
            else{
                if (list[i].firstPoint.y > max){
                    max = list[i].firstPoint.y;
                }
                if (list[i].firstPoint.y < min){
                    min = list[i].firstPoint.y;
                }
                if (list[i].lastPoint.y > max){
                    max = list[i].lastPoint.y;
                }
                if (list[i].lastPoint.y < min){
                    min = list[i].lastPoint.y;
                }
            }
    }
    return (max + min)/2;
};
/** This function creates the JSON object, sends it and retrieves the result. */
recognize = function(strokes, apiKey, url) {
    if (!url) url = "https://myscript-webservices.visionobjects.com/api/myscript/v2.0/analyzer/doSimpleRecognition.json";

    var jsonPost = {
        "parameter": {
            "hwrParameter": {
                /** Language is a mandatory parameter. */
                "language": "en_US"
            }
        },
        "components": strokes
    };

    /** Send data to POST. Give your API key as supplied on registration, or the 
     * server will not recognize you as a valid user. */
    var data = {
        "apiKey": apiKey,
        "analyzerInput": JSON.stringify(jsonPost)
    };

    /** Display the "wait" symbol while processing is underway. */
    $("#loading").show();
    $("#result").empty();
    /** Post request.  Careful! If there are no candidates, the sample may crash. */
    $.post(
        url,
        data,
        function(jsonResult) {
            $("#loading").hide();
            console.log(jsonResult.result);

            text = jsonResult.result.textLines;
            shapes = jsonResult.result.shapes;
            groups = jsonResult.result.groups;
            var obj = [];
            //analyze results here
            if(text.length>0){
                for (var i = 0; i < text.length; i++) {
                    obj[text[i].uniqueID] = 
                        {
                            value: text[i].result.textSegmentResult.candidates[0].label, 
                            x: text[i].data.topLeftPoint.x + text[i].data.width/2.0, 
                            y: text[i].data.topLeftPoint.y + text[i].data.height/2.0
                        };
                };
            }

            if(shapes.length>0){
                for (var i = 0; i < shapes.length; i++) {
                    obj[shapes[i].uniqueID] =
                    {
                        value: shapes[i].candidates[0].label,
                        x: ave(shapes[i].candidates[0].primitives, 'x'),
                        y: ave(shapes[i].candidates[0].primitives, 'y')
                    };
                
            for (var i = 0; i < text.length; i++) {
                candidates = text[i].result.textSegmentResult.candidates
                for (var i = 0; i < candidates.length; i++) {
                    console.log(candidates[i].label)
                };
            };
            for (var i = 0; i < shapes.length; i++) {
                candidates = shapes[i].candidates
                for (var i = 0; i < candidates.length; i++) {
                    console.log(candidates[i].label);

                    //normalized resemblence score?
                };
            };

            if(groups.length>0){
                for (var i = 0; i< groups.length; i++)
                {
                    if(groups[i].type == 'LIST'){
                        var elements = groups[i].elementReferences
                        var son = {
                            list: []
                        };
                        for(var j=0; j< elements.length; j++)
                        {

                            son.list.push(obj[groups[i].elementReferences[j].uniqueID]);
                            obj[groups[i].elementReferences[j].uniqueID] = null;
                        }
                        obj.push(son)
                    }else{
                        obj[groups[i].elementReferences[1].uniqueID].child = obj[groups[i].elementReferences[0].uniqueID];
                        obj[groups[i].elementReferences[0].uniqueID] = null;
                    }
                }
            }
            console.log(obj);

            var str = JSON.stringify(jsonResult, undefined, 4);
            //assuming fjson is the cleaned up str...
            fjson = str;//this'll be different later, naturally
            sendData(fjson);
            $("#result").html(syntaxHighlight(str));
        },
        "json"
    ).error(function(XMLHttpRequest, textStatus) {
        $("#loading").hide();
        $("#result").text(textStatus + " : " + XMLHttpRequest.responseText);
    });
};
function button(){
    methods.analyze();
}
Template.pyDraw.events({
    'click #analyzeButton' : function(){
        button();
    },
    'touchend #analyzeButton' : function(){
        button();
    }
});
/** Draw strokes in the canvas, as specified in the accompanying HTML file. */
$.fn.write = function(apiKey, url) {
    var stroke;
    var strokes = [];

    var canvas = this.get(0);
    var ctx = canvas.getContext("2d");

    canvas.width = this.first().width();
    canvas.height = this.first().height();
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.fillStyle = "white";
    ctx.strokeStyle = "white";

    var drawing = false;
    var lastX, lastY;

    methods = {
        start: function(x, y) {
            stroke = {
                "type": "stroke",
                "x": [x],
                "y": [y]
            };
            lastX = x;
            lastY = y;
            drawing = true;
        },
        move: function(x, y) {
            if (drawing) {
                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(x, y);
                ctx.stroke();
                stroke.x.push(x);
                stroke.y.push(y);
                lastX = x;
                lastY = y;
            }
        },
        /*As soon as drawing finishes, the strokes are sent for recognition. */
        end: function() {
            if (drawing) {
                drawing = false;
                strokes.push(stroke);
            }
        },


        analyze: function() {
            recognize(strokes, apiKey, url);
        }
    };

   //  $("#analyzeButton").click(
   //        function(event){
   //               event.preventDefault();
   //               methods.analyze();
   //        }
   // );
    // Template.pyDraw.events({
    //     'click #analyzeButton' : function(event){
    //         event.preventDefault();
    //         console.log("It was clicked")
    //         methods.analyze();
    //     }
    // });

   $(canvas).on("touchstart", function(event) {
      event.preventDefault();
      var offset = $(this).first().offset();
      var touch = event.originalEvent.touches[0];
      var x = touch.pageX - offset.left;
      var y = touch.pageY - offset.top;
      methods.start(x, y);
   });

   $(canvas).on("touchmove", function(event) {
      event.preventDefault();
      var offset = $(this).first().offset();
      var touch = event.originalEvent.touches[0];
      var x = touch.pageX - offset.left;
      var y = touch.pageY - offset.top;
      methods.move(x, y);
   });

   $("*").on("touchend", function(event) {
      event.preventDefault();
      methods.end();
   });

   $(canvas).on("mousedown", function(event) {
      event.preventDefault();
      var offset = $(this).first().offset();
      var x = event.pageX - offset.left;
      var y = event.pageY - offset.top;
      methods.start(x, y);
   });

   $(canvas).on("mousemove", function(event) {
      event.preventDefault();
      var offset = $(this).first().offset();
      var x = event.pageX - offset.left;
      var y = event.pageY - offset.top;
      methods.move(x, y);
   });

   $("*").on("mouseup", function(event) {
      event.preventDefault();
      methods.end();
   });
};

function syntaxHighlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function(match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
};