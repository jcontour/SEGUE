var app = app || {};

app.main = (function(){

	console.log('Loading app.');

	var getInput = function(){
		loadNYT($('#search-box').val());
	};

	var attachEvents = function(){

		// console.log('Attaching events.');

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
	};

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

	var loadConceptNet = function(searchTerm){

		var searchConceptNet = 'http://conceptnet5.media.mit.edu/data/5.4/c/en/' + searchTerm + '?filter=/c/en';
		
		$.getJSON(searchConceptNet, function(json){
			console.log("Data received from concept net : ", json.edges.length);
			
			var resultsCN = json.edges;
			
			var resultFilter = [];

			for (var i = 0; i < resultsCN.length; i++){
				
				//filter for edge end, single word results. 
				console.log("i ", i, " edge start : ", resultsCN[i].surfaceStart, ", edge end : ", resultsCN[i].surfaceEnd);
				console.log("result ", resultsCN[i]);
				// if (resultsCN[i] !== undefined && resultsCN[i].start == "/c/en/" + searchTerm && resultsCN[i].end.indexOf("_") == -1){
				if (resultsCN[i] !== undefined && (resultsCN[i].dataset == "/d/wiktionary/en/en" 
													|| resultsCN[i].dataset == "/d/conceptnet/4/en" 
													|| resultsCN[i].dataset == "/d/umbel" 
													|| resultsCN[i].dataset == "/d/dbpedia/en")){
					console.log(resultsCN[i].surfaceStart.toLowerCase(), searchTerm, resultsCN[i].surfaceEnd.toLowerCase())

					if (resultsCN[i].surfaceStart.toLowerCase() == searchTerm){
						resultsCN[i].id = resultsCN[i].surfaceEnd.toLowerCase()
					} else {
						resultsCN[i].id = resultsCN[i].surfaceStart.toLowerCase()
					}
					
					console.log("pushing ", resultsCN[i].id)
					resultFilter.push(resultsCN[i]);

					// if (i == (resultsCN.length - 1)) {
					// 	console.log("done with resultsCN");
					// 	break;
					// }
				}
				console.log("next CN result");
			}

			console.log("resultFilter ", resultFilter);

			doubleCheckNYT(0, resultFilter, [])

			// ------------------------------------------------------------------------------------------------
			// THIS WILL BE UPDATING THE GRAPH WITH THE CN DATA INSTEAD OF RENDERING
			// ------------------------------------------------------------------------------------------------

			// $('#edge-container').empty();
			// for (var i = 0; i < resultFilter.length; i ++ ){
			// 	render('edges', 'edge-container', 'append',
			// 			{data: {
			// 					results: resultFilter[i],
			// 					term: searchTerm
			// 				}
			// 			});
			// }

			// attachEvents();

		});
	}

	var doubleCheckNYT = function(num,data,array){		// this checks if the id gets results from nyt and removes if not
		if (num < data.length){
			// console.log("num ", num, " of ", data.length, " results.") 
			// console.log("id ", data[num].id, " array ", array);

			if ($.inArray(data[num].id, array) == -1){
				// console.log("id not in array");

				var searchNYT = 'http://api.nytimes.com/svc/search/v2/articlesearch.json?q='+ data[num].id +'&page=0&sort=newest&api-key=b513fe756c28fddfee540182bb4d37a6:1:59936560'

				$.getJSON(searchNYT, function(json){
					// console.log(data[num].id, " gets ", json.response.docs.length , " results from NYT")

					if (json.response.docs.length > 0 ){
						
						array.push(data[num].id)

						render('edges', 'edge-container', 'append',
							{ data: {
									results: data[num]
								}
							});
					} 
					
					num++;
					doubleCheckNYT(num, data, array);
				});
			} else {
			// console.log("skipping duplicate")
			num++;
			doubleCheckNYT(num, data, array);
			}
		}
	}

	var resultsNYT = []

	var loadNYT = function(searchTerm){
		var searchNYT = 'http://api.nytimes.com/svc/search/v2/articlesearch.json?q='+searchTerm+'&page=0&sort=newest&api-key=b513fe756c28fddfee540182bb4d37a6:1:59936560'
		
		$.getJSON(searchNYT, function(json){
			// console.log("Data received from nyt : ", json.response.docs);
			resultsNYT = [];
			
			for (var i = 0; i < json.response.docs.length; i ++ ){
				resultsNYT.push(json.response.docs[i]);
			}
			
			//setting id for searching concept net
			for (var i = 0; i < resultsNYT.length; i ++ ){
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
		// console.log("num ", num, " data ", data);

		if (num == data.length){
			render('articles', 'article-container', 'replace', 
					{data: {
							results: data
						}
					});
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