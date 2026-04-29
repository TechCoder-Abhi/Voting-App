const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const app = require('../app');

const requestJson = (server, path) => {
    return new Promise((resolve, reject) => {
        const { port } = server.address();

        const req = http.request(
            {
                hostname: '127.0.0.1',
                port,
                path,
                method: 'GET'
            },
            (res) => {
                let body = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    body += chunk;
                });
                res.on('end', () => {
                    resolve({ statusCode: res.statusCode, body });
                });
            }
        );

        req.on('error', reject);
        req.end();
    });
};

test('GET / returns API health payload', async () => {
    const server = app.listen(0);

    try {
        const response = await requestJson(server, '/');
        const payload = JSON.parse(response.body);

        assert.equal(response.statusCode, 200);
        assert.equal(payload.message, 'Voting App API is running');
        assert.equal(payload.version, '1.0.0');
        assert.equal(payload.endpoints.users, '/user');
        assert.equal(payload.endpoints.candidates, '/candidate');
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});