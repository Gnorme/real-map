/////////////////////////////////////////////////////////////////////////////////////////////
//setting up the map//
/////////////////////////////////////////////////////////////////////////////////////////////
// set center coordinates
var centerlat = 45.492080;
var centerlon = -73.668867;

// set default zoom level
var zoomLevel = 15; 

// initialize map
var map = L.map('map').setView([centerlat,centerlon], zoomLevel);
 
// set source for map tiles
ATTR = '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
'<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a> | ' +
'&copy; <a href="http://cartodb.com/attributions">CartoDB</a>';

CDB_URL = 'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';

// add tiles to map
L.tileLayer(CDB_URL, {attribution: ATTR}).addTo(map);

/////////////////////////////////////////////////////////////////////////////////////////////
//generating the GeoJSON objects//
/////////////////////////////////////////////////////////////////////////////////////////////

//create some GeoJSON points to be sampled (function below)
var dotcount = 100000;
var dots = make_dots(dotcount);

//parameters for hex grid
var bbox = [map.getBounds()['_southWest']['lng'],map.getBounds()['_southWest']['lat'],map.getBounds()['_northEast']['lng'],map.getBounds()['_northEast']['lat']]
var cellWidth = 0.3;
var units = 'kilometers';

//create hex grid and count points within each cell
var hexgrid = turf.hexGrid(bbox, cellWidth, units);
console.log("done grid")
var hexcounts = turf.count(hexgrid, dots, 'pt_count');
console.log("done counts")

L.geoJson(hexcounts, {onEachFeature: onEachHex}).addTo(map);
console.log("done adding")

/////////////////////////////////////////////////////////////////////////////////////////////
//legend//
/////////////////////////////////////////////////////////////////////////////////////////////

//create legend
var hexlegend = L.control({
    position: 'topright'
});
//generate legend contents
hexlegend.onAdd = function (map) {
	//set up legend grades and labels
    var div = L.DomUtil.create('div', 'info legend'),
        grades = [1, 2, 5, 10, 20, 50, 100],
        labels = ['<strong>Point Count</strong>'],
        from, to;
    
	//iterate through grades and create a color field and label for each
    for (var i = 0; i < grades.length; i++) {
        from = grades[i];
        to = grades[i + 1];
        labels.push(
            '<i style="background:' + getColor(from + 0.5) + '"></i> ' + from + (to ? '&ndash;' + to : '+'));
    }
    div.innerHTML = labels.join('<br>');
    return div;
};
hexlegend.addTo(map);

/////////////////////////////////////////////////////////////////////////////////////////////
//styling functions//
/////////////////////////////////////////////////////////////////////////////////////////////

//highlight style
var hexStyleHighlight = {
    color: "#336",
    weight: 2,
    opacity: 0.5,
};

//create color ramp
function getColor(y) {
    return y == undefined ? '#888' :
           y < 1 ? '#ffffe9' :
           y < 2 ? '#edf8b1' :
           y < 5 ? '#c7e9b4' :
           y < 10 ? '#7fcdbb' :
           y < 20 ? '#41b6c4' :
           y < 50 ? '#1d91c0' :
           y < 100 ? '#225ea8' :
                      '#0c2c84';
}

//create style, with fillColor picked from color ramp
function style(feature) {
	return {
		fillColor: getColor(feature.properties.pt_count),
    	color: "#888",
    	weight: 0.5,
    	opacity: 0.5,
    	fillOpacity: 0.4
	};
}

//attach styles and popups to the hex layer
function highlightHex(e) {
    var layer = e.target;
    layer.setStyle(hexStyleHighlight);
    if (!L.Browser.ie && !L.Browser.opera) {
        layer.bringToFront();
    }
}

function resetHexHighlight(e) {
    var layer = e.target;
    var hexStyleDefault=style(layer.feature);
    layer.setStyle(hexStyleDefault);
}

function onEachHex(feature, layer) {
    layer.on({
        mouseover: highlightHex,
        mouseout: resetHexHighlight
    });
        var hexStyleDefault=style(layer.feature);
    layer.setStyle(hexStyleDefault);
    //for the sake of grammar
    if (feature.properties.pt_count == 1) {
        var be_verb = "There is";
        var point_s = "point";
    } else {
        var be_verb = "There are";
        var point_s = "points";
    }
        layer.bindPopup(be_verb+' <b>'+feature.properties.pt_count+'</b> '+point_s+' in this cell.');

}

/////////////////////////////////////////////////////////////////////////////////////////////
//synthetic GeoJSON functions//
/////////////////////////////////////////////////////////////////////////////////////////////

//cheapo normrand function
function normish(mean, range) {
    var num_out = ((Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random() - 4) / 4) * range + mean;
    return num_out;
}

//create geojson data with random ~normal distribution
function make_dots(dotcount) {

    var dots = {
        type: "FeatureCollection",
        features: []
    };
    var bounds = {minX:map.getBounds()['_southWest']['lng'],minY:map.getBounds()['_southWest']['lat'],maxX:map.getBounds()['_northEast']['lng'],maxY:map.getBounds()['_northEast']['lat']}
    console.log(bounds)
    //var bounds= {minX:-73.9737,minY:45.3980,maxX:-73.4814,maxY:45.7052}
    $.ajaxSetup({async:false});
    $.ajax({
        type: "POST",
        url: "/getMarkers",
        dataType: "json",
        data:bounds                     
    })
    .done(function(res){
        console.log("done")
        console.log(res)
        $.each(res,function(i, location){
            var c = location['location'].split(',')
    //set up random variables
    //x = normish(0, 4);
    //y = normish(0, 4);

    //create points randomly distributed about center coordinates
            var g = {
                "type": "Point",
                    "coordinates": [c[2],c[0]]
            };

            //create feature properties, roughly proportional to distance from center coordinates
            var p = {
                "id": i,
                    "popup": "Dot_" + i,
                    "year":1985,
                    "size": 100
            };

                //create features with proper geojson structure        
                dots.features.push({
                    "geometry" : g,
                    "type": "Feature",
                    "properties": p
                });
            })
        console.log("done each")
        })
    return dots;
}
