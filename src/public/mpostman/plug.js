var ajx = function(req, d){
	var xhr = new XMLHttpRequest();
	xhr.open(typeof req.method == 'undefined' ? 'GET' : req.method, req.path);
	if(typeof req.token != 'undefined')
		xhr.setRequestHeader('token', req.token);
	xhr.setRequestHeader('Accept', 'application/json, text/plain, */*');
	xhr.send(d);
	return xhr;
}

var $ajx = function(req, d){
	var cfg = {
    	type: typeof req.method == 'undefined' ? 'GET' : req.method,
    	url: req.path,
		data: d
	};
	if(typeof req.head != 'undefined')
		cfg.headers = req.head;
	if(typeof req.token != 'undefined')
		cfg.headers = {token: req.token};
	return $.ajax(cfg);
}

function base64EncodeImage(ele, cb){
	if(!ele)
		return;

	if(ele.getAttribute('type') != 'file')
		return;

	if(ele.files.length <= 0)
		return;

	var fileToLoad = ele.files[0];

	var fileReader = new FileReader();

	fileReader.onload = function(fileLoadedEvent) {
	    var srcData = fileLoadedEvent.target.result; 
	    cb(srcData);
	}
	fileReader.readAsDataURL(fileToLoad);
}