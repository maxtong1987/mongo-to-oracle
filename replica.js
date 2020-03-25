rs.initiate({
	"_id" : "rs0",
	"version" : 1,
	"members" : [
		{ "_id" : 0, "host" : "mongo:27017" }
	]
});

let status = rs.status();