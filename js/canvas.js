
var MapPlus = (function(){
	var map
	var sections
	var cellWidth = 0.5;
	var units = 'kilometers';
	var center = [45.492080,-73.668867]
	var layerControl
	var overlays = {}
	var lgResidential = new L.layerGroup()
	var lgOther = new L.layerGroup()
	var avgChart
	var idvChart
	var loadedSections = []
	var triggerReload = false
	var listenZoomEnd = false
	var searchControl
	var zooming = false
	var lastBounds = {}	
	var baseMaps = {
		"Dark map": L.tileLayer("atlas/dark_all/{z}/{x}/{y}.png"),
		"Light map": L.tileLayer('atlas/osm-intl/{z}/{x}/{y}.png')
	}	
	var getColor = chroma.scale(['#888','#ffffe9','#edf8b1','#c7e9b4','#7fcdbb', '#41b6c4','#1d91c0','#225ea8','#002d63']).domain([200000,300000,400000,500000,700000,1000000, 2000000, 5000000, 10000000])
	//var getColor = chroma.scale(['#ffffcc','#ffeda0','#fed976','#feb24c','#fd8d3c','#fc4e2a','#e31a1c','#bd0026','#800026']).domain([200000,300000,400000,500000,700000,1000000, 2000000, 5000000, 10000000])
	var getColorWiki = chroma.scale(['#fff7f3','#fde0dd','#fcc5c0','#fa9fb5','#f768a1','#dd3497','#ae017e','#7a0177','#49006a']).domain([200000,300000,400000,500000,700000,1000000, 2000000, 5000000, 10000000])	
	
	function init(){
		map = initMap(center, 11,baseMaps['Dark map'])
		addZoom('bottomright')
		addSearch('topleft')
		getSections("sections")
		initCharts()
		addOverlay("Hexes", onEachHex)
		addOverlay("Boxes", onEachBox)	
		getHexGrid("hexgrid2")
		//addLayerControl(["Overlays"])
		addEvents()
	}
	function getSections(name){
		$.getJSON("data/"+name+".json", function(res){
			sections = res
		});
	}

	function getHexGrid(name){
		$.getJSON("data/"+name+".json", function(res){
			overlays.Hexes = L.geoJson(res,{onEachFeature: onEachHex})
		}).then(addLayerControl)		
	}
	function addOverlay(name, onEach){
		overlays[name] = L.geoJson(null,{onEachFeature:onEach})
	}
	function addLayerControl(exclusives){
		//layerControl = L.control.layers(baseMaps, overlayMaps).addTo(map);
		layerControl = L.control.groupedLayers(baseMaps, {"Overlays":overlays},{exclusiveGroups:exclusives}).addTo(map);		
	}
	function addSearch(position){
		searchControl = new L.Control.Search({sourceData: searchByAjax, text:'Color...', markerLocation: true, zoom:16, initial:false,minLength:4,firstTipSubmit:true,hideMarkerOnCollapse:true,position:position})
		map.addControl(searchControl);
	}
	function addZoom(position){
		map.zoomControl.setPosition(position);
	}
	function initMap(c, z, layers){
		return L.map("map",{
			center:c,
			zoom:z,
			layers:layers,
			preferCanvas:true,
		});
	}
	function initCharts(){
		avgChart = new Chart($("#avgChart"), {
		  type: 'bar',
		  data: {
		    datasets: [{
		          data: [25, 25, 30, 40,45,50,50,55,50,60,65],
		          yAxisID:'property-price',
		          backgroundColor:'darkgreen'
		        }, {
		          data: [0, 0, 20, 25,12,12,0,10,-10,20,8],
		          yAxisID:'annual-change',
		          // Changes this dataset to become a line
		          type: 'line'
		        }],
		    labels: ['07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17']
		  },
		  options:{
		  	tooltips:{
		  		callbacks:{
		  			label: function(tooltipItem, data) {
		  				if (tooltipItem['datasetIndex'] == 0){
		  					return tooltipItem['yLabel'] = '  Property value:  ' + currencyStyle(tooltipItem['yLabel'])
		  				} else {
		  					 return tooltipItem['yLabel'] = '  Annual change:  ' + tooltipItem['yLabel'].toFixed(1) + '%'
		  				}
	      			}
		  		},
		  		mode:'label'
		  	},
		  	layout: {
		  		padding: {
		  			top:10,
		  			bottom:0,
		  			left:0,
		  			right:0
		  		}
		  	},
		  	legend: {
		  		display:false
		  	},
		  	elements: {
		  		line: {
		  			tension:0,
		  			fill:false,
		  			borderColor:'white'
		  		},
		  	},
		  	scales:{
		  		yAxes:[{
		  			id: 'property-price',
		  			display:false,
		  			ticks:{
		  				suggestedMin:20
		  			}
		  		},{
		  			id:'annual-change',
		  			display:false,
		  			ticks:{
		  				beginAtZero:true
		  			}
		  		}]
		  	}
		  }
		});
		idvChart = new Chart($("#idvChart"))
	}
	function currencyStyle(value){
		return "$"+value.toFixed().replace(/(\d)(?=(\d{3})+(,|$))/g, '$1,')
	}
	function hexStyle(mapStyle,value){
		return {
			fillColor: mapStyle == "Light map" ? getColorWiki(value) : getColor(value),
			color: "#888",
			weight: 0.5,
			opacity: 0.6,
			fillOpacity: 0.5
		}	
	}
	function boxStyle(mapStyle,value){
		return {
			fillColor: mapStyle == "Light map" ? getColorWiki(value) : getColor(value),
			color: mapStyle == "Light map" ? getColorWiki(value) : getColor(value),
			weight: 1,
			opacity: 0.8,
			fillOpacity: 0.6
		}	
	}	
	function onEachBox(feature, layer){
		if (feature.properties.type == 'Residential'){
			lgResidential.addLayer(layer)
		} else {
			lgOther.addLayer(layer)
		}
		layer.setStyle(boxStyle(null,feature.properties.value));
		if (feature.properties.value == null){
			console.log(feature.properties.address)
		} else {
			var val = currencyStyle(feature.properties.value)
		}
		
		layer.bindPopup("<p>Address: " + feature.properties.address + "<br /> Value: " + val + "    <a href='#' data-lot="+feature.properties.lot+" data-value="+val+" data-address="+feature.properties.address.replace(/ /g, '_')+" onclick='MapPlus.ShowHistory(this)'>View Details</a> <a href='#' data-value="+val+" data-lot="+feature.properties.lot+" onclick='MapPlus.ShowCompare(this)' class='compare'>Compare</a></p>")
	}
	function onEachHex(feature, layer) {
		layer.setStyle(hexStyle(null,layer.feature.properties.val_avg));
	    layer.on("click",function(){
	    	$("#history").hide()
	    	$("#averages").show()
	    	$("#avg_price").text(currencyStyle(feature.properties.val_avg))
	    	$("#info-container").slideDown("medium")
	    })
	}
	function updateStyles(style){
		overlays.Hexes.eachLayer(function (layer){
			layer.setStyle(hexStyle(style,layer.feature.properties.val_avg));
		})
		overlays.Boxes.eachLayer(function (layer){
			layer.setStyle(boxStyle(style,layer.feature.properties.value));
		})
	}
	function addEvents(){
		$(".info-title").on("click",function(test){

			var sections = $(test.currentTarget.parentNode.parentNode).find(".info-section")
			if (sections.is(":visible")){
				sections.slideUp("medium")
				//$(".info-section").slideUp("medium")
			} else {
				sections.slideDown("medium")
				//$(".info-section").slideDown("medium")
			}
			
		})
		$(".close").on("click", function(e){
			//console.log("test")
			console.log($(e.currentTarget.parentNode.parentNode))
			$(e.currentTarget.parentNode.parentNode.parentNode).hide()
		})
		searchControl.on("search:locationfound",function(){
			$("#info-container").hide()
		})
		map.on("baselayerchange", function(e){
			updateStyles(e.name)
		})
		map.on('overlayremove', function(e){
			$("#info-container").slideUp("fast")
			if (e.name == "Individual"){
				map.options.minZoom = 11
			}
		})
		map.on("zoomstart",function(){
			zooming = true
		})
		map.on('overlayadd', function(e){
			$("#info-container").slideUp("fast")
			if (e.name == "Boxes"){
				$("#history").hide()
				listenZoomEnd = true
				map.options.minZoom = 14
				if (map._zoom < 14){
					map.setZoom(14)
					map.on('zoomend', function() {
						if (listenZoomEnd){
							lastBounds = {minX:map.getBounds()['_southWest']['lng'], minY:map.getBounds()['_southWest']['lat'],maxX:map.getBounds()['_northEast']['lng'], maxY:map.getBounds()['_northEast']['lat']}
							LoadMarkers(lastBounds)
							listenZoomEnd = false;								
						}
					});			
				} else {
					$("#averages").hide()
					console.log("else")
					lastBounds = {minX:map.getBounds()['_southWest']['lng'], minY:map.getBounds()['_southWest']['lat'],maxX:map.getBounds()['_northEast']['lng'], maxY:map.getBounds()['_northEast']['lat']}
					LoadMarkers(lastBounds)
					listenZoomEnd = false;	
				}
				

			}
		});
		map.on('popupopen', function() {
			if ($("#info-container").is(":visible")) {
				$(".compare").show()
			}
		})
		map.on('moveend', function() {
			console.log(map.getBounds())
			console.log(zooming)
			if (zooming){
				return
			}
			if (map.hasLayer(overlays.Boxes)){
				var box = {minX:map.getBounds()['_southWest']['lng'], minY:map.getBounds()['_southWest']['lat'],maxX:map.getBounds()['_northEast']['lng'], maxY:map.getBounds()['_northEast']['lat']}
				if (box['minX'] > lastBounds['minX'] && box['minY'] > lastBounds['minY'] && box['maxX'] < lastBounds['maxX'] && box['maxY'] < lastBounds['maxY']) {
					return
				} else {
					lastBounds = {minX:map.getBounds()['_southWest']['lng'], minY:map.getBounds()['_southWest']['lat'],maxX:map.getBounds()['_northEast']['lng'], maxY:map.getBounds()['_northEast']['lat']}
					LoadMarkers(lastBounds)		
				}
			}
		});				
	}
	function searchByAjax(text, callResponse){
		return $.ajax({
			url: '/searchLoc',	//read comments in search.php for more information usage
			type: 'GET',
			data: {q: text},
			dataType: 'json',
			success: function(json) {
				callResponse(json);
			}
		});
	}	
	function getDetails(lot){
		$.ajax({
		    type: "POST",
		    url: "/getDetails",
		    dataType: "json",
		    beforeSend: function(){
				$("#loader").show()
			},	    
		    data:{lot:lot}					
		})
		.done(function(res){
			$("#loader").hide()
			return res
		})		
	}
	function ShowCompare(el) {
		var lot = $(el).data("lot")
		$.ajax({
			type:"POST",
			url:"/getDetails",
			dataType:"json",
			beforeSend: function(){
				$("#loader").show()
			},
			data:{lot:lot}
		})
		.done(function(details){
			$("#loader").hide()
			$("#c-owner").text(details['owner'])
			var difference = parseInt(((parseInt($(el).data("value").replace("$","").replace(/,+/g,"")) / parseInt($("#property_value").text().replace("$","").replace(/,+/g,"")))-1)*100)+"%"
			$("#c-property_value").text($(el).data("value") + " ("+difference+")")
			$("#c-land_value").text(currencyStyle(details['land_value']))
			$("#c-building_value").text(currencyStyle(details['building_value']))
			$("#c-land_area").text(details['land_area'])
			$("#c-floor_area").text(details['floor_area'])
			$("#c-year_constructed").text(details['year_constructed'])
			$("#c-physical_link").text(details['physical_link'])
			if (details['history'] == null)	{
				idvChart.destroy()
				$("#idvChart").hide()
				$("#info-container").slideDown("medium")
				return
			}
			$("#compare-container").slideDown()
		})		
	}
	function ShowHistory(el) {
		$('#address').text($(el).data("address").replace(/_/g,' '))
		var lot = $(el).data("lot")
		$('#averages').hide()
		$('#history').show()
		$.ajax({
		    type: "POST",
		    url: "/getDetails",
		    dataType: "json",
		    beforeSend: function(){
				$("#loader").show()
			},	    
		    data:{lot:lot}					
		})
		.done(function(details){
			$("#loader").hide()
			$("#idvChart").show()
			$("#owner").text(details['owner'])
			$("#property_value").text($(el).data("value"))
			$("#land_value").text(currencyStyle(details['land_value']))
			$("#building_value").text(currencyStyle(details['building_value']))
			$("#land_area").text(details['land_area'])
			$("#floor_area").text(details['floor_area'])
			$("#year_constructed").text(details['year_constructed'])
			$("#physical_link").text(details['physical_link'])
			if (details['history'] == null)	{
				idvChart.destroy()
				$("#idvChart").hide()
				$("#info-container").slideDown("medium")
				return
			}		
			var data = [], labels = []
			var byDate = details['history'].slice(0);
			byDate.sort(function(a,b) {
			    return a.year - b.year;
			});
			var byValue = details['history'].slice(0);
			byValue.sort(function(a,b) {
			    return a.value - b.value;
			});
			var lineData = []
			var last = 0	
			$.each(byDate,function(i,result){
				if (i==0){
					lineData.push(0)
				} else {
					lineData.push(((result.value/last) - 1)* 100)
				}
				last = result.value
				data.push(result.value)
				labels.push(result.year)
			})
			idvChart.destroy()
			idvChart = new Chart($("#idvChart"), {
			  type: 'bar',
			  data: {
			    datasets: [{
			          data: data,
			          yAxisID:'property-price',
			          backgroundColor:'darkgreen'
			        }, {
			          data:lineData,

			          // Changes this dataset to become a line
			          type: 'line',
			          yAxisID:'annual-change'
			        }],
			    labels: labels
			  },
			  options:{
			  	tooltips:{
			  		callbacks:{
			  			label: function(tooltipItem, data) {
			  				if (tooltipItem['datasetIndex'] == 0){
			  					return tooltipItem['yLabel'] = '  Property value:  ' + currencyStyle(tooltipItem['yLabel'])
			  				} else {
			  					 return tooltipItem['yLabel'] = '  Annual change:  ' + tooltipItem['yLabel'].toFixed(1) + '%'
			  				}
		      			}
			  		},
			  		mode:'label'
			  	},
			  	layout: {
			  		padding: {
			  			top:10,
			  			bottom:0,
			  			left:0,
			  			right:0
			  		}
			  	},
			  	legend: {
			  		display:false
			  	},
			  	elements: {
			  		line: {
			  			tension:0,
			  			fill:false,
			  			borderColor:'white'
			  		},
			  	},
			  	scales:{
			  		yAxes:[{
			  			id: 'property-price',
			  			display:false,
			  			ticks:{
			  				suggestedMin:byValue[0]['value'] * 0.98
			  			}
			  		},{
			  			id:'annual-change',
			  			display:false,
			  			ticks:{
			  				beginAtZero:true
			  			}
			  		}]
			  	}
			  }
			});		
			$(".info-section").slideDown("medium")
			$("#info-container").slideDown("medium")
		})
	}
	// function LoadMarkersRemote(bounds){
	// 	//get markers

	// }
	function LoadMarkers(bounds){
		//$.get('/markers')

		map.dragging.disable();
		var overlaps = []
		var start = performance.now();
		$("#loader").show()
		jsonLoad()
		function jsonLoad(){
		   	var markers = {
		        type: "FeatureCollection",
		        features: []    	
		    }
		    var promises = [];
		    if (triggerReload){
		    	loadedSections = []
		    }
		    function getLots(sect){
		    	loadedSections.push(sect)
				promises.push(
				$.getJSON("sections/"+sect+".json",function(boxes){
					$.each(boxes, function(lot,info){
						//console.log(info)
						c = info['bounding_box'].split(',')
						type = info['type']
						address = info['address']
						value = info['value']
						marker = {
							"type":"Feature",
							"properties": {
								value:value,
								address:address,
								lot:lot,
								type: type
							},
							"geometry":{
								"type":"Polygon",
								"coordinates":[[[c[2],c[0]],[c[2],c[1]],[c[3],c[1]],[c[3],c[0]],[c[2],c[0]]]]
							}
						}
						markers.features.push(marker)
					})				
				}))	    	
		    }
			$.each(sections, function(sect, corners){
				//var index = $.inArray(sect, loadedSections)
				//var notIn = false

				if ($.inArray(sect, loadedSections) >= 0){
					return true
				} else if (corners[0][0] > bounds.minX && corners[0][0] < bounds.maxX && corners[0][1] > bounds.minY && corners[0][1] < bounds.maxY) {
					getLots(sect)
				} else if (corners[1][0] > bounds.minX && corners[1][0] < bounds.maxX && corners[1][1] > bounds.minY && corners[1][1] < bounds.maxY){
					getLots(sect)
				} else if (corners[2][0] > bounds.minX && corners[2][0] < bounds.maxX && corners[2][1] > bounds.minY && corners[2][1] < bounds.maxY){
					getLots(sect)
				} else if (corners[3][0] > bounds.minX && corners[3][0] < bounds.maxX && corners[3][1] > bounds.minY && corners[3][1] < bounds.maxY){
					getLots(sect)
				} else if (bounds.minX > corners[0][0] && bounds.maxX < corners[1][0] && bounds.minY > corners[0][1] && bounds.maxY < corners[2][1]) {
					getLots(sect)
				} 
				/*else {
					notIn = true
				}
				if (index >= 0 && notIn) {
					loadedSections.splice(loadedSections, index);
				}*/
			})
			$.when.apply($, promises).then(function(){
				var load = function(){
					//markersLayer.clearLayers()
					console.log(loadedSections.length)
					if (triggerReload){
						overlays.Boxes.clearLayers()
						triggerReload = false
					}
					overlays.Boxes.addData(markers)
					if (loadedSections.length >= 16){
						triggerReload = true
					}				
				}
				$.when(load()).done(function(){
					var groupsMissing = true
					console.log((performance.now() - start))
					map.dragging.enable()
					lgResidential.addTo(map)
					lgOther.addTo(map)
					$.each(layerControl._layers, function(i,layer){
						console.log(layer)
						if(layer.name == "Residential"){
							groupsMissing = false
						}
					})
					if (groupsMissing){
						layerControl.addOverlay(lgResidential, "Residential","Building Types")
						layerControl.addOverlay(lgOther, "Other","Building Types")						
					}
					//map.removeLayer(mapLayerGroup['Other'])
					zooming = false	
				})
				$("#loader").hide()
			})
		}		
		function ajaxLoad(){

			$.ajax({
			    type: "POST",
			    url: "/getMarkers",
			    dataType: "json",
			    beforeSend: function(){
					$("#loader").show()
				},
			    data:bounds						
			})
			.done(function(res){	
				overlays.Boxes.clearLayers()
				map.dragging.enable()
				$.each(res,function(i, location){
					c = location['location'].split(',')
					address = location['address']
					lot = location['lot']
					value = location['value']
					marker = {
						"type":"Feature",
						"properties": {
							value:value = location['value'],
							address:location['address'],
							lot:location['lot']
						},
						"geometry": {
							"type":"Polygon",
							"coordinates":[[[c[2],c[0]],[c[2],c[1]],[c[3],c[1]],[c[3],c[0]],[c[2],c[0]]]]
						}
					}
					overlays.Boxes.addData(marker)
				})
				$("#loader").hide()
				var duration = (performance.now() - start);
				console.log(duration)			
				/*var hexgrid = turf.hexGrid([bounds['minX'],bounds['minY'],bounds['maxX'],bounds['maxY']], cellWidth, units);
				//create hex grid and count points within each cell
				//hexcounts = turf.count(hexgrid, dots, 'pt_count');		
				var aggregation = [{
					aggregation: 'average',
					inField: 'value',
					outField: 'val_avg'
				}]
				var aggregated = turf.aggregate(
				  hexgrid, dots, aggregation)
				var hexFeatures = L.geoJson(aggregated)
				//console.log(aggregated)
				//console.log(localStorage.getItem("hexgrid"))
				localStorage.setItem("hexgrid", JSON.stringify(aggregated));
				hexFeatures.addTo(map);	*/
			})
		}	
	}

	function LoadMarkersIntoJSON(bounds){
	    var markersLayer = {
	        type: "FeatureCollection",
	        features: []    	
	    }
		$.ajax({
		    type: "POST",
		    url: "/getMarkers",
		    dataType: "json",
		    data:bounds						
		})	
		.done(function(res){
			c = location['location'].split(',')
			address = location['address']
			lot = location['lot']
			value = location['value']
			marker = {
				"type":"Feature",
				"properties": {
					value:value = location['value'],
					address:location['address'],
					lot:location['lot']
				},
				"geometry": {
					"type":"Polygon",
					"coordinates":[[[c[2],c[0]],[c[2],c[1]],[c[3],c[1]],[c[3],c[0]],[c[2],c[0]]]]
				}
			}
			markersLayer.features.push(marker)
			//console.log(JSON.stringify(markersLayer.toGeoJSON()))
			function download(content, fileName, contentType) {
			    var a = document.createElement("a");
			    var file = new Blob([content], {type: contentType});
			    a.href = URL.createObjectURL(file);
			    a.download = fileName;
			    a.click();
			}
			download(JSON.stringify(markersLayer), 'json.txt', 'text/plain');
		})
	};
	return { 
		init : init,
		ShowHistory: ShowHistory,
		ShowCompare: ShowCompare
	};
})();


MapPlus.init();
