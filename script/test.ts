import * as vite from 'npm:vite'


const frontend = await vite.createServer({
    root: './test',
    server: {
        port: 3003,
        host: true,
        open: true,
        strictPort: true,
    }
})
frontend.listen()
