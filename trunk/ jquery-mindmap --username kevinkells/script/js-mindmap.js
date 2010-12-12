// js-mindmap
// (c) Kenneth Kufluk 2008/09 http://kenneth.kufluk.com/
// ported to jQuery plugin by Mike Trpcic http://www.mtrpcic.net/
// GPLv3 http://www.gnu.org/licenses/gpl.html

// TODO:
// Area restriction
// Exploration (showProgressive)
// Hidden children should not be bounded
// Layout children in circles
// Children of a node should not be able to push a sister of that node - but they should be able to feel its effect
// x - Multiple Parents
// Add/Edit nodes
// When activity stops, stop the loop (for performance)
// Resize event


(function($){

    $.fn.mindmap = function(options) {
        // Define default settings.
        var options = $.extend({
            attract: 6,
            repulse: 2,
            damping: 0.55,
            timeperiod: 10,
            wallrepulse: 0.2,
            mapArea: {
                x:-1,
                y:-1
            },
            canvasError: 'alert',
            minSpeed: 0.05,
            maxForce: 0.1,
            showSublines: true,
            updateIterationCount: 20,
            showProgressive: true,
			addActionArea: true
        },options);
    
        // Define all Node related functions.
        function Node(obj, index, el, parent, active){
            this.obj = obj;
        	this.el = $(el);
        	this.el.mindMapObj = this;
            this.parent = parent;
            this.el.addClass('node');
            this.index = index;
            this.visible = true;
            this.hasLayout = true;
            this.x = Math.random()+(options.mapArea.x/2);
            this.y = Math.random()+(options.mapArea.y/2);
			if (parent===null) {
                obj.activeNode = this;
                $(this.el).addClass('active');
            }
        	this.el.css('left', this.x + "px");
        	this.el.css('top', this.y + "px");
            this.dx = 0;
            this.dy = 0;
            this.count = 0;
			this.level = 0;
			this.opacity = 0.9;
			
			if (parent)
			  this.level = parent.level + 1;
            
            this.el.draggable();
            this.el.css('position','absolute');        
    
            if (this.el.children()[0]) {
                if (this.el.children()[0].tagName == 'A') this.el.href = this.el.children().href;
            }
    
            var thisnode = this;
			
			// Set up event handler if the Mindmap Node action is clicked
			$(">.node-action", this.el).click(function(){
				thisnode.insertMindmapNode(); return false;
			});

            this.el.click(function(){
 //               console.log(obj.activeNode);
                if (obj.activeNode) obj.activeNode.el.removeClass('active');
				thisnode.setActiveNode(thisnode);
                /*obj.activeNode = thisnode;
				setActiveBranch(obj.activeNode,false);*/
                obj.activeNode.el.addClass('active');
                return false;
            });
    
            this.el.dblclick(function(){
                location.href=this.href;
                return false;
            });
        }

		Node.prototype.setActiveNode = function(node) {
			// first unset active branch
			var tmp=this.obj.activeNode;
			while (tmp=tmp.parent) {
				tmp.activeBranch=false;
			}
			tmp=node;
			while (tmp=tmp.parent) {
				tmp.activeBranch=true;
			}
			this.obj.activeNode=node;
		}
		
		// Public member function which adds a new Mindmap Node as a child of
		// the this node.
		// Current asks for text via "prompt" mechanism, can be improved.
        Node.prototype.insertMindmapNode = function(){
			var newtext = prompt("Please enter text of new node. Note: Your input will not be stored (yet).");
			var newNodeLI = $("<li>"+newtext+"</li>");
			insertMindmapNode(this.obj, newNodeLI, this);

			return false;
        }
	
        //TODO: Write this method!
        Node.prototype.layOutChildren = function(){
        //show my child nodes in an equally spaced group around myself, instead of placing them randomly
        }
    
        Node.prototype.getForceVector = function(){
            var fx = 0;
            var fy = 0;
            
            var nodes = this.obj.nodes;
            var lines = this.obj.lines;

			if (this.obj.activeNode == this) {
            // if I'm active, attract me to the centre of the area
                // Attractive force (hooke's law)
                var otherend = options.mapArea;
                var x1 = ((otherend.x / 2) - 100 - this.x);
                var y1 = ((otherend.y / 2) - this.y);
                var dist = Math.sqrt((x1 * x1) + (y1 * y1));
                // force is based on radial distance
                var f = (1 * options.attract*dist) / 10000;
                if (Math.abs(dist) > 0) {
                    fx += f * x1 / dist;
                    fy += f * y1 / dist;
                }
			} else if (this.obj.activeNode.parent == this) {
            // if I'm on the active branch, attract me to the active parent area
                // Attractive force (hooke's law)
                var otherend = options.mapArea;
                var x1 = ((otherend.x / 4) - 100 - this.x);
                var y1 = ((otherend.y / 4) - this.y);
                var dist = Math.sqrt((x1 * x1) + (y1 * y1));
                // force is based on radial distance
                var f = (1 * options.attract*dist) / 10000;
                if (Math.abs(dist) > 0) {
                    fx += f * x1 / dist;
                    fy += f * y1 / dist;
                }

			} else {
				// Compute repulsive force from all other elements
				for (var i = 0; i < nodes.length; i++) {
					if (i == this.index) continue;
					if ((options.showSublines && !nodes[i].hasLayout) || (!options.showSublines && !nodes[i].visible)) continue;
					if (this.visible && !nodes[i].visible) continue;
					// only force this node if it is a direct sibling, parent of active, 
					if (nodes[i].parent != this && this.parent != nodes[i] && (!nodes[i].parent || nodes[i].parent.parent != this ) && this.level != nodes[i].level) continue;
					// Repulsive force (coulomb's law)
					var x1 = (nodes[i].x - this.x);
					var y1 = (nodes[i].y - this.y);
					//adjust for variable node size
		//		var nodewidths = (($(nodes[i]).width() + $(this.el).width())/2);
					var dist = Math.sqrt((x1 * x1) + (y1 * y1));
					// force is based on radial distance
					var myrepulse = options.repulse;
					if (this.parent && this.parent==nodes[i]) myrepulse=myrepulse*5;  //parents stand further away
					if (this==this.obj.activeNode.parent) myrepulse=myrepulse*5;  //parents of active stand further away
					var f = (myrepulse * 700) / (dist * dist);
					if (Math.abs(dist) < 500) {
						fx += -f * x1 / dist;
						fy += -f * y1 / dist;
					}
				}
				// add repulsive force of the "walls"
				//left wall
				var xdist = this.x + $(this.el).width();
				var f = (options.wallrepulse * 500) / (xdist * xdist);
				fx += Math.min(2, f);
				//right wall
				var rightdist = (options.mapArea.x - xdist);
				var f = -(options.wallrepulse * 500) / (rightdist * rightdist);
				fx += Math.max(-2, f);
				//top wall
				var f = (options.wallrepulse * 500) / (this.y * this.y);
				fy += Math.min(2, f);
				//botttom wall
				var bottomdist = (options.mapArea.y - this.y);
				var f = -(options.wallrepulse * 500) / (bottomdist * bottomdist);
				fy += Math.max(-2, f);
		
				// for each line, of which I'm a part, add an attractive force.
				for (var i = 0; i < lines.length; i++) {
					var otherend = null;
					if (lines[i].start.index == this.index) {
						otherend = lines[i].end;
					} else if (lines[i].end.index == this.index) {
						otherend = lines[i].start;
					} else continue;
					// Attract only if visible
					if (otherend.visible) {
						// Attractive force (hooke's law)
						var x1 = (otherend.x - this.x);
						var y1 = (otherend.y - this.y);
						var dist = Math.sqrt((x1 * x1) + (y1 * y1));
						// force is based on radial distance
						var f = (options.attract * dist) / 10000;
						if (otherend.level == this.level) f /= 10; // weaken sibling attraction
						if (Math.abs(dist) > 0) {
							fx += f * x1 / dist;
							fy += f * y1 / dist;
						}
					}
				}
			}

            if (Math.abs(fx) > options.maxForce) fx = options.maxForce * (fx / Math.abs(fx));
            if (Math.abs(fy) > options.maxForce) fy = options.maxForce * (fy / Math.abs(fy));
            return {
                x: fx,
                y: fy
            };
        }
    
        Node.prototype.getSpeedVector = function(){
            return {
                x:this.dx,
                y:this.dy
            };
        }
    
        Node.prototype.updatePosition = function(){
            if ($(this.el).hasClass("ui-draggable-dragging")) {
        		this.x = parseInt(this.el.css('left')) + ($(this.el).width() / 2);
        		this.y = parseInt(this.el.css('top')) + ($(this.el).height() / 2);
        		this.dx = 0;
        		this.dy = 0;
				this.obj.recalc_positions = true;
        		return;
        	}
            
            //apply accelerations
            var forces = this.getForceVector();
            //			console.log(forces.x);
            this.dx += this.opacity * forces.x * options.timeperiod;
            this.dy += this.opacity * forces.y * options.timeperiod;
    
            //TODO: CAP THE FORCES
    
            //			this.el.childNodes[0].innerHTML = parseInt(this.dx)+' '+parseInt(this.dy);
            this.dx = this.dx * options.damping;
            this.dy = this.dy * options.damping;
    
            //ADD MINIMUM SPEEDS
            if (Math.abs(this.dx) < options.minSpeed) this.dx = 0;
            if (Math.abs(this.dy) < options.minSpeed) this.dy = 0;
			
			if (this.dx ==0 && this.dy ==0) {
			  return;
			}
			
			this.obj.recalc_positions = true;
			
            //apply velocity vector
            this.x += this.dx * options.timeperiod;
            this.y += this.dy * options.timeperiod;
            this.x = Math.min(options.mapArea.x,Math.max(1,this.x));
            this.y = Math.min(options.mapArea.y,Math.max(1,this.y));
            //only update the display after the thousanth iteration, so it's not too wild at the start
            this.count++;
            //			if (this.count<updateDisplayAfterNthIteration) return;
            // display
        	var showx = this.x - ($(this.el).width() / 2);
        	var showy = this.y - ($(this.el).height() / 2);
        	this.el.css('left', showx + "px");
        	this.el.css('top', showy + "px");
        	this.el.css('opacity', this.opacity);
        	this.el.css('z-index', this.opacity * 100);

        }
    
        // Define all Line related functions.
        function Line(obj, index, startNode, finNode){
            this.obj = obj;

            this.index = index;
            this.start = startNode;
            this.colour = "blue";
            this.size = "thick";
            this.end = finNode;
            this.count = 0;
        }
    
        Line.prototype.updatePosition = function(){
            if (options.showSublines && (!this.start.hasLayout || !this.end.hasLayout)) return;
            if (!options.showSublines && (!this.start.visible || !this.end.visible)) return;
            if (this.start.visible && this.end.visible) this.size = "thick";
            else this.size = "thin";
            if (this.obj.activeNode.parent == this.start || this.obj.activeNode.parent == this.end) this.colour = "red";
            else this.colour = "blue";
            switch (this.colour) {
                case "red":
                    this.obj.ctx.strokeStyle = "rgba(100, 0, 0, " + this.start.opacity * this.start.opacity + ")";
                    break;
                case "blue":
                    this.obj.ctx.strokeStyle = "rgba(0, 0, 100, " + this.start.opacity * this.start.opacity + ")";
                    break;
            }
            switch (this.size) {
                case "thick":
                    this.obj.ctx.lineWidth = "3";
                    break;
                case "thin":
                    this.obj.ctx.lineWidth = "3";
                    break;
            }
            this.obj.ctx.beginPath();
            this.obj.ctx.moveTo(this.start.x, this.start.y);
            this.obj.ctx.quadraticCurveTo(((this.start.x + this.end.x) / 1.8),((this.start.y + this.end.y) / 2.4), this.end.x, this.end.y);
            this.obj.ctx.lineTo(this.end.x, this.end.y);
            this.obj.ctx.stroke();
            this.obj.ctx.closePath();
        }
    
        // Main Running Loop
        var Loop = function (obj){
            if (!obj.recalc_positions)
			  return;

			var nodes = obj.nodes;
            var lines = obj.lines;
            var canvas = $('canvas', obj).get(0);
            if (typeof G_vmlCanvasManager != 'undefined') canvas=G_vmlCanvasManager.initElement(canvas);
            obj.ctx = canvas.getContext("2d");


            obj.ctx.clearRect(0, 0, options.mapArea.x, options.mapArea.y);
			

            //update node positions
			obj.recalc_positions=false;
            for (var i = 0; i < nodes.length; i++) {
                //TODO: replace this temporary idea
                var childActive = false;
                var activeNode = obj.activeNode;
				var currentNode = nodes[i];
				/*
                while (currentNode.parent && (currentNode = currentNode.parent)) {
                    if (currentNode == nodes[i]) childActive = true;
                }
                if (childActive || obj.activeNode == nodes[i] || obj.activeNode == nodes[i].parent) {
                    nodes[i].visible = true;
                    nodes[i].hasLayout = true;
                } else {
                    nodes[i].visible = false;
                    if (nodes[i].parent && nodes[i].parent.parent && nodes[i].parent.parent == obj.activeNode) {
                        nodes[i].hasLayout = true;
                    } else {
                        nodes[i].hasLayout = false;
                    }
                    if (!options.showProgressive) {
                        nodes[i].visible = true;
                        nodes[i].hasLayout = true;
                    }
                }
				*/
				if (currentNode == activeNode) { // if this is the currentNode
					currentNode.visible = true;
					currentNode.hasLayout = true;
					currentNode.opacity = 1.0;
				} else if (currentNode.parent == activeNode){ // if this is a child of active
					currentNode.visible = true;
					currentNode.hasLayout = true;
					currentNode.opacity = 1.0;
				} else if (currentNode.parent == activeNode.parent){ // if this is a sibling of active
					currentNode.visible = true;
					currentNode.hasLayout = true;
					currentNode.opacity = 0.4;
				} else if (currentNode.parent && currentNode.parent.parent == activeNode){ // if this is a grandchild
					currentNode.visible = false;
					currentNode.hasLayout = true;
					currentNode.opacity = 0.3;
				} else if (currentNode.activeBranch) { //along the active branch
					currentNode.visible = true;
					currentNode.hasLayout = true;
					currentNode.opacity = 1.0;
				} else {
					currentNode.visible = false;
					currentNode.hasLayout = false;
					currentNode.activeBranch = false;
				}

				if (nodes[i].visible) {
                    nodes[i].el.show();
                } else {
                    nodes[i].el.hide();
                }
                if ((options.showSublines && !nodes[i].hasLayout) || (!options.showSublines && !nodes[i].visible)) continue;
                nodes[i].updatePosition();
            }
            //display lines
            for (var i = 0; i < lines.length; i++) {
                lines[i].updatePosition();
            }
            
        }
    
 
         // This Helper adds the UL into the mindmap
        function insertMindmapNode(obj, nodeLI, MindmapParentNode){
            var nodes = obj.nodes;
            var lines = obj.lines;

            var nodeno = nodes.length;
			
			// Add Mindmap Node action mechanism
			if (options.addActionArea)
				$(nodeLI).append("<div class=node-action>[+]</div>");

			// function MindmapNode(topDOMobj, index, DOMelement, MindmapParentNode){
            nodes[nodeno] = new Node(obj, nodeno, nodeLI, MindmapParentNode);
            nodeLI.mindmapNode = nodes[nodeno];


			var thisnode = nodes[nodeno];
			
            // For each LI in this list
			if (MindmapParentNode != null) {
				var lineno = lines.length;
				lines[lineno] = new Line(obj, lineno, thisnode, MindmapParentNode);
			}

			// Add subtrees recursively
			$('>li', $(">ul",nodeLI)).each(function(index, _node) {
				insertMindmapNode(obj, _node, thisnode);
			});
		
			$("#js-mindmap").append(nodeLI);

	}
        
        return this.each(function() {

            var nodes = this.nodes = new Array();
            var lines = this.lines = new Array();
            this.activeNode = null;
        
            if (typeof window.CanvasRenderingContext2D == 'undefined' && typeof G_vmlCanvasManager == 'undefined') {
                if (options.canvasError === "alert"){
                    alert("ExCanvas was not properly loaded.");
                } else if (options.canvasError === "console"){
                    console.log("ExCanvas was not properly loaded.");
                } else {
                    options.canvasError();
                }
            } else {
                //CANVAS
                if (options.mapArea.x==-1) {
                    options.mapArea.x = $(window).width();
                }
                if (options.mapArea.y==-1) {
                    options.mapArea.y = $(window).height();
                }
                //create element
                this.canvas = $('<canvas width="'+options.mapArea.x+'" height="'+options.mapArea.y+'" style="position:absolute;left:0;top:0;"></canvas>');
                //add to document
                $(this).append(this.canvas);
                
                //NODES
                // create root node
                var rootLI = $("#js-mindmap-src li").get(0);
				insertMindmapNode(this, rootLI, null);

                // Add additional lines described by rel="id id id"
                var obj = this;
                $('#js-mindmap li[rel]').each(function() {
                    var rel = $(this).attr('rel');
                    var currentNode = $(this)[0].mindmapNode;
                    $.each(rel.split(' '), function(index) {
//                        console.log(this);
                        var parentNode = $('#'+this)[0].mindmapNode;
                        var lineno = lines.length;
                        lines[lineno] = new Line(obj, lineno, currentNode, parentNode);
                        
                    });
                });

				$("li").draggable({
				  start: function(e,ui){
					  obj.recalc_positions=true;
					}
				 });
                
				obj.recalc_positions=true;
				
                //LOOP
                // Run the update loop on this object
                var loopCaller = (function(obj) {
                    return function(){
                        Loop(obj);
                    };
                })(this);
                //setTimeout(loopCaller, 1);
                setInterval(loopCaller, 1);
    
                // Finally add a class to the object, so that styles can be applied
                $(this).addClass('js-mindmap-active');
    
            }
        });
    };
})(jQuery);

