
// for admin login
$ajx({
		path: 'http://localhost:5000/login',
		method: 'post',
	}, {email: 'admin@xyz.com', password: '123456'})

// current admin accessToken : 375c0abb93f0cea3be3e9543e15f082643e5cf9c4ec36c03d3df85edb6c925f3

//for generate dummy :n questions
var recur = (i) => {
	setTimeout(() => {
		$ajx({
			path: 'http://localhost:5000/modQuestions',
			method: 'post',
			token: '375c0abb93f0cea3be3e9543e15f082643e5cf9c4ec36c03d3df85edb6c925f3'
		}, {content: 'this is my question ' + i + ' ?'});
	}, 10)
}
for(var i = 1; i <= 30; i++){
	recur(i)
}


// set total no of questions and time duration to view the question
$ajx({
		path: 'http://localhost:5000/setUpQuestions',
		method: 'post',
		token: '375c0abb93f0cea3be3e9543e15f082643e5cf9c4ec36c03d3df85edb6c925f3'
	}, {totalQuestions: 15, questionDuration: 2})



// get questions for seeker to see questions by one
$ajx({
		path: 'http://localhost:5000/getQuestions',
		method: 'post',
		token: 'bfe116a3d91a7a15becadb33f17f45af2a537bc7b028126dfd64f1dcff904a1d'
	}, {});


// upload a sample video by seeker
var fd = new FormData();
fd.append('video', document.getElementsByTagName('input')[0].files[0])
var xhr = new XMLHttpRequest();
xhr.open('post', 'http://localhost:5000/upload_video');
xhr.setRequestHeader('token', 'bfe116a3d91a7a15becadb33f17f45af2a537bc7b028126dfd64f1dcff904a1d');
xhr.send(fd);

//signup anayzer account 

$ajx({
	path: 'http://localhost:5000/createAnalyzer',
	method: 'post'
}, {First_Name: 'analyzer1', Email_Id: 'analyzer1@gmail.com', password: '123456', cpassword: '123456'});

// current analyzer accessToken: 4b57eaf9a26cccf32788af149435b19e63f200747919cc3dfd67d08b2a2a9b08

// for response to uploaded videos
$ajx({
		path: 'http://localhost:5000/remarkVideos',
		method: 'post',
		token: '4b57eaf9a26cccf32788af149435b19e63f200747919cc3dfd67d08b2a2a9b08'
	}, {userId: '5da17252ad5a151dcae35113', isApproved: true, remarkText: 'Good expression'});

// activate video by seeker
$ajx({
		path: 'http://localhost:5000/activateVideo',
		method: 'post',
		token: 'bfe116a3d91a7a15becadb33f17f45af2a537bc7b028126dfd64f1dcff904a1d'
	}, {isAccept: true});

//get videos 
$ajx({
		path: 'http://localhost:5000/getVideos',
		method: 'post',
		token: '375c0abb93f0cea3be3e9543e15f082643e5cf9c4ec36c03d3df85edb6c925f3'
	}, {});
// get users 
$ajx({
		path: 'http://localhost:5000/getUser',
		method: 'post',
		token: '375c0abb93f0cea3be3e9543e15f082643e5cf9c4ec36c03d3df85edb6c925f3'
	}, {});

// edit analyzer
$ajx({
		path: 'http://localhost:5000/editAnalyzer',
		method: 'post',
		token: '375c0abb93f0cea3be3e9543e15f082643e5cf9c4ec36c03d3df85edb6c925f3'
	}, {analyzerId: '5db449c799584c4982cd18f9', isActivated: 'true', Mobile_Number: '1234567890'});