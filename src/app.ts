import express from "express";
import cors from "cors";
import cookieParser from 'cookie-parser';
const app = express();

// middlewares
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req,res)=>{
    console.log("Hello World");
    res.send("Hello World");
})

// api routes
// app.use("/api/v1",);

export default app;
