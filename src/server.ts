import app from './app';
import { Server } from 'http';

async function main(){

    const server:Server = app.listen(8000,()=>{
        console.log("Server is running on port 8000");
    })
   const exitHandler = () => {
        if (server) {
            server.close(() => {
                console.info("Server closed!")
            })
        }
        process.exit(1);
    };
    process.on('uncaughtException', (error) => {
        console.log(error);
        exitHandler();
    });

    process.on('unhandledRejection', (error) => {
        console.log(error);
        exitHandler();
    })

}

main();
