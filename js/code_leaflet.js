	var map = L.map('map').setView([45.492080,-73.668867], 12);

	var tiles = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
	    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
	}).addTo(map);
	$.ajaxSetup({async:false,mimeType:"application/json"});

	$.getJSON("ByIncrease_s.json", function(result){
		var locations = []
		$.each(result['data'], function(i,location){
			locations.push([location['lat'],location['lng'],location['weight']])
		})
		console.log(locations)
		var idw1 = L.idwLayer(locations,{
		        opacity: 0.3,
		        maxZoom: 18,
		        cellSize: 3,
		        exp: 10,
		        max: 5
		    }).addTo(map);		
	});

