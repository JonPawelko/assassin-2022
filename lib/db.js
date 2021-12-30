var mysql = require('mysql2');

var connection = mysql.createConnection({
	host:'104.131.92.200',
	user:'AssassinAdmin',
	password:'2022Assassin',
	database:'assassin-demo1',
	multipleStatements:true
});

// var connection = mysql.createConnection({
// 	host:'localhost',
// 	user:'root',
// 	password:'assassin2022',
// 	database:'assassin-demo1',
// 	multipleStatements:true
// });

connection.connect(function(error){
	if(!!error) {
		console.log(error);
	} else {
		console.log('Connected..!');
	}
});

module.exports = connection;
