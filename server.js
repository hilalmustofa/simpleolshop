const http = require('http');
const app = require('./app');
const port = process.env.PORT || 5425;
const server = http.createServer(app);

server.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
