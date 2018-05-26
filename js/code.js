var map, heatmap
map = new google.maps.Map(document.getElementById('map'), {
  zoom: 13,
  center: {lat:45.492080,lng: -73.668867},
  mapTypeId: 'satellite',
  maxIntensity: 2
  });
heatmap = new google.maps.visualization.HeatmapLayer({
  data: [],
  map: map,
  radius: 7
});

function toggleByValue() {
  heatmap.setOptions({data:new google.maps.MVCArray(getPoints("Value"))});
  console.log(getPoints("Value"))
}

function toggleByIncrease() {
  getPoints("Increase")
}

google.maps.event.addListener(map, 'zoom_changed', function () {
  heatmap.setOptions({radius:0.0006 * Math.pow(2,map.zoom)});
});      
function getPoints(type) {
  $.ajaxSetup({async:false,mimeType:"application/json"});
  if (type == "Increase") {
    $.getJSON("ByIncrease.json", function(result){
      var locations = []
      $.each(result['data'], function(i,location){
        locations.push({location:new google.maps.LatLng(location['lat'],location['lng']),weight: location['weight']*10})
      });
      heatmap.setOptions({data:locations});
    });
  } else if (type == "Value"){
    $.getJSON("ByValue.json", function(result){
      var locations = []
      $.each(result['data'], function(i,location){
        locations.push({location:new google.maps.LatLng(location['lat'],location['lng']),weight: location['weight']})
      });
      heatmap.setOptions({data:locations});
    });    
  } 
}