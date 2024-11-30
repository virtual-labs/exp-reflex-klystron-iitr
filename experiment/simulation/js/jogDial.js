/*
* JogDial.js - v 1.0
*
* Copyright (c) 2014 Sean Oh (ohsiwon@gmail.com)
* Licensed under the MIT license 
* Demo : http://www.ohsean.net/plugins/jogdial/
*/



(function (window, undefined) {
    'use strict';
  
    /*
    * Constructor
    * JogDial
    * @param  {HTMLElement}    element
    * @param  {Object}         options
    * return  {JogDial.Instance}
    */
   
    var JogDial = function (element, options) {
      return new JogDial.Instance(element, options || {});
    };
  
    /*
    * Set constant values and functions
    */
    function setConstants() {
      if (JogDial.Ready) {
        return;
      }
  
      // Constants     
      JogDial.Doc   = window.document;
      JogDial.ToRad   = Math.PI / 180;
      JogDial.ToDeg   = 180 / Math.PI;
  
      // Detect mouse event type
      JogDial.ModernEvent   = (JogDial.Doc.addEventListener) ? true : false;
      JogDial.MobileRegEx   = '/Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/';
      JogDial.MobileEvent   = ('ontouchstart' in window) && window.navigator.userAgent.match(JogDial.MobileRegEx);
      JogDial.PointerEvent  = (window.navigator.pointerEnabled || window.navigator.msPointerEnabled) ? true : false;
  
      // Predefined options
      JogDial.Defaults = {
        debug : false,
        touchMode : 'knob',  // knob | wheel 
        knobSize : '30%',
        wheelSize : '100%',
        zIndex : 9999,
        degreeStartAt : 0,
        minDegree : null,  // (null) infinity
        maxDegree : null   // (null) infinity
      };
  
      // Predefined rotation info
      JogDial.DegInfo = {      
        rotation: 0,
        quadrant: 1
      };
  
      // Predefined DOM events
      JogDial.DomEvent = {
        MOUSE_DOWN: 'mousedown',
        MOUSE_MOVE: 'mousemove',
        MOUSE_OUT: 'mouseout',
        MOUSE_UP: 'mouseup'
      };
  
      // Predefined custom events
      JogDial.CustomEvent = {
        MOUSE_DOWN: 'mousedown',
        MOUSE_MOVE: 'mousemove',
        MOUSE_UP: 'mouseup'
      };
  
      // Utilities
      JogDial.utils  = {
        extend : function (target, src) {
          for (var key in src) {
            target[key] = src[key];
          }
          return target;
        },
  
        //Return css styling
        getComputedStyle: function (el, prop) {
          if (window.getComputedStyle) { // W3C Standard
            return window.getComputedStyle(el).getPropertyValue(prop);
          }
          else if (el.currentStyle) { // IE7 and 8
            return el.currentStyle[prop];
          }
        },
  
        //Calculating x and y coordinates
        getCoordinates: function (e) {
          e = e || window.event;
          var target = e.target || e.srcElement,
            rect   = target.getBoundingClientRect(),
            _x   = ((JogDial.MobileEvent) ? e.targetTouches[0].clientX : e.clientX) - rect.left,
            _y   = ((JogDial.MobileEvent) ? e.targetTouches[0].clientY : e.clientY) - rect.top;
          return {x:_x,y:_y};
        },
  
        // Return the current quadrant.
        // Note: JogDial's Cartesian plane is flipped, hence it's returning reversed value.
        getQuadrant: function(x, y){
          if (x>0 && y>0) return 4;
          else if (x<0 && y>0) return 3;
          else if (x<0 && y<0) return 2;
          else if (x>=0 && y<0) return 1;
        },
  
        // Returne the sum of rotation value
        getRotation: function(self, quadrant, newDegree){
          var rotation, delta = 0, info = self.info;         
            if(quadrant == 1 && info.old.quadrant == 2){ //From 360 to 0
              delta = 360;
            }
            else if(quadrant == 2 && info.old.quadrant == 1){ //From 0 to 360
              delta = -360;
            }
          rotation = newDegree + delta - info.old.rotation + info.now.rotation;
          info.old.rotation = newDegree; // return 0 ~ 360
          info.old.quadrant = quadrant; // return 1 ~ 4
          return rotation;
        },     
  
        //Checking collision 
        checkBoxCollision: function (bound ,point) {
          return bound.x1 < point.x 
          && bound.x2 > point.x
          && bound.y1 < point.y
          && bound.y2 > point.y;
        },
  
        // AddEvent, cross-browser support (IE7+)
        addEvent: function (el, type, handler, capture) {
          type = type.split(' ');
          for(var i=0; i < type.length; i++) {
            if (el.addEventListener) {
              el.addEventListener(type[i], handler, capture);
            }
            else if (el.attachEvent) {
              el.attachEvent('on'+type[i], handler);
            }
          }
        },
  
        // RemoveEvent, cross-browser support (IE7+)
        removeEvent: function (el, type, handler) {
          type = type.split(' ');
          for(var i=0; i < type.length; i++) {
            if (el.addEventListener) {
              el.removeEventListener(type[i], handler);
            }
            else if (el.detachEvent) {
              el.detachEvent('on'+type[i], handler);
            }
          }
        },
  
        // triggerEvent, cross-browser support (IE7+)
        triggerEvent: function(el, type){
          var evt;
          if (JogDial.Doc.createEvent) { // W3C Standard
            evt = JogDial.Doc.createEvent("HTMLEvents");
            evt.initEvent(type, true, true);
            el.dispatchEvent(evt);
          }
          else { // IE7 and 8          
            evt = JogDial.Doc.createEventObject();
            evt.target = {};
            JogDial.utils.extend(evt.target, el);
            el.fireEvent('on' + type, evt);
          }
        },
  
        convertClockToUnit: function (n) {
          return n%360-90;
        },
  
        convertUnitToClock: function (n) {
          return (n >= -180 && n < -90 ) ? 450+n : 90+n;
        }
      };
  
      JogDial.Ready = true;
    };
  
    /*
    * Constructor
    * JogDial.Instance
    * @param  {HTMLElement}    element
    * @param  {Object}         options
    * return  {JogDial.Instance}
    */
    JogDial.Instance = function (el ,opt) {    
      // Prevent duplication
      if (el.getAttribute('_jogDial_')) {
        window.alert('Please Check your code:\njogDial can not be initialized twice in a same element.');
        return false;
      }
      
      // Set global constant values and functions
      setConstants();
  
      // Set this instance
      setInstance(this, el, opt);
  
      // Set stage
      setStage(this);
  
      // Set events
      setEvents(this);
      
      // Set angle
      angleTo(this, JogDial.utils.convertClockToUnit(this.opt.degreeStartAt));
  
      return this;
    };
  
    /*
    * Prototype inheritance
    */
    JogDial.Instance.prototype = {
      on: function onEvent(type, listener) {
        JogDial.utils.addEvent(this.knob, type, listener, false);
        return this;
      },
      off: function onEvent(type, listener) {
        JogDial.utils.removeEvent(this.knob, type, listener);
        return this;
      },
      trigger: function triggerEvent(type, data) {
        switch (type){
          case 'angle':
            angleTo(this, data);
            break;
          default:
            window.alert('Please Check your code:\njogDial does not have triggering event [' + type + ']');
            break;
        }
        return this;
      }
    };
  
    function setInstance(self, el, opt){
      self.base = el;
      self.base.setAttribute('_JogDial_', true);
      self.opt = JogDial.utils.extend(JogDial.utils.extend({}, JogDial.Defaults), opt);
      self.info = {} || self;
      self.info.now = JogDial.utils.extend({},JogDial.DegInfo);
      self.info.old = JogDial.utils.extend({},JogDial.DegInfo);
      self.info.snapshot = JogDial.utils.extend({},self.info);
      self.info.snapshot.direction = null;
    };
  
    function setStage(self) {
      /*
      * Create new elements
      * {HTMLElement}  JogDial.Instance.knob
      * {HTMLElement}  JogDial.Instance.wheel
      */
      var item   = {},
      BId      = self.base.getAttribute("id"),
      BW       = self.base.clientWidth,
      BH       = self.base.clientHeight,
      opt     = self.opt,
      K       = item.knob = document.createElement('div'),
      W       = item.wheel = document.createElement('div'),
      KS       = K.style,
      WS       = W.style,
      KRad, WRad, WMargnLT, WMargnTP;
  
      //Set position property as relative if it's not predefined in Stylesheet
      if (JogDial.utils.getComputedStyle(self.base, 'position') === 'static') {
        self.base.style.position = 'relative';      
      }
  
      //Append to base and extend {object} item
      self.base.appendChild(K);
      self.base.appendChild(W);
      JogDial.utils.extend(self, item);
  
      //Set global position and size
      KS.position = WS.position = 'absolute';
      KS.width = KS.height = opt.knobSize;
      WS.width = WS.height = opt.wheelSize;
  
      //Set radius value
      KRad = K.clientWidth/2;
      WRad = W.clientWidth/2;
  
      //Set knob properties
      K.setAttribute('id', BId + '_knob');
      KS.margin = -KRad + 'px 0 0 ' + -KRad + 'px';
      KS.zIndex = opt.zIndex;
  
      //Set wheel properties
      W.setAttribute('id', BId + '_wheel');
 
      WMargnLT = (BW-W.clientWidth)/2;
      WMargnTP = (BH-W.clientHeight)/2;
  
      WS.left = WS.top = 0;
      WS.margin = WMargnTP + 'px 0 0 ' + WMargnLT + 'px';
      WS.zIndex = opt.zIndex;
  
      //set radius and center point value
      self.radius = WRad - KRad;
      self.center = {x:WRad+WMargnLT, y:WRad+WMargnTP};
  
      //Set debug mode
      if (opt.debug) setDebug(self);
    };
  
    function setDebug(self) {    
      var KS = self.knob.style;
      var WS = self.wheel.style;
      KS.backgroundColor = '#00F';
      WS.backgroundColor = '#0F0';
      KS.opacity = WS.opacity = .4;
      KS.filter = WS.filter = 'progid:DXImageTransform.Microsoft.Alpha(Opacity=40)';
  
      //Fancy CSS3 for debug
      KS.webkitBorderRadius = WS.webkitBorderRadius = "50%";
      KS.borderRadius = WS.borderRadius = "50%";
    };
  
    function setEvents(self) {
      /*
      * Set events to control elements
      * {HTMLElement}  JogDial.Instance.knob
      * {HTMLElement}  JogDial.Instance.wheel
      */    

 //Detect event support type and override values
 if (JogDial.PointerEvent) { // Windows 8 touchscreen
  JogDial.utils.extend(JogDial.DomEvent,{
    MOUSE_DOWN: 'pointerdown MSPointerDown',
    MOUSE_MOVE: 'pointermove MSPointerMove',
    MOUSE_OUT: 'pointerout MSPointerOut',
    MOUSE_UP: 'pointerup pointercancel MSPointerUp MSPointerCancel'
  });
}
else if (JogDial.MobileEvent) { // Mobile standard
  JogDial.utils.extend(JogDial.DomEvent,{
    MOUSE_DOWN: 'touchstart',
    MOUSE_MOVE: 'touchmove',
    MOUSE_OUT: 'touchleave',
    MOUSE_UP: 'touchend'
  });
}

var opt = self.opt,
info = self.info,
K = self.knob,
W = self.wheel;
self.pressed = false;

// Add events


  JogDial.utils.addEvent(W, JogDial.DomEvent.MOUSE_DOWN, mouseDownEvent, false);
  JogDial.utils.addEvent(W, JogDial.DomEvent.MOUSE_MOVE, mouseDragEvent, false);
  JogDial.utils.addEvent(W, JogDial.DomEvent.MOUSE_UP, mouseUpEvent, false);
  JogDial.utils.addEvent(W, JogDial.DomEvent.MOUSE_OUT, mouseUpEvent, false);



// mouseDownEvent (MOUSE_DOWN)
function mouseDownEvent(e) {
  if(knobFlag)
  {
    switch (opt.touchMode) {
      case 'knob':
      default:
        self.pressed = JogDial.utils.checkBoxCollision({
          x1: K.offsetLeft - W.offsetLeft,
          y1: K.offsetTop - W.offsetTop,
          x2: K.offsetLeft - W.offsetLeft + K.clientWidth,
          y2:  K.offsetTop - W.offsetTop + K.clientHeight
          }, JogDial.utils.getCoordinates(e));
        break;
      case 'wheel':
        self.pressed = true;
        mouseDragEvent(e);
        break;
    }
  
    //Trigger down event
    if(self.pressed) JogDial.utils.triggerEvent(self.knob, JogDial.CustomEvent.MOUSE_DOWN);
  }
 
};

// mouseDragEvent (MOUSE_MOVE)
function mouseDragEvent(e) {
  if(knobFlag)
  {
    if (self.pressed) {
      // Prevent default event
      (e.preventDefault) ? e.preventDefault() : e.returnValue = false; 
      
      // var info = self.info, opt = self.opt,
      var offset = JogDial.utils.getCoordinates(e),
      _x = offset.x -self.center.x + W.offsetLeft,
      _y = offset.y -self.center.y + W.offsetTop,
      radian = Math.atan2(_y, _x) * JogDial.ToDeg,
      quadrant = JogDial.utils.getQuadrant(_x, _y),
      degree = JogDial.utils.convertUnitToClock(radian),
      rotation;
      
      //Calculate the current rotation value based on pointer offset
      info.now.rotation = JogDial.utils.getRotation(self, (quadrant == undefined) ? info.old.quadrant : quadrant  , degree);
      rotation = info.now.rotation;//Math.ceil(info.now.rotation);
      
      if(opt.maxDegree != null && opt.maxDegree <= rotation){
        if(info.snapshot.direction == null){
          info.snapshot.direction = 'right';
          info.snapshot.now = JogDial.utils.extend({},info.now);
          info.snapshot.old = JogDial.utils.extend({},info.old);
        }
          rotation = opt.maxDegree;
          radian = JogDial.utils.convertClockToUnit(rotation);
          degree = JogDial.utils.convertUnitToClock(radian);
      }
      else if(opt.minDegree != null && opt.minDegree >= rotation){
        if(info.snapshot.direction == null){
          info.snapshot.direction = 'left';
          info.snapshot.now = JogDial.utils.extend({},info.now);
          info.snapshot.old = JogDial.utils.extend({},info.old);
        }
          rotation = opt.minDegree;
          radian = JogDial.utils.convertClockToUnit(rotation);
          degree = JogDial.utils.convertUnitToClock(radian);
      }
      else if(info.snapshot.direction != null){
        info.snapshot.direction = null;
      }
  
      // Update JogDial data information
      JogDial.utils.extend(self.knob, {
        rotation: rotation,
        degree: degree
      });
      
      // update angle
      angleTo(self, radian);        
    }
  }

};

// mouseDragEvent (MOUSE_UP, MOUSE_OUT)
function mouseUpEvent() {
  if(knobFlag)
  {
    if(self.pressed){
      self.pressed = false;        
      if(self.info.snapshot.direction != null){
        self.info.now = JogDial.utils.extend({},info.snapshot.now);
        self.info.old = JogDial.utils.extend({},info.snapshot.old);
        self.info.snapshot.direction = null;
      }
  
      // Trigger up event
      JogDial.utils.triggerEvent(self.knob, JogDial.CustomEvent.MOUSE_UP);
    }
  }
 
};

 
     
    };
  
    /*
    * Function
    * @param  {HTMLElement}    self
    * @param  {String}         radian
    */  
    function angleTo(self, radian) {
      radian *= JogDial.ToRad;
      self.knob.style.left = Math.cos(radian) * self.radius + self.center.x + 'px';
      self.knob.style.top = Math.sin(radian) * self.radius + self.center.y + 'px';
      
      
      if(self.knob.rotation == undefined){
         // Update JogDial data information
          JogDial.utils.extend(self.knob, {
            rotation: self.opt.degreeStartAt,
            degree: JogDial.utils.convertUnitToClock(radian)
          });
      }
  
      // Trigger move event
      JogDial.utils.triggerEvent(self.knob, JogDial.CustomEvent.MOUSE_MOVE);    
    };
  
    // UMD Wrapper pattern
    // Based on returnExports.js script from (https://github.com/umdjs/umd/blob/master/returnExports.js)
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(function() { return JogDial; });
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = JogDial;
    } else {
        // Browser globals
        window.JogDial = JogDial;
    }
  
  })(window);
  function myFunction() {
    var t = document.getElementById('name').innerText
    if(t==='Reflector Voltage'){
        J=0
      document.getElementById('name').innerText='Beam Voltage' 
     
     
    }
    else{
      document.getElementById('name').innerText='Reflector Voltage' 
    }
    var viewModel = {
      testValue2: ko.observable("0000")
 };
 ko.applyBindings(viewModel);
  } 
  
 

  var b = 0, a = 0, v1 = 0
  window.onload = function(){
    var cc = document.getElementById('cch')
 var bar = document.getElementById('hh');
 
      var dialOne = JogDial(document.getElementById('jog_dial_one'), 
                          {debug:false, wheelSize:'90%', zIndex : 1000,knobSize:'8px', minDegree:200, maxDegree:450, degreeStartAt: 200})
          .on('mousemove', function(evt){
            a=Math.round((evt.target.rotation))
            console.log(cc.checked);
           document.getElementById("ammeter").disabled= false;
            if( cc.checked==false){
              
            var viewModel = {
               testValue2: ko.observable(Math.round((evt.target.rotation)))
          };
          ko.applyBindings(viewModel); 
        }     
               });	
   var bar1 = document.getElementById('jog_dial_two_meter_inner1');   
          var dialtwo = JogDial(document.getElementById('jog_dial_two'), 
                              {debug:false, wheelSize:'90%', zIndex : 1000, knobSize:'8px', minDegree:100 , maxDegree:230, degreeStartAt: 120})
              .on('mousemove', function(evt){ 

                b= Math.round((evt.target.rotation))
                J=0
               if(b==197 )
               {
                 J = 16.4
                
                }
                else if( b== 205 ){
                    J = 22.4

                }
                else if(b==215){
                  J=16.4
                  
                }
                else if(b>=198&&b<=204 || b>=206&&b<=214){
                  J = 18
                }
              
               
               
           K = parseFloat(document.getElementById("P2").value);
           L = parseFloat(document.getElementById("P3").value);
       
           var canvas = document.getElementById("C1");
           var ctx = canvas.getContext("2d");
           ctx.lineWidth = 2;
           
           var p = 30; // period
           var o = 15; // oscillation
           
           var fps = 0;
           var n = 0;
           animate();
           
           function animate() {
                   requestAnimationFrame(animate);
           
                   // Drawing code goes here
                   n += 1;
                   if (n > 500) {
                       n = 0;
                   }
                   ctx.clearRect(0, 0, canvas.width, canvas.height);
                   ctx.beginPath();

                   for (var x = 0; x < n; x++) {
                       var y = J*0.3*(squareY((x*(K-8.9))+L));
                       ctx.lineTo(x, y + 28);
                  }
                  ctx.stroke();     
           }
           
                                        // squared sine
                                        function squareY(x) {
                                          return( (x%p)<o?o:0 );
                                      }
                                      
                                     
            
                if( cc.checked==true){
                
                var viewModel = {
                   testValue2: ko.observable(Math.round((evt.target.rotation))),  
              };

              ko.applyBindings(viewModel); 
            }     

              });
              var bar2 = document.getElementById('jog_dial_3_meter_inner1');  
          var dial3 = JogDial(document.getElementById('jog_dial_3'), 
                              {debug:false, wheelSize:'90%', zIndex : 1000,knobSize:'6px', minDegree:100, maxDegree:100, degreeStartAt: 100})
             
              var bar3 = document.getElementById('jog_dial_4_meter_inner1');  
          var dial4 = JogDial(document.getElementById('jog_dial_4'), 
                              {debug:false, wheelSize:'90%', zIndex : 1000,knobSize:'6px', minDegree:100, maxDegree:100, degreeStartAt: 100})
              

              var bar4 = document.getElementById('jog_dial_5_meter_inner1');  
              var dial5 = JogDial(document.getElementById('jog_dial_5'), 
                                  {debug:false, wheelSize:'90%', zIndex : 1000,knobSize:'6px', minDegree:340, maxDegree:340, degreeStartAt: 340})
                  
                  var bar5 = document.getElementById('jog_dial_6_meter_inner1');  
          var dial6 = JogDial(document.getElementById('jog_dial_6'), 
                              {debug:false, wheelSize:'90%', zIndex : 1000,knobSize:'6px', minDegree:120, maxDegree:120, degreeStartAt: 120})
             			
 
   
}
xValue=[]
function validate() {
  
    var table = document.getElementById("readin");
    var text = document.getElementById('name').innerText;
  v1 = document.getElementById('V1').value;
  if((v1==0) && (a==0)){
    Swal.fire({
      backdrop:false,
     target: '#rom',
     position:'center',
     width:'480px',
      customClass: {
        container: 'position-absolute',
        popup:"swal2-popup"
      },
      text:'Move the knob of Beam voltage for some values.',     
      icon:'warning',
      });

  }
  else if(text == "Beam Voltage" )
  {
   Swal.fire({
     backdrop:false,
    target: '#rom',
    position:'center',
    width:'480px',
     customClass: {
       container: 'position-absolute',
       popup:"swal2-popup"
     },
     text:'Toggle the switch button and move the knob of reflector voltage for some values.',     
     icon:'warning',
     });
  }
  else if(b==0){
    Swal.fire({
      backdrop:false,
     target: '#rom',
     position:'center',
     width:'460px',
      customClass: {
        container: 'position-absolute',
        popup:"swal2-popup"
      },
      html:'<div style="color:blue;text-align:left;font-weight:bold;">Move the knob of reflector voltage for:</div><table><tr><td>Starting point &rarr; 197</td></tr><tr><td>Peak point &rarr; 205</td></tr><tr><td>Ending point &rarr; 215</td></tr></table>',     
      icon:'warning',
      });
  
  }
  else if(v1==0){
    Swal.fire({
      backdrop:false,
     target: '#rom',
     position:'center',
     width:'480px',
      customClass: {
        container: 'position-absolute',
        popup:"swal2-popup"
      },
      title:'Missing Current Value!!',
      text:'First enter some value for Current and then click on the button.',     
      icon:'warning',
      });
  }
  else if(b==197 && v1==687 || b==205 && (v1==196.0 || v1==196) || b==215 && v1==82.5){
     
 var c = ((v1*b)/1000000).toFixed(4)
 
  var row = table.insertRow(i);
  i++;
  var cell0 = row.insertCell(0);
  var cell1 = row.insertCell(1);
  
  
  cell0.innerHTML =  b
  cell1.innerHTML =  c
  xValue.push(b);
  a=0.00
  b=0.00
  document.getElementById('V1').value=" "
  document.getElementById("croi").style.visibility = "visible";
  document.getElementById("croi").style.display = "block";
  document.getElementById("grpwrap").style.visibility= "visible"
  document.getElementById("volt").style.visibility= "visible"
  
  document.getElementById("croiii").style.visibility = "hidden";
  document.getElementById("micro").style.visibility = "hidden";
  document.getElementById("micro").style.display = "none";

  document.getElementById("croiii").style.display = "none";
  document.getElementById("reading1").style.visibility = "hidden";

  document.getElementById("reading1").style.display = "none";
  document.getElementById("reading2").style.visibility = "hidden";

  document.getElementById("reading2").style.display = "none";
  document.getElementById("reading3").style.visibility = "hidden";

  document.getElementById("reading3").style.display = "none";
  
  Swal.fire({
    backdrop:false,
   target: '#rom',
   position:'center',
   width:'480px',
    customClass: {
      container: 'position-absolute',
      popup:"swal2-popup"
    },
    title:'NOTE',
    html:'<div style="color:blue;text-align:left;font-weight:bold;">Move the knob of Reflector voltage for all three readings.</div><table><tr><td>Starting point &rarr; 197</td></tr><tr><td>Peak point &rarr; 205</td></tr><tr><td>Ending point &rarr; 215</td></tr></table>',     
    });
 
  
  var n = xValue.includes(197)
var m = xValue.includes(205)
var c= xValue.includes(215)
if(n==false || m==false || c==false){
  return false
}
 else{
  Swal.fire({
    backdrop:false,
   target: '#rom',
   position:'center',
   width:'560px',
    customClass: {
      container: 'position-absolute',
      popup:"swal2-popup"
    },
    html:'Click on <b style="color:blue">Plot</b> button to plot a graph as per your readings.',     
    icon:'info',
    });
   document.getElementById("ammeter").disabled=true;
   document.getElementById("plot").disabled=false;
   document.getElementById("addto").disabled=true;
 }

 document.getElementById('V1').value=" "

 }

  
  else {
    Swal.fire({
      backdrop:false,
     target: '#rom',
     position:'center',
     width:'480px',
      customClass: {
        container: 'position-absolute',
        popup:"swal2-popup"
      },
      title:'Wrong Input!!',
      text:'Please enter the correct value.',     
      icon:'error',
      });
 
  }
  

}  

  
