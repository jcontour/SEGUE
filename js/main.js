var app = app || {};

app.main = (function(){

	console.log('Loading app.');

	// ----------------------------------------------------------------------------------------------------------------------------------------------------------------
	// 		SETUP FUNCTIONS
	// ----------------------------------------------------------------------------------------------------------------------------------------------------------------

	var graph;
	var dataId = 1;
	var clickedId = 1;
	var graphData;

	var render = function(whichtemplate, container, method, data){
		var htmlTemplate = $('#tpl-' + whichtemplate).html();
		var compiled = _.template(htmlTemplate);
		// console.log("data ", data)
		var compiledHtml = compiled(data);

		if (method == "replace") {
			$('#' + container).empty();
			$('#' + container).html(compiledHtml);
		}

		if (method == "append") {
			$('#' + container).append(compiledHtml);
		}

        attachEvents();
	};	

	var getInput = function(){

		graphData = {'name': $('#search-box').val(), 'searchTerm': $('#search-box').val(), 'type': 'cn', 'id': dataId };
		dataId ++;
		
		graph = new Graph();
		graph.setup(graphData);

		console.log("graph data ", graphData)

		loadNYT($('#search-box').val());
	};

	var attachEvents = function(){
		$('#search-button').on('click', getInput);
		
		$('#search-box').keypress(function(e){
			if (e.which == 13){
				getInput();
			}
		});

		$('.article-item').off('click').on('click', function(){
			var searchCN = this.id
			console.log("searchCN : ", searchCN);
			loadConceptNet(searchCN);
		})

		$('.edge-item').off('click').on('click', function(){
			var searchNYT = this.id;
			console.log("searchNYT : ", searchNYT);
			loadNYT(searchNYT);
		})

		$('.display').off('click').on('click', function(){
			
			var search = $(this).attr("data-search");

			clickedId = $(this).attr("data-id")
			
			console.log("clicked ", $(this).attr('data-search'), "from ", $(this).attr("data-type"), "and be a child of ", clickedId)
			
			if ($(this).attr('data-type') == "cn") {
				console.log("search nyt : ", search);
				loadNYT(search);
			} else if ($(this).attr('data-type') == "nyt") {
				console.log("search cn : ", search);
				loadConceptNet(search);
			}
		});	
			
		$('circle').off('click').on('click', function(){
			
			var search = this.id;

			clickedId = $(this).attr("data-tag");
			
			console.log("clicked ", this.id, "clicked Id ", clickedId)
			
			if ($(this).attr("data-which") == 'cn') {
				console.log("search nyt : ", search);
				loadNYT(search);
			} else if ($(this).attr("data-which") == 'nyt') {
				console.log("search cn : ", search);
				loadConceptNet(search);
			}

		});
	};

	var pushData = function(array, which){
		console.log("pushing results from ", which)

		var children = [];

		for (var i = 0; i < array.length; i++){
			var x = {'name': array[i].name, 'searchTerm': array[i].id, 'type': which, 'id': dataId , url: array[i].url}
			children.push(x);
			dataId ++;
		}

		if (which == "nyt"){
			console.log("rendering results from nyt")
			render('articles', 'article-container', 'replace', 
					{ data: {
							results: array
						}
					});
		} else if (which == "cn"){
			console.log("rendering results from nyt")
			render('edges', 'edge-container', 'replace', 
					{ data: {
							results: array
						}
					});
		}

		console.log("graph data ", graphData, "id to find ", clickedId, "child data ", children);
		
		insertById(graphData, clickedId, children, function(updated){
			console.log("updated data", updated)
			graph.setup(updated)
		});
		// console.log("update graph data ", graphData)
		
		// graph.update(updatedData);
	
		// render('display', 'display-container', 'replace', 
		// 	{ data: {
		// 			results: graphData
		// 		}
		// 	});

		attachEvents();
	}

	function insertById(data, id, children, callback){
		console.log("data id", data.id, "clicked id ", id);
	      
		//Early return
	    if( data.id == id ){
	      
	      data['children'] = children;
	      
	      console.log("inserted children ", data);
	      
	      callback(data);

	      return data;
	    }

	    var result, p; 
	    
	    for (p in data) {
	        if( data.hasOwnProperty(p) && typeof data[p] === 'object' && p != 'parent') {
	        	console.log("looking into data p ", data[p]);

	            result = insertById(data[p], id, children, callback);
	            
	            if(result){
	                return result;
	            }
	        }
	    }

	    return result;
	}

	// ----------------------------------------------------------------------------------------------------------------------------------------------------------------
	// 		CHART SETUP
	// ----------------------------------------------------------------------------------------------------------------------------------------------------------------

	var Graph = function(){

		var obj = {};
		var w = $('#graph').width()
		var h = $('#graph').height()
		console.log(w, h)

		var margin = { top: 20, right: 20, bottom: 20, left: 20 };
		var width = w - margin.left - margin.right;
		var height = h - margin.top - margin.bottom;                
		var svg, graph;
		var cluster;
		var diagonal;

		obj.setup = function(dataset){
			$('#graph').empty();

			cluster = d3.layout.cluster()
    			.size([height, width - 160]);

    		diagonal = d3.svg.diagonal()
    			.projection(function(d) { return [d.y, d.x]; });

    		svg = d3.select("#graph")
	    		.append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
			
			graph = svg.append("g")
			.attr("transform", 'translate('+ margin.left + ', ' + margin.top + ')')

			obj.update(dataset);
		}

		obj.update = function(dataset){
			graph.empty();

			var graphingData = dataset
			// console.log("graph data ", JSON.stringify(dataset))

			var nodes = cluster.nodes(graphingData);
      		var links = cluster.links(nodes);

			var link = svg.selectAll(".link")
				.data(links)

			link.enter().append("path")
				.attr("class", "link")
				.attr("d", diagonal)
				.attr("transform", function(d) { return "translate( 100, 0 )"; })
				;

			var node = svg.selectAll(".node")
				.data(nodes)

			node.enter().append("g")
				.attr("class", "node")
				.attr("transform", function(d) { return "translate(" + (d.y + 100) + "," + (d.x) + ")"; })

			node.append("circle")
				.attr("r", 50)
				.attr('data-which', function(d){ return d.type; })
				.attr('class', function(d){ return d.type; })
				.attr('id', function(d){ return d.searchTerm })
				.attr('data-tag', function(d){ return d.id })

			node.append("text")
				.attr("dx", function(d) { return d.children ? -5 : 5; })
				.attr("dy", 3)
				.style("text-anchor", function(d) { return d.children ? "end" : "start"; })
				// .style("font-size", "px")
				.style("fill", "white")
				.text(function(d) { return d.searchTerm; });

			d3.select(self.frameElement).style("height", height + "px");
			attachEvents();

		}

		return obj;
	}

	// ----------------------------------------------------------------------------------------------------------------------------------------------------------------
	// 		SEARCH CN THEN DOUBLE CHECK NYT
	// ----------------------------------------------------------------------------------------------------------------------------------------------------------------

	var loadConceptNet = function(searchTerm){
		console.log("searching concept net for ", searchTerm);

		var searchConceptNet = 'http://conceptnet5.media.mit.edu/data/5.4/c/en/' + searchTerm + '?filter=/c/en';
		
		$.getJSON(searchConceptNet, function(json){
			// console.log("Data received from concept net : ", json.edges.length);
			var resultsCN = json.edges;
			var resultFilter = [];

			for (var i = 0; i < resultsCN.length; i++){
				
				// filter for results in english
				if (resultsCN[i] !== undefined && (resultsCN[i].dataset == "/d/wiktionary/en/en" 
													|| resultsCN[i].dataset == "/d/conceptnet/4/en" 
													|| resultsCN[i].dataset == "/d/umbel" 
													|| resultsCN[i].dataset == "/d/dbpedia/en")){
					// console.log(resultsCN[i].surfaceStart.toLowerCase(), searchTerm, resultsCN[i].surfaceEnd.toLowerCase())

					if (resultsCN[i].surfaceStart.toLowerCase() == searchTerm){
						resultsCN[i].name = resultsCN[i].surfaceEnd.toLowerCase()
						resultsCN[i].id = resultsCN[i].surfaceEnd.toLowerCase()
					} else {
						resultsCN[i].name = resultsCN[i].surfaceStart.toLowerCase()
						resultsCN[i].id = resultsCN[i].surfaceStart.toLowerCase()
					}
					
					resultFilter.push(resultsCN[i]);
				}
			}

			console.log("resultFilter ",  resultFilter);
			doubleCheckNYT(0, resultFilter, [])

		});
	}

	var doubleCheckNYT = function(num,data,array){		// this checks if the id gets results from nyt and removes if not
		console.log("double checking concept net results against nyt")
		// console.log(array.length, array);
		if (num < data.length && array.length < 5){
			if ($.inArray(data[num].id, array) == -1){		// if id is not in array already, search NYT and check for results
				// console.log("id not in array");

				var searchNYT = 'http://api.nytimes.com/svc/search/v2/articlesearch.json?q='+ data[num].id +'&page=0&sort=newest&api-key=b513fe756c28fddfee540182bb4d37a6:1:59936560'

				$.getJSON(searchNYT, function(json){
					// console.log(data[num].id, " gets ", json.response.docs.length , " results from NYT")

					if (json.response.docs.length > 0 ){		// if there are results, push them into the array. 
						array.push(data[num])
					} 
					
					num++;
					doubleCheckNYT(num, data, array);
				});

			} else {	// skip duplicates
				num++;
				doubleCheckNYT(num, data, array);
			}
		} else {
			console.log("done", array)
			pushData(array, "cn")
		}

	}

	// ----------------------------------------------------------------------------------------------------------------------------------------------------------------
	// 		SEARCH NYT THEN DOUBLE CHECK CN
	// ----------------------------------------------------------------------------------------------------------------------------------------------------------------

	var resultsNYT = []

	var loadNYT = function(searchTerm){
		console.log("searching nyt for ", searchTerm);

		var searchNYT = 'http://api.nytimes.com/svc/search/v2/articlesearch.json?q='+searchTerm+'&page=0&sort=newest&api-key=b513fe756c28fddfee540182bb4d37a6:1:59936560'
		
		$.getJSON(searchNYT, function(json){
			// console.log("Data received from nyt : ", json.response.docs);
			resultsNYT = [];
			
			for (var i = 0; i < json.response.docs.length; i ++ ){
				resultsNYT.push(json.response.docs[i]);
			}
			
			//setting id for searching concept net
			for (var i = 0; i < resultsNYT.length; i ++ ){
				resultsNYT[i].name = resultsNYT[i].headline.main
				resultsNYT[i].url = resultsNYT[i].web_url

				if (resultsNYT[i].keywords.length > 0 ){
					var keywordSplit = resultsNYT[i].keywords[0].value.split(" ");
					
					if (keywordSplit[0].indexOf(",") != -1){
						var removeComma = keywordSplit[0]
						var noComma = removeComma.replace("," , "");
						resultsNYT[i].id = noComma.toLowerCase();
					} else {
						resultsNYT[i].id = keywordSplit[0].toLowerCase();
					}
				}
				else if (json.response.docs[i].subsection_name !== null) {
					resultsNYT[i].id = resultsNYT[i].subsection_name.toLowerCase();
				} 
				else {
					resultsNYT[i].id = "oops";
				}
			}

			//removing articles with no id or CN results
			for (var i = 0; i < resultsNYT.length; i ++ ){
				if (resultsNYT[i].id == "oops"){
					resultsNYT.splice(i, 1);
				}
			}

			doubleCheckCN(0, resultsNYT);
		});
	};

	var doubleCheckCN = function(num,data){		// this checks if the id gets results from concept net and removes if not

		if (num == data.length){

			pushData(data, "nyt");

		} else {

			var searchConceptNet = 'http://conceptnet5.media.mit.edu/data/5.4/c/en/' + data[num].id + '?filter=/c/en';
		
			$.getJSON(searchConceptNet, function(json){
				// console.log("num results for ", data[num].id, " is ", json.edges.length);

				if (json.edges.length > 0 ){
					// console.log("true")
					num ++;
				} else {
					// console.log("false")
					data.splice(num, 1);
				}
				doubleCheckCN(num, data);
			});
		}
	}

	var init = function(){
		console.log('Initializing app.');
		attachEvents();
	};

	return {
		init: init
	};

})();

/* Wait for all elements on the page to load */
window.addEventListener('DOMContentLoaded', app.main.init);