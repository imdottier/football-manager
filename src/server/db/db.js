const mysql = require('mysql2');

var db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Dangtung0505",
    database: "fantasy_football"
}).promise();

// Connect to the database
db.connect(function(err) {
    if (err) {
        console.error('Error connecting to the database: ' + err.stack);
        return;
    }
    console.log('Connected to the database as id ' + db.threadId);
});

module.exports = db;