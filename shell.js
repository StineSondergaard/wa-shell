'use strict'; // Enable ES6

// Require modules
var request = 	require("request"),		//Used for http requests
	fs = 		require('fs'),			//Used for filesystem; ex. reading / writing files
	http = 		require('http'),		//Used for starting a webserver
	Router = 	require('routes'),		//Used for managing routes on the server
	url = 		require('url');			//Used for handling routes
	//open = 		require('open');		//Used for opening a browser, when the script is executed

var router = 	new Router();

// Read the wa site settings file
var whitealbum = JSON.parse(require('fs').readFileSync('sites.json', 'utf8'));
//var token = JSON.parse(require('fs').readFileSync('token.json', 'utf8'));
//For Heroku:
var token = process.env.TOKEN;
var demoHTML = require('fs').readFileSync('demo.html', 'utf8');

/**
* t-Scope - contains all methods for this script.
*/
var t = {
	shellJSON: {},
	init: function(){
		t.launchServer();	
	},
	getAvailableSites: function(){
		return whitealbum.sites.map(function(arr){ return arr['shortname']; });
	},
	doesSiteExist: function(shortname){
		return (t.getAvailableSites().indexOf(shortname.toUpperCase()) >= 0) ? true : false;
	},
	doesSiteAndLanguageExist: function(shortname,language){
		//Does the site exist ? 
		if(t.getAvailableSites().indexOf(shortname.toUpperCase()) > -1){
		
			var siteID = t.getAvailableSites().indexOf(shortname.toUpperCase());

			//Does the language exist for the site?
			if(whitealbum.sites[siteID].languages.indexOf(language.toUpperCase()) > -1){ 
				return true; 
			}
		}
		return false;
	},
	launchServer: function(siteID,body){
		
		router.addRoute('/emediate/EAS_fif.html', t.EAS_fif); 	//emulate eas file, so banners works
		router.addRoute('/shell/:site/:lang/:banner', t.checkShell);	//accept shortcode and country + 
		router.addRoute('/*', t.welcome);						//all other urls display default list
		
		var port = process.env.PORT || 80;
		var host = process.env.HOST || 'localhost'; //Change to specific IP if you need to test on mobile devices
		
		http.createServer(function (req, res) {
			var path = url.parse(req.url).pathname;
			var match = router.match(path);
			match.fn(req, res, match);
		}).listen({
			host: host,
			port: port
		});
		console.log(`Server running on http://${host}:${port}/`);
		
		//open('http://' + ip + ':' + port + '/');
	},
	checkShell: function(req, res, next){
		
		var siteRequest = router.match(url.parse(req.url).pathname);

		console.log("Params:" + JSON.stringify(siteRequest));

		if(t.doesSiteAndLanguageExist(siteRequest.params.site,siteRequest.params.lang)){
			
			var siteID = t.getSiteID(siteRequest.params.site);
			var langID = t.getLangID(siteRequest.params.site,siteRequest.params.lang);
			var banner = siteRequest.params.banner;
			t.apiRequest(siteID,langID,res,banner,t.displayShell)
			
		} else {
			t.welcome(req,res,next);
		}
	},
	displayShell: function(siteID,languageID,res,ResponseJSON){
		
		var finalHTML = '' + 
			ResponseJSON.html.start_tag + 
			'<head><title>' + whitealbum.sites[siteID].name + ' Shell Test</title>' +
			ResponseJSON.html.head +
			'</head><body>' + 
			ResponseJSON.html.body.header + 
			demoHTML + 
			ResponseJSON.html.body.footer + 
			'<script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js"></script>' + 
			'</body>' +
			ResponseJSON.html.end_tag;
		
		
		res.setHeader("Content-Type", "text/html; charset=utf-8");
		res.statuCode = 200;
		res.end(finalHTML);	
	},
	EAS_fif: function(req, res, next){
		var html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>EAS_fif</title><script type="text/javascript" src="http://eas4.emediate.eu/EAS_tag.1.0.js"></script></head><body style="margin:0px; border:0px; padding:0px;"><script type="text/javascript">      var inDapIF=true;      document.write('<scr'+'ipt type="text/javascript" src="'+window.frameElement.EAS_src+'"></scr'+'ipt>');    </script></body></html>`
		res.statuCode = 200;
		res.setHeader("Content-Type", "text/html; charset=utf-8");
		res.end(html);
	},
	welcome: function(req, res, next){
		var html = `<h1>White Album sites with shell enabled</h1><br><h2>With banners:</h2><ul>`;		
		for(var s = 0; s < whitealbum.sites.length; s++){
			
			html += `<li>${whitealbum.sites[s].name} -`;
			for(var l = 0; l < whitealbum.sites[s].languages.length; l++){
				html += `<a href="/shell/${whitealbum.sites[s].shortname.toLowerCase()}/${whitealbum.sites[s].languages[l].toLowerCase()}/false">${whitealbum.sites[s].languages[l]}</a>&nbsp;`
			}
			html += `</li>`
		}
		html += `</ul><br><h2>Without banners:</h2>`
		for(var s = 0; s < whitealbum.sites.length; s++){
			
			html += `<li>${whitealbum.sites[s].name} -`;
			for(var l = 0; l < whitealbum.sites[s].languages.length; l++){
				html += `<a href="/shell/${whitealbum.sites[s].shortname.toLowerCase()}/${whitealbum.sites[s].languages[l].toLowerCase()}/true">${whitealbum.sites[s].languages[l]}</a>&nbsp;`
			}
			html += `</li>`
		}
		html += `</ul>`
		res.statuCode = 200;
		res.setHeader("Content-Type", "text/html; charset=utf-8");
		res.end(html);
	},

	/**
	* Returns the ID of a site based on the shortname.
	* @param {String} shortname of the site
	* @returns {Number} the site ID.
	*/
	getSiteID: function(shortname){
		var siteId = t.getAvailableSites().indexOf(shortname.toUpperCase());
		var error = `${shortname} does not exist in the sitelist`;
		
		try{
            if (siteId <= -1) throw error;
            if (siteId > -1) return siteId;
        }
        catch(err){
            console.log(err);
            return false;
        }
	},
	getLangID: function(shortname,language){
		if(t.getAvailableSites().indexOf(shortname.toUpperCase())>-1){
			
			//Does the language exist for the site?
			if(whitealbum.sites[t.getSiteID(shortname.toUpperCase())].languages.indexOf(language.toUpperCase())>-1){ 
				return whitealbum.sites[t.getSiteID(shortname.toUpperCase())].languages.indexOf(language.toUpperCase()); 
			}
		}
	},
	apiRequest: function(siteID,languageID,res,banner,callback){	
		var apiUrl = 'http://' + whitealbum.sites[siteID].domains[languageID] + '/api/v2/external_headers'; 
			console.log(apiUrl);

		var options = {
            url: apiUrl,
			method: 'GET',
			headers: { "Authorization": token.basic },
			qs: { "without_banners": banner },
            json: true
        };
		
		console.log(JSON.stringify(options));
        request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {

                callback(siteID,languageID,res,body);
				
            } else if(error){
				
				//If timeout, retry in one minute, otherwise print out the error message
                if(response.statusCode === 503){
					console.log('Server timeout, retrying in 1 minute');
                    setTimeout(function(){t.apiRequest(siteID,endpoint,page,banner,callback)},60*1000);
                } else {
					console.log(`HTTP response status code: ${response.statusCode}`)
                }
            }
        })
	},
}

t.init();