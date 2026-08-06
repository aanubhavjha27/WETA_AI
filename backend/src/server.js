import express, { json } from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import developerroutes from './routes/developers.js'

dotenv.config()

const PORT=process.env.PORT

const app=express()

app.use(express.json())
app.use(cors())

app.use('/api',developerroutes)

app.get('/',(req,res)=>{
    res.json("server running fine")
})

app.listen(PORT,()=>{
    console.log('server running')
})